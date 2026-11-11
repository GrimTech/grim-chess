# Sources

Everything below was read for this design system in November 2026. Each entry records what was taken and where it lives in our files.

## Design method

**Anthropic frontend-design skill**: https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md (raw: https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md)

What we took:
- Identify the subject, audience and job, then plan a small named palette and type roles before building. This produced the "Scoresheet" direction (paper, ink, brass, board).
- "Open with the most characteristic element of the subject's world." The board is the hero (DESIGN.md, principle 1).
- "Structure as information": numbering only for real sequences (move numbers, lesson steps, plan days).
- One or two clearly distinct families with a principled type scale (we use Bringhurst's), and line length under 80 characters (`--measure: 68ch`).
- Motion: one orchestrated moment (`.reward-pop`). User-triggered motion only. Respect reduced motion.
- The avoid list became our Don'ts:
  - cream with terracotta, near-black with acid green
  - SaaS-card kit and gradient washes
  - all-caps eyebrows, middle-dot meta strings, arrows on buttons
  - mono for small data labels
  - hover transitions on every card

**Refactoring UI** (Adam Wathan & Steve Schoger): https://refactoringui.com/. Only secondary summaries were reachable: https://medium.com/refactoring-ui/40c736799886 and https://sglavoie-github-io.pages.dev/posts/2023/09/09/book-summary-refactoring-ui/

What we took:
- Emphasize by de-emphasizing. The chrome is Sand so the board and primary actions stand out.
- Greys don't have to be neutral. Sand is a warm grey.
- Start with too much whitespace, then remove it.
- Use 8-10 grey shades. Radix gives us 12 steps.
- Labels are a last resort. Stat tiles lead with the value.

## Tokens

**Radix Colors**: https://www.radix-ui.com/colors and the scale semantics at https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale. Source values: https://raw.githubusercontent.com/radix-ui/colors/main/src/light.ts and https://raw.githubusercontent.com/radix-ui/colors/main/src/dark.ts

What we took:
- The step meanings (1-2 backgrounds, 3-5 component states, 6-8 borders and focus, 9-10 solids, 11-12 text, with APCA Lc 60 / Lc 90 guarantees for 11 and 12), plus the note that amber-9 and sky-9 need dark text.
- Hex values copied verbatim for Sand, Indigo, Amber, Tomato, Green, Cyan, Blue, Orange, Yellow, Bronze and Sky, light and dark (`tokens.css` sections 2 and 5).
- Our role mapping is in DESIGN.md section 4. We computed WCAG 2 contrast ratios for every role pair and listed them there.

**Open Props**: https://open-props.style/. Source files: https://unpkg.com/open-props@1.7.16/src/props.sizes.js, props.easing.js, props.borders.js and props.shadows.js

What we took:
- The token naming style (`--size-*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--layer-*`).
- `--size-1`…`--size-12` values verbatim.
- `--shadow-1`…`--shadow-5` recipes verbatim. `--shadow-color` is warmed for Sand, and dark mode raises strength to 25% as Open Props does.
- Easing curves verbatim: `--ease-2`, `--ease-3`, `--ease-out-3`, `--ease-out-4`, `--ease-in-out-3`, `--ease-elastic-out-2`.
- Radius values are our own and crisper; Open Props' `--radius-1` is 2px and `--radius-2` is 5px.

**Google Fonts**

- Fraunces: https://fonts.google.com/specimen/Fraunces and https://github.com/undercasetype/Fraunces. We use the axes `opsz` 9-144, `wght` 100-900, `SOFT` 0-100 (Sharp to SuperSoft) and `WONK` 0-1. SOFT and WONK are how the kids track gets a softer version of the same brand face.
- Atkinson Hyperlegible Next: https://fonts.google.com/specimen/Atkinson+Hyperlegible+Next. It is a Braille Institute hyperlegible family. We downloaded the served TTF and checked its OpenType features: `tnum`, `pnum` and `frac` are present, so `font-variant-numeric: tabular-nums` works.
- Atkinson Hyperlegible Mono: https://fonts.google.com/specimen/Atkinson+Hyperlegible+Mono. Used for clocks and notation.
- The `@import` URL in `tokens.css` was fetched and returns valid `@font-face` rules for all three families.

**Robert Bringhurst, *The Elements of Typographic Style***. The frontend-design skill points to it. The classic scale (12, 14, 16, 18, 21, 24, 36, 48, 60, 72) became `--font-size-0`…`--font-size-9`.

## Accessibility

**WCAG 2.2, SC 2.5.8 Target Size (Minimum)**: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

Taken: the 24x24 CSS px floor (`--target-floor`), the spacing exception (dense toolbars at 32px), the inline-link exception, and the advice to aim for 2.5.5 (44px) on important controls (`--target-min: 44px`).

**WCAG 2.2, SC 2.4.13 Focus Appearance**: https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html

Taken: a 2px perimeter with a 3:1 change, implemented as a 2px ring with a 2px offset (`--focus-*`). Also SC 2.4.11 Focus Not Obscured, which becomes the `scroll-margin-top` rule.

**WCAG 2.2, SC 1.4.11 Non-text Contrast**, referenced through GOV.UK: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html

Taken: form-control borders use sand-9, which is at least 3:1.

**GOV.UK Design System, focus states**: https://design-system.service.gov.uk/get-started/focus-states/

Taken: focus must work on every background (we switch ring colour per theme), and focus must not depend only on colour change (we use a ring with an offset). The form-input pattern of a thicker border on error and invalid became our 2px `aria-invalid` border. Visible labels above fields, never a placeholder as the label.

**IBM Carbon, data table**: https://carbondesignsystem.com/components/data-table/style/ and https://carbondesignsystem.com/components/data-table/usage/

Taken: row-height sizes xs 24 / sm 32 / md 40 / lg 48 / xl 64. We use 32 / 40 / 48 as `--row-h-*`. The header row matches the row size. Column headers are 14px semibold (we use the same).

**Material Design 3, interaction states**: https://m3.material.io/foundations/interaction/states/state-layers. The page did not render, so we relied on secondary summaries.

Taken: the idea of hover, pressed and selected as distinct layered states, which here maps onto Radix steps 3/4/5. We did **not** adopt M3 opacities, because they could not be verified from the primary source.

**Nielsen Norman Group, "Physical Development and Children's UX"**: https://www.nngroup.com/articles/children-ux-physical-development/ and the topic index https://www.nngroup.com/topic/young-users/

What we took:
- Touch targets of at least 2cm x 2cm for young children, four times the adult 1cm (`--target-hero`, `--target-tiny-hands`).
- Swipe, tap and simple drag are easy; precise drag and small mouse targets are hard under 9. Hence tap-tap moves, with drag optional.
- Offer more than one way to do an action.
- Age bands 3-5, 6-8 and 9-12.
- Large, colourful, informative buttons, and fewer navigation choices (kids get only the bottom bar).
- An unforgiving retry frustrates children. Hence free retries.

## Chess UI references

**lichess chessground**: https://github.com/lichess-org/chessground (GPL-3.0; the project already depends on `@lichess-org/chessground` 10.5.0)

- `assets/chessground.brown.css`: the board base `#f0d9b5`, and highlight values reused for walnut:
  - last-move `rgba(155,199,0,.41)`
  - selected `rgba(20,85,30,.5)`
  - move-dest dot `radial-gradient(rgba(20,85,30,.5) 22%, …)`
  - occupied-dest ring
  - premove `rgba(20,30,85,.5)`
  - the red radial check gradient
- `assets/chessground.base.css` (also read from the installed package): piece and square sizing at 12.5%, dragging z-index 11, and the coords structure (`coords.ranks|files`, `.black` flips the flex direction). This drives the coordinate-colour parity rules in `components.css`.
- `src/state.ts`: brush colours green `#15781B`, red `#882020`, blue `#003088`, yellow `#e68f00`.

**lichess lila**: https://github.com/lichess-org/lila

- `public/images/board/{brown,blue,green}.png` were sampled pixel by pixel: brown `#f0d9b5`/`#b58863`, blue `#dee3e6`/`#8ca2ad`, green `#ffffdd`/`#86a666`. These are the walnut, glacier and tournament themes.
- `ui/lib/css/theme/board/_boards.scss`: per-board coordinate colours (brown `#946f51`, blue `#788a94`, green `#6d8753`).
- `ui/lib/css/game/_clock.scss`:
  - the running clock is tinted toward the accent
  - emergency time is tinted 25% toward "bad", and 50% when running
  - tenths at 70% size
  - a 4px remaining-time bar
  - no flashing animation for low time

  This shaped `.clock`.
- `COPYING.md`: board images are AGPLv3+ (we reuse only colour values; the project is AGPL-3.0-or-later). The cburnett piece set is GPLv2+ by Colin M.L. Burnett.
- The lichess Win% formula `50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)`, from https://lichess.org/page/accuracy, maps centipawns to the eval-bar fill.

**chess.com**: https://www.chess.com/article/view/what-your-chess-board-theme-says-about-you and https://support.chess.com/article/704-how-do-i-change-my-background-board-and-pieces

What we took:
- A user-selectable board theme that is independent of the UI theme.
- The move-quality taxonomy (brilliant, great, best, book, inaccuracy, mistake, blunder) with hue families teal, blue, green, yellow, orange and red. We did not copy chess.com's hex values; we mapped each family to a Radix step-11 colour so that every one reaches 4.5:1.
- The mobile pattern of clocks in player strips plus a horizontal move scroller under the board.

## Icons

**Lucide / lucide-react**: https://lucide.dev/guide/packages/lucide-react (ISC licence; already in `apps/web`)

Taken: individual tree-shakeable React icon components with `size`, `color` and `strokeWidth` props. The defaults are 24 and 2. We standardise on 20/1.75 for adults and 28/2.25 for kids.
