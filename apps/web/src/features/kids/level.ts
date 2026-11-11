// Kid-friendly level names over the measured rating (estimate, else puzzle/bot pool). Parents see the real numbers.
import type { Me } from '../../lib/api.ts';

export interface KidLevel { name: string; min: number; next?: number; blurb: string }
export const KID_LEVELS: KidLevel[] = [
  { name: 'Pawn Sprout', min: 0, blurb: 'Learning how the pieces move.' },
  { name: 'Pawn Explorer', min: 300, blurb: 'Knows the moves and loves to capture.' },
  { name: 'Knight Rider', min: 500, blurb: 'Finds checkmate in one and spots free pieces.' },
  { name: 'Bishop Builder', min: 700, blurb: 'Uses forks and pins, and guards the king.' },
  { name: 'Rook Ranger', min: 900, blurb: 'Plays good openings and wins simple endgames.' },
  { name: 'Queen Quester', min: 1100, blurb: 'Sees two-move tricks and avoids most blunders.' },
  { name: 'King Keeper', min: 1400, blurb: 'Strong club-level ideas: plans, calculation, endgames.' },
  { name: 'Grand Wizard', min: 1700, blurb: 'A very strong player. Keep going!' },
];
KID_LEVELS.forEach((l, i) => { l.next = KID_LEVELS[i + 1]?.min; });

export interface Measured { rating: number | null; source: string; low?: number; high?: number; confidence?: string }

export function measured(me: Me | null): Measured {
  if (!me) return { rating: null, source: 'none' };
  if (me.estimate && me.estimate.confidence !== 'very-low') return { rating: Math.round(me.estimate.rating), source: 'estimate', low: Math.round(me.estimate.low), high: Math.round(me.estimate.high), confidence: me.estimate.confidence };
  const pz = me.ratings.puzzle; const bot = me.ratings.bot;
  if (bot && bot.games >= 3) return { rating: Math.round(bot.rating), source: 'bot', low: Math.round(bot.rating - 2 * bot.rd), high: Math.round(bot.rating + 2 * bot.rd) };
  if (pz && pz.games >= 5) return { rating: Math.round(pz.rating), source: 'puzzle', low: Math.round(pz.rating - 2 * pz.rd), high: Math.round(pz.rating + 2 * pz.rd) };
  return { rating: null, source: 'none' };
}

/** Level from the measured rating; with no rating yet, from lessons finished (so a brand new learner starts at 0). */
export function kidLevel(rating: number | null, lessonsDone: number): { level: KidLevel; index: number; progress: number } {
  const r = rating ?? Math.min(450, lessonsDone * 15);
  let index = 0;
  KID_LEVELS.forEach((l, i) => { if (r >= l.min) index = i; });
  const level = KID_LEVELS[index];
  const progress = level.next ? Math.max(0, Math.min(1, (r - level.min) / (level.next - level.min))) : 1;
  return { level, index, progress };
}

/** Age-banded defaults (knowledge-base/05-children/age-banded-recommendations.md, design defaults). */
export function ageBand(age: number | null | undefined): { band: string; label: string; goalMin: number; chunkMin: number; week: string; ambitious: string; focus: string } {
  const a = age ?? 8;
  if (a <= 6) return { band: '4-6', label: 'Explorers', goalMin: 10, chunkMin: 5, week: '30-60 min over 3-5 days', ambitious: 'not recommended at this age', focus: 'Mini-games and how the pieces move, ideally with a grown-up and a real board too.' };
  if (a <= 9) return { band: '7-9', label: 'Builders', goalMin: 15, chunkMin: 10, week: '1-2 h over 3-5 days', ambitious: '2-4 h (only if your child wants it)', focus: 'Full rules, basic checkmates, simple tactics and "don\'t hang pieces".' };
  return { band: '10-12', label: 'Climbers', goalMin: 30, chunkMin: 15, week: '2-3 h over 4-5 days', ambitious: '5-8 h including games (opt-in)', focus: 'Tactics, short calculation, basic endgames and looking back at their own games.' };
}
