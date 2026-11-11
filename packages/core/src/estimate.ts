// Rating estimation: fuses independent signals into a Grim Rating (GR) on the FIDE Standard (post-2024) scale.
// OWNER: learn agent (see docs/ARCHITECTURE.md). Implements knowledge-base/04-assessment/platform-measurement-model.md (v1).
// Parameter priors mirror data/benchmarks.json -> measurementModel; configFromBenchmarks() reads that file's values.
//
// Per-signal estimate x_i and variance V_i = s_stat,i^2 + s_map,i^2 + s_age,i^2   (model section 3)
//   G  rated games vs bots      x = r_bot              s_stat = RD   s_map = s_anchor (50) (+) s_tc (100, TC not standard)
//   G' rated games vs humans    x = r_online           s_stat = RD   s_map = 200 (platform human pool, not yet anchored)
//   P  puzzles                  x = a_P + b_P * r_P    s_stat = b_P * RD   s_map = 250        (a_P = -100, b_P = 1)
//   B  assessment battery       x = rating             s_stat = sd         s_map = 150
//   staleness                   s_age = 25 * (days since the signal's last update) / 30
//   Accuracy (Lichess formula) is DISPLAYED only and never fused (model section 3: "not inputs").
// Fusion: generalized least squares with shared calibration error (section 4)
//   Sigma_ii = V_i,  Sigma_ij = rho_map * s_map,i * s_map,j  (rho_map = 0.3)
//   w = Sigma^-1 1 / (1' Sigma^-1 1),  GR = w'x,  SE = sqrt(1 / (1' Sigma^-1 1))   (weights are not clipped)
// Consistency: Q = (x - GR)' Sigma^-1 (x - GR) ~ chi2(k-1); if p < 0.01 then SE *= sqrt(Q/(k-1)) and flag.
// Intervals: 95% = GR +/- 1.96 SE (low/high), 80% = GR +/- 1.2816 SE (low80/high80).
// Display rule: "estimated FIDE-equivalent" only with >= 20 rated games (pool RD <= 110), a non-game signal (B) and
//   SE <= 150; otherwise the estimate is provisional. Below 1400 the scale is the extended scale (no FIDE equivalent).
// Confidence: no signal = very-low; provisional = low (very-low if SE > 250); display rule met = medium;
//   display rule + SE <= 100 + >= 30 games = high.
// Milestones (section 7): <X>-equivalent strength only when lower 80% bound >= T at two evaluations >= 30 days
//   apart, SE <= 100, >= 30 rated games in 180 days, game-signal estimate >= T - 50, consistency passed and the
//   knowledge gate passed. `titleEquivalent` holds the code ("CM"...); UIs must render "CM-equivalent strength
//   (estimate)" (titleLabel) and never the bare abbreviation.
// With no signal at all, a weak self-report prior (onboarding level) or a population prior is returned.
import type { RatingEstimate, RatingState, Profile } from './types.ts';

export type TitleCode = 'CM' | 'FM' | 'IM' | 'GM';

export interface EstimateInputs {
  bot?: RatingState;          // Glicko-2 vs calibrated bots
  puzzle?: RatingState;       // Glicko-2 vs Lichess puzzle ratings
  online?: RatingState;       // Glicko-2 vs humans on this platform
  /** Mean Lichess-formula accuracy over recent analysed games: shown as a component with weight 0, never fused. */
  accuracy?: { meanAccuracy: number; games: number } | null;
  assessment?: { rating: number; sd: number; updatedAt?: string } | null;
  /** Self-reported starting level; used only when no measured signal exists. */
  startingLevel?: Profile['startingLevel'] | null;
  /** True when bot games are played at the standard time control (15+10 rapid or slower). Default false. */
  standardTimeControl?: boolean;
  /** Evaluation time (ISO) for staleness; defaults to now. */
  now?: string;
  /** Evidence needed for milestone awards. Without it no milestone is awarded (claims policy). */
  milestoneEvidence?: {
    previous: { at: string; low80: number }[];
    ratedGames180d: number;
    knowledgeGates: Partial<Record<TitleCode, boolean>>;
  };
}

export interface EstimateConfig {
  sigmaAnchorBots: number;
  sigmaTimeControl: number;
  onlineSigmaMap: number;
  puzzle: { a: number; b: number; sigmaMap: number };
  batterySigmaMap: number;
  rhoMap: number;
  stalenessPer30Days: number;
  display: { minGames: number; maxRdGames: number; maxSe: number };
  consistencyAlpha: number;
  /** Glicko RD at or above which a pool carries no information (fresh pool). */
  uninformativeRd: number;
  minGames: { bot: number; online: number; puzzle: number };
  milestone: { z80: number; maxSe: number; minGames: number; repeatGapDays: number; gameSignalTolerance: number };
  titles: [number, TitleCode][];
  fideFloor: number;
  prior: { mean: number; sd: number };
  selfReportPriors: Record<Profile['startingLevel'], { mean: number; sd: number }>;
}

export const DEFAULT_ESTIMATE_CONFIG: EstimateConfig = {
  sigmaAnchorBots: 50,
  sigmaTimeControl: 100,
  onlineSigmaMap: 200,
  puzzle: { a: -100, b: 1, sigmaMap: 250 },
  batterySigmaMap: 150,
  rhoMap: 0.3,
  stalenessPer30Days: 25,
  display: { minGames: 20, maxRdGames: 110, maxSe: 150 },
  consistencyAlpha: 0.01,
  uninformativeRd: 340,
  minGames: { bot: 1, online: 1, puzzle: 5 },
  milestone: { z80: 1.2816, maxSe: 100, minGames: 30, repeatGapDays: 30, gameSignalTolerance: 50 },
  titles: [[2500, 'GM'], [2400, 'IM'], [2300, 'FM'], [2200, 'CM']],
  fideFloor: 1400,
  prior: { mean: 1000, sd: 500 },
  selfReportPriors: {
    zero: { mean: 400, sd: 300 },
    'knows-rules': { mean: 700, sd: 350 },
    casual: { mean: 1100, sd: 400 },
    club: { mean: 1600, sd: 400 },
    strong: { mean: 2000, sd: 400 },
  },
};

export const TITLE_THRESHOLDS: [number, string][] = DEFAULT_ESTIMATE_CONFIG.titles;
/** Highest title-equivalent threshold reached by a rating (threshold check only; see the milestone rule). */
export const titleEquivalent = (r: number) => TITLE_THRESHOLDS.find(([t]) => r >= t)?.[1] ?? null;
/** User-facing label for a title code (claims policy: never the bare abbreviation). */
export const titleLabel = (code: string | null | undefined) => (code ? `${code}-equivalent strength (estimate)` : null);

/** Piecewise-linear conversion with linear extrapolation beyond the ends. Returns value and local slope. */
export type ConversionTable = [number, number][];
export function convert(table: ConversionTable, x: number): { value: number; slope: number } {
  if (table.length === 0) return { value: x, slope: 1 };
  if (table.length === 1) return { value: table[0][1] + (x - table[0][0]), slope: 1 };
  let i = 0;
  while (i < table.length - 2 && x > table[i + 1][0]) i++;
  const [x0, y0] = table[i], [x1, y1] = table[i + 1];
  const slope = x1 === x0 ? 1 : (y1 - y0) / (x1 - x0);
  return { value: y0 + slope * (x - x0), slope };
}
export function invert(table: ConversionTable, y: number): number {
  return convert(table.map(([a, b]) => [b, a] as [number, number]), y).value;
}

/** Puzzle rating -> GR (model section 3, P) and back. */
export const puzzleToGr = (r: number, c: EstimateConfig = DEFAULT_ESTIMATE_CONFIG) => c.puzzle.a + c.puzzle.b * r;
export const grToPuzzle = (gr: number, c: EstimateConfig = DEFAULT_ESTIMATE_CONFIG) => (gr - c.puzzle.a) / c.puzzle.b;

export interface EstimateComponent {
  source: string; rating: number; weight: number; note?: string;
  /** total SD of the signal and its parts */
  sd: number; sdStat: number; sdMap: number; sdAge: number; raw?: number; fused: boolean;
}
export interface DetailedEstimate extends RatingEstimate {
  se: number; sdStat: number; low80: number; high80: number;
  provisional: boolean; scale: 'fide-equivalent' | 'extended';
  consistency: { q: number; df: number; p: number; flagged: boolean } | null;
  gamesRated: number;
  milestone: { candidate: TitleCode | null; blockers: string[] };
  components: EstimateComponent[];
}

// ---------- small numerics ----------
function solve(A: number[][], b: number[]): number[] {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / d; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / (r[i] || 1e-12));
}
function lgamma(z: number): number {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  const x = z; let y = z; let tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015; for (const c of g) ser += c / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}
/** Regularized lower incomplete gamma P(s, x) (series / continued fraction, Numerical Recipes). */
function gammaP(s: number, x: number): number {
  if (x <= 0) return 0;
  const lnG = lgamma(s);
  if (x < s + 1) {
    let sum = 1 / s, term = sum;
    for (let n = 1; n < 300; n++) { term *= x / (s + n); sum += term; if (Math.abs(term) < 1e-14 * sum) break; }
    return sum * Math.exp(-x + s * Math.log(x) - lnG);
  }
  let b = x + 1 - s, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 300; i++) {
    const an = -i * (i - s); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-14) break;
  }
  return 1 - Math.exp(-x + s * Math.log(x) - lnG) * h;
}
/** Upper-tail p-value of a chi-square statistic. */
export const chiSquareP = (q: number, df: number) => (df <= 0 ? 1 : Math.max(0, Math.min(1, 1 - gammaP(df / 2, q / 2))));

const DAY = 86400000;
const round = (x: number) => Math.round(x);

export function estimateRating(inputs: EstimateInputs, config: EstimateConfig = DEFAULT_ESTIMATE_CONFIG): DetailedEstimate {
  const now = inputs.now ? Date.parse(inputs.now) : Date.now();
  const age = (at?: string) => (at && Number.isFinite(Date.parse(at)) ? (config.stalenessPer30Days * Math.max(0, (now - Date.parse(at)) / DAY)) / 30 : 0);
  type Sig = { source: string; x: number; sdStat: number; sdMap: number; sdAge: number; raw?: number; note: string; game: boolean; games: number; rd: number };
  const sig: Sig[] = [];
  const usable = (s: RatingState | undefined, min: number): s is RatingState => !!s && Number.isFinite(s.rating) && s.games >= min && s.rd < config.uninformativeRd;

  if (usable(inputs.bot, config.minGames.bot)) {
    const s = inputs.bot;
    const sdMap = inputs.standardTimeControl ? config.sigmaAnchorBots : Math.hypot(config.sigmaAnchorBots, config.sigmaTimeControl);
    sig.push({ source: 'bot', x: s.rating, sdStat: s.rd, sdMap, sdAge: age(s.updatedAt), raw: s.rating, game: true, games: s.games, rd: s.rd,
      note: `Rated games vs bots: ${round(s.rating)} ± ${round(s.rd)} RD over ${s.games} games` });
  }
  if (usable(inputs.online, config.minGames.online)) {
    const s = inputs.online;
    sig.push({ source: 'online', x: s.rating, sdStat: s.rd, sdMap: config.onlineSigmaMap, sdAge: age(s.updatedAt), raw: s.rating, game: true, games: s.games, rd: s.rd,
      note: `Rated games vs humans: ${round(s.rating)} ± ${round(s.rd)} RD over ${s.games} games` });
  }
  if (usable(inputs.puzzle, config.minGames.puzzle)) {
    const s = inputs.puzzle;
    sig.push({ source: 'puzzle', x: puzzleToGr(s.rating, config), sdStat: Math.abs(config.puzzle.b) * s.rd, sdMap: config.puzzle.sigmaMap, sdAge: age(s.updatedAt), raw: s.rating, game: false, games: s.games, rd: s.rd,
      note: `Puzzle rating ${round(s.rating)} ± ${round(s.rd)} RD over ${s.games} puzzles, mapped GR = ${config.puzzle.a} + ${config.puzzle.b} × puzzle` });
  }
  const as = inputs.assessment;
  if (as && Number.isFinite(as.rating) && as.sd > 0) {
    sig.push({ source: 'assessment', x: as.rating, sdStat: as.sd, sdMap: config.batterySigmaMap, sdAge: age(as.updatedAt), raw: as.rating, game: false, games: 0, rd: as.sd,
      note: `Assessment battery ${round(as.rating)} ± ${round(as.sd)}` });
  }

  const gamesRated = sig.filter((s) => s.game).reduce((a, s) => a + s.games, 0);
  const display: EstimateComponent[] = [];
  const acc = inputs.accuracy;
  if (acc && acc.games > 0 && Number.isFinite(acc.meanAccuracy)) {
    display.push({ source: 'accuracy', rating: 0, weight: 0, sd: 0, sdStat: 0, sdMap: 0, sdAge: 0, raw: +acc.meanAccuracy.toFixed(1), fused: false,
      note: `Mean accuracy ${acc.meanAccuracy.toFixed(1)}% over ${acc.games} analysed games (displayed only; accuracy is not a rating)` });
  }

  if (!sig.length) {
    const prior = (inputs.startingLevel && config.selfReportPriors[inputs.startingLevel]) || config.prior;
    const r = prior.mean, se = prior.sd;
    return {
      rating: r, low: Math.max(0, round(r - 1.96 * se)), high: round(r + 1.96 * se), low80: Math.max(0, round(r - 1.2816 * se)), high80: round(r + 1.2816 * se),
      se, sdStat: se, confidence: 'very-low', provisional: true, scale: r >= config.fideFloor ? 'fide-equivalent' : 'extended', consistency: null, gamesRated: 0,
      titleEquivalent: null, milestone: { candidate: null, blockers: ['no measured signal yet'] },
      components: [{ source: 'prior', rating: r, weight: 1, sd: se, sdStat: se, sdMap: 0, sdAge: 0, fused: true,
        note: inputs.startingLevel ? `Self-reported level "${inputs.startingLevel}" (no measurements yet)` : 'Population prior (no measurements yet)' }, ...display],
    };
  }

  const k = sig.length;
  const V = sig.map((s) => s.sdStat ** 2 + s.sdMap ** 2 + s.sdAge ** 2);
  const Sigma = sig.map((si, i) => sig.map((sj, j) => (i === j ? V[i] : config.rhoMap * si.sdMap * sj.sdMap)));
  const Si1 = solve(Sigma, sig.map(() => 1));
  const denom = Si1.reduce((a, b) => a + b, 0);
  const w = Si1.map((v) => v / denom);
  const x = sig.map((s) => s.x);
  const gr = w.reduce((a, wi, i) => a + wi * x[i], 0);
  let se = Math.sqrt(1 / denom);
  // Statistical-only SE (mapping terms excluded), for progress deltas (model section 5).
  const sdStat = Math.sqrt(w.reduce((a, wi, i) => a + wi * wi * (sig[i].sdStat ** 2 + sig[i].sdAge ** 2), 0));

  let consistency: DetailedEstimate['consistency'] = null;
  if (k >= 2) {
    const r = x.map((xi) => xi - gr);
    const Sr = solve(Sigma, r);
    const q = Math.max(0, r.reduce((a, ri, i) => a + ri * Sr[i], 0));
    const p = chiSquareP(q, k - 1);
    const flagged = p < config.consistencyAlpha;
    if (flagged) se *= Math.sqrt(q / (k - 1));
    consistency = { q: +q.toFixed(3), df: k - 1, p: +p.toFixed(4), flagged };
  }

  const gamePools = sig.filter((s) => s.game);
  const gameOk = gamePools.some((s) => s.games >= config.display.minGames && s.rd <= config.display.maxRdGames);
  const nonGame = sig.some((s) => s.source === 'assessment');
  const provisional = !(gameOk && nonGame && se <= config.display.maxSe);
  const confidence: RatingEstimate['confidence'] = provisional ? (se > 250 ? 'very-low' : 'low')
    : se <= 100 && gamesRated >= config.milestone.minGames ? 'high' : 'medium';

  // Milestones (section 7)
  const low80 = gr - config.milestone.z80 * se;
  const candidate = (config.titles.find(([t]) => low80 >= t)?.[1] ?? null) as TitleCode | null;
  const blockers: string[] = [];
  let awarded: TitleCode | null = null;
  if (candidate) {
    const T = config.titles.find(([, c]) => c === candidate)![0];
    const ev = inputs.milestoneEvidence;
    if (se > config.milestone.maxSe) blockers.push(`SE ${round(se)} is above ${config.milestone.maxSe}`);
    if (!ev || ev.ratedGames180d < config.milestone.minGames) blockers.push(`needs ${config.milestone.minGames} rated games in the last 180 days`);
    const gW = gamePools.map((s) => 1 / (s.sdStat ** 2 + s.sdMap ** 2 + s.sdAge ** 2));
    const xG = gamePools.length ? gamePools.reduce((a, s, i) => a + gW[i] * s.x, 0) / gW.reduce((a, b) => a + b, 0) : null;
    if (xG == null || xG < T - config.milestone.gameSignalTolerance) blockers.push('game-based estimate is below the threshold');
    if (consistency?.flagged) blockers.push('signals disagree (consistency test)');
    if (!ev?.previous.some((p) => now - Date.parse(p.at) >= config.milestone.repeatGapDays * DAY && p.low80 >= T)) blockers.push(`needs a second qualifying evaluation at least ${config.milestone.repeatGapDays} days apart`);
    if (!ev?.knowledgeGates[candidate]) blockers.push('knowledge gate (endgame module) not yet passed');
    if (!blockers.length) awarded = candidate;
  }

  const rating = Math.max(0, round(gr));
  return {
    rating,
    low: Math.max(0, round(gr - 1.96 * se)), high: round(gr + 1.96 * se),
    low80: Math.max(0, round(low80)), high80: round(gr + config.milestone.z80 * se),
    se: round(se), sdStat: round(sdStat), confidence, provisional,
    scale: rating >= config.fideFloor ? 'fide-equivalent' : 'extended', consistency, gamesRated,
    titleEquivalent: awarded, milestone: { candidate, blockers },
    components: [...sig.map((s, i): EstimateComponent => ({
      source: s.source, rating: round(s.x), weight: +w[i].toFixed(3), sd: round(Math.sqrt(V[i])), sdStat: round(s.sdStat), sdMap: round(s.sdMap), sdAge: round(s.sdAge),
      raw: s.raw, note: s.note, fused: true,
    })), ...display],
  };
}

/** Progress between two estimates (model section 5): mapping error cancels; "measurable" when delta > 1.645 SE. */
export function progressDelta(a: { rating: number; sdStat?: number; se?: number }, b: { rating: number; sdStat?: number; se?: number }) {
  const s1 = a.sdStat ?? a.se ?? 0, s2 = b.sdStat ?? b.se ?? 0;
  const delta = b.rating - a.rating, se = Math.sqrt(s1 ** 2 + s2 ** 2);
  return { delta, se: Math.round(se), measurable: se > 0 && delta > 1.645 * se };
}

// ---------- benchmarks.json adapter ----------
export interface BenchmarksLike { [k: string]: unknown }
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' ? (v as Obj) : {});

/** Build an EstimateConfig from data/benchmarks.json (`measurementModel`, `platformMilestones`, `titles`, `scale`). */
export function configFromBenchmarks(b: BenchmarksLike | null | undefined, base: EstimateConfig = DEFAULT_ESTIMATE_CONFIG): EstimateConfig {
  if (!b) return base;
  const mm = obj(b.measurementModel), pm = obj(b.platformMilestones);
  const pz = obj(mm.puzzle), bat = obj(mm.battery), eo = obj(mm.externalOnline), cor = obj(mm.correlation), disp = obj(mm.display);
  const titles = Array.isArray(b.titles)
    ? (b.titles as { code?: string; minRating?: number }[])
      .filter((t) => typeof t.code === 'string' && ['CM', 'FM', 'IM', 'GM'].includes(t.code) && typeof t.minRating === 'number')
      .map((t) => [t.minRating!, t.code as TitleCode] as [number, TitleCode]).sort((x, y) => y[0] - x[0])
    : [];
  return {
    ...base,
    sigmaAnchorBots: num(mm.sigmaAnchorBots, base.sigmaAnchorBots),
    sigmaTimeControl: num(mm.sigmaTimeControl, base.sigmaTimeControl),
    onlineSigmaMap: num(eo.sigmaMap, base.onlineSigmaMap),
    puzzle: { a: num(pz.a, base.puzzle.a), b: num(pz.b, base.puzzle.b), sigmaMap: num(pz.sigmaMap, base.puzzle.sigmaMap) },
    batterySigmaMap: num(bat.sigmaMap, base.batterySigmaMap),
    rhoMap: num(cor.rhoMap, base.rhoMap),
    stalenessPer30Days: num(mm.stalenessGrPer30Days, base.stalenessPer30Days),
    display: { minGames: num(disp.minGames, base.display.minGames), maxRdGames: num(disp.maxRdGames, base.display.maxRdGames), maxSe: num(disp.maxSe, base.display.maxSe) },
    consistencyAlpha: num(mm.consistencyTestAlpha, base.consistencyAlpha),
    milestone: {
      z80: num(pm.z80, base.milestone.z80), maxSe: num(pm.maxSe, base.milestone.maxSe), minGames: num(pm.minGames, base.milestone.minGames),
      repeatGapDays: num(pm.repeatGapDays, base.milestone.repeatGapDays), gameSignalTolerance: num(pm.gameSignalTolerance, base.milestone.gameSignalTolerance),
    },
    titles: titles.length ? titles : base.titles,
    fideFloor: num(obj(b.scale).fideEquivalentFrom, base.fideFloor),
  };
}
