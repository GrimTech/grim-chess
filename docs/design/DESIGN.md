# Grim Chess design system: "Scoresheet"

Status: v1 spec. Files in this folder:

| File | What it is |
| --- | --- |
| `DESIGN.md` | This spec: direction, principles, tokens, components, screen layouts, accessibility, icons, do/don't |
| `tokens.css` | Every token as a CSS custom property, light/dark themes, kids track, board themes, base element styles |
| `components.css` | Framework-free component classes built only from tokens |
| `SOURCES.md` | What was read, with URLs, and what was adopted from each |

Import order in `apps/web`:

```ts
import "@lichess-org/chessground/assets/chessground.base.css";
import "@lichess-org/chessground/assets/chessground.cburnett.css"; // piece set
// Do NOT import chessground.brown.css: board colours come from our tokens.
import "../../docs/design/tokens.css";   // or copy into src/styles/
import "../../docs/design/components.css";
```

Switches live on `<html>`:

```html
<html data-theme="dark" data-track="kids" data-board="meadow">
```

- `data-theme`: `light` or `dark`. Leave it off to follow the OS.
- `data-track`: `kids` or `adult` (adult is the default). It is set at onboarding from the learner's age.
- `data-board`: `walnut`, `glacier`, `tournament`, `graphite` or `meadow`. It can also go on a single `.board-wrap`.

---

## 1. Direction

Chess has a material culture of its own. Players write moves in ink on a paper scoresheet, sit beside a brass-and-wood clock, and play on a walnut, vinyl or felt board. Grim Chess builds its look from those materials rather than from generic SaaS styling.

| Material | Role | Scale (Radix Colors) |
| --- | --- | --- |
| Paper and graphite | Every neutral surface, border and text colour | **Sand** (a warm grey) |
| Ink | Interaction: links, primary buttons, focus, the current move, selection | **Indigo** |
| Brass | Time and reward: running clocks, streaks, XP, and the kids' primary action | **Amber** |
| Board woods | The board itself, which is the most saturated thing on screen | lichess brown/blue/green plus two Grim originals |

The adult track is calm and dense and reads like a well-printed chess book. Headings are set in a sharp old-style serif and data in a hyperlegible sans, and colour appears only where it means something. The kids track keeps the same skeleton under a sky backdrop: sunny brass buttons you can press, softer and rounder type, and targets twice the size.

What this direction avoids, because the frontend-design skill lists these as tells of generic AI design: purple gradients, a cream background with a terracotta accent, near-black with acid green, identical rounded cards that all share one shadow, gradient washes, tracked-out all-caps eyebrow labels, "A · B · C" meta strings, and arrows appended to button labels.

## 2. Principles (and where they come from)

1. **The board is the hero; the chrome recedes.** The frontend-design skill says to open with the most characteristic element of the subject's world. On every board screen the board is the largest object and the only strongly coloured one. UI around it stays Sand. Refactoring UI calls this emphasizing by de-emphasizing.
2. **Structure carries information.** Again from the frontend-design skill: rules, numbering and outlines must encode something. Numbers mark only real sequences: move numbers, lesson steps, training-plan days. Separators mark real groupings, such as move pairs or table rows.
3. **One hue per job.** Ink means "you can act here", brass means "time or reward", and the move-quality hues (cyan, blue, green, yellow, orange, tomato) are reserved for annotations. A brilliant-move colour never appears on a button. Steps are used by their Radix meaning: 1-2 backgrounds, 3-5 component states, 6-8 borders, 9-10 solids, 11-12 text. For example, use step 11 for low-contrast text, never step 9.
4. **Dense but calm.** Adult screens are data-rich: rating charts, game tables, engine lines. Density comes from Carbon-style row heights (32/40/48 px), tabular figures and alignment, not from shrinking the type. UI text never goes below 14 px. 12 px is for captions only.
5. **Greys with temperature.** Refactoring UI says greys don't have to be neutral. Sand is a warm grey, so the paper look comes from the neutral itself rather than from a tinted wash.
6. **Motion explains change, and there is one celebration.** From the frontend-design skill: motion the user triggers (a piece moving, a modal opening, a toast arriving) is welcome. Ambient motion is not. The single orchestrated moment is `.reward-pop`, used when a puzzle is solved, a lesson is completed or a level goes up. Everything honours `prefers-reduced-motion`.
7. **Accessible by construction (WCAG 2.2 AA).** Every text/background pair in the tokens was checked: body text at 4.5:1 or better, control boundaries and focus at 3:1 or better, and targets of at least 24 px everywhere and 44 px for primary controls. Focus follows the GOV.UK approach of high contrast that works on any background.
8. **Kids: bigger, fewer, forgiving.** From NN/g's research on children. Targets are far larger. Gestures are simple: tap the piece, then tap the square, and dragging is optional. There are fewer navigation choices, and the buttons are large, colourful and informative. Mistakes cost nothing: you retry the same position, and nothing vanishes.

## 3. Typography

All three faces are on Google Fonts. One `@import` at the top of `tokens.css` loads them.

| Role | Family | Why |
| --- | --- | --- |
| Display (h1-h3, big stat values, modal titles) | **Fraunces** (variable: `opsz` 9-144, `wght`, `SOFT` 0-100, `WONK` 0-1) | An old-style soft serif after Windsor and Cooper. It carries the chess-book character. Its `SOFT` axis turns the same family into the kids' face, so the brand stays one voice: adult `SOFT 0 / WONK 0 / 600`, kids `SOFT 100 / WONK 1 / 700`. |
| UI and reading text | **Atkinson Hyperlegible Next** (200-800, with italics) | From the Braille Institute, built so that similar glyphs (1/l/I, 0/O, rn/m) can't be confused. That matters for notation such as `Nf1`, `O-O`, `1-0` and for early readers. It ships `tnum` (checked in the served font file). |
| Notation, clocks, engine lines, FEN/PGN | **Atkinson Hyperlegible Mono** (200-800) | From the same family, so it sits comfortably next to the sans. Mono gives move columns and clock digits a fixed width, and `slashed-zero` is enabled on clocks. |

Per the skill, mono is **not** used for small data labels, badges or table headers. It appears only where the content is chess notation or a ticking clock.

### Scale

The scale is Bringhurst's classic one (*The Elements of Typographic Style*): 12, 14, 16, 18, 21, 24, 36, 48, 60, 72. It is expressed in rem so that user font settings scale it.

| Token | px (adult) | px (kids) | Use |
| --- | --- | --- | --- |
| `--font-size-0` | 12 | 12 | Captions, chart axes, badges |
| `--font-size-1` | 14 | 16 | Dense UI, table cells, labels, hints |
| `--font-size-2` | 16 | 18 | UI default, buttons |
| `--font-size-3` | 18 | 21 | Reading body (lessons, knowledge base), large buttons |
| `--font-size-4` | 21 | 24 | h4, topbar title |
| `--font-size-5` | 24 | 30 | h3, clock digits, modal title |
| `--font-size-6` | 36 | 40 | h2, stat-tile values |
| `--font-size-7` | 48 | 48 | h1 (fluid 36 to 48 px) |
| `--font-size-8/9` | 60 / 72 | 60 / 72 | Onboarding, results, rating reveal |

Rules:

- Line height is 1.1 for display, 1.25 for headings, 1.4 for UI and 1.6 for reading (1.55 on the kids track).
- Reading measure is `--measure: 68ch`. The skill's ceiling is under 80 characters.
- h1-h3 use Fraunces; h4-h6 use the sans. This keeps dense panels from turning bookish.
- Use sentence case everywhere. Never all-caps labels and never letter-spaced eyebrows.
- Inline moves in prose use `<span class="san">12...Nxe4</span>`, which sets them in mono and keeps them on one line.

## 4. Color

Source: Radix Colors v3. All values were copied verbatim from `radix-ui/colors` `src/light.ts` and `src/dark.ts`. The scales are Sand, Indigo, Amber, Tomato, Green, Cyan, Blue, Orange, Yellow, Bronze and Sky. Dark mode swaps in each scale's dark twin, so the role mapping stays the same.

### Role tokens (components use these, not primitives)

| Role | Light | Dark | Contrast check |
| --- | --- | --- | --- |
| `--color-bg` (page) | sand-2 `#f9f9f8` | sand-1 `#111110` | |
| `--color-surface` (cards, the move "sheet") | `#ffffff` | sand-2 `#191918` | |
| `--color-surface-2` (nested, table header) | sand-1 | sand-3 | |
| `--color-surface-sunken` (wells, clock idle) | sand-3 | `#0c0c0b` | |
| `--color-border` (non-interactive) | sand-6 | sand-6 | decorative |
| `--color-border-control` (inputs, switches) | sand-9 `#8d8d86` | sand-9 `#6f6d66` | 3.28:1 / 3.40:1, meets WCAG 1.4.11 |
| `--color-text` | sand-12 `#21201c` | sand-12 `#eeeeec` | 16.0:1 / 16.3:1 |
| `--color-text-muted` | sand-11 `#63635e` | sand-11 `#b5b3ad` | 6.0:1 on white / 8.4:1 |
| `--color-accent` (solid ink) | indigo-9 `#3e63dd` | indigo-9 | white text 5.21:1 |
| `--color-accent-hover` | indigo-10 `#3358d4` | indigo-10 `#5472e4` | white text 6.02:1 |
| `--color-accent-text` (links, current) | indigo-11 `#3a5bc7` | indigo-11 `#9eb1ff` | 5.89:1 / 8.53:1 |
| `--color-brass` | amber-9 `#ffc53d` | amber-9 | `--color-on-brass #21201c` 10.3:1 |
| `--color-danger` (text) | tomato-11 `#d13415` | tomato-11 `#ff977d` | 4.98:1 / 8.36:1 |
| `--color-danger-solid` | `#d13415` in both themes | | white 4.98:1 (tomato-9 with white is only 3.87:1, so it is not used for solid buttons) |
| `--color-success` | green-11 `#218358` | green-11 `#3dd68c` | 4.72:1 / 9.38:1 |
| `--color-warning` | amber-11 `#ab6400` | amber-11 `#ffca16` | 4.53:1 / 11.5:1 |
| `--focus-color` | indigo-9 | indigo-11 | 5.12:1 / 8.53:1 against the page |

### Move-quality annotations

The conventions follow the major chess sites. Colour is **always paired with the glyph**, never used alone.

| Quality | Glyph | Text token (step 11) | Fill token (step 9) | Light text on white |
| --- | --- | --- | --- | --- |
| Brilliant | `!!` | `--q-brilliant` cyan-11 `#107d98` | cyan-9 `#00a2c7` | 4.76:1 |
| Great | `!` | `--q-great` blue-11 `#0d74ce` | blue-9 `#0090ff` | 4.77:1 |
| Best | star icon | `--q-best` green-11 `#218358` | green-9 `#30a46c` | 4.72:1 |
| Book | book icon | `--q-book` bronze-11 `#7d5e54` | bronze-9 `#a18072` | 5.83:1 |
| Inaccuracy | `?!` | `--q-inaccuracy` yellow-11 `#9e6c00` | yellow-9 `#ffe629` (dark glyph) | 4.57:1 |
| Mistake | `?` | `--q-mistake` orange-11 `#cc4e00` | orange-9 `#f76b15` | 4.51:1 |
| Blunder | `??` | `--q-blunder` tomato-11 `#d13415` | tomato-9 `#e54d2e` | 4.98:1 |

In dark mode every step-11 value is above 8:1 on sand-2. The orange and yellow text values only just pass on white, so put annotation text on `--color-surface` (white). Never put it on sand-3 or a darker surface.

### Eval bar and engine scores

These use literal piece colours that stay the same in both themes: `--eval-white #eeeeec` and `--eval-black #2a2a28`. The bar is a physical metaphor, so it should not invert with the theme.

### Charts

For rating history and similar charts, use `--chart-1` (ink) for the learner's own series and `--chart-2` (brass) for a target or comparison series, then cyan, tomato and green. The grid is sand-5 and the axis text sand-11. Rating lines are 2 px. Don't fill the area under a line with a gradient.

## 5. Space, radius, elevation, motion

- **Spacing** uses the Open Props `--size-*` values verbatim: 4, 8, 16, 20, 24, 28, 32, 48, 64, 80, 120 and 160 px. Two half-steps were added for dense UI: `--size-1h` (6 px) and `--size-2h` (12 px). Start generous and tighten (Refactoring UI). Card padding is 24 px, dense panel padding 12-16 px, and the phone gutter is always 16 px.
- **Radius**, adult track: 3, 6, 10, 16 px, with the board at 4 px. Paper is nearly square. Kids track: 8, 14, 22, 28 px, with the board at 14 px.
- **Shadows** use the Open Props `--shadow-1` to `--shadow-5` recipes verbatim, with `--shadow-color` warmed to match Sand. Shadow strength rises to 25% in dark mode, as Open Props does. Elevation follows the stacking: cards are flat with a border; menus and toasts get shadow-3/4; modals get shadow-5. Kids get `--shadow-press`, a solid 4 px "key edge" that collapses when pressed.
- **Easing** uses Open Props values verbatim: `--ease-3` for state changes, `--ease-out-3/4` for things arriving, and `--ease-elastic-out-2` only for the reward pop.
- **Durations**: 80 ms (colour), 140 ms (piece moves, the chessground default feel), 200 ms (menus, tabs, toasts), 320 ms (modal or sheet) and 600 ms for the reward (900 ms for kids). Under reduced motion all of them become 0.
- **Layers**: base, board pieces (2), dragging piece (11, matching chessground), sticky, nav, dropdown, overlay, modal, toast, tooltip.

## 6. Board themes

Square colours for the three lichess themes were sampled from lila's board PNGs. Highlight values for walnut are taken from chessground's brown theme CSS. Using a colour pair is not using lila's images, which are AGPL. The project is AGPL-3.0-or-later anyway, and chessground (GPL-3.0) is compatible.

| `data-board` | Light | Dark | Last move | Selected / legal dot | Notes |
| --- | --- | --- | --- | --- | --- |
| `walnut` (default) | `#f0d9b5` | `#b58863` | `rgb(155 199 0 / .41)` | `rgb(20 85 30 / .5)` | lichess brown, the most familiar board online |
| `glacier` | `#dee3e6` | `#8ca2ad` | brass `rgb(255 197 61 / .5)` | ink `rgb(62 99 221 / .45)` / `rgb(31 45 92 / .45)` | lichess blue with Grim highlights (green on blue doesn't read) |
| `tournament` | `#ffffdd` | `#86a666` | brass `rgb(255 197 61 / .55)` | `rgb(20 85 30 / .45)` / `rgb(20 60 20 / .42)` | lichess green, the club vinyl roll-up board |
| `graphite` | sand-5 `#e2e1de` | sand-9 `#8d8d86` | ink `rgb(62 99 221 / .38)` | ink `.55` / `rgb(33 32 28 / .4)` | Grim original for long analysis sessions and dark mode |
| `meadow` (kids default) | amber-3 `#fff7c2` | green-8 `#5bb98b` | sky-9 `rgb(124 226 254 / .6)` | amber-9 `.7` / `rgb(25 59 45 / .45)` | Grim original. Legal-move dots are larger (30% against 22%) |

The check highlight on all adult boards is chessground's red radial gradient. Meadow uses a softer tomato glow. Arrow brushes keep the chessground defaults (green `#15781b`, red `#882020`, blue `#003088`, yellow `#e68f00`), and the engine best-move arrow is drawn in ink at 75%. Coordinates use the opposite square's colour, set in bold sans at 9-14 px and scaled with the board through container units. Files are lowercase.

Pieces are independent of the board. The default is cburnett (Colin M.L. Burnett, GPLv2+), which ships with chessground. Kids may get a chunkier set later; any set must stay recognisable at 32 px per square.

## 7. Components

Every class is in `components.css`. State lives in real attributes wherever one exists (`aria-current`, `aria-selected`, `aria-pressed`, `aria-invalid`, `aria-busy`, `data-state`, `data-q`), so the styling can't drift away from the accessibility tree.

### Buttons: `.btn`
- Variants: `.btn` (secondary, the default), `.btn-primary` (ink), `.btn-brass` (time and reward actions such as "Start daily plan" or "Claim"), `.btn-soft`, `.btn-ghost`, `.btn-danger`, `.btn-danger-soft`. Sizes: `.btn-sm` (32 px), the default (44 px), `.btn-lg` (56 px). Shapes: `.btn-icon` (square, which needs an `aria-label`) and `.btn-block`.
- Allow **one primary per view region.** "Resign" is `.btn-danger-soft` and asks for confirmation in a modal. "Offer draw" and "Takeback" are plain `.btn`.
- Labels are verbs, with no trailing arrows: "Start lesson", not "Start lesson →". An icon can lead the label at 20 px.
- Kids get bold type, a chunky key edge (`--shadow-press`) and a 4 px press-down.

### Cards and stat tiles: `.card`, `.tile`
- A card is a white sheet with a 1 px sand-6 border and **no shadow**. Only `.card-interactive` (the whole card is a link) gets a hover border and shadow-2. Don't animate every card.
- Vary card sizes on the dashboard instead of using a grid of identical boxes. This avoids the "SaaS card kit" look the skill warns about.
- `.tile` holds a label (14 px, muted, sentence case), a value in Fraunces at 36 px, an optional unit, a delta (`.is-up` in green, `.is-down` in tomato, always with an arrow icon and a sign so colour isn't the only cue), and an optional 96x28 sparkline. Use at most four tiles in a row.

### Tabs and segmented: `.tabs > .tab[role=tab][aria-selected]`, `.segmented`
- Use underline tabs for switching panels (Moves / Engine / Notes), and roving tabindex with arrow keys per the ARIA APG.
- Use segmented controls for value choices: time control, chart range, board orientation.
- Kids tabs are brass pills.

### Inputs: `.field > .label + .input/.select-wrap>.select/.textarea + .hint/.error`
- The label is always visible and sits above the field. Never use placeholder-as-label (the GOV.UK pattern). Errors appear under the field with an icon and `aria-describedby`, the border goes to 2 px tomato, and `aria-invalid="true"` is set.
- Use `.input-mono` for FEN, PGN and move entry.

### Badges: `.badge`
- Variants are accent, success, warning, danger, info, brass and outline, plus pill and large sizes. Use them for rating category, time control, "Rated", "New" and title tags such as "GM" (outline). Badges are 22 px tall and use 12 px semibold sentence case. `.glyph[data-q]` is for annotations in text, and `.board-glyph[data-q]` is the corner marker on the destination square.

### Progress: `.progress`, `.ring`
- The linear bar takes `style="--value:40"`, `role="progressbar"` and `aria-valuenow`. Use it for lesson and course progress.
- The ring is drawn with `conic-gradient` and a mask, and animates through the registered `@property --ring-value`. Use it for the daily goal, puzzle accuracy and plan completion. Put the number inside it, and give the ring `role="img"` and an `aria-label`.

### Data tables: `.table-wrap > .table`
- Row heights are 32/40/48 px (Carbon sm/md/lg): `.table-compact`, the default, `.table-relaxed`. The header is sticky, 14 px semibold muted, sentence case.
- Numbers are right-aligned (`.num`) and tabular. Results use `.result-win/-loss/-draw`, which must also show the text ("1-0" or "Won"), not colour alone. Openings and move sequences use `.cell-mono`.
- Sortable headers use `aria-sort`. Selected rows use `aria-selected`. Striping is off by default and `.table-striped` is available for very wide tables.

### Toasts: `.toast-region > .toast.toast-{success|warning|danger|info}`
- Toasts sit bottom-right on desktop and bottom-centre above the tab bar on phones. The region uses `role="status"` (polite). Toasts auto-dismiss after 5 s unless they contain an action, and pause on hover or focus. Use them to confirm what happened ("Game saved to Library"), never for errors that block progress; those go inline.

### Modals: `<dialog class="modal">`
- Use native `<dialog>` with `showModal()`, which gives a focus trap, Esc and `::backdrop`. Below 600 px the dialog becomes a bottom sheet with full-width stacked buttons, primary on top.
- The title is in Fraunces. The footer goes right to left: primary, then secondary.
- Use modals for confirmations (resign, abort, leave a rated game) and short forms. Never for content that people read.

### Navigation: `.app-shell`, `.sidebar .nav`, `.tabbar`, `.topbar`
- Desktop (900 px and up) uses a 248 px sidebar that collapses to 72 px with `data-sidebar="collapsed"`. Phones use a 64 px bottom tab bar with at most five items: Home, Train, Play, Learn, Profile. The current item uses `aria-current="page"`, with ink on ink-3 and a 3 px ink rule.
- Kids never get a sidebar. They always use the bottom bar, which is 80 px tall with brass pills for the current item.

### Chess components
- **`.board-wrap`** sets the square, the frame and `touch-action: none`, and maps chessground's square states (`last-move`, `selected`, `move-dest`, `oc.move-dest`, `premove-dest`, `current-premove`, `check`) plus Grim's trainer states (`hint`, `correct`, `wrong`) to board tokens. Put `data-state="correct|wrong"` on the wrapper for the puzzle feedback ring. `.board-static` is a pure-CSS board for thumbnails.
- **`.player-strip`** shows the avatar, name, rating, captured material and clock, above and below the board. The opponent goes on top.
- **`.clock`** uses mono 24 px tabular digits with a slashed zero. States: idle is sunken and muted. `.is-running` is surface with a 2 px ink inner edge plus a remaining-time bar. `.is-low` (under 20 s, or under 10% of the base time) is tomato-3 with tomato text. `.is-low.is-running` is solid tomato with white text. `.is-flagged` is solid tomato. Tenths appear at 70% size under 10 s. Use `role="timer"` with `aria-live="off"`, and announce only the thresholds (1 min, 10 s) through a separate polite live region.
- **`.movelist`** is the scoresheet: a 4ch move-number column on surface-2, then White and Black plies. The current ply is ink-3 with a 3 px ink rule and `aria-current="true"`. Comments and variations span the full row in sans and muted text. On phones it becomes `.movelist-inline`, a horizontal snap scroller under the board, as on chess.com mobile. `.move-nav` holds first, previous, next, last and the menu, and the arrow keys move between plies.
- **`.evalbar`** takes `--eval-pct`, White's share from 0 to 100, computed from centipawns with the lichess win% curve `50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)`. It is 14 px wide beside the board and turns horizontal under the board on phones. `data-orientation="black"` flips it. `.evalbar-lg` widens it to 30 px and shows the score label, and `data-side` puts that label on the side that is winning. On the default 14 px bar, show the score in the engine header instead. Mate shows as `M3` or `-M3`. Use `role="meter"` with an `aria-label` that states the evaluation.
- **`.engine` / `.engine-line`** shows the depth and eval header, then one row per PV with a score chip (a white or black chip, so the side is never shown by colour alone) and the principal variation in mono, cut off with an ellipsis.
- **`.prompt`** is the puzzle and lesson instruction ("White to move. Win material."), with a turn disc. `data-state="correct|wrong"` tints it success or danger, and the title text changes too.
- **`.steps`** is the numbered lesson outline: `aria-current="step"` is ink, and `data-state="done"` gets a check.
- **Kids**: `.kid-map` and `.kid-node` (88 px nodes on a zig-zag path: available or current in brass with a halo, done in green, locked sunken), `.stars`, `.chip-stat` (streak and XP), `.choice-grid > .choice` (big answer buttons with correct and wrong states).

## 8. Screen layouts

The breakpoints are phone (under 600 px), tablet (600-899 px), desktop (900 px and up) and wide (1200 px and up). Every layout works at 360 px with a 16 px gutter and no horizontal page scroll.

### Dashboard (adult): `.layout-dashboard` (12-column grid)
```
+------------------------------------------------------------------+
| Good evening, Ana                         [Start today's plan]   |  h1 Fraunces + brass CTA
+----------------+----------------+----------------+---------------+
| Rapid 1874 +23 | Puzzles 2140   | Streak 12 days | Plan 3/5 (ring)|  .tile x4 (span-3)
+----------------+----------------+----------------+---------------+
| Rating history (span-8)                 | Today's plan (span-4)  |
| [ 1M 3M 1Y All ]  2px ink line, brass   | 1 Tactics: pins  20m   |  .steps (real sequence)
| target line                             | 2 Endgame: K+P   15m   |
|                                         | 3 Play 1 rapid game    |
+-----------------------------------------+------------------------+
| Recent games (span-8, .table)           | Weaknesses (span-4)    |
| Opp | Result | Opening | Acc | Date     | bars by theme          |
+-----------------------------------------+------------------------+
```
On phones everything stacks: tiles go 2x2, then the plan, then the chart, then games. The plan comes before the chart because it is the next action.

### Play (vs computer or online): `.layout-board`
```
desktop                                          phone
+--+------------------------------+-----------+  +----------------------+
|  | [av] Opponent 2010   ♟♟ 4:52 | Moves     |  | [av] Opp 2010   4:52 |
|E | +--------------------------+ | 1. e4  e5 |  | +------------------+ |
|v | |                          | | 2. Nf3 Nc6|  | |                  | |
|a | |          BOARD           | | 3. Bb5 a6 |  | |   BOARD 100vw    | |
|l | |                          | | ...       |  | |                  | |
|  | +--------------------------+ |-----------|  | +------------------+ |
|  | [av] You 1874          3:10  | |< < > >|  |  | [av] You 1874   3:10 |
|  |                              | Draw Resign| | 1.e4 e5 2.Nf3 ...  > | .movelist-inline
+--+------------------------------+-----------+  | [Draw] [Resign]      |
                                                 +----------------------+
```
- The board size is `min(viewport height minus chrome and two strips, viewport width minus sidebar, side panel and eval)`, computed in `.layout-board`. On phones the board runs edge to edge.
- The eval bar is hidden in rated online games (fair play). It shows against the computer only if the learner turns it on, and always shows in analysis.
- The side panel has the same height as the board column, and the move list scrolls inside it.
- Clocks live in the player strips, next to the board where the eyes already are.

### Puzzle trainer: `.layout-board` with no eval
- The side panel holds the `.prompt` ("Black to move. Find the best continuation."), then puzzle rating and attempts, a streak `.chip-stat`, then `[Hint]` (ghost, which highlights the piece with `square.hint`), `[Show solution]` and the theme tags as badges.
- A correct move gives a green `square.correct`, the prompt switching to correct, and auto-advance after 600 ms. A wrong move gives a tomato `square.wrong`, the move taken back after 400 ms, and "Try again". Nothing is punished on the first wrong move in learning mode.
- A solved puzzle triggers `.reward-pop` on the rating delta. This is the only celebration.

### Lesson player: `.layout-board`, with the side panel holding the lesson
```
+------------------------------+------------------------------+
| BOARD (interactive or         | Chapter 3 of 8: The pin      |  Fraunces h2
| scripted, with arrows)        | .steps outline (collapsible) |
|                               | .prose text 18px, 68ch max   |
|                               | "Play Bb5, pinning the       |
|                               |  knight." (.san inline)      |
|                               | .prompt (your turn)          |
+------------------------------+ [Back]          [Continue]   |  sticky footer
                                +------------------------------+
```
On phones the board sits on top, the text scrolls below it, and the action footer is sticky above the tab bar.

### Analysis: `.layout-board` with eval, plus `.layout-board__below`
- The side panel holds tabs (Moves | Engine | Explorer | Notes). The engine tab shows `.engine` with three PV lines and depth, plus a switch to turn the engine on or off. The move list carries annotation glyphs.
- Under the board sits an eval graph (an area chart, with White above the line in `--eval-white` and Black in `--eval-black`), clickable to jump to a ply. Accuracy tiles show both players.
- Keyboard: arrows move through plies, `f` flips the board and `space` plays the best move. List the shortcuts in a `?` modal.

### Knowledge base reader: `.layout-reader`
```
+--------------+---------------------------------+-------------+
| TOC (sticky) | h1 The Lucena position           | On this page|
| > Endgames   | .prose 18px/1.6, max 68ch        | - Setup     |
|   Rook       | figure > .board-wrap (360px)     | - Bridge    |
|   * Lucena   |   figcaption                     | - Practice  |
|   Philidor   | blockquote (Fraunces italic,     |             |
|              |   brass rule)                    |             |
|              | [Practice this position] btn     |             |
+--------------+---------------------------------+-------------+
```
The right rail goes away below 1200 px. Below 900 px the TOC becomes a disclosure at the top. Diagrams are always real boards that can be clicked into analysis, never screenshots.

### Kids home and map: `[data-track="kids"]`, `.kid-map`
```
+--------------------------------------+
| (fire) 5   (star) 340 XP     [avatar]|  .chip-stat in topbar
+--------------------------------------+
|  [ Unit 2: The Knight's Jumps ]      |  brass unit banner
|              (O) done                |
|        (O) done                      |  88px nodes, zig-zag
|              (*) current  <- halo    |
|                    (o) locked        |
|              (o) locked              |
+--------------------------------------+
| [Home]  [Map]  [Play]  [Me]          |  80px bottom bar
+--------------------------------------+
```
- A node opens a short activity: 3-5 tiny boards or `.choice-grid` questions. Moving pieces works by tap-tap, and dragging is optional.
- Use one sentence of instruction with a picture, and read-aloud for ages 6-8.
- Results show stars (0-3) with `.reward-pop`. Kids always get a retry, never a fail screen.

## 9. Accessibility rules

1. **Contrast (WCAG 2.2 AA).** Text needs 4.5:1 or better (3:1 for 24 px+ or 18.66 px+ bold). UI boundaries and focus indicators need 3:1 (1.4.11). Use only the role tokens. Their pairs are verified in section 4. Never put step-9 hues behind white small text, except ink (indigo-9 is 5.21:1).
2. **Target size.** 24x24 px is the absolute floor (2.5.8 AA). Grim's own standard is 44 px for primary controls (2.5.5 AAA level) and 32 px only in dense toolbars with spacing. Kids get 60 px or more for any control and 88 px for choices and map nodes; for ages 3-5 use `--target-tiny-hands` (120 px, about 2 cm on a phone, per NN/g).
3. **Focus.** `:focus-visible` draws a 2 px ring with a 2 px offset (ink in light, indigo-11 in dark), which meets the AAA 2.4.13 geometry. Never remove it. Sticky headers and toasts must not cover the focused element (2.4.11): use `scroll-margin-top: var(--topbar-h)`.
4. **Never colour alone.** Move quality has a glyph. Results have text. Deltas have a sign and an arrow. The clock in low time also shows tenths. The engine score chip shows whose side it favours by both fill and sign.
5. **Board accessibility.** Every board screen offers a keyboard move input (`.input-mono`, typing `Nf3`), arrow-key navigation through the move list, and an `aria-live="polite"` region that announces moves in words ("Knight f3, check"). Coordinates stay on by default for learners.
6. **Motion.** `prefers-reduced-motion` zeroes every duration and stops infinite animations (halo, skeleton). Chessground gets `animation.enabled = false`.
7. **Text scales.** All sizes are in rem, so a 200% browser zoom must still work, and nothing truncates the move text itself.
8. **Forms.** Labels are always visible, with errors inline and linked through `aria-describedby`. Never block paste.
9. **Kids.** Use simple words and short sentences, and back instructions with an icon or picture. Nothing time-pressured below 9 years old unless it is opt-in. No dark patterns around streaks: losing a streak never shames the learner. Keep adult and settings areas behind a parent gate.

## 10. Iconography

**lucide-react** is already a dependency of `apps/web`. It is ISC-licensed and its icons are tree-shakeable components.

- Sizes: 16 (in badges and small buttons), 20 (the default in buttons and nav), 24 (tab bar, tiles). Kids get 28 and 32.
- Stroke: pass `strokeWidth={1.75}` on the adult track (lucide defaults to 2, which looks heavy next to Atkinson at 14-16 px) and 2.25 on the kids track. Use the `--icon-stroke` token through a small `<Icon>` wrapper.
- Icons inherit `currentColor`. Never colour an icon unless the colour means something: status, or brass for streak and XP.
- Icon-only buttons must have an `aria-label`. A decorative icon gets `aria-hidden`, which lucide sets by default when the icon has no title.
- Suggested mapping: Home `House`, Train `Target`, Puzzles `Puzzle`, Lessons `GraduationCap`, Knowledge base `BookOpen`, Play `Swords`, Analysis `Microscope`, Openings `GitBranch`, Endgames `Crown`, Plan `CalendarCheck`, Stats `ChartLine`, Streak `Flame`, XP `Star`, Clock `Timer`, Flip board `ArrowUpDown`, Hint `Lightbulb`, Resign `Flag`, Draw `Handshake`, Takeback `Undo2`, Settings `Settings`.
- Chess pieces are **not** icons. Use the piece set's SVGs (cburnett) wherever a piece appears in UI, such as captured material or promotion.

## 11. Do and don't

**Do**
- Keep the board the only saturated object on board screens.
- Use ink for anything clickable and brass for time and reward. Use annotation hues only for annotations.
- Set notation and clocks in Atkinson Hyperlegible Mono, and everything else in Next or Fraunces.
- Right-align numbers, use tabular figures, and keep 14 px or more for anything people have to read.
- Write labels in sentence case and buttons as verbs ("Analyse game", "Start puzzle rush").
- Pair every colour signal with a shape, glyph or text.
- Use real boards for diagrams so they can open in analysis.
- On the kids track, make it big, make it tap-tap, make retries free, and celebrate once.

**Don't**
- Use gradient washes, purple gradients, glassmorphism on content, or decorative blobs.
- Add all-caps or letter-spaced eyebrow labels, "A · B · C" meta strings, or arrow glyphs on buttons (the frontend-design skill's list).
- Use monospace for UI labels or badges.
- Give every card a hover animation or scroll-in fade.
- Use tomato or green for anything that isn't danger, success or move quality.
- Change board colours to match the UI theme. The board theme is the user's choice, and dark mode does not recolour it.
- Show the eval bar in rated games.
- Rely on placeholder text as a label, or put small text in amber-9 or yellow-9.
- Shame a child: no red "FAILED" screens, no streak-loss guilt.
