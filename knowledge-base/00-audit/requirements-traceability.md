---
title: "Requirements traceability"
summary: "Each product requirement mapped to its implementation, its evidence base and how to verify it."
last_reviewed: 2026-11-11
sources:
  - "docs/ARCHITECTURE.md"
  - "knowledge-base/06-curriculum/curriculum-design.md"
---

# Requirements traceability

| # | Requirement | Implementation | Evidence / spec | How to verify |
|---|---|---|---|---|
| R1 | Train anyone from zero knowledge to master/GM level, paced to the learner's speed | 258-skill graph across 8 stages (rules → GM competencies); mastery gating with placement credit; interactive lessons per skill (`content/lessons/adult`); daily plan from the time budget (`packages/core/src/plan.ts`); spaced repetition (`packages/core/src/fsrs.ts`); puzzles, drills, endgames, openings, guess-the-move; calibrated sparring and game review | `03-chess-knowledge/*`, `02-methods/synthesis.md`, `01-learning-science/time-to-mastery-evidence.md` (honest pacing) | `/learn`, `/train`, `/audit` coverage matrix; `npm run validate:content` |
| R1a | Progress measurable and comparable to real masters/GMs | Glicko-2 pools (bot, puzzle, online, assessment); Lichess accuracy and ACPL from game review; Amsterdam-Chess-Test-style assessment battery; GLS fusion into a FIDE-scale estimate with 95% interval; per-band benchmarks; CM/FM/IM/GM-equivalent milestones gated by confidence and knowledge checks | `04-assessment/platform-measurement-model.md`, `data/benchmarks.json`, `04-assessment/10-benchmarks-by-rating-band.md` | `/progress`, `/assessment/placement`; `packages/core/test/estimate.test.ts` |
| R2 | Separate method for children; ask age at the start | Age is the first, required onboarding question; under 13 → `/kids`: Steps-aligned world map, mini-games, kid lesson player with read-aloud, kid-friendly bots, parent dashboard, safety defaults | `05-children/*` (K1–K20), `02-methods/steps-method.md` | `/onboarding` → enter age 8 |
| R3 | Knowledge base available for external review and audit | This knowledge base: public in the repository and rendered in the app at `/kb`; front matter and numbered citations on every file; evidence-strength labels; claims register; reproducible validators; live coverage audit at `/audit` (`GET /api/kb/audit`) | `00-audit/audit-guide.md` | `/kb`, `/audit` |
| R4 | Chess engine; vs computer ranked by difficulty; same-computer two-player; LAN; internet | In-house 0x88 engine (`packages/engine`, perft-verified) for human-like levels 250–1150; Stockfish 19 WASM for 1320 → full strength (16 levels); pass-and-play `/play/local`; LAN via `npm run lan` (server binds 0.0.0.0, prints addresses, QR code in `/play/lan`); internet play on the Fly deployment `/play/online` (matchmaking, private rooms, server-side validation and clocks, reconnect) | `04-assessment/12-engine-strength-calibration.md` | `/play`; `apps/server/test/*` (WebSocket game, clock flag); `packages/engine/test/*` (perft) |
| R5 | No Next.js | React + Vite SPA, Node `http` server | `docs/ARCHITECTURE.md` | `package.json` files |
| R6 | Deploy to Fly | `fly.toml`, `deploy/Dockerfile`, SQLite on Fly volume `/data` | n/a | https://grim-chess.fly.dev |
| R7 | Git signed to the personal account | Repository-local git identity; pushed with the personal PAT | n/a | `git log` author |
