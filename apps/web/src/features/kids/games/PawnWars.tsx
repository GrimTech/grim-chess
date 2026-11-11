// Pawn Wars: pawns only, first to promote wins (Polgár's first game). Kids play White against a small engine.
import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { FreeBoard, Confetti } from '../ui.tsx';
import { GameShell, postDrill, toFen } from './common.tsx';
import { botMove, initial, moves, play, toPieces, winner, type PWState } from './pawnwars-engine.ts';
import { getKids, recordGame } from '../store.ts';
import { earn } from '../stickers.ts';

type Mode = 'mini' | 'full';
function setup(mode: Mode): PWState {
  if (mode === 'full') return initial();
  const board: PWState['board'] = {};
  for (const f of 'cdef') { board[f + '2'] = 'w'; board[f + '7'] = 'b'; }
  return { board, turn: 'w', ep: null };
}

export function PawnWars() {
  const [mode, setMode] = useState<Mode>('mini');
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [s, setS] = useState<PWState>(() => setup('mini'));
  const [last, setLast] = useState<[string, string] | null>(null);
  const [say, setSay] = useState('Pawns only! Get one pawn to the other side first. You are White.');
  const [over, setOver] = useState<'w' | 'b' | null>(null);
  const [fire, setFire] = useState(0);
  const started = useRef(Date.now());
  const thinking = useRef(false);

  const restart = (m = mode, l = level) => {
    setMode(m); setLevel(l); setS(setup(m)); setLast(null); setOver(null); started.current = Date.now(); thinking.current = false;
    setSay('New game! Push your pawns. Watch out for captures.');
  };

  const end = (w: 'w' | 'b') => {
    setOver(w);
    const won = w === 'w';
    setSay(won ? 'You won Pawn Wars! Great planning!' : 'Black got there first this time. Want a rematch?');
    if (won) setFire((f) => f + 1);
    recordGame(`pawn-wars-${level}`, won ? 1 : 0, won);
    if (won) earn('pawn-wars-win');
    if (won && level >= 2 && (getKids().games['pawn-wars-2']?.wins ?? 0) + (getKids().games['pawn-wars-3']?.wins ?? 0) >= 3) earn('pawn-wars-master');
    void postDrill('move-drill', ['rules.pieces.pawn', 'rules.promotion'], won ? 1 : 0, (Date.now() - started.current) / 1000, { game: 'pawn-wars', mode, level, won });
  };

  useEffect(() => {
    if (s.turn !== 'b' || over) return;
    thinking.current = true;
    const t = setTimeout(() => {
      const m = botMove(s, level);
      thinking.current = false;
      if (!m) return;
      const n = play(s, m);
      setS(n); setLast([m.from, m.to]);
      const w = winner(n);
      if (w) end(w); else setSay(m.capture ? 'Black captured! Can you capture back?' : 'Your move!');
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, over]);

  const tryMove = (from: string, to: string) => {
    if (over || s.turn !== 'w' || thinking.current) return false;
    const m = moves(s).find((x) => x.from === from && x.to === to);
    if (!m) { if (s.board[from] === 'w') setSay('Pawns go straight forward, and capture one step diagonally.'); return false; }
    const n = play(s, m);
    setS(n); setLast([from, to]);
    const w = winner(n);
    if (w) end(w);
    return true;
  };

  return (
    <GameShell title="Pawn Wars" say={say} mood={over === 'w' ? 'cheer' : over === 'b' ? 'oops' : 'happy'}>
      <Confetti fire={fire} />
      <FreeBoard fen={toFen(toPieces(s), s.turn)} onTryMove={tryMove} canSelect={(q) => s.board[q] === 'w'} lastMove={last} disabled={!!over} />
      <div className="kid-actions">
        <div className="segmented kid-seg" role="group" aria-label="Board size">
          <button aria-pressed={mode === 'mini'} onClick={() => restart('mini')}>4 pawns</button>
          <button aria-pressed={mode === 'full'} onClick={() => restart('full')}>8 pawns</button>
        </div>
        <div className="segmented kid-seg" role="group" aria-label="Computer strength">
          {([1, 2, 3] as const).map((l) => <button key={l} aria-pressed={level === l} onClick={() => restart(mode, l)}>Level {l}</button>)}
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => restart()}><RotateCcw aria-hidden /> New game</button>
      </div>
    </GameShell>
  );
}
