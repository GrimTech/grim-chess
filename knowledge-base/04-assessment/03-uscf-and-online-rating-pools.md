---
title: "US Chess, Chess.com and Lichess Rating Pools"
summary: "How the US Chess, Chess.com and Lichess rating systems differ from FIDE, and why the same player gets different numbers in each. Background for the conversion tables and for the decision to keep Grim Chess's internal pools separate."
last_reviewed: 2026-11-11
sources:
  - https://www.glicko.net/ratings/report25.pdf
  - https://glicko.net/ratings/report26.pdf
  - https://new.uschess.org/sites/default/files/media/documents/us_chess_rating_system_specs-2025-07-26.pdf
  - https://support.chess.com/en/articles/8566476-how-do-ratings-work-on-chess-com
  - https://raw.githubusercontent.com/lichess-org/lila/master/modules/rating/src/main/Glicko.scala
  - https://arxiv.org/pdf/2006.01855
  - https://chessdojo.club/blog/new-ratings
---

# US Chess, Chess.com and Lichess Rating Pools

## 1. Ratings from different pools are not comparable

Each rating system is calibrated only against the players inside its own pool. Two pools can both use a logistic expected-score curve and still sit at different absolute levels. The offset depends on where each pool started (Lichess: 1500 [5]), where its floors sit (FIDE 1400, Lichess 400 [5]), how much new players inflate or deflate it, and who plays in it. **A conversion between pools is therefore an empirical regression. It is never an identity.** See `04-rating-conversions.md`.

**Evidence strength: High.** This follows from how the systems are built [5][7].

## 2. US Chess (USCF)

- US Chess runs a Glickman-designed Elo variant. K-factors vary with each player's "effective number of games", and players can earn bonus points for exceptional event performances. The authoritative text is the US Chess Rating System specification (Glickman & Doan, 26 July 2025) [3]. This review could not retrieve that PDF (HTTP 403), so its formulas are **not** reproduced here. Engineers who need exact US Chess calculations must take them from [3] directly.
- **Bonus threshold.** The bonus-point threshold was lowered from B = 14 to B = 10 in two steps beginning in 2023. The second step was implemented in January 2025 [2].
- **Official FIDE → US Chess conversion** (used to initialise US Chess ratings). This was corrected in 2025 and applied retroactively to 1 March 2024 [1]:

| Population | FIDE ≤ 2000 | FIDE > 2000 |
|---|---|---|
| Non-youth | USChess = −1073 + 1.5667 × FIDE | USChess = 20 + 1.02 × FIDE |
| Youth | USChess = −453 + 1.2667 × FIDE | USChess = 80 + 1.0 × FIDE |

  The formula introduced in March 2024 contained an error that produced US Chess ratings about 200 points too high for players rated below 2000 FIDE [1]. The steep slope below 2000 (1.5667) is the mirror image of FIDE's 2024 compression of the 1000–2000 band.

**Evidence strength: High** for the conversion formulas and the threshold history (official committee reports [1][2]). **Not verified** for the K and bonus formulas: the primary spec could not be retrieved.

## 3. Chess.com

- Chess.com uses "the Glicko rating system", with an RD that "indicate[s] our confidence in your rating" [4]. It publishes no constants (initial RD, c, starting rating).
- Bullet, blitz, rapid, daily and puzzle ratings are separate pools. A new time class is seeded from the player's closest existing time class [4].
- Chess.com has no classical time class. Its rapid pool (mostly 10+0) is the one most often compared with over-the-board ratings [7].

**Evidence strength: Moderate.** The help-centre text is official but incomplete.

## 4. Lichess

- Lichess uses Glicko-2 with continuous-time rating periods. Defaults are 1500/500/0.09, the RD floor is 45 and the rating floor is 400 (see `02-glicko-and-glicko2.md`) [5].
- Pool statistics from the Maia paper (2019 data): mean rating 1525, 5% of players below 1000, 10% above 2000 [6].
- New players start at 1500 [7]. Combined with the 400 floor, this inflates the low and middle bands relative to FIDE and Chess.com. That is the main reason Lichess ratings run 200–500 points above other scales at the bottom, with the gap shrinking at the top [7].

## 5. What Grim Chess takes from this

1. Keep **separate internal pools** for each time-control class, and separate pools for puzzles and for the assessment battery. Never merge pools without a measured mapping.
2. The internal pools are **not** marketed as FIDE ratings. Only the fused, calibrated estimate is called "FIDE-equivalent" (`platform-measurement-model.md`).
3. Self-reported external ratings (FIDE, USCF, Chess.com, Lichess) are collected only as *priors*, and only with consent. Users hold FIDE ratings more often than other ratings, but FIDE ratings must be verified by FIDE ID before they serve as calibration anchors.

## Sources

1. US Chess Ratings Committee, Annual Report 2025 (M. Glickman, chair). https://www.glicko.net/ratings/report25.pdf
2. US Chess Ratings Committee, Report (Apr 2026). https://glicko.net/ratings/report26.pdf
3. M. Glickman & T. Doan, "The US Chess Rating System" (spec, 26 Jul 2025; not retrieved, HTTP 403). https://new.uschess.org/sites/default/files/media/documents/us_chess_rating_system_specs-2025-07-26.pdf
4. Chess.com Help Center, "Ratings on Chess.com." https://support.chess.com/en/articles/8566476-how-do-ratings-work-on-chess-com
5. lichess-org/lila, `Glicko.scala`. https://raw.githubusercontent.com/lichess-org/lila/master/modules/rating/src/main/Glicko.scala
6. McIlroy-Young, Sen, Kleinberg, Anderson, "Aligning Superhuman AI with Human Behavior: Chess as a Model System," KDD 2020. https://arxiv.org/pdf/2006.01855
7. ChessDojo, "The New Dojo Rating Translator" (15 Sep 2024). https://chessdojo.club/blog/new-ratings
