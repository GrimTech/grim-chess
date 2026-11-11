// Human-readable names for Lichess puzzle themes.
const NAMES: Record<string, string> = {
  mateIn1: 'Mate in 1', mateIn2: 'Mate in 2', mateIn3: 'Mate in 3', mateIn4: 'Mate in 4', mateIn5: 'Mate in 5+',
  oneMove: 'One move', short: 'Short', long: 'Long', veryLong: 'Very long', xRayAttack: 'X-ray attack',
  attackingF2F7: 'Attacking f2/f7', backRankMate: 'Back-rank mate', hangingPiece: 'Hanging piece', enPassant: 'En passant',
  kingsideAttack: 'Kingside attack', queensideAttack: 'Queenside attack', doubleCheck: 'Double check', discoveredAttack: 'Discovered attack',
  advancedPawn: 'Advanced pawn', capturingDefender: 'Capture the defender', trappedPiece: 'Trapped piece', quietMove: 'Quiet move',
  defensiveMove: 'Defensive move', smotheredMate: 'Smothered mate', arabianMate: 'Arabian mate', anastasiaMate: 'Anastasia mate',
  bodenMate: 'Boden mate', dovetailMate: 'Dovetail mate', hookMate: 'Hook mate', doubleBishopMate: 'Double bishop mate',
  rookEndgame: 'Rook endgame', pawnEndgame: 'Pawn endgame', queenEndgame: 'Queen endgame', bishopEndgame: 'Bishop endgame',
  knightEndgame: 'Knight endgame', queenRookEndgame: 'Queen & rook endgame', underPromotion: 'Underpromotion',
};
export const themeLabel = (t: string) => NAMES[t] ?? t.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
