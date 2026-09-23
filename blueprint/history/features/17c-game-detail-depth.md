# Feature: Game detail depth

**From build-plan:** feature 17c
**Build attempt:** 1
**Branch:** feature/game-detail-depth
**Status:** verified

## Goal

Restructure Game Detail around a tab bar with a final-score card in the page
header, a game-scoped coverage panel, a full sticky-column box score, a
quarter-by-quarter period table, a mirrored team-comparison table, and a
period-level game-flow chart, per build-plan item 17c. The shooting and
play-by-play tabs keep rendering the existing feature-16 placeholders
unchanged.

## Design reference

No `prototypes/` mockup exists for game detail. `UI-UX.md` §7.3 (Game detail,
lines 1014-1057) is read for intent only, not literally: its route
(`/scores/...`), file paths (`src/pages/GameDetailPage.jsx`,
`GameTimelinePanel.jsx`), and its `GameTimelinePanel`/`GameShootingChart`
event-level detail don't apply (this app has no shot-by-shot or event-by-event
source data - already established by feature 16's placeholders). What carries
over: a final-score card in the header, a tab bar, a sticky-first-column box
score with a totals row and a per-team panel header (crest, name, winner
badge, coach line), and a three-column mirrored team-comparison table. The
existing CSS custom properties, `.data-table-sticky` class, and daisyUI badge
classes already used across the app (confirmed in features 16-17b) supply the
visual system, matching how those features were built from this same
guideline text without a new reference image.

## In scope

- Move the final score (or scheduled-status badge) from its own block into
  `PageHeader`'s `children` slot as a compact card: both team names/crests
  mirrored around the score (or status badge for an unplayed game), replacing
  the current separate `stat-callout`/`stat-badge` block below the header.
- Keep the compact `DataCoveragePanel` (`getCoverage(seasonCode, { gameCode
  })`, already correctly game-scoped) directly under the header, above the tab
  bar - unchanged data/props, only repositioned as needed by the new layout.
- A `TabStrip`/`TabPanel` tab bar (reusing the existing primitive from
  `frontend/src/lib/TabStrip.jsx`, the same one `PlayerPage.jsx` already uses)
  with five tabs: **Box score**, **Game flow**, **Team comparison**,
  **Shooting**, **Play-by-play**.
  - **Box score**: one panel per team (crest, name, a `badge-primary`
    "Winner" badge on the winning side once `game.played`, coach line from
    that side's `teamStats` total row's `coachName`, player count). Each
    team's table is `data-table-sticky` with the player identity as the
    frozen first column (jersey `dorsal`, circular `headshotUrl` portrait
    with initials-fallback matching the existing player-row pattern, name,
    a `badge-primary badge-xs` "S" marker when `started ?? startedAlt`,
    `positionName` beneath). Columns: MIN (`formatMinutes(timePlayed)`),
    PTS, 2PT (`fieldGoalsMade2-fieldGoalsAttempted2`), 3PT
    (`fieldGoalsMade3-fieldGoalsAttempted3`), FT
    (`freeThrowsMade-freeThrowsAttempted`), REB (`totalRebounds`), OREB, DREB,
    AST, STL, TO, BLK (`blocksFavour`), BLKA (`blocksAgainst`), FC
    (`foulsCommited`), FD (`foulsReceived`), +/- (`formatSignedDiff(plusMinus)`),
    PIR (`valuation`). A `tfoot` totals row reuses that side's existing
    `teamStats` "total" row (already authoritative team totals) rather than
    summing player rows again.
  - **Game flow**: a quarter-by-quarter period table (both teams' score per
    period plus a computed margin row) and a period-level line chart of the
    running score margin (local cumulative minus road cumulative) after each
    period, following the `ScoringTrendChart` Chart.js theming pattern
    (`useActiveTheme`/`themeColor`, destroy-on-cleanup, `role="img"` with a
    descriptive `aria-label`) - this stands in for the guideline's
    event-level flow chart, built only from `periodScores`.
  - **Team comparison**: a three-column mirrored table (home value right-
    aligned, stat label centered, away value left-aligned) from both sides'
    `teamStats` total rows: PTS, 2PT/3PT/FT (made-attempted-pct), REB
    (OREB/DREB), AST, STL, TO, BLK/BLKA, FC/FD, PIR - the better value per row
    tinted (higher is better except turnovers, fouls committed, and blocks
    against, where lower is better). No existing "winning side tinted"
    comparison convention exists yet in this codebase (the Comparisons page
    build-plan item is still unbuilt), so this introduces the pattern fresh
    for this table only.
  - **Shooting**: the existing `ShootingSplitsSection` (feature 16b),
    relocated into this tab unchanged.
  - **Play-by-play**: the existing `PlayByPlaySection` (feature 16b),
    relocated into this tab unchanged (it keeps its own simpler mirrored
    period-score table and "not tracked" note; some overlap with the new
    Game flow tab's period table is expected and accepted, per build-plan
    text keeping this tab as the untouched feature-16 placeholder).
- An "Overview" tab is not added; build-plan item 17c does not name one and
  the header (score card + coverage panel) already serves that role.

## Out of scope

- Any event-level play-by-play, shot chart, or `GameTimelinePanel`/
  `GameShootingChart` detail from the guideline - no source data.
- Backend or schema changes - `getBoxScore` already returns every field this
  feature needs (verified against `backend/src/db/season-games.ts`).
- Venue, attendance, officials - still absent, as established by feature 16.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (Continuous
Mode self-reviews each step) and `workflow.checkpointCommits` is `disabled`
(no per-step commits; `/complete` makes the one feature commit).

## Build steps

- [x] 1. Add the tab bar shell: move the final score/status into the
      `PageHeader` `children` slot as a mirrored score card, keep the
      coverage panel above the tabs, and wrap the existing content under
      `TabStrip`/`TabPanel` tabs - Box score (existing `TeamStatsTable` +
      side-by-side `PlayerStatsTable`s, unchanged), Game flow (empty for
      now), Team comparison (empty for now), Shooting (existing
      `ShootingSplitsSection`, relocated), Play-by-play (existing
      `PlayByPlaySection`, relocated). No visual/data changes to the
      relocated sections yet.
      **Done when:** the page shows a working tab bar with the final score in
      the header and the coverage panel above it, switching tabs shows the
      relocated existing content unchanged, verified in the running app
      against a played game; `npm run build` passes.
- [x] 2. Replace the Box score tab's `TeamStatsTable`/`PlayerStatsTable` with
      the new per-team sticky-column box score: jersey, portrait, starter
      marker, position, coach line, winner badge, the full 17-measure column
      set, and a totals row sourced from each side's `teamStats` total row.
      **Done when:** each team's box score table shows every listed column
      with correct values for a known played game (spot-checked against the
      raw `/box-score` response), the totals row matches that side's team
      total, the identity column stays frozen while scrolling horizontally,
      and an unplayed game shows the existing empty-state copy; `npm run
      build` passes.
- [x] 3. Add the quarter-by-quarter period table and the period-level
      game-flow line chart to the Game flow tab, both built from
      `periodScores`.
      **Done when:** the period table shows each team's score per period plus
      a margin row, the chart plots the running score margin by period with
      theme-aware colors and an `aria-label`, and an unplayed/no-period-data
      game shows an empty state instead of an empty chart; verified in the
      running app; `npm run build` passes.
- [x] 4. Add the mirrored team-comparison table to the Team comparison tab
      from both sides' `teamStats` total rows, with the winning side's value
      tinted per row.
      **Done when:** the table shows the full stat list with home value,
      centered label, and away value, the winning side's cells are visually
      distinguished, and an unplayed game shows the existing empty-state
      copy; verified in the running app; `npm run build` passes.

## Files / areas

- `frontend/src/games/GameDetailPage.jsx` - header/score-card restructuring,
  tab bar, new `BoxScoreTable`, `PeriodTable`, `GameFlowChart`,
  `TeamComparisonTable` components (kept in this file, matching this
  codebase's established single-file-per-page convention).
- `frontend/src/lib/TabStrip.jsx` - reused unchanged.
- `frontend/src/lib/format.js` - reused (`formatMinutes`, `formatSignedDiff`,
  `formatPercentage`); no changes expected.

## Data / contracts

No backend change. All fields come from the existing
`GET /seasons/:seasonCode/games/:gameCode/box-score` response
(`backend/src/db/season-games.ts`):

- `teamStats[]` (`statsKind: "total"` only exists today): `side`,
  `coachName`, `coachCode`, and the shared measure fields (`points`,
  `fieldGoalsMade2/Attempted2`, `fieldGoalsMade3/Attempted3`,
  `freeThrowsMade/Attempted`, `totalRebounds`, `offensiveRebounds`,
  `defensiveRebounds`, `assistances`, `steals`, `turnovers`,
  `blocksFavour`, `blocksAgainst`, `foulsCommited`, `foulsReceived`,
  `plusMinus`, `valuation`) - box score totals row and the team-comparison
  table.
- `playerStats[]`: `side`, `personKey`, `personName`, `dorsal`,
  `headshotUrl`, `started`, `startedAlt`, `position`, `positionName`, plus
  the same shared measure fields, `timePlayed` - box score player rows.
- `periodScores[]`: `side`, `periodNumber`, `score` - period table and
  game-flow chart.
- Numeric columns arrive as strings from the API (Postgres `NUMERIC`); the
  codebase already treats them this way (`Number(...)` casts in the existing
  `ShootingSplitsSection`) - follow the same pattern for any new arithmetic
  (margin, totals-row consistency checks).
- `game.localTeam`/`game.roadTeam`/`game.localScore`/`game.roadScore`/
  `game.played` (from `GET /seasons/:seasonCode/games/:gameCode`, already
  fetched) - header score card and winner badges.

## Testing

- No unit test runner configured; `npm run build` is Verify for each step,
  plus direct browser verification (tab switching, box score values against
  the raw API response, chart rendering, empty states) since there's no
  browser-test coverage for this page.
- Verify against a played game with a full box score and period scores, and
  against a scheduled/unplayed game to confirm every new section's empty
  state (matching the existing `EmptyText` copy pattern) instead of a crash
  or blank table.

## Notes for the AI

- Reuse the `ScoringTrendChart` Chart.js theming pattern
  (`SeasonOverviewPage.jsx`) for the game-flow chart: `useActiveTheme` +
  `themeColor` read from CSS custom properties, destroy-on-cleanup
  `useEffect`, `role="img"` canvas with a descriptive `aria-label`. Do not
  extract a shared chart wrapper - no such wrapper exists yet in this
  codebase (confirmed again in 17b); every chart file duplicates this
  pattern.
- Do not add a "button variant" to `TabStrip` for this feature; reuse its
  existing `tabs-boxed` styling as-is, matching how `PlayerPage.jsx` already
  uses it. UI-UX.md's button-grid tab styling is read for intent, not ported.
- Combine each shooting split (2PT/3PT/FT) into one "made-attempted" column
  in the box score table rather than six separate make/attempt columns,
  matching the existing `ShootingSplitsSection` convention already in this
  codebase.
- The game-flow chart's margin is `(local cumulative score) - (road
  cumulative score)` after each period, not a per-possession event feed -
  this is the explicit, deliberate stand-in the build-plan item names.
- Keep `PlayByPlaySection` and `ShootingSplitsSection` byte-for-byte
  unchanged apart from relocation into their tabs; they are the feature-16
  placeholders the build-plan item says to keep.

## Open questions

None - `getBoxScore` already returns every field this feature renders, and
build-plan item 17c names the exact UI surfaces to add.
