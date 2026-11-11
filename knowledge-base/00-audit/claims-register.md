---
title: "Claims register"
summary: "Every outward-facing claim the platform makes or refuses to make, with its evidence status and where it is implemented."
last_reviewed: 2026-11-11
sources:
  - "knowledge-base/01-learning-science/time-to-mastery-evidence.md"
  - "knowledge-base/04-assessment/platform-measurement-model.md"
  - "knowledge-base/05-children/chess-in-schools-and-transfer-evidence.md"
---

# Claims register

| # | Claim | Status | Evidence | Where shown |
|---|---|---|---|---|
| C1 | Structured practice (tactics, analysis, endgames) is more efficient per hour than unreviewed play | Allowed | Observational (Southwick et al. 2026; Charness et al. 2005); moderate | Onboarding, plan explanations |
| C2 | "Your estimated strength is X (FIDE-scale estimate) with 95% interval [a, b]" | Allowed, with the interval and the "estimate" label | Measurement model; conversions are weak (see 04-assessment/04) | Dashboard, /progress |
| C3 | "CM/FM/IM/GM-equivalent strength (estimate)" | Allowed only when the estimate reaches the threshold and confidence ≥ medium | Measurement model §titles | Dashboard badge |
| C4 | "You are a GM / have earned a norm / your FIDE rating is …" | **Forbidden** | Titles and ratings are awarded only by FIDE in rated OTB play | n/a |
| C5 | "Reach GM in N months" or any fixed timeline | **Forbidden** | No method has documented evidence for this (01-learning-science/time-to-mastery-evidence.md) | n/a |
| C6 | Projected hours to milestones for this learner | Allowed as a range, labelled as an expert-judgement heuristic until replaced by platform cohort data | time-to-mastery-evidence.md §7 | Onboarding projection |
| C7 | "Chess will raise your child's IQ or grades" | **Forbidden** | EEF trial and Sala & Gobet meta-analyses: transfer near zero | n/a (K1) |
| C8 | "Comparable to a ~N-rated player" for accuracy/ACPL/puzzle rating | Allowed with the label "provisional benchmark" | data/benchmarks.json bands are `status: prior` | Dashboard, /progress |
| C9 | Bot ratings ("Ash, 1500") | Allowed with the caveat that engine Elo ≠ human Elo | 04-assessment/12-engine-strength-calibration.md | Bot picker |
| C10 | "X% faster than self-study" | **Forbidden** until measured in a pre-registered platform study | P26–P27 | n/a |
