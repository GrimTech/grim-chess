---
title: "Engine Use: Best Practices and Pitfalls for Learners"
summary: "How strong engines (Stockfish, Leela) and human-like models (Maia) should and should not be used in training: engine-last analysis, converting evaluations to win probability and accuracy, avoiding passive acceptance and 'computer moves', calibrated sparring, opening preparation risks, elite coaches' engine-delay practices (Gukesh/Vishnu Prasanna), explanation gaps and LLM hallucination risks, and fair-play boundaries."
last_reviewed: 2026-11-11
evidence_strength_overall: "strong (engine evaluation accuracy and human-move modelling results); expert consensus/anecdotal (pedagogical rules such as engine-last); weak (comparative learning trials)"
sources:
  - "Lichess accuracy and Win% documentation — https://lichess.org/page/accuracy"
  - "McIlroy-Young et al. (2020) Maia — https://arxiv.org/abs/2006.01855"
  - "Maia blog — https://maiachess.com/blog/introducing_maia"
  - "Chess.com Vishnu Prasanna interview — https://www.chess.com/article/view/vishnu-prassana-interview-coaching-gukesh"
  - "inkl: Young Gukesh did not use chess engines — https://www.inkl.com/news/young-gukesh-did-not-use-chess-engines-family-coach-lent-the-fuel"
  - "Lichess blog: Learn from your mistakes — https://lichess.org/blog/WFvLpiQAACMA8e9D/learn-from-your-mistakes"
  - "Zwischenzug: Centipawns suck — https://zwischenzug.substack.com/p/centipawns-suck"
  - "Regan & Haworth (2011) Intrinsic chess ratings — https://scholar.google.com/scholar?q=Regan+Haworth+%22Intrinsic+Chess+Ratings%22"
  - "Chess Engine Lab: expected score of GMs by evaluation — https://chessenginelab.substack.com/p/expected-score-of-grandmasters"
  - "de la Maza (2001) on engine-busting positional plans — https://stochasticgeometry.ie/~mdennehy/400Points.pdf"
---

# Engine Use: Best Practices and Pitfalls for Learners

## 1. Context

Modern engines (Stockfish NNUE, Leela Chess Zero) play far above any human and give near-ground-truth tactical evaluations in most positions. They are the best *feedback source* chess has ever had. They are also a *learning hazard*, because they make it easy to skip one's own thinking and they do not explain *why*.

## 2. Evaluation literacy

- **Centipawns are not intuitive.** +0.5 in a quiet position and +0.5 in a wild one mean very different things for humans. Win-probability scales are more meaningful [1][7].
- **Lichess converts evaluations to Win%** using a logistic function fitted to real game data: Win% = 50 + 50·(2/(1 + e^(−0.00368208·cp)) − 1). Move accuracy is then computed from the drop in Win% between positions [1].
- **Human expected score depends on rating.** Analyses of GM games show how expected score varies with engine evaluation [9]. For amateurs the same evaluation converts to a lower win rate because errors are more frequent.
- **Practical rule:** teach learners to read evaluations as *"is this clearly winning, slightly better, balanced or lost for a human at my level?"*, not as decimals.

## 3. Best practices

| Practice | Rationale | Evidence |
|---|---|---|
| **Engine last.** Analyse your own game (and solve exercises) before turning the engine on | Preserves generation and self-explanation benefits (see `game-study-and-analysis-loops.md`) | Expert consensus; consistent with learning science |
| **Ask the engine specific questions** ("Was my sacrifice sound? What did I miss on move 23?") rather than scrolling evaluations | Focused feedback | Expert consensus |
| **Play out positions against the engine** (from critical moments or endgames) instead of just reading its line | Active retrieval; reveals why a line works | Expert consensus; Dvoretsky-style play-outs |
| **Use tablebases for endgames** | Perfect ground truth | Strong |
| **Convert errors into exercises** (Lichess "Learn from your mistakes" [6]) | Retrieval of one's own mistakes | Expert consensus |
| **Use human-like models for sparring and "what would a human play"** | Maia predicts human moves at specific rating levels (about 46–52% top-1 accuracy, peaking at the rating band it was trained on), far better than Stockfish or Leela at that task [2][3] | Strong (move-prediction accuracy); untested for learning outcomes |
| **Check "human-playable" alternatives** | Engines may prefer lines no human would find. Look at the engine's top 3 and pick the most understandable good move | Expert consensus |

## 4. Pitfalls

1. **Passive acceptance.** Reading the engine's best line without understanding it leaves the learner with little retained (re-reading fluency illusion; see `../01-learning-science/retrieval-practice-interleaving-desirable-difficulties.md`).
2. **Calculation atrophy.** Elite coaches have deliberately delayed engine use. GM Vishnu Prasanna had **D. Gukesh train largely without engines until near elite level**, arguing that thinking without an engine builds human understanding. Anand reportedly advised Gukesh that this was fine for now, but that he would eventually need to switch [4][5]. *Anecdotal (n = 1), from a highly successful case.*
3. **"Computer moves" in openings.** Memorizing engine-preferred lines that the learner cannot understand or follow up. This is the main risk of engine-heavy opening preparation (see `opening-repertoire-building.md`).
4. **Weak-engine sparring is unnatural.** Traditional engines with strength reduced play perfectly and then blunder at random, which is unlike human opponents. Human-like models (Maia) are more realistic [2][3].
5. **Plans busted by engines.** De la Maza noted that engines quickly "bust" book plans in positions of strategic manuals, leaving class players lost [10]. Engines judge concrete truth, but humans need *plans they can execute*. Present both.
6. **Explanation gap and LLM hallucination.** Engines give moves, not reasons. Language models used to "explain" engine lines often invent tactics or misdescribe positions. **Any natural-language explanation must be grounded in verified engine lines and board-state checks.** *We observed no published evaluation of LLM chess explanations' accuracy that would justify unverified use.*
7. **Over-trusting accuracy scores.** Accuracy and ACPL depend on game sharpness. A quiet draw can score high and a sharp, well-played game low [7]. Do not use them as a single skill metric.

## 5. Fair-play boundaries

- Engine assistance during rated games is cheating on every platform. Detection approaches include statistical comparison of move choices with engine choices, weighted by position difficulty. Regan & Haworth's "intrinsic rating" work is the academic foundation [8].
- **Platform rule:** analysis tools are disabled during live games, including for correspondence-style training games unless they are explicitly marked "assisted".

## 6. Engine-use policy by level (platform defaults)

| Band | Engine access policy |
|---|---|
| 0–1200 | Engine hidden by default. Post-game shows only "big mistakes" (≥ 2-pawn drops) as re-solve puzzles with simple explanations |
| 1200–1800 | Engine after self-annotation. Top-3 lines with Win% framing. Maia-based "most human move" option |
| 1800–2200 | Full engine after self-annotation. Play-out from critical positions. Opening-prep tools with "understandability" warnings |
| 2200+ | Full access, including multi-PV, deep analysis and preparation tools. Optional engine-free training weeks (Vishnu Prasanna-style) as a calculation cycle |

These policies are **design defaults derived from expert practice and learning theory**. The engine-lock policy in particular should be A/B tested (see `game-study-and-analysis-loops.md` §5).

## Sources

1. Lichess (n.d.). Accuracy metric (Win% and Accuracy% definitions). https://lichess.org/page/accuracy ; formula reproduction: https://lichess.org/@/JoaoTx/blog/exploring-the-python-chess-module/P0nb4FEs
2. McIlroy-Young, R., Sen, S., Kleinberg, J., & Anderson, A. (2020). Aligning superhuman AI with human behavior: Chess as a model system. *KDD '20*. https://arxiv.org/abs/2006.01855
3. Maia Chess team (2020). Introducing Maia. https://maiachess.com/blog/introducing_maia
4. Chess.com (2022). Interviewing the coach of Olympiad sensation Gukesh. https://www.chess.com/article/view/vishnu-prassana-interview-coaching-gukesh
5. inkl / news syndication (n.d.). Young Gukesh did not use chess engines; family, coach lent the fuel. https://www.inkl.com/news/young-gukesh-did-not-use-chess-engines-family-coach-lent-the-fuel
6. Lichess (2016). Learn from your mistakes. https://lichess.org/blog/WFvLpiQAACMA8e9D/learn-from-your-mistakes
7. Zwischenzug (Substack, n.d.). Centipawns suck. https://zwischenzug.substack.com/p/centipawns-suck
8. Regan, K. W., & Haworth, G. M. (2011). Intrinsic chess ratings. *Proceedings of AAAI-11*. https://scholar.google.com/scholar?q=Regan+Haworth+%22Intrinsic+Chess+Ratings%22
9. Chess Engine Lab (Substack, n.d.). Expected score of grandmasters based on evaluation. https://chessenginelab.substack.com/p/expected-score-of-grandmasters
10. de la Maza, M. (2001). 400 points in 400 days. https://stochasticgeometry.ie/~mdennehy/400Points.pdf
