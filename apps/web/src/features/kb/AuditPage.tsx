// /audit: auditor-facing report on how the curriculum, lessons, puzzles and knowledge base cover the skill graph.
// Data: GET /api/kb/audit (computed by the server from the repository content; see apps/server/src/kb.ts).
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.ts';
import { docRoute, sectionLabel } from './markdown.ts';

interface Cell { stage: number; domain: string; skills: number; skillsWithLessons: number; lessons: number; puzzles: number }
interface SkillRow {
  id: string; name: string; domain: string; stage: number; lessons: number; lessonIds: string[]; puzzles: number;
  lichessThemes: string[]; unknownThemes: string[]; exerciseTypes: string[]; kbRef: string | null; kbRefExists: boolean | null;
}
interface Audit {
  generatedAt: string;
  skillGraph: { present: boolean; version: string; skills: number; stages: { id: number; name: string; eloRange: [number, number] }[]; domains: string[] };
  skills: SkillRow[];
  coverage: { stages: number[]; domains: string[]; cells: Cell[] };
  gaps: {
    skillsWithoutLessons: { id: string; name: string; stage: number; domain: string }[];
    skillsWithoutPuzzles: { id: string; name: string; themes: string[] }[];
    skillsWithoutThemes: string[];
    lessonsWithUnknownSkills: { lessonId: string; file: string; unknown: string[] }[];
    brokenKbRefs: { id: string; kbRef: string }[];
    missingPrereqs: { id: string; missing: string[] }[];
    kbFilesWithoutSources: string[];
    kbFilesNotReviewed: string[];
  };
  exerciseTypes: Record<string, number>;
  lessons: { total: number; byTrack: Record<string, number>; byStage: Record<string, number>; loadWarnings: string[] };
  puzzles: { total: number; themes: number; byRating: { from: number; to: number; count: number }[] };
  openings: { total: number };
  masterGames: { total: number };
  kb: {
    files: number; bySection: Record<string, number>; citedSources: number; frontMatterSources: number; uniqueUrls: number; words: number;
    lastReviewed: { oldest: string | null; newest: string | null };
    perFile: { path: string; title: string; lastReviewed: string | null; sources: number; citedSources: number }[];
  };
  benchmarks: { present: boolean; path: string; entries?: number; error?: string };
  methodologyDocs: { path: string; title: string }[];
  reproduce: { what: string; command: string; source?: string }[];
}

const fmt = (n: number) => n.toLocaleString('en-GB');

function Tile({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="tile">
      <span className="tile__label">{label}</span>
      <span className="tile__value">{typeof value === 'number' ? fmt(value) : value}{unit && <span className="tile__unit"> {unit}</span>}</span>
    </div>
  );
}

function coverageClass(c: Cell): string {
  if (c.skills === 0) return 'audit-cell--none';
  const r = c.skillsWithLessons / c.skills;
  return r >= 0.999 ? 'audit-cell--full' : r >= 0.5 ? 'audit-cell--part' : r > 0 ? 'audit-cell--low' : 'audit-cell--zero';
}

function Gap({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <details className="card audit-gap" open={count > 0 && count <= 12}>
      <summary>
        <span className="card__title">{title}</span>
        <span className={`badge ${count ? 'badge-warning' : 'badge-success'}`}>{count ? fmt(count) : 'None'}</span>
      </summary>
      {count > 0 && <div className="audit-gap__body">{children}</div>}
    </details>
  );
}

export function AuditPage() {
  const [a, setA] = useState<Audit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  useEffect(() => {
    document.title = 'Audit report | Grim Chess';
    api.audit().then((x) => setA(x as unknown as Audit), (e: Error) => setError(e.message));
  }, []);

  const stageName = useMemo(() => new Map((a?.skillGraph.stages ?? []).map((s) => [s.id, s])), [a]);
  const skillRows = useMemo(() => {
    const t = filter.trim().toLowerCase();
    const rows = a?.skills ?? [];
    return t ? rows.filter((s) => `${s.id} ${s.name} ${s.domain} ${s.lichessThemes.join(' ')}`.toLowerCase().includes(t)) : rows;
  }, [a, filter]);

  if (error) return <div className="audit"><h1>Audit report</h1><p className="error" role="alert">Could not load the audit report: {error}</p></div>;
  if (!a) return <div className="audit"><h1>Audit report</h1><div className="skeleton kb-skeleton" aria-busy="true" /></div>;

  const cell = (stage: number, domain: string) => a.coverage.cells.find((c) => c.stage === stage && c.domain === domain);
  const covered = a.skills.filter((s) => s.lessons > 0).length;

  return (
    <div className="audit">
      <header className="audit__header">
        <p className="kb-crumbs"><Link to="/kb">Knowledge base</Link> / Audit</p>
        <h1>Audit report</h1>
        <p className="kb-lead">
          How the curriculum covers the skill graph: lessons, Lichess puzzles and exercise types per skill, the gaps that remain,
          and the evidence base behind the knowledge base. Everything here is computed from the repository content when you load the page.
        </p>
        <p className="kb-meta">
          Generated <time dateTime={a.generatedAt}>{new Date(a.generatedAt).toLocaleString('en-GB')}</time>
          {a.skillGraph.present ? <span className="badge badge-outline">Skill graph v{a.skillGraph.version}</span> : <span className="badge badge-danger">Skill graph missing</span>}
        </p>
      </header>

      <section className="audit__section" aria-labelledby="audit-totals">
        <h2 id="audit-totals">Totals</h2>
        <div className="tile-grid">
          <Tile label="Skills in the graph" value={a.skillGraph.skills} />
          <Tile label="Skills with a lesson" value={a.skillGraph.skills ? `${Math.round((covered / a.skillGraph.skills) * 100)}%` : '–'} unit={`${covered} of ${a.skillGraph.skills}`} />
          <Tile label="Lessons" value={a.lessons.total} unit={Object.entries(a.lessons.byTrack).map(([k, v]) => `${k} ${v}`).join(', ')} />
          <Tile label="Puzzles" value={a.puzzles.total} unit={`${a.puzzles.themes} themes`} />
          <Tile label="Knowledge-base files" value={a.kb.files} />
          <Tile label="Numbered citations" value={a.kb.citedSources} unit={`${fmt(a.kb.uniqueUrls)} unique URLs`} />
          <Tile label="Last reviewed" value={a.kb.lastReviewed.newest ?? '–'} unit={a.kb.lastReviewed.oldest && a.kb.lastReviewed.oldest !== a.kb.lastReviewed.newest ? `oldest ${a.kb.lastReviewed.oldest}` : undefined} />
          <Tile label="Rating benchmarks" value={a.benchmarks.present ? 'Present' : 'Missing'} unit={a.benchmarks.path} />
        </div>
      </section>

      <section className="audit__section" aria-labelledby="audit-matrix">
        <h2 id="audit-matrix">Coverage by stage and domain</h2>
        <p className="muted">Each cell: skills that have at least one lesson / skills in the cell, then lessons and distinct puzzles matching the skills' Lichess themes.</p>
        <div className="table-wrap">
          <table className="table table-compact audit-matrix">
            <thead>
              <tr>
                <th scope="col">Stage</th>
                {a.coverage.domains.map((d) => <th key={d} scope="col">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {a.coverage.stages.map((st) => {
                const s = stageName.get(st);
                return (
                  <tr key={st}>
                    <th scope="row">
                      <span className="audit-stage">{st}. {s?.name ?? `Stage ${st}`}</span>
                      {s && <span className="audit-elo">{s.eloRange[0]}–{s.eloRange[1]}</span>}
                    </th>
                    {a.coverage.domains.map((d) => {
                      const c = cell(st, d);
                      if (!c || c.skills === 0) return <td key={d} className="audit-cell audit-cell--none" aria-label="No skills">·</td>;
                      return (
                        <td key={d} className={`audit-cell ${coverageClass(c)}`}>
                          <span className="audit-cell__main">{c.skillsWithLessons}/{c.skills}</span>
                          <span className="audit-cell__sub">{c.lessons} lessons · {fmt(c.puzzles)} puzzles</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="audit-legend">
          <span className="audit-swatch audit-cell--full" /> all skills have lessons
          <span className="audit-swatch audit-cell--part" /> at least half
          <span className="audit-swatch audit-cell--low" /> some
          <span className="audit-swatch audit-cell--zero" /> none
        </p>
      </section>

      <section className="audit__section" aria-labelledby="audit-gaps">
        <h2 id="audit-gaps">Gaps</h2>
        <div className="audit-gaps">
          <Gap title="Skills with no lesson" count={a.gaps.skillsWithoutLessons.length}>
            <ul className="audit-list">{a.gaps.skillsWithoutLessons.map((s) => <li key={s.id}><code>{s.id}</code> {s.name} <span className="muted">(stage {s.stage}, {s.domain})</span></li>)}</ul>
          </Gap>
          <Gap title="Skills whose Lichess themes match no puzzle" count={a.gaps.skillsWithoutPuzzles.length}>
            <ul className="audit-list">{a.gaps.skillsWithoutPuzzles.map((s) => <li key={s.id}><code>{s.id}</code> {s.name} <span className="muted">({s.themes.join(', ')})</span></li>)}</ul>
          </Gap>
          <Gap title="Skills with no Lichess theme (need curated exercises)" count={a.gaps.skillsWithoutThemes.length}>
            <p className="audit-inline">{a.gaps.skillsWithoutThemes.map((s) => <code key={s}>{s}</code>)}</p>
          </Gap>
          <Gap title="Lessons citing unknown skills" count={a.gaps.lessonsWithUnknownSkills.length}>
            <ul className="audit-list">{a.gaps.lessonsWithUnknownSkills.map((l) => <li key={l.lessonId}><code>{l.file}</code>: {l.unknown.join(', ')}</li>)}</ul>
          </Gap>
          <Gap title="Broken knowledge-base references in the skill graph" count={a.gaps.brokenKbRefs.length}>
            <ul className="audit-list">{a.gaps.brokenKbRefs.map((s) => <li key={s.id}><code>{s.id}</code> → {s.kbRef}</li>)}</ul>
          </Gap>
          <Gap title="Knowledge-base files without sources" count={a.gaps.kbFilesWithoutSources.length}>
            <ul className="audit-list">{a.gaps.kbFilesWithoutSources.map((p) => <li key={p}><Link to={docRoute(p)}>{p}</Link></li>)}</ul>
          </Gap>
          <Gap title="Knowledge-base files without a review date" count={a.gaps.kbFilesNotReviewed.length}>
            <ul className="audit-list">{a.gaps.kbFilesNotReviewed.map((p) => <li key={p}><Link to={docRoute(p)}>{p}</Link></li>)}</ul>
          </Gap>
        </div>
      </section>

      <section className="audit__section" aria-labelledby="audit-skills">
        <h2 id="audit-skills">Every skill</h2>
        <div className="field audit-filter">
          <label className="label" htmlFor="audit-filter">Filter skills</label>
          <input id="audit-filter" className="input" type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Id, name, domain or theme" />
        </div>
        <div className="table-wrap audit-skills">
          <table className="table table-compact">
            <thead>
              <tr>
                <th scope="col">Skill</th><th scope="col">Stage</th><th scope="col">Domain</th>
                <th scope="col" className="num">Lessons</th><th scope="col" className="num">Puzzles</th>
                <th scope="col">Lichess themes</th><th scope="col">Exercise types</th>
              </tr>
            </thead>
            <tbody>
              {skillRows.map((s) => (
                <tr key={s.id}>
                  <td><span className="audit-skill">{s.name}</span><code className="audit-skill__id">{s.id}</code></td>
                  <td className="num">{s.stage}</td>
                  <td>{s.domain}</td>
                  <td className={`num ${s.lessons ? '' : 'audit-zero'}`}>{s.lessons}</td>
                  <td className={`num ${s.puzzles || !s.lichessThemes.length ? '' : 'audit-zero'}`}>{fmt(s.puzzles)}</td>
                  <td className="cell-muted">{s.lichessThemes.join(', ') || '–'}</td>
                  <td className="cell-muted">{s.exerciseTypes.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">{skillRows.length} of {a.skills.length} skills shown.</p>
      </section>

      <section className="audit__section audit-two" aria-labelledby="audit-evidence">
        <div>
          <h2 id="audit-evidence">Evidence base</h2>
          <p>
            {fmt(a.kb.files)} documents, {fmt(a.kb.words)} words, {fmt(a.kb.citedSources)} numbered references to {fmt(a.kb.uniqueUrls)} unique URLs,
            and {fmt(a.kb.frontMatterSources)} sources listed in front matter.
          </p>
          <div className="table-wrap">
            <table className="table table-compact">
              <thead><tr><th scope="col">Document</th><th scope="col">Reviewed</th><th scope="col" className="num">References</th></tr></thead>
              <tbody>
                {a.kb.perFile.map((f) => (
                  <tr key={f.path}>
                    <td><Link to={docRoute(f.path)}>{f.title}</Link><span className="audit-skill__id">{sectionLabel(f.path.split('/')[0])}</span></td>
                    <td className="cell-muted">{f.lastReviewed ?? '–'}</td>
                    <td className="num">{f.citedSources}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2>Methodology and claims</h2>
          {a.methodologyDocs.length ? (
            <ul className="audit-list">{a.methodologyDocs.map((d) => <li key={d.path}><Link to={docRoute(d.path)}>{d.title}</Link> <span className="muted">{d.path}</span></li>)}</ul>
          ) : <p className="muted">The audit folder (knowledge-base/00-audit) has no documents yet.</p>}
          <p>
            Rating estimates follow the measurement model in the knowledge base. Title equivalents are labelled
            "CM/FM/IM/GM-equivalent strength" and never presented as titles; real titles require FIDE-rated norms over the board.
          </p>

          <h2>Reproduce the data</h2>
          <ul className="audit-list">
            {a.reproduce.map((r) => (
              <li key={r.command}>
                {r.what}
                <pre className="audit-cmd"><code>{r.command}</code></pre>
                {r.source && <a href={r.source} target="_blank" rel="noopener noreferrer">{r.source}</a>}
              </li>
            ))}
          </ul>
          <p className="muted">
            Puzzles are a deterministic sample of the Lichess puzzle database (CC0) built by <code>scripts/build-puzzles.py</code>:
            popularity ≥ 80, ≥ 200 plays, rating deviation ≤ 90, stratified by 100-point rating bucket with a per-theme cap.
          </p>

          <h2>Puzzles by rating</h2>
          <div className="table-wrap">
            <table className="table table-compact">
              <thead><tr><th scope="col">Rating</th><th scope="col" className="num">Puzzles</th></tr></thead>
              <tbody>{a.puzzles.byRating.map((b) => <tr key={b.from}><td>{b.from}–{b.to}</td><td className="num">{fmt(b.count)}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="muted">Also loaded: {fmt(a.openings.total)} named openings (Lichess, CC0) and {fmt(a.masterGames.total)} master games.</p>
          {a.lessons.loadWarnings.length > 0 && (
            <>
              <h2>Content load warnings</h2>
              <ul className="audit-list">{a.lessons.loadWarnings.map((w) => <li key={w}><code>{w}</code></li>)}</ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
