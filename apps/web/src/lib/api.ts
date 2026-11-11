// HTTP client for the Grim Chess server. Contract documented in docs/ARCHITECTURE.md.
// The server owns persistence; the client sends TrainingEvents and reads derived state.
import type {
  DailyPlan, Lesson, LessonIndexEntry, Profile, Puzzle, RatingEstimate, RatingPool, RatingState,
  SkillGraph, SkillState, SrsCard, TrainingEvent,
} from '@grim/core';

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method, credentials: 'include',
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.error ?? msg; } catch { /* ignore */ }
    throw new ApiError(res.status, msg);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

export interface Me {
  profile: Profile;
  ratings: Partial<Record<RatingPool, RatingState>>;
  estimate: RatingEstimate | null;
}
export interface ProgressSnapshot {
  skills: Record<string, SkillState>;
  ratings: Partial<Record<RatingPool, RatingState>>;
  estimate: RatingEstimate | null;
  history: { date: string; estimate: number; puzzle?: number; bot?: number }[];
  totals: { minutes: number; puzzles: number; lessons: number; games: number; streakDays: number };
}
export interface ServerInfo { mode: 'cloud' | 'lan' | 'dev'; version: string; lanUrls: string[]; puzzleCount: number }

export const api = {
  // session: a guest device account is created automatically on first call to me()
  me: () => req<Me>('GET', '/api/me'),
  register: (username: string, password: string) => req<Me>('POST', '/api/auth/register', { username, password }),
  login: (username: string, password: string) => req<Me>('POST', '/api/auth/login', { username, password }),
  logout: () => req<void>('POST', '/api/auth/logout'),
  updateProfile: (patch: Partial<Profile>) => req<Me>('PATCH', '/api/profile', patch),

  serverInfo: () => req<ServerInfo>('GET', '/api/server-info'),

  // curriculum
  skillGraph: () => req<SkillGraph>('GET', '/api/curriculum/skills'),
  lessons: (track?: 'adult' | 'kids') => req<LessonIndexEntry[]>('GET', `/api/curriculum/lessons${track ? `?track=${track}` : ''}`),
  lesson: (id: string) => req<Lesson>('GET', `/api/curriculum/lessons/${encodeURIComponent(id)}`),

  // puzzles
  nextPuzzle: (opts: { themes?: string[]; min?: number; max?: number; mode?: 'adaptive' | 'theme' | 'review' | 'woodpecker' } = {}) => {
    const q = new URLSearchParams();
    if (opts.themes?.length) q.set('themes', opts.themes.join(','));
    if (opts.min) q.set('min', String(opts.min));
    if (opts.max) q.set('max', String(opts.max));
    if (opts.mode) q.set('mode', opts.mode);
    return req<Puzzle>('GET', `/api/puzzles/next?${q}`);
  },
  puzzle: (id: string) => req<Puzzle>('GET', `/api/puzzles/${id}`),
  puzzleSet: (opts: { themes?: string[]; min?: number; max?: number; count: number }) => {
    const q = new URLSearchParams({ count: String(opts.count) });
    if (opts.themes?.length) q.set('themes', opts.themes.join(','));
    if (opts.min) q.set('min', String(opts.min));
    if (opts.max) q.set('max', String(opts.max));
    return req<Puzzle[]>('GET', `/api/puzzles/set?${q}`);
  },
  puzzleThemes: () => req<{ theme: string; count: number }[]>('GET', '/api/puzzles/themes'),

  // progress
  postEvents: (events: TrainingEvent[]) => req<ProgressSnapshot>('POST', '/api/events', { events }),
  progress: () => req<ProgressSnapshot>('GET', '/api/progress'),
  plan: () => req<DailyPlan>('GET', '/api/plan'),
  completePlanBlock: (blockId: string) => req<DailyPlan>('POST', `/api/plan/${encodeURIComponent(blockId)}/done`),
  srsDue: (kind?: SrsCard['kind']) => req<SrsCard[]>('GET', `/api/srs/due${kind ? `?kind=${kind}` : ''}`),
  srsReview: (cardId: string, kind: SrsCard['kind'], grade: 1 | 2 | 3 | 4) => req<SrsCard>('POST', '/api/srs/review', { cardId, kind, grade }),
  games: () => req<{ id: string; at: string; mode: string; result: number; color: string; opponent: string; accuracy?: number; pgn: string }[]>('GET', '/api/games'),

  // knowledge base
  kbIndex: () => req<{ path: string; title: string; summary: string; section: string }[]>('GET', '/api/kb'),
  kbDoc: (path: string) => req<{ path: string; title: string; markdown: string; frontmatter: Record<string, unknown> }>('GET', `/api/kb/doc?path=${encodeURIComponent(path)}`),
  audit: () => req<Record<string, unknown>>('GET', '/api/kb/audit'),
};
