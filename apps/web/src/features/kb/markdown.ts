// Markdown rendering for knowledge-base docs: marked -> sanitised HTML with internal .md links rewritten to /kb routes,
// heading ids for the "On this page" rail, and external links opened in a new tab.
import { marked } from 'marked';

export interface Heading { id: string; text: string; level: number }

export const slugify = (s: string) =>
  s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-').slice(0, 80);

/** "03-chess-knowledge/tactics.md" -> "/kb/03-chess-knowledge/tactics" */
export const docRoute = (path: string, hash = '') => `/kb/${path.replace(/\.md$/, '')}${hash}`;

/** Resolve `href` relative to the directory of `docPath` (both inside knowledge-base/). Returns null when it leaves the KB. */
function resolveRelative(docPath: string, href: string): string | null {
  const base = new URL(`https://kb.invalid/${docPath}`);
  const u = new URL(href, base);
  if (u.host !== 'kb.invalid') return null;
  return decodeURIComponent(u.pathname.replace(/^\//, '')) + u.hash;
}

const BLOCKED = new Set(['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'STYLE', 'LINK', 'META', 'FORM', 'BASE']);

export function renderMarkdown(md: string, docPath: string): { html: string; headings: Heading[] } {
  const raw = marked.parse(md, { async: false, gfm: true }) as string;
  const doc = new DOMParser().parseFromString(`<div id="root">${raw}</div>`, 'text/html');
  const root = doc.getElementById('root')!;
  // sanitise: the KB is repository content, but keep the reader safe regardless
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (BLOCKED.has(el.tagName)) { el.remove(); continue; }
    for (const attr of Array.from(el.attributes)) {
      const n = attr.name.toLowerCase();
      if (n.startsWith('on') || n === 'style' || n === 'srcdoc') el.removeAttribute(attr.name);
      if ((n === 'href' || n === 'src') && /^\s*(javascript|vbscript|data):/i.test(attr.value) && !(n === 'src' && /^\s*data:image\//i.test(attr.value))) el.removeAttribute(attr.name);
    }
  }
  const headings: Heading[] = [];
  const used = new Set<string>();
  for (const h of Array.from(root.querySelectorAll('h1, h2, h3'))) {
    let id = slugify(h.textContent ?? '') || 'section';
    for (let i = 2; used.has(id); i++) id = `${slugify(h.textContent ?? '')}-${i}`;
    used.add(id);
    h.id = id;
    if (h.tagName !== 'H1') headings.push({ id, text: h.textContent ?? '', level: Number(h.tagName[1]) });
  }
  for (const a of Array.from(root.querySelectorAll('a[href]'))) {
    const href = a.getAttribute('href')!;
    if (/^(https?:)?\/\//i.test(href) || /^mailto:/i.test(href)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      continue;
    }
    if (href.startsWith('#')) continue;
    const target = resolveRelative(docPath, href);
    const [file, hash = ''] = (target ?? '').split('#');
    if (target && file.endsWith('.md')) {
      a.setAttribute('href', docRoute(file, hash ? `#${hash}` : ''));
      a.setAttribute('data-internal', '');
    } else {
      // a repository file outside the KB reader (scripts, JSON data): show the path, not a broken link
      const code = doc.createElement('code');
      code.textContent = a.textContent || href;
      code.title = `Repository file: ${target ? `knowledge-base/${target}` : href}`;
      a.replaceWith(code);
    }
  }
  for (const t of Array.from(root.querySelectorAll('table'))) {
    t.classList.add('table', 'table-compact');
    const wrap = doc.createElement('div');
    wrap.className = 'table-wrap';
    t.replaceWith(wrap);
    wrap.appendChild(t);
  }
  return { html: root.innerHTML, headings };
}

export function sectionLabel(section: string): string {
  if (!section) return 'General';
  const name = section.replace(/^\d+-/, '').replace(/-/g, ' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
}
