# Feature: Player page

**From build-plan:** feature 39d
**Build attempt:** 1
**Branch:** feature/player-page
**Status:** verified

## Goal

The player page (`/:season/players/:personKey`) stops showing panel-sized spinners. Every player tab (Overview, Season by
season, Statistics, Advanced, Shooting, Games) and its panels show placeholders shaped like the content they stand in for,
and the player page gets its own route-fallback skeleton in place of the generic one. Same pattern as 39b and 39c.

## In scope

- **Page skeleton file** `frontend/src/players/PlayerPageSkeleton.jsx`, importing only `lib/Skeleton.jsx` (none of the
  page's code, so it stays out of the page's lazy bundle). It holds:
  - the page top: the back-link bar, the `PlayerHero` shape (portrait, name, club and facts) and the section tab strip;
  - one skeleton per tab body and per panel listed below;
  - a default export: the page top over the Overview body.
- **Whole page**: `PlayerPage`'s "Loading the player" shows the default page skeleton.
- **Overview**:
  - "Loading league rankings" shows the Overview body: the season line, the profile radar panel, the form panel and the
    shooting panel, in the loaded grid.
  - `FormPanel`'s "Loading recent games" body shows the form panel's bars and deltas inside the loaded panel.
- **Season by season**:
  - "Loading season history" shows the career layout: charts and the season table.
  - `PlayerCareerCharts`' "Loading league rankings for every season", shown after its button is pressed, shows a radar
    block of the loaded size.
- **Statistics**: "Loading season statistics" shows the statistics panel, with grouped stat rows in two columns from xl.
  The tab's own phase and mode controls stay as they are.
- **Advanced**: "Loading advanced player stats" shows the advanced layout: gauges and rated panels, as the loaded tab
  draws them.
- **Shooting**:
  - Both "Loading this player's shot locations" and "Aggregating N shooting charts" show the shooting panel skeleton. The
    dynamic label stays.
  - The team page's `TeamShootingSkeleton` moves to `lib/Skeleton.jsx` as `SkeletonShooting`, because both pages draw the
    same `ShootingBreakdown`. The team page imports it from there, and its look is unchanged. Differences in the
    player's controls row are matched with an opt-in prop.
- **Games**: "Loading the game log" shows the games layout: its controls and game rows.
- **Route fallback**: `DETAIL_SKELETONS` in `frontend/src/season/SeasonLayout.jsx` gains `players` -> the player page
  skeleton. It draws Overview, the tab a player page opens on. Game pages keep the generic `SkeletonPage` until 39e.
- **Rules from the plan**, for everything above:
  - A skeleton shows only while there is nothing to show, never during a refetch. It is driven by
    `isLoading`/`isPending` as today.
  - It is still under reduced motion.
  - The specific "Loading ..." label stays through `AsyncState`'s `role="status"`.
  - Error, empty and not-found states are unchanged.

## Out of scope

- Game pages, the Compare sections and Head-to-head (39e).
- Small inline spinners and loading text, such as the player picker's "Loading..." note.
- Putting the active player tab in the URL, per-tab route fallbacks, artificial delays, or any API, data or loading-logic
  change.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then one review. Checkpoint commits are disabled; `/complete` makes
the single feature commit. Before any browser test run, `/api/health` must report `"target":"local"`. Run only the specs
named in each step plus `skeleton-loading.spec.js` and `responsive.spec.js`.

## Build steps

- [x] **1. Page top, Overview and route fallback.**
  - Create `PlayerPageSkeleton.jsx` with the page top, the Overview body and the form panel body, plus the default export.
  - Wire it into `PlayerPage` ("Loading the player") and `PlayerOverviewSection` (both states).
  - Add `players` to `DETAIL_SKELETONS`.

  **Done when:**
  - With the player's data held back in `skeleton-loading.spec.js`, a player page shows the page skeleton with "Loading
    the player" and no spinner, then the page.
  - With the leaderboard and the game log held back, the Overview shows its skeleton, then the form panel its own, then
    the content.
  - Holding `PlayerPage.jsx` shows the player page skeleton as the "Loading page" fallback. This replaces the 39c test
    "a player page keeps the generic page skeleton" with a game-page one.
  - `player-overview-layout` passes.

- [x] **2. Season by season, Statistics and Games.**
  - Add the career, career-radar, statistics and games skeletons.
  - Wire them into `PlayerCareerSection`, `PlayerCareerCharts`, `PlayerStatisticsSection` and `PlayerGamesSection`.

  **Done when:**
  - With each tab's data held back, opening the tab shows its skeleton under its existing label and no spinner, then the
    content.
  - Pressing "Compare the profile by season" with the rankings held back shows the radar block.
  - `player-career-layout`, `player-statistics-layout` and `player-shooting-games-layout` (Games part) pass.

- [x] **3. Advanced and Shooting.**
  - Add the advanced skeleton.
  - Move the shooting skeleton to `lib/Skeleton.jsx` and use it on both pages.
  - Wire them into `PlayerAdvancedSection`, `PlayerShootingTab` and `PlayerShootingSection`.

  **Done when:**
  - With the data held back, each tab shows its skeleton under its existing label, then the content.
  - The team page's Shooting skeleton test still passes.
  - `player-advanced-layout`, `player-shooting-games-layout` and `team-shooting-games-layout` pass.

- [x] **4. Fit.**
  - Compare each skeleton with the loaded tab at 390px and 1280px, using screenshots and measured heights from a
    temporary spec that is deleted afterwards.
  - Adjust until each lands within about 10% of its loaded height, apart from data-driven differences.

  **Done when:**
  - The measurements are recorded in the Result section.
  - `skeleton-loading` and `responsive` pass.
  - Frontend lint and the root build pass.

## Result

- All four steps built. New `frontend/src/players/PlayerPageSkeleton.jsx` (imports only `lib/Skeleton.jsx`): the page top
  (hero and tabs), the Overview body and form-panel body, the Season by season, career radar, Statistics, Advanced and
  Games skeletons. Wired into `PlayerPage` (player, shot locations), `PlayerOverviewSection` (rankings, recent games),
  `PlayerCareerSection`, `PlayerCareerCharts`, `PlayerStatisticsSection`, `PlayerAdvancedSection`,
  `PlayerShootingSection` and `PlayerGamesSection`.
- Shared move: `lib/Skeleton.jsx` gains `SkeletonPanelHead` and `SkeletonShooting` (with `sides`, default true, for the
  team page's club-or-opponents tabs; the player page passes `sides={false}`). `teams/TeamPageSkeleton.jsx` now uses both;
  the team page's Shooting skeleton is the same markup as before, and its test passes.
- Route fallback: `DETAIL_SKELETONS` gains `players`; game pages keep the generic skeleton.
- Fit (player 011209, 2026; heights skeleton/loaded in px; Statistics' loaded height includes the tab's own heading and
  controls, about 100px, which stay outside the skeleton):

  | Tab | 390px | 1280px |
  | --- | --- | --- |
  | Page top (hero top, height) | 60, 532 / 60, 551 | 156, 290 / 156, 304 |
  | Overview | 1819/1923 | 813/835 |
  | Season by season | 3636/3498 | 2104/2349 |
  | Statistics | 2502/2697 | 1166/1323 |
  | Advanced | 3154/3468 | 2002/2120 |
  | Shooting | 1982/1854 | 1073/1009 |
  | Games | 1608/1575 | 1204/1168 |

  Season by season varies with the number of seasons and clubs; this player has five.
- `skeleton-loading.spec.js`: the 39c test "a player page keeps the generic skeleton" is now a player-page fallback test
  plus a game-page generic-fallback test; 10 player tests added (whole page, Overview and form panel, the five other tabs,
  Shooting while the game log loads, and the career radar).
- Checks on the local target: `skeleton-loading`, the six player specs, `team-shooting-games-layout` and `responsive` -
  250 passed, 1 failed. `player-statistics-layout` "stat rows fit at every width" (the highlight chips wrap to 3 rows below
  640px) fails the same way on `master` with this branch stashed - pre-existing and data-dependent, a candidate for its own
  `/fix`.
- Frontend lint and root build pass.

## Files / areas

- New: `frontend/src/players/PlayerPageSkeleton.jsx`.
- Wiring:
  - `frontend/src/players/PlayerPage.jsx`
  - `PlayerOverviewSection.jsx`
  - `PlayerCareerSection.jsx`
  - `PlayerCareerCharts.jsx`
  - `PlayerStatisticsSection.jsx`
  - `PlayerAdvancedSection.jsx`
  - `PlayerShootingSection.jsx`
  - `PlayerGamesSection.jsx`
- Shared: `frontend/src/lib/Skeleton.jsx` (`SkeletonShooting`, moved from `teams/TeamPageSkeleton.jsx`, whose Shooting
  tab then uses it).
- Route fallback: `frontend/src/season/SeasonLayout.jsx`.
- Tests: `frontend/e2e/skeleton-loading.spec.js`.

## Data / contracts

None changed. The skeletons use the existing `AsyncState` `skeleton` prop and the existing labels. There are no new
queries and no changes to query keys or loading conditions.

## Testing

- Browser tests only; there is no unit test runner. Add tests to `skeleton-loading.spec.js` using its
  `hold`/`expectSkeleton`/`expectLoaded` helpers.
- Open tabs by clicking the "Player detail section" tab strip.
- The player page specs, `team-shooting-games-layout`, `responsive` and `skeleton-loading` must pass on the local
  target. Known pre-existing failures (`team-stats-null`, `postseason-layout` 1024px, `cancelled-season`) are reported
  only if they still fail on `master`.
- No Verify command is declared. The final gate is frontend lint plus the root build.

## Notes for the AI

- Mirror the loaded markup's grid, gaps and paddings, as `TeamPageSkeleton.jsx` does. The fit step checks this.
- Scope changes to the player page. The one shared move (`SkeletonShooting`) must leave the team page's Shooting
  skeleton looking the same.
- Never read `.env` files.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10207,"specSha256":"ce17f5010a1796e297ff24e6dabe96da962e4af9cb84790c32e54775bd205653","branch":"refs/heads/feature/player-page","head":"37baab88684ad5d063dac9760a312b52bccbb14c","baseRef":"refs/heads/master","baseCommit":"37baab88684ad5d063dac9760a312b52bccbb14c","sourceTree":"f1b5e8b169b9cc0559df1d4c055759ba5136da14","absentOptional":[]} -->
