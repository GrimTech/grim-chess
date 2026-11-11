// Curriculum map: stages 1-8, domains, skills (locked / unlocked / mastered) and their lessons.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Lock, BookOpen } from 'lucide-react';
import { placementStage, type LessonIndexEntry, type Skill, type SkillState } from '@grim/core';
import { api, type ProgressSnapshot } from '../../lib/api.ts';
import { useSession } from '../../lib/session.tsx';
import { completedLessons, loadLessons, loadSkillGraph, useAsync } from './util.ts';

export type SkillStatus = 'mastered' | 'unlocked' | 'locked' | 'credited';

export function skillStatus(s: Skill, skills: Record<string, SkillState>, placement: number, byId: Map<string, Skill>): SkillStatus {
  if (skills[s.id]?.mastered) return 'mastered';
  if (s.stage < placement) return 'credited';
  const ok = s.prereqs.every((p) => skills[p]?.mastered || (byId.get(p)?.stage ?? 99) < placement);
  return ok ? 'unlocked' : 'locked';
}

export function CurriculumPage() {
  const { me } = useSession();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const graph = useAsync(loadSkillGraph, []);
  const lessons = useAsync(loadLessons, []);
  const progress = useAsync<ProgressSnapshot | null>(() => api.progress().catch(() => null), []);
  const [stage, setStage] = useState<number | null>(null);
  const [domain, setDomain] = useState<string>('all');
  const focusSkill = params.get('skill');
  const done = completedLessons();

  const g = graph.data;
  const skills = progress.data?.skills ?? {};
  const placement = g && me ? placementStage(me.profile, g, me.estimate) : 1;
  const byId = useMemo(() => new Map((g?.skills ?? []).map((s) => [s.id, s])), [g]);
  const lessonsBySkill = useMemo(() => {
    const m = new Map<string, LessonIndexEntry[]>();
    for (const l of lessons.data ?? []) for (const id of l.skillIds) m.set(id, [...(m.get(id) ?? []), l]);
    return m;
  }, [lessons.data]);

  // Deep link from the daily plan: /learn?skill=<id> opens the next lesson for that skill, if there is one.
  useEffect(() => {
    if (!focusSkill || !lessons.data || !g) return;
    const ls = lessonsBySkill.get(focusSkill) ?? [];
    const next = ls.find((l) => !done.has(l.id));
    if (next) { nav(`/learn/lesson/${encodeURIComponent(next.id)}`, { replace: true }); return; }
    const sk = byId.get(focusSkill);
    if (sk) setStage(sk.stage);
    setTimeout(() => document.getElementById(`skill-${focusSkill}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSkill, lessons.data, g]);

  if (graph.loading) return <div className="lr-page"><div className="skeleton" style={{ height: 400 }} /></div>;
  if (!g || !g.skills.length) return <div className="lr-page"><div className="empty"><p className="empty__title">The curriculum is not available yet</p><p>{graph.error ?? 'The skill graph has not been published.'}</p></div></div>;
  const cur = stage ?? placement;
  const stages = [...g.stages].sort((a, b) => a.id - b.id);
  const inStage = g.skills.filter((s) => s.stage === cur && (domain === 'all' || s.domain === domain));
  const domains = g.domains.filter((d) => g.skills.some((s) => s.stage === cur && s.domain === d));

  return (
    <div className="lr-page">
      <header className="lr-head">
        <div><p className="lr-eyebrow muted">Learn</p><h1>Curriculum</h1></div>
        <p className="muted">You are placed at stage {placement}. {lessons.data ? `${lessons.data.length} lessons available.` : ''}</p>
      </header>
      <nav className="lr-stages" aria-label="Stages">
        {stages.map((s) => {
          const list = g.skills.filter((k) => k.stage === s.id);
          const m = list.filter((k) => skills[k.id]?.mastered || k.stage < placement).length;
          const pct = list.length ? Math.round((m / list.length) * 100) : 0;
          return (
            <button key={s.id} className="lr-stage" aria-current={s.id === cur ? 'true' : undefined} onClick={() => setStage(s.id)}>
              <span className="lr-stage__num">{s.id}</span>
              <span className="lr-stage__name">{s.name}<br /><span className="muted">{s.eloRange[0]}–{s.eloRange[1]}</span></span>
              <span className="progress progress-sm" style={{ ['--value' as string]: pct }}><span className="progress__bar" style={{ display: 'block' }} /></span>
            </button>
          );
        })}
      </nav>
      <div className="tabs" role="tablist" aria-label="Domains">
        <button role="tab" className="tab" aria-selected={domain === 'all'} onClick={() => setDomain('all')}>All</button>
        {domains.map((d) => <button key={d} role="tab" className="tab" aria-selected={domain === d} onClick={() => setDomain(d)}>{d}</button>)}
      </div>
      <ul className="lr-skills">
        {inStage.map((s) => {
          const st = skillStatus(s, skills, placement, byId);
          const ls = lessonsBySkill.get(s.id) ?? [];
          const m = skills[s.id];
          return (
            <li key={s.id} id={`skill-${s.id}`} className="card lr-skill" data-status={st} data-focus={focusSkill === s.id || undefined}>
              <div className="card__header">
                <span className="lr-skill__icon" aria-hidden="true">{st === 'mastered' ? <Check /> : st === 'locked' ? <Lock /> : <BookOpen />}</span>
                <div><h3 className="card__title">{s.name}</h3><p className="card__subtitle">{s.domain} · {st === 'credited' ? 'credited by placement' : st}{m ? ` · mastery ${Math.round(m.mastery * 100)}%` : ''}</p></div>
              </div>
              <p>{s.summary}</p>
              <p className="hint"><strong>Mastery:</strong> {s.masteryCriteria}</p>
              {st === 'locked' && <p className="hint">Requires: {s.prereqs.map((p) => byId.get(p)?.name ?? p).join(', ')}</p>}
              <div className="row">
                {ls.map((l) => (
                  <Link key={l.id} to={`/learn/lesson/${encodeURIComponent(l.id)}`} className={`btn btn-sm ${done.has(l.id) ? 'btn-soft' : st === 'unlocked' ? 'btn-primary' : ''}`}>
                    {done.has(l.id) && <Check aria-hidden="true" />}{l.title} <span className="muted">{l.estMinutes}m</span>
                  </Link>
                ))}
                {s.lichessThemes.length > 0 && <Link className="btn btn-sm btn-ghost" to={`/train/puzzles?themes=${s.lichessThemes.join(',')}`}>Practise puzzles</Link>}
                {!ls.length && !s.lichessThemes.length && <span className="muted">Lessons for this skill are being written.</span>}
              </div>
              {s.kbRef && <Link className="hint" to={`/kb/03-chess-knowledge/${s.kbRef.replace(/#.*/, '')}`}>Read in the knowledge base</Link>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
