import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Client, startServer } from './helpers.ts';
import type { TestServer } from './helpers.ts';
import { hashPassword, verifyPassword } from '../src/auth.ts';

let s: TestServer;
before(async () => { s = await startServer(); });
after(async () => { await s.stop(); });

test('password hashing round-trip', async () => {
  const h = await hashPassword('correct horse');
  assert.match(h, /^scrypt\$/);
  assert.equal(await verifyPassword('correct horse', h), true);
  assert.equal(await verifyPassword('wrong horse', h), false);
});

test('guest account, register keeps progress, logout, login', async () => {
  const c = new Client(s.base);
  const me = await c.get('/api/me');
  assert.equal(me.status, 200);
  assert.ok(c.cookie, 'session cookie set');
  const setCookie = me.headers.getSetCookie().join(';');
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.equal(me.body.profile.username, null);
  const guestId = me.body.profile.userId;

  // same cookie -> same account
  assert.equal((await c.get('/api/me')).body.profile.userId, guestId);

  // some progress as guest
  const p = await c.patch('/api/profile', { startingLevel: 'club', onboarded: true, displayName: 'Tester' });
  assert.equal(p.status, 200);
  assert.equal(p.body.profile.startingLevel, 'club');
  assert.equal((await c.patch('/api/profile', { minutesPerDay: -3 })).status, 400);
  const ev = await c.post('/api/events', { events: [{ type: 'drill', drill: 'coordinate-drill', skillIds: ['rules.board'], score: 1, durationSec: 120, at: new Date().toISOString() }] });
  assert.equal(ev.status, 200);

  // register upgrades the same account
  assert.equal((await c.post('/api/auth/register', { username: 'ab', password: 'longenough' })).status, 400);
  assert.equal((await c.post('/api/auth/register', { username: 'alice', password: 'short' })).status, 400);
  const reg = await c.post('/api/auth/register', { username: 'alice', password: 'hunter2hunter2' });
  assert.equal(reg.status, 200, JSON.stringify(reg.body));
  assert.equal(reg.body.profile.userId, guestId);
  assert.equal(reg.body.profile.username, 'alice');
  assert.equal(reg.body.profile.onboarded, true);

  // username uniqueness (case-insensitive)
  const other = new Client(s.base);
  await other.get('/api/me');
  assert.equal((await other.post('/api/auth/register', { username: 'ALICE', password: 'whatever123' })).status, 409);

  // logout -> next /api/me is a new guest
  const out = await c.post('/api/auth/logout');
  assert.equal(out.status, 204);
  const me2 = await c.get('/api/me');
  assert.notEqual(me2.body.profile.userId, guestId);
  assert.equal(me2.body.profile.username, null);

  // login returns to the registered account with progress
  assert.equal((await c.post('/api/auth/login', { username: 'alice', password: 'nope-nope' })).status, 401);
  assert.equal((await c.post('/api/auth/login', { username: 'nobody', password: 'nope-nope' })).status, 401);
  const li = await c.post('/api/auth/login', { username: 'Alice', password: 'hunter2hunter2' });
  assert.equal(li.status, 200);
  assert.equal(li.body.profile.userId, guestId);
  const prog = await c.get('/api/progress');
  assert.equal(prog.body.skills['rules.board'].attempts, 1);
});

test('auth endpoints are rate limited per IP', async () => {
  const c = new Client(s.base);
  let limited = false;
  for (let i = 0; i < 30 && !limited; i++) {
    const r = await c.post('/api/auth/login', { username: 'x', password: 'y' });
    if (r.status === 429) limited = true;
  }
  assert.equal(limited, true);
});
