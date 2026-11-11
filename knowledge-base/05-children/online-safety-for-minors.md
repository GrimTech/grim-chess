---
title: "Safety and Online Play for Minors"
summary: "Risks to minors on chess platforms (grooming via chat or coaching, harassment, data exploitation, manipulative design, cheating culture), the regulatory and federation frameworks (COPPA, UK Children's Code, GDPR Art. 8, US Chess Safe Play, ECF Safe Play, SafeSport-style one-on-one rules), how ChessKid and Chess.com implement protections, and a concrete safety requirements list for Grim Chess."
last_reviewed: 2026-11-11
evidence_strength_overall: "strong (legal requirements and federation policies as documented); moderate (design practices); note: legal summaries are not legal advice"
sources:
  - "FTC COPPA Rule — https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa"
  - "ICO Age Appropriate Design Code (Children's Code) — https://ico.org.uk/media/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services-2-1.pdf"
  - "GDPR Article 8 — https://gdpr-info.eu/art-8-gdpr/"
  - "US Chess Safe Play policy — https://new.uschess.org/news/icymi-us-chess-safe-play-policy ; guidelines PDF https://new.uschess.org/sites/default/files/media/documents/us-chess-safe-play-guidelines.pdf"
  - "ECF Safe Play Guidelines (2023) — https://www.englishchess.org.uk/wp-content/uploads/2023/09/Safe-Play.pdf"
  - "ECF Safeguarding — https://www.englishchess.org.uk/safeguarding-and-the-ecf"
  - "U.S. Center for SafeSport (MAAPP) — https://uscenterforsafesport.org/"
  - "ChessKid safety features — https://chesskid.com/article/view/how-to-understand-chesskids-safety-features2"
  - "Chess.com child safety — https://support.chess.com/en/articles/16208488-how-does-chess-com-help-keep-children-safe"
  - "Welsh Chess Union advice for parents about online chess — https://welshchessunion.uk/?p=11401"
---

# Safety and Online Play for Minors

> **Not legal advice.** This file summarizes public frameworks for product design. Legal review is required per jurisdiction before launch.

## 1. Risk landscape

| Risk | Vector on chess platforms | Severity |
|---|---|---|
| **Grooming / sexual exploitation** | Open chat, private messages, "free coaching" offers, video lessons, off-platform contact requests | Critical |
| Harassment and bullying | In-game chat, forums, rating-related taunting | High |
| Data exploitation | Behavioral profiling, ads, geolocation, sharing data with third parties | High |
| Manipulative design | Streaks, loss-chasing loops, loot-like rewards, nudges to weaken privacy | Medium–high |
| Cheating culture | Engine use by juniors (and parents) in online events | Medium |
| Overuse / sleep loss | Unbounded blitz, late-night play | Medium |

## 2. Legal and regulatory frameworks (summary)

- **COPPA (US):** online services directed to children under 13, or with actual knowledge that they collect personal information from under-13s, must give notice and obtain **verifiable parental consent**, along with other obligations (data minimization, retention limits, parental access and deletion) [1]. The FTC has amended the rule over time. Check the current version [1].
- **UK Age Appropriate Design Code ("Children's Code"):** 15 standards for services likely to be accessed by under-18s, with compliance required from **2 September 2021**. They include the child's best interests, **high privacy by default**, **geolocation off by default**, **profiling off by default**, **no nudge techniques** that lead children to provide unnecessary data or weaken privacy, data minimization, no data sharing without compelling reason, and age-appropriate parental controls with transparency to the child [2].
- **EU GDPR Article 8:** parental consent is required for information-society services offered directly to children below the age of digital consent. That age is 16 by default, and member states may lower it to no less than 13 [3].
- Other regimes (e.g., the UK Online Safety Act, the EU Digital Services Act's minor-protection provisions) may impose further duties. *Pending legal review.*

## 3. Chess-federation safeguarding frameworks

- **US Chess Safe Play Policy:** final version approved by the Executive Board on 28 December 2023, **effective 1 January 2024**, with scope extended to all US Chess-rated tournaments and sanctioned activities. It covers coaches providing instruction at those events, **bars registered sex offenders** from events where minors are present, provides SafeSport training modules and is modelled on the USTA's Safe Play program [4].
- **English Chess Federation Safe Play Guidelines (2023):** they prohibit sexual misconduct, bullying (including cyber-bullying), harassment, discrimination and emotional misconduct. They require **screening and safeguarding training** for organisers, arbiters and staff who regularly contact minors. They set reporting channels (including anonymous reports) and on-site response procedures, and allow referral to the FIDE Ethics Committee [5][6].
- **SafeSport-style rules** (from US Olympic and Paralympic sport). The Minor Athlete Abuse Prevention Policies are widely used as a model: one-on-one interactions between adults and minors should be **observable and interruptible**, and electronic communications with minors should be **transparent** (e.g., copying a parent) [7]. *Chess federations increasingly align with these norms, and platforms should adopt them for online coaching.*

## 4. How existing platforms implement protections

**ChessKid** [8]:
- **Adult accounts cannot talk to kids. Ever.** (Staff accounts are excepted.) Adults cannot friend kids unless they are the child's guardian.
- **Kids cannot chat or message each other**, even friends.
- Guardians can **disable social access**, control club membership and read the child's messages ("impersonate account").

**Chess.com** [9]:
- Safe Mode disables messages, chat and comments. Users can block other members and restrict chat.
- Users can report abuse, and CSAM is reported to NCMEC. Parents can request Safe Mode via support.
- Younger children are directed to ChessKid.

**Federation advice to parents** (e.g., the Welsh Chess Union) stresses supervised online play, disabling chat and caution about online coaching arrangements [10].

## 5. Grim Chess safety requirements (minimum)

**Accounts and data**
1. **Age gate at sign-up**, with a separate **child account type** for under-13s (or the local age of digital consent) created and controlled by a verified guardian [1][3].
2. **High privacy by default** for all under-18s: no public profile details, no geolocation, profiling for advertising off, **no third-party advertising**, and data minimization [2].
3. Behavioral profiling only for **educational personalization** (training recommendations), disclosed to guardian and child, and switchable off.

**Communication**
4. Under-13s: **no free-text chat**. At most pre-set phrases, and only in games. No private messaging except with guardians (ChessKid model) [8].
5. 13–17: chat **off by default**. Guardian-controlled opt-in to filtered chat with friends only. One-click report and block.
6. **No adult-to-minor private messaging**, except platform-verified coaches (below) with guardian copy.

**Coaching**
7. **Coach vetting:** identity verification, credential checks (e.g., FIDE trainer titles; see `../02-methods/coaching-models-federations-academies.md`), background checks where legally available, and safeguarding training.
8. **Observable and interruptible lessons** for minors: guardian invited to or able to join any session, sessions recorded with consent and retained under policy, no off-platform contact, and all messages copied to the guardian [7].
9. Clear prohibition of gifts, off-platform contact requests and private social-media connections with minor students.

**Design ethics**
10. **No dark patterns:** no loss-of-streak penalties, loot boxes, or nudges to share data or weaken settings [2].
11. **Time limits and quiet hours** set by guardians, with defaults aligned with health guidance (see `age-banded-recommendations.md`).
12. **Tilt and overuse safeguards** (see `../01-learning-science/motivation-tilt-and-emotional-control.md`).

**Fair play and reporting**
13. Child-appropriate **fair-play education** and detection. Sanctions for minors are handled with guardian involvement.
14. A **designated safeguarding lead**, a 24/7 reporting pipeline, mandatory reporting to authorities where required, NCMEC and CSAM reporting compliance, and a transparency report.

**Governance**
15. An annual **external safeguarding audit** and a child-rights impact assessment (Children's Code best-interests standard) [2].

## Sources

1. U.S. Federal Trade Commission (n.d.). Children's Online Privacy Protection Rule ("COPPA"). https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa
2. UK Information Commissioner's Office (2020/2021). *Age appropriate design: a code of practice for online services* (v2.1). https://ico.org.uk/media/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services-2-1.pdf ; summary: https://tiga.org/?p=9917
3. Regulation (EU) 2016/679 (GDPR), Article 8. https://gdpr-info.eu/art-8-gdpr/
4. US Chess Federation (2023–2024). Safe Play Policy (announcement and guidelines). https://new.uschess.org/news/icymi-us-chess-safe-play-policy ; https://new.uschess.org/sites/default/files/media/documents/us-chess-safe-play-guidelines.pdf
5. English Chess Federation (2023). Safe Play Guidelines. https://www.englishchess.org.uk/wp-content/uploads/2023/09/Safe-Play.pdf
6. English Chess Federation (n.d.). Safeguarding and the ECF. https://www.englishchess.org.uk/safeguarding-and-the-ecf
7. U.S. Center for SafeSport (n.d.). Minor Athlete Abuse Prevention Policies (MAAPP). https://uscenterforsafesport.org/
8. ChessKid (n.d.). How to: Understand ChessKid's safety features. https://chesskid.com/article/view/how-to-understand-chesskids-safety-features2
9. Chess.com Help Center (n.d.). How does Chess.com help keep children safe? https://support.chess.com/en/articles/16208488-how-does-chess-com-help-keep-children-safe
10. Welsh Chess Union (n.d.). Advice for parents about online chess for their children. https://welshchessunion.uk/?p=11401
