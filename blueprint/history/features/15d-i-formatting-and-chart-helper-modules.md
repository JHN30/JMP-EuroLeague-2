# Feature: Formatting and chart-helper modules

**From build-plan:** feature 15d-i
**Build attempt:** 1
**Branch:** feature/formatting-and-chart-helper-modules
**Status:** verified

## Goal

Add one shared formatting module and one shared chart-helper module, then
replace the app's existing hand-rolled, duplicated formatting call sites with
it, so number, date, and label formatting stop drifting per page.

## Scope findings from inspection

- `formatDateTime(scheduledAt)` is defined identically in 8 files
  (`ComparisonsPage.jsx`, `GamesSnapshot.jsx`, `Spotlight.jsx`,
  `FixturesPage.jsx`, `GameDetailPage.jsx`, `PlayerPage.jsx`,
  `PlayoffsPage.jsx`, `TeamPage.jsx`). It isn't named in the build-plan text's
  formatter list, but it's the same category of duplicated hand-rolled
  formatting this feature exists to fix, so it is included here.
- `.toFixed(1)` per-game/average formatting is duplicated across
  `KpiStrip.jsx`, `LeaderTrend.jsx`, `StandingsKpiStrip.jsx`,
  `LeaderboardKpiStrip.jsx`, `TeamPage.jsx` (its local `perGame` helper), and
  `TeamTrendChart.jsx`.
- Missing values are inconsistently a bare `"-"` (61 call sites) rather than
  an em dash, and totals (`pointsFor`/`pointsAgainst` in `StandingsTable.jsx`,
  season point totals) render as raw numbers with no thousands separator.
- Point differentials (`pointsDifference` in `StandingsTable.jsx` and team
  KPI panels) render as a bare number with no explicit `+` sign for positive
  values.
- `statsFields.js`'s existing `formatStatValue` passes percentage-type stat
  values (`effectiveFieldGoalPercentage`, `trueShootingPercentage`, rate
  fields whose label ends in `%`) straight through with no forced decimal
  place and no `%` suffix; it relies entirely on the column label to convey
  units.
- No round-abbreviation, period-label, season-label, or initials-fallback
  convention exists yet anywhere in the app; each has zero or effectively one
  current consumer (see Out of scope).

## In scope

- `frontend/src/lib/format.js` exporting:
  - `formatDateTime(scheduledAt)` - the existing duplicated logic, moved here.
  - `formatMinutes(timePlayed)` - the existing duplicated `M:SS` logic
    (`PlayerPage.jsx`/`GameDetailPage.jsx`), moved here.
  - `formatMissing(value)` - returns `"—"` (em dash) for `null`/`undefined`,
    otherwise the value unchanged; the base every other formatter here calls
    first.
  - `formatPerGame(value)` - one decimal via `formatMissing`, never `"0"` for
    a missing value.
  - `formatCount(value)` - `toLocaleString()` thousands separators via
    `formatMissing`.
  - `formatSignedDiff(value)` - explicit `+`/`-` sign via `formatMissing`.
  - `formatPercentage(value)` - one decimal plus `%` via `formatMissing`.
  - `formatRound(roundNumber)` - `R12`-style abbreviation.
  - `formatSeasonLabel(seasonCode)` - `E2025` to `2025-26`, derived from the
    code's year digits (matches the API's own `startYear`/`startYear+1`
    convention seen in `getSeasons`).
  - `formatPeriod(periodKey)` - `Q1`/`OT1`-style label from a period
    identifier shape to be confirmed against real data when a consumer
    exists (see Out of scope).
  - `initialsFor(name)` - up to two uppercase initials from a name string,
    for later use as an image-fallback.
- `frontend/src/lib/chartHelpers.js` exporting:
  - `thinAxisLabels(labels, maxLabels)` - keeps the first and last label,
    evenly thins the rest to at most `maxLabels`.
  - `computeDomain(values, { paddingRatio })` - min/max plus proportional
    padding for a numeric axis, ignoring `null`/`undefined` entries.
- Replace the 8 `formatDateTime` duplicates and the 2 `formatMinutes`
  duplicates with imports from `frontend/src/lib/format.js`.
- Replace the `.toFixed(1)` sites listed above with `formatPerGame`, except
  `LeaderboardKpiStrip.jsx`'s `formatKpiNumber` (see Out of scope).
- Replace the bare `"-"` used for a genuinely missing *numeric* value at the
  sites already touched by this feature's other steps (the per-game and
  count sites above) with the shared formatters; do not do a blanket
  app-wide `"-"` sweep (see Out of scope).
- Add thousands separators to `StandingsTable.jsx`'s `pointsFor`/
  `pointsAgainst` columns via `formatCount`.
- Add an explicit sign to `StandingsTable.jsx`'s `pointsDifference` column via
  `formatSignedDiff`.
- Update `statsFields.js`'s `formatStatValue` to call `formatPercentage` for
  the percentage-type keys already identifiable from `PLAYER_METRIC_GROUPS`
  labels ending in `%`, and `formatPerGame` for `minutesPlayed` (delegating
  to the new module instead of its own inline `toFixed`/em-dash logic).
  Correction found while implementing: `minutesPlayed` here is a decimal
  total/average (e.g. `570.5`), not the box-score `timePlayed`-in-seconds
  field that `formatMinutes` converts to `M:SS` — those are two different
  fields despite the similar name, so `formatPerGame` is the right call, not
  `formatMinutes`.

## Out of scope

- `LeaderboardKpiStrip.jsx`'s local `formatKpiNumber` is left alone: it
  deliberately renders an integer-valued metric (e.g. a games-played count)
  without a forced decimal and only applies one decimal to genuinely
  fractional values, which is more correct than `formatPerGame`'s always-one-
  decimal behavior for this generic, metric-agnostic component. Its
  null-handling branch is already unreachable at all three call sites
  (each is gated by an upstream null check), so there's no missing-value gap
  to close either.
- `chartHelpers.js` has no consumer yet: no chart in the app currently thins
  axis labels or computes a padded domain (all charts use Chart.js defaults
  today). Feature 15g ("Chart conventions") is the build-plan item that wires
  chart behavior everywhere; wiring it in now would be scope creep ahead of
  that feature's own design pass.
- `formatPeriod` and `initialsFor` have no consumer yet, matching the pattern
  already used in 15c-i for `usePrefersReducedMotion`: no period-score data
  is displayed anywhere in the app yet (feature 16 is what adds a
  period-level flow placeholder), and no avatar/crest fallback UI exists yet
  to receive initials (that's a shared-component concern for 15d-ii).
  `formatSeasonLabel` is likewise unconsumed for now; 15d-iii's page header
  is its likely first consumer.
- A blanket sweep of all 61 bare `"-"` call sites: most are non-numeric
  placeholders (team/player names, dates, labels) already handled correctly
  by their own `??` fallback and don't need a shared formatter. Only the
  numeric per-game/count/diff/percentage sites named above are in scope here;
  the rest are covered by 15d-ii, where shared display components take over
  the surrounding markup those values sit in.
- `roundName`-based labels (e.g. `FixturesPage.jsx`'s round column) are left
  alone: the API supplies `roundName` directly and it may carry information
  (an official phase-specific name) that a mechanical `R12` abbreviation
  would discard. Only a bare numeric fallback (`Round ${roundNumber}` with no
  `roundName`) is a candidate for `formatRound`, and no such fallback
  currently renders in a way this feature's steps touch; deferred to
  whichever later feature actually restructures that column.
- 15d-ii (shared components) and 15d-iii (page header, kicker copy).

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (one review
packet after all steps) and `workflow.checkpointCommits` is `disabled`.

## Build steps

- [x] 1. Create `frontend/src/lib/format.js` with all the exports listed in
      In scope.
      **Done when:** `npm run lint` and `npm run build` pass.
- [x] 2. Create `frontend/src/lib/chartHelpers.js` with `thinAxisLabels` and
      `computeDomain`.
      **Done when:** `npm run lint` and `npm run build` pass.
- [x] 3. Replace the 8 `formatDateTime` duplicates and 2 `formatMinutes`
      duplicates with imports from `format.js`.
      **Done when:** `npm run build` passes; CDP check on Fixtures, a game
      detail page, and a player page confirms rendered date/time and minutes
      text is unchanged from before this step.
- [x] 4. Replace the `.toFixed(1)` per-game sites with `formatPerGame`, and
      update `statsFields.js`'s `formatStatValue` for percentage keys and
      `minutesPlayed`.
      **Done when:** `npm run build` passes; CDP check on a player page
      confirms `eFG%`/`TS%`-style fields now render with a trailing `%` and
      one decimal, and a missing per-game value still renders as `—`.
- [x] 5. Add `formatCount` to `StandingsTable.jsx`'s PF/PA columns and
      `formatSignedDiff` to its DIFF column.
      **Done when:** `npm run build` passes; CDP check on Standings confirms
      a four-digit points total shows a comma separator and the diff column
      shows an explicit `+` for a positive value.

## Files / areas

- `frontend/src/lib/format.js` (new)
- `frontend/src/lib/chartHelpers.js` (new)
- `frontend/src/lib/statsFields.js`
- `frontend/src/standings/StandingsTable.jsx`
- The 8 `formatDateTime` files and 6 `.toFixed(1)` files listed above

## Data / contracts

None — formatting and presentation only.

## Testing

No unit test runner is configured. Verify via `cd frontend && npm run lint`
and `npm run build`, plus the CDP-based evidence named in each step.

## Notes for the AI

- Keep `formatStatValue`'s existing call signature (`key`, `value`) so every
  current caller keeps working unchanged; only its internals should change.
- `formatMissing` is the single source of truth for the em-dash convention;
  every other formatter should call it rather than re-checking
  `null`/`undefined` itself.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9660,"specSha256":"b1dc61232c16b2175d8817dd01aa9d26ef6bd668e26ccb75c5da7bc00f2dc814","branch":"refs/heads/feature/formatting-and-chart-helper-modules","head":"25fad9ae8f3792bdb0d6ce7394135dcc5498748f","baseRef":"refs/heads/master","baseCommit":"25fad9ae8f3792bdb0d6ce7394135dcc5498748f","sourceTree":"a131a10f6c40159759955fcd400ef0685d7f7912","absentOptional":[]} -->
