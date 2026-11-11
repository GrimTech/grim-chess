// /kids/lesson/:id: kid-friendly player for the shared Lesson schema. Big board, one short instruction, read-aloud,
// gentle retries with hints, celebration on success, stars from first-try accuracy, posts a 'lesson' TrainingEvent.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lightbulb, RotateCcw, Eye } from 'lucide-react';
import { Chess, type Square } from 'chess.js';
import type { Lesson, LessonIndexEntry, LessonStep, MoveStep, PlayStep, QuizStep } from '@grim/core';
import { api } from '../../lib/api.ts';
import { bestMove, stopEngine } from '../../lib/engine.ts';
import type { BoardArrow, BoardMove } from '../../components/Board.tsx';
import { kidsIndex, kidsLesson } from './lessons.ts';
import { recordLesson, starsFor } from './store.ts';
import { checkLessonStickers, stickerById } from './stickers.ts';
import { Buddy, Mascot, type Mood } from './Mascot.tsx';
import { Confetti, KidsBoard, Md, ReadAloud, Stars, praise, retry, useAutoRead } from './ui.tsx';
import { KidIcon } from './icons.tsx';
import { stopSpeaking } from './speech.ts';

const norm = (san: string) => san.replace(/[+#?!]/g, '');
const turnOf = (fen: string): 'white' | 'black' => (fen.split(' ')[1] === 'b' ? 'black' : 'white');
const isInteractive = (s: LessonStep) => s.type === 'move' || s.type === 'quiz' || s.type === 'play';

/** UCI -> [from,to] arrow */
const uciArrow = (uci: string, c: BoardArrow[2] = 'green'): BoardArrow => [uci.slice(0, 2), uci.slice(2, 4), c];
function sanToArrow(fen: string, san: string): BoardArrow | null {
  try { const m = new Chess(fen).move(san); return [m.from, m.to, 'green']; } catch { return null; }
}

interface StepProps { onDone: (firstTry: boolean) => void; say: (text: string, mood?: Mood) => void }

// ---------- move step ----------
function MoveStepView({ step, onDone, say }: StepProps & { step: MoveStep }) {
  const [fen, setFen] = useState(step.fen);
  const [ply, setPly] = useState(0);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [wrong, setWrong] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showMe, setShowMe] = useState(false);
  const [solved, setSolved] = useState(false);
  const firstTry = useRef(true);
  const learner = turnOf(step.fen);
  const busy = useRef(false);

  const finish = () => { setSolved(true); setFeedback('correct'); say(step.explain || praise(), 'cheer'); onDone(firstTry.current); };

  const onMove = (m: BoardMove) => {
    if (solved || busy.current) return false;
    const expected = step.solution[ply];
    const alts = ply === 0 ? (step.alternatives ?? []) : [];
    const mates = expected?.endsWith('#') && m.san.endsWith('#');
    const ok = norm(m.san) === norm(expected) || alts.some((a) => norm(a) === norm(m.san)) || mates;
    if (!ok) {
      firstTry.current = false;
      const n = wrong + 1; setWrong(n);
      setFeedback('wrong'); setTimeout(() => setFeedback(null), 700);
      if (n >= 2) setShowHint(true);
      say(n >= 2 && step.hint ? step.hint : retry(), 'oops');
      return false;
    }
    setFeedback(null); setShowMe(false);
    setFen(m.fenAfter); setLast([m.from, m.to]);
    const branched = norm(m.san) !== norm(expected) && !mates; // an alternative first move: the scripted line no longer applies
    const next = ply + 1;
    if (branched || next >= step.solution.length) { finish(); return; }
    // opponent's scripted reply
    busy.current = true;
    say('Good move! Now watch…', 'think');
    setTimeout(() => {
      const c = new Chess(m.fenAfter);
      let mv;
      try { mv = c.move(step.solution[next]); } catch { mv = null; }
      busy.current = false;
      if (!mv) { finish(); return; }
      setFen(c.fen()); setLast([mv.from, mv.to]); setPly(next + 1);
      if (next + 1 >= step.solution.length) finish(); else say('Your turn again!', 'happy');
    }, 650);
  };

  const reset = () => { setFen(step.fen); setPly(0); setLast(null); setSolved(false); setFeedback(null); };
  const hintArrow = showMe ? sanToArrow(fen, step.solution[ply]) : null;
  const hintSquare = showHint && !showMe ? (sanToArrow(fen, step.solution[ply])?.[0] ?? null) : null;

  return (
    <div className="kid-step">
      <KidsBoard fen={fen} orientation={learner} movable={solved ? 'none' : learner} onMove={onMove} lastMove={last} feedback={feedback}
        arrows={[...(ply === 0 && !solved ? step.arrows ?? [] : []), ...(hintArrow ? [hintArrow] : [])]}
        highlights={hintSquare ? [hintSquare] : undefined} />
      {!solved && (
        <div className="kid-actions">
          {step.hint && <button className="btn btn-soft btn-lg" onClick={() => { firstTry.current = false; setShowHint(true); say(step.hint!, 'think'); }}><Lightbulb aria-hidden /> Hint</button>}
          {wrong >= 3 && <button className="btn btn-soft btn-lg" onClick={() => { firstTry.current = false; setShowMe(true); say('Follow the green arrow!', 'think'); }}><Eye aria-hidden /> Show me</button>}
          {ply > 0 && <button className="btn btn-ghost btn-lg" onClick={reset}><RotateCcw aria-hidden /> Start over</button>}
        </div>
      )}
    </div>
  );
}

// ---------- quiz step ----------
function QuizStepView({ step, onDone, say }: StepProps & { step: QuizStep }) {
  const [picked, setPicked] = useState<number[]>([]);
  const [right, setRight] = useState(false);
  const choose = (i: number) => {
    if (right || picked.includes(i)) return;
    setPicked((p) => [...p, i]);
    if (i === step.answer) { setRight(true); say(step.explain || praise(), 'cheer'); onDone(picked.length === 0); }
    else say(retry(), 'oops');
  };
  return (
    <div className="kid-step">
      {step.fen && <KidsBoard fen={step.fen} orientation={turnOf(step.fen)} />}
      <div className="choice-grid kid-choices">
        {step.choices.map((c, i) => (
          <button key={i} type="button" className="choice"
            data-state={picked.includes(i) ? (i === step.answer ? 'correct' : 'wrong') : undefined}
            aria-pressed={picked.includes(i)} onClick={() => choose(i)}>{c}</button>
        ))}
      </div>
    </div>
  );
}

// ---------- play step (vs engine) ----------
function PlayStepView({ step, onDone, say }: StepProps & { step: PlayStep }) {
  const learner = turnOf(step.fen);
  const [fen, setFen] = useState(step.fen);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [moves, setMoves] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [state, setState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [hint, setHint] = useState<BoardArrow | null>(null);
  const firstTry = useRef(true);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; stopEngine(); }; }, []);
  const max = step.maxMoves ?? 30;
  const level = step.engineLevel ?? 3;

  const lose = (msg: string) => { firstTry.current = false; setState('lost'); say(msg, 'oops'); };
  const win = () => { setState('won'); say(step.explain || 'You did it!', 'cheer'); onDone(firstTry.current); };

  const engineReply = async (f: string, n: number) => {
    setThinking(true);
    try {
      const uci = await bestMove(f, { level });
      if (!alive.current) return;
      const c = new Chess(f);
      const mv = c.move({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: (uci[4] as 'q') ?? undefined });
      setFen(c.fen()); setLast([mv.from, mv.to]);
      if (step.goal === 'promote' && mv.promotion) return lose('Oh no, the computer made a queen first. Try again!');
      if (c.isCheckmate()) return lose('Oops, that was checkmate for the computer. Try again!');
      if (c.isDraw() || c.isStalemate()) return (step.goal === 'draw' || step.goal === 'hold') ? win() : lose('It ended in a draw. Try again!');
      if ((step.goal === 'hold') && n >= max) return win();
    } catch { if (alive.current) say('The computer is taking a nap. Tap "Try again".', 'sleep'); }
    finally { if (alive.current) setThinking(false); }
  };

  const onMove = (m: BoardMove) => {
    if (state !== 'playing' || thinking) return false;
    setHint(null);
    const n = moves + 1; setMoves(n);
    setFen(m.fenAfter); setLast([m.from, m.to]);
    const c = new Chess(m.fenAfter);
    if (step.goal === 'promote' && m.promotion) return void win();
    if (c.isCheckmate()) return void ((step.goal === 'mate' || step.goal === 'win') ? win() : null);
    if (c.isStalemate()) return void lose('Stalemate! That is a draw. Leave the king a square. Try again!');
    if (c.isDraw()) return void ((step.goal === 'draw' || step.goal === 'hold') ? win() : lose('That is a draw. Try again!'));
    if (step.goal !== 'hold' && step.goal !== 'draw' && n >= max) return void lose(`That took more than ${max} moves. Try again, you are getting closer!`);
    void engineReply(m.fenAfter, n);
  };

  const askHint = async () => {
    firstTry.current = false;
    say('Let me think…', 'think');
    try { const uci = await bestMove(fen, { movetimeMs: 700 }); if (alive.current) { setHint(uciArrow(uci)); say('Try the green arrow!', 'happy'); } }
    catch { say('I could not think of a hint. You can do it!', 'oops'); }
  };
  const restart = () => { stopEngine(); setFen(step.fen); setLast(null); setMoves(0); setState('playing'); setHint(null); setThinking(false); say(step.prompt); };

  return (
    <div className="kid-step">
      <KidsBoard fen={fen} orientation={learner} movable={state === 'playing' && !thinking && turnOf(fen) === learner ? learner : 'none'}
        onMove={onMove} lastMove={last} arrows={hint ? [hint] : undefined} feedback={state === 'won' ? 'correct' : null} />
      <div className="kid-actions">
        {state === 'playing' && <span className="kid-movecount">{thinking ? 'Computer is thinking…' : `Move ${moves + 1}${step.goal !== 'hold' ? ` of ${max}` : ''}`}</span>}
        {state === 'playing' && <button className="btn btn-soft btn-lg" onClick={askHint} disabled={thinking}><Lightbulb aria-hidden /> Hint</button>}
        {state !== 'won' && <button className="btn btn-ghost btn-lg" onClick={restart}><RotateCcw aria-hidden /> Try again</button>}
      </div>
    </div>
  );
}

// ---------- player ----------
export function KidsLessonPlayer() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [index, setIndex] = useState<LessonIndexEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [done, setDone] = useState<boolean[]>([]);
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [bubble, setBubble] = useState<{ text: string; mood: Mood } | null>(null);
  const [confetti, setConfetti] = useState(0);
  const [finished, setFinished] = useState<{ stars: number; stickers: string[] } | null>(null);
  const started = useRef(Date.now());

  useEffect(() => {
    setLesson(null); setErr(null); setI(0); setDone([]); setResults({}); setFinished(null); started.current = Date.now();
    kidsLesson(id).then(setLesson, (e: Error) => setErr(e.message));
    kidsIndex().then(setIndex, () => {});
    return () => stopSpeaking();
  }, [id]);

  const step = lesson?.steps[i];
  const stepText = !step ? '' : step.type === 'text' ? step.md : step.type === 'board' ? step.md : step.type === 'move' ? step.prompt : step.type === 'quiz' ? step.question : step.prompt;
  useEffect(() => { setBubble(null); }, [i, id]);
  useAutoRead(finished ? null : stepText || null);

  const say = useCallback((text: string, mood: Mood = 'happy') => setBubble({ text, mood }), []);

  const onDone = useCallback((firstTry: boolean) => {
    setResults((r) => (i in r ? r : { ...r, [i]: firstTry }));
    setDone((d) => { const n = [...d]; n[i] = true; return n; });
    setConfetti((c) => c + 1);
  }, [i]);

  const interactive = useMemo(() => lesson?.steps.map((s, k) => (isInteractive(s) ? k : -1)).filter((k) => k >= 0) ?? [], [lesson]);

  const complete = async () => {
    if (!lesson) return;
    const firsts = interactive.filter((k) => results[k]).length;
    const ratio = interactive.length ? firsts / interactive.length : 1;
    const stars = starsFor(ratio);
    recordLesson(lesson.id, stars, ratio);
    const won = checkLessonStickers(index.length ? index : [], { stars });
    setFinished({ stars, stickers: won });
    setConfetti((c) => c + 1);
    try {
      await api.postEvents([{ type: 'lesson', lessonId: lesson.id, skillIds: lesson.skillIds, score: Math.round(ratio * 100) / 100, durationSec: Math.round((Date.now() - started.current) / 1000), at: new Date().toISOString() }]);
    } catch { /* offline: stars are kept locally; the event is best-effort */ }
  };

  if (err) return <div className="kid-page"><Buddy mood="oops">Rookie could not open this lesson. <Link to="/kids">Back to the map</Link></Buddy></div>;
  if (!lesson || !step) return <div className="kid-loading"><Mascot mood="think" /> Getting the lesson ready…</div>;

  const canNext = !isInteractive(step) || done[i];
  const next = index[index.findIndex((l) => l.id === lesson.id) + 1];

  if (finished) {
    return (
      <div className="kid-page kid-finish">
        <Confetti fire={confetti} />
        <Mascot mood="cheer" size={140} className="reward-pop" />
        <h1>Lesson complete!</h1>
        <p className="kid-finish__title">{lesson.title}</p>
        <div className="reward-pop"><Stars n={finished.stars} size={56} /></div>
        <p>{finished.stars === 3 ? 'Right first time, again and again. Great focus!' : finished.stars === 2 ? 'You kept looking and found the answers. Well done!' : 'You did not give up. That is how chess players get better!'}</p>
        {finished.stickers.map((sid) => { const s = stickerById(sid); return s && (
          <div key={sid} className="kid-sticker is-got kid-sticker--new reward-pop" style={{ ['--sticker' as string]: s.color }}>
            <span className="kid-sticker__disc"><KidIcon name={s.icon} size={34} /></span><strong>New sticker: {s.name}!</strong>
          </div>); })}
        <div className="kid-actions kid-actions--col">
          {next && <button className="btn btn-primary btn-lg btn-block" onClick={() => nav(`/kids/lesson/${encodeURIComponent(next.id)}`)}>Next adventure <ArrowRight aria-hidden /></button>}
          {finished.stars < 3 && <button className="btn btn-soft btn-lg btn-block" onClick={() => { setFinished(null); setI(0); setDone([]); setResults({}); started.current = Date.now(); }}><RotateCcw aria-hidden /> Play again for more stars</button>}
          <Link className="btn btn-ghost btn-lg btn-block" to="/kids">Back to the map</Link>
        </div>
      </div>
    );
  }

  const textFor = (s: LessonStep) => (s.type === 'text' || s.type === 'board' ? s.md : s.type === 'move' ? s.prompt : s.type === 'quiz' ? s.question : s.prompt);

  return (
    <div className="kid-page kid-lesson">
      <Confetti fire={confetti} />
      <header className="kid-lesson__head">
        <Link to="/kids" className="btn btn-ghost btn-icon" aria-label="Back to the map"><ArrowLeft aria-hidden /></Link>
        <div className="progress progress-brass kid-lesson__progress" role="progressbar" aria-valuemin={0} aria-valuemax={lesson.steps.length} aria-valuenow={i + 1} aria-label="Lesson progress">
          <div className="progress__bar" style={{ width: `${((i + (canNext ? 1 : 0)) / lesson.steps.length) * 100}%` }} />
        </div>
      </header>

      <div className="kid-prompt">
        <Mascot mood={bubble?.mood ?? (step.type === 'text' ? 'happy' : 'think')} size={64} />
        <div className="kid-bubble" aria-live="polite">
          <p><Md text={bubble?.text ?? textFor(step)} /></p>
        </div>
        <ReadAloud text={bubble?.text ?? textFor(step)} />
      </div>

      {step.type === 'board' && <KidsBoard fen={step.fen} orientation={step.orientation ?? 'white'} arrows={step.arrows} highlights={step.highlights} />}
      {step.type === 'text' && <div className="kid-textstep"><Mascot mood="happy" size={150} /></div>}
      {step.type === 'move' && <MoveStepView key={`${id}-${i}`} step={step} onDone={onDone} say={say} />}
      {step.type === 'quiz' && <QuizStepView key={`${id}-${i}`} step={step} onDone={onDone} say={say} />}
      {step.type === 'play' && <PlayStepView key={`${id}-${i}`} step={step} onDone={onDone} say={say} />}

      <footer className="kid-lesson__foot">
        <button className={`btn btn-lg btn-block ${canNext ? 'btn-primary' : 'btn-soft'}`} disabled={!canNext}
          onClick={() => { if (i + 1 < lesson.steps.length) setI(i + 1); else void complete(); }}>
          {i + 1 < lesson.steps.length ? <>Next <ArrowRight aria-hidden /></> : <>Finish <ArrowRight aria-hidden /></>}
        </button>
      </footer>
    </div>
  );
}
