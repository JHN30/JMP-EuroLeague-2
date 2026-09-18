# Feature: Teams, players, and rosters API

**From build-plan:** feature 1b
**Build attempt:** 1
**Branch:** feature/teams-players-and-rosters-api
**Status:** verified

## Goal

Expose EuroLeague team and player identities and their season roster registrations from the populated Neon tables. Give later screens stable, season-scoped read-only data without presenting staff, referees, or missing values as player facts.

## In scope

- Map the needed columns of `etl_flat_clubs`, `etl_flat_people`, and `etl_flat_registrations` in Drizzle after read-only checks against the live `E2025` and `E2026` Neon data. Keep competition `E` and composite source keys.
- Add team and player list/detail routes under `/api/seasons/:seasonCode` plus team roster and player registration routes. Reuse the Season catalog's season validation and JSON error behavior.
- Return nullable source fields as `null`. Preserve inactive and unknown-activity registrations rather than calling every membership current. Keep registrations with missing linked identity data visible as partial records.
- Bound growing lists, validate path and query input, and order every list deterministically. Keep queries read-only and select only response columns.

## Out of scope

- Frontend screens, player name search, statistics, games, standings, and game logs from later features.
- Creating, migrating, updating, or repairing Neon data; importing other seasons or competitions.
- Inferring a current roster from dates or `active = null`; inferring a player role from a name or missing role metadata.
- New global middleware, dependencies, or a test runner. Rate limiting, structured logging, and compression are separate API infrastructure work.

## Build loop

Use the configured Efficient workflow on `feature/teams-players-and-rosters-api`: implement the small steps, run their relevant checks, and present one review packet after all steps. Step checkpoint commits are disabled. `/complete` owns the final feature commit after approval.

## Build steps

- [x] **1. Verify source and expose teams.** Inspect live table definitions, sample rows, season counts, registration role codes/names, `is_referee`, and join coverage for both supported seasons, without changing data. Confirm how player registrations can be distinguished from staff and referees; if the source cannot support that distinction, stop with the observed ambiguity before exposing a player endpoint. Map club columns and add season-scoped team list and detail routes. **Done when:** `cd backend && npm run build` passes; live team requests for both seasons contain only competition `E` rows in the selected season, with stable ordering and source nulls; invalid/missing-season, unknown-team, and database-failure paths return safe JSON errors; existing season and health routes still respond.
- [x] **2. Expose player identities.** Map confirmed person fields and implement a list restricted by the source-backed player classification from step 1, plus a detail route. Add validated `limit` and `offset` pagination. Do not drop a known player because a profile field is null. **Done when:** the backend build passes; list pages for both seasons are bounded and stable with no cross-season records, staff or referees are excluded according to the confirmed source rule, source nulls remain null, and malformed pagination, invalid IDs, unknown players, and database failures return the defined JSON errors.
- [x] **3. Expose registrations.** Map registration fields and add team roster and player registration endpoints. Apply the confirmed player-role rule, scope every join by competition and season, retain `registration_key`, include inactive and null-activity rows, and preserve a registration when its linked person or club is absent. **Done when:** the backend build passes; live requests for both seasons show correctly linked and ordered registrations without duplication or cross-season membership; a known team/player with no registrations returns `[]`; invalid paths and database failures use safe JSON errors; existing catalog and health routes remain functional.

## Files / areas

- `backend/src/db/season-schema.ts` for additional Drizzle mappings.
- `backend/src/db/` for selected, season-scoped team, player, and registration queries.
- `backend/src/routes/seasons.ts` for nested HTTP routes and shared validation/error handling.
- `create_v2_v3_tables.sql` is a read-only schema reference; do not run or edit it.

## Data / contracts

All routes are `GET` under the existing season router. Existing `E2025`/`E2026` validation applies first. Codes and keys are URL path segments; clients percent-encode them, and the server validates decoded values before querying.

| Request | Success JSON | Ordering |
| --- | --- | --- |
| `/api/seasons/:seasonCode/teams` | `{ "teams": [Team] }` | `name` (null last), then `clubCode` |
| `/api/seasons/:seasonCode/teams/:clubCode` | `{ "team": Team }` | Single record |
| `/api/seasons/:seasonCode/players?limit=50&offset=0` | `{ "players": [Player], "pagination": { "limit": number, "offset": number, "hasMore": boolean } }` | `name` (null last), then `personKey` |
| `/api/seasons/:seasonCode/players/:personKey` | `{ "player": Player }` | Single record |
| `/api/seasons/:seasonCode/teams/:clubCode/roster?limit=50&offset=0` | `{ "registrations": [RosterEntry], "pagination": { "limit": number, "offset": number, "hasMore": boolean } }` | `sortOrder` (null last), then `registrationKey` |
| `/api/seasons/:seasonCode/players/:personKey/registrations` | `{ "registrations": [PlayerRegistration] }` | `sortOrder` (null last), then `registrationKey` |

`Team` is `{ clubCode: string, name: string | null, abbreviatedName: string | null, countryCode: string | null, crestUrl: string | null }`. `Player` is `{ personKey: string, name: string | null, jerseyName: string | null, countryCode: string | null, heightCm: number | null }`. `Registration` is `{ registrationKey: string, personKey: string, clubCode: string | null, roleCode: string | null, roleName: string | null, active: boolean | null, sortOrder: number | null, dorsal: string | null, positionName: string | null }`. `RosterEntry` adds `player: Player | null`; `PlayerRegistration` adds `team: Team | null`. A missing joined identity produces `null` in that nested field, never an invented label. Registrations with `clubCode = null` can appear in the player endpoint but not a team's roster.

The player classification must come from confirmed live role metadata and person flags, documented in the query module or review packet. Apply the same rule to player list/detail and both registration routes. If the data cannot distinguish players reliably, pause for a focused product decision rather than exposing all people as players.

For paginated lists, omitted `limit` is 50 and omitted `offset` is 0. Accept decimal integers only: `limit` 1 through 100 and `offset` 0 through 10000. Reject duplicates, fractions, signs, and other malformed values with `400 INVALID_QUERY`. Fetch at most one extra row to determine `hasMore`; do not return an unbounded list. The team list and one player's registrations remain bounded by the selected season and identity.

An invalid or unsupported season returns `400 INVALID_SEASON`; a supported season absent from the source returns `404 SEASON_NOT_FOUND`. A missing team or player returns `404 TEAM_NOT_FOUND` or `PLAYER_NOT_FOUND`. Empty valid lists return arrays, never `404`. Malformed entity path encoding or empty/invalid identifiers return `400 INVALID_TEAM_CODE` or `INVALID_PLAYER_KEY`. Database failures return `503 DATABASE_UNAVAILABLE`; unexpected failures return `500 INTERNAL_ERROR`. Keep the existing `{ "error": { "code": string, "message": string } }` envelope without SQL, connection details, or stack traces. Preserve `ROUTE_NOT_FOUND` for unmatched catalog paths.

Every query and join filters `competition_code = 'E'` and the validated `season_code`; identity comparisons include the same season. Use Drizzle parameter binding. Do not use `registration_key`, `person_key`, or `club_code` alone to join across seasons.

## Testing

- `cd backend && npm run build` passed while drafting this spec. Run it after each step and before review. No test or Verify command is configured; do not add a runner within this feature.
- Check live API behavior for both seasons, pagination boundaries, stable ordering, season isolation, known/unknown identities, partial records, inactive and null-activity registrations, malformed path/query input, safe database failures, and regression of `/api/seasons` and `/api/health`.
- Use read-only source inspection and API requests. If live data lacks an edge case, verify its code path with an isolated fixture or describe the unobserved case; do not change Neon to manufacture one.

## Notes for the AI

- Reuse the existing `DB_URL`, Drizzle client, `CatalogDatabaseError`/`catalogRead`, supported season values, and season router. Keep handlers focused on HTTP behavior.
- The SQL reference uses nullable names and profiles, `is_referee` on people, and role/activity fields on registrations. Confirm live semantics before classifying players. Its `TIMESTAMP` columns have no timezone, so this contract omits them rather than asserting UTC instants.
- Preserve `registration_key` because a person can have multiple registrations. Do not collapse records by person or assume one team per season.
- Keep frontend work and broader team/player pages in their planned features.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9518,"specSha256":"d149d3f0ed39624b90a6378ad79406694988d6d805fe41db0f2e06e095c94d08","branch":"refs/heads/feature/teams-players-and-rosters-api","head":"d1fb1b22ade7585c55100ba2758ff1063debc883","baseRef":"refs/heads/master","baseCommit":"4b4b325b850048d1dc2f813968396ef211bc5fc7","sourceTree":"75dd035ee8bd51c7203611e617d0865336ffb3ec","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** d1fb1b22ade7585c55100ba2758ff1063debc883
**Base commit:** 4b4b325b850048d1dc2f813968396ef211bc5fc7
**Base ref:** refs/heads/master
**Spec hash:** d149d3f0ed39624b90a6378ad79406694988d6d805fe41db0f2e06e095c94d08
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-5.6-sol
**Requested execution:** automatic
**Requested at:** 2026-09-18T17:58:50Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-5.6-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-09-18T17:59:53Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `4b4b325b850048d1dc2f813968396ef211bc5fc7..d1fb1b22ade7585c55100ba2758ff1063debc883` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `git status --short --branch`: pass; only the review request differs from the target.
- `git rev-parse HEAD`: pass; target commit matches.
- `git merge-base refs/heads/master d1fb1b22ade7585c55100ba2758ff1063debc883`: pass; base commit matches.
- `Get-FileHash blueprint/context/current-feature.md -Algorithm SHA256`: pass; spec hash matches.
- `npm run build -- --noEmit` (backend): pass; TypeScript compilation.
- Backend test command: unavailable; none is configured.

## Evidence

- Reviewed the complete `4b4b325b850048d1dc2f813968396ef211bc5fc7..d1fb1b22ade7585c55100ba2758ff1063debc883` delta in `backend/src/db/season-identities.ts`, `backend/src/db/season-schema.ts`, `backend/src/routes/seasons.ts`, and the active spec, with surrounding catalog, router, schema reference, configuration, and standards.
- Queries select response columns, bind values through Drizzle, scope identities and joins by competition and season, and order lists deterministically. The routes validate season, identity, and pagination inputs and use the existing safe JSON error handler.
- No skipped, focused, or placeholder tests were found under `backend/src`.

## Findings

- None

## Remaining risk

- Backend test command unavailable; no test runner is configured.
- Live API and Neon edge cases were not independently exercised in this code audit; Check was not required.
