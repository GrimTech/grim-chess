// Lichess accuracy model (lila: modules/analyse/src/main/AccuracyPercent.scala, WinPercent.scala).
export const winPercentFromCp = (cp: number) => {
  const c = Math.max(-1000, Math.min(1000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
};
/** Accuracy of one move from the mover's win% before/after. Includes lila's +1 uncertainty bonus. */
export const moveAccuracy = (wpBefore: number, wpAfter: number) => {
  const raw = 103.1668 * Math.exp(-0.04354 * Math.max(0, wpBefore - wpAfter)) - 3.1669 + 1;
  return Math.max(0, Math.min(100, raw));
};
/** Convert an engine score to centipawns, mapping mates to +/-1000. */
export const evalToCp = (e: { cp?: number; mate?: number }) =>
  e.mate != null ? (e.mate > 0 ? 1000 : -1000) : Math.max(-1000, Math.min(1000, e.cp ?? 0));

export type MoveClass = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
/** Lichess-style judgement from the mover's win% drop. */
export function classifyMove(wpDrop: number): MoveClass {
  if (wpDrop >= 30) return 'blunder';
  if (wpDrop >= 20) return 'mistake';
  if (wpDrop >= 10) return 'inaccuracy';
  if (wpDrop >= 2) return 'good';
  return 'best';
}

/**
 * Game accuracy and ACPL for one side.
 * evalsWhitePov: centipawn evaluations from WHITE's point of view, one per position (index 0 = start position).
 * Accuracy = mean of volatility-weighted mean and harmonic mean of per-move accuracies (the lila approach).
 */
export function gameAccuracy(evalsWhitePov: number[], color: 'white' | 'black', startsWithWhite = true) {
  const wps = evalsWhitePov.map((cp) => winPercentFromCp(cp));
  const accs: number[] = [], weights: number[] = [], drops: number[] = [];
  const windowSize = Math.max(2, Math.min(8, Math.floor(wps.length / 10)));
  let loss = 0, n = 0;
  for (let i = 1; i < wps.length; i++) {
    const moverIsWhite = ((i - 1) % 2 === 0) === startsWithWhite;
    if ((color === 'white') !== moverIsWhite) continue;
    const before = moverIsWhite ? wps[i - 1] : 100 - wps[i - 1];
    const after = moverIsWhite ? wps[i] : 100 - wps[i];
    accs.push(moveAccuracy(before, after));
    drops.push(Math.max(0, before - after));
    const win = wps.slice(Math.max(0, i - windowSize), i + 1);
    const mean = win.reduce((a, b) => a + b, 0) / win.length;
    const sd = Math.sqrt(win.reduce((a, b) => a + (b - mean) ** 2, 0) / win.length);
    weights.push(Math.max(0.5, Math.min(12, sd)));
    const d = moverIsWhite ? evalsWhitePov[i - 1] - evalsWhitePov[i] : evalsWhitePov[i] - evalsWhitePov[i - 1];
    loss += Math.max(0, Math.min(1000, d)); n++;
  }
  if (!accs.length) return { accuracy: null as number | null, acpl: null as number | null, perMove: accs, classes: [] as MoveClass[] };
  const wmean = accs.reduce((s, a, i) => s + a * weights[i], 0) / weights.reduce((a, b) => a + b, 0);
  const hmean = accs.length / accs.reduce((s, a) => s + 1 / Math.max(a, 1), 0);
  return { accuracy: (wmean + hmean) / 2, acpl: loss / n, perMove: accs, classes: drops.map(classifyMove) };
}
