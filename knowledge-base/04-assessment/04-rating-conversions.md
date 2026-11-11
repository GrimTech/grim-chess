---
title: "Rating Conversions: Lichess, Chess.com, US Chess, ECF and Puzzle Ratings to FIDE"
summary: "The published conversion studies between online/national pools and post-2024 FIDE, with methods, sample sizes and error bands. Recommends the ChessDojo (Sep 2024) cohort table as the default prior and documents why every conversion is low-precision for an individual player."
last_reviewed: 2026-11-11
sources:
  - https://www.chessdojo.club/material/ratings
  - https://www.chessdojo.club/blog/new-ratings/noseknowsall
  - https://chessdojo.club/blog/new-ratings
  - https://chessgoals.com/rating-comparison/
  - https://www.chess.com/blog/SmarterChess/chessgoals-com-rating-comparisons
  - https://lichess.org/forum/general-chess-discussion/data-analysis-lichess-vs-fide-ratings
  - https://lichess.org/forum/general-chess-discussion/yet-another-lichess-vs-fide-rating-comparison
  - https://lichess.org/@/Peter_the_Head/blog/from-lichess-to-the-board-converting-online-blitz-ratings-to-fide-ratings/2qRac0JM
  - https://lichess.org/forum/general-chess-discussion/how-to-estimate-your-fide-rating-conversion-formula-inside
  - https://www.glicko.net/ratings/report25.pdf
  - https://lichess.org/@/mlatb/blog/correlation-between-rapidblitz-rating-and-puzzle-rating/H39ApaeR
  - https://lichess.org/@/capibarazul/blog/how-does-lichess-puzzle-storm-relates-to-blitzbullet-rating/YHjkeKJl
  - https://chessiverse.com/articles/how-chessiverse-ratings-work
---

# Rating Conversions to FIDE

## 0. Bottom line for auditors

- **No conversion study meets peer-review standards.** The best one available is the ChessDojo / NoseKnowsAll "Universal Rating Converter" (Sep 2024). It is the only study found that is (a) dated after the March 2024 FIDE adjustment, (b) built on thousands of players, and (c) tabulated across eight rating systems [1][2]. It still uses self-selected training-programme members and publishes no r values or residual errors [2].
- **Individual-level error is large.** One analysis linked real FIDE IDs and found that even its best Lichess-blitz model explained only about **36% of the variance** in FIDE rating (R² ≈ 0.36, r ≈ 0.6) [7]. Forum participants put individual uncertainty at roughly ±200 points or more [7]. Glickman's older USCF↔FIDE study likewise noted that a FIDE 2200 player could hold a USCF rating anywhere from about 1800 to 2450 [10].
- **Use conversions only as priors.** Use them, for example, to seed the Glicko-2 starting rating or to sanity-check results. **Never** use a conversion as the platform's FIDE-equivalent estimate.

## 1. Default conversion: ChessDojo cohort table (Sep 2024) [1][2]

Method [2]: thousands of ChessDojo members with low-RD Lichess-classical and/or Chess.com-rapid ratings who also had an OTB rating, plus the full FIDE, ACF, DWZ and ECF lists as of 1 Sep 2024. The table covers **Lichess classical** and **Chess.com rapid** only, not blitz or bullet [3]. Online ratings are judged unreliable above about 2310 (Lichess classical) and 2275 (Chess.com rapid), roughly the 99.5th and 99.9th percentiles [2]. FIDE has no values below 1400, because of the floor.

Selected rows (lower bounds of each cohort):

| Chess.com rapid | Lichess classical | FIDE (post-2024) | US Chess |
|---|---|---|---|
| 1100 | 1575 | 1400 | 970 |
| 1200 | 1630 | 1420 | 1060 |
| 1300 | 1700 | 1475 | 1150 |
| 1400 | 1765 | 1525 | 1250 |
| 1500 | 1825 | 1575 | 1350 |
| 1600 | 1880 | 1625 | 1450 |
| 1700 | 1940 | 1675 | 1550 |
| 1800 | 2000 | 1725 | 1650 |
| 1900 | 2060 | 1775 | 1750 |
| 2000 | 2120 | 1825 | 1850 |
| 2100 | 2180 | 1900 | 1970 |
| 2190 | 2245 | 2000 | 2100 |
| 2280 | 2315 | 2100 | 2200 |
| 2370 | 2375 | 2200 | 2300 |
| 2460 | 2430 | 2300 | 2400 |
| 2550 | 2470 | 2400 | 2500 |

Below FIDE 1400, the table continues for Chess.com and Lichess only. For example, Chess.com 500 ↔ Lichess 1220 and Chess.com 900 ↔ Lichess 1470 [1].

**Observations**

1. **Lichess runs high at the bottom and the offset shrinks toward the top.** Lichess classical exceeds FIDE by about 175 points near 1400 and by about 70 near 2400. Chess.com rapid sits *below* FIDE until about 2000 and *above* it at 2200+. This crossover agrees with other community observations: one source says the two sites converge around 2100 and Chess.com runs higher above that [13].
2. **The top of the table is thin.** Above Lichess 2470 / Chess.com 2550 no cohort conversion exists, so GM-level online ratings cannot be converted with this table.

**Evidence strength: Moderate–Low.** Large but self-selected sample, no published error statistics. Within-cohort spread of FIDE ratings is likely to be ±150–250 (inferred from [7][10]).

## 2. Other studies (for triangulation)

| Study | Data | Result | Era | Strength |
|---|---|---|---|---|
| ChessGoals rating comparison [4][5] | Chess.com↔USCF: "thousands" of players active in the last 45 days with > 25 games; Lichess side from a voluntary survey. **FIDE values were derived from USCF using a Glickman conversion formula**, not observed directly. Second-order polynomial fits with Chess.com blitz as predictor | Widely cited lookup table | Updated May 2020 (pre-2024 FIDE) | Low (indirect FIDE; superseded scale) |
| Lichess forum, 230 self-reported FIDE players of 11,235 sampled [6] | Medians of the differences: blitz 127, classical 196, puzzle 81 points (Lichess above FIDE) | Small sample. The author calls it "highly imperfect" | Undated, likely pre-2024 | Low |
| Lichess blitz regression, 1,606 profiles [8] | FIDE = 220.64 + 0.822 × Lichess blitz | Self-reported FIDE | Undated | Low |
| Lichess classical + blitz regression [9] | FIDE = 187 + 0.38 × classical + 0.48 × blitz | The author is "not too sure how accurate it is" | Undated | Low |
| Reddit-origin study with FIDE-ID linking [7] | Best Lichess-blitz model R² ≈ 0.36. Classical "close to random" as a predictor | Name/ID matching | Undated | Low–Moderate (best linking method, poor fit) |

**Pre-2024 data must be re-mapped.** For older studies, convert FIDE values below 2000 with R_new ≈ R_old + 0.4·(2000 − R_old). Example: the Lichess-blitz regression gives FIDE_old = 1659 at Lichess 1750, which maps to about 1795 on the current scale. See `01-elo-and-fide-rating-system.md`.

## 3. National federations (official or semi-official)

- **US Chess (official, 2025 correction, retroactive to 1 Mar 2024) [10].** Non-youth: USChess = −1073 + 1.5667·FIDE for FIDE ≤ 2000, and 20 + 1.02·FIDE above 2000. Inverse for FIDE ≤ 2000: FIDE = (USChess + 1073)/1.5667.
- **ECF (author's estimator, not ECF guidance) [2].** FIDE = ECF/1.4 + 510 for ECF < 2000. FIDE = ECF − 60 for players above 2000.

## 4. Puzzle ratings → playing strength

| Evidence | Finding | Strength |
|---|---|---|
| Lichess blog, puzzle vs blitz [11] | Linear fit, R² ≈ 0.72 (r ≈ 0.85) between puzzle and blitz rating | Low (method unclear; not retrieved directly, 403) |
| Lichess blog, Puzzle Storm [12] | r ≈ 0.86 Storm vs blitz/bullet, 0.835 vs rapid. A 0.684 figure is ambiguously attributed | Low |
| 230 self-reported FIDE players [6] | Median puzzle − FIDE gap = 81 points, smaller than the blitz (127) and classical (196) gaps | Low |
| Forum consensus [6][7] | Wide scatter. Puzzle rating depends heavily on volume, mode and pool | Low |

**Interpretation.** Within Lichess, puzzle rating correlates fairly well with blitz rating, at roughly r = 0.8. But each link in the chain (puzzle → Lichess blitz → FIDE) discards variance: 0.8 × 0.6 ≈ 0.5 overall. A puzzle rating on its own therefore predicts FIDE with an individual error of about ±300 points. **Grim Chess should use its own puzzle rating as a weak, separately calibrated signal** (see `platform-measurement-model.md`). The `lichessPuzzleToFide` points in `data/benchmarks.json` are a *heuristic prior* (Lichess puzzle ≈ FIDE + 50…250, the gap widening above 2400) and should be replaced once platform calibration data exist.

## 5. Recommended conversion functions

```python
import bisect
# piecewise-linear interpolation over the ChessDojo lower-bound table (Section 1)
LICHESS_CLASSICAL_TO_FIDE = [(1575,1400),(1630,1420),(1700,1475),(1765,1525),(1825,1575),(1880,1625),
    (1940,1675),(2000,1725),(2060,1775),(2120,1825),(2180,1900),(2245,2000),(2315,2100),(2375,2200),
    (2430,2300),(2470,2400)]
def interp(points, x):
    xs = [p[0] for p in points]
    if x <= xs[0]:  return None          # below FIDE floor: no FIDE equivalent
    if x >= xs[-1]: return None          # outside reliable range: do not extrapolate
    i = bisect.bisect_right(xs, x)
    (x0, y0), (x1, y1) = points[i-1], points[i]
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
# Report as prior only: mean = interp(...), sd = 200 (assumed; see Section 0)
```

## Sources

1. ChessDojo, "Rating conversion table" (cohorts across Chess.com, Lichess, FIDE, USCF, ECF, CFC, DWZ, ACF, KNSB). https://www.chessdojo.club/material/ratings
2. M. Franco (NoseKnowsAll) / ChessDojo, "Universal Rating Converter for 2024" (24 Sep 2024). https://www.chessdojo.club/blog/new-ratings/noseknowsall
3. ChessDojo, "The New Dojo Rating Translator" (15 Sep 2024). https://chessdojo.club/blog/new-ratings
4. ChessGoals, "Rating Comparison." https://chessgoals.com/rating-comparison/ (page body not machine-readable at review time)
5. SmarterChess (ChessGoals author), "ChessGoals.com Rating Comparisons" (updated 7 May 2020). https://www.chess.com/blog/SmarterChess/chessgoals-com-rating-comparisons
6. Lichess forum, "Data analysis: Lichess vs FIDE ratings." https://lichess.org/forum/general-chess-discussion/data-analysis-lichess-vs-fide-ratings
7. Lichess forum, "Yet another lichess vs FIDE rating comparison." https://lichess.org/forum/general-chess-discussion/yet-another-lichess-vs-fide-rating-comparison
8. Peter_the_Head, "From Lichess to the board: converting online blitz ratings to FIDE" (Lichess blog; formula via search-engine extract, page returned 403). https://lichess.org/@/Peter_the_Head/blog/from-lichess-to-the-board-converting-online-blitz-ratings-to-fide-ratings/2qRac0JM
9. Lichess forum, "How to estimate your FIDE rating (conversion formula inside)." https://lichess.org/forum/general-chess-discussion/how-to-estimate-your-fide-rating-conversion-formula-inside
10. US Chess Ratings Committee Annual Report 2025. https://www.glicko.net/ratings/report25.pdf (also Glickman's earlier USCF↔FIDE note, reported via search extract)
11. mlatb, "Correlation between rapid/blitz rating and puzzle rating" (Lichess blog; via search extract). https://lichess.org/@/mlatb/blog/correlation-between-rapidblitz-rating-and-puzzle-rating/H39ApaeR
12. capibarazul, "How does Lichess Puzzle Storm relate to blitz/bullet rating" (Lichess blog; via search extract). https://lichess.org/@/capibarazul/blog/how-does-lichess-puzzle-storm-relates-to-blitzbullet-rating/YHjkeKJl
13. Chessiverse, "How Chessiverse ratings work." https://chessiverse.com/articles/how-chessiverse-ratings-work
