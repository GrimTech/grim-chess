// Protect the King: the opponent threatens checkmate in one. Any move that stops every mate is correct
// (threat awareness, K8: concrete threats before abstract ideas). Positions verified by script (every one has a
// threat, at least one defence, and at least one move that fails).
import { useMemo, useRef, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { Chess } from 'chess.js';
import type { BoardArrow, BoardMove } from '../../../components/Board.tsx';
import { Confetti, KidsBoard } from '../ui.tsx';
import { GameShell, postDrill } from './common.tsx';
import { earn } from '../stickers.ts';
import { recordGame } from '../store.ts';

const POSITIONS: { fen: string; tip: string }[] = [
  { fen: '4r1k1/5ppp/8/8/R7/8/5PPP/6K1 w - - 0 1', tip: 'The black rook wants to jump to your back row.' },
  { fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', tip: 'The queen and bishop both aim at f7.' },
  { fen: '6k1/5ppp/3b4/8/7q/8/5PPP/1N3RK1 w - - 0 1', tip: 'The queen and bishop both aim at h2.' },
  { fen: '6k1/5ppp/8/8/6n1/8/6PP/3Q2RK w - - 0 1', tip: 'A sneaky knight wants to jump to f2. Your king is boxed in!' },
  { fen: '6k1/5ppp/8/2q5/8/8/4r1PP/3Q2K1 w - - 0 1', tip: 'Check! Escape, but do not walk into a trap.' },
  { fen: '1n3rk1/5ppp/8/7Q/8/3B4/8/6K1 b - - 0 1', tip: 'White\'s queen and bishop aim at h7.' },
  { fen: '6k1/5ppp/8/8/r7/8/5PPP/3R2K1 b - - 0 1', tip: 'White\'s rook wants your back row.' },
  { fen: '6k1/1b3ppp/8/4q3/8/5B2/6PP/7K w - - 0 1', tip: 'Black\'s queen and bishop line up toward your king.' },
  { fen: '6k1/1b3ppp/8/8/8/5qP1/5P1P/3B1RK1 w - - 0 1', tip: 'The black queen is right next to your king. Only one move saves you!' },
];

function mateReply(fen: string): { san: string; arrow: BoardArrow } | null {
  const c = new Chess(fen);
  for (const m of c.moves({ verbose: true })) {
    c.move(m.san);
    const mate = c.isCheckmate();
    c.undo();
    if (mate) return { san: m.san, arrow: [m.from, m.to, 'red'] };
  }
  return null;
}

export function ProtectKing() {
  const [i, setI] = useState(0);
  const p = POSITIONS[i];
  const side = p.fen.split(' ')[1] === 'b' ? 'black' : 'white';
  const [fen, setFen] = useState(p.fen);
  const [arrow, setArrow] = useState<BoardArrow | null>(null);
  const [state, setState] = useState<'play' | 'safe'>('play');
  const [say, setSay] = useState(`Danger! ${p.tip} Find a move that keeps your king safe.`);
  const [fire, setFire] = useState(0);
  const [score, setScore] = useState({ first: 0, total: 0 });
  const tries = useRef(0);
  const started = useRef(Date.now());
  const threat = useMemo(() => {
    // what would the opponent do if it were their move?
    if (new Chess(p.fen).inCheck()) return null;
    const parts = p.fen.split(' '); parts[1] = parts[1] === 'w' ? 'b' : 'w'; parts[3] = '-';
    try { return mateReply(parts.join(' ')); } catch { return null; }
  }, [p.fen]);

  const load = (k: number) => {
    const q = POSITIONS[k % POSITIONS.length];
    setI(k % POSITIONS.length); setFen(q.fen); setArrow(null); setState('play'); tries.current = 0;
    setSay(`Danger! ${q.tip} Find a move that keeps your king safe.`);
  };

  const onMove = (m: BoardMove) => {
    if (state !== 'play') return false;
    tries.current++;
    const reply = mateReply(m.fenAfter);
    if (reply) {
      setArrow(reply.arrow);
      setSay(`Oh no! Then the other side plays ${reply.san} and it is checkmate. Try again!`);
      setFen(p.fen);
      return false;
    }
    setFen(m.fenAfter); setArrow(null); setState('safe'); setFire((f) => f + 1);
    const first = tries.current === 1;
    const sc = { first: score.first + (first ? 1 : 0), total: score.total + 1 };
    setScore(sc);
    setSay(first ? 'Safe! You spotted the danger right away. Great looking!' : 'Safe! You kept trying and found it.');
    if (sc.total >= 5) earn('protect-king');
    recordGame('protect-king', sc.first, true);
    void postDrill('move-drill', ['calculation.threat-awareness', 'checkmate.mate-defence'], first ? 1 : 0.5, (Date.now() - started.current) / 1000, { game: 'protect-the-king', position: i, tries: tries.current });
    started.current = Date.now();
  };

  return (
    <GameShell title="Protect the King" say={say} mood={state === 'safe' ? 'cheer' : arrow ? 'oops' : 'think'} aside={<span className="chip-stat">{score.total} safe</span>}>
      <Confetti fire={fire} />
      <KidsBoard fen={fen} orientation={side} movable={state === 'play' ? side : 'none'} onMove={onMove}
        arrows={arrow ? [arrow] : undefined} feedback={state === 'safe' ? 'correct' : null} />
      <div className="kid-actions">
        {state === 'play' && threat && <button className="btn btn-soft btn-lg" onClick={() => { tries.current++; setArrow(threat.arrow); setSay(`The danger: ${threat.san} would be checkmate. Stop it!`); }}>Show the danger</button>}
        <button className="btn btn-ghost btn-lg" onClick={() => load(i)}><RotateCcw aria-hidden /> Again</button>
        <button className={`btn btn-lg ${state === 'safe' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => load(i + 1)}>Next <ArrowRight aria-hidden /></button>
      </div>
    </GameShell>
  );
}
