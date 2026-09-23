# Feature: Head-to-head route

**From build-plan:** feature 17g-ii
**Build attempt:** 1
**Branch:** feature/head-to-head-route
**Status:** verified - awaiting feature review

## Goal

Add a head-to-head route covering every meeting between two clubs across
the archived seasons, with a series hero, margin timeline, momentum
splits, notable meetings, and an empty state, per build-plan item 17g-ii -
the second and final part of build-plan item 17g (17g-i, the comparison
row anatomy, is already complete).

## Design reference

No `prototypes/` mockup exists for this page. `UI-UX.md` §7.10 (Head-to-
head, lines 1252-1283) is read for intent, not literally: its route
(`/head-to-head`), file path, and some controls (a separate competition
select, a "Game phase" select with counts) don't apply - this app has one
competition and build-plan item 17g-ii's own text scopes this to "every
meeting ... across the archived seasons," not a phase filter, so no phase
select is added. What carries over: the hero (both clubs' identity
flanking the series record, completed-game count beneath), a four-up
summary grid, a margin timeline (diverging bars from one club's
perspective) beside a momentum panel (current streak + home/away/neutral
splits), notable meetings beside a per-season breakdown, latest/upcoming
meetings as linked cards, and the empty-state copy adapted to this app's
actual controls: "These teams did not meet in this selection - try a wider
season range."

## Decision: route shape and cross-season data

No route in this app is season-agnostic (every content route nests under
`/:seasonCode`), and no backend endpoint aggregates a team's games across
seasons. Rather than break that pattern or add backend surface, this
route nests at `/:seasonCode/comparisons/head-to-head` (so it keeps
`SeasonLayout`'s nav/theme chrome; `:seasonCode` only seeds the range
picker's default "through" season) and fetches one season at a time via
the existing `getTeamGames(seasonCode, clubCode, { limit: 100 })` for
every season in the selected from/through range (currently two:
`E2025`, `E2026`, from `getSeasons()`), merging the results client-side -
the same technique already established for cross-season work in feature
17e's season-by-season player tab.

## In scope

- Route `/:seasonCode/comparisons/head-to-head`, lazy-loaded from
  `App.jsx` following the existing per-page `lazy(() => import(...))`
  pattern, registered as a sibling of the `comparisons` route.
- A "Head-to-head" link/button on `ComparisonsPage.jsx`'s team-comparison
  view (next to the existing team pickers, visible once both teams are
  selected) that navigates to this route with `teamA`/`teamB` prehydrated
  from the current selection.
- Team selection: two selects built from a cross-season team list (one
  `getSeasonTeams` call per season in `getSeasons()`, de-duplicated by
  `clubCode`, preferring the most recently played season's name/crest for
  display) - not the single-season list `ComparisonsPage`'s `TeamPicker`
  uses, since a club not in the currently-viewed season must still be
  selectable if it has historical meetings. Reuses the existing swap-
  button convention from 17g-i.
- A from/through season-range picker (two selects, URL-synced via a new
  `useSearchParams`-backed hook following the exact shape of
  `usePhaseParam.js`, defaulting to the full available range), each
  option clamping the other so "from" never exceeds "through."
- Data: merge `getTeamGames(season, teamA.id, { limit: 100 })` across
  every season in the selected range, then filter to games against
  `teamB.id` - generalizing this app's existing `headToHeadGames`/
  `seriesRecord`/`last10Form` helpers (`ComparisonsPage.jsx`) from single-
  season to the merged multi-season array (the helpers' logic is already
  season-agnostic; only the input array changes).
- **Hero**: both clubs' identity (crest + name) flanking the series
  record at a large size, with the completed-meeting count beneath.
- **Four-up summary grid**: series record, average margin, current streak,
  and total points scored across meetings (reusing `HeaderStats`/
  `CompactMetric`).
- **Margin timeline**: a Chart.js bar chart of each meeting's margin from
  Team A's perspective (positive = A won by that margin, negative = B
  won), ordered chronologically across seasons, following this codebase's
  established local Chart.js theming pattern (`useActiveTheme`/
  `themeColor`, no shared wrapper).
- **Momentum panel**: current streak (same "most recent same-result run"
  logic as the team page's `currentStreak` helper, generalized to this
  merged game list) plus home/away/neutral splits for Team A, where
  "neutral" means `phaseCode === "FF"` (Final Four - the only games
  played at a fixed neutral venue in this data; there is no per-game
  neutral-site flag) and everything else splits by whether Team A was the
  local team.
- **Notable meetings**: the top few meetings by score margin (biggest
  wins) and by combined score (highest scoring), each a linked card to
  its game detail page.
- **Per-season breakdown**: one row per season in the selected range
  showing that season's own meeting count and record between the two
  clubs.
- **Upcoming and latest meetings**: scheduled meetings (if any) then the
  most recent played meetings, as linked cards (season/phase badge,
  mirrored score row, winner's name tinted, `FINAL` or `VS` in the
  middle) - reusing the existing mirrored-score-row convention already in
  `ComparisonsPage.jsx`'s `TeamSeriesSection`.
- **Empty state**: when the merged, filtered meeting list is empty,
  render the copy: "These teams did not meet in this selection - try a
  wider season range," with the range picker still visible so the user
  can act on it immediately.

## Out of scope

- A "Game phase" filter select - not named in build-plan item 17g-ii's
  text (which scopes to "every meeting ... across the archived seasons",
  not a phase subset); all phases within the selected season range are
  always included.
- A competition selector - this app has one competition.
- Any backend change - every value this feature renders is already
  returned by `getTeamGames`/`getSeasonTeams`/`getSeasons`.
- Adding this as a top-level nav-bar destination - it's reached as a
  drill-down from the Comparisons page's team view, matching the
  guideline's own framing and keeping the nav bar unchanged.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (self-
review each step) and `workflow.checkpointCommits` is `disabled`.

## Build steps

- [x] 1. Add the route shell: register `/:seasonCode/comparisons/head-to-
      head` in `App.jsx`, build the new `HeadToHeadPage` with the cross-
      season team pickers (with swap), the from/through range picker, the
      merged-games fetch/filter, the hero, the four-up summary grid, and
      the empty state. Link it from `ComparisonsPage.jsx`'s team view.
      **Done when:** navigating from Comparisons with two teams selected
      opens the head-to-head route prehydrated with those teams, the hero
      and summary grid show correct values for a known pair (cross-
      checked against the merged raw game data), changing the season
      range updates the results, a team pair with no meetings shows the
      empty state, verified in the running app; `npm run build` passes.
- [x] 2. Add the margin timeline chart and the momentum panel (streak +
      home/away/neutral splits).
      **Done when:** the timeline shows one bar per meeting in
      chronological order with the correct sign and season/round labels,
      the momentum panel's streak and splits match a manual count from the
      merged game list, verified in the running app; `npm run build`
      passes.
- [x] 3. Add notable meetings, the per-season breakdown, and the upcoming/
      latest meetings cards.
      **Done when:** notable meetings show the correct biggest-margin and
      highest-scoring games, the per-season breakdown's counts sum to the
      total meeting count, latest meetings link to the correct game detail
      pages, an unplayed/upcoming meeting (if any exist in the selected
      range) appears above the latest-meetings list; verified in the
      running app; `npm run build` passes.

## Files / areas

- `frontend/src/App.jsx` - new lazy route registration.
- `frontend/src/comparisons/HeadToHeadPage.jsx` - new file, the page
  itself (kept in its own file since it's a new route, not an addition to
  an existing page's file).
- `frontend/src/comparisons/ComparisonsPage.jsx` - the new "Head-to-head"
  link, and the `headToHeadGames`/`seriesRecord`/`last10Form` helpers
  generalized for reuse (exported or duplicated with a season-merged
  input, whichever keeps `ComparisonsPage.jsx`'s existing single-season
  usage unchanged).
- `frontend/src/lib/` - a new `useSeasonRangeParams`-style hook, matching
  `usePhaseParam.js`'s existing shape.

## Data / contracts

No backend change. Reused as-is: `getSeasons()`, `getSeasonTeams
(seasonCode)`, `getTeamGames(seasonCode, clubCode, { limit, offset,
status, order })`, and the `Game` shape (`gameCode`, `phaseCode`,
`phaseName`, `roundNumber`, `roundName`, `scheduledAt`, `played`,
`localTeam`, `roadTeam`, `localScore`, `roadScore`) already used
throughout this codebase.

## Testing

- No unit test runner configured; `npm run build` is Verify for each
  step, plus direct browser verification (hero/summary values cross-
  checked against the merged raw game data, timeline sign/order, momentum
  splits, notable meetings, empty state) since there's no browser-test
  coverage for this page.
- Verify against a team pair with meetings in both archived seasons, a
  pair with meetings in only one season (confirms the per-season
  breakdown's partial case), and a pair with no meetings at all (confirms
  the empty state).

## Notes for the AI

- Build the cross-season team list and the merged-games fetch as small
  local async functions (`Promise.all` over `getSeasons()`'s season list),
  matching the established loop/merge patterns already used in
  `PlayerPage.jsx`'s `fetchSeasonStory` and `TeamPage.jsx`'s
  `fetchTeamRosterStats` - do not add a new pagination abstraction.
  `getTeamGames`'s `limit: 100` per season is already enough for a full
  season's meetings between two clubs (at most a handful of games), no
  need to paginate further.
- Reuse the Chart.js theming pattern local to each chart file rather than
  a shared wrapper, consistent with every prior feature in this codebase.
- `phaseCode === "FF"` is a proxy for neutral-site, not a guaranteed
  semantic field - note this plainly in the momentum panel's copy if it
  reads oddly for a season with no Final Four reached yet (most seasons'
  meetings will simply have zero neutral entries, which is correct, not a
  bug).

## Open questions

None - the cross-season fetch/merge pattern and route placement were
decided above from precedent already in this codebase, and every value
this feature renders is already returned by existing endpoints.

<!-- blueprint:completion {"schemaVersion":1,"specBytes":11080,"specSha256":"e06f1e0bfe736799817b15f9c64fcc8e55713027fc2390fcd321562bf9c0dbf2","branch":"refs/heads/feature/head-to-head-route","head":"114a3d0f01822c887c33d2e63a53813bf4361ba6","baseRef":"refs/heads/master","baseCommit":"114a3d0f01822c887c33d2e63a53813bf4361ba6","sourceTree":"693e466188c408ad79e35a1469aa8909d0ff27c0","absentOptional":[]} -->
