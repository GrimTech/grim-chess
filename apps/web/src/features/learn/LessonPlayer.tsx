// Lesson player for the Lesson schema (text, board, move, quiz, play steps).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ArrowLeft, ArrowRight, Lightbulb, RotateCcw, Check } from 'lucide-react';
import type { Lesson, MoveStep, QuizStep, PlayStep, LessonStep } from '@grim/core';
import { Board, type BoardMove } from '../../components/Board.tsx';
import { useSession } from '../../lib/session.tsx';
import { PlayOut } from './PlayOut.tsx';
import { applySan, loadLesson, markLessonCompleted, md, nowIso, postEvents, sameSan, sideToMove, useAsync, useTimeouts } from './util.ts';

type StepResult = { done: boolean; firstTry: boolean };

function Markdown({ src }: { src: string }) {
  return <div className="prose lr-md" dangerouslySetInnerHTML={{ __html: md(src) }} />;
}

function MoveStepView({ step, onDone }: { step: MoveStep; onDone: (firstTry: boolean) => void }) {
  const later = useTimeouts();
  const learner = sideToMove(step.fen);
  const [fen, setFen] = useState(step.fen);
  const [idx, setIdx] = useState(0);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [fails, setFails] = useState(0);
  const [solved, setSolved] = useState(false);
  const [shake, setShake] = useState(false);
  const [wrongMsg, setWrongMsg] = useState(false);
  const [busy, setBusy] = useState(false);
  const failsTotal = useRef(0);

  const expected = step.solution[idx];
  const hintArrow = useMemo(() => {
    if (!expected) return null;
    const r = applySan(fen, expected);
    return r ? ([r.from, r.to, 'green'] as [string, string, 'green']) : null;
  }, [fen, expected]);

  const onMove = (m: BoardMove) => {
    if (solved || busy) return false;
    const mate = (() => { try { return new Chess(m.fenAfter).isCheckmate(); } catch { return false; } })();
    const isAlt = idx === 0 && (step.alternatives ?? []).some((a) => sameSan(a, m.san));
    const expectsMate = /#/.test(expected ?? '') || (() => { const r = applySan(fen, expected ?? ''); return r ? new Chess(r.fen).isCheckmate() : false; })();
    const ok = sameSan(m.san, expected ?? '') || isAlt || (mate && expectsMate);
    if (!ok) {
      failsTotal.current++; setFails((f) => f + 1); setShake(true); setWrongMsg(true);
      later(() => setShake(false), 450);
      return false;
    }
    setWrongMsg(false);
    setFen(m.fenAfter); setLast([m.from, m.to]);
    const next = idx + 1;
    if (isAlt || next >= step.solution.length || mate) { setSolved(true); onDone(failsTotal.current === 0); return true; }
    setBusy(true);
    later(() => {
      const r = applySan(m.fenAfter, step.solution[next]);
      setBusy(false);
      if (!r) { setSolved(true); onDone(failsTotal.current === 0); return; }
      setFen(r.fen); setLast([r.from, r.to]); setIdx(next + 1); setFails(0);
      if (next + 1 >= step.solution.length) { setSolved(true); onDone(failsTotal.current === 0); }
    }, 550);
    setIdx(next);
    return true;
  };

  const showHint = fails >= 2 && !solved;
  const state = solved ? 'correct' : wrongMsg ? 'wrong' : undefined;
  return (
    <div className="lr-lesson__grid">
      <div className={`lr-board ${shake ? 'lr-shake' : ''}`} data-state={state}>
        <Board fen={fen} orientation={learner} movable={solved || busy ? 'none' : learner} onMove={onMove} lastMove={last}
          arrows={[...(step.arrows ?? []), ...(showHint && hintArrow ? [hintArrow] : [])]} />
      </div>
      <div className="stack">
        <div className="prompt" data-state={state}>
          <span className="prompt__turn" data-color={learner} aria-hidden="true" />
          <p className="prompt__title" role="status" aria-live="polite">{solved ? 'Correct!' : wrongMsg ? 'Not quite. Try again.' : step.prompt}</p>
        </div>
        {showHint && <p className="lr-hint"><Lightbulb size={16} aria-hidden="true" /> {step.hint ?? 'Hint: follow the green arrow.'}</p>}
        {solved && <Markdown src={step.explain} />}
      </div>
    </div>
  );
}

function QuizStepView({ step, onDone }: { step: QuizStep; onDone: (firstTry: boolean) => void }) {
  const [picked, setPicked] = useState<number[]>([]);
  const solved = picked.includes(step.answer);
  const pick = (i: number) => {
    if (solved || picked.includes(i)) return;
    const next = [...picked, i];
    setPicked(next);
    if (i === step.answer) onDone(next.length === 1);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= step.choices.length && !(e.target instanceof HTMLInputElement)) pick(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div className={step.fen ? 'lr-lesson__grid' : 'stack'}>
      {step.fen && <div className="lr-board"><Board fen={step.fen} orientation={sideToMove(step.fen)} /></div>}
      <div className="stack">
        <Markdown src={step.question} />
        <div className="lr-choices" role="group" aria-label="Answers">
          {step.choices.map((c, i) => (
            <button key={i} className="lr-choice" onClick={() => pick(i)} disabled={solved && i !== step.answer}
              data-state={picked.includes(i) ? (i === step.answer ? 'correct' : 'wrong') : undefined}>
              <kbd>{i + 1}</kbd> <span dangerouslySetInnerHTML={{ __html: md(c).replace(/^<p>|<\/p>\s*$/g, '') }} />
            </button>
          ))}
        </div>
        {solved && <Markdown src={step.explain} />}
      </div>
    </div>
  );
}

function PlayStepView({ step, onDone }: { step: PlayStep; onDone: (firstTry: boolean) => void }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ success: boolean } | null>(null);
  const failed = useRef(false);
  return (
    <div className="lr-lesson__grid">
      <PlayOut fen={step.fen} goal={step.goal} maxMoves={step.maxMoves} engineLevel={step.engineLevel} attempt={attempt}
        onFinish={(o) => { setResult(o); if (o.success) onDone(!failed.current); else failed.current = true; }} />
      <div className="stack">
        <Markdown src={step.prompt} />
        {result && !result.success && <button className="btn" onClick={() => { setResult(null); setAttempt((a) => a + 1); }}><RotateCcw aria-hidden="true" /> Try again</button>}
        {result?.success && step.explain && <Markdown src={step.explain} />}
        {!result && <button className="btn btn-ghost btn-sm" onClick={() => setAttempt((a) => a + 1)}><RotateCcw aria-hidden="true" /> Restart position</button>}
      </div>
    </div>
  );
}

const interactive = (s: LessonStep) => s.type === 'move' || s.type === 'quiz' || s.type === 'play';

export function LessonPlayerPage() {
  const { id = '' } = useParams();
  const { data: lesson, error, loading } = useAsync(() => loadLesson(id), [id]);
  if (loading) return <div className="lr-page"><div className="skeleton" style={{ height: 320 }} /></div>;
  if (error || !lesson) return <div className="lr-page"><div className="empty"><p className="empty__title">Lesson not found</p><p>{error}</p><Link className="btn" to="/learn">Back to curriculum</Link></div></div>;
  return <LessonPlayer key={lesson.id} lesson={lesson} />;
}

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const { me, setMe } = useSession();
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const [results, setResults] = useState<Record<number, StepResult>>({});
  const [finished, setFinished] = useState(false);
  const started = useRef(Date.now());
  const steps = lesson.steps;
  const step = steps[i];
  const canNext = !interactive(step) || results[i]?.done;
  const inter = steps.map((s, k) => (interactive(s) ? k : -1)).filter((k) => k >= 0);
  const score = inter.length ? inter.filter((k) => results[k]?.firstTry).length / inter.length : 1;

  const complete = () => {
    setFinished(true);
    markLessonCompleted(lesson.id);
    void postEvents([{ type: 'lesson', lessonId: lesson.id, skillIds: lesson.skillIds, score: +score.toFixed(3), durationSec: Math.round((Date.now() - started.current) / 1000), at: nowIso() }], setMe, me);
  };
  const next = () => { if (!canNext) return; if (i + 1 < steps.length) setI(i + 1); else if (!finished) complete(); };
  const prev = () => setI((x) => Math.max(0, x - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const mark = (k: number) => (firstTry: boolean) => setResults((r) => (r[k]?.done ? r : { ...r, [k]: { done: true, firstTry } }));
  const pct = Math.round(((finished ? steps.length : i) / steps.length) * 100);

  return (
    <div className="lr-page lr-lesson">
      <header className="lr-lesson__head">
        <Link to="/learn" className="btn btn-ghost btn-sm"><ArrowLeft aria-hidden="true" /> Curriculum</Link>
        <div className="lr-lesson__title">
          <p className="muted lr-eyebrow">Stage {lesson.stage} · {lesson.estMinutes} min</p>
          <h1>{lesson.title}</h1>
        </div>
      </header>
      <div className="progress" role="progressbar" aria-label="Lesson progress" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} style={{ ['--value' as string]: pct }}>
        <div className="progress__bar" />
      </div>

      {finished ? (
        <section className="card reward-pop lr-lesson__done">
          <h2><Check aria-hidden="true" /> Lesson complete</h2>
          <p>First-try accuracy: <strong>{Math.round(score * 100)}%</strong>{inter.length ? ` on ${inter.length} exercises` : ''}.</p>
          <p className="muted">This lesson is now scheduled for spaced review, so you will see it again just before you would forget it.</p>
          <div className="row">
            {lesson.practiceThemes?.length ? (
              <Link className="btn btn-primary" to={`/train/puzzles?themes=${lesson.practiceThemes.join(',')}`}>Practise with puzzles ({lesson.practiceThemes.join(', ')})</Link>
            ) : null}
            <button className="btn" onClick={() => nav('/learn')}>Back to curriculum</button>
            <button className="btn btn-ghost" onClick={() => { setI(0); setResults({}); setFinished(false); started.current = Date.now(); }}>Replay</button>
          </div>
          {lesson.sources?.length ? <details><summary>Sources</summary><ul>{lesson.sources.map((s) => <li key={s}>{s}</li>)}</ul></details> : null}
        </section>
      ) : (
        <section className="lr-lesson__step" key={i} aria-label={`Step ${i + 1} of ${steps.length}`}>
          {step.type === 'text' && <Markdown src={step.md} />}
          {step.type === 'board' && (
            <div className="lr-lesson__grid">
              <div className="lr-board"><Board fen={step.fen} orientation={step.orientation ?? 'white'} arrows={step.arrows} highlights={step.highlights} /></div>
              <Markdown src={step.md} />
            </div>
          )}
          {step.type === 'move' && <MoveStepView step={step} onDone={mark(i)} />}
          {step.type === 'quiz' && <QuizStepView step={step} onDone={mark(i)} />}
          {step.type === 'play' && <PlayStepView step={step} onDone={mark(i)} />}
        </section>
      )}

      {!finished && (
        <nav className="lr-lesson__nav" aria-label="Lesson steps">
          <button className="btn" onClick={prev} disabled={i === 0}><ArrowLeft aria-hidden="true" /> Back</button>
          <span className="muted">{i + 1} / {steps.length}</span>
          <button className="btn btn-primary" onClick={next} disabled={!canNext} aria-keyshortcuts="ArrowRight Enter">
            {i + 1 === steps.length ? 'Finish' : 'Next'} <ArrowRight aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}
