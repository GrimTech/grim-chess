// OWNER: learn agent (see docs/ARCHITECTURE.md). Routes: /, /onboarding, /learn/*, /train/*, /progress,
// /assessment/*, /account. Pages are lazy-loaded so each screen is its own chunk.
import type { RouteObject } from 'react-router-dom';
import './learn.css';

function Loading() {
  return <div className="lr-page" aria-busy="true"><div className="skeleton" style={{ height: 320 }} /></div>;
}

export const learnRoutes: RouteObject[] = [
  { index: true, HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./Dashboard.tsx')).HomePage }) },
  { path: 'onboarding', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./Onboarding.tsx')).OnboardingPage }) },
  { path: 'assessment/placement', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./Assessment.tsx')).AssessmentPage }) },
  { path: 'assessment/:id', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./Assessment.tsx')).AssessmentPage }) },
  { path: 'learn', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./Curriculum.tsx')).CurriculumPage }) },
  { path: 'learn/lesson/:id', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./LessonPlayer.tsx')).LessonPlayerPage }) },
  { path: 'train', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./Train.tsx')).TrainHubPage }) },
  { path: 'train/review', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./Train.tsx')).ReviewPage }) },
  { path: 'train/puzzles', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./PuzzleTrainer.tsx')).PuzzleTrainerPage }) },
  { path: 'train/woodpecker', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./Woodpecker.tsx')).WoodpeckerPage }) },
  { path: 'train/drill/coordinates', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./Drills.tsx')).CoordinatesDrillPage }) },
  { path: 'train/drill/visualization', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./Drills.tsx')).VisualizationDrillPage }) },
  { path: 'train/drill/mates', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./Endgames.tsx')).MatesDrillPage }) },
  { path: 'train/endgames', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./Endgames.tsx')).EndgamesPage }) },
  { path: 'train/openings', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./Openings.tsx')).OpeningsPage }) },
  { path: 'train/guess-the-move', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./GuessTheMove.tsx')).GuessTheMovePage }) },
  { path: 'progress', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./Progress.tsx')).ProgressPage }) },
  { path: 'account', HydrateFallback: Loading, lazy: async () => ({ Component: (await import('./Account.tsx')).AccountPage }) },
];
