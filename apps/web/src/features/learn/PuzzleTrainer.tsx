// Puzzle trainer: adaptive / theme / review modes, rating change, themes, source-game link, streaks.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ExternalLink, Flame, SkipForward } from 'lucide-react';
import type { Puzzle } from '@grim/core';
import { api } from '../../lib/api.ts';
import { useSession } from '../../lib/session.tsx';
import { PuzzleBoard, type PuzzleResult } from './PuzzleBoard.tsx';
import { nowIso, postEvents, useAsync } from './util.ts';
import { themeLabel } from './themes.ts';

type Mode = 'adaptive' | 'theme' | 'review';

export function PuzzleTrainerPage() {
  const [params, setParams] = useSearchParams();
  const themes = (params.get('themes') ?? '').split(',').filter(Boolean);
  const mode = ((params.get('mode') as Mode) || (themes.length ? 'theme' : 'adaptive')) as Mode;
  const min = Number(params.get('min')) || undefined, max = Number(params.get('max')) || undefined;
  const { me, setMe } = useSession();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<PuzzleResult | null>(null);
  const [delta, setDelta] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [session, setSession] = useState({ solved: 0, total: 0 });
  const [n, setN] = useState(0);
  const allThemes = useAsync(() => api.puzzleThemes(), []);

  useEffect(() => {
    let alive = true;
    setPuzzle(null); setResult(null); setDelta(null); setErr(null);
    api.nextPuzzle({ themes, mode, min, max })
      .then((p) => alive && setPuzzle(p))
      .catch((e: Error) => alive && setErr(mode === 'review' && /404|no /i.test(e.message) ? 'No puzzle reviews are due right now.' : e.message));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString(), n]);

  const onResult = async (r: PuzzleResult) => {
    if (!puzzle) return;
    setResult(r);
    setStreak((s) => (r.solved && r.firstTry ? s + 1 : 0));
    setSession((s) => ({ solved: s.solved + (r.solved && r.firstTry ? 1 : 0), total: s.total + 1 }));
    const before = me?.ratings.puzzle?.rating;
    const snap = await postEvents([{ type: 'puzzle', puzzleId: puzzle.id, puzzleRating: puzzle.rating, themes: puzzle.themes, solved: r.solved, firstTry: r.firstTry, durationSec: r.durationSec, at: nowIso() }], setMe, me);
    const after = snap?.ratings.puzzle?.rating;
    if (after != null) setDelta(before != null ? Math.round(after - before) : null);
  };

  const setMode = (m: Mode) => { const p = new URLSearchParams(params); p.set('mode', m); if (m === 'adaptive') p.delete('themes'); setParams(p); };
  const toggleTheme = (t: string) => {
    const set = new Set(themes); if (set.has(t)) set.delete(t); else set.add(t);
    const p = new URLSearchParams(params); if (set.size) { p.set('themes', [...set].join(',')); p.set('mode', 'theme'); } else { p.delete('themes'); p.set('mode', 'adaptive'); }
    setParams(p);
  };
  const rating = me?.ratings.puzzle;

  return (
    <div className="lr-page">
      <header className="lr-head">
        <div>
          <p className="lr-eyebrow muted">Train</p>
          <h1>Puzzles</h1>
        </div>
        <div className="segmented" role="group" aria-label="Mode">
          {(['adaptive', 'theme', 'review'] as Mode[]).map((m) => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{m[0].toUpperCase() + m.slice(1)}</button>)}
        </div>
      </header>
      {mode === 'theme' && (
        <details className="card card-sunken lr-themes" open={!themes.length}>
          <summary>Themes: {themes.length ? themes.map(themeLabel).join(', ') : 'choose…'}</summary>
          <div className="row">
            {(allThemes.data ?? []).slice(0, 60).map((t) => (
              <button key={t.theme} className={`badge badge-lg ${themes.includes(t.theme) ? 'badge-accent' : 'badge-outline'}`} aria-pressed={themes.includes(t.theme)} onClick={() => toggleTheme(t.theme)}>
                {themeLabel(t.theme)} <span className="muted">{t.count}</span>
              </button>
            ))}
            {allThemes.error && <span className="muted">Theme list unavailable.</span>}
          </div>
        </details>
      )}
      <div className="lr-train">
        <div className="lr-train__board">
          {err ? <div className="empty"><p className="empty__title">{err}</p><button className="btn" onClick={() => setN((x) => x + 1)}>Retry</button></div>
            : puzzle ? <PuzzleBoard puzzle={puzzle} onResult={onResult} />
              : <div className="skeleton lr-board-skel" />}
        </div>
        <aside className="lr-train__side stack">
          <div className="tile-grid">
            <div className="tile"><p className="tile__label">Puzzle rating</p><p className="tile__value">{rating ? Math.round(rating.rating) : '—'}</p>
              <p className={`tile__delta ${delta != null ? (delta >= 0 ? 'is-up' : 'is-down') : ''}`}>{delta != null ? `${delta >= 0 ? '+' : ''}${delta}` : rating ? `±${Math.round(rating.rd)}` : 'unrated'}</p></div>
            <div className="tile"><p className="tile__label">Streak</p><p className="tile__value"><Flame aria-hidden="true" className="lr-flame" />{streak}</p>
              <p className="tile__delta">{session.solved}/{session.total} this session</p></div>
          </div>
          {puzzle && (
            <div className="card">
              <p className="card__subtitle">Puzzle {puzzle.id} · rated {puzzle.rating}</p>
              {result ? (
                <>
                  <p className={result.solved && result.firstTry ? 'lr-ok' : 'lr-bad'}>{result.solved ? (result.firstTry ? 'Solved first try' : 'Solved after a mistake (counts as a miss for rating)') : 'Missed'} · {result.durationSec}s</p>
                  <div className="row">{puzzle.themes.map((t) => <Link key={t} className="badge badge-outline" to={`/train/puzzles?themes=${t}`}>{themeLabel(t)}</Link>)}</div>
                  {puzzle.gameUrl && <a className="btn btn-ghost btn-sm" href={puzzle.gameUrl} target="_blank" rel="noreferrer">Source game <ExternalLink aria-hidden="true" /></a>}
                  <button className="btn btn-primary" onClick={() => setN((x) => x + 1)} autoFocus>Next puzzle <SkipForward aria-hidden="true" /></button>
                </>
              ) : <p className="muted">Themes are hidden until you finish, so you have to recognise the pattern yourself.</p>}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
