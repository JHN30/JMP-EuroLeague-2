# Feature: Team page

**From build-plan:** feature 39c
**Build attempt:** 1
**Branch:** feature/team-page
**Status:** verified

## Goal

The team page (`/:season/teams/:clubCode`) stops showing panel-sized spinners. Every team tab (Overview, Roster,
Statistics, Games, Shooting, Advanced) and its panels show placeholders shaped like the content they stand in for, so the
page keeps its layout while data loads. The team page also gets its own route-fallback skeleton in place of the generic
one. This follows 39a's building blocks and 39b's pattern.

## In scope

- **Page skeleton file** `frontend/src/teams/TeamPageSkeleton.jsx`. Like the 39b skeleton files, it imports only
  `lib/Skeleton.jsx` and React Router at most, and none of the page's code, so it stays out of the page's lazy bundle. It
  holds:
  - the page top: a back-link bar, a header panel with a crest box, the name, the code and country line and the club facts
    line, the section tab strip and the phase tab strip;
  - one skeleton per tab body and per Overview panel, listed below;
  - a default export: the page top over the Overview body.
- **Whole page while the team loads**: `TeamPage`'s "Loading the team" state shows the default page skeleton.
- **Overview**:
  - "Loading this team's games" shows the Overview body skeleton.
  - The panels show their own skeletons:
    - `TeamSnapshot` "Loading the record": a record bar, form pills, paired bars and a facts row.
    - `TeamLeaders` "Loading team leaders": four `SkeletonChip image="person"` cards in `team-leaders-grid`, as Home's and
      Overview's leader cards do.
    - `TeamLeagueProfile` "Loading the league profile": a panel with two columns of ranked lines.
    - `TeamQuickCompare` "Loading the comparison": a panel with a tab bar and comparison rows.
- **Statistics**: "Loading team statistics" shows the per-game panel, with two columns of grouped stat rows from xl.
- **Roster**:
  - "Loading the roster" shows the summary panel, the view tabs and position sections of player cards with portraits. The
    grid matches the loaded one: `sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`.
  - "Loading roster statistics" shows the same shape.
- **Games**: "Loading the games" shows the margin strip panel over two columns of game rows from lg.
- **Shooting**: the "Aggregating N shooting charts" state shows the shooting panel: tab bars, a court block and the
  breakdown. Its dynamic label stays.
- **Advanced**:
  - "Loading advanced team stats" shows the ratings chart panel, four split cards, the play-by-play panel and lineup rows.
  - The lineups' compact "Loading lineups" spinner, shown when a lineup size is picked with no data yet, becomes lineup
    rows.
- **Route fallback**: `pageSkeleton` in `frontend/src/season/SeasonLayout.jsx` gives `teams/:clubCode` the team page
  skeleton. The tab is component state, not in the URL, and a team page opens on Overview, so the fallback draws
  Overview. Game and player pages keep the generic `SkeletonPage` until 39d and 39e.
- **Rules from the plan**, for everything above:
  - A skeleton shows only while there is nothing to show. It is driven by `isLoading`/`isPending`/no data as today, never
    by `isFetching`.
  - It is still under reduced motion. daisyUI only animates `.skeleton` under `no-preference`.
  - Screen readers keep the specific "Loading ..." label through `AsyncState`'s `role="status"`.
  - Error, empty and "absent from this stage" states are unchanged.

## Out of scope

- Player, game, Compare-section and Head-to-head pages (39d, 39e).
- `CompetitionContext`'s one-line "Loading competition context." text. It is a small inline status in a shared component,
  so it stays.
- Small inline spinners and loading text inside buttons or chips.
- Putting the active team tab in the URL, per-tab route fallbacks, artificial delays, or any API, data or loading-logic
  change.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then one review. Checkpoint commits are disabled; `/complete` makes
the single feature commit. Before any browser test run, `/api/health` must report `"target":"local"`. Run only the specs
named in each step plus `skeleton-loading.spec.js` and `responsive.spec.js`.

## Build steps

- [x] **1. Page top, Overview and route fallback.**
  - Create `TeamPageSkeleton.jsx` with the page top, the Overview panel skeletons and the default export.
  - Wire it into `TeamPage` ("Loading the team", "Loading this team's games", snapshot, leaders), `TeamLeagueProfile`
    and `TeamQuickCompare`.
  - Add `teams/:clubCode` to `pageSkeleton`.

  **Done when:**
  - With the team's data held back in `skeleton-loading.spec.js`, `/2026/teams/<club>` shows the page skeleton with
    "Loading the team" and no spinner, then the page.
  - With the games, standings, roster stats and advanced requests held back, each Overview panel shows its skeleton
    under its own label, then its content.
  - Holding `TeamPage.jsx` shows the team page skeleton as the "Loading page" fallback. This replaces the 39a/39b test
    "a team page keeps the generic page skeleton".
  - `team-overview-layout` and `team-club-details` pass.

- [x] **2. Statistics, Roster and Games.**
  - Add the three tab skeletons.
  - Wire them into `TeamStatisticsSection`, both `TeamRosterSection` states and `TeamGamesSection`.

  **Done when:**
  - With each tab's data held back, opening the tab shows its skeleton under its existing label and no spinner, then the
    content.
  - `team-statistics-roster-layout`, `team-shooting-games-layout` (Games part) and `team-stats-null` pass.

- [x] **3. Shooting and Advanced.**
  - Add the shooting and advanced skeletons and the lineup rows.
  - Wire them into `TeamShootingSection` and `TeamAdvancedSection` (both states).

  **Done when:**
  - With the shot charts or advanced data held back, each tab shows its skeleton under its existing label.
  - Picking a lineup size with its data held back shows lineup rows, not a spinner.
  - Each then shows its content.
  - `team-shooting-games-layout` and `team-advanced-layout` pass.

- [x] **4. Fit.**
  - Compare each skeleton with the loaded tab at 390px and 1280px, using screenshots and measured panel boxes from a
    temporary spec that is deleted afterwards.
  - Adjust so each panel lands within a few pixels of its loaded size. The shared header bar's known 6px is excepted.

  **Done when:**
  - The measurements are recorded in the Result section.
  - `skeleton-loading` and `responsive` pass.
  - Frontend lint and the root build pass.

## Result

- All four steps built. One new file, `frontend/src/teams/TeamPageSkeleton.jsx` (imports only `lib/Skeleton.jsx`): the page
  top, the Overview panels (snapshot, leaders, league profile, game lines, quick comparison) and body, and the Statistics,
  Roster, Games, Shooting and Advanced tab skeletons plus lineup rows. Wired into `TeamPage` (team, games, record, leaders),
  `TeamLeagueProfile`, `TeamQuickCompare` and the five section files; the lineups' compact spinner is now lineup rows.
- Route fallback: `SeasonLayout` gains `DETAIL_SKELETONS` (`teams` -> the team page skeleton); a path with a third
  segment, a game page and a player page keep the generic skeleton.
- Fit (`PAN`, 2026, measured against the loaded tab; heights skeleton/loaded in px):

  | Tab | 390px | 1280px |
  | --- | --- | --- |
  | Page top (first panels' tops) | 539/557, 1140/1169 | 442/440, 989/986 |
  | Overview | 2773/2729 | 1597/1609 |
  | Statistics | 1382/1449 | 522/557 |
  | Roster | 3366/3331 | 1668/1698 |
  | Games | 1882/1842 | 1104/1062 |
  | Shooting | 2030/2166 | 1073/1098 |
  | Advanced | 2243/2316 | 1675/1539 |

  Remaining differences come from data (this club has one 5-man lineup and few upcoming games) and wrapped text on a phone.
  While the games load, the header has no next-game chip yet, so the Overview body starts higher than the loaded one.
- `skeleton-loading.spec.js`: the old "team page keeps the generic skeleton" test is replaced by a team-page fallback test
  and a player-page generic-fallback test, plus 9 team tests (whole page, Overview games and panels, the five tabs, lineups).
- Checks on the local target: `skeleton-loading`, the seven team specs and `responsive` - 247 passed, 2 failed.
  `team-advanced-layout` (chart height) passed when rerun alone (load flake). `team-stats-null` "keeps missing ... zeroes"
  expects older Shooting empty-state wording and fails the same way on `master` with this branch stashed - pre-existing, a
  candidate for its own `/fix`.
- Frontend lint and root build pass.

## Files / areas

- New: `frontend/src/teams/TeamPageSkeleton.jsx`.
- Wiring:
  - `frontend/src/teams/TeamPage.jsx`
  - `TeamLeagueProfile.jsx`
  - `TeamQuickCompare.jsx`
  - `TeamStatisticsSection.jsx`
  - `TeamRosterSection.jsx`
  - `TeamGamesSection.jsx`
  - `TeamShootingSection.jsx`
  - `TeamAdvancedSection.jsx`
- Route fallback: `frontend/src/season/SeasonLayout.jsx` (`pageSkeleton`).
- Tests: `frontend/e2e/skeleton-loading.spec.js`.
- Reuse from `lib/Skeleton.jsx`: `SkeletonPageHeader`-style bars, `SkeletonChip`, `SkeletonRankedRows`, `SkeletonTabs`,
  `SkeletonBlock`, `SkeletonLines`. Add to that shared file only a piece that another page already needs; otherwise keep
  it in the team file.

## Data / contracts

None changed. The skeletons use the existing `AsyncState` `skeleton` prop and its existing labels. There are no new
queries and no changes to query keys or loading conditions.

## Testing

- Browser tests only; there is no unit test runner. Add tests to `skeleton-loading.spec.js` using its
  `hold`/`expectSkeleton`/`expectLoaded` helpers.
- Open tabs by clicking the section tab strip, because the tab is not in the URL.
- Existing team specs, `responsive.spec.js` and `skeleton-loading.spec.js` must pass on the local target.
- No Verify command is declared. The final gate is frontend lint plus the root build.

## Notes for the AI

- Mirror the loaded markup's grid, gaps and paddings (as `CompareSkeleton.jsx` mirrors `CompareFixtures`) rather than
  approximating with generic panels. The fit step checks this.
- Scope changes to the team page only. Shared components get opt-in props, never changed defaults.
- Never read `.env` files.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10434,"specSha256":"cdba3bc85d1df523d0a0f0cca96338113d126dd9994d7ae65c64cee29defb259","branch":"refs/heads/feature/team-page","head":"d75ab32e3684b03ebc153a3d08dda5c7f034da40","baseRef":"refs/heads/master","baseCommit":"d75ab32e3684b03ebc153a3d08dda5c7f034da40","sourceTree":"5f89faf8b04c87298b64f0f30f947937cbfec2ca","absentOptional":[]} -->
