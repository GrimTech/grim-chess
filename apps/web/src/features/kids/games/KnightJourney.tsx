// Knight's Journey: reach the star with the knight in the fewest jumps. Rocks (black pawns) cannot be landed on.
import { useMemo, useRef, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { FreeBoard, Confetti, Stars } from '../ui.tsx';
import { GameShell, postDrill, toFen, fileIdx, rankIdx, sqOf } from './common.tsx';
import { recordGame } from '../store.ts';
import { earn } from '../stickers.ts';

interface Level { start: string; goal: string; rocks: string[] }
const LEVELS: Level[] = [
  { start: 'b1', goal: 'c3', rocks: [] },
  { start: 'b1', goal: 'd4', rocks: [] },
  { start: 'g1', goal: 'g3', rocks: [] },
  { start: 'a1', goal: 'b2', rocks: [] },
  { start: 'd4', goal: 'd5', rocks: [] },
  { start: 'a1', goal: 'h8', rocks: [] },
  { start: 'b1', goal: 'e5', rocks: ['c3', 'd2'] },
  { start: 'e1', goal: 'e8', rocks: ['d3', 'f3', 'c2'] },
  { start: 'a8', goal: 'h1', rocks: ['c7', 'b6', 'e5', 'f4'] },
  { start: 'h1', goal: 'a8', rocks: ['g3', 'f2', 'd5', 'c4', 'b6'] },
];
const JUMPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const jumps = (sq: string, rocks: Set<string>) => JUMPS.map(([df, dr]) => sqOf(fileIdx(sq) + df, rankIdx(sq) + dr)).filter((t): t is string => !!t && !rocks.has(t));

function bfs(l: Level): number {
  const rocks = new Set(l.rocks); const seen = new Set([l.start]); let fr = [l.start];
  for (let d = 1; d < 64; d++) {
    const nx: string[] = [];
    for (const s of fr) for (const t of jumps(s, rocks)) { if (t === l.goal) return d; if (!seen.has(t)) { seen.add(t); nx.push(t); } }
    fr = nx;
  }
  return Infinity;
}

export function KnightJourney() {
  const [li, setLi] = useState(0);
  const lvl = LEVELS[li];
  const best = useMemo(() => bfs(lvl), [lvl]);
  const [pos, setPos] = useState(lvl.start);
  const [count, setCount] = useState(0);
  const [trail, setTrail] = useState<string[]>([]);
  const [done, setDone] = useState<number | null>(null);
  const [fire, setFire] = useState(0);
  const [say, setSay] = useState(`Jump the knight to the yellow star. Can you do it in ${best} ${best === 1 ? 'jump' : 'jumps'}?`);
  const started = useRef(Date.now());

  const load = (i: number) => {
    const l = LEVELS[i]; const b = bfs(l);
    setLi(i); setPos(l.start); setCount(0); setTrail([]); setDone(null); started.current = Date.now();
    setSay(`Level ${i + 1}: reach the star in ${b} ${b === 1 ? 'jump' : 'jumps'}.${l.rocks.length ? ' Do not land on the rocks!' : ''}`);
  };

  const tryMove = (from: string, to: string) => {
    if (done != null || from !== pos) return false;
    if (!jumps(pos, new Set(lvl.rocks)).includes(to)) { setSay(lvl.rocks.includes(to) ? 'That is a rock! Knights jump over rocks but cannot land on them.' : 'Knights jump in an L: two squares, then one to the side.'); return false; }
    const n = count + 1; setCount(n); setTrail((t) => [...t, from]); setPos(to);
    if (to === lvl.goal) {
      const stars = n <= best ? 3 : n <= best + 2 ? 2 : 1;
      setDone(stars); setFire((f) => f + 1);
      setSay(n <= best ? `You made it in ${n}. That is the shortest journey!` : `You made it in ${n} jumps! The shortest is ${best}. Try again?`);
      recordGame(`knight-${li}`, n, true, false);
      if (n <= best && li >= 5) earn('knight-journey');
      void postDrill('visualization-drill', ['rules.pieces.knight', 'calculation.board-vision'], Math.min(1, best / n), (Date.now() - started.current) / 1000, { game: 'knights-journey', level: li + 1, moves: n, best });
    }
    return true;
  };

  const pieces: Record<string, string> = { [pos]: 'N' };
  for (const r of lvl.rocks) pieces[r] = 'p';

  return (
    <GameShell title="Knight's Journey" say={say} mood={done ? 'cheer' : 'happy'} aside={<span className="chip-stat">Jumps: {count}</span>}>
      <Confetti fire={fire} />
      <FreeBoard fen={toFen(pieces)} onTryMove={tryMove} canSelect={(q) => q === pos} highlights={[lvl.goal, ...trail.slice(-1)]} disabled={done != null} />
      <div className="kid-actions">
        {done != null && <Stars n={done} size={40} />}
        <button className="btn btn-soft btn-lg" onClick={() => load(li)}><RotateCcw aria-hidden /> Again</button>
        {li + 1 < LEVELS.length && <button className={`btn btn-lg ${done ? 'btn-primary' : 'btn-ghost'}`} onClick={() => load(li + 1)}>Next level <ArrowRight aria-hidden /></button>}
        <span className="kid-movecount">Level {li + 1} of {LEVELS.length}</span>
      </div>
    </GameShell>
  );
}
