# Feature: Standings depth

**From build-plan:** feature 17b
**Build attempt:** 1
**Branch:** feature/standings-depth
**Status:** verified

## Goal

Bring the Standings page up to the guideline's depth: a round-by-round "race"
view (bump chart, playback, insight cards, linked snapshot table) and
breakdown views that redefine the table's columns from data the standings API
already returns, per build-plan item 17b.

## Design reference

`prototypes/standings.html` (untracked, no `theme.css` present) is a partial,
earlier mockup: it shows tier rows, a team/crest cell, and a form-pill track,
but has no bump chart, playback, insight cards, or breakdown views, so it is
used only for those overlapping surface conventions (already matched by the
current `StandingsTable`). `UI-UX.md` §6.10 (`StandingsRaceVisualization`,
lines 837-874) and §7.1 (Standings page, lines 916-970) describe the target
interaction in prose; its file/class names (`StandingsRaceVisualization.jsx`,
`app-panel`, `data-table`) don't match this repo's actual layout
(`frontend/src/standings/`, `panel`, `table`) and are read for intent, not
literally. The existing CSS custom properties (`--color-success`,
`--color-error`, `--color-warning`, `--color-primary`, `--color-base-content`)
and daisyUI badge classes already used across the app supply the visual
system, so no new reference image is required (consistent with how features
16 and 17a were built from this same guideline text).

## In scope

- A "Race" view: a Chart.js bump/line chart plotting each club's position by
  round across the whole phase (reusing the round-scoped
  `getSeasonStandings(seasonCode, phaseCode, { round })` call already used for
  the 5-round trend sparkline, extended to every round returned by
  `getRounds`).
  - Qualification-zone background bands (postseason rows 1-6, play-in 7-10)
    behind the chart at low opacity, with a matching legend.
  - One color per club via a golden-angle hue rotation, keyed by standings
    order, so adjacent teams never share a hue.
  - Click or keyboard (Enter/Space) focus on a team's line dims every other
    line and highlights the focused one; a "Team focus" select provides the
    same toggle without a pointer.
  - A playback control that steps through the season's rounds automatically;
    under `prefers-reduced-motion`, it becomes a single "Next round" button
    (one step per press, no auto-advance). A range scrubber shows the current
    round and can be dragged directly (dragging stops auto-playback).
  - Insight cards: current leader, biggest climber (round-over-round position
    gain), most consistent (smallest position range across the phase), most
    time in a qualification position (rounds spent at position ≤ 10). Each
    links to its team page.
  - A snapshot table beside the chart: position (tinted by qualification
    zone), crest, club name, W-L record, and a movement indicator (round-over-
    round position change: up in success color, down in error color, flat at
    reduced opacity). Rows toggle the same focus state as the chart.
- Breakdown views for the standings table, selected from the existing "view"
  control area: Overview (current columns, unchanged), Streaks and form
  (`streaks` fields), Winning margins (`margins` fields), Ahead/behind
  (`aheadBehind` fields) - each replaces the table's column set rather than
  re-sorting the same columns.
- Cell treatments applied across every breakdown table: club cell keeps its
  crest + linked name; position cell gets a small "Q" badge when
  `basic.qualified`/the breakdown's own `qualified` field is true; form cell
  keeps its W/L pills and gains a screen-reader `aria-label` spelling out the
  sequence (e.g. "Last five: win, win, loss, win, win").
- A footer badge strip under the standings table explaining: what "Q" means,
  that row order follows the source standings, and (only while the Race view
  is active) that the race chart replays position from historical per-round
  standings snapshots and the current table remains the authoritative view.
- Existing tier-row grouping, KPI strip, and Overall/Home/Away/Last 10 sort
  stay as they are; "Overview" in the new breakdown selector is that existing
  table, not a new one.

## Out of scope

- Group tabs (this project has no multi-group phases in Phase 1 data; skip
  rather than build unreachable UI).
- A "Monthly form" breakdown, free-text search, and quick-filter buttons from
  UI-UX.md §7.1 - not named in build-plan item 17b's text; adding them here
  would be scope pulled from the guideline rather than the plan.
- Any backend or schema change - every field this feature renders is already
  returned by `GET /seasons/:seasonCode/phases/:phaseCode/standings`.
- Persisting playback state, focus state, or the selected breakdown across
  navigation.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (Continuous
Mode self-reviews each step instead of pausing) and
`workflow.checkpointCommits` is `disabled` (no per-step commits; `/complete`
makes the one feature commit).

## Build steps

- [x] 1. Add a golden-angle team-hue helper and a `RaceChart` component
      (Chart.js line chart) that plots position-by-round for every club across
      the full phase, with qualification-zone background bands and a legend,
      round labels thinned via the existing `thinAxisLabels` helper, and a
      TV-code label at the end of each line. Render it under a new "Race"
      subtab on the Standings page, fetching every round via `getRounds` +
      parallel `getSeasonStandings(..., { round })` calls (same pattern as the
      existing 5-round trend fetch, extended to the whole phase). No
      playback, focus, or insight cards yet.
      **Done when:** the Race subtab shows a chart with one line per club,
      colored distinctly, with qualification bands and a legend, verified in
      the running app against a season with a full round history; `npm run
      build` passes.
- [x] 2. Add playback controls (play/pause/replay, range scrubber showing the
      current round) that reveal the chart round-by-round, auto-advancing on
      an interval; wire `usePrefersReducedMotion` so the control becomes a
      single "Next round" step button with no auto-advance when reduced
      motion is preferred. Add the four insight cards (current leader,
      biggest climber, most consistent, most time in a qualification
      position), each linking to `/${seasonCode}/teams/${clubCode}`.
      **Done when:** playback advances the chart one round per interval and
      can be paused/replayed; toggling the OS/browser reduced-motion setting
      swaps it for a single-step button (verified via browser dev tools
      motion emulation); insight cards show correct values for a known
      season, verified against the standings table; `npm run build` passes.
- [x] 3. Add click/keyboard focus-dimming on the chart (a line and its legend
      entry become primary-colored and thicker on focus, others drop to low
      opacity) plus a "Team focus" select as the non-pointer equivalent, and
      the linked snapshot table (position tinted by qualification zone,
      crest, name, W-L, movement indicator) whose rows toggle the same focus
      state. Add the Race-only footer note ("replays historical standings;
      the table above remains authoritative").
      **Done when:** clicking a chart line or a snapshot row dims the other
      lines and highlights the selected one, keyboard focus (Tab + Enter/
      Space) does the same, and the "Team focus" select offers an equivalent
      pointer-free path, all verified in the running app; `npm run build`
      passes.
- [x] 4. Add the breakdown-view selector (Overview / Streaks and form /
      Winning margins / Ahead-behind) next to the existing Overall/Home/Away/
      Last 10 view control, with a table variant per breakdown built from the
      `streaks`, `margins`, and `aheadBehind` fields already in each standings
      entry. Apply the "Q" position badge and form `aria-label` cell
      treatments across all breakdown tables, and add the general footer
      badge strip (Q meaning, row-order note) beneath the table for every
      breakdown.
      **Done when:** switching the breakdown selector swaps the table's
      columns to the matching field set for every option, verified against
      known values from the standings API response in the running app; the
      footer badge strip is present under every breakdown; `npm run build`
      passes.

## Files / areas

- `frontend/src/standings/StandingsPage.jsx` - add Race/breakdown view state,
  full-phase round fetching.
- `frontend/src/standings/StandingsTable.jsx` - breakdown column variants, Q
  badge, form `aria-label`, footer badge strip.
- `frontend/src/standings/` - new `RaceChart.jsx`, `RacePlayback.jsx` (or
  combined), `StandingsSnapshotTable.jsx`, `StandingsInsightCards.jsx` (exact
  split decided during implementation to keep each file focused).
- `frontend/src/lib/teamHue.js` - new golden-angle hue helper.
- `frontend/src/lib/chartHelpers.js` - reuse `thinAxisLabels`; no change
  expected.
- `frontend/src/lib/usePrefersReducedMotion.js` - reused, unchanged.

## Data / contracts

No backend change. Reused response shape from
`GET /seasons/:seasonCode/phases/:phaseCode/standings?round=N`
(`backend/src/db/season-standings.ts`):

- `basic.position`, `basic.qualified`, `basic.homeRecord` /
  `awayRecord` / `lastTenRecord`, `basic.pointsDifference` - Race chart,
  snapshot table, Overview breakdown (unchanged).
- `streaks.{homeRecord,awayRecord,last10,homeLast5,awayLast5,
  longestWinStreakCurrentSeason,longestLoseStreakCurrentSeason,
  longestWinStreakAnySeason,longestLoseStreakAnySeason,qualified}` - Streaks
  and form breakdown.
- `margins.{pointDifference1To5,pointDifference6To10,pointDifference11To15,
  pointDifferenceMoreThan15,rebounds,assists,blocks,threePointers,
  twoPointers,freeThrows,qualified}` - Winning margins breakdown. These are
  pre-formatted strings from the source table (like `basic.homeRecord`);
  render as returned, no reformatting/derivation.
- `aheadBehind.{winsPercentage,quarter1Ahead,quarter1Behind,quarter1Tied,
  half1Ahead,half1Behind,half1Tied,quarter3Ahead,quarter3Behind,
  quarter3Tied,qualified}` - Ahead/behind breakdown.
- `form[].{resultOrdinal,result}` - form pills and the new `aria-label`.
- Any of `basic`/`streaks`/`margins`/`aheadBehind` can be `null` for a club
  with no rows in that source table; breakdown cells render "-" the same way
  the existing Overview table already does for missing `basic` fields.

## Testing

- No unit test runner is configured (`blueprint/config.json` /
  `AGENTS.md`); rely on `npm run build` (frontend build + implicit type/JSX
  check) as Verify for each step, plus direct browser verification of the
  interactive behavior (playback, focus-dimming, reduced motion, breakdown
  switching) since there is no browser-test coverage for this page today and
  adding a harness is out of scope for this feature.
- Verify against a season/phase with a real multi-round history (e.g. `E2025`
  regular season) so the Race chart and insight cards have enough rounds to
  be meaningful, and against a season with very few played rounds to confirm
  the existing "not enough data" fallback pattern (from `ScoringTrendChart`)
  is followed when there's only 0-1 rounds.

## Notes for the AI

- Follow the Chart.js theming pattern already established in
  `SeasonOverviewPage.jsx`'s `ScoringTrendChart` (`useActiveTheme` +
  `themeColor` read from CSS custom properties on the canvas element,
  destroy-on-cleanup `useEffect`) rather than introducing a shared chart
  wrapper - no such wrapper exists yet and every chart file currently
  duplicates this ~15-line pattern; do not extract one as part of this
  feature.
- The golden-angle hue formula from the guideline is
  `hsl((i * 137.5 + 12) % 360, 72%, 58%)` keyed by index in standings order;
  implement as a small pure function taking an index and returning the CSS
  color string.
- Reuse `usePrefersReducedMotion` (already unconsumed elsewhere in the repo)
  for the playback control; this is its first real consumer.
- Keep the full-phase round fetch bounded to the phase's own round count from
  `getRounds` (already capped by the season's real schedule length, typically
  well under 40); do not add pagination or a batch endpoint for this.
- Do not add a competition/group selector; this project has one competition
  and (per build-plan deviation notes) group tabs are not reachable with
  current data.

## Open questions

None - the standings API already returns every field this feature renders,
and build-plan item 17b names the exact UI surfaces to add.
