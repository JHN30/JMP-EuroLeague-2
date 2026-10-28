# Feature: Game page

**From build-plan:** feature 39e-i
**Build attempt:** 1
**Branch:** feature/game-page
**Status:** verified

## Goal

The game page (`/:season/games/:gameCode`) stops showing panel-sized spinners. Every game tab (Overview, Box score, Game
flow, Rotations, Team comparison, Shooting, Play-by-play) and its panels show placeholders shaped like the content they
stand in for. The game page also gets its own route-fallback skeleton in place of the generic one. This follows the pattern
of 39b-39d.

## In scope

- **Page skeleton file** `frontend/src/games/GamePageSkeleton.jsx`. Like the earlier skeleton files, it imports only
  `lib/Skeleton.jsx`, so it stays out of the page's lazy bundle. It holds:
  - the page top: the back-link bar, the `MatchupHeader` shape (two clubs with crests, the score or tip-off, the round and
    venue line) and the tab strip;
  - one skeleton per tab body and per panel listed below;
  - a default export: the page top over the Overview body.
- **Whole page**: `GameDetailPage`'s "Loading the game" shows the default page skeleton.
- **Overview** (`OverviewTab.jsx`):
  - "Loading the overview" shows the Overview body.
  - The panel-level compact spinners become blocks of their panel's loaded size:
    - "Loading the score flow";
    - "Loading the best players";
    - `FourFactors` "Loading the Four Factors";
    - `ScoringProfile` "Loading the scoring profile".
- **Box score**:
  - "Loading the box score" shows the two team tables (header rows and player rows).
  - The Advanced view's "Loading advanced stats" shows the same table shape.
- **Game flow**: "Loading game flow" shows the flow chart and its panels.
- **Rotations** (`RotationsTab.jsx`, `LineupsSection.jsx`): "Loading rotations", "Loading assist connections" and
  "Loading lineups" show the timeline rows, the connection grid and lineup rows. These spinners are compact today.
- **Team comparison**: "Loading team comparison" shows comparison rows inside the existing "Head to head" section.
- **Shooting**: "Loading shot chart" shows the shot map panel and its filters.
- **Play-by-play**: "Loading play-by-play" shows the period tabs and event rows.
- **Route fallback**: `DETAIL_SKELETONS` in `frontend/src/season/SeasonLayout.jsx` gains `games` -> the game page skeleton.
  It draws Overview, the tab a game page opens on; an unplayed game only has Overview. After this, every detail page has
  its own fallback. Head-to-head (`/compare/head-to-head`) keeps the generic skeleton until 39e-ii.
- **Rules from the plan**, for everything above:
  - A skeleton shows only while there is nothing to show, never during a refetch, as today's
    `isLoading`/`isPending`/missing-data conditions decide.
  - It stays still under reduced motion.
  - The specific "Loading ..." label stays through `AsyncState`'s `role="status"`.
  - Error, empty, unplayed, cancelled and not-found states are unchanged.

## Out of scope

- The Compare sections and the Head-to-head page (39e-ii).
- `CompetitionContext`'s one-line loading text, small inline spinners inside chips or buttons, and the match cards'
  own image shimmer.
- Putting the active game tab in the URL, per-tab route fallbacks, artificial delays, or any API, data or loading-logic
  change.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then one review. Checkpoint commits are disabled; `/complete` makes
the single feature commit. Before any browser test run, `/api/health` must report `"target":"local"`. Run only the specs
named in each step plus `skeleton-loading.spec.js` and `responsive.spec.js`.

## Build steps

- [x] **1. Page top, Overview and route fallback.**
  - Create `GamePageSkeleton.jsx` with the page top, the Overview body and its panel blocks, plus the default export.
  - Wire it into `GameDetailPage` ("Loading the game"), `OverviewTab`, `FourFactors` and `ScoringProfile`.
  - Add `games` to `DETAIL_SKELETONS`.

  **Done when:**
  - With the game held back in `skeleton-loading.spec.js`, a played game shows the page skeleton with "Loading the game"
    and no spinner, then the page.
  - With the box score held back, the Overview shows its skeleton, then the content.
  - Holding `GameDetailPage.jsx` shows the game page skeleton as the "Loading page" fallback. This replaces the 39d test
    "a game page keeps the generic page skeleton" with a Head-to-head one.
  - `game-overview`, `game-four-factors`, `game-scoring-profile` and `game-matchup-header` pass.

- [x] **2. Box score, Game flow and Team comparison.**
  - Add the box score, flow and comparison skeletons.
  - Wire them into `GameDetailPage` (both box score states, game flow, team comparison).

  **Done when:**
  - With each tab's data held back, opening the tab shows its skeleton under its existing label and no spinner, then the
    content.
  - `game-box-score`, `game-box-score-layout`, `game-advanced-box-score` and `game-flow-layout` pass.

- [x] **3. Rotations, Shooting and Play-by-play.**
  - Add the rotations, connections, lineups, shooting and play-by-play skeletons.
  - Wire them into `RotationsTab`, `LineupsSection` and `GameDetailPage`.

  **Done when:**
  - With each tab's data held back, opening the tab shows its skeleton under its existing label, then the content.
  - `game-rotations`, `game-rotations-layout`, `game-lineups`, `game-shooting`, `game-shooting-layout`,
    `game-play-by-play` and `game-play-by-play-layout` pass.

- [x] **4. Fit.**
  - Compare each skeleton with the loaded tab at 390px and 1280px, using screenshots and measured heights from a
    temporary spec that is deleted afterwards.
  - Adjust until each lands within about 10% of its loaded height, apart from data-driven differences.

  **Done when:**
  - The measurements are recorded in the Result section.
  - `skeleton-loading`, `game-detail-layout` and `responsive` pass.
  - Frontend lint and the root build pass.

## Result

- All four steps built. New `frontend/src/games/GamePageSkeleton.jsx` (imports only `lib/Skeleton.jsx`): the page top
  (matchup header with the arena, attendance and officials row, and the tabs), the Overview body, the box score (both views),
  game flow, rotations, team comparison rows, shooting and play-by-play skeletons, plus `PanelBlockSkeleton` and
  `TwoBlocksSkeleton` for the panels that loaded behind a compact spinner.
- Wired into `GameDetailPage` (game, box score, advanced stats, game flow, team comparison, shot chart, play-by-play),
  `OverviewTab` (overview, best players, score flow), `FourFactors`, `ScoringProfile`, `RotationsTab` (rotations,
  assist connections) and `LineupsSection`.
- Route fallback: `DETAIL_SKELETONS` gains `games`; every detail page now has its own fallback, and Head-to-head keeps the
  generic one until 39e-ii.
- Fit (game 2, 2026; heights of the tab panel, skeleton/loaded in px):

  | Tab | 390px | 1280px |
  | --- | --- | --- |
  | Page top (header top, height) | 60, 333 / 60, 364 | 156, 257 / 156, 283 |
  | Overview | 2126/2141 | 1726/1732 |
  | Box score | 1768/1664 | 1768/1763 |
  | Game flow | 1540/1456 | 972/956 |
  | Rotations | 3950/4327 | 2028/2224 |
  | Team comparison | 2856/2796 | 1642/1609 |
  | Shooting | 2004/2007 | 1620/1622 |
  | Play-by-play | 3750/3624 | 3614/3653 |

  Box score and Rotations grow with the number of players and lineups; play-by-play shows the first sixty events.
- `skeleton-loading.spec.js`: the 39d test "a game page keeps the generic skeleton" is now a game-page fallback test plus a
  Head-to-head generic-fallback test; 9 game tests added (whole page, Overview and its panels, the six other tabs with all
  their loading labels, and the box score's Advanced view).
- Checks on the local target: `skeleton-loading`, the sixteen game specs and `responsive` - 359 passed, 4 failed. All four
  fail the same way on `master` with this branch stashed (4 failed, 24 passed in those spec files) - pre-existing:
  `game-box-score` "quarter marker have hover tips", `game-flow-layout` "average line stays in its half",
  `game-rotations` "an unplayed game says it is not available yet" and `game-rotations-layout` "inside the panel at
  320px". Candidates for their own `/fix`.
- Frontend lint and root build pass.

## Files / areas

- New: `frontend/src/games/GamePageSkeleton.jsx`.
- Wiring:
  - `frontend/src/games/GameDetailPage.jsx`
  - `OverviewTab.jsx`
  - `FourFactors.jsx`
  - `ScoringProfile.jsx`
  - `RotationsTab.jsx`
  - `LineupsSection.jsx`
- Route fallback: `frontend/src/season/SeasonLayout.jsx`.
- Tests: `frontend/e2e/skeleton-loading.spec.js`.
- Reuse from `lib/Skeleton.jsx`: `SkeletonPanelHead`, `SkeletonRankedRows`, `SkeletonBlock`, `SkeletonChip`. Add to that
  shared file only a piece another page already needs.

## Data / contracts

None changed. The skeletons use the existing `AsyncState` `skeleton` prop and the existing labels. There are no new
queries and no changes to query keys or loading conditions.

## Testing

- Browser tests only; there is no unit test runner. Add tests to `skeleton-loading.spec.js` using its
  `hold`/`expectSkeleton`/`expectLoaded` helpers.
- Use a played 2026 game and open tabs by clicking the "Game detail" tab strip, because the tab is not in the URL.
- The game specs named in the steps, `responsive` and `skeleton-loading` must pass on the local target. A failure is
  reported as pre-existing only if it fails the same way on `master`.
- No Verify command is declared. The final gate is frontend lint plus the root build.

## Notes for the AI

- Mirror the loaded markup's grid, gaps and paddings, as the team and player skeleton files do. The fit step checks this.
- A compact spinner made into a skeleton gets a block of its panel's loaded size, not a full-page shape.
- Scope changes to the game page. Shared components get opt-in props, never changed defaults.
- Never read `.env` files.
- Build-plan note: 39e was split into 39e-i and 39e-ii, with approval, before this spec. The overview's plan fingerprint
  now differs, so `/status` may report plan drift until `/overview` is rerun.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10221,"specSha256":"42d6a66df9c00fc02d20a8057183c055eb9c3b10e6cce96abd1a857493545255","branch":"refs/heads/feature/game-page","head":"1b898afc7b050c2ee85a8bd051286df8398a38d0","baseRef":"refs/heads/master","baseCommit":"1b898afc7b050c2ee85a8bd051286df8398a38d0","sourceTree":"73182e8963913abcdf55d2cf993361e9653b01f0","absentOptional":[]} -->
