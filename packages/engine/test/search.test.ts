import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Position, parseUci, moveToUci } from '../src/position.ts';
import { Searcher, MATE } from '../src/search.ts';
import { grimBestMove, grimSearch } from '../src/bot.ts';

function isMate(pos: Position) { return pos.inCheck() && !pos.hasLegalMove(); }

/** After `uci`, does every reply allow an immediate mate? */
function forcesMateIn2(fen: string, uci: string): boolean {
  const pos = new Position(fen);
  const m = parseUci(pos, uci);
  if (!m) return false;
  pos.make(m);
  if (isMate(pos)) return true;
  const replies = pos.legalMoves();
  if (!replies.length) return false; // stalemate
  return replies.every((r) => {
    pos.make(r);
    const ok = pos.legalMoves().some((x) => { pos.make(x); const mate = isMate(pos); pos.unmake(x); return mate; });
    pos.unmake(r);
    return ok;
  });
}

const MATE_IN_1 = [
  { fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', best: ['d1d8'] },                       // back-rank
  { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', best: ['h5f7'] }, // scholar's mate
  { fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2', best: ['d8h4'] },       // fool's mate
];

const MATE_IN_2 = [
  '7k/8/8/8/8/8/R7/1R4K1 w - - 0 1',                                         // rook roller
  'r2qkb1r/pp2nppp/3p4/2pNN1B1/2BnP3/3P4/PPP2PPP/R2bK2R w KQkq - 1 1',           // Nf6+ gxf6 Bxf7#
];

test('full-strength search finds mate in 1', () => {
  for (const c of MATE_IN_1) {
    const r = grimSearch(c.fen, { timeMs: 2000 });
    assert.ok(c.best.includes(r.uci!), `${c.fen}: got ${r.uci}`);
    assert.equal(r.score, MATE - 1);
  }
});

test('full-strength search finds mate in 2', () => {
  for (const fen of MATE_IN_2) {
    const r = grimSearch(fen, { timeMs: 3000 });
    assert.ok(forcesMateIn2(fen, r.uci!), `${fen}: ${r.uci} does not force mate in 2 (score ${r.score})`);
    assert.ok(r.score >= MATE - 3, `${fen}: score ${r.score} should report mate`);
  }
});

test('finds a hanging queen and avoids losing its own', () => {
  // White can win the undefended queen on d5 with the knight.
  const r = grimSearch('4k3/8/8/3q4/8/4N3/8/4K3 w - - 0 1', { timeMs: 1000 });
  assert.equal(r.uci, 'e3d5');
});

test('returns null when there are no legal moves', () => {
  assert.equal(grimBestMove('7k/5QQ1/8/8/8/8/8/K7 b - - 0 1'), null); // checkmated
  assert.equal(grimBestMove('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'), null);  // stalemate
});

test('every level returns legal moves quickly', () => {
  const fens = [
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
    '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
  ];
  for (let level = 1; level <= 8; level++) {
    for (const fen of fens) {
      const t = Date.now();
      const uci = grimBestMove(fen, { level, timeMs: 400 });
      assert.ok(uci && parseUci(new Position(fen), uci), `level ${level} illegal ${uci}`);
      assert.ok(Date.now() - t < 2500, `level ${level} too slow`);
    }
  }
});

test('weak levels blunder material much more often than strong levels', () => {
  // Black queen attacked by a knight: only a queen move avoids losing it.
  const fen = 'rnb1kbnr/pppp1ppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR b KQkq - 0 3';
  let seed = 42;
  const random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
  const hangs = (level: number) => {
    let n = 0;
    for (let i = 0; i < 40; i++) {
      const uci = grimBestMove(fen, { level, timeMs: 300, random })!;
      if (!uci.startsWith('d5')) n++;
    }
    return n;
  };
  const weak = hangs(1), strong = hangs(7);
  assert.ok(weak > strong + 5, `level 1 left the queen ${weak}/40 times, level 7 ${strong}/40`);
  assert.ok(strong <= 4, `level 7 left the queen en prise ${strong}/40 times`);
});

test('principal variation is legal', () => {
  const pos = new Position('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
  const r = new Searcher(pos).search({ maxDepth: 5 });
  assert.ok(r.pv.length >= 1);
  const p = new Position(pos.fen());
  for (const m of r.pv) assert.ok(parseUci(p, moveToUci(m)) && p.make(m));
});
