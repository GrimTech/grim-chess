---
title: "Grim Chess Assessment Battery: Design Specification"
summary: "Recommended standardized, IRT-scored, computer-adaptive assessment battery (choose-a-move core plus diagnostics) modelled on the Amsterdam Chess Test, with item-bank construction, scoring formulas, reliability targets, validation and security requirements."
last_reviewed: 2026-11-11
sources:
  - https://www.ejwagenmakers.com/2005/VanderMaasWagenmakersACTpaper.pdf
  - https://rdrr.io/cran/LNIRT/man/AmsterdamChess.html
  - https://arxiv.org/pdf/1606.04956
  - https://arxiv.org/pdf/2006.01855
  - https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5323477/
  - https://eprints.lse.ac.uk/102241
  - https://www.chessprogramming.org/Test-Positions
  - https://database.lichess.org/
---

# Grim Chess Assessment Battery: Design Specification

## 1. Design goals

1. **An independent signal.** It measures skill on *standardized* positions, so it does not depend on which opponents a player met or which positions a game reached. Anderson et al. showed position difficulty dominates error prediction, so a standardized difficulty mix is essential [3].
2. **Known measurement error** for every score (IRT standard error).
3. **Empirical FIDE calibration**, following the ACT model (choose-a-move r ≈ .77–.81 with Elo; regression SE ≈ 167–181) [1].
4. **Short administration**: ≤ 25 minutes for the core module, delivered adaptively.

## 2. Modules

| Module | Purpose | Items per sitting | Time per item | Scoring | Feeds rating? | Evidence basis |
|---|---|---|---|---|---|---|
| **M1 Choose-a-move (core)** | Overall playing strength | 30 (CAT) drawn from a bank of ≥ 1,500 | 30 s at the 1400–2000 level, up to 60 s at the 2200+ level | 2PL IRT with response-time weighting | **Yes** | ACT choose-a-move α .87–.90, r .77–.81 [1] |
| ↳ blueprint | 50% tactical, 25% positional, 25% endgame | | | subscale θ for diagnostics | | ACT subscales α .60–.86 [1] |
| **M2 Evaluate-and-compare** | Positional judgment | 10 | 45 s | Pick the better of two candidate moves, with engine Δ ≥ 50 cp | Diagnostic | Predict-a-move r .63 [1] |
| **M3 Endgame knowledge** | Theoretical endgames (Lucena, Philidor, opposition, K+P) | 12 | 60 s | Tablebase-verified answer, correct/incorrect | Gate only | Tablebase ground truth [3] |
| **M4 Opening principles / repertoire** | Opening knowledge | 10 | 30 s | Correct/incorrect | Gate only | Verbal knowledge r .55 [1] |
| **M5 Recall (5 s exposure)** | Pattern memory | 6 (game positions only) | 5 s view + reconstruction | Pieces correctly placed | Diagnostic | Recall r .51; random positions .25 [1]; r̄ .41 across domains [5] |

Motivation questionnaires (ACT r = .22) and general cognitive tests (r̄ ≈ .24 [6]) are **excluded** from rating estimation.

## 3. Item bank construction

1. **Sources.** Positions from the Lichess open database (CC0) [8] and from OTB games. Engine suites (WAC, STS, BK, Arasan) may be **screened** as candidate items, but their keys must be re-verified [7].
2. **Key verification.** Stockfish (pinned version) at depth ≥ 30 or with a tablebase. An item counts as having a unique solution only if the best move beats the second-best by **≥ 150 cp** (tactical) or **≥ 60 cp** (positional), and the margin holds at two depths.
3. **Difficulty priors.** Use Maia predicted-move probabilities per band and empirical solve rates from Lichess puzzle statistics [4]. Real calibration comes from field testing: at least 300 responses per item, spread across bands.
4. **IRT fit.** Use the 2PL model. In the ACT the 1PL (Rasch) model did not fit and the 2PL did [1]. Drop items with discrimination a < 0.5, or with DIF across age or sex groups (Mantel–Haenszel |Δ| > 1.5).
5. **Exposure control.** Use Sympson–Hetter with a maximum exposure rate of 0.2. Retire items once they are seen publicly.

## 4. Scoring

**Item response function (2PL):**
```
P_i(θ) = 1 / (1 + exp(−a_i (θ − b_i)))
```

**Ability estimate.** EAP estimate with prior N(μ₀, 1). μ₀ is taken from the user's current fused GR, transformed to θ, which shrinks extreme estimates.

```
θ̂ = ∫ θ L(θ) π(θ) dθ / ∫ L(θ) π(θ) dθ,     L(θ) = Π_i P_i(θ)^{u_i} (1 − P_i(θ))^{1 − u_i}
SE(θ̂) = sqrt( posterior variance )
```

**Response-time adjustment** (optional, after validation). For correct responses, add the CISRT-style bonus w·(median_RT_i − RT)/median_RT_i, capped at ±0.25 of an item's credit. In the ACT, latency weighting raised validity for easy items, and mean RT on correct items correlated −.26 to −.30 with Elo [1].

**Mapping to GR (FIDE-equivalent):**
```
GR_battery = α + β · θ̂                (fit by Deming regression on anchor players with verified FIDE ratings)
σ_battery² = β² · SE(θ̂)² + σ_map²     (σ_map = residual SD of the anchor regression after removing θ measurement error)
```

Starting prior values before platform calibration: β ≈ 300 GR per θ unit, σ_map ≈ 150. These follow from the ACT: SE 167–181 at r = .77–.81 implies a sample Elo SD of about 285–310 (SD = SE/√(1 − r²)) [1].

**Stopping rule (CAT).** Stop when SE(θ̂) ≤ 0.30 (≈ ±90 GR at β = 300) or after 30 items.

## 5. Reliability and validity targets (acceptance criteria)

| Criterion | Target | ACT benchmark [1] |
|---|---|---|
| Marginal reliability (IRT) / α of the core module | ≥ 0.88 | .87–.90 |
| Test–retest (2–4 weeks) | r ≥ 0.85 | not reported |
| Correlation with verified FIDE rating | r ≥ 0.75 | .77–.81 |
| SE of the GR estimate | ≤ 175 | 167–181 |
| Within-band validity (< 1800, 1800–2200, > 2200) | r ≥ 0.4 in each band | shown to hold [1] |
| Coverage of the 95% interval (anchor sample) | 93–97% | n/a |
| DIF flags | none above threshold for age group, sex, language | n/a |

## 6. Administration and security

- Proctoring is not possible, so the battery is **not** accepted as the sole basis for any milestone. The model requires corroboration from game-based signals (`platform-measurement-model.md`).
- Engine-assistance detection. Flag sessions with abnormal response-time profiles, or with accuracy on hard items far above the user's θ trajectory (z > 3). Flagged sessions are excluded from fusion.
- Retest interval ≥ 14 days. Items are not repeated within 180 days.
- Children: separate norms and age-appropriate time limits. The ACT found that young players' Elo lags their ability by about 3.5–4 points per year of age [1]. Coordinate with the 05-children knowledge base.

## Sources

1. van der Maas & Wagenmakers (2005), "A psychometric analysis of chess expertise," *Am. J. Psychol.* 118(1):29–60. https://www.ejwagenmakers.com/2005/VanderMaasWagenmakersACTpaper.pdf
2. LNIRT `AmsterdamChess` dataset (for re-analysis and IRT prototyping). https://rdrr.io/cran/LNIRT/man/AmsterdamChess.html
3. Anderson, Kleinberg, Mullainathan, "Assessing Human Error Against a Benchmark of Perfection." https://arxiv.org/pdf/1606.04956
4. McIlroy-Young et al., "Aligning Superhuman AI with Human Behavior," KDD 2020. https://arxiv.org/pdf/2006.01855
5. Sala & Gobet (2017), *Memory & Cognition* 45:183–193. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5323477/
6. Burgoyne et al. (2016), *Intelligence* 59:72–83. https://eprints.lse.ac.uk/102241
7. Chess Programming Wiki, "Test-Positions." https://www.chessprogramming.org/Test-Positions
8. Lichess open database (CC0). https://database.lichess.org/
