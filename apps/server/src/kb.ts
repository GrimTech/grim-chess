// Knowledge base (knowledge-base/**/*.md): index, documents with YAML front matter, and the audit report.
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { DB } from './db.ts';
import { HttpError } from './http.ts';
import type { Curriculum } from './curriculum.ts';
import { walk } from './curriculum.ts';

export type FrontMatter = Record<string, unknown>;

function scalar(v: string): unknown {
  const s = v.trim();
  if (s === '') return '';
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1).replace(/\\"/g, '"');
  if (s.startsWith('[') && s.endsWith(']')) return s.slice(1, -1).split(',').map((x) => scalar(x)).filter((x) => x !== '');
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s === 'true' || s === 'false') return s === 'true';
  if (s === 'null' || s === '~') return null;
  return s;
}

/** Parse a simple YAML front matter block: `key: value`, `key:` followed by `  - item` lists, inline [a, b] lists. */
export function parseFrontMatter(text: string): { frontmatter: FrontMatter; body: string } {
  const src = text.replace(/^\uFEFF/, '');
  const m = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(src);
  if (!m) return { frontmatter: {}, body: src };
  const fm: FrontMatter = {};
  let listKey: string | null = null;
  for (const raw of m[1].split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const item = /^\s+-\s+(.*)$/.exec(raw) ?? /^-\s+(.*)$/.exec(raw);
    if (item && listKey) { (fm[listKey] as unknown[]).push(scalar(item[1])); continue; }
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(raw);
    if (kv) {
      if (kv[2].trim() === '' || kv[2].trim() === '|' || kv[2].trim() === '>') { fm[kv[1]] = []; listKey = kv[1]; }
      else { fm[kv[1]] = scalar(kv[2]); listKey = null; }
    }
  }
  for (const [k, v] of Object.entries(fm)) if (Array.isArray(v) && v.length === 0) fm[k] = '';
  return { frontmatter: fm, body: src.slice(m[0].length) };
}

const URL_REF = /^\s*(?:\d+\.|\[\d+\])\s+.*https?:\/\//;
const URL_RE = /https?:\/\/[^\s)>\]"'`]+/g;

export interface KbEntry {
  path: string; title: string; summary: string; section: string;
  lastReviewed: string | null; sourcesCount: number; citedSources: number; words: number;
}

interface KbDocCache { entry: KbEntry; markdown: string; frontmatter: FrontMatter; urls: string[] }

export class KnowledgeBase {
  dir: string;
  private cache = new Map<string, { mtime: number; doc: KbDocCache }>();
  constructor(dir: string) { this.dir = dir; }

  private files(): string[] {
    return walk(this.dir, (n) => n.endsWith('.md')).map((f) => path.relative(this.dir, f).split(path.sep).join('/'));
  }

  private load(rel: string): KbDocCache | null {
    const full = path.join(this.dir, rel);
    let st;
    try { st = statSync(full); } catch { return null; }
    const hit = this.cache.get(rel);
    if (hit && hit.mtime === st.mtimeMs) return hit.doc;
    const text = readFileSync(full, 'utf8');
    const { frontmatter, body } = parseFrontMatter(text);
    const heading = /^#\s+(.+)$/m.exec(body)?.[1]?.trim();
    const sources = frontmatter.sources;
    const lines = body.split(/\r?\n/);
    const cited = lines.filter((l) => URL_REF.test(l)).length;
    const lr = frontmatter.last_reviewed;
    const doc: KbDocCache = {
      entry: {
        path: rel,
        title: String(frontmatter.title ?? heading ?? path.basename(rel, '.md')),
        summary: String(frontmatter.summary ?? ''),
        section: rel.includes('/') ? rel.split('/')[0] : '',
        lastReviewed: lr === undefined || lr === null || lr === '' ? null : String(lr),
        sourcesCount: Array.isArray(sources) ? sources.length : sources ? 1 : 0,
        citedSources: cited,
        words: body.split(/\s+/).filter(Boolean).length,
      },
      markdown: body, frontmatter, urls: [...new Set(body.match(URL_RE) ?? [])],
    };
    this.cache.set(rel, { mtime: st.mtimeMs, doc });
    return doc;
  }

  index(): KbEntry[] {
    return this.files().map((f) => this.load(f)?.entry).filter((e): e is KbEntry => !!e);
  }

  /** Path-traversal safe: only .md files that exist inside the knowledge-base directory. */
  doc(p: string | null): { path: string; title: string; markdown: string; frontmatter: FrontMatter } {
    if (!p) throw new HttpError(400, 'path is required');
    const rel = p.replace(/\\/g, '/').replace(/^\/+/, '').replace(/#.*$/, '');
    if (!rel.endsWith('.md') || rel.split('/').some((seg) => seg === '..' || seg === '.' || seg === '') || rel.includes('\0')) throw new HttpError(400, 'Invalid path');
    const full = path.resolve(this.dir, rel);
    if (!full.startsWith(path.resolve(this.dir) + path.sep) || !existsSync(full)) throw new HttpError(404, 'Not found');
    const d = this.load(rel);
    if (!d) throw new HttpError(404, 'Not found');
    return { path: rel, title: d.entry.title, markdown: d.markdown, frontmatter: { ...d.frontmatter, sourcesCount: d.entry.sourcesCount, citedSources: d.entry.citedSources } };
  }

  allDocs(): KbDocCache[] {
    return this.files().map((f) => this.load(f)).filter((d): d is KbDocCache => !!d);
  }
}

// ---------- audit ----------
export function buildAudit(db: DB, kb: KnowledgeBase, cur: Curriculum, rootDir: string): Record<string, unknown> {
  const graph = cur.graph;
  const skillIds = new Set(graph.skills.map((s) => s.id));
  const lessonsBySkill = new Map<string, string[]>();
  const lessonsWithUnknownSkills: { lessonId: string; file: string; unknown: string[] }[] = [];
  for (const l of cur.lessons.values()) {
    const unknown: string[] = [];
    for (const s of l.skillIds ?? []) {
      if (!skillIds.has(s)) unknown.push(s);
      const list = lessonsBySkill.get(s) ?? [];
      list.push(l.id);
      lessonsBySkill.set(s, list);
    }
    if (unknown.length) lessonsWithUnknownSkills.push({ lessonId: l.id, file: cur.lessonFiles.get(l.id) ?? '', unknown });
  }
  const themeCount = new Map((db.prepare('SELECT theme, COUNT(*) AS n FROM puzzle_themes GROUP BY theme').all() as { theme: string; n: number }[]).map((r) => [r.theme, r.n]));
  const distinctForThemes = (themes: string[]): number => {
    const t = themes.filter((x) => themeCount.has(x));
    if (!t.length) return 0;
    if (t.length === 1) return themeCount.get(t[0])!;
    return (db.prepare(`SELECT COUNT(DISTINCT puzzle_id) AS n FROM puzzle_themes WHERE theme IN (${t.map(() => '?').join(',')})`).get(...t) as { n: number }).n;
  };
  const kbFiles = new Set(kb.index().map((e) => e.path));
  const skills = graph.skills.map((s) => {
    const lessons = lessonsBySkill.get(s.id) ?? [];
    const kbFile = s.kbRef ? `03-chess-knowledge/${s.kbRef.split('#')[0]}` : null;
    return {
      id: s.id, name: s.name, domain: s.domain, stage: s.stage, lessons: lessons.length, lessonIds: lessons,
      puzzles: distinctForThemes(s.lichessThemes ?? []), lichessThemes: s.lichessThemes ?? [],
      unknownThemes: (s.lichessThemes ?? []).filter((t) => !themeCount.has(t)),
      exerciseTypes: s.exerciseTypes ?? [], kbRef: s.kbRef ?? null, kbRefExists: kbFile ? kbFiles.has(kbFile) : null,
      missingPrereqs: (s.prereqs ?? []).filter((p) => !skillIds.has(p)),
    };
  });
  const stages = graph.stages.length ? graph.stages.map((s) => s.id) : [...new Set(graph.skills.map((s) => s.stage))].sort((a, b) => a - b);
  const domains = graph.domains.length ? graph.domains : [...new Set(graph.skills.map((s) => s.domain))];
  const cells = [];
  for (const stage of stages) for (const domain of domains) {
    const ss = skills.filter((s) => s.stage === stage && s.domain === domain);
    const lessonIds = new Set(ss.flatMap((s) => s.lessonIds));
    cells.push({
      stage, domain, skills: ss.length, skillsWithLessons: ss.filter((s) => s.lessons > 0).length, lessons: lessonIds.size,
      puzzles: distinctForThemes([...new Set(ss.flatMap((s) => s.lichessThemes))]),
    });
  }
  const exerciseTypeCounts: Record<string, number> = {};
  for (const s of skills) for (const t of s.exerciseTypes) exerciseTypeCounts[t] = (exerciseTypeCounts[t] ?? 0) + 1;

  const docs = kb.allDocs();
  const bySection: Record<string, number> = {};
  for (const d of docs) bySection[d.entry.section || '(root)'] = (bySection[d.entry.section || '(root)'] ?? 0) + 1;
  const reviewed = docs.map((d) => d.entry.lastReviewed).filter((x): x is string => !!x).sort();
  const lessonsByTrack: Record<string, number> = {};
  const lessonsByStage: Record<string, number> = {};
  for (const l of cur.index) {
    lessonsByTrack[l.track] = (lessonsByTrack[l.track] ?? 0) + 1;
    lessonsByStage[`${l.track}:${l.stage}`] = (lessonsByStage[`${l.track}:${l.stage}`] ?? 0) + 1;
  }
  const buckets = db.prepare('SELECT (rating / 200) * 200 AS bucket, COUNT(*) AS n FROM puzzles GROUP BY bucket ORDER BY bucket').all() as { bucket: number; n: number }[];
  const puzzleTotal = (db.prepare('SELECT COUNT(*) AS n FROM puzzles').get() as { n: number }).n;
  const benchFile = path.join(rootDir, 'data/benchmarks.json');
  let benchmarks: Record<string, unknown> = { present: false, path: 'data/benchmarks.json' };
  if (existsSync(benchFile)) {
    try {
      const b = JSON.parse(readFileSync(benchFile, 'utf8'));
      const bands = Array.isArray(b) ? b.length : Array.isArray(b?.bands) ? b.bands.length : Object.keys(b ?? {}).length;
      benchmarks = { present: true, path: 'data/benchmarks.json', entries: bands };
    } catch (e) { benchmarks = { present: true, path: 'data/benchmarks.json', error: (e as Error).message }; }
  }
  const auditDocs = docs.filter((d) => d.entry.section === '00-audit' || /method|claim|measurement|source/i.test(d.entry.path)).map((d) => ({ path: d.entry.path, title: d.entry.title }));

  return {
    generatedAt: new Date().toISOString(),
    skillGraph: { present: cur.graphPresent, version: graph.version, skills: graph.skills.length, stages: graph.stages, domains },
    skills,
    coverage: { stages, domains, cells },
    gaps: {
      skillsWithoutLessons: skills.filter((s) => s.lessons === 0).map((s) => ({ id: s.id, name: s.name, stage: s.stage, domain: s.domain })),
      skillsWithoutPuzzles: skills.filter((s) => s.puzzles === 0 && s.lichessThemes.length > 0).map((s) => ({ id: s.id, name: s.name, themes: s.lichessThemes })),
      skillsWithoutThemes: skills.filter((s) => s.lichessThemes.length === 0).map((s) => s.id),
      lessonsWithUnknownSkills,
      brokenKbRefs: skills.filter((s) => s.kbRefExists === false).map((s) => ({ id: s.id, kbRef: s.kbRef })),
      missingPrereqs: skills.filter((s) => s.missingPrereqs.length).map((s) => ({ id: s.id, missing: s.missingPrereqs })),
      kbFilesWithoutSources: docs.filter((d) => d.entry.sourcesCount === 0 && d.entry.citedSources === 0).map((d) => d.entry.path),
      kbFilesNotReviewed: docs.filter((d) => !d.entry.lastReviewed).map((d) => d.entry.path),
    },
    exerciseTypes: exerciseTypeCounts,
    lessons: { total: cur.index.length, byTrack: lessonsByTrack, byStage: lessonsByStage, loadWarnings: cur.warnings },
    puzzles: { total: puzzleTotal, themes: themeCount.size, byRating: buckets.map((b) => ({ from: b.bucket, to: b.bucket + 199, count: b.n })) },
    openings: { total: cur.openings().length },
    masterGames: { total: cur.games.length },
    kb: {
      files: docs.length, bySection,
      citedSources: docs.reduce((s, d) => s + d.entry.citedSources, 0),
      frontMatterSources: docs.reduce((s, d) => s + d.entry.sourcesCount, 0),
      uniqueUrls: new Set(docs.flatMap((d) => d.urls)).size,
      words: docs.reduce((s, d) => s + d.entry.words, 0),
      lastReviewed: { oldest: reviewed[0] ?? null, newest: reviewed[reviewed.length - 1] ?? null },
      perFile: docs.map((d) => ({ path: d.entry.path, title: d.entry.title, lastReviewed: d.entry.lastReviewed, sources: d.entry.sourcesCount, citedSources: d.entry.citedSources })),
    },
    benchmarks,
    methodologyDocs: auditDocs,
    reproduce: [
      { what: 'Puzzle sample (Lichess CC0 puzzle DB, deterministic)', command: 'python -I scripts/build-puzzles.py lichess_db_puzzle.csv.zst data/puzzles.csv.gz', source: 'https://database.lichess.org/#puzzles' },
      { what: 'Content validation (skill graph + lessons)', command: 'npm run validate:content' },
      { what: 'This report', command: 'GET /api/kb/audit' },
    ],
  };
}
