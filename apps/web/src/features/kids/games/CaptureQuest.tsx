// Capture Quest ("collect the stars", mini-games.md #1): one white piece, black pawns that never move.
// Capture them all in as few moves as possible. The minimum is computed by breadth-first search.
import { useMemo, useRef, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { FreeBoard, Confetti, Stars } from '../ui.tsx';
import { GameShell, postDrill, toFen, fileIdx, rankIdx, sqOf } from './common.tsx';
import { recordGame } from '../store.ts';
import { earn } from '../stickers.ts';

type PieceT = 'R' | 'B' | 'Q' | 'K' | 'N';
interface Level { piece: PieceT; start: string; targets: string[] }
const LEVELS: Level[] = [
  { piece: 'R', start: 'a1', targets: ['a5', 'e5', 'e8'] },
  { piece: 'B', start: 'c1', targets: ['e3', 'g5', 'd8'] },
  { piece: 'K', start: 'e1', targets: ['e3', 'g4', 'c4'] },
  { piece: 'Q', start: 'd1', targets: ['a4', 'd7', 'h5', 'g8'] },
  { piece: 'N', start: 'b1', targets: ['c3', 'e4', 'f6'] },
  { piece: 'R', start: 'h1', targets: ['b2', 'b7', 'f7', 'f3', 'd5'] },
  { piece: 'B', start: 'f1', targets: ['b5', 'd7', 'g6', 'c2', 'e2'] },
  { piece: 'N', start: 'g1', targets: ['e2', 'd4', 'b5', 'c7', 'e6'] },
  { piece: 'Q', start: 'a1', targets: ['c3', 'h3', 'h8', 'c8', 'f5', 'b6'] },
  { piece: 'N', start: 'a1', targets: ['b3', 'd2', 'f3', 'h4', 'g6', 'e7'] },
];
const NAMES: Record<PieceT, string> = { R: 'rook', B: 'bishop', Q: 'queen', K: 'king', N: 'knight' };
const SKILL: Record<PieceT, string> = { R: 'rules.pieces.rook', B: 'rules.pieces.bishop', Q: 'rules.pieces.queen', K: 'rules.pieces.king', N: 'rules.pieces.knight' };

/** destinations of `piece` on `from`, with `blockers` (targets: may be captured but not passed) */
function dests(piece: PieceT, from: string, blockers: Set<string>): string[] {
  const f = fileIdx(from), r = rankIdx(from);
  const out: string[] = [];
  const steps = (dirs: number[][], slide: boolean) => {
    for (const [df, dr] of dirs) {
      let k = 1;
      for (;;) {
        const t = sqOf(f + df * k, r + dr * k);
        if (!t) break;
        out.push(t);
        if (blockers.has(t) || !slide) break;
        k++;
      }
    }
  };
  const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  if (piece === 'R') steps(ORTHO, true);
  if (piece === 'B') steps(DIAG, true);
  if (piece === 'Q') steps([...ORTHO, ...DIAG], true);
  if (piece === 'K') steps([...ORTHO, ...DIAG], false);
  if (piece === 'N') steps([[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]], false);
  return out;
}

export function minMoves(l: Level): number {
  const n = l.targets.length; const full = (1 << n) - 1;
  const key = (sq: string, mask: number) => `${sq}|${mask}`;
  let frontier: [string, number][] = [[l.start, 0]];
  const seen = new Set([key(l.start, 0)]);
  for (let d = 1; d < 64; d++) {
    const next: [string, number][] = [];
    for (const [sq, mask] of frontier) {
      const left = new Set(l.targets.filter((_, i) => !(mask & (1 << i))));
      for (const t of dests(l.piece, sq, left)) {
        const i = l.targets.indexOf(t);
        const m2 = i >= 0 && !(mask & (1 << i)) ? mask | (1 << i) : mask;
        if (m2 === full) return d;
        const k = key(t, m2);
        if (!seen.has(k)) { seen.add(k); next.push([t, m2]); }
      }
    }
    frontier = next;
  }
  return Infinity;
}

export function CaptureQuest() {
  const [li, setLi] = useState(0);
  const lvl = LEVELS[li];
  const best = useMemo(() => minMoves(lvl), [lvl]);
  const [pos, setPos] = useState(lvl.start);
  const [left, setLeft] = useState<string[]>(lvl.targets);
  const [count, setCount] = useState(0);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [fire, setFire] = useState(0);
  const [say, setSay] = useState(`Capture all the black pawns with your ${NAMES[lvl.piece]}. They never move! Can you do it in ${best} moves?`);
  const started = useRef(Date.now());

  const load = (i: number) => {
    const l = LEVELS[i]; setLi(i); setPos(l.start); setLeft(l.targets); setCount(0); setLast(null); setDone(null); started.current = Date.now();
    setSay(`Level ${i + 1}: use your ${NAMES[l.piece]}. Best is ${minMoves(l)} moves.`);
  };

  const tryMove = (from: string, to: string) => {
    if (done != null || from !== pos) return false;
    if (!dests(lvl.piece, pos, new Set(left)).includes(to)) { setSay(`The ${NAMES[lvl.piece]} cannot move like that. Try another square!`); return false; }
    const n = count + 1; setCount(n); setPos(to); setLast([from, to]);
    const rest = left.filter((t) => t !== to);
    setLeft(rest);
    if (!rest.length) {
      const stars = n <= best ? 3 : n <= best + 2 ? 2 : 1;
      setDone(stars); setFire((f) => f + 1);
      setSay(n <= best ? `All captured in ${n} moves. That is the shortest way. Amazing planning!` : `All captured in ${n} moves! The shortest way is ${best}. Want to try again?`);
      recordGame(`capture-${li}`, n, true, false);
      if (n <= best) earn('capture-perfect');
      void postDrill('move-drill', [SKILL[lvl.piece], 'rules.capture'], Math.min(1, best / n), (Date.now() - started.current) / 1000, { game: 'capture-quest', level: li + 1, moves: n, best });
    } else if (to !== from && lvl.targets.includes(to) && left.includes(to)) setSay(`Gobble! ${rest.length} to go.`);
    return true;
  };

  const pieces: Record<string, string> = { [pos]: lvl.piece };
  for (const t of left) pieces[t] = 'p';

  return (
    <GameShell title="Capture Quest" say={say} mood={done ? 'cheer' : 'happy'} aside={<span className="chip-stat">Moves: {count}</span>}>
      <Confetti fire={fire} />
      <FreeBoard fen={toFen(pieces)} onTryMove={tryMove} canSelect={(q) => q === pos} lastMove={last} disabled={done != null} />
      <div className="kid-actions">
        {done != null && <Stars n={done} size={40} />}
        <button className="btn btn-soft btn-lg" onClick={() => load(li)}><RotateCcw aria-hidden /> Again</button>
        {li + 1 < LEVELS.length && <button className={`btn btn-lg ${done ? 'btn-primary' : 'btn-ghost'}`} onClick={() => load(li + 1)}>Next level <ArrowRight aria-hidden /></button>}
        <span className="kid-movecount">Level {li + 1} of {LEVELS.length}</span>
      </div>
    </GameShell>
  );
}
