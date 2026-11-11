---
title: Tactics - Complete Motif Taxonomy
summary: Definitive taxonomy of chess tactical motifs (elements, motifs, combination types, defensive tactics, endgame tactics), each with definition, recognition cues, typical stage, and the exact Lichess puzzle theme key used to source exercises.
last_reviewed: 2026-11-11
sources:
  - Lichess lila puzzleTheme.xml and PuzzleTheme.scala (theme keys)
  - Lichess puzzle database documentation
  - Steps Method (Brunia & van Wijgerden) step contents
  - Yusupov, Build Up / Boost / Chess Evolution series (Quality Chess)
  - Wikipedia, Chess tactic
---

# Tactics - Complete Motif Taxonomy

Tactics are short forcing sequences that win material, mate, or obtain a decisive positional gain, exploiting the **concrete** features of a position. The taxonomy here is organised as:

1. **Tactical elements** (preconditions / "targets") - what makes a position tactical.
2. **Basic motifs** - one-idea patterns (fork, pin...).
3. **Combination techniques** - the moves that create a motif (deflection, decoy...).
4. **Sacrificial attacking patterns** - h7/f7/g7 sacrifices, Greek gift.
5. **Defensive and drawing tactics** - perpetual, stalemate, fortress tricks, desperado.
6. **Endgame tactics** - breakthroughs, promotion tricks.

Each motif lists its **Lichess theme key** (exact, verified against lila `PuzzleTheme.scala` [1][2]) or "(none)" when Lichess has no tag; for untagged motifs the platform must source puzzles from its own curated set or by engine-based tagging.

## How to read this file

- **Stage** = Grim Chess stage where the motif is first taught (1 Foundations 0-600 ... 8 GM 2450-2700). Motifs recur with increasing depth (spiral curriculum, as in the Steps Method [4] and Yusupov [5]).
- **Recognition cues** = board features a learner should notice ("tactical alarm bells").

## Tactical elements

These are the preconditions that should trigger a tactical search (Yusupov and Dvoretsky stress "signals"):

| Element | Description | Lichess key | Stage |
|---|---|---|---|
| Loose / undefended piece (LPDO: "loose pieces drop off") | A piece not defended by any other piece | hangingPiece (when capturable outright) | 1-2 |
| Hanging piece | A piece that can simply be captured for free | hangingPiece | 1 |
| Insufficiently defended piece | Attacked more times than defended, or attacked by a lower-value piece | (none) | 2 |
| Exposed / weakened king | King lacking pawn cover or castled into open lines | exposedKing | 3 |
| Pieces on the same line | Two valuable units on one rank/file/diagonal (pin/skewer target) | (none) | 2 |
| Pieces a knight-jump apart | Fork geometry (including king + queen) | (none) | 2 |
| Overworked defender | One piece doing two defensive jobs | (none) | 3 |
| Weak back rank | King with no luft, rooks unable to defend | backRankMate (for mate) | 2 |
| Trapped / low-mobility piece | Piece with no safe squares | trappedPiece | 3 |
| Advanced passed pawn | Pawn on 6th/7th rank | advancedPawn | 3 |
| Weak f2/f7 | Square defended only by the king early in the game | attackingF2F7 | 2 |

## Counting and exchanges

- **Material values**: P=1, N=3, B=3, R=5, Q=9 (many modern sources use B slightly > N, e.g., 3.25). Exchange = R for minor (~2 pawns).
- **Counting attackers vs defenders** on a square, including order of capture (lowest-value first) and x-ray attackers behind.
- **Static Exchange Evaluation (SEE)**: compute the net material of the capture sequence on one square; either side may stop capturing.
- Stage 2 skill; prerequisite for every tactical motif.

## Basic motifs

### Fork

- **Definition**: one unit attacks two or more enemy units (or one unit + a mating threat) simultaneously. Lichess: `fork`.
- Types: knight fork (most common; "family fork" K+Q+R), pawn fork, queen fork (often with check), king fork (endgames), bishop fork, rook fork.
- Cues: enemy pieces a knight-jump apart; unprotected pieces; king and queen on squares of the same colour (knight checks); pieces on the same rank with a checking square.
- Stage 2 (knight/pawn forks), stage 3 (queen forks, fork set-ups via decoy).

### Double attack

- General category: one move creates two threats (two attacks on pieces, attack + mate threat, attack + promotion threat). Forks are a subset; others include a move that attacks a piece while unmasking a line. Lichess: `fork` / `discoveredAttack` depending on mechanism. Stage 2.

### Pin

- **Definition**: an attacked piece cannot (or should not) move because a more valuable piece or the king stands behind it on the same line. Lichess: `pin`.
- **Absolute pin**: the piece behind is the king - moving the pinned piece is illegal.
- **Relative pin**: the piece behind is valuable (queen, rook) or a key square (e.g., mate square) - moving is legal but costly.
- **Exploiting pins**: pile up on the pinned piece ("attack the pinned piece"), attack it with a pawn, use the pinned piece's lost defensive function (a pinned piece does not defend). **Breaking pins**: interpose, unpin by moving the back piece, counterattack, kick the pinning piece (h6/g5 vs Bg5).
- Cross-pin, partial pin (pinned piece can move along the pin line, e.g., a rook pinned on a file can move along that file).
- Stage 2 (absolute), stage 3 (relative, exploitation), stage 4 (cross-pins, pins as defensive resources).

### Skewer

- **Definition**: a line piece attacks a valuable unit which, when it moves, exposes a less valuable (or equally valuable) unit behind it on the same line ("reverse pin"). Lichess: `skewer`.
- Common: rook/queen check skewering the king to win the queen or rook; bishop skewers on long diagonals; endgame skewer of a promoted queen (rook behind the promotion square).
- Stage 2.

### X-ray

- **Definition**: a piece attacks or defends a square **through** an enemy (or friendly) piece on the same line. Lichess: `xRayAttack`.
- Uses: rook behind rook defending through an enemy rook (x-ray defence on the back rank); queen sacrifice that is "defended" through the opponent's piece; counting exchanges correctly.
- Stage 4.

### Discovered attack

- **Definition**: moving one piece unmasks an attack by a line piece behind it; the moved piece can make its own threat. Lichess: `discoveredAttack`.
- Battery: the front piece is often a knight or bishop that moves with tempo (check, capture, threat).
- Stage 3.

### Discovered check

- A discovered attack where the unmasked piece gives check; the moving piece may go anywhere, even en prise, often capturing material. Lichess: `discoveredCheck`.
- The **windmill** (see-saw) is a repeated discovered check alternating with a direct check, harvesting material (Torre-Lasker 1925). Stage 3 (basic), 4 (windmill).

### Double check

- Both the moved piece and the unmasked piece give check; only a king move can answer it. Lichess: `doubleCheck`.
- Often the strongest check even if both checking pieces are en prise. Key to many mating patterns (Réti's mate, Legal's mate variants). Stage 3.

### Hanging piece

- Simply capturing or exploiting an undefended piece. Lichess: `hangingPiece`. Stage 1-2. Includes "what did the last move leave undefended?" and "what does the last move attack?" habits.

### Trapped piece

- **Definition**: a piece with no safe retreat squares that can be attacked and won. Lichess: `trappedPiece`.
- Classic cases: Bxa7?? b6 (bishop trapped on a7), Bxh2?? g3, knight on the rim (a8/h8 after capturing a rook), queen trapped after Qxb2 (Poisoned pawn), rook trapped by own king (Kf1/Rh1 not castled), bishop "Noah's Ark" trap in the Ruy Lopez (a6-b5-c4 pawns trapping Bb3).
- Stage 3 (basic), 4 (domination - a piece with all squares covered).

### Promotion tactics

- Pawn promotion combined with deflection, decoy, interference, or skewer. Lichess: `promotion`, `advancedPawn`. Stage 2-3.

### Underpromotion

- Promoting to R/B/N because the queen would stalemate (R or B) or because the knight forks/mates. Lichess: `underPromotion`. Stage 4.

### En passant tactics

- Using en passant to open a line, deliver mate, or capture with discovered check. Lichess: `enPassant`. Stage 2.

### Castling tactics

- Castling with a threat (rook attack on the f- or d-file, O-O-O with check or discovered threat), or exploiting the opponent's inability to castle. Lichess: `castling`. Stage 2-3.

### Collinear move

- Lichess (`collinearMove`): two opposing pieces face each other on a line and one slides along the line of attack without capturing. Advanced, stage 5 tag mostly used for puzzle sourcing.

## Combination techniques

### Deflection

- **Definition**: forcing an enemy piece away from a square or line where it performs an important duty (guarding a piece, a mating square, a promotion square). Lichess: `deflection`.
- Often by sacrifice or attack with tempo; distinguished from overloading in that the defender may have only one duty but is lured away.
- Stage 3.

### Overloading

- **Definition**: a defending piece has two or more defensive tasks and cannot fulfil both; attacking one duty makes the other collapse. Lichess: (none; usually tagged `deflection` or `capturingDefender`).
- Stage 3-4.

### Decoy (attraction)

- **Definition**: forcing an enemy unit (often the king or queen) **onto** a particular square where it becomes the victim of a fork, pin, skewer, or mate. Lichess: `attraction`.
- Classic: sacrifice on f7/h7 to bring the king to a forking square; Rh8+ Kxh8 then Qh5+ (Lasker-Bauer style) etc.
- Stage 3.

### Removing the defender

- **Definition**: capturing or exchanging the piece that guards a key square or piece. Lichess: `capturingDefender`.
- Variants: "eliminate the defender" by exchange sacrifice (Rxf6 to remove the knight defending h7), capture with check, trade off the fianchetto bishop.
- Stage 3.

### Interference

- **Definition**: placing a piece on the intersection of two enemy lines of action, cutting the connection between a defender and what it defends. Lichess: `interference`.
- Includes **Novotny** (interference on a square where two enemy pieces' lines cross, so either capture blocks the other) and **Grimshaw** (mutual interference between two black line pieces) from problem chess; practical: a piece sacrificed on the line between a rook and the back rank.
- Stage 4.

### Clearance

- **Definition**: vacating a square, rank, file or diagonal (often with tempo or sacrifice) so another piece can use it. Lichess: `clearance`.
- Line clearance (e.g., moving a pawn with tempo to open a bishop's diagonal), square clearance (sacrifice to free a square for a knight or a queen).
- Stage 4.

### Line opening and closing

- Sacrificing a pawn or piece to open a file/diagonal toward the king (line opening), or blocking a line to cut off a defender (line closing, related to interference). Lichess: (none). Stage 4.

### Zwischenzug (intermezzo, in-between move)

- **Definition**: instead of the expected recapture or reply, inserting a more forcing move (check, capture, bigger threat) first. Lichess: `intermezzo`.
- Also the defensive habit of looking for in-between checks before recapturing.
- Stage 3-4.

### Desperado

- **Definition**: a piece that is doomed (attacked and lost anyway, or pinned) sells itself as dearly as possible, typically by capturing material before being taken; also mutual desperado sequences in exchanges. Lichess: (none; often `sacrifice` or `intermezzo`).
- Also refers to a "desperado" rook offering itself repeatedly to force stalemate or perpetual.
- Stage 4.

### Quiet move

- **Definition**: a non-checking, non-capturing, often non-threatening-looking move in the middle of a combination that creates an unstoppable threat or prepares the decisive blow. Lichess: `quietMove`.
- Hardest motif for club players to see because CCT (checks-captures-threats) searches skip it.
- Stage 5.

### Zugzwang

- **Definition**: any move the side to move makes worsens its position; in mutual zugzwang, whoever moves loses. Lichess: `zugzwang`.
- Endgames (opposition, corresponding squares), middlegame zugzwang (Saemisch-Nimzowitsch "Immortal Zugzwang Game", 1923).
- Stage 3 (pawn endings), stage 6 (middlegame).

### Sacrifice (general)

- **Definition**: deliberately giving up material for mate, a larger material gain, or positional compensation. Lichess: `sacrifice`.
- Classification (Spielmann's *The Art of Sacrifice in Chess*): **sham sacrifices** (material recovered by force) vs **real sacrifices** (compensation is positional / long-term). Real-sacrifice subtypes: development, obstruction, line-opening, king-hunt, preventing castling, decoy, vacating sacrifice.
- Stage 3 (sham), 6 (real / intuitive).

### Defensive move

- Lichess `defensiveMove`: precise move or sequence to avoid loss of material or another disadvantage; includes only-moves under attack. Stage 4.

### Pawn breakthrough

- Sacrificing pawns to create a passed pawn that queens (e.g., three pawns vs three: b6! from a5-b5-c5 vs a7-b7-c7). Lichess: (none; usually `pawnEndgame` + `advancedPawn`). Stage 3-4.

### Mating attack combinations

- Combinations leading to mate: see `checkmate-patterns.md`. Lichess: `mate`, `mateIn1` ... `mateIn5`, plus named-mate keys.

## Attacking sacrifices on the king

### Attacking f2 and f7

- Early-game weakness of f7/f2 (defended only by the king). Typical: Bxf7+, Nxf7, Qxf7#, Fried Liver (Nxf7), Legal's mate, Scholar's mate. Lichess: `attackingF2F7`. Stage 2.

### Greek gift sacrifice

- **Bxh7+** (or ...Bxh2+) with the idea Kxh7 Ng5+ and Qh5/Qd3/Qg4, exploiting a castled king without the f6-knight defender. Lichess: `sacrifice` + `kingsideAttack`.
- **Preconditions checklist** (Vukovic, *Art of Attack*): bishop on the b1-h7 diagonal; knight able to reach g5 safely (not covered by a bishop on e7 or pawn h6/f6); queen able to reach h5/the h-file quickly; Black's f6 knight absent or chased (e5 push); Black has no ...Bf5/...Nf8 defence; consider ...Kg6 and ...Kg8 replies and ...Kh6 defence.
- Stage 4 (recognition), stage 5 (full calculation of all king retreats).

### Sacrifices on h7 and h6

- Rxh7 / Qxh7+ to open the h-file; Bxh6 / Nxh6 to destroy pawn cover (g7-h6 structure). Stage 4-5.

### Sacrifices on g7 and g6

- Bxg7 / Rxg7+ to remove the fianchetto pawn or to deflect the king; Nxg6/Bxg6 vs ...h6/...g6 structures (Nf5/Bxg6 fxg6 Qxg6). Stage 5.

### Double bishop sacrifice

- Lasker's combination (Lasker-Bauer, Amsterdam 1889): Bxh7+ and Bxg7, followed by Qg4+/Qh5+ and Rf3-g3/h3 lifts. Stage 5.

### Sacrifices on e6 and f5

- Nxe6 / Bxe6 / Nf5 sacrifices in the Sicilian (Najdorf/Scheveningen) to open the e-file and the king in the centre; Nd5 sacrifice. Stage 5-6.

### Sacrifices on b5 and d5

- Sicilian Najdorf themes: Nd5! (piece sacrifice to open the e-file), Bxb5+ against an a6/b5 structure. Stage 6.

### Exchange sacrifice for attack

- Rxf6 / Rxc3 (Sicilian ...Rxc3 tearing White's queenside), ...Rxe3. See also `strategy.md#exchange-sacrifice`. Stage 5-6.

### King hunt

- A series of checks and sacrifices driving the enemy king into the open (Lasker's Qxh7+ ... Kg8; Kasparov-Topalov 1999 Rxd4!!). Lichess: `exposedKing`. Stage 5-6.

### Queenside and kingside attack tags

- Lichess `kingsideAttack` / `queensideAttack` tag attacks on castled kings. Opposite-side castling races: pawn storms, opening files (stage 4-5).

## Defensive and drawing tactics

### Perpetual check

- Forcing a draw by an unending series of checks the opponent cannot escape. **Lichess has no dedicated perpetual-check theme** in the current lila source (verified 2026-11-11); puzzles with perpetual are usually tagged `equality` (+ `defensiveMove` / `exposedKing`). The platform should engine-tag perpetuals (repetition with checks within N plies) for its own curated set.
- Stage 3 (concept), 4 (saving lost positions).

### Stalemate tricks

- Sacrificing remaining mobile pieces so that the king, having no moves, is stalemated ("desperado rook" that cannot be taken without stalemate, queen sacrifices in K+Q vs K+P). **No Lichess theme key**; usually `equality`. Stage 3-4.

### Fortress tactics

- Liquidating into a known drawn fortress (wrong-coloured bishop, opposite-coloured bishops, R vs R+B where defender reaches Cochrane/second-rank defence). See `endgames.md#fortresses`. Stage 6.

### Repetition and positional draw

- Positional draw: one side cannot make progress, the other can repeat (e.g., piece shuttling to prevent a breakthrough). Stage 5.

### Counter-attack and counter-sacrifice

- Answering a threat with a stronger threat (including checks) rather than defending passively; "the best defence is a counter-attack". Stage 4.

### Prophylactic defence against tactics

- Luft (h3/h6), unpinning, removing pieces from fork squares and loaded lines before the opponent combines. Ties to `calculation.md#prophylactic-thinking`. Stage 4.

### Swindles

- Setting traps in lost positions; see `psychology-and-practical.md#swindles`.

## Endgame tactics

| Motif | Example | Lichess key | Stage |
|---|---|---|---|
| Pawn breakthrough | 3 v 3 pawn breakthrough, b6! | pawnEndgame, advancedPawn | 3 |
| Promotion with deflection / interference | Bishop sacrifice to block a rook's file | promotion, interference | 4 |
| Skewer of promoted queen | Ra8 behind a promoting pawn, Rh8+ | skewer | 3 |
| Underpromotion to avoid stalemate | Saavedra c8=R! | underPromotion | 4 |
| Stalemate defence | K+R pawn vs K, desperado rook | equality | 3 |
| Zugzwang | Opposition, triangulation | zugzwang | 3 |
| Knight fork in endings | N+P vs R tricks | fork, knightEndgame | 3 |
| Rook lift / cut-off | Lucena "building a bridge" | rookEndgame | 4 |

## Puzzle length and difficulty tags

Lichess tags puzzles by length - `oneMove`, `short` (2 moves), `long` (3 moves), `veryLong` (4+ moves) - and by goal - `mate`, `crushing`, `advantage`, `equality` - and by phase `opening`, `middlegame`, `endgame` and endgame type (`pawnEndgame`, `rookEndgame`, `bishopEndgame`, `knightEndgame`, `queenEndgame`, `queenRookEndgame`). Origin tags: `master`, `masterVsMaster`, `superGM`. A hidden internal key `checkFirst` also exists in lila (not player-visible) and should not be used for curriculum [1][2].

## Mapping of motifs to Lichess keys

| Motif | Lichess key(s) |
|---|---|
| Fork / double attack | fork |
| Pin | pin |
| Skewer | skewer |
| X-ray | xRayAttack |
| Discovered attack | discoveredAttack |
| Discovered check | discoveredCheck |
| Double check | doubleCheck |
| Deflection, overloading | deflection |
| Decoy | attraction |
| Removing the defender | capturingDefender |
| Interference | interference |
| Clearance | clearance |
| Zwischenzug | intermezzo |
| Quiet move | quietMove |
| Zugzwang | zugzwang |
| Trapped piece | trappedPiece |
| Hanging piece | hangingPiece |
| Sacrifice | sacrifice |
| Defensive move | defensiveMove |
| Attacking f2/f7 | attackingF2F7 |
| Exposed king | exposedKing |
| Kingside / queenside attack | kingsideAttack, queensideAttack |
| Advanced pawn / promotion / underpromotion | advancedPawn, promotion, underPromotion |
| En passant, castling | enPassant, castling |
| Collinear move | collinearMove |
| Perpetual check, stalemate trick, desperado, overloading, line opening | (no Lichess key) |

## Tactical training method

- **Volume then depth**: stage 1-3 learners need thousands of easy puzzles (pattern acquisition; Steps 1-3 workbooks contain thousands of positions [4]); stage 5+ needs fewer, harder positions solved with full calculation (see `calculation.md`).
- **Themed then mixed**: first themed sets (one motif), then mixed sets (Lichess "healthy mix", key `mix`) to train recognition without hints. Step 6 of the Steps Method deliberately gives no hints [4].
- **Spaced repetition** of failed puzzles (Woodpecker Method: repeated cycles of the same set at increasing speed).
- **Mastery metric**: accuracy at a target puzzle-rating band under a time limit; see `skill-graph.json` masteryCriteria.

## Sources

1. Lichess lila, translation/source/puzzleTheme.xml: https://github.com/lichess-org/lila/blob/master/translation/source/puzzleTheme.xml
2. Lichess lila, modules/puzzle/src/main/PuzzleTheme.scala: https://github.com/lichess-org/lila/blob/master/modules/puzzle/src/main/PuzzleTheme.scala
3. Lichess open database, puzzles: https://database.lichess.org/#puzzles
4. Han Schut, "The Steps Method for learning and teaching chess" (Lichess blog): https://lichess.org/@/HanSchut/blog/the-steps-method-for-learning-and-teaching-chess/L74I4Ihq
5. Quality Chess, Yusupov's Chess School series: https://www.qualitychess.co.uk/
6. Wikipedia, Chess tactic: https://en.wikipedia.org/wiki/Chess_tactic
7. Wikipedia, Greek gift sacrifice: https://en.wikipedia.org/wiki/Greek_gift_sacrifice
8. Wikipedia, Windmill (chess): https://en.wikipedia.org/wiki/Windmill_(chess)
9. Smith & Tikkanen, The Woodpecker Method (Quality Chess, 2018): https://www.qualitychess.co.uk/products/2/261/the_woodpecker_method_by_axel_smith_and_hans_tikkanen/
