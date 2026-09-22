# Feature: Foundational accessibility and motion

**From build-plan:** feature 15c-i
**Build attempt:** 1
**Branch:** feature/foundational-accessibility-and-motion
**Status:** verified

## Goal

Add the accessibility and motion baseline the guideline calls for wherever it
is not already met: a skip link to the main content region, a touch-target
utility for small controls on coarse pointers, a global reduced-motion reset,
and a status/alert role on every async loading, empty, and error region.

## In scope

- A skip link (`.skip-link`, visually hidden until focused) as the first
  focusable element in `SeasonLayout.jsx`, pointing to `#main-content`; give
  the existing `<main>` that id.
- A `.touch-target` CSS utility that raises `min-width`/`min-height` to 44px
  only under `@media (pointer: coarse)`, applied to `SeasonSelector`'s
  `<select>` and the `ThemeToggle` button (the two small standalone controls
  in the app shell).
- A global `prefers-reduced-motion: reduce` reset in `index.css` that collapses
  animation and transition durations to near-zero everywhere, explicitly
  exempting the DaisyUI `.loading` spinner so it keeps indicating progress.
- A `usePrefersReducedMotion()` hook in `frontend/src/lib/`, mirroring the
  existing `useThemePreference` hook's `matchMedia` subscription pattern.
  The app has no playback/animated-sequence control yet, so nothing consumes
  it this feature; it is added ready for the first control that needs it.
- `role="status"` plus an accessible name (`aria-label="Loading"`) on every
  `CenteredSpinner` wrapper (11 files: `App.jsx`, `ComparisonsPage.jsx`,
  `Dashboard.jsx`, `LeadersPanel.jsx`, `FixturesPage.jsx`, `GameDetailPage.jsx`,
  `PlayerPage.jsx`, `PlayersPage.jsx`, `PlayoffsPage.jsx`, `SeasonLayout.jsx`,
  `StandingsPage.jsx`, `StatisticsPage.jsx`, `TeamPage.jsx`, `TeamsPage.jsx` —
  verify the exact set while editing).
- `role="status"` on every plain-text empty-state paragraph (the `<p
  className="muted">...not available/no .../not found...</p>` pattern), so
  screen-reader users are told a region settled into "nothing here" rather
  than hearing silence.

## Out of scope

- The accessible tab-strip component and touch-targeting the tab buttons
  themselves — feature 15c-ii rebuilds every hand-rolled tab row from
  scratch, so touch-sizing them now would be immediately overwritten.
- `role="alert"` on error regions: every `ErrorAlert` component in the app
  (11 files) already renders `role="alert"` on its wrapping `<div>`. Verified
  by inspection; no change needed.
- Accessible names on `<select>` elements: every one of the app's 11 selects
  already has either an `aria-label` or an associated `<label htmlFor>`.
  Verified by inspection; no change needed.
- Ensuring no status is color-only: the existing form badges (`W`/`L`/`-`
  text), tier rows (text label plus color), and tie-break markers (`*` badge
  plus tooltip) all already pair color with text or an icon. No change found
  needed; flag anything found otherwise as a step addition, not a silent skip.
- Any other guideline item (15d-15g content, tab strip, shared primitives).

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (one review
packet after all steps, not per step) and `workflow.checkpointCommits` is
`disabled` (no per-step commits; `/complete` makes the one work commit).

## Build steps

- [x] 1. Add `#main-content` to `SeasonLayout.jsx`'s `<main>` and a `.skip-link`
      as the very first child of its root `<div>`, an anchor to
      `#main-content` with visually-hidden-until-focus styling in
      `index.css` (fixed position off-screen, moves on-screen on `:focus`).
      **Done when:** tabbing from a fresh page load focuses the skip link
      first, it becomes visible, and activating it moves focus to `<main>`
      (verified via CDP: dispatch Tab, read `document.activeElement`, check
      its computed position before/after focus).
- [x] 2. Add the global `prefers-reduced-motion: reduce` CSS reset to
      `index.css` (collapsing `animation-duration`, `transition-duration` to
      near-zero via `*`, excluding `.loading`) and add
      `frontend/src/lib/usePrefersReducedMotion.js` exporting the hook.
      **Done when:** `npm run build` and `npm run lint` pass; CDP emulation
      of `prefers-reduced-motion: reduce` confirms the existing theme-switch
      transition duration collapses while a rendered `.loading` spinner's
      animation keeps its normal duration.
- [x] 3. Add the `.touch-target` utility to `index.css` and apply it to
      `SeasonSelector`'s `<select>` and `ThemeToggle`'s `<button>`.
      **Done when:** `npm run build` passes; CDP emulation of a coarse
      pointer (`Emulation.setEmitTouchEventsForMouse` / device metrics with
      `touch: true`) shows both controls' computed `min-height`/`min-width`
      at 44px, while a default (non-touch) render shows their normal compact
      size unchanged.
- [x] 4. Add `role="status"` plus `aria-label="Loading"` to every
      `CenteredSpinner` wrapper, and `role="status"` to every empty-state
      `<p className="muted">` message identified above.
      **Done when:** `npm run lint` and `npm run build` pass; CDP spot-check
      on three pages (Standings while switching phases, a not-yet-played
      game detail's box score, Teams with an empty roster) confirms the
      loading and empty regions expose the new role via
      `getComputedAccessibleNode`-equivalent DOM inspection
      (`element.getAttribute('role')`).

## Files / areas

- `frontend/src/season/SeasonLayout.jsx` (skip link, `#main-content`,
  touch-target on `ThemeToggle`)
- `frontend/src/season/SeasonSelector.jsx` (touch-target)
- `frontend/src/index.css` (skip-link styles, reduced-motion reset,
  touch-target utility)
- `frontend/src/lib/usePrefersReducedMotion.js` (new)
- The 11 `CenteredSpinner` files and 10 empty-state-paragraph files listed
  above

## Data / contracts

None — this feature touches only presentation and accessibility attributes,
no API contracts or persisted data.

## Testing

No unit test runner is configured (`AGENTS.md` Commands). Verify via
`cd frontend && npm run lint` and `npm run build`, plus the CDP-based browser
evidence named in each step's `Done when` against the running dev server.

## Notes for the AI

- This is additive/attribute-level work; keep each step's diff small and
  mechanical. Do not restructure any component beyond what's named.
- Confirm the exact `CenteredSpinner`/empty-paragraph file list while editing
  step 4 (grep again) rather than trusting the list above blindly — it was
  gathered by grep during spec-writing and could miss a file added since.
- The build-plan text also asks to apply the touch-target utility "to every
  small control including the season selector." Sub-item 15c-ii deliberately
  narrows that to just the season selector and theme toggle here; the tab
  buttons (the other small controls) get sized correctly once inside the new
  tab-strip component in 15c-ii, so they are not touched twice.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7077,"specSha256":"8b8a4427c085791050e25390f85f89d7b54e64cfa358c69ac8119c00fc85b88a","branch":"refs/heads/feature/foundational-accessibility-and-motion","head":"a3d30266c03c39d352afb64b9648b7b8e34809a2","baseRef":"refs/heads/master","baseCommit":"a3d30266c03c39d352afb64b9648b7b8e34809a2","sourceTree":"dbad69c701267f482b4840c556636ab83fe4691f","absentOptional":[]} -->
