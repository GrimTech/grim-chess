import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Position, START_FEN } from '../src/position.ts';

// Reference node counts from the Chess Programming Wiki "Perft Results" page.
const CASES: { name: string; fen: string; counts: number[] }[] = [
  { name: 'startpos', fen: START_FEN, counts: [20, 400, 8902, 197281] },
  { name: 'kiwipete', fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', counts: [48, 2039, 97862] },
  { name: 'position 3 (en passant / pins)', fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', counts: [14, 191, 2812, 43238] },
  { name: 'position 4 (promotions / castling)', fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', counts: [6, 264, 9467] },
  { name: 'position 5', fen: 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', counts: [44, 1486, 62379] },
  { name: 'position 6', fen: 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', counts: [46, 2079, 89890] },
];

for (const c of CASES) {
  test(`perft ${c.name}`, () => {
    const pos = new Position(c.fen);
    c.counts.forEach((expected, i) => assert.equal(pos.perft(i + 1), expected, `depth ${i + 1}`));
    // make/unmake must restore the position exactly
    assert.equal(pos.fen(), new Position(c.fen).fen());
  });
}

test('startpos depth 3 = 8902 and Kiwipete depth 2 = 2039', () => {
  assert.equal(new Position(START_FEN).perft(3), 8902);
  assert.equal(new Position('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1').perft(2), 2039);
});

test('incremental hash matches recomputed hash', () => {
  const pos = new Position('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
  for (const m of pos.legalMoves()) {
    pos.make(m);
    for (const r of pos.legalMoves()) {
      pos.make(r);
      const lo = pos.hlo, hi = pos.hhi;
      pos.computeHash();
      assert.equal(pos.hlo, lo); assert.equal(pos.hhi, hi);
      pos.unmake(r);
    }
    pos.unmake(m);
  }
});

test('FEN round trip', () => {
  for (const c of CASES) assert.equal(new Position(c.fen).fen(), c.fen);
});
