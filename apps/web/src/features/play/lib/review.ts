// Game review computations: per-move classification, accuracy/ACPL for both sides.
import { classifyMove, gameAccuracy, winPercentFromCp, type MoveClass } from '@grim/core';
import { turnOf, type Color } from './chess.ts';

export interface MoveReview { ply: number /* 0-based move index */; mover: Color; cls: MoveClass; drop: number; cpBefore: number; cpAfter: number /* mover POV */ }
export interface SideSummary { accuracy: number | null; acpl: number | null; inaccuracy: number; mistake: number; blunder: number }
export interface GameReview { moves: MoveReview[]; white: SideSummary; black: SideSummary }

/** evals: White-POV centipawns per position (index 0 = start), fens: same length. */
export function reviewGame(evals: number[], fens: string[]): GameReview {
  const moves: MoveReview[] = [];
  for (let i = 0; i + 1 < evals.length; i++) {
    const mover = turnOf(fens[i]);
    const sgn = mover === 'white' ? 1 : -1;
    const before = evals[i] * sgn, after = evals[i + 1] * sgn;
    const drop = Math.max(0, winPercentFromCp(before) - winPercentFromCp(after));
    moves.push({ ply: i, mover, cls: classifyMove(drop), drop, cpBefore: before, cpAfter: after });
  }
  const startsWithWhite = turnOf(fens[0]) === 'white';
  const side = (c: Color): SideSummary => {
    const a = gameAccuracy(evals, c, startsWithWhite);
    const mine = moves.filter((m) => m.mover === c);
    return {
      accuracy: a.accuracy, acpl: a.acpl,
      inaccuracy: mine.filter((m) => m.cls === 'inaccuracy').length,
      mistake: mine.filter((m) => m.cls === 'mistake').length,
      blunder: mine.filter((m) => m.cls === 'blunder').length,
    };
  };
  return { moves, white: side('white'), black: side('black') };
}

export const isError = (c: MoveClass | undefined | null) => c === 'inaccuracy' || c === 'mistake' || c === 'blunder';

/** Win% drop (mover POV) of playing a move that leads to `cpAfter` instead of the best line worth `cpBest`. */
export const dropBetween = (cpBest: number, cpAfter: number) => Math.max(0, winPercentFromCp(cpBest) - winPercentFromCp(cpAfter));

export const CLASS_LABEL: Record<MoveClass, string> = { best: 'Best', good: 'Good', inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder' };
