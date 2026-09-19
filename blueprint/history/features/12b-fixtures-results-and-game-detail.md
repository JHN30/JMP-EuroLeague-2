# Feature: Fixtures, results, and game detail

**From build-plan:** feature 12b
**Build attempt:** 1
**Status:** verified
**Branch:** feature/fixtures-results-and-game-detail

## Goal

Apply the shared design system established in feature 12a (tokens and
component classes in `frontend/src/index.css`) to the fixtures/results
browser and the game detail/box-score page, so game rows, scores, and
box-score tables read with the same visual hierarchy as the dashboard and
standings.

## Design reference

None. No new `prototypes/` mockups for this sub-feature; it reuses the
component classes and visual patterns feature 12a already established and
shipped: `.panel`, `.stat-badge`/`.stat-badge-neutral`, `.stat-callout`, and
the winner/score emphasis pattern already live in
`frontend/src/dashboard/GamesSnapshot.jsx`.

## In scope

- `frontend/src/games/FixturesPage.jsx`: compact phase/status tabs
  (`tabs-sm`, matching the standings page tabs restyled in 12a), the game
  list wrapped in a `.panel`, and winner/score emphasis on each row reusing
  the exact pattern already shipped in `GamesSnapshot.jsx` (bold winning
  team name, score in a `.stat-badge-neutral` pill, "vs" for unplayed games).
- `frontend/src/games/GameDetailPage.jsx`: the score shown as a
  `.stat-callout`, a `.stat-badge-neutral` status pill for a non-played game
  status (scheduled/other), winner emphasis on the team names in the header
  for a played game, and both `TeamStatsTable` and `PlayerStatsTable` wrapped
  in `.panel` containers matching `StandingsTable.jsx`'s treatment from 12a.

## Out of scope

- Teams, players, statistics leaderboards, comparisons/trends, and playoffs
  pages (12c-12e).
- Any new API endpoint, query, or derived statistic. Every value shown must
  already be returned by `getSeasonGames`, `getPhases`, `getRounds`, `getGame`,
  or `getBoxScore`.
- Changing route paths, query keys, loading/error/empty state logic, filter
  behavior (round/status filters, pagination), or any behavioral contract -
  this is a presentational restyle only.
- New CSS tokens or component classes. Everything needed
  (`.panel`, `.stat-badge`, `.stat-callout`) already exists in
  `frontend/src/index.css` from feature 12a.

## Build loop

Follow `workflow.stepReview: "feature"` (one review packet after all steps)
and `workflow.checkpointCommits: "disabled"` (no per-step commits; `/complete`
makes the single work commit).

## Build steps

- [x] 1. Restyle `FixturesPage.jsx`: change the phase tabs and status-filter
  tabs to `tabs-sm` (matching `StandingsPage.jsx`'s restyled phase tabs),
  wrap the game list `<ul>` in a `.panel`, and replace each row's plain
  team-label link and muted score text with the winner/score-pill pattern
  from `GamesSnapshot.jsx` (bold winning team, `.stat-badge-neutral` score
  pill, "vs" when not yet played). Keep the round `<select>`, pagination
  buttons, and all existing query/filter logic unchanged. Done when: the
  fixtures page for a round with played and scheduled games shows the
  restyled list, filtering and pagination still work, and the empty/error
  states still render.
- [x] 2. Restyle `GameDetailPage.jsx`: wrap the big score line in a
  `.stat-callout` (value + label, e.g. "Final" or the round name as the
  label), show a `.stat-badge-neutral` pill for the status text only when
  the game has not been played (drop the current separate muted status
  paragraph in that case; keep showing the round/date line as-is), and bold
  the winning team's name in the header when the game is played. Done when:
  a played game's detail page shows the score as a large callout with the
  winner's name emphasized, and a scheduled game's detail page shows a
  status pill instead of a bare score line.
- [x] 3. Wrap `TeamStatsTable` and `PlayerStatsTable`'s table markup in
  `.panel` containers (matching `StandingsTable.jsx`'s
  `<div className="panel overflow-x-auto p-2">` treatment from 12a). Keep
  all existing columns, data, and the "Box score not available yet" empty
  message unchanged. Done when: a game with a full box score shows both
  tables inside panels with no missing columns or data versus today.
- [x] 4. Verify both themes and run the smoke check. Toggle to
  `light-euroleague` and confirm the restyled fixtures and game detail pages
  read correctly in both themes. Run `cd frontend && npm run test:browser`
  and confirm the existing smoke test still passes unmodified. Done when:
  both themes look correct on a fixtures list and a played game's detail
  page, and `npm run test:browser` passes.

## Files / areas

- `frontend/src/games/FixturesPage.jsx`
- `frontend/src/games/GameDetailPage.jsx`

## Data / contracts

No API, data model, or CSS token changes. Reuses `.panel`, `.stat-badge`,
`.stat-badge-neutral`, and `.stat-callout` exactly as defined in
`frontend/src/index.css` by feature 12a.

## Testing

No test runner is configured for frontend logic, and this feature adds no
logic - nothing here meets the unit test scope rule. `Browser tests`
(`cd frontend && npm run test:browser`) is configured; step 4 runs the
existing smoke test as regression evidence. No new Playwright spec is added:
this feature touches no new behavioral surface beyond what the smoke test
and manual verification already cover.

## Notes for the AI

- Reuse the winner/score-pill JSX pattern from
  `frontend/src/dashboard/GamesSnapshot.jsx` verbatim in spirit (same
  classes, same null-score handling with `!= null` checks) rather than
  reinventing it, so fixtures and the dashboard stay visually identical for
  the same kind of row.
- `GameDetailPage.jsx`'s `formatMinutes` and `teamName` helpers are existing
  behavior; leave them unchanged.
- `gameQuery` is never gated (`enabled` is not set on it), so its `isLoading`
  check is safe as-is. `boxScoreQuery` is gated on `gameQuery.isSuccess`, but
  the component already returns early on `gameQuery.isLoading`/`isError`, so
  by the time the box-score section renders, `gameQuery` has already
  succeeded and `boxScoreQuery` is enabled - do not change either query's
  loading check.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6105,"specSha256":"4c355d62bb42d09b09086291bb0f2172f05487fb37654b0d37186d3e4ef42d0d","branch":"refs/heads/feature/fixtures-results-and-game-detail","head":"ccbb9d7471fcb498068caee6495031689dd3826d","baseRef":"refs/heads/master","baseCommit":"ccbb9d7471fcb498068caee6495031689dd3826d","sourceTree":"769b093172309014f3ebb44fa77137fd63adf756","absentOptional":[]} -->
