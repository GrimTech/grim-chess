---
title: "Engine Strength Calibration: Stockfish UCI_Elo, Skill Level, and Bot-to-Human Rating Caveats"
summary: "What Stockfish's UCI_Elo (1320–3190) and Skill Level (0–20) actually mean, what pool and time control they are calibrated on (CCRL Blitz via Stash, 120+1, since Jan 2023), the exact Elo→Skill polynomial and its inverse table, and why bot-game ratings are not FIDE ratings until anchored with humans."
last_reviewed: 2026-11-11
sources:
  - https://raw.githubusercontent.com/official-stockfish/Stockfish/master/src/search.h
  - https://raw.githubusercontent.com/official-stockfish/Stockfish/master/src/search.cpp
  - https://raw.githubusercontent.com/official-stockfish/Stockfish/master/src/engine.cpp
  - https://github.com/official-stockfish/Stockfish/pull/4341
  - https://github.com/official-stockfish/Stockfish/pull/2225
  - https://official-stockfish.github.io/docs/stockfish-wiki/Stockfish-FAQ.html
  - https://stockfishchess.org/blog/2023/stockfish-16/
  - https://talkchess.com/viewtopic.php?p=932604
  - https://chessiverse.com/articles/how-chessiverse-ratings-work
  - https://arxiv.org/pdf/2006.01855
---

# Engine Strength Calibration

## 1. Stockfish options (current master)

| Option | Type / range | Default | Source |
|---|---|---|---|
| `Skill Level` | int 0–20 | 20 (full strength) | `engine.cpp` [3] |
| `UCI_LimitStrength` | bool | false | [3] |
| `UCI_Elo` | int **1320–3190** (`Skill::LowestElo`, `Skill::HighestElo`) | 1320 | [1][3] |

- `UCI_Elo` applies only when `UCI_LimitStrength = true`, and it **takes precedence** over `Skill Level` when both are set [6].
- **Mechanism.** With a skill limit, Stockfish forces MultiPV ≥ 4 [2]. It picks a sub-optimal move "using a statistical rule dependent on 'level'", an idea credited to Heinz van Saanen. The weakness term is `weakness = 120 − 2 * level` [2]. Per the FAQ, the weak move is chosen at search depth 1 + Skill Level [6].

## 2. Calibration: what pool, what time control

The `search.h` comment reads [1]: "we convert it to an appropriate skill level, anchored to the Stash engine. This method is based on a fit of the Elo results for games played between Stockfish at various skill levels and various versions of the Stash engine. Skill 0 .. 19 now covers CCRL Blitz Elo from 1320 to 3190, approximately." The comment cites commit a08b8d4.

**PR #4341** ("Update UCI_Elo parameterization", vondele; merged 23 Jan 2023) [4]:
- Games: Stockfish master at skill 0–19 against several Stash versions **whose ratings were taken from CCRL**, at **TC 120+1** with the `8moves_v3.pgn` openings.
- Fit: a third-degree polynomial Skill(Elo).
- Measured endpoints: skill 0 ≈ 1320 (2,083 games) and skill 19 ≈ 3191 (1,707 games).
- Caveat stated in the PR: Stash's Elo is "only to within ±100 Elo of CCRL".
- Check: master at Elo 2721 against stash-bot-v21.0 scored +150.1 ± 70.2.
- Documentation change: README calibration text went from "60s+0.6s, anchored to CCRL 40/4" to "120s+1.0s, anchored to ±100 Elo to CCRL Blitz" [4].

**The earlier calibration (PR #2225, 2019)** used TC 60+0.6 and was anchored to goldfish 1.13 = 2000, said to be about CCRL 40/4 ~2000. The author called the CCRL anchoring "a bit weak" [5]. **Some third-party documentation still quotes this older 60s+0.6s / CCRL 40/4 wording. It is outdated.** The Stockfish 16 release notes confirm that UCI_Elo "has been calibrated" [7].

**Answer to the brief's question.** UCI_Elo is calibrated to the **CCRL Blitz** engine-rating scale, using Stash as the anchor, at 120+1. The calibration has been in place since Stockfish 16 development (January 2023). It is *not* calibrated to CCRL 40/4 any more, and it has never been calibrated against humans.

**Evidence strength: High** (primary source code and PR).

## 3. Exact mapping and its inverse

From `search.h` [1]:

```cpp
double e = double(uci_elo - 1320) / (3190 - 1320);
level = std::clamp((((37.2473 * e - 40.8525) * e + 22.2943) * e - 0.311438), 0.0, 19.0);
```

Inverse, computed numerically for this review: the CCRL-Blitz Elo at which each integer level is reached.

| Skill | Elo | Skill | Elo | Skill | Elo |
|---|---|---|---|---|---|
| 0 | 1320 | 7 | 2518 | 14 | 3012 |
| 1 | 1444 | 8 | 2624 | 15 | 3057 |
| 2 | 1566 | 9 | 2711 | 16 | 3099 |
| 3 | 1729 | 10 | 2786 | 17 | 3139 |
| 4 | 1953 | 11 | 2851 | 18 | 3176 |
| 5 | 2197 | 12 | 2910 | 19 | ≈3191 (measured, PR table) |
| 6 | 2383 | 13 | 2963 | 20 | unlimited (full strength) |

**Notes**
1. At UCI_Elo = 3190 the polynomial gives level ≈ 18.38, so integer level 19 lies just beyond the UCI_Elo range. The FAQ graph shows the fitted data running from about 1347 at level 0 to 3212 at level 19 [6].
2. UCI_Elo converts to a *fractional* Skill Level [5]. A development-build note reports that the level is rounded up or down at random so that its average equals the target. That note was seen only as a search extract and is not verified in the current source.
3. Level 20 has no Elo. The Stockfish FAQ says rating Stockfish on a human scale "has become virtually impossible" because humans cannot score enough points for a measurement [6].

## 4. Why bot ratings are not FIDE ratings

| Issue | Explanation |
|---|---|
| **The pools have no human members** | The CCRL scale comes entirely from engine-vs-engine games. Its absolute level relative to humans was never established by games against humans. A forum heuristic, FIDE ≈ 0.7·CCRL + 840, is *unvalidated* [8] |
| **Non-human error profile** | Skill-limited Stockfish plays mostly engine-quality moves mixed with random sub-optimal choices. Humans make *correlated, position-dependent* errors (`09-maia-and-rating-estimation-from-games.md`). Maia's work shows that the move-matching of depth- or strength-limited engines does not track human skill [10] |
| **Time control** | The calibration is at 120+1 blitz between engines. A human's "rating against the bot" depends on the human's time control. The engine's strength barely changes with clock time at these levels, while human strength changes a lot |
| **Exploitability** | Humans learn a bot's tendencies over repeated games. Performance against one fixed bot inflates over time |
| **Effort and motivation** | Users "play weaker against bots and vary widely in effort" (Chessiverse's survey-based calibration experience) [9] |
| **Practical precedent** | Chessiverse dropped a FIDE-classical target because the bots felt "much too hard". It now anchors to **Lichess blitz** through four anchor bots playing rated games on Lichess [9]. Calibration to humans is practical, but only against a named human pool |

## 5. Calibration protocol for Grim Chess bots (normative)

1. **Bot roster.** Human-like engines (Maia-family, or in-house networks trained per band) for GR 800–2000. Skill-limited Stockfish, or Maia combined with search, for GR 2000–2800. **Never** expose raw UCI_Elo numbers to users as ratings.
2. **Engine-pool ladder.** Rate every bot configuration in a round robin (≥ 400 games per adjacent pair, BayesElo/Ordo or Glicko-2 with frozen anchors) at the platform's standard human time controls, run on fixed hardware with fixed node limits.
3. **Human anchoring.** Recruit an anchor panel of at least 200 consenting players with **verified FIDE IDs**, rated 1400–2500 and active within 12 months. Each plays ≥ 20 rated games against bots at the standard time control. Fit a single offset (and slope if needed) mapping bot-pool ratings to FIDE so that the anchors' Glicko-2 ratings against the bots match their FIDE ratings in expectation.
4. **Uncertainty.** A bot's published RD is the standard error of its anchored rating. Target ≤ 40; report it.
5. **Drift control.** Re-anchor quarterly. Freeze bot binaries and node limits, version every configuration, and limit any user to ≤ 10 rated games per bot per 30 days to curb exploitation.
6. **Below 1400.** Anchor through the logistic extension: bots at GR < 1400 are rated by their results against bots already anchored at ≥ 1400.

## Sources

1. official-stockfish/Stockfish `src/search.h` (Skill struct; LowestElo 1320, HighestElo 3190; polynomial). https://raw.githubusercontent.com/official-stockfish/Stockfish/master/src/search.h
2. official-stockfish/Stockfish `src/search.cpp` (MultiPV ≥ 4; weakness formula). https://raw.githubusercontent.com/official-stockfish/Stockfish/master/src/search.cpp
3. official-stockfish/Stockfish `src/engine.cpp` (option declarations). https://raw.githubusercontent.com/official-stockfish/Stockfish/master/src/engine.cpp
4. Stockfish PR #4341, "Update UCI_Elo parameterization" (Jan 2023). https://github.com/official-stockfish/Stockfish/pull/4341
5. Stockfish PR #2225, "UCI_Elo implementation" (2019). https://github.com/official-stockfish/Stockfish/pull/2225
6. Stockfish FAQ. https://official-stockfish.github.io/docs/stockfish-wiki/Stockfish-FAQ.html
7. Stockfish 16 release notes. https://stockfishchess.org/blog/2023/stockfish-16/
8. TalkChess forum, "The Stockfish ELO problem" (informal CCRL→FIDE heuristic; via search extract). https://talkchess.com/viewtopic.php?p=932604
9. Chessiverse, "How Chessiverse ratings work" (calibration guide). https://chessiverse.com/articles/how-chessiverse-ratings-work
10. McIlroy-Young et al., KDD 2020. https://arxiv.org/pdf/2006.01855
