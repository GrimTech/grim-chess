// Static assessment items. Answers of board items are checked by tests/scripts with chess.js where computable.
export interface QuizItem { id: string; fen?: string; question: string; choices: string[]; answer: number; explain: string; skill?: string }
export interface JudgementItem { id: string; moves: string; candidates: string[]; expected: number; theme: string }

export const RULES_ITEMS: QuizItem[] = [
  { id: 'r-knight', question: 'Which piece can jump over other pieces?', choices: ['Knight', 'Bishop', 'Rook', 'Queen'], answer: 0, explain: 'Only the knight jumps.', skill: 'rules.pieces.knight' },
  { id: 'r-promo', question: 'A pawn reaches the last rank. What happens?', choices: ['It is promoted to a queen, rook, bishop or knight', 'It always becomes a queen', 'It stays a pawn', 'It is removed from the board'], answer: 0, explain: 'Promotion is to any piece except a king (usually a queen).', skill: 'rules.promotion' },
  { id: 'r-mate1', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', question: 'White to move. Which move is checkmate?', choices: ['Ra8#', 'Ra7', 'Kf2', 'Ra6'], answer: 0, explain: 'Ra8 is a back-rank mate: the black king is boxed in by its own pawns.', skill: 'checkmate.mate-in-1' },
  { id: 'r-stalemate', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', question: 'Black to move. What is the result?', choices: ['Draw by stalemate', 'Black is checkmated', 'Black must play Kg8', 'White wins on material'], answer: 0, explain: 'Black is not in check but has no legal move: stalemate, a draw.', skill: 'rules.stalemate' },
  { id: 'r-castle-check', question: 'May you castle while your king is in check?', choices: ['No', 'Yes', 'Only queenside', 'Only before move 10'], answer: 0, explain: 'Castling is illegal out of, through, or into check.', skill: 'rules.castling' },
  { id: 'r-ep', fen: 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3', question: 'White to move. Which capture is legal right now?', choices: ['exf6 (en passant)', 'exd6 (en passant)', 'Both', 'Neither'], answer: 0, explain: 'En passant is only possible immediately after the enemy pawn’s two-square move: Black just played ...f5.', skill: 'rules.en-passant' },
];

export const ENDGAME_ITEMS: QuizItem[] = [
  { id: 'e-kp6', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', question: 'White to move. What is the result with best play?', choices: ['White wins', 'Draw', 'Black wins'], answer: 0, explain: 'King on the sixth in front of the pawn wins whoever moves.', skill: 'endgame.pawn.kp-basic' },
  { id: 'e-opp', fen: '8/4k3/8/4PK2/8/8/8/8 b - - 0 1', question: 'Black to move. Which move draws?', choices: ['Kf7', 'Kd7', 'Ke8', 'Kd8'], answer: 0, explain: '...Kf7 takes the opposition and keeps the white king out.', skill: 'endgame.pawn.opposition' },
  { id: 'e-square', fen: '7k/8/8/8/p7/8/8/4K3 w - - 0 1', question: 'White to move. Can the white king stop the a-pawn?', choices: ['Yes: it is inside the square after Kd2', 'No: the pawn promotes'], answer: 0, explain: 'Rule of the square: after Kd2 the king is inside the square a4–d4–d1–a1.', skill: 'endgame.pawn.square-rule' },
  { id: 'e-wrongb', fen: '7k/8/6KP/8/8/8/8/3B4 w - - 0 1', question: 'White to move. What is the result?', choices: ['White wins', 'Draw'], answer: 1, explain: 'Rook’s pawn plus the wrong-coloured bishop cannot drive the king out of h8: a draw.', skill: 'endgame.wrong-bishop' },
  { id: 'e-lucena', fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', question: 'White to move. Which plan wins?', choices: ['Rd1+ to push the king away, then Rd4 to build a bridge', 'Ka7 at once', 'Rc8+ and Ka8', 'Nothing wins: it is a draw'], answer: 0, explain: 'The Lucena position: check the king away, then the rook on the fourth rank shields your king from checks.', skill: 'endgame.rook.lucena' },
  { id: 'e-philidor', fen: '4k3/7R/8/3KP3/8/8/8/r7 b - - 0 1', question: 'Black to move. What is the best defence?', choices: ['Ra6', 'Kd8', 'Rb1', 'Rc1'], answer: 0, explain: 'Philidor: the rook on the sixth rank keeps the king out; when the pawn advances, check from behind.', skill: 'endgame.rook.philidor' },
];

// Choose the move: positions reached by legal SAN sequences from the initial position. Scored by the engine
// (centipawn loss vs the best candidate); `expected` is used only when the engine is unavailable.
export const JUDGEMENT_ITEMS: JudgementItem[] = [
  { id: 'j-italian', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6', candidates: ['O-O', 'Bxf7+', 'Ng5', 'h4'], expected: 0, theme: 'development and king safety' },
  { id: 'j-sicilian', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5', candidates: ['Nb3', 'Nf5', 'Nf3', 'Bg5'], expected: 0, theme: 'piece placement' },
  { id: 'j-french', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3', candidates: ['Qb6', 'f6', 'cxd4', 'h6'], expected: 0, theme: 'pressure on the pawn chain' },
  { id: 'j-london', moves: 'd4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2', candidates: ['e6', 'Bg4', 'Qb6', 'h6'], expected: 0, theme: 'developing with a plan' },
  { id: 'j-caro', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4', candidates: ['h6', 'e6', 'Nd7', 'Qd6'], expected: 0, theme: 'prophylaxis against h4-h5' },
];
