// Assessment battery (knowledge-base/04-assessment/13-assessment-battery-design.md):
//   M1 Choose-a-move (core, feeds the rating): adaptive, Amsterdam-Chess-Test style "find the best move" items,
//      one move per item, EAP ability on the Lichess puzzle scale, mapped to GR with the measurement model's P map.
//   M2 Evaluate and compare (diagnostic): choose among candidate moves, scored against the engine (cp loss).
//   Calculation (diagnostic): full-line long combinations (synthesis P8 calculation track).
//   M3 Endgame knowledge (gate only, never enters the rating).
//   Rules check (beginners only, gate).
// Posts 'puzzle' events for full-line (calculation) items and 'assessment' events per section; only the core module produces
// estimatedRating (one per sitting).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { evalToCp, grToPuzzle, puzzleToGr, stageForRating, type Puzzle, type TrainingEvent } from '@grim/core';
import { Board } from '../../components/Board.tsx';
import { api } from '../../lib/api.ts';
import { analyse } from '../../lib/engine.ts';
import { useSession } from '../../lib/session.tsx';
import { PuzzleBoard, type PuzzleResult } from './PuzzleBoard.tsx';
import { ENDGAME_ITEMS, JUDGEMENT_ITEMS, RULES_ITEMS, type QuizItem } from './assessment-items.ts';
import { ESTIMATE_CONFIG, scaleLabel } from './benchmarks.ts';
import { loadSkillGraph, lsSet, nowIso, postEvents, sideToMove, todayStr, useAsync } from './util.ts';

type Section = 'rules' | 'core' | 'judgement' | 'calculation' | 'endgame';
const SECTION_NAMES: Record<Section, string> = {
  rules: 'Rules check', core: 'Choose-a-move (core)', judgement: 'Evaluate and compare', calculation: 'Calculation', endgame: 'Endgame knowledge',
};
const SECTION_ROLE: Record<Section, string> = {
  rules: 'gate: checks you know the rules', core: 'measures your playing strength (feeds your rating)',
  judgement: 'diagnostic: positional judgement', calculation: 'diagnostic: deep calculation', endgame: 'gate: theoretical endgame knowledge',
};
const START_GR = { zero: 500, 'knows-rules': 700, casual: 1100, club: 1600, strong: 2000 } as const;
export const CORE_MAX = 20, CORE_MIN = 12, CORE_SEC = 60, CALC_N = 3, CALC_SEC = 240;
/** Stop rule: posterior SD on the GR scale <= 90 (= SE(theta) 0.30 at beta 300), after CORE_MIN items. */
export const CORE_STOP_SD = 90;

/** EAP ability on the puzzle scale (logistic, Elo base) with a normal prior; grid integration. */
export function puzzleAbility(results: { rating: number; solved: boolean }[], prior: { mean: number; sd: number }) {
  const grid: [number, number][] = [];
  let maxLp = -Infinity;
  for (let t = 100; t <= 3400; t += 10) {
    let lp = -((t - prior.mean) ** 2) / (2 * prior.sd ** 2);
    for (const r of results) { const p = 1 / (1 + Math.pow(10, (r.rating - t) / 400)); lp += Math.log(r.solved ? p : 1 - p); }
    grid.push([t, lp]); if (lp > maxLp) maxLp = lp;
  }
  const w = grid.map(([t, lp]) => [t, Math.exp(lp - maxLp)] as [number, number]);
  const Z = w.reduce((a, [, x]) => a + x, 0);
  const mean = w.reduce((a, [t, x]) => a + t * x, 0) / Z;
  const sd = Math.sqrt(w.reduce((a, [t, x]) => a + (t - mean) ** 2 * x, 0) / Z);
  return { rating: Math.round(mean), sd: Math.round(sd) };
}

function QuizRunner({ items, onDone }: { items: QuizItem[]; onDone: (correct: boolean[]) => void }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const res = useRef<boolean[]>([]);
  const it = items[i];
  const pick = (k: number) => { if (picked !== null) return; setPicked(k); res.current[i] = k === it.answer; };
  const next = () => { if (i + 1 < items.length) { setI(i + 1); setPicked(null); } else onDone(res.current); };
  return (
    <div className={it.fen ? 'lr-lesson__grid' : 'stack'}>
      {it.fen && <div className="lr-board"><Board fen={it.fen} orientation={sideToMove(it.fen)} /></div>}
      <div className="stack">
        <p className="muted">Question {i + 1} of {items.length}</p>
        <h2>{it.question}</h2>
        <div className="lr-choices">{it.choices.map((c, k) => (
          <button key={k} className="lr-choice" onClick={() => pick(k)} data-state={picked !== null ? (k === it.answer ? 'correct' : k === picked ? 'wrong' : undefined) : undefined}><kbd>{k + 1}</kbd> {c}</button>
        ))}</div>
        {picked !== null && <><p>{it.explain}</p><button className="btn btn-primary" onClick={next} autoFocus>{i + 1 < items.length ? 'Next' : 'Finish section'}</button></>}
      </div>
    </div>
  );
}

type ItemResult = { rating: number; solved: boolean; id: string; sec: number };

/** Adaptive puzzle section. Core: one move per item (choose-a-move), next item at the current EAP ability. */
function PuzzleSection({ kind, startPuzzle, onDone, onPuzzle }: { kind: 'core' | 'calculation'; startPuzzle: number; onDone: (r: ItemResult[]) => void; onPuzzle: (p: Puzzle, r: PuzzleResult) => void }) {
  const [done, setDone] = useState<ItemResult[]>([]);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<PuzzleResult | null>(null);
  const seen = useRef(new Set<string>());
  const prior = { mean: startPuzzle, sd: 500 };
  const ab = puzzleAbility(done, prior);
  const target = done.length ? ab.rating : startPuzzle;

  useEffect(() => {
    let alive = true; setPuzzle(null); setResult(null);
    const themes = kind === 'calculation' ? ['long', 'veryLong'] : undefined;
    const fetchOne = async () => {
      for (const width of [75, 150, 300]) {
        try {
          const set = await api.puzzleSet({ count: 4, min: target - width, max: target + width, themes });
          const p = set.find((x) => !seen.current.has(x.id));
          if (p) return p;
        } catch { /* widen */ }
      }
      return api.nextPuzzle({ min: target - 300, max: target + 300, themes, mode: themes ? 'theme' : 'adaptive' });
    };
    fetchOne().then((p) => { if (alive) { seen.current.add(p.id); setPuzzle(p); } }).catch((e: Error) => alive && setErr(e.message));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done.length, kind]);

  const onResult = (r: PuzzleResult) => { setResult(r); if (puzzle) onPuzzle(puzzle, r); };
  const next = () => {
    if (!puzzle || !result) return;
    const all = [...done, { rating: puzzle.rating, solved: result.solved && result.firstTry, id: puzzle.id, sec: result.durationSec }];
    const a = puzzleAbility(all, prior);
    const enough = kind === 'core' ? all.length >= CORE_MAX || (all.length >= CORE_MIN && a.sd * ESTIMATE_CONFIG.puzzle.b <= CORE_STOP_SD) : all.length >= CALC_N;
    if (enough) onDone(all); else setDone(all);
  };
  const n = kind === 'core' ? CORE_MAX : CALC_N;
  if (err) return <div className="empty"><p className="empty__title">Puzzles unavailable</p><p>{err}</p><button className="btn" onClick={() => onDone(done)}>Skip this section</button></div>;
  return (
    <div className="lr-train">
      <div className="lr-train__board">{puzzle
        ? <PuzzleBoard key={puzzle.id} puzzle={puzzle} onResult={onResult} strict hideControls firstMoveOnly={kind === 'core'} timeLimitSec={kind === 'core' ? CORE_SEC : CALC_SEC} />
        : <div className="skeleton lr-board-skel" />}</div>
      <aside className="lr-train__side stack">
        <p className="muted">Item {done.length + 1} (up to {n})</p>
        <p>{kind === 'core'
          ? `Find the best move: only your first move counts. ${CORE_SEC} seconds per position. The difficulty adapts to your answers and the section stops once your level is measured precisely enough.`
          : `Calculate the whole line before you move; every move must be correct. ${CALC_SEC / 60} minutes each.`}</p>
        {done.length > 0 && kind === 'core' && <p className="hint">Current measurement precision: ± {Math.round(1.96 * ab.sd)} (95%)</p>}
        {result && <><p className={result.solved ? 'lr-ok' : 'lr-bad'}>{result.solved ? 'Correct' : result.gaveUp ? 'Time is up' : 'Not the best move'}</p><button className="btn btn-primary" onClick={next} autoFocus>Continue</button></>}
      </aside>
    </div>
  );
}

function JudgementSection({ onDone }: { onDone: (scores: number[], usedEngine: boolean) => void }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [evals, setEvals] = useState<(number | null)[] | null>(null);
  const [busy, setBusy] = useState(false);
  const scores = useRef<number[]>([]);
  const engineOk = useRef(true);
  const it = JUDGEMENT_ITEMS[i];
  const fen = useMemo(() => { const c = new Chess(); for (const s of it.moves.split(' ')) c.move(s); return c.fen(); }, [it]);
  const mover = sideToMove(fen);

  const pick = async (k: number) => {
    if (picked !== null) return;
    setPicked(k); setBusy(true);
    const ev: (number | null)[] = [];
    for (const cand of it.candidates) {
      try {
        const c = new Chess(fen); c.move(cand);
        const [l] = await analyse(c.fen(), { depth: 12 });
        ev.push(l ? -evalToCp(l) : null); // opponent to move: negate for the mover
      } catch { ev.push(null); }
    }
    setEvals(ev); setBusy(false);
    let score: number;
    if (ev.every((x) => x != null)) {
      const best = Math.max(...(ev as number[]));
      const loss = best - (ev[k] as number);
      score = loss <= 30 ? 1 : loss <= 80 ? 0.5 : 0;
    } else { engineOk.current = false; score = k === it.expected ? 1 : 0; }
    scores.current[i] = score;
  };
  const next = () => { if (i + 1 < JUDGEMENT_ITEMS.length) { setI(i + 1); setPicked(null); setEvals(null); } else onDone(scores.current, engineOk.current); };
  const best = evals && evals.every((x) => x != null) ? Math.max(...(evals as number[])) : null;
  return (
    <div className="lr-lesson__grid">
      <div className="lr-board"><Board fen={fen} orientation={mover} /></div>
      <div className="stack">
        <p className="muted">Position {i + 1} of {JUDGEMENT_ITEMS.length} · {mover} to move</p>
        <h2>Which move would you play?</h2>
        <div className="lr-choices">{it.candidates.map((c, k) => {
          const st = picked === null || !evals ? undefined : best != null ? (best - (evals[k] as number) <= 30 ? 'correct' : k === picked ? 'wrong' : undefined) : (k === it.expected ? 'correct' : k === picked ? 'wrong' : undefined);
          return <button key={c} className="lr-choice" onClick={() => void pick(k)} data-state={st}><span className="lr-notation">{c}</span>{evals?.[k] != null && <span className="muted"> {(evals[k]! / 100).toFixed(2)}</span>}</button>;
        })}</div>
        {busy && <p className="muted">The engine is scoring the candidates…</p>}
        {picked !== null && !busy && <><p className="muted">Theme: {it.theme}. Moves within 0.3 pawns of the best candidate score fully, within 0.8 half.</p><button className="btn btn-primary" onClick={next} autoFocus>{i + 1 < JUDGEMENT_ITEMS.length ? 'Next position' : 'Finish section'}</button></>}
      </div>
    </div>
  );
}

interface Outcome { core?: ItemResult[]; calculation?: ItemResult[]; rules?: boolean[]; endgame?: boolean[]; judgement?: number[]; engine?: boolean }

export function AssessmentPage() {
  const { id = 'placement' } = useParams();
  const { me, setMe, refresh } = useSession();
  const nav = useNavigate();
  const graph = useAsync(loadSkillGraph, []);
  const level = me?.profile.startingLevel ?? 'knows-rules';
  const alias: Record<string, Section> = { tactics: 'core', positional: 'judgement', core: 'core', judgement: 'judgement', rules: 'rules', calculation: 'calculation', endgame: 'endgame' };
  const single = alias[id] ?? null;
  const sections: Section[] = single ? [single] : [...(level === 'zero' || level === 'knows-rules' ? ['rules' as const] : []), 'core', 'judgement', 'calculation', 'endgame'];
  const [idx, setIdx] = useState(-1);
  const [out, setOut] = useState<Outcome>({});
  const [stopEarly, setStopEarly] = useState(false);
  const pending = useRef<TrainingEvent[]>([]);
  const assessmentId = `${single ?? id}-${todayStr()}`;
  const t0 = useRef(Date.now());
  const sec = sections[idx];
  const startGr = me?.estimate && me.estimate.confidence !== 'very-low' ? me.estimate.rating : START_GR[level];
  const startPuzzle = Math.round(grToPuzzle(startGr, ESTIMATE_CONFIG));

  const finishSection = (patch: Outcome) => {
    setOut((o) => ({ ...o, ...patch }));
    if (patch.rules && patch.rules.filter(Boolean).length < 3 && !single) { setStopEarly(true); setIdx(sections.length); return; }
    setIdx((x) => x + 1);
  };
  const onPuzzle = (p: Puzzle, r: PuzzleResult) => {
    pending.current.push({ type: 'puzzle', puzzleId: p.id, puzzleRating: p.rating, themes: p.themes, solved: r.solved, firstTry: r.firstTry, durationSec: r.durationSec, at: nowIso() });
  };

  const result = useMemo(() => {
    const ab = out.core?.length ? puzzleAbility(out.core, { mean: startPuzzle, sd: 500 }) : null;
    const gr = ab ? Math.max(100, Math.round(puzzleToGr(ab.rating, ESTIMATE_CONFIG))) : stopEarly ? 300 : null;
    const sdStat = ab ? Math.round(ESTIMATE_CONFIG.puzzle.b * ab.sd) : stopEarly ? 250 : null;
    const total = sdStat != null ? Math.round(Math.hypot(sdStat, ESTIMATE_CONFIG.batterySigmaMap)) : null;
    const frac = (xs?: (boolean | number)[]) => (xs && xs.length ? xs.reduce<number>((a, b) => a + Number(b), 0) / xs.length : null);
    return { ab, gr, sdStat, total, eg: frac(out.endgame), judgement: frac(out.judgement), rules: frac(out.rules), calc: frac(out.calculation?.map((x) => x.solved)) };
  }, [out, stopEarly, startPuzzle]);

  const posted = useRef(false);
  useEffect(() => {
    if (idx < sections.length || posted.current || idx === -1) return;
    posted.current = true;
    const at = nowIso();
    const ev: TrainingEvent[] = [...pending.current];
    const sum = (xs?: (boolean | number)[]) => (xs ?? []).reduce<number>((a, b) => a + Number(b), 0);
    if (out.rules) ev.push({ type: 'assessment', assessmentId, section: 'rules', score: sum(out.rules), maxScore: out.rules.length, at });
    if (out.judgement) ev.push({ type: 'assessment', assessmentId, section: 'judgement', score: sum(out.judgement), maxScore: out.judgement.length, at, detail: { engineScored: out.engine !== false } });
    if (out.calculation) ev.push({ type: 'assessment', assessmentId, section: 'calculation', score: sum(out.calculation.map((x) => x.solved)), maxScore: out.calculation.length, at, detail: { items: out.calculation } });
    if (out.endgame) ev.push({ type: 'assessment', assessmentId, section: 'endgame', score: sum(out.endgame), maxScore: out.endgame.length, at, detail: { gate: true } });
    // Only the core module produces a rating (one estimatedRating per sitting).
    if (result.gr != null && (out.core?.length || stopEarly)) {
      ev.push({ type: 'assessment', assessmentId, section: 'core', score: sum((out.core ?? []).map((x) => x.solved)), maxScore: out.core?.length ?? 0, estimatedRating: result.gr, at,
        detail: { sd: result.sdStat, sdTotal: result.total, puzzleScaleAbility: result.ab, items: out.core, map: `GR = ${ESTIMATE_CONFIG.puzzle.a} + ${ESTIMATE_CONFIG.puzzle.b} x theta`, durationSec: Math.round((Date.now() - t0.current) / 1000) } });
      lsSet('gc_last_assessment', at);
    }
    void postEvents(ev, setMe, me).then(() => refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (idx === -1) {
    return (
      <div className="lr-page lr-narrow stack">
        <p className="lr-eyebrow muted">Assessment</p>
        <h1>{single ? SECTION_NAMES[single] : id === 'placement' ? 'Placement test' : 'Re-assessment'}</h1>
        <ol className="steps">{sections.map((s) => <li key={s} className="steps__item"><span><strong>{SECTION_NAMES[s]}</strong> <span className="muted">· {SECTION_ROLE[s]}</span></span></li>)}</ol>
        <p>The core module follows the design of the Amsterdam Chess Test, the best-validated chess skill test: you are shown positions and choose the best move. In the original study this format correlated about 0.8 with players&apos; ratings.</p>
        <p className="muted">Work alone, without an engine or a board. Allow about 20–25 minutes. The result is a starting estimate with a wide interval; it narrows as you play rated games and train.</p>
        <div className="row"><button className="btn btn-primary btn-lg" onClick={() => { t0.current = Date.now(); setIdx(0); }} autoFocus>Begin</button><Link className="btn btn-ghost" to="/">Not now</Link></div>
      </div>
    );
  }
  if (idx >= sections.length) {
    const stage = result.gr != null ? stageForRating(graph.data, result.gr) : null;
    const stageName = graph.data?.stages.find((s) => s.id === stage)?.name;
    return (
      <div className="lr-page lr-narrow stack">
        <p className="lr-eyebrow muted">Assessment complete</p>
        {result.gr != null ? (
          <div className="card reward-pop stack">
            <p className="tile__label">{scaleLabel(result.gr)} · assessment only</p>
            <p className="lr-display">{result.gr}<span className="tile__unit">± {Math.round(1.96 * (result.total ?? 250))} (95%)</span></p>
            {stage && <p>Placement: <strong>stage {stage}{stageName ? ` (${stageName})` : ''}</strong>. Skills below this stage are credited; you can still study them.</p>}
            <p className="hint">Provisional: a single assessment cannot establish a FIDE-scale estimate. It combines with your rated games and puzzles on the <Link to="/progress">progress page</Link>.</p>
          </div>
        ) : <p>Section recorded.</p>}
        <div className="table-wrap"><table className="table table-compact"><tbody>
          {out.rules && <tr><th>Rules check</th><td>{out.rules.filter(Boolean).length}/{out.rules.length}</td><td className="muted">gate</td></tr>}
          {out.core && <tr><th>Choose-a-move (core)</th><td>{out.core.filter((x) => x.solved).length}/{out.core.length}{result.ab ? ` · ability ${result.ab.rating} ± ${result.ab.sd} (puzzle scale)` : ''}</td><td className="muted">rating</td></tr>}
          {out.judgement && <tr><th>Evaluate and compare</th><td>{Math.round((result.judgement ?? 0) * 100)}%{out.engine === false ? ' (engine unavailable: reference answers)' : ''}</td><td className="muted">diagnostic</td></tr>}
          {out.calculation && <tr><th>Calculation</th><td>{out.calculation.filter((x) => x.solved).length}/{out.calculation.length}</td><td className="muted">diagnostic</td></tr>}
          {out.endgame && <tr><th>Endgame knowledge</th><td>{out.endgame.filter(Boolean).length}/{out.endgame.length}</td><td className="muted">gate</td></tr>}
        </tbody></table></div>
        {stopEarly && <p>The rules check shows some gaps. Start with stage 1 lessons: how every piece moves, check, checkmate and the special rules.</p>}
        <p className="muted">How this is computed: core items are scored right/wrong and fitted with a logistic (Elo) model (EAP) to an ability on the Lichess puzzle scale, then mapped to the Grim Rating with GR = {ESTIMATE_CONFIG.puzzle.a} + {ESTIMATE_CONFIG.puzzle.b} × ability (prior map, measurement error ± {ESTIMATE_CONFIG.batterySigmaMap} added). Diagnostic and gate sections never change the rating. Method: <Link to="/kb/04-assessment/13-assessment-battery-design.md">assessment battery design</Link>.</p>
        <div className="row"><button className="btn btn-primary" onClick={() => nav('/')}>Go to today&apos;s plan</button><Link className="btn" to="/learn">Curriculum</Link></div>
      </div>
    );
  }
  return (
    <div className="lr-page">
      <header className="lr-head">
        <div><p className="lr-eyebrow muted">Section {idx + 1} of {sections.length} · {SECTION_ROLE[sec]}</p><h1>{SECTION_NAMES[sec]}</h1></div>
        <div className="progress" style={{ ['--value' as string]: (idx / sections.length) * 100, width: 160 }} role="progressbar" aria-label="Assessment progress" aria-valuenow={idx} aria-valuemin={0} aria-valuemax={sections.length}><div className="progress__bar" /></div>
      </header>
      {sec === 'rules' && <QuizRunner items={RULES_ITEMS} onDone={(r) => finishSection({ rules: r })} />}
      {sec === 'core' && <PuzzleSection kind="core" startPuzzle={startPuzzle} onPuzzle={() => { /* first-move-only items are not full puzzle solves: not posted to the puzzle pool */ }} onDone={(r) => finishSection({ core: r })} />}
      {sec === 'judgement' && <JudgementSection onDone={(s, e) => finishSection({ judgement: s, engine: e })} />}
      {sec === 'calculation' && <PuzzleSection kind="calculation" startPuzzle={Math.max(800, (result.ab?.rating ?? startPuzzle) - 100)} onPuzzle={onPuzzle} onDone={(r) => finishSection({ calculation: r })} />}
      {sec === 'endgame' && <QuizRunner items={ENDGAME_ITEMS} onDone={(r) => finishSection({ endgame: r })} />}
    </div>
  );
}
