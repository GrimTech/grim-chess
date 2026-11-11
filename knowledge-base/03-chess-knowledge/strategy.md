---
title: Strategy - Positional Play, Pawn Structures and Planning
summary: Positional knowledge from opening principles to GM-level strategic judgement - evaluation elements, imbalances, every major pawn structure (IQP, hanging, Carlsbad, Maroczy, Hedgehog, Stonewall, King's Indian, Sicilian, French, Benoni, Slav/Caro), piece play (bishops, outposts, files, 7th rank, bishop pair, minor imbalances, exchange sacrifices), space, prophylaxis, weak squares and colour complexes, initiative, two weaknesses, king safety, attack and defence, and transitions to endgames.
last_reviewed: 2026-11-11
sources:
  - Steinitz / Lasker classical theory; Nimzowitsch, My System (1925)
  - Silman, How to Reassess Your Chess (4th ed.)
  - Watson, Secrets of Modern Chess Strategy (1998)
  - Soltis, Pawn Structure Chess; Flores Rios, Chess Structures - A Grandmaster Guide (Quality Chess, 2015)
  - Dvoretsky & Yusupov, Positional Play; Yusupov series (Quality Chess)
  - Vukovic, The Art of Attack in Chess
  - Shereshevsky, Endgame Strategy
---

# Strategy

Strategy is the long-term handling of a position: evaluating static and dynamic features and forming plans. Tactics serve strategy; strategy creates the conditions for tactics. Organisation below follows the curriculum order rather than historical order.

## Evaluation elements

Steinitz's elements, modernised (Silman's "imbalances" [2]):

1. **Material** (including the exchange and compensation).
2. **King safety**.
3. **Piece activity / development / coordination** (incl. the worst-placed piece).
4. **Pawn structure** (weaknesses, majorities, passed pawns, islands).
5. **Space** and **centre** control.
6. **Files, diagonals, squares** (open lines, outposts, weak squares, colour complexes).
7. **Minor-piece balance** (bishop vs knight, bishop pair, good/bad bishop).
8. **Initiative / dynamics / time** (development lead, tempo).
9. **Statics vs dynamics** (Silman/Watson [2][3]) - long-term structural plusses vs short-term activity.

Learner rule: an advantage in one element is converted into an advantage in another (e.g., development lead -> initiative -> structural damage -> winning endgame) - Steinitz's "accumulation of small advantages" and Lasker's "converting".

## Opening principles

- Control the centre (e4/d4/e5/d5) with pawns and pieces.
- Develop knights and bishops quickly, usually knights before bishops; avoid moving the same piece twice without reason.
- Castle early; connect the rooks.
- Do not bring the queen out early without purpose; avoid pawn grabbing behind in development.
- Each move should improve a piece or fight for the centre; avoid "pawn moves for nothing" (a3/h3 without reason) early.
- These principles are stage 1-2; exceptions (e.g., flank openings, gambits, hypermodern control) are stage 4+.

## Material and imbalances

| Imbalance | Standard evaluation (with pawns on board) |
|---|---|
| Bishop pair vs B+N or 2N | Worth ~half a pawn in open positions |
| Rook vs minor piece ("the exchange") | ~2 pawns; exchange-down side needs compensation (pawns, dark squares, activity) |
| Two minors vs rook | Usually two minors slightly better in the middlegame; rook gains in endgames with pawns |
| Two minors vs rook + pawn | Roughly balanced |
| Queen vs two rooks | Roughly equal; rooks better with secure king and coordination, queen with exposed king/loose pawns |
| Queen vs rook + minor | Often balanced; with extra pawn for the R+minor side, the pieces |
| Three minors vs queen | Minors usually better if coordinated |
| Rook + 2 pawns vs two minors | Context-dependent |
| Minor piece vs 3 pawns | Pawns strong in endgames if connected/advanced |

Source: Kaufman's material imbalance study and standard textbooks [3][4]. Stage 4-6.

## Pawn structure

Pawns are "the soul of chess" (Philidor). Structure determines plans for both sides; learning the 20-30 most common structures is the main strategic content from stage 4 to 7 (Flores Rios [5]).

### Pawn islands

- Groups of connected pawns separated by files without pawns; fewer islands is usually better (Capablanca). Stage 3.

### Isolated pawn

- Pawn with no friendly pawns on adjacent files; cannot be defended by pawns; the square in front is a natural **blockade** square for an enemy piece (ideally a knight). Stage 3.

### Isolated queen pawn

- **IQP** (d4 pawn with no c- and e-pawns), arising from QGA, Tarrasch, Caro-Kann Panov, Nimzo-Indian, Semi-Tarrasch, Alapin Sicilian, French Tarrasch.
- **For the IQP side**: space, open c- and e-files, outposts on e5/c5, kingside attack (Bd3/Bc2-Qd3 battery, rook lift Re3-h3/g3), d4-d5 break to liquidate or open lines; avoid exchanges.
- **Against the IQP**: blockade on d5 (knight best), exchange minor pieces (especially the light-squared bishop and attacking knights), pressure d4 with Rd8/Nc6/Bf6, aim for an endgame where the pawn is weak.
- Transformations: IQP -> hanging pawns (after ...Nxc3 bxc3) -> c3/d4 pair; IQP -> after d5 isolated-pawn exchange -> open centre.
- Model games: Karpov-Spassky; Botvinnik's IQP games. Stage 4-5.

### Hanging pawns

- Two adjacent half-isolated pawns (c and d, usually on c5/d5 or c4/d4) on half-open files. Dynamic (pawn break d4-d5 or c4-c5 creating passed pawns) vs static weakness (target for blockade by forcing one to advance). Stage 5.

### Doubled pawns

- Two pawns on one file. Disadvantages: reduced mobility, possible weakness; advantages: half-open file, control of extra central squares (e.g., after Bxc6 bxc6 in the Ruy Lopez Exchange or ...bxc3 in the Nimzo-Indian). Doubled isolated pawns are usually weak. Stage 3.

### Backward pawn

- Pawn whose neighbours have advanced, so it cannot be supported by a pawn and its advance square is controlled by the enemy; on a half-open file it is a target (e.g., d6 in the Sveshnikov/Najdorf with the d5 hole). Stage 4.

### Passed pawn

- No enemy pawns in front on its file or adjacent files. Types: protected passed pawn, outside passed pawn, connected passers, candidate passed pawn (pawn majority producing a passer). Nimzowitsch: the passed pawn has a "lust to expand"; **blockade** it with a piece (knight best). Rooks belong behind passed pawns (Tarrasch). Stage 3 (concept), 4-5 (strategy).

### Pawn majority

- More pawns on one wing; queenside majority is valuable in endgames (creates a distant passer); kingside majority supports attack or a central/kingside passer (e.g., Grünfeld, Exchange Slav). Stage 4.

### Pawn chains

- Diagonal chain (e.g., French d4-e5 vs e6-d5); attack the **base** of the chain (Nimzowitsch): ...c5 against d4, ...f6 against e5. Stage 4.

### Carlsbad structure

- White: d4, e3 (often), pawns a2 b2 f2 g2 h2 with c-pawn exchanged; Black: c6, d5 (from QGD Exchange, Caro-Kann Exchange reversed).
- White plans: **minority attack** (b4-b5 to create a weak c6/c-pawn), central break f3+e4, or kingside attack (O-O-O and g4). Black plans: kingside attack (...Ne4, ...f5), ...c5 break, piece play on e4, queenside counterplay. Stage 5.

### Maroczy bind

- White pawns c4 and e4 vs Sicilian structures (often after an Accelerated Dragon or ...g6 lines) restricting ...d5 and ...b5. Black: patient play, ...a5/...Nd7-c5, ...f5 or ...b5 break, exchanges to relieve cramp; White: space, slow squeeze, Nd5 outpost. Stage 5.

### Hedgehog

- Black pawns a6, b6, d6, e6 (sometimes g6, h6) behind White's c4/e4 space; pieces on the 7th/8th ranks; breaks ...b5 and ...d5. Dynamic defence; known from English and Sicilian Kan/Taimanov lines; Andersson, Karpov, Ljubojevic models. Stage 6.

### Stonewall

- Pawns d4/e3/f4/c3 (White) or d5/e6/f5/c6 (Black Dutch Stonewall); strong e5/e4 outpost, kingside attack ideas (Ne5, Rf3-h3), weakness of the e4/e5 hole and the bad light/dark bishop. Stage 5.

### Kings Indian structures

- **Classical/Mar del Plata** (White d5/c4/e4 vs Black d6/e5): White attacks queenside with c5 (and b4), Black kingside with ...f5-f4, ...g5-g4 pawn storm.
- **Benoni-type** (after ...c5 d5): queenside majority vs central majority.
- **Saemisch / Four Pawns / exchange (dxe5 dxe5)** variants: different plans (King's Indian Exchange: d4 hole, e5/d5 squares).
- Key: pawn-chain logic, race of attacks, timing of ...f5. Stage 5-6.

### Sicilian structures

- **Open Sicilian** (White e4 vs Black d6/e6 or d6/e5): Black has the extra central pawn and half-open c-file; White space and kingside attack (English Attack, Keres g4, f4-f5).
- **Scheveningen** (e6/d6 "small centre"): ...d5 and ...e5 breaks; White g4-g5 or f4/e5.
- **Najdorf with ...e5** (Boleslavsky hole d5): fight for d5; Black pieces to e6/d7; ...d5 liberation.
- **Dragon** (g6/d6): long diagonal, ...Rxc3 exchange sacrifice, opposite-side castling races (Yugoslav Attack).
- **Sveshnikov** (d6/e5 with f5 often, ...b5): Nd5 outpost vs Black's bishop pair and dynamic ...f5.
- **Closed / Grand Prix / Alapin** structures: different plans.
- Stage 5-6.

### French structures

- **Advance** (d4-e5 vs d5-e6): attack the chain base (...c5, ...f6), Black's bad light bishop; White kingside space.
- **Winawer / Classical**: doubled c-pawns (Winawer), dark-square play; **Tarrasch IQP**; **Rubinstein** (open centre, ...c5).
- Stage 5.

### Caro-Kann and Slav structures

- Solid c6/d5 vs e4/d4 or c4/d4; the "good" light bishop developed outside the chain (...Bf5/...Bg4) before ...e6; Panov leads to IQP; Advance Caro mirrors the French. Exchange Slav symmetrical structures.
- Stage 5.

### Benoni structures

- Modern Benoni (d5/e4 vs c5/d6): White central majority and e4-e5 break; Black queenside majority, ...b5, dark-squared bishop on g7; Benko Gambit compensation (open a/b files). Stage 6.

### Open centre structures

- No central pawns or symmetrical open centre: piece activity, bishop pair, development lead dominate. Stage 4.

### Closed centre structures

- Locked centre (e.g., KID d5/e5, French advance): play on the wings with pawn breaks; knights gain value. Stage 5.

### Pawn breaks

- A pawn break (lever) is a pawn advance that challenges an enemy pawn to open lines; identifying the thematic breaks of a structure (c5/f6 in French, b4-b5 minority attack, ...d5 in Sicilian, f4-f5 in KID-type) is the core of structural planning. Stage 4-5.

## Piece play

### Activity and coordination

- Improve your worst-placed piece (Makogonov/Lasker principle quoted by Yusupov). Pieces should defend each other and work toward a common target. Stage 3-4.

### Good and bad bishops

- **Bad bishop**: blocked by own pawns fixed on its colour; **good bishop**: own pawns on the opposite colour. A "bad" bishop can be a good defender, and an active "bad" bishop outside the chain is fine ("tall pawn" only when passive). Stage 4.

### Outposts

- A square that cannot be attacked by enemy pawns, ideally protected by own pawn, in enemy territory (rank 4-6). Knights are the best outpost occupants. Stage 4.

### Knight vs bishop

- Knights better in closed positions, with fixed pawns, outposts, pawns on one side; bishops better in open positions, pawns on both wings, with passed pawns. Endgame specifics in `endgames.md#bishop-vs-knight-endgames`. Stage 4-5.

### Bishop pair

- Two bishops control squares of both colours; strongest in open positions and endgames with pawns on both wings; technique: restrict enemy knights, open the position, trade into favourable endings (Steinitz). Stage 5.

### Opposite-coloured bishops middlegame

- Favour the attacker (each side's bishop controls squares the other cannot contest) - the opposite of their drawish endgame nature. Stage 5.

### Open files

- Rooks belong on open files (no pawns) and half-open files (only enemy pawns); fight for the file by doubling, occupying an entry square, or contesting with a rook. Stage 3-4.

### Seventh rank

- A rook (or two rooks, "pigs") on the 7th rank attacks pawns and confines the king; absolute 7th rank (both rooks, king on 8th) often decisive. Stage 4.

### Rook lifts

- Rooks transferring via the 3rd rank (Re1-e3-h3) to attack. Stage 4.

### Queen placement

- Queen centralised behind pawns; avoid early exposure; queen + knight coordination is strongest in attack/endgames (Capablanca). Stage 4.

### Minor piece imbalances

- Two knights vs two bishops, bishop + knight vs two bishops; evaluate by pawn structure, open lines, and outposts. Stage 5.

### Exchange sacrifice

- Giving up a rook for a minor piece (often R for N/B) for positional compensation: destroying the structure (...Rxc3 in the Sicilian), eliminating a key piece, gaining dark/light squares, central pawns, or initiative. Petrosian's prophylactic exchange sacrifices (e.g., ...Re6 vs Reshevsky 1953). Stage 6.

### Positional sacrifices

- Pawn sacrifices for development/initiative (gambits), for squares (e.g., ...d5 in Sicilian, e5 to open the bishop), and piece sacrifices for long-term compensation (Spielmann's "real" sacrifices). Stage 6-7.

## Space

- Space = squares controlled behind your pawn front. More space -> easier piece mobility; avoid exchanges when you have space (Tarrasch), seek exchanges when cramped. The side with less space should use pawn breaks. Stage 4.

## Development and tempo

- A lead in development is temporary; it must be converted by opening lines (gambits, centre breaks) before the opponent catches up. Stage 2-3.

## Centre

- Classical centre (pawns on e4/d4) vs hypermodern control from a distance (fianchetto, Nimzowitsch/Réti); "a flank attack is best met by a reaction in the centre". Stage 3-4.

## Prophylaxis

- Preventing the opponent's plan before executing your own (Nimzowitsch's "prophylaxis"; Petrosian; Karpov). Includes over-protection of key points, restriction (preventing pawn breaks), and prophylactic king moves. See `calculation.md#prophylactic-thinking`. Stage 5-6.

## Weak squares and colour complexes

- A **weak square / hole** is one that can no longer be controlled by own pawns (e.g., f3/h3 after g3 without a fianchetto bishop). A **colour complex weakness** arises when pawns on one colour and the loss of the corresponding bishop leave all squares of that colour weak (e.g., dark squares after ...g6, ...Bg7 exchange). Plans: occupy with pieces, trade off the defending bishop, transfer the queen/knight. Stage 5.

## Initiative

- The ability to make threats that force the opponent to react; often worth material (gambits). Maintain it by continuing with forcing play; losing tempo or exchanging attacking pieces lets it vanish. Stage 5-6.

## Two weaknesses principle

- One weakness can usually be defended; creating a **second weakness** on the other wing stretches the defence until it breaks (Nimzowitsch/Shereshevsky; typical in endgames with queenside majority + kingside entry). Stage 5-6.

## Do not hurry

- Shereshevsky's endgame principle: once the opponent has no counterplay, improve all pieces maximally before the decisive action. Stage 6.

## King safety

- Pawn shield integrity (f/g/h pawns), avoiding unnecessary pawn moves, keeping defenders (knight on f6/f3, fianchetto bishop), timely luft, central king in the endgame. Castling sides: same-side (positional) vs opposite-side (pawn storm races). Stage 3-4.

## Attacking the king

- Preconditions (Vukovic [7]): (a) superiority of force near the king, (b) weakened pawn cover or king in the centre, (c) lines to open, (d) opponent lacks counterplay/central break.
- Methods: pawn storm (opposite-side castling), piece sacrifices (see `tactics.md#greek-gift-sacrifice`), opening files (h-file, g-file), rook lifts, eliminating defenders, the "attack with pieces vs. attack with pawns" distinction; the centre must be stable or closed for a wing attack.
- Attacking the king in the centre: keep it there (prevent castling), open the e-file, sacrifice for lines. Stage 4-6.

## Defence

- Principles: calculate the attacker's best line, exchange attacking pieces, return material to defuse, counter-attack in the centre, create fortress-like structures, avoid unnecessary weaknesses, the "principle of least resistance" (Lasker's resilience). Passive vs active defence. Stage 5-6.

## Exchanges

- What to trade: trade your bad pieces and the opponent's good pieces; trade when ahead in material ("trade pieces, not pawns"), when cramped, or to reach a favourable endgame; avoid trading when attacking or when the opponent is cramped. Stage 3-5.

## Planning

- Plan-formation steps (Yusupov/Kotov): evaluate imbalances -> identify targets (weaknesses) and favourable squares -> choose the wing/break -> regroup pieces -> execute; re-evaluate after every structural change. Stage 4-6.

## Transitions to endgames

- Choosing when to simplify: trade into an endgame where your advantage (better structure, active king, outside passer, better minor piece) is maximised; know the theoretical result of the target endgame (e.g., pure pawn endgame = most concrete; rook endgames drawish). Typical errors: trading into a drawn opposite-coloured bishop or rook endgame; ignoring the opponent's king activity. Stage 5-7.

## Steinitz principles

- The side with the advantage must attack (or lose the advantage); the defender should defend and seek counter-chances only when justified; attack the weakest point; accumulation of small advantages. Historical framework taught at stage 5.

## Strategic competency by stage

| Stage | Key strategic competence |
|---|---|
| 1-2 | Opening principles; piece values; don't hang pieces; castle |
| 3 | Pawn islands, isolated/doubled pawns, open files, outposts concept, simple plans |
| 4 | Good/bad bishop, outposts, 7th rank, space, IQP basics, pawn chains, king attack preconditions |
| 5 | Structure-based plans (Carlsbad, Maroczy, Stonewall, KID, French), bishop pair, colour complexes, two weaknesses |
| 6 | Prophylaxis, exchange sacrifice, initiative evaluation, Hedgehog, transformations |
| 7 | Positional sacrifices, deep structural judgement, choosing the right transition |
| 8 | Integrated judgement at speed, dynamic equality, engine-era evaluation nuances |

## Sources

1. Nimzowitsch, A. *My System* (1925) - overview: https://en.wikipedia.org/wiki/My_System
2. Silman, J. *How to Reassess Your Chess*, 4th ed. (Siles Press): https://www.silmanjamespress.com/
3. Watson, J. *Secrets of Modern Chess Strategy* (Gambit, 1998): https://www.gambitbooks.com/
4. Kaufman, L. "The Evaluation of Material Imbalances" (Chess Life 1999): https://www.chess.com/article/view/the-evaluation-of-material-imbalances-by-im-larry-kaufman
5. Flores Rios, M. *Chess Structures - A Grandmaster Guide* (Quality Chess, 2015): https://www.qualitychess.co.uk/
6. Wikipedia, Pawn structure: https://en.wikipedia.org/wiki/Pawn_structure
7. Vukovic, V. *The Art of Attack in Chess* - overview: https://en.wikipedia.org/wiki/Vladimir_Vukovi%C4%87
8. Shereshevsky, M. *Endgame Strategy* (Pergamon/Everyman): https://en.wikipedia.org/wiki/Mikhail_Shereshevsky
9. Wikipedia, Isolated queen's pawn: https://en.wikipedia.org/wiki/Isolated_pawn
