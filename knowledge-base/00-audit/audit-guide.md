---
title: "Audit guide for external reviewers"
summary: "How to review the Grim Chess knowledge base and check that the platform is well-rounded: what is here, how claims are sourced, how to reproduce the data, and where the known weaknesses are."
last_reviewed: 2026-11-11
sources:
  - "knowledge-base/01-learning-science/time-to-mastery-evidence.md"
  - "knowledge-base/04-assessment/14-evidence-register-and-open-questions.md"
---

# Audit guide for external reviewers

## What you are auditing
Grim Chess is a chess training platform. Its stated aim is to take learners from zero knowledge towards
master/grandmaster-equivalent strength as fast as the evidence allows, and to measure their progress on a scale that
can be compared with FIDE-rated players. The knowledge base is the platform's evidence and specification. The
software implements it, and the [requirements traceability](requirements-traceability.md) file links the two.

## Map of the knowledge base
| Section | Contents | Start with |
|---|---|---|
| `01-learning-science/` | Deliberate practice, chunking/template theory, spaced repetition (FSRS), retrieval/interleaving, cognitive load, talent and starting age, time-to-mastery evidence, plateaus, motivation/tilt, sleep and fitness | `time-to-mastery-evidence.md` |
| `02-methods/` | Steps Method, Soviet school (Botvinnik, Dvoretsky, Yusupov), Yusupov series, Woodpecker/de la Maza, Kotov, Heisman, Polgár, Nimzowitsch/Silman, Aagaard, endgame study methods, opening repertoire, game-analysis loops, engine use, federation/academy models, online-platform pedagogy | `synthesis.md` (principles P1–P27) |
| `03-chess-knowledge/` | FIDE Laws, tactics taxonomy, 39 checkmate patterns, calculation, strategy, endgames by band, openings (ECO A–E), practical play, GM competency profile, and the **258-skill graph** | `skill-graph.json`, `grandmaster-competency-profile.md` |
| `04-assessment/` | Elo/FIDE, Glicko-2, rating pools and conversions, FIDE titles and norms, population statistics, ACPL/accuracy, Regan IPR, Maia, benchmarks by band, standardized tests (incl. Amsterdam Chess Test), engine calibration, assessment battery, measurement model, evidence register | `platform-measurement-model.md` |
| `05-children/` | How children learn chess, chess-in-schools transfer evidence, age bands, mini-games, parents, online safety | `children-track-principles.md` (K1–K20) |
| `06-curriculum/` | How the research becomes the curriculum, daily plan and measurement | `curriculum-design.md` |
| `00-audit/` | This guide, requirements traceability, claims register | `claims-register.md` |

## Conventions you can rely on
- Every file has front matter: `title`, `summary`, `last_reviewed`, `sources`.
- Non-obvious factual claims carry inline numbered citations `[n]` that resolve to a source list at the bottom of
  the file.
- Most research files label their evidence strength (strong / moderate / weak / anecdotal). Design defaults that
  are not evidence are labelled as such.

## Checks you can reproduce
1. **Skill graph integrity.** Run `node knowledge-base/03-chess-knowledge/validate-skill-graph.mjs`. It checks
   unique ids, that prerequisites exist, no cycles, stage monotonicity, valid Lichess theme keys and that every
   `kbRef` anchor exists.
2. **Position correctness.** Run `node knowledge-base/03-chess-knowledge/verify-fens.mjs` to check every FEN in the
   Markdown files. Run `npm run validate:content` to check every lesson: legal FENs, legal solution lines, valid
   skill ids and quiz answers.
3. **Puzzle data.** `python -I scripts/build-puzzles.py lichess_db_puzzle.csv.zst data/puzzles.csv.gz` rebuilds the
   curated set deterministically from the public Lichess database (CC0).
4. **Coverage.** Open `/audit` on the running platform, or call `GET /api/kb/audit`. It shows lessons and puzzles
   per skill, the stage × domain matrix, and skills with no lesson.
5. **Rating maths.** `packages/core/src/glicko2.ts` is tested against Glickman's worked example (see
   `04-assessment/02-glicko-and-glicko2.md`). `accuracy.ts` reproduces the Lichess formulas.
6. **Software tests.** Run `npm test`.

## Known weaknesses (read these first)
- No chess training method has randomized-controlled evidence that it beats the alternatives. Method choices rest
  on expert consensus plus general learning science (`02-methods/synthesis.md`).
- No peer-reviewed conversion from online ratings to FIDE exists, and individual conversion error is roughly ±200–300.
  The benchmark values per band are literature-derived **priors**. They need the calibration study in
  `04-assessment/10-benchmarks-by-rating-band.md` §5 (an anchor panel of at least 400 players with verified FIDE IDs).
- Bot strengths: Stockfish UCI_Elo is calibrated against engines (CCRL Blitz), not humans. The low-rated in-house
  bots are heuristic estimates.
- There is no evidence that any platform can take an adult from zero to GM in months. The platform promises
  efficiency and honest measurement, not titles (`claims-register.md`).
- Some citations are secondary or search-engine extracts. They are listed in
  `04-assessment/14-evidence-register-and-open-questions.md` and in each file's caveats.
