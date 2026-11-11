// Data access for users, profiles, rating pools, skills and SRS cards.
import { randomUUID } from 'node:crypto';
import { newRating } from '@grim/core';
import type { Profile, RatingPool, RatingState, SkillState, SrsCard } from '@grim/core';
import type { DB } from './db.ts';

export const POOLS: RatingPool[] = ['bot', 'puzzle', 'online', 'assessment'];

/** Starting rating for every pool, seeded from the onboarding self-assessment. */
export const LEVEL_SEED: Record<Profile['startingLevel'], number> = { zero: 400, 'knows-rules': 700, casual: 1000, club: 1400, strong: 1800 };

export interface UserRow { id: string; username: string | null; pass_hash: string | null; profile: string; created_at: string }

export function defaultProfile(userId: string, now = new Date().toISOString()): Profile {
  return {
    userId, username: null, displayName: 'Guest', age: null, track: 'adult', minutesPerDay: 30, daysPerWeek: 5,
    goal: 'club', startingLevel: 'zero', onboarded: false, createdAt: now,
  };
}

export function createUser(db: DB): Profile {
  const id = randomUUID();
  const p = defaultProfile(id);
  db.prepare('INSERT INTO users (id, username, pass_hash, profile, created_at) VALUES (?, NULL, NULL, ?, ?)').run(id, JSON.stringify(p), p.createdAt);
  return p;
}

export function getUserRow(db: DB, id: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}
export function getUserByName(db: DB, username: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username) as UserRow | undefined;
}

export function getProfile(db: DB, userId: string): Profile {
  const row = getUserRow(db, userId);
  if (!row) throw new Error(`no user ${userId}`);
  const p = { ...defaultProfile(userId, row.created_at), ...(JSON.parse(row.profile) as Profile) };
  p.userId = row.id;
  p.username = row.username;
  return p;
}

export function saveProfile(db: DB, p: Profile): void {
  db.prepare('UPDATE users SET profile = ? WHERE id = ?').run(JSON.stringify(p), p.userId);
}

export function displayName(p: Profile): string {
  return p.username ?? (p.displayName && p.displayName !== 'Guest' ? p.displayName : `Guest-${p.userId.slice(0, 4)}`);
}

// ---------- ratings ----------
interface RatingRow { pool: RatingPool; rating: number; rd: number; vol: number; games: number; updated_at: string | null }
const toState = (r: RatingRow): RatingState => ({ rating: r.rating, rd: r.rd, vol: r.vol, games: r.games, ...(r.updated_at ? { updatedAt: r.updated_at } : {}) });

export function getRatings(db: DB, userId: string): Partial<Record<RatingPool, RatingState>> {
  const out: Partial<Record<RatingPool, RatingState>> = {};
  for (const r of db.prepare('SELECT * FROM ratings WHERE user_id = ?').all(userId) as unknown as RatingRow[]) out[r.pool] = toState(r);
  return out;
}

/** The stored rating, or a fresh one seeded from the profile's starting level (not persisted). */
export function getRating(db: DB, userId: string, pool: RatingPool, profile?: Profile): RatingState {
  const r = db.prepare('SELECT * FROM ratings WHERE user_id = ? AND pool = ?').get(userId, pool) as RatingRow | undefined;
  if (r) return toState(r);
  const p = profile ?? getProfile(db, userId);
  return newRating(LEVEL_SEED[p.startingLevel] ?? 1000);
}

export function setRating(db: DB, userId: string, pool: RatingPool, s: RatingState): void {
  db.prepare(`INSERT INTO ratings (user_id, pool, rating, rd, vol, games, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, pool) DO UPDATE SET rating = excluded.rating, rd = excluded.rd, vol = excluded.vol, games = excluded.games, updated_at = excluded.updated_at`)
    .run(userId, pool, s.rating, s.rd, s.vol, s.games, s.updatedAt ?? new Date().toISOString());
}

// ---------- skills ----------
interface SkillRow { skill_id: string; mastery: number; attempts: number; successes: number; last_practiced: string | null; mastered: number }
const toSkill = (r: SkillRow): SkillState => ({
  skillId: r.skill_id, mastery: r.mastery, attempts: r.attempts, successes: r.successes, mastered: !!r.mastered,
  ...(r.last_practiced ? { lastPracticed: r.last_practiced } : {}),
});
export function getSkills(db: DB, userId: string): Record<string, SkillState> {
  const out: Record<string, SkillState> = {};
  for (const r of db.prepare('SELECT * FROM skills WHERE user_id = ?').all(userId) as unknown as SkillRow[]) out[r.skill_id] = toSkill(r);
  return out;
}
export function getSkill(db: DB, userId: string, skillId: string): SkillState | null {
  const r = db.prepare('SELECT * FROM skills WHERE user_id = ? AND skill_id = ?').get(userId, skillId) as SkillRow | undefined;
  return r ? toSkill(r) : null;
}
export function setSkill(db: DB, userId: string, s: SkillState): void {
  db.prepare(`INSERT INTO skills (user_id, skill_id, mastery, attempts, successes, last_practiced, mastered) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, skill_id) DO UPDATE SET mastery = excluded.mastery, attempts = excluded.attempts, successes = excluded.successes,
    last_practiced = excluded.last_practiced, mastered = excluded.mastered`)
    .run(userId, s.skillId, s.mastery, s.attempts, s.successes, s.lastPracticed ?? null, s.mastered ? 1 : 0);
}

// ---------- SRS cards ----------
export function getCard(db: DB, userId: string, cardId: string): SrsCard | null {
  const r = db.prepare('SELECT data FROM srs_cards WHERE user_id = ? AND card_id = ?').get(userId, cardId) as { data: string } | undefined;
  return r ? (JSON.parse(r.data) as SrsCard) : null;
}
export function saveCard(db: DB, userId: string, c: SrsCard): void {
  db.prepare(`INSERT INTO srs_cards (user_id, card_id, kind, due, data) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, card_id) DO UPDATE SET kind = excluded.kind, due = excluded.due, data = excluded.data`)
    .run(userId, c.id, c.kind, c.due, JSON.stringify(c));
}
export function dueCards(db: DB, userId: string, kind?: string, now = new Date(), limit = 200): SrsCard[] {
  const rows = (kind
    ? db.prepare('SELECT data FROM srs_cards WHERE user_id = ? AND kind = ? AND due <= ? ORDER BY due LIMIT ?').all(userId, kind, now.toISOString(), limit)
    : db.prepare('SELECT data FROM srs_cards WHERE user_id = ? AND due <= ? ORDER BY due LIMIT ?').all(userId, now.toISOString(), limit)) as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as SrsCard);
}
