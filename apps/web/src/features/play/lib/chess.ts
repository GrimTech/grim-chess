// Small chess helpers shared by the play feature (chess.js based).
import { Chess, DEFAULT_POSITION } from 'chess.js';

export type Color = 'white' | 'black';
export const START_FEN = DEFAULT_POSITION;
export const other = (c: Color): Color => (c === 'white' ? 'black' : 'white');
export const turnOf = (fen: string): Color => (fen.split(' ')[1] === 'b' ? 'black' : 'white');

export interface Ply { uci: string; san: string; fen: string /* after the move */; from: string; to: string }

export interface GameResult { result: '1-0' | '0-1' | '1/2-1/2'; reason: string }

/** Apply a UCI move to a FEN; returns null when illegal. */
export function applyUci(fen: string, uci: string): Ply | null {
  const c = new Chess(fen);
  try {
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return { uci: m.from + m.to + (m.promotion ?? ''), san: m.san, fen: c.fen(), from: m.from, to: m.to };
  } catch { return null; }
}

/** Replay UCI moves from a start position. Stops at the first illegal move. */
export function replayUci(startFen: string, ucis: string[]): Ply[] {
  const out: Ply[] = [];
  let fen = startFen;
  for (const u of ucis) { const p = applyUci(fen, u); if (!p) break; out.push(p); fen = p.fen; }
  return out;
}

/** Game-over detection from the move history (needed for threefold repetition). */
export function detectEnd(startFen: string, plies: Ply[]): GameResult | null {
  const c = new Chess(startFen);
  for (const p of plies) c.move({ from: p.uci.slice(0, 2), to: p.uci.slice(2, 4), promotion: p.uci[4] });
  if (c.isCheckmate()) return { result: c.turn() === 'w' ? '0-1' : '1-0', reason: 'checkmate' };
  if (c.isStalemate()) return { result: '1/2-1/2', reason: 'stalemate' };
  if (c.isInsufficientMaterial()) return { result: '1/2-1/2', reason: 'insufficient material' };
  if (c.isThreefoldRepetition()) return { result: '1/2-1/2', reason: 'threefold repetition' };
  if (c.isDrawByFiftyMoves()) return { result: '1/2-1/2', reason: 'fifty-move rule' };
  return null;
}

/** Can `color` still deliver mate with its remaining material? (used when the opponent flags) */
export function canMate(fen: string, color: Color): boolean {
  const board = fen.split(' ')[0];
  const mine = color === 'white' ? board.replace(/[^PNBRQ]/g, '') : board.replace(/[^pnbrq]/g, '').toUpperCase();
  if (/[PRQ]/.test(mine)) return true;
  return mine.length >= 2; // two minors can (in theory) mate
}

export const winnerResult = (winner: Color): GameResult['result'] => (winner === 'white' ? '1-0' : '0-1');

/** Score for `color` from a result string. */
export const scoreFor = (result: GameResult['result'], color: Color): 1 | 0.5 | 0 =>
  result === '1/2-1/2' ? 0.5 : (result === '1-0') === (color === 'white') ? 1 : 0;

const REASONS: Record<string, string> = {
  resign: 'resignation', agreement: 'agreement', timeout: 'timeout', 'timeout-vs-insufficient': 'timeout vs insufficient material',
  insufficient: 'insufficient material', repetition: 'threefold repetition', 'fifty-move': 'fifty-move rule', abandoned: 'abandonment',
};

export function describeResult(res: GameResult, you?: Color): string {
  const r = { ...res, reason: REASONS[res.reason] ?? (res.reason || 'result') };
  if (r.result === '1/2-1/2') return `Draw by ${r.reason}`;
  const winner: Color = r.result === '1-0' ? 'white' : 'black';
  const who = you ? (winner === you ? 'You won' : 'You lost') : `${winner === 'white' ? 'White' : 'Black'} wins`;
  return `${who} by ${r.reason}`;
}

export interface PgnHeaders { [k: string]: string | undefined }

export function buildPgn(startFen: string, plies: Ply[], headers: PgnHeaders, result: string = '*'): string {
  const c = new Chess(startFen);
  const h: PgnHeaders = {
    Event: 'Grim Chess game', Site: 'Grim Chess', Date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
    Round: '-', White: 'White', Black: 'Black', ...headers, Result: result,
  };
  if (startFen !== START_FEN) { h.SetUp = '1'; h.FEN = startFen; }
  for (const [k, v] of Object.entries(h)) if (v != null) c.setHeader(k, v);
  for (const p of plies) c.move({ from: p.uci.slice(0, 2), to: p.uci.slice(2, 4), promotion: p.uci[4] });
  let pgn = c.pgn();
  if (!/(1-0|0-1|1\/2-1\/2|\*)\s*$/.test(pgn)) pgn = `${pgn.trimEnd()} ${result}`;
  return pgn;
}

export interface ParsedGame { startFen: string; plies: Ply[]; headers: Record<string, string> }

/** Parse a PGN (or a bare FEN) into a start position and plies. Throws on invalid input. */
export function parsePgnOrFen(text: string): ParsedGame {
  const t = text.trim();
  if (!t) throw new Error('Paste a PGN or FEN first.');
  if (/^([rnbqkpRNBQKP1-8]+\/){7}[rnbqkpRNBQKP1-8]+\s+[wb]/.test(t)) {
    const c = new Chess(t); // throws on illegal FEN
    return { startFen: c.fen(), plies: [], headers: {} };
  }
  const c = new Chess();
  c.loadPgn(t);
  const headers = c.getHeaders() as Record<string, string>;
  const startFen = headers.FEN ?? START_FEN;
  const history = c.history({ verbose: true });
  const plies: Ply[] = history.map((m) => ({ uci: m.from + m.to + (m.promotion ?? ''), san: m.san, fen: m.after, from: m.from, to: m.to }));
  return { startFen, plies, headers };
}

export function uciToSanLine(fen: string, ucis: string[], max = 10): string[] {
  const out: string[] = [];
  let f = fen;
  for (const u of ucis.slice(0, max)) { const p = applyUci(f, u); if (!p) break; out.push(p.san); f = p.fen; }
  return out;
}

/** Move number label for a ply index (0-based) given the starting FEN. */
export function moveLabel(startFen: string, plyIndex: number): string {
  const fullmove = Number(startFen.split(' ')[5] || 1);
  const blackFirst = turnOf(startFen) === 'black';
  const idx = plyIndex + (blackFirst ? 1 : 0);
  const n = fullmove + Math.floor(idx / 2);
  return idx % 2 === 0 ? `${n}.` : `${n}...`;
}

export function formatScore(line: { cp?: number; mate?: number } | undefined, whitePov: boolean, turn: Color): string {
  if (!line) return '…';
  const sign = whitePov && turn === 'black' ? -1 : 1;
  if (line.mate != null) { const m = line.mate * sign; return m === 0 ? '#' : `${m > 0 ? '' : '-'}M${Math.abs(m)}`; }
  const cp = (line.cp ?? 0) * sign;
  return `${cp > 0 ? '+' : cp < 0 ? '−' : ''}${Math.abs(cp / 100).toFixed(1)}`;
}

/** White-POV centipawns from a side-to-move engine line (mate = +/-1000). */
export function whiteCp(line: { cp?: number; mate?: number } | undefined, turn: Color): number {
  if (!line) return 0;
  const stm = line.mate != null ? (line.mate > 0 ? 1000 : -1000) : Math.max(-1000, Math.min(1000, line.cp ?? 0));
  return turn === 'white' ? stm : -stm;
}

export const tcLabel = (tc: { initial: number; increment: number } | null) =>
  tc ? `${tc.initial >= 60 ? tc.initial / 60 : `${tc.initial}s`}+${tc.increment}` : 'Untimed';

export function downloadText(filename: string, text: string, type = 'application/x-chess-pgn') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
