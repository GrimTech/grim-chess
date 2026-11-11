---
title: "Online Platform Pedagogy: Chessable, ChessKid, Lichess and Chess.com — What Each Gets Right and Wrong"
summary: "Feature-level review of the major online chess-learning platforms against learning-science criteria (retrieval, spacing, interleaving, feedback quality, cognitive load, transfer, motivation design, safety): Chessable MoveTrainer, ChessKid, Lichess Learn/Practice/Puzzles/Learn-from-mistakes, and Chess.com Lessons/Game Review/Puzzle Rush. Ends with a gap analysis for Grim Chess."
last_reviewed: 2026-11-11
evidence_strength_overall: "strong (feature descriptions from official docs); moderate (learning-science judgments by inference); moderate (Southwick et al. 2026 Chess.com log study); weak (platform-specific outcome studies are almost absent)"
sources:
  - "Chess.com/Chessable support on MoveTrainer — https://support.chess.com/en/articles/10319267-when-will-the-variations-be-ready-for-my-review"
  - "Chessentials: honest Chessable review — https://chessentials.com/chessable-honest-review/"
  - "Zwischenzug: How to use Chessable — https://zwischenzug.substack.com/p/how-to-use-chessable"
  - "ChessKid safety features — https://chesskid.com/article/view/how-to-understand-chesskids-safety-features2"
  - "Lichess blog: Announcing Practice — https://lichess.org/blog/WKhcaCUAAIVBvnv5/announcing-practice"
  - "Lichess blog: Something for the beginners (Learn) — https://lichess.org/blog/V5EX3CgAAIoE7aBR/something-for-the-beginners"
  - "Lichess blog: New puzzles are here — https://lichess.org/blog/X-S6gRUAAGjNX4ki/new-puzzles-are-here"
  - "Lichess open database (puzzles) — https://database.lichess.org/"
  - "Lichess blog: Learn from your mistakes — https://lichess.org/blog/WFvLpiQAACMA8e9D/learn-from-your-mistakes"
  - "Chess.com: How do lessons work — https://support.chess.com/en/articles/8609703-how-do-lessons-work-on-chess-com"
  - "Chess.com: Game Review — https://support.chess.com/en/articles/8584089"
  - "Chess.com features guide (Puzzle Rush) — https://www.chess.com/article/view/chesscom-features"
  - "Southwick et al. (2026) — https://doi.org/10.1177/09567976261452568"
---

# Online Platform Pedagogy: What Each Platform Gets Right and Wrong

## 1. Evaluation criteria

We assess each platform against the learning-science principles documented in `../01-learning-science/`:
1. **Retrieval** (answer before feedback)
2. **Spacing** (scheduled review)
3. **Interleaving / theme concealment**
4. **Feedback quality** (why, not just what)
5. **Cognitive-load fit** (level-appropriate guidance and fading)
6. **Transfer to games** (links between training and play)
7. **Motivation design** (supports autonomy and competence without exploitative loops)
8. **Safety** (especially for minors)

Judgments are **inferences from feature design**. No platform has published RCTs of its features' effects on playing strength. The closest evidence is Southwick et al. (2026), who used Chess.com logs and found deliberate-practice-aligned activities 3.61× more rating-efficient per hour than games, while users spent over 90% of their time playing [13].

## 2. Chessable (MoveTrainer)

**What it is:** courses (often by GMs) delivered as interactive move sequences, drilled with a spaced-repetition scheduler. Each move has its own review timer, and a late or wrong answer resets that move's level [1].

| Gets right | Gets wrong / risks |
|---|---|
| **Retrieval + spacing** built in. A genuine application of the two "high utility" techniques [1] | **Move recall ≠ understanding.** Users can pass drills without knowing plans; critics say it confuses "doing it once" with knowing [2][3] |
| Large catalogue of expert-authored content | **Review debt.** Missed days lead to backlogs and resets [1] |
| Configurable schedule and think time [2] | **Position-specific memorization** (same position, same move) risks surface learning |
| | Encourages **over-investment in openings** for sub-1800 players (see `opening-repertoire-building.md`) |
| | Self-paced with no diagnosis linking courses to the learner's weaknesses |

## 3. ChessKid

**What it is:** Chess.com's children's platform, with video lessons, puzzles, play vs computer and peers, clubs and gamified levels.

| Gets right | Gets wrong / risks |
|---|---|
| **Safety-first social design.** Adults cannot message kids; kids cannot chat with each other; guardians control friends and clubs and can view messages [4] | Gamification can **reward volume over quality** (e.g., badges for puzzles solved, not delayed retention) (*inference*) |
| Child-appropriate presentation (characters, short videos) that matches attention and cognitive-load needs | Limited structured, mastery-gated curriculum compared with Steps (*inference*) |
| Parent/coach dashboards and club tools | Outcome evidence is not published |

(See `../05-children/online-safety-for-minors.md` for the detailed safety review.)

## 4. Lichess (Learn, Practice, Puzzles, Learn from Mistakes)

**What it is:** free, open-source, non-profit.
- **Learn** ("Chess basics"): interactive beginner stages for piece movement, capture and first mates [6].
- **Practice:** instructive positions played against the engine, covering checkmate patterns, tactics and endgame techniques (e.g., knight + bishop mate) [5].
- **Puzzles:** generated from **about 600 million analysed Lichess games**, re-analysed with Stockfish NNUE, auto-tagged by more than 100 themes, each with its own **Glicko-2 rating**. The open database holds about 6 million puzzles (CC0) [7][8].
- **Learn from your mistakes:** replays your engine-flagged errors as puzzles [9].

| Gets right | Gets wrong / risks |
|---|---|
| **Real-game puzzles at scale**, rating-matched (Glicko-2). Good pattern-library exposure (see `../01-learning-science/chunking-and-template-theory.md`) | **No spaced review** of missed puzzle patterns by default (*inference*) |
| **Theme concealment** in the default puzzle stream (mixed themes) | Theme-filtered training invites **blocked practice** without guidance on when to mix |
| **Learn from your mistakes** creates retrieval from one's own games [9] | Little structured curriculum beyond the basics, and Practice content is limited [5] |
| Open data (puzzles, games) enables research and reuse [8] | No guidance on activity mix; play-dominant usage is the default |
| Practice positions use **play-out against engine** (active learning) [5] | Minimal motivational scaffolding for long-term plans |

## 5. Chess.com (Lessons, Game Review, Puzzles, Puzzle Rush)

**What it is:** the largest commercial platform.
- **Lessons:** coach-guided explanations with interactive challenges. The newer Learn Path uses interactive exercises instead of video [10].
- **Game Review:** accuracy, move classifications, key moments, **coach explanations** and **retry** of key moves, with feedback on the user's choice. Access varies by membership tier [11].
- **Puzzle Rush:** timed puzzles of increasing difficulty; three misses end the run [12].

| Gets right | Gets wrong / risks |
|---|---|
| **Retry key moves** in Game Review is retrieval from one's own games [11] | **Engine-first review.** Classifications appear immediately, so the user does not self-annotate first (see `game-study-and-analysis-loops.md`) |
| Lessons interleave explanation with interactive challenges [10] | Move labels ("brilliant", "blunder") and accuracy scores gamify review but can **misrepresent** sharp vs quiet games (see `engine-use-best-practices.md`) |
| Puzzle Rush builds **speed recognition** | Puzzle Rush rewards speed and volume and does little for calculation depth; it can encourage guessing (*inference*) |
| Scale enables research (e.g., Southwick et al. used Chess.com logs [13]) | Default behaviour is game-dominant (90%+ of time [13]), and the product does not actively rebalance the mix |
| | Key learning features sit behind paywalls, which may limit equitable access [11] |

## 6. Cross-platform gap analysis: what nobody does well

| Gap | Why it matters | Grim Chess response |
|---|---|---|
| **Diagnosis-driven plans** linking game errors to the curriculum | Deliberate practice targets weaknesses (Dvoretsky) | Monthly diagnosis, then auto-generated training blocks |
| **Activity-mix coaching** | 3.61× efficiency gap; play-dominant usage [13] | Weekly plan with target mix; nudges |
| **Pattern-level spaced repetition with fresh instances** | Avoid position memorization | FSRS on patterns with instance rotation (see `../01-learning-science/spaced-repetition-and-fsrs.md`) |
| **Self-annotation before engine** | Generation / self-explanation | Engine-lock workflow |
| **Calculation track with full-line entry** | Depth, not just recognition | Exam mode |
| **Published outcome data** | Accountability to auditors | Cohort outcome reporting and A/B results |
| **Explanations grounded in verified lines** | LLM hallucination risk | Verified-line-only explanation policy |

## Sources

1. Chess.com/Chessable Help Center (n.d.). When will the variations be ready for my review? https://support.chess.com/en/articles/10319267-when-will-the-variations-be-ready-for-my-review
2. Chessentials (n.d.). Is Chessable all it's cracked up to be? An honest review. https://chessentials.com/chessable-honest-review/ ; critique: https://smithyq.blogspot.com/2024/01/why-i-stopped-using-online-opening.html
3. Zwischenzug (Substack, n.d.). How to use Chessable. https://zwischenzug.substack.com/p/how-to-use-chessable
4. ChessKid (n.d.). How to: Understand ChessKid's safety features. https://chesskid.com/article/view/how-to-understand-chesskids-safety-features2
5. Lichess (2017). Announcing Practice. https://lichess.org/blog/WKhcaCUAAIVBvnv5/announcing-practice ; Interactive lessons: https://lichess.org/blog/WtDErSQAADJfhJJs/interactive-lessons
6. Lichess (2016). Something for the beginners. https://lichess.org/blog/V5EX3CgAAIoE7aBR/something-for-the-beginners
7. Lichess (2020). New puzzles are here. https://lichess.org/blog/X-S6gRUAAGjNX4ki/new-puzzles-are-here
8. Lichess open database: puzzles. https://database.lichess.org/
9. Lichess (2016). Learn from your mistakes. https://lichess.org/blog/WFvLpiQAACMA8e9D/learn-from-your-mistakes
10. Chess.com Help Center (n.d.). How do lessons work on Chess.com? https://support.chess.com/en/articles/8609703-how-do-lessons-work-on-chess-com
11. Chess.com Help Center (n.d.). Game Review. https://support.chess.com/en/articles/8584089 ; update on Coach explanations: https://www.chess.com/announcements/view/update-game-reviews-coach-now-with-more-in-depth-line-explanation
12. Chess.com (n.d.). The complete guide to Chess.com features. https://www.chess.com/article/view/chesscom-features
13. Southwick, D. A., et al. (2026). Not all practice is created equal. *Psychological Science*, 37(7), 514–523. https://doi.org/10.1177/09567976261452568
