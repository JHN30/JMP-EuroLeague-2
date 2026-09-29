# Fix: Follow the Neon column and table renames

**Type:** Fix
**Status:** verified
**Branch:** feature/advanced-stats-new-tables

> Recorded after the fix, not before it. It was made on the same branch as
> feature 22 (`blueprint/history/features/22-advanced-stats-new-tables.md`)
> because that work found it, but it is its own commit.

## The problem

The pipeline's in-place Neon migration of 2026-09-28 renamed tables and columns
the app reads. The Drizzle schema still used the old names, so every query that
touched them failed and the API answered 503 (`catalogRead` hides the database
error):

- `app_season_stats_traditional`, `_advanced`, `_scoring`, and `_misc` became
  `app_season_player_stats_*`, with `points_scored` now `points`,
  `fouls_commited` now `fouls_committed`, and `possesions` now `possessions`.
- `dorsal` became `jersey_number` in `app_registrations`, `app_play_by_play`,
  and `app_game_player_stats`.
- In `app_game_team_stats` and `app_game_player_stats`: `time_played` became
  `seconds_played`, `valuation` `pir`, `field_goals_made2/attempted2`
  `two_pointers_made/attempted`, `field_goals_made3/attempted3`
  `three_pointers_made/attempted`, `field_goals_made_total/attempted_total`
  `field_goals_made/attempted`, `assistances` `assists`, `blocks_favour`
  `blocks`, `fouls_commited` `fouls_committed`, and `fouls_received`
  `fouls_drawn`.

Rosters, the Leaders page, player pages, box scores, and records were down.

## The fix

Change only the SQL names in `backend/src/db/season-schema.ts`. The TypeScript
property names stay the same, so the API responses and the frontend are
unchanged.

Must not break:

- **The API response shapes.** No field is renamed in any response.
- **Neon.** No DDL, push, or migration; the app only reads.

## Verify

- Every table in `season-schema.ts` was compared with its live Neon columns
  before and after the change.
- 23 existing endpoints (teams, roster, team games and stats, players,
  registrations, player games, season stats in several modes, games, box score,
  play-by-play, shots, the three record types, postseason series, coverage,
  standings, phases) all return 200 with populated values.
- The roster, Statistics, and Games tabs of a player page load in the browser
  with no errors.
- `cd backend && npx tsc --noEmit` passes.

## Known gaps

- `app_registrations` also gained columns the app does not read
  (`start_at`, `end_at`, and others). They were left alone.
- Values that the source did not record are now NULL instead of 0, as the data
  dictionary describes. The pages already show a dash for NULL.
