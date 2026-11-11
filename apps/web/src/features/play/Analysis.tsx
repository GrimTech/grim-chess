// /analysis: free analysis board with Stockfish (multipv 3), eval bar, move list navigation, FEN/PGN import/export.
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { FlipVertical2, Trash2 } from 'lucide-react';
import { Board, type BoardMove } from '../../components/Board.tsx';
import { analyseStream, type EngineLine } from '../../lib/engine.ts';
import { EngineLines } from './components/EngineLines.tsx';
import { EvalBar } from './components/EvalBar.tsx';
import { MoveList, MoveNav } from './components/MoveList.tsx';
import { PgnTools } from './components/PgnTools.tsx';
import { START_FEN, applyUci, buildPgn, detectEnd, describeResult, other, parsePgnOrFen, turnOf, whiteCp, type Color, type Ply } from './lib/chess.ts';
import { loadPref, savePref, usePlyKeys } from './lib/useKeys.ts';

export function Analysis() {
  const location = useLocation();
  const [params] = useSearchParams();
  const initial = useMemo(() => {
    const st = location.state as { fen?: string; pgn?: string; orientation?: Color } | null;
    const src = st?.pgn ?? st?.fen ?? params.get('fen') ?? params.get('pgn');
    if (src) { try { return { ...parsePgnOrFen(src), orientation: st?.orientation }; } catch { /* fall through */ } }
    return { startFen: START_FEN, plies: [] as Ply[], headers: {}, orientation: undefined };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [startFen, setStartFen] = useState(initial.startFen);
  const [plies, setPlies] = useState<Ply[]>(initial.plies);
  const [cursor, setCursor] = useState(initial.plies.length);
  const [orientation, setOrientation] = useState<Color>(initial.orientation ?? turnOf(initial.startFen));
  const [engineOn, setEngineOn] = useState<boolean>(() => loadPref('analysis.engine', true));
  const [lines, setLines] = useState<EngineLine[]>([]);
  const [thinking, setThinking] = useState(false);
  const [engineErr, setEngineErr] = useState<string | null>(null);

  const fens = useMemo(() => [startFen, ...plies.map((p) => p.fen)], [startFen, plies]);
  const fen = fens[cursor];
  const turn = turnOf(fen);
  const end = useMemo(() => detectEnd(startFen, plies.slice(0, cursor)), [startFen, plies, cursor]);

  useEffect(() => {
    setLines([]);
    if (!engineOn) return;
    setThinking(true); setEngineErr(null);
    const job = analyseStream(fen, { multipv: 3, depth: 22, movetimeMs: 30000 }, (ls) => setLines(ls));
    let live = true;
    job.done.then((ls) => { if (live) { setLines(ls); setThinking(false); } })
      .catch((e: Error) => { if (live) { setThinking(false); if (e.name !== 'AbortError') setEngineErr(e.message); } });
    return () => { live = false; job.cancel(); };
  }, [fen, engineOn]);

  const play = (uci: string) => {
    const p = applyUci(fen, uci);
    if (!p) return false;
    if (plies[cursor]?.uci === p.uci) { setCursor(cursor + 1); return true; }
    setPlies([...plies.slice(0, cursor), p]);
    setCursor(cursor + 1);
    return true;
  };
  const onMove = (m: BoardMove) => { if (!play(m.from + m.to + (m.promotion ?? ''))) return false; };

  usePlyKeys(cursor, plies.length, setCursor, {
    f: () => setOrientation((o) => other(o)),
    ' ': () => { const best = lines[0]?.pv[0]; if (best) play(best); },
  });

  const top = lines[0];
  const evalCp = top ? whiteCp(top, turn) : null;
  const evalMate = top?.mate != null ? (turn === 'white' ? top.mate : -top.mate) : null;
  const pgn = buildPgn(startFen, plies, { Event: 'Grim Chess analysis' }, end?.result ?? '*');
  const lastMove = cursor > 0 ? [plies[cursor - 1].from, plies[cursor - 1].to] as [string, string] : null;
  const bestArrow = engineOn && top?.pv[0] ? [[top.pv[0].slice(0, 2), top.pv[0].slice(2, 4), 'blue'] as [string, string, 'blue']] : undefined;

  return (
    <div className="play-page play-game">
      <div className="layout-board">
        {engineOn && <div className="layout-board__eval"><EvalBar cp={evalCp} mate={evalMate} orientation={orientation} /></div>}
        <div className="layout-board__board">
          <div className="player-strip"><span className={`play-colordot is-${other(orientation)}`} /><span className="player-strip__name">{other(orientation) === 'white' ? 'White' : 'Black'}</span></div>
          <Board fen={fen} orientation={orientation} movable="turn" onMove={onMove} lastMove={lastMove} arrows={bestArrow} />
          <div className="player-strip"><span className={`play-colordot is-${orientation}`} /><span className="player-strip__name">{orientation === 'white' ? 'White' : 'Black'}</span>
            <span className="muted" style={{ marginLeft: 'auto' }}>{end ? describeResult(end) : `${turn === 'white' ? 'White' : 'Black'} to move`}</span></div>
        </div>
        <aside className="layout-board__side">
          <div className="row play-analysis-head">
            <Link to="/play" className="muted">← Play</Link>
            <h1 className="play-analysis-title">Analysis board</h1>
          </div>
          <EngineLines fen={fen} lines={lines} on={engineOn} thinking={thinking}
            onToggle={(on) => { setEngineOn(on); savePref('analysis.engine', on); }} onPlay={(u) => play(u)} />
          {engineErr && <p className="error">Engine error: {engineErr}</p>}
          <div className="card card-flush panel-grow">
            <MoveList sans={plies.map((p) => p.san)} current={cursor} onSelect={setCursor} startFen={startFen} />
            <MoveNav current={cursor} total={plies.length} onSelect={setCursor}
              extra={<div className="row" style={{ gap: 2 }}>
                <button type="button" className="btn btn-ghost btn-sm" aria-label="Flip board (f)" onClick={() => setOrientation((o) => other(o))}><FlipVertical2 size={18} strokeWidth={1.75} /></button>
                <button type="button" className="btn btn-ghost btn-sm" aria-label="Clear moves" onClick={() => { setStartFen(START_FEN); setPlies([]); setCursor(0); }}><Trash2 size={18} strokeWidth={1.75} /></button>
              </div>} />
          </div>
          <details className="card play-details">
            <summary>FEN / PGN import and export</summary>
            <PgnTools fen={fen} pgn={pgn} filename="grim-analysis.pgn"
              onImport={(g) => { setStartFen(g.startFen); setPlies(g.plies); setCursor(g.plies.length); setOrientation(turnOf(g.startFen)); }} />
          </details>
          <p className="hint">Keys: ← → moves, ↑ ↓ start/end, f flip, space plays the engine’s best move.</p>
        </aside>
      </div>
    </div>
  );
}
