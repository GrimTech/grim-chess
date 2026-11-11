// Kids-track shell: switches the design system to the kids variant, tracks active time (for the daily goal ring),
// suggests move breaks (K19) and gives one row of four big choices (the app shell owns the bottom tab bar).
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Gamepad2, Map as MapIcon, Swords, Users, Star, CalendarCheck } from 'lucide-react';
import { useSession } from '../../lib/session.tsx';
import { addSeconds, today, useKids } from './store.ts';
import { ageBand } from './level.ts';
import { Mascot } from './Mascot.tsx';
import './kids.css';

function useTrackKidsTheme() {
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.getAttribute('data-track');
    el.setAttribute('data-track', 'kids');
    return () => { if (prev === null) el.removeAttribute('data-track'); else el.setAttribute('data-track', prev); };
  }, []);
}

/** Counts visible, recently-active seconds. Returns seconds of continuous use this visit. */
function useActiveTime() {
  const last = useRef(Date.now());
  const [session, setSession] = useState(0);
  useEffect(() => {
    const poke = () => { last.current = Date.now(); };
    const evs = ['pointerdown', 'keydown', 'touchstart'] as const;
    evs.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    let pending = 0;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - last.current < 90_000) {
        pending += 5; setSession((s) => s + 5);
        if (pending >= 15) { addSeconds(pending); pending = 0; }
      }
    }, 5000);
    return () => { clearInterval(id); if (pending) addSeconds(pending); evs.forEach((e) => window.removeEventListener(e, poke)); };
  }, []);
  return session;
}

export function KidsLayout() {
  useTrackKidsTheme();
  const { me } = useSession();
  const kids = useKids();
  const session = useActiveTime();
  const band = ageBand(me?.profile.age);
  const breakAt = band.chunkMin * 2 * 60;
  const [breakShown, setBreakShown] = useState(0);
  const loc = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [loc.pathname]);

  const stars = Object.values(kids.lessons).reduce((a, l) => a + l.stars, 0);
  const week = (() => {
    const d = new Date(); let n = 0;
    for (let i = 0; i < 7; i++) { if ((kids.seconds[today(d)] ?? 0) > 30) n++; d.setDate(d.getDate() - 1); }
    return n;
  })();
  const showBreak = session >= breakAt * (breakShown + 1);

  return (
    <div className="kids-root" data-track="kids">
      <header className="kid-top">
        <NavLink to="/kids" className="kid-top__home" aria-label="Kids home"><Mascot size={44} /><span>Grim Kids</span></NavLink>
        <span className="kid-top__spacer" />
        <span className="chip-stat chip-stat-xp" title="Stars you have earned"><Star aria-hidden />{stars}</span>
        <span className="chip-stat" title="Days you played this week"><CalendarCheck aria-hidden />{week}/7</span>
      </header>
      <nav className="kid-nav" aria-label="Kids menu">
        <NavLink to="/kids" end className="kid-tab"><MapIcon aria-hidden /><span>Map</span></NavLink>
        <NavLink to="/kids/games" className="kid-tab"><Gamepad2 aria-hidden /><span>Games</span></NavLink>
        <NavLink to="/kids/play" className="kid-tab"><Swords aria-hidden /><span>Play</span></NavLink>
        <NavLink to="/kids/parents" className="kid-tab"><Users aria-hidden /><span>Grown-ups</span></NavLink>
      </nav>
      <div className="kid-main"><Outlet /></div>
      {showBreak && (
        <div className="kid-overlay" role="dialog" aria-modal="true" aria-label="Move break">
          <div className="kid-overlay__card">
            <Mascot mood="cheer" size={120} />
            <h2>Wiggle break!</h2>
            <p>You have been thinking hard. Stand up, stretch and jump 5 times. Then come back!</p>
            <button className="btn btn-primary btn-lg" onClick={() => setBreakShown((n) => n + 1)}>I did it!</button>
          </div>
        </div>
      )}
    </div>
  );
}
