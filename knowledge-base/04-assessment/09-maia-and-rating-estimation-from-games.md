---
title: "Human-Move Models (Maia) and Estimating Rating from Game Content"
summary: "What Maia (McIlroy-Young et al., KDD 2020) shows about rating-specific human move choice, what direct rating-from-moves models achieve (MAE ~180 per game), what Anderson et al. found about blunders, and how these results bound the precision Grim Chess can claim."
last_reviewed: 2026-11-11
sources:
  - https://arxiv.org/pdf/2006.01855
  - https://maiachess.com/
  - https://arxiv.org/abs/2409.11506
  - https://arxiv.org/pdf/1606.04956
  - https://ar5iv.labs.arxiv.org/html/1606.04956
  - https://www.ejwagenmakers.com/2005/VanderMaasWagenmakersACTpaper.pdf
---

# Human-Move Models (Maia) and Estimating Rating from Game Content

## 1. Maia (McIlroy-Young, Sen, Kleinberg, Anderson, KDD 2020) [1]

**Data and setup.** Lichess games, with HyperBullet and Bullet excluded. Nine test sets, one per 100-point bin from 1100 to 1900, each of 10,000 games in which *both* players fall in the bin. The first 10 ply are dropped, as are moves made with less than 30 s left on the clock. That leaves about 500,000 positions per set. Each of the nine models had its own training set of 12 million games and validation set of 120,000 games [1].

**Key results** (Table 1 of [1]: the test bin where each model reaches its peak move-matching accuracy):

| Model | Peaks on test bin | Best accuracy |
|---|---|---|
| Maia 1100 | 1200 | 50.8% |
| Maia 1300 | 1400 | 51.8% |
| Maia 1500 | 1700 | 52.2% |
| Maia 1700 | 1800 | 52.7% |
| Maia 1900 | 1900 | 52.9% |
| Leela (ordinal 1000 → 3200) | 1100 → 1900 | 26.3% → 46.0% |
| Stockfish depth 1 → 15 | 1900 | 39.1% → 41.1% |

- Each Maia model predicts best near the rating band it was trained on. That is what makes it a *rating-specific* human model. Stockfish's accuracy, by contrast, "rises monotonically" with the players' rating. Depth 15 matches 1900-rated players about 5 points more often than 1100-rated players [1].
- Agreement between Maia models ranges from 65% to 79%. Even weak and strong humans choose the same move most of the time [1].
- **Blunder prediction.** A residual CNN given board + metadata reaches **71.7%** accuracy on a balanced blunder / non-blunder task [1].
- **Released engines.** Maia covers Lichess ratings 1100–1900 [2].

**Implications**
1. Weaker players differ from stronger ones in a *minority* of their moves. Rating information is concentrated in critical positions. This supports position-difficulty-weighted measurement (Regan's scaling; IRT item difficulty).
2. Maia-style models make **human-like calibrated sparring bots**. Their pool is Lichess ratings, though, so a Maia-1500 bot has to be re-anchored to the FIDE-equivalent scale (`12-engine-strength-calibration.md`).
3. **Likelihood-based rating estimation.** Maia-k gives P(move | position, rating k). Comparing the log-likelihood of a player's moves across k yields a posterior over rating. This is a promising signal, but this review found **no published validation** against FIDE ratings. Treat it as experimental.

**Evidence strength: High** for the reported results (peer-reviewed KDD paper with a large dataset). **Low** for any FIDE-equivalence use (Lichess only, 1100–1900 only).

## 2. Direct rating estimation from moves and clock

**Omori & Tadepalli (2024)** [3] trained a CNN-LSTM on over one million Lichess games, using moves plus clock times and no hand-crafted features. It reached an **MAE of 182 rating points** on test data, with a prediction after every move.

- An MAE of 182 corresponds to an RMSE of roughly 230 (for near-normal errors RMSE ≈ 1.25·MAE). That is the **single-game** precision floor achieved so far by a state-of-the-art model.
- Errors on independent games average down roughly as 1/√n. Twenty games would give an MAE of about 40–60, but only if game-level errors were independent. Player-level biases (style, opening choice) put a floor under this.

**Evidence strength: Moderate.** An arXiv preprint. The baselines are not described on the abstract page [3].

## 3. Anderson, Kleinberg & Mullainathan (2016/2017): when humans blunder [4][5]

**Data.** About 200 million FICS online games, plus about 1 million GM tournament games. All positions with ≤ 6 pieces were checked against tablebases, so the ground truth is exact. A *blunder* is any move that worsens the game-theoretic value [5].

**Findings**
- Blunder rates fall smoothly with rating and flatten at the top [5].
- **Position difficulty predicts errors much better than skill or time** [4]. "Players rated 2700 are making errors at a greater rate in positions of blunder potential 0.9 than players rated 1200 are making in positions of blunder potential 0.3" [5].
- Rating alone predicts whether a given move will be a blunder with only about 0.62 accuracy [5].
- Blunder rates rise sharply as the clock approaches zero, and the curve flattens beyond roughly 10 s remaining. Extra time helps higher-rated players more [5].

**Implications.** Raw blunder counts confound skill with the difficulty of the positions a player happens to reach. Blunder-rate benchmarks must be either **difficulty-adjusted** (blunder potential, Maia difficulty) or measured on **standardized positions**, which is the argument for the assessment battery (`13-assessment-battery-design.md`).

**Evidence strength: High** (peer-reviewed, tablebase ground truth). The results cover endgames with ≤ 6 pieces and may not transfer fully to middlegames.

## 4. Consolidated precision budget

| Signal | Typical individual 1-σ error vs rating | Basis |
|---|---|---|
| 1 game, ML from moves + clock | ≈ 230 | [3] |
| 1 game, Lichess accuracy | > 250 (inter-quartile range within a band ≈ ±8 accuracy points ≈ several hundred Elo) | see `07-engine-move-quality-metrics.md` |
| 9 games, Regan IPR | ≈ 100 (±200 at 95%) | Regan, via `08-regan-ipr-and-guid-bratko.md` |
| 1,000+ moves, Regan IPR | ≈ 25–30 (±50–60 at 95%) | Regan compendium |
| 40-item choose-a-move test | ≈ 167–181 | ACT regression SE [6] |
| Self-reported online rating → FIDE | ≈ 200–300 | `04-rating-conversions.md` |

All figures are approximate and serve as planning inputs. The platform's validation study replaces them (`platform-measurement-model.md`).

## Sources

1. R. McIlroy-Young, S. Sen, J. Kleinberg, A. Anderson, "Aligning Superhuman AI with Human Behavior: Chess as a Model System," KDD 2020. https://arxiv.org/pdf/2006.01855
2. Maia Chess project site. https://maiachess.com/
3. M. Omori & P. Tadepalli, "Chess Rating Estimation from Moves and Clock Times Using a CNN-LSTM," arXiv:2409.11506 (2024). https://arxiv.org/abs/2409.11506
4. A. Anderson, J. Kleinberg, S. Mullainathan, "Assessing Human Error Against a Benchmark of Perfection," KDD 2016 / ACM TKDD 2017. https://arxiv.org/pdf/1606.04956
5. Same, HTML version (data and figure descriptions). https://ar5iv.labs.arxiv.org/html/1606.04956
6. H. L. J. van der Maas & E.-J. Wagenmakers, "A psychometric analysis of chess expertise," Am. J. Psychol. 118(1):29–60, 2005. https://www.ejwagenmakers.com/2005/VanderMaasWagenmakersACTpaper.pdf
