# Fix: Standings rows fall back to the club code when a club has no TV code

**Type:** Fix
**Status:** verified
**Branch:** fix/standings-rows-fall-back-to-the-club-code-when-a-club-has-no-tv-code

## The problem

In the 2000-01 season Union Olimpija (club code `LJU`) is the only one of 24 clubs whose standings rows carry no TV code (`club_tv_code` is empty in the source data). `GET /api/seasons/:season/phases/:phase/standings` (`getStandings` in `backend/src/db/season-standings.ts`, used by the Home league table and others) returns that raw `clubTvCode: null`, so the Home table, which shows the TV code below 640px and falls back to the full name when it is missing, draws "Union Olimpija Ljubljana" among three-letter codes. The advanced standings route (`routes/seasons.ts`, `/advanced/standings`) already applies `?? row.clubCode`. Checked on the local database for 2000 to 2026; Neon may hold the same gap, as it comes from the source data.

## The fix

In `getStandings`, return `clubTvCode: row.clubTvCode?.trim() || row.clubCode`, so a missing or blank TV code falls back to the club code, the same fallback the advanced standings route uses. The result type already allows a string. No other field, route, table or frontend file changes. The club code is the club's permanent ID, so the fallback is a stable three-letter label; a club whose standings do carry a code is unchanged.

## Build steps

- [x] 1. **Fallback and check.** Make the change in `backend/src/db/season-standings.ts`, and add a test to `frontend/e2e/api-tv-codes.spec.js` (it reads the live API) that every row of `/2000/phases/RS/standings` has a non-empty `clubTvCode` and that Union Olimpija's (`LJU`) is `LJU`. Done when this test passes on the local database (`/api/health` says `local`; restart the backend if it does not pick up the change), the rest of `api-tv-codes.spec.js` still passes, a screenshot of Home for 2000-01 at 390px shows `LJU` in its group instead of the full name, and root `npm run build` (backend `tsc` included) and `cd frontend && npm run lint` pass.

## Verify

`cd frontend && npx playwright test api-tv-codes.spec.js` on the local DB only. Manually: open Home for 2000-01 at about 390px and look at the league table group that holds Olimpija (7-3).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2268,"specSha256":"d3f11501472fab682918652664858cb1673aa89d146a57fdeffc41b848abba01","branch":"refs/heads/fix/standings-rows-fall-back-to-the-club-code-when-a-club-has-no-tv-code","head":"7577ee68df63bd4fd1f902dfe1394feee767d3aa","baseRef":"refs/heads/master","baseCommit":"7577ee68df63bd4fd1f902dfe1394feee767d3aa","sourceTree":"50fdb239f243fc4d27c1aa681c777a0239e70742","absentOptional":[]} -->

## Completion evidence

- Found by scanning the standings of every season from 2000 to 2026 on the local database: only Union Olimpija (LJU) in 2000-01 had a null `clubTvCode`. After the change `/api/seasons/2000/phases/RS/standings` returns `LJU` for it.
- Local database (`/api/health` said `local`): `api-tv-codes.spec.js` passed (7 tests including the new 2000-01 test; the dev backend reloaded the change without a restart). With the backend change stashed, the new test failed.
- A 390px screenshot of Home for 2000-01 showed LJU in the group with the 7-3 records instead of the full name.
- Root `npm run build` (backend `tsc` included) and `cd frontend && npm run lint` pass. No `Verify` command is declared in `AGENTS.md`. Neon was not checked; the gap comes from the source data and the fallback is in the route, so it applies there once deployed.
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested.
