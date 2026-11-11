/// <reference types="vite/client" />
// Benchmark bands (data/benchmarks.json, bundled at build time when present) with a built-in fallback copied from
// knowledge-base/04-assessment/10-benchmarks-by-rating-band.md. All values are priors ("status": "prior").
import { configFromBenchmarks, convert, type BenchmarksLike, type ConversionTable, type EstimateConfig } from '@grim/core';

export interface Band {
  fide: number; label: string; lichess?: number; chesscom?: number;
  acplRapid?: number; acplClassical?: number; accuracy?: number; accuracyIqr?: [number, number];
  blundersRapid?: number; puzzle?: number; percentile?: number | null;
}

const files = import.meta.glob('../../../../../data/benchmarks.json', { eager: true, import: 'default' });
export const benchmarksJson: BenchmarksLike | null = (Object.values(files)[0] as BenchmarksLike | undefined) ?? null;

const FALLBACK: Band[] = [
  [400, 'Absolute beginner', 940, 100, 87, 75, 72, 58, 81, 2.9, 900, null],
  [600, 'Novice', 1080, 300, 78, 69, 74, 63, 83, 2.8, 1050, null],
  [800, 'Beginner', 1220, 500, 73, 64, 76, 67, 84, 2.65, 1200, null],
  [1000, 'Advanced beginner', 1340, 700, 68.5, 58, 77, 67, 84, 2.55, 1350, null],
  [1200, 'Developing club player', 1470, 900, 63.5, 53, 78, 69, 86, 2.45, 1450, null],
  [1400, 'Club player', 1590, 1100, 59.5, 48, 79, 69, 86, 2.35, 1600, 0],
  [1600, 'Club player', 1850, 1550, 52, 42, 81.5, 75, 88, 2.05, 1750, 32],
  [1800, 'Strong club player', 2090, 1950, 45, 37, 84, 78, 90, 1.75, 1900, 64],
  [2000, 'Expert', 2245, 2190, 40, 32, 86, 81, 92, 1.55, 2100, 87.2],
  [2200, 'CM-level', 2375, 2370, 36, 26, 88, 81, 92, 1.4, 2300, 96.4],
  [2300, 'FM-level', 2430, 2460, 34, 24, 88.5, 84, 94, 1.35, 2400, 98.5],
  [2400, 'IM-level', 2470, 2550, 33, 21, 89, 84, 94, 1.3, 2500, 99.48],
  [2500, 'GM-level', 2550, undefined, 30.5, 18, 90, undefined, undefined, 1.2, 2650, 99.85],
  [2600, 'Strong GM', undefined, undefined, 28, 16, 91, undefined, undefined, 1.05, 2750, 99.96],
  [2700, 'Elite', undefined, undefined, 25.5, 13, 92, undefined, undefined, 0.95, 2900, 99.994],
  [2800, 'World-championship level', undefined, undefined, 23, 10, 93, undefined, undefined, 0.85, 3050, 99.9996],
].map(([fide, label, lichess, chesscom, acplRapid, acplClassical, accuracy, lo, hi, blundersRapid, puzzle, percentile]) => ({
  fide, label, lichess, chesscom, acplRapid, acplClassical, accuracy, accuracyIqr: lo != null && hi != null ? [lo, hi] : undefined, blundersRapid, puzzle, percentile,
} as Band));

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : v && typeof v === 'object' && typeof (v as { median?: unknown }).median === 'number' ? (v as { median: number }).median : v && typeof v === 'object' && typeof (v as { value?: unknown }).value === 'number' ? (v as { value: number }).value : undefined);
const pick = (o: Record<string, unknown>, ...keys: string[]) => { for (const k of keys) { const parts = k.split('.'); let v: unknown = o; for (const p of parts) v = v && typeof v === 'object' ? (v as Record<string, unknown>)[p] : undefined; if (v !== undefined) return v; } return undefined; };

function parseBands(j: BenchmarksLike | null): Band[] | null {
  if (!j) return null;
  const rows = (pick(j as Record<string, unknown>, 'bands', 'rows', 'table', 'benchmarks') as unknown[]) ?? null;
  if (!Array.isArray(rows) || !rows.length) return null;
  const out: Band[] = [];
  for (const r of rows as Record<string, unknown>[]) {
    const fide = num(pick(r, 'fide', 'gr', 'rating', 'fideEquivalent', 'band'));
    if (fide == null) continue;
    const acc = pick(r, 'accuracy', 'accuracyPct', 'lichessAccuracy');
    const iqr = (acc && typeof acc === 'object' ? (acc as { iqr?: unknown }).iqr : pick(r, 'accuracyIqr')) as unknown;
    out.push({
      fide, label: String(pick(r, 'label', 'name') ?? ''),
      lichess: num(pick(r, 'lichessClassicalEquivalent', 'lichess', 'lichessRating', 'lichessClassical')),
      chesscom: num(pick(r, 'chesscomRapidEquivalent', 'chesscom', 'chesscomRapid')),
      acplRapid: num(pick(r, 'acplRapid', 'acpl_rapid', 'acpl.rapid')),
      acplClassical: num(pick(r, 'acplClassical', 'acpl_classical', 'acpl.classical')),
      accuracy: num(acc),
      accuracyIqr: Array.isArray(iqr) && iqr.length === 2 ? [Number(iqr[0]), Number(iqr[1])] : undefined,
      blundersRapid: num(pick(r, 'blundersPerGame', 'blundersRapid')),
      puzzle: num(pick(r, 'puzzle', 'lichessPuzzle', 'puzzleRating')),
      percentile: num(pick(r, 'percentileFide', 'percentile', 'fidePercentile')) ?? null,
    });
  }
  return out.length >= 3 ? out.sort((a, b) => a.fide - b.fide) : null;
}

export const BANDS: Band[] = parseBands(benchmarksJson) ?? FALLBACK;
export const BENCHMARK_SOURCE = parseBands(benchmarksJson) ? 'data/benchmarks.json' : 'knowledge-base/04-assessment/10-benchmarks-by-rating-band.md (built-in copy)';
export const ESTIMATE_CONFIG: EstimateConfig = configFromBenchmarks(benchmarksJson);

const table = (f: (b: Band) => number | undefined): ConversionTable =>
  BANDS.filter((b) => f(b) != null).map((b) => [f(b)!, b.fide] as [number, number]).sort((a, b) => a[0] - b[0]);

/** FIDE-equivalent of a metric value by interpolating the band table (null when no data). */
export function fideFrom(metric: 'puzzle' | 'accuracy' | 'acplRapid' | 'lichess', value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const t = table((b) => b[metric]);
  if (t.length < 2) return null;
  // ACPL decreases with strength: the sort above handles direction for interpolation.
  const lo = t[0][0], hi = t[t.length - 1][0];
  const v = Math.min(hi, Math.max(lo, value));
  return Math.round(convert(t, v).value);
}

export function bandFor(fide: number): Band {
  let b = BANDS[0];
  for (const x of BANDS) if (fide >= x.fide) b = x;
  return b;
}

/** Required wording for band comparisons (benchmarks.json bands carry "status": "prior"). */
export const PROVISIONAL = 'provisional benchmark (literature-derived, not yet calibrated on this platform)';
export const FIDE_FLOOR = ESTIMATE_CONFIG.fideFloor;
/** Scale label for a Grim Rating value (claims policy, platform-measurement-model.md section 9). */
export const scaleLabel = (r: number) => (r >= FIDE_FLOOR ? 'Estimated strength (FIDE-scale estimate)' : 'Grim Rating (extended scale; no FIDE equivalent)');

/** Milestones shown to learners (FIDE-equivalent). Titles are equivalents of strength only. */
export const MILESTONES: { rating: number; label: string }[] = [
  { rating: 800, label: 'beginner who no longer hangs pieces' },
  { rating: 1000, label: 'advanced beginner' },
  { rating: 1200, label: 'developing club player' },
  { rating: 1400, label: 'club player (start of the FIDE scale)' },
  { rating: 1600, label: 'solid club player' },
  { rating: 1800, label: 'strong club player' },
  { rating: 2000, label: 'expert' },
  { rating: 2200, label: 'CM-equivalent strength (estimate)' },
  { rating: 2300, label: 'FM-equivalent strength (estimate)' },
  { rating: 2400, label: 'IM-equivalent strength (estimate)' },
  { rating: 2500, label: 'GM-equivalent strength (estimate)' },
];
export const nextMilestone = (r: number) => MILESTONES.find((m) => m.rating > r) ?? null;
