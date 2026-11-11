// Glicko-2 (Glickman 2013, "Example of the Glicko-2 system"). Single rating-period update per batch of results.
import type { RatingState } from './types.ts';

export const GLICKO2 = { scale: 173.7178, tau: 0.5, defaultRating: 1500, defaultRd: 350, defaultVol: 0.06, minRd: 30, maxRd: 350 };

export interface GlickoResult { opponentRating: number; opponentRd: number; score: number }

export function newRating(rating = GLICKO2.defaultRating, rd = GLICKO2.defaultRd): RatingState {
  return { rating, rd, vol: GLICKO2.defaultVol, games: 0 };
}

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const E = (mu: number, muj: number, phij: number) => 1 / (1 + Math.exp(-g(phij) * (mu - muj)));

/** Expected score of player A vs B. */
export function expectedScore(a: { rating: number; rd: number }, b: { rating: number; rd: number }): number {
  const mu = (a.rating - 1500) / GLICKO2.scale, muj = (b.rating - 1500) / GLICKO2.scale;
  const phij = Math.sqrt(a.rd ** 2 + b.rd ** 2) / GLICKO2.scale;
  return E(mu, muj, phij);
}

export function updateRating(state: RatingState, results: GlickoResult[], tau = GLICKO2.tau): RatingState {
  const mu = (state.rating - 1500) / GLICKO2.scale;
  const phi = state.rd / GLICKO2.scale;
  const sigma = state.vol;
  if (results.length === 0) {
    const phiStar = Math.sqrt(phi * phi + sigma * sigma);
    return { ...state, rd: Math.min(GLICKO2.maxRd, phiStar * GLICKO2.scale) };
  }
  let vInv = 0, deltaSum = 0;
  for (const r of results) {
    const muj = (r.opponentRating - 1500) / GLICKO2.scale, phij = r.opponentRd / GLICKO2.scale;
    const gj = g(phij), Ej = E(mu, muj, phij);
    vInv += gj * gj * Ej * (1 - Ej);
    deltaSum += gj * (r.score - Ej);
  }
  const v = 1 / vInv;
  const delta = v * deltaSum;
  // Volatility update (Illinois algorithm, step 5 of Glickman's paper)
  const a = Math.log(sigma * sigma);
  const f = (x: number) => {
    const ex = Math.exp(x);
    return (ex * (delta * delta - phi * phi - v - ex)) / (2 * (phi * phi + v + ex) ** 2) - (x - a) / (tau * tau);
  };
  let A = a, B: number;
  if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v);
  else { let k = 1; while (f(a - k * tau) < 0) k++; B = a - k * tau; }
  let fA = f(A), fB = f(B);
  for (let i = 0; i < 100 && Math.abs(B - A) > 1e-6; i++) {
    const C = A + ((A - B) * fA) / (fB - fA), fC = f(C);
    if (fC * fB <= 0) { A = B; fA = fB; } else { fA = fA / 2; }
    B = C; fB = fC;
  }
  const sigmaP = Math.exp(A / 2);
  const phiStar = Math.sqrt(phi * phi + sigmaP * sigmaP);
  const phiP = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muP = mu + phiP * phiP * deltaSum;
  return {
    rating: muP * GLICKO2.scale + 1500,
    rd: Math.max(GLICKO2.minRd, Math.min(GLICKO2.maxRd, phiP * GLICKO2.scale)),
    vol: sigmaP,
    games: state.games + results.length,
    updatedAt: new Date().toISOString(),
  };
}

/** Performance rating of a set of results (logistic approximation, clipped at 1%/99%). */
export function performanceRating(results: { opponentRating: number; score: number }[]): number | null {
  if (!results.length) return null;
  const avg = results.reduce((s, r) => s + r.opponentRating, 0) / results.length;
  const p = results.reduce((s, r) => s + r.score, 0) / results.length;
  const pc = Math.min(0.99, Math.max(0.01, p));
  return Math.round(avg + 400 * Math.log10(pc / (1 - pc)));
}
