---
title: "Standardized Chess Tests: Engine Suites, Human Rating Tests, the Amsterdam Chess Test and Memory Paradigms"
summary: "Inventory and validity evidence for chess tests usable in Grim Chess's assessment battery: Bratko–Kopec, BT-2450/2630, STS, WAC, the Amsterdam Chess Test (full reliability/validity data), de Groot's choose-a-move paradigm, recall tests, and cognitive-ability correlates."
last_reviewed: 2026-11-11
sources:
  - https://www.ejwagenmakers.com/2005/VanderMaasWagenmakersACTpaper.pdf
  - https://pubmed.ncbi.nlm.nih.gov/15822609/
  - https://rdrr.io/cran/LNIRT/man/AmsterdamChess.html
  - https://www.sci.brooklyn.cuny.edu/~kopec/Publications/THE%20BRATKO-KOPEC%20TEST%20RECALIBRATED.htm
  - https://www.chessprogramming.org/Test-Positions
  - https://www.chessprogramming.org/Strategic_Test_Suite
  - https://www.chessprogramming.org/Win_at_Chess
  - https://groups.google.com/g/rec.games.chess.computer/c/4sEJEmijH_4
  - https://labraj.feri.um.si/en/EPD_test_14.12.2006
  - https://glarean-magazin.ch/wp-content/uploads/2017/03/Lösung-eines-alten-Problems-Frank-Schubert-1.pdf
  - https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5323477/
  - https://eprints.lse.ac.uk/102241
  - https://www.Gwern.net/doc/psychology/chess/1996-gobet.pdf
---

# Standardized Chess Tests

## 1. Two families of tests

| Family | Built for | Scoring basis | Valid for humans? |
|---|---|---|---|
| **Engine test suites** (BT, STS, WAC, Arasan, ECM…) | Ranking chess programs | Time-to-solve or points against engine-chosen keys | **Mostly no.** Rating formulas were tuned to engines, and humans were rarely if ever normed |
| **Psychometric tests** (ACT, de Groot, recall, knowledge) | Measuring human expertise | Accuracy (and latency), normed against Elo | **Yes**, where validity data exist |

## 2. Engine-oriented suites

| Suite | Facts | Elo mapping | Human validity | Evidence |
|---|---|---|---|---|
| **Bratko–Kopec (BKT)** (Kopec & Bratko 1982) | 24 positions: 12 tactical (T) and 12 "lever"/strategic (L). Up to 2 min each. 1 point if the key is chosen at 120 s; ¼, ⅓ or ½ if it was found at 30, 60 or 90 s but not held at 120 s. Bias index B = 12(T − L)/S [4] | Score → rating table (Kopec, Newborn & Yu 1986): 0–4 → 1300–1599; 5–6 → 1600–1799; 7–8 → 1800–1999; 9–12 → 2000–2199; 13–16 → 2200–2399; 17–24 → 2400+ [4] | Human subjects were tested in 1982. The authors "disclaim absolute validity" and note that absolute BKT ratings "differ considerably" from other sources [4]. Criticised for having only 24 positions [5] | Low |
| **BT-2450 / BT-2630** (Bednorz & Tönissen, *Computer-Schach & Spiele*) | 30 positions, 15 min (900 s) each. An unsolved position counts as 900 s | **Sources conflict.** A 1996 Usenet description: Elo = 2450 (or 2630) − (Σ seconds)/30 [8]. A 2006 University of Maribor page: ELO = 2630 − 2·Σtime (units unclear) [9]. Schubert (2017) shows these formula-type tests break once positions or engines change, and that halving solve time ≈ +70 Elo (a logarithmic, not linear, relation) [10] | None for humans | Low (formula unverified against the original publication) |
| **Strategic Test Suite (STS)** (Corbit & Swaminathan, 2008–2014; revised by Mosca 2015) | 15 themes, e.g. undermining, open files, knight outposts, king activity [6]. Usually described as 100 positions per theme (1,500 total), each with graded 0–10 point keys (community sources; not confirmed on the wiki page) | Community tools map STS score to the CCRL engine scale, reportedly within ±100 for engines (forum claim) | None. Keys were built with the top engines of the day | Low |
| **Win at Chess (WAC)** (Reinfeld 1958; revised by F. Wilson 2001) | 300 tactical positions. A 2018 cleaned version has 201 [7] | None [7] | None. Used as an engine "sanity check" | Low |
| Others: LCT II, Nolot, ECM, Arasan, CCR One-Hour, Kaufman, Eigenmann [5] | Engine benchmarks | Varied | None | Low |

**About the "Ivanov / Ilyumzhinov" tests mentioned in the brief.** This review found **no evidence** of a recognised Elo-estimation suite by either name. The Chess Programming Wiki's index of test positions lists none [5]. Human-oriented rating tests that *are* documented: the **Bloss test** (*Rate Your Own Chess*, 1973), which drew published criticism ("Bloss Flunks Test", 1980), and a 1979 "CAPS II: Chess ratings from problem solving" article (unrelated to Chess.com CAPS) [5]. **ChessBase "Elo-meter"**: a ChessBase article describes a test that "calculates your Elo". Its validity data were not retrieved.

**Conclusion for the platform.** Engine suites are useful **item banks**, because they hold positions with known best moves. Their Elo formulas must **not** be used to rate humans.

## 3. The Amsterdam Chess Test (van der Maas & Wagenmakers, 2005) [1]

The best-documented psychometric chess test, and the template for Grim Chess's battery.

**Sample.** 259 participants at the 1998 Dutch Open (Dieren). 234 completed every subtest, and 215 of those had an official (Dutch) Elo rating. 159 of these also played in the tournament, so a tournament performance rating (TPR) was available for them. Fifty also had FIDE ratings, which correlated above .93 with the Dutch ratings and ran about 50 points higher [1].

**Components and results** (Table 2 of [1]). Accuracy = sum score. CISRT = sum score weighted by response time.

| Test | Items | Format | α (acc.) | r with Elo (acc.) | r with Elo (CISRT) |
|---|---|---|---|---|---|
| **Choose-a-move A** | 40 (20 tactical, 10 positional, 10 endgame) | 30 s per item; find the best move for White; feedback after each item | **.87** | **.77** | .78 |
| ↳ tactical / positional / endgame | 20 / 10 / 10 | | .80 / .68 / .60 | .68 / .65 / .66 | .71 / .69 / .71 |
| **Choose-a-move B** (parallel form) | 40 | as A | **.90** | **.81** | .81 |
| Predict-a-move | 42 (moves of the GM game Liss–Hector, 1996) | multiple choice | .71 | .63 | .53 |
| Verbal knowledge | 18 | questionnaire | .67 | .55 | .54 |
| Recall | 18 (6 random, 6 low-frequency, 6 high-frequency positions) | reconstruct the position | .66 | .51 (random .25; high-frequency .46) | .50 |
| Motivation | 30 | questionnaire | .74 | .22 | — |

**Prediction equations** [1]
- Elo = 1189 + 35.15 × (number correct on A); SE of estimate = **181.5**
- Elo = 1169 + 33.10 × (number correct on B); SE = **167.2**
- A stepwise regression (choose-a-move + predict-a-move) explains **70%** of Elo variance. A factor-score model with age, sex and the number of games played explains **75%**, with SE of estimate 147.4 and a 95% prediction interval of **±292**.
- For TPR, Elo + choose-a-move A + motivation explain 82% of the variance. That is more than Elo alone (77%), so the **test adds information beyond the official rating**. The authors also estimate that Elo lags real ability by about 3.5–4 points per year of age for young players [1].
- Validity held up *within* Elo ranges (< 1800, N = 93; 1800–2200, N = 98; > 2200, N = 33) [1].
- Using IRT ability estimates in place of sum scores did **not** improve validity (Rasch r = .75/.79, 2PL r = .76/.80). The 2PL model fit, the 1PL did not [1].
- Response time. Mean RT on *correct* responses correlated with Elo (r = −.30 for A, −.26 for B), but overall mean RT did not. Weighting by latency improved validity mainly for easy items [1].
- The public dataset is available in the R package LNIRT as `AmsterdamChess` [3].

**Evidence strength: High.** Peer-reviewed, a representative sample of active players, full psychometrics reported. Limitations: one country, 1998 rating scale, and few players above 2200 (N = 33).

## 4. de Groot's choose-a-move paradigm and memory tests

- **de Groot (1946/1965)** introduced think-aloud *choose-a-move* problems and brief-exposure *recall* of positions. The ACT operationalises both [1]. Choose-a-move is the most valid component (r ≈ .77–.81).
- **Gobet & Simon (1996)** report recall experiments with players from class A to grandmaster, using up to 5 positions shown for 5 s each. Experts keep a small but real advantage even on random positions. The work supports chunk/template theory, with an estimated ~50,000 chunks for masters [13].
- **Sala & Gobet (2017) meta-analysis.** The correlation between expertise and recall of *random* domain material is **r̄ = .41** across domains, chess included [11].
- **Implication.** Recall tests are cheap and fairly reliable, but their validity is lower (ACT r = .51; random positions only .25). Use recall as a **diagnostic**, not as a rating input.

## 5. Cognitive ability is a weak correlate

**Burgoyne et al. (2016) meta-analysis** (*Intelligence* 59:72–83): the average correlation between cognitive ability and chess skill is **r ≈ .24**. Fluid reasoning correlates at .32 in youth samples and .11 in adult samples, and at .32 in unranked samples against .14 in ranked samples. Numerical ability correlates at .35, verbal at .19, visuospatial at .13 [12]. **Conclusion:** the platform must not use general cognitive tests as a proxy for chess strength.

## 6. Verbal or declarative chess knowledge

Pfau & Murphy (1988) found that verbal chess knowledge correlated **r = .69** with rating (N = 59), as cited in [1]. In the ACT, verbal knowledge reached r = .55 with low subscale reliabilities (α < .5) [1]. **Implication:** knowledge checks (endgame theory, opening principles) suit *curriculum gating*, not the rating number.

## 7. Validity of tactics tests and puzzle ratings

- Choose-a-move tactical items: r = .68 (A) and .76 (B) with Elo [1].
- Lichess puzzle rating vs blitz rating: r ≈ .8–.85 (weak-quality blog evidence; `04-rating-conversions.md`).
- **Conclusion.** Timed, standardized tactics with known difficulty predict rating moderately well. Self-paced puzzle ratings are confounded by volume and by solving strategy.

## Sources

1. H. L. J. van der Maas & E.-J. Wagenmakers, "A psychometric analysis of chess expertise," *Am. J. Psychol.* 118(1):29–60, 2005. https://www.ejwagenmakers.com/2005/VanderMaasWagenmakersACTpaper.pdf
2. PubMed record 15822609. https://pubmed.ncbi.nlm.nih.gov/15822609/
3. LNIRT R package, `AmsterdamChess` dataset documentation. https://rdrr.io/cran/LNIRT/man/AmsterdamChess.html
4. S. Benn & D. Kopec, "The Bratko-Kopec Test Recalibrated." https://www.sci.brooklyn.cuny.edu/~kopec/Publications/THE%20BRATKO-KOPEC%20TEST%20RECALIBRATED.htm
5. Chess Programming Wiki, "Test-Positions." https://www.chessprogramming.org/Test-Positions
6. Chess Programming Wiki, "Strategic Test Suite." https://www.chessprogramming.org/Strategic_Test_Suite
7. Chess Programming Wiki, "Win at Chess." https://www.chessprogramming.org/Win_at_Chess
8. rec.games.chess.computer (1996) thread describing BT tests (via search extract). https://groups.google.com/g/rec.games.chess.computer/c/4sEJEmijH_4
9. University of Maribor, "EPD test 14.12.2006" (via search extract). https://labraj.feri.um.si/en/EPD_test_14.12.2006
10. F. Schubert, "Lösung eines alten Problems" (Glarean Magazin, 2017). https://glarean-magazin.ch/wp-content/uploads/2017/03/Lösung-eines-alten-Problems-Frank-Schubert-1.pdf
11. G. Sala & F. Gobet, "Experts' memory superiority for domain-specific random material generalizes across fields of expertise: A meta-analysis," *Memory & Cognition* 45:183–193, 2017. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5323477/
12. A. P. Burgoyne et al., "The relationship between cognitive ability and chess skill: A comprehensive meta-analysis," *Intelligence* 59:72–83, 2016. https://eprints.lse.ac.uk/102241
13. F. Gobet & H. A. Simon (1996), recall/template studies (*Cognitive Psychology*; *Memory & Cognition*; *Psychonomic Bulletin & Review*). https://www.Gwern.net/doc/psychology/chess/1996-gobet.pdf
