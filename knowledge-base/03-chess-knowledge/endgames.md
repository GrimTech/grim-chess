---
title: Endgames - Theoretical and Practical Endgame Knowledge by Rating Band
summary: Complete theoretical endgame syllabus organised by rating band (after Silman's Complete Endgame Course) and cross-referenced to Dvoretsky's Endgame Manual chapters and de la Villa's 100 Endgames You Must Know - basic mates, king-and-pawn theory (opposition, key squares, triangulation, corresponding squares), rook endgames (Lucena, Philidor, Vancura, short/long side), queen, minor-piece and mixed endings, fortresses and endgame strategy - with legal standard-position FENs.
last_reviewed: 2026-11-11
sources:
  - Silman, Silman's Complete Endgame Course (Siles Press, 2007)
  - Dvoretsky, Dvoretsky's Endgame Manual (Russell Enterprises, 1st ed. 2003; 5th ed. 2020)
  - de la Villa, 100 Endgames You Must Know (New In Chess, 6th ed. 2023)
  - Shereshevsky, Endgame Strategy
  - Syzygy / Lomonosov tablebases (results)
---

# Endgames

## Organisation and source alignment

- **Rating bands** follow Silman's *Complete Endgame Course*, which teaches only what a player of a given class needs: Part 1 for unrated-999, then 200-point bands (1000-1199, 1200-1399, 1400-1599, 1600-1799, 1800-1999, 2000-2199, 2200-2399), and a final "Endgames for Pure Pleasure" part [1][2]. Silman places Lucena and Philidor in the 1400-1599 (class C) part [2]. Exact chapter placement elsewhere below is our curriculum mapping, informed by Silman's structure but not a verbatim copy of his table of contents.
- **Depth reference**: *Dvoretsky's Endgame Manual* (DEM), 13 chapters: 1 Pawn endgames; 2 Knight vs pawns; 3 Knight endgames; 4 Bishop vs pawns; 5 Opposite-coloured bishops; 6 Bishops of the same colour; 7 Bishop vs knight; 8 Rook vs pawns; 9 Rook endgames; 10 Rook vs knight; 11 Rook vs bishop; 12 Queen endgames; 13 Other material relationships (e.g., Q vs R, Q vs minors, R+minor vs R) [3]. DEM is the stage 6-8 reference.
- **Core list**: de la Villa's *100 Endgames You Must Know* (chapters on basic endings, knight vs pawn, queen vs pawn, rook vs pawn, rook vs two pawns, R+P vs R, etc.) is the "must know" list for stage 4-6 [4][5].
- Grim Chess stages: band 0-999 -> stages 1-2; 1000-1399 -> stage 3; 1400-1799 -> stage 4; 1800-2099 -> stage 5; 2100-2299 -> stage 6; 2300+ -> stages 7-8.
- FENs below were checked for static legality with `verify-fens.mjs`. Results stated are the standard textbook/tablebase verdicts; positions marked "(TB)" should be re-confirmed by the content team against a Syzygy tablebase when exercises are built.

## General endgame principles

- **King activity**: the king is a strong piece in the endgame - centralise it.
- **Passed pawns must be pushed**; rooks behind passed pawns (Tarrasch rule), both own and enemy.
- **Material conversion**: when ahead, trade pieces not pawns; when behind, trade pawns, not pieces.
- **Do not hurry** and the **principle of two weaknesses** (Shereshevsky [6]).
- **Zugzwang and tempo counting**.
- **Know the target endgame's theoretical result before simplifying**.

## Band 0-999 basic mates

### KQ vs K

- Technique: use the queen a knight's move from the king to shrink the box ("box"/"knight's distance" method), avoid stalemate when the king is on the edge, bring the king, mate. Maximum ~10 moves from any position. Stage 1.

### KR vs K

- Technique: "box" method (rook cuts off, king supports, shrink the box) or opposition method (kings in opposition, rook checks). Maximum 16 moves. Stage 2.

### Two rooks or K+Q+R vs K

- Ladder / lawnmower mate. Stage 1.

### Stalemate awareness

- The most common basic error: stalemating the lone king when it has no squares (especially K+Q vs K with the queen a knight's move away from a cornered king). Example stalemate: `7k/5Q2/6K1/8/8/8/8/8 b - - 0 1`. Stage 1-2.

### Rule of the square

- A king catches a passed pawn if it can step into the square formed by the pawn's path to promotion (side length = squares to promotion). For a pawn on its starting rank, count from the square after the double step. Stage 2.

### K+P vs K basics

- King in front of the pawn; the defending king aims for the square in front of the pawn; stalemate defence on the 8th rank. Stage 2.

## Band 1000-1399 pawn endgame core

### Opposition

- **Direct opposition**: kings on the same file/rank with one square between; the side *not* to move "has the opposition". **Distant opposition**: odd number of squares between. **Diagonal opposition**. Taking the opposition is the key method in K+P vs K. Stage 2-3.
- Example (pawn e4): `8/4k3/8/4K3/4P3/8/8/8 w - - 0 1` - with White to move, Black holds the opposition and draws (1.Kd5 Kd7 2.e5 Ke7 3.e6 Ke8! 4.Kd6 Kd8 5.e7+ Ke8 6.Ke6 stalemate); with Black to move, White wins (1...Kd7 2.Kf6 reaching a key square).

### Key squares

- Squares which, if occupied by the attacking king, guarantee promotion regardless of the move. For a non-rook pawn on the 2nd-4th rank: the three squares two ranks in front (pawn e4: d6, e6, f6). For a pawn on the 5th-6th: the three squares one rank in front and the three squares two ranks in front. Rook pawn: the two squares on the adjacent file at the 7th and 8th ranks (h-pawn: g7, g8). The attacking king reaching the 6th rank in front of its non-rook pawn wins regardless of the move. Stage 3.

### Rook pawn

- K+rook pawn vs K is drawn if the defending king reaches the corner (or the c/f-file squares that shut the attacking king in). Stage 3.

### Wrong-coloured bishop

- K+B+rook pawn vs K is drawn when the bishop does not control the promotion square and the defending king reaches the corner. Example (draw): `7k/8/6KP/8/8/8/8/1B6 w - - 0 1` (light bishop, dark h8; 1.h7 is stalemate). Stage 3.

### Outside passed pawn

- A passed pawn far from the main pawn mass decoys the enemy king, letting your king invade the other wing. Stage 3.

### Protected passed pawn

- Generally decisive in pawn endings because the defending king cannot capture it and must watch it. Stage 3.

### Pawn breakthrough

- With pawns facing on adjacent files (e.g., a5-b5-c5 vs a7-b7-c7, White to move: 1.b6! axb6 2.c6! or 1...cxb6 2.a6!), a sacrifice creates a passed pawn. Count tempi against the enemy king. Stage 3.

### K+P vs K+P races

- Counting tempi: who promotes first, with check, and whether the new queen can stop or skewer the other pawn. Stage 3.

### Queen vs pawn on the 7th

- Q wins vs a central or knight pawn on the 7th (repeated checks/pins force the king in front of the pawn, the attacking king approaches). Against a **rook pawn or bishop pawn** supported by its king, it's a **draw** unless the attacking king is close enough (stalemate trick Ka1 for a-pawn; for the c-pawn, ...Ka1! leaving the pawn because Qxc2 is stalemate). Stage 3.
- Win (knight pawn): `K7/8/8/8/8/8/1p1k4/6Q1 w - - 0 1` (TB).
- Draw (bishop pawn, attacking king far away): `7K/8/8/8/8/5Q2/2pk4/8 w - - 0 1` (TB).

### Rook vs pawn basics

- The rook wins if its king is in front of the pawn or if the defending king is cut off; when the pawn is supported and advanced, the defending side may draw or even win (rook vs pawn on the 7th). Stage 3-4.

## Band 1400-1799 rook endgame core and pawn finesses

### Lucena position

- R+P vs R with the pawn on the 7th, attacking king on the promotion square, defending king cut off by at least one file. Winning method: **"building a bridge"** - rook to the 4th rank to shield the king from checks. Stage 4.
- FEN (White wins, 1.Rd1+ Ke7 2.Rd4! and Kc7/Kb6 etc.): `1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1`

### Philidor position

- R+P vs R with the defending king in front of the pawn: keep the rook on the **3rd rank** (6th for Black) to stop the king's advance; when the pawn advances to that rank, switch to **checks from behind** (the king has no shelter). Stage 4.
- FEN (draw, Black's rook on the 3rd rank from his side): `4k3/R7/7r/3KP3/8/8/8/8 b - - 0 1`

### Back-rank defence

- Passive defence with the rook on the back rank: draws against rook pawns and knight pawns in some cases, loses against central pawns when the attacking rook checks on the 8th. Stage 4.

### Short side and long side defence

- When the defending king cannot reach the front of the pawn, put the king on the **short side** of the pawn and the rook on the **long side**, giving checks from the side at a distance of at least 3 files. Stage 4-5.

### Rook behind passed pawn

- Tarrasch rule; rook behind own passer supports, behind enemy passer restrains; frontal blockade with rook is passive. Stage 4.

### Cutting off the king

- Rook cuts the defending king off along a rank or file; one-file cut-off wins with central pawns (Lucena technique), and two-file cut-offs win more often. Stage 4.

### Triangulation

- Losing a tempo by making three king moves around a triangle while the opponent can only shuttle between two squares, to transfer the move (zugzwang). Stage 4.

### Réti manoeuvre

- A king pursuing two goals at once along a diagonal (Réti, 1921): `7K/8/k1P5/7p/8/8/8/8 w - - 0 1` - White draws with 1.Kg7! h4 2.Kf6 Kb6 3.Ke5! etc. Stage 4.

### Shouldering

- Using the king to block the opponent's king from approaching (body-checking). Stage 4.

### Two bishops mate

- K+B+B vs K: drive the king to any corner with coordinated bishops on adjacent diagonals. Max ~19 moves. Stage 4.

### Knight vs pawn

- A knight can stop a pawn if it controls a square in front; rook pawns on the 7th are hard for knights; "knight checks to gain tempo" technique (de la Villa ch. 2 [4]). Stage 4.

### Bishop vs pawns

- Bishop vs connected passed pawns, the "rule of the diagonal" (bishop stops pawns along one diagonal). Stage 4.

### Opposite-coloured bishops basics

- Strong drawing tendency: the defender blockades on squares of his bishop's colour; one extra pawn is usually a draw, sometimes even two. Stage 4.

### Simple rook endgames with extra pawn

- Activity over material: active rook + king; the "rook on the 7th" and cut-offs. Stage 4.

## Band 1800-2099 extended theory

### Vancura position

- R vs R+rook-pawn on the 6th with the attacking rook in front of the pawn: defender's rook attacks the pawn **from the side** (on the 6th rank) and the king stays near g7/h7, giving checks from the side when the attacking king approaches. Draw. Stage 5.
- FEN (draw): `R7/6k1/P4r2/8/8/4K3/8/8 w - - 0 1`

### Rook pawn rook endgames

- Rook in front of the a-pawn with pawn on the 7th: defender's king on g7/h7 and rook behind the pawn; the "Tarrasch / skewer" trick (Rh8! with Rxa7 Rh7+) when the defender's king is on the wrong squares. Stage 5.

### Corresponding squares

- Generalisation of opposition: pairs of squares where, if one king stands on one, the other king must stand on the corresponding square to hold. Used in complex pawn endgames (e.g., Lasker-Reichhelm 1901, mutual zugzwang mapping). Stage 5-6.

### Mutual zugzwang and trebuchet

- Trébuchet: both kings guarding each other's pawns; whoever moves loses. Stage 5.

### Bishop and knight mate

- K+B+N vs K: drive the king to the corner of the bishop's colour (Deletang triangle method or W-manoeuvre with the knight). Max 33 moves; must be done within 50 moves. Stage 5.

### Queen vs rook

- Generally a win (Philidor's winning position: defender in zugzwang, queen picks up the rook via a fork/skewer); requires technique against the third-rank/king-side defence; drawn exceptions only in special positions. Stage 5-6.

### Queen vs rook pawn or bishop pawn advanced

- Winning zone analysis: how close the attacking king must be to win against a/c/f/h-pawns on the 7th. Stage 5.

### Rook vs bishop

- Usually a draw: defending king in the corner **not** of the bishop's colour (the "safe corner" where the bishop can interpose from the side); in the wrong corner or with the king in the centre it can lose. Stage 5.

### Rook vs knight

- Usually a draw if the knight stays near its king and away from the corner/edge; loses if the knight is separated from its king. Stage 5.

### Bishop vs knight endgames

- Bishop better with pawns on both wings, open play, passed pawns; knight better with all pawns on one wing, blocked pawns on bishop's colour, outposts. Stage 5.

### Same-coloured bishops

- Centurini's rules for B+P vs B: the defender wins/draws depending on whether his bishop can control the pawn's path along a long enough diagonal. Stage 5-6.

### Opposite-coloured bishops advanced

- Winning with two connected passers on the 6th, or two pawns separated by at least two files (defender's king and bishop stretched); bishop-and-king coordination and the principle of the second weakness. Stage 5-6.

### Knight endgames

- Knight endings resemble pawn endings (Botvinnik): outside passers decisive, king activity, knight forks on promotion. Stage 5.

### Queen endgames

- Centralisation of the queen, shelter from checks, perpetual check for the defender; Q+P vs Q: central and knight pawns winning chances, defender's king in front of the pawn draws. Stage 5-6.

### R+2P vs R

- Connected pawns usually win; doubled or split pawns (f+h, the classic "f and h pawns") are often drawn. Stage 5-6.

### Rook vs two connected pawns

- Whether the rook wins depends on how advanced the pawns are and king positions (de la Villa ch. 5 [4]). Stage 5.

### Many-pawn rook endgames

- Activity of rook and king (Dvoretsky DEM ch. 9 [3]); 4 vs 3 and 3 vs 2 on the same side are usually drawn; the extra outside passed pawn wins more often. Stage 5-6.

## Band 2100-2299 deep theory

### Fortresses

- Positions where the stronger side cannot make progress despite material advantage: wrong-coloured bishop; opposite-coloured bishops blockade; Q vs R+P (rook on the 3rd defending a pawn on the 2nd, near the king); R+B vs R defence; minor piece vs rook with pawns on one side; "fortress with an extra exchange" in the middlegame. Recognising and building fortresses is a key master skill. Stage 6.

### Rook and bishop vs rook

- Theoretically drawn in general; winning positions include the Philidor position (defender on the edge in a specific configuration); defences: **Cochrane defence** (rook pins the bishop to the king) and **second-rank defence** (defender's rook on the second rank, king near the corner). Must be won/defended within 50 moves. Stage 6-7.

### Rook and knight vs rook

- Usually a draw; occasional wins with the defender's king trapped on the edge. Stage 7.

### Two knights vs pawn

- K+N+N vs K+P can win if the pawn is blockaded by a knight at or behind the **Troitzky line** (a4, b6, c5, d4, e4, f5, g6, h4 for a Black pawn); long wins exceeding the 50-move rule exist. Stage 7-8 (knowledge).

### Queen vs two rooks

- Roughly balanced; rooks win if coordinated and pawns can be attacked; queen seeks perpetual or forks. Stage 6.

### Queen vs rook and minor

- Usually drawn with balanced pawns; fortress concepts. Stage 7.

### Queen vs minor pieces

- Q vs two bishops (drawn in the fortress, else lost - Lolli/Kling-Horwitz defence), Q vs two knights (usually draw with knights mutually protected near the king). Stage 7.

### Rook endgames advanced technique

- Kling and Horwitz positions; "Karstedt/Grigoriev" rook vs pawn studies; rook endings with all pawns on one side (4 vs 3); the rook-and-pawn activity trade-offs; checking distance; "golden rule" of rook endgames (activity > material). Stage 6-7.

### Pawn endgame advanced

- Complex triangulation and corresponding-square problems (DEM ch. 1), reserve tempi, the "tempo count" in multi-pawn races. Stage 6.

### Endgame strategy

- Shereshevsky's principles: do not hurry, king centralisation, the two weaknesses principle, exchanging into winning pawn ending, schematic thinking. Stage 6-7.

## Band 2300 and above mastery

- Full DEM coverage, practical endgame decision-making under time pressure, tablebase-informed knowledge of 5-6 man key endings, playing technical endings against top resistance, swindles in lost endings, endgame studies (Saavedra, Troitzky, Kasparyan) as calculation training. Saavedra FEN (White wins with 6.c8=R!): `8/8/1KP5/3r4/8/8/8/k7 w - - 0 1`. Stage 7-8.

## Endgame competency checklist

| Band | Must know cold (play from memory vs bot, both sides) |
|---|---|
| 0-999 | KQ v K, KR v K, 2R/RQ ladder, stalemate traps, rule of the square, K+P v K basics |
| 1000-1399 | Opposition, key squares, rook pawn draw, wrong bishop, outside & protected passers, breakthrough, Q v P on 7th |
| 1400-1799 | Lucena, Philidor, cut-off, rook behind passer, triangulation, Réti, K+2B mate, N v P, OCB basics |
| 1800-2099 | Vancura, short/long side, a-pawn rook endings, K+B+N mate, Q v R, R v B, R v N, B v N, Centurini, Q endings, R+2P v R |
| 2100-2299 | Fortresses, R+B v R (Cochrane, 2nd-rank), corresponding squares, many-pawn rook endings, OCB advanced |
| 2300+ | DEM complete, Troitzky line, Q v 2R, Q v minors, practical endgame technique and studies |

## Sources

1. Silman, J. *Silman's Complete Endgame Course* (Siles Press) - publisher page: https://www.silmanjamespress.com/shop/chess/silmans-complete-endgame-course/
2. Chess Daily News, review of Silman's Complete Endgame Course (parts by rating; Lucena/Philidor in the 1400-1599 part): https://chessdailynews.com/?p=45746
3. Dvoretsky, M. *Dvoretsky's Endgame Manual* - Russell Enterprises excerpts: https://russell-enterprises.com/excerptsdownloads ; ChessBase review: https://en.chessbase.com/post/the-new-cd-dvoretsky-s-endgame-manual-
4. de la Villa, J. *100 Endgames You Must Know* (New In Chess): https://www.newinchess.com/100-endgames-you-must-know
5. Lichess study series "100 Endgames You Must Know": https://lichess.org/study/by/O102004/alphabetical
6. Shereshevsky, M. *Endgame Strategy*: https://en.wikipedia.org/wiki/Mikhail_Shereshevsky
7. Syzygy endgame tablebases (online probing): https://syzygy-tables.info/
8. Wikipedia, Lucena position: https://en.wikipedia.org/wiki/Lucena_position ; Philidor position: https://en.wikipedia.org/wiki/Philidor_position
9. Wikipedia, Troitzky line: https://en.wikipedia.org/wiki/Two_knights_endgame
10. Wikipedia, Saavedra position: https://en.wikipedia.org/wiki/Saavedra_position
