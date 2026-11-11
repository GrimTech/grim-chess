// Route registry. Each feature owns its own routes array; do not add feature routes here directly.
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/AppShell.tsx';
import { learnRoutes } from './features/learn/index.tsx';
import { playRoutes } from './features/play/index.tsx';
import { kidsRoutes } from './features/kids/index.tsx';
import { kbRoutes } from './features/kb/index.tsx';

export const router = createBrowserRouter([
  { path: '/', element: <AppShell />, children: [...learnRoutes, ...playRoutes, ...kbRoutes, ...kidsRoutes] },
]);
