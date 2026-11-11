---
title: "Children's Track Principles (K1–K20)"
summary: "Numbered, implementable principles for Grim Chess's children's track (ages 4–17), each tied to evidence in this folder and in 01-learning-science / 02-methods, with an evidence-strength rating. Covers claims policy, curriculum entry, session design, motivation, safety, privacy, specialization, parents, competition, inclusion and evaluation."
last_reviewed: 2026-11-11
evidence_strength_overall: "mixed; rated per principle"
sources:
  - "Jerrim et al. (2018) — https://doi.org/10.3368/jhr.53.4.0516.7952R"
  - "Sala & Gobet (2016; 2017) — https://doi.org/10.1016/j.edurev.2016.02.002 ; https://doi.org/10.1177/0963721417712760"
  - "Kalyuga et al. (2003) — https://doi.org/10.1207/S15326985EP3801_4"
  - "Gathercole et al. (2004) — https://doi.org/10.1037/0012-1649.40.2.177"
  - "Deci, Koestner & Ryan (1999) — https://doi.org/10.1037/0033-2909.125.6.627"
  - "Sailer & Homner (2020) — https://doi.org/10.1007/s10648-019-09498-w"
  - "Mueller & Dweck (1998) — https://doi.org/10.1037/0022-3514.75.1.33"
  - "Brenner et al. / AAP (2016) — https://doi.org/10.1542/peds.2016-2148"
  - "WHO (2019; 2020) — https://www.who.int/publications/i/item/9789241550536 ; https://www.who.int/publications/i/item/9789240015128"
  - "ICO Children's Code — https://ico.org.uk/media/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services-2-1.pdf"
  - "FTC COPPA — https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa"
  - "ChessKid safety — https://chesskid.com/article/view/how-to-understand-chesskids-safety-features2"
  - "Harwood & Knight (2015) — https://doi.org/10.1016/j.psychsport.2014.03.001"
  - "Bilalić et al. (2009) — https://doi.org/10.1098/rspb.2008.1576"
---

# Children's Track Principles (K1–K20)

Each principle lists **what** the platform does, **why** (with file and source references) and the **evidence strength**.

---

**K1 — Justify chess on intrinsic grounds. Make no academic or IQ transfer claims.**
The largest RCT (4,009 pupils, 100 schools) found about zero effect on maths, reading and science a year later [Jerrim et al. 2018]. Positive meta-analytic effects shrink with design quality, and far transfer rarely occurs [Sala & Gobet 2016, 2017].
*Implementation:* the marketing copy policy in `chess-in-schools-and-transfer-evidence.md` §4. Legal and comms review of all children-facing marketing.
*Evidence:* **strong**.

**K2 — Start ages 4–9 on a mini-game path with mastery gates, and delay checkmate.**
Mini-games reduce element interactivity [Kalyuga et al. 2003; cognitive load theory]. Steps delays checkmate. Susan Polgár began with pawn wars.
*Implementation:* the sequence in `mini-games.md` §3. Gates such as "beat level-2 bot 3× in a row". Capture-the-king only as a brief bridge.
*Evidence:* **expert consensus** + theory.

**K3 — Use a fine-grained, prerequisite-linked skill graph: one concept per micro-lesson, then worked example, practice and play.**
Steps Method structure. Worked-example and guidance-fading effects for novices.
*Implementation:* Steps-aligned skill nodes. Stepping Stones-style slower track for 6–9.
*Evidence:* **moderate** (general learning science); **expert consensus** (chess).

**K4 — Use age-banded session lengths and weekly caps, with defaults aligned with health guidelines.**
WHO under-5 screen limits (≤ 1 h/day at ages 2–4). WHO 5–17 activity guidance. AASM sleep guidance. Attention and working-memory development [Gathercole 2004; Betts 2006].
*Implementation:* the defaults table in `age-banded-recommendations.md`. Guardian-adjustable caps. Quiet hours by default.
*Evidence:* **strong** (health limits); **weak** (chess-specific lengths, which are defaults to be tuned).

**K5 — For under-7s, prefer physical boards and adult co-play. The app supports rather than replaces them.**
WHO/AAP early-childhood screen guidance. Co-viewing recommended by AAP.
*Implementation:* printable mini-games, pass-and-play co-play mode, parent prompts.
*Evidence:* **moderate**.

**K6 — Give informational feedback and mastery progress, not transactional rewards. Keep gamification light and ethical.**
Expected, performance-contingent tangible rewards undermine intrinsic motivation [Deci, Koestner & Ryan 1999; Lepper et al. 1973]. Gamification has small positive effects, moderated by game fiction and social interaction [Sailer & Homner 2020].
*Implementation:* story and progress maps, mastery stars. **No** streak-loss penalties, loot mechanics or coin economies tied to volume.
*Evidence:* **moderate–strong**.

**K7 — Praise process and effort. Never label children by talent or early speed.**
Intelligence praise harms persistence after failure [Mueller & Dweck 1998]. Early progress partly reflects cognitive ability, which matters more in children, but practice dominates among serious young players [Burgoyne 2016; Bilalić 2007].
*Implementation:* a feedback-copy style guide. No "genius" badges. No public leaderboards for under-10s by default.
*Evidence:* **moderate**.

**K8 — Concrete before abstract: rules, captures, threats and mates first; strategic vocabulary from about age 10, through concrete examples.**
Developmental trends in abstract reasoning and working memory. Steps sequencing.
*Evidence:* **moderate** (general); **expert consensus** (chess).

**K9 — Use a low-load interface for young children: on-board highlights that fade, short rounds, no clocks below about age 8.**
Split-attention and element-interactivity principles. Attention development.
*Evidence:* **moderate** (theory); **design default**.

**K10 — Child-safe social design: no free-text chat for under-13s, no adult-to-child private messaging, guardian controls.**
ChessKid model ("Adult accounts cannot talk to kids"). Children's Code.
*Implementation:* requirements 4–6 in `online-safety-for-minors.md`.
*Evidence:* **strong** (regulatory and federation norms).

**K11 — Coach safeguarding: vetting, observable and interruptible lessons, guardian copy on all communication, no off-platform contact.**
US Chess Safe Play, ECF Safe Play, SafeSport MAAPP norms.
*Evidence:* **strong** (policy consensus).

**K12 — Privacy by default: no ads, geolocation off, profiling only for learning (disclosed and switchable), data minimization, verified parental consent where required.**
COPPA, ICO Children's Code (15 standards), GDPR Art. 8.
*Evidence:* **strong** (legal requirements; jurisdiction review needed).

**K13 — No early-specialization pressure. Intensive tracks are opt-in, from about age 12, with wellbeing monitoring.**
AAP 2016 report on specialization and burnout. Côté's DMSP sampling years (about 6–12). The ethical critique of the Polgár experiment. This is balanced against the starting-age advantage: provide early, enjoyable exposure without intensity.
*Implementation:* guardian opt-in, wellbeing check-ins, prompts to keep up other activities.
*Evidence:* **moderate**.

**K14 — Parent mode: process-focused digests, conversation prompts, parent education, burnout signals.**
Autonomy-supportive parenting predicts enjoyment and continued participation, and pressure predicts dropout [Harwood & Knight 2015; Knight et al. 2017]. Academic socialization beats homework micromanagement [Hill & Tyson 2009].
*Implementation:* the feature spec in `parental-involvement.md` §6.
*Evidence:* **moderate**.

**K15 — Competition is optional and staged. Slower time controls for learning. Coaching on losses. Tilt protections for teens.**
Long games plus review drive learning (see `../02-methods/game-study-and-analysis-loops.md`). Tilt evidence (see `../01-learning-science/motivation-tilt-and-emotional-control.md`).
*Evidence:* **moderate** / **expert consensus**.

**K16 — Inclusion and retention of girls and under-represented groups.**
Participation explains much of the top-level gender gap [Bilalić et al. 2009]. Avoid stereotype-activating framing (contested evidence, zero cost).
*Implementation:* optional girls' clubs and cohorts, female coaches and role models, retention dashboards by gender (privacy-preserving).
*Evidence:* **moderate**.

**K17 — Fair-play education for juniors, with guardian involvement in any sanctions.**
Platform fair-play norms. Developmentally appropriate responses.
*Evidence:* **expert consensus**.

**K18 — Teen autonomy and transition (13–17): self-directed plans, monthly diagnosis, age-appropriate transparency of guardian oversight.**
Self-determination theory (autonomy). DMSP specializing and investment years. Children's Code transparency.
*Evidence:* **moderate**.

**K19 — Wellbeing prompts: move breaks, sleep-protecting quiet hours, no late-night play nudges.**
WHO activity guidance. AASM sleep guidance. Sleep and memory consolidation (see `../01-learning-science/sleep-fitness-and-tournament-stamina.md`).
*Evidence:* **strong** (general health).

**K20 — Evaluate honestly: measure enjoyment, retention and skill, and use independent, pre-registered evaluations with active controls for any school programme.**
The Jerrim et al. lessons: small samples produce false positives, so use delayed outcomes [Jerrim et al. 2018].
*Implementation:* outcome dashboards. Partnerships with independent evaluators. Publish null results.
*Evidence:* **strong** (methodological).

---

## Sources

Primary sources are listed in each referenced file. Key references:
- Jerrim, J., et al. (2018). *Journal of Human Resources*, 53(4), 993–1021. https://doi.org/10.3368/jhr.53.4.0516.7952R
- Sala, G., & Gobet, F. (2016). *Educational Research Review*, 18, 46–57. https://doi.org/10.1016/j.edurev.2016.02.002
- Sala, G., & Gobet, F. (2017). *Current Directions in Psychological Science*, 26(6), 515–520. https://doi.org/10.1177/0963721417712760
- Kalyuga, S., et al. (2003). *Educational Psychologist*, 38(1), 23–31. https://doi.org/10.1207/S15326985EP3801_4
- Gathercole, S. E., et al. (2004). *Developmental Psychology*, 40(2), 177–190. https://doi.org/10.1037/0012-1649.40.2.177
- Deci, E. L., Koestner, R., & Ryan, R. M. (1999). *Psychological Bulletin*, 125(6), 627–668. https://doi.org/10.1037/0033-2909.125.6.627
- Sailer, M., & Homner, L. (2020). *Educational Psychology Review*, 32, 77–112. https://doi.org/10.1007/s10648-019-09498-w
- Mueller, C. M., & Dweck, C. S. (1998). *JPSP*, 75(1), 33–52. https://doi.org/10.1037/0022-3514.75.1.33
- Brenner, J. S., & AAP (2016). *Pediatrics*, 138(3), e20162148. https://doi.org/10.1542/peds.2016-2148
- WHO (2019; 2020) guidelines. https://www.who.int/publications/i/item/9789241550536 ; https://www.who.int/publications/i/item/9789240015128
- ICO (2020/21). Age appropriate design code. https://ico.org.uk/media/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services-2-1.pdf
- FTC. COPPA Rule. https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa
- ChessKid. Safety features. https://chesskid.com/article/view/how-to-understand-chesskids-safety-features2
- Harwood, C. G., & Knight, C. J. (2015). *Psychology of Sport and Exercise*, 16, 24–35. https://doi.org/10.1016/j.psychsport.2014.03.001
- Hill, N. E., & Tyson, D. F. (2009). *Developmental Psychology*, 45(3), 740–763. https://doi.org/10.1037/a0015362
- Bilalić, M., et al. (2009). *Proceedings of the Royal Society B*, 276, 1161–1165. https://doi.org/10.1098/rspb.2008.1576
