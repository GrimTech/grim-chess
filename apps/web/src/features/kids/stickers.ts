// Sticker collection: informational milestones (K6), never bought, never lost, not tied to volume alone.
import { award, getKids } from './store.ts';
import { WORLDS, worldOf } from './worlds.ts';
import type { LessonIndexEntry } from '@grim/core';

export interface Sticker { id: string; name: string; how: string; color: string; icon: 'sprout' | 'castle' | 'mountain' | 'map' | 'trees' | 'house' | 'waves' | 'flame' | 'star' | 'crown' | 'puzzle' | 'swords' | 'footprints' | 'shield' | 'gem' | 'target' }

export const STICKERS: Sticker[] = [
  { id: 'first-lesson', name: 'First steps', how: 'Finish your first lesson', color: 'var(--green-9)', icon: 'footprints' },
  ...WORLDS.map((w): Sticker => ({ id: `world-${w.id}`, name: w.name, how: `Finish every lesson in ${w.name}`, color: w.color, icon: w.icon })),
  { id: 'three-stars-5', name: 'Star collector', how: 'Get 3 stars in 5 lessons', color: 'var(--amber-9)', icon: 'star' },
  { id: 'three-stars-20', name: 'Star catcher', how: 'Get 3 stars in 20 lessons', color: 'var(--amber-10)', icon: 'crown' },
  { id: 'pawn-wars-win', name: 'Pawn general', how: 'Win a game of Pawn Wars', color: 'var(--sky-9)', icon: 'swords' },
  { id: 'pawn-wars-master', name: 'Pawn wars master', how: 'Win Pawn Wars on level 2 three times', color: 'var(--sky-11)', icon: 'shield' },
  { id: 'capture-perfect', name: 'Shortest path', how: 'Clear a Capture Quest in the fewest moves', color: 'var(--orange-9)', icon: 'target' },
  { id: 'square-hunt-10', name: 'Map reader', how: 'Find 10 squares in a row in Square Hunt', color: 'var(--indigo-9)', icon: 'map' },
  { id: 'knight-journey', name: 'Knight traveller', how: 'Finish a Knight\'s Journey in the fewest jumps', color: 'var(--green-11)', icon: 'footprints' },
  { id: 'treasure-5', name: 'Treasure hunter', how: 'Find 5 mate-in-one treasures', color: 'var(--amber-11)', icon: 'gem' },
  { id: 'protect-king', name: 'Royal guard', how: 'Protect the king 5 times', color: 'var(--tomato-9)', icon: 'shield' },
  { id: 'bot-win', name: 'Bot buster', how: 'Beat a computer friend', color: 'var(--indigo-11)', icon: 'puzzle' },
  { id: 'kept-trying', name: 'Never give up', how: 'Finish a lesson after a tricky start', color: 'var(--tomato-11)', icon: 'mountain' },
];

/** Re-check lesson-based stickers. Returns newly earned sticker ids. */
export function checkLessonStickers(index: LessonIndexEntry[], justFinished?: { stars: number }): string[] {
  const s = getKids();
  const won: string[] = [];
  const done = Object.keys(s.lessons);
  if (done.length >= 1 && award('first-lesson')) won.push('first-lesson');
  for (const w of WORLDS) {
    const ids = index.filter((l) => worldOf(l.id) === w.id).map((l) => l.id);
    if (ids.length && ids.every((id) => s.lessons[id]) && award(`world-${w.id}`)) won.push(`world-${w.id}`);
  }
  const three = Object.values(s.lessons).filter((l) => l.stars >= 3).length;
  if (three >= 5 && award('three-stars-5')) won.push('three-stars-5');
  if (three >= 20 && award('three-stars-20')) won.push('three-stars-20');
  if (justFinished && justFinished.stars <= 1 && award('kept-trying')) won.push('kept-trying');
  return won;
}

export function earn(id: string): boolean { return award(id); }
export const stickerById = (id: string) => STICKERS.find((x) => x.id === id);
