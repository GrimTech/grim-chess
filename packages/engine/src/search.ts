// Grim engine search: iterative deepening, PVS alpha-beta with a transposition table,
// null-move pruning, reverse futility pruning, late-move reductions, check extension,
// quiescence search (captures + queen promotions, check evasions), MVV-LVA / killer / history ordering.
import { Position, PAWN, QUEEN, F_CAPTURE, F_EP, moveFlags, moveFrom, moveTo, movePromo } from './position.ts';
import { evaluate, hasNonPawnMaterial, PIECE_VALUE } from './evaluate.ts';

export const INF = 32000;
export const MATE = 30000;
export const MATE_BOUND = MATE - 512;

const TT_BITS = 18, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
const FLAG_EXACT = 1, FLAG_LOWER = 2, FLAG_UPPER = 3;
const MAX_PLY = 96;

export interface SearchLimits { maxDepth?: number; timeMs?: number; nodeLimit?: number }
export interface SearchResult { move: number; score: number; depth: number; nodes: number; pv: number[] }

export class Searcher {
  pos: Position;
  nodes = 0;
  stopped = false;
  private deadline = Infinity;
  private nodeLimit = Infinity;
  private ttKey = new Int32Array(TT_SIZE);
  private ttMove = new Int32Array(TT_SIZE);
  private ttScore = new Int16Array(TT_SIZE);
  private ttDepth = new Int8Array(TT_SIZE);
  private ttFlag = new Uint8Array(TT_SIZE);
  private killers = new Int32Array(MAX_PLY * 2);
  private history = new Int32Array(16 * 128);
  /** Optional hook: replaces static evaluation (used by the weakness model for eval noise). */
  evalHook: ((pos: Position) => number) | null = null;

  constructor(pos: Position) { this.pos = pos; }

  private eval(): number { return this.evalHook ? this.evalHook(this.pos) : evaluate(this.pos); }

  private checkLimits() {
    if (this.nodes >= this.nodeLimit || ((this.nodes & 1023) === 0 && Date.now() > this.deadline)) this.stopped = true;
  }

  setLimits(l: SearchLimits) {
    this.deadline = l.timeMs != null ? Date.now() + l.timeMs : Infinity;
    this.nodeLimit = l.nodeLimit ?? Infinity;
    this.stopped = false;
  }

  /** Order moves: hash move, captures by MVV-LVA, queen promotions, killers, history. */
  private scoreMoves(moves: number[], ply: number, ttMove: number): number[] {
    const b = this.pos.board;
    const scores = new Array<number>(moves.length);
    const k1 = this.killers[ply * 2], k2 = this.killers[ply * 2 + 1];
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      if (m === ttMove) { scores[i] = 10_000_000; continue; }
      const fl = moveFlags(m), from = moveFrom(m), to = moveTo(m);
      if (fl & F_CAPTURE) {
        const victim = fl & F_EP ? PAWN : b[to] & 7;
        scores[i] = 1_000_000 + PIECE_VALUE[victim] * 10 - (b[from] & 7);
      } else if (movePromo(m) === QUEEN) scores[i] = 900_000;
      else if (m === k1) scores[i] = 800_000;
      else if (m === k2) scores[i] = 790_000;
      else scores[i] = this.history[b[from] * 128 + to];
    }
    return scores;
  }

  private pick(moves: number[], scores: number[], i: number) {
    let best = i;
    for (let j = i + 1; j < moves.length; j++) if (scores[j] > scores[best]) best = j;
    if (best !== i) {
      const tm = moves[i]; moves[i] = moves[best]; moves[best] = tm;
      const ts = scores[i]; scores[i] = scores[best]; scores[best] = ts;
    }
  }

  quiesce(alpha: number, beta: number, ply: number): number {
    this.nodes++;
    this.checkLimits();
    if (this.stopped) return 0;
    const pos = this.pos;
    const inCheck = pos.inCheck();
    if (ply >= MAX_PLY - 1) return this.eval();
    let stand = -INF;
    if (!inCheck) {
      stand = this.eval();
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
    }
    const moves = pos.genPseudo([], !inCheck);
    const scores = this.scoreMoves(moves, ply, 0);
    let legal = 0, best = stand;
    for (let i = 0; i < moves.length; i++) {
      this.pick(moves, scores, i);
      const m = moves[i];
      if (!inCheck) {
        // delta pruning: even winning the victim cannot raise alpha
        const fl = moveFlags(m);
        const victim = fl & F_EP ? PAWN : pos.board[moveTo(m)] & 7;
        if (!movePromo(m) && stand + PIECE_VALUE[victim] + 200 < alpha) continue;
      }
      if (!pos.make(m)) continue;
      legal++;
      const s = -this.quiesce(-beta, -alpha, ply + 1);
      pos.unmake(m);
      if (this.stopped) return 0;
      if (s > best) {
        best = s;
        if (s > alpha) { alpha = s; if (s >= beta) return s; }
      }
    }
    if (inCheck && legal === 0) return -MATE + ply;
    return best;
  }

  negamax(depth: number, alpha: number, beta: number, ply: number, allowNull: boolean): number {
    const pos = this.pos;
    if (ply > 0) {
      if (pos.halfmove >= 100 || pos.isRepetition() || pos.insufficientMaterial()) return 0;
      // mate distance pruning
      alpha = Math.max(alpha, -MATE + ply);
      beta = Math.min(beta, MATE - ply - 1);
      if (alpha >= beta) return alpha;
    }
    const inCheck = pos.inCheck();
    if (inCheck) depth++;
    if (depth <= 0) return this.quiesce(alpha, beta, ply);
    this.nodes++;
    this.checkLimits();
    if (this.stopped) return 0;
    if (ply >= MAX_PLY - 1) return this.eval();

    const pvNode = beta - alpha > 1;
    const idx = pos.hlo & TT_MASK;
    let ttMove = 0;
    if (this.ttKey[idx] === pos.hhi && this.ttFlag[idx]) {
      ttMove = this.ttMove[idx];
      if (ply > 0 && this.ttDepth[idx] >= depth && !pvNode) {
        let s = this.ttScore[idx];
        if (s > MATE_BOUND) s -= ply; else if (s < -MATE_BOUND) s += ply;
        const f = this.ttFlag[idx];
        if (f === FLAG_EXACT || (f === FLAG_LOWER && s >= beta) || (f === FLAG_UPPER && s <= alpha)) return s;
      }
    }

    if (!inCheck && !pvNode) {
      const staticEval = this.eval();
      // reverse futility pruning
      if (depth <= 3 && staticEval - 110 * depth >= beta && Math.abs(beta) < MATE_BOUND) return staticEval;
      // null-move pruning
      if (allowNull && depth >= 3 && staticEval >= beta && hasNonPawnMaterial(pos, pos.side)) {
        const R = depth >= 6 ? 3 : 2;
        pos.makeNull();
        const s = -this.negamax(depth - 1 - R, -beta, -beta + 1, ply + 1, false);
        pos.unmakeNull();
        if (this.stopped) return 0;
        if (s >= beta) return s >= MATE_BOUND ? beta : s;
      }
    }

    const moves = pos.genPseudo([]);
    const scores = this.scoreMoves(moves, ply, ttMove);
    const origAlpha = alpha;
    let best = -INF, bestMove = 0, legal = 0;
    for (let i = 0; i < moves.length; i++) {
      this.pick(moves, scores, i);
      const m = moves[i];
      const quiet = !(moveFlags(m) & F_CAPTURE) && !movePromo(m);
      if (!pos.make(m)) continue;
      legal++;
      let s: number;
      if (legal === 1) s = -this.negamax(depth - 1, -beta, -alpha, ply + 1, true);
      else {
        let r = 0;
        if (depth >= 3 && quiet && !inCheck && legal > 3 && scores[i] < 790_000 && !pos.inCheck()) r = legal > 8 ? 2 : 1;
        s = -this.negamax(depth - 1 - r, -alpha - 1, -alpha, ply + 1, true);
        if (s > alpha && (r > 0 || s < beta)) s = -this.negamax(depth - 1, -beta, -alpha, ply + 1, true);
      }
      pos.unmake(m);
      if (this.stopped) return 0;
      if (s > best) {
        best = s; bestMove = m;
        if (s > alpha) {
          alpha = s;
          if (s >= beta) {
            if (quiet) {
              if (this.killers[ply * 2] !== m) { this.killers[ply * 2 + 1] = this.killers[ply * 2]; this.killers[ply * 2] = m; }
              const hi = pos.board[moveFrom(m)] * 128 + moveTo(m);
              this.history[hi] = Math.min(700_000, this.history[hi] + depth * depth);
            }
            break;
          }
        }
      }
    }
    if (legal === 0) return inCheck ? -MATE + ply : 0;

    let stored = best;
    if (stored > MATE_BOUND) stored += ply; else if (stored < -MATE_BOUND) stored -= ply;
    this.ttKey[idx] = pos.hhi;
    this.ttMove[idx] = bestMove;
    this.ttScore[idx] = stored;
    this.ttDepth[idx] = depth;
    this.ttFlag[idx] = best >= beta ? FLAG_LOWER : best <= origAlpha ? FLAG_UPPER : FLAG_EXACT;
    return best;
  }

  /** Principal variation from the transposition table. */
  pv(first: number, maxLen = 12): number[] {
    const pos = this.pos, line: number[] = [];
    let m = first;
    while (m && line.length < maxLen) {
      const legal = pos.legalMoves();
      if (!legal.includes(m)) break;
      pos.make(m); line.push(m);
      const idx = pos.hlo & TT_MASK;
      m = this.ttKey[idx] === pos.hhi ? this.ttMove[idx] : 0;
      if (pos.isRepetition()) break;
    }
    for (let i = line.length - 1; i >= 0; i--) pos.unmake(line[i]);
    return line;
  }

  /** Score every root move at a fixed depth with a full window (used by the weakness model). */
  scoreRootMoves(depth: number, moves: number[]): { move: number; score: number }[] {
    const pos = this.pos, out: { move: number; score: number }[] = [];
    for (const m of moves) {
      if (!pos.make(m)) continue;
      const s = depth <= 1 ? -this.quiesce(-INF, INF, 1) : -this.negamax(depth - 1, -INF, INF, 1, true);
      pos.unmake(m);
      if (this.stopped) break;
      out.push({ move: m, score: s });
    }
    return out;
  }

  /** Iterative deepening search from the root. */
  search(limits: SearchLimits = {}): SearchResult {
    const pos = this.pos;
    this.setLimits(limits);
    this.nodes = 0;
    this.killers.fill(0);
    for (let i = 0; i < this.history.length; i++) this.history[i] >>= 2;
    const start = Date.now();
    const maxDepth = Math.min(limits.maxDepth ?? 64, MAX_PLY - 8);
    const rootMoves = pos.legalMoves();
    if (!rootMoves.length) return { move: 0, score: pos.inCheck() ? -MATE : 0, depth: 0, nodes: 0, pv: [] };
    let bestMove = rootMoves[0], bestScore = -INF, doneDepth = 0;
    const rootScores = new Map<number, number>();

    for (let depth = 1; depth <= maxDepth; depth++) {
      // order root moves by previous iteration's score (best first)
      rootMoves.sort((a, b) => (a === bestMove ? -1 : b === bestMove ? 1 : (rootScores.get(b) ?? -INF) - (rootScores.get(a) ?? -INF)));
      let alpha = -INF, iterBest = 0, iterScore = -INF;
      for (let i = 0; i < rootMoves.length; i++) {
        const m = rootMoves[i];
        pos.make(m);
        let s: number;
        if (i === 0) s = -this.negamax(depth - 1, -INF, -alpha, 1, true);
        else {
          s = -this.negamax(depth - 1, -alpha - 1, -alpha, 1, true);
          if (s > alpha && !this.stopped) s = -this.negamax(depth - 1, -INF, -alpha, 1, true);
        }
        pos.unmake(m);
        if (this.stopped) break;
        rootScores.set(m, s);
        if (s > iterScore) { iterScore = s; iterBest = m; }
        if (s > alpha) alpha = s;
      }
      if (this.stopped) {
        // a move that beat the previous best during the partial iteration is trustworthy
        if (iterBest && iterBest !== bestMove && iterScore > bestScore) { bestMove = iterBest; bestScore = iterScore; }
        break;
      }
      bestMove = iterBest; bestScore = iterScore; doneDepth = depth;
      // store root in TT for PV extraction
      const idx = pos.hlo & TT_MASK;
      this.ttKey[idx] = pos.hhi; this.ttMove[idx] = bestMove; this.ttFlag[idx] = FLAG_EXACT; this.ttDepth[idx] = depth;
      this.ttScore[idx] = bestScore;
      if (Math.abs(bestScore) > MATE_BOUND && depth >= (MATE - Math.abs(bestScore)) + 2) break; // mate found and proven
      if (limits.timeMs != null && Date.now() - start > limits.timeMs * 0.55) break;
      if (rootMoves.length === 1 && depth >= 4) break;
    }
    return { move: bestMove, score: bestScore, depth: doneDepth, nodes: this.nodes, pv: this.pv(bestMove) };
  }
}
