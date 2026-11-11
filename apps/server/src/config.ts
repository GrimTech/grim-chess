// Runtime configuration from environment variables and CLI flags.
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';

export type Mode = 'cloud' | 'lan' | 'dev';

export interface Config {
  port: number;
  host: string;
  mode: Mode;
  /** Repository root (knowledge-base/, content/, apps/web/dist live under it). */
  rootDir: string;
  /** Writable directory for the SQLite database. */
  dataDir: string;
  dbFile: string;
  puzzlesCsv: string;
  webDist: string;
  kbDir: string;
  contentDir: string;
  version: string;
  /** Secure cookies + HSTS (cloud behind TLS). */
  secureCookies: boolean;
  /** Trust Fly-Client-IP / X-Forwarded-For for rate limiting. */
  trustProxy: boolean;
  bodyLimit: number;
  logRequests: boolean;
}

export const ROOT_DIR = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));

export function loadConfig(argv: string[] = process.argv.slice(2), env: NodeJS.ProcessEnv = process.env, overrides: Partial<Config> = {}): Config {
  const lanFlag = argv.includes('--lan');
  const modeEnv = env.MODE as Mode | undefined;
  const mode: Mode = lanFlag ? 'lan' : modeEnv === 'cloud' || modeEnv === 'lan' || modeEnv === 'dev' ? modeEnv : 'dev';
  const rootDir = path.resolve(env.ROOT_DIR ?? ROOT_DIR);
  const dataDir = path.resolve(rootDir, env.DATA_DIR ?? './data');
  let version = '0.0.0';
  try { version = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8')).version ?? version; } catch { /* ignore */ }
  const portArg = argv.find((a) => a.startsWith('--port='));
  const cfg: Config = {
    port: Number(portArg?.slice(7) ?? env.PORT ?? 8080),
    host: env.HOST ?? (mode === 'lan' || mode === 'cloud' ? '0.0.0.0' : '127.0.0.1'),
    mode,
    rootDir,
    dataDir,
    dbFile: path.join(dataDir, env.DB_FILE ?? 'grim-chess.db'),
    puzzlesCsv: path.resolve(rootDir, env.PUZZLES_CSV ?? 'data/puzzles.csv.gz'),
    webDist: path.resolve(rootDir, env.WEB_DIST ?? 'apps/web/dist'),
    kbDir: path.join(rootDir, 'knowledge-base'),
    contentDir: path.join(rootDir, 'content'),
    version,
    secureCookies: mode === 'cloud',
    trustProxy: mode === 'cloud' || env.TRUST_PROXY === '1',
    bodyLimit: 1024 * 1024,
    logRequests: env.LOG_REQUESTS === '1',
    ...overrides,
  };
  if (lanFlag && !env.HOST) cfg.host = '0.0.0.0';
  return cfg;
}

/** All non-internal IPv4 addresses as http URLs (shown in LAN mode so other devices can connect). */
export function lanUrls(port: number): string[] {
  // In Docker the container's interfaces are not reachable from the LAN: LAN_URLS="http://192.168.1.20:8080" overrides.
  if (process.env.LAN_URLS) return process.env.LAN_URLS.split(',').map((u) => u.trim()).filter(Boolean);
  const urls: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const ni of list ?? []) {
      if (ni.family === 'IPv4' && !ni.internal) urls.push(`http://${ni.address}:${port}`);
    }
  }
  return urls;
}
