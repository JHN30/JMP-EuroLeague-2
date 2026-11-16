# Fix: Small design cleanups

**Type:** Fix
**Status:** verified
**Branch:** fix/small-design-cleanups

## The problem

Design plan step 4: leftovers from the 2026-11-16 design audit that break the stylesheet's own rules.

- **Retired breakpoint.** `games/ShootingTables.jsx:215,243` hides the "Most made from" column with `max-md:hidden`.
  The breakpoint comment in `index.css` retires `md`; only `sm` (40rem) and `lg` (64rem) are layout breakpoints.
- **Pixel media queries.** `index.css:2449` (`640px`) and `:2456`, `:2477` (`1024px`), the Leaders board rows, are
  written in px. The stylesheet's rule is rem values (40rem / 64rem) kept in step with Tailwind's breakpoints.
- **Dead CSS.** `.kpi-strip-quad` (`index.css` ~1355–1380, plus its `:not(.kpi-strip-quad)` in another selector) is
  used by no component.
- **Browser bar colour.**
  - `lib/useThemePreference.js:6-7` sets the phone browser's `theme-color` to `#151517` (dark) and `#f6f2ec` (light),
    and `index.html` starts with `#151517`.
  - Neither matches the header the bar sits above. That is `.app-nav`: base-200 at 92% over the page, which in the
    themes is a cool slate (`oklch(18% 0.02 250)`) and a cool light grey (`oklch(96% 0.008 250)`).
  - The light value is even warm, so the bar shows a visible seam above the header.

Checked and left as they are (intentional, not drift):

- `ShootingCourt`'s dark chip with white text. Its comment says it must read on every zone fill in both themes.
- The phone menu's `bg-black/40` backdrop scrim.

## The fix

- **`ShootingTables.jsx`:**
  - Use `max-sm:hidden` if the table fits from 640px with the column shown (no sideways scroll in its box).
  - Otherwise use `max-lg:hidden`.
  - Check at 640px and 768px.
- **The three px queries:** `40rem` and `64rem`. These are the same widths at the default font size, so nothing
  changes.
- **`.kpi-strip-quad`:**
  - Delete its rules.
  - Drop `:not(.kpi-strip-quad)` from the selector that names it. That selector's behaviour is unchanged, because no
    element has the class.
- **`browserColor`:**
  - Set each theme's value to the sRGB hex of its header colour as rendered: base-200 in that theme. Measure it in the
    browser rather than converting by hand.
  - Set `index.html`'s initial `theme-color` to the dark value, and `public/site.webmanifest`'s `theme_color` and
    `background_color` too: they carried the same old `#151517`.
  - Add a one-line comment that these mirror base-200 in the theme blocks.

**Must not break:** the Leaders board layout at 320/640/1024px, the Shooting tables, and the header.

## Build steps

1. [x] **All four cleanups.**
   - **Done when:**
     - `grep` finds no `md:` utility and no `px` media query in `src`
     - `kpi-strip-quad` appears nowhere
     - the two `browserColor` values equal the measured header colours

## Verify

- `cd frontend && npm run lint` and `npm run build` pass.
- Browser specs (local DB): `leaders-layout.spec.js`, `leaders.spec.js`, the shooting specs
  (`game-shooting-layout.spec.js`, `player-shooting-games-layout.spec.js`, `team-shooting-games-layout.spec.js`) and
  `responsive.spec.js`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3208,"specSha256":"7755b871e5934abbbbd65d8b319b1550a1106cc8efad8af0d324ab89fb3fafb9","branch":"refs/heads/fix/small-design-cleanups","head":"ec7170c7e75203d4c2d863ebc114c3687870ec05","baseRef":"refs/heads/master","baseCommit":"ec7170c7e75203d4c2d863ebc114c3687870ec05","sourceTree":"bd38fdc76e20cd4343183ddb84b8b6530e3669e9","absentOptional":[]} -->
