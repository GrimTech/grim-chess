// Static file serving for the built web app (apps/web/dist) with SPA fallback, MIME types, caching and compression.
import { existsSync, readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { brotliCompress, gzip, constants as zc } from 'node:zlib';

export const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.xml': 'application/xml', '.pgn': 'application/x-chess-pgn', '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.nnue': 'application/octet-stream', '.bin': 'application/octet-stream',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.map', '.svg', '.webmanifest', '.wasm', '.txt', '.md', '.xml', '.pgn', '.ttf', '.otf', '.ico', '.nnue']);

/** Extensions that are always static assets (a missing one is a 404, never the SPA shell). */
const ASSET_EXT = new Set(['.js', '.mjs', '.css', '.wasm', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico',
  '.woff', '.woff2', '.ttf', '.otf', '.json', '.txt', '.map', '.webmanifest', '.nnue', '.mp3', '.ogg', '.wav', '.pgn']);

interface Entry { mtime: number; size: number; raw: Buffer; br?: Buffer; gz?: Buffer; pending?: boolean }

export class StaticFiles {
  root: string;
  cache = new Map<string, Entry>();
  constructor(root: string) { this.root = path.resolve(root); }

  available(): boolean { return existsSync(path.join(this.root, 'index.html')); }

  private resolve(pathname: string): string | null {
    let p: string;
    try { p = decodeURIComponent(pathname); } catch { return null; }
    if (p.includes('\0')) return null;
    const full = path.resolve(this.root, '.' + path.posix.normalize('/' + p));
    if (full !== this.root && !full.startsWith(this.root + path.sep)) return null;
    return full;
  }

  private entry(file: string): Entry | null {
    let st;
    try { st = statSync(file); } catch { return null; }
    if (!st.isFile()) return null;
    const hit = this.cache.get(file);
    if (hit && hit.mtime === st.mtimeMs && hit.size === st.size) return hit;
    const e: Entry = { mtime: st.mtimeMs, size: st.size, raw: readFileSync(file) };
    this.cache.set(file, e);
    return e;
  }

  /** Compress in the background once; until ready, responses go out uncompressed. */
  private compressed(e: Entry, ext: string, accept: string): { buf: Buffer; enc: 'br' | 'gzip' } | null {
    if (!COMPRESSIBLE.has(ext) || e.raw.length < 1024) return null;
    if (!e.pending) {
      e.pending = true;
      const big = e.raw.length > 1_000_000;
      brotliCompress(e.raw, { params: { [zc.BROTLI_PARAM_QUALITY]: big ? 7 : 11, [zc.BROTLI_PARAM_SIZE_HINT]: e.raw.length } }, (err, out) => { if (!err) e.br = out; });
      gzip(e.raw, { level: 9 }, (err, out) => { if (!err) e.gz = out; });
    }
    if (e.br && /\bbr\b/.test(accept)) return { buf: e.br, enc: 'br' };
    if (e.gz && /\bgzip\b/.test(accept)) return { buf: e.gz, enc: 'gzip' };
    return null;
  }

  /** Returns true when the request was handled. */
  serve(req: IncomingMessage, res: ServerResponse, pathname: string): boolean {
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;
    const file = this.resolve(pathname);
    if (!file) return false;
    let target = file;
    let e = this.entry(target);
    if (!e) {
      // SPA fallback: any route gets index.html (routes may contain dots, e.g. /learn/lesson/adult.s1.rook).
      // Missing files under /assets/ or with a known asset extension are real 404s.
      if (pathname.startsWith('/assets/') || ASSET_EXT.has(path.extname(pathname).toLowerCase())) return false;
      target = path.join(this.root, 'index.html');
      e = this.entry(target);
      if (!e) return false;
    }
    const ext = path.extname(target).toLowerCase();
    const etag = `W/"${e.size.toString(16)}-${Math.floor(e.mtime).toString(16)}"`;
    res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
    res.setHeader('ETag', etag);
    if (pathname.startsWith('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    else if (ext === '.html') res.setHeader('Cache-Control', 'no-cache');
    else res.setHeader('Cache-Control', 'public, max-age=3600');
    if (COMPRESSIBLE.has(ext)) res.setHeader('Vary', 'Accept-Encoding');
    if (req.headers['if-none-match'] === etag) { res.statusCode = 304; res.end(); return true; }
    let body = e.raw;
    const c = this.compressed(e, ext, String(req.headers['accept-encoding'] ?? ''));
    if (c) { body = c.buf; res.setHeader('Content-Encoding', c.enc); }
    res.statusCode = 200;
    res.setHeader('Content-Length', body.length);
    res.end(req.method === 'HEAD' ? undefined : body);
    return true;
  }
}
