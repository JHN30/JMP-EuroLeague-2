# Fix: Local database accepts every season from E2000

**Type:** Fix
**Status:** verified
**Branch:** fix/local-database-accepts-every-season-from-e2000

## The problem

`SUPPORTED_SEASONS` in `backend/src/db/season-catalog.ts` is the one list of seasons the API serves: `["E2023", "E2024", "E2025", "E2026"]`, a literal tuple. It
filters `getSeasons` (and so the season selector), validates the season in `requestedSeason` (`routes/seasons.ts`, 400 `INVALID_SEASON` otherwise), drives the four
cross-season records routes (`db/season-records.ts`) and decides which records URLs share one cache entry (`response-cache.ts`). Those four are right for Neon,
whose free plan has limited room, but a developer's local database has none of that limit and may hold any season from 2000: today the API refuses every season
before 2023 even when the local database has it, which makes testing the records and the other pages across many seasons impossible.

## The fix

1. In `season-catalog.ts` build the list from the database target the config already exports (`ENV.DB_TARGET`, `config/env.ts`): with `local` it is `E2000` to
   `E2026` (27 seasons, in order), with `neon` (the default, and what production uses) it stays exactly `E2023` to `E2026`. The type becomes `readonly string[]`;
   no other file changes unless the compiler asks (they all read it as a list of strings).
2. Nothing else: `getSeasons`, `requestedSeason`, the records routes and the cache key already read `SUPPORTED_SEASONS`, so they follow. A season in the range that the local
   database does not hold behaves as a season it does not hold today (`getSeasons` omits it, a request for it answers 404 `SEASON_NOT_FOUND`, the records routes contribute
   no rows for it). One known edge: the records routes share one cache entry across the supported seasons, so a records request for such a season is answered from the
   cache (200) when the same records were just asked through another season's address; that is harmless on a development database and is left as it is.

It must not break: Neon's behaviour in any way (the list under `DB_TARGET=neon`, or with it unset, is the same four seasons, in the same order); the records answers on the local database
for the seasons it already served (their rows are the same; with more seasons present the top 50 may now include them, which is the point); the 56 tests of `records-api.spec.js`.

## Build steps

- [x] 1. **The list follows the target.** Make the change in `season-catalog.ts` and rebuild. Before changing code save (outside the repo) the local `/api/seasons` answer, then compare.
      Done when: `cd backend && npm run build` passes; on the local database `/api/seasons` lists every season of `E2000`..`E2026` that the database holds (the four it served before among them, unchanged),
      and a request for a season in the range that it does not hold (`/api/seasons/2005/teams`, say) answers 404 (not 400) while `1999` and `2027` answer 400; `records-api.spec.js` passes (`/api/health` says `local`), with root `npm run build` and
      `cd frontend && npm run lint`. The Neon list is checked by reading the code (the same four seasons; the dev backend cannot be started against Neon).

## Files

`backend/src/db/season-catalog.ts` (and `backend/src/config/env.ts` is read only).

## Verify

With the local backend running, open `/api/seasons` and the Records page: the season selector offers every season the local database holds, and a Records choice ranks across all of them. A season the local
database lacks, such as `/api/seasons/2005/teams` when 2005 is not loaded, answers 404 rather than 400.

## Built

- `season-catalog.ts` builds `SUPPORTED_SEASONS` from `ENV.DB_TARGET`: `E2000`..`E2026` (27 seasons) when it is `local`, `E2023`..`E2026` otherwise (the default and production, read by code: the same four, in the same order). The type is `readonly string[]`; no other file changed.
- Evidence (local database, `/api/health` said `local`): `cd backend && npm run build` passes; `/api/seasons` now lists all 27 seasons `E2026` down to `E2000` (the database holds them all, so the 404 case for a season it lacks could not be shown; that path is unchanged);
  `/api/seasons/1999/teams` and `/2027/teams` answer 400, `/2005/teams` and `/E2000/teams` answer 200; a Records request across the 27 seasons answered in 127 ms (local). `records-api.spec.js` passes (56 tests). Root `npm run build` and `cd frontend && npm run lint` pass.
  The throwaway spec and the saved answer were deleted.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4527,"specSha256":"9cb4ee0aa36b08a17cb565553bb133a5eff146117bad1a36045a93fed3e0566f","branch":"refs/heads/fix/local-database-accepts-every-season-from-e2000","head":"613600c70b71dca5a41c34feb05f54085c5a48af","baseRef":"refs/heads/master","baseCommit":"613600c70b71dca5a41c34feb05f54085c5a48af","sourceTree":"599862dfa97ed35542875dc335c141b0ab2a5394","absentOptional":[]} -->

## Completion evidence

- Local database (`/api/health` said `local`): `/api/seasons` lists all 27 seasons E2026 to E2000 (the database holds them all); `/api/seasons/1999/teams` and `/2027/teams` answer 400, `/2005/teams` and `/E2000/teams` answer 200; a Records request across the 27 seasons answered in 127 ms. `records-api.spec.js` passed (56 tests).
- Root `npm run build` (with the backend `tsc` check) and `cd frontend && npm run lint` pass (rerun at completion). No `Verify` command is declared in `AGENTS.md`. The Neon list is the same four seasons by reading the code (`DB_TARGET` unset or `neon`; Render sets no `DB_TARGET`).
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested.
