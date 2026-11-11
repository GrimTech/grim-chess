// Adventure worlds of the kids track. Lesson ids are "kids.<world>.<slug>" (content/lessons/kids/k<world>-NN-<slug>.json).
// Each world maps to a Steps Method step and skill-graph stage (knowledge-base/02-methods/steps-method.md).
export interface World {
  id: number;
  name: string;
  blurb: string;
  steps: string;     // Steps Method step(s)
  stage: string;     // skill-graph stage(s)
  color: string;     // token-based accent for the banner
  icon: 'sprout' | 'castle' | 'mountain' | 'map' | 'trees' | 'house' | 'waves' | 'flame';
}

export const WORLDS: World[] = [
  { id: 1, name: 'Board Meadow', blurb: 'Meet the board and how every piece moves.', steps: 'Step 1', stage: 'Stage 1', color: 'var(--green-9)', icon: 'sprout' },
  { id: 2, name: 'Capture Castle', blurb: 'Capturing, piece points and new queens.', steps: 'Step 1', stage: 'Stage 1', color: 'var(--amber-9)', icon: 'castle' },
  { id: 3, name: 'Check Mountain', blurb: 'Check, checkmate and special moves.', steps: 'Step 1', stage: 'Stages 1-2', color: 'var(--sky-9)', icon: 'mountain' },
  { id: 4, name: 'Mate Maze', blurb: 'Basic checkmates and mate in two.', steps: 'Step 2', stage: 'Stages 1-2', color: 'var(--tomato-9)', icon: 'map' },
  { id: 5, name: 'Trick Forest', blurb: 'Forks, pins, skewers and double attacks.', steps: 'Step 2', stage: 'Stage 2', color: 'var(--green-11)', icon: 'trees' },
  { id: 6, name: 'Opening Village', blurb: 'How to start a game well.', steps: 'Steps 2-3', stage: 'Stages 1-2', color: 'var(--indigo-9)', icon: 'house' },
  { id: 7, name: 'Pawn River', blurb: 'King and pawn endgames.', steps: 'Step 3', stage: 'Stages 2-3', color: 'var(--sky-11)', icon: 'waves' },
  { id: 8, name: 'Dragon Peak', blurb: 'Discovered attacks, deflection and mixed tactics.', steps: 'Steps 3-4', stage: 'Stages 3-4', color: 'var(--orange-9)', icon: 'flame' },
];

export const worldOf = (lessonId: string): number => Number(lessonId.split('.')[1]) || 1;
