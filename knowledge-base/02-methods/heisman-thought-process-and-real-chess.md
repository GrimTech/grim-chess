---
title: "Dan Heisman's Methods: Real Chess vs Hope Chess, Blunder-Checking and the Improving Thinker"
summary: "Dan Heisman's widely used framework for adult and scholastic improvers: 'Hope Chess' vs 'Real Chess', the safety check ('Is your move safe?'), a structured thought process, time management for long games, think-aloud protocol work (The Improving Chess Thinker), easy-tactics repetition, and what is evidence-backed versus coaching consensus. Ends with platform implementations."
last_reviewed: 2026-11-11
evidence_strength_overall: "expert consensus (widely adopted by coaches); anecdotal (outcomes); moderate indirect (sub-1800 games are dominated by tactical oversights)"
sources:
  - "Wikipedia: Dan Heisman — https://en.wikipedia.org/wiki/Dan_Heisman"
  - "Heisman, Dan Heisman's site and article index — https://www.danheisman.com/ ; https://danheisman.com/chesscom-articles.html"
  - "Eaton (Lichess blog) on Hope Chess — https://lichess.org/@/TomEaton/blog/hope-chess/SxRLomNz"
  - "Heisman (2010) A Guide to Chess Improvement: The Best of Novice Nook (Everyman) — https://www.chesshouse.com/collections/chess-books/products/a-guide-to-chess-improvement-the-best-of-novice-nook-heisman"
  - "Heisman (2009) The Improving Chess Thinker (Mongoose) — https://openlibrary.org/search?q=The+Improving+Chess+Thinker"
  - "Heisman (2016) Is Your Move Safe? (Mongoose) — https://openlibrary.org/search?q=Is+Your+Move+Safe+Heisman"
  - "Heisman (2013) The Michael de la Maza story — https://www.chess.com/article/the-michael-de-la-maza-story"
  - "de la Maza (2001) 400 Points in 400 Days — https://stochasticgeometry.ie/~mdennehy/400Points.pdf"
  - "Chess.com: Why chess players blunder (Part 2) — https://www.chess.com/article/why-chess-players-blunder-part-2"
---

# Dan Heisman's Methods

## 1. Who and why it matters

Dan Heisman (b. 1950), a USCF National Master (peak 2285), has been a full-time instructor since 1996. He wrote the award-winning *Novice Nook* column (ChessCafe) and many books, including *Everyone's 2nd Chess Book*, *The Improving Chess Thinker* (2009), *A Guide to Chess Improvement* (2010), *Looking for Trouble* and *Is Your Move Safe?* (2016, CJA Best Instructional Book) [1]. His concepts are standard vocabulary among club coaches and online improvers, which makes them a de facto baseline the platform must address.

## 2. Hope Chess vs Real Chess

- **Hope Chess:** making a move *without checking* whether the opponent has a check, capture or threat in reply that you cannot meet. You "hope" nothing bad happens [3].
- **Real Chess:** for every serious candidate move, you look at the opponent's forcing replies (checks, captures, threats) and confirm that you can meet them, *before* you play the move [3].
- Hope Chess does not cause every blunder, because one can check and still miss something. Habitual Hope Chess, though, makes blunders near-certain [3].

**Rationale.** Below about 1800, most decisive moments are tactical oversights, such as hanging pieces and missed threats. This matches de la Maza's engine-graph observation [8] and the coaching consensus in [9]. *Evidence: moderate-indirect. Engine analysis of amateur games is consistent with the claim, but we found no published large-sample quantification.*

## 3. The structured thought process (simplified composite)

Heisman's recommended move-selection process, as distilled from his columns and books [2][4][5]:

1. **What did my opponent's last move do?** List *all* its consequences: new threats, attacked or undefended pieces, lines opened, squares abandoned.
2. **What are my candidate moves?** Always include forcing moves (checks, captures, threats) for both sides.
3. **Is each candidate safe?** After the move, can the opponent's checks, captures and threats win material or mate? (The safety check, or "blunder check".)
4. **Which safe candidate is best?** Calculate or evaluate as deeply as time and position criticality allow.
5. **Final sanity check** before touching the piece. Did I miss something obvious?

Supporting habits:
- **Counting:** a systematic way to evaluate exchange sequences on a square (attackers vs defenders, piece values, capture order).
- **"Loose pieces" awareness:** unprotected pieces are tactical targets.
- **Board vision:** scan the whole board, especially long diagonals and the opponent's long-range pieces.

## 4. Time management

Heisman repeatedly argues that improving players **play too fast in slow games**. In long time controls, they should use their time, slowing down in critical positions (captures, sharp tactics, endgame transitions) and moving faster in routine ones [2][4]. Playing long games and **analysing them afterwards** are core to his improvement plan [4][7].

## 5. The Improving Chess Thinker (2009): think-aloud protocols

Heisman recorded **think-aloud protocols** from players at various levels as they selected moves, in the spirit of de Groot. He used them to show characteristic process errors at each level: not considering opponent replies, stopping at the first good move, poor time allocation and unsound evaluation [5].

*Evidence: anecdotal–weak.* The data come from small numbers of students without formal analysis, but the protocol method itself is the classic one from expertise research (see `../01-learning-science/pattern-recognition-and-expertise.md`).

## 6. Tactics training advice

- **High volume of easy tactics, repeated** to build pattern recognition, rather than only hard problems. This is Heisman's critique of using difficult sets (such as all of CT-ART) for de la Maza's Seven Circles [7].
- Tactics books and puzzles graded to the learner's level.

## 7. Critiques and limits

- **Procedural overhead.** Running a full checklist on every move is impractical in fast games. Heisman himself frames the full process as necessary only in non-routine positions. Critics argue that over-proceduralization slows development of intuition. *Expert opinion.*
- **Sub-master focus.** The framework targets the transition from novice to about 2000. It does not address master-level strategy.
- **No outcome trials** exist. Adoption reflects coaching consensus.

## 8. Platform implementations

| Heisman concept | Grim Chess feature |
|---|---|
| Hope vs Real Chess | **"Safety-check" training mode**: before each move in a slow training game, the learner must mark the opponent's forcing replies (optional, fading over time) |
| What did their move do? | Prompt after the opponent's move: "List what changed." Feedback compares the answer with an engine-derived threat list |
| Blunder check | **Blunder-check drills**: positions where a plausible move loses to a forcing reply. The task is "Is this move safe? If not, why?" |
| Counting | Exchange-sequence micro-drills for beginners |
| Time management | Post-game **clock-use report**: time per move vs position criticality (engine eval volatility). Flags fast moves in critical positions |
| Long games + analysis | Default weekly plan includes at least one long game with guided self-analysis (see `game-study-and-analysis-loops.md`) |
| Easy tactics in volume | Recognition-track puzzles at a high success rate, separate from the calculation track (see `../01-learning-science/pattern-recognition-and-expertise.md`) |

**Key metric:** the **hope-chess rate**, the share of a learner's moves that allowed an immediate forcing refutation (engine drop ≥ 2 pawns within 2 plies). It is directly actionable, easy to compute and lets us test empirically whether Heisman-style drills reduce it.

## Sources

1. Wikipedia (accessed 2026). Dan Heisman. https://en.wikipedia.org/wiki/Dan_Heisman
2. Heisman, D. (n.d.). Dan Heisman Learning Center; index of Chess.com articles (incl. "Passive vs Basic Hope Chess"). https://www.danheisman.com/ ; https://danheisman.com/chesscom-articles.html
3. Eaton, T. (Lichess blog, n.d.). Hope chess (summary of Heisman's "The Secrets to 'Real' Chess"). https://lichess.org/@/TomEaton/blog/hope-chess/SxRLomNz
4. Heisman, D. (2010). *A Guide to Chess Improvement: The Best of Novice Nook*. Everyman Chess. https://www.chesshouse.com/collections/chess-books/products/a-guide-to-chess-improvement-the-best-of-novice-nook-heisman
5. Heisman, D. (2009). *The Improving Chess Thinker*. Mongoose Press. https://openlibrary.org/search?q=The+Improving+Chess+Thinker
6. Heisman, D. (2016). *Is Your Move Safe?* Mongoose Press. https://openlibrary.org/search?q=Is+Your+Move+Safe+Heisman
7. Heisman, D. (2013). The Michael de la Maza story. Chess.com. https://www.chess.com/article/the-michael-de-la-maza-story
8. de la Maza, M. (2001). 400 points in 400 days. https://stochasticgeometry.ie/~mdennehy/400Points.pdf
9. Chess.com (n.d.). Why chess players blunder (Part 2). https://www.chess.com/article/why-chess-players-blunder-part-2
