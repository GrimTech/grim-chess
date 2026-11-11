// Training hub and the spaced-review queue.
import { Link } from 'react-router-dom';
import { Puzzle, Target, Repeat, Grid3x3, Eye, Crown, Castle, BookMarked, Brain, CalendarClock } from 'lucide-react';
import type { SrsCard } from '@grim/core';
import { api } from '../../lib/api.ts';
import { useAsync } from './util.ts';

const ITEMS = [
  { to: '/train/puzzles', icon: Puzzle, title: 'Puzzles', text: 'Adaptive tactics near your rating, rated with Glicko-2.' },
  { to: '/train/puzzles?mode=theme', icon: Target, title: 'Themed tactics', text: 'Drill one motif at a time: forks, pins, mates…' },
  { to: '/train/review', icon: CalendarClock, title: 'Spaced review', text: 'Puzzles, lines and lessons due today (FSRS).' },
  { to: '/train/woodpecker', icon: Repeat, title: 'Woodpecker', text: 'One fixed set, cycles in half the time each round.' },
  { to: '/train/drill/coordinates', icon: Grid3x3, title: 'Coordinates', text: 'Find and name squares from both sides.' },
  { to: '/train/drill/visualization', icon: Eye, title: 'Visualization', text: 'Read moves in notation and see the board in your head.' },
  { to: '/train/drill/mates', icon: Crown, title: 'Basic mates', text: 'KQ, KR, two bishops, bishop + knight vs the engine.' },
  { to: '/train/endgames', icon: Castle, title: 'Theoretical endgames', text: 'Lucena, Philidor, opposition and more: win or hold.' },
  { to: '/train/openings', icon: BookMarked, title: 'Openings', text: 'Build a repertoire and drill it with spaced repetition.' },
  { to: '/train/guess-the-move', icon: Brain, title: 'Guess the move', text: 'Predict master moves; the engine scores the difference.' },
];

export function TrainHubPage() {
  const due = useAsync(() => api.srsDue(), []);
  return (
    <div className="lr-page">
      <header className="lr-head"><div><p className="lr-eyebrow muted">Train</p><h1>Training</h1></div>
        {due.data && due.data.length > 0 && <Link className="btn btn-brass" to="/train/review">{due.data.length} reviews due</Link>}</header>
      <div className="lr-hub">
        {ITEMS.map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to} className="card card-interactive lr-hub__item">
            <Icon aria-hidden="true" className="lr-hub__icon" />
            <h2 className="card__title">{title}</h2>
            <p className="card__subtitle">{text}</p>
          </Link>
        ))}
      </div>
      <p className="muted lr-section">Why this mix? See the methodology in the <Link to="/kb">knowledge base</Link>: tactical volume, spaced retrieval, calculation without moving pieces, and endgame technique are the best-supported training activities.</p>
    </div>
  );
}

const KIND_ROUTE: Record<SrsCard['kind'], { label: string; route: (c: SrsCard[]) => string }> = {
  puzzle: { label: 'Puzzles', route: () => '/train/puzzles?mode=review' },
  opening: { label: 'Opening lines', route: () => '/train/openings?mode=review' },
  lesson: { label: 'Lessons', route: (c) => `/learn/lesson/${encodeURIComponent(c[0].id.replace(/^lesson:/, ''))}` },
  endgame: { label: 'Endgame positions', route: () => '/train/endgames' },
  pattern: { label: 'Patterns', route: () => '/train/puzzles?mode=review' },
};

export function ReviewPage() {
  const due = useAsync(() => api.srsDue(), []);
  const groups = new Map<SrsCard['kind'], SrsCard[]>();
  for (const c of due.data ?? []) groups.set(c.kind, [...(groups.get(c.kind) ?? []), c]);
  return (
    <div className="lr-page lr-narrow">
      <p className="lr-eyebrow muted">Train</p>
      <h1>Spaced review</h1>
      <p className="muted">Items are scheduled by FSRS-4.5 for 90% recall: each review comes just before you would forget. Clearing the queue first each day is the best-value training time.</p>
      {due.loading ? <div className="skeleton" style={{ height: 120 }} /> : due.error ? <p className="error">{due.error}</p> : !groups.size ? (
        <div className="empty"><p className="empty__title">Nothing due</p><p>All caught up. New reviews appear as you solve puzzles, finish lessons and drill openings.</p><Link className="btn" to="/train">Back to training</Link></div>
      ) : (
        <ul className="lr-list card">
          {[...groups].map(([kind, cards]) => (
            <li key={kind} className="lr-list__row">
              <span><strong>{KIND_ROUTE[kind].label}</strong> <span className="muted">{cards.length} due</span></span>
              {kind === 'lesson' ? (
                <span className="row">{cards.slice(0, 5).map((c) => <Link key={c.id} className="btn btn-sm" to={`/learn/lesson/${encodeURIComponent(c.id.replace(/^lesson:/, ''))}`}>{c.id.replace(/^lesson:/, '').split('.').pop()}</Link>)}</span>
              ) : <Link className="btn btn-primary btn-sm" to={KIND_ROUTE[kind].route(cards)}>Start</Link>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
