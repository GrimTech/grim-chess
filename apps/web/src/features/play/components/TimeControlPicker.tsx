import type { TimeControl } from '../lib/useClocks.ts';
import { tcLabel } from '../lib/chess.ts';

export const TIME_CONTROLS: TimeControl[] = [
  { initial: 180, increment: 2 }, { initial: 300, increment: 3 }, { initial: 600, increment: 5 },
  { initial: 900, increment: 10 }, { initial: 1800, increment: 0 },
];

export const sameTc = (a: TimeControl | null, b: TimeControl | null) => a === b || (!!a && !!b && a.initial === b.initial && a.increment === b.increment);

export function TimeControlPicker({ value, onChange, allowUntimed = true, label = 'Time control' }: {
  value: TimeControl | null; onChange: (tc: TimeControl | null) => void; allowUntimed?: boolean; label?: string;
}) {
  const opts: (TimeControl | null)[] = allowUntimed ? [null, ...TIME_CONTROLS] : TIME_CONTROLS;
  return (
    <div className="field">
      <span className="label" id="tc-label">{label}</span>
      <div className="segmented play-segmented-wrap" role="radiogroup" aria-labelledby="tc-label">
        {opts.map((tc) => (
          <button key={tcLabel(tc)} type="button" role="radio" aria-checked={sameTc(tc, value)} onClick={() => onChange(tc)}>{tcLabel(tc)}</button>
        ))}
      </div>
    </div>
  );
}

export function ColorPicker({ value, onChange }: { value: 'white' | 'black' | 'random'; onChange: (c: 'white' | 'black' | 'random') => void }) {
  return (
    <div className="field">
      <span className="label" id="color-label">Your colour</span>
      <div className="segmented" role="radiogroup" aria-labelledby="color-label">
        {(['white', 'random', 'black'] as const).map((c) => (
          <button key={c} type="button" role="radio" aria-checked={value === c} onClick={() => onChange(c)}>
            {c === 'white' ? 'White' : c === 'black' ? 'Black' : 'Random'}
          </button>
        ))}
      </div>
    </div>
  );
}
