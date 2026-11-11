// /play/computer: play a bot from BOT_LEVELS. Rated (bot pool) unless takebacks or hints were used.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Flag, Lightbulb, RotateCcw, Undo2, Repeat, Search } from 'lucide-react';
import { gameAccuracy, type TrainingEvent } from '@grim/core';
import { Board, type BoardMove } from '../../components/Board.tsx';
import { api } from '../../lib/api.ts';
import { useSession } from '../../lib/session.tsx';
import { BOT_LEVELS, analyse, analyseGame, bestMove, botLevel, newEngineGame, stopEngine, type BotLevel } from '../../lib/engine.ts';
import { BotPicker } from './components/BotPicker.tsx';
import { Clock } from './components/Clock.tsx';
import { GameOverDialog } from './components/GameOverDialog.tsx';
import { MoveList, MoveNav } from './components/MoveList.tsx';
import { PlayerStrip } from './components/PlayerStrip.tsx';
import { ColorPicker, TimeControlPicker } from './components/TimeControlPicker.tsx';
import {
  START_FEN, applyUci, buildPgn, canMate, describeResult, detectEnd, other, scoreFor, tcLabel, turnOf, winnerResult,
  type Color, type GameResult, type Ply,
} from './lib/chess.ts';
import { useLocalClocks, type TimeControl } from './lib/useClocks.ts';
import { loadPref, savePref, usePlyKeys } from './lib/useKeys.ts';

interface Config { levelId: number; color: Color; tc: TimeControl | null; assists: boolean }

function suggestLevel(rating: number | undefined): number {
  if (!rating) return 3;
  let best = BOT_LEVELS[0];
  for (const l of BOT_LEVELS) if (Math.abs(l.rating - rating) < Math.abs(best.rating - rating)) best = l;
  return best.id;
}

export function ComputerGame() {
  const { me } = useSession();
  const [config, setConfig] = useState<Config | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const suggested = suggestLevel(me?.ratings.bot?.rating ?? me?.estimate?.rating);
  if (!config) return <ComputerSetup suggested={suggested} onStart={(c) => { setConfig(c); setGameKey((k) => k + 1); }} />;
  return <ComputerMatch key={gameKey} config={config} onNewGame={() => setConfig(null)}
    onRematch={() => { setConfig({ ...config, color: other(config.color) }); setGameKey((k) => k + 1); }} />;
}

/** Query params used by the daily plan: ?level=<id>&rated=1&color=white|black|random&tc=5+3|untimed */
function readParams(q: URLSearchParams) {
  const lvl = Number(q.get('level'));
  const c = q.get('color');
  const t = q.get('tc');
  let tc: TimeControl | null | undefined;
  if (t === 'untimed' || t === '-') tc = null;
  else if (t && /^\d+(\.\d+)?\+\d+$/.test(t)) { const [m, inc] = t.split('+').map(Number); tc = { initial: Math.round(m * 60), increment: inc }; }
  return {
    level: botLevel(lvl) ? lvl : undefined,
    color: c === 'white' || c === 'black' || c === 'random' ? c as Color | 'random' : undefined,
    tc, rated: q.get('rated') === '1',
  };
}

function ComputerSetup({ suggested, onStart }: { suggested: number; onStart: (c: Config) => void }) {
  const [q] = useSearchParams();
  const p = useMemo(() => readParams(q), [q]);
  const [levelId, setLevelId] = useState<number>(() => p.level ?? loadPref('bot.level', suggested));
  const [color, setColor] = useState<Color | 'random'>(() => p.color ?? loadPref('bot.color', 'random'));
  const [tc, setTc] = useState<TimeControl | null>(() => (p.tc !== undefined ? p.tc : loadPref('bot.tc', null)));
  const [assists, setAssists] = useState<boolean>(() => (p.rated ? false : loadPref('bot.assists', false)));
  const planned = p.rated && p.level ? botLevel(p.level) : undefined;
  const start = () => {
    savePref('bot.level', levelId); savePref('bot.color', color); savePref('bot.tc', tc); savePref('bot.assists', assists);
    onStart({ levelId, color: color === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : color, tc, assists });
  };
  return (
    <div className="play-page play-setup">
      <header className="play-header">
        <Link to="/play" className="muted">← Play</Link>
        <h1>Play the computer</h1>
        <p className="muted">Pick an opponent near your level. Rated games update your bot rating; the suggestion is based on your current estimate.</p>
      </header>
      {planned && (
        <section className="card" aria-live="polite">
          <h2 className="card__title">Today’s rated game</h2>
          <p className="card__subtitle">{planned.name} (~{planned.rating}) · {tcLabel(tc)} · {color === 'random' ? 'random colour' : `you play ${color}`}. No takebacks or hints.</p>
          <div className="row"><button type="button" className="btn btn-primary btn-lg" onClick={() => { setAssists(false); onStart({ levelId: planned.id, color: color === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : color, tc, assists: false }); }}>Start rated game</button></div>
        </section>
      )}
      <section className="card">
        <h2 className="card__title">Opponent</h2>
        <BotPicker value={levelId} onChange={setLevelId} />
        {levelId === suggested && <p className="hint">Suggested for you.</p>}
      </section>
      <section className="card">
        <div className="play-setup__row">
          <ColorPicker value={color} onChange={setColor} />
          <TimeControlPicker value={tc} onChange={setTc} />
        </div>
        <label className="check">
          <input type="checkbox" className="switch" checked={assists} onChange={(e) => setAssists(e.target.checked)} />
          <span>Allow takebacks and hints <span className="muted">(using either makes the game unrated)</span></span>
        </label>
        <div className="card__footer">
          <button type="button" className="btn btn-primary btn-lg" onClick={start}>Start game</button>
        </div>
      </section>
    </div>
  );
}

function ComputerMatch({ config, onNewGame, onRematch }: { config: Config; onNewGame: () => void; onRematch: () => void }) {
  const navigate = useNavigate();
  const { me, refresh } = useSession();
  const level = botLevel(config.levelId) as BotLevel;
  const you = config.color, bot = other(you);
  const [plies, setPlies] = useState<Ply[]>([]);
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [thinking, setThinking] = useState(false);
  const [hint, setHint] = useState<[string, string] | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [takebacks, setTakebacks] = useState(0);
  const [hints, setHints] = useState(0);
  const [dialog, setDialog] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [post, setPost] = useState<{ state: 'idle' | 'analysing' | 'saving' | 'saved' | 'error'; done?: number; total?: number; accuracy?: number | null; acpl?: number | null; msg?: string }>({ state: 'idle' });
  const evalsRef = useRef<number[] | null>(null);
  const token = useRef(0);
  const posted = useRef(false);
  const analysisCtl = useRef<AbortController | null>(null);
  const resultRef = useRef<GameResult | null>(null); resultRef.current = result;

  const fens = useMemo(() => [START_FEN, ...plies.map((p) => p.fen)], [plies]);
  const liveFen = fens[fens.length - 1];
  const shown = viewPly ?? plies.length;
  const shownFen = fens[shown];
  const turn = turnOf(liveFen);
  const rated = takebacks === 0 && hints === 0;

  const finish = useCallback((r: GameResult) => {
    if (resultRef.current) return;
    token.current++;
    setResult(r); setThinking(false); setDialog(true); setHint(null);
  }, []);

  const clocks = useLocalClocks(config.tc, (side) => {
    const winner = other(side);
    finish(canMate(liveFenRef.current, winner) ? { result: winnerResult(winner), reason: 'timeout' } : { result: '1/2-1/2', reason: 'timeout vs insufficient material' });
  });
  const liveFenRef = useRef(liveFen); liveFenRef.current = liveFen;

  useEffect(() => { newEngineGame(); return () => { token.current++; stopEngine(); }; }, []);

  const pushPly = useCallback((p: Ply, mover: Color) => {
    setPlies((prev) => {
      const next = [...prev, p];
      const end = detectEnd(START_FEN, next);
      if (end) queueMicrotask(() => finish(end));
      return next;
    });
    clocks.press(mover);
  }, [clocks, finish]);

  // Bot move
  useEffect(() => {
    if (result || turn !== bot) return;
    const my = ++token.current;
    setThinking(true);
    const started = performance.now();
    const remaining = bot === 'white' ? clocks.white : clocks.black;
    const movetime = config.tc ? Math.max(100, Math.min(level.movetimeMs, remaining / 30)) : level.movetimeMs;
    const humanDelay = level.engine === 'grim' && (!config.tc || remaining > 30000) ? 350 + Math.random() * 700 : 0;
    bestMove(liveFen, { level: level.id, movetimeMs: movetime })
      .then(async (uci) => {
        const wait = humanDelay - (performance.now() - started);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        if (my !== token.current) return;
        const p = applyUci(liveFen, uci);
        if (!p) throw new Error(`engine returned illegal move ${uci}`);
        setThinking(false); setEngineError(null);
        pushPly(p, bot);
      })
      .catch((e: Error) => {
        if (my !== token.current) return;
        setThinking(false);
        if (e.name !== 'AbortError') setEngineError(`The engine failed: ${e.message}. Try reloading the page.`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveFen, result, turn]);

  const onMove = (m: BoardMove) => {
    if (result || turn !== you || viewPly !== null) return false;
    const p = applyUci(liveFen, m.from + m.to + (m.promotion ?? ''));
    if (!p) return false;
    setHint(null);
    pushPly(p, you);
  };

  const takeback = () => {
    if (!config.assists || result) return;
    token.current++; stopEngine(); setThinking(false); setHint(null);
    // remove plies until it is the learner's turn again (at least one ply)
    setPlies((prev) => {
      if (!prev.length) return prev;
      const lastFen = (ps: Ply[]) => (ps.length ? ps[ps.length - 1].fen : START_FEN);
      let next = prev.slice(0, -1);
      while (next.length && turnOf(lastFen(next)) !== you) next = next.slice(0, -1);
      return next;
    });
    setTakebacks((t) => t + 1);
    setViewPly(null);
    if (config.tc) clocks.set(clocks.white, clocks.black, you);
  };

  const askHint = async () => {
    if (!config.assists || result || turn !== you || hintBusy) return;
    setHintBusy(true);
    try {
      const [l] = await analyse(liveFen, { depth: 14, movetimeMs: 1500 });
      if (l?.pv[0]) { setHint([l.pv[0].slice(0, 2), l.pv[0].slice(2, 4)]); setHints((h) => h + 1); }
    } catch { /* engine busy or unavailable */ }
    setHintBusy(false);
  };

  const resign = () => { if (!result && plies.length) finish({ result: winnerResult(bot), reason: 'resignation' }); };

  const stopClocks = clocks.stop;
  useEffect(() => { if (result) stopClocks(); }, [result, stopClocks]);

  const players = { white: you === 'white' ? (me?.profile.displayName ?? 'You') : level.name, black: you === 'black' ? (me?.profile.displayName ?? 'You') : level.name };
  const pgn = useMemo(() => buildPgn(START_FEN, plies, {
    Event: `Grim Chess vs ${level.name} (level ${level.id})`, White: players.white, Black: players.black,
    WhiteElo: you === 'black' ? String(level.rating) : undefined, BlackElo: you === 'white' ? String(level.rating) : undefined,
    TimeControl: config.tc ? `${config.tc.initial}+${config.tc.increment}` : '-', Termination: result?.reason,
  }, result?.result ?? '*'), [plies, result, level, players.white, players.black, you, config.tc]);

  // Post-game: analyse, post the TrainingEvent, refresh session ratings.
  const buildEvent = useCallback((acc?: { accuracy: number | null; acpl: number | null; blunders: number }): TrainingEvent => ({
    type: 'game', mode: 'bot', opponentRating: level.rating, opponentRd: level.rd, botLevel: level.id,
    result: scoreFor(result!.result, you), color: you, pgn,
    ...(acc?.accuracy != null ? { accuracy: Math.round(acc.accuracy * 10) / 10 } : {}),
    ...(acc?.acpl != null ? { acpl: Math.round(acc.acpl) } : {}),
    ...(acc ? { blunders: acc.blunders } : {}),
    timeControl: config.tc ? tcLabel(config.tc) : 'untimed', rated, at: new Date().toISOString(),
  }), [level, result, you, pgn, config.tc, rated]);

  const send = useCallback(async (ev: TrainingEvent) => {
    if (posted.current) return;
    posted.current = true;
    setPost((p) => ({ ...p, state: 'saving' }));
    try { await api.postEvents([ev]); setPost((p) => ({ ...p, state: 'saved' })); void refresh(); }
    catch (e) { setPost((p) => ({ ...p, state: 'error', msg: (e as Error).message })); }
  }, [refresh]);

  useEffect(() => {
    if (!result || posted.current) return;
    const userMoves = plies.filter((_, i) => (i % 2 === 0) === (you === 'white')).length;
    if (userMoves < 2) { void send(buildEvent()); return; }
    const ctl = new AbortController();
    analysisCtl.current = ctl;
    setPost({ state: 'analysing', done: 0, total: fens.length });
    analyseGame(fens, { depth: 10, movetimeMs: 700, signal: ctl.signal, onProgress: (done, total) => setPost((p) => ({ ...p, done, total })) })
      .then((evals) => {
        evalsRef.current = evals;
        const acc = gameAccuracy(evals, you);
        setPost((p) => ({ ...p, accuracy: acc.accuracy, acpl: acc.acpl }));
        return send(buildEvent({ accuracy: acc.accuracy, acpl: acc.acpl, blunders: acc.classes.filter((c) => c === 'blunder').length }));
      })
      .catch(() => { void send(buildEvent()); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Leaving mid-analysis still records the game (without accuracy).
  const latestEvent = useRef(buildEvent); latestEvent.current = buildEvent;
  useEffect(() => () => {
    if (resultRef.current && !posted.current) {
      analysisCtl.current?.abort();
      posted.current = true;
      void api.postEvents([latestEvent.current()]).catch(() => undefined);
    }
  }, []);

  const review = () => {
    analysisCtl.current?.abort();
    if (!posted.current && result) void send(buildEvent());
    navigate('/review', { state: { pgn, evals: evalsRef.current ?? undefined, color: you, title: `vs ${level.name}` } });
  };

  usePlyKeys(shown, plies.length, (p) => setViewPly(p >= plies.length ? null : p));

  const tone = result ? (result.result === '1/2-1/2' ? 'draw' : scoreFor(result.result, you) === 1 ? 'win' : 'loss') : undefined;
  const initialMs = config.tc ? config.tc.initial * 1000 : undefined;
  const clockFor = (c: Color) => config.tc ? <Clock ms={c === 'white' ? clocks.white : clocks.black} running={clocks.running === c} initialMs={initialMs} label={c} /> : null;
  const lastMove = shown > 0 ? [plies[shown - 1].from, plies[shown - 1].to] as [string, string] : null;
  const myRating = me?.ratings.bot ? Math.round(me.ratings.bot.rating) : null;

  return (
    <div className="play-page play-game">
      <div className="layout-board">
        <div className="layout-board__board">
          <PlayerStrip name={level.name} rating={level.rating} fen={shownFen} color={bot} clock={clockFor(bot)}
            badge={thinking ? <span className="badge badge-outline play-thinking">thinking…</span> : null} />
          <Board fen={shownFen} orientation={you} movable={!result && viewPly === null && turn === you ? you : 'none'} onMove={onMove}
            lastMove={lastMove} arrows={hint ? [[hint[0], hint[1], 'green']] : undefined} />
          <PlayerStrip name={me?.profile.displayName ?? 'You'} rating={myRating} fen={shownFen} color={you} clock={clockFor(you)} />
        </div>
        <aside className="layout-board__side">
          <div className="card play-status">
            <div className="row">
              <span className={`badge ${rated ? 'badge-accent' : 'badge-outline'}`}>{rated ? 'Rated' : 'Unrated'}</span>
              <span className="badge badge-outline">{tcLabel(config.tc)}</span>
              <span className="badge badge-outline">Level {level.id} · {level.engine === 'grim' ? 'Grim' : 'Stockfish'}</span>
            </div>
            <p className="play-status__text" role="status">
              {result ? describeResult(result, you) : viewPly !== null ? 'Viewing an earlier position. Press → or End to return.' : turn === you ? 'Your move.' : `${level.name} is thinking…`}
            </p>
            {engineError && <p className="error">{engineError}</p>}
          </div>
          <div className="card card-flush panel-grow">
            <MoveList sans={plies.map((p) => p.san)} current={shown} onSelect={(p) => setViewPly(p >= plies.length ? null : p)} startFen={START_FEN}
              result={result?.result} />
            <MoveNav current={shown} total={plies.length} onSelect={(p) => setViewPly(p >= plies.length ? null : p)} />
          </div>
          <div className="row play-actions">
            {!result ? (
              <>
                {config.assists && <button type="button" className="btn btn-sm" onClick={takeback} disabled={!plies.length}><Undo2 size={16} strokeWidth={1.75} /> Takeback</button>}
                {config.assists && <button type="button" className="btn btn-sm" onClick={askHint} disabled={turn !== you || hintBusy}><Lightbulb size={16} strokeWidth={1.75} /> {hintBusy ? 'Thinking…' : 'Hint'}</button>}
                <button type="button" className="btn btn-sm btn-danger-soft" onClick={resign} disabled={!plies.length}><Flag size={16} strokeWidth={1.75} /> Resign</button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-sm btn-primary" onClick={review}><Search size={16} strokeWidth={1.75} /> Review game</button>
                <button type="button" className="btn btn-sm" onClick={onRematch}><Repeat size={16} strokeWidth={1.75} /> Rematch</button>
                <button type="button" className="btn btn-sm" onClick={onNewGame}><RotateCcw size={16} strokeWidth={1.75} /> New opponent</button>
              </>
            )}
          </div>
        </aside>
      </div>
      <GameOverDialog open={dialog} onClose={() => setDialog(false)} tone={tone}
        title={result ? (tone === 'win' ? 'You won' : tone === 'loss' ? `${level.name} won` : 'Draw') : ''}
        subtitle={result ? `${describeResult(result, you)} · ${rated ? 'rated' : 'unrated'} game vs ${level.name} (~${level.rating})` : undefined}
        actions={<>
          <button type="button" className="btn" onClick={onNewGame}>New opponent</button>
          <button type="button" className="btn" onClick={onRematch}>Rematch</button>
          <button type="button" className="btn btn-primary" onClick={review}>Review game</button>
        </>}>
        <PostGameStatus post={post} rated={rated} />
      </GameOverDialog>
    </div>
  );
}

function PostGameStatus({ post, rated }: { post: { state: string; done?: number; total?: number; accuracy?: number | null; acpl?: number | null; msg?: string }; rated: boolean }) {
  return (
    <div className="stack">
      {post.state === 'analysing' && (
        <div className="stack" style={{ ['--stack-gap' as string]: '6px' }}>
          <span className="hint">Analysing your game with Stockfish… {post.done ?? 0}/{post.total ?? 0}</span>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((post.done ?? 0) / (post.total || 1)) * 100)}
            style={{ ['--value' as string]: Math.round(((post.done ?? 0) / (post.total || 1)) * 100) }}><div className="progress__bar" /></div>
        </div>
      )}
      {post.accuracy != null && (
        <div className="tile-grid">
          <div className="tile"><p className="tile__label">Your accuracy</p><p className="tile__value">{post.accuracy.toFixed(1)}<span className="tile__unit">%</span></p></div>
          {post.acpl != null && <div className="tile"><p className="tile__label">Avg. centipawn loss</p><p className="tile__value">{Math.round(post.acpl)}</p></div>}
        </div>
      )}
      {post.state === 'saved' && <p className="hint">{rated ? 'Saved. Your bot rating has been updated.' : 'Saved as an unrated game.'}</p>}
      {post.state === 'saving' && <p className="hint">Saving…</p>}
      {post.state === 'error' && <p className="error">Could not save the game ({post.msg}). It still counts locally; check your connection.</p>}
    </div>
  );
}
