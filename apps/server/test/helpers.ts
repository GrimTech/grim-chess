// Test helpers: boot an isolated server (temp data dir, small puzzle fixture, random port) and a cookie-aware client.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { WebSocket } from 'ws';
import { ROOT_DIR } from '../src/config.ts';
import { createApp } from '../src/app.ts';
import type { App } from '../src/app.ts';

process.removeAllListeners('warning');

export interface TestServer { app: App; base: string; dir: string; stop(): Promise<void> }

/** 3000 puzzles from the real CSV (every 17th row) so imports are fast but every rating band is present. */
function fixtureCsv(dir: string): string {
  const real = path.join(ROOT_DIR, 'data/puzzles.csv.gz');
  const lines = gunzipSync(readFileSync(real)).toString('utf8').split(/\r?\n/).filter(Boolean);
  const picked = [lines[0], ...lines.slice(1).filter((_l, i) => i % 17 === 0).slice(0, 3000)];
  const file = path.join(dir, 'puzzles.csv');
  writeFileSync(file, picked.join('\n') + '\n');
  return file;
}

export async function startServer(): Promise<TestServer> {
  const dir = mkdtempSync(path.join(tmpdir(), 'grim-test-'));
  // minimal built web app so static serving is testable without running Vite
  const webDist = path.join(dir, 'dist');
  mkdirSync(path.join(webDist, 'assets'), { recursive: true });
  writeFileSync(path.join(webDist, 'index.html'), '<!doctype html><title>Grim Chess</title><div id="root"></div>');
  writeFileSync(path.join(webDist, 'assets', 'app.js'), `console.log(${JSON.stringify('x'.repeat(4000))});`);
  const app = createApp({ port: 0, host: '127.0.0.1', dataDir: dir, dbFile: path.join(dir, 'test.db'), puzzlesCsv: fixtureCsv(dir), webDist, mode: 'dev' }, []);
  const addr = await app.listen();
  return {
    app, dir, base: `http://127.0.0.1:${addr.port}`,
    async stop() { await app.close(); try { rmSync(dir, { recursive: true, force: true }); } catch { /* windows file locks */ } },
  };
}

export class Client {
  base: string;
  cookie = '';
  constructor(base: string) { this.base = base; }
  async req<T = any>(method: string, url: string, body?: unknown): Promise<{ status: number; body: T; headers: Headers }> {
    const res = await fetch(this.base + url, {
      method,
      headers: { ...(this.cookie ? { cookie: this.cookie } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    for (const sc of res.headers.getSetCookie()) {
      const [pair] = sc.split(';');
      const [name, value] = pair.split('=');
      if (name === 'gc_session') this.cookie = value ? `gc_session=${value}` : '';
    }
    const text = await res.text();
    let parsed: unknown = text;
    try { parsed = text ? JSON.parse(text) : undefined; } catch { /* not json */ }
    return { status: res.status, body: parsed as T, headers: res.headers };
  }
  get<T = any>(url: string) { return this.req<T>('GET', url); }
  post<T = any>(url: string, body?: unknown) { return this.req<T>('POST', url, body); }
  patch<T = any>(url: string, body?: unknown) { return this.req<T>('PATCH', url, body); }
}

/** WebSocket client that queues messages and lets tests await a message of a given type. */
export class WsClient {
  ws: WebSocket;
  queue: any[] = [];
  waiters: { pred: (m: any) => boolean; resolve: (m: any) => void }[] = [];
  constructor(ws: WebSocket) {
    this.ws = ws;
    ws.on('message', (d) => {
      const m = JSON.parse(String(d));
      const w = this.waiters.findIndex((x) => x.pred(m));
      if (w >= 0) { const [x] = this.waiters.splice(w, 1); x.resolve(m); } else this.queue.push(m);
    });
  }
  static async connect(base: string, cookie: string): Promise<WsClient> {
    const ws = new WebSocket(base.replace('http', 'ws') + '/ws', { headers: { cookie } });
    const c = new WsClient(ws); // listen before 'open': the server may send state right after the handshake
    await new Promise<void>((resolve, reject) => { ws.once('open', () => resolve()); ws.once('error', reject); });
    return c;
  }
  send(m: unknown) { this.ws.send(JSON.stringify(m)); }
  next(t: string, extra: (m: any) => boolean = () => true, timeoutMs = 5000): Promise<any> {
    const pred = (m: any) => m.t === t && extra(m);
    const i = this.queue.findIndex(pred);
    if (i >= 0) return Promise.resolve(this.queue.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout waiting for ${t}; queue: ${JSON.stringify(this.queue.map((q) => q.t))}`)), timeoutMs);
      this.waiters.push({ pred, resolve: (m) => { clearTimeout(timer); resolve(m); } });
    });
  }
  close() { this.ws.close(); }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
