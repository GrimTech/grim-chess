// Home: redirect to onboarding, else the dashboard (today's plan, estimate, trend, streak, stage progress,
// benchmark comparison, next milestone, re-assessment prompt).
import { useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Check, Flame, Circle, ClipboardCheck } from 'lucide-react';
import { generateDailyPlan, placementStage, type DailyPlan } from '@grim/core';
import { api, type ProgressSnapshot } from '../../lib/api.ts';
import { useSession } from '../../lib/session.tsx';
import { TrendChart } from './charts.tsx';
import { BANDS, PROVISIONAL, bandFor, fideFrom, nextMilestone } from './benchmarks.ts';
import { completedLessons, loadLessons, loadSkillGraph, lsGet, lsSet, useAsync } from './util.ts';
import { EstimateBadge } from './EstimateBadge.tsx';

export const REASSESS_DAYS = 28;

export function daysSinceAssessment(updatedAt?: string | null): number | null {
  const at = updatedAt ?? lsGet<string | null>('gc_last_assessment', null);
  return at ? Math.floor((Date.now() - Date.parse(at)) / 86400000) : null;
}

export function HomePage() {
  const { me, loading, error } = useSession();
  if (loading) return <div className="lr-page"><div className="skeleton" style={{ height: 300 }} /></div>;
  if (error && !me) return <div className="lr-page"><div className="empty"><p className="empty__title">Cannot reach the server</p><p>{error}</p></div></div>;
  if (me && !me.profile.onboarded) return <Navigate to="/onboarding" replace />;
  return <Dashboard />;
}

function Dashboard() {
  const { me } = useSession();
  const nav = useNavigate();
  const progress = useAsync<ProgressSnapshot | null>(() => api.progress().catch(() => null), []);
  const graph = useAsync(loadSkillGraph, []);
  const plan = useAsync<DailyPlan | null>(async () => {
    try { return await api.plan(); } catch {
      // Offline fallback: compute the plan locally (done flags are then per-device only).
      const [g, lessons, due] = await Promise.all([loadSkillGraph(), loadLessons().catch(() => []), api.srsDue().catch(() => [])]);
      if (!me) return null;
      return generateDailyPlan({ profile: me.profile, graph: g, skills: {}, dueCards: due, estimate: me.estimate, lessons, completedLessons: [...completedLessons()] });
    }
  }, [me?.profile.userId]);
  const games = useAsync(() => api.games().catch(() => []), []);
  // Coming back from a started block: mark it done once at least half of its planned time has passed.
  useEffect(() => {
    const a = lsGet<{ id: string; minutes: number; at: number } | null>('gc_active_block', null);
    if (!a || !plan.data) return;
    const blk = plan.data.blocks.find((b) => b.id === a.id);
    if (!blk) { lsSet('gc_active_block', null); return; }
    if (!blk.done && Date.now() - a.at >= a.minutes * 30000) { lsSet('gc_active_block', null); void api.completePlanBlock(a.id).then(() => plan.reload()).catch(() => {}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.data]);
  if (!me) return null;

  const p = me.profile;
  const est = progress.data?.estimate ?? me.estimate;
  const ratings = progress.data?.ratings ?? me.ratings;
  const history = progress.data?.history ?? [];
  const totals = progress.data?.totals;
  const blocks = plan.data?.blocks ?? [];
  const doneMin = blocks.filter((b) => b.done).reduce((a, b) => a + b.minutes, 0);
  const totalMin = blocks.reduce((a, b) => a + b.minutes, 0) || 1;
  const reassess = daysSinceAssessment(ratings.assessment?.updatedAt);
  const accGames = (games.data ?? []).filter((g) => g.accuracy != null);
  const meanAcc = accGames.length ? accGames.slice(0, 20).reduce((a, g) => a + (g.accuracy ?? 0), 0) / Math.min(20, accGames.length) : null;
  const ms = est ? nextMilestone(est.rating) : null;
  const g = graph.data;
  const placement = g ? placementStage(p, g, est) : 1;

  const markDone = async (id: string) => {
    try { await api.completePlanBlock(id); plan.reload(); } catch { /* offline: ignore */ }
  };
  const startBlock = (id: string, minutes: number, route: string) => {
    lsSet('gc_active_block', { id, minutes, at: Date.now() });
    nav(route);
  };

  return (
    <div className="lr-page">
      {p.track === 'kids' && <div className="lr-note">This profile is on the children&apos;s track. <Link to="/kids">Go to the kids area</Link>.</div>}
      <header className="lr-head">
        <div><p className="lr-eyebrow muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1>Welcome back{p.displayName ? `, ${p.displayName}` : ''}</h1></div>
        <div className="row">
          <span className="badge badge-lg badge-brass"><Flame aria-hidden="true" /> {totals?.streakDays ?? 0}-day streak</span>
        </div>
      </header>

      {(reassess === null ? !ratings.assessment && (p.startingLevel !== 'zero') : reassess >= REASSESS_DAYS) && (
        <div className="lr-note row">
          <ClipboardCheck aria-hidden="true" />
          <span>{reassess === null ? 'Take the placement test for a first rating estimate and placement.' : `Your last assessment was ${reassess} days ago. A re-assessment every ~4 weeks keeps the estimate honest.`}</span>
          <Link className="btn btn-sm btn-primary" to={reassess === null ? '/assessment/placement' : '/assessment/reassessment'}>Start</Link>
        </div>
      )}

      <div className="layout-dashboard">
        <section className="card span-7" aria-labelledby="plan-h">
          <div className="card__header"><h2 id="plan-h" className="card__title">Today&apos;s plan</h2>
            <span className="card__actions muted">{Math.round(doneMin)}/{Math.round(totalMin)} min</span></div>
          {plan.data?.focus && <p className="card__subtitle">{plan.data.focus}</p>}
          <div className="progress progress-success" role="progressbar" aria-label="Plan progress" aria-valuenow={Math.round((doneMin / totalMin) * 100)} aria-valuemin={0} aria-valuemax={100} style={{ ['--value' as string]: (doneMin / totalMin) * 100 }}><div className="progress__bar" /></div>
          {plan.loading ? <div className="skeleton" style={{ height: 200 }} /> : !blocks.length ? <p className="muted">No plan yet. {plan.error}</p> : (
            <ol className="lr-plan">
              {blocks.map((b) => (
                <li key={b.id} className="lr-plan__item" data-done={b.done || undefined}>
                  <button className="lr-plan__check" onClick={() => !b.done && void markDone(b.id)} aria-label={b.done ? `${b.title} done` : `Mark ${b.title} as done`} aria-pressed={!!b.done}>{b.done ? <Check /> : <Circle />}</button>
                  <div className="lr-plan__body">
                    <strong>{b.title}</strong> <span className="muted">· {b.minutes} min</span>
                    <p className="hint">{b.reason}</p>
                  </div>
                  <button className={`btn btn-sm ${b.done ? 'btn-ghost' : 'btn-primary'}`} onClick={() => startBlock(b.id, b.minutes, b.route)} aria-label={`${b.done ? 'Repeat' : 'Start'} ${b.title}`}>{b.done ? 'Again' : 'Start'}</button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card span-5" aria-labelledby="est-h">
          <h2 id="est-h" className="card__title">Estimated strength</h2>
          <EstimateBadge estimate={est} />
          {ms && est && <p>Next milestone: <strong>{ms.rating}</strong> → {ms.label} <span className="muted">({ms.rating - est.rating} points)</span></p>}
          <p className="hint">{est ? `${bandFor(est.rating).label} band.` : ''} FIDE ratings and titles are awarded only by FIDE for rated over-the-board play; this is an estimate. <Link to="/progress">How this is measured</Link></p>
        </section>

        <section className="card span-7" aria-labelledby="trend-h">
          <h2 id="trend-h" className="card__title">Rating trend</h2>
          <TrendChart band={est ? { low: est.low, high: est.high } : undefined} series={[
            { key: 'estimate', label: 'Estimate (GR)', color: 'var(--chart-1, #3e63dd)', points: history.filter((h) => h.estimate > 0).map((h) => ({ x: h.date, y: h.estimate })) },
            { key: 'puzzle', label: 'Puzzle rating', color: 'var(--chart-2, #e2a336)', points: history.filter((h) => h.puzzle != null).map((h) => ({ x: h.date, y: h.puzzle! })) },
            { key: 'bot', label: 'Bot rating', color: 'var(--chart-3, #30a46c)', points: history.filter((h) => h.bot != null).map((h) => ({ x: h.date, y: h.bot! })) },
          ]} />
          {totals && <p className="muted">{totals.minutes} min trained · {totals.puzzles} puzzles · {totals.lessons} lessons · {totals.games} games</p>}
        </section>

        <section className="card span-5" aria-labelledby="cmp-h">
          <h2 id="cmp-h" className="card__title">How you compare</h2>
          <CompareRows puzzle={ratings.puzzle?.rating} accuracy={meanAcc} />
          <p className="hint">Bands are a {PROVISIONAL}. Details on <Link to="/progress">Progress</Link>.</p>
        </section>

        <section className="card span-12" aria-labelledby="stages-h">
          <div className="card__header"><h2 id="stages-h" className="card__title">Skill tree</h2><Link className="card__actions btn btn-sm btn-ghost" to="/learn">Open curriculum</Link></div>
          {g ? (
            <div className="lr-stagebars">
              {[...g.stages].sort((a, b) => a.id - b.id).map((s) => {
                const list = g.skills.filter((k) => k.stage === s.id);
                const m = list.filter((k) => progress.data?.skills[k.id]?.mastered || k.stage < placement).length;
                const pct = list.length ? (m / list.length) * 100 : 0;
                return (
                  <Link key={s.id} to="/learn" className="lr-stagebar" aria-label={`Stage ${s.id} ${s.name}: ${m} of ${list.length} skills`}>
                    <span className="lr-stagebar__label">S{s.id} <span className="muted">{s.name}</span></span>
                    <span className="progress" style={{ ['--value' as string]: pct }}><span className="progress__bar" style={{ display: 'block' }} /></span>
                    <span className="muted">{m}/{list.length}</span>
                  </Link>
                );
              })}
            </div>
          ) : <div className="skeleton" style={{ height: 80 }} />}
        </section>
      </div>
    </div>
  );
}

/** Band comparison rows (claims policy: "typical for players rated X", accuracy compared to band medians only). */
export function CompareRows({ puzzle, accuracy, acpl }: { puzzle?: number | null; accuracy?: number | null; acpl?: number | null }) {
  const nearestBy = (key: 'accuracy' | 'acplRapid', v: number) => BANDS.filter((b) => b[key] != null).reduce((a, b) => (Math.abs(b[key]! - v) < Math.abs(a[key]! - v) ? b : a));
  const rows: { label: string; value: string | null; fide: number | null; text: string | null; empty: string }[] = [
    { label: 'Puzzle rating', value: puzzle != null ? String(Math.round(puzzle)) : null, fide: fideFrom('puzzle', puzzle),
      text: puzzle != null ? `Typical for players rated ~${fideFrom('puzzle', puzzle)} (${bandFor(fideFrom('puzzle', puzzle) ?? 0).label}).` : null, empty: 'Solve rated puzzles to measure this.' },
    { label: 'Game accuracy (Lichess formula)', value: accuracy != null ? `${accuracy.toFixed(1)}%` : null, fide: accuracy != null ? nearestBy('accuracy', accuracy).fide : null,
      text: accuracy != null ? (() => { const b = nearestBy('accuracy', accuracy); return `Median for ${b.fide}-band players (online rapid) is ${b.accuracy}%. Accuracy is not a rating.`; })() : null, empty: 'Play and review games vs bots to measure accuracy.' },
    ...(acpl !== undefined ? [{ label: 'ACPL (rapid)', value: acpl != null ? String(Math.round(acpl)) : null, fide: acpl != null ? nearestBy('acplRapid', acpl).fide : null,
      text: acpl != null ? (() => { const b = nearestBy('acplRapid', acpl); return `Median for ${b.fide}-band players (online rapid) is ${b.acplRapid}.`; })() : null, empty: 'Needs analysed games.' }] : []),
  ];
  const max = BANDS[BANDS.length - 1].fide, min = BANDS[0].fide;
  return (
    <ul className="lr-compare">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="row"><strong>{r.label}</strong><span className="muted">{r.value ?? 'no data yet'}</span></div>
          {r.fide != null ? <>
            <div className="lr-compare__scale" aria-hidden="true"><span style={{ left: `${((r.fide - min) / (max - min)) * 100}%` }} /></div>
            <p className="hint">{r.text}</p>
          </> : <p className="hint">{r.empty}</p>}
        </li>
      ))}
    </ul>
  );
}
