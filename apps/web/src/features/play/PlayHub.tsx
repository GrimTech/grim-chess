// /play hub: choose how to play.
import { Link } from 'react-router-dom';
import { Bot, Globe, Microscope, Network, Search, Users } from 'lucide-react';
import { useSession } from '../../lib/session.tsx';
import { BOT_LEVELS } from '../../lib/engine.ts';

const MODES = [
  { to: '/play/computer', icon: Bot, title: 'Play the computer', text: `${BOT_LEVELS.length} levels from about ${BOT_LEVELS[0].rating} to ${BOT_LEVELS[BOT_LEVELS.length - 1].rating}+. Rated games update your bot rating.` },
  { to: '/play/local', icon: Users, title: 'Pass and play', text: 'Two players on one device, with optional clocks and automatic board flipping.' },
  { to: '/play/online', icon: Globe, title: 'Play online', text: 'Quick pairing by time control, or a private room with a code to send to a friend.' },
  { to: '/play/lan', icon: Network, title: 'Local network (LAN)', text: 'Host on one computer and play from phones and laptops on the same Wi-Fi, no internet needed.' },
  { to: '/analysis', icon: Microscope, title: 'Analysis board', text: 'Set up any position or paste a PGN. Stockfish shows the top three lines.' },
  { to: '/review', icon: Search, title: 'Review a game', text: 'Find your mistakes move by move, then retry them until you find the better move.' },
];

export function PlayHub() {
  const { me } = useSession();
  const bot = me?.ratings.bot, online = me?.ratings.online;
  return (
    <div className="play-page">
      <header className="play-header">
        <h1>Play</h1>
        <p className="muted">Playing complete games and reviewing them is where training becomes skill. Slower time controls teach more.</p>
        {(bot || online) && (
          <div className="row">
            {bot && <span className="badge badge-outline">Bot rating {Math.round(bot.rating)}{bot.rd > 110 ? '?' : ''}</span>}
            {online && <span className="badge badge-outline">Online rating {Math.round(online.rating)}{online.rd > 110 ? '?' : ''}</span>}
          </div>
        )}
      </header>
      <div className="play-hubgrid">
        {MODES.map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to} className="card card-interactive play-hubcard">
            <span className="play-hubcard__icon" aria-hidden="true"><Icon size={28} strokeWidth={1.75} /></span>
            <h2 className="card__title">{title}</h2>
            <p className="card__subtitle">{text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
