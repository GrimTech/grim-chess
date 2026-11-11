---
title: "Engine-Based Move-Quality Metrics: ACPL, Scaled Error, T1-Match, Lichess Accuracy, Chess.com CAPS"
summary: "Exact definitions (with source-code constants) of the move-quality metrics Grim Chess may compute, their known biases, and the canonical 'Grim-ACPL' and 'Grim-Accuracy' specifications that make platform numbers reproducible."
last_reviewed: 2026-11-11
sources:
  - https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/eval.scala
  - https://github.com/lichess-org/lila/blob/master/modules/analyse/src/main/AccuracyPercent.scala
  - https://github.com/lichess-org/lila/blob/master/modules/tree/src/main/Advice.scala
  - https://github.com/lichess-org/lila/pull/11148
  - https://lichess.org/page/accuracy
  - https://support.chess.com/en/articles/8708970-how-is-accuracy-in-analysis
  - https://cse.buffalo.edu/~regan/ChessSeminar/CSE702EloEvolution.pdf
  - https://www.cse.buffalo.edu//~regan/papers/pdf/ReHa11c.pdf
  - https://chessstats.gg/stats/methodology
  - https://chessanalysis.co/research/blunder-curve-blunders-by-rating-level
  - https://www.kingchess.io/blog/what-is-a-good-accuracy-in-chess/
  - https://chessenginelab.substack.com/p/accuracy-rapid-blitz
---

# Engine-Based Move-Quality Metrics

## 1. Average centipawn loss (ACPL)

For each move by the player:

```
CPL_t = max(0, eval_best(position_t) − eval_after(move_played_t))   [centipawns, from the mover's perspective]
ACPL  = mean_t CPL_t
```

**Known problems** (these change the numbers a lot, so they must be fixed in the spec):

| Choice | Effect | Evidence |
|---|---|---|
| Per-move cap | Uncapped mate or large-swing losses dominate the mean. Regan caps each blunder at 4.00 pawns [7] | High |
| Excluding decided positions | Errors made at ±5 pawns barely matter. Regan–Haworth skip positions beyond ±3 pawns, moves 1–8 and repetitions [8]. ChessStats.gg counts only "live" moves, i.e. those where neither side is ≥ 3 pawns ahead before and after the move [9] | High |
| Engine and depth | Stronger and deeper analysis changes the measured loss. ChessStats uses Stockfish 18 at 100k nodes (≈ depth 18) [9]. Regan uses Stockfish 16, single-PV, depth ≥ 20 and ≥ 5M nodes, and puts the resolution limit near 3100 Elo [7] | High |
| Position scaling | A centipawn means more in a level position. Regan found humans act as if a "marginal centipawn" has about 5× the impact at +0.20 as at +1.00 [8]. His **ASD** (average scaled difference) corrects for this | High |
| Time control | Faster play produces more error. GM median-accuracy-half games lose about 1.75% expected score per move in classical and 2.91% in blitz [12] | Moderate |

**A cautionary data point.** chessanalysis.co reports **Avg CPL 158–183** for Lichess rapid players in the 700–1800 band, with "blunder" defined as ≥ 300 cp and counts given for both players combined [10]. For roughly the same population ChessStats.gg reports ACPL 60–80 [9]. A 2–3× difference produced by methodology alone is why **no ACPL number may be quoted without its spec**.

## 2. Regan's metrics (FIDE OTB, classical)

- **T1-match (MM)**: share of moves that match the engine's first choice.
- **ASD / AE**: average scaled difference, in pawns.
- **Linear fit** against FIDE Elo on the 2024 Budapest Olympiad (Stockfish 16): **ASD = 0.3549 − 0.0001114 × Elo**, which gives ASD ≈ 0.199 at 1400 [7]. Unscaled ACPL (capped at 4.00) at 1400 is "about 0.45 [pawns] from the line, but … over 0.50 from the data" [7].
- Regan's conclusion: T1 and ASD "should be strictly linear with Elo rating across the whole spectrum of human skill levels" once the 2024 FIDE correction is applied. Some curvature remained in late-2024 data, and the line was linear again from January 2025 [7].

**Evidence strength: Moderate–High.** These are large OTB data sets from a leading researcher in the field, published as course notes, not peer-reviewed. See `08-regan-ipr-and-guid-bratko.md` for the full intrinsic-rating model.

## 3. Lichess accuracy: exact formulas from source

### 3.1 Win percentage [1][4]

```scala
val CEILING    = Cp(1000)
val MULTIPLIER = -0.00368208       // lila PR #11148
def winningChances(cp) = (2 / (1 + exp(MULTIPLIER * cp)) - 1).atLeast(-1).atMost(+1)
def WinPercent.fromCentiPawns(cp) = 50 + 50 * winningChances(cp.ceiled)    // cp clamped to ±1000
```

The equivalent form, as published on Lichess's accuracy page [5]:

```
Win% = 50 + 50 * (2 / (1 + exp(-0.00368208 * centipawns)) - 1)
```

The constant was fitted to real game data [5]. Mate scores are mapped to the ceiling before conversion.

### 3.2 Per-move accuracy [2]

```scala
if (after >= before) 100
else {
  val winDiff = before - after                      // in Win% points, mover's perspective
  val raw = 103.1668100711649 * exp(-0.04354415386753951 * winDiff) - 3.166924740191411
  raw + 1                                           // "uncertainty bonus (due to imperfect analysis)"
}.atMost(100).atLeast(0)
```

**Discrepancy to note.** The formula on the public accuracy page, `103.1668 * exp(-0.04354 * diff) - 3.1669` [5], **leaves out the +1 "uncertainty bonus"** that the production source code adds [2]. Grim Chess implements the source-code version so that its numbers can be reproduced against Lichess's own output. The page-text formula is kept only as documentation.

### 3.3 Game accuracy (aggregation) [2]

```
windowSize = clamp((numPositions - 1) / 10, 2, 8)
windows    = (windowSize - 2) copies of the first window, then sliding windows of size windowSize over all Win% values
weight_i   = clamp(stdev(Win% in window_i), 0.5, 12)        # volatility weight
gameAcc    = ( weightedMean(moveAcc, weight) + harmonicMean(moveAcc) ) / 2
```

### 3.4 Move classification thresholds [3]

A move is classed by the drop Δ in winningChances (scale −1…+1) from the mover's perspective:

| Class | Δ winningChances | ≈ Win% points | ≈ cp from an equal position |
|---|---|---|---|
| Inaccuracy | ≥ 0.1 | ≥ 5 | ≈ 55 |
| Mistake | ≥ 0.2 | ≥ 10 | ≈ 110 |
| Blunder | ≥ 0.3 | ≥ 15 | ≈ 167 |

The cp equivalents in the last column were computed for this review from the formula in 3.1.

**Worked values** (computed, starting from an equal position, before the +1 bonus): a 10 cp loss gives a per-move accuracy of about 96.9; 50 cp gives 82.3; 100 cp gives 67.2; 150 cp gives 55.2; 300 cp gives 32.4.

**Caveats published by Lichess** [5]: accuracy is "flawed to compare" with a test grade. Complex positions lower it and lopsided positions inflate it. Lower-rated players resign less, and long won endgames inflate their scores. The correlation with rating is "not straightforward". Lichess and Chess.com numbers cannot be compared with each other.

**Evidence strength: High** for the formulas (primary source code). **High** for the caveats (official page).

## 4. Chess.com accuracy (CAPS2)

Chess.com's Accuracy is "powered by CAPS2", a proprietary successor to the original CAPS algorithm. It replaced a scale that gave "very low scores to players who found many top moves" [6]. Scores run 0–100 and "fall mostly between 50 and 95". The scale is designed to "replicate the feeling of being graded on a test in school" [6]. The formula is not public. **Grim Chess must not attempt to reproduce CAPS2 or claim equivalence with it.** Measured medians by Chess.com rating are listed in `10-benchmarks-by-rating-band.md` [11].

**Evidence strength: Low** for any quantitative use, because the algorithm is closed.

## 5. Accuracy compresses rating differences

Measured Lichess rapid accuracy medians run from 66% (rating 400–599) to 89% (2400+). The **inter-quartile range within a band is about 15 points** (for example 69–86 at 1400–1599) [11]. A single game's accuracy therefore carries very little rating information: the spread within one band is about as large as the gap between bands 1,000 points apart. Aggregating 20 or more games and modelling move by move (Regan-style) are both essential.

## 6. Canonical platform specifications (normative)

**Grim-ACPL v1**
- Engine: Stockfish 17.x or later (pinned version recorded with every result), single-PV, ≥ 1,000,000 nodes per position. Reference runs use depth ≥ 20.
- Skip the player's first 8 moves, positions in a known opening book, repetitions, and **non-live positions** (|eval| > 300 cp both before and after the move).
- CPL per move capped at **400 cp**. Mate scores map to ±1000 cp before the cap.
- Report ACPL together with n (the number of counted moves) and the standard error SE = sd(CPL)/√n.

**Grim-ASD v1**: a scaled difference in the spirit of Regan's ASD, using the same filters plus the logarithmic scaling δ_scaled = ∫_{e_played}^{e_best} dx/(1 + |x|), with evaluations in pawns. This exact scaling is a **platform definition**: it follows Regan's position-value scaling idea [8] but is not his published constant set. Its values must be re-fitted against FIDE anchors before anyone compares them with Regan's 0.3549 − 0.0001114·Elo line. The function is published in the platform repo so auditors can recompute it.

**Grim-Accuracy v1**: the Lichess source-code formula (section 3, including the +1), computed on Grim-ACPL engine output.

**Blunder (platform):** Δ winningChances ≥ 0.3 (Lichess definition), counted on live moves only and reported per player per game.

## Sources

1. lichess-org/scalachess `eval.scala` (WinPercent, MULTIPLIER, CEILING). https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/eval.scala
2. lichess-org/lila `AccuracyPercent.scala`. https://github.com/lichess-org/lila/blob/master/modules/analyse/src/main/AccuracyPercent.scala
3. lichess-org/lila `Advice.scala` (judgement thresholds). https://github.com/lichess-org/lila/blob/master/modules/tree/src/main/Advice.scala
4. lichess-org/lila PR #11148 (multiplier fit; referenced in source). https://github.com/lichess-org/lila/pull/11148
5. Lichess, "Accuracy metric." https://lichess.org/page/accuracy
6. Chess.com Help, "How is Accuracy in Analysis determined?" https://support.chess.com/en/articles/8708970-how-is-accuracy-in-analysis
7. K. W. Regan, CSE702 S25 "Elo Ratings and Raw Metrics." https://cse.buffalo.edu/~regan/ChessSeminar/CSE702EloEvolution.pdf
8. K. W. Regan & G. McC. Haworth, "Intrinsic Chess Ratings," AAAI 2011. https://www.cse.buffalo.edu//~regan/papers/pdf/ReHa11c.pdf
9. ChessStats.gg, Methodology. https://chessstats.gg/stats/methodology
10. chessanalysis.co, "The Blunder Curve: Blunders by Rating Level." https://chessanalysis.co/research/blunder-curve-blunders-by-rating-level
11. KingChess, "What Is a Good Accuracy in Chess? Chess.com and Lichess by Rating" (Sep 2026 sample). https://www.kingchess.io/blog/what-is-a-good-accuracy-in-chess/
12. ChessEngineLab (jk_182), "Looking at the Quality of Rapid and Blitz Games." https://chessenginelab.substack.com/p/accuracy-rapid-blitz
