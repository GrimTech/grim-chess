#!/usr/bin/env node
// Verifies every FEN written in backticks in the Markdown files of this folder.
// Usage: node verify-fens.mjs
// Static legality: 6 fields, 8 ranks of 8 squares, exactly one king per side, no pawns on ranks 1/8,
// <=8 pawns and <=16 units per side, side NOT to move is not in check.
// Expectations: every FEN in checkmate-patterns.md must be CHECKMATE (side to move mated);
// a FEN on a line marked "stalemate):" or "Example stalemate:" must be STALEMATE.
// Move generation covers all piece moves incl. en passant; castling is not generated (irrelevant
// for mate/stalemate detection because castling is never legal while in check, and every listed
// stalemate has no castling rights).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const FEN_RE = /`([1-8pnbrqkPNBRQK]+(?:\/[1-8pnbrqkPNBRQK]+){7} [wb] (?:[KQkq]{1,4}|-) (?:[a-h][36]|-) \d+ \d+)`/g;
const isW = (c) => c === c.toUpperCase();
const col = (c) => (c ? (isW(c) ? 'w' : 'b') : null);
const inb = (r, f) => r >= 0 && r < 8 && f >= 0 && f < 8;
const KN = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
const KG = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

function parse(fen) {
  const [p, stm, , ep] = fen.split(' ');
  const b = p.split('/').map((row) => { const out = []; for (const ch of row) { if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) out.push(null); else out.push(ch); } return out; });
  if (b.some((r) => r.length !== 8)) throw new Error('rank without 8 squares');
  return { b, stm, ep };
}
function attacked(b, r, f, by) {
  const pr = by === 'w' ? r + 1 : r - 1; const P = by === 'w' ? 'P' : 'p';
  for (const df of [-1, 1]) if (inb(pr, f + df) && b[pr][f + df] === P) return true;
  const N = by === 'w' ? 'N' : 'n'; for (const [dr, df] of KN) if (inb(r + dr, f + df) && b[r + dr][f + df] === N) return true;
  const K = by === 'w' ? 'K' : 'k'; for (const [dr, df] of KG) if (inb(r + dr, f + df) && b[r + dr][f + df] === K) return true;
  const slide = (dirs, set) => { for (const [dr, df] of dirs) { let rr = r + dr, ff = f + df; while (inb(rr, ff)) { const x = b[rr][ff]; if (x) { if (col(x) === by && set.includes(x.toLowerCase())) return true; break; } rr += dr; ff += df; } } return false; };
  return slide(KG.slice(0, 4), ['r', 'q']) || slide(KG.slice(4), ['b', 'q']);
}
function inCheck(b, c) { const K = c === 'w' ? 'K' : 'k'; for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) if (b[r][f] === K) return attacked(b, r, f, c === 'w' ? 'b' : 'w'); return false; }
function legalMoveCount({ b, stm, ep }) {
  const opp = stm === 'w' ? 'b' : 'w'; const mv = [];
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const x = b[r][f]; if (!x || col(x) !== stm) continue; const t = x.toLowerCase();
    if (t === 'p') {
      const d = stm === 'w' ? -1 : 1, start = stm === 'w' ? 6 : 1;
      if (inb(r + d, f) && !b[r + d][f]) { mv.push([r, f, r + d, f]); if (r === start && !b[r + 2 * d][f]) mv.push([r, f, r + 2 * d, f]); }
      for (const df of [-1, 1]) { if (!inb(r + d, f + df)) continue; const y = b[r + d][f + df]; if (y && col(y) === opp) mv.push([r, f, r + d, f + df]);
        if (ep && ep !== '-' && 8 - +ep[1] === r + d && ep.charCodeAt(0) - 97 === f + df) mv.push([r, f, r + d, f + df, 'ep']); }
    } else if (t === 'n' || t === 'k') {
      for (const [dr, df] of t === 'n' ? KN : KG) { const r2 = r + dr, f2 = f + df; if (inb(r2, f2) && col(b[r2][f2]) !== stm) mv.push([r, f, r2, f2]); }
    } else {
      const dirs = t === 'r' ? KG.slice(0, 4) : t === 'b' ? KG.slice(4) : KG;
      for (const [dr, df] of dirs) { let r2 = r + dr, f2 = f + df; while (inb(r2, f2)) { if (b[r2][f2]) { if (col(b[r2][f2]) === opp) mv.push([r, f, r2, f2]); break; } mv.push([r, f, r2, f2]); r2 += dr; f2 += df; } }
    }
  }
  return mv.filter(([r, f, r2, f2, sp]) => { const nb = b.map((row) => row.slice()); nb[r2][f2] = nb[r][f]; nb[r][f] = null; if (sp) nb[r][f2] = null; return !inCheck(nb, stm); }).length;
}
function analyse(fen) {
  const pos = parse(fen); const { b, stm } = pos; const errs = []; const cnt = {};
  for (const row of b) for (const x of row) if (x) cnt[x] = (cnt[x] || 0) + 1;
  if (cnt.K !== 1 || cnt.k !== 1) errs.push('king count');
  if ([...b[0], ...b[7]].some((x) => x && x.toLowerCase() === 'p')) errs.push('pawn on first/last rank');
  if ((cnt.P || 0) > 8 || (cnt.p || 0) > 8) errs.push('too many pawns');
  const tot = (w) => Object.entries(cnt).filter(([k]) => isW(k) === w).reduce((a, [, v]) => a + v, 0);
  if (tot(true) > 16 || tot(false) > 16) errs.push('too many units');
  if (errs.length) return { errs, status: 'illegal' };
  if (inCheck(b, stm === 'w' ? 'b' : 'w')) return { errs: ['side not to move is in check'], status: 'illegal' };
  const chk = inCheck(b, stm), n = legalMoveCount(pos);
  return { errs, status: n === 0 ? (chk ? 'checkmate' : 'stalemate') : chk ? 'check' : 'normal' };
}

let fails = 0, total = 0;
for (const md of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
  const lines = fs.readFileSync(path.join(dir, md), 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(FEN_RE)) {
      total++;
      const fen = m[1];
      let expect = 'legal';
      if (md === 'checkmate-patterns.md') expect = 'checkmate';
      else if (/stalemate\)\s*:|Example stalemate:/.test(line)) expect = 'stalemate';
      let res; try { res = analyse(fen); } catch (e) { res = { status: 'illegal', errs: [e.message] }; }
      const ok = res.status !== 'illegal' && (expect === 'legal' || res.status === expect);
      if (!ok) fails++;
      console.log(`${ok ? 'OK  ' : 'FAIL'} ${md}:${i + 1} expect=${expect} got=${res.status}${res.errs.length ? ' (' + res.errs.join(', ') + ')' : ''} ${fen}`);
    }
  });
}
console.log(`${total} FENs checked, ${fails} failure(s)`);
process.exit(fails ? 1 : 0);
