// Board-vision drills: coordinates (click / name the square) and visualization (blindfold-style).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Eye, EyeOff } from 'lucide-react';
import { Board } from '../../components/Board.tsx';
import { useSession } from '../../lib/session.tsx';
import { lsGet, lsSet, nowIso, postEvents, shuffle } from './util.ts';

const FILES = 'abcdefgh', RANKS = '12345678';
const randSquare = () => FILES[Math.floor(Math.random() * 8)] + RANKS[Math.floor(Math.random() * 8)];
const EMPTY = '8/8/8/8/8/8/8/8 w - - 0 1';
const ROUND_SEC = 30;

export function CoordinatesDrillPage() {
  const { me, setMe } = useSession();
  const [mode, setMode] = useState<'click' | 'name'>('click');
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [running, setRunning] = useState(false);
  const [target, setTarget] = useState(randSquare());
  const [score, setScore] = useState({ ok: 0, bad: 0 });
  const [left, setLeft] = useState(ROUND_SEC);
  const [flash, setFlash] = useState<'correct' | 'wrong' | undefined>();
  const [typed, setTyped] = useState('');
  const best = lsGet<Record<string, number>>('gc_coord_best', {});
  const scoreRef = useRef(score); scoreRef.current = score;

  useEffect(() => {
    if (!running) return;
    const t0 = Date.now();
    const id = window.setInterval(() => {
      const l = ROUND_SEC - Math.floor((Date.now() - t0) / 1000);
      setLeft(Math.max(0, l));
      if (l <= 0) { clearInterval(id); end(); }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const end = () => {
    setRunning(false);
    const s = scoreRef.current, key = `${mode}:${orientation}`;
    if (s.ok > (best[key] ?? 0)) lsSet('gc_coord_best', { ...best, [key]: s.ok });
    void postEvents([{ type: 'drill', drill: 'coordinate-drill', skillIds: ['rules.board.coordinates'], score: s.ok + s.bad ? +(s.ok / (s.ok + s.bad)).toFixed(3) : 0, durationSec: ROUND_SEC, at: nowIso(), detail: { mode, orientation, correct: s.ok, wrong: s.bad } }], setMe, me);
  };
  const start = () => { setScore({ ok: 0, bad: 0 }); setLeft(ROUND_SEC); setTarget(randSquare()); setRunning(true); setTyped(''); };
  const answer = (sq: string) => {
    if (!running) return;
    const ok = sq === target;
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), bad: s.bad + (ok ? 0 : 1) }));
    setFlash(ok ? 'correct' : 'wrong'); setTimeout(() => setFlash(undefined), 250);
    let n = randSquare(); while (n === target) n = randSquare();
    setTarget(n); setTyped('');
  };

  return (
    <div className="lr-page">
      <header className="lr-head">
        <div><p className="lr-eyebrow muted">Drill</p><h1>Coordinates</h1></div>
        <div className="row">
          <div className="segmented" role="group" aria-label="Mode">
            <button aria-pressed={mode === 'click'} onClick={() => setMode('click')} disabled={running}>Find the square</button>
            <button aria-pressed={mode === 'name'} onClick={() => setMode('name')} disabled={running}>Name the square</button>
          </div>
          <div className="segmented" role="group" aria-label="Board side">
            <button aria-pressed={orientation === 'white'} onClick={() => setOrientation('white')} disabled={running}>White</button>
            <button aria-pressed={orientation === 'black'} onClick={() => setOrientation('black')} disabled={running}>Black</button>
          </div>
        </div>
      </header>
      <div className="lr-train">
        <div className="lr-train__board">
          <div className="lr-board lr-coord" data-state={flash}>
            <Board fen={EMPTY} free orientation={orientation} coordinates={!running} onSquareClick={mode === 'click' ? answer : undefined}
              highlights={running && mode === 'name' ? [target] : []} />
            {running && mode === 'click' && <div className="lr-coord__target" aria-live="polite">{target}</div>}
          </div>
        </div>
        <aside className="lr-train__side stack">
          <div className="tile-grid">
            <div className="tile"><p className="tile__label">Time</p><p className="tile__value">{left}s</p></div>
            <div className="tile"><p className="tile__label">Correct</p><p className="tile__value">{score.ok}</p><p className="tile__delta">{score.bad} wrong · best {best[`${mode}:${orientation}`] ?? 0}</p></div>
          </div>
          {running && mode === 'name' && (
            <form className="stack" onSubmit={(e) => { e.preventDefault(); answer(typed.trim().toLowerCase()); }}>
              <label className="field"><span className="label">Which square is highlighted?</span>
                <input className="input input-mono" autoFocus value={typed} maxLength={2} onChange={(e) => {
                  const v = e.target.value.toLowerCase(); setTyped(v);
                  if (/^[a-h][1-8]$/.test(v)) answer(v);
                }} aria-describedby="coord-hint" /></label>
              <p className="hint" id="coord-hint">Type a file and rank, e.g. e4.</p>
            </form>
          )}
          {!running && <button className="btn btn-primary btn-lg" onClick={start}>{score.ok + score.bad ? 'Again' : 'Start'} ({ROUND_SEC}s)</button>}
          <p className="muted">Coordinates are hidden during the round. Practise both sides of the board: reading games and notation needs both.</p>
        </aside>
      </div>
    </div>
  );
}

// ---------- Visualization ----------
interface VizQuestion { prompt: string; answer: string; choices: string[] }
const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function randomGameLine(plies: number): { start: string; moves: string[]; end: string } {
  // Play a random but sensible opening from the start, then return the next `plies` moves as the hidden sequence.
  const c = new Chess();
  const warm = 4 + Math.floor(Math.random() * 6);
  for (let i = 0; i < warm; i++) { const ms = c.moves(); if (!ms.length) break; c.move(ms[Math.floor(Math.random() * ms.length)]); }
  const start = c.fen(); const moves: string[] = [];
  for (let i = 0; i < plies; i++) {
    const ms = c.moves(); if (!ms.length) break;
    const caps = ms.filter((m) => m.includes('x'));
    const mv = caps.length && Math.random() < 0.3 ? caps[Math.floor(Math.random() * caps.length)] : ms[Math.floor(Math.random() * ms.length)];
    moves.push(c.move(mv).san);
  }
  return { start, moves, end: c.fen() };
}

function makeQuestion(fen: string): VizQuestion {
  const c = new Chess(fen);
  const board = c.board().flat().filter(Boolean) as { square: string; type: string; color: string }[];
  const kind = Math.random();
  if (kind < 0.5) {
    const p = board[Math.floor(Math.random() * board.length)];
    const ans = `${p.color === 'w' ? 'White' : 'Black'} ${PIECE_NAME[p.type]}`;
    const opts = new Set([ans, 'Empty']);
    for (const q of shuffle(board)) { if (opts.size >= 4) break; opts.add(`${q.color === 'w' ? 'White' : 'Black'} ${PIECE_NAME[q.type]}`); }
    return { prompt: `What is on ${p.square}?`, answer: ans, choices: shuffle([...opts]) };
  }
  if (kind < 0.75) {
    const empties: string[] = [];
    for (const f of FILES) for (const r of RANKS) if (!c.get((f + r) as 'a1')) empties.push(f + r);
    const sq = empties[Math.floor(Math.random() * empties.length)];
    const opts = new Set(['Empty']);
    for (const q of shuffle(board)) { if (opts.size >= 4) break; opts.add(`${q.color === 'w' ? 'White' : 'Black'} ${PIECE_NAME[q.type]}`); }
    return { prompt: `What is on ${sq}?`, answer: 'Empty', choices: shuffle([...opts]) };
  }
  const inCheck = c.inCheck();
  return { prompt: `Is the side to move (${c.turn() === 'w' ? 'White' : 'Black'}) in check?`, answer: inCheck ? 'Yes' : 'No', choices: ['Yes', 'No'] };
}

export function VisualizationDrillPage() {
  const { me, setMe } = useSession();
  const [plies, setPlies] = useState(4);
  const [nextPlies, setNextPlies] = useState(4);
  const [round, setRound] = useState(0);
  const line = useMemo(() => randomGameLine(plies), [plies, round]);
  const [phase, setPhase] = useState<'study' | 'read' | 'answer' | 'done'>('study');
  const [qs, setQs] = useState<VizQuestion[]>([]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const t0 = useRef(Date.now());

  useEffect(() => { setPhase('study'); setQi(0); setPicked(null); setCorrect(0); setQs([makeQuestion(line.end), makeQuestion(line.end), makeQuestion(line.end)]); t0.current = Date.now(); }, [line]);

  const pick = (c: string) => {
    if (picked) return;
    setPicked(c);
    const ok = c === qs[qi].answer;
    if (ok) setCorrect((x) => x + 1);
  };
  const nextQ = () => {
    if (qi + 1 < qs.length) { setQi(qi + 1); setPicked(null); return; }
    setPhase('done');
    const score = correct / qs.length;
    void postEvents([{ type: 'drill', drill: 'visualization-drill', skillIds: [plies <= 4 ? 'calculation.board-vision' : plies <= 8 ? 'calculation.visualization.basic' : plies <= 12 ? 'calculation.visualization.intermediate' : 'calculation.visualization.advanced'], score: +score.toFixed(3), durationSec: Math.round((Date.now() - t0.current) / 1000), at: nowIso(), detail: { plies } }], setMe, me);
    setNextPlies(score === 1 && plies < 16 ? plies + 2 : score < 0.5 && plies > 2 ? plies - 2 : plies);
  };
  const numbered = (() => {
    const c = new Chess(line.start); const parts: string[] = [];
    let num = Number(line.start.split(' ')[5]); let white = c.turn() === 'w';
    line.moves.forEach((m, i) => { if (white) parts.push(`${num}. ${m}`); else parts.push(i === 0 ? `${num}... ${m}` : m); if (!white) num++; white = !white; });
    return parts.join(' ');
  })();

  return (
    <div className="lr-page">
      <header className="lr-head">
        <div><p className="lr-eyebrow muted">Drill</p><h1>Visualization</h1></div>
        <span className="badge badge-lg badge-accent">{plies} moves deep</span>
      </header>
      <div className="lr-train">
        <div className="lr-train__board">
          <div className="lr-board">
            <Board fen={phase === 'study' ? line.start : phase === 'done' ? line.end : EMPTY} free={phase !== 'study' && phase !== 'done'} />
          </div>
        </div>
        <aside className="lr-train__side stack">
          {phase === 'study' && <>
            <p><Eye aria-hidden="true" size={16} /> Memorise this position. Next the pieces disappear and you read {plies} half-moves in notation, playing them in your head.</p>
            <button className="btn btn-primary" onClick={() => setPhase('read')} autoFocus>Hide the pieces</button>
          </>}
          {phase === 'read' && <>
            <p><EyeOff aria-hidden="true" size={16} /> Play these moves in your mind:</p>
            <p className="lr-notation">{numbered}</p>
            <button className="btn btn-primary" onClick={() => setPhase('answer')} autoFocus>I have it: ask me</button>
          </>}
          {phase === 'answer' && qs[qi] && <>
            <p className="lr-notation muted">{numbered}</p>
            <h2>{qs[qi].prompt}</h2>
            <div className="lr-choices">{qs[qi].choices.map((c) => (
              <button key={c} className="lr-choice" onClick={() => pick(c)} data-state={picked ? (c === qs[qi].answer ? 'correct' : c === picked ? 'wrong' : undefined) : undefined}>{c}</button>
            ))}</div>
            {picked && <button className="btn btn-primary" onClick={nextQ} autoFocus>{qi + 1 < qs.length ? 'Next question' : 'See the position'}</button>}
          </>}
          {phase === 'done' && <>
            <h2>{correct}/{qs.length} correct</h2>
            <p className="muted">Depth adapts: all correct adds two half-moves, under half removes two.</p>
            <button className="btn btn-primary" onClick={() => { setPlies(nextPlies); setRound((r) => r + 1); }} autoFocus>Next round</button>
          </>}
        </aside>
      </div>
    </div>
  );
}
