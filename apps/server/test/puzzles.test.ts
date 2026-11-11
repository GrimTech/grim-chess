import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Client, startServer } from './helpers.ts';
import type { TestServer } from './helpers.ts';

let s: TestServer;
before(async () => { s = await startServer(); });
after(async () => { await s.stop(); });

test('puzzles are imported with a themes table', async () => {
  const c = new Client(s.base);
  const info = (await c.get('/api/server-info')).body;
  assert.equal(info.puzzleCount, 3000);
  assert.equal(info.mode, 'dev');
  const themes = (await c.get('/api/puzzles/themes')).body;
  assert.ok(themes.length > 10);
  assert.ok(themes[0].count >= themes[1].count);
});

test('adaptive next: near the seeded rating, unseen first', async () => {
  const c = new Client(s.base);
  await c.get('/api/me');
  await c.patch('/api/profile', { startingLevel: 'club' }); // 1400
  const seen = new Set<string>();
  for (let i = 0; i < 5; i++) {
    const target = (await c.get('/api/me')).body.ratings.puzzle?.rating ?? 1400;
    const r = await c.get('/api/puzzles/next');
    assert.equal(r.status, 200);
    const p = r.body;
    assert.ok(Math.abs(p.rating - target) <= 151, `rating ${p.rating} within ±150 of ${target}`);
    assert.ok(Array.isArray(p.moves) && p.moves.length >= 2);
    assert.ok(!seen.has(p.id), 'unseen puzzle served');
    seen.add(p.id);
    await c.post('/api/events', { events: [{ type: 'puzzle', puzzleId: p.id, puzzleRating: p.rating, themes: p.themes, solved: false, firstTry: false, durationSec: 30, at: new Date().toISOString() }] });
  }
});

test('theme, set, by id, review and woodpecker modes', async () => {
  const c = new Client(s.base);
  await c.get('/api/me');
  const fork = (await c.get('/api/puzzles/next?mode=theme&themes=fork')).body;
  assert.ok(fork.themes.includes('fork'));
  assert.equal((await c.get('/api/puzzles/next?mode=theme')).status, 400);
  const set = (await c.get('/api/puzzles/set?count=10&min=1000&max=1500')).body;
  assert.equal(set.length, 10);
  assert.ok(set.every((p: any) => p.rating >= 1000 && p.rating <= 1500));
  assert.equal((await c.get(`/api/puzzles/${set[0].id}`)).body.id, set[0].id);
  assert.equal((await c.get('/api/puzzles/nope!')).status, 404);
  assert.equal((await c.get('/api/puzzles/next?mode=review')).status, 404, 'nothing due yet');

  // review: make a puzzle card due now
  const uid = (await c.get('/api/me')).body.profile.userId;
  await c.post('/api/events', { events: [{ type: 'puzzle', puzzleId: set[0].id, puzzleRating: set[0].rating, themes: set[0].themes, solved: false, firstTry: false, durationSec: 30, at: new Date().toISOString() }] });
  s.app.db.prepare("UPDATE srs_cards SET due = '2000-01-01T00:00:00.000Z' WHERE user_id = ?").run(uid);
  assert.equal((await c.get('/api/puzzles/next?mode=review')).body.id, set[0].id);

  // woodpecker: fixed set, advances after each solve, same first puzzle across calls
  const w1 = (await c.get('/api/puzzles/next?mode=woodpecker')).body;
  assert.equal((await c.get('/api/puzzles/next?mode=woodpecker')).body.id, w1.id);
  await c.post('/api/events', { events: [{ type: 'puzzle', puzzleId: w1.id, puzzleRating: w1.rating, themes: w1.themes, solved: true, firstTry: true, durationSec: 10, at: new Date().toISOString() }] });
  const w2 = (await c.get('/api/puzzles/next?mode=woodpecker')).body;
  assert.notEqual(w2.id, w1.id);
});

test('curriculum endpoints tolerate missing content; openings parsed', async () => {
  const c = new Client(s.base);
  assert.equal((await c.get('/api/curriculum/skills')).status, 200);
  assert.ok(Array.isArray((await c.get('/api/curriculum/lessons')).body));
  assert.equal((await c.get('/api/curriculum/lessons/does-not-exist')).status, 404);
  const op = (await c.get('/api/curriculum/openings')).body;
  assert.ok(op.length > 1000);
  const italian = op.find((o: any) => o.name === 'Italian Game');
  assert.ok(italian);
  assert.deepEqual(italian.uci.slice(0, 2), ['e2e4', 'e7e5']);
  assert.equal(italian.family, 'Italian Game');
  assert.ok(Array.isArray((await c.get('/api/curriculum/games?limit=5')).body));
});

test('knowledge base: index, doc, traversal blocked, audit', async () => {
  const c = new Client(s.base);
  const idx = (await c.get('/api/kb')).body;
  assert.ok(idx.length > 0);
  const tactics = idx.find((d: any) => d.path === '03-chess-knowledge/tactics.md');
  assert.ok(tactics);
  assert.equal(tactics.section, '03-chess-knowledge');
  const doc = (await c.get('/api/kb/doc?path=03-chess-knowledge/tactics.md')).body;
  assert.ok(doc.markdown.length > 100);
  assert.ok(!doc.markdown.startsWith('---'));
  assert.ok(Array.isArray(doc.frontmatter.sources));
  for (const bad of ['../package.json', '..%2F..%2Fpackage.json', '/etc/passwd', '03-chess-knowledge/../../package.json', 'C:\\Windows\\win.ini']) {
    const r = await c.get(`/api/kb/doc?path=${encodeURIComponent(bad)}`);
    assert.ok(r.status === 400 || r.status === 404, `${bad} -> ${r.status}`);
  }
  const audit = (await c.get('/api/kb/audit')).body;
  assert.ok(audit.kb.files > 0);
  assert.ok(audit.kb.citedSources > 0);
  assert.ok(Array.isArray(audit.coverage.cells));
  assert.equal(audit.puzzles.total, 3000);
});

test('healthz, security headers, 404 json', async () => {
  const res = await fetch(s.base + '/healthz');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-security-policy')!, /wasm-unsafe-eval/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  const nf = await fetch(s.base + '/api/nope');
  assert.equal(nf.status, 404);
  assert.equal(((await nf.json()) as { error: string }).error, "Not found");
});

test('static: SPA fallback for dotted routes, 404 for missing assets, caching', async () => {
  const page = await fetch(s.base + '/learn/lesson/adult.s1.rook');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type')!, /text\/html/);
  assert.equal((await fetch(s.base + '/kb/03-chess-knowledge/tactics.md')).status, 200);
  assert.equal((await fetch(s.base + '/assets/missing-abc.js')).status, 404);
  assert.equal((await fetch(s.base + '/missing.wasm')).status, 404);
  const js = await fetch(s.base + '/assets/app.js');
  assert.equal(js.status, 200);
  assert.match(js.headers.get('cache-control')!, /immutable/);
  assert.match(js.headers.get('content-type')!, /javascript/);
});
