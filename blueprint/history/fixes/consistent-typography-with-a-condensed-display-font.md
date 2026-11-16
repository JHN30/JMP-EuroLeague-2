# Fix: Consistent typography with a condensed display font

**Type:** Fix
**Status:** verified
**Branch:** fix/consistent-typography-with-a-condensed-display-font

## The problem

A design audit on 2026-11-16 found the colours, radii, buttons and spacing mostly consistent, but the type is not:

- **No font is loaded.** `index.css` names Inter first, but nothing loads it, so the site renders in Segoe UI on
  Windows, SF on Apple and Roboto on Android. Weights and widths differ by device.
- **Section headings use about 8 recipes**: `text-lg font-bold` (12), `text-lg font-semibold` (3), `text-xl font-bold`
  (3), `text-xl font-semibold`, `text-base font-semibold`, bare `font-semibold`/`font-bold` (6), and
  `mb-1 text-lg font-bold lg:mb-0 lg:text-base` (2). The shared `.panel-title` (via `PanelHeader`) has only 4 direct uses.
- **Page titles disagree.** `PageHeader`'s `h1` is `text-2xl font-semibold`, and another page-title `h2` is
  `text-2xl font-black sm:text-3xl`.
- **Big stat numbers use about 20 recipes** (25 sites): sizes from `text-2xl` to `text-6xl`, weights `font-bold`,
  `font-extrabold` or `font-black`, and leading `none`, `tight` or unset.
- **Uppercase labels have three styles.** `.eyebrow` (900, 0.18em), `.micro-label` (900, 0.1em) and about 30
  hand-written `text-xs font-bold uppercase tracking-wide` labels (700, 0.025em).
- **`--weight-display` is unused in JSX**, which has `font-black` 38 times and `font-extrabold` 4 times instead, across 24 files.

## The fix

Load real fonts, then give each type role one class, and move every call site onto it.

**Fonts (self-hosted, no third-party request):**

- **Body:** Inter variable from `@fontsource-variable/inter`.
- **Display:** Barlow Condensed (`@fontsource/barlow-condensed`, weight 700 only; no role uses 600) for page titles, section titles,
  big stat numbers and scores. This gives the broadcast-scoreboard feel.
- **Subsets:** import the all-subset CSS (not latin only), so Latin Extended names (č, ć, š, ş, ğ, ė) get the font.
  `unicode-range` keeps downloads to the subsets a page uses.
- **Theme variable:** expose the display face as `--font-display` in an `@theme` block, so `font-display` is a utility.
- **Figures:** check that Barlow Condensed's figures line up with `tabular-nums`. If they don't, keep numbers in table
  cells on Inter and use the display face only for standalone big numbers.

**Type roles (classes in `index.css`, inside `@layer components`, so Tailwind utilities at a call site still win):**

| Class | Role | Starting recipe (tune with screenshots) |
|---|---|---|
| `.page-title` | the one `h1` per page (and the page-title `h2`) | display, 700, `1.75rem` -> `2.25rem` from sm, leading 1.05 |
| `.panel-title` (existing, restyled) | section and panel headings | display, 700, `1.25rem`, uppercase, `0.02em` |
| `.subhead` | smaller headings inside a panel | Inter, 600, `0.875rem` |
| `.micro-label` / `.eyebrow` | uppercase labels; eyebrow = primary colour | one shared body: Inter, 700, `0.75rem`, `0.06em`; micro-label stays at 60% |
| `.stat-value` | standalone big numbers | display, 700, leading-none, tabular-nums; size from utilities, limited to three steps: `text-3xl`, `text-3xl sm:text-4xl`, `text-3xl sm:text-5xl` (a phone keeps `text-3xl`) |

Also:

- Set `--weight-display` to the display weight (700).
- Give the CSS number classes the display face: `.kpi-chip .value`, `.game-team .score`, `.score-pill`,
  `.fixture-time`.
- Small labels and inline numbers stay on Inter: `.rank`, `.form-pill`, `.status-chip` and `.fixture-scorer-points`
  (a small number next to a name, where the condensed face looked out of place).
- The page background's diagonal grid lines drop from 7% to about 4%, so the texture is quieter. The orange and teal
  glows stay.

**Must not break:**

- No horizontal scroll at 320px. Pinned table columns and sticky headers keep their measured heights (the Race table
  head is a fixed 57px, `TABLE_HEAD`). Long club and player names still wrap.
- Contrast in both themes, and the `.skip-link` and focus rings.
- Layout shift: fonts load with `font-display: swap`. Check that Home on a phone does not get worse layout shift (an
  open performance follow-up). If it does, add a metric-matched fallback `@font-face` for Inter.
- Out of scope, as later fixes:
  - the chart theme
  - shared `Crest`, `ResultBadge` and segmented-control components
  - reclassifying grey-text opacity (`text-base-content/60` and `/70` are intentional tiers, see the `index.css` comment)
  - small cleanups (`max-md:`, `640px`, `.kpi-strip-quad`, `ShootingCourt` colours)

## Build steps

1. [x] **Fonts and the type classes.**
   - Install both Fontsource packages and import them in `main.jsx`.
   - Add `--font-display` and the five classes; restyle `.panel-title`; merge the `.eyebrow` and `.micro-label` bodies.
   - Give the CSS number classes the display face, and quiet the grid background.
   - `PageHeader`'s `h1` uses `.page-title`.
   - **Done when:** the frontend builds; the network panel shows the woff2 files from the same origin; Home and one
     player page look right in both themes at 375px and 1280px.
2. [x] **Headings.** Every hand-styled `h1`–`h4` moves to `.page-title`, `.panel-title` or `.subhead`; spacing utilities
   (`mb-*`) and layout utilities stay.
   - **Done when:** no heading in `src/**/*.jsx` carries `text-(base|lg|xl|2xl|3xl)` with `font-(semibold|bold|black)`,
     except one-offs justified in a comment.
3. [x] **Big numbers and labels.**
   - The 25 big-number sites move to `.stat-value` plus one of the three size steps.
   - The hand-written uppercase labels move to `.micro-label` (or `.eyebrow` where primary-coloured).
   - The remaining `font-black` and `font-extrabold` in JSX move to a role class or `font-display`.
   - **Done when:** `font-black`/`font-extrabold` and `text-xs font-bold uppercase tracking-wide` appear nowhere in
     `src/**/*.jsx`, except justified one-offs.

4. [x] **Loosen the layouts that were tuned on Segoe UI.** Added 2026-11-16 after the full suite: Inter is wider
   than Segoe UI (the font every layout was measured with on Windows), and 14 layout tests failed with Inter and pass
   without it. The user chose to keep Inter and fix the layouts; SF on Apple devices is about as wide as Inter, so these
   spots are likely tight there today. The failing tests:
   - the header's ten tabs at 640px
   - fixture cards at 320px
   - a compare suggestion button
   - the Team comparison "Second-chance" label
   - the Game flow chart at 320/390px
   - the shooting zones table
   - Overview defining games at 320px
   - the player Games tab's pinned column
   - player statistics rows at 640px
   - the postseason 2026 bracket at 320px
   - Records Top 50 row height
   - the team Games strip at 320px
   - the team Statistics heading at 640px

   Fix the layout (gaps, padding, column widths, wrapping), never the test's assertion.
   - **Done when:** those tests pass with Inter loaded, and nothing in the design shrinks below `text-xs`.

Steps 2 and 3 are mechanical rewrites from the mapping above. They may go to a smaller model with this table and an
explicit file list, and the result is reviewed before the next step.

## Verify

- `cd frontend && npm run lint` and `npm run build` pass.
- Full browser suite: `cd frontend && npm run test:browser`. Run it only after `/api/health` reports `"target":"local"`.
  This change reaches every page.
- Screenshots of Home, Overview, Standings, Games, a game page, Teams, a team page, Players, a player page, Leaders,
  Statistics, Records, Postseason and Compare:
  - at 375px, 768px and 1280px
  - in both themes
  - checking that headings, numbers and labels read as one system, nothing overflows, and long names wrap


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7805,"specSha256":"2ddd4f460eab59635fe672457fd3f944750e6896a9ab35de0d7e59d08141ee55","branch":"refs/heads/fix/consistent-typography-with-a-condensed-display-font","head":"1b3d23f57569ad718df7f1d9377852bd0e33517d","baseRef":"refs/heads/master","baseCommit":"1b3d23f57569ad718df7f1d9377852bd0e33517d","sourceTree":"03b939bd6afe5a0476264d696020c34d6acc9791","absentOptional":[]} -->
