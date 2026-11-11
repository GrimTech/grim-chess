---
title: "Intrinsic Performance Ratings (Regan) and Computer Analysis of World Champions (Guid & Bratko)"
summary: "The published Elo-to-move-quality relationships: Regan–Haworth's fitted model and tables (1600–2700), the IPR formula IPR = 3571 − 15413·AE_e, the 2024–25 Stockfish-16 ASD line, confidence-interval practice, and the Guid–Bratko world-champion studies with their critiques."
last_reviewed: 2026-11-11
sources:
  - https://www.cse.buffalo.edu//~regan/papers/pdf/ReHa11c.pdf
  - https://cse.buffalo.edu/~regan/papers/pdf/Reg12IPRs.pdf
  - https://cse.buffalo.edu/~regan/ChessSeminar/CSE702EloEvolution.pdf
  - https://cse.buffalo.edu/~regan/papers/pdf/RMH11.pdf
  - https://content.iospress.com/articles/icga-journal/icg29203
  - https://en.chessbase.com/post/computer-analysis-of-world-champions
  - https://en.chessbase.com/post/using-che-engines-to-estimate-human-skill
  - https://cse.buffalo.edu/~regan/Talks/SpectroscopyAug2025np.pdf
---

# Intrinsic Performance Ratings and the Guid–Bratko Studies

## 1. Regan & Haworth (2011): "Intrinsic Chess Ratings" [1]

**Model.** For each position, the probability that a player chooses move i depends on the move's scaled value deficit δ_i relative to the best move. Two parameters control it: **s** (sensitivity; lower s means more skill) and **c** (consistency). The parameters are fitted to the player's moves; a "Solitaire Set" of reference positions then converts the fitted (s, c) into a projected error [1][2].

**Data.** Games where both players were within ±10 Elo of a milepost (2700, 2600, …); the window was widened to ±15–20 for lower bands. Only individual round-robins or small Swisses at standard time controls were used, from 2006–09, 1991–94 and 1976–79. Analysis used **Rybka 3 at depth 13, 50-PV**. Moves 1–8, repetitions and positions beyond ±3 pawns were skipped. Each milepost set had 5,000–25,000 turns, and more than 6,000 games were analysed in total [1].

**Results, 2006–2009** (mm = engine first-choice match %; ad = average scaled difference in pawns; p = projected, a = actual) [1]:

| Elo (pre-2024 scale) | s_fit | c_fit | mm p / a (%) | ad p / a |
|---|---|---|---|---|
| 2700 | .080 | .513 | 56.2 / 56.3 | .056 / .056 |
| 2600 | .089 | .506 | 55.0 / 54.2 | .063 / .064 |
| 2500 | .093 | .499 | 53.7 / 53.1 | .067 / .071 |
| 2400 | .100 | .492 | 52.3 / 51.8 | .072 / .074 |
| 2300 | .111 | .485 | 51.1 / 50.3 | .084 / .088 |
| 2200 | .120 | .478 | 49.4 / 48.3 | .089 / .092 |
| 2100 | .130 | .471 | 48.2 / 47.7 | .099 / .102 |
| 2000 | .143 | .464 | 46.9 / 46.1 | .110 / .115 |
| 1900 | .153 | .457 | 46.5 / 45.0 | .119 / .125 |
| 1800 | .149 | .450 | 46.4 / 45.4 | .117 / .122 |
| 1700 | .155 | .443 | 45.5 / 44.5 | .123 / .131 |
| 1600 | .168 | .436 | 44.0 / 42.9 | .133 / .137 |

The authors find "a smooth relationship" between Elo and intrinsic move quality. The s_fit values are nearly identical across the three eras, implying "little or no 'inflation'… if anything there has been deflation" [1].

**Re-mapping note.** Ratings below 2000 in this table are on the **pre-March-2024 FIDE scale**. On today's scale: 1600 → ≈1760, 1800 → ≈1880, 1900 → ≈1940 (`01-elo-and-fide-rating-system.md`). After re-mapping, the 1600–2000 rows fall into a 240-point band. This is consistent with the flatter mm and ad values there.

**Evidence strength: High.** Peer-reviewed (AAAI 2011), with a large, unbiased game selection. Limitations: a 2011-era engine at shallow depth, and Regan himself notes the 1600–2100 points are "anomalous" [2].

## 2. The IPR formula (Regan 2012 compendium) [2]

The 2006–09 fit is projected onto the fixed Solitaire Set (games from the 2005 and 2007 World Championship tournaments and the 2006 World Championship match), giving an expected average error AE_e:

| Elo | 2700 | 2600 | 2500 | 2400 | 2300 | 2200 |
|---|---|---|---|---|---|---|
| AE_e | .0572 | .0624 | .0689 | .0749 | .0843 | .0883 |

```
IPR = 3571 − 15413 · AE_e                         (fit on Elo 2200–2700 only)
```

The fit implies that perfect play (AE_e = 0) rates "under 3600" when judged by Rybka 3 at depth 13 [2].

**Procedure** [2]:
1. Fit (s_T, c_T) on the test games T.
2. Project AE_e on the reference set S.
3. Compute IPR from the equation above.
4. Compute σ_T from (s_T, c_T) on T.
5. Report [IPR − 2σ_T, IPR + 2σ_T]. Regan advises inflating σ by **1.4×** (σ_a = 1.4·σ_T) to obtain an "actual" 95% interval, because the model's intervals run about 30% too narrow [2].

**Precision in practice.** In Table 2 of the compendium (values originating in [4]), the 2σ_a range is about ±50 to ±60 Elo for sets of 7,000–17,000 moves [2]. In a 2012 forum post (search extract), Regan described about ±200 for a 9-game individual performance at 2400. A 2025 talk reports 2575 ± 50 for a whole tournament, and ±155–185 for some historical players' multi-event samples [8].

**Evidence strength: Moderate–High.** This is a working draft. The constants are tied to Rybka 3 at depth 13 and **must not** be applied to Stockfish output.

## 3. Current form (Stockfish 16, 2024–25) [3]

- **ASD vs FIDE Elo** (Budapest Olympiad, Sept 2024): **ASD = 0.3549 − 0.0001114·Elo**. Inverted: **Elo ≈ 3186 − 8977·ASD**.
- T1-match is "a beautiful line" against Elo after the 2024 FIDE correction. Its correlation was 0.981 once the top bucket was removed [3].
- Unscaled ACPL (capped at 4.00) behaves "highly similar[ly]" to ASD. At 1400 it is about 0.45–0.50 pawns [3].
- Resolution with Stockfish 16 single-PV (depth ≥ 20, ≥ 5M nodes) is "good up to about 3100" [3].
- Regan's full model now uses a ninth-degree polynomial IPR curve that extends down to Elo 100. That curve is not published in these notes [3].

## 4. Guid & Bratko (2006, 2011)

- **2006 study** (ICGA Journal 29(2):65–73) [5][6]. The authors analysed the World Championship games of the 14 classical world champions with a modified Crafty searching to **depth 12**. The main criterion was the average deviation between the evaluation of the move played and the best move, with a complexity measure added. **Capablanca** came out best, and Kramnik also stood apart from the rest.
- **Critiques.** Riis argued that the method measures similarity to an "amputated" Crafty [6]. Regan–Haworth note the low depth and the "sub-elite" engine, and that Guid–Bratko evaluated only the top move and the played move instead of using multi-PV [1][2].
- **2011 follow-up** (ICGA Journal 34(2):71–81) [7]. Four engines at various depths produced "very similar rankings" of players. A repeat with Rybka 3 gave "qualitatively very similar results". The authors conclude that heuristic-search engines are adequate for *relative* skill comparison, despite their known problems.

**Evidence strength: Moderate** for relative rankings of players with large samples. **Low** for absolute calibration (no Elo mapping was published).

## 5. Implications for Grim Chess

1. **A move-quality rating is valid but must be calibrated locally.** The published lines (section 3) are a *prior*. The platform must re-fit the intercept and slope with its own engine settings, on its own users who hold verified FIDE ratings. The engine and its settings change the constants.
2. **Precision depends on the number of moves.** Expect ±150–250 (95%) from about 10 games and ±50–80 from 1,000+ moves. Regan's 1.4× model-error multiplier applies to these figures.
3. **Use ASD, not raw ACPL, as the primary move-quality statistic.** It is the only one of the two shown to be linear in Elo down to the FIDE floor [3].
4. **Time-control offsets are unknown in the published literature.** Regan's data are OTB classical. Online rapid needs its own calibration.

## Sources

1. K. W. Regan & G. McC. Haworth, "Intrinsic Chess Ratings," Proc. AAAI 2011. https://www.cse.buffalo.edu//~regan/papers/pdf/ReHa11c.pdf
2. K. W. Regan, "Intrinsic Ratings Compendium (Working Draft)," 29 Sep 2012. https://cse.buffalo.edu/~regan/papers/pdf/Reg12IPRs.pdf
3. K. W. Regan, "CSE702 S25 Week 2: Elo Ratings and Raw Metrics." https://cse.buffalo.edu/~regan/ChessSeminar/CSE702EloEvolution.pdf
4. K. W. Regan, B. Macieja, G. Haworth, "Understanding Distributions of Chess Performances," ACG 2011. https://cse.buffalo.edu/~regan/papers/pdf/RMH11.pdf
5. M. Guid & I. Bratko, "Computer analysis of world chess champions," ICGA Journal 29(2):65–73, 2006. https://content.iospress.com/articles/icga-journal/icg29203
6. ChessBase, "Computer analysis of world champions" (summary and Riis critique). https://en.chessbase.com/post/computer-analysis-of-world-champions
7. ChessBase, "Using Heuristic-Search Based Engines for Estimating Human Skill at Chess" (Guid & Bratko 2011 summary). https://en.chessbase.com/post/using-che-engines-to-estimate-human-skill
8. K. W. Regan, "Spectroscopy" talk, Aug 2025. https://cse.buffalo.edu/~regan/Talks/SpectroscopyAug2025np.pdf
