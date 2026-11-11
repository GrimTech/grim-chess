---
title: "Elo and the FIDE Rating System (2024+ regulations)"
summary: "Exact FIDE standard-rating mechanics as of the regulations in force from 1 March 2024 (with the 1 Oct 2025 400-point-rule amendment): expected-score table, K-factors, initial rating, 1400 floor, and the one-off Sonas compression. Defines the anchor scale that Grim Chess reports against."
last_reviewed: 2026-11-11
sources:
  - https://handbook.fide.com/chapter/B022024
  - https://www.fide.com/new-fide-rating-and-title-regulations-come-into-effect/
  - https://www.chess.com/news/view/fide-adds-rating-points-to-more-than-300-000-players
  - https://fide.com/docs/presentations/Sonas%20Proposal%20-%20Repairing%20the%20FIDE%20Standard%20Elo%20Rating%20System.pdf
  - https://cse.buffalo.edu/~regan/ChessSeminar/CSE702EloEvolution.pdf
  - https://en.wikipedia.org/wiki/Elo_rating_system
  - https://www.fide.com/fide-updates-rating-regulations-to-include-faster-time-controls-for-major-events/
---

# Elo and the FIDE Rating System (2024+ regulations)

**Why this matters for Grim Chess.** The platform's headline number is an *estimated FIDE-equivalent rating*. That only means something if the target scale is pinned down exactly. This file records the target scale: FIDE Standard ratings under the regulations approved by FIDE Council on 15/12/2023 and applied from 1 March 2024 [1][2].

## 1. The Elo model

Elo's model says the expected score of player A against player B depends only on the rating difference D = R_A − R_B. The usual logistic form is [6]:

```
E_A = 1 / (1 + 10^(-D/400))
```

So a 200-point edge gives E = 0.76 and a 400-point edge gives E ≈ 0.909. FIDE does not use this closed form in its regulations. It uses a lookup table (§8.1.2) that maps D bands to the probability P_D for the higher-rated (H) and lower-rated (L) player. Sample rows: D 0–3 → 0.50/0.50; D 198–206 → 0.76/0.24; D 620–735 → 0.99/0.01; D > 735 → 1.00/0.00 [1]. Near the middle of the range the logistic form and the table agree to within about 0.01. Engineers should use the **table** when they reproduce FIDE numbers exactly, and the logistic form for the platform's own internal modelling.

**Evidence strength: High.** Primary regulation text [1].

## 2. Rating update (§8.3)

For each game, ΔR = score − P_D. Over a rating period the change is **K × ΣΔR** [1].

| K | Condition (FIDE §8.3.3) [1] |
|---|---|
| 40 | Player new to the rating list, until they have completed events with ≥ 30 games |
| 40 | All players until the end of the year of their 18th birthday, while rated < 2300 |
| 20 | While the player's rating stays below 2400 |
| 10 | Once a published rating has reached 2400; stays 10 even if the rating later drops below 2400 |
| cap | K is the largest whole number such that K × n ≤ 700 (n = games in the period) |

**400-point rule (§8.3.1, as amended effective 1 October 2025).** For players rated below 2650, a rating difference larger than 400 points is counted as 400. For players rated 2650 and above, the full difference is used [1]. (The 2024 reform had already abolished the earlier "once per event" limit on this rule [2].)

**Evidence strength: High** [1]. Auditors should note that the regulation has changed twice since the 2024 reform. Anyone reproducing FIDE numbers must apply the rule that was in force on each game date.

## 3. Initial rating (§8.2) and publication (§7.1)

- A zero score in an unrated player's first event is disregarded (§8.2.1) [1].
- Ra is the average rating of the rated opponents **plus two hypothetical opponents rated 1800**, with both hypothetical games scored as draws (§8.2.2) [1].
- Ru = Ra + dp, where dp comes from the fractional-score table (§8.1.1; p = 1.0 is treated as dp = 800). The maximum initial rating is **2200** (§8.2.3) [1].
- A rating is published once it rests on **≥ 5 games against rated opponents**. Results from consecutive rating periods spanning no more than 26 months are pooled, and the resulting rating must be ≥ 1400 (§7.1.4) [1].

## 4. The 1400 floor and the one-off "Sonas compression"

- **Floor.** Ratings are published only if they are ≥ 1400. Players who drop below 1400 are shown as unrated on the next list (§7.1.2, §7.2.1) [1]. The floor was previously 1000 [2].
- **One-off adjustment (1 March 2024).** Every player rated under 2000 received **+0.40 × (2000 − R)**. This maps the old 1000–2000 interval linearly onto 1400–2000 [3][4]. The adjustment affected roughly 85% of rated players [3]. The FIDE Council approved it on 14 December 2023, with the start date moved from 1 January to 1 March 2024 [3].
- **Validation by move quality.** Regan's engine-based metrics (T1-match, scaled error) against FIDE Elo had a "kink" near 2000 before the change and were close to linear after it. By March 2025 Regan judged the correction "in good order". He also noted that the scaled-error line crosses 1400 at about 0.19–0.20 pawns, while some listed players play worse than that, which suggests the floor sits too high to measure true beginners [5].

**Implications for the platform**

1. **There is no FIDE scale below 1400.** Any Grim Chess number below 1400 is an *extension* of the scale, not a FIDE equivalent. The platform must label it that way (see `platform-measurement-model.md`).
2. **Older data sets need re-mapping.** Pre-March-2024 data, such as Regan–Haworth 2011 and most forum conversion studies, quote sub-2000 ratings on the old scale. Use R_new ≈ R_old + 0.4(2000 − R_old) for 1000 ≤ R_old < 2000. This is approximate: the adjustment was applied once to the players on the list at that date, and was not a permanent change of formula.
3. **Ratings between 1400 and 2000 are compressed.** On the current FIDE scale, 100 points between 1400 and 2000 represent less playing-strength difference than 100 points above 2000, because the 2024 adjustment squeezed 1000 old points into 600. Regan's data indicate the compression may slightly over-correct [5].

**Evidence strength: High** for the regulations [1][3]. **Moderate** for the claims about how the adjustment behaves (Regan's slides, not peer-reviewed) [5].

## 5. Performance rating

FIDE uses Rp = Ra + dp, with dp taken from the §8.1.1 table. The same construction appears in the title regulations, §1.4.9 (see `05-fide-titles-and-norms.md`). A logistic approximation good to a few points across most of the range is:

```
dp ≈ 400 · log10(p / (1 − p))     (p = fractional score; clamp p to [0.01, 0.99])
```

For example, p = 0.76 gives 200.3, against 202 in the table midpoint. For p = 0 or p = 1, FIDE uses ±800.

## 6. Time controls that count as "standard"

From 12 January 2026, FIDE allows approved major or traditional events played at **45+30 or longer** to count for standard ratings and norms. Approval is case by case, by the Qualification Commission, with at most two rounds per day and at most one such norm counting toward any single title [7]. Platform online rapid games are **never** FIDE-rated, whatever their time control.

## 7. Reference implementation (platform-internal, logistic)

```python
def elo_expected(ra: float, rb: float) -> float:
    return 1.0 / (1.0 + 10 ** (-(ra - rb) / 400.0))

def fide_k(rating: float, games_total: int, age_end_of_year: int, ever_2400: bool, n_period: int) -> int:
    if games_total < 30 or (age_end_of_year <= 18 and rating < 2300):
        k = 40
    elif ever_2400:
        k = 10
    else:
        k = 20
    while k * n_period > 700:   # FIDE cap K*n <= 700
        k -= 1
    return k

def capped_diff(r_player: float, r_opp: float) -> float:
    d = r_player - r_opp
    if r_player < 2650:                 # rule in force from 1 Oct 2025
        d = max(-400.0, min(400.0, d))
    return d
```

## Sources

1. FIDE Handbook B.02, *FIDE Rating Regulations effective from 1 March 2024* (incl. §8.3.1 amendment effective 1 Oct 2025). https://handbook.fide.com/chapter/B022024
2. FIDE, "New FIDE Rating and Title Regulations come into effect." https://www.fide.com/new-fide-rating-and-title-regulations-come-into-effect/
3. Chess.com News, "FIDE Adjusts Ratings For 350,000 Players In Major Change." https://www.chess.com/news/view/fide-adds-rating-points-to-more-than-300-000-players
4. J. Sonas, "Repairing the FIDE Standard Elo Rating System" (FIDE presentation). https://fide.com/docs/presentations/Sonas%20Proposal%20-%20Repairing%20the%20FIDE%20Standard%20Elo%20Rating%20System.pdf
5. K. W. Regan, "CSE702 Spring 2025 Week 2: Elo Ratings and Raw Metrics" (course notes, Univ. at Buffalo). https://cse.buffalo.edu/~regan/ChessSeminar/CSE702EloEvolution.pdf
6. Wikipedia, "Elo rating system" (logistic formula; secondary). https://en.wikipedia.org/wiki/Elo_rating_system
7. FIDE, "FIDE updates rating regulations to include faster time controls for major events" (12 Jan 2026). https://www.fide.com/fide-updates-rating-regulations-to-include-faster-time-controls-for-major-events/
