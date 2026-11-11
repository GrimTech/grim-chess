---
title: "Chunking and Template Theory in Chess Expertise"
summary: "Explains Chase & Simon's chunking theory (1973) and Gobet & Simon's template theory (1996), the empirical findings behind them (recall of game vs random positions, multiple-board recall, chunk-size estimates), their limitations, and what they imply for how a training platform should structure content."
last_reviewed: 2026-11-11
evidence_strength_overall: "strong (expert memory advantage is pattern-based); moderate (exact chunk counts and template mechanics are model-dependent)"
sources:
  - "de Groot (1946/1965/1978) — https://archive.org/details/adriaan_d._de_groot_-_thought_and_choice_in_chess_2nd_ed._1978"
  - "Chase & Simon (1973) — https://doi.org/10.1016/0010-0285(73)90004-2"
  - "Gobet & Simon (1996a) templates — https://doi.org/10.1006/cogp.1996.0011"
  - "Gobet & Simon (1996b) random positions — https://doi.org/10.3758/BF03212414"
  - "Gobet et al. (2001) chunking mechanisms — https://doi.org/10.1016/S1364-6613(00)01662-4"
  - "Gobet & Simon (2000) five seconds or sixty — https://doi.org/10.1207/s15516709cog2404_4"
  - "Linhares & Freitas (2010) critique — https://doi.org/10.1016/j.newideapsych.2009.07.008"
  - "Charness (1976) — https://doi.org/10.1037/0278-7393.2.6.641"
---

# Chunking and Template Theory in Chess Expertise

## 1. Background: de Groot's recall experiment

Adriaan de Groot (Dutch thesis 1946; English *Thought and Choice in Chess* 1965) briefly showed players positions from real games, for 2–15 seconds, and asked them to reconstruct them. Grandmasters and masters reproduced positions almost perfectly. Weaker players did much worse [1]. Strong players did *not* clearly search more moves or deeper in his think-aloud protocols. That led de Groot to locate expertise mainly in perception and knowledge rather than brute-force search [1]. (The "no deeper search" conclusion was later qualified; see `pattern-recognition-and-expertise.md`.)

## 2. Chase & Simon (1973): chunking theory

**Method** [2]. A master, a Class A player and a beginner did (a) a *perception* task, copying a visible position onto a second board, and (b) a *memory* task, reconstructing a position after a 5-second view. Pieces placed together with short inter-placement pauses (under about 2 s) were treated as one **chunk**.

**Findings** [2]:
- Stronger players recalled **more chunks and larger chunks**.
- Pieces within a chunk shared chess relations such as defense, attack, proximity, same color and same piece type.
- With **random** placements of pieces, the master's advantage largely disappeared. This shows that the advantage comes from familiar patterns, not from superior general memory.

**Theory** [2][5]. Short-term memory holds only a few chunks (about 4–7). Masters can recall 20+ pieces, so each chunk must contain several pieces. Simon and colleagues estimated that a master's long-term memory holds tens of thousands of chunks (a commonly quoted first estimate is about 50,000). Each chunk is linked to plausible moves and plans, which explains fast "intuitive" move generation.

**Evidence strength: strong** for the core phenomena of the skill × structure interaction in recall and relational chunk structure. These have been replicated many times [3][4][5].

## 3. Problems with pure chunking theory

1. **Interference resistance.** Charness (1976) showed that recall of chess positions barely suffered when players did interpolated tasks. That is incompatible with pure short-term storage [8].
2. **Multiple boards.** Strong players could recall several positions presented one after another. Short-term chunk capacity cannot accommodate this [3].
3. **Random positions are not zero.** Gobet & Simon (1996b) showed a small but reliable skill advantage even for random positions. This is explained by accidental familiar chunks appearing in random arrangements [4].
4. **Encoding speed.** Masters encode positions faster than the roughly 8 s per chunk that classic long-term-memory learning rates would allow [3][5].

## 4. Gobet & Simon (1996): template theory

**Templates** are large, frequently encountered chunks (for example, a typical position arising from a specific opening or pawn structure). They develop into schema-like structures with [3][5]:
- a **core** of fixed pieces and squares;
- **slots** that can be filled quickly with variable pieces (taking about 250 ms per slot rather than seconds);
- **links** to plans, typical moves and evaluations.

Templates are retrieved from long-term memory and act as **retrieval structures**. This explains fast encoding, interference resistance and multi-board recall [3]. In Gobet & Simon's experiments, strong players reproduced multiple boards with a modest per-board cost [3].

Template theory is implemented computationally in **CHREST** (Chunk Hierarchy and REtrieval STructures). CHREST simulates eye movements, recall by skill level and chunk acquisition, and learns from exposure to real positions [5][6]. Model-based estimates of the number of chunks a master needs run into the **hundreds of thousands**. Gobet & Simon (2000) discussed estimates around 300,000. *Treat this as a model-dependent order of magnitude, not a measured count* [6].

**Evidence strength: moderate–strong.** The model fits many datasets, but the details (exact slot mechanics, chunk counts) are theory-laden.

## 5. Critiques and alternatives

- **Semantic content.** Linhares & Freitas (2010) argued that chunk theories under-weight abstract, semantic relations such as "strategic similarity" between positions that look different on the surface. Real experts group positions by function, not surface piece placement [7]. Gobet's group responds that higher-level templates carry semantic links. The debate is unresolved. *Evidence: contested.*
- **Search still matters.** Later studies found that stronger players do search more and deeper in some conditions (Holding 1985; Campitelli & Gobet 2004). Pattern knowledge *guides* search; it does not replace it (see `pattern-recognition-and-expertise.md`).
- **Long-term working memory** (Ericsson & Kintsch 1995) is a competing account of expert memory. It emphasizes general retrieval structures rather than chess-specific templates. Both accounts agree on the practical point: expertise rests on a huge, organized, domain-specific memory store.

## 6. How chunks are acquired

From [2][3][5][6] and the training-oriented review by Gobet & Jansen (2006) (see `../02-methods/synthesis.md`):

- **Exposure to many real positions** drives chunk acquisition. Random positions do not.
- **Attention matters.** Chunks form for what the learner looks at and processes. Feedback that directs attention to relevant relations (attack/defense links, key squares) should speed learning.
- **Variability with structure.** Templates form when similar positions recur with variation in the "slot" pieces, for example many games with the same pawn structure but different piece placements.
- **Linking chunks to actions** (the move or plan associated with the pattern) is what makes them useful in play, not recall alone.

## 7. Implications for Grim Chess

| Principle | Implementation |
|---|---|
| Expertise is a large pattern library | Track **pattern exposure counts** per learner (motif × structure × piece-configuration tags). Target tens of thousands of quality exposures over years, not hundreds. |
| Chunks are relational | Tag positions by relations (pins, overloaded defenders, weak squares, pawn levers), not only by "theme name". Highlight relational structure in feedback. |
| Templates form around recurring structures | Organize middlegame content by **pawn structure families** (IQP, Carlsbad, Maroczy, Hedgehog, French chains, etc.) so variants recur with slot variation. |
| Link pattern to action | Every pattern drill should ask for a move or plan, not just recognition. |
| Use real-game positions | Prefer positions from real games (human or high-quality engine games) over artificial constructions, except in beginner instruction where simplification is needed (see `cognitive-load-theory.md`). |
| Recall tasks as a diagnostic | Brief 5-second position recall tests track pattern-knowledge growth cheaply and correlate with skill [2][4]. Use them as an *assessment*, not as a primary training method. Recall practice itself has little evidence of driving playing strength. |

**Caveat for auditors:** the leap from "experts have more chunks" to "training that maximizes chunk exposure is optimal" is an inference. It is supported by theory and simulation [5][6] but not by randomized training trials comparing curricula.

## Sources

1. de Groot, A. D. (1965/1978). *Thought and Choice in Chess* (2nd ed. 1978). Mouton. Archive copy: https://archive.org/details/adriaan_d._de_groot_-_thought_and_choice_in_chess_2nd_ed._1978 ; obituary summary by Gobet & Musch: https://bura.brunel.ac.uk/bitstream/2438/2617/1/De%20Groot%20Obituary%20-%20%20Psychologische%20Rundschau.pdf
2. Chase, W. G., & Simon, H. A. (1973). Perception in chess. *Cognitive Psychology*, 4(1), 55–81. https://doi.org/10.1016/0010-0285(73)90004-2 (PDF: https://andymatuschak.org/prompts/Chase1973.pdf)
3. Gobet, F., & Simon, H. A. (1996a). Templates in chess memory: A mechanism for recalling several boards. *Cognitive Psychology*, 31(1), 1–40. https://doi.org/10.1006/cogp.1996.0011 (PDF: https://www.gwern.net/doc/psychology/chess/1996-gobet.pdf)
4. Gobet, F., & Simon, H. A. (1996b). Recall of rapidly presented random chess positions is a function of skill. *Psychonomic Bulletin & Review*, 3(2), 159–163. https://doi.org/10.3758/BF03212414
5. Gobet, F., Lane, P. C. R., Croker, S., Cheng, P. C.-H., Jones, G., Oliver, I., & Pine, J. M. (2001). Chunking mechanisms in human learning. *Trends in Cognitive Sciences*, 5(6), 236–243. https://doi.org/10.1016/S1364-6613(00)01662-4
6. Gobet, F., & Simon, H. A. (2000). Five seconds or sixty? Presentation time in expert memory. *Cognitive Science*, 24(4), 651–682. https://doi.org/10.1207/s15516709cog2404_4
7. Linhares, A., & Freitas, A. E. T. A. (2010). Questioning Chase and Simon's (1973) "Perception in chess": The "experience recognition" hypothesis. *New Ideas in Psychology*, 28(1), 64–78. https://doi.org/10.1016/j.newideapsych.2009.07.008
8. Charness, N. (1976). Memory for chess positions: Resistance to interference. *Journal of Experimental Psychology: Human Learning and Memory*, 2(6), 641–653. https://doi.org/10.1037/0278-7393.2.6.641
