// Minimal HTTP toolkit on node:http: routing, JSON bodies, cookies, compression, errors.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { brotliCompressSync, gzipSync, constants as zc } from 'node:zlib';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  params: Record<string, string>;
  query: URLSearchParams;
  ip: string;
}

export type Handler = (ctx: Ctx) => unknown | Promise<unknown>;

interface Route { method: string; re: RegExp; keys: string[]; handler: Handler }

export class Router {
  routes: Route[] = [];
  add(method: string, pattern: string, handler: Handler): this {
    const keys: string[] = [];
    const re = new RegExp('^' + pattern.replace(/\/:(\w+)/g, (_m, k: string) => { keys.push(k); return '/([^/]+)'; }) + '/?$');
    this.routes.push({ method, re, keys, handler });
    return this;
  }
  get(p: string, h: Handler) { return this.add('GET', p, h); }
  post(p: string, h: Handler) { return this.add('POST', p, h); }
  patch(p: string, h: Handler) { return this.add('PATCH', p, h); }
  match(method: string, pathname: string): { handler: Handler; params: Record<string, string> } | 'method' | null {
    let pathMatched = false;
    for (const r of this.routes) {
      const m = r.re.exec(pathname);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== method && !(method === 'HEAD' && r.method === 'GET')) continue;
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { handler: r.handler, params };
    }
    return pathMatched ? 'method' : null;
  }
}

export function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const len = Number(req.headers['content-length'] ?? 0);
    if (len > limit) { reject(new HttpError(413, 'Request body too large')); req.resume(); return; }
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Request body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export async function readJson<T = unknown>(req: IncomingMessage, limit: number): Promise<T> {
  const buf = await readBody(req, limit);
  if (buf.length === 0) return {} as T;
  const ct = String(req.headers['content-type'] ?? '');
  if (ct && !ct.includes('json')) throw new HttpError(415, 'Expected application/json');
  try { return JSON.parse(buf.toString('utf8')) as T; } catch { throw new HttpError(400, 'Invalid JSON body'); }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k || k in out) continue;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* ignore malformed */ }
  }
  return out;
}

export function serializeCookie(name: string, value: string, opts: { maxAge?: number; secure?: boolean } = {}): string {
  let s = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax`;
  if (opts.maxAge !== undefined) s += `; Max-Age=${opts.maxAge}`;
  if (opts.secure) s += '; Secure';
  return s;
}

export function appendHeader(res: ServerResponse, name: string, value: string): void {
  const prev = res.getHeader(name);
  if (prev === undefined) res.setHeader(name, value);
  else res.setHeader(name, Array.isArray(prev) ? [...prev, value] : [String(prev), value]);
}

export function pickEncoding(req: IncomingMessage): 'br' | 'gzip' | null {
  const ae = String(req.headers['accept-encoding'] ?? '');
  if (/\bbr\b/.test(ae)) return 'br';
  if (/\bgzip\b/.test(ae)) return 'gzip';
  return null;
}

export function compress(buf: Buffer, enc: 'br' | 'gzip', quality = 5): Buffer {
  return enc === 'br'
    ? brotliCompressSync(buf, { params: { [zc.BROTLI_PARAM_QUALITY]: quality, [zc.BROTLI_PARAM_SIZE_HINT]: buf.length } })
    : gzipSync(buf, { level: Math.min(9, quality + 1) });
}

export function sendJson(ctx: Ctx, status: number, data: unknown): void {
  const { req, res } = ctx;
  let body: Buffer = Buffer.from(JSON.stringify(data));
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (body.length > 1024) {
    const enc = pickEncoding(req);
    if (enc) { body = compress(body, enc, 4); res.setHeader('Content-Encoding', enc); }
    res.setHeader('Vary', 'Accept-Encoding');
  }
  res.setHeader('Content-Length', body.length);
  res.end(req.method === 'HEAD' ? undefined : body);
}

export function intParam(q: URLSearchParams, key: string, def: number, min: number, max: number): number {
  const v = q.get(key);
  if (v === null || v === '') return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new HttpError(400, `Invalid ${key}`);
  return Math.max(min, Math.min(max, Math.round(n)));
}
