// OWNER: play agent (routes /play/*, /analysis, /review/:id). See docs/ARCHITECTURE.md.
// Pages are lazy-loaded so the engine and play UI are not in the main bundle.
import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router-dom';
import './play.css';

function Loading() {
  return <div className="play-page" aria-busy="true"><div className="skeleton" style={{ height: 320 }} /></div>;
}

const page = (path: string, load: () => Promise<ComponentType>): RouteObject => ({
  path, HydrateFallback: Loading, lazy: async () => ({ Component: await load() }),
});

export const playRoutes: RouteObject[] = [
  page('play', async () => (await import('./PlayHub.tsx')).PlayHub),
  page('play/computer', async () => (await import('./ComputerGame.tsx')).ComputerGame),
  page('play/local', async () => (await import('./LocalGame.tsx')).LocalGame),
  page('play/online', async () => (await import('./OnlinePlay.tsx')).OnlinePlay),
  page('play/lan', async () => (await import('./LanPlay.tsx')).LanPlay),
  page('analysis', async () => (await import('./Analysis.tsx')).Analysis),
  page('review', async () => (await import('./Review.tsx')).Review),
  page('review/:id', async () => (await import('./Review.tsx')).Review),
];
