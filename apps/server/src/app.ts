// Composes the HTTP API, WebSocket play and static web app into one node:http server.
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Profile } from '@grim/core';
import { Auth } from './auth.ts';
import type { Config } from './config.ts';
import { lanUrls, loadConfig } from './config.ts';
import { Curriculum } from './curriculum.ts';
import type { DB } from './db.ts';
import { openDb, tx } from './db.ts';
import { HttpError, Router, intParam, readJson, sendJson } from './http.ts';
import type { Ctx } from './http.ts';
import { KnowledgeBase, buildAudit } from './kb.ts';
import { OnlinePlay } from './online.ts';
import { Puzzles, importPuzzles } from './puzzles.ts';
import type { PuzzleMode } from './puzzles.ts';
import { StaticFiles } from './static.ts';
import { LEVEL_SEED, dueCards, getProfile, getRatings, saveProfile, setRating } from './store.ts';
import { newRating } from '@grim/core';
import { Training } from './training.ts';

export interface App {
  cfg: Config; db: DB; server: Server; online: OnlinePlay; curriculum: Curriculum; puzzles: Puzzles; training: Training; kb: KnowledgeBase;
  listen(): Promise<AddressInfo>;
  close(): Promise<void>;
}

function securityHeaders(cfg: Config, req: IncomingMessage, res: ServerResponse): void {
  const host = req.headers.host ?? '';
  const wsSrc = host ? ` ws://${host} wss://${host}` : '';
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    `connect-src 'self'${wsSrc}`,
    "worker-src 'self' blob:",
    "media-src 'self' data: blob:",
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
  ].join('; '));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (cfg.mode === 'cloud') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

const PROFILE_FIELDS: Record<string, (v: unknown) => boolean> = {
  displayName: (v) => typeof v === 'string' && v.trim().length >= 1 && v.length <= 40,
  age: (v) => v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 3 && v <= 120),
  track: (v) => v === 'adult' || v === 'kids',
  minutesPerDay: (v) => typeof v === 'number' && v >= 5 && v <= 480,
  daysPerWeek: (v) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 7,
  goal: (v) => ['casual', 'club', 'expert', 'master', 'grandmaster'].includes(v as string),
  startingLevel: (v) => ['zero', 'knows-rules', 'casual', 'club', 'strong'].includes(v as string),
  onboarded: (v) => typeof v === 'boolean',
  boardTheme: (v) => typeof v === 'string' && v.length <= 40,
  pieceSet: (v) => typeof v === 'string' && v.length <= 40,
};

export function createApp(overrides: Partial<Config> = {}, argv: string[] = process.argv.slice(2)): App {
  const cfg = loadConfig(argv, process.env, overrides);
  const db = openDb(cfg.dbFile);
  importPuzzles(db, cfg.puzzlesCsv);
  const curriculum = new Curriculum(cfg.rootDir);
  const puzzles = new Puzzles(db);
  const training = new Training(db, curriculum, puzzles);
  const kb = new KnowledgeBase(cfg.kbDir);
  const auth = new Auth(db, cfg);
  const online = new OnlinePlay({ auth, db, cfg, training });
  const files = new StaticFiles(cfg.webDist);
  let puzzleCount = puzzles.count();
  let auditCache: { at: number; data: unknown } | null = null;

  const r = new Router();
  const body = <T>(ctx: Ctx) => readJson<T>(ctx.req, cfg.bodyLimit);
  const user = (ctx: Ctx) => auth.ensureUser(ctx);

  // ---------- auth & profile ----------
  r.get('/api/me', (ctx) => training.me(user(ctx)));
  r.post('/api/auth/register', async (ctx) => training.me(await auth.register(ctx, await body(ctx))));
  r.post('/api/auth/login', async (ctx) => training.me(await auth.login(ctx, await body(ctx))));
  r.post('/api/auth/logout', (ctx) => { auth.logout(ctx); return 204; });
  r.patch('/api/profile', async (ctx) => {
    const userId = user(ctx);
    const patch = await body<Record<string, unknown>>(ctx);
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new HttpError(400, 'Expected an object');
    tx(db, () => {
      const p = getProfile(db, userId);
      const before = p.startingLevel;
      for (const [k, v] of Object.entries(patch)) {
        if (['userId', 'username', 'createdAt'].includes(k)) continue;
        const check = PROFILE_FIELDS[k];
        if (!check) continue; // unknown keys ignored
        if (!check(v)) throw new HttpError(400, `Invalid ${k}`);
        (p as unknown as Record<string, unknown>)[k] = typeof v === 'string' && k === 'displayName' ? v.trim() : v;
      }
      saveProfile(db, p);
      // Re-seed pools that have no games yet when the self-assessed level changes.
      if (p.startingLevel !== before) {
        const ratings = getRatings(db, userId);
        for (const pool of ['puzzle', 'bot', 'online'] as const) {
          if (ratings[pool] && ratings[pool]!.games > 0) continue;
          if (ratings[pool]) setRating(db, userId, pool, newRating(LEVEL_SEED[p.startingLevel as Profile['startingLevel']]));
        }
      }
      training.invalidatePlan(userId);
    });
    return training.me(userId);
  });

  r.get('/api/server-info', () => ({
    mode: cfg.mode, version: cfg.version, lanUrls: cfg.mode === 'cloud' ? [] : lanUrls(cfg.port), puzzleCount,
  }));

  // ---------- curriculum ----------
  r.get('/api/curriculum/skills', () => curriculum.graph);
  r.get('/api/curriculum/lessons', (ctx) => {
    const track = ctx.query.get('track');
    return track ? curriculum.index.filter((l) => l.track === track) : curriculum.index;
  });
  r.get('/api/curriculum/lessons/:id', (ctx) => {
    const l = curriculum.lessons.get(ctx.params.id);
    if (!l) throw new HttpError(404, 'Lesson not found');
    return l;
  });
  r.get('/api/curriculum/openings', () => curriculum.openings());
  r.get('/api/curriculum/games', (ctx) => {
    const limit = intParam(ctx.query, 'limit', 100, 1, 1000);
    const player = ctx.query.get('player')?.toLowerCase();
    const list = player ? curriculum.games.filter((g) => g.white.toLowerCase().includes(player) || g.black.toLowerCase().includes(player)) : curriculum.games;
    return list.slice(0, limit);
  });
  r.get('/api/curriculum/games/:id', (ctx) => {
    const g = curriculum.games.find((x) => x.id === ctx.params.id);
    if (!g) throw new HttpError(404, 'Game not found');
    return g;
  });

  // ---------- puzzles ----------
  const puzzleQuery = (ctx: Ctx) => {
    const themes = (ctx.query.get('themes') ?? '').split(',').map((t) => t.trim()).filter((t) => /^[A-Za-z0-9_-]{1,40}$/.test(t)).slice(0, 20);
    const min = ctx.query.get('min') ? intParam(ctx.query, 'min', 0, 0, 4000) : undefined;
    const max = ctx.query.get('max') ? intParam(ctx.query, 'max', 4000, 0, 4000) : undefined;
    return { themes, min, max };
  };
  r.get('/api/puzzles/next', (ctx) => {
    const mode = (ctx.query.get('mode') ?? 'adaptive') as PuzzleMode;
    if (!['adaptive', 'theme', 'review', 'woodpecker'].includes(mode)) throw new HttpError(400, 'Invalid mode');
    const userId = user(ctx);
    if (mode === 'woodpecker' && ctx.query.get('reset') === '1') puzzles.resetWoodpecker(userId);
    return puzzles.next(userId, mode, puzzleQuery(ctx));
  });
  r.get('/api/puzzles/set', (ctx) => puzzles.set({ ...puzzleQuery(ctx), count: intParam(ctx.query, 'count', 20, 1, 500) }));
  r.get('/api/puzzles/themes', () => puzzles.themes());
  r.get('/api/puzzles/:id', (ctx) => {
    const p = puzzles.get(ctx.params.id);
    if (!p) throw new HttpError(404, 'Puzzle not found');
    return p;
  });

  // ---------- training ----------
  r.post('/api/events', async (ctx) => {
    const userId = user(ctx);
    const b = await body<{ events?: unknown }>(ctx);
    training.process(userId, b.events);
    return training.progress(userId);
  });
  r.get('/api/progress', (ctx) => training.progress(user(ctx)));
  r.get('/api/plan', (ctx) => training.plan(user(ctx)));
  r.post('/api/plan/:blockId/done', (ctx) => training.completeBlock(user(ctx), ctx.params.blockId));
  r.get('/api/srs/due', (ctx) => {
    const kind = ctx.query.get('kind') ?? undefined;
    if (kind && !['puzzle', 'lesson', 'opening', 'endgame', 'pattern'].includes(kind)) throw new HttpError(400, 'Invalid kind');
    return dueCards(db, user(ctx), kind);
  });
  r.post('/api/srs/review', async (ctx) => training.srsReview(user(ctx), await body(ctx)));
  const gameRow = (g: Record<string, unknown>) => ({
    id: g.id, at: g.at, mode: g.mode, result: g.result, color: g.color, opponent: g.opponent,
    ...(g.opponent_rating !== null ? { opponentRating: g.opponent_rating } : {}),
    ...(g.accuracy !== null ? { accuracy: g.accuracy } : {}), ...(g.acpl !== null ? { acpl: g.acpl } : {}),
    ...(g.time_control !== null ? { timeControl: g.time_control } : {}), rated: !!g.rated, pgn: g.pgn,
  });
  r.get('/api/games', (ctx) => (db.prepare('SELECT * FROM games WHERE user_id = ? ORDER BY at DESC LIMIT 200').all(user(ctx)) as Record<string, unknown>[]).map(gameRow));
  r.get('/api/games/:id', (ctx) => {
    const g = db.prepare('SELECT * FROM games WHERE id = ? AND user_id = ?').get(ctx.params.id, user(ctx)) as Record<string, unknown> | undefined;
    if (!g) throw new HttpError(404, 'Game not found');
    return gameRow(g);
  });

  // ---------- knowledge base ----------
  r.get('/api/kb', () => kb.index());
  r.get('/api/kb/doc', (ctx) => kb.doc(ctx.query.get('path')));
  r.get('/api/kb/audit', () => {
    if (!auditCache || Date.now() - auditCache.at > 30_000) auditCache = { at: Date.now(), data: buildAudit(db, kb, curriculum, cfg.rootDir) };
    return auditCache.data;
  });

  const server = createServer(async (req, res) => {
    const t0 = Date.now();
    let url: URL;
    try { url = new URL(req.url ?? '/', 'http://localhost'); } catch { res.statusCode = 400; res.end(); return; }
    const fwd = cfg.trustProxy ? (req.headers['fly-client-ip'] as string | undefined) ?? String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() : '';
    const ctx: Ctx = { req, res, url, params: {}, query: url.searchParams, ip: fwd || req.socket.remoteAddress || 'unknown' };
    securityHeaders(cfg, req, res);
    try {
      if (url.pathname === '/healthz') {
        db.prepare('SELECT 1').get();
        return sendJson(ctx, 200, { ok: true, mode: cfg.mode, version: cfg.version, uptimeSec: Math.round(process.uptime()) });
      }
      if (url.pathname.startsWith('/api/')) {
        const m = r.match(req.method ?? 'GET', url.pathname);
        if (m === null) throw new HttpError(404, 'Not found');
        if (m === 'method') throw new HttpError(405, 'Method not allowed');
        ctx.params = m.params;
        const out = await m.handler(ctx);
        if (out === 204) { res.statusCode = 204; res.end(); return; }
        return sendJson(ctx, 200, out);
      }
      if (files.serve(req, res, url.pathname)) return;
      if (!files.available() && !url.pathname.startsWith('/assets/')) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Grim Chess web app is not built. Run `npm run build` (or use the Vite dev server on :5173).');
        return;
      }
      throw new HttpError(404, 'Not found');
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(`[http] ${req.method} ${url.pathname}`, e);
      if (!res.headersSent) sendJson(ctx, status, { error: status === 500 ? 'Internal server error' : (e as Error).message });
      else res.end();
    } finally {
      if (cfg.logRequests) console.log(`${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - t0}ms`);
    }
  });
  server.on('upgrade', (req, socket, head) => {
    const pathname = (req.url ?? '').split('?')[0];
    if (pathname === '/ws') online.handleUpgrade(req, socket, head);
    else socket.destroy();
  });
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 70_000;
  server.requestTimeout = 60_000;

  return {
    cfg, db, server, online, curriculum, puzzles, training, kb,
    listen: () => new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(cfg.port, cfg.host, () => {
        const addr = server.address() as AddressInfo;
        cfg.port = addr.port;
        puzzleCount = puzzles.count();
        // Warm the openings cache (about 2 s of chess.js work) right after startup instead of on the first request.
        setTimeout(() => { try { curriculum.openings(); } catch (e) { console.error('[openings]', e); } }, 50).unref();
        resolve(addr);
      });
    }),
    close: () => new Promise<void>((resolve) => {
      online.close();
      server.close(() => { try { db.close(); } catch { /* already closed */ } resolve(); });
      server.closeAllConnections?.();
    }),
  };
}
