// Account: register / log in (keeps progress across devices), profile settings, sign out.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Profile } from '@grim/core';
import { api } from '../../lib/api.ts';
import { useSession } from '../../lib/session.tsx';

export const BOARD_THEMES = ['walnut', 'glacier', 'tournament', 'graphite', 'meadow'] as const;

export function AccountPage() {
  const { me, setMe, refresh } = useSession();
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const p = me?.profile;
  const [settings, setSettings] = useState<Partial<Profile>>({});
  const val = <K extends keyof Profile>(k: K): Profile[K] | undefined => (settings[k] as Profile[K] | undefined) ?? p?.[k];

  const auth = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const m = mode === 'register' ? await api.register(username.trim(), password) : await api.login(username.trim(), password);
      setMe(m); setPassword('');
      setMsg({ ok: true, text: mode === 'register' ? 'Account created. Your progress on this device is now saved to it.' : 'Signed in.' });
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }); } finally { setBusy(false); }
  };
  const saveSettings = async () => {
    setBusy(true); setMsg(null);
    try { setMe(await api.updateProfile(settings)); setSettings({}); setMsg({ ok: true, text: 'Settings saved.' }); }
    catch (err) { setMsg({ ok: false, text: (err as Error).message }); } finally { setBusy(false); }
  };
  const signOut = async () => {
    setBusy(true);
    try { await api.logout(); await refresh(); setMsg({ ok: true, text: 'Signed out. You are now using a fresh guest profile on this device.' }); }
    catch (err) { setMsg({ ok: false, text: (err as Error).message }); } finally { setBusy(false); }
  };

  return (
    <div className="lr-page lr-narrow stack">
      <p className="lr-eyebrow muted">Account</p>
      <h1>{p?.username ? p.displayName || p.username : 'Guest profile'}</h1>
      {msg && <p className={msg.ok ? 'lr-note' : 'error'} role="status">{msg.text}</p>}

      {!p?.username ? (
        <section className="card stack">
          <div className="segmented" role="group" aria-label="Account action">
            <button aria-pressed={mode === 'register'} onClick={() => setMode('register')}>Create account</button>
            <button aria-pressed={mode === 'login'} onClick={() => setMode('login')}>Sign in</button>
          </div>
          <p className="muted">{mode === 'register' ? 'Your training is currently stored as a guest on this device. Create an account to keep it and use it on other devices.' : 'Sign in to continue an existing account on this device.'}</p>
          <form className="stack" onSubmit={auth}>
            <div className="field"><label className="label" htmlFor="ac-user">Username</label>
              <input id="ac-user" className="input" autoComplete="username" required minLength={3} maxLength={32} value={username} onChange={(e) => setUsername(e.target.value)} /></div>
            <div className="field"><label className="label" htmlFor="ac-pass">Password</label>
              <input id="ac-pass" className="input" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              {mode === 'register' && <p className="hint">At least 8 characters.</p>}</div>
            <button className="btn btn-primary" type="submit" disabled={busy} aria-busy={busy}>{mode === 'register' ? 'Create account' : 'Sign in'}</button>
          </form>
        </section>
      ) : (
        <section className="card row"><span>Signed in as <strong>{p.username}</strong>.</span><button className="btn btn-danger-soft" onClick={() => void signOut()} disabled={busy}>Sign out</button></section>
      )}

      {p && (
        <section className="card stack">
          <h2 className="card__title">Training settings</h2>
          <div className="field"><label className="label" htmlFor="ac-name">Display name</label>
            <input id="ac-name" className="input" maxLength={40} value={val('displayName') ?? ''} onChange={(e) => setSettings({ ...settings, displayName: e.target.value })} /></div>
          <div className="lr-two">
            <div className="field"><label className="label" htmlFor="ac-min">Minutes per day: <strong>{val('minutesPerDay')}</strong></label>
              <input id="ac-min" type="range" min={10} max={240} step={5} value={val('minutesPerDay') ?? 30} onChange={(e) => setSettings({ ...settings, minutesPerDay: Number(e.target.value) })} /></div>
            <div className="field"><label className="label" htmlFor="ac-days">Days per week: <strong>{val('daysPerWeek')}</strong></label>
              <input id="ac-days" type="range" min={1} max={7} value={val('daysPerWeek') ?? 5} onChange={(e) => setSettings({ ...settings, daysPerWeek: Number(e.target.value) })} /></div>
          </div>
          <div className="field"><span className="label" id="ac-board">Board theme</span>
            <div className="lr-swatches" role="radiogroup" aria-labelledby="ac-board">
              {BOARD_THEMES.map((t) => (
                <button key={t} role="radio" aria-checked={(val('boardTheme') ?? 'walnut') === t} className="lr-swatch" data-board={t} onClick={() => setSettings({ ...settings, boardTheme: t })}>
                  <span className="board-static lr-swatch__board" aria-hidden="true" /> {t}
                </button>
              ))}
            </div></div>
          <div className="row"><button className="btn btn-primary" onClick={() => void saveSettings()} disabled={busy || !Object.keys(settings).length}>Save settings</button>
            <Link className="btn btn-ghost" to="/onboarding">Redo onboarding</Link></div>
          <p className="hint">Changing your daily minutes changes tomorrow&apos;s plan.</p>
        </section>
      )}
    </div>
  );
}
