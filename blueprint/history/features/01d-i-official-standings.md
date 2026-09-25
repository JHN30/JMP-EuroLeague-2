# Feature: Official standings

**From build-plan:** feature 1d-i
**Build attempt:** 1
**Branch:** feature/official-standings
**Status:** verified

## Goal

Expose the official, round-scoped EuroLeague standings for a season and phase from the seven populated `app_standings_*` Neon tables: basic record, calendar-based record, streaks, ahead/behind splits, scoring margins, calendar streak history, and recent form. Preserve each source table's own values, including its own `position`, rather than inventing one merged ranking.

## In scope

- Inspect the live `E2025` and `E2026` standings tables: confirm round coverage (observed: `E2025`/`RS` has snapshots for rounds 1-38; `E2026` has none yet), confirm `position`/`games_played`/`qualified` can differ between the five per-round tables even when they agree today, and confirm value formats (`win_percentage`/`wins_percentage` as decimal-string `NUMERIC`, W-L split fields such as `home_record` and `quater1_ahead` as free-form `TEXT`).
- Map all seven `app_standings_*` tables in Drizzle.
- Add one season- and phase-scoped standings route that, per club, returns the five per-round views as separate namespaced groups (never merging their `position`/`qualified`/record fields into one), plus that club's ordered streak-history and recent-form lists.
- Default to the latest round that actually has standings data for the requested season and phase; accept an explicit round from the phase's known round catalog.
- Scope every read by competition `E` and validated season; keep missing source values as JSON `null`, including a supported season/phase with no standings snapshots yet.

## Out of scope

- Season statistics (`app_season_stats_*`): feature 1d-ii.
- Frontend standings screens (feature 4) and any tie-break explanation UI.
- Recomputing or reconciling a single "true" position across the five views; each is returned as its source reports it.
- Officials, venues, playoff bracket data, write operations, source repairs, migrations, new dependencies, and a test runner.

## Build loop

Use the configured Efficient workflow on `feature/official-standings`: implement the small steps, run relevant checks, and present one review packet after all steps. Step checkpoint commits are disabled. `/complete` creates the final feature commit after approval.

## Build steps

- [x] **1. Verify source and build the standings query.** Read the live source without mutation and confirm round/phase coverage, per-table `position` divergence risk, and numeric/text formats. Extend the schema with all seven tables and add a season+phase+round-scoped query that joins `app_standings_basicstandings` (the club roster for that round) with the other four same-key tables by `club_code`, and gathers ordered `streakHistory`/`form` lists per club from `app_standings_calendar_streaks`/`app_standings_basic_form`. **Done when:** `cd backend && npm run build` passes; a round with data returns one entry per `app_standings_basicstandings` club, ordered by `groupName` then `basic.position` (nulls last) then `clubCode`; a per-club sub-object is `null` when that table has no matching row for the round; `streakHistory`/`form` are ordered by their ordinal and empty when absent; a season/phase with no standings rows returns an empty list without error; source numeric/text values are preserved per the documented contract.
- [x] **2. Integrate HTTP validation and verify contracts.** Add `GET /api/seasons/:seasonCode/phases/:phaseCode/standings` to the season router, reusing the existing season and phase validation (season via `requestedSeason`, phase via `getPhases`) and adding round-query validation against the phase's known rounds from `getRounds`. Inspect live API responses for `E2025`/`RS` and `E2026`, and prove the no-round-catalog-match and no-standings-data paths with an isolated fixture if live data cannot exercise them. **Done when:** `cd backend && npm run build` passes; the route has its documented shape, ordering, round default/selection, and error behavior for valid/invalid/omitted round, valid/invalid phase, and valid/invalid/unsupported season; `GET /api/seasons`, existing identity/game routes, and `GET /api/health` retain their responses.

## Files / areas

- `backend/src/db/season-schema.ts` for the seven standings-table Drizzle mappings.
- `backend/src/db/season-standings.ts` (new) for the season+phase+round-scoped standings query.
- `backend/src/routes/seasons.ts` for the nested standings route and validation/error integration.
- `create_v2_v3_tables.sql` is a read-only schema reference; do not run or edit it.

## Data / contracts

`GET /api/seasons/:seasonCode/phases/:phaseCode/standings?round=<optional positive integer>` validates the season (`400 INVALID_SEASON` / `404 SEASON_NOT_FOUND`, existing behavior) and the phase against `getPhases` (`404 PHASE_NOT_FOUND`, existing behavior). `round` must be a positive decimal integer with no sign, fraction, duplicate value, or unsafe integer representation; a malformed value returns `400 INVALID_ROUND`. When present, `round` must match a round returned by `getRounds(seasonCode, phaseCode)`; otherwise return `404 ROUND_NOT_FOUND`. When `round` is omitted, use the highest `round_number` with a row in `app_standings_basicstandings` for that season and phase; when no such row exists, `round` is `null` in the response and `standings` is `[]`.

Success JSON:

```
{
  "round": number | null,
  "standings": [StandingEntry]
}
```

`StandingEntry`:

| Field | Type | Source |
| --- | --- | --- |
| `clubCode` | string | `app_standings_basicstandings.club_code` |
| `clubName`, `clubTvCode`, `groupName` | string \| null | `app_standings_basicstandings` |
| `basic` | object \| null | `app_standings_basicstandings`: `position`, `positionChange`, `gamesPlayed`, `gamesWon`, `gamesLost`, `qualified`, `winPercentage` (decimal string), `pointsDifference`, `pointsFor`, `pointsAgainst`, `homeRecord`, `awayRecord`, `neutralRecord`, `overtimeRecord`, `lastTenRecord` |
| `calendar` | object \| null | `app_standings_calendarstandings`: `position`, `positionChange`, `gamesPlayed`, `gamesWon`, `gamesLost`, `qualified` |
| `streaks` | object \| null | `app_standings_streaks`: `position`, `positionChange`, `gamesPlayed`, `gamesWon`, `gamesLost`, `qualified`, `homeRecord`, `awayRecord`, `last10`, `homeLast5`, `awayLast5`, `longestWinStreakCurrentSeason`, `longestLoseStreakCurrentSeason`, `longestWinStreakAnySeason`, `longestLoseStreakAnySeason` |
| `aheadBehind` | object \| null | `app_standings_aheadbehind`: `position`, `positionChange`, `gamesPlayed`, `gamesWon`, `gamesLost`, `qualified`, `winsPercentage` (decimal string), `quarter1Ahead`, `quarter1Behind`, `quarter1Tied`, `half1Ahead`, `half1Behind`, `half1Tied`, `quarter3Ahead`, `quarter3Behind`, `quarter3Tied` |
| `margins` | object \| null | `app_standings_margins`: `position`, `positionChange`, `gamesPlayed`, `gamesWon`, `gamesLost`, `qualified`, `pointDifference1To5`, `pointDifference6To10`, `pointDifference11To15`, `pointDifferenceMoreThan15`, `rebounds`, `assists`, `blocks`, `threePointers`, `twoPointers`, `freeThrows` |
| `streakHistory` | array | `app_standings_calendar_streaks` rows for this club/round, ordered by `streakOrdinal`: `{ streakOrdinal, startAt, endAt, winLossRecord }` |
| `form` | array | `app_standings_basic_form` rows for this club/round, ordered by `resultOrdinal`: `{ resultOrdinal, result }` |

`basic`/`calendar`/`streaks`/`aheadBehind`/`margins` are each `null`, independently, when that source table has no row for the club/round; they are never merged into one shared `position`/`qualified` field even when their values agree, because each table can carry a different official ranking. `streakHistory` and `form` are `[]`, never `null`, when absent. `startAt`/`endAt` are ISO 8601 strings or `null`. All other numeric fields preserve their source type (`INTEGER` as number, `NUMERIC` as a decimal string); text-typed split fields (for example `home_record`, `quater1_ahead`, `rebounds` in margins) stay as their exact source string. Database failures return `503 DATABASE_UNAVAILABLE`; unexpected failures return `500 INTERNAL_ERROR`, using the existing `{ "error": { "code": string, "message": string } }` envelope. Preserve `ROUTE_NOT_FOUND` for unmatched season-router paths.

## Testing

- No Verify command, test command, or test runner is configured. Run `cd backend && npm run build` after each step and before review; do not add a runner in this feature.
- Use read-only live source inspection and API requests for both seasons. Check: `E2025`/`RS` with omitted round (latest = 38), an explicit valid round, an explicit round absent from the round catalog, `E2026` (no standings data yet, any phase), an unsupported/invalid season, an unknown phase, and a malformed `round` value.
- If live data cannot exercise a per-table-null-while-others-present case, prove it with an isolated fixture or record it as unobserved. Do not modify Neon to manufacture data.

## Notes for the AI

- Reuse `DB_URL`, Drizzle client, `catalogRead`, `CatalogDatabaseError`, `SUPPORTED_SEASONS`, `getPhases`, `getRounds`, and the season router. Keep HTTP handlers focused on request validation and responses.
- Do not reuse or extend `season-games.ts` or `season-identities.ts`; this feature's query module is self-contained in `season-standings.ts`.
- `app_standings_basicstandings` is the anchor for which clubs appear in a round's response; a club present only in `app_standings_calendar_streaks` or `app_standings_basic_form` without a matching basic-standings row is out of scope for this feature.
- Season statistics (`app_season_stats_*`) and any frontend standings work belong to later features; keep this feature to the seven standings tables only.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9891,"specSha256":"d7bbbf20c774885c3cda37211deb479b85e5b4bd1df73042bf7723235c4969dc","branch":"refs/heads/feature/official-standings","head":"96332b291357fe9eceae9218d471768a34340bf2","baseRef":"refs/heads/master","baseCommit":"96332b291357fe9eceae9218d471768a34340bf2","sourceTree":"24e25bff12b712de000e5a489657438bc72b90a0","absentOptional":[]} -->
