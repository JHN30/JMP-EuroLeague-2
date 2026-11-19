# Fix: Refine the app background and header blur

**Type:** Fix
**Status:** verified
**Branch:** fix/refine-the-app-background-and-header-blur

## The problem

`.app-shell` (`frontend/src/index.css`) paints the background behind every page: an orange glow at the top left, an
emerald glow at the top right, and a diagonal texture over `base-200`. Screenshots of Standings in both themes at
1440px and 390px (2026-11-19) show four things to improve:

1. **The glows only cover the top of the page.** They are part of the shell's own background, so they scroll away
   after the first screen. Long pages (Standings, Games, Players) are flat grey below that.
2. **The glows end with a visible edge.** Each one fades in a single linear step to `transparent` at a fixed radius,
   so in dark mode the orange glow shows roughly where it stops.
3. **The diagonal texture does nothing.** It is a 1px, 4% stop in a 30px tile at 135deg, so it paints only a sliver in
   each tile's corner and is invisible in the screenshots.
4. **Content shows through the sticky header.** `.app-nav` is `base-200` at 92% with no blur, so table rows faintly
   show behind the nav links on desktop and behind the phone bar's title when scrolled.

The user wants a minimal, non-distracting refinement, with no dot grid (decided 2026-11-19).

## The fix

In `frontend/src/index.css` only, keeping the theme tokens (`--glow-primary`, `--glow-accent` and the colours) as they
are:

- **Glows on a layer fixed to the viewport.** Move the gradients from `.app-shell` to `.app-shell::before`
  (`position: fixed; inset: 0; z-index: -1; pointer-events: none`), with `isolation: isolate` on `.app-shell` so the
  layer stays above the shell's `base-200` and behind all content. The glows then stay visible at the side margins
  while scrolling. This is a pseudo-element, not `background-attachment: fixed` (which iOS ignores and which repaints
  on scroll).
- **Soft falloff.** Each glow becomes an ellipse with eased stops (full strength, then about 55%, about 18%, then
  transparent) instead of one linear step, and is a little larger. This keeps the same peak strength, so the colours
  look the same, just without an edge.
- **A third, faint glow.** Add a cyan (`--color-secondary`) glow centred below the bottom edge, at about 60% of
  `--glow-accent`, so the orange, cyan and emerald accents frame the page. It stays faint enough not to compete with
  content.
- **Remove the diagonal texture** layer and its `background-size` and `background-repeat` entries.
- **Header blur.** `.app-nav` gets a slightly lower fill (about 78%) plus `backdrop-filter: blur(14px) saturate(140%)`,
  placed on `.app-nav::before` (`position: absolute; inset: 0; z-index: -1`) rather than on `.app-nav` itself. A
  `backdrop-filter` on the header would make it the containing block of the phone menu's `position: fixed` scrim
  (`SiteMenu.jsx`, `fixed ... top-(--app-nav-height)`), which would shrink the scrim to the header. Fall back to the
  current 92% fill where `backdrop-filter` is unsupported (`@supports`).

Must not break:
- The reduced-motion and theme transitions on `.app-shell` (the background colour still lives on `.app-shell`).
- The phone menu: its scrim still covers the whole page under the bar, and the menu panel still opens below the bar.
- Anything that measures `.app-nav` (its height, bottom edge, z-index and hit-testing in the layout specs).
- Readability: text contrast is unchanged, because panels keep their own opaque backgrounds.

## Build steps

- [x] **Step 1 - background layer and header blur.** Make the CSS changes above.
  **Done when:**
  - `cd frontend && npm run build` passes.
  - New screenshots of Standings in both themes at 1440px and 390px, at the top and scrolled, show the glows still
    present when scrolled, with no visible edge, and no texture.
  - Table text no longer reads through the header when scrolled.
  - On a 390px phone, the open menu's scrim still covers the page below the bar.

## Verify

- `cd frontend && npm run build` and `npm run lint`.
- Browser specs, against the local database: `npx playwright test responsive.spec.js phone-menu.spec.js
  back-link-scroll.spec.js standings-race-layout.spec.js team-statistics-roster-layout.spec.js
  game-shooting-layout.spec.js`. These cover the shell, the header measurements and the phone menu. Global CSS reaches
  every page, so also run the full suite once before `/complete`.
- Manual:
  - Scroll a long page (Standings, Players) in dark and light: the corner colours stay at the edges.
  - Scroll under the header: rows blur behind it instead of reading through.
  - On a phone, open the menu: the dimmed area covers the page.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4700,"specSha256":"912872b29618dbf362e1063a38b7180c626767e3af35fe179512f11bf531e07c","branch":"refs/heads/fix/refine-the-app-background-and-header-blur","head":"0392458aa8ca608dd5096d2f2e55e3b9437dc661","baseRef":"refs/heads/master","baseCommit":"0392458aa8ca608dd5096d2f2e55e3b9437dc661","sourceTree":"e443d6659c8cbfb7058110ab0f65a7f82fb3054d","absentOptional":[]} -->
