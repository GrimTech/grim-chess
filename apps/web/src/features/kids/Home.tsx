// /kids: adventure map, daily goal ring, chess level, sticker book.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Lock, Play, Moon } from 'lucide-react';
import type { LessonIndexEntry } from '@grim/core';
import { useSession } from '../../lib/session.tsx';
import { kidsIndex } from './lessons.ts';
import { today, useKids } from './store.ts';
import { WORLDS, worldOf } from './worlds.ts';
import { kidLevel, measured, ageBand } from './level.ts';
import { STICKERS } from './stickers.ts';
import { KidIcon } from './icons.tsx';
import { Buddy, Mascot } from './Mascot.tsx';
import { Stars } from './ui.tsx';

export function KidsHome() {
  const { me } = useSession();
  const kids = useKids();
  const nav = useNavigate();
  const [index, setIndex] = useState<LessonIndexEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  useEffect(() => { kidsIndex().then(setIndex, (e: Error) => setErr(e.message)); }, []);

  const age = me?.profile.age ?? null;
  const band = ageBand(age);
  const goal = kids.settings.dailyGoalMin || band.goalMin;
  const todayMin = Math.floor((kids.seconds[today()] ?? 0) / 60);
  const goalPct = Math.min(100, Math.round((todayMin / goal) * 100));
  const done = Object.keys(kids.lessons).length;
  const m = measured(me);
  const lvl = kidLevel(m.rating, done);
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  const quiet = hour >= 20.5 || hour < 7;

  const { states, current } = useMemo(() => {
    const st = new Map<string, 'done' | 'current' | 'available' | 'locked'>();
    let cur: LessonIndexEntry | null = null;
    let prevDone = true;
    for (const l of index ?? []) {
      const isDone = !!kids.lessons[l.id];
      if (isDone) st.set(l.id, 'done');
      else if (prevDone && !cur) { st.set(l.id, 'current'); cur = l; }
      else st.set(l.id, kids.settings.unlockAll ? 'available' : 'locked');
      prevDone = isDone || !!kids.settings.unlockAll;
    }
    return { states: st, current: cur };
  }, [index, kids.lessons, kids.settings.unlockAll]);

  const name = me?.profile.displayName && !/^guest/i.test(me.profile.displayName) ? me.profile.displayName : 'friend';

  return (
    <div className="kid-home">
      <section className="kid-hero card">
        <Buddy mood={goalPct >= 100 ? 'cheer' : 'happy'} size={92}>
          <p className="kid-hero__hi">Hi {name}!</p>
          <p>{goalPct >= 100 ? 'You reached today\'s goal. Brilliant effort!' : current ? `Ready for "${current.title}"?` : 'Pick an adventure!'}</p>
        </Buddy>
        {current && (
          <button className="btn btn-primary btn-lg btn-block" onClick={() => nav(`/kids/lesson/${encodeURIComponent(current.id)}`)}>
            <Play aria-hidden /> {done ? 'Keep going' : 'Start the adventure'}
          </button>
        )}
        <div className="kid-hero__stats">
          <div className="kid-goal">
            <div className="ring ring-lg" style={{ ['--value' as string]: goalPct }} role="img" aria-label={`${todayMin} of ${goal} minutes today`}>
              <span className="ring__label">{todayMin}<small>/{goal}</small></span>
            </div>
            <span>minutes today</span>
          </div>
          <div className="kid-level">
            <span className="kid-level__label">Chess level</span>
            <strong className="kid-level__name">{lvl.level.name}</strong>
            <div className="progress progress-brass" aria-label="Progress to the next level"><div className="progress__bar" style={{ width: `${Math.round(lvl.progress * 100)}%` }} /></div>
            <span className="kid-level__blurb">{lvl.level.blurb}</span>
            <span className="kid-level__parent">
              For grown-ups: {m.rating != null ? <>measured rating about <b>{m.rating}</b>{m.low != null && <> (range {m.low}-{m.high})</>}</> : 'not enough games or puzzles yet to measure a rating'}. <Link to="/kids/parents">Details</Link>
            </span>
          </div>
        </div>
      </section>

      {quiet && (
        <div className="kid-note" role="status"><Moon aria-hidden /> It is getting late. Brains learn chess while you sleep. See you tomorrow!</div>
      )}
      {age != null && age < 7 && (
        <div className="kid-note"><Mascot size={40} /> Grown-up tip: play these with your child, and try the moves on a real board too.</div>
      )}

      {err && <div className="kid-note" role="alert">Rookie could not find the lessons. <button className="btn btn-soft" onClick={() => location.reload()}>Try again</button></div>}
      {!index && !err && <div className="kid-loading"><Mascot mood="think" /> Loading the map…</div>}

      {index && (
        <div className="kid-worlds">
          {WORLDS.map((w) => {
            const ls = index.filter((l) => worldOf(l.id) === w.id);
            if (!ls.length) return null;
            const nDone = ls.filter((l) => kids.lessons[l.id]).length;
            return (
              <section key={w.id} className="kid-map kid-world" aria-labelledby={`world-${w.id}`} style={{ ['--world' as string]: w.color }}>
                <div className="kid-map__unit kid-world__banner">
                  <span className="kid-world__icon"><KidIcon name={w.icon} size={32} /></span>
                  <div>
                    <h2 id={`world-${w.id}`}>World {w.id}: {w.name}</h2>
                    <p>{w.blurb} <span className="kid-world__count">{nDone}/{ls.length}</span></p>
                  </div>
                </div>
                {ls.map((l, i) => {
                  const st = states.get(l.id) ?? 'locked';
                  const rec = kids.lessons[l.id];
                  const tooYoung = l.minAge != null && age != null && age < l.minAge;
                  return (
                    <button key={l.id} type="button" className="kid-node"
                      data-state={st === 'current' ? 'available' : st}
                      aria-current={st === 'current' ? 'step' : undefined}
                      aria-disabled={st === 'locked' || undefined}
                      aria-label={`${l.title}${rec ? `, ${rec.stars} stars` : ''}${st === 'locked' ? ', locked' : ''}`}
                      onClick={() => {
                        if (st === 'locked') { setLocked(l.id); setTimeout(() => setLocked(null), 2200); return; }
                        nav(`/kids/lesson/${encodeURIComponent(l.id)}`);
                      }}>
                      {st === 'done' ? <Check aria-hidden /> : st === 'locked' ? <Lock aria-hidden /> : <span className="kid-node__num">{i + 1}</span>}
                      <span className="kid-node__label">
                        {l.title}
                        {rec && <Stars n={rec.stars} size={16} label={false} />}
                        {tooYoung && <small className="kid-node__help">with a grown-up</small>}
                        {locked === l.id && <small className="kid-node__help">Finish the one before first!</small>}
                      </span>
                    </button>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}

      <section className="card kid-stickers" aria-labelledby="sticker-book">
        <h2 id="sticker-book">My sticker book</h2>
        <p className="muted">{Object.keys(kids.stickers).length} of {STICKERS.length} stickers</p>
        <ul className="kid-sticker-grid">
          {STICKERS.map((s) => {
            const got = !!kids.stickers[s.id];
            return (
              <li key={s.id} className={`kid-sticker ${got ? 'is-got' : ''}`} style={{ ['--sticker' as string]: s.color }}>
                <span className="kid-sticker__disc">{got ? <KidIcon name={s.icon} size={30} /> : '?'}</span>
                <strong>{got ? s.name : 'Secret sticker'}</strong>
                <small>{s.how}</small>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
