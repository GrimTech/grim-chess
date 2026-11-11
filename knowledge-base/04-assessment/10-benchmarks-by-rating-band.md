---
title: "Benchmark Values by Rating Band (400–2800)"
summary: "The consolidated benchmark table consumed via data/benchmarks.json: expected ACPL (rapid, classical), Lichess-formula accuracy, blunders per game, puzzle rating, FIDE percentile, engine-match and Regan ASD by FIDE-equivalent band, with the derivation of every number and a confidence grade."
last_reviewed: 2026-11-11
sources:
  - https://chessstats.gg/stats/lichess-rating-guide
  - https://chessstats.gg/stats/methodology
  - https://www.kingchess.io/blog/what-is-a-good-accuracy-in-chess/
  - https://cse.buffalo.edu/~regan/ChessSeminar/CSE702EloEvolution.pdf
  - https://www.cse.buffalo.edu//~regan/papers/pdf/ReHa11c.pdf
  - https://www.chessdojo.club/material/ratings
  - https://ramachess.com/articles/what-is-a-good-chess-rating/
  - https://chessenginelab.substack.com/p/accuracy-rapid-blitz
  - https://lichess.org/forum/general-chess-discussion/data-analysis-lichess-vs-fide-ratings
---

# Benchmark Values by Rating Band

> **Read this before you use the table.** No single published study measures ACPL, accuracy and blunder rate on FIDE-rated players across 400–2800. Every row below is **assembled** from several sources, each with its own methodology, and joined through a rating-conversion table. The values are **priors for the platform's own calibration study**. They are not ground truth. Each column has a confidence grade. In `data/benchmarks.json` these values carry `"status": "prior"` until they are replaced by platform-measured values.

## 1. The scale used: "GR" (Grim Rating, FIDE-equivalent)

- **GR ≥ 1400**: intended to equal the FIDE Standard rating, post-March-2024 scale.
- **GR < 1400**: no FIDE value exists (floor). GR is a logistic-Elo **extension**, anchored at 1400 and continued downward (`platform-measurement-model.md`). For mapping external data, GR < 1400 is taken as **Chess.com rapid + 300**. This makes GR 1400 ≈ Chess.com 1100 ≈ Lichess classical 1590, matching the ChessDojo row where FIDE 1400 meets Chess.com 1100–1200 and Lichess 1575–1630 [6].
- Lichess ratings were converted to GR with the ChessDojo table [6]. Lichess *rapid* was assumed ≈ Lichess *classical* (an assumption, not a measurement).

## 2. Benchmark table

| GR | Label | ≈ Lichess | ≈ Chess.com rapid | ACPL rapid ¹ | ACPL classical ² | Accuracy % ³ (IQR) | Blunders/game rapid ⁴ | Blunders/game classical ⁵ | Lichess puzzle ⁶ | FIDE percentile ⁷ |
|---|---|---|---|---|---|---|---|---|---|---|
| 400 | Absolute beginner | 940 | 100 | 87 | 75 | 72 (58–81) | 2.9 | 2.0 | 900 | below floor |
| 600 | Novice | 1080 | 300 | 78 | 69 | 74 (63–83) | 2.8 | 1.95 | 1050 | below floor |
| 800 | Beginner | 1220 | 500 | 73 | 64 | 76 (67–84) | 2.65 | 1.85 | 1200 | below floor |
| 1000 | Advanced beginner | 1340 | 700 | 68.5 | 58 | 77 (67–84) | 2.55 | 1.8 | 1350 | below floor |
| 1200 | Developing club player | 1470 | 900 | 63.5 | 53 | 78 (69–86) | 2.45 | 1.7 | 1450 | below floor |
| 1400 | Club player (FIDE floor) | 1590 | 1100 | 59.5 | 48 | 79 (69–86) | 2.35 | 1.65 | 1600 | 0 |
| 1600 | Club player | 1850 | 1550 | 52 | 42 | 81.5 (75–88) | 2.05 | 1.45 | 1750 | 32 |
| 1800 | Strong club player | 2090 | 1950 | 45 | 37 | 84 (78–90) | 1.75 | 1.2 | 1900 | 64 |
| 2000 | Expert | 2245 | 2190 | 40 | 32 | 86 (81–92) | 1.55 | 1.1 | 2100 | 87.2 |
| 2200 | CM-level | 2375 | 2370 | 36 | 26 | 88 (81–92) | 1.4 | 1.0 | 2300 | 96.4 |
| 2300 | FM-level | 2430 | 2460 | 34 | 24 | 88.5 (84–94) | 1.35 | 0.95 | 2400 | 98.5 |
| 2400 | IM-level | 2470 | 2550 | 33 | 21 | 89 (84–94) | 1.3 | 0.9 | 2500 | 99.48 |
| 2500 | GM-level | ≈2550* | n/a | 30.5 | 18 | 90* | 1.2 | 0.85 | 2650 | 99.85 |
| 2600 | Strong GM | n/a | n/a | 28* | 16 | 91* | 1.05* | 0.75* | 2750 | ≈99.96 |
| 2700 | Elite | n/a | n/a | 25.5* | 13 | 92* | 0.95* | 0.65* | 2900 | 99.994 |
| 2800 | World-championship level | n/a | n/a | 23* | 10 | 93* | 0.85* | 0.6* | 3050 | ≈99.9996 |

\* = extrapolated beyond the source data.

### Supplementary engine-agreement columns (classical OTB)

| GR | Regan ASD (SF16, pawns) ⁸ | Engine top-move match % (Rybka 3 d13) ⁹ |
|---|---|---|
| 1400 | 0.199 | n/a |
| 1600 | 0.177 | n/a |
| 1800 | 0.154 | 44.0 (re-mapped from pre-2024 ≈1670) |
| 2000 | 0.132 | 46.1 |
| 2200 | 0.110 | 48.3 |
| 2300 | 0.099 | 50.3 |
| 2400 | 0.088 | 51.8 |
| 2500 | 0.076 | 53.1 |
| 2600 | 0.065 | 54.2 |
| 2700 | 0.054 | 56.3 |
| 2800 | 0.043* | n/a |

## 3. How each column was derived

1. **ACPL rapid.** ChessStats.gg, Lichess rapid 10+0, Stockfish 18 at 100k nodes, live moves only, no stated per-move cap [1][2]. Published points: Lichess 600 → 107.7, 1000 → 79.4, 1500 → 60.6, 2000 → 46.4, 2500 → 30.4. These were placed at band midpoints and linearly interpolated at each GR's Lichess equivalent. Above 2550 the values are extrapolated using the blitz slope (2500 → 2800: 38.4 → 32.0) [1]. **Confidence: Moderate** for 1000–2400. **Low** elsewhere, because the source's sample size is undisclosed and the Lichess → FIDE mapping is uncertain.
2. **ACPL classical.** Derived from Regan's Stockfish-16 OTB line ASD = 0.3549 − 0.0001114·Elo [4], multiplied by **2.4**. That multiplier is the ACPL/ASD ratio implied at 1400, where Regan reports unscaled ACPL ≈ 0.45–0.50 against ASD ≈ 0.199 [4]. Assumes the ratio is constant across ratings, which is **unverified**. Below 1400 the line is extrapolated. **Confidence: Moderate** for the rank order and slope at 1400–2700. **Low** for absolute values below 1400 and at 2800.
3. **Accuracy %.** Measured medians of the Lichess formula on 404,358 Lichess rapid games from Sep 2026 (only games that someone requested analysis for, about 1 in 10, so a selection bias is possible). Values were cross-checked against Lichess's displayed accuracy on 202 games [3]. Interpolated at the GR's Lichess equivalent. IQR = middle half of games in the nearest source band. **Confidence: Moderate** for 600–2400. Extrapolated values (\*) are **Low**. Classical accuracy is not tabulated: no source.
4. **Blunders per game, rapid.** ChessStats.gg per-game figures: 3.1 at Lichess 600, 2.4 at 1500, 1.2 at 2500. A blunder there is a loss of ≥ 150 cp on a live move, counted per player [1][2]. That is close to the Lichess ≥ 0.3 winning-chances definition (≈ 167 cp from equality; `07-engine-move-quality-metrics.md`). **Confidence: Low–Moderate.**
5. **Blunders per game, classical** = 0.7 × rapid. The factor 0.7 is an assumption informed by GM expected-score loss per move: 1.75% classical vs 2.91% blitz, a ratio of 0.6, with rapid lying between [8]. **Confidence: Low.** The value is derived, not measured.
6. **Lichess puzzle rating.** Heuristic: about GR + 100 through the middle range, widening at the top, informed by a 230-player sample (median puzzle − FIDE gap 81) [9] and the inflation of top puzzle ratings. **Confidence: Low.** Do not use for user-facing claims.
7. **FIDE percentile** = share of FIDE-listed players (Oct 2026, all listed players) below the rating [7]. The 2600 and 2800 values are interpolations (`06-fide-population-statistics.md`). **Confidence: Moderate** (Low at 2600 and 2800).
8. **Regan ASD**: the line from [4], evaluated at each band. **Confidence: Moderate–High** (OTB classical, Stockfish 16).
9. **Engine match %**: actual T1-match values from Regan–Haworth 2006–09 [5]. These come from a 2011-era engine and setup and cannot be compared with Stockfish-17 match rates. **Confidence: High** for that setup only.

## 4. Sanity checks performed

- **Rapid is worse than classical at every band**, and the gap widens with strength (×1.16 at 400, ×1.7 at 2500). This is consistent with Anderson et al.'s finding that extra time helps stronger players more (`09-maia-and-rating-estimation-from-games.md`).
- **Accuracy compresses.** Across a 2,000-point span the medians move only about 17 points, while the IQR within a band is about 15–20 points. Accuracy is therefore not used alone for estimation.
- **Regan's line versus the derived classical ACPL at 2700**: 13 cp. Published ACPL for elite classical play (Lichess analyses of world-championship games) is commonly quoted at about 10–20 cp. That figure was not systematically verified in this review.

## 5. Required replacement study (normative)

Before any benchmark is shown to users as "typical for rating X", the platform must:

1. Draw a stratified sample of at least 2,000 games per band from the Lichess open database (CC0), rapid and classical separately, plus OTB PGNs of FIDE-rated events (for example TWIC) for classical bands of 1400 and above.
2. Analyse them with the pinned Grim-ACPL / Grim-Accuracy specifications (`07-engine-move-quality-metrics.md`).
3. Map Lichess ratings with an updated conversion fitted on FIDE-ID-verified accounts, or use OTB FIDE ratings directly for OTB games.
4. Publish medians, IQRs, n and a version date for every number, and replace the `"status": "prior"` values in `data/benchmarks.json`.

## Sources

1. ChessStats.gg, "The Lichess rating guide" (ACPL, blunders by band). https://chessstats.gg/stats/lichess-rating-guide
2. ChessStats.gg, Methodology (Stockfish 18 at 100k nodes; live moves; thresholds). https://chessstats.gg/stats/methodology
3. KingChess, "What Is a Good Accuracy in Chess? Chess.com and Lichess by Rating" (Sep 2026; 404,358 Lichess games, 21,112 Chess.com games). https://www.kingchess.io/blog/what-is-a-good-accuracy-in-chess/
4. K. W. Regan, CSE702 S25 "Elo Ratings and Raw Metrics." https://cse.buffalo.edu/~regan/ChessSeminar/CSE702EloEvolution.pdf
5. Regan & Haworth, "Intrinsic Chess Ratings," AAAI 2011. https://www.cse.buffalo.edu//~regan/papers/pdf/ReHa11c.pdf
6. ChessDojo rating conversion table (Sep 2024). https://www.chessdojo.club/material/ratings
7. Rama Chess, FIDE Oct 2026 percentile count. https://ramachess.com/articles/what-is-a-good-chess-rating/
8. ChessEngineLab, "Looking at the Quality of Rapid and Blitz Games." https://chessenginelab.substack.com/p/accuracy-rapid-blitz
9. Lichess forum, "Data analysis: Lichess vs FIDE ratings." https://lichess.org/forum/general-chess-discussion/data-analysis-lichess-vs-fide-ratings
