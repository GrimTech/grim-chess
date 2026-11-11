import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { ExerciseType } from '@grim/core';
import { api } from '../../../lib/api.ts';
import { Mascot, type Mood } from '../Mascot.tsx';
import { Md, ReadAloud } from '../ui.tsx';

export function GameShell({ title, say, mood = 'happy', children, aside }: { title: string; say: string; mood?: Mood; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="kid-page kid-game">
      <header className="kid-lesson__head">
        <Link to="/kids/games" className="btn btn-ghost btn-icon" aria-label="Back to games"><ArrowLeft aria-hidden /></Link>
        <h1 className="kid-game__title">{title}</h1>
        {aside}
      </header>
      <div className="kid-prompt">
        <Mascot mood={mood} size={64} />
        <div className="kid-bubble" aria-live="polite"><p><Md text={say} /></p></div>
        <ReadAloud text={say} />
      </div>
      {children}
    </div>
  );
}

export async function postDrill(drill: ExerciseType, skillIds: string[], score: number, durationSec: number, detail?: Record<string, unknown>) {
  try {
    await api.postEvents([{ type: 'drill', drill, skillIds, score: Math.max(0, Math.min(1, score)), durationSec: Math.round(durationSec), at: new Date().toISOString(), detail }]);
  } catch { /* best effort when offline */ }
}

/** placement map -> FEN (kingless boards are fine for the free-mode board) */
export function toFen(pieces: Record<string, string>, turn: 'w' | 'b' = 'w'): string {
  const rows: string[] = [];
  for (let r = 8; r >= 1; r--) {
    let row = ''; let e = 0;
    for (const f of 'abcdefgh') {
      const p = pieces[f + r];
      if (!p) e++; else { if (e) { row += e; e = 0; } row += p; }
    }
    rows.push(row + (e ? e : ''));
  }
  return `${rows.join('/')} ${turn} - - 0 1`;
}

export const fileIdx = (sq: string) => sq.charCodeAt(0) - 97;
export const rankIdx = (sq: string) => Number(sq[1]) - 1;
export const sqOf = (f: number, r: number) => (f >= 0 && f < 8 && r >= 0 && r < 8 ? 'abcdefgh'[f] + (r + 1) : null);
