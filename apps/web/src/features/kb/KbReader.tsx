// Knowledge base reader: /kb (overview) and /kb/<section>/<doc> (document). Sidebar grouped by section folder.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, ClipboardCheck, Search } from 'lucide-react';
import { api } from '../../lib/api.ts';
import { docRoute, renderMarkdown, sectionLabel } from './markdown.ts';

export interface KbEntry { path: string; title: string; summary: string; section: string; lastReviewed?: string | null; sourcesCount?: number; citedSources?: number }
interface KbDoc { path: string; title: string; markdown: string; frontmatter: Record<string, unknown> }

let indexCache: Promise<KbEntry[]> | null = null;
export const loadKbIndex = () => (indexCache ??= api.kbIndex().then((x) => x as KbEntry[]).catch((e) => { indexCache = null; throw e; }));

function useKbIndex() {
  const [index, setIndex] = useState<KbEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { loadKbIndex().then(setIndex, (e: Error) => setError(e.message)); }, []);
  return { index, error };
}

function groupBySection(entries: KbEntry[]): [string, KbEntry[]][] {
  const m = new Map<string, KbEntry[]>();
  for (const e of entries) m.set(e.section, [...(m.get(e.section) ?? []), e]);
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([s, list]) => [s, list.sort((x, y) => (x.path.endsWith('README.md') ? -1 : y.path.endsWith('README.md') ? 1 : x.title.localeCompare(y.title)))]);
}

function Sidebar({ index, current }: { index: KbEntry[]; current?: string }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return index;
    return index.filter((e) => `${e.title} ${e.summary} ${e.path}`.toLowerCase().includes(t));
  }, [index, q]);
  const groups = groupBySection(filtered);
  return (
    <nav className="layout-reader__toc kb-toc" aria-label="Knowledge base">
      <div className="field kb-search">
        <label className="label" htmlFor="kb-search">Search the knowledge base</label>
        <div className="kb-search__box">
          <Search aria-hidden size={16} />
          <input id="kb-search" className="input" type="search" value={q} placeholder="Title or topic" onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <ul className="nav">
        <li><NavLink className="nav__item" to="/kb" end><BookOpen aria-hidden size={18} /> Overview</NavLink></li>
        <li><NavLink className="nav__item" to="/audit"><ClipboardCheck aria-hidden size={18} /> Audit report</NavLink></li>
      </ul>
      {groups.map(([section, list]) => (
        <div key={section} className="kb-toc__group">
          <p className="nav__heading">{sectionLabel(section)}</p>
          <ul className="nav">
            {list.map((e) => (
              <li key={e.path}>
                <Link className="nav__item kb-toc__item" to={docRoute(e.path)} aria-current={current === e.path ? 'page' : undefined} title={e.summary || e.title}>
                  {e.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {!groups.length && <p className="muted kb-toc__none">No documents match "{q}".</p>}
    </nav>
  );
}

export function KbOverview() {
  const { index, error } = useKbIndex();
  return (
    <div className="layout-reader kb">
      {index ? <Sidebar index={index} /> : <div className="layout-reader__toc" />}
      <article className="kb-main">
        <h1>Knowledge base</h1>
        <p className="kb-lead">
          The research behind Grim Chess: learning science, training methods, chess knowledge, assessment and the curriculum.
          Every claim cites its sources, and each document records when it was last reviewed.
          The <Link to="/audit">audit report</Link> shows how the curriculum, lessons and puzzles cover the skill graph.
        </p>
        {error && <p className="error" role="alert">Could not load the knowledge base: {error}</p>}
        {!index && !error && <div className="skeleton kb-skeleton" aria-busy="true" />}
        {index && groupBySection(index).map(([section, list]) => (
          <section key={section} className="kb-section">
            <h2>{sectionLabel(section)}</h2>
            <ul className="kb-cards">
              {list.map((e) => (
                <li key={e.path} className="card card-interactive kb-card">
                  <Link to={docRoute(e.path)} className="kb-card__link">
                    <span className="card__title">{e.title}</span>
                  </Link>
                  {e.summary && <p className="card__subtitle kb-card__summary">{e.summary}</p>}
                  <p className="kb-meta">
                    {e.lastReviewed ? <>Reviewed <time dateTime={e.lastReviewed}>{e.lastReviewed}</time></> : 'Not yet reviewed'}
                    {(e.citedSources ?? 0) > 0 && <span className="badge badge-outline">{e.citedSources} cited sources</span>}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </article>
    </div>
  );
}

export function KbDocPage() {
  const params = useParams();
  const splat = params['*'] ?? '';
  const path = splat.endsWith('.md') ? splat : `${splat}.md`;
  const nav = useNavigate();
  const loc = useLocation();
  const { index } = useKbIndex();
  const [doc, setDoc] = useState<KbDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setDoc(null); setError(null);
    api.kbDoc(path).then((d) => { if (live) setDoc(d); }, (e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [path]);

  const rendered = useMemo(() => (doc ? renderMarkdown(doc.markdown, doc.path) : null), [doc]);

  useEffect(() => {
    if (!rendered) return;
    if (loc.hash) document.getElementById(decodeURIComponent(loc.hash.slice(1)))?.scrollIntoView();
    else window.scrollTo(0, 0);
    document.title = `${doc?.title ?? 'Knowledge base'} | Grim Chess`;
  }, [rendered, loc.hash, doc?.title]);

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = a.getAttribute('href') ?? '';
    if (a.hasAttribute('data-internal')) { e.preventDefault(); nav(href); }
    else if (href.startsWith('#')) { e.preventDefault(); nav({ hash: href }, { replace: true }); document.getElementById(href.slice(1))?.scrollIntoView(); }
  };

  const fm = doc?.frontmatter ?? {};
  const sources = Array.isArray(fm.sources) ? (fm.sources as unknown[]).map(String) : [];
  const cited = typeof fm.citedSources === 'number' ? fm.citedSources : 0;
  const summary = typeof fm.summary === 'string' ? fm.summary : '';
  const reviewed = fm.last_reviewed ? String(fm.last_reviewed) : null;
  const section = path.includes('/') ? path.split('/')[0] : '';

  return (
    <div className="layout-reader kb">
      {index ? <Sidebar index={index} current={path} /> : <div className="layout-reader__toc" />}
      <article className="kb-main">
        <p className="kb-crumbs"><Link to="/kb">Knowledge base</Link> / {sectionLabel(section)}</p>
        {error && (
          <div className="empty">
            <p className="empty__title">Document not found</p>
            <p className="muted">{error}. <Link to="/kb">Back to the overview</Link></p>
          </div>
        )}
        {!doc && !error && <div className="skeleton kb-skeleton" aria-busy="true" />}
        {doc && rendered && (
          <>
            <header className="kb-docmeta">
              {summary && <p className="kb-lead">{summary}</p>}
              <p className="kb-meta">
                {reviewed ? <>Last reviewed <time dateTime={reviewed}>{reviewed}</time></> : <span className="badge badge-warning">Not yet reviewed</span>}
                <span className="badge badge-outline">{sources.length} listed sources</span>
                {cited > 0 && <span className="badge badge-outline">{cited} numbered references</span>}
                <span className="kb-path" title="Path in the repository">knowledge-base/{doc.path}</span>
              </p>
            </header>
            <div ref={bodyRef} className="prose kb-prose" onClick={onClick} dangerouslySetInnerHTML={{ __html: rendered.html }} />
          </>
        )}
      </article>
      <aside className="layout-reader__aside kb-aside" aria-label="On this page">
        {rendered && rendered.headings.length > 0 && (
          <>
            <p className="nav__heading">On this page</p>
            <ul className="kb-onpage">
              {rendered.headings.filter((h) => h.level === 2).map((h) => (
                <li key={h.id}><a href={`#${h.id}`} onClick={(e) => { e.preventDefault(); nav({ hash: h.id }, { replace: true }); document.getElementById(h.id)?.scrollIntoView(); }}>{h.text}</a></li>
              ))}
            </ul>
          </>
        )}
        {sources.length > 0 && (
          <>
            <p className="nav__heading">Sources (front matter)</p>
            <ol className="kb-sources">{sources.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </>
        )}
      </aside>
    </div>
  );
}
