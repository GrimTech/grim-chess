// Grim Chess server entry point: `node apps/server/src/index.ts [--lan] [--port=8080]`

// node:sqlite prints an ExperimentalWarning on Node 24; keep other warnings.
const emit = process.emitWarning.bind(process);
process.emitWarning = ((w: string | Error, ...rest: unknown[]) => {
  const msg = typeof w === 'string' ? w : w?.message;
  if (/SQLite is an experimental feature/.test(msg ?? '')) return;
  return (emit as (...a: unknown[]) => void)(w, ...rest);
}) as typeof process.emitWarning;

// Imported after the warning filter: node:sqlite warns at module load.
const { createApp } = await import('./app.ts');
const { lanUrls } = await import('./config.ts');
const app = createApp();
const addr = await app.listen();
const { cfg } = app;
const shown = cfg.host === '0.0.0.0' || cfg.host === '::' ? 'localhost' : addr.address;
console.log(`Grim Chess ${cfg.version} (${cfg.mode}) listening on http://${shown}:${addr.port}`);
console.log(`  data: ${cfg.dbFile} | puzzles: ${app.puzzles.count()} | lessons: ${app.curriculum.index.length} | skills: ${app.curriculum.graph.skills.length}`);
if (cfg.mode === 'lan' || cfg.host === '0.0.0.0') {
  const urls = lanUrls(addr.port);
  if (urls.length) {
    console.log('  LAN: open one of these on other devices on the same network:');
    for (const u of urls) console.log(`    ${u}`);
  } else console.log('  LAN: no non-internal IPv4 address found (are you connected to a network?)');
}

let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`\n${signal} received, shutting down...`);
  const force = setTimeout(() => { console.error('Forced exit after 10 s'); process.exit(1); }, 10_000);
  force.unref();
  await app.close();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
