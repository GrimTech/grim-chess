---
title: Rules of Chess (FIDE Laws, 2023 edition) and Notation
summary: Complete learner-facing restatement of the FIDE Laws of Chess (applied from 1 January 2023) - board, piece movement, special moves, game endings, draws, touch-move, clocks, irregularities, rapid/blitz appendices - plus SAN, PGN, FEN and UCI notation as used by the Grim Chess platform.
last_reviewed: 2026-11-11
sources:
  - FIDE Handbook E01 Laws of Chess (applied from 01/01/2023)
  - FIDE news, 2023 FIDE Laws of Chess published
  - FIDE Arbiters' Manual 2024
  - PGN Standard (Steven J. Edwards, 1994)
  - Chess Programming Wiki, FEN
  - Lichess puzzle database documentation
---

# Rules of Chess (FIDE Laws) and Notation

The authoritative text is the **FIDE Laws of Chess, Handbook chapter E01, approved by the 93rd FIDE General Assembly (Chennai, 7 Aug 2022) and applied from 1 January 2023** [1][2]. The English text is authentic. The Laws have two parts: **Basic Rules of Play (Art. 1-5)** and **Competitive Rules of Play (Art. 6-12)**, plus **Appendices A (Rapid), B (Blitz), C (Algebraic notation), D (Blind and visually disabled players)** and **Guidelines I (Adjourned games), II (Chess960), III (Games without increment incl. quickplay finishes)** [1]. Article numbers below refer to that edition. Where this file paraphrases, the Handbook wins.

> Audit note: FIDE revises the Laws roughly every 4-5 years. The next revision should be checked against this file at every annual review.

## Article map

| Art. | Title | Learner stage |
|---|---|---|
| 1 | Nature and objectives of the game | 1 |
| 2 | Initial position of the pieces | 1 |
| 3 | Moves of the pieces (incl. castling, en passant, promotion) | 1-2 |
| 4 | Act of moving the pieces (touch-move) | 2-3 (OTB) |
| 5 | Completion of the game (checkmate, resignation, stalemate, dead position, agreement) | 1-2 |
| 6 | The chessclock | 3 |
| 7 | Irregularities (illegal moves, wrong set-up) | 3 |
| 8 | Recording of the moves | 3 |
| 9 | Drawn game (agreement, repetition, 50/75-move, fivefold) | 2-3 |
| 10 | Points | 3 |
| 11 | Conduct of the players (devices, distraction) | 3 |
| 12 | Role of the arbiter | 4 |
| App. A / B | Rapid / Blitz | 3 |
| App. C | Algebraic notation | 1-2 |
| Guideline II | Chess960 | 5+ (optional) |
| Guideline III | Games without increment, quickplay finishes | 4 |

## Objective of the game

- Two players, White and Black, move alternately; White moves first (Art. 1.1-1.2).
- The objective is to place the opponent's king "under attack" so that the opponent has no legal move - **checkmate** (Art. 1.4.1). A player whose king is checkmated loses.
- Leaving one's own king attacked, exposing it to attack, or "capturing" the king is not allowed (Art. 1.4.1, 3.9).
- If the position is such that neither player can possibly checkmate, the game is drawn (Art. 1.5, dead position).

## Board and initial position

- The board is an 8x8 grid of 64 squares, alternately light ("white") and dark ("black") (Art. 2.1).
- The board is placed so that the **near right-hand corner square is light** ("light on the right") (Art. 2.1).
- Each side starts with 16 pieces: king, queen, 2 rooks, 2 bishops, 2 knights, 8 pawns (Art. 2.2).
- Initial position: White pieces on rank 1, pawns on rank 2; Black mirrored on ranks 8 and 7. **Queen on her own colour** (white queen d1 on a light square, black queen d8 on a dark square); kings on the e-file (Art. 2.3).
- FEN of the initial position: `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`.

## Coordinates

- **Files** a-h run from White's left to right; **ranks** 1-8 run from White's side to Black's side (Art. 2.4, App. C.2).
- A square is named file letter + rank number (e4, h8). Light squares include h1, a8, e4, d5; dark squares include a1, h8, d4, e5.
- Useful invariants for drills: a square is dark iff (file index + rank) is even, with a=1 (a1: 1+1=2 even -> dark).
- **Diagonals** are named by end squares (a1-h8 "long diagonal", h1-a8). **Wings**: queenside (a-d files), kingside (e-h). **Centre**: d4, e4, d5, e5; extended centre c3-f3-f6-c6.

## Piece movement

General (Art. 3.1-3.9): a piece may not move to a square occupied by a piece of the same colour; moving to a square occupied by an opponent piece captures it. Bishops, rooks and queens cannot jump over pieces. A piece "attacks" a square if it could capture on it (even if the move would be illegal because of a pin, Art. 3.1.2).

| Piece | Movement (Art.) | Value (conventional) |
|---|---|---|
| Bishop | Any distance along a diagonal (3.2) | 3 (3.25 in modern engine-based scales) |
| Rook | Any distance along a rank or file (3.3) | 5 |
| Queen | Any distance along rank, file or diagonal (3.4) | 9 |
| Knight | To one of the nearest squares not on its rank, file or diagonal ("L-shape", 2+1); jumps (3.6) | 3 |
| Pawn | One square forward to an empty square; two squares from its starting rank if both squares empty; captures one square diagonally forward (3.7) | 1 |
| King | One square in any direction to a square not attacked; or castling (3.8) | Infinite (fighting value ~3-4 in endgames) |

### Pawn moves

- Single step forward (Art. 3.7.1), double step from the starting square (3.7.2), diagonal capture (3.7.3). Pawns never move backward or capture straight ahead.

### En passant

- A pawn occupying a square on the same rank as, and on an adjacent file to, an opponent's pawn which **has just advanced two squares in one move** from its original square may capture that pawn **as though it had moved only one square** (Art. 3.7.3.1).
- This capture is only legal **on the move immediately following** that advance (Art. 3.7.3.2).
- Only the capturing pawn's rank matters: White captures e.p. from rank 5, Black from rank 4.
- FEN records the e.p. target square (the square passed over) after any double step (PGN/FEN standard); some software records it only when a capture is actually possible. Threefold repetition treats positions as different if e.p. possibilities differ (Art. 9.2.3).

### Promotion

- A pawn reaching the furthest rank must be exchanged, **as part of the same move**, for a new queen, rook, bishop or knight of the same colour, on that square (Art. 3.7.3.3).
- The choice is **not restricted to pieces previously captured** (Art. 3.7.3.4) - a player may have 2+ queens.
- The new piece's effect is immediate (e.g., it gives check at once).
- Over the board: the move is complete when the new piece has been released on the promotion square; the choice is finalised when the piece has touched the promotion square (Art. 4.4.4, 4.6.4). If the pawn is moved to the last rank and the clock pressed without replacing it, this is an illegal move and the pawn is replaced by a queen (Art. 7.5.2).
- **Underpromotion** (to R, B or N) is used to avoid stalemate or to fork with a knight.

### King moves and check

- The king moves one square in any direction to a square not attacked by an opponent piece (Art. 3.8.1).
- The king is **in check** when attacked by one or more opponent pieces (Art. 3.9.1). A check must be met by (a) moving the king, (b) capturing the checking piece, or (c) interposing a piece - (b) and (c) are impossible against a double check, and interposition is impossible against a knight or pawn check.
- No move may leave or place one's own king in check (Art. 3.9.2). A move is illegal if it fails to meet the requirements of Art. 3.1-3.9 (Art. 3.10.1).

### Castling

Castling is a move of the king and either rook of the same colour along the player's first rank, counting as a single **king move** (Art. 3.8.2):

- Kingside (O-O): king e1->g1, rook h1->f1. Queenside (O-O-O): king e1->c1, rook a1->d1 (Black mirrored on rank 8).
- **Over the board the player must move the king first** (touching the rook first means the rook must be moved, and castling is then not allowed) (Art. 4.4.2).

**Permanent loss of the right** to castle (Art. 3.8.2.1):
1. if the king has already moved, or
2. with a rook that has already moved.

**Temporary prevention** (Art. 3.8.2.2):
1. the king's original square, the square it must cross, or the square it is to occupy is **attacked** by one or more opponent pieces (i.e., you cannot castle out of, through, or into check), or
2. there is **any piece between the king and the rook** (for O-O-O this includes b1/b8 - the rook may pass over an attacked square, the king may not).

Common learner misconceptions to test: the rook being attacked does not prevent castling; b1 being attacked does not prevent O-O-O; having been checked earlier (without moving the king) does not remove the right.

## Ending the game

### Checkmate

- The game is won by the player who checkmates the opponent's king; this immediately ends the game provided the mating move was legal (Art. 5.1.1).

### Resignation

- A player who declares they resign loses immediately (Art. 5.1.2). Over the board resignation should be clear (stopping the clock alone is not necessarily resignation; signing the scoresheet usually is).

### Stalemate

- The game is drawn when the player to move has **no legal move and is not in check** (Art. 5.2.1). Immediately ends the game.
- Verified example (Black to move, stalemate): `7k/5Q2/6K1/8/8/8/8/8 b - - 0 1`.

### Dead position

- The game is drawn when a position arises in which **neither player can checkmate the opponent's king with any series of legal moves** (Art. 5.2.2). Immediately ends the game.
- Classic dead positions: K v K; K+B v K; K+N v K; K+B v K+B with bishops on same-coloured squares; blocked pawn chains with no possible breakthrough.
- Note: **K+N+N v K is NOT a dead position** (mate is possible if the defender blunders), so the game continues; it cannot be forced.

### Insufficient material on flag fall

- The FIDE Laws do not use the phrase "insufficient material" as a separate rule; the governing articles are dead position (5.2.2) and **Art. 6.9**: if a player does not complete the prescribed moves in the allotted time, the game is lost, **unless the opponent cannot checkmate the player's king by any possible series of legal moves**, in which case it is drawn [1].
- Thus in K+N v K+R: if the K+N side's flag falls it loses (the rook side can mate). If the rook side's flag falls it also loses, because a helpmate with K+N exists (e.g., the defending king cornered and boxed in by its own rook). Only lone king (or a truly dead position) saves the flagged player. Online servers (Lichess, Chess.com) implement simplified material tables for this; the platform must document which ruleset its bots use.

### Draw by agreement

- Agreement ends the game immediately (Art. 5.2.3). The offer should be made **after making a move on the board and before pressing the clock** (Art. 9.1.2.1); offers cannot be conditional or withdrawn and remain valid until accepted, rejected orally, rejected by touching a piece, or the game ends (Art. 9.1.2.2). Record with "(=)". Event regulations may restrict agreements (e.g., Sofia rules, no draws before move 30/40) (Art. 9.1.1).

## Draws by repetition and move count

### Threefold repetition

- The game is drawn **upon a correct claim** by the player having the move when the same position, for at least the third time (not necessarily by repetition of moves): (a) is about to appear, if the player first writes the move on the scoresheet and declares to the arbiter the intention to make it; or (b) has just appeared and the claimant has the move (Art. 9.2.1-9.2.2).
- Positions are the same if **the same player has the move, pieces of the same kind and colour occupy the same squares, and the possible moves of all pieces of both players are the same** - so castling rights and en passant possibilities matter (Art. 9.2.3).
- A claim is required; it is not automatic (online servers usually make it automatic).

### Fifty-move rule

- Drawn **upon a correct claim** if the last 50 moves by each player have been made without any pawn move and without any capture, or the claimant's written intended move would make it so (Art. 9.3).

### Seventy-five-move and fivefold rules

- The game is drawn **automatically, without a claim**, if (a) the same position has appeared at least **five times** (Art. 9.6.1), or (b) any series of at least **75 moves by each player** has been made without a pawn move or capture; if the last move resulted in checkmate, the checkmate takes precedence (Art. 9.6.2).
- Practical: the arbiter intervenes; players should still claim at 3-fold / 50.

### Incorrect claims

- If a draw claim under 9.2 or 9.3 is found incorrect, the arbiter adds **two minutes** to the opponent's remaining time (one minute in Rapid/Blitz under App. A.3) and the game continues; if the claim was based on an intended move, that move must be made (Art. 9.5).

## Touch-move

- Only the player having the move may adjust pieces, after first expressing the intention (e.g. **"j'adoube"** or "I adjust") (Art. 4.2.1). Accidental contact is excepted (Art. 4.2.2).
- If the player having the move deliberately touches (Art. 4.3):
  - one or more of **their own pieces**: they must move the first touched piece that can be moved;
  - one or more of their **opponent's pieces**: they must capture the first touched piece that can be captured;
  - pieces of both colours: they must capture the first touched opponent piece with the first touched own piece, or, if illegal, follow the order in 4.3.3.
- If none of the touched pieces can be moved or captured, the player may make any legal move (Art. 4.5).
- A piece released on a square has been moved; the move is completed when the piece is released (captures: when the captured piece removed and own piece released; castling: rook released on its square; promotion: new piece released) (Art. 4.6-4.7).
- A player loses the right to claim a touch-move violation once they deliberately touch a piece (Art. 4.8).
- Moves must be made with **one hand** (Art. 4.1); a two-handed move (e.g., castling with both hands) is treated as an illegal move (Art. 7.5.4).

## Chess clock

- Each player must make a minimum number of moves or all moves in an allotted period, possibly with an **increment** (Fischer, added each move) or a **delay** (Bronstein/US delay) (Art. 6.1-6.2).
- A player must **press the clock with the same hand that moved the piece** (Art. 6.2.3). Not pressing the clock is not illegal, but time keeps running.
- A **flag** is considered fallen when the arbiter observes it or either player makes a valid claim (Art. 6.8).
- Flag fall = loss, except: if the opponent cannot checkmate by any legal series of moves, it is a draw (Art. 6.9). Checkmate or dead position before the flag falls takes precedence.
- **Default time** is specified by event regulations; if not specified it is **zero** - a player not present at the start (with no device rule exception) loses (Art. 6.7.1).
- A player may stop the clock only to seek the arbiter's help (e.g., promotion piece not available, claim) (Art. 6.11-6.12).

### Common time controls

| Category | Definition (FIDE) | Example |
|---|---|---|
| Standard (classical) | 60 min or more per player (allotted time + 60 x increment); FIDE Rating Regulations set higher minimums for stronger fields | 90 min/40 moves + 30 min + 30 s/move from move 1 |
| Rapid | More than 10 and less than 60 min per player (App. A.1), with increment counting x60 | 15+10, 25+10 |
| Blitz | 10 minutes or less per player (App. B.1) | 3+2, 5+0 |
| Bullet | Not a FIDE category (online only) | 1+0, 2+1 |

## Irregularities and illegal moves

- **Illegal move in standard chess** (Art. 7.5): if detected after completion (clock pressed), the position immediately before the irregularity is reinstated; for the **first completed illegal move the arbiter gives the opponent two extra minutes; the second completed illegal move by the same player loses** (unless the opponent cannot checkmate, then draw) (Art. 7.5.5). Pressing the clock without moving counts as an illegal move (7.5.3).
- Touching a piece is not an illegal move; failing to follow touch-move is penalised per Art. 4.
- **Rapid and Blitz**: Appendices apply Art. 7 with **one minute** instead of two (App. A.3; B.3); where adequately supervised, the competitive rules apply.
- Incorrect initial set-up or board orientation discovered during the game - Art. 7.2-7.3 (game restarted or continued with pieces transferred, per arbiter).
- Displaced pieces: the player restores them on own time (Art. 7.4).

## Recording moves and notation

- In standard play each player must record their own and the opponent's moves, **move by move, in algebraic notation** (App. C), on a scoresheet or FIDE-certified electronic scoresheet (Art. 8.1.1). Writing moves in advance is forbidden except for draw claims/adjournments (Art. 8.1.2).
- A player with **less than five minutes left** and receiving **less than 30 seconds increment** need not record moves for the rest of that period (Art. 8.4).
- Offer of a draw recorded as (=) (Art. 9.1.2.4).

## Algebraic notation SAN

App. C defines algebraic notation; computer interchange uses **SAN (Standard Algebraic Notation)** from the PGN standard [4].

- Piece letters (English): K king, Q queen, R rook, B bishop, N knight; pawns have no letter. Other languages use local letters (FIDE allows; e.g., German K D T L S).
- Move = piece letter + destination square (Nf3, e4). Capture: "x" (Bxe5; pawn captures name the departure file: exd5). En passant: exd6 (optionally "e.p.").
- Disambiguation when two identical pieces can reach the same square: add departure file (Nbd2), else rank (R1e2), else both (Qh4e1).
- Castling: O-O (kingside), O-O-O (queenside) - capital letter O in PGN, zero in FIDE App. C (0-0) is also used on scoresheets.
- Promotion: e8=Q (PGN), e8Q is FIDE-acceptable on scoresheets.
- Check "+", checkmate "#" (PGN); double check sometimes "++" (not PGN-standard).
- Annotation symbols (NAG-equivalents): ! good, ? mistake, !! brilliant, ?? blunder, !? interesting, ?! dubious; += / ± / +- for advantage; = equality; inf unclear; N novelty.
- **Long algebraic** (e2-e4, Ng1-f3) is still taught to beginners; **UCI** format (e2e4, e7e8q) is used by engines and the Lichess puzzle CSV [6].
- **Descriptive notation** (P-K4) is obsolete but appears in pre-1980 books; masters should be able to read it (stage 5+ optional skill).

## PGN format

Portable Game Notation (Edwards, 1994) [4]:

- **Seven Tag Roster** (mandatory, in order): Event, Site, Date (YYYY.MM.DD), Round, White, Black, Result ("1-0", "0-1", "1/2-1/2", "*").
- Common optional tags: WhiteElo, BlackElo, ECO, Opening, TimeControl, Termination, FEN + SetUp "1" (for non-standard start), Annotator, PlyCount.
- Movetext in SAN with move numbers ("1. e4 e5 2. Nf3"), comments in {braces} or after ";", variations in (parentheses), NAGs as $1..$255 ($1 = !, $2 = ?, $3 = !!, $4 = ??, $5 = !?, $6 = ?!), game termination marker at end.
- Lichess-specific comment extensions: [%clk 0:03:00], [%eval 0.35], [%csl], [%cal] (arrows/circles) - useful for the platform's game-review feature.

## FEN format

Forsyth-Edwards Notation, six space-separated fields [5]:

1. **Piece placement** from rank 8 to rank 1, files a-h, "/" between ranks; uppercase White (KQRBNP), lowercase Black; digits 1-8 = consecutive empty squares.
2. **Active colour**: w or b.
3. **Castling availability**: subset of KQkq, or "-". (Shredder-FEN / X-FEN variants for Chess960.)
4. **En passant target square** (square behind the pawn that just double-stepped) or "-".
5. **Halfmove clock**: plies since last capture or pawn move (for the 50/75-move rule; 100 plies = 50 moves).
6. **Fullmove number**: starts at 1, incremented after Black's move.

Example after 1.e4: `rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1`.

**EPD** is FEN's first four fields plus operations (bm, am, id) - used for test suites.

## Rapid and Blitz appendices

- Rapid: more than 10, less than 60 min (App. A.1). Players need not record moves (A.2). Penalties under Art. 7 and 9 are one minute instead of two (A.3). Where the competition is supervised adequately (e.g., one arbiter per three games), the Competitive Rules apply (A.4); otherwise A.5 applies.
- Blitz: 10 minutes or less (App. B.1); Competitive Rules apply when one arbiter supervises one game, otherwise the rapid rules (B.2-B.3).
- Online play is governed by each platform's terms and by the FIDE Online Chess Regulations, not the OTB Laws; key differences: auto-claims of 3-fold/50 move, premoves, no touch-move, server-side flagging with insufficient-material rules.

## Conduct and fair play

- Players must not use notes, sources of information or advice, or analyse on another board during play (Art. 11.3.1).
- **Electronic devices** are forbidden in the playing venue unless regulations allow them switched off in a bag; a device evidently on a player's person means loss of the game (regulations may set a lesser penalty) (Art. 11.3.2).
- No distraction or annoyance of the opponent (Art. 11.5), including repeated unreasonable draw offers or claims.
- Players must not leave the playing venue without arbiter permission (Art. 11.2.3).
- Refusal to comply with the Laws can be penalised (Art. 11.7, 12.9 penalties: warning, time bonus to opponent, time reduction, increasing points of opponent, reducing points, declaring the game lost, fine, expulsion).

## Points

- Win = 1 point, draw = 1/2, loss = 0 unless regulations specify otherwise (Art. 10.1). Total score in a game never exceeds 1 point (Art. 10.2) except where regulations say e.g. 3-1-0 scoring.

## Chess960

- Guideline II: back-rank pieces shuffled (bishops on opposite colours, king between rooks), 960 start positions; castling puts king and rook on the same final squares as in standard chess (g1/f1 or c1/d1). Optional advanced skill for opening-independence training.

## Rules competency checklist by stage

| Stage | Must know |
|---|---|
| 1 Foundations | board orientation, coordinates, all piece moves, captures, check, checkmate, stalemate (concept), pawn promotion |
| 2 Beginner | castling conditions, en passant, underpromotion, all draw types, SAN reading/writing |
| 3 Novice | touch-move, clock use, scoresheet, 3-fold & 50-move claims, illegal-move penalties, FEN reading, PGN basics |
| 4+ | quickplay finishes (Guideline III), arbiter procedures, fair play regulations, Chess960 |

## Sources

1. FIDE Handbook, E01 Laws of Chess (applied from 01/01/2023): https://handbook.fide.com/chapter/E012023
2. FIDE, "2023 FIDE Laws of Chess published": https://www.fide.com/2023-fide-laws-of-chess-published/
3. FIDE Arbiters' Manual 2024: https://arbiters.fide.com/wp-content/uploads/Publications/Manual/Arbiters_Manual_2024.pdf
4. PGN Standard (Edwards, 1994): https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm
5. Chess Programming Wiki, Forsyth-Edwards Notation: https://www.chessprogramming.org/Forsyth-Edwards_Notation
6. Lichess open database, puzzles (UCI moves): https://database.lichess.org/#puzzles
7. FIDE Laws archive (2018 edition, historical only): https://handbook.fide.com/
