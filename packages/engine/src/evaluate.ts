// Grim engine static evaluation: tapered (middlegame/endgame) material + piece-square tables,
// plus a handful of classic terms (bishop pair, pawn structure, passed pawns, rook files,
// mobility, king pawn shield). Values are Grim's own hand-tuned numbers.
// Score is in centipawns from the side to move's point of view.
import { Position, WHITE, BLACK, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, KNIGHT_OFFS, BISHOP_DIRS, ROOK_DIRS, KING_OFFS } from './position.ts';

export const VALUE_MG = [0, 100, 320, 335, 480, 960, 0];
export const VALUE_EG = [0, 125, 295, 320, 530, 950, 0];
/** Simple piece values for move ordering / SEE-like decisions. */
export const PIECE_VALUE = [0, 100, 320, 330, 500, 950, 20000];
const PHASE_W = [0, 0, 1, 1, 2, 4, 0];

// Tables are written visually: first row = 8th rank, from White's point of view.
// prettier-ignore
const PAWN_MG = [
   0,  0,  0,  0,  0,  0,  0,  0,
  60, 60, 60, 65, 65, 60, 60, 60,
  15, 15, 25, 35, 35, 25, 15, 15,
   5,  5, 12, 28, 28, 12,  5,  5,
   0,  0,  8, 22, 22,  6,  0,  0,
   4, -2, -6,  4,  4, -8, -2,  4,
   4,  8,  8,-18,-18, 10, 10,  4,
   0,  0,  0,  0,  0,  0,  0,  0];
// prettier-ignore
const PAWN_EG = [
   0,  0,  0,  0,  0,  0,  0,  0,
  90, 90, 85, 80, 80, 85, 90, 90,
  55, 55, 50, 45, 45, 50, 55, 55,
  30, 30, 25, 20, 20, 25, 30, 30,
  15, 15, 12, 10, 10, 12, 15, 15,
   5,  5,  5,  5,  5,  5,  5,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
   0,  0,  0,  0,  0,  0,  0,  0];
// prettier-ignore
const KNIGHT_T = [
  -55,-40,-30,-28,-28,-30,-40,-55,
  -38,-18,  0,  4,  4,  0,-18,-38,
  -28,  2, 12, 16, 16, 12,  2,-28,
  -26,  6, 16, 22, 22, 16,  6,-26,
  -26,  2, 14, 20, 20, 14,  2,-26,
  -28,  4, 10, 12, 12, 10,  4,-28,
  -38,-18,  0,  5,  5,  0,-18,-38,
  -50,-32,-28,-26,-26,-28,-32,-50];
// prettier-ignore
const BISHOP_T = [
  -18, -8,-10,-10,-10,-10, -8,-18,
   -8,  2,  0,  0,  0,  0,  2, -8,
   -8,  2,  6, 10, 10,  6,  2, -8,
   -8,  6,  6, 10, 10,  6,  6, -8,
   -8,  2, 10, 10, 10, 10,  2, -8,
   -8, 10, 10,  8,  8, 10, 10, -8,
   -8,  8,  2,  2,  2,  2,  8, -8,
  -18, -8,-12, -8, -8,-12, -8,-18];
// prettier-ignore
const ROOK_MG = [
   4,  6,  8, 10, 10,  8,  6,  4,
  14, 18, 18, 18, 18, 18, 18, 14,
  -4,  0,  2,  4,  4,  2,  0, -4,
  -6,  0,  0,  2,  2,  0,  0, -6,
  -6,  0,  0,  2,  2,  0,  0, -6,
  -6,  0,  0,  2,  2,  0,  0, -6,
  -8, -2,  0,  2,  2,  0, -2, -8,
  -2,  0,  4,  8,  8,  6,  0, -2];
// prettier-ignore
const QUEEN_T = [
  -18,-10, -8, -4, -4, -8,-10,-18,
  -10,  0,  2,  2,  2,  2,  0,-10,
   -8,  2,  4,  4,  4,  4,  2, -8,
   -4,  0,  4,  6,  6,  4,  0, -4,
   -4,  0,  4,  6,  6,  4,  0, -4,
   -8,  2,  4,  4,  4,  4,  2, -8,
  -10,  0,  2,  0,  0,  0,  0,-10,
  -18,-10, -8, -2, -6, -8,-10,-18];
// prettier-ignore
const KING_MG = [
  -40,-45,-45,-55,-55,-45,-45,-40,
  -40,-45,-45,-55,-55,-45,-45,-40,
  -40,-45,-45,-55,-55,-45,-45,-40,
  -35,-40,-40,-50,-50,-40,-40,-35,
  -25,-30,-30,-40,-40,-30,-30,-25,
  -12,-20,-20,-24,-24,-20,-20,-12,
   12, 12, -6,-12,-12, -6, 14, 14,
   18, 28,  8, -6,  0, -2, 30, 20];
// prettier-ignore
const KING_EG = [
  -45,-32,-22,-16,-16,-22,-32,-45,
  -28,-12,  0,  6,  6,  0,-12,-28,
  -22,  0, 18, 26, 26, 18,  0,-22,
  -20,  4, 26, 34, 34, 26,  4,-20,
  -20,  4, 26, 34, 34, 26,  4,-20,
  -22,  0, 18, 24, 24, 18,  0,-22,
  -28,-14,  0,  2,  2,  0,-14,-28,
  -48,-32,-24,-20,-20,-24,-32,-48];

const MG_T = [null, PAWN_MG, KNIGHT_T, BISHOP_T, ROOK_MG, QUEEN_T, KING_MG] as const;
const EG_T = [null, PAWN_EG, KNIGHT_T, BISHOP_T, ROOK_MG, QUEEN_T, KING_EG] as const;

// Combined material + PST lookup per piece code (0..15) and 0x88 square.
const PST_MG = new Int16Array(16 * 128), PST_EG = new Int16Array(16 * 128);
for (let type = 1; type <= 6; type++) {
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    const r = sq >> 4, f = sq & 7;
    const wi = (7 - r) * 8 + f, bi = r * 8 + f;
    PST_MG[type * 128 + sq] = VALUE_MG[type] + MG_T[type]![wi];
    PST_EG[type * 128 + sq] = VALUE_EG[type] + EG_T[type]![wi];
    PST_MG[(type | 8) * 128 + sq] = VALUE_MG[type] + MG_T[type]![bi];
    PST_EG[(type | 8) * 128 + sq] = VALUE_EG[type] + EG_T[type]![bi];
  }
}

const PASSED_MG = [0, 5, 8, 14, 25, 45, 70, 0];
const PASSED_EG = [0, 12, 18, 30, 50, 85, 130, 0];

export function evaluate(pos: Position): number {
  const b = pos.board;
  let mg0 = 0, mg1 = 0, eg0 = 0, eg1 = 0, phase = 0;
  const bishops = [0, 0];
  // pawn files: per color, bitmask of occupied files and min/max rank per file
  const pawnFiles = [new Int8Array(8), new Int8Array(8)];
  const pawnMinRank = [new Int8Array(8).fill(8), new Int8Array(8).fill(8)];   // white: lowest rank (most backward)
  const pawnMaxRank = [new Int8Array(8).fill(-1), new Int8Array(8).fill(-1)];
  let mob0 = 0, mob1 = 0;

  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const p = b[sq];
    if (!p) continue;
    const type = p & 7, color = p >> 3;
    if (color === WHITE) { mg0 += PST_MG[p * 128 + sq]; eg0 += PST_EG[p * 128 + sq]; }
    else { mg1 += PST_MG[p * 128 + sq]; eg1 += PST_EG[p * 128 + sq]; }
    phase += PHASE_W[type];
    if (type === PAWN) {
      const f = sq & 7, r = sq >> 4;
      pawnFiles[color][f]++;
      if (r < pawnMinRank[color][f]) pawnMinRank[color][f] = r;
      if (r > pawnMaxRank[color][f]) pawnMaxRank[color][f] = r;
    } else if (type === BISHOP) bishops[color]++;
    // mobility (pseudo-legal squares not occupied by own pieces)
    if (type === KNIGHT) {
      let n = 0;
      for (let i = 0; i < 8; i++) { const t = sq + KNIGHT_OFFS[i]; if (!(t & 0x88) && (!b[t] || (b[t] >> 3) !== color)) n++; }
      if (color === WHITE) mob0 += 4 * (n - 4); else mob1 += 4 * (n - 4);
    } else if (type === BISHOP || type === ROOK || type === QUEEN) {
      const dirs = type === BISHOP ? BISHOP_DIRS : type === ROOK ? ROOK_DIRS : KING_OFFS;
      let n = 0;
      for (let i = 0; i < dirs.length; i++) {
        let t = sq + dirs[i];
        while (!(t & 0x88)) { const q = b[t]; if (q) { if ((q >> 3) !== color) n++; break; } n++; t += dirs[i]; }
      }
      const w = type === BISHOP ? 4 : type === ROOK ? 2 : 1;
      const base = type === BISHOP ? 6 : type === ROOK ? 6 : 12;
      if (color === WHITE) mob0 += w * (n - base); else mob1 += w * (n - base);
    }
  }
  if (phase > 24) phase = 24;

  let mg = mg0 - mg1 + mob0 - mob1, eg = eg0 - eg1 + (mob0 - mob1) / 2;
  if (bishops[0] >= 2) { mg += 25; eg += 45; }
  if (bishops[1] >= 2) { mg -= 25; eg -= 45; }

  // Pawn structure, passed pawns, rook files
  for (let color = 0; color < 2; color++) {
    const sgn = color === WHITE ? 1 : -1;
    const own = pawnFiles[color], opp = pawnFiles[color ^ 1];
    for (let f = 0; f < 8; f++) {
      const n = own[f];
      if (!n) continue;
      if (n > 1) { mg -= sgn * 10 * (n - 1); eg -= sgn * 20 * (n - 1); }
      const isolated = (f === 0 || !own[f - 1]) && (f === 7 || !own[f + 1]);
      if (isolated) { mg -= sgn * 10; eg -= sgn * 14; }
      // passed: no enemy pawns ahead on this or adjacent files
      const r = color === WHITE ? pawnMaxRank[color][f] : pawnMinRank[color][f];
      let passed = true;
      for (let ff = Math.max(0, f - 1); ff <= Math.min(7, f + 1) && passed; ff++) {
        if (!opp[ff]) continue;
        if (color === WHITE) { if (pawnMaxRank[1][ff] > r) passed = false; }
        else if (pawnMinRank[0][ff] < r) passed = false;
      }
      if (passed) {
        const adv = color === WHITE ? r : 7 - r;
        mg += sgn * PASSED_MG[adv]; eg += sgn * PASSED_EG[adv];
      }
    }
  }
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const p = b[sq];
    if ((p & 7) !== ROOK) continue;
    const color = p >> 3, sgn = color === WHITE ? 1 : -1, f = sq & 7;
    if (!pawnFiles[color][f]) { const open = !pawnFiles[color ^ 1][f]; mg += sgn * (open ? 22 : 10); eg += sgn * (open ? 10 : 5); }
  }

  // King pawn shield (middlegame only)
  for (let color = 0; color < 2; color++) {
    const k = pos.kings[color], sgn = color === WHITE ? 1 : -1, fwd = color === WHITE ? 16 : -16;
    const kr = k >> 4;
    if ((color === WHITE && kr > 1) || (color === BLACK && kr < 6)) { mg -= sgn * 18; continue; }
    let shield = 0;
    for (const df of [-1, 0, 1]) {
      const s1 = k + fwd + df, s2 = k + 2 * fwd + df;
      if (!(s1 & 0x88) && b[s1] === (PAWN | (color << 3))) shield += 12;
      else if (!(s2 & 0x88) && b[s2] === (PAWN | (color << 3))) shield += 6;
      else shield -= 8;
    }
    mg += sgn * shield;
  }

  let score = (mg * phase + eg * (24 - phase)) / 24;
  // Drawish material: lone minor piece cannot win
  score = scaleDrawish(pos, score);
  score = pos.side === WHITE ? score : -score;
  return Math.round(score) + 12; // tempo
}

function scaleDrawish(pos: Position, score: number): number {
  // If the side that is ahead has no pawns and at most a minor piece of material advantage, scale down.
  const b = pos.board;
  const mat = [0, 0], pawns = [0, 0];
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const p = b[sq]; if (!p) continue;
    const t = p & 7; if (t === KING) continue;
    if (t === PAWN) pawns[p >> 3]++; else mat[p >> 3] += PIECE_VALUE[t];
  }
  const strong = score > 0 ? WHITE : BLACK;
  if (pawns[strong] === 0 && mat[strong] - mat[strong ^ 1] <= 350 && mat[strong] < 700) return score / 8;
  return score;
}

export function hasNonPawnMaterial(pos: Position, color: number): boolean {
  const b = pos.board;
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const p = b[sq];
    if (p && (p >> 3) === color) { const t = p & 7; if (t !== PAWN && t !== KING) return true; }
  }
  return false;
}
