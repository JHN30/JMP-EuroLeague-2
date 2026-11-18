# Fix: Team Shooting tab loads its shots in one request

**Type:** Fix
**Status:** verified
**Branch:** fix/team-shooting-tab-loads-its-shots-in-one-request
**Fixes:** F-02

## The problem

The team page's Shooting tab (`frontend/src/teams/TeamShootingSection.jsx:22`) gets its shots through
`useSeasonShots` (`frontend/src/lib/shootingData.js:8`). That runs one `/games/:gameCode/shots` query per played game of
the stage, so about 30–40 requests for a regular season. The tab shows its skeleton ("Aggregating N shooting charts")
until the last one lands.

On every render, `useSeasonShots` also rebuilds the flattened `shots` array. `sideShots` (`TeamShootingSection.jsx:40`)
then copies every opponent shot into a new object, so `ShootingStudio` gets a new array each render.

The player Shooting tab already loads its shots in one request (`/players/:personKey/shots?phase=`).

## The fix

Give the team tab the same one-request shape as the player tab.

1. **Backend.** Add `getTeamShots(seasonCode, clubCode, phaseCode)` in `backend/src/db/season-games.ts`, next to
   `getPlayerShots`. It returns the same `SHOT_COLUMNS` rows: every field-goal attempt in the phase's games where the club
   is the local or the road team, which covers both the club's shots and its opponents'. Rows are ordered by game, then
   shot ordinal.

   Add the route `/:seasonCode/teams/:clubCode/shots` with `allowQuery("phase")`. It is checked like the player shots
   route:
   - the season is valid;
   - the phase is one of `FORM_PHASES` and in the season's format, else 400 `INVALID_PHASE`;
   - the club exists in the season (`getTeam`), else 404 `TEAM_NOT_FOUND`, the code the other team routes use.

   Its answer goes through the response cache like every other route.
2. **Frontend.**
   - Add `getTeamShots` to `lib/api.js` and a `useTeamShots(seasonCode, clubCode, phaseCode, enabled)` hook to
     `lib/shootingData.js`, shaped like `usePlayerShots`.
   - Use it in `TeamShootingSection`, enabled only when the stage has played games.
   - Wrap `sideShots` in `useMemo` keyed on the shots and the club.
   - Remove `useSeasonShots`; nothing else uses it.
   - The loading label keeps its played-game count.

Must not break:
- The tab's content: the club's court, the opponents' court, the zones and quarter comparisons, the player table, and the
  free throws.
- Its empty state ("No played games yet in the …") and its error state with Retry.
- The game page's own Shooting tab, which keeps `/games/:gameCode/shots`.

## Build steps

- [x] 1. Backend: add `getTeamShots` and the `teams/:clubCode/shots` route.
   **Done when:** the backend builds, and against the local DB, `/api/seasons/E2025/teams/OLY/shots?phase=RS` returns the
   same set of shots as the per-game answers for OLY's RS games combined (same count, and the club's own shot count
   matches). A missing `phase` gets 400, and an unknown club gets 404.
- [x] 2. Frontend: switch the tab to `useTeamShots`, memoise `sideShots`, and remove `useSeasonShots`. Update the tests
   that stub or wait for the per-game shot address on the team page:
   - `e2e/team-shooting-games-layout.spec.js`: `SHOTS_URL` matches `teams/:club/shots`. A payload that was served once
     per game is now served once, so adjust any counts that relied on that.
   - The team row of `e2e/skeleton-loading.spec.js`: its pattern becomes `teams/PAN/shots`.

   Add an API test that the route answers 400 without `phase` and 404 for an unknown club.
   **Done when:** opening a team's Shooting tab makes one shots request instead of one per game, and these pass:
   `npx playwright test team-shooting-games-layout.spec.js skeleton-loading.spec.js api-response-cache.spec.js`.

## Verify

- `cd backend && npm run build`, `cd frontend && npm run lint`.
- With `/api/health` reporting `"target":"local"`, run
  `npx playwright test team-shooting-games-layout.spec.js skeleton-loading.spec.js team-overview-layout.spec.js api-response-cache.spec.js`.
- Manually, open `/2025/teams/OLY` → Shooting with the browser's Network tab open: one `teams/OLY/shots?phase=RS`
  request, and the courts match the live site's.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4152,"specSha256":"2fddd16dd767b43fcefbb76597b907dfdb947cc05b19a0d07e60fe259acf873b","branch":"refs/heads/fix/team-shooting-tab-loads-its-shots-in-one-request","head":"db5d16c77f05cf9c2a8ab59bbd36b11f19c6a24d","baseRef":"refs/heads/master","baseCommit":"db5d16c77f05cf9c2a8ab59bbd36b11f19c6a24d","sourceTree":"8c0fd51cf5a3006559b595cfc6fee0af7b68d46b","absentOptional":[]} -->

## Findings

### team-shooting-tab-loads-its-shots-in-one-request/F-02 [P2] closed - The team Shooting tab sends one request per played game

**File:** frontend/src/lib/shootingData.js:9 (used by frontend/src/teams/TeamShootingSection.jsx:22)
**Found:** 2026-11-18 by /audit (scope: full; lens: performance)
**Why it matters:** `useSeasonShots` runs one `/games/:gameCode/shots` query per played game, about 30-40 requests per team and stage, and the tab shows a skeleton until the last one lands. The flattened `shots` array and the `sideShots` copy (TeamShootingSection.jsx:40) are also rebuilt on every render, handing ShootingStudio a new array each time.
**Suggested fix:** Add a `club` filter to the existing `/:seasonCode/shots` route (the club's shots plus its opponents' shots in its games), as the player and position tabs already use one request; memoise `sideShots`.
**Resolution:** Repaired on fix/team-shooting-tab-loads-its-shots-in-one-request: new `/teams/:clubCode/shots?phase=` route (`getTeamShots`) returns the stage's shots for both sides in one answer (identical rows to the per-game answers combined: OLY 2025 RS, 38 games, 4,888 shots); the tab uses `useTeamShots` and memoises `sideShots`; `useSeasonShots` removed. Awaiting review.
Closed 2026-11-18 by /audit (scope: current; lenses: all): the tab makes one `teams/:club/shots?phase=` request (one request on /2025/teams/OLY instead of 38); rows are identical to the per-game answers combined (OLY 2025 RS) and the counts match for all 20 teams of 2026; the route answers 200 for every season and stage (27 seasons, 91 calls); `sideShots` is memoised on a stable empty list. No new defect found; F-10 records one unverified lead.
