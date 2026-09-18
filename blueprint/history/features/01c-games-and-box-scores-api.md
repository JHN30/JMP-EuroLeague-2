# Feature: Games and box scores API

**From build-plan:** feature 1c
**Build attempt:** 1
**Branch:** feature/games-and-box-scores-api
**Status:** verified

## Goal

Expose read-only, season-scoped EuroLeague fixtures/results and the available game box-score records from the populated Neon tables. Preserve source uncertainty in scheduled dates, game status, scores, team data, and player statistics rather than filling gaps or assigning a result.

## In scope

- Inspect the live `E2025` and `E2026` game and box-score table definitions, sample rows, row counts, `side` and `stats_kind` values, join coverage, nullable fields, and PostgreSQL numeric serialization without changing source data.
- Map the selected `etl_flat_games`, `etl_flat_game_period_scores`, `etl_flat_game_team_stats`, and `etl_flat_game_player_stats` columns in Drizzle.
- Add bounded season game-list and game-detail routes plus a route for a known game's available period scores, team statistics, and player statistics.
- Scope every read and every game lookup by competition `E` and validated season. Select only fields returned to clients, bind all values through Drizzle, and make all list ordering deterministic.
- Keep missing source values as JSON `null`, including a game with unavailable score, status, schedule, team metadata, or partial/no box-score rows.

## Out of scope

- Frontend fixtures, result, game-detail, team, player, standings, or leaderboard screens.
- Fixture filtering/browsing UX by phase, round, or source status. Feature 5 owns that user-facing behavior.
- Officials, venues, social-feed data, game write operations, source repairs, migrations, new dependencies, and a test runner.
- Calculating winner, possession, advanced metrics, period totals, or a final score when the source does not provide it.

## Build loop

Use the configured Efficient workflow on `feature/games-and-box-scores-api`: implement the small steps, run relevant checks, and present one review packet after all steps. Step checkpoint commits are disabled. `/complete` creates the final feature commit after approval.

## Build steps

- [x] **1. Verify source and expose games.** Read the live source without mutation and document the observed game identifiers, schedule/status/score semantics, source nullability, season counts, and numeric driver values used by the response mapping. Extend the schema and add season-scoped paginated game list and detail queries. **Done when:** `cd backend && npm run build` passes; both seasons return only competition `E` games in stable schedule-then-game-code order; the list is bounded; nullable source fields remain `null`; a valid unknown game, invalid game code, invalid pagination, missing/unsupported season, and database failure yield the specified safe JSON errors; existing catalog, team, player, and health routes still respond.
- [x] **2. Expose available box scores.** Map period-score, team-stat, and player-stat records, then return them only for a known game in the selected season. Preserve each source row and `side`/`statsKind`; do not merge, infer, or synthesize a score or player identity. **Done when:** `cd backend && npm run build` passes; both seasons return deterministic, non-duplicated records with no cross-season rows; an existing game with no source rows returns empty arrays; nullable source values and source numeric serialization follow the documented contract; invalid/unknown paths and database failures use safe JSON errors; existing routes remain functional.
- [x] **3. Integrate HTTP validation and verify contracts.** Wire the query module through the existing season router using the shared season check, safe error envelope, and malformed-path handling. Inspect live API responses where source data is available and otherwise prove edge paths with an isolated fixture or describe the unobserved source case. **Done when:** `cd backend && npm run build` passes; every documented route has its stated shape, ordering, pagination, error code, season isolation, and safe failure behavior; `GET /api/seasons`, existing identity routes, and `GET /api/health` retain their responses.

## Files / areas

- `backend/src/db/season-schema.ts` for game and box-score Drizzle mappings.
- `backend/src/db/season-games.ts` for selected, season-scoped game and box-score reads.
- `backend/src/routes/seasons.ts` for nested game routes and validation/error integration.
- `create_v2_v3_tables.sql` is a read-only schema reference; do not run or edit it.

## Data / contracts

All routes are `GET` under the existing season router and validate the existing `E2025`/`E2026` catalog before querying. `gameCode` is a URL path segment and must be a positive decimal integer with no sign, fraction, duplicate value, or unsafe integer representation. Invalid values return `400 INVALID_GAME_CODE`; a valid absent game returns `404 GAME_NOT_FOUND`.

| Request | Success JSON | Ordering |
| --- | --- | --- |
| `/api/seasons/:seasonCode/games?limit=50&offset=0` | `{ "games": [Game], "pagination": { "limit": number, "offset": number, "hasMore": boolean } }` | `scheduledAt` (null last), then `gameCode` |
| `/api/seasons/:seasonCode/games/:gameCode` | `{ "game": Game }` | Single record |
| `/api/seasons/:seasonCode/games/:gameCode/box-score` | `{ "periodScores": [PeriodScore], "teamStats": [TeamStat], "playerStats": [PlayerStat] }` | Period scores: `periodNumber`, `side`; team stats: `side`, `statsKind`; player stats: `side`, player display name (null last), then `personKey` |

`Game` preserves the selected identity, phase, group, round, schedule, played/status, score, and home/away source fields. It represents its two sides as nullable source-backed team objects, never as joined or invented team records. The exact selected fields must be confirmed against the live data in step 1 and documented in the query module.

`PeriodScore` contains `side`, `periodNumber`, and nullable `score`. `TeamStat` contains `side`, `statsKind`, nullable coach fields, and the selected nullable box-score measures. `PlayerStat` contains `side`, `personKey`, nullable source player/club/profile fields, starter flags, and the selected nullable box-score measures. Preserve PostgreSQL `NUMERIC` response values as nullable decimal strings unless the live driver inspection in step 1 proves an existing repository-native numeric mapping; do not round or coerce a source statistic silently.

For paginated game lists, omitted `limit` is 50 and omitted `offset` is 0. Accept decimal integers only: `limit` 1 through 100 and `offset` 0 through 10000. Reject duplicate values, fractions, signs, and other malformed values with `400 INVALID_QUERY`. Fetch at most one extra row to determine `hasMore`; never return an unbounded game list.

An invalid or unsupported season returns `400 INVALID_SEASON`; a supported season absent from the source returns `404 SEASON_NOT_FOUND`. A known game with no period/team/player records returns the three empty arrays, never `404`. Database failures return `503 DATABASE_UNAVAILABLE`; unexpected failures return `500 INTERNAL_ERROR`. Keep the existing `{ "error": { "code": string, "message": string } }` envelope without SQL, connection details, or stack traces. Preserve `ROUTE_NOT_FOUND` for unmatched season-router paths.

## Testing

- No Verify command, test command, or test runner is configured. Run `cd backend && npm run build` after each step and before review; do not add a runner in this feature.
- Use read-only live source inspection and API requests for both seasons. Check season isolation, deterministic ordering, pagination boundaries, known/unknown game paths, null source values, games with no stats, multiple `statsKind` rows, `side` values, malformed encoding, and safe database failures.
- If live data lacks an edge case, prove the code path with an isolated fixture or record it as unobserved. Do not modify Neon to manufacture data.

## Notes for the AI

- Reuse `DB_URL`, Drizzle client, `catalogRead`, `CatalogDatabaseError`, `SUPPORTED_SEASONS`, and the season router. Keep HTTP handlers focused on request validation and responses.
- The current `games` schema mapping supports the catalog's phase lookup. Extend it without breaking `getPhases`.
- Each game/score/stat query must include competition and season, including every detail lookup. Do not join or identify a game with `game_code` alone.
- Keep Feature 5's phase/round/status browsing and all frontend work out of this implementation.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8482,"specSha256":"35b0a1c73e12b4c91a2313a1e7f63b06f55f75a28108ae2e4fedb2c06ac36065","branch":"refs/heads/feature/games-and-box-scores-api","head":"b0e44c381375192e2b7dda81d0485adb47ed7626","baseRef":"refs/heads/master","baseCommit":"b0e44c381375192e2b7dda81d0485adb47ed7626","sourceTree":"c6f3aea1ffb4a5382df95ebed104d4574d27c713","absentOptional":[]} -->
