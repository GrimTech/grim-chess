// Accounts and sessions. Every device gets a guest account automatically (cookie `gc_session`);
// registering upgrades that same account (progress is kept); login switches the device to another account.
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Config } from './config.ts';
import type { DB } from './db.ts';
import { tx } from './db.ts';
import { HttpError, appendHeader, parseCookies, serializeCookie } from './http.ts';
import type { Ctx } from './http.ts';
import { createUser, getProfile, getUserByName, getUserRow, saveProfile } from './store.ts';

export const COOKIE = 'gc_session';
const MAX_AGE = 400 * 24 * 3600; // browsers cap cookie lifetime at 400 days
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function scryptAsync(password: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, { ...opts, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, SCRYPT.keylen, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length, { N: Number(N), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// A fixed hash so that unknown usernames cost the same time as wrong passwords.
let dummyHash: Promise<string> | null = null;

// ---------- rate limiting (fixed window per key) ----------
export class RateLimiter {
  hits = new Map<string, { n: number; reset: number }>();
  limit: number;
  windowMs: number;
  constructor(limit: number, windowMs: number) { this.limit = limit; this.windowMs = windowMs; }
  take(key: string, now = Date.now()): boolean {
    let h = this.hits.get(key);
    if (!h || h.reset <= now) { h = { n: 0, reset: now + this.windowMs }; this.hits.set(key, h); }
    h.n++;
    if (this.hits.size > 10000) for (const [k, v] of this.hits) if (v.reset <= now) this.hits.delete(k);
    return h.n <= this.limit;
  }
}

export class Auth {
  db: DB;
  cfg: Config;
  authLimiter = new RateLimiter(20, 60_000);
  guestLimiter = new RateLimiter(60, 60_000);
  constructor(db: DB, cfg: Config) { this.db = db; this.cfg = cfg; }

  /** userId for a raw cookie header (used by the WebSocket upgrade too). */
  userFromCookieHeader(header: string | undefined): string | null {
    const token = parseCookies(header)[COOKIE];
    if (!token || token.length > 200) return null;
    const row = this.db.prepare('SELECT user_id FROM sessions WHERE token_hash = ?').get(sha256(token)) as { user_id: string } | undefined;
    return row?.user_id ?? null;
  }

  sessionUser(req: IncomingMessage): string | null {
    return this.userFromCookieHeader(req.headers.cookie);
  }

  createSession(ctx: Ctx, userId: string): void {
    const token = randomBytes(32).toString('base64url');
    const now = new Date().toISOString();
    this.db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, last_seen) VALUES (?, ?, ?, ?)').run(sha256(token), userId, now, now);
    appendHeader(ctx.res, 'Set-Cookie', serializeCookie(COOKIE, token, { maxAge: MAX_AGE, secure: this.secure(ctx) }));
  }

  secure(ctx: Ctx): boolean {
    return this.cfg.secureCookies || (this.cfg.trustProxy && ctx.req.headers['x-forwarded-proto'] === 'https');
  }

  /** Current user, creating a guest device account (and session cookie) when there is none. */
  ensureUser(ctx: Ctx): string {
    const existing = this.sessionUser(ctx.req);
    if (existing && getUserRow(this.db, existing)) return existing;
    if (!this.guestLimiter.take(ctx.ip)) throw new HttpError(429, 'Too many new accounts from this address; try again later');
    const p = tx(this.db, () => createUser(this.db));
    this.createSession(ctx, p.userId);
    return p.userId;
  }

  checkRate(ctx: Ctx): void {
    if (!this.authLimiter.take(ctx.ip)) throw new HttpError(429, 'Too many attempts; wait a minute and try again');
  }

  async register(ctx: Ctx, body: { username?: unknown; password?: unknown }): Promise<string> {
    this.checkRate(ctx);
    const username = validateUsername(body.username);
    const password = validatePassword(body.password);
    const hash = await hashPassword(password);
    const userId = this.ensureUser(ctx);
    return tx(this.db, () => {
      const row = getUserRow(this.db, userId)!;
      if (row.username) throw new HttpError(409, 'This device is already signed in to a registered account; log out first');
      if (getUserByName(this.db, username)) throw new HttpError(409, 'Username is taken');
      this.db.prepare('UPDATE users SET username = ?, pass_hash = ? WHERE id = ?').run(username, hash, userId);
      const p = getProfile(this.db, userId);
      if (!p.displayName || p.displayName === 'Guest') p.displayName = username;
      saveProfile(this.db, p);
      return userId;
    });
  }

  async login(ctx: Ctx, body: { username?: unknown; password?: unknown }): Promise<string> {
    this.checkRate(ctx);
    if (typeof body.username !== 'string' || typeof body.password !== 'string' || body.password.length > 200) throw new HttpError(400, 'username and password are required');
    const row = getUserByName(this.db, body.username.trim());
    dummyHash ??= hashPassword('not-a-real-password');
    const ok = await verifyPassword(body.password, row?.pass_hash ?? (await dummyHash));
    if (!row || !row.pass_hash || !ok) throw new HttpError(401, 'Wrong username or password');
    this.dropSession(ctx);
    this.createSession(ctx, row.id);
    return row.id;
  }

  dropSession(ctx: Ctx): void {
    const token = parseCookies(ctx.req.headers.cookie)[COOKIE];
    if (token) this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  }

  logout(ctx: Ctx): void {
    this.dropSession(ctx);
    appendHeader(ctx.res, 'Set-Cookie', serializeCookie(COOKIE, '', { maxAge: 0, secure: this.secure(ctx) }));
  }
}

function validateUsername(u: unknown): string {
  if (typeof u !== 'string') throw new HttpError(400, 'username is required');
  const s = u.trim();
  if (!/^[A-Za-z0-9_-]{3,24}$/.test(s)) throw new HttpError(400, 'Username must be 3-24 characters: letters, digits, _ or -');
  if (/^guest/i.test(s)) throw new HttpError(400, 'Usernames cannot start with "guest"');
  return s;
}
function validatePassword(p: unknown): string {
  if (typeof p !== 'string' || p.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  if (p.length > 200) throw new HttpError(400, 'Password is too long');
  return p;
}
