// Grim bots: a "human-like weakness" model on top of the Grim search.
//
// Real beginners do not lose because they search 3 plies instead of 20; they lose because they
// (a) do not notice that a piece is attacked or undefended, (b) miss captures that are offered,
// (c) play "hope" moves without checking the reply, and (d) have a fuzzy sense of evaluation.
// Each level models those failure modes explicitly:
//   depth           plies searched for the moves the bot "looks at properly"
//   noiseCp         std-dev of Gaussian noise added to every candidate's score (fuzzy judgement)
//   blindProb       chance that on this move the bot is careless: most candidates are then judged
//                   WITHOUT considering the opponent's reply (static eval after the move), which
//                   produces hanging-piece blunders and missed threats
//   missCaptureProb chance a material-winning capture is simply not noticed
//   randomProb      chance of a near-random move (biased to checks/captures like real beginners)
//   seeMateProb     chance a mate-in-1 for the bot is noticed
// The rating each profile plays at is a heuristic estimate (see BOT_LEVELS in apps/web/src/lib/engine.ts).
import { Position, moveToUci, moveFlags, F_CAPTURE, moveTo, PAWN, F_EP } from './position.ts';
import { evaluate, PIECE_VALUE } from './evaluate.ts';
import { Searcher, MATE, MATE_BOUND } from './search.ts';

export interface WeaknessProfile {
  depth: number; noiseCp: number; blindProb: number; missCaptureProb: number; randomProb: number; seeMateProb: number;
}

/** Index 1..7 = weak human-like levels; 8 = full strength (no weakness). */
export const GRIM_PROFILES: Record<number, WeaknessProfile | null> = {
  1: { depth: 1, noiseCp: 230, blindProb: 0.55, missCaptureProb: 0.5, randomProb: 0.3, seeMateProb: 0.35 },
  2: { depth: 1, noiseCp: 170, blindProb: 0.42, missCaptureProb: 0.38, randomProb: 0.18, seeMateProb: 0.5 },
  3: { depth: 2, noiseCp: 125, blindProb: 0.32, missCaptureProb: 0.28, randomProb: 0.1, seeMateProb: 0.65 },
  4: { depth: 2, noiseCp: 90, blindProb: 0.22, missCaptureProb: 0.18, randomProb: 0.05, seeMateProb: 0.8 },
  5: { depth: 3, noiseCp: 65, blindProb: 0.14, missCaptureProb: 0.1, randomProb: 0.02, seeMateProb: 0.9 },
  6: { depth: 3, noiseCp: 45, blindProb: 0.08, missCaptureProb: 0.05, randomProb: 0, seeMateProb: 0.96 },
  7: { depth: 4, noiseCp: 28, blindProb: 0.04, missCaptureProb: 0.02, randomProb: 0, seeMateProb: 1 },
  8: null,
};
export const GRIM_MAX_LEVEL = 8;

export interface GrimOptions {
  /** 1..8 (8 = full strength). Default 8. */
  level?: number;
  /** Time budget in milliseconds. Default 1000. */
  timeMs?: number;
  /** Fixed depth for full-strength search. */
  depth?: number;
  /** Random source in [0,1) for reproducible tests. */
  random?: () => number;
}

export interface GrimResult { uci: string | null; score: number; depth: number; nodes: number; pv: string[] }

function gaussian(rand: () => number): number {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Full search result (score from side to move, centipawns; mates as +/-(MATE - plies)). */
export function grimSearch(fen: string, opts: GrimOptions = {}): GrimResult {
  const pos = new Position(fen);
  const level = Math.max(1, Math.min(GRIM_MAX_LEVEL, Math.round(opts.level ?? GRIM_MAX_LEVEL)));
  const profile = GRIM_PROFILES[level];
  const timeMs = opts.timeMs ?? 1000;
  const rand = opts.random ?? Math.random;
  const searcher = new Searcher(pos);
  const legal = pos.legalMoves();
  if (!legal.length) return { uci: null, score: pos.inCheck() ? -MATE : 0, depth: 0, nodes: 0, pv: [] };

  if (!profile) {
    const r = searcher.search({ timeMs, maxDepth: opts.depth });
    return { uci: moveToUci(r.move), score: r.score, depth: r.depth, nodes: r.nodes, pv: r.pv.map(moveToUci) };
  }
  if (legal.length === 1) return { uci: moveToUci(legal[0]), score: 0, depth: 0, nodes: 0, pv: [moveToUci(legal[0])] };

  // Classify candidate moves once.
  const info = legal.map((m) => {
    const fl = moveFlags(m);
    const capture = !!(fl & F_CAPTURE);
    const victim = capture ? (fl & F_EP ? PAWN : pos.board[moveTo(m)] & 7) : 0;
    pos.make(m);
    const givesCheck = pos.inCheck();
    const mates = givesCheck && !pos.hasLegalMove();
    pos.unmake(m);
    return { m, capture, victim, givesCheck, mates };
  });

  // Mate in one: noticed with probability seeMateProb.
  const mating = info.filter((x) => x.mates);
  if (mating.length && rand() < profile.seeMateProb) return pick(mating[0].m, MATE - 1);

  // (d) near-random "beginner" move, biased toward checks and captures.
  if (rand() < profile.randomProb) {
    const w = info.map((x) => 1 + (x.givesCheck ? 2 : 0) + (x.capture ? 2 : 0));
    let t = rand() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < info.length; i++) { t -= w[i]; if (t <= 0) return pick(info[i].m, 0); }
    return pick(info[info.length - 1].m, 0);
  }

  // (b) captures that win material are sometimes not noticed at all.
  let candidates = info.filter((x) => {
    if (!x.capture || x.mates) return true;
    const attacker = pos.board[x.m & 127] & 7;
    const winsMaterial = PIECE_VALUE[x.victim] >= PIECE_VALUE[attacker] || !pos.attacked(moveTo(x.m), pos.side ^ 1);
    return !(winsMaterial && rand() < profile.missCaptureProb);
  });
  if (!candidates.length) candidates = info;

  // (a)/(c) score each candidate; blind candidates ignore the opponent's reply entirely.
  const deadline = Date.now() + timeMs;
  const careless = rand() < profile.blindProb;
  const blind = new Set(careless ? candidates.filter(() => rand() < 0.75).map((x) => x.m) : []);
  let scored: { move: number; score: number }[] = [];
  for (let d = 1; d <= profile.depth; d++) {
    searcher.setLimits({ timeMs: Math.max(1, deadline - Date.now()) });
    const seen = candidates.filter((x) => !blind.has(x.m)).map((x) => x.m);
    const res = searcher.scoreRootMoves(d, seen);
    if (searcher.stopped && scored.length) break;
    const blindScores = [...blind].map((m) => { pos.make(m); const s = -evaluate(pos); pos.unmake(m); return { move: m, score: s }; });
    scored = [...res, ...blindScores];
    if (searcher.stopped) break;
  }
  if (!scored.length) return pick(candidates[0].m, 0);

  // fuzzy judgement: Gaussian noise (mate scores are not fuzzed into non-mates)
  let best = scored[0], bestNoisy = -Infinity;
  for (const s of scored) {
    const noisy = Math.abs(s.score) > MATE_BOUND ? s.score : s.score + gaussian(rand) * profile.noiseCp;
    if (noisy > bestNoisy) { bestNoisy = noisy; best = s; }
  }
  return pick(best.move, best.score);

  function pick(m: number, score: number): GrimResult {
    return { uci: moveToUci(m), score, depth: profile?.depth ?? 0, nodes: searcher.nodes, pv: [moveToUci(m)] };
  }
}

/** Best move (UCI) for a Grim bot of the given level, or null when there is no legal move. */
export function grimBestMove(fen: string, opts: { level?: number; timeMs?: number; depth?: number; random?: () => number } = {}): string | null {
  return grimSearch(fen, opts).uci;
}
