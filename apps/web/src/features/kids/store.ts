// Kids-track local state: per-lesson stars, daily active time, stickers, best mini-game scores and parent settings.
// The server is the source of truth for ratings and totals (TrainingEvents); this device-local store only holds
// what the server API does not expose (stars per lesson, per-day minutes for the goal ring, parent preferences).
import { useSyncExternalStore } from 'react';

export interface LessonRecord { stars: number; bestScore: number; completedAt: string; attempts: number }
export interface KidsSettings {
  dailyGoalMin: number;
  /** read every step aloud automatically (default on for ages under 7) */
  autoRead: boolean | null;
  /** parent opt-in: private-room games with known friends (online play is off by default for under-13s) */
  allowFriendRooms: boolean;
  /** opt-in timers in mini-games (nothing time-pressured below 9 unless opted in) */
  raceMode: boolean;
  /** parent opt-in: open every lesson on the map (for children who already know the basics) */
  unlockAll: boolean;
}
export interface KidsState {
  v: 1;
  lessons: Record<string, LessonRecord>;
  /** seconds of active kids-track time by local date (YYYY-MM-DD) */
  seconds: Record<string, number>;
  stickers: Record<string, string>; // id -> earnedAt
  games: Record<string, { best: number; plays: number; wins: number }>;
  settings: KidsSettings;
}

const KEY = 'grim.kids.v1';
const DEFAULT: KidsState = {
  v: 1, lessons: {}, seconds: {}, stickers: {}, games: {},
  settings: { dailyGoalMin: 0, autoRead: null, allowFriendRooms: false, raceMode: false, unlockAll: false },
};

function load(): KidsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const s = JSON.parse(raw) as KidsState;
    return { ...structuredClone(DEFAULT), ...s, settings: { ...DEFAULT.settings, ...s.settings } };
  } catch { return structuredClone(DEFAULT); }
}

let state: KidsState = typeof window === 'undefined' ? structuredClone(DEFAULT) : load();
const subs = new Set<() => void>();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage may be blocked: keep in memory */ }
  for (const s of subs) s();
}

export function update(fn: (s: KidsState) => void) {
  const next = structuredClone(state);
  fn(next);
  state = next;
  save();
}
export const getKids = () => state;
export function useKids(): KidsState {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => state, () => state);
}

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function addSeconds(sec: number) {
  if (sec <= 0) return;
  update((s) => { const k = today(); s.seconds[k] = (s.seconds[k] ?? 0) + sec; });
}

/** Consecutive active days ending today (or yesterday, so the streak is not "lost" before the child plays today). */
export function streakDays(s: KidsState): number {
  const d = new Date();
  let n = 0;
  if (!(s.seconds[today(d)] > 30)) d.setDate(d.getDate() - 1);
  while ((s.seconds[today(d)] ?? 0) > 30) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function recordLesson(id: string, stars: number, score: number) {
  update((s) => {
    const prev = s.lessons[id];
    s.lessons[id] = {
      stars: Math.max(prev?.stars ?? 0, stars),
      bestScore: Math.max(prev?.bestScore ?? 0, score),
      completedAt: new Date().toISOString(),
      attempts: (prev?.attempts ?? 0) + 1,
    };
  });
}

export function recordGame(game: string, score: number, won: boolean, higherIsBetter = true) {
  update((s) => {
    const g = s.games[game] ?? { best: higherIsBetter ? 0 : Infinity, plays: 0, wins: 0 };
    g.plays++; if (won) g.wins++;
    g.best = higherIsBetter ? Math.max(g.best, score) : Math.min(g.best, score);
    s.games[game] = g;
  });
}

export function award(id: string): boolean {
  if (state.stickers[id]) return false;
  update((s) => { s.stickers[id] = new Date().toISOString(); });
  return true;
}

/** Stars from first-try accuracy (0..1). Finishing always earns at least one star. */
export const starsFor = (firstTryRatio: number) => (firstTryRatio >= 0.9 ? 3 : firstTryRatio >= 0.6 ? 2 : 1);
