---
title: "Evidence Register, Verification Status and Open Questions (04-assessment)"
summary: "Auditor-facing register of every load-bearing claim in this section, its verification status (primary / secondary / derived / unverified), known discrepancies found during review, and the open research questions that block public FIDE-equivalent claims."
last_reviewed: 2026-11-11
sources:
  - https://handbook.fide.com/chapter/B022024
  - https://handbook.fide.com/chapter/B012024
  - http://www.glicko.net/glicko/glicko2.pdf
  - https://github.com/lichess-org/lila/blob/master/modules/analyse/src/main/AccuracyPercent.scala
  - https://lichess.org/page/accuracy
  - https://raw.githubusercontent.com/official-stockfish/Stockfish/master/src/search.h
  - https://github.com/official-stockfish/Stockfish/pull/4341
  - https://cse.buffalo.edu/~regan/ChessSeminar/CSE702EloEvolution.pdf
  - https://www.ejwagenmakers.com/2005/VanderMaasWagenmakersACTpaper.pdf
---

# Evidence Register and Open Questions

Status legend:
- **P**: verified against a primary source (regulation text, source code, or the author's own paper) during this review.
- **S**: secondary source only.
- **D**: derived by this review (calculation or interpolation).
- **U**: unverified or conflicting.

## 1. Register of load-bearing claims

| # | Claim | Status | Where used |
|---|---|---|---|
| 1 | FIDE floor 1400; regulations in force 1 Mar 2024; K = 40/20/10 rules; K·n ≤ 700 [1] | P | 01, model |
| 2 | 400-point rule capped at 400 below 2650, full difference at ≥ 2650 (from 1 Oct 2025) [1] | P | 01 |
| 3 | One-off +0.4·(2000 − R) for players < 2000, 1 Mar 2024 | S (Chess.com news, Sonas proposal) | 01, 04, 08 |
| 4 | Title thresholds GM 2500, IM 2400, FM 2300, CM 2200, WGM 2300, WIM 2200, WFM 2100, WCM 2000; norm Rp 2600/2450/2400/2250 [2] | P | 05, JSON |
| 5 | Glicko-2 algorithm and worked example (1464.06 / 151.52 / 0.05999) [3] | P + D (re-computed) | 02, JSON |
| 6 | Lichess WinPercent multiplier −0.00368208, cp ceiling ±1000 | P (scalachess source) | 07, JSON |
| 7 | Lichess move accuracy: 103.1668100711649·exp(−0.04354415386753951·Δ) − 3.166924740191411 **+ 1**, clamped 0–100 [4] | P | 07, JSON |
| 8 | Lichess thresholds 0.1 / 0.2 / 0.3 winning-chances for inaccuracy / mistake / blunder | P | 07 |
| 9 | Stockfish UCI_Elo 1320–3190; cubic Skill(Elo); anchored to Stash on CCRL Blitz at 120+1 since Jan 2023 [6][7] | P | 12, JSON |
| 10 | Stockfish skill → Elo inverse table | D (from the source polynomial) | 12, JSON |
| 11 | Regan ASD = 0.3549 − 0.0001114·Elo (SF16, Budapest 2024) [8] | P (author's course notes) | 07, 08, 10, model |
| 12 | IPR = 3571 − 15413·AE_e (Rybka 3 d13) | P (author's working draft) | 08 |
| 13 | ACT reliabilities and validities; regression SE 167–181 [9] | P (paper text extracted) | 11, 13, model |
| 14 | ChessDojo conversion table (Sep 2024) | S (published table, method partly undisclosed) | 04, 10, JSON |
| 15 | FIDE percentiles (Oct 2026 list count) | S | 06, 10, JSON |
| 16 | Title-holder counts (May 2026) | S (Wikipedia citing FIDE) | 05 |
| 17 | Lichess accuracy medians by band (Sep 2026, 404k games) | S (methodology disclosed, independent site) | 10, JSON |
| 18 | ChessStats ACPL and blunder rates by band | S (methodology disclosed; sample size not) | 10, JSON |
| 19 | Classical ACPL = 2.4 × Regan ASD | D (ratio assumed constant) | 10, JSON |
| 20 | Classical blunders = 0.7 × rapid | D (assumption) | 10, JSON |
| 21 | Puzzle ↔ GR mapping | D / U (heuristic) | 04, 10, JSON |
| 22 | US Chess K / bonus formulas | U (spec PDF not retrievable) | 03 |
| 23 | BT-2450/2630 formula | U (sources conflict) | 11 |
| 24 | Lichess Glicko-2 τ = 0.75 | S (auto-generated code summary) | 02 |
| 25 | Measurement-model priors (σ_map etc.) | D (design choices to be fitted) | model, JSON |

## 2. Discrepancies found during review

1. **Lichess accuracy: page vs code.** The public formula [5] omits the **+1 "uncertainty bonus"** that the production code applies [4]. The brief's formula also omits it. `benchmarks.json` gives both and marks the code version as normative.
2. **Sign convention.** The scalachess code stores the multiplier as **−0.00368208** and computes exp(MULTIPLIER·cp). The page writes exp(−0.00368208·cp). The two are equivalent. Implementers must not double-negate.
3. **Stockfish calibration text.** Some documentation and copies of older READMEs still say UCI_Elo is "calibrated at 60s+0.6s and anchored to CCRL 40/4". That describes the 2019 calibration (PR #2225). The current calibration (PR #4341, Jan 2023) is 120+1 against CCRL Blitz via Stash, ±100 [7]. The brief's "CCRL 40/4?" question is answered: **no longer**.
4. **UCI_Elo upper end.** At UCI_Elo = 3190 the polynomial yields Skill ≈ 18.38, not 19 (computed). Integer Skill 19 is reachable only through `Skill Level`.
5. **ChessGoals FIDE column.** It is computed from USCF with a Glickman formula, not observed directly (see `04-rating-conversions.md`). It also predates the 2024 FIDE adjustment.
6. **ACPL magnitudes vary 2–3× by method.** chessanalysis.co reports ACPL 158–183 at club level against ChessStats 60–80, for similar populations.
7. **"Ivanov / Ilyumzhinov" test suites.** No evidence that these exist as Elo-estimation suites (see `11-standardized-chess-tests.md`).

## 3. Open questions blocking public FIDE-equivalent claims

| # | Question | How to resolve | Blocking? |
|---|---|---|---|
| Q1 | Offset between bot-pool and FIDE ratings at the platform's standard time control | Anchor panel (model §8) | **Yes** |
| Q2 | Intercept and slope of move quality vs FIDE for online rapid (vs Regan's OTB classical) | Anchor panel + TWIC OTB games | **Yes** |
| Q3 | Online-rapid → classical time-control offset (Δ_tc) | Anchors playing both | **Yes** for classical claims |
| Q4 | Battery validity on the platform population | Field test, N ≥ 1,500 responses/item bank | Yes for B weight > 0 |
| Q5 | Constancy of the ACPL/ASD ratio across ratings | Re-analysis of TWIC with both metrics | No (display only) |
| Q6 | Benchmarks for GR < 1400 (no FIDE ground truth) | Calibrate via Chess.com/Lichess-anchored users and bot ladders; label as extended scale | No (extended scale is labelled) |
| Q7 | Junior lag and age effects (ACT: about 3.5–4 points per year) | Subgroup analysis | No, but must be reported |
| Q8 | Re-derive FIDE percentiles from the official list for each release | Data pipeline | No |

## Sources

1. FIDE Rating Regulations 2024. https://handbook.fide.com/chapter/B022024
2. FIDE Title Regulations 2024. https://handbook.fide.com/chapter/B012024
3. Glickman, Glicko-2 example. http://www.glicko.net/glicko/glicko2.pdf
4. lila `AccuracyPercent.scala`. https://github.com/lichess-org/lila/blob/master/modules/analyse/src/main/AccuracyPercent.scala
5. Lichess accuracy page. https://lichess.org/page/accuracy
6. Stockfish `search.h`. https://raw.githubusercontent.com/official-stockfish/Stockfish/master/src/search.h
7. Stockfish PR #4341. https://github.com/official-stockfish/Stockfish/pull/4341
8. Regan CSE702 notes. https://cse.buffalo.edu/~regan/ChessSeminar/CSE702EloEvolution.pdf
9. van der Maas & Wagenmakers (2005). https://www.ejwagenmakers.com/2005/VanderMaasWagenmakersACTpaper.pdf
