// Shared contracts for Grim Chess. Every app (web, server) and every content file conforms to these.

export type Track = 'adult' | 'kids';
export type Domain = 'rules' | 'tactics' | 'checkmate' | 'calculation' | 'strategy' | 'endgame' | 'opening' | 'practical';
export type ExerciseType =
  | 'lesson' | 'coordinate-drill' | 'move-drill' | 'puzzle' | 'mate-drill' | 'endgame-drill' | 'opening-drill'
  | 'guess-the-move' | 'calculation-drill' | 'visualization-drill' | 'play-bot' | 'game-review' | 'quiz';

export interface Stage { id: number; name: string; eloRange: [number, number] }

export interface Skill {
  id: string;            // "<domain>.<topic>[.<subtopic>]"
  name: string;
  domain: Domain;
  stage: number;         // 1..8
  prereqs: string[];
  lichessThemes: string[];
  summary: string;
  masteryCriteria: string;
  exerciseTypes: ExerciseType[];
  kbRef?: string;        // path inside knowledge-base/03-chess-knowledge, e.g. "tactics.md#forks"
  references?: string[];
}

export interface SkillGraph { version: string; domains: Domain[]; stages: Stage[]; skills: Skill[]; lichessThemeKeys?: string[] }

// ---------- Lessons (content/lessons/<track>/<id>.json) ----------
// Squares are algebraic ("e4"). Moves in `solution` are SAN, validated by scripts/validate-content.ts.
export type Arrow = [from: string, to: string, color?: 'green' | 'red' | 'blue' | 'yellow'];

export interface TextStep { type: 'text'; md: string }
export interface BoardStep { type: 'board'; fen: string; md: string; arrows?: Arrow[]; highlights?: string[]; orientation?: 'white' | 'black' }
/** Learner plays the moves at even indexes of `solution`; odd indexes are the opponent's automatic replies. */
export interface MoveStep {
  type: 'move'; fen: string; prompt: string; solution: string[];
  /** Additional fully-correct alternatives for the learner's FIRST move (SAN). */
  alternatives?: string[];
  hint?: string; explain: string; arrows?: Arrow[];
}
export interface QuizStep { type: 'quiz'; question: string; choices: string[]; answer: number; explain: string; fen?: string }
/** Play the position out against the engine until the goal is reached. */
export interface PlayStep {
  type: 'play'; fen: string; goal: 'win' | 'draw' | 'mate' | 'promote' | 'hold';
  prompt: string; maxMoves?: number; engineLevel?: number; explain?: string;
}
export type LessonStep = TextStep | BoardStep | MoveStep | QuizStep | PlayStep;

export interface Lesson {
  id: string;            // unique, e.g. "adult.s1.rook-moves"
  track: Track;
  stage: number;
  order: number;         // order within stage
  skillIds: string[];    // must exist in skill-graph.json
  title: string;
  summary: string;
  estMinutes: number;
  /** Minimum age (kids track) */
  minAge?: number;
  steps: LessonStep[];
  /** Lichess puzzle themes used for follow-up practice after the lesson */
  practiceThemes?: string[];
  sources?: string[];
}

export interface LessonIndexEntry { id: string; track: Track; stage: number; order: number; title: string; summary: string; skillIds: string[]; estMinutes: number; minAge?: number }

// ---------- Puzzles ----------
export interface Puzzle {
  id: string; fen: string;
  /** UCI moves. moves[0] is the opponent's move that creates the puzzle; learner plays moves[1], moves[3], ... */
  moves: string[];
  rating: number; rd: number; popularity: number; plays: number;
  themes: string[]; openings: string[]; gameUrl: string;
}

// ---------- Profile & progress ----------
export interface Profile {
  userId: string;
  username: string | null;        // null = guest device account
  displayName: string;
  age: number | null;
  track: Track;
  minutesPerDay: number;          // training budget
  daysPerWeek: number;
  goal: 'casual' | 'club' | 'expert' | 'master' | 'grandmaster';
  startingLevel: 'zero' | 'knows-rules' | 'casual' | 'club' | 'strong';
  onboarded: boolean;
  createdAt: string;
  boardTheme?: string;
  pieceSet?: string;
}

export interface RatingState { rating: number; rd: number; vol: number; games: number; updatedAt?: string }

export type RatingPool = 'bot' | 'puzzle' | 'online' | 'assessment';

export interface SkillState {
  skillId: string;
  /** 0..1 mastery estimate */
  mastery: number;
  attempts: number;
  successes: number;
  lastPracticed?: string;
  mastered: boolean;
}

/** FSRS card state, used for puzzles, opening lines, endgame positions and lesson review. */
export interface SrsCard {
  id: string;                 // e.g. "puzzle:00sHx", "lesson:adult.s1.rook-moves", "opening:white:italian:12"
  kind: 'puzzle' | 'lesson' | 'opening' | 'endgame' | 'pattern';
  stability: number; difficulty: number;
  due: string; lastReview?: string; reps: number; lapses: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
}

export type TrainingEvent =
  | { type: 'lesson'; lessonId: string; skillIds: string[]; score: number; durationSec: number; at: string }
  | { type: 'puzzle'; puzzleId: string; puzzleRating: number; themes: string[]; solved: boolean; firstTry: boolean; durationSec: number; at: string }
  | { type: 'drill'; drill: ExerciseType; skillIds: string[]; score: number; durationSec: number; at: string; detail?: Record<string, unknown> }
  | { type: 'game'; mode: 'bot' | 'local' | 'online' | 'lan'; opponentRating?: number; opponentRd?: number; botLevel?: number;
      result: 1 | 0.5 | 0; color: 'white' | 'black'; pgn: string; accuracy?: number; acpl?: number; blunders?: number;
      timeControl?: string; rated: boolean; at: string }
  | { type: 'assessment'; assessmentId: string; section: string; score: number; maxScore: number; estimatedRating?: number; at: string; detail?: Record<string, unknown> };

export interface RatingEstimate {
  rating: number;              // estimated FIDE-equivalent classical rating
  low: number; high: number;   // 95% interval (see knowledge-base/04-assessment/platform-measurement-model.md)
  confidence: 'very-low' | 'low' | 'medium' | 'high';
  components: { source: string; rating: number; weight: number; note?: string }[];
  titleEquivalent: string | null; // e.g. "CM", "FM", "IM", "GM": an equivalent only, never a real title
}

export interface DailyPlanBlock {
  id: string; kind: ExerciseType | 'review'; title: string; minutes: number;
  route: string;              // web route that runs the block
  skillIds: string[]; reason: string; done?: boolean;
}
export interface DailyPlan { date: string; totalMinutes: number; blocks: DailyPlanBlock[]; focus: string }
