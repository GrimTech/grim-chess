// Scoresheet move list (design system `.movelist`) with optional figurines and quality glyphs.
import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { MoveClass } from '@grim/core';
import { turnOf } from '../lib/chess.ts';

const FIGURINES: Record<string, string> = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘' };
export const figurine = (san: string) => san.replace(/^[KQRBN]/, (p) => FIGURINES[p]).replace(/=([QRBN])/, (_, p: string) => `=${FIGURINES[p]}`);

const GLYPH: Partial<Record<MoveClass, string>> = { inaccuracy: '?!', mistake: '?', blunder: '??' };

export interface MoveListProps {
  sans: string[];
  /** Number of plies currently shown on the board (0 = start position). */
  current: number;
  onSelect?: (ply: number) => void;
  startFen?: string;
  classes?: (MoveClass | null | undefined)[];
  figurines?: boolean;
  result?: string | null;
  inline?: boolean;
  className?: string;
}

export function MoveList({ sans, current, onSelect, startFen, classes, figurines, result, inline, className }: MoveListProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-current="true"]');
    if (el && ref.current) {
      const box = ref.current;
      if (inline) box.scrollLeft = el.offsetLeft - box.clientWidth / 2;
      else if (el.offsetTop < box.scrollTop || el.offsetTop > box.scrollTop + box.clientHeight - 40) box.scrollTop = el.offsetTop - box.clientHeight / 2;
    }
  }, [current, sans.length, inline]);

  const fullmove = Number(startFen?.split(' ')[5] || 1);
  const blackFirst = startFen ? turnOf(startFen) === 'black' : false;
  const rows: { n: number; w: number | null; b: number | null }[] = [];
  let i = 0;
  if (blackFirst && sans.length) { rows.push({ n: fullmove, w: null, b: 0 }); i = 1; }
  for (; i < sans.length; i += 2) rows.push({ n: fullmove + Math.floor((i + (blackFirst ? 1 : 0)) / 2), w: i, b: i + 1 < sans.length ? i + 1 : null });

  const cell = (idx: number | null, key: string) => {
    if (idx == null) return <span key={key} className="movelist__ply is-empty" aria-hidden="true">{idx === null && key.endsWith('w') ? '…' : ''}</span>;
    const q = classes?.[idx];
    return (
      <button key={key} type="button" className="movelist__ply" aria-current={idx + 1 === current ? 'true' : undefined}
        onClick={() => onSelect?.(idx + 1)}>
        {figurines ? figurine(sans[idx]) : sans[idx]}
        {q && GLYPH[q] && <span className="glyph" data-q={q} title={q}>{GLYPH[q]}</span>}
      </button>
    );
  };

  return (
    <div ref={ref} className={`movelist ${inline ? 'movelist-inline' : ''} ${className ?? ''}`} role="list" aria-label="Moves">
      {rows.length === 0 && !inline && <span className="movelist__result muted" style={{ fontWeight: 400 }}>No moves yet</span>}
      {rows.map((r) => (
        <Fragment key={r.n}>
          <span className="movelist__num">{r.n}.</span>
          {cell(r.w, `${r.n}w`)}
          {inline && r.b == null ? null : cell(r.b, `${r.n}b`)}
        </Fragment>
      ))}
      {result && <div className="movelist__result">{result}</div>}
    </div>
  );
}

/** First / previous / next / last navigation bar (design system `.move-nav`). */
export function MoveNav({ current, total, onSelect, extra }: { current: number; total: number; onSelect: (ply: number) => void; extra?: ReactNode }) {
  return (
    <div className="move-nav">
      <button type="button" className="btn btn-ghost btn-sm" aria-label="First move" disabled={current === 0} onClick={() => onSelect(0)}><ChevronsLeft size={18} strokeWidth={1.75} /></button>
      <button type="button" className="btn btn-ghost btn-sm" aria-label="Previous move" disabled={current === 0} onClick={() => onSelect(current - 1)}><ChevronLeft size={18} strokeWidth={1.75} /></button>
      <button type="button" className="btn btn-ghost btn-sm" aria-label="Next move" disabled={current >= total} onClick={() => onSelect(current + 1)}><ChevronRight size={18} strokeWidth={1.75} /></button>
      <button type="button" className="btn btn-ghost btn-sm" aria-label="Last move" disabled={current >= total} onClick={() => onSelect(total)}><ChevronsRight size={18} strokeWidth={1.75} /></button>
      {extra ?? <span />}
    </div>
  );
}
