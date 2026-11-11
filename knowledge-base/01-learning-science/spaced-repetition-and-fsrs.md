---
title: "Spaced Repetition for Chess, Including FSRS Algorithm Basics"
summary: "The spacing effect, what meta-analyses say about optimal gaps, how SM-2 and FSRS schedulers work (with FSRS formulas), what kinds of chess knowledge suit spaced repetition, known pitfalls (surface memorization, interference, review debt), and concrete scheduler design decisions for Grim Chess."
last_reviewed: 2026-11-11
evidence_strength_overall: "strong (spacing effect for retention); strong (FSRS predicts recall better than SM-2 on benchmark data); weak/untested (that SRS of chess content raises playing strength)"
sources:
  - "Cepeda et al. (2006) — https://doi.org/10.1037/0033-2909.132.3.354"
  - "Cepeda et al. (2008) — https://doi.org/10.1111/j.1467-9280.2008.02209.x"
  - "Dunlosky et al. (2013) — https://doi.org/10.1177/1529100612453266"
  - "Ye, Su & Cao (2022) KDD — https://doi.org/10.1145/3534678.3539081"
  - "FSRS algorithm wiki — https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm"
  - "Anki manual, FSRS — https://docs.ankiweb.net/deck-options.html"
  - "Borretti (2025) — https://borretti.me/article/implementing-fsrs-in-100-lines"
  - "SRS benchmark — https://github.com/open-spaced-repetition/srs-benchmark ; https://expertium.github.io/Benchmark.html"
  - "Wozniak (1999) 20 rules — https://www.supermemo.com/en/blog/twenty-rules-of-formulating-knowledge"
  - "Chess.com/Chessable support on MoveTrainer timing — https://support.chess.com/en/articles/10319267-when-will-the-variations-be-ready-for-my-review"
---

# Spaced Repetition for Chess, Including FSRS Algorithm Basics

## 1. The spacing effect

Material reviewed in sessions spread over time is retained much better than the same amount of study massed together. This is one of the most replicated findings in learning science.

- **Cepeda et al. (2006)** meta-analysed 839 assessments from 317 experiments. Spaced practice beat massed practice. The **optimal inter-study gap grows with the desired retention interval** [1].
- **Cepeda et al. (2008)** mapped a "temporal ridgeline". For retention after about a week, the best gap was roughly 20–40% of the retention interval. For retention after about a year, it was roughly 5–10%. Gaps that are too long cost less than gaps that are too short [2].
- **Dunlosky et al. (2013)** rated distributed practice and practice testing as the only two "high utility" techniques of the ten they reviewed [3].

**Evidence strength: strong** for verbal, factual and procedural retention. Almost all of it comes from non-chess material.

## 2. From fixed schedules to adaptive schedulers

### 2.1 SM-2 (SuperMemo 2, Wozniak, late 1980s)

Each item has an "ease factor". The next interval is the previous interval × ease, and ease is adjusted by the self-graded quality of recall. SM-2 is simple and robust, but it has no explicit model of *probability of recall* [8]. Anki used SM-2 variants for many years [6].

### 2.2 FSRS (Free Spaced Repetition Scheduler)

FSRS was developed by Jarrett Ye and collaborators. It descends from a model published at KDD 2022 (Ye, Su & Cao), which treated scheduling as a stochastic shortest-path problem trained on large review logs [4]. It became an option in Anki from version 23.10 [6]. FSRS uses the **DSR model**, which tracks three memory variables per item [5][6]:

- **D – Difficulty** (1–10): how hard it is to increase stability for this item.
- **S – Stability** (days): the interval after which recall probability falls to 90%.
- **R – Retrievability**: the probability of recall at time *t*. It is computed when needed, not stored.

**Core formulas** (the 19-parameter FSRS-4.5/5 family, as given in Borretti's reference implementation [7]):

- Forgetting curve (power law): **R(t, S) = (1 + F·t/S)^C**, with F = 19/81 and C = −0.5. By construction, R(S, S) = 0.9.
- Interval for a target retention R_d: **I = (S/F)·(R_d^(1/C) − 1)**. With R_d = 0.9 this gives I = S.
- After a **successful** review (grades Hard, Good, Easy), stability multiplies by α = 1 + (11 − D)·S^(−w₉)·(e^{w₁₀(1−R)} − 1)·e^{w₈}·(hard/easy modifiers). Growth is larger when the item is easier, when current stability is lower, and **when the item was closer to being forgotten** (low R). That last term formalizes the "desirable difficulty" idea [7].
- After a **lapse** (grade Again), stability resets to a lower value that depends on D, the old S and R [7].
- Difficulty moves toward lower values with Easy grades and higher values with Again, and mean-reverts toward a default [7].

**FSRS-6** (current as of 2025–26) adds parameters, including a trainable forgetting-curve decay, giving about 21 weights. Parameters are **fitted to each user's own review history** by maximum likelihood (log-loss) [5][8].

### 2.3 Does FSRS predict memory better?

The open **srs-benchmark** evaluates schedulers on about 10,000 Anki collections using log-loss, AUC and calibration RMSE. FSRS versions consistently outperform SM-2 and Anki's legacy scheduler. One forum summary of the benchmark reported FSRS-5 beating a trainable SM-2 on about 97% of collections [8]. *We could not independently confirm the exact current leaderboard figures. Auditors should check the live benchmark page [8].*

**Evidence strength: strong** for better *prediction of recall* on flashcard data. **Not established**: whether better scheduling translates into better chess play. No chess-specific trials exist.

### 2.4 The desired-retention trade-off

Target retention (e.g., 0.85–0.95) sets review load. Higher retention means many more reviews per item learned, and workload rises steeply above about 0.9 [6]. For chess the right target likely differs by content type (see §4).

## 3. What chess knowledge suits spaced repetition?

| Content type | Suitability | Notes |
|---|---|---|
| Opening move sequences (own repertoire) | **High** | Discrete, verifiable. This is Chessable MoveTrainer's main use case [10]. Risk: memorizing moves without plans. |
| Key theoretical endgames (Lucena, Philidor, Vancura, KPK opposition, R vs B fortress, etc.) | **High** | A small, stable canon (see `../02-methods/endgame-study-methods.md`). High retention target justified. |
| Tactical motifs / pattern library | **Medium–high** | Use *variants* of a pattern, not the identical position, to avoid position memorization (see §5). |
| Mating patterns (Anastasia's, Boden's, Arabian, etc.) | **High** for beginners/intermediates | |
| Strategic concepts (e.g., "minority attack plans") | **Medium** | Better as retrieval prompts ("What is White's typical plan in Carlsbad structures?") plus model games than as single-move cards. |
| Calculation skill | **Low** | It is a skill, not an item. Train with novel positions, not repeated ones. |
| Own-game mistakes | **High** | Turn each significant error into a card: "what should you have played and why?" This personalizes the deck. |

## 4. Pitfalls specific to chess SRS

1. **Surface memorization.** Repeating the *same* position trains recall of that position, not recognition of the pattern in new contexts. The Woodpecker Method explicitly accepts this trade-off by repeating identical sets (see `../02-methods/tactical-repetition-woodpecker-de-la-maza.md`). Mitigation: cards that rotate among several positions sharing the motif, or that mirror or translate the position on the board.
2. **"Doing it once" vs "knowing it."** Critics of opening trainers note that learners can pass move quizzes without understanding plans. Many players stop using such tools when their game results do not improve [10]. *Evidence: anecdotal.*
3. **Review debt and dropout.** Daily review loads pile up. Missed days create backlogs and demotivate learners. In Chessable, a late review can reset a move to level 1 [10].
4. **Interference between similar lines.** Repertoires with many near-identical move orders cause confusion. Card design should make the *distinguishing* move salient (Wozniak's "minimum information principle" and his rule on avoiding interference [9]).
5. **Self-grading bias.** FSRS uses self-graded recall in Anki. In chess, grading can be **objective**: correct move, or correct full line within a time limit. Response time can serve as a secondary signal.
6. **Over-investment in openings.** SRS makes opening memorization easy and gratifying. That risks displacing higher-yield work for sub-2000 players (see `../02-methods/opening-repertoire-building.md`).

## 5. Design decisions for Grim Chess

1. **Use an FSRS-family scheduler** (open-source implementations exist in several languages [5]). Fit per-user parameters once enough reviews exist, and use population defaults before that.
2. **Grade objectively.** Again = wrong move or line. Hard = correct but slow (above a per-item time threshold) or found after a hint. Good = correct within the threshold. Easy = instant and correct. Log response times.
3. **Content-specific retention targets** (initial defaults, to be tuned by A/B testing): repertoire lines and theoretical endgames ≈ 0.90–0.92; tactical patterns ≈ 0.85; personal-mistake cards ≈ 0.90.
4. **Pattern-level scheduling with item rotation.** Schedule the *pattern* (e.g., "back-rank deflection with rook + queen") and draw a fresh position instance from a pool at each review. Fall back to repeating the original instance only if the pool is exhausted. *This is a design hypothesis. It is not validated by published research and should be tested against identical-position repetition.*
5. **Daily review cap with graceful overflow.** Prioritize items with the lowest current R, and do not punish missed days with resets.
6. **Keep SRS to a bounded share of training time** (e.g., at most 20–25% for sub-2000 players), so the SRS habit does not crowd out novel problem solving, games and analysis. *This is an expert-judgment default, not an evidence-derived number.*
7. **Auto-generate cards from the learner's own games.** Engine-flagged errors where the learner had time and the correct idea is learnable within their level.

## Sources

1. Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin*, 132(3), 354–380. https://doi.org/10.1037/0033-2909.132.3.354
2. Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. *Psychological Science*, 19(11), 1095–1102. https://doi.org/10.1111/j.1467-9280.2008.02209.x
3. Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques. *Psychological Science in the Public Interest*, 14(1), 4–58. https://doi.org/10.1177/1529100612453266
4. Ye, J., Su, J., & Cao, Y. (2022). A stochastic shortest path algorithm for optimizing spaced repetition scheduling. *Proceedings of KDD '22*, 4381–4390. https://doi.org/10.1145/3534678.3539081
5. Open Spaced Repetition (2023–2026). The Algorithm (FSRS wiki) and implementations. https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
6. Anki Manual (2024–2026). Deck options: FSRS. https://docs.ankiweb.net/deck-options.html ; FAQ on algorithm: https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm.md
7. Borretti, F. (2025, Jan 10). Implementing FSRS in 100 lines. https://borretti.me/article/implementing-fsrs-in-100-lines
8. Open Spaced Repetition. SRS benchmark (GitHub) and Expertium's benchmark summary. https://github.com/open-spaced-repetition/srs-benchmark ; https://expertium.github.io/Benchmark.html ; FSRS-5 vs SM-2 forum discussion: https://forums.ankiweb.net/t/fsrs-5-is-a-significant-regression-for-a-minority-of-users-who-use-again-a-lot-on-new-and-learn-cards/66593?page=2
9. Wozniak, P. (1999). Effective learning: Twenty rules of formulating knowledge. SuperMemo. https://www.supermemo.com/en/blog/twenty-rules-of-formulating-knowledge
10. Chess.com/Chessable Help Center (2024–25). When will the variations be ready for my review? https://support.chess.com/en/articles/10319267-when-will-the-variations-be-ready-for-my-review ; critique (anecdotal): https://smithyq.blogspot.com/2024/01/why-i-stopped-using-online-opening.html ; review: https://chessentials.com/chessable-honest-review/
