import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { estimateRating, configFromBenchmarks, DEFAULT_ESTIMATE_CONFIG, chiSquareP, progressDelta, titleLabel, titleEquivalent, puzzleToGr } from '../src/estimate.ts';
import type { RatingState } from '../src/types.ts';

const NOW = '2026-11-11T00:00:00Z';
const rs = (rating: number, rd: number, games = 50, updatedAt = NOW): RatingState => ({ rating, rd, vol: 0.06, games, updatedAt });
const near = (a: number, b: number, tol: number, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} vs ${b}`);

test('no signal: self-report / population prior, very-low confidence, provisional', () => {
  const e = estimateRating({ now: NOW });
  assert.equal(e.confidence, 'very-low');
  assert.equal(e.provisional, true);
  assert.equal(e.titleEquivalent, null);
  assert.equal(e.components[0].source, 'prior');
  assert.ok(estimateRating({ startingLevel: 'club', now: NOW }).rating > estimateRating({ startingLevel: 'zero', now: NOW }).rating);
});

test('fresh pools (RD >= 340) and too few puzzles are ignored', () => {
  const e = estimateRating({ bot: rs(1500, 350, 0), puzzle: rs(1500, 200, 3), now: NOW });
  assert.equal(e.components[0].source, 'prior');
});

test('single signal: estimate = signal, SE = sqrt(stat^2 + map^2)', () => {
  const e = estimateRating({ bot: rs(1800, 60, 40), standardTimeControl: true, now: NOW });
  assert.equal(e.rating, 1800);
  near(e.se, Math.hypot(60, 50), 1);
  near(e.high - e.low, 2 * 1.96 * Math.hypot(60, 50), 3);
  near(estimateRating({ bot: rs(1800, 60, 40), now: NOW }).se, Math.hypot(60, 50, 100), 1, 'non-standard TC');
});

test('puzzle map: GR = -100 + puzzle rating', () => {
  const e = estimateRating({ puzzle: rs(1700, 60, 300), now: NOW });
  assert.equal(e.components[0].rating, 1600);
  assert.equal(puzzleToGr(2000), 1900);
});

test('GLS with rho = 0 equals inverse-variance weighting (model worked example without M)', () => {
  const cfg = { ...DEFAULT_ESTIMATE_CONFIG, rhoMap: 0, puzzle: { a: 0, b: 1, sigmaMap: 250 } };
  const e = estimateRating({ bot: rs(1850, 60, 40), assessment: { rating: 1780, sd: 80, updatedAt: NOW }, puzzle: rs(2000, 60, 500), standardTimeControl: true, now: NOW }, cfg);
  const V = [60 ** 2 + 50 ** 2, 80 ** 2 + 150 ** 2, 60 ** 2 + 250 ** 2];
  const W = V.map((v) => 1 / v), S = W.reduce((a, b) => a + b, 0);
  near(e.rating, (1850 * W[0] + 1780 * W[1] + 2000 * W[2]) / S, 1);
  near(e.se, Math.sqrt(1 / S), 1);
  near(e.components.filter((c) => c.fused).reduce((a, c) => a + c.weight, 0), 1, 0.01);
  assert.ok(e.consistency && !e.consistency.flagged);
});

test('shared calibration error (rho_map 0.3) widens the interval', () => {
  const inp = { bot: rs(1850, 60, 40), assessment: { rating: 1780, sd: 80, updatedAt: NOW }, puzzle: rs(2100, 60, 500), standardTimeControl: true, now: NOW };
  assert.ok(estimateRating(inp).se > estimateRating(inp, { ...DEFAULT_ESTIMATE_CONFIG, rhoMap: 0 }).se);
});

test('consistency test flags disagreeing signals and inflates SE', () => {
  const e = estimateRating({ bot: rs(1200, 40, 100), assessment: { rating: 2400, sd: 60, updatedAt: NOW }, standardTimeControl: true, now: NOW });
  assert.ok(e.consistency!.flagged);
  assert.ok(e.se > Math.sqrt(1 / (1 / (40 ** 2 + 50 ** 2) + 1 / (60 ** 2 + 150 ** 2))));
});

test('chi-square p-values', () => {
  near(chiSquareP(0.89, 3), 0.828, 0.01);
  near(chiSquareP(3.841, 1), 0.05, 0.002);
  near(chiSquareP(11.345, 3), 0.01, 0.001);
});

test('staleness adds 25 GR per 30 days', () => {
  const fresh = estimateRating({ bot: rs(1600, 60, 40, NOW), standardTimeControl: true, now: NOW });
  const old = estimateRating({ bot: rs(1600, 60, 40, '2026-08-13T00:00:00Z'), standardTimeControl: true, now: NOW });
  near(old.components[0].sdAge, 75, 1);
  assert.ok(old.se > fresh.se);
});

test('display rule: needs 20 games (RD <= 110), a battery signal and SE <= 150', () => {
  const only = estimateRating({ bot: rs(1700, 60, 40), standardTimeControl: true, now: NOW });
  assert.equal(only.provisional, true);
  assert.equal(only.confidence, 'low');
  const full = estimateRating({ bot: rs(1700, 60, 40), assessment: { rating: 1720, sd: 80, updatedAt: NOW }, standardTimeControl: true, now: NOW });
  assert.equal(full.provisional, false);
  assert.ok(full.confidence === 'medium' || full.confidence === 'high');
});

test('extended scale below 1400', () => {
  assert.equal(estimateRating({ bot: rs(1100, 60, 40), now: NOW }).scale, 'extended');
  assert.equal(estimateRating({ bot: rs(1500, 60, 40), now: NOW }).scale, 'fide-equivalent');
});

test('accuracy is displayed but never fused', () => {
  const e = estimateRating({ bot: rs(1700, 60, 40), accuracy: { meanAccuracy: 92, games: 30 }, now: NOW });
  const a = e.components.find((c) => c.source === 'accuracy')!;
  assert.equal(a.weight, 0);
  assert.equal(a.fused, false);
  assert.equal(e.rating, 1700);
});

test('milestones need the full award rule', () => {
  const strong = { bot: rs(2520, 35, 300), assessment: { rating: 2510, sd: 50, updatedAt: NOW }, online: rs(2500, 40, 200), standardTimeControl: true, now: NOW };
  const noEv = estimateRating(strong);
  assert.ok(noEv.milestone.candidate, JSON.stringify(noEv));
  assert.equal(noEv.titleEquivalent, null);
  assert.ok(noEv.milestone.blockers.length > 0);
  const code = noEv.milestone.candidate!;
  const T = DEFAULT_ESTIMATE_CONFIG.titles.find(([, c]) => c === code)![0];
  const ev = estimateRating({ ...strong, milestoneEvidence: { previous: [{ at: '2026-09-01T00:00:00Z', low80: T + 10 }], ratedGames180d: 60, knowledgeGates: { [code]: true } } });
  assert.equal(ev.titleEquivalent, code, JSON.stringify(ev.milestone));
  assert.equal(titleLabel('IM'), 'IM-equivalent strength (estimate)');
  assert.equal(titleEquivalent(2199), null);
  assert.equal(titleEquivalent(2550), 'GM');
});

test('progress delta excludes mapping error', () => {
  const d = progressDelta({ rating: 1500, sdStat: 40 }, { rating: 1640, sdStat: 30 });
  assert.equal(d.delta, 140);
  assert.equal(d.se, 50);
  assert.equal(d.measurable, true);
  assert.equal(progressDelta({ rating: 1500, sdStat: 60 }, { rating: 1550, sdStat: 60 }).measurable, false);
});

test('configFromBenchmarks reads data/benchmarks.json measurementModel; defaults equal the published priors', () => {
  const b = JSON.parse(readFileSync(new URL('../../../data/benchmarks.json', import.meta.url), 'utf8'));
  const cfg = configFromBenchmarks(b);
  assert.equal(cfg.puzzle.a, b.measurementModel.puzzle.a);
  assert.equal(cfg.puzzle.sigmaMap, b.measurementModel.puzzle.sigmaMap);
  assert.equal(cfg.sigmaAnchorBots, b.measurementModel.sigmaAnchorBots);
  assert.equal(cfg.rhoMap, b.measurementModel.correlation.rhoMap);
  assert.equal(cfg.display.maxSe, b.measurementModel.display.maxSe);
  assert.deepEqual(cfg.titles.map((t) => t[1]), ['GM', 'IM', 'FM', 'CM']);
  assert.equal(cfg.fideFloor, 1400);
  assert.deepEqual(cfg, DEFAULT_ESTIMATE_CONFIG);
  assert.deepEqual(configFromBenchmarks(null), DEFAULT_ESTIMATE_CONFIG);
});
