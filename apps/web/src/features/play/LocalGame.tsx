// /play/local: pass-and-play for two people on one device, optional clocks and auto-flip.
import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FlipVertical2, Flag, Handshake, RotateCcw, Search, Undo2 } from 'lucide-react';
import { Board, type BoardMove } from '../../components/Board.tsx';
import { Clock } from './components/Clock.tsx';
import { GameOverDialog } from './components/GameOverDialog.tsx';
import { MoveList, MoveNav } from './components/MoveList.tsx';
import { PlayerStrip } from './components/PlayerStrip.tsx';
import { TimeControlPicker } from './components/TimeControlPicker.tsx';
import { START_FEN, applyUci, buildPgn, canMate, describeResult, detectEnd, other, tcLabel, turnOf, winnerResult, type Color, type GameResult, type Ply } from './lib/chess.ts';
import { useLocalClocks, type TimeControl } from './lib/useClocks.ts';
import { loadPref, savePref, usePlyKeys } from './lib/useKeys.ts';

interface LocalConfig { tc: TimeControl | null; autoFlip: boolean; white: string; black: string }

export function LocalGame() {
  const [config, setConfig] = useState<LocalConfig | null>(null);
  const [key, setKey] = useState(0);
  if (!config) return <LocalSetup onStart={(c) => { setConfig(c); setKey((k) => k + 1); }} />;
  return <LocalMatch key={key} config={config} onNew={() => setConfig(null)} onRematch={() => { setConfig({ ...config, white: config.black, black: config.white }); setKey((k) => k + 1); }} />;
}

function LocalSetup({ onStart }: { onStart: (c: LocalConfig) => void }) {
  const [tc, setTc] = useState<TimeControl | null>(() => loadPref('local.tc', null));
  const [autoFlip, setAutoFlip] = useState<boolean>(() => loadPref('local.flip', false));
  const [white, setWhite] = useState('White');
  const [black, setBlack] = useState('Black');
  return (
    <div className="play-page play-setup">
      <header className="play-header">
        <Link to="/play" className="muted">← Play</Link>
        <h1>Pass and play</h1>
        <p className="muted">Two players, one device. Take turns moving; nothing is rated.</p>
      </header>
      <section className="card">
        <div className="play-setup__row">
          <div className="field"><label className="label" htmlFor="lw">White player</label><input id="lw" className="input" value={white} onChange={(e) => setWhite(e.target.value)} maxLength={40} /></div>
          <div className="field"><label className="label" htmlFor="lb">Black player</label><input id="lb" className="input" value={black} onChange={(e) => setBlack(e.target.value)} maxLength={40} /></div>
        </div>
        <TimeControlPicker value={tc} onChange={setTc} />
        <label className="check">
          <input type="checkbox" className="switch" checked={autoFlip} onChange={(e) => setAutoFlip(e.target.checked)} />
          <span>Flip the board after every move</span>
        </label>
        <div className="card__footer">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => { savePref('local.tc', tc); savePref('local.flip', autoFlip); onStart({ tc, autoFlip, white: white.trim() || 'White', black: black.trim() || 'Black' }); }}>Start game</button>
        </div>
      </section>
    </div>
  );
}

function LocalMatch({ config, onNew, onRematch }: { config: LocalConfig; onNew: () => void; onRematch: () => void }) {
  const navigate = useNavigate();
  const [plies, setPlies] = useState<Ply[]>([]);
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [dialog, setDialog] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [drawOffer, setDrawOffer] = useState<Color | null>(null);
  const resultRef = useRef<GameResult | null>(null); resultRef.current = result;

  const fens = useMemo(() => [START_FEN, ...plies.map((p) => p.fen)], [plies]);
  const liveFen = fens[fens.length - 1];
  const shown = viewPly ?? plies.length;
  const shownFen = fens[shown];
  const turn = turnOf(liveFen);
  const liveFenRef = useRef(liveFen); liveFenRef.current = liveFen;

  const finish = useCallback((r: GameResult) => { if (resultRef.current) return; setResult(r); setDialog(true); }, []);
  const clocks = useLocalClocks(config.tc, (side) => {
    const w = other(side);
    finish(canMate(liveFenRef.current, w) ? { result: winnerResult(w), reason: 'timeout' } : { result: '1/2-1/2', reason: 'timeout vs insufficient material' });
  });

  const onMove = (m: BoardMove) => {
    if (result || viewPly !== null) return false;
    const p = applyUci(liveFen, m.from + m.to + (m.promotion ?? ''));
    if (!p) return false;
    const next = [...plies, p];
    setPlies(next); setDrawOffer(null);
    clocks.press(turn);
    const end = detectEnd(START_FEN, next);
    if (end) { clocks.stop(); finish(end); }
  };

  const undo = () => {
    if (result || !plies.length) return;
    setPlies(plies.slice(0, -1)); setViewPly(null);
    if (config.tc) clocks.set(clocks.white, clocks.black, plies.length > 1 ? turnOf(plies[plies.length - 2].fen) : null);
  };
  const resign = (c: Color) => { clocks.stop(); finish({ result: winnerResult(other(c)), reason: 'resignation' }); };

  usePlyKeys(shown, plies.length, (p) => setViewPly(p >= plies.length ? null : p), { f: () => setFlipped((f) => !f) });

  const base: Color = config.autoFlip ? (viewPly === null ? turn : turnOf(shownFen)) : 'white';
  const orientation: Color = flipped ? other(base) : base;
  const top = other(orientation);
  const names = { white: config.white, black: config.black };
  const pgn = buildPgn(START_FEN, plies, { Event: 'Grim Chess pass-and-play', White: config.white, Black: config.black,
    TimeControl: config.tc ? `${config.tc.initial}+${config.tc.increment}` : '-', Termination: result?.reason }, result?.result ?? '*');
  const initialMs = config.tc ? config.tc.initial * 1000 : undefined;
  const clockFor = (c: Color) => config.tc ? <Clock ms={c === 'white' ? clocks.white : clocks.black} running={clocks.running === c} initialMs={initialMs} label={c} /> : null;
  const lastMove = shown > 0 ? [plies[shown - 1].from, plies[shown - 1].to] as [string, string] : null;

  return (
    <div className="play-page play-game">
      <div className="layout-board">
        <div className="layout-board__board">
          <PlayerStrip name={names[top]} fen={shownFen} color={top} clock={clockFor(top)} />
          <Board fen={shownFen} orientation={orientation} movable={!result && viewPly === null ? 'turn' : 'none'} onMove={onMove} lastMove={lastMove} />
          <PlayerStrip name={names[orientation]} fen={shownFen} color={orientation} clock={clockFor(orientation)} />
        </div>
        <aside className="layout-board__side">
          <div className="card play-status">
            <div className="row"><span className="badge badge-outline">Pass and play</span><span className="badge badge-outline">{tcLabel(config.tc)}</span></div>
            <p className="play-status__text" role="status">
              {result ? describeResult(result) : viewPly !== null ? 'Viewing an earlier position.' : `${names[turn]} (${turn}) to move.`}
            </p>
            {drawOffer && !result && (
              <div className="row">
                <span>{names[drawOffer]} offers a draw.</span>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => { clocks.stop(); finish({ result: '1/2-1/2', reason: 'agreement' }); }}>Accept</button>
                <button type="button" className="btn btn-sm" onClick={() => setDrawOffer(null)}>Decline</button>
              </div>
            )}
          </div>
          <div className="card card-flush panel-grow">
            <MoveList sans={plies.map((p) => p.san)} current={shown} onSelect={(p) => setViewPly(p >= plies.length ? null : p)} startFen={START_FEN} result={result?.result} />
            <MoveNav current={shown} total={plies.length} onSelect={(p) => setViewPly(p >= plies.length ? null : p)}
              extra={<button type="button" className="btn btn-ghost btn-sm" aria-label="Flip board" onClick={() => setFlipped((f) => !f)}><FlipVertical2 size={18} strokeWidth={1.75} /></button>} />
          </div>
          <div className="row play-actions">
            {!result ? (
              <>
                <button type="button" className="btn btn-sm" onClick={undo} disabled={!plies.length}><Undo2 size={16} strokeWidth={1.75} /> Undo</button>
                <button type="button" className="btn btn-sm" onClick={() => setDrawOffer(turn)} disabled={!plies.length}><Handshake size={16} strokeWidth={1.75} /> Offer draw</button>
                <button type="button" className="btn btn-sm btn-danger-soft" onClick={() => resign(turn)} disabled={!plies.length}><Flag size={16} strokeWidth={1.75} /> {names[turn]} resigns</button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => navigate('/review', { state: { pgn, color: 'white', title: `${config.white} vs ${config.black}` } })}><Search size={16} strokeWidth={1.75} /> Review game</button>
                <button type="button" className="btn btn-sm" onClick={onRematch}>Rematch (swap colours)</button>
                <button type="button" className="btn btn-sm" onClick={onNew}><RotateCcw size={16} strokeWidth={1.75} /> New game</button>
              </>
            )}
          </div>
        </aside>
      </div>
      <GameOverDialog open={dialog} onClose={() => setDialog(false)} tone={result?.result === '1/2-1/2' ? 'draw' : 'win'}
        title={result ? (result.result === '1/2-1/2' ? 'Draw' : `${names[result.result === '1-0' ? 'white' : 'black']} wins`) : ''}
        subtitle={result ? describeResult(result) : undefined}
        actions={<>
          <button type="button" className="btn" onClick={onRematch}>Rematch</button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/review', { state: { pgn, color: 'white', title: `${config.white} vs ${config.black}` } })}>Review game</button>
        </>} />
    </div>
  );
}
