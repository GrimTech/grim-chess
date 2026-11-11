// Measurement page: progress deltas first (more precise than absolute level), estimate breakdown, pools,
// history, mastery heatmap, provisional benchmark comparison, methodology and mandatory disclosures.
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { progressDelta } from '@grim/core';
import { api, type ProgressSnapshot } from '../../lib/api.ts';
import { useSession } from '../../lib/session.tsx';
import { MasteryHeatmap, TrendChart } from './charts.tsx';
import { BANDS, BENCHMARK_SOURCE, PROVISIONAL, bandFor, fideFrom } from './benchmarks.ts';
import { EstimateBadge, type AnyEstimate } from './EstimateBadge.tsx';
import { CompareRows } from './Dashboard.tsx';
import { loadSkillGraph, useAsync } from './util.ts';

const SOURCE_NAME: Record<string, string> = { bot: 'Rated games vs bots', online: 'Rated games vs humans', puzzle: 'Puzzles', assessment: 'Assessment battery', accuracy: 'Game accuracy', prior: 'Prior' };

function Delta({ label, from, to, sdStat }: { label: string; from?: { date: string; estimate: number }; to?: { date: string; estimate: number }; sdStat: number }) {
  if (!from || !to || from.date === to.date) return <div className="tile"><p className="tile__label">{label}</p><p className="tile__value">—</p><p className="tile__delta">not enough history yet</p></div>;
  const d = progressDelta({ rating: from.estimate, sdStat }, { rating: to.estimate, sdStat });
  const up = d.delta >= 0;
  return (
    <div className="tile">
      <p className="tile__label">{label}</p>
      <p className="tile__value">{up ? '+' : ''}{d.delta}<span className="tile__unit">± {Math.round(1.96 * d.se)}</span></p>
      <p className={`tile__delta ${d.measurable ? 'is-up' : d.delta < -1.645 * d.se ? 'is-down' : ''}`}>
        {up ? <TrendingUp aria-hidden="true" /> : <TrendingDown aria-hidden="true" />}
        {d.measurable ? 'measurable improvement' : d.delta < -1.645 * d.se ? 'measurable decline' : 'within measurement error'} · since {from.date}
      </p>
    </div>
  );
}

export function ProgressPage() {
  const { me } = useSession();
  const progress = useAsync<ProgressSnapshot | null>(() => api.progress().catch(() => null), []);
  const graph = useAsync(loadSkillGraph, []);
  const games = useAsync(() => api.games().catch(() => []), []);
  const snap = progress.data;
  const est = (snap?.estimate ?? me?.estimate ?? null) as AnyEstimate | null;
  const ratings = snap?.ratings ?? me?.ratings ?? {};
  const hist = (snap?.history ?? []).filter((h) => h.estimate > 0);
  const last = hist[hist.length - 1];
  const at = (days: number) => { const cut = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10); return [...hist].reverse().find((h) => h.date <= cut) ?? hist[0]; };
  const sdStat = est?.sdStat ?? (est ? Math.round((est.high - est.low) / 3.92 / 1.5) : 100);
  const accGames = (games.data ?? []).filter((g) => g.accuracy != null).slice(0, 20);
  const meanAcc = accGames.length ? accGames.reduce((a, g) => a + (g.accuracy ?? 0), 0) / accGames.length : null;
  const yourBand = est ? bandFor(est.rating).fide : null;
  const puzzleBand = fideFrom('puzzle', ratings.puzzle?.rating);

  return (
    <div className="lr-page">
      <header className="lr-head"><div><p className="lr-eyebrow muted">Measurement</p><h1>Progress</h1></div></header>

      <section className="lr-section stack" aria-labelledby="delta-h">
        <h2 id="delta-h">Your progress</h2>
        <p className="muted">Change over time is measured more precisely than absolute level, because calibration error is shared by both measurements and cancels out. A change counts as measurable when it exceeds 1.645 × its standard error.</p>
        <div className="tile-grid">
          <Delta label="Last 30 days" from={at(30)} to={last} sdStat={sdStat} />
          <Delta label="Last 90 days" from={at(90)} to={last} sdStat={sdStat} />
          <Delta label="Since you started" from={hist[0]} to={last} sdStat={sdStat} />
        </div>
      </section>

      <div className="layout-dashboard lr-section">
        <section className="card span-5"><h2 className="card__title">Current estimate</h2><EstimateBadge estimate={est} />
          {est?.consistency && <p className="hint">Consistency test: Q = {est.consistency.q} on {est.consistency.df} df, p = {est.consistency.p}{est.consistency.flagged ? ': the signals disagree, so the interval was widened and the case is flagged for review.' : ' (signals agree).'}</p>}
        </section>
        <section className="card span-7"><h2 className="card__title">History</h2>
          <TrendChart band={est ? { low: est.low, high: est.high } : undefined} series={[
            { key: 'estimate', label: 'Estimate', color: 'var(--chart-1, #3e63dd)', points: hist.map((h) => ({ x: h.date, y: h.estimate })) },
            { key: 'puzzle', label: 'Puzzle rating', color: 'var(--chart-2, #e2a336)', points: (snap?.history ?? []).filter((h) => h.puzzle != null).map((h) => ({ x: h.date, y: h.puzzle! })) },
            { key: 'bot', label: 'Bot rating', color: 'var(--chart-3, #30a46c)', points: (snap?.history ?? []).filter((h) => h.bot != null).map((h) => ({ x: h.date, y: h.bot! })) },
          ]} />
        </section>

        <section className="card span-12" aria-labelledby="comp-h">
          <h2 id="comp-h" className="card__title">How the estimate is built</h2>
          <div className="table-wrap"><table className="table table-compact">
            <thead><tr><th>Signal</th><th>Raw</th><th>On the GR scale</th><th>SD (stat / calibration / age)</th><th>Weight</th><th>Note</th></tr></thead>
            <tbody>{(est?.components ?? []).map((c) => (
              <tr key={c.source}>
                <td>{SOURCE_NAME[c.source] ?? c.source}</td>
                <td>{'raw' in c && c.raw != null ? (c.source === 'accuracy' ? `${c.raw}%` : String(Math.round(Number(c.raw)))) : '—'}</td>
                <td>{c.source === 'accuracy' ? 'not fused' : c.rating}</td>
                <td>{'sd' in c && typeof c.sd === 'number' && c.source !== 'accuracy' ? `${c.sd} (${(c as { sdStat?: number }).sdStat ?? '?'} / ${(c as { sdMap?: number }).sdMap ?? '?'} / ${(c as { sdAge?: number }).sdAge ?? 0})` : '—'}</td>
                <td>{c.source === 'accuracy' ? '0' : `${Math.round(c.weight * 100)}%`}</td>
                <td className="muted">{c.note}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <p className="hint">Each signal is put on one scale with its own uncertainty, then combined by generalized least squares that accounts for calibration error shared between signals (ρ = 0.3). Weights can be slightly negative when signals are correlated; that is expected.</p>
          <h3>Rating pools</h3>
          <div className="tile-grid">
            {(['bot', 'puzzle', 'online', 'assessment'] as const).map((k) => {
              const r = ratings[k];
              return <div key={k} className="tile"><p className="tile__label">{SOURCE_NAME[k]}</p><p className="tile__value">{r ? Math.round(r.rating) : '—'}<span className="tile__unit">{r ? `± ${Math.round(r.rd)} RD` : ''}</span></p><p className="tile__delta">{r ? `${r.games} ${k === 'puzzle' ? 'puzzles' : k === 'assessment' ? 'sittings' : 'games'}` : 'no data'}</p></div>;
            })}
          </div>
        </section>

        <section className="card span-12" aria-labelledby="bench-h">
          <h2 id="bench-h" className="card__title">How you compare</h2>
          <p className="card__subtitle">All band values are a {PROVISIONAL}. Source: {BENCHMARK_SOURCE}.</p>
          <CompareRows puzzle={ratings.puzzle?.rating} accuracy={meanAcc} acpl={null} />
          <div className="table-wrap"><table className="table table-compact lr-bench">
            <thead><tr><th>Band</th><th>Label</th><th>Accuracy (median, IQR)</th><th>ACPL rapid</th><th>Blunders / game</th><th>Lichess puzzle</th><th>% of FIDE players below</th></tr></thead>
            <tbody>{BANDS.map((b) => (
              <tr key={b.fide} aria-current={b.fide === yourBand ? 'true' : undefined} data-puzzle={b.fide === bandFor(puzzleBand ?? -1).fide || undefined}>
                <td>{b.fide}{b.fide < 1400 ? '*' : ''}</td><td>{b.label}{b.fide === yourBand ? ' ← your estimate' : ''}</td>
                <td>{b.accuracy ?? '—'}{b.accuracyIqr ? ` (${b.accuracyIqr[0]}–${b.accuracyIqr[1]})` : ''}</td><td>{b.acplRapid ?? '—'}</td><td>{b.blundersRapid ?? '—'}</td><td>{b.puzzle ?? '—'}</td><td>{b.percentile ?? '—'}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <p className="hint">* Below 1400 the scale is the Grim Rating extended scale: there is no FIDE equivalent below the FIDE rating floor.</p>
        </section>

        <section className="card span-12" aria-labelledby="heat-h">
          <h2 id="heat-h" className="card__title">Skill mastery by domain and stage</h2>
          {graph.data && graph.data.skills.length ? <MasteryHeatmap graph={graph.data} skills={snap?.skills ?? {}} /> : <div className="skeleton" style={{ height: 160 }} />}
        </section>

        <section className="card span-12 lr-disclosure" aria-labelledby="method-h">
          <h2 id="method-h" className="card__title">Method and caveats</h2>
          <ul>
            <li>FIDE ratings and titles are awarded only by FIDE, on the basis of FIDE-rated over-the-board events. Titles above FM also require norms with arbiters. The word FIDE is used descriptively; there is no endorsement by FIDE.</li>
            <li>The Grim Rating is an estimate on the FIDE Standard scale (post-March-2024). It is valid only for the population and time controls named in the model card; the model&apos;s calibration parameters are priors until the anchor-panel validation study is done.</li>
            <li>An estimate is shown as FIDE-scale only with at least 20 rated games, a non-game signal (assessment) and a standard error of 150 or less. Otherwise it is labelled provisional.</li>
            <li>Strength milestones (CM- to GM-equivalent strength) need the lower 80% bound above the threshold at two evaluations 30+ days apart, SE ≤ 100, 30 rated games in 180 days, a game-based estimate near the threshold and the endgame knowledge gate.</li>
            <li>Accuracy and ACPL are displayed for feedback. They are not ratings and do not enter the estimate.</li>
          </ul>
          <p><Link to="/kb/04-assessment/platform-measurement-model.md">Full measurement model</Link> · <Link to="/kb/04-assessment/10-benchmarks-by-rating-band.md">Benchmark bands</Link> · <Link to="/assessment/reassessment">Take a re-assessment</Link></p>
        </section>
      </div>
    </div>
  );
}
