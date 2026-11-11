---
title: "Glicko and Glicko-2: Implementable Specification"
summary: "Complete Glicko-1 and Glicko-2 algorithms with every constant, Glickman's worked example (independently re-computed), Lichess's production deviations, and engineering guidance for Grim Chess's game-results signal."
last_reviewed: 2026-11-11
sources:
  - http://www.glicko.net/glicko/glicko2.pdf
  - http://www.glicko.net/glicko/glicko.pdf
  - https://raw.githubusercontent.com/lichess-org/lila/master/modules/rating/src/main/Glicko.scala
  - https://raw.githubusercontent.com/lichess-org/scalachess/master/rating/src/main/scala/glicko/impl/RatingCalculator.scala
  - https://deepwiki.com/lichess-org/scalachess/5.1-rating-system
  - https://support.chess.com/en/articles/8566476-how-do-ratings-work-on-chess-com
---

# Glicko and Glicko-2: Implementable Specification

Grim Chess uses Glicko-2 for its game-results signal (games against calibrated bots and against other users). Unlike Elo, Glicko-2 attaches an uncertainty to every rating (the rating deviation, RD), and that uncertainty feeds the confidence interval the platform must report. Every formula below is transcribed from Glickman's primary documents [1][2]. The worked example was re-computed independently for this review and matches Glickman's published output (r′ = 1464.05, RD′ = 151.52, σ′ = 0.05999).

**Evidence strength: High.** These are the primary algorithm descriptions by the system's author, and the re-computation confirms the transcription.

## 1. Glicko-1 (reference) [2]

- Defaults: r = 1500, RD = 350. Constant q = ln(10)/400 = 0.0057565.
- Step 1 (inactivity). RD = min(√(RD_old² + c²·t), 350), where t is the number of rating periods since the last game. Glickman's example picks c so that RD climbs from 50 back to 350 over 30 periods, which gives **c = 63.2** [2].
- Step 2 (update against m opponents):

```
g(RD)  = 1 / sqrt(1 + 3 q² RD² / π²)
E_j    = 1 / (1 + 10^(−g(RD_j)(r − r_j)/400))
d²     = [ q² Σ_j g(RD_j)² E_j (1 − E_j) ]^(−1)
r'     = r + q / (1/RD² + 1/d²) · Σ_j g(RD_j)(s_j − E_j)
RD'    = sqrt( (1/RD² + 1/d²)^(−1) )
```

- The 95% interval is r ± 1.96·RD [2]. Chess.com states that it uses "the Glicko rating system" with an RD [6]. It does not publish its constants.

## 2. Glicko-2 (normative for Grim Chess) [1]

Each player has a rating r, a deviation RD and a volatility σ. Games inside one rating period are treated as simultaneous. Glickman recommends "at least 10–15 games per player in a rating period" on average [1].

**Step 1. Choose the constants.** The system constant τ should lie between 0.3 and 1.2, and a value as low as 0.2 is acceptable if improbable results are expected. The right value should be chosen by testing predictive accuracy [1]. An unrated player starts at r = 1500, RD = 350, σ = 0.06 ("this value depends on the particular application") [1].

**Step 2. Convert to the Glicko-2 scale:**
```
μ = (r − 1500) / 173.7178          φ = RD / 173.7178
```

**Step 3. Estimated variance, from game outcomes only:**
```
g(φ)          = 1 / sqrt(1 + 3 φ² / π²)
E(μ, μ_j, φ_j) = 1 / (1 + exp(−g(φ_j)(μ − μ_j)))
v             = [ Σ_j g(φ_j)² E_j (1 − E_j) ]^(−1)
```

**Step 4. Estimated improvement:**
```
Δ = v · Σ_j g(φ_j) (s_j − E_j)
```

**Step 5. New volatility σ′ (Illinois / regula-falsi method, revised 22 Feb 2012) [1]:**
```
a = ln(σ²);  ε = 0.000001
f(x) = e^x (Δ² − φ² − v − e^x) / (2 (φ² + v + e^x)²)  −  (x − a)/τ²
A = a
if Δ² > φ² + v:  B = ln(Δ² − φ² − v)
else:            k = 1; while f(a − kτ) < 0: k += 1;  B = a − kτ
fA = f(A); fB = f(B)
while |B − A| > ε:
    C  = A + (A − B) fA / (fB − fA);  fC = f(C)
    if fC · fB <= 0:  A, fA = B, fB      # note: <= 0
    else:             fA = fA / 2
    B, fB = C, fC
σ' = e^(A/2)
```
Glickman's simulations give a median of 5 iterations, a mean of 5.6 and a maximum of 19 [1].

**Step 6. Pre-period deviation:** φ* = √(φ² + σ′²)

**Step 7. Update:**
```
φ' = 1 / sqrt(1/φ*² + 1/v)
μ' = μ + φ'² Σ_j g(φ_j)(s_j − E_j)
```

**Step 8. Convert back:** r′ = 173.7178·μ′ + 1500, RD′ = 173.7178·φ′.

**No games in the period:** apply Step 6 only. The rating and σ stay unchanged and φ′ = √(φ² + σ²) [1].

### 2.1 Test vector (mandatory unit test)

Glickman's example [1]: a player with r = 1500, RD = 200, σ = 0.06 and τ = 0.5 plays opponents rated (1400, RD 30) → win, (1550, RD 100) → loss, (1700, RD 300) → loss.

| Quantity | Expected value |
|---|---|
| μ, φ | 0, 1.1513 |
| g(φ_j) | 0.9955, 0.9531, 0.7242 |
| E_j | 0.639, 0.432, 0.303 |
| v | 1.7785 |
| Δ | −0.4834 |
| A₀, B₀ | −5.62682, −6.12682 |
| σ′ | 0.05999 |
| φ*, φ′ | 1.152862, 0.8722 |
| μ′ | −0.2069 |
| **r′, RD′** | **1464.06, 151.52** |

Our re-computation (Python, double precision) gave r′ = 1464.05, RD′ = 151.52 and σ′ = 0.06000. The 0.01 gap in r′ is rounding in Glickman's intermediate values.

## 3. Lichess production deviations (for comparison only)

Lichess's Glicko-2 departs from the reference in several ways. Constants come from the lila source [3] and the scalachess calculator [4].

| Item | Lichess | Glickman reference |
|---|---|---|
| Default r / RD / σ | 1500 / **500** / **0.09** [3] | 1500 / 350 / 0.06 [1] |
| Min RD / max σ | 45 / 0.1 [3] | none |
| Rating bounds | 400 – 4000 [3] | none |
| Max per-game delta | 700 [3] | none |
| Rating periods | **Fractional, continuous time**: elapsed periods = elapsed time × periodsPerDay (0.21436) [3][4] | integer periods |
| Colour advantage | supported in the calculator (default zero) [4] | none |
| τ | 0.75 (reported in a secondary, auto-generated code summary; not confirmed in primary source) [5] | 0.3–1.2 |
| "Provisional" display | RD-based thresholds (rankable RD 75 standard) [3] | n/a |

Lichess effectively updates after every game. Glickman's 10–15-games-per-period assumption does not hold there, and it will not hold on Grim Chess either if the platform updates after each game.

## 4. Engineering decisions for Grim Chess

| Parameter | Value | Rationale |
|---|---|---|
| τ | **0.5** (initial). Re-tune by grid search over [0.3, 1.0] on held-out prediction log-loss | Glickman's own example value [1]. The value must be validated, not assumed |
| Default r / RD / σ | 1500 / 350 / 0.06 | Reference defaults [1]. The platform scale is anchored separately (see `platform-measurement-model.md`), so 1500 is just a starting prior |
| Rating period | 1 calendar day **or** 15 games, whichever comes first; a live "preview" rating is computed with Step 6 applied fractionally | Brings games per period closer to Glickman's recommendation |
| Bot opponents | Fixed r. RD = the bot's calibration standard error (typically 25–60). Bots never update during play | Glicko-2 needs φ_j for opponents. Using the calibration SE carries the anchor uncertainty into g(φ_j) |
| Separate pools | One Glicko-2 rating per time-control class (blitz/rapid/classical-online) **and** separate puzzle and battery ratings | Results do not transfer cleanly across time controls (see `07-engine-move-quality-metrics.md`) |
| RD floor | 30 | Stops overconfidence. Lichess uses 45 [3] |
| CI reported | r ± 1.96·RD on the internal scale. The FIDE-equivalent CI also adds mapping error (see the measurement model) | [2] |

### 4.1 Reference implementation

```python
import math
SCALE = 173.7178

def g(phi): return 1.0 / math.sqrt(1.0 + 3.0 * phi * phi / math.pi ** 2)
def E(mu, mu_j, phi_j): return 1.0 / (1.0 + math.exp(-g(phi_j) * (mu - mu_j)))

def glicko2_update(r, rd, sigma, results, tau=0.5, eps=1e-6):
    """results: list of (opp_r, opp_rd, score). Returns (r', rd', sigma')."""
    mu, phi = (r - 1500) / SCALE, rd / SCALE
    if not results:
        return r, SCALE * math.sqrt(phi * phi + sigma * sigma), sigma
    opps = [((rj - 1500) / SCALE, rdj / SCALE, s) for rj, rdj, s in results]
    v = 1.0 / sum(g(pj) ** 2 * E(mu, mj, pj) * (1 - E(mu, mj, pj)) for mj, pj, _ in opps)
    delta = v * sum(g(pj) * (s - E(mu, mj, pj)) for mj, pj, s in opps)
    a = math.log(sigma * sigma)
    def f(x):
        ex = math.exp(x)
        return ex * (delta**2 - phi**2 - v - ex) / (2 * (phi**2 + v + ex) ** 2) - (x - a) / tau**2
    A = a
    if delta**2 > phi**2 + v:
        B = math.log(delta**2 - phi**2 - v)
    else:
        k = 1
        while f(a - k * tau) < 0:
            k += 1
        B = a - k * tau
    fA, fB = f(A), f(B)
    while abs(B - A) > eps:
        C = A + (A - B) * fA / (fB - fA); fC = f(C)
        if fC * fB <= 0: A, fA = B, fB
        else: fA /= 2
        B, fB = C, fC
    sigma_new = math.exp(A / 2)
    phi_star = math.sqrt(phi**2 + sigma_new**2)
    phi_new = 1.0 / math.sqrt(1.0 / phi_star**2 + 1.0 / v)
    mu_new = mu + phi_new**2 * sum(g(pj) * (s - E(mu, mj, pj)) for mj, pj, s in opps)
    return SCALE * mu_new + 1500, SCALE * phi_new, sigma_new
```

## Sources

1. M. E. Glickman, "Example of the Glicko-2 system" (rev. 22 Mar 2022). http://www.glicko.net/glicko/glicko2.pdf
2. M. E. Glickman, "The Glicko system." http://www.glicko.net/glicko/glicko.pdf
3. lichess-org/lila, `modules/rating/src/main/Glicko.scala`. https://raw.githubusercontent.com/lichess-org/lila/master/modules/rating/src/main/Glicko.scala
4. lichess-org/scalachess, `rating/.../glicko/impl/RatingCalculator.scala`. https://raw.githubusercontent.com/lichess-org/scalachess/master/rating/src/main/scala/glicko/impl/RatingCalculator.scala
5. DeepWiki auto-summary of scalachess rating system (secondary; τ = 0.75). https://deepwiki.com/lichess-org/scalachess/5.1-rating-system
6. Chess.com Help Center, "Ratings on Chess.com." https://support.chess.com/en/articles/8566476-how-do-ratings-work-on-chess-com
