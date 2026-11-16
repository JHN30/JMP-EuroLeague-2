# Fix: Theme surfaces and colours

**Type:** Fix
**Status:** verified
**Branch:** fix/theme-surfaces-and-colours

## The problem

Three colour problems in the two daisyUI themes in `frontend/src/index.css`, found in a design review on 2026-11-16.
A fourth, warmer or cooler dark-theme text, is deferred to a later test.

1. **Dark-theme panels are darker than the page.**
   - The page (`.app-shell`) and the header (`.app-nav`) use base-200, at 18% lightness. Panels (`.panel`, base-100)
     are 14%. So cards read as holes cut into the page instead of surfaces on it.
   - The light theme has the usual order: panels at 99% on a 96% page.
   - daisyUI's own dark themes make base-100 the lightest base.
   - Our dark theme also inverts what `bg-base-200` means inside a panel (29 uses, such as the team game rows and the
     standings tier rows). It is a lighter fill in dark but a darker fill in light.
2. **The light theme's second colour is slate.**
   - `--color-secondary` is the "other team" colour: the head-to-head team B, the Game flow away bars, the shooting
     tables' team shades, the shooting legend, the defence bars and the FT swatch.
   - It is cyan in dark (`oklch(72% 0.15 210)`) but dark slate in light (`oklch(28% 0.032 250)`). Teams change
     identity between themes, and slate reads as "disabled".
3. **The orange glow tints the light page pink.**
   - `.app-shell`'s top-left glow is the primary colour at 24% in both themes. On the light page that turns the
     header area salmon.

## The fix

All three are token changes in `index.css`. There is no runtime cost and no new effect: no blur, shadows or animation.

1. **Dark surfaces, daisyUI order.** Use base-100 for panels (lightest), base-200 for the page, header and inner
   insets (darker), and base-300 for borders, tracks and dividers (lighter than panels, so borders stay visible).
   - Starting values, with the same hue 250 and chroma as today:

     | Token | Today | New | Use |
     |---|---|---|---|
     | base-100 | 14% | about 17% | panels |
     | base-200 | 18% | about 12.5% | page, header, insets |
     | base-300 | 24% | about 24% | borders, tracks, dividers |

     Tune them with screenshots: borders must stay visible on panels, and insets must read as recessed.
     Built at base-100 20.5%, base-200 15.5% and base-300 27% (`#101820`, `#070d14`, `#1e2732`), the user's pick from
     four variants compared side by side. The first try (17 / 12.5 / 24) lifted the panels too little to see; 19 / 13.5
     made the page almost black; 22 / 17.5 turned slate grey.
   - **Games page cards.** `.fixture-card` painted base-200, the inside-a-panel fill, but the Games page cards sit on
     the page, so they looked sunk into it in dark (and matched the page grey in light). They now take the panel
     surface, base-100. Only the Games page uses them, and every other base-200 surface in `index.css` sits inside a
     panel.
   - `--color-neutral` (22%) stays above base-100.
   - The phone browser bar mirrors base-200, so update `browserColor` (dark) in `lib/useThemePreference.js`,
     `index.html`'s `theme-color` and `public/site.webmanifest` to the new measured hex.
2. **Light secondary.**
   - `--color-secondary` becomes a deeper cyan, starting at `oklch(52% 0.12 222)`. The same family as the dark
     theme's cyan, but dark enough for text and thin bars on white.
   - `--color-secondary-content` stays near-white.
   - **Must pass:** `text-secondary` on base-100 at least 4.5:1, and the content colour on `bg-secondary` at least
     4.5:1. Measure both.
3. **Glow strength per theme.**
   - Add `--glow-primary` and `--glow-accent` to each theme block (custom variables, like `--color-rank-leader`).
     Dark keeps 24% and 16%. Light is about 11% and 10%.
   - `.app-shell`'s gradients use them through `color-mix(… var(--glow-primary) …)`.

**Must not break:**

- contrast: muted text (66%) on panels, and `micro-label` (60%) on panels, in dark
- the sticky header and the pinned table columns: they paint base-100 or base-200 to cover scrolled content, so check
  that they still match their surroundings
- skeletons, which use base-300
- the light theme's base values, which do not change

## Build steps

1. [x] **Dark surfaces.**
   - Reorder the dark base tokens and update the browser bar colour.
   - **Done when:** before and after screenshots in dark (Home, Standings, a game page, a team page, a player page at
     1280px, and Home at 375px) show panels lifted off the page, visible borders, and insets that read as recessed.
2. [x] **Light secondary and glows.**
   - Set the light secondary, and add the glow variables.
   - **Done when:**
     - the light screenshots (head-to-head, Game flow, a team's Advanced defence bars, the Home header area) show a
       cyan second team and no pink wash
     - the two secondary contrast ratios are measured at 4.5:1 or more

## Verify

- `cd frontend && npm run lint` and `npm run build` pass.
- The browser specs for the pages that pin a surface colour or check the header: `responsive.spec.js`,
  `phone-menu.spec.js`, `standings-table-layout.spec.js`, `game-detail-layout.spec.js` and, for the cards,
  `games-layout.spec.js` (local DB).
- The before and after screenshot pairs go to the user for the decision on item 1.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5402,"specSha256":"6ae90747d78c929a453a26eae2e7b4ee6862ee5683f2024ceea2cbd92c3b6efb","branch":"refs/heads/fix/theme-surfaces-and-colours","head":"7b1b2073c32afd60fccb84bcab9f531393e92de2","baseRef":"refs/heads/master","baseCommit":"7b1b2073c32afd60fccb84bcab9f531393e92de2","sourceTree":"48e409907949fdd74e3ac27bcd875349f92fce41","absentOptional":[]} -->
