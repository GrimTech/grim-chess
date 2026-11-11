// /kids/play: games against kid-friendly bots. Fun mode (unrated, undo + hint) or Challenge mode (rated: posts a
// 'game' TrainingEvent against the bot's calibrated rating). Also pass-and-play with a grown-up on one device (K5).
import { useEffect, useRef, useState } from 'react';
import { Flag, Lightbulb, RotateCcw, Undo2, Users, Trophy, Smile } from 'lucide-react';
import { Chess, type Square } from 'chess.js';
import { api } from '../../lib/api.ts';
import { BOT_LEVELS, bestMove, newEngineGame, stopEngine, type BotLevel } from '../../lib/engine.ts';
import type { BoardArrow, BoardMove } from '../../components/Board.tsx';
import { Confetti, KidsBoard, Page } from './ui.tsx';
import { Buddy, Mascot, type Mood } from './Mascot.tsx';
import { earn } from './stickers.ts';

const KID_BOTS = BOT_LEVELS.filter((b) => b.kidsFriendly);
const FRIENDLY: Record<string, string> = {
  Pip: 'Just learning! Often forgets to guard pieces.',
  Bramble: 'Loves checks and captures. A good first friend.',
  Moth: 'Sees some threats. Leaves pieces alone sometimes.',
  Tinker: 'Takes free pieces. Watch your pieces!',
  Wren: 'Thinks a few moves ahead.',
  Corvin: 'A tricky player. Use forks and pins!',
};
const COLORS = ['var(--green-9)', 'var(--sky-9)', 'var(--amber-9)', 'var(--orange-9)', 'var(--indigo-9)', 'var(--tomato-9)'];

type Mode = 'fun' | 'challenge' | 'friend';

export function KidsPlay() {
  const [bot, setBot] = useState<BotLevel | null>(null);
  const [mode, setMode] = useState<Mode>('fun');
  const [color, setColor] = useState<'white' | 'black'>('white');
  const [playing, setPlaying] = useState(false);

  if (!playing) {
    return (
      <Page title="Play a game">
        <Buddy mood="happy">Choose how to play, then pick a computer friend.</Buddy>
        <div className="kid-modes" role="radiogroup" aria-label="Game type">
          <button role="radio" aria-checked={mode === 'fun'} className="choice" onClick={() => setMode('fun')}><Smile aria-hidden />Fun game<small>Undo and hints. Just for practice.</small></button>
          <button role="radio" aria-checked={mode === 'challenge'} className="choice" onClick={() => setMode('challenge')}><Trophy aria-hidden />Challenge<small>No undo. Counts toward your level.</small></button>
          <button role="radio" aria-checked={mode === 'friend'} className="choice" onClick={() => setMode('friend')}><Users aria-hidden />With a grown-up<small>Take turns on this device.</small></button>
        </div>
        {mode !== 'friend' && (
          <>
            <h2 className="kid-h2">Computer friends</h2>
            <ul className="kid-bots">
              {KID_BOTS.map((b, i) => (
                <li key={b.id}>
                  <button className="kid-bot" aria-pressed={bot?.id === b.id} onClick={() => setBot(b)} style={{ ['--bot' as string]: COLORS[i % COLORS.length] }}>
                    <span className="kid-bot__face" aria-hidden><Mascot size={56} mood={i < 2 ? 'happy' : i < 4 ? 'think' : 'cheer'} /></span>
                    <span><strong>{b.name}</strong><small>{FRIENDLY[b.name] ?? b.description}</small><small className="muted">About {b.rating}</small></span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="segmented kid-seg" role="group" aria-label="Your colour">
          <button aria-pressed={color === 'white'} onClick={() => setColor('white')}>I play White</button>
          <button aria-pressed={color === 'black'} onClick={() => setColor('black')}>I play Black</button>
        </div>
        <button className="btn btn-primary btn-lg btn-block" disabled={mode !== 'friend' && !bot} onClick={() => setPlaying(true)}>Start!</button>
      </Page>
    );
  }
  return <Game bot={mode === 'friend' ? null : bot} mode={mode} color={color} onExit={() => setPlaying(false)} />;
}

function Game({ bot, mode, color, onExit }: { bot: BotLevel | null; mode: Mode; color: 'white' | 'black'; onExit: () => void }) {
  const game = useRef(new Chess());
  const [fen, setFen] = useState(game.current.fen());
  const [last, setLast] = useState<[string, string] | null>(null);
  const [thinking, setThinking] = useState(false);
  const [hint, setHint] = useState<BoardArrow | null>(null);
  const [result, setResult] = useState<{ text: string; mood: Mood; score: 1 | 0.5 | 0 } | null>(null);
  const [say, setSay] = useState(mode === 'friend' ? 'White moves first. Take turns!' : `You are playing ${bot?.name}. Have fun!`);
  const [fire, setFire] = useState(0);
  const alive = useRef(true);
  const posted = useRef(false);
  useEffect(() => { alive.current = true; newEngineGame(); return () => { alive.current = false; stopEngine(); }; }, []);

  const sync = () => { setFen(game.current.fen()); const h = game.current.history({ verbose: true }); const l = h[h.length - 1]; setLast(l ? [l.from, l.to] : null); };

  const finish = (score: 1 | 0.5 | 0, text: string) => {
    setResult({ text, mood: score === 1 ? 'cheer' : score === 0.5 ? 'happy' : 'oops', score });
    setSay(text);
    if (score === 1 && mode !== 'friend') { setFire((f) => f + 1); earn('bot-win'); }
    if (mode === 'challenge' && bot && !posted.current) {
      posted.current = true;
      game.current.header('White', color === 'white' ? 'Me' : bot.name, 'Black', color === 'black' ? 'Me' : bot.name, 'Event', 'Grim Kids challenge');
      void api.postEvents([{ type: 'game', mode: 'bot', opponentRating: bot.rating, opponentRd: bot.rd, botLevel: bot.id, result: score, color, pgn: game.current.pgn(), rated: true, at: new Date().toISOString() }]).catch(() => {});
    }
  };

  const checkEnd = (): boolean => {
    const c = game.current;
    if (!c.isGameOver()) return false;
    if (c.isCheckmate()) {
      const loser = c.turn() === 'w' ? 'white' : 'black';
      if (mode === 'friend') finish(1, `Checkmate! ${loser === 'white' ? 'Black' : 'White'} wins. Great game, both of you!`);
      else if (loser === color) finish(0, `${bot?.name} won this time. Every game teaches you something. Play again?`);
      else finish(1, 'Checkmate! You won! You worked really hard.');
    } else finish(0.5, c.isStalemate() ? 'Stalemate: it is a draw.' : 'It is a draw!');
    return true;
  };

  const botTurn = async () => {
    if (!bot) return;
    setThinking(true);
    try {
      const uci = await bestMove(game.current.fen(), { level: bot.id });
      if (!alive.current) return;
      game.current.move({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: (uci[4] as 'q') || undefined });
      sync();
      if (!checkEnd()) setSay(game.current.inCheck() ? 'Check! Save your king.' : 'Your move!');
    } catch { if (alive.current) setSay('The computer is having a rest. Tap "New game" to try again.'); }
    finally { if (alive.current) setThinking(false); }
  };

  useEffect(() => { if (mode !== 'friend' && color === 'black' && game.current.history().length === 0) void botTurn(); /* bot opens */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMove = (m: BoardMove) => {
    if (result || thinking) return false;
    try { game.current.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch { return false; }
    setHint(null); sync();
    if (checkEnd()) return;
    if (mode === 'friend') { setSay(`${game.current.turn() === 'w' ? 'White' : 'Black'} to move.`); return; }
    void botTurn();
  };

  const undo = () => {
    if (thinking || mode === 'challenge') return;
    const c = game.current;
    c.undo();
    if (mode === 'fun' && c.turn() !== color[0]) c.undo();
    setResult(null); setHint(null); sync(); setSay('Undone. Try another idea!');
  };
  const askHint = async () => {
    setSay('Rookie is thinking…');
    try { const uci = await bestMove(game.current.fen(), { movetimeMs: 800 }); if (alive.current) { setHint([uci.slice(0, 2), uci.slice(2, 4), 'green']); setSay('How about the green arrow? Can you see why?'); } }
    catch { setSay('No hint right now. Look for checks, captures and threats!'); }
  };
  const restart = () => { stopEngine(); game.current = new Chess(); posted.current = false; setResult(null); setHint(null); sync(); setThinking(false); setSay('New game!'); newEngineGame(); if (mode !== 'friend' && color === 'black') setTimeout(() => void botTurn(), 50); };

  const myTurn = mode === 'friend' ? true : game.current.turn() === color[0];
  return (
    <Page>
      <Confetti fire={fire} />
      <div className="kid-prompt">
        <Mascot mood={result?.mood ?? (thinking ? 'think' : 'happy')} size={56} />
        <div className="kid-bubble" aria-live="polite"><p>{say}</p></div>
        <span className="chip-stat">{mode === 'challenge' ? <><Trophy aria-hidden />Challenge</> : mode === 'fun' ? 'Fun game' : 'Two players'}</span>
      </div>
      <KidsBoard fen={fen} orientation={mode === 'friend' ? 'white' : color} lastMove={last}
        movable={result || thinking || !myTurn ? 'none' : mode === 'friend' ? 'turn' : color} onMove={onMove} arrows={hint ? [hint] : undefined} />
      <div className="kid-actions">
        {mode !== 'challenge' && !result && <button className="btn btn-soft btn-lg" onClick={undo} disabled={thinking || game.current.history().length === 0}><Undo2 aria-hidden /> Undo</button>}
        {mode === 'fun' && !result && <button className="btn btn-soft btn-lg" onClick={askHint} disabled={thinking}><Lightbulb aria-hidden /> Hint</button>}
        {mode === 'challenge' && !result && <button className="btn btn-ghost btn-lg" onClick={() => finish(0, 'You stopped this game. That is okay. Next time, keep going to the end!')}><Flag aria-hidden /> Stop game</button>}
        <button className={`btn btn-lg ${result ? 'btn-primary' : 'btn-ghost'}`} onClick={restart}><RotateCcw aria-hidden /> New game</button>
        <button className="btn btn-ghost btn-lg" onClick={onExit}>Change</button>
      </div>
    </Page>
  );
}
