/// <reference types="vite/client" />
// Lesson loading for the kids track: the server is canonical; the bundled JSON is a fallback so lessons still work
// when the API is unreachable (offline device, dev without the server).
import type { Lesson, LessonIndexEntry } from '@grim/core';
import { api } from '../../lib/api.ts';

const bundled = import.meta.glob('../../../../../content/lessons/kids/*.json', { import: 'default' }) as Record<string, () => Promise<Lesson>>;

async function bundledAll(): Promise<Lesson[]> {
  return Promise.all(Object.values(bundled).map((f) => f()));
}

const toEntry = (l: Lesson): LessonIndexEntry => ({ id: l.id, track: l.track, stage: l.stage, order: l.order, title: l.title, summary: l.summary, skillIds: l.skillIds, estMinutes: l.estMinutes, minAge: l.minAge });

let indexCache: Promise<LessonIndexEntry[]> | null = null;
export function kidsIndex(): Promise<LessonIndexEntry[]> {
  indexCache ??= api.lessons('kids')
    .then((ls) => (ls.length ? ls : Promise.reject(new Error('empty'))))
    .catch(async () => (await bundledAll()).map(toEntry))
    .then((ls) => ls.filter((l) => l.track === 'kids').sort((a, b) => a.order - b.order));
  indexCache.catch(() => { indexCache = null; });
  return indexCache;
}

export async function kidsLesson(id: string): Promise<Lesson> {
  try { return await api.lesson(id); } catch {
    const all = await bundledAll();
    const l = all.find((x) => x.id === id);
    if (!l) throw new Error('Lesson not found');
    return l;
  }
}
