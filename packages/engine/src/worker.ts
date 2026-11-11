// Web Worker entry for the Grim engine so bot thinking never blocks the UI thread.
// Request:  { id, fen, level, timeMs }   Response: { id, uci } | { id, error }
import { grimBestMove } from './bot.ts';

interface WorkerScope { postMessage(m: unknown): void; onmessage: ((e: MessageEvent) => void) | null }
const scope = self as unknown as WorkerScope;

scope.onmessage = (e: MessageEvent) => {
  const { id, fen, level, timeMs } = e.data as { id: number; fen: string; level?: number; timeMs?: number };
  try {
    scope.postMessage({ id, uci: grimBestMove(fen, { level, timeMs }) });
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
