# Feature: Teams and players

**From build-plan:** feature 12c
**Build attempt:** 1
**Status:** verified
**Branch:** feature/teams-and-players

## Goal

Apply the shared design system established in feature 12a/12b (tokens and
component classes already in `frontend/src/index.css`) to the team detail
and player detail pages, so their roster/schedule/game-log tables and
results lists read with the same visual hierarchy already shipped
elsewhere. The team directory and player search list get list/panel
consistency where they're still plain rows.

## Design reference

None. No new `prototypes/` mockups; reuses `.panel`, `.stat-badge`,
`.stat-badge-neutral` exactly as shipped in 12a/12b, and reuses the
winner/score-pill row pattern already live in
`frontend/src/games/FixturesPage.jsx`.

## In scope

- `frontend/src/teams/TeamPage.jsx`: compact (`tabs-sm`) phase tabs
  (matching `StandingsPage.jsx`/`FixturesPage.jsx`), `RosterSection`'s table
  wrapped in a `.panel` (matching `StandingsTable.jsx`'s treatment), and
  `ScheduleSection`'s list restyled with the exact winner/score-pill pattern
  from `FixturesPage.jsx` (panel wrapper, bold winning team, `.stat-badge-neutral`
  score pill, "Not yet played" as plain text).
- `frontend/src/players/PlayerPage.jsx`: compact (`tabs-sm`) phase and
  stats-mode tabs, and `GameLogSection`'s table wrapped in a `.panel`.
- `frontend/src/players/PlayersPage.jsx`: the player list wrapped in a
  `.panel` (matching the fixtures list treatment from 12b).

## Out of scope

- `frontend/src/teams/TeamsPage.jsx`: no changes. Its team directory already
  uses DaisyUI `card card-border` tiles with a `hover:border-primary` accent,
  which already matches the established panel/card visual language from
  12a - there's no plain-text list here to restyle.
- `SeasonRecordSection` and `TeamStatisticsSection` in `TeamPage.jsx`, and
  `StatGrid` (used for Traditional/Advanced/Scoring/Misc) in `PlayerPage.jsx`:
  no changes. These `<dl>` grids already pair a muted uppercase-ish label
  with a `font-semibold` value for every metric - the same label/value
  hierarchy pattern used throughout the app - and turning every one of their
  8-10 fields into a `.stat-callout` would be visual noise, not emphasis.
- `RegistrationsSection`'s active/inactive status pill in `PlayerPage.jsx`:
  stays exactly as the existing DaisyUI `badge badge-success`/`badge-ghost`
  usage; do not rename or restyle it (protected the same way in 12a/12b).
- Statistics leaderboards, comparisons/trends, and playoffs pages (12d-12e).
- Any new API endpoint, query, derived statistic, CSS token, or component
  class. Everything needed (`.panel`, `.stat-badge`, `.stat-badge-neutral`)
  already exists from 12a/12b.
- Changing route paths, query keys, search/pagination behavior, or any
  other behavioral contract - this is a presentational restyle only.

## Build loop

Follow `workflow.stepReview: "feature"` (one review packet after all steps)
and `workflow.checkpointCommits: "disabled"` (no per-step commits; `/complete`
makes the single work commit).

## Build steps

- [x] 1. Restyle `TeamPage.jsx`: change the phase tabs to `tabs-sm`, wrap
  `RosterSection`'s `<table>` in a `.panel overflow-x-auto p-2` container
  (matching `StandingsTable.jsx`), and restyle `ScheduleSection`'s list with
  the panel treatment from `FixturesPage.jsx`, adapted for a single-opponent
  row (wrap the `<ul>` in a `.panel p-4`; for a played game, show the score
  as a `.stat-badge-positive` pill when the viewed team won and
  `.stat-badge-negative` when it lost, using the existing `opponent()`
  `home` flag plus `game.localScore`/`game.roadScore`; keep plain
  "Not yet played" text for unplayed games). Keep
  all query/loading/error/empty logic in every section unchanged. Done when:
  a team with roster, schedule, and standings data shows the restyled
  sections with no missing or duplicated information versus today, and each
  section's loading/error/empty states still render correctly.
- [x] 2. Restyle `PlayerPage.jsx`: change the phase tabs and stats-mode tabs
  to `tabs-sm`, and wrap `GameLogSection`'s `<table>` in a
  `.panel overflow-x-auto p-2` container. Keep all query/loading/error/empty
  logic unchanged. Done when: a player with season stats and a game log
  shows the restyled game log table with no missing columns or data versus
  today, and loading/error/empty states still render correctly.
- [x] 3. Restyle `PlayersPage.jsx`: wrap the player list `<ul>` in a
  `.panel p-4` (search input and pagination controls stay outside the
  panel, matching how `FixturesPage.jsx` keeps its filters outside the
  panel). Keep the search/pagination logic and empty/error states
  unchanged. Done when: a search with results shows the list inside a
  panel, and an empty-search-results state still renders its message.
- [x] 4. Verify both themes and run the smoke check. Toggle to
  `light-euroleague` and confirm the restyled team detail, player detail,
  and players list pages read correctly in both themes; also spot-check the
  unmodified `TeamsPage.jsx` still looks consistent alongside them. Run
  `cd frontend && npm run test:browser` and confirm the existing smoke test
  still passes unmodified. Done when: both themes look correct on a team
  detail page, a player detail page, and the players list, and
  `npm run test:browser` passes.

## Files / areas

- `frontend/src/teams/TeamPage.jsx`
- `frontend/src/players/PlayerPage.jsx`
- `frontend/src/players/PlayersPage.jsx`

## Data / contracts

No API, data model, or CSS token changes. Reuses `.panel`, `.stat-badge`,
and `.stat-badge-neutral` exactly as defined in `frontend/src/index.css` by
feature 12a.

## Testing

No test runner is configured for frontend logic, and this feature adds no
logic - nothing here meets the unit test scope rule. `Browser tests`
(`cd frontend && npm run test:browser`) is configured; step 4 runs the
existing smoke test as regression evidence. No new Playwright spec is
added: this feature touches no new behavioral surface beyond what the
smoke test and manual verification already cover.

## Notes for the AI

- `TeamPage.jsx`'s `ScheduleSection` shows only the opponent's name per row
  (not two team names like `FixturesPage.jsx`), so the win/loss signal
  belongs on the score pill, not on bolded team names: reuse the existing
  `.stat-badge-positive`/`.stat-badge-negative` classes (already defined in
  `frontend/src/index.css` from 12a, used so far only in the dashboard's
  leaders panel) rather than the neutral pill `FixturesPage.jsx` uses for
  two-named rows. `ScheduleSection` already has the `opponent(game, clubCode)`
  helper returning `{ team, home }`; derive whether the viewed team won from
  `home ? game.localScore > game.roadScore : game.roadScore > game.localScore`
  with the same `!= null` null-score guards used elsewhere, gated on
  `game.played`.
- `RosterSection` and `GameLogSection` are direct analogues of
  `StandingsTable.jsx`/`TeamStatsTable`'s panel treatment from 12a/12b -
  wrap the same way, no new patterns.
- Do not touch `frontend/src/teams/TeamsPage.jsx` - see Out of scope.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7148,"specSha256":"f649e69ff681c5045ab544442b317403622da5ecc1d18a31f70d2ef8b315b7b8","branch":"refs/heads/feature/teams-and-players","head":"18e6d086cd1b6bdb0ca63176913331645ad67482","baseRef":"refs/heads/master","baseCommit":"18e6d086cd1b6bdb0ca63176913331645ad67482","sourceTree":"f78ad8a73c8a40e2b5210c7b9cfcc8f4bb22785e","absentOptional":[]} -->
