// Evaluation bar (design system `.evalbar`). Input is White-POV; mate shown as M#.
import { winPercentFromCp } from '@grim/core';

export function evalLabel(cp: number | null | undefined, mate?: number | null): string {
  if (mate != null) return mate === 0 ? '#' : `${mate > 0 ? '' : '-'}M${Math.abs(mate)}`;
  if (cp == null) return '…';
  return `${cp > 0 ? '+' : cp < 0 ? '−' : ''}${Math.abs(cp / 100).toFixed(1)}`;
}

export function EvalBar({ cp, mate, orientation = 'white', large = true }: {
  /** White-POV centipawns */ cp: number | null | undefined;
  /** White-POV mate distance (positive = White mates) */ mate?: number | null;
  orientation?: 'white' | 'black'; large?: boolean;
}) {
  const pct = mate != null ? (mate > 0 || (mate === 0 && (cp ?? 0) > 0) ? 100 : 0) : cp == null ? 50 : winPercentFromCp(cp);
  const label = evalLabel(cp, mate);
  const side = pct >= 50 ? 'white' : 'black';
  return (
    <div className={`evalbar ${large ? 'evalbar-lg' : ''}`} style={{ ['--eval-pct' as string]: pct.toFixed(1) }} role="meter"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={`Evaluation ${label}`}
      data-side={side} data-orientation={orientation}>
      <div className="evalbar__fill" />
      <span className="evalbar__score">{label}</span>
    </div>
  );
}
