# Grim Chess

**An evidence-based chess training platform that takes learners from zero knowledge towards master and
grandmaster-equivalent strength, and measures their progress against real-world rating benchmarks.**

Grim Chess is not another place to play blitz. It is a training programme:

- A 258-skill curriculum.
- Interactive lessons.
- Tactics, calculation, endgame and opening training scheduled with spaced repetition.
- Calibrated sparring bots and full game review.
- An estimated FIDE-equivalent rating with an honest confidence interval.

The research behind every design decision is in a public [knowledge base](knowledge-base/README.md) written for
external audit.

## What's inside

| Area | Highlights |
|---|---|
| **Onboarding** | Asks the learner's age first. Under 13 goes to the children's track, 13 and over to the adult track. Then experience level, goal, daily time budget and an optional placement assessment |
| **Curriculum** | 8 stages (Foundations 0–600 → Grandmaster 2450–2700), 8 domains, 258 skills with prerequisites and measurable mastery criteria. Mastery gating and placement credit |
| **Lessons** | Interactive lessons: find-the-move, quizzes, and positions you play out against the engine (basic mates, Lucena, Philidor …). Every lesson ends with a retrieval check |
| **Training** | Adaptive puzzles (≈51k Lichess puzzles stratified by rating and theme), themed tactics, Woodpecker cycles, FSRS spaced review, coordinate and visualization drills, mating drills, theoretical endgames, opening repertoire trainer, guess-the-move on master games |
| **Daily plan** | Generated from your time budget, stage, due reviews and unlocked skills. The proportions follow the evidence synthesis (`knowledge-base/02-methods/synthesis.md`) |
| **Play** | vs computer (16 levels: an in-house human-like engine from 250, then Stockfish 19 up to full strength), pass-and-play on one device, **LAN**, and **online** (matchmaking, private rooms, server clocks, reconnect) |
| **Review** | Per-move classification, accuracy (the Lichess formula), ACPL, eval graph, and "retry your mistakes" mode |
| **Measurement** | Glicko-2 pools (bots, puzzles, online, assessment) fused into a FIDE-scale estimate with a 95% interval. Benchmarks per rating band. CM/FM/IM/GM-*equivalent* milestones, never titles |
| **Children's track** | Adventure map aligned with the Steps Method, mini-games (Pawn Wars, Capture Quest, Square Hunt, Knight's Journey…), read-aloud, a parent dashboard, no chat, online play only in private rooms |
| **Knowledge base** | ≈70 cited documents on learning science, training methods, chess knowledge, assessment science, children, and the curriculum. Live coverage audit at `/audit` |

## Honest framing

Many players get a lot faster through the early stages with better-structured practice. The evidence is reviewed in
[time-to-mastery-evidence.md](knowledge-base/01-learning-science/time-to-mastery-evidence.md). No method has
documented evidence of producing grandmasters on a fixed short timeline. Grim Chess therefore:

- Optimises training efficiency.
- Shows each learner their measured rate of progress and a forecast range.
- Never awards or promises titles. Real titles require FIDE-rated over-the-board norms.

See the [claims register](knowledge-base/00-audit/claims-register.md).

## Run it

Requires Node 24+.

```bash
npm install
npm run build        # builds the web app (copies Stockfish WASM)
npm start            # http://localhost:8080
```

Development: `npm run dev:server` (API on :8080) and `npm run dev` (Vite on :5173, proxies `/api` and `/ws`).

### LAN play
On one computer on the network:

```bash
npm run lan
```

The server binds to all interfaces and prints addresses like `http://192.168.1.20:8080`. Other players on the same
network open that address and choose **Play → LAN**. With Docker: `docker compose -f deploy/docker-compose.yml up`.

### Tests and validation

```bash
npm test                  # core, engine and server tests
npm run validate:content  # skill graph + every lesson: legal FENs, legal solutions, valid skill ids
node knowledge-base/03-chess-knowledge/validate-skill-graph.mjs
```

## Architecture
- React 19 + Vite + TypeScript, with no Next.js.
- Node 24 server (`node:http`, `ws`, `node:sqlite`).
- Stockfish 19 WASM in a Web Worker.
- chessground board.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The design system ("Scoresheet": Radix Colors, Open Props, Fraunces
and Atkinson Hyperlegible) is in [docs/design](docs/design/DESIGN.md).

Deployed on Fly.io: `fly deploy` (config in `fly.toml`, SQLite on a volume at `/data`).

## License
AGPL-3.0-or-later. Third-party components and data: [NOTICE.md](NOTICE.md). Puzzles and openings data are CC0 from
Lichess. Stockfish and chessground are GPL-3.0.
