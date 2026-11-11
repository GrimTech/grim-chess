// Mate-in-1 Treasure: real Lichess mate-in-one puzzles (rating <= 1200). Each solved puzzle opens a treasure chest.
// Posts 'puzzle' events (rated puzzle pool, so parents see a measured puzzle rating) and a 'drill' event per session.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Gem, Lightbulb } from 'lucide-react';
import { Chess, type Square } from 'chess.js';
import type { Puzzle } from '@grim/core';
import { api } from '../../../lib/api.ts';
import type { BoardMove } from '../../../components/Board.tsx';
import { Confetti, KidsBoard, praise, retry } from '../ui.tsx';
import { GameShell, postDrill } from './common.tsx';
import { earn } from '../stickers.ts';
import { recordGame } from '../store.ts';

// offline fallback: mate-in-one positions from the kids lessons (not rated)
const FALLBACK = ['6k1/5ppp/8/8/8/8/6K1/3R4 w - - 0 1', '6k1/8/6K1/8/8/8/8/Q7 w - - 0 1', '1k6/ppp5/8/8/8/8/8/3R2K1 w - - 0 1', '1k6/8/1K6/8/8/8/7R/8 w - - 0 1'];

interface Round { fen: string; puzzle?: Puzzle; last?: [string, string] }

export function MateTreasure() {
  const [round, setRound] = useState<Round | null>(null);
  const [fen, setFen] = useState('');
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [chests, setChests] = useState(0);
  const [say, setSay] = useState('Find checkmate in one move to open the treasure chest!');
  const [fire, setFire] = useState(0);
  const [offline, setOffline] = useState(false);
  const fb = useRef(0);
  const t0 = useRef(Date.now());
  const session = useRef({ start: Date.now(), firsts: 0, n: 0 });

  const loadNext = useCallback(async () => {
    setSolved(false); setWrong(0); setHint(null); t0.current = Date.now();
    try {
      const p = await api.nextPuzzle({ themes: ['mateIn1'], max: 1200 });
      const c = new Chess(p.fen);
      const u = p.moves[0];
      const mv = c.move({ from: u.slice(0, 2) as Square, to: u.slice(2, 4) as Square, promotion: (u[4] as 'q') || undefined });
      setRound({ fen: c.fen(), puzzle: p, last: [mv.from, mv.to] }); setFen(c.fen()); setOffline(false);
      setSay('Find checkmate in one move!');
    } catch {
      const f = FALLBACK[fb.current++ % FALLBACK.length];
      setRound({ fen: f }); setFen(f); setOffline(true);
      setSay('Find checkmate in one move! (practice puzzles while we are offline)');
    }
  }, []);
  useEffect(() => { void loadNext(); }, [loadNext]);
  useEffect(() => () => {
    const s = session.current;
    if (s.n) void postDrill('mate-drill', ['checkmate.mate-in-1'], s.firsts / s.n, (Date.now() - s.start) / 1000, { game: 'mate-in-1-treasure', solved: s.n });
  }, []);

  if (!round) return <GameShell title="Mate-in-1 Treasure" say="Digging up treasure…" mood="think"><div className="kid-loading" /></GameShell>;
  const side = round.fen.split(' ')[1] === 'b' ? 'black' : 'white';

  const onMove = (m: BoardMove) => {
    if (solved) return false;
    const c = new Chess(m.fenAfter);
    if (!c.isCheckmate()) {
      const n = wrong + 1; setWrong(n);
      setSay(c.inCheck() ? 'Check, but the king can escape. Look for a check with no way out!' : retry());
      if (n >= 2) {
        const sol = round.puzzle?.moves[1];
        const from = sol ? sol.slice(0, 2) : new Chess(round.fen).moves({ verbose: true }).find((x) => x.san.endsWith('#'))?.from;
        if (from) setHint(from);
      }
      return false;
    }
    setFen(m.fenAfter); setSolved(true); setFire((f) => f + 1);
    const first = wrong === 0;
    const total = chests + 1; setChests(total);
    session.current.n++; if (first) session.current.firsts++;
    setSay(`Checkmate! Treasure chest ${total} is open. ${praise()}`);
    recordGame('mate-treasure', total, true);
    if (total >= 5) earn('treasure-5');
    if (round.puzzle) {
      const p = round.puzzle;
      void api.postEvents([{ type: 'puzzle', puzzleId: p.id, puzzleRating: p.rating, themes: p.themes, solved: true, firstTry: first, durationSec: Math.round((Date.now() - t0.current) / 1000), at: new Date().toISOString() }]).catch(() => {});
    }
  };

  return (
    <GameShell title="Mate-in-1 Treasure" say={say} mood={solved ? 'cheer' : wrong ? 'think' : 'happy'}
      aside={<span className="chip-stat chip-stat-xp"><Gem aria-hidden />{chests}</span>}>
      <Confetti fire={fire} />
      <KidsBoard key={round.fen} fen={fen} orientation={side} movable={solved ? 'none' : side} onMove={onMove}
        lastMove={round.last} highlights={hint && !solved ? [hint] : undefined} feedback={solved ? 'correct' : null} />
      <div className="kid-actions">
        {!solved && <button className="btn btn-soft btn-lg" onClick={() => { setWrong((w) => Math.max(w, 2)); const from = round.puzzle?.moves[1]?.slice(0, 2) ?? new Chess(round.fen).moves({ verbose: true }).find((x) => x.san.endsWith('#'))?.from; if (from) { setHint(from); setSay('Use the glowing piece!'); } }}><Lightbulb aria-hidden /> Hint</button>}
        <button className={`btn btn-lg ${solved ? 'btn-primary' : 'btn-ghost'}`} onClick={() => {
          if (!solved && round.puzzle) void api.postEvents([{ type: 'puzzle', puzzleId: round.puzzle.id, puzzleRating: round.puzzle.rating, themes: round.puzzle.themes, solved: false, firstTry: false, durationSec: Math.round((Date.now() - t0.current) / 1000), at: new Date().toISOString() }]).catch(() => {});
          void loadNext();
        }}>{solved ? 'Next treasure' : 'Skip'} <ArrowRight aria-hidden /></button>
        {offline && <span className="kid-movecount">Offline practice</span>}
      </div>
    </GameShell>
  );
}
