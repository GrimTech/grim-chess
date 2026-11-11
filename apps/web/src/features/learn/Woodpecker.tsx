// Woodpecker method (Smith & Tikkanen): one fixed puzzle set solved in repeated cycles, each cycle in half the
// time of the previous one, so the patterns become automatic. State is kept per device (localStorage).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Timer, RotateCcw } from 'lucide-react';
import type { Puzzle } from '@grim/core';
import { api } from '../../lib/api.ts';
import { useSession } from '../../lib/session.tsx';
import { PuzzleBoard, type PuzzleResult } from './PuzzleBoard.tsx';
import { fmtTime, lsGet, lsSet, nowIso, postEvents } from './util.ts';

interface Cycle { k: number; elapsedSec: number; index: number; solved: number; done: boolean; startedAt: string; finishedAt?: string }
interface WoodpeckerState { createdAt: string; puzzles: Puzzle[]; cycles: Cycle[] }
const KEY = 'gc_woodpecker';
export const MAX_CYCLES = 7;

export function cycleTarget(cycles: Cycle[], k: number): number | null {
  const prev = cycles.find((c) => c.k === k - 1 && c.done);
  return prev ? Math.round(prev.elapsedSec / 2) : null;
}

export function WoodpeckerPage() {
  const { me, setMe } = useSession();
  const [st, setSt] = useState<WoodpeckerState | null>(() => lsGet<WoodpeckerState | null>(KEY, null));
  const [size, setSize] = useState(50);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [last, setLast] = useState<PuzzleResult | null>(null);
  const save = (s: WoodpeckerState | null) => { setSt(s); lsSet(KEY, s); };

  const create = async () => {
    setCreating(true); setErr(null);
    try {
      const r = me?.ratings.puzzle?.rating ?? 1200;
      // Woodpecker sets are deliberately a bit below the solver's level so that speed can grow.
      const puzzles = await api.puzzleSet({ count: size, min: Math.max(400, Math.round(r - 400)), max: Math.round(r) });
      if (!puzzles.length) throw new Error('No puzzles returned.');
      save({ createdAt: nowIso(), puzzles, cycles: [{ k: 1, elapsedSec: 0, index: 0, solved: 0, done: false, startedAt: nowIso() }] });
    } catch (e) { setErr((e as Error).message); } finally { setCreating(false); }
  };

  if (!st) {
    return (
      <div className="lr-page lr-narrow">
        <p className="lr-eyebrow muted">Train</p>
        <h1>Woodpecker method</h1>
        <p>Solve one fixed set of puzzles again and again. Each cycle must be finished in <strong>half the time</strong> of the previous one, up to {MAX_CYCLES} cycles. The repetition moves patterns from slow calculation into instant recognition.</p>
        <div className="card stack">
          <label className="field"><span className="label">Set size</span>
            <span className="select-wrap"><select className="select" value={size} onChange={(e) => setSize(Number(e.target.value))}>
              {[20, 50, 100, 200].map((n) => <option key={n} value={n}>{n} puzzles</option>)}
            </select></span>
            <span className="hint">The original method uses about 1,000 puzzles; smaller sets suit shorter daily sessions.</span>
          </label>
          <button className="btn btn-primary" onClick={create} disabled={creating} aria-busy={creating}>Create my set</button>
          {err && <p className="error" role="alert">{err}</p>}
        </div>
      </div>
    );
  }

  const cur = st.cycles[st.cycles.length - 1];
  const target = cycleTarget(st.cycles, cur.k);
  const puzzle = st.puzzles[cur.index];

  const onResult = (r: PuzzleResult) => {
    setLast(r);
    const cycles = st.cycles.map((c) => (c === cur ? { ...c, elapsedSec: c.elapsedSec + r.durationSec, solved: c.solved + (r.solved && r.firstTry ? 1 : 0) } : c));
    save({ ...st, cycles });
    if (cur.k === 1 && puzzle) {
      // Only the first, unseen pass feeds the puzzle rating (repeated puzzles would inflate it).
      void postEvents([{ type: 'puzzle', puzzleId: puzzle.id, puzzleRating: puzzle.rating, themes: puzzle.themes, solved: r.solved, firstTry: r.firstTry, durationSec: r.durationSec, at: nowIso() }], setMe, me);
    }
  };
  const advance = () => {
    const c = st.cycles[st.cycles.length - 1];
    const idx = c.index + 1;
    setLast(null);
    if (idx >= st.puzzles.length) {
      const fin = { ...c, index: idx, done: true, finishedAt: nowIso() };
      save({ ...st, cycles: [...st.cycles.slice(0, -1), fin] });
      setActive(false);
      void postEvents([{ type: 'drill', drill: 'puzzle', skillIds: [], score: +(fin.solved / st.puzzles.length).toFixed(3), durationSec: fin.elapsedSec, at: nowIso(),
        detail: { method: 'woodpecker', cycle: fin.k, setSize: st.puzzles.length, targetSec: target } }], setMe, me);
    } else save({ ...st, cycles: [...st.cycles.slice(0, -1), { ...c, index: idx }] });
  };
  const nextCycle = () => save({ ...st, cycles: [...st.cycles, { k: cur.k + 1, elapsedSec: 0, index: 0, solved: 0, done: false, startedAt: nowIso() }] });
  const over = target != null && cur.elapsedSec > target;

  return (
    <div className="lr-page">
      <header className="lr-head">
        <div><p className="lr-eyebrow muted">Woodpecker · {st.puzzles.length} puzzles</p><h1>Cycle {cur.k}{cur.done ? ' complete' : ''}</h1></div>
        <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm('Discard this Woodpecker set and all cycle history?')) save(null); }}><RotateCcw aria-hidden="true" /> New set</button>
      </header>
      <div className="tile-grid">
        <div className="tile"><p className="tile__label">Progress</p><p className="tile__value">{Math.min(cur.index, st.puzzles.length)}<span className="tile__unit">/ {st.puzzles.length}</span></p></div>
        <div className="tile"><p className="tile__label">Cycle time</p><p className={`tile__value ${over ? 'lr-bad' : ''}`}>{fmtTime(cur.elapsedSec)}</p>
          <p className="tile__delta">{target != null ? `target ${fmtTime(target)}` : 'first cycle: no target'}</p></div>
        <div className="tile"><p className="tile__label">Solved first try</p><p className="tile__value">{cur.solved}</p></div>
      </div>
      {cur.done ? (
        <div className="card stack">
          <h2>Cycle {cur.k}: {fmtTime(cur.elapsedSec)}, {Math.round((cur.solved / st.puzzles.length) * 100)}% correct</h2>
          {cur.k < MAX_CYCLES ? (
            <>
              <p>Next target: <strong>{fmtTime(Math.round(cur.elapsedSec / 2))}</strong>. The method recommends a short rest between cycles; later cycles are naturally faster as recognition takes over.</p>
              <button className="btn btn-primary" onClick={nextCycle}>Start cycle {cur.k + 1}</button>
            </>
          ) : <p>All {MAX_CYCLES} cycles done. Start a new set with harder puzzles.</p>}
          <table className="table table-compact"><thead><tr><th>Cycle</th><th>Time</th><th>Target</th><th>Correct</th></tr></thead>
            <tbody>{st.cycles.map((c) => <tr key={c.k}><td>{c.k}</td><td>{fmtTime(c.elapsedSec)}</td><td>{cycleTarget(st.cycles, c.k) != null ? fmtTime(cycleTarget(st.cycles, c.k)!) : '—'}</td><td>{c.solved}</td></tr>)}</tbody></table>
        </div>
      ) : !active ? (
        <div className="card stack">
          <p>{cur.index ? `Resume at puzzle ${cur.index + 1}.` : `Ready for cycle ${cur.k}?`} The clock runs only while you are solving.</p>
          <button className="btn btn-primary" onClick={() => setActive(true)}><Timer aria-hidden="true" /> {cur.index ? 'Resume' : 'Start'}</button>
        </div>
      ) : puzzle ? (
        <div className="lr-train">
          <div className="lr-train__board"><PuzzleBoard key={`${cur.k}:${cur.index}`} puzzle={puzzle} onResult={onResult} strict hideControls /></div>
          <aside className="lr-train__side stack">
            {last && <><p className={last.solved ? 'lr-ok' : 'lr-bad'}>{last.solved ? 'Correct' : 'Missed: the solution arrow is shown.'}</p>
              <button className="btn btn-primary" onClick={advance} autoFocus>Next</button></>}
            <button className="btn btn-ghost btn-sm" onClick={() => setActive(false)}>Pause</button>
            <Link to="/train" className="btn btn-ghost btn-sm">Back to training</Link>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
