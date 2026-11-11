---
title: Checkmate Patterns - Named Mates Catalogue
summary: Catalogue of basic and named checkmate patterns (back-rank through Vukovic, Max Lange, Balestra, Blind swine) with definitions, typical set-up, Lichess theme keys, teaching stage, and one machine-verified illustrative FEN per pattern showing the final mated position.
last_reviewed: 2026-11-11
sources:
  - Lichess lila puzzleTheme.xml / PuzzleTheme.scala (mate theme keys and definitions)
  - Wikipedia, Checkmate pattern (diagram conventions)
  - Renaud & Kahn, The Art of the Checkmate (1953)
  - Vukovic, The Art of Attack in Chess
  - FIDE Laws of Chess Art. 1.4, 5.1.1
---

# Checkmate Patterns

**Checkmate**: the king is in check and the side to move has no legal move to escape (FIDE Art. 1.4.1) [5]. Mating patterns are the single most valuable piece of chess knowledge for players up to ~1600, and the foundation for attacking play at all levels.

## FEN conventions and verification

- Every FEN below shows the **final, checkmated position with the mated side to move** (almost always Black), so that a student or engine can confirm mate directly. The position *before* the mating move is easily reconstructed by moving the mating piece back and is how the platform should present the puzzle.
- All FENs in this file were checked on 2026-11-11 with `verify-fens.mjs` (in this folder): it confirms one king per side, no pawns on ranks 1/8, side not to move not in check, side to move in check, and zero legal moves. Status "verified" = passed that check. Positions are illustrative constructions (many follow the standard textbook diagrams [2]); they are legal as static positions but are not claimed to be reachable from real games except where a game is named (Legal, Opera, Réti, Fool's, Scholar's) - those were reconstructed move-by-move.
- Lichess key = exact puzzle theme key in lila [1]. "(none)" = no dedicated Lichess tag; source such puzzles via `mate`/`mateInN` plus internal tagging.

## Basic mates with heavy pieces

### King and queen vs king

- Queen adjacent to the edge-bound king, protected by own king (or queen at a knight's distance with king opposite). Technique in `endgames.md#kq-vs-k`. Stage 1.
- FEN (verified): `3k4/3Q4/3K4/8/8/8/8/8 b - - 0 1`
- Lichess: `mate`, `mateIn1`.

### King and rook vs king (box mate)

- Rook checks along the edge while the kings stand in opposition. Stage 1-2.
- FEN (verified): `R2k4/8/3K4/8/8/8/8/8 b - - 0 1`

### Ladder mate (two rooks or rook and queen)

- Two heavy pieces alternate controlling adjacent ranks/files ("lawnmower", "rolling rooks") to drive the king to the edge. Stage 1.
- FEN (verified): `R5k1/1R6/8/8/8/8/8/6K1 b - - 0 1`

### Back-rank mate

- A rook or queen mates on the back rank because the king is hemmed in by its own pawns (no luft). Lichess: `backRankMate`. Stage 2.
- Defences: luft (h3/h6), keeping a rook or queen on the back rank, interposition; attacking ideas: deflection/overloading of back-rank defenders.
- FEN (verified): `4R1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1` (Re8#).

### Corridor mate

- Generalisation of the back-rank mate: the king is trapped in a "corridor" (any edge rank/file, or a line) by its own pieces and mated by a rook or queen along it. Lichess: (none; often `backRankMate`). Stage 2.
- FEN (verified): `8/8/1p6/kr6/1p6/8/8/R5K1 b - - 0 1` (Ra1# along the a-file; b-file squares blocked by own units).

### Support mate

- Queen mates adjacent to the king, protected by another piece (pawn, bishop, knight, king). Includes Damiano, Lolli, Greco families. Stage 2. Lichess: `mateIn1`.

## Queen-and-pawn mates

### Damiano's mate

- Queen on h7 (supported by a pawn on g6, or bishop) mates a king on g8; classic finish of an h-file attack. Lichess: (none). Stage 2.
- FEN (verified): `5rk1/6pQ/6P1/8/8/8/8/6K1 b - - 0 1` (Qh7#, g6 pawn guards h7 and f7).

### Damiano's bishop mate

- Queen supported by a bishop delivers mate on f7/f2 or h7 against the uncastled or castled king. Stage 3.
- FEN (verified): `5k2/5Q2/6B1/8/8/8/8/6K1 b - - 0 1` (Qf7#, Bg6 supports).

### Lolli's mate

- Pawn on f6 supports a queen landing on g7 against a fianchettoed/weakened castle (often via Qh6 then Qg7#). Lichess: (none). Stage 3.
- FEN (verified): `6k1/5pQ1/5Pp1/8/8/8/8/6K1 b - - 0 1`

### Anderssen's mate

- Rook (or queen) mates on the back rank next to the king, supported by a pawn (g7) which is itself supported by the king or another piece. Lichess: (none). Stage 3.
- FEN (verified): `6kR/6P1/5K2/8/8/8/8/8 b - - 0 1`

### Pawn mate

- A pawn delivers the mate (e.g., "David and Goliath"). Lichess: `mate`. Stage 3. (No FEN; pattern varies.)

## Knight mates

### Smothered mate

- A knight mates a king completely surrounded by its own pieces; typically preceded by Philidor's legacy: Qg8+!! Rxg8 Nf7#. Lichess: `smotheredMate`. Stage 2 (concept), 3 (Philidor's legacy combination).
- FEN (verified): `6rk/5Npp/8/8/8/8/6PP/6K1 b - - 0 1` (Nf7#).

### Arabian mate

- Rook and knight vs king in the corner: rook adjacent on the edge/7th, protected by the knight, which also covers the flight square. One of the oldest recorded patterns. Lichess: `arabianMate`. Stage 2.
- FEN (verified): `7k/7R/5N2/8/8/8/8/6K1 b - - 0 1` (Rh7#).

### Anastasia's mate

- Knight (e7) and rook or queen (on the h-file) trap the king on the edge between the board side and its own pawn (g7). Named after Heinse's novel *Anastasia und das Schachspiel* (1803). Lichess: `anastasiaMate`. Stage 3.
- FEN (verified): `8/4N1pk/8/7R/8/8/6PP/6K1 b - - 0 1` (Rh5#).

### Hook mate

- Rook protected by a knight, knight protected by a pawn, with an enemy pawn blocking the king's escape. Lichess: `hookMate`. Stage 3.
- FEN (verified): `4R3/4kp2/5N2/4P3/8/8/8/6K1 b - - 0 1` (Re8#).

### Vukovic mate

- Rook mates (supported by a third piece, often king or pawn) while a knight covers the king's escape squares; frequent in rook+knight endgames and attacks on the 7th. Lichess: `vukovicMate`. Stage 4.
- FEN (verified): `4k3/4R3/4NK2/8/8/8/8/8 b - - 0 1` (Re7#).

### Corner mate

- Rook or queen confines the king to the corner; the knight delivers mate. Lichess: `cornerMate`. Stage 3.
- FEN (verified): `7k/5N1p/8/8/8/8/8/6RK b - - 0 1` (Nf7#).

### Suffocation mate

- Knight checks a king boxed in by its own pieces while a bishop covers the remaining flight squares on the long diagonal. Lichess: (none). Stage 4.
- FEN (verified): `5rk1/4Np1p/8/8/8/2B5/8/6K1 b - - 0 1` (Ne7#).

### Double knight mate

- Two knights coordinate to mate a king hemmed in by its own pieces. Lichess: (none). Stage 4.
- FEN (verified): `k1n5/ppNN4/8/8/8/8/8/6K1 b - - 0 1` (Nxc7#).

### Blackburne's mate

- Two bishops and a knight: one bishop on the long diagonal covers g7/h8, the knight (g5) supports the other bishop's mate on h7. Lichess: (none). Stage 4.
- FEN (verified): `5rk1/7B/8/6N1/8/8/1B6/6K1 b - - 0 1` (Bh7#).

## Bishop mates

### Boden's mate

- Two bishops on criss-crossing diagonals mate a king (usually castled queenside) obstructed by its own pieces; typical finish Qxc6+! bxc6 Ba6#. Lichess: `bodenMate`. Stage 3.
- FEN (verified): `2kr4/p2p4/B1p5/8/5B2/8/8/6K1 b - - 0 1` (Ba6#, Bf4 covers b8/c7).

### Double bishop mate

- Two bishops on adjacent parallel diagonals mate a king obstructed by its own pieces. Lichess: `doubleBishopMate`. Stage 3.
- FEN (verified): `7k/7p/8/3B4/8/2B5/8/6K1 b - - 0 1` (Bc3#, Bd5 covers g8).

### Morphy's mate

- A bishop delivers mate on the long diagonal while a rook on the adjacent (g-)file confines the king. Lichess: `morphysMate`. Stage 3.
- FEN (verified): `7k/7p/5B2/8/8/8/8/6RK b - - 0 1` (Bf6#).

### Pillsbury's mate

- The mirror of Morphy's: the rook delivers mate on the g-file while a bishop on the long diagonal covers h8/g7. Lichess: `pillsburysMate`. Stage 3.
- FEN (verified): `5rk1/5p1p/8/8/8/8/1B6/6RK b - - 0 1` (Rg1#).

### Mayet's mate

- Rook mates on the back rank, protected by a bishop along the long diagonal (through g7). Lichess: (none). Stage 3.
- FEN (verified): `6kR/5p2/8/8/8/8/1B6/6K1 b - - 0 1` (Rh8#).

### Greco's mate

- Bishop on c4 (diagonal to g8) and queen/rook on the h-file mate a king on h8 hemmed by its g7 pawn; often after a rook sacrifice on h8 and Qh5. Lichess: (none). Stage 3.
- FEN (verified): `7k/6p1/8/7Q/2B5/8/8/6K1 b - - 0 1` (Qh5#).

### Balestra mate

- A bishop delivers check from a distance while the queen covers the remaining escape squares (resembles a crossbow). Lichess: `balestraMate`. Stage 3.
- FEN (verified): `6k1/8/4B2Q/8/8/8/8/6K1 b - - 0 1` (Be6#).

### Max Lange's mate

- Queen and bishop: the queen mates on g8 against a king on h7, supported by a bishop on f7 which also covers g6. Lichess: (none). Stage 4.
- FEN (verified): `6Q1/5Bpk/7p/8/8/8/8/6K1 b - - 0 1` (Qg8#).

### Legal's mate

- Opening trap: a pinned knight is "sacrificed" by moving it, giving up the queen, followed by Bxf7+ and Nd5#. Game line (verified by reconstruction): 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6? 5.Nxe5! Bxd1?? 6.Bxf7+ Ke7 7.Nd5#. Lichess: `attackingF2F7` (often `mateIn2`/`mateIn3`). Stage 2.
- FEN (verified): `rn1q1bnr/ppp1kB1p/3p2p1/3NN3/4P3/8/PPPP1PPP/R1BbK2R b KQ - 1 7`

### Opera mate

- Rook mates on the back rank (d8) supported by a bishop (g5), the final blow of Morphy vs Duke of Brunswick & Count Isouard, Paris Opera 1858 (17.Rd8#). Lichess: `operaMate`. Stage 3.
- FEN (verified): `1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17`

### Réti's mate

- Bishop and rook mate a king trapped by its own pieces after a queen sacrifice and double check (Réti vs Tartakower, Vienna 1910: 9.Qd8+!! Kxd8 10.Bg5++ Kc7 11.Bd8#). Lichess: (none; `doubleCheck` + `sacrifice`). Stage 4.
- FEN (verified): `rnbB1b1r/ppk2ppp/2p5/4q3/4n3/8/PPP2PPP/2KR1BNR b - - 1 11`

## Queen mates with blocked king

### Epaulette mate

- The king's two lateral squares on the same rank are occupied by its own pieces (like epaulettes, typically rooks), and the queen mates from two squares in front. Lichess: `epauletteMate`. Stage 3.
- FEN (verified): `3rkr2/8/4Q3/8/8/8/8/6K1 b - - 0 1` (Qe6#).

### Dovetail mate (Cozio's mate)

- Queen mates an adjacent king diagonally (protected), and the king's only two escape squares are occupied by its own pieces, forming a dovetail shape. Lichess: `dovetailMate`. Stage 3.
- FEN (verified, Cozio's study finish Qh2#): `8/8/8/8/6p1/5qk1/7Q/6K1 b - - 0 1`

### Swallow's tail mate (Guéridon mate)

- Queen mates from directly in front of the king, protected by another piece, while the king's two diagonal-rear squares are occupied by its own pieces (V shape). Lichess: `swallowstailMate`. Stage 3.
- FEN (verified): `3r1r2/4k3/R3Q3/8/8/8/8/6K1 b - - 0 1` (Qe6#).

### Kill box mate

- A rook adjacent to the king, supported by a queen that also covers the escape squares, forming a 3x3 "box". Lichess: `killBoxMate`. Stage 3.
- FEN (verified): `8/8/R7/k7/2Q5/8/8/6K1 b - - 0 1` (Ra6#).

### Triangle mate

- Queen and rook, each one square from the king, on the same rank or file separated by one square, form a triangle with the king. Lichess: `triangleMate`. Stage 3.
- FEN (verified): `3R4/4kp2/3Q4/8/8/8/8/6K1 b - - 0 1` (Qd6#).

## Rook mates

### Blind swine mate

- Two rooks on the 7th rank ("pigs on the seventh") mate a king confined to a 2x2 area, typically after Rxg7+ Kh8 Rxh7+ Kg8 Rbg7#. Lichess: `blindSwineMate`. Stage 3.
- FEN (verified): `5rk1/6RR/8/8/8/8/8/6K1 b - - 0 1`

### Lawnmower and box mates

- See ladder mate and box mate above.

## Minor piece endgame mates

### Two bishops mate

- K+B+B vs K: king driven to a corner (any corner). Technique: `endgames.md#two-bishops-mate`. Stage 4.
- FEN (verified): `7k/8/4BB1K/8/8/8/8/8 b - - 0 1`

### Bishop and knight mate

- K+B+N vs K: mate only in a corner of the bishop's colour; technique (Deletang's triangles / W-manoeuvre) within 50 moves. Stage 5.
- FEN (verified): `7k/8/5BKN/8/8/8/8/8 b - - 0 1`

### Two knights

- K+N+N vs K cannot be forced (mate only with defender's cooperation); K+N+N vs K+P can be won in some positions (Troitzky line). Stage 6 (knowledge only).

## Opening mates and traps

### Fool's mate

- Fastest possible mate: 1.f3 e5 2.g4 Qh4#. Stage 1.
- FEN (verified): `rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3`

### Scholar's mate

- 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7#. Teaches f7 weakness and why to defend it (3...g6 or 3...Qe7). Lichess: `attackingF2F7`. Stage 1.
- FEN (verified): `r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4`

## Pattern catalogue summary

| Pattern | Key pieces | Lichess key | Stage | FEN |
|---|---|---|---|---|
| K+Q v K | Q+K | mate | 1 | verified |
| Box (K+R v K) | R+K | mate | 1 | verified |
| Ladder | 2 heavy | mate | 1 | verified |
| Fool's / Scholar's | Q | attackingF2F7 | 1 | verified |
| Back-rank | R/Q | backRankMate | 2 | verified |
| Corridor | R/Q | (none) | 2 | verified |
| Smothered | N | smotheredMate | 2 | verified |
| Arabian | R+N | arabianMate | 2 | verified |
| Damiano | Q+P | (none) | 2 | verified |
| Legal's | B+2N | attackingF2F7 | 2 | verified |
| Anastasia | N+R/Q | anastasiaMate | 3 | verified |
| Boden | 2B | bodenMate | 3 | verified |
| Double bishop | 2B | doubleBishopMate | 3 | verified |
| Morphy | B+R | morphysMate | 3 | verified |
| Pillsbury | R+B | pillsburysMate | 3 | verified |
| Opera | R+B | operaMate | 3 | verified |
| Hook | R+N+P | hookMate | 3 | verified |
| Lolli | Q+P | (none) | 3 | verified |
| Greco | Q+B | (none) | 3 | verified |
| Balestra | B+Q | balestraMate | 3 | verified |
| Epaulette | Q | epauletteMate | 3 | verified |
| Dovetail (Cozio) | Q | dovetailMate | 3 | verified |
| Swallow's tail | Q | swallowstailMate | 3 | verified |
| Kill box | R+Q | killBoxMate | 3 | verified |
| Triangle | Q+R | triangleMate | 3 | verified |
| Blind swine | 2R | blindSwineMate | 3 | verified |
| Corner | N+R | cornerMate | 3 | verified |
| Mayet | R+B | (none) | 3 | verified |
| Anderssen | R+P | (none) | 3 | verified |
| Damiano's bishop | Q+B | (none) | 3 | verified |
| Vukovic | R+N | vukovicMate | 4 | verified |
| Max Lange | Q+B | (none) | 4 | verified |
| Blackburne | 2B+N | (none) | 4 | verified |
| Suffocation | N+B | (none) | 4 | verified |
| Double knight | 2N | (none) | 4 | verified |
| Réti | B+R | (none) | 4 | verified |
| Two bishops (endgame) | 2B+K | (none) | 4 | verified |
| Bishop+knight (endgame) | B+N+K | (none) | 5 | verified |

## Mating-net skills beyond named patterns

- **Mate in 1 recognition** (Lichess `mateIn1`): stage 1-2; mastery target ~95% at puzzle rating <1000.
- **Mate in 2 / 3** (`mateIn2`, `mateIn3`): stage 2-4; requires forcing-move search (checks first) and quiet-move mates.
- **Mate in 4 / 5** (`mateIn4`, `mateIn5`): stage 4-6; king hunts, double-check sequences.
- **Mating attack construction**: bringing pieces within range before the decisive blow (see `strategy.md#attacking-the-king`).
- **Defending against mate**: luft, blocking, counter-check, giving back material.

## Sources

1. Lichess lila, puzzleTheme.xml (mate definitions): https://github.com/lichess-org/lila/blob/master/translation/source/puzzleTheme.xml and PuzzleTheme.scala: https://github.com/lichess-org/lila/blob/master/modules/puzzle/src/main/PuzzleTheme.scala
2. Wikipedia, Checkmate pattern: https://en.wikipedia.org/wiki/Checkmate_pattern
3. Wikipedia, Opera Game: https://en.wikipedia.org/wiki/Opera_Game
4. Wikipedia, Légal Trap: https://en.wikipedia.org/wiki/L%C3%A9gal_Trap
5. FIDE Laws of Chess E01 (2023), Art. 1.4 and 5.1: https://handbook.fide.com/chapter/E012023
6. Wikipedia, Réti versus Tartakower: https://en.wikipedia.org/wiki/Richard_R%C3%A9ti
7. Lichess Practice, Checkmate Patterns studies: https://lichess.org/practice
