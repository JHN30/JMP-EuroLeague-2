# Feature: Compare sections and Head-to-head

**From build-plan:** feature 39e-ii
**Build attempt:** 1
**Branch:** feature/compare-sections-and-head-to-head
**Status:** verified

## Goal

An opened comparison (`/:season/compare` with two teams or two players) and the Head-to-head page
(`/:season/compare/head-to-head`) stop showing panel-sized spinners. Every comparison section and the Head-to-head history
show placeholders shaped like the content they stand in for. An opened comparison and Head-to-head also get route-fallback
skeletons of their own. This finishes feature 39 and follows the pattern of 39b-39e-i.

## In scope

- **Skeleton files.** Each imports only `lib/Skeleton.jsx` (and `react-router` for reading the URL), never the page's code:
  - `frontend/src/comparisons/CompareSkeleton.jsx` (from 39b) gains the opened-comparison pieces:
    - the top: the way back, the pair header (two clubs or two players either side), the section tabs and the selects;
    - one skeleton per section listed below.
  - New `frontend/src/comparisons/HeadToHeadSkeleton.jsx` holds the Head-to-head page.
- **Opened comparison, while its code, phases or teams load**: `CompareSkeleton` draws the opened top over the Overview
  section instead of the generic `SkeletonPage`. With `view=players` it draws the player pair and the player Overview;
  otherwise the team pair and the team Overview.
- **Team sections**:
  - **Overview** (`CompareTeamOverview.jsx`):
    - "Loading the matchup";
    - the "Loading recent form" and "Loading the players" panels. Today these are inline spinners inside empty panels;
      they become the panels' rows.
  - **Statistics** (`CompareTeamStats.jsx`): "Loading the comparison".
  - **Rosters** (`CompareRosters.jsx`):
    - "Loading the rosters";
    - the "Most impactful players" table's inline "Loading the advanced numbers", which becomes table rows.
  - **Trends** (`CompareTeamTrends.jsx`): "Loading the trends".
- **Player sections**:
  - **Overview** (`ComparePlayerOverview.jsx`):
    - "Loading the players";
    - the form panel's inline "Loading recent games", which becomes the panel's bars.
  - **Statistics**: `PlayerComparisonTable` in `ComparisonsPage.jsx`, "Loading the comparison".
  - **Advanced** (`ComparePlayerAdvanced.jsx`): "Loading the advanced numbers".
  - **Trends** (`ComparePlayerTrends.jsx`): "Loading the trends".
- **Head-to-head** (`HeadToHeadPage.jsx`):
  - "Loading seasons" shows the whole page (header, pickers, history);
  - "Loading head-to-head history" shows the history body.
- **Route fallback**:
  - `DETAIL_SKELETONS` in `frontend/src/season/SeasonLayout.jsx` gains `compare` -> `HeadToHeadSkeleton`, since
    `/compare/head-to-head` is the only detail path under Compare.
  - The landing and opened comparison keep `CompareSkeleton`, which now draws the opened shape when both sides are in the
    URL.
  - After this, no season page uses the generic `SkeletonPage`. It stays in `lib/Skeleton.jsx` as the fallback for any
    future page.
- **Rules from the plan**, for everything above:
  - A skeleton shows only while there is nothing to show, never during a refetch, as today's
    `isLoading`/`isPending` conditions decide.
  - It stays still under reduced motion.
  - The specific "Loading ..." label stays through `AsyncState`'s `role="status"`. Each inline spinner made into a
    skeleton keeps its label too.
  - Error, empty ("Select two teams", "have not met") and not-found states are unchanged.

## Out of scope

- The Compare landing (done in 39b), the pickers' own "Loading..." and "Searching..." notes, and `ComparisonContext`.
- Small inline spinners inside chips or buttons.
- Any API, data, URL or loading-logic change.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then one review. Checkpoint commits are disabled; `/complete` makes
the single feature commit. Before any browser test run, `/api/health` must report `"target":"local"`. Run only the specs
named in each step plus `skeleton-loading.spec.js` and `responsive.spec.js`.

## Build steps

- [x] **1. Opened top and team Overview.**
  - Add the opened-comparison top and the team Overview skeletons to `CompareSkeleton.jsx`, and draw them for an opened
    comparison.
  - Wire them into `CompareTeamOverview` (matchup, recent form, players).

  **Done when:**
  - With the data held back in `skeleton-loading.spec.js`, `/2026/compare?teamA=PAN&teamB=OLY` shows the opened
    skeleton under "Loading phases", then the Overview's own skeletons, then the content.
  - The 39b test "an opened comparison the generic one" is updated to expect the opened shape.
  - `compare`, `compare-team-layout` and `compare-layout` pass.

- [x] **2. Team Statistics, Rosters and Trends.**
  - Add the three section skeletons and the impactful-players rows.
  - Wire them into `CompareTeamStats`, `CompareRosters` (both states) and `CompareTeamTrends`.

  **Done when:**
  - With each section's data held back, opening the section shows its skeleton under its existing label and no spinner,
    then the content.
  - `compare-team-layout` passes.

- [x] **3. Player sections.**
  - Add the player Overview (and its form body), Statistics, Advanced and Trends skeletons, and the player-view branch of
    the opened skeleton.
  - Wire them into `ComparePlayerOverview` (both states), `PlayerComparisonTable`, `ComparePlayerAdvanced` and
    `ComparePlayerTrends`.

  **Done when:**
  - With each section's data held back, a two-player comparison shows each section's skeleton under its existing label,
    then the content.
  - `compare-player-layout` passes.

- [x] **4. Head-to-head and its route fallback.**
  - Create `HeadToHeadSkeleton.jsx` (whole page and history body).
  - Wire it into `HeadToHeadPage` (both states).
  - Add `compare` to `DETAIL_SKELETONS`.

  **Done when:**
  - With its data held back, Head-to-head shows the page skeleton under "Loading seasons", then the history skeleton
    under "Loading head-to-head history", then the history.
  - Holding `HeadToHeadPage.jsx` shows its own skeleton as the "Loading page" fallback. This replaces the 39e-i test
    "Head-to-head keeps the generic page skeleton".
  - `head-to-head` and `head-to-head-layout` pass.

- [x] **5. Fit.**
  - Compare each skeleton with the loaded section at 390px and 1280px, using screenshots and measured heights from a
    temporary spec that is deleted afterwards.
  - Adjust until each lands within about 10% of its loaded height, apart from data-driven differences.

  **Done when:**
  - The measurements are recorded in the Result section.
  - `skeleton-loading` and `responsive` pass.
  - Frontend lint and the root build pass.

## Result

- All five steps built.
  - `CompareSkeleton.jsx` gains the opened comparison: the top (way back, pair header, section tabs and selects) over
    the team or player Overview, plus the team Overview panels (matchup, recent form body, players body), team
    Statistics, Rosters (with the impactful-players rows), the shared Trends, and the player Overview (with its form
    body), Statistics and Advanced.
  - New `HeadToHeadSkeleton.jsx`: the whole page and the history body.
  - Wired into `CompareTeamOverview`, `CompareTeamStats`, `CompareRosters`, `CompareTeamTrends`,
    `ComparePlayerOverview`, `ComparePlayerAdvanced`, `ComparePlayerTrends`, `ComparisonsPage`
    (`PlayerComparisonTable`) and `HeadToHeadPage`.
  - The four inline spinners inside empty panels (team recent form, team players, player recent games, impactful
    players) now show rows inside the existing panel and keep their labels.
- Route fallback:
  - `DETAIL_SKELETONS` gains `compare` -> Head-to-head.
  - An opened comparison's fallback draws the opened shape.
  - Every season page now has its own fallback; `SkeletonPage` remains only for an unknown path.
- Fit (PAN v OLY and two Panathinaikos players, 2026; heights skeleton/loaded in px):

  | Section | 390px | 1280px |
  | --- | --- | --- |
  | Opened comparison (whole page) | 2363/2360 | 1801/1771 |
  | Team Overview | 1784/1994 | 1178/1334 |
  | Team Statistics | 2934/2960 | 2934/2944 |
  | Team Rosters | 2998/2868 | 2018/2086 |
  | Team Trends | 2436/2444 | 1394/1420 |
  | Player Overview | 2024/2236 | 1446/1476 |
  | Player Statistics | 2015/2053 | 2015/2053 |
  | Player Advanced | 2849/2921 | 2849/2889 |
  | Player Trends | 2436/2642 | 1394/1316 |
  | Head-to-head (whole page) | 4079/4529 | 3087/3073 |

  - Team Overview's gap is the meetings panel. It has no loading state of its own: it reads the form panel's games and
    draws nothing until they arrive, so it appears after the load.
  - Head-to-head grows with the number of meetings (28 here).
- At 320px the Head-to-head history's summary row first overflowed the screen. The skeleton now hides the club-name bars
  below sm, and `head-to-head-layout` passes.
- `skeleton-loading.spec.js`:
  - the 39b "opened comparison" check now expects the opened shape;
  - the 39e-i Head-to-head test now expects its own fallback;
  - 10 tests added: 8 sections with all their labels, the two inline-panel states, and Head-to-head's two states.
- Checks on the local target: `skeleton-loading`, the six Compare and Head-to-head specs and `responsive` gave 270
  passed and 2 failed.
  - `head-to-head-layout` at 320px was the overflow above; fixed, and all 10 now pass.
  - The `skeleton-loading` Leaders board test passed on rerun (load flake).
- Frontend lint and root build pass.

## Files / areas

- Skeletons:
  - `frontend/src/comparisons/CompareSkeleton.jsx`
  - new `frontend/src/comparisons/HeadToHeadSkeleton.jsx`
- Wiring:
  - `frontend/src/comparisons/ComparisonsPage.jsx` (`PlayerComparisonTable`)
  - `CompareTeamOverview.jsx`
  - `CompareTeamStats.jsx`
  - `CompareRosters.jsx`
  - `CompareTeamTrends.jsx`
  - `ComparePlayerOverview.jsx`
  - `ComparePlayerAdvanced.jsx`
  - `ComparePlayerTrends.jsx`
  - `HeadToHeadPage.jsx`
- Route fallback: `frontend/src/season/SeasonLayout.jsx`.
- Tests: `frontend/e2e/skeleton-loading.spec.js`.
- Reuse from `lib/Skeleton.jsx`: `SkeletonPanelHead`, `SkeletonPageHeader`, `SkeletonChip`, `SkeletonRankedRows`.

## Data / contracts

None changed. The skeletons use the existing `AsyncState` `skeleton` prop and the existing labels. Turning an inline
spinner into a skeleton drops its `inline` prop for that state only; its label stays. There are no new queries and no
changes to query keys or loading conditions.

## Testing

- Browser tests only; there is no unit test runner. Add tests to `skeleton-loading.spec.js` using its
  `hold`/`expectSkeleton`/`expectLoaded` helpers.
- Use `teamA=PAN&teamB=OLY` for teams, and two players from a club's roster for players. Open sections by clicking the
  "Comparison section" tabs.
- The Compare and Head-to-head specs, `responsive` and `skeleton-loading` must pass on the local target. A failure is
  reported as pre-existing only if it fails the same way on `master`.
- No Verify command is declared. The final gate is frontend lint plus the root build.

## Notes for the AI

- Mirror the loaded markup's grid, gaps and paddings, as the team, player and game skeleton files do. Fit by screenshot
  and measured height.
- A panel whose body loaded behind an inline spinner gets rows or bars of that body's loaded size inside the existing
  panel, not a second panel.
- Scope changes to Compare and Head-to-head. Shared components get opt-in props, never changed defaults.
- Never read `.env` files.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11512,"specSha256":"f2d38884550251ae3a9461f44e3df7d40928101b2256377ea6fc1111b34f799e","branch":"refs/heads/feature/compare-sections-and-head-to-head","head":"1f690d297f5a9e56adaf49d88e6687b1ab9d0014","baseRef":"refs/heads/master","baseCommit":"1f690d297f5a9e56adaf49d88e6687b1ab9d0014","sourceTree":"4470d454d2b67415b9fc81d2bbd9072328e309a6","absentOptional":[]} -->
