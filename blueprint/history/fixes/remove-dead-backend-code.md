# Fix: Remove dead backend code

**Type:** Fix
**Status:** verified
**Branch:** fix/remove-dead-backend-code

## The problem

A read-only survey of the database and its backend code found code that serves nothing:

| What | Where | Why it is dead |
|---|---|---|
| `GET /seasons/:season/coverage` | [routes/seasons.ts](../../backend/src/routes/seasons.ts) (route), [db/season-coverage.ts](../../backend/src/db/season-coverage.ts) (90 lines), `coverageSeasons` / `coverageGames` in [db/season-schema.ts](../../backend/src/db/season-schema.ts) | The frontend never calls it. The game page's coverage panel was removed on purpose, and `game-box-score.spec.js` checks that no coverage request is made. Its only caller is one assertion in `historical-era-pages.spec.js`. |
| `zones` in `GET /teams/:club/advanced` | `getTeamShotZoneStats` and the `teamShotZoneStats` table in [db/season-advanced.ts](../../backend/src/db/season-advanced.ts) and [db/season-advanced-schema.ts](../../backend/src/db/season-advanced-schema.ts) | It holds the feed's official A-J zones, and no page reads it. The Shooting tabs calculate the app's own 14 zones from the shot coordinates (`frontend/src/lib/shotZones.js`). |
| Unused imports | Top of [routes/seasons.ts](../../backend/src/routes/seasons.ts): `and, desc, eq, inArray, sql` from drizzle-orm, `db`, `catalogRead`, `getClubTvCodes` | Leftovers from code that moved into `db/`. `tsc --noUnusedLocals` flags them. |

## The fix

**Remove:**
- The coverage route and its `getCoverage` import.
- `db/season-coverage.ts`.
- The `coverageSeasons` and `coverageGames` Drizzle tables.
- `getTeamShotZoneStats`, the `TeamShotZoneStatsRow` type, the `teamShotZoneStats` Drizzle table, and their imports.
- From the team advanced route: the zones query and `zones` in both of its responses (the empty one and the full one).
- The unused imports in `routes/seasons.ts`.

**Spec change:** in `historical-era-pages.spec.js`, the E2018 game 21 test drops its coverage request. It keeps its page checks: the box score is there, and Play-by-play and Shooting say their data is unavailable.

**Must not change:**
- `GET /seasons/:season` and the exports that are only used inside their own file stay.
- Every other route and every response field except `zones`.
- No UI change.
- No database change. The `app_coverage_*` and shot-zone tables stay in Postgres; dropping them is a separate pipeline decision.

## Build steps

- [x] **1. Remove the dead code and update the one spec.**
  - **Done when:** these all pass:
    - `cd backend && npm run build`, plus `npx tsc --noEmit --noUnusedLocals` reporting nothing for `routes/seasons.ts` beyond the Express `req` parameters in `index.ts`.
    - A search for `coverage`, `getCoverage` and `teamShotZoneStats` finds no backend code.
    - `GET /api/seasons/2025/coverage` answers 404 `ROUTE_NOT_FOUND`.
    - `GET /api/seasons/2025/teams/MAD/advanced` answers without a `zones` field and with the rest of its shape unchanged.

## Verify

- `/api/health` reports `"target":"local"`.
- Run `cd backend && npm run build`, `cd frontend && npm run lint`, and `npm run build`.
- Run `cd frontend && npx playwright test historical-era-pages.spec.js game-box-score.spec.js api-team-advanced.spec.js team-advanced-layout.spec.js team-shooting-games-layout.spec.js`.
- **Manual check:** a team page's Advanced and Shooting tabs look the same as before.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3408,"specSha256":"1e4e37c664d33647ee3c88351a855a55b3a1ce218a8cc80e664ab0750ba922ec","branch":"refs/heads/fix/remove-dead-backend-code","head":"0c047055446c233f708574161974e10bcbaaa821","baseRef":"refs/heads/master","baseCommit":"0c047055446c233f708574161974e10bcbaaa821","sourceTree":"7bde977ab1debd92760d2e2061d4d214906bd3d5","absentOptional":[]} -->
