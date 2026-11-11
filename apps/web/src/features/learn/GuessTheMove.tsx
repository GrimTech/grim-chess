// Guess the move: play through master games; the learner predicts each move of one side.
// Scored by the engine: accuracy of the guess relative to the master's move (Lichess win% model).
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import { evalToCp, moveAccuracy, winPercentFromCp } from '@grim/core';
import { Board, type BoardMove } from '../../components/Board.tsx';
import { analyse } from '../../lib/engine.ts';
import { useSession } from '../../lib/session.tsx';
import { applySan, getJson, nowIso, postEvents, sameSan, sanTokens, useAsync, useTimeouts } from './util.ts';

interface MasterGame { id: string; white: string; black: string; event: string; year: number | null; result: string; eco: string; pgn: string }
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

async function evalFor(fen: string, pov: 'white' | 'black'): Promise<number | null> {
  try {
    const c = new Chess(fen);
    if (c.isCheckmate()) return (c.turn() === 'w') === (pov === 'white') ? -1000 : 1000;
    const [l] = await analyse(fen, { depth: 12 });
    if (!l) return null;
    const stm = evalToCp(l);
    return (c.turn() === 'w') === (pov === 'white') ? stm : -stm;
  } catch { return null; }
}

function GuessGame({ game, onExit }: { game: MasterGame; onExit: () => void }) {
  const { me, setMe } = useSession();
  const later = useTimeouts();
  const sans = useMemo(() => sanTokens(game.pgn), [game.pgn]);
  const side: 'white' | 'black' = game.result === '0-1' ? 'black' : 'white';
  const [ply, setPly] = useState(0);
  const [fen, setFen] = useState(START);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const learnerTurn = (p: number) => (p % 2 === 0) === (side === 'white');
  const done = ply >= sans.length;

  useEffect(() => {
    if (done) {
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      void postEvents([{ type: 'drill', drill: 'guess-the-move', skillIds: [], score: +(avg / 100).toFixed(3), durationSec: scores.length * 30, at: nowIso(), detail: { gameId: game.id, moves: scores.length } }], setMe, me);
      return;
    }
    if (!learnerTurn(ply)) later(() => { const r = applySan(fen, sans[ply]); if (r) { setFen(r.fen); setLast([r.from, r.to]); setPly(ply + 1); } }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ply, done]);

  const onMove = (m: BoardMove) => {
    if (busy || done || !learnerTurn(ply)) return false;
    const master = applySan(fen, sans[ply]);
    if (!master) return false;
    setBusy(true);
    const advance = (score: number, text: string) => {
      setScores((s) => [...s, score]); setFeedback(text);
      setFen(master.fen); setLast([master.from, master.to]); setPly(ply + 1); setBusy(false);
    };
    if (sameSan(m.san, master.san)) { advance(100, `${master.san}: exactly the master’s move.`); return true; }
    void Promise.all([evalFor(master.fen, side), evalFor(m.fenAfter, side)]).then(([em, eg]) => {
      if (em == null || eg == null) { advance(0, `The game continued ${master.san} (you played ${m.san}; engine unavailable for scoring).`); return; }
      const acc = Math.round(moveAccuracy(winPercentFromCp(em), winPercentFromCp(eg)));
      const diff = em - eg;
      advance(Math.min(100, acc), `The game continued ${master.san}. Your ${m.san}: ${diff <= 20 ? 'about as good' : `${(diff / 100).toFixed(1)} pawns worse`} (score ${Math.min(100, acc)}).`);
    });
    return false;
  };
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  return (
    <div className="lr-train">
      <div className="lr-train__board"><div className="lr-board">
        <Board fen={fen} orientation={side} movable={busy || done || !learnerTurn(ply) ? 'none' : side} onMove={onMove} lastMove={last} />
      </div></div>
      <aside className="lr-train__side stack">
        <p className="lr-eyebrow muted">{game.event}{game.year ? `, ${game.year}` : ''} · {game.eco}</p>
        <h2>{game.white} – {game.black}</h2>
        <p>You are <strong>{side}</strong>. Predict each move.</p>
        <div className="tile"><p className="tile__label">Score</p><p className="tile__value">{avg}<span className="tile__unit">/100</span></p><p className="tile__delta">{scores.length} moves guessed · move {Math.floor(ply / 2) + 1}</p></div>
        {busy && <p className="muted">Comparing with the engine…</p>}
        {feedback && <p role="status">{feedback}</p>}
        {done && <p className="lr-ok">Game over: {game.result}. Average {avg}.</p>}
        <button className="btn btn-ghost" onClick={onExit}>Choose another game</button>
      </aside>
    </div>
  );
}

export function GuessTheMovePage() {
  const games = useAsync(() => getJson<MasterGame[]>('/api/curriculum/games'), []);
  const [sel, setSel] = useState<MasterGame | null>(null);
  const list = Array.isArray(games.data) ? games.data : [];
  return (
    <div className="lr-page">
      <header className="lr-head"><div><p className="lr-eyebrow muted">Train</p><h1>Guess the move</h1></div></header>
      {sel ? <GuessGame key={sel.id} game={sel} onExit={() => setSel(null)} /> : games.loading ? <div className="skeleton" style={{ height: 200 }} /> : list.length === 0 ? (
        <div className="empty"><p className="empty__title">No master games available yet</p><p>The master-game collection has not been published on this server. Try the <Link to="/train/puzzles">puzzle trainer</Link> meanwhile.</p></div>
      ) : (
        <ul className="lr-list card">
          {list.slice(0, 200).map((g) => (
            <li key={g.id}><button className="lr-list__item" onClick={() => setSel(g)}>
              <span><strong>{g.white} – {g.black}</strong> <span className="muted">{g.event}{g.year ? ` ${g.year}` : ''}</span></span>
              <span className="badge badge-outline">{g.eco} · {g.result}</span>
            </button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
