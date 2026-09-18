# Feature: Navigation bar

**From build-plan:** feature 5
**Build attempt:** 1
**Branch:** feature/navigation-bar
**Status:** verified

## Goal

Give every season-scoped page a persistent navigation bar with tabs to Home,
Standings, Fixtures and results, Teams, Players, Statistics leaderboards,
Comparisons and trends, and Playoffs, alongside the existing season selector,
so a visitor can always reach any planned section without relying on links
buried inside page content.

## In scope

- A persistent nav bar rendered once in `SeasonLayout` (so it appears on every
  season-scoped route) with one tab per section: Home, Standings, Fixtures and
  results, Teams, Players, Statistics leaderboards, Comparisons and trends,
  Playoffs.
- Each tab links to a season-scoped URL (`/:seasonCode/...`), preserving the
  current season the same way `SeasonSelector` does.
- The tab for the current route is visually marked active.
- Two tabs (Home, Standings) point at pages that exist today
  (`/:seasonCode` and `/:seasonCode/standings`) and navigate correctly.
- The other six tabs (Fixtures and results, Teams, Players, Statistics
  leaderboards, Comparisons and trends, Playoffs) point at the URLs their
  future features will own. Those routes are not built yet, so today's
  catch-all (`*` -> redirect to `/`) is what actually handles them — this
  mirrors the already-shipped interim behavior of the dashboard's forward
  links to `/:seasonCode/teams/:clubCode` etc. (features 3-4), which also
  point at not-yet-built pages. Locking in these list-page URLs now avoids
  reshaping the nav bar when features 6-11 land.
- Fixed URL slugs for the six not-yet-built sections, chosen to match the
  existing detail-route nouns already shipped (`games`, `teams`, `players`):
  - Fixtures and results -> `/:seasonCode/games`
  - Teams -> `/:seasonCode/teams`
  - Players -> `/:seasonCode/players`
  - Statistics leaderboards -> `/:seasonCode/statistics`
  - Comparisons and trends -> `/:seasonCode/comparisons`
  - Playoffs -> `/:seasonCode/playoffs`
- Mobile layout: tabs remain reachable (horizontal scroll is acceptable; no
  hamburger/drawer menu is required for eight short labels).
- Keyboard access and visible focus on each tab, consistent with the project's
  accessibility requirements.

## Out of scope

- Building the Fixtures, Teams, Players, Statistics leaderboards, Comparisons,
  or Playoffs pages themselves (features 6-11).
- Changing the catch-all redirect behavior in `App.jsx`.
- A collapsible/drawer mobile navigation pattern.
- Any change to `SeasonSelector` itself beyond sharing header space with the
  new nav bar.

## Build loop

Follow `blueprint/config.json`: `workflow.stepReview` is `feature` (one review
packet after all steps, not per-step), `workflow.checkpointCommits` is
`disabled` (no interim commits; `/complete` makes the one work commit).

## Build steps

- [x] 1. Add a `NavBar` component (`frontend/src/season/NavBar.jsx`) rendering
      the eight tabs listed above as `NavLink`s to `` `/${seasonCode}/...` ``
      (root tab uses the exact `` `/${seasonCode}` `` path with `end`), each
      showing `tab-active` (DaisyUI `tabs`) when its route matches, keyboard
      reachable, with visible focus styling from the existing theme.
      Done when: rendering `SeasonLayout` at `/E2025` and `/E2025/standings`
      shows all eight tabs, with Home active on the first and Standings active
      on the second (build passes; visual state confirmed by reading the
      rendered DOM/computed class, no server required yet).
- [x] 2. Mount `NavBar` in `frontend/src/season/SeasonLayout.jsx`'s header,
      alongside `SeasonSelector`, so it appears on every season-scoped route
      before `<Outlet />`.
      Done when: the build passes and the nav bar renders above the routed
      page content for both existing routes.

## Files / areas

- `frontend/src/season/NavBar.jsx` (new)
- `frontend/src/season/SeasonLayout.jsx` (mount point, header layout)

## Data / contracts

No backend changes. No new data contracts; this is pure client-side routing
chrome using the existing `:seasonCode` param already established by
`SeasonLayout`/`SeasonSelector`.

## Testing

No test runner is configured for the frontend (`/tests` has not been run), so
verification is build (`npm run build`, `npm run lint`) plus live-browser
confirmation of tab rendering, active-state highlighting, and navigation,
consistent with how features 2-4 were verified.

## Notes for the AI

- Reuse the `NavLink` pattern from `react-router` (already a dependency via
  `react-router` used for `Link`/`Navigate` elsewhere) for active-state
  detection instead of hand-rolling `useLocation` comparisons.
- Keep the six not-yet-built tabs pointing at their real intended URLs, not at
  `#` or a disabled state — the project has already established (features 3-4)
  that forward-linking to not-yet-built pages, which fall through the
  catch-all redirect to season home, is acceptable interim behavior.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5012,"specSha256":"420f44d3e002cff2027aa362e4ecbe3624bf93162139b8130aec3245a68a5105","branch":"refs/heads/feature/navigation-bar","head":"fdd032124cfa77712b6ff3cac8736c0341fc67b2","baseRef":"refs/heads/master","baseCommit":"fdd032124cfa77712b6ff3cac8736c0341fc67b2","sourceTree":"2456c27e9aeb822e672dc48add58ba11b11b5b19","absentOptional":[]} -->
