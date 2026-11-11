// Engine facade used by every feature (play, lessons, drills, game review, kids).
// OWNER: play agent. Stockfish 19 lite WASM (Web Worker, see stockfish.ts) for strong bots and analysis;
// the in-house @grim/engine (its own Web Worker) for human-like low-rated bots.
// Contract (do not change signatures without updating docs/ARCHITECTURE.md):
//   BOT_LEVELS, bestMove(fen,{level}), analyse(fen,{depth,multipv}), analyseGame(fens), stopEngine().
// Scores in `analyse` are from the side to move; `analyseGame` returns White-POV centipawns (mate = +/-1000).
import { Chess } from 'chess.js';
import { AbortError, StockfishClient, type UciInfo } from './stockfish.ts';

export interface EngineLine { cp?: number; mate?: number; pv: string[] /* UCI */; depth: number; multipv: number }

export interface BotLevel {
  id: number;            // 1..N, ascending strength
  name: string;          // persona name
  rating: number;        // calibrated approximate rating shown to users
  rd: number;            // rating uncertainty used when rating the learner (Glicko opponent RD)
  engine: 'grim' | 'stockfish';
  description: string;
  kidsFriendly?: boolean;
  /** grim: weakness profile 1..8 (packages/engine/src/bot.ts GRIM_PROFILES) */
  grimLevel?: number;
  /** stockfish: UCI_Elo with UCI_LimitStrength (Stockfish accepts 1320..3190); omitted = full strength */
  uciElo?: number;
  /** stockfish: Skill Level 0..20 (used for the top level) */
  skill?: number;
  /** default thinking time per move */
  movetimeMs: number;
}

/*
 * CALIBRATION CAVEATS (read before trusting these numbers):
 * - See knowledge-base/04-assessment/12-engine-strength-calibration.md.
 * - Since Jan 2023 (Stockfish PR #4341, in SF 16+), UCI_Elo (1320..3190) is a fit of Skill-limited Stockfish vs. the
 *   Stash engine at 120+1, with Stash's ratings taken from CCRL Blitz (Stash itself only within ~±100 of CCRL). It is an
 *   ENGINE-pool blitz scale, never calibrated against humans (FIDE or otherwise). The older "60+0.6 / CCRL 40/4"
 *   description (PR #2225, 2019) is outdated. UCI_Elo 3190 corresponds to a fractional Skill Level of only ~18.4.
 * - Skill-limited Stockfish mixes engine-quality moves with random sub-optimal ones; humans make correlated,
 *   position-dependent errors. So a human's score vs. a UCI_Elo bot is only a rough proxy for a human rating. We also
 *   use the *lite* network in a browser at ~1 s/move rather than the calibration setup. rd = 80 reflects this.
 * - Grim levels (<= 1200) are heuristic estimates from the weakness model (blunder/miss probabilities chosen to match
 *   typical beginner error rates) and internal level-vs-level matches; they have not yet been calibrated against
 *   rated humans. rd = 150 is deliberately wide so these games move the learner's bot rating cautiously.
 * - The top level is full-strength Stockfish lite (Skill Level 20, no strength limit), above the UCI_Elo range
 *   (3190 ~ Skill 18.4); "3000" is a floor-ish label, not a measurement.
 */
export const BOT_LEVELS: BotLevel[] = [
  { id: 1, name: 'Pip', rating: 250, rd: 150, engine: 'grim', grimLevel: 1, movetimeMs: 300, kidsFriendly: true,
    description: 'Just learned how the pieces move. Hangs pieces often and sometimes misses mate in one.' },
  { id: 2, name: 'Bramble', rating: 400, rd: 150, engine: 'grim', grimLevel: 2, movetimeMs: 300, kidsFriendly: true,
    description: 'Loves checks and captures, rarely looks at your reply. Good first opponent.' },
  { id: 3, name: 'Moth', rating: 550, rd: 150, engine: 'grim', grimLevel: 3, movetimeMs: 400, kidsFriendly: true,
    description: 'Sees one-move threats about two times in three. Still leaves pieces undefended.' },
  { id: 4, name: 'Tinker', rating: 700, rd: 150, engine: 'grim', grimLevel: 4, movetimeMs: 500, kidsFriendly: true,
    description: 'Punishes most hanging pieces but blunders under pressure and misses simple tactics.' },
  { id: 5, name: 'Wren', rating: 850, rd: 150, engine: 'grim', grimLevel: 5, movetimeMs: 600, kidsFriendly: true,
    description: 'Looks a few moves ahead. Occasional blunders; weak plans in quiet positions.' },
  { id: 6, name: 'Corvin', rating: 1000, rd: 150, engine: 'grim', grimLevel: 6, movetimeMs: 700, kidsFriendly: true,
    description: 'Solid with basic tactics, still makes a clear mistake most games.' },
  { id: 7, name: 'Hollis', rating: 1150, rd: 150, engine: 'grim', grimLevel: 7, movetimeMs: 800,
    description: 'Rarely hangs material; beat it with forks, pins and better endgames.' },
  { id: 8, name: 'Sable', rating: 1320, rd: 80, engine: 'stockfish', uciElo: 1320, movetimeMs: 800,
    description: 'Stockfish at its lowest strength setting (UCI_Elo 1320, an engine blitz scale). Inhuman style: solid moves mixed with random slips.' },
  { id: 9, name: 'Ash', rating: 1500, rd: 80, engine: 'stockfish', uciElo: 1500, movetimeMs: 900,
    description: 'Stockfish limited to UCI_Elo 1500 (engine scale). Punishes loose pieces reliably.' },
  { id: 10, name: 'Mire', rating: 1700, rd: 80, engine: 'stockfish', uciElo: 1700, movetimeMs: 1000,
    description: 'Stockfish limited to UCI_Elo 1700 (engine scale). Tactically alert; occasional odd choices.' },
  { id: 11, name: 'Vesper', rating: 1900, rd: 80, engine: 'stockfish', uciElo: 1900, movetimeMs: 1000,
    description: 'Stockfish limited to UCI_Elo 1900 (engine scale). Converts advantages and rarely hangs anything.' },
  { id: 12, name: 'Thorne', rating: 2100, rd: 80, engine: 'stockfish', uciElo: 2100, movetimeMs: 1000,
    description: 'Stockfish limited to UCI_Elo 2100 (engine scale). Hard for most club players.' },
  { id: 13, name: 'Morrow', rating: 2300, rd: 80, engine: 'stockfish', uciElo: 2300, movetimeMs: 1200,
    description: 'Stockfish limited to UCI_Elo 2300 (engine scale). Very few errors; the human comparison is rough.' },
  { id: 14, name: 'Raven', rating: 2500, rd: 80, engine: 'stockfish', uciElo: 2500, movetimeMs: 1200,
    description: 'Stockfish limited to UCI_Elo 2500 (engine scale, not a FIDE rating).' },
  { id: 15, name: 'Grimwald', rating: 2750, rd: 80, engine: 'stockfish', uciElo: 2750, movetimeMs: 1500,
    description: 'Stockfish limited to UCI_Elo 2750 (engine scale, not a FIDE rating). Near full strength.' },
  { id: 16, name: 'The Reaper', rating: 3000, rd: 80, engine: 'stockfish', skill: 20, movetimeMs: 2000,
    description: 'Full-strength Stockfish 19 lite (Skill Level 20). Stronger than any human; for study, not for rating.' },
];

export const botLevel = (id: number): BotLevel | undefined => BOT_LEVELS.find((l) => l.id === id);

// ---------------- Stockfish ----------------
const sf = new StockfishClient();
const FULL_STRENGTH = { UCI_LimitStrength: 'false', 'Skill Level': 20 } as const;

const toLine = (i: UciInfo): EngineLine => ({ cp: i.cp, mate: i.mate, pv: i.pv, depth: i.depth, multipv: i.multipv });

function terminalLines(fen: string): EngineLine[] | null {
  try {
    const c = new Chess(fen);
    if (c.isCheckmate()) return [{ mate: 0, pv: [], depth: 0, multipv: 1 }];
    if (c.isStalemate() || c.isInsufficientMaterial()) return [{ cp: 0, pv: [], depth: 0, multipv: 1 }];
  } catch { /* invalid FEN: let the engine complain */ }
  return null;
}

// ---------------- Grim worker ----------------
let grimWorker: Worker | null = null;
let grimSeq = 0;
const grimPending = new Map<number, { resolve: (u: string | null) => void; reject: (e: Error) => void }>();

function getGrimWorker(): Worker {
  if (grimWorker) return grimWorker;
  const w = new Worker(new URL('../../../../packages/engine/src/worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (e: MessageEvent<{ id: number; uci?: string | null; error?: string }>) => {
    const p = grimPending.get(e.data.id);
    if (!p) return;
    grimPending.delete(e.data.id);
    if (e.data.error) p.reject(new Error(e.data.error)); else p.resolve(e.data.uci ?? null);
  };
  w.onerror = (e) => { killGrim(new Error(`Grim engine worker failed: ${e.message}`)); };
  grimWorker = w;
  return w;
}

function killGrim(err: Error) {
  grimWorker?.terminate();
  grimWorker = null;
  for (const p of grimPending.values()) p.reject(err);
  grimPending.clear();
}

async function grimMove(fen: string, level: number, timeMs: number): Promise<string | null> {
  if (typeof Worker === 'undefined') {
    const { grimBestMove } = await import('@grim/engine');
    return grimBestMove(fen, { level, timeMs });
  }
  const id = ++grimSeq;
  return new Promise((resolve, reject) => {
    grimPending.set(id, { resolve, reject });
    getGrimWorker().postMessage({ id, fen, level, timeMs });
  });
}

// ---------------- Public API ----------------

/** Best move for a bot of the given level (or full strength when level omitted). Returns UCI like "e2e4" / "e7e8q". */
export async function bestMove(fen: string, opts: { level?: number; movetimeMs?: number; depth?: number } = {}): Promise<string> {
  const lvl = opts.level != null ? botLevel(opts.level) : undefined;
  if (lvl?.engine === 'grim') {
    const uci = await grimMove(fen, lvl.grimLevel ?? 1, opts.movetimeMs ?? lvl.movetimeMs);
    if (!uci) throw new Error('No legal moves');
    return uci;
  }
  const movetime = opts.movetimeMs ?? lvl?.movetimeMs ?? 1000;
  const options: Record<string, string | number> = lvl?.uciElo
    ? { UCI_LimitStrength: 'true', UCI_Elo: lvl.uciElo, MultiPV: 1 }
    : { ...FULL_STRENGTH, 'Skill Level': lvl?.skill ?? 20, MultiPV: 1 };
  const res = await sf.go({ fen, go: opts.depth ? `depth ${opts.depth} movetime ${movetime * 4}` : `movetime ${movetime}`, options });
  if (!res.bestmove) throw new Error('No legal moves');
  return res.bestmove;
}

/** Full-strength analysis. Results ordered by multipv. Scores are from the side-to-move's point of view. */
export async function analyse(fen: string, opts: { depth?: number; multipv?: number; movetimeMs?: number; signal?: AbortSignal } = {}): Promise<EngineLine[]> {
  const term = terminalLines(fen);
  if (term) return term;
  const depth = opts.depth ?? (opts.movetimeMs ? undefined : 14);
  const go = [depth ? `depth ${depth}` : '', opts.movetimeMs ? `movetime ${opts.movetimeMs}` : ''].filter(Boolean).join(' ');
  const res = await sf.go({ fen, go, options: { ...FULL_STRENGTH, MultiPV: opts.multipv ?? 1 }, signal: opts.signal });
  return res.lines.map(toLine);
}

/**
 * Streaming analysis for interactive boards: onUpdate receives the current lines as depth increases.
 * cancel() stops this search only (other queued jobs are unaffected).
 */
export function analyseStream(fen: string, opts: { depth?: number; multipv?: number; movetimeMs?: number },
  onUpdate: (lines: EngineLine[]) => void): { done: Promise<EngineLine[]>; cancel: () => void } {
  const ctl = new AbortController();
  const term = terminalLines(fen);
  if (term) { onUpdate(term); return { done: Promise.resolve(term), cancel: () => {} }; }
  const go = [`depth ${opts.depth ?? 22}`, opts.movetimeMs ? `movetime ${opts.movetimeMs}` : ''].filter(Boolean).join(' ');
  const done = sf.go({
    fen, go, signal: ctl.signal,
    options: { ...FULL_STRENGTH, MultiPV: opts.multipv ?? 3 },
    onInfo: (ls) => { if (!ctl.signal.aborted) onUpdate(ls.map(toLine)); },
  }).then((r) => r.lines.map(toLine));
  return { done, cancel: () => ctl.abort() };
}

/** Analyse every position of a game; returns centipawn evals from WHITE's point of view (index 0 = start). */
export async function analyseGame(fens: string[], opts: { depth?: number; movetimeMs?: number; onProgress?: (done: number, total: number) => void; signal?: AbortSignal } = {}): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < fens.length; i++) {
    if (opts.signal?.aborted) throw new AbortError();
    const fen = fens[i];
    const whiteToMove = fen.split(' ')[1] !== 'b';
    const [line] = await analyse(fen, { depth: opts.depth ?? 12, movetimeMs: opts.movetimeMs ?? 1500, signal: opts.signal });
    let stm = 0;
    if (line) stm = line.mate != null ? (line.mate > 0 ? 1000 : -1000) : Math.max(-1000, Math.min(1000, line.cp ?? 0));
    out.push(whiteToMove ? stm : -stm);
    opts.onProgress?.(i + 1, fens.length);
  }
  return out;
}

/** Start a new game (clears the engine hash). */
export function newEngineGame(): void { sf.newGame(); }

/** Stop all engine work: the running Stockfish search ends early, queued requests reject, Grim bots are cancelled. */
export function stopEngine(): void {
  sf.stopAll();
  if (grimPending.size) killGrim(new AbortError());
}

export { AbortError };
