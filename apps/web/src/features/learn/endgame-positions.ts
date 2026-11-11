// Theoretical endgame positions (knowledge-base/03-chess-knowledge/endgames.md). Validated by packages/core/test/learn-content.test.ts.
export type PlayGoal = 'win' | 'draw' | 'mate' | 'promote' | 'hold';
export interface TheoryPosition { id: string; name: string; fen: string; goal: PlayGoal; maxMoves?: number; stage: number; md: string; skill?: string }
export const THEORY_POSITIONS: TheoryPosition[] = [
  { id: 'kpk-6th', name: 'King and pawn: king on the 6th', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', goal: 'promote', stage: 2, skill: 'endgame.pawn.kp-basic',
    md: 'With your king on the sixth rank in front of its pawn, the position is won whoever moves. Use the opposition to escort the pawn.' },
  { id: 'kpk-opposition-defence', name: 'Opposition: defend K+P v K', fen: '8/4k3/8/4PK2/8/8/8/8 b - - 0 1', goal: 'hold', maxMoves: 25, stage: 3, skill: 'endgame.pawn.opposition',
    md: 'You are Black. Take the opposition (stand directly opposite the white king with one square between) and stay in front of the pawn.' },
  { id: 'square-rule', name: 'Rule of the square', fen: '7k/8/8/8/p7/8/8/4K3 w - - 0 1', goal: 'draw', maxMoves: 20, stage: 2, skill: 'endgame.pawn.square-rule',
    md: 'Can your king catch the a-pawn? Draw the square from the pawn to its promotion rank: if your king can step inside it, the pawn falls.' },
  { id: 'wrong-bishop', name: 'Wrong-coloured bishop', fen: '7k/8/6KP/8/8/8/8/3B4 b - - 0 1', goal: 'hold', maxMoves: 20, stage: 3, skill: 'endgame.wrong-bishop',
    md: 'You are Black. A rook’s pawn with a bishop that does not control the promotion square cannot win if your king reaches the corner. Shuttle between h8 and g8 and avoid being driven out.' },
  { id: 'q-v-pawn', name: 'Queen against pawn on the 7th', fen: 'K7/8/8/8/8/8/1pk5/7Q w - - 0 1', goal: 'win', maxMoves: 30, stage: 3, skill: 'endgame.queen-vs-pawn',
    md: 'Against a knight’s pawn the queen wins: check and pin until the king must stand in front of its pawn, then bring your king one step closer each time.' },
  { id: 'lucena', name: 'Lucena position (build a bridge)', fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', goal: 'win', maxMoves: 40, stage: 4, skill: 'endgame.rook.lucena',
    md: 'The most important rook endgame win. Drive the enemy king further away with a check, then bring your rook to the fourth rank to shield your king from checks: "building a bridge".' },
  { id: 'philidor', name: 'Philidor position (third-rank defence)', fen: '4k3/7R/8/3KP3/8/8/8/r7 b - - 0 1', goal: 'hold', maxMoves: 30, stage: 4, skill: 'endgame.rook.philidor',
    md: 'You are Black. Keep your rook on your third rank (the 6th) until the pawn advances; then go to the back and check from behind.' },
];

