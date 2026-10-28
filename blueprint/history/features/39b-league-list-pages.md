# Feature: League list pages

**From build-plan:** feature 39b
**Build attempt:** 1
**Branch:** feature/league-list-pages
**Status:** verified

## Goal

Carry feature 39 (Skeleton loading) to the eight league list pages: Standings (every view), Games, Teams, Players,
Leaders, Records, Postseason and the season Overview. While a page's data loads, it shows placeholders shaped like the
rows, cards, tables and charts that will replace them, instead of a centred spinner, so the page keeps its layout. The
route fallback for each of these pages becomes that page's own skeleton too, as 39a did for Home.

## In scope

Built on 39a's pieces (`frontend/src/lib/Skeleton.jsx`: `SkeletonLines`, `SkeletonBlock`, `SkeletonTable`,
`SkeletonChip`, `SkeletonPageHeader`, `SkeletonPanel`, `SkeletonPage`), `AsyncState`'s opt-in `skeleton` prop and
`CompactMetric`'s opt-in `skeleton` boolean. Every panel-sized spinner below gets a `skeleton` shaped like its loaded
content; the label passed to `AsyncState` stays as it is today.

- **Standings** (`frontend/src/standings/`):
  - `StandingsPage.jsx`: "Loading phases" (the whole page) shows the Standings page skeleton; "Loading standings"
    shows the KPI strip and table rows.
  - `StandingsKpiStrip.jsx`: the Biggest riser, Biggest faller and Best net rating chips pass `skeleton` (39a left them
    on "–" for this sub-feature).
  - Views: `AdvancedStandingsView.jsx` (table), `RaceView.jsx` (chart and snapshot table), `MarginsView.jsx` and
    `AheadBehindView.jsx` (their rows/strips). The Table view and the other breakdowns load with the standings above.
- **Games** (`frontend/src/games/FixturesPage.jsx`): "Loading phases" shows the Games page skeleton; "Loading games"
  shows game cards in the `fixture-box` layout.
- **Teams** (`frontend/src/teams/TeamsPage.jsx`): "Loading teams" shows team cards in the loaded grid
  (`grid-cols-2 lg:grid-cols-3`, crest slot and name bar).
- **Players** (`frontend/src/players/PlayersPage.jsx`): "Loading players" shows the summary line and player cards in the
  loaded list layout.
- **Leaders** (`frontend/src/leaders/`):
  - `LeaderParts.jsx` `CategoryCard`: the loading state is a spinner inside a panel-sized card today; it becomes five
    leader rows (rank, photo or crest, name, value), so the card keeps its loaded height. Its error stays inline.
  - `PlayersLeaders.jsx` ("Loading player form", "Loading the player leaderboard"), `TeamsLeaders.jsx` ("Loading the
    team leaderboard"), `AdvancedLeaders.jsx` ("Loading advanced leaders", "Loading the advanced leaderboard"):
    board rows or the landing cards, as each one loads.
- **Records** (`frontend/src/records/`): `RecordBook.jsx` ("Loading the record book") and `RecordsPage.jsx` ("Loading
  archive records") show their record rows. The existing `isPlaceholderData` dimming on a metric change stays as is.
- **Postseason** (`frontend/src/postseason/PostseasonPage.jsx`): both "Loading the postseason" states show the
  Postseason page skeleton: header, a bracket-sized block and the race table panel. One shape for every format; it does
  not try to draw each bracket family.
- **Season overview** (`frontend/src/season/SeasonOverviewPage.jsx`): "Loading phases" is a `fullScreen` spinner today,
  inside the shell; it becomes the Overview page skeleton. "Loading season summary" shows the hero and phase story
  blocks. The leader chips (line ~553) show `SkeletonChip image="person"` while loading, as Home's leader chips do; their
  error and empty text stay inline.
- **Route fallback**: `pageSkeleton` in `frontend/src/season/SeasonLayout.jsx` picks each of the eight pages' skeleton
  for its path (`standings`, `games`, `teams`, `players`, `leaders`, `records`, `postseason`, `overview`); detail pages
  (`games/:gameCode`, `teams/:clubCode`, `players/:personKey`) and Compare keep the generic `SkeletonPage` until
  39c-39e. As with `HomeSkeleton.jsx`, each page skeleton lives in a small file that imports none of the page's code, so
  it stays out of the page's lazy bundle; the page and the panel use the same pieces so the two always match.
- **Rules from the plan**, for everything above: a skeleton shows only while there is nothing to show (driven by
  `isLoading`/`isPending`/no data as today, never `isFetching`), so a refetch, a phase change with kept data or the
  Records placeholder data never puts a skeleton over loaded content; it is still under reduced motion (daisyUI only
  animates `.skeleton` under `no-preference`, confirmed in 39a); screen readers keep the specific "Loading ..." label
  through `role="status"`; error and empty states are unchanged.

## Out of scope

- Team, player and game pages, Compare and Head-to-head (39c-39e), including their route fallbacks.
- Small inline spinners: the Streaks/form cells in `StreaksFormView.jsx`, and inline loading text in buttons or chips not
  listed above.
- The full-screen "Loading seasons" spinner before the shell exists.
- Per-format bracket skeletons, per-breakpoint shapes, artificial delays or minimum display times.
- Any API, data, URL or loading-logic change.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then one review. Checkpoint commits are disabled; `/complete` makes
the single feature commit. Before any browser test run, `/api/health` must report `"target":"local"`.

## Build steps

- [x] **1. Standings.** Page skeleton file (header, phase tabs bar, KPI strip of `SkeletonChip`s, table rows) used by the
  phases state, the standings state and the route fallback; the KPI chips' `skeleton`; the Advanced, Race, Margins and
  Ahead/behind view skeletons.
  **Done when:** with the standings API requests held back in `skeleton-loading.spec.js`, `/2026/standings` shows the
  skeleton with "Loading standings" and no spinner, then the table with no skeleton left; each of the four views shows
  its skeleton then its content; `standings-table-layout`, `standings-view-controls`, `standings-advanced-layout`,
  `standings-race-layout`, `standings-breakdowns-layout`, `standings-explained-layout` and `grouped-standings` pass.

- [x] **2. Games, Teams and Players.** Page skeletons for the three pages (game cards, team card grid, player cards),
  each used by its loading state and the route fallback.
  **Done when:** with each page's data held back, `/2026/games`, `/2026/teams` and `/2026/players` show their
  skeleton with the existing label and no spinner, then the content; `games-layout`, `teams-layout` and `players-layout`
  pass.

- [x] **3. Leaders and Records.** `CategoryCard` rows skeleton; board and form skeletons in the three leader tabs; record
  rows for the record book and archive records; page skeletons for the route fallback.
  **Done when:** with the data held back, `/2026/leaders` cards show five skeleton rows each (no inline spinner), a
  leaderboard (`?metric=`) shows skeleton rows, and `/2026/records` (record book and an archive family) shows record
  rows, each then its content; changing the Records metric still dims the loaded rows rather than showing a skeleton;
  `leaders`, `leaders-layout`, `records`, `records-layout` pass.

- [x] **4. Postseason and season Overview.** The Postseason and Overview page skeletons (both used by their loading
  states and the route fallback), the summary skeleton and the Overview leader chips.
  **Done when:** with the data held back, `/2026/postseason` and `/2026/overview` show their skeleton with the existing
  label and no spinner (no full-screen spinner on Overview), then the content; Overview leader chips show skeleton chips
  of the loaded size; `postseason`, `postseason-layout`, `overview-layout`, `cancelled-season`, `historical-era-pages`
  pass (the known pre-existing `cancelled-season` Box score failure from 39a excepted, if it still fails on `master`).

- [x] **5. Route fallbacks and fit.** `SeasonLayout` picks the eight page skeletons by path. Compare each skeleton with
  the loaded page at 390px and 1280px (dark mode screenshots) and adjust so blocks land within about the loaded size.
  **Done when:** holding a list page's module in `skeleton-loading.spec.js` shows that page's own skeleton inside the
  shell with "Loading page", then the page; a detail page still shows the generic skeleton; `skeleton-loading`,
  `responsive` pass; frontend lint and root build pass.

## Result

- All five steps built. Shared additions in `lib/Skeleton.jsx`: `SkeletonRankedRows` (rank, crest or photo, name and
  figures; figures past the third hidden below sm) and `SkeletonTabs` (a tab strip or select bar), used by several pages.
  Page skeleton files: `standings/StandingsSkeleton.jsx`, `games/GamesSkeleton.jsx`, `teams/TeamsSkeleton.jsx`,
  `players/PlayersSkeleton.jsx`, `leaders/LeadersSkeleton.jsx`, `records/RecordsSkeleton.jsx`,
  `postseason/PostseasonSkeleton.jsx`, `season/OverviewSkeleton.jsx`, each importing only `lib/Skeleton.jsx`.
- Overview leader cards: the loading card's status is now named "Loading <category>" (for example "Loading Points per game"),
  as `CompactMetric` names its loading cards; before it was an inline spinner named only "Loading".
- `skeleton-loading.spec.js` gained 29 tests (Standings table and KPI chips, the four views, the phases state; Games, Teams,
  Players; Leaders cards, form, board and Advanced; the record book, a record's first load and its dimmed metric change;
  Postseason; Overview phases, summary and leader cards; each list page's route fallback and a team page's generic one).
  Held requests are released with `route.continue()`.
- Fit: each page skeleton measured and screenshotted against the loaded page at 390px and 1280px (dark mode) and adjusted:
  standings rows 3.25rem under a header row, game cards 8rem, the Overview phase story as a heading over four cards, the
  Postseason bracket as stage columns of matchup cards with the steps stacked on a phone, a four-line player card, Leaders'
  mode toggle and card kickers, and record book cards with the holder's photo.
- Checks on the local target (`/api/health` reported `local`): the step specs, `skeleton-loading` and `responsive` - 380
  passed, 5 failed in one run of 385. On rerun, `leaders` (row of choices), `standings-race-layout` (follow the focused
  team) and the Postseason route-fallback test passed (load-related flakes; the fallback test passed 4/4 alone).
  `cancelled-season` "abandoned fixtures..." is the pre-existing failure noted in 39a. `postseason-layout` "2026 ... 1024px"
  (race table overflows by 27px) fails the same way on `master` with this branch stashed - pre-existing, a candidate for
  its own `/fix`.
- Frontend lint and root build pass.
- **Added on review (user request): the Compare landing.** Pulled forward from 39e, landing only: `comparisons/CompareSkeleton.jsx`
  draws the header, the Teams/Players tabs, the upcoming games as ten compact game rows (crests, names, records, date and
  time, the grid `CompareFixtures` uses) and the "any two teams" pickers; `?view=players` shows the pickers alone, and an
  opened comparison (both sides in the URL) keeps the generic `SkeletonPage`. Used by Compare's "Loading phases" state, the
  "Loading games" state of `CompareFixtures` (was an inline spinner in an empty panel) and the `compare` route fallback.
  Measured at 390px and 1280px: every panel within 6px of the loaded one (the shared header bar and played games' taller
  score rows account for the rest). The opened comparison sections and Head-to-head stay in 39e. Four tests added
  (phases, games, players view and opened comparison, route fallback); `skeleton-loading`, `compare` and `compare-layout`
  pass (one Leaders Advanced load flake passed on rerun); lint passes.

## Files / areas

- New page skeleton files beside each page (for example `frontend/src/standings/StandingsSkeleton.jsx`,
  `games/GamesSkeleton.jsx`, `teams/TeamsSkeleton.jsx`, `players/PlayersSkeleton.jsx`, `leaders/LeadersSkeleton.jsx`,
  `records/RecordsSkeleton.jsx`, `postseason/PostseasonSkeleton.jsx`, `season/OverviewSkeleton.jsx`), importing only
  `lib/Skeleton.jsx` (and `lib/LeaderPhoto` through it).
- `frontend/src/standings/StandingsPage.jsx`, `StandingsKpiStrip.jsx`, `AdvancedStandingsView.jsx`, `RaceView.jsx`,
  `MarginsView.jsx`, `AheadBehindView.jsx`
- `frontend/src/games/FixturesPage.jsx`, `teams/TeamsPage.jsx`, `players/PlayersPage.jsx`
- `frontend/src/leaders/LeaderParts.jsx`, `PlayersLeaders.jsx`, `TeamsLeaders.jsx`, `AdvancedLeaders.jsx`
- `frontend/src/records/RecordBook.jsx`, `RecordsPage.jsx`
- `frontend/src/postseason/PostseasonPage.jsx`, `season/SeasonOverviewPage.jsx`, `season/SeasonLayout.jsx`
- `frontend/e2e/skeleton-loading.spec.js` - new tests per page and for the route fallbacks
- `lib/Skeleton.jsx` only if a shape is needed on more than one page (a list of cards, say); `AsyncState` and
  `CompactMetric` unchanged.

## Data / contracts

No API, data or URL change. Loading statuses keep `role="status"` and their current `aria-label`; skeleton containers
carry `aria-busy="true"`, which the existing waits from 39a already treat as still loading.

## Testing

No unit test command exists. Browser tests (Playwright) in `skeleton-loading.spec.js` hold back the page's API requests
(or its module, for the route fallback) with `page.route`, assert the skeleton, the loading label and no `.loading`
spinner, then release and assert the content with no skeleton left. Run the specs named in each step plus
`responsive.spec.js`, on the local target only. Lint and root build at the end.

## Notes for the AI

- Read `/api/health` before any browser run; never open `backend/.env`.
- Follow 39a's lessons: draw a skeleton with the loaded layout's own classes (grid, `kpi-strip`, `fixture-box`, card
  heights) so it fills the same columns at every width, rather than a separate shape per breakpoint; a utility on an
  element whose own CSS sets `display` can lose, so hide with a wrapper.
- Shared components change only through opt-in props; pages outside 39b look the same.
- Keep the specific label of each state, including the two "Loading phases" states; check the spec waits still find
  their markers.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":14180,"specSha256":"7e7de55b4631c034d7d55723f45744fbe9f4d9bdc11ed88bd24aded340dc7c0f","branch":"refs/heads/feature/league-list-pages","head":"6257d5f212937a8f81dac95e8bae2fc0efe4a7e7","baseRef":"refs/heads/master","baseCommit":"6257d5f212937a8f81dac95e8bae2fc0efe4a7e7","sourceTree":"3b1957340bf53f4138afb72605f85b7b89b10b1e","absentOptional":[]} -->
