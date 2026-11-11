import { Link } from 'react-router-dom';
import { Crosshair, Footprints, Gem, Shield, Swords, Target } from 'lucide-react';
import { useKids } from '../store.ts';
import { Buddy } from '../Mascot.tsx';

const GAMES = [
  { to: 'pawn-wars', key: 'pawn-wars', name: 'Pawn Wars', blurb: 'Pawns only. First to the other side wins!', icon: Swords, color: 'var(--sky-9)', age: '5+' },
  { to: 'capture-quest', key: 'capture-', name: 'Capture Quest', blurb: 'Gobble every pawn with one piece in the fewest moves.', icon: Target, color: 'var(--orange-9)', age: '4+' },
  { to: 'square-hunt', key: 'square-hunt', name: 'Square Hunt', blurb: 'Find the square Rookie names.', icon: Crosshair, color: 'var(--indigo-9)', age: '6+' },
  { to: 'knights-journey', key: 'knight-', name: 'Knight\'s Journey', blurb: 'Hop the knight to the star.', icon: Footprints, color: 'var(--green-9)', age: '6+' },
  { to: 'mate-treasure', key: 'mate-treasure', name: 'Mate-in-1 Treasure', blurb: 'Find checkmate and open the chest.', icon: Gem, color: 'var(--amber-10)', age: '7+' },
  { to: 'protect-the-king', key: 'protect-king', name: 'Protect the King', blurb: 'Spot the danger and keep your king safe.', icon: Shield, color: 'var(--tomato-9)', age: '7+' },
];

export function GamesHub() {
  const kids = useKids();
  const plays = (prefix: string) => Object.entries(kids.games).filter(([k]) => k.startsWith(prefix)).reduce((a, [, g]) => a + g.plays, 0);
  return (
    <div className="kid-page">
      <Buddy mood="cheer">Pick a game! Short games, as many times as you like.</Buddy>
      <ul className="kid-games">
        {GAMES.map((g) => {
          const I = g.icon;
          const n = plays(g.key);
          return (
            <li key={g.to}>
              <Link to={`/kids/games/${g.to}`} className="kid-game-card" style={{ ['--game' as string]: g.color }}>
                <span className="kid-game-card__icon"><I aria-hidden /></span>
                <span className="kid-game-card__text"><strong>{g.name}</strong><span>{g.blurb}</span></span>
                <span className="kid-game-card__meta">{g.age}{n ? ` · played ${n}` : ''}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
