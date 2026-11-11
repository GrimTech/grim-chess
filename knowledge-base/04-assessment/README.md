---
title: "04-assessment: Index"
summary: "Index of the Grim Chess assessment knowledge base: rating systems, FIDE titles, engine-based skill measurement, standardized tests, engine calibration, benchmark table, and the platform measurement model, with an evidence-strength key for auditors."
last_reviewed: 2026-11-11
sources:
  - https://handbook.fide.com/chapter/B022024
  - https://handbook.fide.com/chapter/B012024
  - http://www.glicko.net/glicko/glicko2.pdf
  - https://cse.buffalo.edu/~regan/ChessSeminar/CSE702EloEvolution.pdf
  - https://www.ejwagenmakers.com/2005/VanderMaasWagenmakersACTpaper.pdf
---

# 04-assessment: Index

**Requirement served:** learner progress must be **measurable** and **comparable to real-life masters and grandmasters**. This section defines the target scale (post-2024 FIDE Standard) [1], the instruments that can measure strength against it, the published evidence for each instrument, and the model that combines them into an auditable *Estimated FIDE-equivalent rating* with a confidence interval.

## Files

| # | File | What it settles |
|---|---|---|
| 01 | [01-elo-and-fide-rating-system.md](01-elo-and-fide-rating-system.md) | FIDE Elo mechanics in force: P_D table, K-factors, 400-point rule (2025 amendment), initial ratings, the **1400 floor**, the 2024 compression |
| 02 | [02-glicko-and-glicko2.md](02-glicko-and-glicko2.md) | Full Glicko-1 and Glicko-2 algorithms, test vector, Lichess deviations, platform parameters [3] |
| 03 | [03-uscf-and-online-rating-pools.md](03-uscf-and-online-rating-pools.md) | Why US Chess, Chess.com and Lichess numbers differ; official FIDE→US Chess formulas |
| 04 | [04-rating-conversions.md](04-rating-conversions.md) | Lichess, Chess.com, US Chess, ECF and puzzle ratings → FIDE: the studies, their errors, recommended functions |
| 05 | [05-fide-titles-and-norms.md](05-fide-titles-and-norms.md) | Exact CM/FM/IM/GM and women's title requirements, norm rules, 2024–2026 changes [2] |
| 06 | [06-fide-population-statistics.md](06-fide-population-statistics.md) | FIDE percentiles (Oct 2026), band counts, titled population |
| 07 | [07-engine-move-quality-metrics.md](07-engine-move-quality-metrics.md) | ACPL, ASD, T1, **exact Lichess accuracy code**, CAPS2; canonical Grim-ACPL and Grim-Accuracy specs |
| 08 | [08-regan-ipr-and-guid-bratko.md](08-regan-ipr-and-guid-bratko.md) | Regan's Elo↔move-quality tables and IPR formula; the Guid–Bratko studies [4] |
| 09 | [09-maia-and-rating-estimation-from-games.md](09-maia-and-rating-estimation-from-games.md) | Maia move-matching by band, rating-from-moves ML (MAE 182), Anderson et al. on blunders; precision budget |
| 10 | [10-benchmarks-by-rating-band.md](10-benchmarks-by-rating-band.md) | **The benchmark table** (400–2800): ACPL, accuracy, blunders, puzzle, percentile, with derivations |
| 11 | [11-standardized-chess-tests.md](11-standardized-chess-tests.md) | Bratko–Kopec, BT, STS, WAC, the **Amsterdam Chess Test** (full validity data [5]), recall, cognitive correlates |
| 12 | [12-engine-strength-calibration.md](12-engine-strength-calibration.md) | Stockfish UCI_Elo/Skill Level: what they are calibrated on; why bot Elo ≠ FIDE; bot anchoring protocol |
| 13 | [13-assessment-battery-design.md](13-assessment-battery-design.md) | The recommended IRT/CAT assessment battery, item bank, scoring, acceptance criteria |
| ★ | [platform-measurement-model.md](platform-measurement-model.md) | **The measurement model:** signals, GLS fusion, CI, progress, title-equivalent milestones, validation, claims policy |
| 14 | [14-evidence-register-and-open-questions.md](14-evidence-register-and-open-questions.md) | Verification status of every load-bearing claim, discrepancies found, blocking open questions |

**Machine-readable companion:** `data/benchmarks.json` (titles, bands, conversions, accuracy formulas, Stockfish calibration, Glicko-2 constants and test vector, measurement-model priors). Every value carries a `source`. Band values carry `"status": "prior"`.

## Evidence-strength key (used in every file)

- **High**: primary source (regulation text, source code, the author's own peer-reviewed paper), verified in this review.
- **Moderate**: reputable secondary source or non-peer-reviewed primary material with disclosed method (e.g. course notes, large disclosed-method data analyses).
- **Low**: community analyses with undisclosed or self-selected samples, heuristics, or values derived by this review.
- **Unverified / conflicting**: explicitly flagged and not used for user-facing claims.

## Top-line conclusions for auditors

1. **The platform can measure progress precisely.** Its absolute FIDE-equivalence is only as good as its anchor study. Shared calibration error cancels in progress measurements but not in absolute claims (`platform-measurement-model.md` §5).
2. **No FIDE equivalent exists below 1400.** Values below 1400 are labelled as an extended scale [1].
3. **Single-game metrics (accuracy, ACPL) are weak rating estimators.** Their individual error exceeds ±200 (`09-maia-and-rating-estimation-from-games.md` §4). The battery (ACT-style, r ≈ .8 with Elo [5]) and calibrated game results carry most of the information.
4. **Stockfish UCI_Elo is an engine-pool rating** (CCRL Blitz via Stash, 120+1). It has never been calibrated against humans.
5. **Real titles and norms cannot be earned on the platform.** The claims policy forbids implying otherwise [2].

## Sources

1. FIDE Rating Regulations (effective 1 Mar 2024). https://handbook.fide.com/chapter/B022024
2. FIDE Title Regulations (effective 1 Jan 2024). https://handbook.fide.com/chapter/B012024
3. Glickman, "Example of the Glicko-2 system." http://www.glicko.net/glicko/glicko2.pdf
4. Regan, CSE702 S25 "Elo Ratings and Raw Metrics." https://cse.buffalo.edu/~regan/ChessSeminar/CSE702EloEvolution.pdf
5. van der Maas & Wagenmakers (2005), "A psychometric analysis of chess expertise." https://www.ejwagenmakers.com/2005/VanderMaasWagenmakersACTpaper.pdf
