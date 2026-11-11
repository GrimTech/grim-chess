// Puzzle store: imports data/puzzles.csv.gz (Lichess CC0 sample) into SQLite once, then serves
// adaptive / theme / review (FSRS-due) / woodpecker (fixed per-user set) selections.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import type { Puzzle } from '@grim/core';
import type { DB } from './db.ts';
import { getMeta, setMeta, tx } from './db.ts';
import { HttpError } from './http.ts';
import { getRating } from './store.ts';

interface PuzzleRow { id: string; fen: string; moves: string; rating: number; rd: number; popularity: number; plays: number; themes: string; openings: string; game_url: string }

export const toPuzzle = (r: PuzzleRow): Puzzle => ({
  id: r.id, fen: r.fen, moves: r.moves.split(' ').filter(Boolean), rating: r.rating, rd: r.rd, popularity: r.popularity, plays: r.plays,
  themes: r.themes.split(' ').filter(Boolean), openings: r.openings.split(' ').filter(Boolean), gameUrl: r.game_url,
});

/** Minimal RFC 4180 CSV line parser (quoted fields, doubled quotes). */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Import the CSV if the table is empty or the source file changed. Returns the number of puzzles in the DB. */
export function importPuzzles(db: DB, csvPath: string, log = console.log): number {
  const count = () => (db.prepare('SELECT COUNT(*) AS n FROM puzzles').get() as { n: number }).n;
  if (!existsSync(csvPath)) { log(`[puzzles] ${csvPath} not found; puzzle endpoints will be empty`); return count(); }
  const st = statSync(csvPath);
  const sig = `${st.size}:${Math.floor(st.mtimeMs)}`;
  if (getMeta(db, 'puzzles_source') === sig && count() > 0) return count();
  const t0 = Date.now();
  let buf = readFileSync(csvPath);
  if (csvPath.endsWith('.gz')) buf = gunzipSync(buf);
  const lines = buf.toString('utf8').split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const col = (n: string) => header.indexOf(n);
  const ix = { id: col('id'), fen: col('fen'), moves: col('moves'), rating: col('rating'), rd: col('rd'), popularity: col('popularity'), plays: col('plays'), themes: col('themes'), openings: col('openings'), gameUrl: col('gameUrl') };
  if (ix.id < 0 || ix.fen < 0 || ix.moves < 0 || ix.rating < 0) throw new Error(`[puzzles] unexpected CSV header: ${lines[0]}`);
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const c = line.includes('"') ? parseCsvLine(line) : line.split(',');
    if (!c[ix.id] || !Number.isFinite(Number(c[ix.rating]))) continue;
    rows.push(c);
  }
  const themeRows: [string, string, number][] = [];
  for (const c of rows) for (const t of (c[ix.themes] ?? '').trim().split(' ')) if (t) themeRows.push([t, c[ix.id], Number(c[ix.rating])]);
  // Inserting in primary-key order (and building secondary indexes afterwards) is several times faster.
  rows.sort((a, b) => (a[ix.id] < b[ix.id] ? -1 : a[ix.id] > b[ix.id] ? 1 : 0));
  themeRows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  tx(db, () => {
    db.exec(`DROP INDEX IF EXISTS puzzles_rating; DROP INDEX IF EXISTS puzzle_themes_rating; DROP INDEX IF EXISTS puzzle_themes_puzzle;
      DELETE FROM puzzle_themes; DELETE FROM puzzles;`);
    const ins = db.prepare('INSERT OR REPLACE INTO puzzles (id, fen, moves, rating, rd, popularity, plays, themes, openings, game_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const c of rows) {
      ins.run(c[ix.id], c[ix.fen], c[ix.moves], Number(c[ix.rating]), Number(c[ix.rd]) || 75, Number(c[ix.popularity]) || 0, Number(c[ix.plays]) || 0,
        (c[ix.themes] ?? '').trim(), (c[ix.openings] ?? '').trim(), c[ix.gameUrl] ?? '');
    }
    const insT = db.prepare('INSERT OR IGNORE INTO puzzle_themes (theme, puzzle_id, rating) VALUES (?, ?, ?)');
    for (const t of themeRows) insT.run(t[0], t[1], t[2]);
    db.exec(`CREATE INDEX IF NOT EXISTS puzzles_rating ON puzzles(rating);
      CREATE INDEX IF NOT EXISTS puzzle_themes_rating ON puzzle_themes(theme, rating);
      CREATE INDEX IF NOT EXISTS puzzle_themes_puzzle ON puzzle_themes(puzzle_id);`);
    setMeta(db, 'puzzles_source', sig);
  });
  db.exec('ANALYZE');
  const n = count();
  log(`[puzzles] imported ${n} puzzles in ${Date.now() - t0} ms`);
  return n;
}

export type PuzzleMode = 'adaptive' | 'theme' | 'review' | 'woodpecker';
export interface PuzzleQuery { themes: string[]; min?: number; max?: number }

export const WOODPECKER_SIZE = 100;

export class Puzzles {
  db: DB;
  constructor(db: DB) { this.db = db; }

  count(): number { return (this.db.prepare('SELECT COUNT(*) AS n FROM puzzles').get() as { n: number }).n; }

  get(id: string): Puzzle | null {
    const r = this.db.prepare('SELECT * FROM puzzles WHERE id = ?').get(id) as PuzzleRow | undefined;
    return r ? toPuzzle(r) : null;
  }

  themes(): { theme: string; count: number }[] {
    return this.db.prepare('SELECT theme, COUNT(*) AS count FROM puzzle_themes GROUP BY theme ORDER BY count DESC, theme').all() as { theme: string; count: number }[];
  }

  /** Random puzzles in [lo, hi] matching any of `themes`, optionally excluding puzzles the user has attempted. */
  private pick(lo: number, hi: number, themes: string[], limit: number, unseenFor: string | null): Puzzle[] {
    const args: (string | number)[] = [];
    let sql: string;
    if (themes.length) {
      sql = `SELECT p.* FROM puzzles p WHERE p.id IN (SELECT puzzle_id FROM puzzle_themes WHERE theme IN (${themes.map(() => '?').join(',')}) AND rating BETWEEN ? AND ?)`;
      args.push(...themes, lo, hi);
    } else {
      sql = 'SELECT p.* FROM puzzles p WHERE p.rating BETWEEN ? AND ?';
      args.push(lo, hi);
    }
    if (unseenFor) { sql += ' AND NOT EXISTS (SELECT 1 FROM puzzle_attempts a WHERE a.user_id = ? AND a.puzzle_id = p.id)'; args.push(unseenFor); }
    sql += ' ORDER BY random() LIMIT ?';
    args.push(limit);
    return (this.db.prepare(sql).all(...args) as unknown as PuzzleRow[]).map(toPuzzle);
  }

  /** Adaptive selection: unseen puzzles within ±150 of the user's puzzle rating, widening until something is found. */
  adaptive(userId: string, q: PuzzleQuery): Puzzle | null {
    if (q.min !== undefined || q.max !== undefined) {
      const lo = q.min ?? 0, hi = q.max ?? 4000;
      return this.pick(lo, hi, q.themes, 1, userId)[0] ?? this.pick(lo, hi, q.themes, 1, null)[0] ?? null;
    }
    const target = Math.round(getRating(this.db, userId, 'puzzle').rating);
    for (const w of [150, 300, 600, 1200, 4000]) {
      const p = this.pick(target - w, target + w, q.themes, 1, userId)[0];
      if (p) return p;
    }
    // everything nearby seen: allow repeats, closest window first
    for (const w of [150, 600, 4000]) {
      const p = this.pick(target - w, target + w, q.themes, 1, null)[0];
      if (p) return p;
    }
    return null;
  }

  /** The earliest-due puzzle SRS card's puzzle. */
  review(userId: string): Puzzle | null {
    const rows = this.db.prepare("SELECT card_id FROM srs_cards WHERE user_id = ? AND kind = 'puzzle' AND due <= ? ORDER BY due LIMIT 20").all(userId, new Date().toISOString()) as { card_id: string }[];
    for (const r of rows) {
      const p = this.get(r.card_id.replace(/^puzzle:/, ''));
      if (p) return p;
    }
    return null;
  }

  set(q: PuzzleQuery & { count: number }): Puzzle[] {
    const lo = q.min ?? 0, hi = q.max ?? 4000;
    return this.pick(lo, hi, q.themes, q.count, null).sort((a, b) => a.rating - b.rating);
  }

  /** Woodpecker method: a fixed set solved in repeated cycles. Created on first use slightly below the user's rating. */
  ensureWoodpeckerSet(userId: string, q: PuzzleQuery, size = WOODPECKER_SIZE): void {
    const has = this.db.prepare('SELECT 1 FROM woodpecker WHERE user_id = ?').get(userId);
    if (has) return;
    const r = Math.round(getRating(this.db, userId, 'puzzle').rating);
    let set = this.pick(q.min ?? r - 250, q.max ?? r + 50, q.themes, size, userId);
    if (set.length < size) set = this.pick(q.min ?? r - 600, q.max ?? r + 300, q.themes, size, null);
    set.sort((a, b) => a.rating - b.rating);
    tx(this.db, () => {
      this.db.prepare('INSERT INTO woodpecker (user_id, cycle, created_at) VALUES (?, 1, ?)').run(userId, new Date().toISOString());
      const ins = this.db.prepare('INSERT INTO woodpecker_set (user_id, position, puzzle_id, done_cycle) VALUES (?, ?, ?, 0)');
      set.forEach((p, i) => ins.run(userId, i, p.id));
    });
  }

  resetWoodpecker(userId: string): void {
    tx(this.db, () => {
      this.db.prepare('DELETE FROM woodpecker_set WHERE user_id = ?').run(userId);
      this.db.prepare('DELETE FROM woodpecker WHERE user_id = ?').run(userId);
    });
  }

  woodpecker(userId: string, q: PuzzleQuery): Puzzle | null {
    this.ensureWoodpeckerSet(userId, q);
    const state = this.db.prepare('SELECT cycle FROM woodpecker WHERE user_id = ?').get(userId) as { cycle: number };
    const next = () => this.db.prepare('SELECT puzzle_id FROM woodpecker_set WHERE user_id = ? AND done_cycle < ? ORDER BY position LIMIT 1').get(userId, state.cycle) as { puzzle_id: string } | undefined;
    let row = next();
    if (!row) {
      const total = (this.db.prepare('SELECT COUNT(*) AS n FROM woodpecker_set WHERE user_id = ?').get(userId) as { n: number }).n;
      if (!total) return null;
      state.cycle++;
      this.db.prepare('UPDATE woodpecker SET cycle = ? WHERE user_id = ?').run(state.cycle, userId);
      row = next();
    }
    return row ? this.get(row.puzzle_id) : null;
  }

  /** Mark a puzzle of the user's woodpecker set as done in the current cycle. */
  markWoodpecker(userId: string, puzzleId: string): void {
    this.db.prepare('UPDATE woodpecker_set SET done_cycle = (SELECT cycle FROM woodpecker WHERE user_id = ?) WHERE user_id = ? AND puzzle_id = ?').run(userId, userId, puzzleId);
  }

  next(userId: string, mode: PuzzleMode, q: PuzzleQuery): Puzzle {
    let p: Puzzle | null;
    switch (mode) {
      case 'review': p = this.review(userId); if (!p) throw new HttpError(404, 'No puzzles are due for review'); return p;
      case 'woodpecker': p = this.woodpecker(userId, q); break;
      case 'theme':
        if (!q.themes.length) throw new HttpError(400, 'mode=theme requires themes');
        p = this.adaptive(userId, q); break;
      default: p = this.adaptive(userId, q);
    }
    if (!p) throw new HttpError(404, 'No puzzle matches these filters');
    return p;
  }
}
