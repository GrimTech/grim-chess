---
title: "Grim Chess knowledge base"
summary: "Index of the public, auditable knowledge base behind the Grim Chess training platform."
last_reviewed: 2026-11-11
sources: []
---

# Grim Chess knowledge base

This knowledge base is the evidence and the specification for the platform. It is written so that external
reviewers can judge whether the training programme is well-rounded and whether its claims are justified.
**Auditors: start with [00-audit/audit-guide.md](00-audit/audit-guide.md).**

| Section | What it covers |
|---|---|
| [00-audit](00-audit/audit-guide.md) | Audit guide, [claims register](00-audit/claims-register.md), [requirements traceability](00-audit/requirements-traceability.md) |
| [01-learning-science](01-learning-science/README.md) | How chess expertise is acquired and how long it takes |
| [02-methods](02-methods/README.md) | Established chess training methods, critiqued, and a [synthesis](02-methods/synthesis.md) of principles P1–P27 |
| [03-chess-knowledge](03-chess-knowledge/README.md) | What must be learned, from the rules to GM competencies, plus the machine-readable [skill graph](03-chess-knowledge/skill-graph.json) |
| [04-assessment](04-assessment/README.md) | Rating systems, titles, engine-based metrics, standardized tests, benchmarks, and the [measurement model](04-assessment/platform-measurement-model.md) |
| [05-children](05-children/README.md) | How children learn chess, evidence on transfer, safety, and principles K1–K20 |
| [06-curriculum](06-curriculum/curriculum-design.md) | How the research becomes the curriculum, daily plan and measurement |

Machine-readable data used by the platform: `03-chess-knowledge/skill-graph.json` and `../data/benchmarks.json`.
Lessons live in `../content/lessons/` and are checked by `npm run validate:content`.
