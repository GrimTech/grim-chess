/// <reference types="vite/client" />
// Shared helpers for the learn feature (no UI).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { marked } from 'marked';
import type { Lesson, LessonIndexEntry, SkillGraph, TrainingEvent } from '@grim/core';
import { api, type Me, type ProgressSnapshot } from '../../lib/api.ts';

export const nowIso = () => new Date().toISOString();
export const todayStr = () => new Date().toISOString().slice(0, 10);

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fn().then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((e: unknown) => alive && setState({ data: null, error: (e as Error).message ?? String(e), loading: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  const reload = useCallback(() => setN((x) => x + 1), []);
  return { ...state, reload };
}

/** Run a callback after `ms`, cancelled on unmount. */
export function useTimeouts() {
  const ids = useRef<number[]>([]);
  useEffect(() => () => { ids.current.forEach((i) => clearTimeout(i)); }, []);
  return useCallback((f: () => void, ms: number) => { ids.current.push(window.setTimeout(f, ms)); }, []);
}

export function useElapsed(running: boolean, resetKey: unknown) {
  const [sec, setSec] = useState(0);
  const start = useRef(Date.now());
  useEffect(() => { start.current = Date.now(); setSec(0); }, [resetKey]);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSec(Math.floor((Date.now() - start.current) / 1000)), 250);
    return () => clearInterval(id);
  }, [running]);
  return { sec, exact: () => (Date.now() - start.current) / 1000 };
}

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const sideToMove = (fen: string): 'white' | 'black' => (fen.split(' ')[1] === 'b' ? 'black' : 'white');
export const opposite = (c: 'white' | 'black') => (c === 'white' ? 'black' : 'white');

/** Apply a UCI move; returns the new chess instance and SAN, or null if illegal. */
export function applyUci(fen: string, uci: string): { fen: string; san: string; from: string; to: string; chess: Chess } | null {
  try {
    const c = new Chess(fen);
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: (uci[4] as 'q') || undefined });
    return m ? { fen: c.fen(), san: m.san, from: m.from, to: m.to, chess: c } : null;
  } catch { return null; }
}
export function applySan(fen: string, san: string): { fen: string; san: string; from: string; to: string; uci: string } | null {
  try {
    const c = new Chess(fen);
    const m = c.move(san);
    return m ? { fen: c.fen(), san: m.san, from: m.from, to: m.to, uci: m.from + m.to + (m.promotion ?? '') } : null;
  } catch { return null; }
}
export const cleanSan = (s: string) => s.replace(/[+#!?]/g, '').replace(/=/, '');
export const sameSan = (a: string, b: string) => cleanSan(a) === cleanSan(b);

/** Parse "1. e4 e5 2. Nf3" (or a full PGN movetext) into SAN tokens. */
export function sanTokens(pgn: string): string[] {
  return pgn.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/\$\d+/g, ' ')
    .split(/\s+/).map((t) => t.replace(/^\d+\.(\.\.)?/, '')).filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
}

const MATERIAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
/** Material balance from `color`'s point of view. */
export function materialDiff(fen: string, color: 'white' | 'black'): number {
  const board = fen.split(' ')[0];
  let d = 0;
  for (const ch of board) {
    const v = MATERIAL[ch.toLowerCase()];
    if (v === undefined) continue;
    const white = ch === ch.toUpperCase();
    d += (white === (color === 'white') ? 1 : -1) * v;
  }
  return d;
}
export function pieceCount(fen: string, color: 'white' | 'black'): Record<string, number> {
  const out: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  for (const ch of fen.split(' ')[0]) {
    if (!/[a-z]/i.test(ch)) continue;
    if ((ch === ch.toUpperCase()) === (color === 'white')) out[ch.toLowerCase()]++;
  }
  return out;
}

export function md(src: string): string {
  return marked.parse(src ?? '', { async: false, gfm: true, breaks: false }) as string;
}

// ---------- local persistence (per-device conveniences) ----------
export function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
export function lsSet(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }

export const completedLessons = () => new Set(lsGet<string[]>('gc_completed_lessons', []));
export function markLessonCompleted(id: string) {
  const s = completedLessons(); s.add(id); lsSet('gc_completed_lessons', [...s]);
}

// ---------- events ----------
const PENDING = 'gc_pending_events';
/** Post training events; on network failure they are queued locally and retried on the next post. */
export async function postEvents(events: TrainingEvent[], setMe?: (m: Me) => void, me?: Me | null): Promise<ProgressSnapshot | null> {
  const queued = lsGet<TrainingEvent[]>(PENDING, []);
  const all = [...queued, ...events];
  try {
    const snap = await api.postEvents(all.slice(0, 500));
    lsSet(PENDING, all.slice(500));
    if (setMe && me) setMe({ ...me, ratings: snap.ratings, estimate: snap.estimate });
    return snap;
  } catch (e) {
    const status = (e as { status?: number }).status;
    // 4xx = invalid event: drop it rather than retrying forever.
    if (status && status >= 400 && status < 500) lsSet(PENDING, []);
    else lsSet(PENDING, all.slice(-500));
    return null;
  }
}

// ---------- content fallbacks (used when the API is not reachable, e.g. web dev without server) ----------
const graphFiles = import.meta.glob('../../../../../knowledge-base/03-chess-knowledge/skill-graph.json', { import: 'default' });
const lessonFiles = import.meta.glob('../../../../../content/lessons/adult/*.json', { import: 'default' });

let graphCache: Promise<SkillGraph> | null = null;
export function loadSkillGraph(): Promise<SkillGraph> {
  if (!graphCache) {
    graphCache = api.skillGraph().then((g) => {
      if (!g?.skills?.length) throw new Error('empty');
      return g;
    }).catch(async () => {
      const f = Object.values(graphFiles)[0];
      if (f) return (await f()) as SkillGraph;
      return { version: '0', domains: [], stages: [], skills: [] };
    });
    graphCache.catch(() => { graphCache = null; });
  }
  return graphCache;
}

export async function loadLessons(): Promise<LessonIndexEntry[]> {
  try { return await api.lessons('adult'); } catch {
    const all = await Promise.all(Object.values(lessonFiles).map((f) => f() as Promise<Lesson>));
    return all.map((l) => ({ id: l.id, track: l.track, stage: l.stage, order: l.order, title: l.title, summary: l.summary, skillIds: l.skillIds, estMinutes: l.estMinutes }))
      .sort((a, b) => a.stage - b.stage || a.order - b.order);
  }
}
export async function loadLesson(id: string): Promise<Lesson> {
  try { return await api.lesson(id); } catch (e) {
    for (const f of Object.values(lessonFiles)) { const l = (await f()) as Lesson; if (l.id === id) return l; }
    throw e;
  }
}

export async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

export function shuffle<T>(arr: T[], rnd = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
