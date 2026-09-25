# Feature: Navigation and page integration

**From build-plan:** feature 19d
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/navigation-and-page-integration`

## Goal

Align the persistent navigation tabs to the shorter set of labels the plan
now uses (Home, Overview, Standings, Games, Teams, Players, Leaders,
Compare, Format), connect "Format" to the completed season-format route
(the existing `/playoffs` route built in 17i and switched to the pipeline's
own data in 19c), and verify the app's key states after this run of
backend swaps (19a standings, 19b team stats/coverage, 19c postseason
series) still render correctly. This closes out build-plan item 19 and the
whole `app_*` table adoption effort.

## Design reference

None (label/copy alignment only; no visual redesign).

## In scope

- `frontend/src/season/NavBar.jsx`: rename tab labels only, no path changes
  (the underlying routes already exist and some paths - `games` - already
  match the new short form): "Season overview" -> "Overview", "Fixtures and
  results" -> "Games", "Statistics leaderboards" -> "Leaders", "Comparisons
  and trends" -> "Compare", "Playoffs" -> "Format". Home/Standings/Teams/
  Players are unchanged.
- Update each affected page's own document title and `PageHeader` title to
  match its new nav label, so the tab and the page it opens agree:
  `FixturesPage.jsx`, `StatisticsPage.jsx`, `ComparisonsPage.jsx`,
  `PlayoffsPage.jsx` (also update `GameDetailPage.jsx`'s pre-load document
  title fallback, currently "Fixtures and results").
- Update `SeasonOverviewPage.jsx`'s closing links bar, which links to the
  same pages by the old labels ("Playoffs" -> "Format"; check the other
  three closing-bar links against the renamed set while there).
- Verify, across both `E2025` and `E2026`: every nav tab is reachable,
  highlights correctly (active state), and loads without console/network
  errors; the Format page's loading, empty (`E2026`, no postseason yet),
  and populated (`E2025`) states still work under the new label; a
  representative check of the 19a/19b/19c-backed pages (Standings, a Team
  Detail page's Statistics/Shooting tabs, a Game Detail coverage panel)
  still shows correct loading/empty/partial/error behavior after this
  session's changes.

## Out of scope

- Renaming any URL path (`/playoffs`, `/statistics`, `/comparisons` stay as
  they are; only their nav label text changes).
- Any visual redesign of the navbar itself (compact/responsive behavior from
  15e is unchanged).
- Re-deriving new automated test coverage for 19a/19b (no test runner is
  configured for this project; this is a direct-browser verification pass,
  not a new suite).

## Build loop

Continuous Mode: self-review each step, no per-step pause; one final packet.

## Build steps

- [x] **Step 1 - Rename nav tabs** - Update the five changed labels in
  `NavBar.jsx`. *Done when:* the nav bar shows Home, Overview, Standings,
  Games, Teams, Players, Leaders, Compare, Format, all pointing at their
  existing routes unchanged.
- [x] **Step 2 - Align page titles and cross-links** - Update the four pages'
  own document title/`PageHeader` title, `GameDetailPage`'s fallback title,
  and `SeasonOverviewPage`'s closing-links-bar label. *Done when:* opening
  each renamed tab shows a page whose own heading and browser tab title
  match the nav label (e.g., the "Format" tab opens a page titled "Format").
- [x] **Step 3 - Verify the integrated navigation and prior backend swaps** -
  Direct-browser pass: click through all nine tabs for both seasons
  (console/network clean, correct active-tab highlighting); confirm the
  Format page's three states (E2025 populated, E2026 empty, a forced-error
  retry); spot-check Standings, a Team Detail page's Statistics/Shooting
  tabs (19b), and a Game Detail coverage panel (19b) for correct
  loading/empty/partial/error rendering. *Done when:* all of the above are
  confirmed with screenshots or direct observation and no regressions are
  found.
- [x] **Step 4 - Final Verify** - Backend build, frontend lint/build.

## Files / areas

- `frontend/src/season/NavBar.jsx`
- `frontend/src/games/FixturesPage.jsx`
- `frontend/src/statistics/StatisticsPage.jsx`
- `frontend/src/comparisons/ComparisonsPage.jsx`
- `frontend/src/playoffs/PlayoffsPage.jsx`
- `frontend/src/games/GameDetailPage.jsx` (fallback title only)
- `frontend/src/season/SeasonOverviewPage.jsx` (closing links bar only)

## Data / contracts

- None; this is a copy/label and verification pass only.

## Testing

- No unit-test runner configured; rely on frontend build/lint and the
  direct-browser verification described in Step 3.

## Notes for the AI

- This is the last item in build-plan feature 19 (and the whole
  `app_*`-adoption effort feature 19 covers); once its parent shows every
  child checked, check off "19" itself the same way 17's parent box was
  checked when 17i finished it.
- Keep the route paths stable - only visible label/title text changes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5003,"specSha256":"15fe0070fb1be09022063a5fbe8a44a628054ad26cc0c21d08abd206d31316db","branch":"refs/heads/feature/navigation-and-page-integration","head":"af52dfbf7813cad0172bcb4d69ff91a846aa8ee5","baseRef":"refs/heads/master","baseCommit":"af52dfbf7813cad0172bcb4d69ff91a846aa8ee5","sourceTree":"3306bcf9cafcc234b5fc002358cceefc93cf008e","absentOptional":[]} -->
