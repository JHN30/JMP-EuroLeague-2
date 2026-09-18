# Feature: Season catalog

**From build-plan:** feature 1a
**Build attempt:** 1
**Branch:** feature/season-catalog
**Status:** verified

## Goal

Expose the existing EuroLeague `E2025` and `E2026` season catalog, competition identity, phases, and rounds through a small read-only Express API. Read the populated Neon tables with Drizzle so later frontend features can select a season and navigate its phases and rounds.

## In scope

- Map the needed columns of the existing `etl_flat_seasons`, `etl_flat_rounds`, and `etl_flat_games` tables in Drizzle. Treat `create_v2_v3_tables.sql` as a reference and confirm its relevant columns and EuroLeague competition code against Neon before relying on them.
- Add typed JSON routes for supported seasons, one season, its phases, and the rounds in one phase.
- Validate path parameters, scope every query by the confirmed competition code and season, select only response columns, and order every list deterministically.
- Preserve missing source metadata as JSON `null`; return empty arrays for known seasons or phases with no child records.
- Return safe, consistent JSON errors for invalid or unknown paths and database failures.

## Out of scope

- Frontend screens, theme changes, or a season selector.
- Team, player, roster, game, standings, or statistics endpoints from features 1b through 1d.
- Creating, migrating, repopulating, or changing the existing Neon tables.
- Authentication, writes, new dependencies, or a test runner.

## Build loop

Use the configured Efficient workflow: implement the small steps on `feature/season-catalog`, run their relevant checks, and present one review packet after all steps. Step checkpoint commits are disabled. `/complete` owns the final feature commit after approval.

## Build steps

- [x] **1. Season source and routes.** Check the live Neon definitions and rows for `etl_flat_seasons`, `etl_flat_rounds`, and the phase columns of `etl_flat_games` using read-only inspection. Confirm which competition code identifies EuroLeague for both supported seasons and that the SQL reference matches the columns used below. If scope or schema is ambiguous, stop and report it before building an API around a guess. Map the needed season columns in Drizzle and add `GET /api/seasons` and `GET /api/seasons/:seasonCode`. **Done when:** `cd backend && npm run build` passes; live requests return only existing `E2025` and `E2026` EuroLeague rows with their actual nullable metadata; the source-absent branch returns `404`, an unsupported season returns `400`, and a database failure returns a safe `503`.
- [x] **2. Phase and round routes.** Map the needed round and game phase columns. Add `GET /api/seasons/:seasonCode/phases` from distinct phase codes in that season's rounds and games, and `GET /api/seasons/:seasonCode/phases/:phaseCode/rounds` for a known phase. Use game metadata for a phase name only when its non-null values agree; otherwise return `null`. **Done when:** the backend build passes; live requests for both seasons return stable, season-scoped phase and round lists; a known phase without rounds maps to `[]`; unknown seasons or phases and database failures return the specified safe errors. The existing health route still responds as before.
- [x] **3. Repair F-01, unmatched catalog paths.** Add a terminal handler inside the season router so malformed or unknown catalog paths return the API JSON error shape. Keep defined route behavior unchanged. **Done when:** the backend build passes; live requests to `/api/seasons/E2025/unknown`, `/api/seasons/E2025/phases/BOGUS`, and `/api/seasons/E2025/phases/BOGUS/rounds/extra` each return `404` JSON with `ROUTE_NOT_FOUND`, while the defined season and phase error routes still return their existing codes.
- [x] **4. Repair F-02, malformed URL encoding.** Validate the raw season segment before route matching and handle Express URL-decoding errors at the season router boundary. Classify a malformed season segment as `400 INVALID_SEASON` and a malformed phase segment on a rounds route as `404 PHASE_NOT_FOUND`, without exposing the bad path or an exception. **Done when:** the backend build passes; live requests to `/api/seasons/%`, `/api/seasons/%ZZ`, `/api/seasons/%ZZ/unknown`, `/api/seasons/E2025/phases/%/rounds`, and `/api/seasons/E2025/phases/%ZZ/rounds` return the specified JSON errors, while normal, unsupported-season, unknown-phase, and unmatched-path routes retain their codes.

## Files / areas

- `backend/src/index.ts` for mounting the HTTP routes.
- `backend/src/db/` for the Drizzle table mappings and focused catalog queries.
- `backend/src/routes/seasons.ts` for path validation, response formatting, and safe errors.
- `create_v2_v3_tables.sql` as a read-only schema reference; no SQL execution or edit.

## Data / contracts

The proposed public contract is:

| Request | Success JSON | Ordering |
| --- | --- | --- |
| `GET /api/seasons` | `{ "seasons": [Season] }` | `seasonCode` descending |
| `GET /api/seasons/:seasonCode` | `{ "season": Season }` | Single record |
| `GET /api/seasons/:seasonCode/phases` | `{ "phases": [Phase] }` | Earliest known `roundNumber`, then `code` |
| `GET /api/seasons/:seasonCode/phases/:phaseCode/rounds` | `{ "rounds": [Round] }` | `roundIndex` (null last), `number`, then `key` |

`Season` is `{ seasonCode: string, name: string | null, startYear: number | null, competition: { code: string, name: string | null } }`. `Phase` is `{ code: string, name: string | null }`. `Round` is `{ key: string, number: number, index: number | null, name: string | null }`. These values come from selected source columns. Do not substitute zero, an empty string, or a made-up label for source `null`.

Only `E2025` and `E2026` are accepted season path values. A malformed or unsupported season code returns `400` with `{ "error": { "code": "INVALID_SEASON", "message": "..." } }`; a supported season absent from Neon returns `404` with `SEASON_NOT_FOUND`. An unknown phase within an existing season returns `404` with `PHASE_NOT_FOUND`. Database read failures return `503` with `DATABASE_UNAVAILABLE`; unexpected server failures return `500` with `INTERNAL_ERROR`. Error messages must be safe and must not include SQL, connection details, or stack traces. A valid list request with no source rows returns an empty array.

Unmatched paths under `/api/seasons` return `404` JSON with `ROUTE_NOT_FOUND`. This is distinct from a defined route's invalid season or unknown phase error.

Malformed percent encoding in the season path segment returns `400 INVALID_SEASON`. Malformed percent encoding in the phase segment of the rounds route returns `404 PHASE_NOT_FOUND`. These decoding errors must not become `500` responses.

Use the confirmed EuroLeague competition code together with `season_code` for every source query. Keep source primary keys and season scope intact, including `round_key`. There is no phase table: derive phase codes from the rounds and games in the selected season. Include a game-only phase with an empty rounds list; include a rounds-only phase with a `null` name. If non-null game names conflict for one phase, return a `null` name rather than choosing an arbitrary row. Do not expose unsaved or inferred values as if they came from Neon.

Live `E2025` rounds show that `round_index` restarts at 1 within each phase, while `round_number` spans the season. Use the latter to order phases chronologically. A phase found only in games follows phases with known round numbers.

## Testing

- Run `cd backend && npm run build` after each step. No test command or Verify command is configured, so do not install a runner as part of this feature.
- Check live API responses for both supported seasons, season and phase isolation, deterministic ordering, invalid season input, unknown phases, and safe database errors. Use a user-started local backend process for these checks during implementation or `/check`.
- The current Neon data contains both supported seasons and rounds for every known phase. Review the missing-season and empty-round branches in code; report that these cases could not be triggered against the live fixture without changing source data.
- Keep read-only inspection and API checks away from writes to Neon. Confirm `/api/health` remains functional.

## Notes for the AI

- Use the existing `DB_URL`, shared `db` client, strict TypeScript, Express, Drizzle, and `pg` setup. Do not create migrations for already populated tables.
- Parameterize path values through Drizzle. Keep requests read-only and limit selected columns to the response contract.
- Keep the first step's live schema and competition check as a real prerequisite. If it contradicts `create_v2_v3_tables.sql` or cannot identify EuroLeague unambiguously, stop for a focused correction rather than silently adapting the contract.
- Preserve the public read-only scope and the existing frontend separation. This feature supplies data; later features own its UI and broader season data.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8996,"specSha256":"07d1b3b7d954e05a6a5d7a8d51afecfae64ff8f50a2336f4349844bcc2b61dcd","branch":"refs/heads/feature/season-catalog","head":"61eaf3617d80808e760d8630585a668f59b6dcca","baseRef":"refs/heads/master","baseCommit":"04348f51436b0523e1a324784fa82ff1eb64fa94","sourceTree":"84ee2e80b21ee282584089cabb734093d5e90ee9","absentOptional":[]} -->

## Findings

### 1a/F-01 [P1] closed - Unknown season catalog paths return HTML

**File:** backend/src/routes/seasons.ts:59
**Found:** 2026-09-18 by /audit independent current (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** The spec requires safe, consistent JSON errors for invalid or unknown paths. Live requests to `/api/seasons/E2025/unknown`, `/api/seasons/E2025/phases/BOGUS`, and `/api/seasons/E2025/phases/BOGUS/rounds/extra` returned Express's `text/html` 404 page instead of the API error shape. Clients expecting `{ "error": { "code": ..., "message": ... } }` cannot handle these failures consistently.
**Suggested fix:** Add a terminal 404 JSON handler for unmatched paths within the season router, after its defined routes and before the error middleware. Keep the message safe and use a consistent error code.
**Resolution:** Re-reviewed the complete feature delta and the terminal handler at `backend/src/routes/seasons.ts:59`. Live requests to all three reported paths returned 404 JSON with `ROUTE_NOT_FOUND`; defined invalid-season and unknown-phase routes retained `INVALID_SEASON` and `PHASE_NOT_FOUND`. The original defect is closed. A separate malformed URL defect is recorded as 1a/F-02.

### 1a/F-02 [P1] closed - Malformed season URL returns a server error

**File:** backend/src/routes/seasons.ts:63
**Found:** 2026-09-18 by /audit independent current (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** The spec requires malformed season codes to return 400 `INVALID_SEASON`. Express raises a URL-decoding error before `requestedSeason` runs for `/api/seasons/%` or `/api/seasons/%ZZ`. The router error middleware treats it as an unexpected server failure, and live requests returned 500 `INTERNAL_ERROR`. Malformed phase encoding similarly returned 500 instead of the specified unknown-phase response.
**Suggested fix:** Handle Express URL-decoding errors in the season router with the specified client error for the affected path, then recheck malformed season and phase paths alongside the defined and unmatched routes.
**Resolution:** Independently re-reviewed `backend/src/routes/seasons.ts` and the complete feature delta. Raw live HTTP requests to `/api/seasons/%`, `/api/seasons/%ZZ`, and `/api/seasons/%ZZ/unknown` returned 400 JSON with `INVALID_SEASON`; malformed phase segments on rounds routes returned 404 JSON with `PHASE_NOT_FOUND`. Normal, unsupported-season, unknown-phase, and unmatched-path routes retained their specified codes. The repair introduced no new defect in the reviewed code.


## Independent review

# Independent Review

**Status:** passed
**Target commit:** 61eaf3617d80808e760d8630585a668f59b6dcca
**Base commit:** 04348f51436b0523e1a324784fa82ff1eb64fa94
**Base ref:** refs/heads/master
**Spec hash:** 07d1b3b7d954e05a6a5d7a8d51afecfae64ff8f50a2336f4349844bcc2b61dcd
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-5.6-sol
**Requested execution:** automatic
**Requested at:** 2026-09-18T17:24:15.207Z
**Workflow:** regular
**Check required:** yes
**Reviewer adapter:** codex
**Reviewer model:** gpt-5.6-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-09-18T17:29:15.710Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** passed

## Commands

- `git diff --check 04348f51436b0523e1a324784fa82ff1eb64fa94 61eaf3617d80808e760d8630585a668f59b6dcca`: pass.
- `cd backend && npm run build -- --noEmit`: pass; compiled with the declared build script without writing generated files.
- Raw HTTP checks against the running API on port 3000: pass.
- Isolated in-memory database fixture over the season router: pass.
- Direct read-only Neon schema query from the shell: unavailable (`EACCES` from the network sandbox).

## Evidence

- Reviewed the complete base-to-target delta in `backend/src/db/season-catalog.ts`, `backend/src/db/season-schema.ts`, `backend/src/index.ts`, `backend/src/routes/seasons.ts`, and the active spec, plus the relevant existing backend client, environment, health route, SQL reference, and project standards. Dependency, generated, and frontend paths were outside this feature scope.
- Live API returned only `E2026` and `E2025` for competition `E`; phase lists were `RS, PI, PO, FF` and `RS` respectively. Every live phase's rounds had the specified order and response shape. The existing health route returned 200.
- Ten raw HTTP invalid, unknown, unmatched, and malformed-encoding requests returned the specified JSON status and error code. Raw requests avoided URL normalization by the earlier PowerShell HTTP client.
- Isolated fixture confirmed null season metadata, conflicting and absent phase names, game-only and rounds-only phases, empty rounds, null-last round ordering, absent season, empty season list, and safe 503 on database failure.
- The SQL reference contains the mapped columns and composite source identifiers. Successful live API queries confirm those selected columns execute against the current database.

## Findings

- F-02 closed after independent re-review. F-01 remains closed after the unmatched-route behavior was reconfirmed. No new findings.

## Remaining risk

- Direct Neon catalog introspection was unavailable from the reviewer shell because the network sandbox returned `EACCES`; live API requests and the SQL reference provided the schema and competition evidence available here.
- No backend test command or test runner is configured; this pass used live HTTP and an isolated in-memory fixture.
