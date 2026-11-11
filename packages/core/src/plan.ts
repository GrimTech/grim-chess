// Daily training plan generator.
// OWNER: learn agent (see docs/ARCHITECTURE.md).
//
// Evidence base (knowledge-base/, see each file for sources):
//  - 02-methods/synthesis.md "Default weekly activity mix by band" (P1/P2): the stage proportions below.
//  - 02-methods/synthesis.md P4 + 01-learning-science/spaced-repetition-and-fsrs.md: FSRS reviews due today go
//    FIRST, capped at ~20-25% of training time.
//  - P2/P11 + 02-methods/game-study-and-analysis-loops.md: keep games in the plan, long and reviewed (play+analyse).
//  - P5 + 01-learning-science/retrieval-practice-interleaving-desirable-difficulties.md: interleaved themes.
//  - P8: two tactical tracks, recognition (puzzles) and calculation (long lines, no piece moving).
//  - P12: active master-game study (guess-the-move) from stage 4.
//  - P13 + 02-methods/endgame-study-methods.md: banded endgame canon with play-outs.
//  - P14 + 02-methods/opening-repertoire-building.md: opening investment scales with level (from stage 2, small).
//  - 02-methods/tactical-repetition-woodpecker-de-la-maza.md: Woodpecker as an optional bounded block (stages 3-6).
//  - 01-learning-science/cognitive-load-theory.md: at most 2 new lessons per day.
import type { DailyPlan, DailyPlanBlock, Profile, SkillGraph, SkillState, SrsCard, RatingEstimate, LessonIndexEntry, Skill } from './types.ts';

export interface PlanInputs {
  profile: Profile;
  graph: SkillGraph;
  skills: Record<string, SkillState>;
  dueCards: SrsCard[];
  estimate: RatingEstimate | null;
  date?: string;
  /** Lesson index for the learner's track; when present, lesson blocks link straight to lessons. */
  lessons?: LessonIndexEntry[];
  /** Ids of lessons already completed (lesson events); used to pick the next lesson. */
  completedLessons?: string[];
  /** Bot ladder (BOT_LEVELS id + rating). When absent, DEFAULT_BOT_LADDER is used. */
  bots?: { id: number; rating: number }[];
  /** Block ids already marked done today (server keeps this). */
  doneBlockIds?: string[];
}

export type BlockArea = 'lessons' | 'tactics' | 'calculation' | 'woodpecker' | 'endgame' | 'openings' | 'play' | 'gameReview';

/**
 * Share of the daily budget (after spaced-repetition reviews) by stage. Rows sum to 1.
 * Mapped from knowledge-base/02-methods/synthesis.md (weekly mix by band; stage Elo ranges from the skill graph):
 *   synthesis column            -> areas here
 *   Tactics (recog. + calc.)    -> tactics + calculation + woodpecker
 *   Own-game review             -> gameReview
 *   Endgames                    -> endgame
 *   Strategy / master games     -> lessons (from stage 4, half of it is guess-the-move on master games)
 *   Openings                    -> openings
 *   Games played                -> play (rated bot game near level +100)
 *  stage 1 (0-600, rules): deviation from the 0-1000 row: 20 points moved from tactics/games to lessons, because a
 *    learner who does not know the rules needs worked examples first (P7, cognitive-load-theory.md).
 *  stage 2 (600-1000): 0-1000 row (tactics 35, review 10, endgames 15, strategy 5 + 5 lessons, games 25); its <=5% openings
 *    share is spent on opening-principles lessons, since repertoire drilling starts at stage 3 (P14).
 *  stage 3 (1000-1400): 1000-1500 row (30/15/15/10/5/25).   stage 4 (1400-1800): 1500-1900 row (25/15/15/15/10/20).
 *  stage 5 (1800-2100): 1900-2200 row (20/15/15/20/15/15).  stages 6-8 (2100+): 2200+ row (15/15/10-15/20/20-25/15).
 */
export const STAGE_MIX: Record<number, Record<BlockArea, number>> = {
  1: { lessons: 0.25, tactics: 0.25, calculation: 0.05, woodpecker: 0.00, endgame: 0.10, openings: 0.00, play: 0.25, gameReview: 0.10 },
  2: { lessons: 0.15, tactics: 0.25, calculation: 0.10, woodpecker: 0.00, endgame: 0.15, openings: 0.00, play: 0.25, gameReview: 0.10 },
  3: { lessons: 0.10, tactics: 0.15, calculation: 0.10, woodpecker: 0.05, endgame: 0.15, openings: 0.05, play: 0.25, gameReview: 0.15 },
  4: { lessons: 0.15, tactics: 0.10, calculation: 0.10, woodpecker: 0.05, endgame: 0.15, openings: 0.10, play: 0.20, gameReview: 0.15 },
  5: { lessons: 0.20, tactics: 0.05, calculation: 0.10, woodpecker: 0.05, endgame: 0.15, openings: 0.15, play: 0.15, gameReview: 0.15 },
  6: { lessons: 0.20, tactics: 0.05, calculation: 0.05, woodpecker: 0.05, endgame: 0.15, openings: 0.20, play: 0.15, gameReview: 0.15 },
  7: { lessons: 0.20, tactics: 0.05, calculation: 0.10, woodpecker: 0.00, endgame: 0.10, openings: 0.25, play: 0.15, gameReview: 0.15 },
  8: { lessons: 0.20, tactics: 0.05, calculation: 0.10, woodpecker: 0.00, endgame: 0.10, openings: 0.25, play: 0.15, gameReview: 0.15 },
};

/** Mirror of BOT_LEVELS ratings (apps/web/src/lib/engine.ts) used when the caller passes no bot ladder. */
export const DEFAULT_BOT_LADDER: { id: number; rating: number }[] = [250, 400, 550, 700, 850, 1000, 1150, 1320, 1500, 1700, 1900, 2100, 2300, 2500, 2750, 3000]
  .map((rating, i) => ({ id: i + 1, rating }));

/** Review time: ~0.75 min per due card, capped at 20% of the budget (synthesis P4: SRS ~20-25%). */
export const REVIEW_MIN_PER_CARD = 0.75;
export const REVIEW_CAP_SHARE = 0.2;
/** Bot opponent target: learner's estimate + 100 (slightly above level: ~36% expected score). */
export const BOT_TARGET_OFFSET = 100;

const LEVEL_STAGE: Record<Profile['startingLevel'], number> = { zero: 1, 'knows-rules': 1, casual: 2, club: 4, strong: 5 };
const DEFAULT_STAGES = [
  { id: 1, eloRange: [0, 800] }, { id: 2, eloRange: [800, 1100] }, { id: 3, eloRange: [1100, 1400] }, { id: 4, eloRange: [1400, 1700] },
  { id: 5, eloRange: [1700, 1950] }, { id: 6, eloRange: [1950, 2150] }, { id: 7, eloRange: [2150, 2350] }, { id: 8, eloRange: [2350, 3000] },
];

/** Stage implied by a rating, using the skill graph's stage Elo ranges. */
export function stageForRating(graph: SkillGraph | null | undefined, rating: number): number {
  const stages = graph?.stages?.length ? graph.stages : DEFAULT_STAGES;
  const sorted = [...stages].sort((a, b) => a.id - b.id);
  for (const s of sorted) if (rating < s.eloRange[1]) return s.id;
  return sorted[sorted.length - 1].id;
}

/** Placement stage: measured estimate when it is informative, otherwise the self-reported starting level. */
export function placementStage(profile: Profile, graph: SkillGraph, estimate: RatingEstimate | null): number {
  if (estimate && estimate.confidence !== 'very-low' && estimate.rating > 0) return stageForRating(graph, estimate.rating);
  return LEVEL_STAGE[profile.startingLevel] ?? 1;
}

/**
 * Skills whose prerequisites are all satisfied and which are not yet mastered.
 * Skills below the placement stage count as satisfied prerequisites (placement credit), so a club player
 * is not forced through the rules; they remain practisable but are not scheduled as new lessons.
 */
export function unlockedSkills(graph: SkillGraph, skills: Record<string, SkillState>, stage: number): Skill[] {
  const byId = new Map(graph.skills.map((s) => [s.id, s]));
  const satisfied = (id: string) => {
    const st = skills[id];
    if (st?.mastered) return true;
    const sk = byId.get(id);
    return !!sk && sk.stage < stage;
  };
  return graph.skills
    .filter((s) => !skills[s.id]?.mastered && s.stage >= stage && s.stage <= stage + 1)
    .filter((s) => s.prereqs.every(satisfied))
    .sort((a, b) => a.stage - b.stage || (skills[b.id]?.attempts ?? 0) - (skills[a.id]?.attempts ?? 0));
}

/** Current stage: placement stage, advanced to the lowest stage that still has unmastered skills. */
export function currentStage(graph: SkillGraph, skills: Record<string, SkillState>, placement: number): number {
  const maxStage = Math.max(1, ...graph.skills.map((s) => s.stage));
  for (let st = placement; st <= maxStage; st++) {
    if (graph.skills.some((s) => s.stage === st && !skills[s.id]?.mastered)) return st;
  }
  return Math.min(placement, 8);
}

// Small deterministic PRNG so the same day gives the same plan (and tests are stable).
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const CALC_THEMES = ['long', 'veryLong'];
const FALLBACK_TACTIC_THEMES: Record<number, string[]> = {
  1: ['mateIn1', 'hangingPiece'], 2: ['fork', 'pin', 'mateIn1', 'mateIn2'], 3: ['fork', 'pin', 'skewer', 'discoveredAttack', 'mateIn2'],
  4: ['deflection', 'attraction', 'doubleCheck', 'backRankMate', 'sacrifice'], 5: ['clearance', 'interference', 'quietMove', 'xRayAttack'],
  6: ['zugzwang', 'intermezzo', 'defensiveMove', 'quietMove'], 7: ['sacrifice', 'attackingF2F7', 'quietMove'], 8: ['zugzwang', 'quietMove', 'defensiveMove'],
};

export function generateDailyPlan(inputs: PlanInputs): DailyPlan {
  const { profile, graph, skills, dueCards, estimate } = inputs;
  const date = inputs.date ?? new Date().toISOString().slice(0, 10);
  const budget = Math.max(10, Math.round(profile.minutesPerDay || 30));
  const done = new Set(inputs.doneBlockIds ?? []);
  const rnd = hash(`${profile.userId}:${date}`);
  const placement = placementStage(profile, graph, estimate);
  const stage = Math.min(8, Math.max(1, currentStage(graph, skills, placement)));
  const mix = STAGE_MIX[stage];
  const blocks: DailyPlanBlock[] = [];
  const add = (b: Omit<DailyPlanBlock, 'done'>) => { if (b.minutes > 0) blocks.push({ ...b, minutes: Math.max(1, Math.round(b.minutes)), done: done.has(b.id) }); };

  // 1. Spaced-repetition reviews due today, first.
  const dueToday = dueCards.filter((c) => c.due.slice(0, 10) <= date);
  let reviewMin = 0;
  if (dueToday.length) {
    reviewMin = Math.min(budget * REVIEW_CAP_SHARE, Math.max(3, dueToday.length * REVIEW_MIN_PER_CARD));
    const kinds = [...new Set(dueToday.map((c) => c.kind))];
    const route = kinds.length === 1 && kinds[0] === 'puzzle' ? '/train/puzzles?mode=review'
      : kinds.length === 1 && kinds[0] === 'opening' ? '/train/openings?mode=review' : '/train/review';
    add({ id: `${date}:review`, kind: 'review', title: `Spaced review (${dueToday.length} due)`, minutes: reviewMin, route, skillIds: [],
      reason: 'Reviews scheduled by FSRS for today come first: retrieval at the edge of forgetting gives the most durable memory.' });
  }
  const rest = budget - reviewMin;
  const share = (a: BlockArea) => rest * mix[a];

  // Skill frontier for lessons and themed tactics.
  const frontier = unlockedSkills(graph, skills, stage);
  const stageSkills = graph.skills.filter((s) => s.stage === stage);

  // 2. Next lesson(s): up to 2 new lessons from unlocked skills (cognitive-load limit). From stage 4, half of the
  //    strategy / master-game share is active master-game study (guess-the-move, synthesis P12).
  const masterMin = stage >= 4 ? share('lessons') / 2 : 0;
  const lessonMin = share('lessons') - masterMin;
  let lessonUsed = 0;
  if (lessonMin > 0) {
    const completed = new Set(inputs.completedLessons ?? []);
    const picked: { title: string; route: string; minutes: number; skillIds: string[] }[] = [];
    if (inputs.lessons?.length) {
      const frontierIds = new Set(frontier.map((s) => s.id));
      const candidates = inputs.lessons
        .filter((l) => !completed.has(l.id) && l.track === profile.track && l.skillIds.some((id) => frontierIds.has(id)))
        .sort((a, b) => a.stage - b.stage || a.order - b.order);
      let left = lessonMin;
      for (const l of candidates) {
        if (picked.length >= 2 || (picked.length && l.estMinutes > left)) break;
        picked.push({ title: l.title, route: `/learn/lesson/${encodeURIComponent(l.id)}`, minutes: Math.min(l.estMinutes, Math.max(left, 5)), skillIds: l.skillIds });
        left -= l.estMinutes;
      }
    }
    if (!picked.length && frontier.length) {
      const sk = frontier[0];
      picked.push({ title: `Study: ${sk.name}`, route: `/learn?skill=${encodeURIComponent(sk.id)}`, minutes: lessonMin, skillIds: [sk.id] });
    }
    lessonUsed = picked.reduce((a, p) => a + p.minutes, 0);
    picked.forEach((p, i) => add({ id: `${date}:lesson:${i}`, kind: 'lesson', title: p.title, minutes: p.minutes, route: p.route, skillIds: p.skillIds,
      reason: 'Next unlocked skill in the curriculum (all prerequisites mastered).' }));
  }
  if (masterMin > 0) {
    add({ id: `${date}:master-games`, kind: 'guess-the-move', title: 'Master game: guess the move', minutes: masterMin, route: '/train/guess-the-move', skillIds: [],
      reason: 'Predicting master moves before seeing them is the prototypical chess deliberate practice; it builds structure-based plans.' });
  }
  // Unused lesson time goes half to tactics, half to calculation.
  const spare = Math.max(0, lessonMin - lessonUsed);

  // 3. Tactics (always): themes from the frontier's tactical skills, interleaved.
  const tacticSkills = [...frontier, ...stageSkills].filter((s) => s.domain === 'tactics' || s.domain === 'checkmate');
  let themes = [...new Set(tacticSkills.flatMap((s) => s.lichessThemes))];
  if (!themes.length) themes = FALLBACK_TACTIC_THEMES[stage];
  const off = rnd % Math.max(1, themes.length);
  const chosen = [...themes.slice(off), ...themes.slice(0, off)].slice(0, 3);
  const tacticMin = share('tactics') + spare / 2;
  const tacticSkillIds = tacticSkills.filter((s) => s.lichessThemes.some((t) => chosen.includes(t))).map((s) => s.id).slice(0, 5);
  add({ id: `${date}:tactics`, kind: 'puzzle', title: 'Tactics: mixed themes', minutes: Math.max(5, tacticMin), skillIds: tacticSkillIds,
    route: `/train/puzzles?themes=${chosen.join(',')}`,
    reason: 'Tactical pattern volume is the strongest lever for improvement; themes are interleaved for transfer.' });

  // 4. Woodpecker cycles (stages 3-6).
  if (stage >= 3 && stage <= 6 && mix.woodpecker > 0) {
    add({ id: `${date}:woodpecker`, kind: 'puzzle', title: 'Woodpecker cycle', minutes: share('woodpecker'), route: '/train/woodpecker', skillIds: [],
      reason: 'Repeating a fixed puzzle set in ever shorter cycles automates core patterns (Woodpecker method).' });
  }

  // 5. Calculation / visualization drill.
  const calcMin = share('calculation') + spare / 2;
  if (stage === 1) {
    add({ id: `${date}:calc`, kind: 'coordinate-drill', title: 'Board vision: coordinates', minutes: calcMin, route: '/train/drill/coordinates', skillIds: [],
      reason: 'Fluent square naming frees working memory for chess thinking.' });
  } else if (stage <= 3) {
    add({ id: `${date}:calc`, kind: 'visualization-drill', title: 'Visualization drill', minutes: calcMin, route: '/train/drill/visualization', skillIds: [],
      reason: 'Holding a position in the mind is the foundation of calculation.' });
  } else {
    add({ id: `${date}:calc`, kind: 'calculation-drill', title: 'Calculation: long combinations', minutes: calcMin, route: `/train/puzzles?themes=${CALC_THEMES.join(',')}`, skillIds: graph.skills.filter((s) => s.domain === 'calculation' && s.stage <= stage).map((s) => s.id).slice(0, 3),
      reason: 'Solving long lines without moving the pieces trains calculation depth and accuracy.' });
  }

  // 6. Endgame work.
  const endMin = share('endgame');
  if (stage <= 2) {
    add({ id: `${date}:endgame`, kind: 'mate-drill', title: 'Basic mates vs the engine', minutes: endMin, route: '/train/drill/mates', skillIds: [],
      reason: 'Basic mates (KQ v K, KR v K) are the first endgame technique every player needs.' });
  } else {
    add({ id: `${date}:endgame`, kind: 'endgame-drill', title: 'Theoretical endgames', minutes: endMin, route: '/train/endgames', skillIds: graph.skills.filter((s) => s.domain === 'endgame' && s.stage <= stage && !skills[s.id]?.mastered).map((s) => s.id).slice(0, 3),
      reason: 'Endgame technique converts advantages and is consistently undertrained by improvers.' });
  }

  // 7. Opening repertoire (stage 3+).
  if (stage >= 3 && mix.openings > 0) {
    add({ id: `${date}:openings`, kind: 'opening-drill', title: 'Opening repertoire', minutes: share('openings'), route: '/train/openings', skillIds: [],
      reason: 'A small, understood repertoire drilled with spaced repetition; depth grows with level.' });
  }

  // 8. Rated game vs a bot near the learner's level (+100), then review it (play + analyse loop, P2/P11).
  const playMin = share('play');
  if (playMin >= 4) {
    const base = estimate && estimate.rating > 0 ? estimate.rating : ({ zero: 400, 'knows-rules': 600, casual: 1000, club: 1500, strong: 1900 })[profile.startingLevel] ?? 800;
    const target = base + BOT_TARGET_OFFSET;
    const ladder = inputs.bots?.length ? inputs.bots : DEFAULT_BOT_LADDER;
    const bot = ladder.reduce((a, b) => (Math.abs(b.rating - target) < Math.abs(a.rating - target) ? b : a));
    add({ id: `${date}:game`, kind: 'play-bot', title: `Rated game vs bot level ${bot.id} (~${bot.rating})`, minutes: playMin, route: `/play/computer?level=${bot.id}&rated=1`, skillIds: [],
      reason: `A rated game against an opponent slightly above your estimate (+${BOT_TARGET_OFFSET}); longer time controls (15+10 or slower) give the most reliable measurement.` });
    add({ id: `${date}:game-review`, kind: 'game-review', title: 'Review your game', minutes: Math.max(3, share('gameReview')), route: '/review', skillIds: [],
      reason: 'Annotate your own game before looking at the engine, then turn each mistake into a practice item.' });
  }

  const totalMinutes = blocks.reduce((a, b) => a + b.minutes, 0);
  const focusSkill = frontier[0]?.name;
  const focus = `Stage ${stage}${graph.stages?.find((s) => s.id === stage)?.name ? ` (${graph.stages.find((s) => s.id === stage)!.name})` : ''}${focusSkill ? `: focus on ${focusSkill}` : ''}`;
  return { date, totalMinutes, blocks, focus };
}
