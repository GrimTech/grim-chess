import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router-dom';
// OWNER: see docs/ARCHITECTURE.md (feature "kids"). Routes /kids/* (pages are code-split).
import { KidsLayout } from './KidsLayout.tsx';
import { Mascot } from './Mascot.tsx';

const Loading = () => <div className="kid-loading"><Mascot mood="think" /> Loading…</div>;
const page = (path: string | undefined, load: () => Promise<ComponentType>): RouteObject =>
  path === undefined
    ? { index: true, HydrateFallback: Loading, lazy: async () => ({ Component: await load() }) }
    : { path, HydrateFallback: Loading, lazy: async () => ({ Component: await load() }) };

export const kidsRoutes: RouteObject[] = [
  {
    path: 'kids',
    element: <KidsLayout />,
    children: [
      page(undefined, async () => (await import('./Home.tsx')).KidsHome),
      page('lesson/:id', async () => (await import('./LessonPlayer.tsx')).KidsLessonPlayer),
      page('games', async () => (await import('./games/GamesHub.tsx')).GamesHub),
      page('games/pawn-wars', async () => (await import('./games/PawnWars.tsx')).PawnWars),
      page('games/capture-quest', async () => (await import('./games/CaptureQuest.tsx')).CaptureQuest),
      page('games/square-hunt', async () => (await import('./games/SquareHunt.tsx')).SquareHunt),
      page('games/knights-journey', async () => (await import('./games/KnightJourney.tsx')).KnightJourney),
      page('games/mate-treasure', async () => (await import('./games/MateTreasure.tsx')).MateTreasure),
      page('games/protect-the-king', async () => (await import('./games/ProtectKing.tsx')).ProtectKing),
      page('play', async () => (await import('./PlayBots.tsx')).KidsPlay),
      page('parents', async () => (await import('./Parents.tsx')).KidsParents),
    ],
  },
];
