// FSRS-4.5 scheduler (open-spaced-repetition/fsrs4anki default parameters). Grades: 1 Again, 2 Hard, 3 Good, 4 Easy.
import type { SrsCard } from './types.ts';

export const FSRS_W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5, FACTOR = 19 / 81;
export type Grade = 1 | 2 | 3 | 4;

export const retrievability = (elapsedDays: number, stability: number) => Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
const clampD = (d: number) => Math.min(10, Math.max(1, d));
const initD = (g: Grade, w = FSRS_W) => clampD(w[4] - (g - 3) * w[5]);
export const intervalDays = (stability: number, desiredRetention = 0.9) =>
  Math.max(1, Math.round((stability / FACTOR) * (Math.pow(desiredRetention, 1 / DECAY) - 1)));

export function newCard(id: string, kind: SrsCard['kind'], now = new Date()): SrsCard {
  return { id, kind, stability: 0, difficulty: 0, due: now.toISOString(), reps: 0, lapses: 0, state: 'new' };
}

export function review(card: SrsCard, grade: Grade, now = new Date(), desiredRetention = 0.9, w = FSRS_W): SrsCard {
  let S = card.stability, D = card.difficulty;
  if (card.state === 'new' || card.reps === 0) {
    S = w[grade - 1]; D = initD(grade, w);
  } else {
    const elapsed = card.lastReview ? Math.max(0, (now.getTime() - new Date(card.lastReview).getTime()) / 86400000) : 0;
    const R = retrievability(elapsed, S);
    const nextD = D - w[6] * (grade - 3);
    D = clampD(w[7] * initD(3, w) + (1 - w[7]) * nextD);
    if (grade === 1) {
      S = w[11] * Math.pow(D, -w[12]) * (Math.pow(S + 1, w[13]) - 1) * Math.exp(w[14] * (1 - R));
    } else {
      const hard = grade === 2 ? w[15] : 1, easy = grade === 4 ? w[16] : 1;
      S = S * (Math.exp(w[8]) * (11 - D) * Math.pow(S, -w[9]) * (Math.exp(w[10] * (1 - R)) - 1) * hard * easy + 1);
    }
  }
  const days = grade === 1 ? 0 : intervalDays(S, desiredRetention);
  const due = new Date(now.getTime() + (grade === 1 ? 10 * 60 * 1000 : days * 86400000));
  return {
    ...card, stability: S, difficulty: D, due: due.toISOString(), lastReview: now.toISOString(),
    reps: card.reps + 1, lapses: card.lapses + (grade === 1 ? 1 : 0),
    state: grade === 1 ? (card.state === 'new' ? 'learning' : 'relearning') : 'review',
  };
}

/** Map a puzzle attempt to an FSRS grade. */
export function gradePuzzle(solved: boolean, firstTry: boolean, seconds: number, expectedSeconds = 60): Grade {
  if (!solved) return 1;
  if (!firstTry) return 2;
  return seconds < expectedSeconds * 0.4 ? 4 : 3;
}
