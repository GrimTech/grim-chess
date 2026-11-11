---
title: 03 Chess Knowledge - Index
summary: Index of the Grim Chess chess-knowledge backbone - nine domain reference files, the machine-readable skill graph (258 skills, absolute zero to GM), and the two validation scripts - with schema, statistics, verification method and known gaps.
last_reviewed: 2026-11-11
sources:
  - See the numbered source list at the bottom of each file
  - Lichess lila PuzzleTheme.scala / puzzleTheme.xml (theme keys, verified 2026-11-11)
  - FIDE Laws of Chess E01 (applied from 1 January 2023)
---

# 03 Chess Knowledge

This folder is the **content backbone** of Grim Chess: what a learner must know and be able to do, from "what is a square called?" to grandmaster level. Lesson authors write lessons against the `kbRef` anchors; engineers load `skill-graph.json` to sequence content and gate progression; auditors compare it with recognised curricula (FIDE Laws, Steps Method, Yusupov, Silman, Dvoretsky, de la Villa, ECO, Lichess themes).

## Files

| File | Contents |
|---|---|
| [rules.md](rules.md) | FIDE Laws of Chess (2023): board, moves, castling, en passant, promotion, checkmate, stalemate, dead position, 3-fold/5-fold, 50/75-move, touch-move, clocks, illegal moves, rapid/blitz, conduct; SAN, PGN, FEN, UCI notation |
| [tactics.md](tactics.md) | Complete tactical motif taxonomy with Lichess theme mapping (forks, pins, skewers, x-ray, discovered/double check, deflection, decoy, interference, clearance, zwischenzug, desperado, quiet moves, zugzwang, trapped pieces, underpromotion, perpetual, stalemate tricks, f7/h7/g7 sacrifices, Greek gift, king hunts) |
| [checkmate-patterns.md](checkmate-patterns.md) | 39 named and basic mating patterns, each with a machine-verified final-position FEN and its Lichess key |
| [calculation.md](calculation.md) | Thought process, blunder check, CCT, candidate moves, visualisation, tree pruning, comparison method, prophylactic thinking, typical errors, training methods and benchmarks |
| [strategy.md](strategy.md) | Evaluation elements, imbalances, every major pawn structure (IQP, hanging, Carlsbad, Maroczy, Hedgehog, Stonewall, KID, Sicilian, French, Caro/Slav, Benoni), piece play, space, prophylaxis, colour complexes, initiative, two weaknesses, attack/defence, transitions |
| [endgames.md](endgames.md) | Theoretical endgames by rating band (Silman-style), aligned to Dvoretsky's Endgame Manual chapters and de la Villa; standard positions with legal FENs |
| [openings.md](openings.md) | Opening principles, ECO A-E family overview with ideas and suitability, traps, beginner gambits, repertoire building by stage, evidence on GM theory depth |
| [psychology-and-practical.md](psychology-and-practical.md) | Time management, clock handling, tournament and opponent preparation, tilt, swindles, draw offers, post-game analysis |
| [grandmaster-competency-profile.md](grandmaster-competency-profile.md) | What 1400 / 1800 / 2200 / 2500 players know and do; stage exit tests |
| [skill-graph.json](skill-graph.json) | **The skill graph**: 258-skill DAG with prereqs, Lichess themes, measurable mastery criteria, exercise types, KB anchors |
| [validate-skill-graph.mjs](validate-skill-graph.mjs) | Validator for the graph (run in CI) |
| [verify-fens.mjs](verify-fens.mjs) | Verifies every FEN in the Markdown files (legality; mate/stalemate where claimed) |

## Skill graph schema

```json
{
  "version": "1.0",
  "lichessThemeKeys": ["advancedPawn", "..."],
  "domains": ["rules","tactics","checkmate","calculation","strategy","endgame","opening","practical"],
  "stages": [{"id":1,"name":"Foundations","eloRange":[0,600]}, "... 8 stages ..."],
  "exerciseTypes": ["lesson","coordinate-drill", "..."],
  "skills": [{
    "id": "endgame.rook.lucena",
    "name": "Lucena position",
    "domain": "endgame",
    "stage": 4,
    "prereqs": ["endgame.mate.kr", "endgame.rook-vs-pawn-basic"],
    "lichessThemes": ["rookEndgame"],
    "summary": "...",
    "masteryCriteria": "Wins the Lucena from 5 different set-ups ... vs engine in 5/5",
    "exerciseTypes": ["endgame-drill"],
    "kbRef": "endgames.md#lucena-position",
    "references": ["Silman, Complete Endgame Course, Part 4 (1400-1599)", "..."]
  }]
}
```

Conventions:
- `id` = `<domain>.<topic>[.<subtopic>]`, lowercase, hyphens inside segments.
- `stage` = the stage at which the skill is **mastered** (it may be introduced earlier). A prereq is never at a later stage than its dependent.
- `masteryCriteria` always contains a number (count, %, time or rating). Puzzle ratings are Lichess puzzle ratings used as **platform calibration targets**; the assessment team (04-assessment) owns final thresholds.
- `lichessThemes` are exact Lichess theme keys; an empty array means Lichess has no matching tag and exercises come from curated or engine-tagged sets. `mix` is a Lichess selector ("healthy mix"), not a tag that appears in the puzzle CSV.
- `kbRef` points at a heading anchor (GitHub slug) in this folder; the validator checks it exists.
- Extra top-level fields (`generated`, `description`, `lichessThemeKeysSource`, `exerciseTypes`) are informative.

## Statistics

258 skills, 467 prerequisite edges, one root (`rules.board.setup`), 74 Lichess theme keys, all of them used by at least one skill.

| Stage | rules | tactics | checkmate | calculation | strategy | endgame | opening | practical | Total |
|---|---|---|---|---|---|---|---|---|---|
| 1 Foundations (0-600) | 14 | 1 | 3 | 1 | 0 | 1 | 2 | 1 | 23 |
| 2 Beginner (600-1000) | 6 | 8 | 7 | 3 | 1 | 3 | 4 | 0 | 32 |
| 3 Novice (1000-1400) | 7 | 10 | 8 | 3 | 8 | 9 | 6 | 3 | 54 |
| 4 Intermediate (1400-1800) | 1 | 11 | 4 | 6 | 14 | 10 | 4 | 4 | 54 |
| 5 Advanced (1800-2100) | 0 | 7 | 2 | 5 | 13 | 16 | 3 | 5 | 51 |
| 6 Expert (2100-2300) | 0 | 3 | 0 | 4 | 6 | 6 | 3 | 1 | 23 |
| 7 Master (2300-2450) | 0 | 1 | 0 | 2 | 4 | 3 | 1 | 2 | 13 |
| 8 Grandmaster (2450-2700) | 0 | 1 | 0 | 2 | 2 | 1 | 1 | 1 | 8 |
| **Total** | 28 | 42 | 24 | 26 | 48 | 49 | 24 | 17 | **258** |

The upper stages have fewer but much **broader** skills (e.g., `endgame.dem-mastery`, `calculation.gm-level`), each with a heavier exam. This is deliberate: above 2300 improvement comes from depth and volume of practice in the same competencies, not from new named topics.

## Validation

```
node validate-skill-graph.mjs     # graph: PASS required
node verify-fens.mjs              # 52 FENs: 0 failures required
```

`validate-skill-graph.mjs` checks: top-level shape (version, domains, 8 stages with exact Elo ranges), unique well-formed ids, id prefix = domain, stage 1-8, all required fields non-empty, masteryCriteria concrete (>=25 chars, contains a number), exercise types from the allowed list, every prereq exists, no self/duplicate prereqs, prereq stage <= skill stage, acyclicity (Kahn's algorithm plus an example cycle in the error), every Lichess theme in `lichessThemeKeys`, every `kbRef` file and heading anchor exists. It warns about low-stage dead ends and unused theme keys. Negative tests (injected cycle, missing prereq, invalid theme, vague criterion, broken anchor, duplicate id) were run on 2026-11-11 and all were caught.

## Lichess theme keys

The 74 keys in `lichessThemeKeys` are every player-visible theme in lila `modules/puzzle/src/main/PuzzleTheme.scala`, cross-checked against `translation/source/puzzleTheme.xml` on 2026-11-11. The hidden internal key `checkFirst` is excluded. Keys introduced recently (`balestraMate`, `blindSwineMate`, `cornerMate`, `killBoxMate`, `morphysMate`, `pillsburysMate`, `swallowstailMate`, `triangleMate`, `vukovicMate`, `collinearMove`, `discoveredCheck`) may be absent from older puzzle CSV dumps, so the ingestion pipeline should tolerate zero-count themes. **There is no `perpetualCheck` theme** in lila; perpetual-check and stalemate-trick skills use curated sets (with `equality` as the closest tag).

## How to use

- **Lesson authors**: one lesson (or lesson series) per skill. Write to the skill's `kbRef` section and meet its `masteryCriteria` with the listed `exerciseTypes`.
- **Engineers**: topologically sort `skills` by `prereqs`. A skill unlocks when all its prereqs are mastered. Use `lichessThemes` + rating windows from `masteryCriteria` to query the Lichess puzzle DB.
- **Auditors**: compare the domain files against the cited curricula; `grandmaster-competency-profile.md` states what is expected at each band.

## Known gaps and open items

1. **Puzzle-rating thresholds** in mastery criteria are expert estimates, not yet calibrated against learner data. 04-assessment should validate them.
2. **Curated exercise sets needed** where Lichess has no tag: perpetual check, stalemate tricks, desperado, overloading, line opening, corridor/Damiano/Lolli/Greco/Max Lange/Mayet/Anderssen/Blackburne/suffocation/double-knight/Réti mates, Sicilian sacrifices, Greek-gift soundness, all endgame-drill start positions.
3. **Silman per-part chapter mapping** is reproduced from structure and secondary sources (Lucena/Philidor confirmed in Part 4, 1400-1599); the exact chapter list was not available online and should be checked against a physical copy.
4. **de la Villa and Dvoretsky** chapter lists are cited from publisher excerpts, reviews and the 13-chapter DEM structure; numbered-ending lists were not fully reproduced (copyright) and should be mapped ending by ending by the content team.
5. **FIDE Trainers' Commission syllabus**: the TRG seminar syllabus is not publicly published as a topic list, so the mapping is at title level only (Developmental Instructor ~up to 1200, National Instructor and above).
6. **ECO sub-code boundaries** vary slightly between ECO editions and datasets. Use the Lichess `chess-openings` TSV as the canonical mapping.
7. **Endgame FEN results** marked "(TB)" in `endgames.md` were checked for legality, not solved. Re-confirm them against Syzygy when building drills.
8. **Out of scope** (possible future skills): Chess960 play, descriptive notation, problem/study composition, correspondence chess, engine-preparation tooling, physical training.
9. **Psychology claims** are practice-based (Kotov, Dvoretsky, Rowson). Empirical support is covered in 01-learning-science.
