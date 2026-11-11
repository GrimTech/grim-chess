// Square Hunt: find the named square. Untimed by default; a 60-second race is opt-in (K9: no clocks for young kids).
import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Timer } from 'lucide-react';
import { FreeBoard, Confetti, Stars } from '../ui.tsx';
import { GameShell, postDrill } from './common.tsx';
import { speak } from '../speech.ts';
import { getKids, recordGame } from '../store.ts';
import { earn } from '../stickers.ts';
import { useSession } from '../../../lib/session.tsx';

const ROUNDS = 10;
const rnd = () => 'abcdefgh'[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8));
const EMPTY = '8/8/8/8/8/8/8/8 w - - 0 1';

export function SquareHunt() {
  const { me } = useSession();
  const raceAllowed = getKids().settings.raceMode || (me?.profile.age ?? 0) >= 9;
  const [race, setRace] = useState(false);
  const [target, setTarget] = useState(rnd);
  const [round, setRound] = useState(1);
  const [firsts, setFirsts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [missed, setMissed] = useState(false);
  const [flash, setFlash] = useState<{ sq: string; ok: boolean } | null>(null);
  const [black, setBlack] = useState(false);
  const [done, setDone] = useState(false);
  const [time, setTime] = useState(60);
  const [fire, setFire] = useState(0);
  const started = useRef(Date.now());
  const [say, setSay] = useState(`Find the square **${target}**!`);

  useEffect(() => { speak(target.split('').join(' ')); }, [target]);
  useEffect(() => {
    if (!race || done) return;
    const id = setInterval(() => setTime((t) => { if (t <= 1) { clearInterval(id); finish(firsts, true); return 0; } return t - 1; }), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race, done]);

  const finish = (f: number, timeUp = false) => {
    setDone(true); setFire((x) => x + 1);
    setSay(timeUp ? `Time! You found ${f} squares.` : `You found ${f} of ${ROUNDS} on the first try. Super map reading!`);
    recordGame(race ? 'square-hunt-race' : 'square-hunt', f, true);
    void postDrill('coordinate-drill', ['rules.board.coordinates'], f / ROUNDS, (Date.now() - started.current) / 1000, { game: 'square-hunt', race, firsts: f, orientation: black ? 'black' : 'white' });
  };

  const tap = (sq: string) => {
    if (done) return;
    if (sq === target) {
      const f = firsts + (missed ? 0 : 1);
      const st = missed ? 0 : streak + 1;
      setFirsts(f); setStreak(st); setFlash({ sq, ok: true });
      if (st >= 10) earn('square-hunt-10');
      if (!race && round >= ROUNDS) return finish(f);
      const n = rnd(); setTarget(n); setRound((r) => r + 1); setMissed(false);
      setSay(`Yes! Now find **${n}**.`);
    } else {
      setMissed(true); setStreak(0); setFlash({ sq, ok: false });
      setSay(`That is ${sq}. Look for **${target}**: letter ${target[0]}, number ${target[1]}.`);
    }
    setTimeout(() => setFlash(null), 600);
  };

  const restart = (r = race) => {
    setRace(r); setRound(1); setFirsts(0); setStreak(0); setMissed(false); setDone(false); setTime(60); started.current = Date.now();
    const n = rnd(); setTarget(n); setSay(`Find the square **${n}**!`);
  };

  return (
    <GameShell title="Square Hunt" say={say} mood={done ? 'cheer' : missed ? 'think' : 'happy'}
      aside={<span className="chip-stat">{race ? <><Timer aria-hidden />{time}s</> : `${Math.min(round, ROUNDS)}/${ROUNDS}`}</span>}>
      <Confetti fire={fire} />
      <div className="kid-target" aria-live="assertive">{done ? 'Well done!' : target}</div>
      <div className={`kid-hunt ${flash ? (flash.ok ? 'is-ok' : 'is-miss') : ''}`}>
        <FreeBoard fen={EMPTY} onTap={tap} orientation={black ? 'black' : 'white'} highlights={flash ? [flash.sq] : []} disabled={done} />
      </div>
      <div className="kid-actions">
        {done && <Stars n={firsts >= 9 ? 3 : firsts >= 6 ? 2 : 1} size={40} />}
        <button className="btn btn-primary btn-lg" onClick={() => restart()}><RotateCcw aria-hidden /> New hunt</button>
        <button className="btn btn-soft btn-lg" onClick={() => { setBlack((b) => !b); restart(); }}>Play from {black ? 'White' : 'Black'}'s side</button>
        {raceAllowed && <button className="btn btn-ghost btn-lg" onClick={() => restart(!race)}><Timer aria-hidden /> {race ? 'No timer' : '60 second race'}</button>}
      </div>
    </GameShell>
  );
}
