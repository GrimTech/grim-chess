import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Client, startServer } from './helpers.ts';
import type { TestServer } from './helpers.ts';

let s: TestServer;
before(async () => { s = await startServer(); });
after(async () => { await s.stop(); });

const now = () => new Date().toISOString();

test('puzzle events update the Glicko-2 puzzle pool, FSRS cards and history', async () => {
  const c = new Client(s.base);
  await c.get('/api/me');
  await c.patch('/api/profile', { startingLevel: 'casual' }); // seed 1000
  const pz = (await c.get('/api/puzzles/next')).body;
  const ev = { type: 'puzzle', puzzleId: pz.id, puzzleRating: pz.rating, themes: pz.themes, solved: true, firstTry: true, durationSec: 20, at: now() };
  const r = await c.post('/api/events', { events: [ev] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const puzzle = r.body.ratings.puzzle;
  assert.ok(puzzle, 'puzzle pool created');
  assert.ok(puzzle.rating > 1000, `rating went up from the 1000 seed (got ${puzzle.rating})`);
  assert.ok(puzzle.rd < 350);
  assert.equal(puzzle.games, 1);
  assert.equal(r.body.totals.puzzles, 1);
  assert.ok(r.body.history.length >= 1);
  assert.equal(r.body.history.at(-1).puzzle, Math.round(puzzle.rating));

  // retrying the same batch is idempotent
  const again = await c.post('/api/events', { events: [ev] });
  assert.equal(again.body.ratings.puzzle.games, 1);

  // a failure lowers the rating
  const fail = await c.post('/api/events', { events: [{ ...ev, puzzleId: 'zzzzz', solved: false, firstTry: false, at: now() }] });
  assert.ok(fail.body.ratings.puzzle.rating < puzzle.rating);
  assert.equal(s.app.db.prepare("SELECT COUNT(*) AS n FROM srs_cards WHERE kind = 'puzzle'").get()!.n, 2);
});

test('rated bot game updates the bot pool and is stored; online posts are not rated', async () => {
  const c = new Client(s.base);
  await c.get('/api/me');
  const r = await c.post('/api/events', { events: [
    { type: 'game', mode: 'bot', botLevel: 3, opponentRating: 800, result: 1, color: 'white', pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0', rated: true, at: now(), accuracy: 82 },
    { type: 'game', mode: 'online', opponentRating: 2500, result: 1, color: 'black', pgn: '1. f3 e5 2. g4 Qh4# 0-1', rated: true, at: now() },
  ] });
  assert.equal(r.status, 200);
  assert.ok(r.body.ratings.bot.rating > 400);
  assert.equal(r.body.ratings.bot.games, 1);
  assert.equal(r.body.ratings.online, undefined, 'client-posted online games never touch the online pool');
  assert.equal(r.body.totals.games, 2);
  const games = (await c.get('/api/games')).body;
  assert.equal(games.length, 2);
  assert.ok(games.some((g: any) => g.mode === 'bot' && g.accuracy === 82));
});

test('lesson and drill events update skill mastery; mastered after threshold', async () => {
  const c = new Client(s.base);
  await c.get('/api/me');
  let body: any;
  for (let i = 0; i < 6; i++) {
    body = (await c.post('/api/events', { events: [{ type: 'lesson', lessonId: 'adult.s1.test', skillIds: ['rules.rook'], score: 1, durationSec: 60, at: new Date(Date.now() + i).toISOString() }] })).body;
  }
  const sk = body.skills['rules.rook'];
  assert.equal(sk.attempts, 6);
  assert.ok(sk.mastery > 0.85);
  assert.equal(sk.mastered, true);
  assert.ok(body.totals.minutes >= 6);
  assert.equal(body.totals.streakDays, 1);
});

test('invalid events are rejected with 400', async () => {
  const c = new Client(s.base);
  await c.get('/api/me');
  assert.equal((await c.post('/api/events', { events: [{ type: 'puzzle', puzzleId: 'x' }] })).status, 400);
  assert.equal((await c.post('/api/events', { events: [{ type: 'nope', at: now() }] })).status, 400);
  assert.equal((await c.post('/api/events', { events: 'x' })).status, 400);
});

test('srs review endpoint and plan', async () => {
  const c = new Client(s.base);
  await c.get('/api/me');
  const card = await c.post('/api/srs/review', { cardId: 'opening:white:italian:1', kind: 'opening', grade: 3 });
  assert.equal(card.status, 200);
  assert.equal(card.body.reps, 1);
  assert.equal(card.body.state, 'review');
  assert.equal((await c.post('/api/srs/review', { cardId: 'x', kind: 'bad', grade: 3 })).status, 400);
  const plan = await c.get('/api/plan');
  assert.equal(plan.status, 200);
  assert.ok(Array.isArray(plan.body.blocks));
});

test('estimate is the full DetailedEstimate with milestone evidence; standard TC parsing', async () => {
  const { isStandardTc } = await import('../src/training.ts');
  assert.equal(isStandardTc('15+10'), true);
  assert.equal(isStandardTc('900+10'), true);
  assert.equal(isStandardTc('5+3'), false);
  assert.equal(isStandardTc(null), false);
  const c = new Client(s.base);
  await c.get('/api/me');
  await c.patch('/api/profile', { startingLevel: 'club' });
  const me = (await c.get('/api/me')).body;
  assert.equal(typeof me.estimate.se, 'number');
  assert.ok(me.estimate.milestone && Array.isArray(me.estimate.milestone.blockers));
  assert.match(me.estimate.components[0].note, /club/, 'self-reported level is used as the prior');
  const uid = me.profile.userId;
  const ev = s.app.training.milestoneEvidence(uid);
  assert.equal(ev.ratedGames180d, 0);
  assert.deepEqual(ev.previous, []);
  assert.equal(ev.knowledgeGates.GM, false);
});
