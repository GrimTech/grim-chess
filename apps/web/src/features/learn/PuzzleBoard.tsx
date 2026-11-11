// Puzzle solving board (Puzzle schema): auto-plays moves[0], learner plays moves[1], moves[3], ...
import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { Puzzle } from '@grim/core';
import { Board, type BoardMove } from '../../components/Board.tsx';
import { applyUci, sideToMove, useTimeouts, useElapsed, fmtTime } from './util.ts';

export interface PuzzleResult { solved: boolean; firstTry: boolean; durationSec: number; mistakes: number; gaveUp: boolean }

interface Props {
  puzzle: Puzzle;
  /** Called once when the puzzle is decided (solved, or failed in strict mode / gave up). */
  onResult: (r: PuzzleResult) => void;
  /** Strict: the first wrong move fails the puzzle (assessments, Woodpecker). */
  strict?: boolean;
  /** Hard time limit in seconds (assessment). */
  timeLimitSec?: number;
  showTimer?: boolean;
  /** Hide the solution / retry controls (assessment). */
  hideControls?: boolean;
  /** Choose-a-move format: only the learner's first move is scored (assessment core module). */
  firstMoveOnly?: boolean;
}

type Status = 'intro' | 'playing' | 'wrong' | 'solved' | 'failed';

export function PuzzleBoard({ puzzle, onResult, strict, timeLimitSec, showTimer = true, hideControls, firstMoveOnly }: Props) {
  const later = useTimeouts();
  const [fen, setFen] = useState(puzzle.fen);
  const [ply, setPly] = useState(0);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [status, setStatus] = useState<Status>('intro');
  const [arrows, setArrows] = useState<[string, string, 'green' | 'red' | 'blue' | 'yellow'][]>([]);
  const [shake, setShake] = useState(false);
  const mistakes = useRef(0);
  const reported = useRef(false);
  const { sec, exact } = useElapsed(status === 'playing' || status === 'wrong', puzzle.id);
  const orientation = sideToMove(applyUci(puzzle.fen, puzzle.moves[0])?.fen ?? puzzle.fen);

  const report = (r: Omit<PuzzleResult, 'durationSec' | 'mistakes'>) => {
    if (reported.current) return;
    reported.current = true;
    onResult({ ...r, durationSec: Math.round(exact()), mistakes: mistakes.current });
  };

  useEffect(() => {
    // reset for a new puzzle
    setFen(puzzle.fen); setPly(0); setLast(null); setStatus('intro'); setArrows([]);
    mistakes.current = 0; reported.current = false;
    later(() => {
      const r = applyUci(puzzle.fen, puzzle.moves[0]);
      if (!r) { setStatus('failed'); return; }
      setFen(r.fen); setLast([r.from, r.to]); setPly(1); setStatus('playing');
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id]);

  useEffect(() => {
    if (!timeLimitSec || status !== 'playing' && status !== 'wrong') return;
    if (sec >= timeLimitSec) { setStatus('failed'); report({ solved: false, firstTry: false, gaveUp: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sec, timeLimitSec, status]);

  const onMove = (m: BoardMove): boolean => {
    if (status !== 'playing' && status !== 'wrong') return false;
    const expected = puzzle.moves[ply];
    const uci = m.from + m.to + (m.promotion ?? '');
    const isMate = (() => { try { return new Chess(m.fenAfter).isCheckmate(); } catch { return false; } })();
    const correct = uci === expected || (expected && uci.slice(0, 4) === expected.slice(0, 4) && !expected[4] && !m.promotion) || isMate;
    if (!correct) {
      mistakes.current++;
      setShake(true); later(() => setShake(false), 450);
      if (strict) {
        setStatus('failed');
        showSolution();
        report({ solved: false, firstTry: false, gaveUp: false });
        return false;
      }
      setStatus('wrong');
      return false;
    }
    setFen(m.fenAfter); setLast([m.from, m.to]); setArrows([]);
    const next = ply + 1;
    if (next >= puzzle.moves.length || isMate || firstMoveOnly) {
      setPly(next); setStatus('solved');
      report({ solved: true, firstTry: mistakes.current === 0, gaveUp: false });
      return true;
    }
    setStatus('playing');
    setPly(next);
    later(() => {
      const r = applyUci(m.fenAfter, puzzle.moves[next]);
      if (!r) return;
      setFen(r.fen); setLast([r.from, r.to]); setPly(next + 1);
    }, 350);
    return true;
  };

  const showSolution = () => {
    const mv = puzzle.moves[ply];
    if (mv) setArrows([[mv.slice(0, 2), mv.slice(2, 4), 'green']]);
  };
  const giveUp = () => {
    setStatus('failed'); showSolution();
    report({ solved: false, firstTry: false, gaveUp: true });
  };
  // Replay the full solution after failing.
  const playSolution = () => {
    let f = puzzle.fen; const steps: { fen: string; last: [string, string] }[] = [];
    for (const u of puzzle.moves) { const r = applyUci(f, u); if (!r) break; f = r.fen; steps.push({ fen: f, last: [r.from, r.to] }); }
    setArrows([]);
    steps.forEach((s, i) => later(() => { setFen(s.fen); setLast(s.last); }, 500 * (i + 1)));
  };

  const prompt = status === 'intro' ? 'Watch the opponent’s move…'
    : status === 'playing' ? `Find the best move for ${orientation}`
      : status === 'wrong' ? 'Not that one. Try again.'
        : status === 'solved' ? (mistakes.current ? 'Solved (after a mistake)' : 'Solved!') : 'Puzzle failed';
  const state = status === 'solved' ? 'correct' : status === 'wrong' || status === 'failed' ? 'wrong' : undefined;

  return (
    <div className="lr-puzzle">
      <div className={`lr-board ${shake ? 'lr-shake' : ''}`} data-state={state}>
        <Board fen={fen} orientation={orientation} movable={status === 'playing' || status === 'wrong' ? orientation : 'none'} onMove={onMove} lastMove={last} arrows={arrows} />
      </div>
      <div className="prompt" data-state={state}>
        <span className="prompt__turn" data-color={orientation} aria-hidden="true" />
        <p className="prompt__title" role="status" aria-live="polite">{prompt}</p>
        {showTimer && (
          <span className="lr-timer" aria-label="elapsed time">
            {fmtTime(timeLimitSec ? Math.max(0, timeLimitSec - sec) : sec)}
          </span>
        )}
      </div>
      {!hideControls && (
        <div className="row">
          {(status === 'playing' || status === 'wrong') && <>
            <button className="btn btn-sm" onClick={() => { mistakes.current++; showSolution(); }}>Hint</button>
            <button className="btn btn-sm btn-ghost" onClick={giveUp}>Give up</button>
          </>}
          {status === 'failed' && <button className="btn btn-sm" onClick={playSolution}>Show full solution</button>}
        </div>
      )}
    </div>
  );
}
