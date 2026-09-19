# Feature: Statistics leaderboards and comparisons

**From build-plan:** feature 12d
**Build attempt:** 1
**Status:** verified
**Branch:** feature/statistics-leaderboards-and-comparisons

## Goal

Apply the shared design system established in features 12a-12c to the
statistics leaderboards and comparisons/trends pages, so ranked rows and
comparison tables read with the same rank/panel visual hierarchy already
shipped elsewhere, and the trend chart sits inside the same panel framing
as the rest of the app.

## Design reference

None. No new `prototypes/` mockups; reuses `.panel`, `.rank`/`.rank-1`
exactly as shipped in 12a-12c.

## In scope

- `frontend/src/statistics/StatisticsPage.jsx`: compact (`tabs-sm`)
  view/phase/direction/mode tabs, `TeamLeaderboard` and `PlayerLeaderboard`
  tables wrapped in a `.panel` (matching `StandingsTable.jsx`), a `.rank`
  marker (with `.rank-1` gold tier for the actual #1 row) replacing the
  plain `#` cell in both tables, and the ranked metric value cell emphasized
  (`text-primary font-semibold`) since it's the entire point of a
  leaderboard row.
- `frontend/src/comparisons/ComparisonsPage.jsx`: compact (`tabs-sm`)
  view/phase/mode tabs, `TeamComparisonTable` and `PlayerComparisonTable`
  wrapped in a `.panel`.
- `frontend/src/comparisons/TrendChart.jsx`: wrap the existing chart +
  table output in a single `.panel p-4` container so it reads as one card
  like every other page.

## Out of scope

- Fixtures/game detail, teams/players (already done, 12a-12c), and
  playoffs (12e).
- `TeamPicker`/`PlayerPicker` in `ComparisonsPage.jsx`: these are form
  controls (select/search), not data-display rows with a "plain numbers"
  problem; leave them unchanged.
- Highlighting which side "wins" a metric row in the comparison tables.
  `statsFields.js`'s `TEAM_METRICS`/`PLAYER_METRIC_GROUPS` carry no
  higher-is-better/lower-is-better direction per metric (turnovers and
  losses are lower-is-better, points and rebounds are higher-is-better),
  and no other part of the codebase establishes that mapping. Inventing
  per-metric directionality now would be a guessed product rule, not a
  presentational restyle.
- Making `TrendChart.jsx` re-color reactively when the theme changes while
  mounted. The chart already reads the current theme's CSS variables via
  `getComputedStyle` at chart-creation time (correct for page
  load/navigation), and `App.jsx` has no rendered theme-toggle control
  today (`useThemeSync` sets `data-theme` once from storage/system
  preference; `.theme-option` styling in `index.css` has no consuming
  component) - so a live, mounted-chart theme switch is not reachable
  behavior in the current app. Revisit if/when a theme toggle ships.
- Any new API endpoint, query, derived statistic, CSS token, or component
  class. Everything needed (`.panel`, `.rank`, `.rank-1`) already exists
  from 12a.
- Changing route paths, query keys, sort/filter/pagination behavior, chart
  data logic, or any other behavioral contract - this is a presentational
  restyle only.

## Build loop

Follow `workflow.stepReview: "feature"` (one review packet after all steps)
and `workflow.checkpointCommits: "disabled"` (no per-step commits; `/complete`
makes the single work commit).

## Build steps

- [x] 1. Restyle `StatisticsPage.jsx`: change the view toggle, phase tabs,
  and each leaderboard's direction/mode tabs to `tabs-sm`. In
  `TeamLeaderboard`, wrap the `<table>` in a `.panel overflow-x-auto p-2`,
  replace the `<td>{index + 1}</td>` rank cell with
  `<span className={`rank ${index === 0 ? "rank-1" : ""}`}>{index + 1}</span>`,
  and add `text-primary font-semibold` to the metric value cell. In
  `PlayerLeaderboard`, apply the same panel wrap and rank marker (gold tier
  only when `offset === 0 && index === 0`, using the existing
  `offset + index + 1` numbering) and the same metric value emphasis. Keep
  all query/loading/error/empty/pagination logic unchanged. Done when: the
  team and player leaderboards for a phase with data show panel-wrapped
  tables with rank markers and emphasized metric values, sorting/direction/
  mode toggles and pagination still work, and empty states still render.
- [x] 2. Restyle `ComparisonsPage.jsx`: change the view toggle, phase tabs,
  and player mode toggle to `tabs-sm`, and wrap `TeamComparisonTable` and
  `PlayerComparisonTable`'s `<table>` in a `.panel overflow-x-auto p-2`.
  Keep all query/loading/error/empty logic, the picker components, and the
  group-header row styling unchanged. Done when: comparing two teams and
  two players each shows a panel-wrapped comparison table with no missing
  rows, and the "select two to compare" empty state still renders.
- [x] 3. Wrap `TrendChart.jsx`'s returned markup (the chart's `<div>` and
  the table below it) in a single `.panel p-4` container. Done when: the
  trend chart for two selected entities with enough played games renders
  inside one bordered/rounded panel with no layout regression.
- [x] 4. Verify both themes and run the smoke check. Toggle to
  `light-euroleague` and confirm the restyled leaderboards, comparison
  tables, and trend chart panel read correctly in both themes. Run
  `cd frontend && npm run test:browser` and confirm the existing smoke test
  still passes unmodified. Done when: both themes look correct on the
  statistics and comparisons pages, and `npm run test:browser` passes.

## Files / areas

- `frontend/src/statistics/StatisticsPage.jsx`
- `frontend/src/comparisons/ComparisonsPage.jsx`
- `frontend/src/comparisons/TrendChart.jsx`

## Data / contracts

No API, data model, or CSS token changes. Reuses `.panel` and `.rank`/
`.rank-1` exactly as defined in `frontend/src/index.css` by feature 12a.

## Testing

No test runner is configured for frontend logic, and this feature adds no
logic - nothing here meets the unit test scope rule. `Browser tests`
(`cd frontend && npm run test:browser`) is configured; step 4 runs the
existing smoke test as regression evidence. No new Playwright spec is
added: this feature touches no new behavioral surface beyond what the
smoke test and manual verification already cover.

## Notes for the AI

- `PlayerLeaderboard`'s rows are already numbered `offset + index + 1`;
  the rank-1 gold tier applies only on the very first page's first row
  (`offset === 0 && index === 0`), not to every page's first visible row.
- `TeamLeaderboard`'s rows are always page 1 (no pagination), so
  `index === 0` alone is correct there.
- `TrendChart.jsx` is used only from `ComparisonsPage.jsx` today; wrapping
  its own output in `.panel` is the right place to own that styling rather
  than wrapping it at the call site, matching how `StandingsTable.jsx` and
  other table components own their panel wrapper.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6768,"specSha256":"ae1620e9c5e39926000f9dd84ec6c5e1dee98abd7a9a372ca781ce3bfd1a9520","branch":"refs/heads/feature/statistics-leaderboards-and-comparisons","head":"28dff78f1a4e3208cde1de8c1730b7163700ba7b","baseRef":"refs/heads/master","baseCommit":"28dff78f1a4e3208cde1de8c1730b7163700ba7b","sourceTree":"6a6416db2ac2cfced39e14f92cba3d923a822d2d","absentOptional":[]} -->
