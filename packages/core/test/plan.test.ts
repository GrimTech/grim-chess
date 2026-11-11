import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateDailyPlan, STAGE_MIX, unlockedSkills, stageForRating, type PlanInputs } from '../src/plan.ts';
import type { Profile, SkillGraph, Skill, SrsCard, RatingEstimate } from '../src/types.ts';

const sk = (id: string, stage: number, domain: Skill['domain'], prereqs: string[] = [], lichessThemes: string[] = []): Skill =>
  ({ id, name: id, domain, stage, prereqs, lichessThemes, summary: '', masteryCriteria: '', exerciseTypes: [] });
const graph: SkillGraph = {
  version: 't', domains: ['rules', 'tactics', 'checkmate', 'calculation', 'strategy', 'endgame', 'opening', 'practical'],
  stages: [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({ id, name: `S${id}`, eloRange: [[0, 800], [800, 1100], [1100, 1400], [1400, 1700], [1700, 1950], [1950, 2150], [2150, 2350], [2350, 3000]][id - 1] as [number, number] })),
  skills: [
    sk('rules.moves', 1, 'rules'), sk('rules.check', 1, 'rules', ['rules.moves']),
    sk('checkmate.mate1', 1, 'checkmate', ['rules.check'], ['mateIn1']),
    sk('tactics.fork', 2, 'tactics', ['rules.check'], ['fork']), sk('tactics.pin', 2, 'tactics', ['rules.check'], ['pin']),
    sk('tactics.deflection', 3, 'tactics', ['tactics.fork'], ['deflection']), sk('endgame.opposition', 3, 'endgame', ['rules.moves']),
    sk('calculation.depth', 4, 'calculation', ['tactics.deflection'], ['long']),
    ...[5, 6, 7, 8].map((s) => sk(`strategy.s${s}`, s, 'strategy')),
  ],
};
const profile = (p: Partial<Profile> = {}): Profile => ({ userId: 'u1', username: null, displayName: 'x', age: 30, track: 'adult', minutesPerDay: 60, daysPerWeek: 5,
  goal: 'master', startingLevel: 'zero', onboarded: true, createdAt: '2026-01-01', ...p });
const est = (rating: number, confidence: RatingEstimate['confidence'] = 'medium'): RatingEstimate => ({ rating, low: rating - 150, high: rating + 150, confidence, components: [], titleEquivalent: null });
const base = (o: Partial<PlanInputs> = {}): PlanInputs => ({ profile: profile(), graph, skills: {}, dueCards: [], estimate: null, date: '2026-11-11', ...o });
const card = (id: string, kind: SrsCard['kind'], due = '2026-11-10T00:00:00Z'): SrsCard => ({ id, kind, stability: 1, difficulty: 5, due, reps: 1, lapses: 0, state: 'review' });

test('stage mixes sum to 1', () => {
  for (const [s, m] of Object.entries(STAGE_MIX)) assert.ok(Math.abs(Object.values(m).reduce((a, b) => a + b, 0) - 1) < 1e-9, `stage ${s}`);
});

test('beginner plan: tactics, lesson, coordinates, mates, game + review; no openings or woodpecker', () => {
  const p = generateDailyPlan(base({ lessons: [{ id: 'l1', track: 'adult', stage: 1, order: 1, title: 'Moves', summary: '', skillIds: ['rules.moves'], estMinutes: 10 }] }));
  const kinds = p.blocks.map((b) => b.kind);
  assert.ok(kinds.includes('puzzle'));
  assert.ok(kinds.includes('lesson'));
  assert.ok(kinds.includes('coordinate-drill'));
  assert.ok(kinds.includes('mate-drill'));
  assert.ok(kinds.includes('play-bot') && kinds.includes('game-review'));
  assert.ok(!kinds.includes('opening-drill'));
  assert.ok(!p.blocks.some((b) => b.route === '/train/woodpecker'));
  assert.equal(p.blocks.find((b) => b.kind === 'lesson')!.route, '/learn/lesson/l1');
  assert.ok(Math.abs(p.totalMinutes - 60) <= 6, `total ${p.totalMinutes}`);
});

test('due reviews come first and are capped', () => {
  const due = Array.from({ length: 200 }, (_, i) => card(`puzzle:${i}`, 'puzzle'));
  const p = generateDailyPlan(base({ dueCards: [...due, card('x', 'puzzle', '2026-12-30T00:00:00Z')] }));
  assert.equal(p.blocks[0].kind, 'review');
  assert.equal(p.blocks[0].route, '/train/puzzles?mode=review');
  assert.ok(p.blocks[0].minutes <= 12);
  assert.match(p.blocks[0].title, /200 due/);
});

test('stage 3-6: woodpecker + openings + endgames; bot level near rating +100', () => {
  const bots = [{ id: 5, rating: 1200 }, { id: 6, rating: 1400 }, { id: 7, rating: 1600 }];
  const p = generateDailyPlan(base({ estimate: est(1500), bots, skills: { 'tactics.fork': { skillId: 'tactics.fork', mastery: 1, attempts: 5, successes: 5, mastered: true } } }));
  const routes = p.blocks.map((b) => b.route);
  assert.ok(routes.includes('/train/woodpecker'));
  assert.ok(routes.includes('/train/openings'));
  assert.ok(routes.includes('/train/endgames'));
  assert.ok(routes.includes('/play/computer?level=7&rated=1'));
  assert.ok(routes.some((r) => r.startsWith('/train/puzzles?themes=long')));
});

test('stage 7+: no woodpecker, openings present', () => {
  const p = generateDailyPlan(base({ estimate: est(2250) }));
  assert.ok(!p.blocks.some((b) => b.route === '/train/woodpecker'));
  assert.ok(p.blocks.some((b) => b.kind === 'opening-drill'));
  assert.match(p.focus, /Stage 7/);
});

test('unlocking respects prereqs and placement credit', () => {
  const fresh = unlockedSkills(graph, {}, 1).map((s) => s.id);
  assert.deepEqual(fresh, ['rules.moves']);
  const club = unlockedSkills(graph, {}, 3).map((s) => s.id);
  assert.ok(club.includes('tactics.deflection') && club.includes('endgame.opposition'));
  assert.ok(!club.includes('calculation.depth'));
});

test('stageForRating uses graph ranges', () => {
  assert.equal(stageForRating(graph, 500), 1);
  assert.equal(stageForRating(graph, 1450), 4);
  assert.equal(stageForRating(graph, 2900), 8);
});

test('deterministic and done flags applied', () => {
  const a = generateDailyPlan(base({ doneBlockIds: ['2026-11-11:tactics'] }));
  const b = generateDailyPlan(base({ doneBlockIds: ['2026-11-11:tactics'] }));
  assert.deepEqual(a, b);
  assert.equal(a.blocks.find((x) => x.id === '2026-11-11:tactics')!.done, true);
});

test('small budget still includes tactics', () => {
  const p = generateDailyPlan(base({ profile: profile({ minutesPerDay: 10 }) }));
  assert.ok(p.blocks.some((b) => b.kind === 'puzzle'));
});

test('stage 4+: master-game study (guess the move); default bot ladder when none passed', () => {
  const p = generateDailyPlan(base({ estimate: est(1550) }));
  assert.ok(p.blocks.some((b) => b.route === '/train/guess-the-move'));
  const game = p.blocks.find((b) => b.kind === 'play-bot')!;
  assert.match(game.route, /^\/play\/computer\?level=\d+&rated=1$/);
  assert.equal(game.route, '/play/computer?level=10&rated=1'); // 1550 + 100 -> 1700 bot
  assert.ok(p.blocks.some((b) => b.kind === 'game-review'));
  const early = generateDailyPlan(base({ estimate: est(1200) }));
  assert.ok(!early.blocks.some((b) => b.route === '/train/guess-the-move'));
});
