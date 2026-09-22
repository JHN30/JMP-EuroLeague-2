# Feature: Shell, theming, and routing

**From build-plan:** feature 15e
**Build attempt:** 1
**Branch:** feature/shell-theming-and-routing
**Status:** verified

## Goal

Complete the application shell: per-route document titles, code-split routes
behind a panel-height spinner that never flashes the navigation chrome, a
real 404 page instead of a silent redirect, and a navigation bar that reflows
onto stacked rows on narrow screens instead of scrolling horizontally.

## Scope findings from inspection

The build-plan text for 15e also describes a broken theme sync ("always
resolves to dark... has no toggle") and asks for a theme-preference hook and
a working nav-bar toggle. That description predates this session's earlier
`fix: repair theme switcher and chart re-theming` (commit `58c0fe0`), which
already built exactly this: `useThemePreference()` resolves an explicit
stored choice, then the OS preference, then dark; follows the system live
until an explicit choice is made; writes `data-theme`, `color-scheme`, and
the `theme-color` meta tag; and is already surfaced as a working
`ThemeToggle` button in `SeasonLayout.jsx`'s nav header that names the theme
it switches to (`aria-label`/`title` both read "Switch to Dark/Light"). This
part of 15e is already done; nothing here repeats it.

**Correction found while implementing step 2:** `App.jsx`'s
`RouteErrorBoundary` wrapped the entire `<Routes>` tree (including
`SeasonLayout`) with `key={location.pathname}` on its inner `ErrorBoundary`,
so React remounted the whole shell - header, nav bar, theme toggle, season
selector - on every single navigation, confirmed with a `MutationObserver`
showing the header node removed and re-added on a client-side route change.
This is exactly the chrome flash 15e's own text says to avoid, and it
predates this feature (pre-existing since the error boundary was added), so
fixing it belongs here rather than being deferred. Fix: moved
`RouteErrorBoundary` from wrapping `<Routes>` in `App.jsx` to wrapping only
`SeasonLayout.jsx`'s `<Suspense>`/`<Outlet />` pair, so its per-route
error-reset `key` now only remounts the routed page content, not the shared
shell.

The remaining four items are genuinely missing:

- No page sets `document.title`; it stays whatever `index.html` declares for
  every route.
- No route is code-split; `App.jsx` imports all 11 page components eagerly.
- The catch-all route silently redirects to `/` (`<Navigate replace to="/" />`
  in `App.jsx`) instead of showing a 404.
- `NavBar.jsx`'s section links use `overflow-x-auto` (horizontal scroll) on
  narrow screens rather than wrapping onto additional rows.

## In scope

- `frontend/src/lib/useDocumentTitle.js`: a one-line hook
  (`useEffect(() => { document.title = title; }, [title])`) that each page
  calls with its own title string. Titles follow the existing page-header
  kicker/title pairing already established in 15d-iii (plain, no separate
  branding requirement per this project's Phase-1 scope): `"Home"`,
  `"Standings"`, `"Fixtures and results"`, `"Teams"`, `"Players"`,
  `"Statistics leaderboards"`, `"Comparisons and trends"`, `"Playoffs"`, and
  for the three dynamic pages, the same computed title already used as the
  page's `<h1>` content (a team name, a player name, or the matchup's two
  team names) so the browser tab and the page heading always agree.
- Convert each of the 11 page imports in `App.jsx` to `React.lazy(() =>
  import(...))`, and wrap the `<Routes>` element in one `<Suspense
  fallback={<AsyncState status="loading" />}>` placed inside `SeasonLayout`'s
  `<main>` (around `<Outlet />`), not around the whole app shell, so the
  header/nav bar stay mounted and only the routed page content shows the
  fallback while its chunk loads.
- `frontend/src/NotFoundPage.jsx`: a plain panel with a heading ("Page not
  found"), one line of body text, and a link back to `/` (which redirects to
  the default season, matching `DefaultSeasonRedirect`'s existing behavior).
  Replace `App.jsx`'s catch-all `<Route path="*" element={<Navigate replace
  to="/" />} />` with `<Route path="*" element={<NotFoundPage />} />`.
- `NavBar.jsx`: remove `overflow-x-auto` and add `flex-wrap` to the tabs
  container so section links wrap onto additional rows on narrow viewports
  instead of requiring horizontal scroll; remove the now-redundant `w-max`
  sizing that assumed a single scrollable row.

## Out of scope

- The theme-preference hook, toggle, and its `data-theme`/`color-scheme`/
  `theme-color` behavior: already complete (see Scope findings).
- Merging the app-shell header row (brand, season selector, theme toggle)
  and the `NavBar` row into a single combined row: the build-plan text asks
  these elements to reflow without horizontal overflow, which the existing
  two-row layout already achieves once `NavBar` itself wraps instead of
  scrolling; restructuring into one row is a visual redesign this text
  doesn't call for.
- Per-route code-splitting boundaries finer than one lazy component per page
  (for example splitting a page's own heavy sub-sections) - the build-plan
  text asks for routes to be code-split, not every internal component.
- 15f, 15g, 16, 17, and any later build-plan item.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (one review
packet after all steps) and `workflow.checkpointCommits` is `disabled`.

## Build steps

- [x] 1. Add `frontend/src/lib/useDocumentTitle.js` and call it from all 11
      page components with the titles listed above.
      **Done when:** `npm run lint` and `npm run build` pass; CDP check on
      three pages (one static, one dynamic) confirms `document.title` matches
      the expected value after navigation.
- [x] 2. Convert `App.jsx`'s 11 page imports to `React.lazy`, wrap `<Outlet
      />` in `SeasonLayout.jsx` with a `<Suspense fallback={<AsyncState
      status="loading" />}>` boundary.
      **Done when:** `npm run build` passes and the build output shows
      separate chunks for the page components (confirms code-splitting
      actually occurred, not just the API shape); CDP check confirms
      navigating between two routes keeps the header and nav bar mounted
      throughout (no flash) while a network-throttled load briefly shows the
      fallback spinner inside `<main>`.
- [x] 3. Add `NotFoundPage.jsx` and wire it into the catch-all route.
      **Done when:** `npm run build` passes; CDP check navigating to an
      unknown path confirms the 404 panel renders (not a redirect - URL stays
      on the unknown path) and its link returns to the default season.
- [x] 4. Fix `NavBar.jsx`'s overflow behavior.
      **Done when:** `npm run build` passes; CDP check at a narrow viewport
      width confirms the nav's `scrollWidth` no longer exceeds its
      `clientWidth` (no horizontal overflow) and multiple rows of links are
      visible instead of one scrollable row.

## Files / areas

- `frontend/src/lib/useDocumentTitle.js` (new)
- `frontend/src/NotFoundPage.jsx` (new)
- `frontend/src/App.jsx`
- `frontend/src/season/SeasonLayout.jsx`
- `frontend/src/season/NavBar.jsx`
- The 11 page components (for the title hook call)

## Data / contracts

None - presentation, routing, and document metadata only.

## Testing

No unit test runner is configured. Verify via `cd frontend && npm run lint`
and `npm run build`, plus the CDP-based evidence named in each step.

## Notes for the AI

- `React.lazy` components must be default exports (already true for every
  page component in this codebase); confirm before converting.
- The `Suspense` fallback must render inside the season chrome (inside
  `<main>`), not wrap `SeasonLayout` itself, or the header/nav would
  unmount/remount on every lazy load - exactly the flash the spec forbids.
- Keep each of the 11 title-hook calls to one line; do not restructure the
  surrounding component.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7895,"specSha256":"01b62231980ef798469d54c0712c1757828091cc78dc1b4e0cd799e42d61a222","branch":"refs/heads/feature/shell-theming-and-routing","head":"83e54be6cccab0c3aa019c5877840ab4e44898db","baseRef":"refs/heads/master","baseCommit":"83e54be6cccab0c3aa019c5877840ab4e44898db","sourceTree":"32c96678cbfd63d97d3fff0751998bed0fa56165","absentOptional":[]} -->
