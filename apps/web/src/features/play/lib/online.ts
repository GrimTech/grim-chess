// WebSocket client for internet / LAN play. Protocol: docs/ARCHITECTURE.md ("WebSocket protocol").
// - Reconnects with backoff; after (re)connecting it sends `rejoin` for the game id kept in sessionStorage,
//   so reloading the page during a game resumes it (the server gives 60 s grace).
// - Clocks: GameView.clocks are the server's values at GameView.serverTime. We estimate the server-client
//   clock offset as the minimum (Date.now() - serverTime) observed (minimum latency ~ true offset) and count down
//   the side to move locally from that snapshot, so the display is smooth and re-synced on every message.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Color } from './chess.ts';

export interface TimeControl { initial: number; increment: number }
export interface GameView {
  id: string;
  white: { name: string; rating: number }; black: { name: string; rating: number };
  fen: string; moves: string[];
  clocks: { white: number; black: number };
  turn: Color; status: 'active' | 'ended';
  result?: '1-0' | '0-1' | '1/2-1/2'; reason?: string;
  tc: TimeControl; rated: boolean; you: Color | 'spectator'; serverTime: number;
  // optional server extras
  drawOffer?: Color | null;
  connected?: { white: boolean; black: boolean };
  ratingChange?: { white: number; black: number };
}
export interface LobbySeek { id: string; name: string; rating: number; tc: TimeControl; rated: boolean }
export interface GameEnd { gameId: string; result: '1-0' | '0-1' | '1/2-1/2'; reason: string; ratingChange?: { white: number; black: number } }

export type ConnState = 'connecting' | 'open' | 'closed';
const ACTIVE_KEY = 'grim.online.activeGame';

export function wsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
}

export interface OnlineState {
  conn: ConnState;
  lobby: { players: number; seeks: LobbySeek[]; games?: number } | null;
  seeking: TimeControl | null;
  roomCode: string | null;
  game: GameView | null;
  /** performance.now() when `game` was received, and offset estimate */
  receivedAt: number;
  drawOfferBy: Color | null;
  rematchOffered: boolean;
  end: GameEnd | null;
  error: string | null;
}

const initial: OnlineState = { conn: 'connecting', lobby: null, seeking: null, roomCode: null, game: null, receivedAt: 0, drawOfferBy: null, rematchOffered: false, end: null, error: null };

export function useOnline() {
  const [st, setSt] = useState<OnlineState>(initial);
  const stRef = useRef(st); stRef.current = st;
  const ws = useRef<WebSocket | null>(null);
  const outbox = useRef<string[]>([]);
  const offset = useRef<number | null>(null); // estimate of (client clock - server clock)
  const retry = useRef(0);

  const send = useCallback((msg: Record<string, unknown>) => {
    const s = JSON.stringify(msg);
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(s); else outbox.current.push(s);
  }, []);

  useEffect(() => {
    let disposed = false;
    let ping: ReturnType<typeof setInterval> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onGame = (g: GameView, s: OnlineState): OnlineState => {
      const skew = Date.now() - g.serverTime;
      offset.current = offset.current == null ? skew : Math.min(offset.current, skew);
      if (g.status === 'active' && g.you !== 'spectator') sessionStorage.setItem(ACTIVE_KEY, g.id);
      const sameGame = s.game?.id === g.id;
      return {
        ...s, game: g, receivedAt: performance.now() - Math.max(0, skew - offset.current),
        seeking: null, roomCode: g.status === 'active' ? null : s.roomCode,
        drawOfferBy: g.drawOffer !== undefined ? (g.drawOffer ?? null) : sameGame ? s.drawOfferBy : null,
        rematchOffered: sameGame ? s.rematchOffered : false,
        end: sameGame ? s.end : null,
      };
    };

    const connect = () => {
      setSt((s) => ({ ...s, conn: 'connecting' }));
      let sock: WebSocket;
      try { sock = new WebSocket(wsUrl()); } catch { scheduleRetry(); return; }
      ws.current = sock;
      sock.onopen = () => {
        retry.current = 0;
        setSt((s) => ({ ...s, conn: 'open', error: null }));
        const active = sessionStorage.getItem(ACTIVE_KEY);
        if (active) sock.send(JSON.stringify({ t: 'rejoin', gameId: active }));
        for (const m of outbox.current.splice(0)) sock.send(m);
        ping = setInterval(() => { if (sock.readyState === WebSocket.OPEN) sock.send('{"t":"ping"}'); }, 25000);
      };
      sock.onmessage = (e) => {
        let m: Record<string, unknown>;
        try { m = JSON.parse(String(e.data)); } catch { return; }
        setSt((s) => {
          switch (m.t) {
            case 'lobby': return { ...s, lobby: { players: Number(m.players) || 0, seeks: (m.seeks as LobbySeek[]) ?? [], games: m.games as number | undefined } };
            case 'roomCreated': return { ...s, roomCode: String(m.code), error: null };
            case 'gameStart': return { ...onGame(m.game as GameView, s), end: null, drawOfferBy: null, rematchOffered: false, error: null };
            case 'gameState': return onGame(m.game as GameView, s);
            case 'drawOffered': return s.game?.id === m.gameId ? { ...s, drawOfferBy: m.by as Color } : s;
            case 'rematchOffered': return s.game?.id === m.gameId ? { ...s, rematchOffered: true } : s;
            case 'gameEnd': {
              if (sessionStorage.getItem(ACTIVE_KEY) === m.gameId) sessionStorage.removeItem(ACTIVE_KEY);
              const end = m as unknown as GameEnd;
              const game = s.game && s.game.id === end.gameId ? { ...s.game, status: 'ended' as const, result: end.result, reason: end.reason, ratingChange: end.ratingChange } : s.game;
              return { ...s, end, game, drawOfferBy: null };
            }
            case 'error': {
              const msg = String(m.message ?? 'Server error');
              if (/game not found/i.test(msg)) sessionStorage.removeItem(ACTIVE_KEY);
              return { ...s, error: msg };
            }
            default: return s;
          }
        });
      };
      sock.onclose = () => {
        if (ping) clearInterval(ping);
        if (disposed) return;
        if (ws.current === sock) ws.current = null;
        setSt((s) => ({ ...s, conn: 'closed', seeking: null }));
        scheduleRetry();
      };
      sock.onerror = () => { /* onclose follows */ };
    };
    const scheduleRetry = () => {
      const delay = Math.min(10000, 500 * 2 ** retry.current++);
      timer = setTimeout(connect, delay);
    };
    connect();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      if (ping) clearInterval(ping);
      ws.current?.close();
      ws.current = null;
    };
  }, []);

  const actions = {
    seek: (tc: TimeControl, rated: boolean) => { send({ t: 'seek', tc, rated }); setSt((s) => ({ ...s, seeking: tc, error: null })); },
    cancelSeek: () => { send({ t: 'cancelSeek' }); setSt((s) => ({ ...s, seeking: null })); },
    createRoom: (tc: TimeControl, color: Color | 'random', rated = false) => { send({ t: 'createRoom', tc, color, rated }); setSt((s) => ({ ...s, error: null })); },
    joinRoom: (code: string) => { send({ t: 'joinRoom', code: code.trim().toUpperCase() }); setSt((s) => ({ ...s, error: null })); },
    move: (uci: string, newFen: string) => {
      const g = stRef.current.game;
      if (!g) return;
      send({ t: 'move', gameId: g.id, uci, ply: g.moves.length });
      setSt((s) => {
        if (!s.game || s.game.id !== g.id || s.game.moves.length !== g.moves.length) return s;
        // optimistic update; the server's gameState will confirm (or correct) it
        const now = performance.now();
        const mover = s.game.turn;
        const spent = now - s.receivedAt;
        const clocks = { ...s.game.clocks, [mover]: Math.max(0, s.game.clocks[mover] - spent) + s.game.tc.increment * 1000 };
        return { ...s, receivedAt: now, game: { ...s.game, fen: newFen, moves: [...s.game.moves, uci], turn: mover === 'white' ? 'black' : 'white', clocks } };
      });
    },
    resign: () => st.game && send({ t: 'resign', gameId: st.game.id }),
    offerDraw: () => st.game && send({ t: 'offerDraw', gameId: st.game.id }),
    acceptDraw: () => st.game && send({ t: 'acceptDraw', gameId: st.game.id }),
    declineDraw: () => { if (st.game) send({ t: 'declineDraw', gameId: st.game.id }); setSt((s) => ({ ...s, drawOfferBy: null })); },
    rematch: () => st.game && send({ t: 'rematch', gameId: st.game.id }),
    leaveGame: () => { sessionStorage.removeItem(ACTIVE_KEY); setSt((s) => ({ ...s, game: null, end: null, drawOfferBy: null, rematchOffered: false })); },
    clearError: () => setSt((s) => ({ ...s, error: null })),
  };

  return { ...st, ...actions };
}

/** Live remaining time for each side, counting down the side to move from the last server snapshot. */
export function liveClocks(g: GameView, receivedAt: number, now = performance.now()): { white: number; black: number } {
  const c = { ...g.clocks };
  if (g.status === 'active') c[g.turn] = Math.max(0, c[g.turn] - (now - receivedAt));
  return c;
}
