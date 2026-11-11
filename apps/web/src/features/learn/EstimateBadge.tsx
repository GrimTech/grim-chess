// Rating estimate display following the claims policy (platform-measurement-model.md section 9).
import { Award } from 'lucide-react';
import { titleLabel, type DetailedEstimate, type RatingEstimate } from '@grim/core';
import { scaleLabel } from './benchmarks.ts';

export type AnyEstimate = RatingEstimate & Partial<Omit<DetailedEstimate, keyof RatingEstimate>>;

const CONF: Record<RatingEstimate['confidence'], string> = { 'very-low': 'very low', low: 'low', medium: 'medium', high: 'high' };

export function EstimateBadge({ estimate, large = true }: { estimate: AnyEstimate | null | undefined; large?: boolean }) {
  if (!estimate) return <p className="muted">No estimate yet. Solve puzzles, play a rated bot game or take the placement test.</p>;
  const e = estimate;
  const provisional = e.provisional ?? (e.confidence !== 'high' && e.confidence !== 'medium');
  const noData = e.components?.length ? e.components.every((c) => c.source === 'prior' || c.weight === 0) : e.confidence === 'very-low';
  return (
    <div className="lr-estimate stack">
      <p className="tile__label">{provisional ? 'Provisional Grim Rating' : scaleLabel(e.rating)}{e.rating < 1400 ? ' · extended scale (no FIDE equivalent)' : ''}</p>
      <p className={large ? 'lr-display' : 'tile__value'}>{noData ? '?' : e.rating}
        {!noData && <span className="tile__unit">95%: {e.low}–{e.high}</span>}</p>
      <div className="row">
        <span className={`badge ${e.confidence === 'high' ? 'badge-success' : e.confidence === 'medium' ? 'badge-info' : 'badge-warning'}`}>confidence: {CONF[e.confidence]}</span>
        {e.low80 != null && !noData && <span className="badge badge-outline">80%: {e.low80}–{e.high80}</span>}
        {e.titleEquivalent && <span className="badge badge-brass badge-lg"><Award aria-hidden="true" /> {titleLabel(e.titleEquivalent)}</span>}
        {e.consistency?.flagged && <span className="badge badge-danger">signals disagree</span>}
      </div>
      {noData && <p className="hint">Based only on your self-reported level. Measurements replace it as you train.</p>}
      {!e.titleEquivalent && e.milestone?.candidate && <p className="hint">On track for {titleLabel(e.milestone.candidate)}; still needed: {e.milestone.blockers.join('; ')}.</p>}
    </div>
  );
}
