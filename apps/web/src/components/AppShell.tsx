// Application shell (navigation + outlet). OWNER: learn agent. Keeps SessionProvider + Outlet.
// Desktop: sidebar | topbar / main. Phone (<900px): topbar / main / bottom tab bar (design system .app-shell).
import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, GraduationCap, Target, Swords, TrendingUp, BookOpen, User, Smile, Map as MapIcon, Gamepad2, Users } from 'lucide-react';
import { SessionProvider, useSession } from '../lib/session.tsx';

const NAV = [
  { to: '/', label: 'Home', icon: Home, tab: true },
  { to: '/learn', label: 'Learn', icon: GraduationCap, tab: true },
  { to: '/train', label: 'Train', icon: Target, tab: true },
  { to: '/play', label: 'Play', icon: Swords, tab: true },
  { to: '/progress', label: 'Progress', icon: TrendingUp, tab: true },
  { to: '/kb', label: 'Knowledge base', icon: BookOpen, tab: false },
  { to: '/account', label: 'Account', icon: User, tab: false },
];

function Shell() {
  const { me } = useSession();
  const loc = useLocation();
  const kids = me?.profile.track === 'kids';
  const inKids = loc.pathname.startsWith('/kids');

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.track = inKids ? 'kids' : 'adult';
    if (me?.profile.boardTheme) root.dataset.board = me.profile.boardTheme; else delete root.dataset.board;
  }, [inKids, me?.profile.boardTheme]);

  const KIDS_NAV = [
    { to: '/kids', label: 'Map', icon: MapIcon, tab: true },
    { to: '/kids/games', label: 'Games', icon: Gamepad2, tab: true },
    { to: '/kids/play', label: 'Play', icon: Swords, tab: true },
    { to: '/kids/parents', label: 'Grown-ups', icon: Users, tab: true },
  ];
  const items = inKids ? KIDS_NAV : kids ? [...NAV.slice(0, 1), { to: '/kids', label: 'Kids', icon: Smile, tab: true }, ...NAV.slice(1)] : NAV;
  const est = me?.estimate;
  const showEst = est && est.confidence !== 'very-low';
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <NavLink to="/" className="sidebar__brand" aria-label="Grim Chess home">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a3 3 0 0 1 1.6 5.5l1.9 4.5H17v2h-1.3l1.3 6H19v2H5v-2h2l1.3-6H7v-2h1.5l1.9-4.5A3 3 0 0 1 12 2Z" /></svg>
          Grim Chess
        </NavLink>
        <nav><ul className="nav">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to}><NavLink to={to} end={to === '/' || to === '/kids'} className="nav__item"><Icon aria-hidden="true" /><span className="nav__label">{label}</span></NavLink></li>
          ))}
        </ul></nav>
        <div className="sidebar__footer muted lr-shell-foot">
          {me?.profile.username ? `Signed in as ${me.profile.username}` : <NavLink to="/account">Guest: create an account to keep progress</NavLink>}
        </div>
      </aside>
      <header className="topbar">
        <NavLink to="/" className="topbar__title lr-topbar-brand">Grim Chess</NavLink>
        <span className="topbar__spacer" />
        {showEst && <NavLink to="/progress" className="badge badge-lg badge-outline" title="Estimated strength (provisional unless stated otherwise)">GR {est.rating}</NavLink>}
        <NavLink to="/kb" className="btn btn-ghost btn-sm lr-topbar-mobile" aria-label="Knowledge base"><BookOpen aria-hidden="true" /></NavLink>
        <NavLink to="/account" className="btn btn-ghost btn-sm lr-topbar-mobile" aria-label="Account"><User aria-hidden="true" /></NavLink>
      </header>
      <main className="app-shell__main" id="main"><Outlet /></main>
      <nav className="tabbar" aria-label="Main navigation">
        {items.filter((n) => n.tab).slice(0, 5).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/' || to === '/kids'} className="tabbar__item"><Icon aria-hidden="true" /><span>{label}</span></NavLink>
        ))}
      </nav>
    </div>
  );
}

export function AppShell() {
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  );
}
