// Stockfish 19 (lite, single-threaded WASM) UCI client running in a dedicated Web Worker.
//
// The engine file itself is a worker script: `new Worker('/stockfish/stockfish-19-lite-single.js')`.
// It finds its .wasm by swapping ".js" for ".wasm" in its own URL (an explicit URL can be passed in the
// hash), so scripts/copy-stockfish.mjs copies both files to apps/web/public/stockfish/.
// Besides UCI text lines the worker also posts download-progress objects, which are ignored here.
//
// Concurrency: every search is a job in a FIFO queue. A job owns the engine from `position` to
// `bestmove`: options are set, `isready`/`readyok` is awaited, `go` is sent, and the job only ends when
// the matching `bestmove` arrives (also after `stop`). So concurrent callers can never read each other's
// output, and a `stop` can never leak into the next search.

export const STOCKFISH_URL = '/stockfish/stockfish-19-lite-single.js';

export interface UciScore { cp?: number; mate?: number }
export interface UciInfo extends UciScore { depth: number; multipv: number; pv: string[]; nodes?: number; nps?: number }
export interface GoResult { bestmove: string | null; ponder?: string; lines: UciInfo[] }
export interface GoRequest {
  fen: string;
  /** e.g. "depth 14", "movetime 800", "depth 12 movetime 900" */
  go: string;
  options?: Record<string, string | number | boolean>;
  onInfo?: (lines: UciInfo[]) => void;
  signal?: AbortSignal;
}

export class AbortError extends Error { constructor() { super('aborted'); this.name = 'AbortError'; } }

type Listener = (line: string) => void;

export function parseInfo(line: string): UciInfo | null {
  if (!line.startsWith('info ') || line.includes(' string ') || line.includes('bound')) return null;
  const tok = line.split(' ');
  const info: UciInfo = { depth: 0, multipv: 1, pv: [] };
  let hasScore = false;
  for (let i = 1; i < tok.length; i++) {
    switch (tok[i]) {
      case 'depth': info.depth = Number(tok[++i]); break;
      case 'multipv': info.multipv = Number(tok[++i]); break;
      case 'nodes': info.nodes = Number(tok[++i]); break;
      case 'nps': info.nps = Number(tok[++i]); break;
      case 'score': {
        const kind = tok[++i], v = Number(tok[++i]);
        if (kind === 'cp') info.cp = v; else if (kind === 'mate') info.mate = v;
        hasScore = true; break;
      }
      case 'pv': info.pv = tok.slice(i + 1); i = tok.length; break;
    }
  }
  return hasScore ? info : null;
}

export class StockfishClient {
  private worker: Worker | null = null;
  private listeners = new Set<Listener>();
  private initPromise: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private options = new Map<string, string>();
  private searching = false;
  private generation = 0;
  private failure: Error | null = null;
  private url: string;

  constructor(url = STOCKFISH_URL) { this.url = url; }

  private send(cmd: string) { this.worker?.postMessage(cmd); }

  private onLine(line: string) { for (const l of [...this.listeners]) l(line); }

  /** Resolve with the first line matching `pred`; `each` sees every line until then. */
  private waitFor(pred: (line: string) => boolean, each?: Listener, timeoutMs = 0): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.failure) { reject(this.failure); return; }
      let timer: ReturnType<typeof setTimeout> | undefined;
      const l: Listener = (line) => {
        if (line === '\u0000fail') { cleanup(); reject(this.failure ?? new Error('Stockfish failed')); return; }
        each?.(line);
        if (pred(line)) { cleanup(); resolve(line); }
      };
      const cleanup = () => { this.listeners.delete(l); if (timer) clearTimeout(timer); };
      if (timeoutMs) timer = setTimeout(() => { cleanup(); reject(new Error('Stockfish did not respond')); }, timeoutMs);
      this.listeners.add(l);
    });
  }

  private init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.failure = null;
    this.initPromise = (async () => {
      const w = new Worker(this.url);
      this.worker = w;
      w.onmessage = (e: MessageEvent) => {
        if (typeof e.data !== 'string') return; // download progress objects
        for (const line of e.data.split('\n')) if (line) this.onLine(line.trim());
      };
      w.onerror = (e) => {
        this.failure = new Error(`Stockfish worker error: ${e.message || 'failed to load'}`);
        this.onLine('\u0000fail');
        this.reset();
      };
      const ok = this.waitFor((l) => l === 'uciok', undefined, 30000);
      this.send('uci');
      await ok;
      await this.sync();
    })();
    this.initPromise.catch(() => { this.initPromise = null; });
    return this.initPromise;
  }

  private reset() {
    this.worker?.terminate();
    this.worker = null; this.initPromise = null; this.options.clear(); this.searching = false;
  }

  private async sync() {
    const ok = this.waitFor((l) => l === 'readyok', undefined, 30000);
    this.send('isready');
    await ok;
  }

  private setOption(name: string, value: string) {
    if (this.options.get(name) === value) return;
    this.send(`setoption name ${name} value ${value}`);
    this.options.set(name, value);
  }

  /** Queue a search. Resolves when the engine reports `bestmove`. */
  go(req: GoRequest): Promise<GoResult> {
    const gen = this.generation;
    const job = this.queue.then(async (): Promise<GoResult> => {
      if (req.signal?.aborted || gen !== this.generation) throw new AbortError();
      await this.init();
      for (const [k, v] of Object.entries(req.options ?? {})) this.setOption(k, String(v));
      this.send(`position fen ${req.fen}`);
      await this.sync();
      if (req.signal?.aborted || gen !== this.generation) throw new AbortError();
      const lines = new Map<number, UciInfo>();
      let lastEmit = 0;
      const emit = () => req.onInfo?.([...lines.values()].sort((a, b) => a.multipv - b.multipv));
      const done = this.waitFor((l) => l.startsWith('bestmove'), (l) => {
        const info = parseInfo(l);
        if (!info) return;
        // a new depth for multipv 1 starts a fresh set of lines
        if (info.multipv === 1) for (const [k, v] of lines) if (v.depth < info.depth - 1) lines.delete(k);
        lines.set(info.multipv, info);
        const now = Date.now();
        if (req.onInfo && now - lastEmit > 120) { lastEmit = now; emit(); }
      });
      const stop = () => { if (this.searching) this.send('stop'); };
      req.signal?.addEventListener('abort', stop);
      this.searching = true;
      this.send(`go ${req.go}`);
      let line: string;
      try { line = await done; } finally { this.searching = false; req.signal?.removeEventListener('abort', stop); }
      emit();
      const parts = line.split(' ');
      const bm = parts[1] && parts[1] !== '(none)' ? parts[1] : null;
      return { bestmove: bm, ponder: parts[3], lines: [...lines.values()].sort((a, b) => a.multipv - b.multipv) };
    });
    this.queue = job.catch(() => undefined);
    return job;
  }

  /** Stop the running search (it still resolves with its best move) and cancel all queued jobs. */
  stopAll() {
    this.generation++;
    if (this.searching) this.send('stop');
  }

  newGame() {
    this.queue = this.queue.then(async () => { if (!this.worker) return; this.send('ucinewgame'); await this.sync(); }).catch(() => undefined);
  }

  terminate() { this.stopAll(); this.reset(); }
}
