// Player strip above/below the board (design system `.player-strip`): name, rating, material, clock.
import type { ReactNode } from 'react';

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const ICON: Record<string, string> = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' };

/** Captured-material summary for `color` (pieces it has captured) and its material lead. */
export function material(fen: string, color: 'white' | 'black'): { captured: string; diff: number } {
  const board = fen.split(' ')[0];
  const count = (ch: string) => board.split(ch).length - 1;
  const start: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  let captured = '', mine = 0, theirs = 0;
  for (const p of ['q', 'r', 'b', 'n', 'p']) {
    const theirPiece = color === 'white' ? p : p.toUpperCase();
    const missing = Math.max(0, start[p] - count(theirPiece));
    captured += ICON[p].repeat(missing);
    mine += count(color === 'white' ? p.toUpperCase() : p) * VALUES[p];
    theirs += count(theirPiece) * VALUES[p];
  }
  return { captured, diff: mine - theirs };
}

export function PlayerStrip({ name, rating, fen, color, clock, badge }: {
  name: string; rating?: number | string | null; fen: string; color: 'white' | 'black'; clock?: ReactNode; badge?: ReactNode;
}) {
  const m = material(fen, color);
  return (
    <div className="player-strip">
      <span className={`play-colordot is-${color}`} aria-label={color} />
      <div className="player-strip__meta">
        <span className="player-strip__name">{name}{rating != null && <span className="player-strip__rating">{rating}</span>}{badge}</span>
        <span className="player-strip__material" aria-label="Captured pieces">{m.captured}{m.diff > 0 ? ` +${m.diff}` : ''}</span>
      </div>
      {clock}
    </div>
  );
}
