---
title: "Game Study and Analysis Loops: Guess-the-Move, Long Games and Post-Mortems"
summary: "Two core feedback loops of chess improvement: (1) active study of annotated master games ('guess the move' / solitaire chess), and (2) playing long games followed by structured analysis (self-annotation first, then opponent post-mortem, engine check and coach review). Covers rationale (deliberate practice, self-explanation, Ericsson's prediction-of-master-moves account), historical practice (Botvinnik, Dvoretsky), scoring schemes, and a concrete platform workflow."
last_reviewed: 2026-11-11
evidence_strength_overall: "moderate (serious study, including game analysis, predicts skill; self-explanation effect); expert consensus (specific workflows); weak (comparative trials)"
sources:
  - "Ericsson, Krampe & Tesch-Römer (1993) — https://doi.org/10.1037/0033-295X.100.3.363"
  - "Charness et al. (2005) — https://doi.org/10.1002/acp.1106"
  - "Burgoyne et al. (2019) — https://englelab.gatech.edu/articles/2019/Burgoyne_et_al_2019_AJP.pdf"
  - "Chi et al. (1989) self-explanation — https://doi.org/10.1207/s15516709cog1302_1"
  - "Pandolfini, Solitaire Chess (Chess Life column; Random House 2005) — https://chesshistory.com/winter/extra/pandolfini.html"
  - "chessgames.com Guess-the-Move — https://www.chessgames.com/perl/quiz?help=1"
  - "Kasparov (1986) The Test of Time, Botvinnik preface — https://archive.org/download/CHESSGrandmaster/The%20Test%20Of%20Time%20-%20by%20Garry%20Kasparov.pdf"
  - "Doggers (2016) Dvoretsky obituary — https://www.chess.com/news/view/famous-trainer-mark-dvoretsky-dies-at-68-7322"
  - "Lichess blog: Learn from your mistakes — https://lichess.org/blog/WFvLpiQAACMA8e9D/learn-from-your-mistakes"
  - "Heisman (2010) A Guide to Chess Improvement — https://www.chesshouse.com/collections/chess-books/products/a-guide-to-chess-improvement-the-best-of-novice-nook-heisman"
  - "Southwick et al. (2026) — https://doi.org/10.1177/09567976261452568"
---

# Game Study and Analysis Loops

## 1. Why these loops matter

- In Ericsson's account of chess deliberate practice, the prototypical activity is **studying master games by predicting each move and, when the prediction is wrong, analysing why the master's move is better** [1]. This turns passive game replay into a retrieval-and-feedback task.
- Charness et al. found **serious study alone** to be the best predictor of rating. That category includes analysing one's own games and master games [2]. Tournament play also contributes independently, though modestly (Burgoyne et al. 2019) [3].
- **Self-explanation effect:** learners who explain worked examples to themselves learn more than those who only read them (Chi et al. 1989) [4]. Annotating one's own games is structured self-explanation.
- Play without review is relatively inefficient per hour. Games are 3.61× *less* rating-efficient than deliberate-practice activities (Southwick et al. 2026) [11]. This does not mean games are useless. It means **games become much more valuable when they feed analysis**.

## 2. Loop A: active master-game study ("guess the move")

### 2.1 Format
Bruce Pandolfini's long-running *Chess Life* column, "Solitaire Chess" (also a 2005 book), is the canonical format [5]:
1. Cover the game score and play through from one side's perspective.
2. Before revealing each move, choose your move.
3. **Score it:** full par points for the game move, partial points for good alternatives, and sometimes deductions for poor moves. Annotations explain the master's choice.
4. Total the score and map it to an approximate rating band.

Online variants (e.g., chessgames.com Guess-the-Move) give engine-based partial credit for good alternatives [6].

### 2.2 Why it works (theory)
- **Generation / retrieval** before feedback (see `../01-learning-science/retrieval-practice-interleaving-desirable-difficulties.md`).
- **Worked-example study with self-explanation** (see `../01-learning-science/cognitive-load-theory.md`).
- **Template building** from coherent games in a given structure (see `../01-learning-science/chunking-and-template-theory.md`).

### 2.3 Pitfalls
- A move that differs from the master's is not necessarily wrong. Scoring must use engine evaluation tolerance plus the annotator's explanations.
- Annotations by modern standards are sometimes wrong. Classic books contain analytical errors, so engine-verify.
- Passive "clicking through" defeats the purpose. Require commitment before reveal.

### 2.4 Game selection
- **Annotated classics** (e.g., collections by Chernev, Euwe, Nunn, Kasparov's *My Great Predecessors*) for breadth.
- **Structure-based model games** for openings and middlegames (template building).
- **Games of one strong player in sequence** to absorb a coherent style. This is a commonly recommended method; Botvinnik recommended studying specific masters. *Expert consensus.*

## 3. Loop B: play → self-analysis → post-mortem → engine → coach

### 3.1 Historical practice
- **Botvinnik** insisted on deep analysis of one's own games and argued that players should **publish their analyses** so that others can find the errors [7].
- **Dvoretsky** built each student's training "diagnosis" from their own games (see `soviet-school-botvinnik-dvoretsky-yusupov.md`) [8].
- **Heisman** recommends that improvers play **long games** and **analyse them** as the backbone of improvement [10].

### 3.2 The recommended sequence

| Step | What | Why |
|---|---|---|
| 1. Play a long game | Classical or rapid (≥ 15+10, ideally 30+ minutes) | Exercises calculation and evaluation; slow enough for genuine decisions |
| 2. **Self-annotate before any engine** | Mark critical moments, candidate moves considered, time spent and what you feared | Self-explanation [4]; preserves the record of your *thinking*, which the engine cannot recover |
| 3. Post-mortem with the opponent (OTB or chat, where safe) | Compare what each side saw | A human view of the game's critical moments; social learning |
| 4. Engine check | Compare with engine evaluations. Classify each error (tactical oversight, calculation error, evaluation error, strategic misjudgment, time trouble, opening knowledge gap) | Precise feedback; the classification feeds the diagnosis |
| 5. Extract lessons | 1–3 takeaways per game; convert specific errors into review cards | Turns the game into future practice items (see `../01-learning-science/spaced-repetition-and-fsrs.md`) |
| 6. Coach / peer review (periodic) | Review the annotated game | Catches blind spots the engine cannot explain |

**Key rule: self-analysis before engine analysis.** Going straight to the engine replaces the learner's thinking with the engine's evaluation and removes the self-explanation and generation benefits. *Expert consensus. Consistent with the generation-effect literature; no chess-specific trials found.*

### 3.3 Existing tool example
Lichess's "Learn from your mistakes" mode replays a game's engine-flagged errors as puzzles for the player to re-solve [9]. This makes the loop active rather than passive. It does not require self-annotation first.

## 4. Platform workflow (Grim Chess)

1. **After every long game:** prompt a 5–15 minute self-annotation (critical moments, candidates and fears, as voice or text). Lock the engine until the learner submits or skips. Skipping is allowed but tracked.
2. **Automatic error classification** by engine plus heuristics (blunder, missed tactic, positional drift, time trouble), shown next to the learner's own notes. Highlight the *disagreements* between what the learner thought was critical and what was actually critical.
3. **"Re-solve your mistakes"** puzzles generated from the game (Lichess-style [9]). They are added to SRS if failed.
4. **Monthly diagnosis report** aggregating error classes, which drives the next training block (Dvoretsky-style diagnosis [8]).
5. **Guess-the-move library** of annotated master games, filterable by opening and structure, with engine-tolerance scoring and annotator explanations [5][6].
6. **Shareable annotated games** for peer and coach review (Botvinnik's "publish your analysis" [7]), with privacy controls (and none for minors by default; see `../05-children/online-safety-for-minors.md`).

## 5. Evidence status and planned experiments

- Status: these loops are **central to every serious training tradition**, and the theory behind them is strong. **No published trial compares**, for example, self-analysis-first with engine-first.
- Planned A/B tests: (a) engine lock until self-annotation vs immediate engine access; (b) guess-the-move vs passive replay of the same games. Outcomes: delayed puzzle performance on the themes involved and 6-month rating change.

## Sources

1. Ericsson, K. A., Krampe, R. T., & Tesch-Römer, C. (1993). The role of deliberate practice in the acquisition of expert performance. *Psychological Review*, 100(3), 363–406. https://doi.org/10.1037/0033-295X.100.3.363
2. Charness, N., et al. (2005). The role of deliberate practice in chess expertise. *Applied Cognitive Psychology*, 19, 151–165. https://doi.org/10.1002/acp.1106
3. Burgoyne, A. P., et al. (2019). *American Journal of Psychology*, 132(1), 27–38. https://englelab.gatech.edu/articles/2019/Burgoyne_et_al_2019_AJP.pdf
4. Chi, M. T. H., Bassok, M., Lewis, M. W., Reimann, P., & Glaser, R. (1989). Self-explanations: How students study and use examples in learning to solve problems. *Cognitive Science*, 13(2), 145–182. https://doi.org/10.1207/s15516709cog1302_1
5. Pandolfini, B. *Solitaire Chess* (Chess Life column; book, Random House, 2005). Background: Winter, E., Chess Notes on Pandolfini. https://chesshistory.com/winter/extra/pandolfini.html
6. chessgames.com (n.d.). Guess-the-Move help. https://www.chessgames.com/perl/quiz?help=1
7. Kasparov, G. (1986). *The Test of Time* (preface by M. Botvinnik). https://archive.org/download/CHESSGrandmaster/The%20Test%20Of%20Time%20-%20by%20Garry%20Kasparov.pdf
8. Doggers, P. (2016). Famous trainer Mark Dvoretsky dies at 68. Chess.com. https://www.chess.com/news/view/famous-trainer-mark-dvoretsky-dies-at-68-7322
9. Lichess (2016). Learn from your mistakes (blog announcement). https://lichess.org/blog/WFvLpiQAACMA8e9D/learn-from-your-mistakes
10. Heisman, D. (2010). *A Guide to Chess Improvement: The Best of Novice Nook*. Everyman. https://www.chesshouse.com/collections/chess-books/products/a-guide-to-chess-improvement-the-best-of-novice-nook-heisman
11. Southwick, D. A., et al. (2026). Not all practice is created equal. *Psychological Science*, 37(7), 514–523. https://doi.org/10.1177/09567976261452568
