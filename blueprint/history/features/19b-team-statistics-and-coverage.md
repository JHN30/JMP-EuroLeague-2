# Feature: Team statistics and coverage

**From build-plan:** feature 19b
**Build attempt:** 1
**Branch:** `feature/team-statistics-and-coverage`
**Status:** verified

## Goal

Use the pipeline-owned `app_team_season_stats`, `app_coverage_seasons`, and
`app_coverage_games` tables for the existing team-statistics and coverage API
contracts in `E2025` and `E2026`, preserving missing values and exposing the
pipeline's real shot-location and play-by-play coverage counts.

## In scope

- Add Drizzle mappings for the three page-shaped tables documented in
  `DATA_DICTIONARY.md`, with their full competition-and-season keys.
- Replace the API's per-request team-stat aggregation with a scoped lookup from
  `app_team_season_stats` while retaining the current camel-cased response
  shape used by Team Detail.
- Replace the API's eight-query coverage calculation with the matching season
  or game coverage row and retain the current `{ scope, items }` response.
- Convert PostgreSQL numeric strings to JSON numbers only when a value exists;
  keep unavailable team measures as `null` rather than zero.
- Make Team Detail's Statistics and Shooting calculations null-safe so missing
  source measures render with the shared missing-value treatment.
- Verify live behavior for both supported seasons and at least one game-scoped
  coverage row per season.

## Out of scope

- `app_records_*` and `app_players`; archive-wide records and player careers
  remain deferred until the intended historical seasons are loaded.
- Play-by-play logs, game-flow reconstruction, shot maps, and shooting-studio
  UI from feature 18.
- `app_postseason_series`, the Format page, and navbar changes from 19c/19d.
- Publishing data, changing the ETL, dropping compatibility views, or deleting
  any `etl_flat_*` object.
- Changing supported competitions or exposing seasons other than `E2025` and
  `E2026`.

## Build loop

- Review cadence: review the complete feature after all steps
  (`workflow.stepReview: feature`).
- Checkpoint commits are disabled; `/complete` owns the final feature commit.
- Keep the existing public routes and frontend query keys stable throughout.

## Build steps

- [x] 1. Map and read the pipeline-owned team-statistics table.
  - Add `app_team_season_stats` to `backend/src/db/season-schema.ts` with the
    documented composite key and all 20 own/opponent measures.
  - Replace `getTeamStatsSummary`'s games/box-score aggregation with one query
    scoped by competition, season, phase, and club.
  - Adapt snake-case numeric columns to the existing `phaseCode`,
    `gamesPlayed`, `own`, and `opponent` response. Convert present numerics to
    numbers and retain absent numerics as `null`.
  - For a valid team/phase with no aggregate row, return zero games with null
    measures so the existing no-games state remains truthful.
  - **Done when:** the backend builds, the route no longer aggregates game rows,
    and representative `E2025` and `E2026` team-stat responses retain the
    public shape without replacing missing measures with zero.

- [x] 2. Read and validate season/game coverage rows.
  - Add `app_coverage_seasons` and `app_coverage_games` mappings with typed
    JSONB coverage items and their season/game primary keys.
  - Replace `getCoverage`'s derived counts with one season or game lookup,
    preserving the requested `scope` object and the pipeline-provided item
    order, labels, statuses, and counts.
  - Narrow the JSONB value at runtime using repository-native checks: require
    the eight documented items, supported status values, string keys/labels,
    and finite non-negative integer counts. Treat a missing or malformed row as
    an unexpected database failure so the existing API/UI error state appears;
    never fabricate all-unavailable coverage.
  - **Done when:** the backend builds and live season/game responses for both
    supported seasons contain the eight pipeline items, with shot-location and
    play-by-play counts no longer hard-coded to unavailable.

- [x] 3. Preserve honest nullable presentation on Team Detail.
  - Update `frontend/src/teams/TeamPage.jsx` arithmetic helpers and advanced
    calculations so a missing operand stays missing instead of being coerced
    to zero; keep the existing no-games, loading, and retryable error states.
  - Add focused browser coverage for a team-stat response containing nullable
    measures and retain the existing coverage-panel behavior test.
  - **Done when:** Statistics and Shooting render em dashes for unavailable
    measures, valid zeroes remain zeroes, derived percentages are withheld when
    an operand is missing, and the focused browser tests pass.

- [x] 4. Run the feature verification pass.
  - Run backend TypeScript build, frontend lint/build, and the focused Playwright
    coverage/team-stat tests.
  - Against the configured Neon database, exercise season and game coverage plus
    team statistics for `E2025` and `E2026`; confirm competition/season scoping,
    response compatibility, nullable values, and real event/shot counts.
  - Re-run the tracked-runtime search for `etl_flat_*` and record that this app
    has no dependency on a legacy compatibility name. Do not drop any view in
    this feature.
  - **Done when:** all available checks pass and the captured API evidence shows
    both supported seasons reading the new page-shaped tables without changing
    the existing route URLs.

## Files / areas

- `backend/src/db/season-schema.ts`
- `backend/src/db/season-games.ts`
- `backend/src/db/season-coverage.ts`
- `backend/src/routes/seasons.ts` only if response/error wiring must change
- `frontend/src/teams/TeamPage.jsx`
- `frontend/e2e/coverage-panel.spec.js`
- `frontend/e2e/team-stats-null.spec.js`

## Data / contracts

- Every lookup uses `competition_code = 'E'` plus the requested supported
  `season_code`; team statistics also use `phase_code` and `club_code`, and game
  coverage uses `game_code`.
- `app_team_season_stats` is the sole owner of team aggregate values. The API
  performs naming/type adaptation only and does not recompute totals.
- Team-stat API shape remains
  `{ phaseCode, gamesPlayed, own: <20 measures>, opponent: <20 measures> }`;
  each measure is `number | null`.
- Coverage API shape remains
  `{ scope: { seasonCode, gameCode }, items: CoverageItem[] }`, where the item
  list comes from the selected coverage table and must satisfy the documented
  eight-item contract.
- A valid no-games team selection is a successful empty state. A missing or
  malformed required coverage row is an unexpected server error, not an empty
  or fabricated coverage response.

## Testing

- `cd backend && npm run build`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm run test:browser -- coverage-panel.spec.js team-stats-null.spec.js`
- Live read-only API checks against Neon for season coverage, game coverage, and
  team statistics in `E2025` and `E2026`.
- No unit-test runner is configured; do not add one in this feature.

## Notes for the AI

- `DATA_DICTIONARY.md` is authoritative for the table names, keys, JSONB order,
  and status rules. Live Neon verification established that the team-stat
  shooting columns follow the existing `made2`/`attempted2` and
  `made3`/`attempted3` convention without an underscore before the digit.
- Feature 19a required no new implementation: commit `4a9cb72` already mapped
  clean `app_*` names and consolidated standings, and tracked runtime code has
  no `etl_flat_*` reference.
- Do not read or filter the all-history record tables for the current two-season
  prototype; their global ranking ordinals would make a filtered result
  misleading.
- Reuse the existing `CatalogDatabaseError`/route error handling and add no new
  dependency or generic repository layer.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7836,"specSha256":"0724b04c8c7b38343263acd0f1c15571df8a265a96c1e4095a83e055d7e68e60","branch":"refs/heads/feature/team-statistics-and-coverage","head":"09a5b974ab985efe567763bc20de7aafce26a831","baseRef":"refs/heads/master","baseCommit":"09a5b974ab985efe567763bc20de7aafce26a831","sourceTree":"7cab09f9992425025da429c3840792fff0ac18c4","absentOptional":[]} -->
