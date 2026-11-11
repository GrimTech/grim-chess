---
title: "Opening Repertoire Building: Approaches, Evidence and Level-Appropriate Investment"
summary: "Compares approaches to openings (principles-first, open games for juniors, system openings, main-line repertoires from GM repertoire books, model-games-first, spaced-repetition memorization, opponent-specific preparation), reviews the limited evidence on how much openings matter at different levels, and sets level-appropriate time budgets and tooling for the platform."
last_reviewed: 2026-11-11
evidence_strength_overall: "weak–moderate (openings matter modestly below master level; data are sparse); expert consensus (principles and model games before memorization)"
sources:
  - "Mackenzie (blog) on value of White's score at 2200+ — https://danamackenzie.com/blog/?p=3463"
  - "sputnick (2009) Amateur opening preparation: the evidence — https://www.chess.com/article/view/amateur-opening-preparation-the-evidence"
  - "PerpetualChess: data analysis of 24 tournament games — https://lichess.org/@/PerpetualChess/blog/3-conclusions-and-3-goals-from-a-data-analysis-of-my-24-recent-tournament-games/UQ5iT5Xz"
  - "SayChessClassical: when does a Lichess player experience a new move — https://lichess.org/@/SayChessClassical/blog/when-does-a-lichess-player-experience-a-new-move-on-average/2KzfH3s6"
  - "de la Maza (2001) — https://stochasticgeometry.ie/~mdennehy/400Points.pdf"
  - "Dvoretsky & Yusupov, Secrets of Opening Preparation (SoFC 2) — https://reado.app/book/school-of-future-champions-secrets-of-opening-preparation-mark-dvoretsky/9783283005160"
  - "Friedel (2019) How Kramnik trains super-talents — https://en.chessbase.com/newsroom/post/how-kramnik-trains-super-talents"
  - "Chessable MoveTrainer help — https://support.chess.com/en/articles/10319267-when-will-the-variations-be-ready-for-my-review"
  - "Lichess opening explorer / masters DB — https://lichess.org/analysis#explorer"
---

# Opening Repertoire Building

## 1. How much do openings matter?

The evidence is sparse but consistent: **below master level, openings decide few games directly**.
- **At 2200+:** Dana Mackenzie's analysis estimates that each percentage point of White's score is worth about 7 rating points. Playing White in *every* game would add only about 18 points [1]. The pure opening advantage is small even at master level.
- **At 1500–1900:** a 2009 database analysis found White's scores varied only modestly across main defences (about 51–56%) but were higher in rarely played gambits (e.g., King's Gambit about 67%). The author interprets this as an advantage for whoever **dictates an unfamiliar course** [2]. *Weak evidence: single database, no controls for player strength, no sample sizes given.*
- **Amateur games swing a lot.** In one player's 24 tournament games, 11 of the 17 decisive games were won by the side that had been ≥ 1 pawn worse at some point [3]. That points to middlegame and endgame errors rather than the opening. *Anecdotal (n = 1).*
- **Book departure.** Analyses of Lichess amateur games show that games leave known theory early, and rating correlates only weakly with depth into known lines [4].
- **Expert opinion.** Coaches from de la Maza [5] to Kramnik [7] steer improving players away from heavy opening memorization. At the elite level, Kramnik advised juniors to prefer **solid, well-known openings** over surprise value and to prepare against specific opponents by first studying their style [7].

**Conclusion:** opening investment should scale with level. Below about 1800, the main value of opening study is reaching *playable, understood middlegames*, not memorized advantages.

## 2. Approaches compared

| Approach | Description | Best for | Pros | Cons |
|---|---|---|---|---|
| **Principles-first** | Develop, control the center, castle, do not move a piece twice without reason, no early queen raids | 0–1000 | No memorization; transfers to every position | Learners may be crushed by traps they do not know |
| **Open games for juniors** (Soviet and Steps tradition) | 1.e4 e5 and open positions to learn tactics, development and initiative | Children, up to about 1400 | Tactical richness; classical structures | Can be "busted" by prepared opponents online |
| **System openings** (London, KIA, Colle, etc.) | Same setup against most defences | Time-poor adults, up to about 1800 | Low maintenance; familiar middlegames | Less exposure to varied structures; can stunt development |
| **Main-line repertoire from GM repertoire books** | Full repertoire (e.g., Quality Chess "Grandmaster Repertoire") | 1900+ | Deep, sound and current; exposure to classical structures | Very large maintenance burden |
| **Model-games-first** | Learn an opening via 10–30 annotated model games before memorizing moves | All levels, 1200+ | Teaches plans and structures (template building) | Slower to reach move-accuracy |
| **SRS memorization** (Chessable MoveTrainer) | Drill move sequences with spaced repetition [8] | Supplement, 1500+ | Efficient move retention | "Moves without plans"; review debt (see `online-platform-pedagogy.md`) |
| **Database / explorer-driven** | Build lines from the masters database and online explorer statistics [9] | 1600+ | Practical and current | Statistics confound skill and choice |
| **Opponent-specific preparation** (Dvoretsky / Kramnik) | Study the opponent's style, then choose a concrete line [6][7] | 2000+ tournament players | Highest competitive value | Requires game databases and time |

## 3. Level-appropriate time budgets (platform defaults)

These are **expert-judgment defaults** based on §1 and the method literature, to be validated with platform data.

| Rating band | Share of training time on openings | Focus |
|---|---|---|
| 0–1000 | ≤ 5% | Principles; 1–2 simple openings; basic traps to avoid |
| 1000–1500 | 5–10% | One opening as White, one defence to each of 1.e4 and 1.d4; model games; typical tactics in those lines |
| 1500–1900 | 10–15% | Repertoire to about 8–12 moves in main lines; structures and plans; SRS for own lines |
| 1900–2200 | 15–20% | Deeper repertoire; sidelines; preparation against common club opponents |
| 2200+ | 20–30% (event-dependent) | Opponent-specific preparation; novelties; engine-assisted analysis |

## 4. Evidence-informed principles for repertoire work

1. **Understanding before memorizing.** Teach the plans and pawn structures of a line (model games) before drilling moves. This supports template formation (see `../01-learning-science/chunking-and-template-theory.md`) and addresses the main critique of SRS-only study.
2. **Repertoire from your own games.** Prioritize lines that actually occur in the learner's games (frequency-weighted), not the theoretically most important ones.
3. **Recall, not reread.** Test lines with retrieval (play the moves against the trainer), not by replaying them passively.
4. **Plan-level cards.** Add SRS cards such as "In this structure, what is White's typical plan?" alongside move cards.
5. **Post-game opening check.** After each game, automatically show where the learner left their repertoire and where they left theory, plus the engine's evaluation at that point. Add new knowledge only when it would have mattered.
6. **Scope control.** Warn learners when the opening share of training time exceeds the band default.

## 5. Implications for Grim Chess

- **Repertoire builder**: choose lines, attach model games, auto-generate move and plan cards, and schedule them with FSRS.
- **"Your games in your repertoire" view**: frequency, results and deviation points.
- **Model-game library tagged by opening and structure**, with guess-the-move mode (see `game-study-and-analysis-loops.md`).
- **Opponent prep** (advanced): import an opponent's public games, then show style summaries and likely lines.
- **No "busting" hype**: avoid marketing trap-heavy repertoires to beginners as a route to improvement.

## Sources

1. Mackenzie, D. (n.d.). Blog post on the rating value of White's score among 2200+ players. https://danamackenzie.com/blog/?p=3463
2. sputnick (2009, Jun 19). Amateur opening preparation: The evidence. Chess.com. https://www.chess.com/article/view/amateur-opening-preparation-the-evidence
3. PerpetualChess (Lichess blog, n.d.). 3 conclusions and 3 goals from a data analysis of my 24 recent tournament games. https://lichess.org/@/PerpetualChess/blog/3-conclusions-and-3-goals-from-a-data-analysis-of-my-24-recent-tournament-games/UQ5iT5Xz
4. SayChessClassical (Lichess blog, n.d.). When does a Lichess player experience a new move on average? https://lichess.org/@/SayChessClassical/blog/when-does-a-lichess-player-experience-a-new-move-on-average/2KzfH3s6 ; see also https://zwischenzug.substack.com/p/openings-vs-ratings
5. de la Maza, M. (2001). 400 points in 400 days. https://stochasticgeometry.ie/~mdennehy/400Points.pdf
6. Dvoretsky, M., & Yusupov, A. (2007). *Secrets of Opening Preparation* (School of Future Champions 2). Olms. https://reado.app/book/school-of-future-champions-secrets-of-opening-preparation-mark-dvoretsky/9783283005160
7. Friedel, F. (2019, Sep 4). How Kramnik trains super-talents. ChessBase. https://en.chessbase.com/newsroom/post/how-kramnik-trains-super-talents
8. Chess.com/Chessable Help Center (n.d.). When will the variations be ready for my review? https://support.chess.com/en/articles/10319267-when-will-the-variations-be-ready-for-my-review
9. Lichess (n.d.). Opening explorer (masters and Lichess databases). https://lichess.org/analysis#explorer
