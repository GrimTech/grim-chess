---
title: "Grim Chess Platform Measurement Model (v1)"
summary: "The recommended model for producing an auditable 'Estimated FIDE-equivalent rating' with confidence interval: signals, per-signal estimators and error budgets, GLS fusion with shared-calibration covariance, consistency testing, progress measurement, title-equivalent milestone rules, validation protocol, and the claims policy (what the platform may and may not say)."
last_reviewed: 2026-11-11
sources:
  - https://handbook.fide.com/chapter/B022024
  - https://handbook.fide.com/chapter/B012024
  - http://www.glicko.net/glicko/glicko2.pdf
  - https://cse.buffalo.edu/~regan/ChessSeminar/CSE702EloEvolution.pdf
  - https://cse.buffalo.edu/~regan/papers/pdf/Reg12IPRs.pdf
  - https://www.ejwagenmakers.com/2005/VanderMaasWagenmakersACTpaper.pdf
  - https://arxiv.org/abs/2409.11506
  - https://arxiv.org/pdf/2006.01855
  - https://github.com/official-stockfish/Stockfish/pull/4341
  - https://www.chessdojo.club/material/ratings
  - https://lichess.org/page/accuracy
---

# Grim Chess Platform Measurement Model (v1)

**Status.** Recommended design. All numeric defaults marked *prior* must be replaced by values fitted in the validation study (§8) before the platform shows FIDE-equivalent claims to the public.

## 1. Construct and scale

- **Construct.** Over-the-board classical playing strength as measured by FIDE Standard ratings. The scale is post-1-March-2024, logistic Elo with 400 points = 10:1 odds [1].
- **Grim Rating (GR).** The platform's estimate on that scale.
  - **GR ≥ 1400**: an *estimated FIDE-equivalent rating*.
  - **GR < 1400**: below the FIDE floor [1]. GR continues as a logistic extension, defined by expected scores against bots anchored at ≥ 1400. It is labelled "Grim Rating (extended scale; no FIDE equivalent)".
- Every reported GR comes with a **standard error (SE)** and an **interval**: 95% = GR ± 1.96·SE, and an 80% band = GR ± 1.28·SE.

## 2. Signals

| ID | Signal | Estimator | Notes |
|---|---|---|---|
| **G** | Rated games against **anchored bots** and humans at the standard time control (default 15+10 rapid; classical-online 45+15 supported) | Glicko-2 (`02-glicko-and-glicko2.md`). Bots have fixed ratings, with RD equal to their anchoring SE (`12-engine-strength-calibration.md`) | The primary signal |
| **M** | Move quality in the same rated games | Grim-ASD → GR via a calibrated line (Regan-style; `07`, `08`) | Shares the games with G, so the two are partially correlated |
| **P** | Platform puzzle rating | Glicko-2 against puzzle items, then a linear map to GR | Weak signal (`04-rating-conversions.md`) |
| **B** | Assessment battery (choose-a-move CAT) | 2PL EAP θ, then a linear map to GR (`13-assessment-battery-design.md`) | Independent of the opponents a player met |
| **X** | External rating (optional, consented) | A verified FIDE rating enters as a strong prior. Self-reported online ratings enter as weak priors via the ChessDojo table | A FIDE rating must be verified by FIDE ID before it counts as X_FIDE |
| **K** | Knowledge checks (endgame M3, openings M4) | Pass/fail per level | **Gate only.** Never enters GR |

## 3. Per-signal estimate and variance

Notation: each signal i provides an estimate x_i on the GR scale and a variance V_i = σ_stat,i² + σ_map,i² + σ_age,i².

**G: games**
```
x_G      = r_G + Δ_tc                                     # Δ_tc = time-control offset (0 at the standard TC)
σ_stat,G = RD_G                                           # Glicko-2 RD
σ_map,G  = σ_anchor = 50   (prior; target ≤ 40)           # bot-pool → FIDE anchoring error
         ⊕ σ_tc = 100 when the TC is not standard          # ⊕ = root-sum-square
```

**M: move quality** (rolling 90 days, live moves only)
```
ASD̄     = mean scaled error over n live moves
x_M      = A_tc − B_tc · ASD̄
            prior for classical OTB-like play (Regan SF16): A = 3186, B = 8977  [4]
            prior for online rapid: same B, with A refitted (expected lower intercept); until fitted, σ_map,M = 150
σ_stat,M = 1.4 · B · sd(scaled error per move) / sqrt(n_eff)      # 1.4 = Regan model-error inflation [5]
n_eff    = n / (1 + 2ρ₁)            ρ₁ = lag-1 autocorrelation of per-move errors (prior 0.1)
σ_map,M  = 120 (prior)
```
Raw ACPL and Lichess-formula accuracy are **displayed** but are not inputs to x_M, because they are less linear in Elo and more distorted by position mix [4][11].

**P: puzzles**
```
x_P      = a_P + b_P · r_P          prior: a_P = −100, b_P = 1.0 (puzzle rating runs ≈ 100 above GR mid-range)
σ_stat,P = b_P · RD_P
σ_map,P  = 250 (prior)
```

**B: battery**
```
x_B      = α + β · θ̂               prior: β = 300 per θ unit, α set so that θ = 0 ↔ GR 1700
σ_stat,B = β · SE(θ̂)
σ_map,B  = 150 (prior; the ACT residual was ≈ 167–181 including measurement error [6])
```

**X: external ratings**
```
FIDE (verified):  x_X = R_FIDE;  σ_stat,X = 40 (≥ 30 games) or 80 (< 30);  σ_map,X = 0
Online (self-reported, consented): x_X = ChessDojo-table conversion;  σ_map,X = 200
```

**Staleness (all signals)**
```
σ_age,i = 25 · (days since last evidence for i) / 30      # learners change; 25 GR/month prior drift
```

## 4. Fusion: generalized least squares with shared calibration error

The mapping errors are not independent. Every mapped signal is calibrated against the **same anchor panel**, and G and M are computed from the **same games**. The model therefore needs a full covariance matrix:

```
Σ_ii = V_i
Σ_ij = ρ_map · σ_map,i · σ_map,j  +  ρ_stat,ij · σ_stat,i · σ_stat,j
       priors: ρ_map = 0.3 for every mapped pair;  ρ_stat,GM = 0.3;  ρ_stat = 0 otherwise
```

With x the vector of available signals and **1** a vector of ones:

```
w        = Σ⁻¹ 1 / (1ᵀ Σ⁻¹ 1)                 # GLS weights (sum to 1)
GR̂       = wᵀ x
SE(GR̂)  = sqrt( 1 / (1ᵀ Σ⁻¹ 1) )
```

With correlated errors GLS can assign small negative weights. In the worked example below, P gets −0.001 when ρ_stat,GM = 0. This is mathematically correct. Implementations must not clip the weights, but should log any weight below −0.05 for review.

**Consistency test.** This detects disagreement between signals, for example engine assistance in puzzles, sandbagging in games, or a mis-calibrated mapping:
```
Q = (x − GR̂·1)ᵀ Σ⁻¹ (x − GR̂·1)  ~  χ²(k − 1)
if p(Q) < 0.01:  SE ← SE · sqrt(Q / (k − 1));  flag "signals disagree"; trigger review
```

**Worked example** (illustrative, ρ = 0). Signals: G = 1850 (RD 60, σ_map 50) → V = 78.1². M = 1920 (σ_stat 90, σ_map 120) → V = 150². B = 1780 (σ_stat 80, σ_map 150) → V = 170². P = 2000 (σ_stat 60, σ_map 250) → V = 257². Inverse-variance weights: 0.635, 0.172, 0.134, 0.059. GR̂ ≈ 1862, SE ≈ 62, so 95% CI ≈ 1740–1984. With ρ_map = 0.3 and ρ_stat,GM = 0.3, GR̂ ≈ 1850 and SE ≈ 74 (95% CI ≈ 1705–1995): correlated errors widen the interval and shift weight toward G. Q = 0.89 on 3 df, so the signals are consistent. These figures were verified numerically. **Engineers must use the full GLS form.**

**Minimum evidence before showing "Estimated FIDE-equivalent":**
- ≥ 20 rated games at the standard TC with RD_G ≤ 110, **and**
- at least one non-game signal (B or M with n ≥ 300 live moves), **and**
- SE(GR̂) ≤ 150.

Until all three hold, show only "provisional Grim Rating".

## 5. Measuring progress (the learner-facing claim)

Progress between t₁ and t₂ uses only the components that change. Shared mapping error cancels to first order:

```
ΔGR      = GR̂(t₂) − GR̂(t₁)
SE(Δ)    = sqrt( SE_stat(t₁)² + SE_stat(t₂)² )       # σ_map terms excluded: common to both times
Improvement is "measurable" when ΔGR > 1.645 · SE(Δ)    (one-sided 95%)
```

Progress is therefore measured **more precisely than absolute level**, and the platform should present it that way, for example: "+140 (±70) since March".

## 6. Comparison with masters

- **Position-level comparison.** For any game, show "moves matching or within 20 cp of the engine's best: k of n", alongside the band medians from `10-benchmarks-by-rating-band.md`. Label it "typical for players rated X (online rapid, prior benchmark v1)".
- **Single-game intrinsic rating.** Allowed only with its interval. Single-game precision is about ±230 at 1σ (ML from moves and clock [7]) and ±200 at 95% even over 9 games (Regan [5]). Single-game values are **never** fused alone; they enter only through the rolling M signal.
- **Percentile among FIDE players**: see `06-fide-population-statistics.md` (reported as a range from the 80% band).

## 7. Title-equivalent milestones

| Milestone | Threshold T (GR) | Basis (FIDE rating requirement) [2] |
|---|---|---|
| CM-equivalent strength | 2200 | CM 2200 |
| FM-equivalent strength | 2300 | FM 2300 |
| IM-equivalent strength | 2400 | IM 2400 (+ norms in reality) |
| GM-equivalent strength | 2500 | GM 2500 (+ norms in reality) |
| WCM / WFM / WIM / WGM-equivalent | 2000 / 2100 / 2200 / 2300 | women's titles |

**Award rule (all conditions required)**
1. Lower 80% bound: GR̂ − 1.2816·SE ≥ T, at **two evaluations ≥ 30 days apart**.
2. SE(GR̂) ≤ 100.
3. ≥ 30 rated games at the standard TC within the last 180 days. This mirrors FIDE's 30-game condition [2].
4. Game-based estimate x_G ≥ T − 50. Puzzles or the battery alone cannot earn a milestone.
5. Consistency test passed (p(Q) ≥ 0.01) and no open fair-play flag.
6. Knowledge gates K passed at the corresponding level (e.g. GM-equivalent requires ≥ 90% on the master-level endgame module).

**Optional "norm-equivalent performance" badge.** ≥ 9 games in one platform event against anchored opposition, with performance rating Rp = Ra + dp ≥ 2600 / 2450 / 2400 / 2250 (GM / IM / WGM / WIM), average opposition ≥ 2380 / 2230 / 2180 / 2030, and score ≥ 35%. This mirrors FIDE §1.4.8 [2]. The badge text must say that the opponents were bots or platform users and that no FIDE norm has been earned.

**Permanence.** Milestones carry their award date and model version and are never silently revoked. If a later audit finds a calibration error, they are re-labelled with a public notice.

## 8. Validation protocol (required before public FIDE-equivalent claims)

1. **Anchor panel.** N ≥ 400 consenting players with verified FIDE IDs, stratified across 1400–2500 (≥ 40 per 100-point band where available), who are active OTB within 12 months. Each completes ≥ 30 rated games at the standard TC and one battery sitting.
2. **Fitting.** Split the panel 50/50 into fit and test halves. Fit Δ_tc, A/B, a_P/b_P, α/β, σ_map,i and ρ by maximum likelihood on the fit half.
3. **Test-half metrics** (pre-registered):

| Metric | Acceptance |
|---|---|
| MAE(GR̂, FIDE) | ≤ 120 |
| Bias in any 200-point band | within ±50 |
| 95% interval coverage | 93–97% |
| 80% interval coverage | 77–83% |
| Spearman ρ | ≥ 0.85 |
| Test–retest of GR̂ (4 weeks, no training) | r ≥ 0.9 |

4. **Prospective check.** Compare GR̂ with each anchor's *next* published FIDE ratings, which captures the FIDE lag [6].
5. **Drift.** Re-run the anchor fit quarterly. Publish a model card (version, data dates, metrics). Freeze bot binaries and engine versions per model version.
6. **Subgroups.** Report metrics for juniors (< 18), women and countries of residence, and investigate any group with |bias| > 50.

## 9. Claims policy

| The platform MAY say | The platform MAY NOT say |
|---|---|
| "Estimated FIDE-equivalent rating: 1850 (95% CI 1705–1995), model v1, validated on N anchors" | "Your FIDE rating is 1850", "FIDE-rated", "official rating" |
| "Your strength is consistent with typical FIDE Masters (FM-equivalent milestone)" | "You are an FM / GM", or using the bare abbreviations "FM", "IM", "GM" as user labels |
| "Norm-equivalent performance against platform opposition" | "You earned a GM/IM norm", "norm" without the qualifier |
| "Improved +140 (±70) GR since March" | Progress claims without an interval, or based on fewer than the minimum evidence |
| "Below the FIDE rating floor (1400); Grim Rating 1150 (extended scale)" | A FIDE-equivalent number below 1400 |
| "Your accuracy (Lichess formula) was 88%; median for 2200–2399 online rapid is 87%" | "88% accuracy means you play like a 2300" (accuracy is not a rating [11]) |
| "Bot 'Aria' is calibrated at GR 2100 ± 35" | Raw Stockfish UCI_Elo shown as a human-comparable rating [9] |

**Mandatory disclosures** (shown on every rating page):
- FIDE ratings and titles are awarded only by FIDE, on the basis of FIDE-rated over-the-board events. Titles above FM also require norms with arbiters [1][2].
- GR is an estimate. It is valid for the population and time controls named in the current model card.
- The trademark "FIDE" is used descriptively only. The platform must not imply endorsement by FIDE.

## 10. Parameter summary (machine-readable copy in `data/benchmarks.json` → `measurementModel`)

| Parameter | Prior value |
|---|---|
| Glicko-2 τ, r₀, RD₀, σ₀, scale | 0.5, 1500, 350, 0.06, 173.7178 |
| σ_anchor (bots) | 50 |
| σ_tc (non-standard TC) | 100 |
| M line (A, B) | 3186, 8977 (classical prior); σ_map,M 120 |
| Model-error inflation (M) | 1.4 |
| P map (a, b), σ_map,P | −100, 1.0, 250 |
| B map β, σ_map,B | 300, 150 |
| ρ_map, ρ_stat,GM | 0.3, 0.3 |
| Staleness drift | 25 GR / 30 days |
| Display threshold SE | ≤ 150 |
| Milestone rule | lower 80% bound ≥ T twice ≥ 30 d apart; SE ≤ 100; ≥ 30 games / 180 d |

## Sources

1. FIDE Rating Regulations (effective 1 Mar 2024). https://handbook.fide.com/chapter/B022024
2. FIDE Title Regulations (effective 1 Jan 2024). https://handbook.fide.com/chapter/B012024
3. Glickman, "Example of the Glicko-2 system." http://www.glicko.net/glicko/glicko2.pdf
4. Regan, CSE702 S25 "Elo Ratings and Raw Metrics" (ASD line, SF16). https://cse.buffalo.edu/~regan/ChessSeminar/CSE702EloEvolution.pdf
5. Regan, "Intrinsic Ratings Compendium" (1.4× model-error multiplier). https://cse.buffalo.edu/~regan/papers/pdf/Reg12IPRs.pdf
6. van der Maas & Wagenmakers (2005), ACT. https://www.ejwagenmakers.com/2005/VanderMaasWagenmakersACTpaper.pdf
7. Omori & Tadepalli (2024), CNN-LSTM rating estimation, MAE 182. https://arxiv.org/abs/2409.11506
8. McIlroy-Young et al. (2020), Maia. https://arxiv.org/pdf/2006.01855
9. Stockfish PR #4341 (UCI_Elo calibration on CCRL Blitz via Stash). https://github.com/official-stockfish/Stockfish/pull/4341
10. ChessDojo rating conversion table. https://www.chessdojo.club/material/ratings
11. Lichess, "Accuracy metric" (accuracy is not a skill rating). https://lichess.org/page/accuracy
