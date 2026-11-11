// Onboarding: age first (children's track), experience, goal, time budget with an honest projection, placement.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Profile } from '@grim/core';
import { api } from '../../lib/api.ts';
import { useSession } from '../../lib/session.tsx';

const LEVELS: { id: Profile['startingLevel']; label: string; hint: string }[] = [
  { id: 'zero', label: 'Complete beginner', hint: 'I do not know how the pieces move.' },
  { id: 'knows-rules', label: 'I know the rules', hint: 'I can play a legal game but rarely win.' },
  { id: 'casual', label: 'Casual player', hint: 'I play online or with friends; maybe 800–1400 online.' },
  { id: 'club', label: 'Club player', hint: 'I play tournaments or have a 1400–1900 rating.' },
  { id: 'strong', label: 'Strong player', hint: 'Rated around 1900 or above.' },
];
const GOALS: { id: Profile['goal']; label: string }[] = [
  { id: 'casual', label: 'Enjoy the game and improve casually' },
  { id: 'club', label: 'Become a solid club player (~1400–1600)' },
  { id: 'expert', label: 'Reach expert level (~2000)' },
  { id: 'master', label: 'Reach master strength (~2200+)' },
  { id: 'grandmaster', label: 'Aim as high as possible (GM-equivalent strength)' },
];

// Cumulative hours of structured practice from zero to a level: planning heuristics, not predictions.
// knowledge-base/01-learning-science/time-to-mastery-evidence.md (master: ~11,000 h average total practice,
// range ~3,000 to 23,000+; Gobet & Campitelli 2007; Hambrick et al. 2014) and trajectories-and-hours-to-titles.md
// (IMs ~27,900 h mean). Lower levels: band pacing in trajectories-and-hours-to-titles.md section 5.
export const HOUR_MILESTONES: { rating: number; label: string; low: number; high: number }[] = [
  { rating: 1000, label: 'Advanced beginner (~1000)', low: 50, high: 300 },
  { rating: 1400, label: 'Club player (~1400)', low: 300, high: 1500 },
  { rating: 1800, label: 'Strong club player (~1800)', low: 1000, high: 5000 },
  { rating: 2200, label: 'Master strength (~2200, CM-equivalent strength)', low: 3000, high: 23000 },
  { rating: 2400, label: 'IM-equivalent strength (~2400)', low: 10000, high: 40000 },
];
const START_HOURS: Record<Profile['startingLevel'], number> = { zero: 0, 'knows-rules': 20, casual: 150, club: 800, strong: 3000 };
const START_RATING: Record<Profile['startingLevel'], number> = { zero: 0, 'knows-rules': 500, casual: 1000, club: 1500, strong: 1950 };

export function projection(level: Profile['startingLevel'], minutesPerDay: number, daysPerWeek: number) {
  const perYear = (minutesPerDay * daysPerWeek * 52) / 60;
  return HOUR_MILESTONES.filter((m) => m.rating > START_RATING[level]).map((m) => {
    const lo = Math.max(0, m.low - START_HOURS[level]), hi = Math.max(lo, m.high - START_HOURS[level]);
    return { ...m, hoursLow: lo, hoursHigh: hi, yearsLow: lo / perYear, yearsHigh: hi / perYear };
  });
}
const fmtYears = (y: number) => (y < 1 ? `${Math.max(1, Math.round(y * 12))} mo` : `${y < 10 ? y.toFixed(1) : Math.round(y)} yr`);

export function OnboardingPage() {
  const { me, setMe } = useSession();
  const nav = useNavigate();
  const p = me?.profile;
  const [step, setStep] = useState(0);
  const [age, setAge] = useState<string>(p?.age != null ? String(p.age) : '');
  const [ageErr, setAgeErr] = useState<string | null>(null);
  const [name, setName] = useState(p?.displayName ?? '');
  const [level, setLevel] = useState<Profile['startingLevel']>(p?.startingLevel ?? 'zero');
  const [goal, setGoal] = useState<Profile['goal']>(p?.goal ?? 'club');
  const [minutes, setMinutes] = useState(p?.minutesPerDay ?? 30);
  const [days, setDays] = useState(p?.daysPerWeek ?? 5);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async (patch: Partial<Profile>) => {
    setSaving(true); setErr(null);
    try { const m = await api.updateProfile(patch); setMe(m); return true; } catch (e) { setErr((e as Error).message); return false; } finally { setSaving(false); }
  };

  const submitAge = async () => {
    const n = Number(age);
    if (!age.trim() || !Number.isInteger(n) || n < 3 || n > 120) { setAgeErr('Please enter your age in years.'); return; }
    setAgeErr(null);
    if (n < 13) {
      if (await save({ age: n, track: 'kids', onboarded: true, ...(name.trim() ? { displayName: name.trim() } : {}) })) nav('/kids');
      return;
    }
    setStep(2);
  };
  const finish = async (placement: boolean) => {
    const ok = await save({ age: Number(age), track: 'adult', startingLevel: level, goal, minutesPerDay: minutes, daysPerWeek: days, onboarded: true, ...(name.trim() ? { displayName: name.trim() } : {}) });
    if (ok) nav(placement ? '/assessment/placement' : '/');
  };
  const proj = projection(level, minutes, days);
  const total = 6;

  return (
    <div className="lr-page lr-narrow lr-onboarding">
      <div className="progress progress-sm" role="progressbar" aria-label="Onboarding progress" aria-valuenow={step} aria-valuemin={0} aria-valuemax={total - 1} style={{ ['--value' as string]: (step / (total - 1)) * 100 }}><div className="progress__bar" /></div>

      {step === 0 && (
        <section className="stack">
          <p className="lr-eyebrow muted">Welcome to Grim Chess</p>
          <h1 className="lr-display">Train from your first move toward master strength.</h1>
          <p>Every exercise here is chosen from published research on how chess skill develops: tactics in volume, spaced review, deliberate calculation, endgame technique and games you analyse yourself. Your progress is estimated on the FIDE rating scale, always with an honest uncertainty interval.</p>
          <p className="muted">This takes about a minute. You can change everything later.</p>
          <div className="row"><button className="btn btn-primary btn-lg" onClick={() => setStep(1)} autoFocus>Get started</button></div>
        </section>
      )}

      {step === 1 && (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); void submitAge(); }}>
          <h1>How old are you?</h1>
          <p className="muted">We ask first because children under 13 get a separate track with shorter lessons and a playful design.</p>
          <div className="field">
            <label className="label" htmlFor="ob-age">Age (years)</label>
            <input id="ob-age" className="input" type="number" inputMode="numeric" min={3} max={120} required value={age} autoFocus
              onChange={(e) => setAge(e.target.value)} aria-invalid={!!ageErr} aria-describedby={ageErr ? 'ob-age-err' : undefined} style={{ maxWidth: 160 }} />
            {ageErr && <p className="error" id="ob-age-err">{ageErr}</p>}
          </div>
          <div className="field">
            <label className="label" htmlFor="ob-name">Display name <span className="label__optional">(optional)</span></label>
            <input id="ob-name" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 320 }} />
          </div>
          <div className="row"><button className="btn btn-ghost" type="button" onClick={() => setStep(0)}>Back</button><button className="btn btn-primary" type="submit" disabled={saving}>Continue</button></div>
        </form>
      )}

      {step === 2 && (
        <section className="stack">
          <h1>How much chess do you know?</h1>
          <div className="lr-options" role="radiogroup" aria-label="Experience">
            {LEVELS.map((l) => (
              <button key={l.id} role="radio" aria-checked={level === l.id} className="lr-option" onClick={() => setLevel(l.id)}>
                <strong>{l.label}</strong><span className="muted">{l.hint}</span>
              </button>
            ))}
          </div>
          <div className="row"><button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button><button className="btn btn-primary" onClick={() => setStep(3)}>Continue</button></div>
        </section>
      )}

      {step === 3 && (
        <section className="stack">
          <h1>What is your goal?</h1>
          <div className="lr-options" role="radiogroup" aria-label="Goal">
            {GOALS.map((g) => <button key={g.id} role="radio" aria-checked={goal === g.id} className="lr-option" onClick={() => setGoal(g.id)}><strong>{g.label}</strong></button>)}
          </div>
          <div className="row"><button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button><button className="btn btn-primary" onClick={() => setStep(4)}>Continue</button></div>
        </section>
      )}

      {step === 4 && (
        <section className="stack">
          <h1>How much time can you train?</h1>
          <div className="lr-two">
            <div className="field"><label className="label" htmlFor="ob-min">Minutes per day: <strong>{minutes}</strong></label>
              <input id="ob-min" type="range" min={10} max={240} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></div>
            <div className="field"><label className="label" htmlFor="ob-days">Days per week: <strong>{days}</strong></label>
              <input id="ob-days" type="range" min={1} max={7} step={1} value={days} onChange={(e) => setDays(Number(e.target.value))} /></div>
          </div>
          <div className="card card-sunken stack">
            <h2 className="card__title">An honest projection</h2>
            <p className="muted">That is about <strong>{Math.round((minutes * days * 52) / 60)} hours a year</strong>. Research on players who reached each level shows how much structured practice it typically took. The spread between individuals is more than tenfold, so read these as ranges, not promises.</p>
            <div className="table-wrap"><table className="table table-compact">
              <thead><tr><th>Milestone (estimated strength, FIDE scale)</th><th>Typical practice</th><th>At your pace</th></tr></thead>
              <tbody>{proj.map((m) => (
                <tr key={m.rating}><td>{m.label}</td><td>{m.hoursLow.toLocaleString()}–{m.hoursHigh.toLocaleString()} h</td><td>{fmtYears(m.yearsLow)} – {fmtYears(m.yearsHigh)}</td></tr>
              ))}</tbody>
            </table></div>
            <p className="hint">Sources: <Link to="/kb/01-learning-science/time-to-mastery-evidence.md">time to mastery</Link> and <Link to="/kb/01-learning-science/trajectories-and-hours-to-titles.md">documented trajectories</Link>. Real titles (CM, FM, IM, GM) also require FIDE-rated over-the-board results and norms; the platform only measures equivalent strength. We will replace these ranges with your own measured rate of progress as data accumulates.</p>
          </div>
          <div className="row"><button className="btn btn-ghost" onClick={() => setStep(3)}>Back</button><button className="btn btn-primary" onClick={() => setStep(5)}>Continue</button></div>
        </section>
      )}

      {step === 5 && (
        <section className="stack">
          <h1>Find your starting point</h1>
          <p>A 15–20 minute placement test (tactics at rising difficulty, calculation, endgame knowledge and positional judgement) places you in the curriculum and gives your first rating estimate. You can skip it: the platform will then learn your level from your training.</p>
          {err && <p className="error" role="alert">{err}</p>}
          <div className="row">
            <button className="btn btn-primary btn-lg" onClick={() => void finish(true)} disabled={saving} aria-busy={saving}>Take the placement test</button>
            <button className="btn btn-lg" onClick={() => void finish(false)} disabled={saving}>Skip for now</button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setStep(4)}>Back</button>
        </section>
      )}
      {err && step < 5 && <p className="error" role="alert">{err}</p>}
    </div>
  );
}
