# Feature: Skeleton building blocks, route fallback and Home

**From build-plan:** feature 39a
**Build attempt:** 1
**Branch:** feature/skeleton-building-blocks-route-fallback-and-home
**Status:** verified

## Goal

Lay the groundwork for feature 39 (Skeleton loading) and use it where people land first: shared skeleton pieces,
an opt-in skeleton for the shared loading state, a page-shaped skeleton while a page's code loads, and skeletons for
every Home panel. A page keeps its layout while data loads instead of showing a centred spinner.

## In scope

- **Skeleton pieces** in one new file, `frontend/src/lib/Skeleton.jsx`, on daisyUI 5's `skeleton` class (already
  installed): text lines, a block (card or chart box, sized by the caller), and a table of N rows by M columns.
  Every piece is `aria-hidden`.
- **Opt-in skeleton on the shared loading state**: `AsyncState` (`frontend/src/lib/AsyncState.jsx`) gains a
  `skeleton` prop. When `status` is `loading` and `skeleton` is given, it renders
  `<div role="status" aria-label={label} aria-busy="true">{skeleton}</div>` instead of the spinner. Without the
  prop nothing changes, so the ~80 other spinners stay until 39b-39e.
- **Route fallback**: the `Suspense` fallback in `frontend/src/season/SeasonLayout.jsx` (shown while a page's code
  downloads) becomes a generic page skeleton: a header panel and two content panels, labelled "Loading page".
- **Home** (`frontend/src/dashboard/`):
  - `WidgetPanel` (`Dashboard.jsx`) passes a `skeleton` through to `AsyncState`; each Home panel supplies one
    shaped like its content: Upcoming games (game cards), League table (table rows), Latest scores (score cards),
    point-margin trend (chart box).
  - KPI strip: `CompactMetric` gains an opt-in `skeleton` boolean; with it, a loading chip shows skeleton lines for
    its name and value instead of "–". Home's `KpiStrip` passes it; Standings and Head-to-head keep "–" until their
    own sub-features.
  - Stat leaders (`LeadersPanel.jsx`): a loading leader chip shows skeleton lines (name, club, value) and a photo
    block instead of the inline spinner.
- **Rules from the plan**, applied to everything above:
  - A skeleton shows only while there is nothing to show yet: it is driven by React Query's `isLoading` (no data),
    never by `isFetching`, so a refetch keeps the loaded content.
  - Under reduced motion it stays still: the existing global `prefers-reduced-motion: reduce` reset in
    `frontend/src/index.css` stops the `skeleton` shimmer; confirm it, and add a rule only if it does not.
  - Screen readers keep the existing specific label ("Loading standings" and so on) through `role="status"`.
  - Error and empty states are unchanged.

## Out of scope

- Every other page and tab (39b-39e).
- The full-screen "Loading seasons" spinner while the app first fetches the season list (`App.jsx`,
  `SeasonLayout.jsx`): it shows before the page shell exists, so a page-shaped skeleton has nothing to sit in.
- Small inline spinners elsewhere.
- Any artificial delay, minimum display time or loading-state API change.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then one review. Checkpoint commits are disabled; `/complete`
makes the single feature commit. Before any browser test run, `/api/health` must report `"target":"local"`.

## Build steps

- [x] **1. Skeleton pieces, the `AsyncState` option and test waits.** Add `Skeleton.jsx` and the `skeleton` prop.
  Several browser specs treat "no `.loading` element" as "loaded"; a skeleton has no `.loading`, so change those
  waits to `main .loading, main [aria-busy="true"]` (or the spec's existing scope) so they keep waiting for real
  content. Today that is `cancelled-season`, `compare-player-layout`, `compare-team-layout`, `competition-context`,
  `grouped-standings`, `historical-era-pages`, `home-layout`, `leaders-layout`, `overview-layout`,
  `postseason-layout`, `responsive`, `standings-breakdowns-layout`, `standings-table-layout` and
  `standings-view-controls`. Done once here, so later sub-features do not touch them again.
  **Done when:** lint passes; an `AsyncState` without `skeleton` renders exactly as before (the existing specs
  above still pass on the local target).

- [x] **2. Route fallback skeleton.** Replace the `Suspense` fallback in `SeasonLayout.jsx` with the page skeleton.
  **Done when:** opening a page whose code is not loaded yet shows the page skeleton inside the shell (header and
  navigation stay), with a "Loading page" status, and then the page; checked in a browser test that delays that
  page's module request (if the dev server's module loading makes this unreliable, cover it with a manual check and
  record the screenshot instead).

- [x] **3. Home skeletons.** Skeletons for the four `WidgetPanel` panels, the KPI strip and the stat-leader chips.
  Each skeleton takes about the space of the loaded content at 390px and 1280px, so the page does not jump when data
  arrives.
  **Done when:** with the Home API requests held back in a browser test, every Home panel shows its skeleton (no
  spinner) with its loading status, then its content; under emulated reduced motion the skeleton has no running
  animation; `home-layout.spec.js`, `home-form-chart.spec.js`, `home-round-status.spec.js` and `responsive.spec.js`
  pass; lint and root build pass.

## Result

- Lint and root build pass. On the local target, the 14 specs with updated waits, `home-form-chart`,
  `home-round-status` and the new `skeleton-loading.spec.js`: 333 passed, 2 failed in one run. On rerun,
  `leaders-layout` "the Players cards are one, two or three per row" passed (a load-related flake); `cancelled-season`
  "abandoned fixtures remain archived..." fails the same way on `master` with this branch stashed (it clicks a
  Box score tab an unplayed game does not have) - pre-existing, a candidate for its own `/fix`.
- `skeleton-loading.spec.js` (3 tests, run 3 times each, 9 passed): every Home panel and chip shows its skeleton
  with a loading status and no spinner while the data is held back, then the content with no skeleton left;
  skeletons shimmer normally and have no running animation under reduced motion (daisyUI only animates `.skeleton`
  under `prefers-reduced-motion: no-preference`, so no CSS change was needed); holding the Records page's module
  shows the "Loading page" skeleton inside the shell, then the page.
- Screenshots of `/2026/home` with the data held back at 1280px and 390px. From review of those: the League table
  skeleton has 20 rows (the panel is as tall as Latest scores); KPI chips keep a crest-sized box with a round
  placeholder and leader chips show the existing photo silhouette, so the chips keep their loaded size.

- Revision (user review, dark-mode screenshot of the route fallback on Home): the page skeleton now matches the page.
  `SkeletonPageHeader` and `SkeletonPanel` draw a header with the accent line and panel kicker/title bars like
  `PageHeader` and the section panels; `frontend/src/dashboard/HomeSkeleton.jsx` holds Home's panel skeletons, used both
  by each panel and by a Home page skeleton laid out like `Dashboard` (games row, table beside scores, four team cards,
  leader cards with the photo silhouette, trend); `SeasonLayout` picks Home's skeleton for `/:season` and
  `/:season/home` and the generic one elsewhere (39b-39e add the others). `SkeletonChip` is the one chip skeleton for
  Home's team and leader cards. `HomeSkeleton.jsx` imports none of Home's code, so it stays out of Home's lazy bundle.
  Screenshots in dark mode at 1280px and 390px (Home) and 1280px (Records, generic); `skeleton-loading` (4 tests, with a
  new Home fallback test), `home-layout`, `home-form-chart`, `home-round-status` and `responsive`: 217 passed; lint and
  root build pass.

- Revision (user review, page skeleton at ~1516px left a gap in the games row): Home's skeleton now follows the loaded
  layout at every width. Measured block by block against the loaded page at 390, 768, 1024, 1280, 1516 and 1920px; after
  the changes every block is within about 40px from 768px up, and within about 80px on phones apart from the trend
  (about 70px, the chart caption):
  - upcoming games: 10 cards (a round) at the loaded card height (6.6rem), so the row fills its columns at any width;
  - latest scores: the list sits in its `games-list-box` container so the two-column container rule applies; the five
    cards beyond the phone limit are in a `contents max-sm:hidden` wrapper (a utility on the card loses to the card's
    own display rule);
  - league table: rows drawn as the snapshot's (rank circle, club, record; 2rem tall, 0.5rem gap); from lg the panel takes
    the scores panel's height, as the loaded table does;
  - header: a third bar for the status line; leaders: a bar for the phase subheading;
  - trend: the loaded `leader-trend` layout classes (stat beside the chart from 640px), the chart keeping its shape
    (14:5 on phones, 33:10 from sm), and two caption lines.
  Dark-mode screenshots at 1516px and 390px. `skeleton-loading`, the three Home specs and `responsive`: 217 passed; lint
  and root build pass.

## Files / areas

- New: `frontend/src/lib/Skeleton.jsx`, `frontend/src/dashboard/HomeSkeleton.jsx`
- `frontend/src/lib/AsyncState.jsx` - opt-in `skeleton`
- `frontend/src/lib/CompactMetric.jsx` - opt-in `skeleton`
- `frontend/src/season/SeasonLayout.jsx` - route fallback
- `frontend/src/dashboard/Dashboard.jsx` (`WidgetPanel`), `UpcomingGames.jsx`, `StandingsSnapshot.jsx`,
  `RecentResults.jsx`, `LeaderTrend.jsx`, `KpiStrip.jsx`, `LeadersPanel.jsx`
- `frontend/src/index.css` - only if the reduced-motion reset does not already stop the shimmer
- `frontend/e2e/` - the waits listed in step 1 and new Home and fallback tests

## Data / contracts

No API, data or URL change. The loading status keeps `role="status"` and the existing `aria-label`; skeleton
containers add `aria-busy="true"`, which tests may use as the "still loading" marker alongside `.loading`.

## Testing

No unit test command exists. Browser tests (Playwright) hold back the relevant API or module requests with
`page.route` to show the skeletons, then release them; reduced motion through `page.emulateMedia`. Run the files
named in each step, plus `responsive.spec.js`.

## Notes for the AI

- Read `/api/health` before any browser run; never open `backend/.env`.
- Keep the skeleton shapes simple and close to each panel's real layout; do not build a shape per breakpoint.
- Shared components (`AsyncState`, `CompactMetric`) change only through opt-in props, so pages outside Home look
  the same until their sub-feature.
- `blueprint/build-plan.md` and `blueprint/context/project-overview.md` carry the uncommitted feature 39 planning
  lines; leave them for `/complete`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10832,"specSha256":"762c8254f7d6be9649207ab1d476d015610f3a9235080c452ac986fa1c9d9bea","branch":"refs/heads/feature/skeleton-building-blocks-route-fallback-and-home","head":"0f80f88b2c52e1799957f1cac55bf8f5c9244d88","baseRef":"refs/heads/master","baseCommit":"0f80f88b2c52e1799957f1cac55bf8f5c9244d88","sourceTree":"b8e46be531f352e4987d7a50ff8288ef9046cff9","absentOptional":[]} -->
