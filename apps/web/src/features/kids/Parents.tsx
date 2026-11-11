// /kids/parents: grown-up dashboard behind a simple maths gate. Process-focused progress (K14), honest rating
// explanation, age-banded weekly schedule (knowledge-base/05-children/age-banded-recommendations.md), safety (K10, K12).
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import type { LessonIndexEntry } from '@grim/core';
import { api, type ProgressSnapshot } from '../../lib/api.ts';
import { useSession } from '../../lib/session.tsx';
import { today, update, useKids } from './store.ts';
import { kidsIndex } from './lessons.ts';
import { WORLDS, worldOf } from './worlds.ts';
import { ageBand, kidLevel, measured } from './level.ts';
import { Page, Stars } from './ui.tsx';
import { Mascot } from './Mascot.tsx';

const GATE_KEY = 'grim.kids.parentGate';
const gateOpen = () => { try { return Date.now() - Number(sessionStorage.getItem(GATE_KEY) ?? 0) < 30 * 60_000; } catch { return false; } };

function Gate({ onOpen }: { onOpen: () => void }) {
  const [q] = useState(() => { const a = 6 + Math.floor(Math.random() * 7), b = 6 + Math.floor(Math.random() * 7), c = 10 + Math.floor(Math.random() * 30); return { a, b, c, ans: a * b + c }; });
  const [v, setV] = useState('');
  const [bad, setBad] = useState(false);
  return (
    <Page title="Ask a grown-up">
      <div className="card kid-gate">
        <Mascot mood="think" size={96} />
        <p>This part is for parents and carers. Please answer to continue:</p>
        <form onSubmit={(e) => { e.preventDefault(); if (Number(v) === q.ans) { try { sessionStorage.setItem(GATE_KEY, String(Date.now())); } catch { /* ignore */ } onOpen(); } else { setBad(true); setV(''); } }}>
          <label className="label" htmlFor="gate">What is {q.a} × {q.b} + {q.c}?</label>
          <input id="gate" className="input" inputMode="numeric" autoComplete="off" value={v} onChange={(e) => { setV(e.target.value.replace(/\D/g, '')); setBad(false); }} aria-invalid={bad || undefined} aria-describedby={bad ? 'gate-err' : undefined} />
          {bad && <p id="gate-err" className="error">That is not right. Please try again.</p>}
          <button className="btn btn-primary btn-lg btn-block" type="submit"><Lock aria-hidden /> Open</button>
        </form>
        <Link to="/kids" className="btn btn-ghost btn-lg btn-block">Back to the map</Link>
      </div>
    </Page>
  );
}

const CONF: Record<string, string> = { 'very-low': 'very low', low: 'low', medium: 'medium', high: 'high' };

export function KidsParents() {
  const [open, setOpen] = useState(gateOpen);
  if (!open) return <Gate onOpen={() => setOpen(true)} />;
  return <Dashboard />;
}

function Dashboard() {
  const { me, setMe } = useSession();
  const kids = useKids();
  const [prog, setProg] = useState<ProgressSnapshot | null>(null);
  const [index, setIndex] = useState<LessonIndexEntry[]>([]);
  const [ageErr, setAgeErr] = useState<string | null>(null);
  useEffect(() => { api.progress().then(setProg, () => {}); kidsIndex().then(setIndex, () => {}); }, []);

  const age = me?.profile.age ?? null;
  const band = ageBand(age);
  const m = measured(me);
  const lessonsDone = Object.keys(kids.lessons).length;
  const lvl = kidLevel(m.rating, lessonsDone);
  const days = useMemo(() => {
    const out: { label: string; min: number }[] = [];
    const d = new Date(); d.setDate(d.getDate() - 6);
    for (let i = 0; i < 7; i++) { out.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), min: Math.round((kids.seconds[today(d)] ?? 0) / 60) }); d.setDate(d.getDate() + 1); }
    return out;
  }, [kids.seconds]);
  const weekMin = days.reduce((a, d) => a + d.min, 0);
  const maxDay = Math.max(band.goalMin, ...days.map((d) => d.min));
  const pz = (prog?.ratings ?? me?.ratings)?.puzzle;
  const est = prog?.estimate ?? me?.estimate ?? null;
  const set = (patch: Partial<typeof kids.settings>) => update((s) => { s.settings = { ...s.settings, ...patch }; });

  return (
    <Page title="For grown-ups">
      <p className="muted">Progress on this device and account. Everything here is about effort and learning, not talent.</p>

      <div className="tile-grid kid-tiles">
        <div className="tile"><span className="tile__label">Time this week</span><span className="tile__value">{weekMin}<span className="tile__unit">min</span></span></div>
        <div className="tile"><span className="tile__label">Total training time</span><span className="tile__value">{prog ? prog.totals.minutes : '–'}<span className="tile__unit">min</span></span></div>
        <div className="tile"><span className="tile__label">Lessons finished</span><span className="tile__value">{lessonsDone}<span className="tile__unit">of {index.length || '…'}</span></span></div>
        <div className="tile"><span className="tile__label">Puzzle rating</span><span className="tile__value">{pz && pz.games ? Math.round(pz.rating) : '–'}{pz && pz.games ? <span className="tile__unit">±{Math.round(2 * pz.rd)} ({pz.games} puzzles)</span> : null}</span></div>
        <div className="tile"><span className="tile__label">Estimated playing strength</span><span className="tile__value">{est ? Math.round(est.rating) : '–'}{est && <span className="tile__unit">{Math.round(est.low)}–{Math.round(est.high)}</span>}</span></div>
      </div>

      <section className="card">
        <h2>What the numbers mean</h2>
        <p>Your child sees the level <b>{lvl.level.name}</b>. Behind it is a measured number.</p>
        {est ? (
          <p>The estimate is <b>about {Math.round(est.rating)}</b>, with a likely range of {Math.round(est.low)} to {Math.round(est.high)} and <b>{CONF[est.confidence] ?? est.confidence}</b> confidence. It is a FIDE-equivalent classical rating worked out from puzzles, rated games against calibrated computer opponents and checks. It is <b>not an official rating</b>. A wide range means there is not much data yet. It narrows as your child plays "Challenge" games and solves puzzles.</p>
        ) : (
          <p>There is <b>not enough data yet</b> for an honest estimate. It appears after some Mate-in-1 Treasure puzzles and a few "Challenge" games against the computer friends. Until then, the level shown to your child is based on lessons finished.</p>
        )}
        {est && est.components.length > 0 && (
          <ul className="kid-components">{est.components.map((c) => <li key={c.source}>{c.source}: {Math.round(c.rating)} (weight {Math.round(c.weight * 100)}%){c.note ? `, ${c.note}` : ''}</li>)}</ul>
        )}
        <p className="muted">Computer-friend ratings are rough: they are estimated from the bot's design, not yet calibrated against children. Fun games with undo and hints are never rated.</p>
      </section>

      <section className="card">
        <h2>Last 7 days</h2>
        <div className="kid-bars" role="img" aria-label={`Minutes per day: ${days.map((d) => `${d.label} ${d.min}`).join(', ')}`}>
          {days.map((d, i) => (
            <div key={i} className="kid-bars__col">
              <span className="kid-bars__val">{d.min || ''}</span>
              <span className="kid-bars__bar" style={{ height: `${Math.max(2, (d.min / maxDay) * 100)}%` }} data-goal={d.min >= band.goalMin || undefined} />
              <span className="kid-bars__lbl">{d.label}</span>
            </div>
          ))}
        </div>
        <p className="muted">Goal line: {kids.settings.dailyGoalMin || band.goalMin} minutes a day. Missing a day is fine. There are no streak penalties.</p>
      </section>

      <section className="card">
        <h2>Adventure progress</h2>
        <table className="table table-compact">
          <thead><tr><th>World</th><th>Steps Method</th><th>Done</th><th>Stars</th></tr></thead>
          <tbody>
            {WORLDS.map((w) => {
              const ls = index.filter((l) => worldOf(l.id) === w.id);
              const done = ls.filter((l) => kids.lessons[l.id]);
              const stars = done.reduce((a, l) => a + (kids.lessons[l.id]?.stars ?? 0), 0);
              return <tr key={w.id}><td>{w.id}. {w.name}</td><td>{w.steps}</td><td>{done.length}/{ls.length}</td><td>{done.length ? <Stars n={Math.round(stars / done.length)} size={16} /> : '–'}</td></tr>;
            })}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Recommended weekly schedule</h2>
        <p>For ages <b>{band.band}</b> ({band.label}): about <b>{band.goalMin} minutes</b> a session, in chunks of {band.chunkMin} minutes, {band.week}. Ambitious players: {band.ambitious}.</p>
        <p>{band.focus}</p>
        <table className="table table-compact">
          <thead><tr><th>Age</th><th>Session</th><th>Hobby, per week</th><th>Focus</th></tr></thead>
          <tbody>
            <tr data-current={band.band === '4-6' || undefined}><td>4-6</td><td>10-15 min (3-5 min chunks)</td><td>30-60 min</td><td>Mini-games, piece moves, with a grown-up</td></tr>
            <tr data-current={band.band === '7-9' || undefined}><td>7-9</td><td>15-25 min</td><td>1-2 h</td><td>Rules, basic mates, simple tactics</td></tr>
            <tr data-current={band.band === '10-12' || undefined}><td>10-12</td><td>30-45 min</td><td>2-3 h</td><td>Tactics, calculation, endgames, own-game review</td></tr>
          </tbody>
        </table>
        <p>A good session: one lesson, then a mini-game, then a short game. Keep 60 minutes of active play a day away from screens (WHO), protect sleep, and play on a real board together too. For under-5s, keep screen time under 1 hour a day.</p>
        <p className="muted">Session lengths are design defaults from <Link to="/kb">the knowledge base</Link> (05-children: age-banded recommendations, children's track principles K4, K5, K19), not experimentally validated chess rules.</p>
      </section>

      <section className="card">
        <h2>Talk about it</h2>
        <ul>
          <li>"Show me the trickiest puzzle you solved today. How did you find it?"</li>
          <li>"What do you check before you move?" (Is my piece safe? Can I capture something?)</li>
          <li>"Which piece is your favourite? Why?"</li>
          <li>Praise the effort and the thinking ("you kept looking!"), not being clever or fast.</li>
        </ul>
      </section>

      <section className="card">
        <h2>Settings</h2>
        <div className="kid-settings">
          <label className="field"><span className="label">Child's age</span>
            <select className="select" value={age ?? ''} onChange={async (e) => {
              const v = Number(e.target.value); setAgeErr(null);
              try { setMe(await api.updateProfile({ age: v })); } catch (err) { setAgeErr((err as Error).message); }
            }}>
              <option value="" disabled>Choose</option>
              {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            {ageErr && <span className="error">{ageErr}</span>}
          </label>
          <label className="field"><span className="label">Daily goal</span>
            <select className="select" value={kids.settings.dailyGoalMin} onChange={(e) => set({ dailyGoalMin: Number(e.target.value) })}>
              <option value={0}>Automatic for age ({band.goalMin} min)</option>
              {[10, 15, 20, 30, 45].map((n) => <option key={n} value={n}>{n} minutes</option>)}
            </select>
          </label>
          <label className="field"><span className="label">Read instructions aloud automatically</span>
            <select className="select" value={kids.settings.autoRead == null ? 'auto' : kids.settings.autoRead ? 'on' : 'off'} onChange={(e) => set({ autoRead: e.target.value === 'auto' ? null : e.target.value === 'on' })}>
              <option value="auto">Automatic (on under age 7)</option><option value="on">On</option><option value="off">Off</option>
            </select>
          </label>
          <label className="kid-check"><input type="checkbox" checked={kids.settings.unlockAll} onChange={(e) => set({ unlockAll: e.target.checked })} /> Open every lesson on the map (for children who already know the basics)</label>
          <label className="kid-check"><input type="checkbox" checked={kids.settings.raceMode} onChange={(e) => set({ raceMode: e.target.checked })} /> Allow timed races in mini-games (off by default under age 9)</label>
          <label className="kid-check"><input type="checkbox" checked={kids.settings.allowFriendRooms} onChange={(e) => set({ allowFriendRooms: e.target.checked })} /> Allow private-room games with friends we know in real life</label>
        </div>
      </section>

      <section className="card kid-safety">
        <h2><ShieldCheck aria-hidden /> Online safety</h2>
        <ul>
          <li><b>Online play is off by default for children under 13.</b> There is no public matchmaking on the kids track.</li>
          <li>If you allow it above, play is only in a <b>private room</b>: you create a 6-letter code and share it with a friend you know in real life. Nobody else can join.</li>
          <li><b>No chat, no messages and no friend requests</b> anywhere on the kids track. Adults cannot contact your child.</li>
          <li>No adverts, no location, no public profile. Training data is used only to choose the next lesson, and you can reset it.</li>
          <li>Progress such as stars and stickers is stored on this device. Ratings are stored on the Grim Chess server for this account.</li>
        </ul>
        <p className="muted">Based on the children's track principles K10 and K12 and the online-safety requirements in the knowledge base (COPPA, UK Children's Code, the ChessKid model).</p>
        {kids.settings.allowFriendRooms && <Link className="btn btn-soft btn-lg" to="/play/online">Open private-room play (grown-up sets it up)</Link>}
      </section>
    </Page>
  );
}
