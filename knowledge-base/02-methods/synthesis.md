---
title: "Synthesis: Implementable Training Principles (P1–P27)"
summary: "Distils the learning-science and chess-method files into 27 concrete, implementable principles for the Grim Chess platform. Each principle has a rationale, an implementation sketch, an evidence-strength rating and links to the knowledge-base files and primary sources. Includes a default activity-mix table by rating band and a list of planned validation experiments."
last_reviewed: 2026-11-11
evidence_strength_overall: "mixed; rated per principle (strong / moderate / weak / expert consensus)"
sources:
  - "Southwick et al. (2026) — https://doi.org/10.1177/09567976261452568"
  - "Charness et al. (2005) — https://doi.org/10.1002/acp.1106"
  - "Hambrick et al. (2014) — https://www.gwern.net/doc/psychology/chess/2014-hambrick.pdf"
  - "Burgoyne et al. (2019) — https://englelab.gatech.edu/articles/2019/Burgoyne_et_al_2019_AJP.pdf"
  - "Dunlosky et al. (2013) — https://doi.org/10.1177/1529100612453266"
  - "Cepeda et al. (2006) — https://doi.org/10.1037/0033-2909.132.3.354"
  - "Brunmair & Richter (2019) — https://doi.org/10.1037/bul0000209"
  - "Kalyuga et al. (2003) — https://doi.org/10.1207/S15326985EP3801_4"
  - "Bilalić, McLeod & Gobet (2008) — https://doi.org/10.1016/j.cognition.2008.05.005"
  - "Gobet & Simon (1996) — https://doi.org/10.1006/cogp.1996.0011"
  - "McIlroy-Young et al. (2020) — https://arxiv.org/abs/2006.01855"
  - "Adhikari, Anatolyev & Dagaev (2023) — https://pages.nes.ru/sanatoly/Papers/TiltChess.htm"
  - "All other sources: see linked files"
---

# Synthesis: Implementable Training Principles

**How to read this file.** Each principle states *what* the platform does, *why* (with sources) and *how strong* the evidence is. "Expert consensus" means that the method literature and elite coaching practice agree but no controlled outcome study exists. File references are relative to `knowledge-base/`.

---

## A. Practice allocation and measurement

**P1 — Log practice objectively and rebalance the activity mix away from unreviewed play.**
Online learners spend over 90% of their time playing games. Deliberate-practice-aligned activities were 3.61× more rating-efficient per hour [Southwick et al. 2026]. Serious study is the strongest controllable predictor of rating [Charness et al. 2005; Burgoyne et al. 2019].
*Implementation:* time-on-task logging by activity type. A weekly plan with a target mix (table below). Nudges when the mix drifts.
*Evidence:* **moderate–strong** (observational, large N). Files: `01-learning-science/deliberate-practice-in-chess.md`.

**P2 — Keep games in the plan, but make them long and reviewed.**
Tournament or long play adds independent variance beyond study [Burgoyne et al. 2019; Howard 2012] and is the only true transfer test.
*Implementation:* at least one long game per week (≥ 15+10, ideally 30+ minutes) with the review workflow (P11).
*Evidence:* **moderate**. Files: `02-methods/game-study-and-analysis-loops.md`.

**Default weekly activity mix by band** (initial design defaults, to be tuned by experiment; *expert-judgment synthesis*):

| Band | Tactics (recognition + calculation) | Own-game review | Endgames | Strategy / master games | Openings | Games played |
|---|---|---|---|---|---|---|
| 0–1000 | 35% | 10% | 15% | 5% | ≤ 5% | 30% |
| 1000–1500 | 30% | 15% | 15% | 10% | 5–10% | 25% |
| 1500–1900 | 25% | 15% | 15% | 15% | 10–15% | 20% |
| 1900–2200 | 20% | 15% | 15% | 20% | 15–20% | 15% |
| 2200+ | 15% | 15% | 10% | 20% | 20–30% | 15% (+ OTB) |

---

## B. Core learning-science mechanics

**P3 — Commit before feedback, everywhere.**
Retrieval practice beats restudy for delayed retention (g ≈ 0.50–0.61) [Roediger & Karpicke 2006; Rowland 2014; Adesope et al. 2017]. Ericsson's prototypical chess deliberate practice is predicting the master's move before seeing it [Ericsson et al. 1993].
*Implementation:* every exercise needs a committed answer (a full line for calculation items). Lessons open with a question.
*Evidence:* **strong** (general), **expert consensus** (chess). Files: `01-learning-science/retrieval-practice-interleaving-desirable-difficulties.md`.

**P4 — Use FSRS-family spaced repetition for stable knowledge, scheduled at pattern level with fresh instances.**
Spacing is a high-utility technique [Dunlosky et al. 2013; Cepeda et al. 2006]. FSRS predicts recall better than SM-2 on benchmark data [srs-benchmark].
*Implementation:* FSRS scheduler with objective grading. Content-specific retention targets (canon endgames and repertoire about 0.90; patterns about 0.85). Pattern-level cards rotate positions. SRS capped at about 20–25% of training time.
*Evidence:* **strong** (retention), **untested** (chess strength). Files: `01-learning-science/spaced-repetition-and-fsrs.md`.

**P5 — Introduce motifs in blocks, then interleave and conceal themes; train discrimination between confusable concepts.**
Interleaving g ≈ 0.42, strongest for similar categories [Brunmair & Richter 2019]. Learners wrongly prefer blocking [Kornell & Bjork 2008].
*Implementation:* three phases (blocked intro → mixed related → fully mixed, theme hidden). Discrimination sets (e.g., Philidor vs Lucena).
*Evidence:* **moderate**. Same file as P3.

**P6 — Calibrate difficulty; escalate when practice becomes comfortable.**
Desirable difficulties [Bjork & Bjork 2011]. Ericsson's "arrested development" through automaticity [Ericsson 2006].
*Implementation:* target about 60–80% success on new material. If success stays above about 85% for a sustained period, raise difficulty or novelty.
*Evidence:* **moderate** (principle), **weak** (exact band; A/B test required). Files: `01-learning-science/plateaus-and-rating-stagnation.md`.

**P7 — Worked example → completion problem → independent problem, with per-topic guidance fading.**
Worked-example and guidance-fading effects for novices. Expertise reversal for advanced learners [Sweller 1988; Renkl & Atkinson 2003; Kalyuga et al. 2003].
*Implementation:* guidance level is a per-topic learner property. Integrated on-board annotation (split-attention). Clean-board mode for experts.
*Evidence:* **moderate–strong** (general). Files: `01-learning-science/cognitive-load-theory.md`.

---

## C. Chess-skill architecture

**P8 — Run two tactical tracks: recognition (high volume, fast) and calculation (deep, full-line "exam mode").**
Most skill variance operates at speed [Burns 2004]. Experts also search more and deeper when needed [Campitelli & Gobet 2004]. Aagaard's calculation toolkit.
*Implementation:* recognition stream (rated, timed, mixed themes) plus a calculation track (no piece moving, timer, full-line entry, scored on main line and defences, tagged by technique).
*Evidence:* **moderate**. Files: `01-learning-science/pattern-recognition-and-expertise.md`, `02-methods/aagaard-grandmaster-preparation.md`.

**P9 — Train against the Einstellung effect.**
Familiar solutions block better ones, even in experts [Bilalić et al. 2008].
*Implementation:* "second-solution" problem pool. A candidate-breadth metric (was the best move on the learner's list?). Prompts to look for a better move.
*Evidence:* **strong** (phenomenon), **expert consensus** (training). Files: `02-methods/kotov-tree-of-analysis.md`.

**P10 — Teach a structured but non-rigid thought process, including a blunder check (Real Chess), and fade it as it becomes automatic.**
Sub-1800 games are dominated by tactical oversights. Heisman's Real Chess. Kotov's rigid tree is rejected in favor of progressive deepening [de Groot; Nunn; Aagaard].
*Implementation:* safety-check training mode, blunder-check drills, a "hope-chess rate" metric and Kotov-syndrome detection.
*Evidence:* **expert consensus**, with moderate indirect support. Files: `02-methods/heisman-thought-process-and-real-chess.md`, `02-methods/kotov-tree-of-analysis.md`.

**P11 — Close the loop on every long game: self-annotate before the engine, classify errors, convert them into practice items.**
Self-explanation effect [Chi et al. 1989]. Botvinnik's self-critical analysis. Lichess "Learn from your mistakes".
*Implementation:* engine lock until self-annotation (skippable, tracked). Error classification. Re-solve puzzles. Failed items go into SRS.
*Evidence:* **moderate** (theory), **expert consensus** (workflow). Files: `02-methods/game-study-and-analysis-loops.md`.

**P12 — Make master-game study active (guess-the-move) and organize it by pawn-structure families.**
Template theory: templates form around recurring structures [Gobet & Simon 1996]. Pandolfini's Solitaire Chess.
*Implementation:* a model-game library tagged by opening and structure, with engine-tolerant scoring plus annotator explanations.
*Evidence:* **moderate** (theory), **expert consensus**. Files: `01-learning-science/chunking-and-template-theory.md`, `02-methods/game-study-and-analysis-loops.md`.

**P13 — Deliver a rating-banded endgame canon with tablebase play-outs and SRS.**
Silman's level-banding. de la Villa and Dvoretsky canon. Tablebases give perfect feedback.
*Implementation:* the canon table in the endgame file. Mastery means a successful play-out against tablebase defence. High retention targets.
*Evidence:* **expert consensus** (content); **strong** (feedback validity). Files: `02-methods/endgame-study-methods.md`.

**P14 — Scale opening investment to level. Teach understanding before memorization. Build repertoire from the learner's own games.**
Opening advantage is small even at 2200+ [Mackenzie]. Amateur games swing far more.
*Implementation:* band-specific time budgets. Model games, then plan cards, then move cards. Repertoire-deviation reports after games.
*Evidence:* **weak–moderate**. Files: `02-methods/opening-repertoire-building.md`.

**P15 — Teach strategy through structure families and explicit frameworks (imbalances, three questions, prophylaxis), always tested concretely.**
Silman, Nimzowitsch, Aagaard and Dvoretsky. Watson's rule independence. De la Maza's engine critique.
*Implementation:* imbalance and three-question prompts. "Plan vs engine" play-outs. Principles presented with explicit exceptions.
*Evidence:* **expert consensus**. Files: `02-methods/positional-frameworks-nimzowitsch-silman.md`.

**P16 — Engine policy by band: engine-last, Win% framing, human-like sparring, verified-only explanations.**
Lichess Win%/accuracy model. Maia predicts human moves by rating band [McIlroy-Young et al. 2020]. Engine-delayed training of Gukesh.
*Implementation:* the band policy table in the engine file. No unverified LLM explanations.
*Evidence:* **strong** (tools), **expert consensus/anecdotal** (pedagogy). Files: `02-methods/engine-use-best-practices.md`.

**P17 — Use fine-grained, mastery-gated progression for beginners (Steps) and mixed-topic, scored units for intermediates (Yusupov).**
Steps: small steps, know → understand → apply, checkmate delayed. Yusupov: 24-chapter books with scored tests, spiral curriculum.
*Implementation:* a prerequisite skill graph with mastery thresholds. Units = instruction, scored test with partial credit, grade, gate. Levels recalibrated empirically.
*Evidence:* **expert consensus**; aligned with learning science. Files: `02-methods/steps-method.md`, `02-methods/yusupov-nine-book-series.md`.

**P18 — Provide board-vision micro-drills and dense mating-pattern banks for beginners.**
De la Maza's Knight Sight and Concentric Squares. The Polgár family's 5,334-problem bank (306 mate-in-1, 3,412 mate-in-2).
*Implementation:* short gamified drills (0–1200). A graded mate bank feeding recognition-track SRS.
*Evidence:* **anecdotal** (drills), **moderate** (pattern-volume theory). Files: `02-methods/tactical-repetition-woodpecker-de-la-maza.md`, `02-methods/polgar-method.md`.

**P19 — Diagnose monthly and drive training from the diagnosis (the Dvoretsky principle at scale).**
Dvoretsky's student "diagnosis". Plateau bottlenecks.
*Implementation:* an automatic bottleneck report (blunders, conversion, time use, puzzle-to-game gap, blitz–classical gap, tilt) that sets next month's mix.
*Evidence:* **expert consensus**. Files: `01-learning-science/plateaus-and-rating-stagnation.md`, `02-methods/soviet-school-botvinnik-dvoretsky-yusupov.md`.

---

## D. Motivation, emotion and wellbeing

**P20 — Measure tilt per learner and offer stop-loss and session-structure nudges.**
Small errors breed further errors in elite play [Adhikari et al. 2023]. Sex-differentiated post-loss responses in titled online players [Engel, working paper].
*Implementation:* a personal tilt metric. Opt-out break suggestions after loss streaks or accuracy drops. Default sessions of warm-up, main block and review.
*Evidence:* **moderate** (phenomenon), **weak** (intervention; A/B test). Files: `01-learning-science/motivation-tilt-and-emotional-control.md`.

**P21 — Design for autonomy, competence and relatedness. Use specific goals with implementation intentions, and praise strategy and effort, never talent.**
SDT [Ryan & Deci 2000]. Goal setting [Locke & Latham 2002]. Implementation intentions d ≈ 0.65 [Gollwitzer & Sheeran 2006]. Praise effects [Mueller & Dweck 1998].
*Implementation:* track choice, goal and slot planning at onboarding, and a feedback-language style guide.
*Evidence:* **moderate–strong** (general). Same file as P20.

**P22 — Detect plateaus against statistical noise and explain rating noise to learners.**
Ratings are intervals (Glicko RD) [Glickman 1999].
*Implementation:* confidence-banded trend lines. A plateau flag only after 3+ months flat with normal activity.
*Evidence:* **strong** (statistics). Files: `01-learning-science/plateaus-and-rating-stagnation.md`.

**P23 — Offer wellness guidance (sleep, exercise, environment), each item labelled by evidence strength, and no medical claims.**
Sleep consolidation [Diekelmann & Born 2010]. Small exercise effects [Chang et al. 2012; Ludyga et al. 2020]. Air quality and move errors [Künn et al. 2023]. The 6,000-calorie myth is debunked.
*Implementation:* wellness module, late-night blitz nudges, tournament checklists.
*Evidence:* **strong** (sleep, general) to **weak** (chess-specific). Files: `01-learning-science/sleep-fitness-and-tournament-stamina.md`.

---

## E. Pathway, community and accountability

**P24 — Support an OTB pathway: long-game stamina blocks, tournament and norm planning.**
FIDE title rules need norms and OTB events. Stamina is trained at the target time control.
*Implementation:* stamina metrics (accuracy by hour), event calendar integration, norm-planning guide.
*Evidence:* **strong** (rules), **expert consensus** (stamina). Files: `01-learning-science/trajectories-and-hours-to-titles.md`.

**P25 — Build cohorts and a vetted coach layer, with safeguarding by design.**
USCS camps, WACA fellowships, the Kramnik camp model, FIDE trainer titles. A small independent coaching effect [Burgoyne et al. 2019].
*Implementation:* rating-matched study groups and online camps. A coach marketplace with credential checks and safeguarding (see 05-children).
*Evidence:* **moderate** (coaching main effect small but positive), **anecdotal** (camps). Files: `02-methods/coaching-models-federations-academies.md`.

**P26 — Forecast honestly: per-learner rate models with ranges. Never promise titles or timelines. Publish cohort outcomes, including drop-outs.**
Massive individual variability (masters 832–24,284 h) [Hambrick et al. 2014]. Starting-age and ability effects.
*Implementation:* a rating-gain-per-practice-hour model, P50/P90 projections and a public outcomes dashboard.
*Evidence:* **strong** (variability). Files: `01-learning-science/time-to-mastery-evidence.md`.

**P27 — Treat retention and inclusion as core outcomes, and validate every principle by experiment.**
Participation explains much of the top-level gender gap [Bilalić et al. 2009]. Stereotype-threat findings are contested [Stafford 2018 vs Maass et al. 2008]. No chess method has RCT support.
*Implementation:* dropout and participation dashboards by demographic (privacy-preserving). Neutral framing. A pre-registered A/B programme (below).
*Evidence:* **moderate**. Files: `01-learning-science/starting-age-and-talent.md`, `01-learning-science/motivation-tilt-and-emotional-control.md`.

---

## Planned validation experiments (priority order)

1. Engine-lock (self-annotation first) vs immediate engine. Outcome: 3-month rating change, delayed puzzle accuracy on game-derived themes.
2. Pattern-level SRS with instance rotation vs identical-position Woodpecker cycles vs no repetition. Outcome: unseen-puzzle accuracy, hope-chess rate.
3. Interleaved vs blocked motif practice after introduction. Outcome: 1-week delayed mixed test.
4. Activity-mix nudges vs none. Outcome: 6-month rating change and retention.
5. Endgame-first vs tactics-first emphasis for 1200–1600 learners. Outcome: 6-month rating change.
6. Stop-loss nudges vs none. Outcome: session-level performance and 3-month rating and retention.
7. Target success-rate bands (60–70% vs 75–85%). Outcome: delayed retention and engagement.

All outcomes are measured on **delayed** learning, not in-session performance (Soderstrom & Bjork 2015).

## Key sources (full lists in linked files)
- Southwick, D. A., et al. (2026). *Psychological Science*, 37(7), 514–523. https://doi.org/10.1177/09567976261452568
- Charness, N., et al. (2005). *Applied Cognitive Psychology*, 19, 151–165. https://doi.org/10.1002/acp.1106
- Burgoyne, A. P., et al. (2019). *American Journal of Psychology*, 132(1), 27–38. https://englelab.gatech.edu/articles/2019/Burgoyne_et_al_2019_AJP.pdf
- Hambrick, D. Z., et al. (2014). *Intelligence*, 45, 34–45. https://www.gwern.net/doc/psychology/chess/2014-hambrick.pdf
- Dunlosky, J., et al. (2013). *PSPI*, 14(1), 4–58. https://doi.org/10.1177/1529100612453266
- Cepeda, N. J., et al. (2006). *Psychological Bulletin*, 132(3), 354–380. https://doi.org/10.1037/0033-2909.132.3.354
- Brunmair, M., & Richter, T. (2019). *Psychological Bulletin*, 145(11), 1029–1052. https://doi.org/10.1037/bul0000209
- Kalyuga, S., et al. (2003). *Educational Psychologist*, 38(1), 23–31. https://doi.org/10.1207/S15326985EP3801_4
- Bilalić, M., McLeod, P., & Gobet, F. (2008). *Cognition*, 108(3), 652–661. https://doi.org/10.1016/j.cognition.2008.05.005
- Gobet, F., & Simon, H. A. (1996). *Cognitive Psychology*, 31(1), 1–40. https://doi.org/10.1006/cogp.1996.0011
- McIlroy-Young, R., et al. (2020). KDD '20. https://arxiv.org/abs/2006.01855
- Adhikari, A., Anatolyev, S., & Dagaev, D. (2023). *IEEE Transactions on Games*. https://pages.nes.ru/sanatoly/Papers/TiltChess.htm
- Soderstrom, N. C., & Bjork, R. A. (2015). *Perspectives on Psychological Science*, 10(2), 176–199. https://doi.org/10.1177/1745691615569000
