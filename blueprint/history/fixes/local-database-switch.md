# Fix: Local database switch

**Type:** Fix
**Status:** verified
**Branch:** fix/local-database-switch

## The problem

The API always reads Neon (`DB_URL` in `backend/src/config/env.ts`, used by the `pg` pool in `backend/src/db/client.ts`).
Development, the dev servers and Playwright runs therefore spend Neon's free 5 GB monthly network transfer; Playwright has
been paused until 1 November 2026 (`CLAUDE.local.md`, a local hook) to stay under it.

The user keeps a local PostgreSQL copy of the same data: the pipeline writes the `gold` schema locally and publishes it
to Neon's `public` schema, and the local `gold` tables are being renamed to Neon's `app_*` names so both databases match
(local also holds seasons back to 2000, and the `silver` and `bronze` schemas, which the API never reads). The user has
added `DB_TARGET=local` and the local URL to `backend/.env` and wants the API to read the local database in development
while production keeps reading Neon. The variable names are the ones the user put in `backend/.env.example`: `DB_TARGET`,
`DB_URL` and `LOCAL_DB_URL`.

## The fix

- **`backend/src/config/env.ts`:** read `DB_TARGET`: `neon` (the default when it is not set, which is what Render has) or
  `local`; any other value stops startup with a clear error. `neon` requires `DB_URL` as today; `local` requires
  `LOCAL_DB_URL` (same PostgreSQL URL validation) and does not require `DB_URL`. An optional `LOCAL_DB_SCHEMA` names the
  schema that holds the `app_*` tables locally, `gold` when not set; it must be a plain identifier
  (`/^[a-z_][a-z0-9_]*$/`). `ENV` exposes the chosen URL, the target and, for local, the schema. Error messages name the
  variable, never print its value.
- **`backend/src/db/client.ts`:** for `local`, the pool sets the connection's `search_path` to the schema through the
  `pg` `options` setting (`-c search_path=<schema>`), so the unqualified `app_*` table names in the Drizzle schemas resolve
  to `gold`. Neon's connection is unchanged.
- **Startup:** the server logs `Database: neon` or `Database: local (gold)`, never a URL or credential.
- **`/api/health`:** outside production it also returns `target` (`neon` or `local`), so a tool can confirm which database
  a running dev backend reads without opening `.env`. In production the response is unchanged.
- **`backend/.env.example`:** drop the duplicated `DB_URL` line, keep the user's comments, and document the optional
  `LOCAL_DB_SCHEMA`; placeholder values only.
- **Docs:** `AGENTS.md` Commands notes the switch in one line.
- **After a verified local run:** remove the Playwright pause, which only exists to protect Neon: `CLAUDE.local.md`, the
  hook `.claude/hooks/no-playwright-until-reset.mjs` and its entry in `.claude/settings.local.json` (all local and
  untracked). The `.gitignore` lines for them stay, harmless.

### Must not break

- Production on Render: no `DB_TARGET`, so Neon through `DB_URL`, exactly as today.
- Every query, the response cache and the API responses; the only new field is `target` on `/api/health` outside
  production.
- No new dependency. The agent never opens, prints or loads `backend/.env` (standing user rule); checks go through the
  running API.

## Build steps

- [x] 1. **The switch.** `env.ts`, `client.ts`, the startup log, `/api/health`'s `target`, `.env.example` and the
      `AGENTS.md` line.
      Done when: `cd backend && npm run build` passes; the user's running dev backend (it reloads on `src` changes) answers
      `/api/health` with `{"status":"ok","database":"connected","target":"local"}`; an unknown `DB_TARGET` and a missing
      `LOCAL_DB_URL` stop startup with the variable's name in the error (checked with a throwaway process given dummy
      values on the command line, not the `.env`).
- [x] 2. **Local data check.** Through the running dev backend (local) and the live site (Neon), compare a set of API
      responses: the season list, standings, games, a game's box score and play-by-play, teams, a team page, players, a
      player page and its advanced data, leaders, records and a comparison, for E2025 and E2026.
      Done when: every response is identical, or each difference is listed and explained (expected: the all-time
      head-to-head and other cross-season reads may show seasons before 2023 locally). A missing table or column is
      reported as a pipeline gap, not patched in the app.
- [x] 3. **Lift the Playwright pause and run the browser tests.** Remove the pause files above; confirm `/api/health`
      says `local`; run `cd frontend && npm run test:browser` once.
      Done when: the suite has run against the local database, and the result is reported. The specs written while
      browser tests were paused (`leaders-layout`, `compare-layout`, the updated `compare` and `responsive` entries) run
      here for the first time; failures in them are listed, small test-only corrections are made here, and anything that
      needs product changes goes to its own fix.

## Built as

- As specced. `LOCAL_DB_SCHEMA` is optional (default `gold`) and is not in the user's `.env`; the local pool passes
  `options: "-c search_path=<schema>"`. The startup log reads `Database: local (gold)`; `/api/health` answers
  `{"status":"ok","database":"connected","target":"local"}` outside production.
- Startup checks, run with dummy values on the command line (never the `.env`): an unknown `DB_TARGET`, an empty or
  non-URL `LOCAL_DB_URL` and a bad `LOCAL_DB_SCHEMA` each stop the server with only the variable's name in the error.
- The first local connection failed with Postgres `3D000` (the database named in `LOCAL_DB_URL` did not exist; found with
  a masked one-off check through the app's pool); the user corrected the `.env`, after which the backend connected.
- Local data check: 61 API responses for E2025 and E2026 from a temporary local backend against the live site (Neon):
  59 byte-identical. The two others hold the same data in another order: `/2025/teams` (sorted by name; local Postgres
  sorts "Anadolu Efes" before "AS Monaco", Neon the other way, a collation difference) and `/2025/postseason-series` (its
  query has no `ORDER BY`, so each database returns its own row order; the bracket pairs series by clubs and phase, so the
  page is the same). Both are left for a separate fix.
- The Playwright pause was removed (`CLAUDE.local.md`, the hook and `.claude/settings.local.json`); the `.gitignore` lines
  stay. Each browser run first confirmed the backend's health said `"target":"local"`.
- First full browser run against the local database: 486 passed, 6 failed. Test-only corrections made here: the Copy
  link check reads the accessible name (`toHaveText` also read the hidden label); the player Shooting spec mocks the new
  player shots request (`/players/:personKey/shots`, three games' attempts) and its "someone else's attempts" case became
  "no attempts", since the server now returns only the player's shots; `progressive-disclosure.spec.js` picks teams
  through the comboboxes; the opened player comparison left `responsive.spec.js` until 31l-iii (its Overview overflows
  by 9px at 320px, which is that item's work).
- Final full run: 484 passed, 2 failed. `player-career-layout.spec.js:111` failed under load as at the start of the
  session and passes alone (3 of 3). `leaders-layout.spec.js:67` is a real layout issue left for its own fix: in the
  current season the Teams card's first name, "Panathinaikos AKTOR Athens", breaks "Panathinaikos" mid-word at 320px.

## Verify

- `cd backend && npm run build`; root `npm run build`; `cd frontend && npm run lint`.
- `curl http://localhost:3000/api/health` shows `"target":"local"`; the response comparison above; the browser test run.
- Production is not deployed or touched by this fix; after merge and deploy, `https://www.jmpeuroleague.com/api/health`
  must still answer without `target`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7899,"specSha256":"a46c4cb5ce626f4410f1353c90fccc7af188a13b860f4348c4ecd48785403352","branch":"refs/heads/fix/local-database-switch","head":"fdcf5b40d4fb24df30c9c5e290e3dcb861669381","baseRef":"refs/heads/master","baseCommit":"fdcf5b40d4fb24df30c9c5e290e3dcb861669381","sourceTree":"e9a1fdd0f232c32b60e5a62738ba5726516f98ca","absentOptional":[]} -->
