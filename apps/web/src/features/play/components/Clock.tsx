// Chess clock display (design system `.clock`). Pure view: pass remaining milliseconds.
export function formatClock(ms: number): { main: string; tenths: string | null; hours: boolean } {
  const t = Math.max(0, ms);
  const totalSec = Math.floor(t / 1000);
  const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
  if (h > 0) return { main: `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, tenths: null, hours: true };
  return { main: `${m}:${String(s).padStart(2, '0')}`, tenths: t < 10000 ? `.${Math.floor((t % 1000) / 100)}` : null, hours: false };
}

export function Clock({ ms, running, initialMs, lowMs = 20000, label, large }: {
  ms: number; running: boolean; initialMs?: number; lowMs?: number; label?: string; large?: boolean;
}) {
  const f = formatClock(ms);
  const pct = initialMs ? Math.max(0, Math.min(100, (ms / initialMs) * 100)) : 100;
  const cls = ['clock', large ? 'clock-lg' : '', running ? 'is-running' : '', ms <= lowMs ? 'is-low' : '', ms <= 0 ? 'is-flagged' : ''].filter(Boolean).join(' ');
  return (
    <div className={cls} role="timer" aria-live="off" aria-label={`${label ? `${label} clock: ` : ''}${f.main}`} style={{ ['--clock-pct' as string]: pct }}>
      <span className={f.hours ? 'clock__hours' : 'clock__time'}>{f.main}</span>
      {f.tenths && <span className="clock__tenths">{f.tenths}</span>}
      <div className="clock__bar" />
    </div>
  );
}
