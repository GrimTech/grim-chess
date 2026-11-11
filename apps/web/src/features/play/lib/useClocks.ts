// Local chess clocks (vs computer, pass-and-play). Time is derived from timestamps, not from tick counts,
// so throttled background tabs stay accurate.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Color } from './chess.ts';

export interface TimeControl { initial: number /* seconds */; increment: number /* seconds */ }

export interface LocalClocks {
  white: number; black: number; // ms remaining (live)
  running: Color | null;
  /** Called after `mover` completed a move: adds increment, starts the other clock. */
  press: (mover: Color) => void;
  start: (side: Color) => void;
  stop: () => void;
  reset: () => void;
  /** Set remaining times directly (takebacks). */
  set: (white: number, black: number, running: Color | null) => void;
}

export function useLocalClocks(tc: TimeControl | null, onFlag: (side: Color) => void): LocalClocks {
  const base = useRef({ white: (tc?.initial ?? 0) * 1000, black: (tc?.initial ?? 0) * 1000 });
  const runRef = useRef<{ side: Color; since: number } | null>(null);
  const [, force] = useState(0);
  const flagRef = useRef(onFlag); flagRef.current = onFlag;
  const flagged = useRef(false);

  const live = (side: Color) => {
    const r = runRef.current;
    const v = base.current[side] - (r && r.side === side ? performance.now() - r.since : 0);
    return Math.max(0, v);
  };

  useEffect(() => {
    if (!tc) return;
    let raf = 0, last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const r = runRef.current;
      if (!r) return;
      const remaining = live(r.side);
      if (remaining <= 0 && !flagged.current) {
        flagged.current = true;
        base.current[r.side] = 0; runRef.current = null;
        force((x) => x + 1);
        flagRef.current(r.side);
        return;
      }
      // re-render ~10x per second (every frame under 10 s for tenths)
      if (t - last > (remaining < 10000 ? 50 : 100)) { last = t; force((x) => x + 1); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tc]);

  const stopRun = () => {
    const r = runRef.current;
    if (r) { base.current[r.side] = live(r.side); runRef.current = null; }
  };

  const press = useCallback((mover: Color) => {
    if (!tc) return;
    stopRun();
    base.current[mover] += tc.increment * 1000;
    runRef.current = { side: mover === 'white' ? 'black' : 'white', since: performance.now() };
    force((x) => x + 1);
  }, [tc]);

  const start = useCallback((side: Color) => {
    if (!tc) return;
    stopRun(); flagged.current = false;
    runRef.current = { side, since: performance.now() };
    force((x) => x + 1);
  }, [tc]);

  const stop = useCallback(() => { stopRun(); force((x) => x + 1); }, []);

  const reset = useCallback(() => {
    runRef.current = null; flagged.current = false;
    base.current = { white: (tc?.initial ?? 0) * 1000, black: (tc?.initial ?? 0) * 1000 };
    force((x) => x + 1);
  }, [tc]);

  const set = useCallback((white: number, black: number, running: Color | null) => {
    base.current = { white, black };
    runRef.current = running ? { side: running, since: performance.now() } : null;
    flagged.current = false;
    force((x) => x + 1);
  }, []);

  return { white: live('white'), black: live('black'), running: runRef.current?.side ?? null, press, start, stop, reset, set };
}
