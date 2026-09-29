# Feature: Advanced stats from the new Neon tables

**From build-plan:** feature 22
**Build attempt:** 1
**Status:** verified
**Branch:** feature/advanced-stats-new-tables

> Recorded after the build, not before it. The work was done directly from the
> owner's step list (`FRONTEND_NEW_TABLES.md`, seven steps, one at a time with a
> diff shown after each) and was not run through `/feature` and `/implement`, so
> this spec was written from the finished work. Audit, Check, and independent
> review were not run (all `manual` in `blueprint/config.json`).

## Goal

Read the pipeline's 12 new advanced tables (feature 30g; public schema,
`competition_code = 'E'`, `E2025` and `E2026` only) read-only, and show them
where they belong: advanced columns on Standings, a rating trend, splits,
play-by-play, shot zones and best lineups on the team page, PER, Win Shares,
USG% by round, on/off and RAPM on the player page, and PER, Win Shares/48, RAPM
and on/off leaderboards. Show the sample size next to RAPM and on/off and hide
small samples.

## In scope

- Drizzle mappings and typed read queries for all 12 tables
  (`app_standings_stats`, `app_team_round_stats`, `app_team_round_ratings`,
  `app_team_round_splits`, `app_player_round_stats`, `app_player_round_ratings`,
  `app_player_round_win_shares`, `app_team_pbp_stats`,
  `app_team_shot_zone_stats`, `app_player_on_off`, `app_lineup_ratings`,
  `app_player_rapm`).
- Standings: an **Advanced** mode (net rating, pace, eFG%, SRS, last 10) with
  scope (regular season, all games, postseason) and round selectors; the
  default round is the scope's highest.
- Team page: an **Advanced** tab with rating by round, splits, play-by-play,
  shot zones (letters only), and best lineups filtered by club, size (2, 3, 5),
  and minimum possessions (default 100).
- Player page: an **Advanced** tab with PER, Win Shares, WS/48, USG% by round,
  on/off (one card per club), and RAPM.
- Leaders: an **Advanced** view for PER, Win Shares/48, RAPM, and on/off net
  rating with a minimum-minutes filter.
- Only `E2025` and `E2026` are offered (already true of the season list).

## Out of scope

- Any write to Neon, any DDL, and any change to the pipeline.
- Naming the shot-zone letters or drawing a court for them.
- A per-round view of the leaderboards, and league-wide team leaderboards from
  the new tables.
- Fixing the existing pages' Neon column and table renames, which shipped as
  the separate fix `blueprint/history/fixes/follow-neon-column-and-table-renames.md`.

## Build steps

- [x] **Step 1 - Types and queries.** Schema and read functions for the 12
  tables in `season-advanced-schema.ts` and `season-advanced.ts`. *Done when:*
  the backend type-checks and each query returns numbers, with NULL kept as
  null.
- [x] **Step 2 - Verify the join assumptions.** Checked `person_key` to
  `app_people` and `club_code` to `app_clubs` for every table, with one player
  (012610) and one club (OLY). *Done when:* the differences from the guide are
  reported.
- [x] **Step 3 - Standings.** `GET /:season/advanced/standings` and the
  Advanced mode. *Done when:* scope and round selectors work and the default is
  the scope's highest round.
- [x] **Step 4 - Team page.** `GET /:season/teams/:clubCode/advanced` and
  `.../lineups`, and the Advanced tab.
- [x] **Step 5 - Player page.** `GET /:season/players/:personKey/advanced` and
  the Advanced tab.
- [x] **Step 6 - Leaderboards.** `GET /:season/advanced/leaders` and the
  Advanced view on Leaders.
- [x] **Step 7 - Seasons.** Confirmed only `E2025` and `E2026` are offered and
  that other seasons are rejected; no code change was needed.

## Files / areas

- Backend: `backend/src/db/season-advanced-schema.ts` (new),
  `backend/src/db/season-advanced.ts` (new), and six routes in
  `backend/src/routes/seasons.ts`.
- Frontend: `standings/AdvancedStandingsView.jsx`,
  `teams/TeamAdvancedSection.jsx`, `players/PlayerAdvancedSection.jsx`,
  `statistics/AdvancedLeaderboard.jsx` (all new); `StandingsPage.jsx`,
  `TeamPage.jsx`, `PlayerPage.jsx`, `StatisticsPage.jsx` (a tab or toggle each);
  `lib/api.js` and `lib/format.js`.
- Plan: this item in `blueprint/build-plan.md` and the overview fingerprint.

## Data / contracts

- The tables are the pipeline's; the app only reads them. Every query filters
  `competition_code = 'E'`, the season, and the scope. Nothing sums across
  rounds or scopes; a cumulative row is read at one round.
- `NUMERIC` columns are decoded to numbers in the Drizzle column type. NULL
  stays `null` and the UI shows a dash. Percentages are fractions.
- Scopes offered are `RS`, `all`, and `PS`, and only those that have rows for
  the entity. Scopes and rounds come from the stats tables, not `app_rounds`
  (which lists unplayed rounds and has no `all` or `PS`).
- RAPM is a whole-season table (scope `all`), so its views ignore the scope
  selector.
- Endpoints validate scope, metric, size, minimum, and limit, and return 400 or
  404 with the project's error shape. Unsupported seasons return 400.
- Sample rules (constants in the components and route): on/off hidden under
  300 minutes on court; RAPM hidden under 20 minutes; leaderboard defaults are
  100 minutes for PER and WS/48, 500 for RAPM, 300 for on/off. A season with
  fewer than 10 rounds played is "early": leaderboard defaults drop to 20
  minutes and pages show a "Not reliable yet" note.

## Testing

No test runner is configured, so verification is API output, build output, and
browser evidence.

## Verification results

- `cd backend && npx tsc --noEmit` passes; `cd frontend && npx eslint .` passes;
  `npx vite build` passes.
- The live Neon columns of all 12 tables match `30g_new_tables.sql` exactly.
- Every new endpoint was called against live Neon for both seasons, including
  bad scope, size, metric, filter, unknown club and player, and unsupported
  season (400 or 404 as expected).
- The Advanced standings games played and wins/losses equal the existing
  standings for all 20 clubs in both seasons.
- Screens were opened in headless Chromium: standings Advanced, team Advanced
  (E2025 and E2026), player Advanced (E2025, E2026, and a traded player), and
  all four Advanced leaderboards. The new endpoints never failed. The first
  standings and team runs did log 503s from the older roster and season-stats
  endpoints, which the renamed columns had broken (see the fix archive); the
  player and leaderboard runs, made after that fix, logged no errors.
- `cd frontend && npm run test:browser`: 8 passed, 1 failed. The failure,
  `filter-controls.spec.js`, looks for a navigation link named "Statistics
  leaderboards", but the tab is named "Leaders"; the nav bar was not touched by
  this feature.

## Findings from the guide (all reported to the owner during the build)

- E2026 RAPM is not "within +/-0.04": Neon holds values from -5.0 to +4.9
  (penalty 500), while the data dictionary says the pipeline now uses 64,000
  for E2026. The owner chose to show it with a "Not reliable yet" note.
- E2026 has 18 played games, not 10.
- `app_rounds` cannot drive the round and scope selectors (see Data / contracts).
- The guide's claim that nothing existing was renamed was wrong; see the fix
  archive above.
- E2025 points for/against in the new tables equal the final scores in
  `app_games` (overtime included); the existing standings' figures are
  regulation-only, which differs for the 15 clubs that played overtime. The
  Advanced standings view does not show PF/PA.

## Known gaps

- E2026 RAPM in Neon is stale until the pipeline republishes; the page says so.
- Shot zones show letters only until names are agreed.
- The team rating trend reuses `TrendChart`, whose table lists every round
  under the chart, so the Advanced tab is long.
- `FRONTEND_NEW_TABLES.md` still holds the wrong claims above and is not part of
  this feature's commit.
