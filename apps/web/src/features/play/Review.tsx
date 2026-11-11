// /review and /review/:id: full game review (classification, accuracy, ACPL, eval graph) and
// "retry your mistakes": the learner replays each mistake position and must find a better move
// (deliberate practice with immediate engine feedback).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, RotateCcw, Target, X } from 'lucide-react';
import type { TrainingEvent } from '@grim/core';
import { Board, type BoardArrow, type BoardMove } from '../../components/Board.tsx';
import { api } from '../../lib/api.ts';
import { analyse, analyseGame } from '../../lib/engine.ts';
import { EvalBar, evalLabel } from './components/EvalBar.tsx';
import { EvalGraph } from './components/EvalGraph.tsx';
import { MoveList, MoveNav, figurine } from './components/MoveList.tsx';
import { PgnTools } from './components/PgnTools.tsx';
import { applyUci, buildPgn, moveLabel, other, parsePgnOrFen, turnOf, whiteCp, type Color, type ParsedGame } from './lib/chess.ts';
import { CLASS_LABEL, dropBetween, isError, reviewGame, type GameReview } from './lib/review.ts';
import { usePlyKeys } from './lib/useKeys.ts';

interface ReviewSource { game: ParsedGame; color: Color; title: string; evals?: number[] }

export function Review() {
  const { id } = useParams();
  const location = useLocation();
  const [src, setSrc] = useState<ReviewSource | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const st = location.state as { pgn?: string; evals?: number[]; color?: Color; title?: string } | null;
    if (id) {
      api.games().then((gs) => {
        const g = gs.find((x) => x.id === id);
        if (!g) { setErr('Game not found.'); return; }
        setSrc({ game: parsePgnOrFen(g.pgn), color: g.color === 'black' ? 'black' : 'white', title: `vs ${g.opponent}` });
      }).catch((e: Error) => setErr(`Could not load the game: ${e.message}`));
      return;
    }
    if (st?.pgn) {
      try {
        const game = parsePgnOrFen(st.pgn);
        const evals = st.evals && st.evals.length === game.plies.length + 1 ? st.evals : undefined;
        setSrc({ game, color: st.color ?? 'white', title: st.title ?? 'Game review', evals });
      } catch (e) { setErr(`Invalid PGN: ${(e as Error).message}`); }
    }
  }, [id, location.state]);

  if (err) return <div className="play-page"><header className="play-header"><Link to="/play" className="muted">← Play</Link><h1>Game review</h1></header><p className="error">{err}</p><ReviewPicker onPick={(s) => { setErr(null); setSrc(s); }} /></div>;
  if (!src) {
    return (
      <div className="play-page">
        <header className="play-header"><Link to="/play" className="muted">← Play</Link><h1>Game review</h1>
          <p className="muted">Paste a PGN or choose one of your recent games. Every move is checked by Stockfish and classified; then you can retry your mistakes.</p></header>
        {id ? <div className="skeleton" style={{ height: 200 }} /> : <ReviewPicker onPick={setSrc} />}
      </div>
    );
  }
  return <ReviewView key={src.title + src.game.plies.length} src={src} />;
}

function ReviewPicker({ onPick }: { onPick: (s: ReviewSource) => void }) {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [color, setColor] = useState<Color>('white');
  const [err, setErr] = useState<string | null>(null);
  const [games, setGames] = useState<Awaited<ReturnType<typeof api.games>> | null>(null);
  useEffect(() => { api.games().then(setGames).catch(() => setGames([])); }, []);
  return (
    <div className="play-lobby">
      <section className="card">
        <h2 className="card__title">Paste a PGN</h2>
        <div className="field">
          <label className="label" htmlFor="review-pgn">PGN</label>
          <textarea id="review-pgn" className="textarea input-mono" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="field">
          <span className="label" id="review-side">Review as</span>
          <div className="segmented" role="radiogroup" aria-labelledby="review-side">
            {(['white', 'black'] as const).map((c) => <button key={c} type="button" role="radio" aria-checked={color === c} onClick={() => setColor(c)}>{c === 'white' ? 'White' : 'Black'}</button>)}
          </div>
        </div>
        {err && <p className="error">{err}</p>}
        <div className="row"><button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={() => {
          try { const g = parsePgnOrFen(text); if (!g.plies.length) throw new Error('no moves found'); onPick({ game: g, color, title: g.headers.White && g.headers.Black ? `${g.headers.White} vs ${g.headers.Black}` : 'Pasted game' }); }
          catch (e) { setErr(`Could not read the PGN: ${(e as Error).message}`); }
        }}>Review</button></div>
      </section>
      <section className="card">
        <h2 className="card__title">Your recent games</h2>
        {games == null ? <div className="skeleton" style={{ height: 120 }} /> : games.length === 0 ? <p className="muted">No saved games yet. <Link to="/play/computer">Play the computer</Link>.</p> : (
          <div className="table-wrap">
            <table className="table table-compact">
              <thead><tr><th>Date</th><th>Opponent</th><th>Result</th><th>Accuracy</th><th /></tr></thead>
              <tbody>
                {games.slice(0, 25).map((g) => (
                  <tr key={g.id}>
                    <td>{g.at.slice(0, 10)}</td><td>{g.opponent} <span className="muted">({g.mode})</span></td>
                    <td><span className={`result ${g.result === 1 ? 'result-win' : g.result === 0 ? 'result-loss' : 'result-draw'}`}>{g.result === 1 ? 'Win' : g.result === 0 ? 'Loss' : 'Draw'}</span></td>
                    <td>{g.accuracy != null ? `${Math.round(g.accuracy)}%` : '–'}</td>
                    <td><button type="button" className="btn btn-sm" onClick={() => navigate(`/review/${g.id}`)}>Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ReviewView({ src }: { src: ReviewSource }) {
  const { game } = src;
  const fens = useMemo(() => [game.startFen, ...game.plies.map((p) => p.fen)], [game]);
  const [learner, setLearner] = useState<Color>(src.color);
  const [evals, setEvals] = useState<number[] | null>(src.evals ?? null);
  const [progress, setProgress] = useState<[number, number]>([0, fens.length]);
  const [analysisErr, setAnalysisErr] = useState<string | null>(null);
  const [best, setBest] = useState<Record<number, string>>({});
  const [cursor, setCursor] = useState(0);
  const [orientation, setOrientation] = useState<Color>(src.color);
  const [retry, setRetry] = useState<number[] | null>(null);

  useEffect(() => {
    if (evals) return;
    const ctl = new AbortController();
    analyseGame(fens, { depth: 12, movetimeMs: 1000, signal: ctl.signal, onProgress: (d, t) => setProgress([d, t]) })
      .then(setEvals).catch((e: Error) => { if (e.name !== 'AbortError') setAnalysisErr(e.message); });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const review: GameReview | null = useMemo(() => (evals ? reviewGame(evals, fens) : null), [evals, fens]);
  const classes = review?.moves.map((m) => m.cls);

  // best moves for every inaccuracy/mistake/blunder (both sides), computed after the main pass
  useEffect(() => {
    if (!review) return;
    const ctl = new AbortController();
    (async () => {
      for (const m of review.moves) {
        if (!isError(m.cls) || ctl.signal.aborted) continue;
        try {
          const [l] = await analyse(fens[m.ply], { depth: 14, movetimeMs: 1500, signal: ctl.signal });
          if (l?.pv[0]) setBest((b) => ({ ...b, [m.ply]: l.pv[0] }));
        } catch { if (ctl.signal.aborted) return; }
      }
    })();
    return () => ctl.abort();
  }, [review, fens]);

  const mistakesFor = (c: Color) => review?.moves.filter((m) => m.mover === c && (m.cls === 'mistake' || m.cls === 'blunder')).map((m) => m.ply) ?? [];
  const retryList = () => {
    const ms = mistakesFor(learner);
    return ms.length ? ms : review?.moves.filter((m) => m.mover === learner && m.cls === 'inaccuracy').map((m) => m.ply) ?? [];
  };

  usePlyKeys(cursor, game.plies.length, (p) => { if (!retry) setCursor(p); }, { f: () => setOrientation((o) => other(o)) });

  if (retry) return <RetryMode items={retry} fens={fens} game={game} review={review!} best={best} learner={learner} title={src.title} onExit={() => setRetry(null)} />;

  const fen = fens[cursor];
  const curMove = cursor > 0 ? review?.moves[cursor - 1] : undefined;
  const curPly = cursor > 0 ? game.plies[cursor - 1] : undefined;
  const evalCp = evals ? evals[cursor] : null;
  const lastMove = curPly ? [curPly.from, curPly.to] as [string, string] : null;
  const bestUci = curMove ? best[curMove.ply] : undefined;
  const arrows: BoardArrow[] = [];
  if (bestUci && curMove && isError(curMove.cls)) arrows.push([bestUci.slice(0, 2), bestUci.slice(2, 4), 'green']);
  const bestSan = bestUci && curMove ? applyUci(fens[curMove.ply], bestUci)?.san : undefined;
  const errorsAll = review?.moves.filter((m) => isError(m.cls) && m.mover === learner).map((m) => m.ply + 1) ?? [];
  const nextErr = errorsAll.find((p) => p > cursor), prevErr = [...errorsAll].reverse().find((p) => p < cursor);

  return (
    <div className="play-page play-game">
      <div className="layout-board">
        <div className="layout-board__eval"><EvalBar cp={evalCp} orientation={orientation} /></div>
        <div className="layout-board__board">
          <div className="player-strip"><span className={`play-colordot is-${other(orientation)}`} /><span className="player-strip__name">{game.headers[other(orientation) === 'white' ? 'White' : 'Black'] ?? (other(orientation) === 'white' ? 'White' : 'Black')}</span></div>
          <Board fen={fen} orientation={orientation} movable="none" lastMove={lastMove} arrows={arrows} />
          <div className="player-strip"><span className={`play-colordot is-${orientation}`} /><span className="player-strip__name">{game.headers[orientation === 'white' ? 'White' : 'Black'] ?? (orientation === 'white' ? 'White' : 'Black')}</span></div>
        </div>
        <aside className="layout-board__side">
          <div className="row play-analysis-head">
            <Link to="/play" className="muted">← Play</Link>
            <h1 className="play-analysis-title">Review: {src.title}</h1>
          </div>
          {!review ? (
            <div className="card">
              {analysisErr ? <p className="error">Analysis failed: {analysisErr}</p> : <>
                <p className="hint">Stockfish is checking every move… {progress[0]}/{progress[1]}</p>
                <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((progress[0] / (progress[1] || 1)) * 100)}
                  style={{ ['--value' as string]: Math.round((progress[0] / (progress[1] || 1)) * 100) }}><div className="progress__bar" /></div>
              </>}
            </div>
          ) : (
            <>
              <SummaryTable review={review} learner={learner} setLearner={setLearner} />
              <div className="card play-current" aria-live="polite">
                {curMove && curPly ? (
                  <p style={{ margin: 0 }}>
                    <strong>{moveLabel(game.startFen, curMove.ply)} {figurine(curPly.san)}</strong>{' '}
                    <span className="glyph" data-q={curMove.cls}>{CLASS_LABEL[curMove.cls]}</span>{' '}
                    <span className="muted">({evalLabel(evals![cursor])})</span>
                    {isError(curMove.cls) && <><br /><span className="muted">{bestSan ? <>Better was <strong>{figurine(bestSan)}</strong>.</> : 'Finding the better move…'}</span></>}
                  </p>
                ) : <p className="muted" style={{ margin: 0 }}>Start position. Use → or click a move.</p>}
                <div className="row">
                  <button type="button" className="btn btn-sm" disabled={prevErr == null} onClick={() => prevErr != null && setCursor(prevErr)}><ArrowLeft size={16} strokeWidth={1.75} /> Prev mistake</button>
                  <button type="button" className="btn btn-sm" disabled={nextErr == null} onClick={() => nextErr != null && setCursor(nextErr)}>Next mistake <ArrowRight size={16} strokeWidth={1.75} /></button>
                  {curMove && isError(curMove.cls) && curMove.mover === learner && (
                    <button type="button" className="btn btn-sm btn-soft" onClick={() => setRetry([curMove.ply])}><RotateCcw size={16} strokeWidth={1.75} /> Retry this position</button>
                  )}
                </div>
              </div>
              <button type="button" className="btn btn-primary" disabled={!retryList().length} onClick={() => setRetry(retryList())}>
                <Target size={18} strokeWidth={1.75} /> {retryList().length ? `Retry my ${retryList().length} mistake${retryList().length > 1 ? 's' : ''}` : 'No mistakes to retry'}
              </button>
            </>
          )}
          <div className="card card-flush panel-grow">
            <MoveList sans={game.plies.map((p) => p.san)} current={cursor} onSelect={setCursor} startFen={game.startFen} classes={classes} result={game.headers.Result} />
            <MoveNav current={cursor} total={game.plies.length} onSelect={setCursor} />
          </div>
          <details className="card play-details"><summary>Export</summary><PgnTools fen={fen} pgn={pgnFrom(game)} filename="grim-review.pgn" /></details>
        </aside>
        {evals && <div className="layout-board__below"><EvalGraph evals={evals} current={cursor} onSelect={setCursor} classes={classes} /></div>}
      </div>
    </div>
  );
}

const pgnFrom = (g: ParsedGame): string => buildPgn(g.startFen, g.plies, g.headers, g.headers.Result ?? '*');

function SummaryTable({ review, learner, setLearner }: { review: GameReview; learner: Color; setLearner: (c: Color) => void }) {
  const row = (label: string, f: (s: GameReview['white']) => string) => <tr><th scope="row">{label}</th><td>{f(review.white)}</td><td>{f(review.black)}</td></tr>;
  return (
    <div className="card card-flush">
      <table className="table table-compact play-summary">
        <thead><tr><th />
          {(['white', 'black'] as const).map((c) => (
            <th key={c}><button type="button" className={`btn btn-sm ${learner === c ? 'btn-soft' : 'btn-ghost'}`} aria-pressed={learner === c} onClick={() => setLearner(c)} title="Review as this side">{c === 'white' ? 'White' : 'Black'}{learner === c ? ' (you)' : ''}</button></th>
          ))}
        </tr></thead>
        <tbody>
          {row('Accuracy', (s) => (s.accuracy != null ? `${s.accuracy.toFixed(1)}%` : '–'))}
          {row('Avg. cp loss', (s) => (s.acpl != null ? String(Math.round(s.acpl)) : '–'))}
          {row('Inaccuracies', (s) => String(s.inaccuracy))}
          {row('Mistakes', (s) => String(s.mistake))}
          {row('Blunders', (s) => String(s.blunder))}
        </tbody>
      </table>
    </div>
  );
}

type Attempt = 'pending' | 'checking' | 'correct' | 'good' | 'wrong' | 'revealed';

function RetryMode({ items, fens, game, review, best, learner, title, onExit }: {
  items: number[]; fens: string[]; game: ParsedGame; review: GameReview; best: Record<number, string>; learner: Color; title: string; onExit: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [state, setState] = useState<Attempt>('pending');
  const [tries, setTries] = useState(0);
  const [feedback, setFeedback] = useState<string>('');
  const [boardFen, setBoardFen] = useState(fens[items[0]]);
  const [lastTry, setLastTry] = useState<[string, string] | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const started = useRef(Date.now());
  const posted = useRef(false);
  const done = idx >= items.length;
  const ply = items[Math.min(idx, items.length - 1)];
  const fen = fens[ply];
  const mv = review.moves[ply];
  const played = game.plies[ply];
  const bestUci = best[ply];
  const [fallbackBest, setFallbackBest] = useState<Record<number, string>>({});
  const bestMove = bestUci ?? fallbackBest[ply];

  useEffect(() => {
    if (done || bestMove) return;
    let live = true;
    analyse(fen, { depth: 14, movetimeMs: 1500 }).then(([l]) => { if (live && l?.pv[0]) setFallbackBest((b) => ({ ...b, [ply]: l.pv[0] })); }).catch(() => undefined);
    return () => { live = false; };
  }, [done, bestMove, fen, ply]);

  useEffect(() => {
    if (!done || posted.current || !results.length) return;
    posted.current = true;
    const solved = results.filter(Boolean).length;
    const ev: TrainingEvent = {
      type: 'drill', drill: 'game-review', skillIds: [], score: solved / results.length,
      durationSec: Math.round((Date.now() - started.current) / 1000), at: new Date().toISOString(),
      detail: { source: 'retry-mistakes', positions: results.length, solved, title },
    };
    void api.postEvents([ev]).catch(() => undefined);
  }, [done, results, title]);

  const finishItem = (ok: boolean) => setResults((r) => { const n = [...r]; n[idx] = ok; return n; });

  const onMove = (m: BoardMove) => {
    if (state === 'checking' || state === 'correct' || state === 'good' || state === 'revealed') return false;
    const uci = m.from + m.to + (m.promotion ?? '');
    setLastTry([m.from, m.to]);
    if (uci === played.uci) { wrong('That is the move from the game. Look for something better.'); return false; }
    if (bestMove && uci === bestMove) { setBoardFen(m.fenAfter); setState('correct'); setFeedback('Correct: that is the engine’s top move.'); finishItem(tries === 0); return; }
    setBoardFen(m.fenAfter);
    setState('checking'); setFeedback('Checking your move…');
    analyse(m.fenAfter, { depth: 12, movetimeMs: 1200 }).then(([l]) => {
      const wcp = whiteCp(l, turnOf(m.fenAfter));           // White POV
      const moverCp = learner === 'white' ? wcp : -wcp;      // learner POV
      // accept anything that is not an inaccuracy relative to the best line (win% drop < 10)
      const drop = dropBetween(mv.cpBefore, moverCp);
      if (drop < 10) { setState('good'); setFeedback(`Good move: it keeps the position (${evalLabel(wcp)}).`); finishItem(tries === 0); }
      else { setBoardFen(fen); wrong(`Not quite: that still loses ground (${evalLabel(wcp)}). Try again.`); }
    }).catch(() => { setBoardFen(fen); setState('pending'); setFeedback('Engine unavailable; try again.'); });
  };

  const reveal = (prefix: string) => {
    setState('revealed'); setBoardFen(fen);
    setFeedback(`${prefix}The better move was ${bestMove ? applyUci(fen, bestMove)?.san ?? bestMove : '…'}.`);
    finishItem(false);
  };
  const wrong = (msg: string) => {
    const t = tries + 1;
    setTries(t);
    if (t >= 3) reveal(`${msg.split('.')[0]}. `);
    else { setState('wrong'); setFeedback(msg); }
  };

  const next = () => {
    const n = idx + 1;
    setIdx(n); setTries(0); setState('pending'); setFeedback(''); setLastTry(null);
    if (n < items.length) setBoardFen(fens[items[n]]);
  };

  if (done) {
    const solved = results.filter(Boolean).length;
    return (
      <div className="play-page play-setup">
        <section className="card">
          <h1 className="card__title">Retry complete</h1>
          <p>You found a better move first time in <strong>{solved}</strong> of <strong>{results.length}</strong> position{results.length > 1 ? 's' : ''}.</p>
          <p className="hint">Positions you missed are worth repeating tomorrow: spaced retrieval beats re-reading.</p>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={onExit}>Back to the review</button>
            <button type="button" className="btn" onClick={() => { setIdx(0); setResults([]); setTries(0); setState('pending'); setFeedback(''); setBoardFen(fens[items[0]]); posted.current = false; started.current = Date.now(); }}>Retry again</button>
          </div>
        </section>
      </div>
    );
  }

  const arrows: BoardArrow[] = state === 'revealed' && bestMove ? [[bestMove.slice(0, 2), bestMove.slice(2, 4), 'green']] : [];
  const promptState = state === 'correct' || state === 'good' ? 'correct' : state === 'wrong' || state === 'revealed' ? 'wrong' : undefined;
  return (
    <div className="play-page play-game">
      <div className="layout-board">
        <div className="layout-board__board">
          <div className="player-strip"><span className="player-strip__name">Retry {idx + 1} / {items.length}</span></div>
          <Board key={`${ply}-${tries}`} fen={boardFen} orientation={learner} movable={state === 'pending' || state === 'wrong' ? learner : 'none'} onMove={onMove}
            lastMove={lastTry} arrows={arrows} className={promptState ? `is-${promptState}` : ''} />
          <div className="player-strip"><span className="player-strip__name">{learner === 'white' ? 'White' : 'Black'} to move</span></div>
        </div>
        <aside className="layout-board__side">
          <div className="prompt" data-state={promptState}>
            <span className="prompt__turn" data-color={learner} aria-hidden="true" />
            <div>
              <p className="prompt__title">{promptState === 'correct' ? 'Well found' : promptState === 'wrong' ? (state === 'revealed' ? 'Here is the idea' : 'Try again') : 'Find a better move'}</p>
              <p className="hint" style={{ margin: 0 }}>
                In the game you played <strong>{moveLabel(game.startFen, ply)} {figurine(played.san)}</strong> ({CLASS_LABEL[mv.cls].toLowerCase()}, eval went {evalLabel(learner === 'white' ? mv.cpBefore : -mv.cpBefore)} → {evalLabel(learner === 'white' ? mv.cpAfter : -mv.cpAfter)}).
              </p>
            </div>
          </div>
          {feedback && <p role="status" className={promptState === 'wrong' ? 'error' : 'hint'}>{state === 'correct' || state === 'good' ? <Check size={16} strokeWidth={2} /> : state === 'wrong' ? <X size={16} strokeWidth={2} /> : null} {feedback}</p>}
          <p className="hint">Attempt {Math.min(tries + 1, 3)} of 3. Take your time: check every capture and check for both sides before moving.</p>
          <div className="row">
            {(state === 'correct' || state === 'good' || state === 'revealed') && <button type="button" className="btn btn-primary" onClick={next}>{idx + 1 < items.length ? 'Next position' : 'Finish'}</button>}
            {(state === 'pending' || state === 'wrong') && <button type="button" className="btn" onClick={() => reveal('')} disabled={!bestMove}>Show answer</button>}
            <button type="button" className="btn btn-ghost" onClick={onExit}>Exit retry</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
