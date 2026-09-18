# Feature: Season statistics

**From build-plan:** feature 1d-ii
**Build attempt:** 1
**Branch:** feature/season-statistics
**Status:** verified

## Goal

Expose the available season-long EuroLeague player statistics from the four populated `etl_flat_season_stats_*` Neon tables (traditional, advanced, scoring, misc) for a season, phase, and mode, preserving each view's own rank rather than inventing one combined ranking.

## In scope

- Inspect the live `E2025` and `E2026` season-statistics tables: confirm the `mode` domain (`accumulated`, `perGame`), the `phase_code` domain (`RS`, `PI`, `PO`, `FF`, `all`), that `traditional` and `advanced` share one `entry_ordinal` ranking per person while `scoring` and `misc` share a different one, and that `person_key` is unique within a given `(season, phase, mode)` in every table (observed: 0 duplicates, 0 unmatched `traditional`-to-`advanced` rows for `E2025`).
- Map all four `etl_flat_season_stats_*` tables in Drizzle.
- Add one season-scoped, paginated season-statistics route that, per player, returns the four views as separate namespaced groups (each with its own rank/ordinal), never merging their `entryOrdinal`/`playerRanking` fields into one.
- Accept `phase` (`RS`/`PI`/`PO`/`FF`/`all`) and `mode` (`accumulated`/`perGame`) query parameters with defaults; scope every read by competition `E` and validated season.
- Keep missing source values as JSON `null`, including a season/phase/mode combination with no rows yet (for example `E2026`, before any games are played).

## Out of scope

- Official standings (`etl_flat_standings_*`): feature 1d-i, already shipped.
- Frontend statistics/leaderboard screens (feature 8) and any derived team-level aggregation (no team season-stats table exists in the source).
- Recomputing a combined ranking across the four views, or reconciling `entryOrdinal` differences between them.
- Officials, venues, playoff bracket data, write operations, source repairs, migrations, new dependencies, and a test runner.

## Build loop

Use the configured Efficient workflow on `feature/season-statistics`: implement the small steps, run relevant checks, and present one review packet after all steps. Step checkpoint commits are disabled. `/complete` creates the final feature commit after approval.

## Build steps

- [x] **1. Verify source and build the season-statistics query.** Read the live source without mutation and confirm the `mode`/`phase_code` domains, the entry-ordinal divergence between `{traditional, advanced}` and `{scoring, misc}`, and numeric/text formats. Extend the schema with all four tables and add a season+phase+mode-scoped, paginated query that joins `etl_flat_season_stats_traditional` (the anchor: player identity and row membership) with the other three tables by `person_key`. **Done when:** `cd backend && npm run build` passes; a season/phase/mode with data returns one entry per `etl_flat_season_stats_traditional` row for that scope, ordered by the anchor's `entryOrdinal` then `personKey`, bounded by pagination; a per-player sub-object is `null` when that table has no matching row for the person; a season/phase/mode with no rows returns an empty page without error; source numeric/text values are preserved per the documented contract.
- [x] **2. Integrate HTTP validation and verify contracts.** Add `GET /api/seasons/:seasonCode/season-stats` to the season router with `phase` (default `all`) validated against the fixed `RS`/`PI`/`PO`/`FF`/`all` set, `mode` (default `accumulated`) validated against `accumulated`/`perGame`, and the existing pagination validation. Inspect live API responses for `E2025` across at least two phase/mode combinations and for `E2026`, and prove the invalid-phase/invalid-mode paths. **Done when:** `cd backend && npm run build` passes; the route has its documented shape, ordering, pagination, and error behavior for valid/invalid phase, valid/invalid mode, valid/invalid/unsupported season, and valid/invalid pagination; `GET /api/seasons`, existing identity/game/standings routes, and `GET /api/health` retain their responses.

## Files / areas

- `backend/src/db/season-schema.ts` for the four season-statistics table Drizzle mappings.
- `backend/src/db/season-stats.ts` (new) for the season+phase+mode-scoped, paginated season-statistics query.
- `backend/src/routes/seasons.ts` for the new season-statistics route and validation/error integration.
- `create_v2_v3_tables.sql` is a read-only schema reference; do not run or edit it.

## Data / contracts

`GET /api/seasons/:seasonCode/season-stats?phase=<RS|PI|PO|FF|all>&mode=<accumulated|perGame>&limit=&offset=` validates the season (`400 INVALID_SEASON` / `404 SEASON_NOT_FOUND`, existing behavior). `phase` defaults to `all` and must be one of `RS`, `PI`, `PO`, `FF`, `all`; any other value returns `400 INVALID_PHASE`. `mode` defaults to `accumulated` and must be `accumulated` or `perGame`; any other value returns `400 INVALID_MODE`. `limit`/`offset` reuse the existing pagination rule: omitted `limit` is 50, omitted `offset` is 0; `limit` 1-100, `offset` 0-10000; malformed or duplicate values return `400 INVALID_QUERY`; fetch at most one extra row to determine `hasMore`.

Success JSON:

```
{
  "phase": string,
  "mode": string,
  "players": [StatsEntry],
  "pagination": { "limit": number, "offset": number, "hasMore": boolean }
}
```

`StatsEntry`, ordered by the anchor `traditional.entryOrdinal` then `personKey`:

| Field | Type | Source |
| --- | --- | --- |
| `personKey` | string | `etl_flat_season_stats_traditional.person_key` |
| `clubCode`, `playerName`, `playerAge`, `playerImageUrl`, `clubName`, `clubTvCodes`, `clubImageUrl` | various \| null | `etl_flat_season_stats_traditional` (the anchor row's own identity fields; not re-fetched from the other three views) |
| `traditional` | object | `etl_flat_season_stats_traditional`: `playerRanking`, `entryOrdinal`, `gamesPlayed`, `gamesStarted`, `minutesPlayed`, `pointsScored`, `twoPointersMade`, `twoPointersAttempted`, `twoPointersPercentage`, `threePointersMade`, `threePointersAttempted`, `threePointersPercentage`, `freeThrowsMade`, `freeThrowsAttempted`, `freeThrowsPercentage`, `offensiveRebounds`, `defensiveRebounds`, `totalRebounds`, `assists`, `steals`, `turnovers`, `blocks`, `blocksAgainst`, `foulsCommited`, `foulsDrawn`, `pir` |
| `advanced` | object \| null | `etl_flat_season_stats_advanced`: `playerRanking`, `entryOrdinal`, `gamesPlayed`, `minutesPlayed`, `effectiveFieldGoalPercentage`, `trueShootingPercentage`, `offensiveReboundsPercentage`, `defensiveReboundsPercentage`, `reboundsPercentage`, `assistsToTurnoversRatio`, `assistsRatio`, `turnoversRatio`, `twoPointAttemptsRatio`, `threePointAttemptsRatio`, `freeThrowsRate`, `possessions` |
| `scoring` | object \| null | `etl_flat_season_stats_scoring`: `playerRanking`, `entryOrdinal`, `gamesPlayed`, `gamesStarted`, `twoPointAttemptsShare`, `threePointAttemptsShare`, `freeThrowsAttemptsShare`, `twoPointersMadeShare`, `threePointersMadeShare`, `freeThrowsMadeShare`, `twoPointRate`, `threePointRate`, `pointsFromTwoPointersPercentage`, `pointsFromThreePointersPercentage`, `pointsFromFreeThrowsPercentage` |
| `misc` | object \| null | `etl_flat_season_stats_misc`: `playerRanking`, `entryOrdinal`, `gamesPlayed`, `gamesStarted`, `wins`, `losses`, `minutesPlayed`, `doubleDoubles`, `tripleDoubles` |

`traditional` is present for every entry (it is the anchor); `advanced`/`scoring`/`misc` are each `null`, independently, when that table has no row for the person in this season/phase/mode. Their `playerRanking`/`entryOrdinal` are never merged with `traditional`'s, because `scoring`/`misc` share a different ranking than `traditional`/`advanced` (confirmed live). All `NUMERIC` source columns (games/minutes/percentages/shares/ratios/rates/possessions/wins/losses/double-doubles/triple-doubles) are preserved as decimal strings; `INTEGER` columns (`player_ranking`, `entry_ordinal`, `player_age`) stay numbers. Database failures return `503 DATABASE_UNAVAILABLE`; unexpected failures return `500 INTERNAL_ERROR`, using the existing `{ "error": { "code": string, "message": string } }` envelope. Preserve `ROUTE_NOT_FOUND` for unmatched season-router paths.

## Testing

- No Verify command, test command, or test runner is configured. Run `cd backend && npm run build` after each step and before review; do not add a runner in this feature.
- Use read-only live source inspection and API requests for both seasons. Check: `E2025` with default `phase`/`mode`, an explicit `phase=RS&mode=perGame`, an invalid `phase` value, an invalid `mode` value, `E2026` (expect an empty page, no error), pagination boundaries, and an unsupported/invalid season.
- If live data cannot exercise a per-view-null-while-others-present case, prove it with an isolated fixture or record it as unobserved. Do not modify Neon to manufacture data.

## Notes for the AI

- Reuse `DB_URL`, Drizzle client, `catalogRead`, `CatalogDatabaseError`, `SUPPORTED_SEASONS`, and the season router's pagination helper. Keep HTTP handlers focused on request validation and responses.
- Do not reuse or extend `season-standings.ts`, `season-games.ts`, or `season-identities.ts`; this feature's query module is self-contained in `season-stats.ts`.
- Join the four tables by `(competition_code, season_code, phase_code, mode, person_key)`, never by `entry_ordinal` — `entry_ordinal` is a per-table rank, not a stable join key across tables.
- Frontend leaderboard work (feature 8) is out of scope; keep this feature to the four season-statistics tables only.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9596,"specSha256":"5f4e57264c1ffef8658b09cbbe81fca38c1d428e523ab41e0a90bd05eeca14dd","branch":"refs/heads/feature/season-statistics","head":"a23b5279dd6c93af2bb385ff74218b04c05fdba5","baseRef":"refs/heads/master","baseCommit":"a23b5279dd6c93af2bb385ff74218b04c05fdba5","sourceTree":"173e5848e8e627150250e8e784fee16e3b84dc7f","absentOptional":[]} -->
