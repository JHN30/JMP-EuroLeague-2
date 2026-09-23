# Feature: Team detail depth

**From build-plan:** feature 17d
**Build attempt:** 1
**Branch:** feature/team-detail-depth
**Status:** verified

## Goal

Restructure the Team page around a six-tab set (Overview, Statistics,
Shooting, Trends, Roster, Games), per build-plan item 17d, keeping the
existing page-level phase selector as the one control that scopes every tab
("deliberately isolated" from the section tabs, as it already is today).

## Design reference

No `prototypes/` mockup exists for team detail. `UI-UX.md` §7.5 (Team detail,
lines 1080-1139) is read for intent only: its routes, file paths, and its
club-contact panel (president, phone, address, social handles) don't apply -
this app's `clubs` table holds only `clubCode`/`name`/`abbreviatedName`/
`countryCode`/`crestUrl`, which build-plan item 17d's own text already scopes
to ("club identity from the fields we hold"). The existing CSS custom
properties, `.data-table-sticky` class, `TabStrip`/`TabPanel`, and daisyUI
badge classes already confirmed in features 16-17c supply the visual system.

## Decision already made with the user

Building Statistics' "traditional, advanced, and opponent" metric groups and
a Shooting tab needs data this app didn't have: a team-scoped, phase-scoped
aggregate of box-score totals (own and opponents'). No such endpoint existed
(`/season-stats` is player-only). The user chose to add one small backend
endpoint rather than thinning the tabs or splitting them into a later item.
Implemented: `GET /seasons/:seasonCode/teams/:clubCode/team-stats?phase=X` ->
`getTeamStatsSummary` (`backend/src/db/season-games.ts`), summing each
played game's `gameTeamStats` "total" row - the team's own side into `own`,
the opposing side into `opponent` - across the phase, plus `gamesPlayed`.
This already exists in the repository (added and verified before this spec
was written) and needs no further backend change.

## In scope

- **Tab set**: replace the current `overview/roster/schedule/stats` section
  keys with `overview/statistics/shooting/trends/roster/games`, keeping the
  existing page-level phase `TabStrip` (already structurally separate from
  the section `TabStrip`) as the one isolated control that scopes every tab.
- **Overview**: keep the existing `RecentFormList` (recent results) and the
  existing `PageHeader` (club identity: name, abbreviated name, country,
  crest - already rendered on every tab, so no separate identity card is
  added). Add:
  - Phase tiles: record (W-L), home record, away record, win %, point
    differential/game, current streak (computed client-side from this
    phase's played games, most-recent-backwards), and games remaining
    (this phase's fetched games minus played count).
  - Team leaders: top scorer, rebounder, assister, and PIR leader for the
    selected phase, computed from the roster-stats join already built for
    the Roster tab (`fetchTeamRosterStats`), each linking to the player page.
- **Statistics**: three metric-group panels - Traditional (points, total/
  offensive/defensive rebounds, assists, steals, blocks, turnovers, fouls,
  PIR per game, plus 2PT/3PT/FT shooting splits, all divided by
  `gamesPlayed` from the new endpoint's `own` totals), Advanced (eFG%, true
  shooting %, assist-to-turnover ratio, offensive/defensive rebound %, free-
  throw rate - all derived from `own` and `opponent` totals, no new data),
  and Opponent (the same traditional-style per-game figures computed from
  `opponent` totals - what this team allows). A short note states the phase
  selector above already scopes this tab, since it changes every number here.
- **Shooting**: team shooting splits for the phase from the new endpoint's
  `own` totals (2PT/3PT/FT made-attempted-pct) alongside the `opponent`
  totals as "allowed", reusing the made-attempted-percentage cell convention
  already established in `GameDetailPage.jsx`'s shooting section.
- **Trends**: loads its data only when the tab is opened (`enabled: tab ===
  "trends"`, matching the existing roster-stats lazy-load precedent already
  in this file). Renders, from this phase's already-fetched `games` list
  (`localScore`/`roadScore`, filtered to played games in this phase, ordered
  by date): a points-scored trend, a points-allowed trend, and a margin
  trend, each against a rolling average (new small helper, window of 5
  games) using the existing dashed-rolling-average `TrendChart` component
  (`frontend/src/comparisons/TrendChart.jsx`) as-is. A select lets the user
  choose which of the three series to feature as the primary line; all three
  are the only per-game series available without a second new backend
  endpoint (per-game rebounds/assists/etc. trends are out of scope - see
  below).
- **Roster**: restructure `RosterSection`'s table so the player cell (jersey
  `dorsal`, a circular portrait sourced from the same roster-stats join's
  `playerImageUrl`, with an initials fallback, and the name) is the literal
  first column, making `data-table-sticky` applicable (it isn't on today's
  `#`-then-`Player` layout). Replace the current plain "Active/Inactive"
  status text with a `badge-ghost badge-xs` "Former" marker when
  `entry.active === false` (nothing shown for active registrations).
- **Games**: rename the "Schedule" tab to "Games" and add a status filter
  (All, Results, Scheduled, Wins, Losses - the last two derived client-side
  from `played`+scores after an already-fetched "played" or unfiltered list,
  since the backend only filters by `played`/`scheduled`). State the
  ordering rule explicitly in a caption: scheduled games ascending (soonest
  first), played games descending (most recent first) when the filter is
  "All"; single chronological order otherwise.

## Out of scope

- The guideline's club contact panel (president, phone, address, social
  handles) - no such data in the `clubs` table.
- Per-game trends for any metric besides points scored, points allowed, and
  margin - would need a second new backend endpoint (a per-game team-stats
  series) beyond the one already added for Statistics/Shooting; not part of
  the user's decision for this feature.
- A shot chart or shooting-location visualization - no source data (feature
  16 established this).
- Changing `getTeamGames`'s backend contract - the Games tab's Wins/Losses
  and dual-ordering are composed client-side from the existing `status`/
  `order` params.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (Continuous
Mode self-reviews each step) and `workflow.checkpointCommits` is `disabled`.

## Build steps

- [x] 1. Replace the section `TabStrip`'s tab set with `overview/statistics/
      shooting/trends/roster/games`. Map `overview` to the existing
      `OverviewSection` (unchanged), `roster` to the existing `RosterSection`
      (unchanged), `games` to the existing `ScheduleSection` renamed in
      place (unchanged behavior). Add `statistics`, `shooting`, and `trends`
      as temporary `EmptyText` placeholders. Remove the now-superseded
      `SeasonRecordSection`/`TeamStatisticsSection`/`StatsSection` (their
      standings-derived content folds into the Overview phase tiles in step
      2; the margins breakdown they showed is already covered by the
      Standings page's "Winning margins" breakdown from feature 17b).
      **Done when:** all six tabs are reachable and switch correctly, the
      three pre-existing sections render unchanged under their renamed/
      relocated tabs, verified in the running app; `npm run build` passes.
- [x] 2. Add phase tiles and team leaders to the Overview tab: a tile row
      (record, home, away, win %, point diff/game, current streak, games
      remaining) above the existing KPI strip, and a team-leaders row (top
      scorer/rebounder/assister/PIR, linking to each player) using the
      existing `fetchTeamRosterStats` join, broadening its query's `enabled`
      condition to include the Overview tab.
      **Done when:** the tiles and leaders show correct values for a known
      team/phase (spot-checked against the standings API and roster-stats
      data), current streak and games-remaining compute correctly for a
      partially-played phase, verified in the running app; `npm run build`
      passes.
- [x] 3. Add the `getTeamStatsSummary` frontend query (gated on `tab ===
      "statistics" || tab === "shooting"`) and build the Statistics tab:
      Traditional/Advanced/Opponent metric-group panels from it, with the
      phase-scoping note.
      **Done when:** all three groups show correct per-game and derived
      values for a known team/phase (spot-checked against the raw
      `/team-stats` response), switching the page-level phase selector
      updates every number, an unplayed phase shows an empty state; verified
      in the running app; `npm run build` passes.
- [x] 4. Build the Shooting tab: own and opponent-allowed shooting splits
      from the same `getTeamStatsSummary` data.
      **Done when:** splits show correct made-attempted-pct values for a
      known team/phase, an unplayed phase shows an empty state, verified in
      the running app; `npm run build` passes.
- [x] 5. Build the Trends tab: lazy-loaded points-scored/points-allowed/
      margin charts with a rolling-average series and a metric selector,
      from the phase's already-fetched played games.
      **Done when:** opening the Trends tab for the first time triggers the
      computation only then (verified via network/render timing), the chart
      values match the games list for a known team/phase, switching the
      metric selector swaps the primary series, a phase with fewer than 2
      played games shows an empty state; verified in the running app;
      `npm run build` passes.
- [x] 6. Restructure the Roster tab to a sticky-first-column player cell
      (portrait, jersey, name) with a "Former" marker, and add the Games
      tab's status filter and explicit ordering-rule caption.
      **Done when:** the roster's player column stays frozen while
      scrolling horizontally, inactive registrations show the "Former"
      badge and active ones show none, the Games filter options each show
      the correct subset with the stated ordering, verified in the running
      app; `npm run build` passes.

## Files / areas

- `frontend/src/teams/TeamPage.jsx` - all tab content (kept in this single
  file, matching this codebase's established per-page convention confirmed
  in 17c).
- `frontend/src/lib/api.js` - `getTeamStatsSummary` (already added).
- `backend/src/db/season-games.ts` - `getTeamStatsSummary` (already added).
- `backend/src/routes/seasons.ts` - `/teams/:clubCode/team-stats` route
  (already added).
- `frontend/src/comparisons/TrendChart.jsx` - reused unchanged for Trends.

## Data / contracts

- `GET /seasons/:seasonCode/teams/:clubCode/team-stats?phase=X` (already
  implemented and verified) -> `{ phaseCode, gamesPlayed, own: {...sums},
  opponent: {...sums} }`, where each sums object has the same 19 counting-
  stat keys as `gameTeamStats`'s measure columns (`points`,
  `fieldGoalsMade2/Attempted2`, `fieldGoalsMade3/Attempted3`,
  `freeThrowsMade/Attempted`, `fieldGoalsMadeTotal/AttemptedTotal`,
  `totalRebounds`, `offensiveRebounds`, `defensiveRebounds`, `assistances`,
  `steals`, `turnovers`, `blocksFavour`, `blocksAgainst`, `foulsCommited`,
  `foulsReceived`, `valuation`), summed as plain numbers (not strings - the
  backend already sums them out of Postgres `NUMERIC` text). 404
  `PHASE_NOT_FOUND` for an invalid phase, matching the standings route's
  convention.
- Roster portraits: `playerImageUrl` from `getLeaderStats` (already fetched
  per-team via `fetchTeamRosterStats`'s pagination), joined by `personKey`
  against `getTeamRoster`'s `registrations[].player.personKey`.
- "Former" marker: `registrations[].active` (existing field, `false` =
  former).
- Trends series: `games[].localScore`/`roadScore`/`scheduledAt`/`played`/
  `phaseCode` (already fetched via `getTeamGames`, unfiltered by phase
  today - filter client-side to the selected `phaseCode`).

## Testing

- No unit test runner configured; `npm run build` is Verify for each step,
  plus direct browser verification (tab switching, values spot-checked
  against the raw API responses, lazy-load timing for Trends, empty states)
  since there's no browser-test coverage for this page.
- Verify against a team/phase with a full game history, and against a team
  in a phase with 0-1 played games to confirm every new section's empty
  state.

## Notes for the AI

- Reuse `fetchTeamRosterStats`'s existing pagination pattern
  (`ROSTER_STATS_PAGE_LIMIT`/`ROSTER_STATS_MAX_PAGES`) rather than adding a
  second one; it already returns everything Overview's leaders and Roster's
  portraits need.
- The rolling-average helper is small and local to this feature (a window
  size of 5, matching the "5-round trend" convention already used in
  standings/season-overview work); do not add it to the shared
  `chartHelpers.js` unless a second feature needs it.
- Advanced metrics (eFG%, TS%, OREB%/DREB%, FT rate) are plain arithmetic
  over the already-summed `own`/`opponent` totals - no additional data or
  endpoint is needed for them.
- Keep the existing page-level phase `TabStrip` exactly as it is; "isolated"
  in the build-plan text is already satisfied by its existing separation
  from the section `TabStrip` - do not add a second, tab-local phase control.

## Open questions

None remaining - the backend gap identified during research (team-scoped
statistics aggregation) was resolved with the user before this spec was
written, and every other build-plan surface is buildable from data already
in the repository.
