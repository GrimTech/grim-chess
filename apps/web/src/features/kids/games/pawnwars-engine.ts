// Pawn Wars rules and a tiny alpha-beta engine (pawns only, no kings, so the main engines cannot play it).
// Rules (knowledge-base/05-children/mini-games.md #2): pawns on their starting squares; win by promoting first,
// capturing every enemy pawn, or leaving the opponent without a legal move. Double steps and en passant allowed.
export type Side = 'w' | 'b';
export interface PWState { board: Record<string, Side>; turn: Side; ep: string | null }
export interface PWMove { from: string; to: string; capture: boolean; ep?: boolean }

const F = 'abcdefgh';
const sq = (f: number, r: number) => (f >= 0 && f < 8 && r >= 0 && r < 8 ? F[f] + (r + 1) : null);

export function initial(): PWState {
  const board: Record<string, Side> = {};
  for (const f of F) { board[f + '2'] = 'w'; board[f + '7'] = 'b'; }
  return { board, turn: 'w', ep: null };
}

export function moves(s: PWState): PWMove[] {
  const out: PWMove[] = [];
  const dir = s.turn === 'w' ? 1 : -1; const start = s.turn === 'w' ? 1 : 6;
  for (const [k, side] of Object.entries(s.board)) {
    if (side !== s.turn) continue;
    const f = k.charCodeAt(0) - 97, r = Number(k[1]) - 1;
    const one = sq(f, r + dir);
    if (one && !s.board[one]) {
      out.push({ from: k, to: one, capture: false });
      const two = sq(f, r + 2 * dir);
      if (r === start && two && !s.board[two]) out.push({ from: k, to: two, capture: false });
    }
    for (const df of [-1, 1]) {
      const t = sq(f + df, r + dir);
      if (!t) continue;
      if (s.board[t] && s.board[t] !== s.turn) out.push({ from: k, to: t, capture: true });
      else if (t === s.ep) out.push({ from: k, to: t, capture: true, ep: true });
    }
  }
  return out;
}

export function play(s: PWState, m: PWMove): PWState {
  const board = { ...s.board };
  delete board[m.from];
  if (m.ep) delete board[m.to[0] + m.from[1]];
  board[m.to] = s.turn;
  const fr = Number(m.from[1]), tr = Number(m.to[1]);
  const ep = Math.abs(tr - fr) === 2 ? m.from[0] + String((fr + tr) / 2) : null;
  return { board, turn: s.turn === 'w' ? 'b' : 'w', ep };
}

/** Winner after the last move, or null if the game goes on. */
export function winner(s: PWState): Side | null {
  for (const [k, side] of Object.entries(s.board)) {
    if (side === 'w' && k[1] === '8') return 'w';
    if (side === 'b' && k[1] === '1') return 'b';
  }
  const vals = Object.values(s.board);
  if (!vals.includes('w')) return 'b';
  if (!vals.includes('b')) return 'w';
  if (!moves(s).length) return s.turn === 'w' ? 'b' : 'w'; // the side to move is stuck and loses
  return null;
}

function evaluate(s: PWState): number {
  // from White's point of view. Per-file most-advanced pawns give a fast passed-pawn test.
  const wMax = new Array(8).fill(-1), bMin = new Array(8).fill(8);
  const ws: number[][] = [], bs: number[][] = [];
  for (const [k, side] of Object.entries(s.board)) {
    const f = k.charCodeAt(0) - 97, r = Number(k[1]) - 1;
    if (side === 'w') { ws.push([f, r]); } else { bs.push([f, r]); }
  }
  for (const [f, r] of bs) for (let d = -1; d <= 1; d++) { const x = f + d; if (x >= 0 && x < 8) wMax[x] = Math.max(wMax[x], r); }
  for (const [f, r] of ws) for (let d = -1; d <= 1; d++) { const x = f + d; if (x >= 0 && x < 8) bMin[x] = Math.min(bMin[x], r); }
  let v = 0, wRace = 9, bRace = 9;
  for (const [f, r] of ws) {
    const adv = r - 1; const passed = wMax[f] <= r;
    v += 100 + adv * adv * 4 + (passed ? 40 + adv * 30 : 0);
    if (passed) wRace = Math.min(wRace, 7 - r);
  }
  for (const [f, r] of bs) {
    const adv = 6 - r; const passed = bMin[f] >= r;
    v -= 100 + adv * adv * 4 + (passed ? 40 + adv * 30 : 0);
    if (passed) bRace = Math.min(bRace, r);
  }
  // unstoppable race: compare moves to promote (side to move gets one tempo)
  if (wRace < 9 || bRace < 9) {
    const w = wRace - (s.turn === 'w' ? 1 : 0), b = bRace - (s.turn === 'b' ? 1 : 0);
    if (w < b) v += 600; else if (b < w) v -= 600;
  }
  return v;
}

const WIN = 100000;
function search(s: PWState, depth: number, alpha: number, beta: number, ply: number, lastTo: string | null): number {
  if (lastTo && (lastTo[1] === '8' || lastTo[1] === '1')) return -(WIN - ply); // the previous mover promoted
  const ms = moves(s);
  if (!ms.length) return -(WIN - ply); // no pawns or no moves: side to move loses
  if (depth === 0) return (s.turn === 'w' ? 1 : -1) * evaluate(s);
  let best = -Infinity;
  ms.sort((a, b) => Number(b.capture) - Number(a.capture) || Math.abs(Number(b.to[1]) - 4.5) - Math.abs(Number(a.to[1]) - 4.5));
  for (const m of ms) {
    const v = -search(play(s, m), depth - 1, -beta, -alpha, ply + 1, m.to);
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

/** level 1: shallow and often careless, 2: looks 2 moves ahead, 3: looks 4 moves ahead */
export function botMove(s: PWState, level: 1 | 2 | 3): PWMove | null {
  const ms = moves(s);
  if (!ms.length) return null;
  if (level === 1 && Math.random() < 0.35) return ms[Math.floor(Math.random() * ms.length)];
  const depth = level === 1 ? 1 : level === 2 ? 2 : Object.keys(s.board).length > 10 ? 3 : 4;
  let best: PWMove[] = []; let bestV = -Infinity;
  for (const m of ms) {
    const noise = Math.random() * (level === 3 ? 3 : 15);
    const floor = bestV === -Infinity ? -Infinity : bestV - noise - 1;
    const v = -search(play(s, m), depth - 1, -Infinity, -floor, 1, m.to) + noise;
    if (v > bestV) { bestV = v; best = [m]; } else if (v === bestV) best.push(m);
  }
  return best[Math.floor(Math.random() * best.length)];
}

export function toPieces(s: PWState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, side] of Object.entries(s.board)) out[k] = side === 'w' ? 'P' : 'p';
  return out;
}
