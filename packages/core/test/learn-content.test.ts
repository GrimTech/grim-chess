// Validates the learn feature's bundled chess content (FEN legality, SAN legality, computable answers).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';
import { RULES_ITEMS, ENDGAME_ITEMS, JUDGEMENT_ITEMS } from '../../../apps/web/src/features/learn/assessment-items.ts';
import { THEORY_POSITIONS } from '../../../apps/web/src/features/learn/endgame-positions.ts';

const repertoire = JSON.parse(readFileSync(new URL('../../../apps/web/src/features/learn/default-repertoire.json', import.meta.url), 'utf8')) as { lines: { id: string; pgn: string }[] };
const sanTokens = (pgn: string) => pgn.split(/\s+/).map((t) => t.replace(/^\d+\.(\.\.)?/, '')).filter(Boolean);

test('quiz FENs are legal', () => {
  for (const it of [...RULES_ITEMS, ...ENDGAME_ITEMS]) if (it.fen) assert.doesNotThrow(() => new Chess(it.fen), it.id);
});

test('computable rules answers', () => {
  const mate = RULES_ITEMS.find((i) => i.id === 'r-mate1')!;
  const c = new Chess(mate.fen); c.move('Ra8'); assert.ok(c.isCheckmate());
  for (const s of ['Ra7', 'Kf2', 'Ra6']) { const d = new Chess(mate.fen); d.move(s); assert.ok(!d.isCheckmate(), s); }
  assert.ok(new Chess(RULES_ITEMS.find((i) => i.id === 'r-stalemate')!.fen).isStalemate());
  const ep = new Chess(RULES_ITEMS.find((i) => i.id === 'r-ep')!.fen);
  assert.ok(ep.moves().includes('exf6'));
  assert.ok(!ep.moves().includes('exd6'));
});

test('endgame quiz SAN choices are legal', () => {
  for (const id of ['e-opp', 'e-philidor']) {
    const it = ENDGAME_ITEMS.find((i) => i.id === id)!;
    const legal = new Chess(it.fen).moves();
    for (const ch of it.choices) assert.ok(legal.includes(ch), `${id} ${ch}`);
  }
});

test('judgement items: sequences and candidates are legal', () => {
  for (const it of JUDGEMENT_ITEMS) {
    const c = new Chess();
    for (const s of it.moves.split(' ')) c.move(s);
    const legal = c.moves();
    for (const cand of it.candidates) assert.ok(legal.includes(cand), `${it.id} ${cand}`);
  }
});

test('theory positions are legal, not over, and side to move has moves', () => {
  for (const p of THEORY_POSITIONS) {
    const c = new Chess(p.fen);
    assert.ok(!c.isGameOver(), p.id);
    assert.ok(c.moves().length > 0, p.id);
  }
});

test('default repertoire lines are legal', () => {
  for (const l of repertoire.lines) {
    const c = new Chess();
    for (const s of sanTokens(l.pgn)) assert.doesNotThrow(() => c.move(s), `${l.id} ${s}`);
  }
});

test('skill ids referenced by learn content exist in the skill graph (when present)', () => {
  const f = new URL('../../../knowledge-base/03-chess-knowledge/skill-graph.json', import.meta.url);
  if (!existsSync(f)) return;
  const ids = new Set((JSON.parse(readFileSync(f, 'utf8')) as { skills: { id: string }[] }).skills.map((s) => s.id));
  const refs = [...RULES_ITEMS, ...ENDGAME_ITEMS].map((i) => i.skill).concat(THEORY_POSITIONS.map((p) => p.skill)).filter(Boolean) as string[];
  const missing = refs.filter((r) => !ids.has(r));
  assert.deepEqual(missing, []);
});
