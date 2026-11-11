---
title: "FIDE Player Population: Rating Distribution and Percentiles"
summary: "Percentile table for the FIDE standard list (Oct 2026 count), historical band counts, GM/titled population sizes, and how Grim Chess should express 'percentile vs FIDE players' without overstating precision."
last_reviewed: 2026-11-11
sources:
  - https://ramachess.com/articles/what-is-a-good-chess-rating/
  - https://en.wikipedia.org/wiki/Elo_rating_system
  - https://en.wikipedia.org/wiki/FIDE_titles
  - https://handbook.fide.com/chapter/B022024
  - https://arxiv.org/pdf/2006.01855
  - https://www.ejwagenmakers.com/2005/VanderMaasWagenmakersACTpaper.pdf
---

# FIDE Player Population: Rating Distribution and Percentiles

## 1. Percentiles on the current FIDE standard list

Source: Rama Chess's count of the **October 2026** FIDE standard list, downloaded from ratings.fide.com: 569,654 listed players, 221,403 of them active. The percentiles below are computed over **all listed players**, active and inactive [1].

| FIDE rating | Share at or above | Percentile (share below) |
|---|---|---|
| 1400 | 100% (floor; no published ratings below) | 0 |
| 1500 | 85% | 15 |
| 1600 | 68% | 32 |
| ≈1709 | 50% (median; mean ≈ 1738) | 50 |
| 1800 | 36% | 64 |
| 2000 | 12.8% | 87.2 |
| 2200 | 3.6% | 96.4 |
| 2300 | 1.5% | 98.5 |
| 2400 | 0.52% | 99.48 |
| 2500 | 0.15% | 99.85 |
| 2600 | ≈ 0.04% (*interpolated*, see below) | ≈ 99.96 |
| 2700 | 36 players ≈ 0.006% | 99.994 |
| 2800 | ≈ 2–3 players (*estimate*) | ≈ 99.9996 |

**How the 2600 and 2800 rows were derived.** Wikipedia's band counts from the July 2015 active list (2500–2599: 542; 2600–2699: 187; 2700–2799: 40; > 2800: 4) give about 0.30 for the ratio of players at 2600+ to players at 2500+ [2]. Applying that ratio to the 2026 2500+ share gives about 0.045% at 2600+. The 2800 row reflects the very small number of players who have held 2800+ in recent years.

**Evidence strength**
- **Moderate** for the 1500–2700 rows. A full count of an official list, but by a secondary site. Independent replication from the official download is recommended (see the action item below).
- **Low** for the 2600 and 2800 rows (derived).

**Caveats**
1. **The share is sensitive to the base population.** Over active players only, the percentiles differ. Active players skew stronger, so the active-only percentile at a given rating is lower.
2. **The low end is truncated.** Because of the 1400 floor, the FIDE list includes no true beginners. A "percentile vs FIDE players" is therefore a percentile among *competitive tournament players*, not among everyone who plays chess.
3. **The distribution between 1400 and 2000 is compressed** by the 2024 adjustment (see `01-elo-and-fide-rating-system.md`). Percentile bands in this range are narrow in rating points.

**Action item (data engineering).** Re-derive this table from the official monthly download (ratings.fide.com) on every platform release, for both the all-players and the active-only population, and store the list date with each percentile in `data/benchmarks.json`. This review did not download the list (about 40 MB; the download was outside this task's permissions).

## 2. Historical band counts (active players, July 2015 list) [2]

| Band | Players | Typical titles |
|---|---|---|
| 2200–2299 | 5,323 | CM level |
| 2300–2399 | 2,869 | FM level |
| 2400–2499 | 1,420 | mostly IM/GM |
| 2500–2599 | 542 | mostly GM |
| 2600–2699 | 187 | GM |
| 2700–2799 | 40 | GM |
| ≥ 2800 | 4 | GM |

**Evidence strength: Low–Moderate.** Wikipedia presents this as its own analysis without a precise citation [2]. It is useful for the *shape* of the top tail.

## 3. Titled population

See `05-fide-titles-and-norms.md` for counts: about 1,889 GMs, 4,282 IMs and 9,617 FMs on the May 2026 tabulation [3]. GMs make up about 0.33% of all listed players (1,889 / 569,654). Many GMs are inactive or now rated below 2500.

## 4. Online pools for contrast

- **Lichess (2019 data, Maia paper):** mean 1525, 5% below 1000, 10% above 2000 [5].
- **Dutch federation (May 1998, N = 9,109):** the rating distribution was compared against a normal curve in the Amsterdam Chess Test paper. This is an older but well-documented example of a national rating distribution being close to normal [6].

## 5. How Grim Chess reports percentiles (normative)

- Report a **FIDE percentile** only when the estimated FIDE-equivalent rating is ≥ 1400. Report it as a range computed from the estimate's 80% interval. Example: "estimated 1850 (80% CI 1760–1940), which places you around the 58th–80th percentile of FIDE-listed players (Oct 2026 list)." Below 1400 the platform says "below the FIDE rating floor".
- Always name the reference population (all listed / active) and the list date.

## Sources

1. Rama Chess, "What Is a Good Chess Rating? Real FIDE Numbers by Level and Age" (count of the Oct 2026 FIDE list; secondary). https://ramachess.com/articles/what-is-a-good-chess-rating/
2. Wikipedia, "Elo rating system" (FIDE band counts, July 2015). https://en.wikipedia.org/wiki/Elo_rating_system
3. Wikipedia, "FIDE titles" (title counts, May 2026). https://en.wikipedia.org/wiki/FIDE_titles
4. FIDE Rating Regulations 2024 (floor 1400). https://handbook.fide.com/chapter/B022024
5. McIlroy-Young et al., KDD 2020. https://arxiv.org/pdf/2006.01855
6. van der Maas & Wagenmakers (2005), *American Journal of Psychology* 118(1):29–60. https://www.ejwagenmakers.com/2005/VanderMaasWagenmakersACTpaper.pdf
