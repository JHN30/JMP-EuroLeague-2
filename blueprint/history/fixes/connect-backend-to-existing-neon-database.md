# Fix: Connect backend to existing Neon database

**Type:** Fix
**Status:** verified
**Branch:** fix/connect-backend-to-existing-neon-database

## The problem

The backend has an ignored local `.env` containing `DB_URL`, but `backend/src/config/env.ts` leaves it optional and no database client exists. Express cannot yet read the already populated Neon PostgreSQL tables. Database connection setup is pre-build work in `blueprint/build-plan.md`, and Feature 1a depends on it.

## The fix

- Validate the existing `DB_URL`, `PORT`, and `FRONTEND_URL` configuration at startup, with clear errors that never print secret values. Keep `DB_URL` and `FRONTEND_URL` as the implemented names for this small setup change and document them in a secret-free `backend/.env.example`.
- Add one server-side `pg` pool and Drizzle client using the installed packages. Do not create, migrate, seed, or modify Neon tables; `create_v2_v3_tables.sql` is a reference for later Drizzle table mappings.
- Add `GET /api/health` as a database readiness check. Return a stable JSON success response when a small query succeeds and a safe `503` JSON error when the database is unavailable. Keep the existing root route working. The endpoint exposes no connection details or row data.

## Build steps

- [x] Validate backend environment variables and add the shared Drizzle/`pg` client, with a secret-free example environment file. **Done when:** `cd backend && npm run build` passes, missing or malformed required configuration fails at startup without printing credentials, and no database write occurs.
- [x] Wire the client into a public `GET /api/health` readiness route. **Done when:** the running backend returns JSON success with the configured Neon connection, returns a safe `503` JSON error when connection fails, and `/` still responds as before.
- [x] Repair F-01 by handling idle `pg` pool errors without exposing connection details. **Done when:** an idle connection failure leaves the process running, the pool can create a replacement connection, and `cd backend && npm run build` passes.

## Verify

- Run `cd backend && npm run build` after each step. There is no configured test runner or Verify command.
- With the existing ignored local `.env`, run the backend and request `GET /api/health`; confirm success against Neon. Check the unavailable-database path with a deliberately invalid temporary connection value without editing or printing the real secret. Confirm `/` still responds.
- Review `git diff` to ensure no `.env` value, credentials, schema recreation, data import, or write endpoint enters the change.

## Notes

- The public API remains read-only. Feature 1a will map and query the existing Neon tables through this client.
- Keep the connection server-side. Do not expose `DB_URL` through Vite or include it in responses or logs.
- Use one feature-level review after both small steps; checkpoint commits are disabled. `/complete` creates the final fix commit after the configured gates.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2997,"specSha256":"0caae312ee29d271297ae6f62c9d736185650deeffcb251252b3597dd5ab5cbb","branch":"refs/heads/fix/connect-backend-to-existing-neon-database","head":"5eeb6983479101899e062489f76cedc397577412","baseRef":"refs/heads/master","baseCommit":"34d5e611f464b64d3b5ac861aa54fd3389b3821c","sourceTree":"00893a831abea2d18d8994128c3aed096c59b201","absentOptional":[]} -->

## Findings

### connect-backend-to-existing-neon-database/F-01 [P1] closed - Idle database disconnect terminates the API process

**File:** backend/src/db/client.ts:5
**Found:** 2026-09-18 by /audit (scope: current; lenses: quality, security, performance, tests; independent)
**Why it matters:** The shared `pg` pool has no `error` listener. Once a successful request returns its connection to the pool, a database restart or connection loss makes the idle client emit an error. The installed `pg-pool` forwards this through `pool.emit('error', err, client)`, outside the health route's promise and catch block. Node terminates the API instead of keeping it available to return a safe 503. A loopback PostgreSQL handshake using the actual `src/db/client.ts`, followed by release and server-side socket closure, reproduced an idle connection followed by exit code 1, `Unhandled 'error' event`, and `Connection terminated unexpectedly`.
**Suggested fix:** Register a pool-level error listener when constructing the shared pool. Handle or log only a fixed safe diagnostic without serializing the error or client; the driver already removes the failed idle client. Verify the process survives an idle disconnect and can establish a replacement connection.
**Resolution:** Independently closed on 2026-09-18 against checkpoint `5eeb6983479101899e062489f76cedc397577412`. Re-reviewed `backend/src/db/client.ts` and the installed driver's idle-error path. After rebuilding, a fresh local PostgreSQL protocol probe exercised the actual compiled pool and Drizzle client: the first query left one idle connection; closing its server socket emitted the handled error and removed that connection; the process stayed alive and a replacement query completed on a second connection. Captured logging was exactly one fixed `Database idle connection lost` diagnostic without error or client data. The complete checkpoint review found no new defect in the repair.


## Independent review

# Independent Review

**Status:** passed
**Target commit:** 5eeb6983479101899e062489f76cedc397577412
**Base commit:** 34d5e611f464b64d3b5ac861aa54fd3389b3821c
**Base ref:** master
**Spec hash:** 0caae312ee29d271297ae6f62c9d736185650deeffcb251252b3597dd5ab5cbb
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6-astra
**Requested execution:** automatic
**Requested at:** 2026-09-18T15:22:58.6045213Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-6-astra
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-09-18T15:26:13Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `34d5e611f464b64d3b5ac861aa54fd3389b3821c..5eeb6983479101899e062489f76cedc397577412` delta in a fresh isolated subagent without the builder conversation. Run all Audit lenses from scratch. Recheck F-01 and identify any new findings. Do not edit product code or accept findings.

## Commands

- `git rev-parse HEAD`, `git merge-base master HEAD`, `git status --short`, and `Get-FileHash blueprint/context/current-feature.md -Algorithm SHA256`: pass; target, base, clean product tree, and exact spec hash match the request.
- `git diff 34d5e611f464b64d3b5ac861aa54fd3389b3821c..HEAD` and `git diff --check 34d5e611f464b64d3b5ac861aa54fd3389b3821c..HEAD`: complete delta inspected; whitespace check passed.
- `cd backend; npm run build`: passed.
- Inline `node` loopback PostgreSQL protocol probe using rebuilt `dist/db/client.js`: passed; real pool and Drizzle query, idle socket disconnect, safe fixed diagnostic, removal of failed client, and successful replacement connection.
- Inline `node` startup-validation probe: passed; 10 missing/malformed PORT, DB_URL, and FRONTEND_URL cases fail with expected safe messages and no synthetic credential disclosure.
- Inline `node` HTTP probe against rebuilt `dist/index.js` with an unavailable local database: passed; root returns 200 and original text, health returns exact safe 503 JSON, and process remains alive.

## Evidence

- Reviewed the complete eight-file target delta across all four lenses: backend environment example, configuration validation, shared database client, API entry point, build plan, verified active spec, project overview, and SQL schema reference. Followed backend package scripts, compiler configuration, nodemon configuration, ignore rules, and the installed pg-pool idle-error implementation where relevant.
- Checked project requirements for strict TypeScript, server-only configuration, safe diagnostics and API errors, use of existing dependencies, read-only database access, and proportional scope. The only executed SQL in the app is constant `select 1`; the schema reference is not invoked by any runtime or build script.
- F-01 independently closed: the application error listener existed before the probe added its observation listener; the failed idle client was removed; captured logging contained only the fixed diagnostic; the next Drizzle query established a second connection.
- No new confirmed findings. No configured test runner, test script, skipped/focused tests, or placeholder tests in the reviewed source. No dependencies were installed or changed.
- Generated build output and third-party dependency internals were excluded from project-code audit scope; relevant driver internals were inspected only to verify behavior. No SQL schema script or live database mutation was executed.

## Findings

- F-01 [P1] closed after independent code review and runtime reproduction. No new findings.

## Remaining risk

- No automated test command, backend lint command, security scanner, or performance command is configured; none is claimed to have passed. Verification used the declared backend build and local runtime probes.
- Live Neon connectivity and the live Neon schema were not independently checked in this pass. The required independent Check gate is disabled in this request; local protocol and unavailable-database probes do not establish external service availability.
