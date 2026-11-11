// Online / LAN play over WebSocket (/ws). Protocol: docs/ARCHITECTURE.md "WebSocket protocol".
// Server-authoritative: chess.js validates every move, the server runs the clocks, detects flags and draws,
// handles resign/draw offers/rematch, a 60 s reconnection grace, Glicko-2 `online` pool updates and game storage.
// Time controls: tc.initial and tc.increment are SECONDS (Lichess convention). Values that only make sense as
// milliseconds (initial > 10800 or increment > 180) are converted, so either unit works. Clocks are milliseconds.
import { randomInt, randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { Chess } from 'chess.js';
import { WebSocketServer, WebSocket } from 'ws';
import { updateRating } from '@grim/core';
import type { TrainingEvent } from '@grim/core';
import type { Auth } from './auth.ts';
import type { Config } from './config.ts';
import type { DB } from './db.ts';
import { tx } from './db.ts';
import { displayName, getProfile, getRating, setRating } from './store.ts';
import type { Training } from './training.ts';

type Color = 'white' | 'black';
type Result = '1-0' | '0-1' | '1/2-1/2';
export interface TimeControl { initial: number; increment: number }

export const RECONNECT_GRACE_MS = 60_000;
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1
const ROOM_TTL_MS = 60 * 60_000;
const ENDED_GAME_TTL_MS = 15 * 60_000;
const other = (c: Color): Color => (c === 'white' ? 'black' : 'white');

interface Client { ws: WebSocket; userId: string; alive: boolean }
interface Player { userId: string; name: string; rating: number; rd: number; conns: Set<Client>; graceTimer: NodeJS.Timeout | null; goneSince: number | null }
interface Seek { userId: string; client: Client; tc: TimeControl; rated: boolean; rating: number; name: string; since: number; id: string }
interface Room { code: string; userId: string; client: Client; tc: TimeControl; color: Color | 'random'; rated: boolean; created: number }

interface Game {
  id: string;
  white: Player; black: Player;
  chess: Chess;
  moves: string[];
  clocks: { white: number; black: number };
  turnStart: number;
  tc: TimeControl; rated: boolean;
  status: 'active' | 'ended';
  result?: Result; reason?: string;
  ratingChange?: { white: number; black: number };
  drawOffer: Color | null;
  rematch: Set<Color>;
  flagTimer: NodeJS.Timeout | null;
  spectators: Set<Client>;
  startedAt: number; endedAt?: number;
  roomCode?: string;
}

export function normalizeTc(tc: unknown): TimeControl | null {
  if (!tc || typeof tc !== 'object') return null;
  let { initial, increment } = tc as { initial?: unknown; increment?: unknown };
  if (typeof initial !== 'number' || typeof increment !== 'number' || !Number.isFinite(initial) || !Number.isFinite(increment)) return null;
  if (initial > 10800) initial /= 1000;
  if (increment > 180) increment /= 1000;
  if (initial < 0 || increment < 0 || initial > 10800 || increment > 180 || initial + increment <= 0) return null;
  return { initial, increment };
}

export function newRoomCode(exists: (c: string) => boolean): string {
  for (;;) {
    let c = '';
    for (let i = 0; i < 6; i++) c += ROOM_ALPHABET[randomInt(ROOM_ALPHABET.length)];
    if (!exists(c)) return c;
  }
}

/** Can `color` still deliver mate with its material? (lone king, K+N or K+B cannot) */
function canMate(chess: Chess, color: Color): boolean {
  const c = color === 'white' ? 'w' : 'b';
  const pieces = chess.board().flat().filter((sq) => sq && sq.color === c && sq.type !== 'k');
  if (pieces.length === 0) return false;
  if (pieces.length === 1 && (pieces[0]!.type === 'n' || pieces[0]!.type === 'b')) return false;
  return true;
}

export class OnlinePlay {
  wss: WebSocketServer;
  auth: Auth; db: DB; cfg: Config; training: Training;
  clients = new Set<Client>();
  games = new Map<string, Game>();
  seeks = new Map<string, Seek>(); // by userId
  rooms = new Map<string, Room>();
  private heartbeat: NodeJS.Timeout;
  private matcher: NodeJS.Timeout;
  private lobbyTimer: NodeJS.Timeout | null = null;
  private closing = false;

  constructor(opts: { auth: Auth; db: DB; cfg: Config; training: Training }) {
    this.auth = opts.auth; this.db = opts.db; this.cfg = opts.cfg; this.training = opts.training;
    this.wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
    this.heartbeat = setInterval(() => {
      for (const c of this.clients) {
        if (!c.alive) { c.ws.terminate(); continue; }
        c.alive = false;
        try { c.ws.ping(); } catch { /* ignore */ }
      }
    }, 30_000);
    this.matcher = setInterval(() => this.matchAll(), 2_000);
    this.heartbeat.unref(); this.matcher.unref();
  }

  // ---------- connection handling ----------
  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    const reject = (code: number, msg: string) => {
      socket.write(`HTTP/1.1 ${code} ${msg}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
      socket.destroy();
    };
    const origin = req.headers.origin;
    if (origin && this.cfg.mode !== 'dev') {
      try { if (new URL(origin).host !== req.headers.host) return reject(403, 'Forbidden'); } catch { return reject(403, 'Forbidden'); }
    }
    const userId = this.auth.userFromCookieHeader(req.headers.cookie);
    if (!userId) return reject(401, 'Unauthorized');
    this.wss.handleUpgrade(req, socket, head, (ws) => this.onConnection(ws, userId));
  }

  private onConnection(ws: WebSocket, userId: string): void {
    const client: Client = { ws, userId, alive: true };
    this.clients.add(client);
    ws.on('pong', () => { client.alive = true; });
    ws.on('message', (data, isBinary) => {
      client.alive = true;
      if (isBinary) return;
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(String(data)); } catch { return this.send(client, { t: 'error', message: 'Invalid JSON' }); }
      try { this.onMessage(client, msg); } catch (e) {
        console.error('[ws] handler error', e);
        this.send(client, { t: 'error', message: 'Internal error' });
      }
    });
    ws.on('close', () => this.onClose(client));
    ws.on('error', () => { /* close follows */ });
    // Re-attach to any active game of this user (reconnects after network blips / page reloads).
    for (const g of this.games.values()) {
      if (g.status !== 'active') continue;
      const color = this.colorOf(g, userId);
      if (color) { this.attach(g, color, client); this.send(client, { t: 'gameState', game: this.view(g, color) }); }
    }
    this.scheduleLobby();
  }

  private onClose(client: Client): void {
    this.clients.delete(client);
    if (this.closing) return;
    const seek = this.seeks.get(client.userId);
    if (seek && seek.client === client) this.seeks.delete(client.userId);
    for (const [code, r] of this.rooms) if (r.client === client) this.rooms.delete(code);
    for (const g of this.games.values()) {
      g.spectators.delete(client);
      for (const color of ['white', 'black'] as Color[]) {
        const p = g[color];
        if (!p.conns.delete(client)) continue;
        if (p.conns.size === 0 && g.status === 'active') {
          p.goneSince = Date.now();
          p.graceTimer = setTimeout(() => {
            p.graceTimer = null;
            if (g.status === 'active' && p.conns.size === 0) this.endGame(g, color === 'white' ? '0-1' : '1-0', 'abandoned');
          }, RECONNECT_GRACE_MS);
          this.broadcastState(g);
        }
      }
    }
    this.scheduleLobby();
  }

  private send(c: Client, msg: unknown): void {
    if (c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify(msg));
  }

  private onMessage(c: Client, m: Record<string, unknown>): void {
    const g = typeof m.gameId === 'string' ? this.games.get(m.gameId) : undefined;
    const needGame = () => { if (!g) this.send(c, { t: 'error', message: 'Unknown game' }); return g; };
    switch (m.t) {
      case 'ping': return this.send(c, { t: 'pong' });
      case 'seek': return this.seek(c, m.tc, m.rated === true);
      case 'cancelSeek': this.seeks.delete(c.userId); return this.scheduleLobby();
      case 'createRoom': return this.createRoom(c, m.tc, m.color, m.rated === true);
      case 'joinRoom': return this.joinRoom(c, m.code);
      case 'move': { const gg = needGame(); if (gg) this.move(c, gg, m.uci, m.ply); return; }
      case 'resign': { const gg = needGame(); if (gg) this.resign(c, gg); return; }
      case 'offerDraw': { const gg = needGame(); if (gg) this.offerDraw(c, gg); return; }
      case 'acceptDraw': { const gg = needGame(); if (gg) this.acceptDraw(c, gg); return; }
      case 'declineDraw': { const gg = needGame(); if (gg) this.declineDraw(c, gg); return; }
      case 'rematch': { const gg = needGame(); if (gg) this.rematch(c, gg); return; }
      case 'rejoin': {
        if (!g) return this.send(c, { t: 'error', message: 'Game not found (it may have ended and expired)' });
        const color = this.colorOf(g, c.userId);
        if (color) this.attach(g, color, c); else g.spectators.add(c);
        return this.send(c, { t: 'gameState', game: this.view(g, color ?? 'spectator') });
      }
      default: return this.send(c, { t: 'error', message: `Unknown message type ${String(m.t)}` });
    }
  }

  // ---------- players ----------
  private player(userId: string, c?: Client): Player {
    const profile = getProfile(this.db, userId);
    const r = getRating(this.db, userId, 'online', profile);
    return { userId, name: displayName(profile), rating: Math.round(r.rating), rd: r.rd, conns: new Set(c ? [c] : []), graceTimer: null, goneSince: null };
  }

  private connsOf(userId: string): Client[] { return [...this.clients].filter((x) => x.userId === userId); }

  private colorOf(g: Game, userId: string): Color | null {
    return g.white.userId === userId ? 'white' : g.black.userId === userId ? 'black' : null;
  }

  private attach(g: Game, color: Color, c: Client): void {
    const p = g[color];
    p.conns.add(c);
    if (p.graceTimer) { clearTimeout(p.graceTimer); p.graceTimer = null; }
    if (p.goneSince) { p.goneSince = null; this.broadcastState(g, c); }
  }

  private inActiveGame(userId: string): boolean {
    for (const g of this.games.values()) if (g.status === 'active' && this.colorOf(g, userId)) return true;
    return false;
  }

  // ---------- lobby / matchmaking ----------
  private seek(c: Client, rawTc: unknown, rated: boolean): void {
    const tc = normalizeTc(rawTc);
    if (!tc) return this.send(c, { t: 'error', message: 'Invalid time control' });
    if (this.inActiveGame(c.userId)) return this.send(c, { t: 'error', message: 'You are already playing a game' });
    const p = this.player(c.userId);
    const seek: Seek = { userId: c.userId, client: c, tc, rated, rating: p.rating, name: p.name, since: Date.now(), id: randomUUID().slice(0, 8) };
    this.seeks.set(c.userId, seek);
    if (!this.tryMatch(seek)) this.scheduleLobby();
  }

  /** Allowed rating gap widens with waiting time: 200 + 50 per 5 s waited (unlimited after a minute). */
  private window(s: Seek, now: number): number {
    const waited = now - s.since;
    return waited > 60_000 ? Infinity : 200 + 50 * Math.floor(waited / 5000);
  }

  private tryMatch(s: Seek): boolean {
    const now = Date.now();
    let best: Seek | null = null;
    for (const o of this.seeks.values()) {
      if (o.userId === s.userId || o.rated !== s.rated || o.tc.initial !== s.tc.initial || o.tc.increment !== s.tc.increment) continue;
      const diff = Math.abs(o.rating - s.rating);
      if (diff > Math.max(this.window(s, now), this.window(o, now))) continue;
      if (!best || diff < Math.abs(best.rating - s.rating)) best = o;
    }
    if (!best) return false;
    this.seeks.delete(s.userId);
    this.seeks.delete(best.userId);
    const sWhite = randomInt(2) === 0;
    this.startGame(sWhite ? s.userId : best.userId, sWhite ? best.userId : s.userId, s.tc, s.rated);
    this.scheduleLobby();
    return true;
  }

  private matchAll(): void {
    for (const s of [...this.seeks.values()]) if (this.seeks.has(s.userId)) this.tryMatch(s);
    const now = Date.now();
    for (const [code, r] of this.rooms) if (now - r.created > ROOM_TTL_MS) this.rooms.delete(code);
    for (const [id, g] of this.games) if (g.status === 'ended' && g.endedAt && now - g.endedAt > ENDED_GAME_TTL_MS) this.games.delete(id);
  }

  private scheduleLobby(): void {
    if (this.lobbyTimer) return;
    this.lobbyTimer = setTimeout(() => {
      this.lobbyTimer = null;
      const msg = {
        t: 'lobby',
        players: new Set([...this.clients].map((c) => c.userId)).size,
        seeks: [...this.seeks.values()].map((s) => ({ id: s.id, name: s.name, rating: s.rating, tc: s.tc, rated: s.rated })),
        games: [...this.games.values()].filter((g) => g.status === 'active').length,
      };
      for (const c of this.clients) this.send(c, msg);
    }, 250);
    this.lobbyTimer.unref();
  }

  // ---------- private rooms ----------
  private createRoom(c: Client, rawTc: unknown, color: unknown, rated: boolean): void {
    const tc = normalizeTc(rawTc);
    if (!tc) return this.send(c, { t: 'error', message: 'Invalid time control' });
    const col = color === 'white' || color === 'black' ? color : 'random';
    for (const [code, r] of this.rooms) if (r.userId === c.userId) this.rooms.delete(code); // one open room per user
    const code = newRoomCode((x) => this.rooms.has(x));
    this.rooms.set(code, { code, userId: c.userId, client: c, tc, color: col, rated, created: Date.now() });
    this.send(c, { t: 'roomCreated', code });
  }

  private joinRoom(c: Client, rawCode: unknown): void {
    const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
    const room = this.rooms.get(code);
    if (!room) return this.send(c, { t: 'error', message: 'Room not found' });
    if (room.userId === c.userId) return this.send(c, { t: 'error', message: 'You cannot join your own room' });
    this.rooms.delete(code);
    const creatorWhite = room.color === 'white' || (room.color === 'random' && randomInt(2) === 0);
    const g = this.startGame(creatorWhite ? room.userId : c.userId, creatorWhite ? c.userId : room.userId, room.tc, room.rated);
    g.roomCode = code;
  }

  // ---------- games ----------
  private startGame(whiteId: string, blackId: string, tc: TimeControl, rated: boolean): Game {
    const now = Date.now();
    const g: Game = {
      id: randomUUID().replace(/-/g, '').slice(0, 12),
      white: this.player(whiteId), black: this.player(blackId),
      chess: new Chess(), moves: [],
      clocks: { white: tc.initial * 1000, black: tc.initial * 1000 },
      turnStart: now, tc, rated, status: 'active', drawOffer: null, rematch: new Set(), flagTimer: null,
      spectators: new Set(), startedAt: now,
    };
    for (const c of this.connsOf(whiteId)) g.white.conns.add(c);
    for (const c of this.connsOf(blackId)) g.black.conns.add(c);
    this.seeks.delete(whiteId); this.seeks.delete(blackId);
    this.games.set(g.id, g);
    for (const color of ['white', 'black'] as Color[]) for (const c of g[color].conns) this.send(c, { t: 'gameStart', game: this.view(g, color) });
    this.armFlag(g);
    return g;
  }

  /** Remaining time of the side to move, live. */
  private liveClocks(g: Game, now = Date.now()): { white: number; black: number } {
    const clocks = { ...g.clocks };
    if (g.status === 'active') {
      const turn = this.turn(g);
      clocks[turn] = Math.max(0, clocks[turn] - (now - g.turnStart));
    }
    return clocks;
  }

  private turn(g: Game): Color { return g.chess.turn() === 'w' ? 'white' : 'black'; }

  view(g: Game, you: Color | 'spectator') {
    return {
      id: g.id,
      white: { name: g.white.name, rating: g.white.rating },
      black: { name: g.black.name, rating: g.black.rating },
      fen: g.chess.fen(), moves: g.moves, clocks: this.liveClocks(g), turn: this.turn(g), status: g.status,
      ...(g.result ? { result: g.result, reason: g.reason } : {}),
      tc: g.tc, rated: g.rated, you, serverTime: Date.now(),
      // additive fields (not required by the protocol): pending draw offer and connection status
      drawOffer: g.drawOffer,
      connected: { white: g.white.conns.size > 0, black: g.black.conns.size > 0 },
      ...(g.ratingChange ? { ratingChange: g.ratingChange } : {}),
    };
  }

  private recipients(g: Game): [Client, Color | 'spectator'][] {
    const out: [Client, Color | 'spectator'][] = [];
    for (const c of g.white.conns) out.push([c, 'white']);
    for (const c of g.black.conns) out.push([c, 'black']);
    for (const c of g.spectators) out.push([c, 'spectator']);
    return out;
  }

  private broadcastState(g: Game, except?: Client): void {
    for (const [c, you] of this.recipients(g)) if (c !== except) this.send(c, { t: 'gameState', game: this.view(g, you) });
  }

  private broadcast(g: Game, msg: unknown): void {
    for (const [c] of this.recipients(g)) this.send(c, msg);
  }

  private armFlag(g: Game): void {
    if (g.flagTimer) clearTimeout(g.flagTimer);
    g.flagTimer = null;
    if (g.status !== 'active') return;
    const turn = this.turn(g);
    const remaining = this.liveClocks(g)[turn];
    g.flagTimer = setTimeout(() => this.checkFlag(g), remaining + 25);
  }

  private checkFlag(g: Game): boolean {
    if (g.status !== 'active') return false;
    const turn = this.turn(g);
    if (this.liveClocks(g)[turn] > 0) { this.armFlag(g); return false; }
    g.clocks[turn] = 0;
    const winner = other(turn);
    if (!canMate(g.chess, winner)) this.endGame(g, '1/2-1/2', 'timeout-vs-insufficient');
    else this.endGame(g, winner === 'white' ? '1-0' : '0-1', 'timeout');
    return true;
  }

  private move(c: Client, g: Game, uci: unknown, ply: unknown): void {
    const color = this.colorOf(g, c.userId);
    if (!color) return this.send(c, { t: 'error', message: 'You are not playing this game' });
    if (g.status !== 'active') return this.send(c, { t: 'error', message: 'Game is over' });
    if (this.checkFlag(g)) return;
    if (this.turn(g) !== color) return this.send(c, { t: 'error', message: 'Not your turn' });
    if (typeof ply === 'number' && ply !== g.moves.length) {
      this.send(c, { t: 'error', message: 'Out of sync' });
      return this.send(c, { t: 'gameState', game: this.view(g, color) });
    }
    if (typeof uci !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return this.send(c, { t: 'error', message: 'Invalid move format' });
    let mv;
    try { mv = g.chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { mv = null; }
    if (!mv) {
      this.send(c, { t: 'error', message: `Illegal move ${uci}` });
      return this.send(c, { t: 'gameState', game: this.view(g, color) });
    }
    const now = Date.now();
    g.clocks[color] = Math.max(0, g.clocks[color] - (now - g.turnStart)) + g.tc.increment * 1000;
    g.turnStart = now;
    g.moves.push(mv.from + mv.to + (mv.promotion ?? ''));
    if (g.drawOffer === other(color)) g.drawOffer = null; // moving declines the opponent's offer
    const ch = g.chess;
    if (ch.isCheckmate()) return this.endGame(g, color === 'white' ? '1-0' : '0-1', 'checkmate');
    if (ch.isStalemate()) return this.endGame(g, '1/2-1/2', 'stalemate');
    if (ch.isInsufficientMaterial()) return this.endGame(g, '1/2-1/2', 'insufficient');
    if (ch.isThreefoldRepetition()) return this.endGame(g, '1/2-1/2', 'repetition');
    if (ch.isDrawByFiftyMoves()) return this.endGame(g, '1/2-1/2', 'fifty-move');
    this.armFlag(g);
    this.broadcastState(g);
  }

  private resign(c: Client, g: Game): void {
    const color = this.colorOf(g, c.userId);
    if (!color || g.status !== 'active') return this.send(c, { t: 'error', message: 'Cannot resign' });
    this.endGame(g, color === 'white' ? '0-1' : '1-0', 'resign');
  }

  private offerDraw(c: Client, g: Game): void {
    const color = this.colorOf(g, c.userId);
    if (!color || g.status !== 'active') return this.send(c, { t: 'error', message: 'Cannot offer a draw' });
    if (g.drawOffer === other(color)) return this.endGame(g, '1/2-1/2', 'agreement');
    g.drawOffer = color;
    this.broadcast(g, { t: 'drawOffered', gameId: g.id, by: color });
  }

  private acceptDraw(c: Client, g: Game): void {
    const color = this.colorOf(g, c.userId);
    if (!color || g.status !== 'active' || g.drawOffer !== other(color)) return this.send(c, { t: 'error', message: 'No draw offer to accept' });
    this.endGame(g, '1/2-1/2', 'agreement');
  }

  private declineDraw(c: Client, g: Game): void {
    const color = this.colorOf(g, c.userId);
    if (!color || g.drawOffer !== other(color)) return;
    g.drawOffer = null;
    this.broadcastState(g);
  }

  private rematch(c: Client, g: Game): void {
    const color = this.colorOf(g, c.userId);
    if (!color || g.status !== 'ended') return this.send(c, { t: 'error', message: 'Rematch is only possible after the game' });
    if (this.inActiveGame(c.userId)) return this.send(c, { t: 'error', message: 'You are already playing a game' });
    g.rematch.add(color);
    if (g.rematch.size === 2) {
      g.rematch.clear();
      this.startGame(g.black.userId, g.white.userId, g.tc, g.rated); // colours swap
      return;
    }
    for (const oc of g[other(color)].conns) this.send(oc, { t: 'rematchOffered', gameId: g.id });
  }

  private pgn(g: Game): string {
    const date = new Date(g.startedAt);
    const d = `${date.getUTCFullYear()}.${String(date.getUTCMonth() + 1).padStart(2, '0')}.${String(date.getUTCDate()).padStart(2, '0')}`;
    const ch = new Chess();
    for (const u of g.moves) ch.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    ch.setHeader('Event', `Grim Chess ${g.rated ? 'rated' : 'casual'} game`);
    ch.setHeader('Site', this.cfg.mode === 'lan' ? 'Grim Chess LAN' : 'Grim Chess');
    ch.setHeader('Date', d);
    ch.setHeader('White', g.white.name);
    ch.setHeader('Black', g.black.name);
    ch.setHeader('Result', g.result ?? '*');
    ch.setHeader('WhiteElo', String(g.white.rating));
    ch.setHeader('BlackElo', String(g.black.rating));
    ch.setHeader('TimeControl', `${g.tc.initial}+${g.tc.increment}`);
    ch.setHeader('Termination', g.reason ?? '');
    let pgn = ch.pgn();
    if (!/(1-0|0-1|1\/2-1\/2)\s*$/.test(pgn)) pgn = `${pgn.trimEnd()} ${g.result}`;
    return pgn;
  }

  endGame(g: Game, result: Result, reason: string): void {
    if (g.status !== 'active') return;
    const now = Date.now();
    g.clocks = this.liveClocks(g, now);
    g.status = 'ended'; g.result = result; g.reason = reason; g.endedAt = now; g.drawOffer = null;
    if (g.flagTimer) clearTimeout(g.flagTimer);
    for (const p of [g.white, g.black]) if (p.graceTimer) { clearTimeout(p.graceTimer); p.graceTimer = null; }
    const whiteScore = result === '1-0' ? 1 : result === '0-1' ? 0 : 0.5;
    // Games with fewer than 2 plies are not rated (aborted-like).
    const ratedNow = g.rated && g.moves.length >= 2;
    try {
      tx(this.db, () => {
        if (ratedNow) {
          const w = getRating(this.db, g.white.userId, 'online'), b = getRating(this.db, g.black.userId, 'online');
          const w2 = updateRating(w, [{ opponentRating: b.rating, opponentRd: b.rd, score: whiteScore }]);
          const b2 = updateRating(b, [{ opponentRating: w.rating, opponentRd: w.rd, score: 1 - whiteScore }]);
          setRating(this.db, g.white.userId, 'online', w2);
          setRating(this.db, g.black.userId, 'online', b2);
          g.ratingChange = { white: Math.round(w2.rating - w.rating), black: Math.round(b2.rating - b.rating) };
        }
        const pgn = this.pgn(g);
        const at = new Date(g.startedAt).toISOString();
        for (const color of ['white', 'black'] as Color[]) {
          const me = g[color], opp = g[other(color)];
          const ev: TrainingEvent & { durationSec: number; gameId: string } = {
            type: 'game', mode: this.cfg.mode === 'lan' ? 'lan' : 'online', opponentRating: opp.rating, opponentRd: opp.rd,
            result: (color === 'white' ? whiteScore : 1 - whiteScore) as 0 | 0.5 | 1, color, pgn,
            timeControl: `${g.tc.initial}+${g.tc.increment}`, rated: ratedNow, at,
            durationSec: Math.round((now - g.startedAt) / 1000), gameId: g.id,
          };
          this.training.process(me.userId, [ev], { trusted: true, opponentName: opp.name });
        }
      });
    } catch (e) { console.error('[ws] failed to store game', g.id, e); }
    this.broadcast(g, { t: 'gameEnd', gameId: g.id, result, reason, ...(g.ratingChange ? { ratingChange: g.ratingChange } : {}) });
    this.broadcastState(g);
    this.scheduleLobby();
  }

  close(): void {
    this.closing = true;
    clearInterval(this.heartbeat);
    clearInterval(this.matcher);
    if (this.lobbyTimer) clearTimeout(this.lobbyTimer);
    for (const g of this.games.values()) {
      if (g.flagTimer) clearTimeout(g.flagTimer);
      for (const p of [g.white, g.black]) if (p.graceTimer) clearTimeout(p.graceTimer);
    }
    for (const c of this.clients) c.ws.close(1001, 'Server shutting down');
    this.wss.close();
  }
}
