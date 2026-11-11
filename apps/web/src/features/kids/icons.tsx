import { Castle, Crown, Flame, Footprints, Gem, House, Map as MapIcon, MountainSnow, Puzzle, Shield, Sprout, Star, Swords, Target, TreePine, Waves } from 'lucide-react';
import type { Sticker } from './stickers.ts';

const ICONS = {
  sprout: Sprout, castle: Castle, mountain: MountainSnow, map: MapIcon, trees: TreePine, house: House, waves: Waves, flame: Flame,
  star: Star, crown: Crown, puzzle: Puzzle, swords: Swords, footprints: Footprints, shield: Shield, gem: Gem, target: Target,
};
export function KidIcon({ name, size = 28 }: { name: Sticker['icon']; size?: number }) {
  const I = ICONS[name] ?? Star;
  return <I aria-hidden width={size} height={size} strokeWidth={2.25} />;
}
