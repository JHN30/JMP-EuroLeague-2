# Fix: Team and player shots count only played games

**Type:** Fix
**Status:** verified
**Branch:** fix/team-and-player-shots-count-only-played-games
**Fixes:** F-10

## The problem

The team Shooting tab reads `/teams/:club/shots` (`getTeamShots` in `backend/src/db/season-games.ts`). It takes every
field-goal attempt from the stage's games of the club that have shot rows, whether or not the game is finished. The
rest of the tab counts only games the site treats as played: `played` is true and both scores are set (the games query
in the same file, around line 1270). That count drives the loading label's game count and the free-throw totals.
The player Shooting tab's `getPlayerShots` has the same gap.

If the live data ever holds shots for a game in progress, the courts would include that game's shots, but the game
count and the free-throw totals next to them would not. On the local copy no season has any shots in a game that
isn't counted as played (checked 2026-11-18), so today nothing differs. Whether the pipeline loads shots during a live
game can't be checked from this repo.

## The fix

- In `getTeamShots`, add the site's existing played-game condition to the `games` join filter:
  `eq(games.played, true)`, `isNotNull(games.localScore)`, `isNotNull(games.roadScore)`. It already joins `games`, so
  this adds no query and no new helper. It's the same three checks the team tab uses for its game count.
- `getPlayerShots` stays without it (see Step 2 and F-11). The player tab counts its games from the game log, which
  has no played check, so adding one to its shots would split them from its game count.
- Shots of a game in progress then appear only once the game is marked played with both scores, the same moment it
  joins the game count and the free-throw totals.

Must not break:
- The answers for finished games. With today's data they must be byte-identical before and after.
- The single-game shot chart (`getShots`), which shows a game's shots on its own page and stays as it is.
- The league Shooting page (`getPositionShots`), which counts its games from the same appearances it shows. It isn't
  part of this finding.
- The route rules (`allowQuery`), status codes and the response cache.

## Build steps

- [x] **Step 1 - count only played games' shots on the team and player tabs.** Add the three conditions to the
  `where` of `getTeamShots` and `getPlayerShots`.
  **Done when:** `cd backend && npm run build` passes. With the local database, the answers of
  `/api/seasons/E2025/teams/OLY/shots?phase=RS` and one player's shots for the same stage are byte-identical to master
  (saved before the change, compared after). A read-only SQL probe still finds no shots in a game that isn't counted
  as played.
- [x] **Step 2 - repair F-11: keep the player tab on its own game count.** The audit found that the player tab counts
  its games from the game log, which has no played check. So the played check in `getPlayerShots` would split its
  shots from its game count. Remove the three conditions from `getPlayerShots` again, keep them in `getTeamShots`, and
  leave a one-line reason comment at `getPlayerShots`.
  **Done when:** `cd backend && npm run build` passes. The diff against master touches only `getTeamShots` and that
  comment. The 8 before/after answers are still byte-identical. The API and both Shooting tab specs pass.
- [x] **Step 3 - repair F-12: make the team filter's comment accurate.** The free-throw totals come from the
  pipeline's `teamSeasonStats` row, not from the three checks. So the comment in `getTeamShots` now names only the
  game count.
  **Done when:** `cd backend && npm run build` passes, and the comment claims only what the code does.

## Verify

- `cd backend && npm run build`.
- The byte-identical comparison from Step 1.
- Browser specs for the two tabs and the API, against the local database (`/api/health` must report
  `"target":"local"`): `npx playwright test api-response-cache.spec.js team-shooting-games-layout.spec.js` plus the
  player Shooting tab's spec(s).
- Manual: open a team's Shooting tab and a player's Shooting tab. The courts, the game count and the free-throw totals
  look the same as before.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4206,"specSha256":"a68ec4c1733f62fa3604b7013cbc366745593b21f9e3fb8de8cec4f0ecd3e9bf","branch":"refs/heads/fix/team-and-player-shots-count-only-played-games","head":"cc2a9ebd413beac86b58cb0e3c441ab2d75b56b3","baseRef":"refs/heads/master","baseCommit":"cc2a9ebd413beac86b58cb0e3c441ab2d75b56b3","sourceTree":"e1e89370a30fb0dc5e71a3b23e114ca58367d4d1","absentOptional":[]} -->

## Findings

### team-and-player-shots-count-only-played-games/F-10 [P3] closed - Team stage shots include games the page does not count as played

**File:** backend/src/db/season-games.ts (`getTeamShots`)
**Found:** 2026-11-18 by /audit (scope: current; lens: all)
**Why it matters:** The old loader fetched shots only for games the page counts as played (`played` and both scores set). `getTeamShots` takes every game of the stage that has shot rows, as `getPlayerShots` already does. If the live data ever holds shots for a game in progress, the team courts would include them, while the loading label's game count and the free-throw totals would not. The local data shows none: 522 unplayed 2026 games, no shots, and the counts match for all 20 teams.
**Suggested fix:** If live games can carry shots, add `eq(games.played, true)` to `getTeamShots` (and to `getPlayerShots` for the player tab).
**Resolution:**
2026-11-18 repair on fix/team-and-player-shots-count-only-played-games: `getTeamShots` and `getPlayerShots` now also require `games.played = true` and both scores set, the checks the tab's game list uses. Before/after answers byte-identical (fresh, X-Cache MISS) for 8 requests: OLY RS, PAN RS and PO, and player 009849 RS, each for E2025 and E2026. A read-only SQL probe finds no shots in a game not counted as played in any local season, so the filter changes nothing today and only guards live data. Specs: api-response-cache, team- and player-shooting-games-layout, skeleton-loading: 98 passed. Awaiting review.
2026-11-18 /audit (scope: current; all lenses) of master cc2a9eb..working tree: closed for the team tab. season-games.ts:807-810 adds `played = true` and both scores to `getTeamShots`, the same three checks TeamShootingSection.jsx:19-21 uses for its game count; answers unchanged on today's data (8 before/after comparisons identical). The player half of the change is recorded separately as F-11.

### team-and-player-shots-count-only-played-games/F-11 [P3] closed - The player Shooting tab would now leave a game in progress out of its shots but not its game count

**File:** backend/src/db/season-games.ts:778-781 (`getPlayerShots`); frontend/src/players/PlayerShootingSection.jsx:58
**Found:** 2026-11-18 by /audit (scope: current; lens: all)
**Why it matters:** The player tab counts its games from the player's game log (`getPlayerGameLog`, any game with a box-score row, no played check) and divides its per-game numbers by that count. This branch adds the played check to `getPlayerShots` only, so if live data ever held box-score rows and shots for a game in progress, the tab would count the game but not its shots, and its per-game numbers would come out low. Before this branch both sides included the game, so the tab agreed with itself. F-10's suggestion to filter the player tab too did not hold for this tab. Today the local data has no box-score rows or shots in any game not counted as played, so nothing differs yet.
**Suggested fix:** Remove the three played conditions from `getPlayerShots` again (keep them in `getTeamShots`), so the player tab's shots and its game count keep using the same games.
**Resolution:**
2026-11-18 repair on the same branch (spec Step 2): the three played conditions are removed from `getPlayerShots` again and kept in `getTeamShots`; a comment at `getPlayerShots` (season-games.ts:761-763) says why. Diff against master now touches only `getTeamShots` and that comment. The 8 before/after answers are still byte-identical (fresh, X-Cache MISS). Specs api-response-cache, team- and player-shooting-games-layout, skeleton-loading: 98 passed. Awaiting review.
2026-11-18 /audit (scope: current; all lenses) of master cc2a9eb..working tree: closed. `getPlayerShots` is back to master's conditions (diff against master touches it only in the comment at season-games.ts:761-763), so the player tab's shots and its game count (`getPlayerGameLog`, no played check) again cover the same games. The comment states that accurately. No new defect in this function.

### team-and-player-shots-count-only-played-games/F-12 [P3] closed - The comment on the team shots filter says the free-throw totals use the same checks; they don't

**File:** backend/src/db/season-games.ts:804
**Found:** 2026-11-18 by /audit (scope: current; lens: quality)
**Why it matters:** The new comment reads "the tab's game count and free-throw totals use the same three checks". The game count does (TeamShootingSection.jsx:19-21). The free-throw totals come from `getTeamStatsSummary`, which reads the pipeline's precomputed `teamSeasonStats` row for the phase and applies no played check of its own. A later reader could trust the comment and assume the free throws are filtered the same way.
**Suggested fix:** Reword the comment to claim only what holds, e.g. "Only games counted as played, the same three checks the tab uses for its game count."
**Resolution:**
2026-11-18 repair on the same branch (spec Step 3): the comment at season-games.ts:804 now reads "Only games counted as played: the same three checks the tab uses for its game count." `cd backend && npm run build` passed.
2026-11-18 /audit re-review (scope: current; lens: quality) of master cc2a9eb..working tree: closed. The comment now claims only the game-count match, which TeamShootingSection.jsx:19-21 confirms; it no longer mentions the free-throw totals. The change is comment-only, so behaviour is as in the earlier evidence (8 answers byte-identical, 98 specs passed). No new defect.
