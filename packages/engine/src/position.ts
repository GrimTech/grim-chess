// Grim engine: 0x88 mailbox board representation and legal move generation.
// Written for Grim Chess (AGPL-3.0-or-later). No external move generator is used.
//
// Squares: 0x88 index = rank * 16 + file, a1 = 0, h1 = 7, a8 = 112, h8 = 119.
// Pieces:  type | (color << 3); white 1..6, black 9..14, empty 0.
// Moves:   from | to << 7 | promoType << 14 | flags << 17  (plain non-negative integers).

export const WHITE = 0, BLACK = 1;
export const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;

export const F_CAPTURE = 1, F_EP = 2, F_CASTLE = 4, F_DOUBLE = 8;

export const moveFrom = (m: number) => m & 127;
export const moveTo = (m: number) => (m >> 7) & 127;
export const movePromo = (m: number) => (m >> 14) & 7;
export const moveFlags = (m: number) => m >>> 17;
const mk = (from: number, to: number, promo: number, flags: number) => from | (to << 7) | (promo << 14) | (flags << 17);

export const KNIGHT_OFFS = [33, 31, 18, 14, -33, -31, -18, -14];
export const KING_OFFS = [1, -1, 16, -16, 17, 15, -17, -15];
export const BISHOP_DIRS = [17, 15, -17, -15];
export const ROOK_DIRS = [16, -16, 1, -1];

const CASTLE_WK = 1, CASTLE_WQ = 2, CASTLE_BK = 4, CASTLE_BQ = 8;
const SQ = { a1: 0, b1: 1, c1: 2, d1: 3, e1: 4, f1: 5, g1: 6, h1: 7, a8: 112, b8: 113, c8: 114, d8: 115, e8: 116, f8: 117, g8: 118, h8: 119 };

const CASTLE_MASK = new Uint8Array(128).fill(15);
CASTLE_MASK[SQ.e1] = 15 & ~(CASTLE_WK | CASTLE_WQ);
CASTLE_MASK[SQ.h1] = 15 & ~CASTLE_WK;
CASTLE_MASK[SQ.a1] = 15 & ~CASTLE_WQ;
CASTLE_MASK[SQ.e8] = 15 & ~(CASTLE_BK | CASTLE_BQ);
CASTLE_MASK[SQ.h8] = 15 & ~CASTLE_BK;
CASTLE_MASK[SQ.a8] = 15 & ~CASTLE_BQ;

// ---- Zobrist keys (two 32-bit halves; deterministic xorshift PRNG) ----
let seed = 0x9e3779b9 | 0;
function rnd32() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; }
const Z_PIECE_LO = new Int32Array(16 * 128), Z_PIECE_HI = new Int32Array(16 * 128);
for (let i = 0; i < 16 * 128; i++) { Z_PIECE_LO[i] = rnd32(); Z_PIECE_HI[i] = rnd32(); }
const Z_CASTLE_LO = new Int32Array(16), Z_CASTLE_HI = new Int32Array(16);
for (let i = 0; i < 16; i++) { Z_CASTLE_LO[i] = rnd32(); Z_CASTLE_HI[i] = rnd32(); }
const Z_EP_LO = new Int32Array(8), Z_EP_HI = new Int32Array(8);
for (let i = 0; i < 8; i++) { Z_EP_LO[i] = rnd32(); Z_EP_HI[i] = rnd32(); }
const Z_SIDE_LO = rnd32(), Z_SIDE_HI = rnd32();

export const sqName = (sq: number) => 'abcdefgh'[sq & 7] + String((sq >> 4) + 1);
export const sqFromName = (s: string) => (s.charCodeAt(1) - 49) * 16 + (s.charCodeAt(0) - 97);

const PIECE_CHARS = ' pnbrqk';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export class Position {
  board = new Int8Array(128);
  side = WHITE;
  castling = 0;
  ep = -1;
  halfmove = 0;
  fullmove = 1;
  kings = [0, 0];
  hlo = 0;
  hhi = 0;
  /** Undo stack: 6 ints per ply (captured, castling, ep, halfmove, hlo, hhi). */
  private undo: number[] = [];
  /** Hash (low half) of every earlier position, for repetition detection. */
  hist: number[] = [];

  constructor(fen: string = START_FEN) { this.load(fen); }

  load(fen: string) {
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4) throw new Error(`Invalid FEN: ${fen}`);
    this.board.fill(0);
    const rows = parts[0].split('/');
    if (rows.length !== 8) throw new Error(`Invalid FEN board: ${fen}`);
    const kingsSeen = [0, 0];
    for (let r = 0; r < 8; r++) {
      let file = 0;
      for (const ch of rows[r]) {
        if (ch >= '1' && ch <= '8') { file += Number(ch); continue; }
        const lower = ch.toLowerCase();
        const type = PIECE_CHARS.indexOf(lower);
        if (type <= 0 || file > 7) throw new Error(`Invalid FEN piece: ${fen}`);
        const color = ch === lower ? BLACK : WHITE;
        const sq = (7 - r) * 16 + file;
        this.board[sq] = type | (color << 3);
        if (type === KING) { this.kings[color] = sq; kingsSeen[color]++; }
        file++;
      }
      if (file !== 8) throw new Error(`Invalid FEN rank: ${fen}`);
    }
    if (kingsSeen[0] !== 1 || kingsSeen[1] !== 1) throw new Error(`FEN needs exactly one king per side: ${fen}`);
    this.side = parts[1] === 'b' ? BLACK : WHITE;
    this.castling = 0;
    if (parts[2] !== '-') for (const c of parts[2]) {
      if (c === 'K') this.castling |= CASTLE_WK; else if (c === 'Q') this.castling |= CASTLE_WQ;
      else if (c === 'k') this.castling |= CASTLE_BK; else if (c === 'q') this.castling |= CASTLE_BQ;
    }
    // Drop castling rights that the board contradicts.
    if (this.board[SQ.e1] !== KING) this.castling &= ~(CASTLE_WK | CASTLE_WQ);
    if (this.board[SQ.h1] !== ROOK) this.castling &= ~CASTLE_WK;
    if (this.board[SQ.a1] !== ROOK) this.castling &= ~CASTLE_WQ;
    if (this.board[SQ.e8] !== (KING | 8)) this.castling &= ~(CASTLE_BK | CASTLE_BQ);
    if (this.board[SQ.h8] !== (ROOK | 8)) this.castling &= ~CASTLE_BK;
    if (this.board[SQ.a8] !== (ROOK | 8)) this.castling &= ~CASTLE_BQ;
    this.ep = parts[3] !== '-' && /^[a-h][36]$/.test(parts[3]) ? sqFromName(parts[3]) : -1;
    this.halfmove = parts[4] ? Number(parts[4]) || 0 : 0;
    this.fullmove = parts[5] ? Number(parts[5]) || 1 : 1;
    this.undo = []; this.hist = [];
    this.computeHash();
  }

  computeHash() {
    let lo = 0, hi = 0;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = this.board[sq];
      if (p) { lo ^= Z_PIECE_LO[p * 128 + sq]; hi ^= Z_PIECE_HI[p * 128 + sq]; }
    }
    lo ^= Z_CASTLE_LO[this.castling]; hi ^= Z_CASTLE_HI[this.castling];
    if (this.ep !== -1) { lo ^= Z_EP_LO[this.ep & 7]; hi ^= Z_EP_HI[this.ep & 7]; }
    if (this.side === BLACK) { lo ^= Z_SIDE_LO; hi ^= Z_SIDE_HI; }
    this.hlo = lo; this.hhi = hi;
  }

  fen(): string {
    let s = '';
    for (let r = 7; r >= 0; r--) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = this.board[r * 16 + f];
        if (!p) { empty++; continue; }
        if (empty) { s += empty; empty = 0; }
        const c = PIECE_CHARS[p & 7];
        s += p & 8 ? c : c.toUpperCase();
      }
      if (empty) s += empty;
      if (r) s += '/';
    }
    let cs = '';
    if (this.castling & CASTLE_WK) cs += 'K';
    if (this.castling & CASTLE_WQ) cs += 'Q';
    if (this.castling & CASTLE_BK) cs += 'k';
    if (this.castling & CASTLE_BQ) cs += 'q';
    return `${s} ${this.side ? 'b' : 'w'} ${cs || '-'} ${this.ep === -1 ? '-' : sqName(this.ep)} ${this.halfmove} ${this.fullmove}`;
  }

  /** Is `sq` attacked by any piece of color `by`? */
  attacked(sq: number, by: number): boolean {
    const b = this.board, c = by << 3;
    // pawns
    if (by === WHITE) {
      let t = sq - 15; if (!(t & 0x88) && b[t] === PAWN) return true;
      t = sq - 17; if (!(t & 0x88) && b[t] === PAWN) return true;
    } else {
      let t = sq + 15; if (!(t & 0x88) && b[t] === (PAWN | 8)) return true;
      t = sq + 17; if (!(t & 0x88) && b[t] === (PAWN | 8)) return true;
    }
    const kn = KNIGHT | c, kg = KING | c;
    for (let i = 0; i < 8; i++) {
      let t = sq + KNIGHT_OFFS[i]; if (!(t & 0x88) && b[t] === kn) return true;
      t = sq + KING_OFFS[i]; if (!(t & 0x88) && b[t] === kg) return true;
    }
    const bi = BISHOP | c, ro = ROOK | c, qu = QUEEN | c;
    for (let i = 0; i < 4; i++) {
      let d = BISHOP_DIRS[i], t = sq + d;
      while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === bi || p === qu) return true; break; } t += d; }
      d = ROOK_DIRS[i]; t = sq + d;
      while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === ro || p === qu) return true; break; } t += d; }
    }
    return false;
  }

  inCheck(): boolean { return this.attacked(this.kings[this.side], this.side ^ 1); }

  /** Pseudo-legal moves appended to `out`. capturesOnly also includes queen promotions. */
  genPseudo(out: number[], capturesOnly = false): number[] {
    const b = this.board, us = this.side, them = us ^ 1;
    for (let from = 0; from < 128; from++) {
      if (from & 0x88) { from += 7; continue; }
      const p = b[from];
      if (!p || (p >> 3) !== us) continue;
      const type = p & 7;
      if (type === PAWN) {
        const fwd = us === WHITE ? 16 : -16;
        const rank = from >> 4;
        const promoRank = us === WHITE ? 6 : 1;
        const startRank = us === WHITE ? 1 : 6;
        const to = from + fwd;
        if (!(to & 0x88) && !b[to]) {
          if (rank === promoRank) {
            out.push(mk(from, to, QUEEN, 0));
            if (!capturesOnly) { out.push(mk(from, to, KNIGHT, 0), mk(from, to, ROOK, 0), mk(from, to, BISHOP, 0)); }
          } else if (!capturesOnly) {
            out.push(mk(from, to, 0, 0));
            if (rank === startRank && !b[to + fwd]) out.push(mk(from, to + fwd, 0, F_DOUBLE));
          }
        }
        for (const side of [-1, 1]) {
          const t = to + side;
          if (t & 0x88) continue;
          const q = b[t];
          if (q && (q >> 3) === them) {
            if (rank === promoRank) {
              out.push(mk(from, t, QUEEN, F_CAPTURE));
              if (!capturesOnly) out.push(mk(from, t, KNIGHT, F_CAPTURE), mk(from, t, ROOK, F_CAPTURE), mk(from, t, BISHOP, F_CAPTURE));
            } else out.push(mk(from, t, 0, F_CAPTURE));
          } else if (t === this.ep) out.push(mk(from, t, 0, F_CAPTURE | F_EP));
        }
      } else if (type === KNIGHT || type === KING) {
        const offs = type === KNIGHT ? KNIGHT_OFFS : KING_OFFS;
        for (let i = 0; i < 8; i++) {
          const t = from + offs[i];
          if (t & 0x88) continue;
          const q = b[t];
          if (!q) { if (!capturesOnly) out.push(mk(from, t, 0, 0)); }
          else if ((q >> 3) === them) out.push(mk(from, t, 0, F_CAPTURE));
        }
        if (type === KING && !capturesOnly) this.genCastles(out, from);
      } else {
        const dirs = type === BISHOP ? BISHOP_DIRS : type === ROOK ? ROOK_DIRS : KING_OFFS;
        for (let i = 0; i < dirs.length; i++) {
          const d = dirs[i];
          let t = from + d;
          while (!(t & 0x88)) {
            const q = b[t];
            if (!q) { if (!capturesOnly) out.push(mk(from, t, 0, 0)); }
            else { if ((q >> 3) === them) out.push(mk(from, t, 0, F_CAPTURE)); break; }
            t += d;
          }
        }
      }
    }
    return out;
  }

  private genCastles(out: number[], from: number) {
    const b = this.board, us = this.side, them = us ^ 1;
    if (us === WHITE) {
      if (from !== SQ.e1) return;
      if ((this.castling & CASTLE_WK) && !b[SQ.f1] && !b[SQ.g1] && b[SQ.h1] === ROOK &&
        !this.attacked(SQ.e1, them) && !this.attacked(SQ.f1, them) && !this.attacked(SQ.g1, them)) out.push(mk(SQ.e1, SQ.g1, 0, F_CASTLE));
      if ((this.castling & CASTLE_WQ) && !b[SQ.d1] && !b[SQ.c1] && !b[SQ.b1] && b[SQ.a1] === ROOK &&
        !this.attacked(SQ.e1, them) && !this.attacked(SQ.d1, them) && !this.attacked(SQ.c1, them)) out.push(mk(SQ.e1, SQ.c1, 0, F_CASTLE));
    } else {
      if (from !== SQ.e8) return;
      if ((this.castling & CASTLE_BK) && !b[SQ.f8] && !b[SQ.g8] && b[SQ.h8] === (ROOK | 8) &&
        !this.attacked(SQ.e8, them) && !this.attacked(SQ.f8, them) && !this.attacked(SQ.g8, them)) out.push(mk(SQ.e8, SQ.g8, 0, F_CASTLE));
      if ((this.castling & CASTLE_BQ) && !b[SQ.d8] && !b[SQ.c8] && !b[SQ.b8] && b[SQ.a8] === (ROOK | 8) &&
        !this.attacked(SQ.e8, them) && !this.attacked(SQ.d8, them) && !this.attacked(SQ.c8, them)) out.push(mk(SQ.e8, SQ.c8, 0, F_CASTLE));
    }
  }

  private xorPiece(p: number, sq: number) { this.hlo ^= Z_PIECE_LO[p * 128 + sq]; this.hhi ^= Z_PIECE_HI[p * 128 + sq]; }

  /** Make a pseudo-legal move. Returns false (and leaves the position unchanged) if it is illegal. */
  make(m: number): boolean {
    const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flags = m >>> 17;
    const b = this.board, us = this.side, them = us ^ 1;
    const piece = b[from];
    let captured = b[to];
    this.undo.push(captured, this.castling, this.ep, this.halfmove, this.hlo, this.hhi);
    this.hist.push(this.hlo);
    if (this.ep !== -1) { this.hlo ^= Z_EP_LO[this.ep & 7]; this.hhi ^= Z_EP_HI[this.ep & 7]; }
    this.hlo ^= Z_CASTLE_LO[this.castling]; this.hhi ^= Z_CASTLE_HI[this.castling];

    this.xorPiece(piece, from); b[from] = 0;
    if (flags & F_EP) {
      const capSq = to + (us === WHITE ? -16 : 16);
      captured = b[capSq]; this.xorPiece(captured, capSq); b[capSq] = 0;
    } else if (captured) this.xorPiece(captured, to);
    const placed = promo ? (promo | (us << 3)) : piece;
    b[to] = placed; this.xorPiece(placed, to);
    if (flags & F_CASTLE) {
      let rf: number, rt: number;
      if (to > from) { rf = to + 1; rt = to - 1; } else { rf = to - 2; rt = to + 1; }
      const rook = b[rf]; this.xorPiece(rook, rf); b[rf] = 0; b[rt] = rook; this.xorPiece(rook, rt);
    }
    if ((piece & 7) === KING) this.kings[us] = to;
    this.castling &= CASTLE_MASK[from] & CASTLE_MASK[to];
    this.hlo ^= Z_CASTLE_LO[this.castling]; this.hhi ^= Z_CASTLE_HI[this.castling];
    this.ep = flags & F_DOUBLE ? (from + to) >> 1 : -1;
    if (this.ep !== -1) { this.hlo ^= Z_EP_LO[this.ep & 7]; this.hhi ^= Z_EP_HI[this.ep & 7]; }
    this.halfmove = (piece & 7) === PAWN || captured ? 0 : this.halfmove + 1;
    if (us === BLACK) this.fullmove++;
    this.side = them; this.hlo ^= Z_SIDE_LO; this.hhi ^= Z_SIDE_HI;
    if (this.attacked(this.kings[us], them)) { this.unmake(m); return false; }
    return true;
  }

  unmake(m: number) {
    const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flags = m >>> 17;
    const b = this.board;
    this.side ^= 1;
    const us = this.side;
    const u = this.undo;
    this.hhi = u.pop()!; this.hlo = u.pop()!; this.halfmove = u.pop()!; this.ep = u.pop()!; this.castling = u.pop()!;
    const captured = u.pop()!;
    this.hist.pop();
    const piece = promo ? (PAWN | (us << 3)) : b[to];
    b[from] = piece; b[to] = captured;
    if (flags & F_EP) b[to + (us === WHITE ? -16 : 16)] = PAWN | ((us ^ 1) << 3);
    if (flags & F_CASTLE) {
      let rf: number, rt: number;
      if (to > from) { rf = to + 1; rt = to - 1; } else { rf = to - 2; rt = to + 1; }
      b[rf] = b[rt]; b[rt] = 0;
    }
    if ((piece & 7) === KING) this.kings[us] = from;
    if (us === BLACK) this.fullmove--;
  }

  makeNull() {
    this.undo.push(0, this.castling, this.ep, this.halfmove, this.hlo, this.hhi);
    this.hist.push(this.hlo);
    if (this.ep !== -1) { this.hlo ^= Z_EP_LO[this.ep & 7]; this.hhi ^= Z_EP_HI[this.ep & 7]; this.ep = -1; }
    this.halfmove = 0; // repetition window does not cross a null move
    this.side ^= 1; this.hlo ^= Z_SIDE_LO; this.hhi ^= Z_SIDE_HI;
  }

  unmakeNull() {
    this.side ^= 1;
    const u = this.undo;
    this.hhi = u.pop()!; this.hlo = u.pop()!; this.halfmove = u.pop()!; this.ep = u.pop()!; this.castling = u.pop()!; u.pop();
    this.hist.pop();
  }

  /** True if the current position occurred before within the reversible-move window. */
  isRepetition(): boolean {
    const h = this.hist, n = h.length, lim = Math.max(0, n - this.halfmove);
    for (let i = n - 2; i >= lim; i -= 2) if (h[i] === this.hlo) return true;
    return false;
  }

  legalMoves(): number[] {
    const out: number[] = [];
    for (const m of this.genPseudo([])) if (this.make(m)) { this.unmake(m); out.push(m); }
    return out;
  }

  hasLegalMove(): boolean {
    for (const m of this.genPseudo([])) if (this.make(m)) { this.unmake(m); return true; }
    return false;
  }

  /** Only kings, or king + a single minor piece on both sides (no pawns). */
  insufficientMaterial(): boolean {
    let minors = 0;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const t = this.board[sq] & 7;
      if (!t || t === KING) continue;
      if (t === KNIGHT || t === BISHOP) { if (++minors > 1) return false; } else return false;
    }
    return true;
  }

  perft(depth: number): number {
    if (depth === 0) return 1;
    let n = 0;
    const moves = this.genPseudo([]);
    for (const m of moves) {
      if (!this.make(m)) continue;
      n += depth === 1 ? 1 : this.perft(depth - 1);
      this.unmake(m);
    }
    return n;
  }
}

export function moveToUci(m: number): string {
  const promo = movePromo(m);
  return sqName(moveFrom(m)) + sqName(moveTo(m)) + (promo ? ' pnbrqk'[promo] : '');
}

/** Find the legal move matching a UCI string, or 0 if none. */
export function parseUci(pos: Position, uci: string): number {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return 0;
  const from = sqFromName(uci.slice(0, 2)), to = sqFromName(uci.slice(2, 4));
  const promo = uci[4] ? ' pnbrqk'.indexOf(uci[4]) : 0;
  for (const m of pos.legalMoves()) if (moveFrom(m) === from && moveTo(m) === to && movePromo(m) === promo) return m;
  return 0;
}
