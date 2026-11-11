// Play a position out against the engine until a goal is reached (lesson play steps, mate drills, endgames).
import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Board, type BoardMove } from '../../components/Board.tsx';
import { bestMove } from '../../lib/engine.ts';
import { applyUci, materialDiff, pieceCount, sideToMove } from './util.ts';

export type PlayGoal = 'win' | 'draw' | 'mate' | 'promote' | 'hold';
export interface PlayOutcome { success: boolean; reason: string; learnerMoves: number; fen: string }

const DEFAULT_MAX: Record<PlayGoal, number> = { mate: 40, win: 60, promote: 25, hold: 30, draw: 30 };

function hasMatingMaterial(fen: string, color: 'white' | 'black') {
  const p = pieceCount(fen, color);
  return p.q > 0 || p.r > 0 || p.p > 0 || p.b >= 2 || (p.b >= 1 && p.n >= 1);
}
function bareKing(fen: string, color: 'white' | 'black') {
  const p = pieceCount(fen, color);
  return p.p + p.n + p.b + p.r + p.q === 0;
}

/** Evaluate the goal after a move. Returns an outcome if the episode is over. */
export function judge(goal: PlayGoal, startFen: string, fen: string, learner: 'white' | 'black', learnerMoves: number, maxMoves: number): PlayOutcome | null {
  const c = new Chess(fen);
  const learnerToMove = sideToMove(fen) === learner;
  const done = (success: boolean, reason: string) => ({ success, reason, learnerMoves, fen });
  if (c.isCheckmate()) {
    return learnerToMove ? done(false, 'You were checkmated.') : done(true, 'Checkmate!');
  }
  const opp = learner === 'white' ? 'black' : 'white';
  if (c.isDraw() || c.isStalemate()) {
    const why = c.isStalemate() ? 'Stalemate' : c.isInsufficientMaterial() ? 'Insufficient material' : c.isThreefoldRepetition() ? 'Threefold repetition' : 'Fifty-move rule';
    return done(goal === 'draw' || goal === 'hold', `${why}: the game is drawn.`);
  }
  const startDiff = materialDiff(startFen, learner);
  const diff = materialDiff(fen, learner);
  if (goal === 'hold' || goal === 'draw') {
    if (diff <= startDiff - 4 && !hasMatingMaterial(fen, learner) && hasMatingMaterial(fen, opp)) return done(false, 'You lost decisive material.');
    if (pieceCount(fen, opp).q > pieceCount(startFen, opp).q) return done(false, 'The opponent promoted.');
    if (learnerMoves >= maxMoves) return done(true, `You held for ${maxMoves} moves.`);
    return null;
  }
  if (goal === 'promote' && learnerToMove) {
    const promoted = pieceCount(fen, learner).q > pieceCount(startFen, learner).q;
    if (promoted) return done(true, 'Promoted, and the new queen survived.');
  }
  if (goal === 'win' && learnerToMove) {
    if (bareKing(fen, opp) && hasMatingMaterial(fen, learner)) return done(true, 'Only the bare king is left: a technically won position.');
    if (diff >= startDiff + 7) return done(true, 'Decisive material advantage reached.');
  }
  if (learnerMoves >= maxMoves) return done(false, `Goal not reached within ${maxMoves} moves.`);
  return null;
}

interface Props {
  fen: string; goal: PlayGoal; maxMoves?: number; engineLevel?: number;
  onFinish: (o: PlayOutcome) => void;
  /** Key to restart */
  attempt?: number;
}

export function PlayOut({ fen: startFen, goal, maxMoves, engineLevel, onFinish, attempt = 0 }: Props) {
  const learner = sideToMove(startFen);
  const max = maxMoves ?? DEFAULT_MAX[goal];
  const [fen, setFen] = useState(startFen);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [thinking, setThinking] = useState(false);
  const [moves, setMoves] = useState(0);
  const [over, setOver] = useState<PlayOutcome | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { setFen(startFen); setLast(null); setMoves(0); setOver(null); setErr(null); setThinking(false); }, [startFen, attempt]);

  const finish = (o: PlayOutcome) => { setOver(o); onFinish(o); };

  const onMove = (m: BoardMove) => {
    if (over || thinking) return false;
    const n = moves + 1;
    setFen(m.fenAfter); setLast([m.from, m.to]); setMoves(n);
    const j = judge(goal, startFen, m.fenAfter, learner, n, max);
    if (j) { finish(j); return true; }
    setThinking(true);
    const started = Date.now();
    bestMove(m.fenAfter, engineLevel ? { level: engineLevel } : { movetimeMs: 600 })
      .then((uci) => {
        const wait = Math.max(0, 350 - (Date.now() - started));
        setTimeout(() => {
          if (!alive.current) return;
          const r = applyUci(m.fenAfter, uci);
          setThinking(false);
          if (!r) { setErr('The engine returned an illegal move.'); return; }
          setFen(r.fen); setLast([r.from, r.to]);
          const j2 = judge(goal, startFen, r.fen, learner, n, max);
          if (j2) finish(j2);
        }, wait);
      })
      .catch((e: unknown) => { if (alive.current) { setThinking(false); setErr(`Engine unavailable: ${(e as Error).message}`); } });
    return true;
  };

  const goalText: Record<PlayGoal, string> = { mate: 'Deliver checkmate', win: 'Win the position', promote: 'Promote a pawn', hold: 'Hold the position', draw: 'Reach a draw' };
  return (
    <div className="stack">
      <div className="lr-board" data-state={over ? (over.success ? 'correct' : 'wrong') : undefined}>
        <Board fen={fen} orientation={learner} movable={over || thinking ? 'none' : learner} onMove={onMove} lastMove={last} />
      </div>
      <div className="prompt" data-state={over ? (over.success ? 'correct' : 'wrong') : undefined}>
        <span className="prompt__turn" data-color={learner} aria-hidden="true" />
        <p className="prompt__title" role="status" aria-live="polite">
          {over ? over.reason : thinking ? 'Engine is thinking…' : `${goalText[goal]} (${moves}/${max} moves)`}
        </p>
      </div>
      {err && <p className="error" role="alert">{err}</p>}
    </div>
  );
}
