---
title: "Grim Chess curriculum design"
summary: "How the platform turns the research in sections 01–05 into a mastery-gated, measured training programme from zero knowledge to grandmaster-equivalent strength, with an adult track and a children's track."
last_reviewed: 2026-11-11
sources:
  - "knowledge-base/02-methods/synthesis.md (principles P1–P27)"
  - "knowledge-base/05-children/children-track-principles.md (principles K1–K20)"
  - "knowledge-base/03-chess-knowledge/skill-graph.json"
  - "knowledge-base/04-assessment/platform-measurement-model.md"
  - "knowledge-base/01-learning-science/time-to-mastery-evidence.md"
---

# Grim Chess curriculum design

## 1. Design goal and honest framing

The platform is built to compress the time from zero to master-level play as far as the evidence allows, and to
**measure** how far each learner has actually got on a scale comparable with FIDE-rated players.

It does not promise titles or fixed timelines. `01-learning-science/time-to-mastery-evidence.md` shows:

- Large compression is plausible below about 2000, because most learners spend their time on low-efficiency
  activities.
- Compression gets smaller towards master level.
- The fastest documented zero-to-GM trajectories took about 6–8 years, all from childhood starts with elite coaching.

So the product promise is three things:

1. The most efficient training plan we can build from the evidence.
2. Mastery gating, so no time is wasted on material the learner already knows or isn't ready for.
3. An honest, continuously updated forecast.

A learner who trains 2–3 hours a day can move through the early stages in weeks. Each later stage takes longer, and
the platform shows the learner their own measured rate.

## 2. Structure

| Layer | What it is | Source |
|---|---|---|
| Skill graph | 258 skills across 8 domains (rules, tactics, checkmate, calculation, strategy, endgame, opening, practical) and 8 stages, with prerequisites and a measurable mastery criterion per skill | `03-chess-knowledge/skill-graph.json` |
| Stages | 1 Foundations (0–600), 2 Beginner (600–1000), 3 Novice (1000–1400), 4 Intermediate (1400–1800), 5 Advanced (1800–2100), 6 Expert (2100–2300), 7 Master (2300–2450), 8 Grandmaster (2450–2700). Ratings are on the FIDE-equivalent scale; below 1400 this is the "extended scale" (see `04-assessment/platform-measurement-model.md`) | skill graph `stages` |
| Lessons | Interactive JSON lessons (`content/lessons/`). Each covers 1–3 skills: short explanation, then mostly moves the learner must find, quizzes and positions played out against the engine. Every lesson ends with a retrieval check | `packages/core/src/types.ts` (`Lesson`) |
| Practice | About 51,000 Lichess puzzles stratified by rating and theme. Drills: coordinates, visualization, basic mates, theoretical endgames, opening repertoire, guess-the-move on master games | `data/puzzles.csv.gz`, `content/games/` |
| Play + review | Calibrated bot ladder (250 to full-strength Stockfish 19), local, LAN and online play. Every game can be reviewed with move classification, accuracy, ACPL, and a "retry your mistakes" mode | `apps/web/src/features/play` |
| Measurement | Glicko-2 pools (bot, puzzle, online, assessment), accuracy, and an assessment battery. These are combined by inverse-variance weighting into an estimated FIDE-equivalent rating with an interval | `packages/core/src/estimate.ts` |
| Planning | A daily plan generated from the time budget, stage, due spaced-repetition reviews and unlocked skills | `packages/core/src/plan.ts` |

## 3. Mastery gating

- A skill unlocks when all its prerequisites are mastered. Skills below the learner's placement stage count as
  satisfied (placement credit), so a club player is not forced through the rules.
- Mastery is an exponentially weighted success rate (weight 0.3) across lessons, puzzles of the skill's Lichess
  themes, and drills. A skill counts as mastered at ≥ 0.85 with at least 5 attempts, and loses that status below 0.6
  (`apps/server/src/training.ts`).
- Mastered skills are not dropped. They come back through FSRS spaced repetition, at a desired retention of 0.9
  (P4).

## 4. Daily plan composition

The plan reserves up to 20% of the budget for due reviews first. The rest is split by stage (`STAGE_MIX` in
`packages/core/src/plan.ts`, derived from the activity-mix table in `02-methods/synthesis.md`):

| Stage | Lessons | Tactics | Calculation | Woodpecker | Endgame | Openings | Play | Game review |
|---|---|---|---|---|---|---|---|---|
| 1 | 25% | 25% | 5% | 0% | 10% | 0% | 25% | 10% |
| 2 | 15% | 25% | 10% | 0% | 15% | 0% | 25% | 10% |
| 3 | 10% | 15% | 10% | 5% | 15% | 5% | 25% | 15% |
| 4 | 15% | 10% | 10% | 5% | 15% | 10% | 20% | 15% |
| 5 | 20% | 5% | 10% | 5% | 15% | 15% | 15% | 15% |
| 6 | 20% | 5% | 5% | 5% | 15% | 20% | 15% | 15% |
| 7–8 | 20% | 5% | 10% | 0% | 10% | 25% | 15% | 15% |

Rationale:

- Serious study beats unreviewed play per hour (P1, P2), so every game is paired with a self-review block (P11).
- Tactics volume is front-loaded.
- Openings appear only from stage 3 and scale with level (P14).
- Endgame work stays constant (P13).
- From stage 4, guess-the-move on master games takes half of the strategy share (P12).
- Woodpecker repetition runs at stages 3–6 (P8).

The bot opponent is set about 100 points above the learner's estimate, for an expected score of about 36%. That
targets the 60–80% overall success band in P6 when combined with the easier activities.

## 5. Measurement and comparison with real players

See `04-assessment/platform-measurement-model.md` for formulas and limits. In short:

- Every signal is converted to the FIDE-equivalent scale with its own uncertainty. The signals are bot results,
  puzzle results, online results, game accuracy and a periodic assessment battery modelled on the Amsterdam Chess
  Test choose-a-move paradigm.
- The signals are combined by inverse-variance weighting with a correlation inflation, and shown with a 95% interval.
- Learners see their accuracy, ACPL and puzzle rating against the per-band benchmarks in `data/benchmarks.json`.
  Those benchmarks are literature-derived priors and are labelled "provisional".
- "CM/FM/IM/GM-equivalent strength (estimate)" appears only when the point estimate reaches the threshold *and*
  confidence is at least medium. Real titles require FIDE-rated over-the-board norms, and the platform says so.
- The platform asks for a re-assessment roughly every 4 weeks (P19). Progress over time is reported more prominently
  than absolute level, because it is measured more precisely.

## 6. Two tracks

The learner's age is asked first at onboarding:

- **Under 13: children's track** (`/kids`). It follows K1–K20:
  - The world map is aligned with the Steps Method.
  - Mini-games come before checkmate (pawn wars, capture quest, square hunt, knight's journey).
  - Sessions are short, and feedback is informational, never streak penalties or loot.
  - Read-aloud is built in.
  - There is no free chat. Online play is limited to private rooms.
  - A parent dashboard sits behind a grown-up gate.
- **13 and over: adult track.** Teenagers get the adult track with K18 autonomy guidance.

## 7. Coverage and audit

`GET /api/kb/audit` (page `/audit`) computes live coverage: for every skill, the lessons covering it, the puzzles
matching its themes, and its exercise types. It also shows a stage × domain matrix and lists gaps.
`00-audit/requirements-traceability.md` maps each product requirement to its implementation and evidence.
