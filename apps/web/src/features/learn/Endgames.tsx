// Basic mates vs the engine from random positions, and theoretical endgame positions to win / hold.
import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { RotateCcw, Shuffle } from 'lucide-react';
import { analyse } from '../../lib/engine.ts';
import { useSession } from '../../lib/session.tsx';
import { PlayOut, type PlayOutcome } from './PlayOut.tsx';
import { lsGet, lsSet, nowIso, postEvents } from './util.ts';
import { THEORY_POSITIONS, type TheoryPosition } from './endgame-positions.ts';

// ---------- Basic mates ----------
export type MateKind = 'KQvK' | 'KRvK' | 'KBBvK' | 'KBNvK';
const MATE_PIECES: Record<MateKind, string[]> = { KQvK: ['Q'], KRvK: ['R'], KBBvK: ['B', 'B'], KBNvK: ['B', 'N'] };
export const MATE_SKILL: Record<MateKind, string> = { KQvK: 'endgame.mate.kq', KRvK: 'endgame.mate.kr', KBBvK: 'endgame.mate.two-bishops', KBNvK: 'endgame.mate.bishop-knight' };
const MATE_INFO: Record<MateKind, { name: string; maxDtm: number; tip: string }> = {
  KQvK: { name: 'King + queen', maxDtm: 10, tip: 'Use the queen a knight’s move from the king to shrink the box; bring your king; avoid stalemate.' },
  KRvK: { name: 'King + rook', maxDtm: 16, tip: 'Cut the king off with the rook, take the opposition with your king, check on the edge.' },
  KBBvK: { name: 'Two bishops', maxDtm: 19, tip: 'Bishops side by side form a wall; drive the king to any corner.' },
  KBNvK: { name: 'Bishop + knight', maxDtm: 33, tip: 'Mate is only forced in a corner of the bishop’s colour: learn the W-manoeuvre of the knight.' },
};

const dist = (a: number, b: number) => Math.max(Math.abs((a % 8) - (b % 8)), Math.abs(Math.floor(a / 8) - Math.floor(b / 8)));
const isLight = (i: number) => ((i % 8) + Math.floor(i / 8)) % 2 === 1;

/** Random legal position, White to move, Black king not in check and not adjacent to any white piece. */
export function randomMatePosition(kind: MateKind, rnd = Math.random): string {
  for (let tries = 0; tries < 2000; tries++) {
    const used = new Set<number>();
    const pick = () => { let s; do { s = Math.floor(rnd() * 64); } while (used.has(s)); used.add(s); return s; };
    const wk = pick(), bk = pick();
    if (dist(wk, bk) < 2) continue;
    const pieces = MATE_PIECES[kind].map((p) => ({ p, s: pick() }));
    if (kind === 'KBBvK' && isLight(pieces[0].s) === isLight(pieces[1].s)) continue;
    if (pieces.some((x) => dist(x.s, bk) < 2)) continue;
    const grid: string[] = Array(64).fill('');
    grid[wk] = 'K'; grid[bk] = 'k'; for (const x of pieces) grid[x.s] = x.p;
    let fen = '';
    for (let r = 7; r >= 0; r--) {
      let empty = 0;
      for (let f = 0; f < 8; f++) { const v = grid[r * 8 + f]; if (!v) empty++; else { if (empty) fen += empty; empty = 0; fen += v; } }
      if (empty) fen += empty; if (r) fen += '/';
    }
    fen += ' w - - 0 1';
    try {
      const c = new Chess(fen);
      // black must not be in check with white to move (would be illegal)
      const flipped = new Chess(fen.replace(' w ', ' b '));
      if (flipped.inCheck() || c.isGameOver() || !c.moves().length) continue;
      return fen;
    } catch { continue; }
  }
  return '8/8/8/4k3/8/8/8/4K2Q w - - 0 1';
}

export function MatesDrillPage() {
  const { me, setMe } = useSession();
  const [kind, setKind] = useState<MateKind>('KQvK');
  const [fen, setFen] = useState(() => randomMatePosition('KQvK'));
  const [attempt, setAttempt] = useState(0);
  const [optimal, setOptimal] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<PlayOutcome | null>(null);
  const [startedAt, setStartedAt] = useState(Date.now());
  const best = lsGet<Record<string, number>>('gc_mate_ratio', {});

  useEffect(() => {
    let alive = true; setOptimal(null);
    analyse(fen, { depth: 20 }).then((ls) => { const m = ls[0]?.mate; if (alive && m && m > 0) setOptimal(m); }).catch(() => { /* engine unavailable: no optimum */ });
    return () => { alive = false; };
  }, [fen]);

  const newPos = (k = kind) => { setKind(k); setFen(randomMatePosition(k)); setOutcome(null); setAttempt((a) => a + 1); setStartedAt(Date.now()); };
  const onFinish = (o: PlayOutcome) => {
    setOutcome(o);
    const ratio = o.success && optimal ? optimal / o.learnerMoves : 0;
    if (o.success && ratio > (best[kind] ?? 0)) lsSet('gc_mate_ratio', { ...best, [kind]: ratio });
    void postEvents([{ type: 'drill', drill: 'mate-drill', skillIds: [MATE_SKILL[kind]], score: o.success ? +(optimal ? Math.min(1, optimal / o.learnerMoves) : 1).toFixed(3) : 0,
      durationSec: Math.round((Date.now() - startedAt) / 1000), at: nowIso(), detail: { kind, moves: o.learnerMoves, optimal, success: o.success } }], setMe, me);
  };

  return (
    <div className="lr-page">
      <header className="lr-head">
        <div><p className="lr-eyebrow muted">Drill</p><h1>Basic mates</h1></div>
        <div className="segmented" role="group" aria-label="Material">
          {(Object.keys(MATE_INFO) as MateKind[]).map((k) => <button key={k} aria-pressed={kind === k} onClick={() => newPos(k)}>{MATE_INFO[k].name}</button>)}
        </div>
      </header>
      <div className="lr-train">
        <div className="lr-train__board"><PlayOut key={`${fen}:${attempt}`} fen={fen} goal="mate" maxMoves={50} onFinish={onFinish} attempt={attempt} /></div>
        <aside className="lr-train__side stack">
          <div className="tile-grid">
            <div className="tile"><p className="tile__label">Optimal mate</p><p className="tile__value">{optimal ?? '—'}<span className="tile__unit">moves</span></p>
              <p className="tile__delta">{optimal ? 'engine distance to mate' : 'engine unavailable or still thinking'}</p></div>
            <div className="tile"><p className="tile__label">Best efficiency</p><p className="tile__value">{best[kind] ? `${Math.round(best[kind] * 100)}%` : '—'}</p><p className="tile__delta">optimal ÷ your moves</p></div>
          </div>
          <p className="muted">{MATE_INFO[kind].tip} The defender plays the longest resistance. 50 moves without mate is a draw.</p>
          {outcome && (
            <div className="card">
              <p className={outcome.success ? 'lr-ok' : 'lr-bad'}>{outcome.reason}</p>
              {outcome.success && <p>You mated in <strong>{outcome.learnerMoves}</strong> moves{optimal ? ` (optimal ${optimal}, efficiency ${Math.round(Math.min(1, optimal / outcome.learnerMoves) * 100)}%)` : ''}.</p>}
            </div>
          )}
          <div className="row">
            <button className="btn btn-primary" onClick={() => newPos()}><Shuffle aria-hidden="true" /> New position</button>
            <button className="btn" onClick={() => { setOutcome(null); setAttempt((a) => a + 1); setStartedAt(Date.now()); }}><RotateCcw aria-hidden="true" /> Retry</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ---------- Theoretical endgames ----------
export function EndgamesPage() {
  const { me, setMe } = useSession();
  const [sel, setSel] = useState<TheoryPosition>(THEORY_POSITIONS[0]);
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<PlayOutcome | null>(null);
  const [startedAt, setStartedAt] = useState(Date.now());
  const done = lsGet<Record<string, boolean>>('gc_endgames_done', {});
  const choose = (p: TheoryPosition) => { setSel(p); setOutcome(null); setAttempt((a) => a + 1); setStartedAt(Date.now()); };
  const onFinish = (o: PlayOutcome) => {
    setOutcome(o);
    if (o.success) lsSet('gc_endgames_done', { ...done, [sel.id]: true });
    void postEvents([{ type: 'drill', drill: 'endgame-drill', skillIds: sel.skill ? [sel.skill] : [], score: o.success ? 1 : 0, durationSec: Math.round((Date.now() - startedAt) / 1000), at: nowIso(), detail: { position: sel.id, moves: o.learnerMoves } }], setMe, me);
  };
  return (
    <div className="lr-page">
      <header className="lr-head"><div><p className="lr-eyebrow muted">Train</p><h1>Theoretical endgames</h1></div></header>
      <div className="lr-train">
        <div className="lr-train__board"><PlayOut key={`${sel.id}:${attempt}`} fen={sel.fen} goal={sel.goal} maxMoves={sel.maxMoves} onFinish={onFinish} attempt={attempt} /></div>
        <aside className="lr-train__side stack">
          <h2>{sel.name}</h2>
          <p>{sel.md}</p>
          {outcome && <p className={outcome.success ? 'lr-ok' : 'lr-bad'}>{outcome.reason}</p>}
          <button className="btn" onClick={() => choose(sel)}><RotateCcw aria-hidden="true" /> Restart</button>
          <ul className="lr-list" aria-label="Positions">
            {THEORY_POSITIONS.map((p) => (
              <li key={p.id}><button className="lr-list__item" aria-current={p.id === sel.id ? 'true' : undefined} onClick={() => choose(p)}>
                <span>{p.name}</span><span className={`badge ${done[p.id] ? 'badge-success' : 'badge-outline'}`}>{done[p.id] ? 'done' : `${p.goal} · stage ${p.stage}`}</span>
              </button></li>
            ))}
          </ul>
          <p className="muted">The engine defends (or attacks) at full strength. Positions follow knowledge-base/03-chess-knowledge/endgames.md.</p>
        </aside>
      </div>
    </div>
  );
}
