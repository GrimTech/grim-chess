import { useEffect, useRef } from 'react';

/** Arrow-key navigation through plies (ignored while typing in inputs). Extra single-key handlers optional. */
export function usePlyKeys(current: number, total: number, go: (ply: number) => void, extra?: Record<string, () => void>) {
  const st = useRef({ current, total, go, extra });
  st.current = { current, total, go, extra };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const { current: c, total: n, go: g, extra: x } = st.current;
      if (e.key === 'ArrowLeft') { g(Math.max(0, c - 1)); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { g(Math.min(n, c + 1)); e.preventDefault(); }
      else if (e.key === 'ArrowUp' || e.key === 'Home') { g(0); e.preventDefault(); }
      else if (e.key === 'ArrowDown' || e.key === 'End') { g(n); e.preventDefault(); }
      else if (x?.[e.key]) { x[e.key](); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function loadPref<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(`grim.play.${key}`); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
export function savePref(key: string, value: unknown) {
  try { localStorage.setItem(`grim.play.${key}`, JSON.stringify(value)); } catch { /* storage unavailable */ }
}
