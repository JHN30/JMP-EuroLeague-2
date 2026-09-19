# Fix: Unrounded minutesPlayed display

**Type:** Fix
**Status:** verified
**Branch:** fix/unrounded-minutes-played-display

## The problem

`minutesPlayed` in the player season-stats API (`GET /seasons/:seasonCode/season-stats`,
`traditional` and `advanced` groups) is the only numeric field returned with
full floating-point precision instead of being pre-rounded to one decimal
place like every sibling field. Confirmed live against `E2025`
(`perGame` mode): `"minutesPlayed":"28.36911764705882"` alongside
`"pointsScored":"19.4"`, `"effectiveFieldGoalPercentage":"61.4"`, etc. -
every other field in the same response is already `"<digit>.<one digit>"`.
`minutesPlayed` is a direct passthrough of the `numeric` column
(`backend/src/db/season-stats.ts`'s `StatsTraditional`/`StatsAdvanced`
types read `seasonStatsTraditional.minutesPlayed`/
`seasonStatsAdvanced.minutesPlayed` with no computation), so the imprecise
value comes from the upstream source data itself, not from anything this
backend computes.

This surfaces as an ugly, inconsistent display in three places that all
render whichever stat field is selected generically:
`frontend/src/players/PlayerPage.jsx`'s `StatGrid` (season statistics
section), `frontend/src/statistics/StatisticsPage.jsx`'s `PlayerLeaderboard`
(when "MIN" is the selected leaderboard metric), and
`frontend/src/comparisons/ComparisonsPage.jsx`'s `PlayerComparisonTable`
(the Traditional group's MIN row).

## The fix

This is a data-pipeline quirk in the source `numeric` column, not something
owned or computed by this backend, and the project's data rules call for
one documented owner per aggregation rather than the frontend
independently recomputing values - so the correct fix is presentational
rounding at display time, not a backend recomputation or a pipeline change
outside this project's control.

Add one small shared formatter, `formatStatValue(key, value)`, to
`frontend/src/lib/statsFields.js` (already the shared module for
`metricGroupFor`/`metricLabelFor`, consumed by all three render sites):
returns `"-"` for `null`/`undefined`, rounds to one decimal place with
`Number(value).toFixed(1)` when `key === "minutesPlayed"`, and returns the
value unchanged for every other key (every other field is already
correctly formatted server-side; this must not touch them). Use it at all
three render sites in place of the current `value ?? "-"` pattern. Nothing
else changes: no new dependency, no change to the API response shape or
any query.

## Build steps

- [x] 1. Add `formatStatValue(key, value)` to
  `frontend/src/lib/statsFields.js` and use it in place of the raw
  `stats[key] ?? "-"` in `PlayerPage.jsx`'s `StatGrid`, the raw
  `player[group]?.[metric] ?? "-"` in `StatisticsPage.jsx`'s
  `PlayerLeaderboard`, and the raw `a?.[row.group]?.[row.metricKey] ?? "-"`/
  `b?.[row.group]?.[row.metricKey] ?? "-"` in `ComparisonsPage.jsx`'s
  `PlayerComparisonTable`. Done when: a player's season statistics section
  shows "MIN" rounded to one decimal (e.g. "28.4"), the statistics
  leaderboard sorted/filtered to "MIN" shows the same one-decimal rounding
  for every row, the player comparison table's MIN row shows rounded
  values for both players, and every other stat field (PTS, eFG%, REB%,
  etc.) in all three places still displays exactly as it did before
  (unchanged, still server-rounded).

## Verify

With both dev servers running:
- `/E2025/players/<any player with season stats>`: confirm the "MIN" value
  in the season statistics section shows one decimal place, not a long
  float.
- `/E2025/statistics` (Players view): change the metric selector to "MIN"
  and confirm every row's value is rounded to one decimal.
- `/E2025/comparisons` (Players view): pick two players and confirm the
  Traditional group's MIN row shows rounded values for both.
- Spot-check a non-MIN field (e.g. PTS) in all three places to confirm it
  is unchanged.
- `cd frontend && npm run build`, `npm run lint`, and
  `npm run test:browser` (existing smoke test) all pass.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4025,"specSha256":"d80792b9059a391af797e985066703fa2ac6f64206cfd9f1aaba6e2b24e67625","branch":"refs/heads/fix/unrounded-minutes-played-display","head":"d82f9b270b1eb8b1dc1522f249d3c45f0fd6ec50","baseRef":"refs/heads/master","baseCommit":"d82f9b270b1eb8b1dc1522f249d3c45f0fd6ec50","sourceTree":"975a786065e95d6719aee8293a5b368e8cfb865b","absentOptional":[]} -->
