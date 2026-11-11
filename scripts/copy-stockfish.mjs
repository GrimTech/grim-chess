#!/usr/bin/env node
// Copies the Stockfish 19 lite single-threaded WASM build (GPL-3.0) from node_modules into
// apps/web/public/stockfish/ so Vite serves it as a static Web Worker script.
// The worker script locates its .wasm by replacing ".js" with ".wasm" in its own URL
// (or from the URL hash), so both files must sit side by side.
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'apps', 'web', 'public', 'stockfish');
const FILES = ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm'];

function findBinDir() {
  const candidates = [join(root, 'node_modules', 'stockfish', 'bin'), join(root, 'apps', 'web', 'node_modules', 'stockfish', 'bin')];
  try {
    const require = createRequire(join(root, 'apps', 'web', 'package.json'));
    candidates.unshift(join(dirname(require.resolve('stockfish/package.json')), 'bin'));
  } catch { /* fall back to fixed paths */ }
  return candidates.find((d) => existsSync(join(d, FILES[0])));
}

const bin = findBinDir();
if (!bin) {
  console.error('[copy-stockfish] stockfish package not found; run `npm install` from the repo root.');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
for (const f of FILES) {
  const src = join(bin, f), dst = join(outDir, f);
  if (existsSync(dst) && statSync(dst).size === statSync(src).size && statSync(dst).mtimeMs >= statSync(src).mtimeMs) continue;
  copyFileSync(src, dst);
  console.log(`[copy-stockfish] ${f} -> apps/web/public/stockfish/`);
}
copyFileSync(join(bin, '..', 'Copying.txt'), join(outDir, 'COPYING-stockfish.txt'));
