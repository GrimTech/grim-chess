// Small shared UI pieces for the kids track: boards, read-aloud, stars, confetti, tiny markdown.
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Star, Volume2 } from 'lucide-react';
import { Board, type BoardProps } from '../../components/Board.tsx';
import { canSpeak, speak } from './speech.ts';
import { getKids } from './store.ts';
import { useSession } from '../../lib/session.tsx';

/** Renders **bold** inside short lesson strings. */
export function Md({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>))}</>;
}

export function ReadAloud({ text, label = 'Read it to me' }: { text: string; label?: string }) {
  if (!canSpeak()) return null;
  return (
    <button type="button" className="btn btn-soft kid-read" onClick={() => speak(text)} aria-label={label} title={label}>
      <Volume2 aria-hidden />
    </button>
  );
}

/** Auto read-aloud (parent setting; defaults on below age 7). */
export function useAutoRead(text: string | null) {
  const { me } = useSession();
  useEffect(() => {
    if (!text) return;
    const s = getKids().settings.autoRead;
    const on = s ?? ((me?.profile.age ?? 8) < 7);
    if (on) { const t = setTimeout(() => speak(text), 250); return () => clearTimeout(t); }
  }, [text, me?.profile.age]);
}

export function Stars({ n, size = 20, label = true }: { n: number; size?: number; label?: boolean }) {
  return (
    <span className="stars" aria-label={label ? `${n} of 3 stars` : undefined} role={label ? 'img' : undefined}>
      {[0, 1, 2].map((i) => <Star key={i} aria-hidden className={i < n ? 'is-on' : ''} style={{ width: size, height: size }} />)}
    </span>
  );
}

/** Board in the meadow theme with a friendly feedback ring. */
export function KidsBoard({ feedback, ...props }: BoardProps & { feedback?: 'correct' | 'wrong' | null }) {
  return (
    <div className={`kid-board ${feedback ? `is-${feedback}` : ''}`} data-board="meadow">
      <Board autoQueen={false} {...props} />
    </div>
  );
}

/**
 * Board for kingless mini-games (Pawn Wars, Capture Quest, Knight's Journey). The shared Board validates with chess.js,
 * which needs kings, so here it runs in `free` mode and this wrapper reads taps and drags itself, then asks the game
 * whether the move is allowed. The board is re-synced to `fen` after every gesture.
 */
export function FreeBoard({ fen, onTryMove, canSelect, onTap, highlights, arrows, orientation = 'white', lastMove, disabled }: {
  fen: string;
  /** return true when the move was played */
  onTryMove?: (from: string, to: string) => boolean;
  canSelect?: (sq: string) => boolean;
  onTap?: (sq: string) => void;
  highlights?: string[]; arrows?: BoardProps['arrows']; orientation?: 'white' | 'black'; lastMove?: [string, string] | null; disabled?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const down = useRef<string | null>(null);
  const [, setNonce] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const selRef = useRef<string | null>(null);
  const setSel = (s: string | null) => { selRef.current = s; setSelected(s); };
  const handlers = useRef({ onTryMove, canSelect, onTap, disabled });
  handlers.current = { onTryMove, canSelect, onTap, disabled };

  const squareAt = useCallback((x: number, y: number): string | null => {
    const b = host.current?.querySelector('cg-board');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    if (x < r.left || y < r.top || x >= r.right || y >= r.bottom) return null;
    let f = Math.floor(((x - r.left) / r.width) * 8);
    let rk = 7 - Math.floor(((y - r.top) / r.height) * 8);
    if (orientation === 'black') { f = 7 - f; rk = 7 - rk; }
    return 'abcdefgh'[f] + (rk + 1);
  }, [orientation]);

  useEffect(() => {
    const up = (e: PointerEvent) => {
      const from = down.current;
      if (!from) return;
      down.current = null;
      const h = handlers.current;
      const to = squareAt(e.clientX, e.clientY);
      if (!h.disabled && to) {
        if (to !== from) { setSel(null); h.onTryMove?.(from, to); }
        else {
          h.onTap?.(to);
          if (h.onTryMove) {
            const cur = selRef.current;
            if (cur && cur !== to) { const ok = h.onTryMove(cur, to); setSel(!ok && h.canSelect?.(to) ? to : null); }
            else setSel(cur === to ? null : h.canSelect?.(to) ? to : null);
          }
        }
      }
      // re-sync chessground with the authoritative position after its own free move
      requestAnimationFrame(() => setNonce((n) => n + 1));
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [squareAt]);

  return (
    <div ref={host} className="kid-board" data-board="meadow"
      onPointerDownCapture={(e) => { down.current = squareAt(e.clientX, e.clientY); }}>
      <Board fen={fen} free={!disabled} movable="none" orientation={orientation} lastMove={lastMove}
        highlights={[...(highlights ?? []), ...(selected && onTryMove ? [selected] : [])]} arrows={arrows} />
    </div>
  );
}

/** One-shot celebration: confetti burst (static star burst under reduced motion). */
export function Confetti({ fire }: { fire: number }) {
  const [pieces, setPieces] = useState<{ id: number; x: number; d: number; c: string; r: number; s: number }[]>([]);
  useEffect(() => {
    if (!fire) return;
    const colors = ['var(--amber-9)', 'var(--green-9)', 'var(--sky-9)', 'var(--tomato-9)', 'var(--indigo-9)', 'var(--orange-9)'];
    setPieces(Array.from({ length: 36 }, (_, i) => ({ id: fire * 100 + i, x: Math.random() * 100, d: Math.random() * 0.4, c: colors[i % colors.length], r: Math.random() * 360, s: 8 + Math.random() * 8 })));
    const t = setTimeout(() => setPieces([]), 2200);
    return () => clearTimeout(t);
  }, [fire]);
  if (!pieces.length) return null;
  return (
    <div className="kid-confetti" aria-hidden>
      {pieces.map((p) => <i key={p.id} style={{ left: `${p.x}%`, animationDelay: `${p.d}s`, background: p.c, rotate: `${p.r}deg`, width: p.s, height: p.s * 0.6 }} />)}
    </div>
  );
}

export function Page({ title, children, back }: { title?: ReactNode; children: ReactNode; back?: ReactNode }) {
  return (
    <section className="kid-page">
      {(title || back) && <header className="kid-page__head">{back}{title && <h1>{title}</h1>}</header>}
      {children}
    </section>
  );
}

/** Praise process and effort, never talent (K7). */
const PRAISE = ['Great thinking!', 'You worked it out!', 'Nice looking!', 'Well spotted!', 'Careful and clever!', 'You checked the board. Super!'];
const RETRY = ['Not quite. Try again!', 'Almost! Have another look.', 'Good try! Look again.', 'Hmm, not that one. You can do it!'];
export const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];
export const retry = () => RETRY[Math.floor(Math.random() * RETRY.length)];
