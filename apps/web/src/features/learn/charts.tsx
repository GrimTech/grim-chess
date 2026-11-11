// Small SVG charts (no chart library): rating trend lines and the domain x stage mastery heatmap.
import type { SkillGraph, SkillState, Domain } from '@grim/core';

export interface Series { key: string; label: string; color: string; points: { x: string; y: number }[] }

export function TrendChart({ series, height = 180, band }: { series: Series[]; height?: number; band?: { low: number; high: number } }) {
  const all = series.flatMap((s) => s.points);
  if (new Set(all.map((p) => p.x)).size < 2) return <div className="empty lr-chart-empty"><p>Your trend appears after a few days of training.</p></div>;
  const xs = [...new Set(all.map((p) => p.x))].sort();
  const ys = all.map((p) => p.y).concat(band ? [band.low, band.high] : []);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (max - min < 100) { const m = (max + min) / 2; min = m - 50; max = m + 50; }
  const pad = (max - min) * 0.08; min = Math.max(0, min - pad); max += pad;
  const W = 640, H = height, L = 44, R = 8, T = 8, B = 22;
  const x = (d: string) => L + (xs.indexOf(d) / Math.max(1, xs.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const ticks = 4;
  const tv = Array.from({ length: ticks + 1 }, (_, i) => Math.round(min + ((max - min) * i) / ticks));
  return (
    <figure className="lr-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Rating trend: ${series.map((s) => `${s.label} ${s.points.at(-1)?.y ?? ''}`).join(', ')}`} preserveAspectRatio="none">
        {tv.map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="lr-chart__grid" /><text x={L - 6} y={y(v) + 4} textAnchor="end" className="lr-chart__tick">{v}</text></g>)}
        {band && <rect x={L} width={W - L - R} y={y(band.high)} height={Math.max(1, y(band.low) - y(band.high))} className="lr-chart__band" />}
        {series.map((s) => (
          <polyline key={s.key} fill="none" stroke={s.color} strokeWidth={2} vectorEffect="non-scaling-stroke"
            points={s.points.map((p) => `${x(p.x)},${y(p.y)}`).join(' ')} />
        ))}
        <text x={L} y={H - 4} className="lr-chart__tick">{xs[0]}</text>
        <text x={W - R} y={H - 4} textAnchor="end" className="lr-chart__tick">{xs[xs.length - 1]}</text>
      </svg>
      <figcaption className="row">{series.map((s) => <span key={s.key} className="lr-legend"><i style={{ background: s.color }} />{s.label}</span>)}</figcaption>
    </figure>
  );
}

export function MasteryHeatmap({ graph, skills }: { graph: SkillGraph; skills: Record<string, SkillState> }) {
  const stages = [...graph.stages].sort((a, b) => a.id - b.id);
  const domains = graph.domains as Domain[];
  const cell = (d: Domain, st: number) => {
    const list = graph.skills.filter((s) => s.domain === d && s.stage === st);
    if (!list.length) return null;
    const m = list.reduce((a, s) => a + (skills[s.id]?.mastery ?? 0), 0) / list.length;
    const mastered = list.filter((s) => skills[s.id]?.mastered).length;
    return { m, mastered, n: list.length };
  };
  return (
    <div className="table-wrap">
      <table className="table table-compact lr-heat">
        <caption className="muted">Mean mastery per domain and stage (number = skills mastered / skills)</caption>
        <thead><tr><th scope="col">Domain</th>{stages.map((s) => <th key={s.id} scope="col" title={s.name}>S{s.id}</th>)}</tr></thead>
        <tbody>
          {domains.map((d) => (
            <tr key={d}><th scope="row">{d}</th>
              {stages.map((s) => {
                const c = cell(d, s.id);
                return <td key={s.id} className="lr-heat__cell" style={c ? { ['--m' as string]: c.m } : undefined} title={c ? `${Math.round(c.m * 100)}% mean mastery` : 'no skills'}>
                  {c ? `${c.mastered}/${c.n}` : ''}
                </td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
