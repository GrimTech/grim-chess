// Curriculum content loaded from disk: skill graph, lessons, openings (Lichess TSV) and master games (PGN).
// Loaded once at startup; missing files are tolerated (content is written by other agents).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';
import type { Lesson, LessonIndexEntry, SkillGraph } from '@grim/core';

export interface OpeningEntry { eco: string; name: string; pgn: string; uci?: string[]; family: string }
export interface MasterGame { id: string; white: string; black: string; event: string; year: number | null; result: string; eco: string; pgn: string }

export function walk(dir: string, filter: (f: string) => boolean, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, filter, out);
    else if (filter(name)) out.push(full);
  }
  return out;
}

const EMPTY_GRAPH: SkillGraph = { version: '0', domains: [], stages: [], skills: [] };

export class Curriculum {
  rootDir: string;
  graph: SkillGraph = EMPTY_GRAPH;
  graphPresent = false;
  lessons = new Map<string, Lesson>();
  lessonFiles = new Map<string, string>();
  index: LessonIndexEntry[] = [];
  games: MasterGame[] = [];
  private openingsCache: OpeningEntry[] | null = null;
  warnings: string[] = [];

  constructor(rootDir: string) { this.rootDir = rootDir; this.load(); }

  load(): void {
    this.warnings = [];
    const graphFile = path.join(this.rootDir, 'knowledge-base/03-chess-knowledge/skill-graph.json');
    this.graph = EMPTY_GRAPH;
    this.graphPresent = false;
    if (existsSync(graphFile)) {
      try {
        const g = JSON.parse(readFileSync(graphFile, 'utf8')) as SkillGraph;
        this.graph = { ...EMPTY_GRAPH, ...g, skills: Array.isArray(g.skills) ? g.skills : [] };
        this.graphPresent = true;
      } catch (e) { this.warnings.push(`skill-graph.json: ${(e as Error).message}`); }
    }
    this.lessons.clear();
    this.lessonFiles.clear();
    for (const f of walk(path.join(this.rootDir, 'content/lessons'), (n) => n.endsWith('.json'))) {
      try {
        const l = JSON.parse(readFileSync(f, 'utf8')) as Lesson;
        if (!l || typeof l.id !== 'string' || !Array.isArray(l.steps)) { this.warnings.push(`${f}: not a lesson`); continue; }
        if (this.lessons.has(l.id)) this.warnings.push(`${f}: duplicate lesson id ${l.id}`);
        this.lessons.set(l.id, l);
        this.lessonFiles.set(l.id, path.relative(this.rootDir, f).split(path.sep).join('/'));
      } catch (e) { this.warnings.push(`${f}: ${(e as Error).message}`); }
    }
    this.index = [...this.lessons.values()]
      .map((l): LessonIndexEntry => ({
        id: l.id, track: l.track, stage: l.stage, order: l.order, title: l.title, summary: l.summary,
        skillIds: l.skillIds ?? [], estMinutes: l.estMinutes, ...(l.minAge !== undefined ? { minAge: l.minAge } : {}),
      }))
      .sort((a, b) => (a.track < b.track ? -1 : a.track > b.track ? 1 : a.stage - b.stage || a.order - b.order || a.id.localeCompare(b.id)));
    this.games = loadGames(path.join(this.rootDir, 'content/games'));
    this.openingsCache = null;
    for (const w of this.warnings) console.warn(`[curriculum] ${w}`);
  }

  openings(): OpeningEntry[] {
    if (!this.openingsCache) this.openingsCache = loadOpenings(path.join(this.rootDir, 'content/openings'));
    return this.openingsCache;
  }
}

/** "1. e4 e5 2. Nf3" -> ["e4","e5","Nf3"] */
export function sanTokens(pgn: string): string[] {
  return pgn
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\$\d+/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.(\.\.)?/, ''))
    .filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
}

export function loadOpenings(dir: string): OpeningEntry[] {
  const out: OpeningEntry[] = [];
  // Openings share long move prefixes; memoise positions per prefix so each distinct position is computed once.
  const memo = new Map<string, { fen: string; uci: string[] } | null>([['', { fen: new Chess().fen(), uci: [] }]]);
  const resolve = (tokens: string[]): string[] | undefined => {
    let i = tokens.length;
    while (i > 0 && !memo.has(tokens.slice(0, i).join(' '))) i--;
    let state = memo.get(tokens.slice(0, i).join(' '));
    if (!state) return undefined;
    const c = new Chess(state.fen);
    const uci = [...state.uci];
    for (; i < tokens.length; i++) {
      try {
        const m = c.move(tokens[i]);
        uci.push(m.from + m.to + (m.promotion ?? ''));
        state = { fen: c.fen(), uci: [...uci] };
      } catch { memo.set(tokens.slice(0, i + 1).join(' '), null); return undefined; }
      memo.set(tokens.slice(0, i + 1).join(' '), state);
    }
    return uci;
  };
  for (const letter of ['a', 'b', 'c', 'd', 'e']) {
    const f = path.join(dir, `${letter}.tsv`);
    if (!existsSync(f)) continue;
    const lines = readFileSync(f, 'utf8').split(/\r?\n/);
    const header = lines[0].split('\t');
    const ie = header.indexOf('eco'), iname = header.indexOf('name'), ipgn = header.indexOf('pgn');
    if (ie < 0 || iname < 0 || ipgn < 0) continue;
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const cols = line.split('\t');
      const name = cols[iname] ?? '';
      const entry: OpeningEntry = { eco: cols[ie] ?? '', name, pgn: cols[ipgn] ?? '', family: name.split(':')[0].trim() };
      const uci = resolve(sanTokens(entry.pgn));
      if (uci) entry.uci = uci;
      out.push(entry);
    }
  }
  return out;
}

function parseHeaders(block: string): Record<string, string> {
  const h: Record<string, string> = {};
  for (const m of block.matchAll(/^\s*\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/gm)) h[m[1]] = m[2].replace(/\\(.)/g, '$1');
  return h;
}

export function splitPgn(text: string): string[] {
  const games: string[] = [];
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  let cur: string[] = [];
  let inMoves = false;
  for (const line of lines) {
    const isHeader = /^\s*\[\w+\s+".*"\]\s*$/.test(line);
    if (isHeader && inMoves) { if (cur.join('').trim()) games.push(cur.join('\n').trim()); cur = []; inMoves = false; }
    if (!isHeader && line.trim()) inMoves = true;
    cur.push(line);
  }
  if (cur.join('').trim()) games.push(cur.join('\n').trim());
  return games;
}

export function loadGames(dir: string): MasterGame[] {
  const out: MasterGame[] = [];
  for (const f of walk(dir, (n) => n.toLowerCase().endsWith('.pgn'))) {
    const base = path.basename(f, path.extname(f)).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let text: string;
    try { text = readFileSync(f, 'utf8'); } catch { continue; }
    splitPgn(text).forEach((pgn, i) => {
      const h = parseHeaders(pgn);
      const year = /^(\d{4})/.exec(h.Date ?? '')?.[1];
      out.push({
        id: `${base}-${i + 1}`, white: h.White ?? '?', black: h.Black ?? '?', event: h.Event ?? '',
        year: year ? Number(year) : null, result: h.Result ?? '*', eco: h.ECO ?? '', pgn,
      });
    });
  }
  return out;
}
