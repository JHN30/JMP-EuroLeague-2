# Feature: Leaderboard depth

**From build-plan:** feature 17f
**Build attempt:** 1
**Branch:** feature/leaderboard-depth
**Status:** verified

## Goal

Add podium, search, tie-sharing, a minimum-games qualification threshold,
and a responsive button-grid category chooser to the player leaderboard
(`PlayerLeaderboard` inside `StatisticsPage.jsx`), per build-plan item 17f.
The team-scope leaderboard (`TeamLeaderboard`, a separate component/data
source on the same page) is untouched - build-plan item 17f's clauses
(podium, search, minimum-games, category grid) describe the player
leaderboard the guideline's dedicated Leaders page covers, and this app
folds that into the existing "Players" scope of `/statistics`.

## Design reference

No `prototypes/` mockup is authoritative here: `prototypes/statistics.html`
is a stale, pre-restructure concept (flat three-card strip, no podium
lift, category tabs instead of a button grid, no search or minimum-games)
that predates the current `StatisticsPage.jsx` and UI-UX.md's own later
Leaders spec - it is not used as a reference for this feature. `UI-UX.md`
§7.9 (Leaders, lines 1222-1250) is read for intent: its route (`/leaders`)
and archive-select header don't apply (this app keeps the leaderboard under
the existing `/statistics` route with its existing phase/scope controls).
What carries over: the podium's centered-and-lifted first-place layout, the
"Actual rank is preserved while searching" copy, the minimum-games
qualification behavior and its rate-category explainer text (matching
build-plan item 17f's own wording), tie-sharing ranks, and the responsive
button-grid category chooser.

## Decision: category granularity

UI-UX.md's example button grid lists 12 specific metrics that don't fully
match this app's actual sortable fields (it names "threes made" and
2PT/3PT make-percentages that aren't in this backend's `SORTABLE_FIELDS`).
Rather than adding new sortable columns to match an illustrative list, the
button grid uses this app's existing 23 sortable metrics (the same
`PLAYER_METRIC_GROUPS` from `frontend/src/lib/statsFields.js`, already
1:1 with the backend's `SORTABLE_FIELDS`) as one flat grid, replacing both
the current group `TabStrip` and the per-group `CompactFilterSelect`
metric dropdown with a single button-grid selector. This reuses 100% of
existing sortable data and avoids a backend change.

## In scope

- **Full-leaderboard fetch**: replace `PlayerLeaderboard`'s server-paginated
  fetch (`limit`/`offset` round-trips) with the loop-fetch pattern already
  established in `TeamPage.jsx`'s `fetchTeamRosterStats` and
  `PlayerPage.jsx`'s `fetchLeagueLeaderboard` (17d/17e) - all pages for the
  current phase/mode/metric/direction, gated the same way those are.
  Client-side pagination (still 25 rows/page, "Showing X-Y of Z") replaces
  server offset/limit for display.
- **Minimum-games threshold**: a select (No minimum / 5+ / 10+ / 15+
  games) filters the fetched leaderboard to players meeting
  `traditional.gamesPlayed >= threshold` before ranking. When the active
  metric is a rate/percentage metric (the Advanced or Scoring groups), an
  `alert-info`-style note explains: rate rankings qualify on games rather
  than attempts, because attempt-based qualification isn't in the source
  data (build-plan's own wording, reused verbatim as the explainer).
- **Tie-sharing rank**: replace the current `offset + index + 1` array-index
  rank with a computed dense rank over the qualified, sorted leaderboard -
  equal values on the active metric share the same rank number, and the
  next distinct value's rank accounts for how many players tied above it
  (standard competition ranking, e.g. 1, 2, 2, 4).
- **Search**: a text input filtering by player name, applied after ranks
  are computed - a filtered row keeps its true rank label (not
  renumbered), with the existing UI-UX.md copy "Actual rank is preserved
  while searching" shown near the input.
- **Category chooser**: a responsive button grid (`grid-cols-2 sm:grid-cols-3
  lg:grid-cols-4 xl:grid-cols-6`) of all 23 existing sortable metrics,
  active = `btn-primary`, inactive = `btn-ghost bg-base-100`, replacing the
  current group `TabStrip` + `CompactFilterSelect` two-step picker.
- **Podium**: the top 3 qualified, ranked (post-minimum-games, pre-search)
  players as three cards, `grid md:grid-cols-3`, first place at `md:order-2
  md:-translate-y-3` with `border-primary/70`, second/third flanking in
  natural order; each card shows rank badge, portrait, name, team, the
  active metric's value, and games played. Below `md`, cards stack in
  natural rank order (no lift), matching UI-UX.md's stated breakpoint
  behavior. The podium reflects the qualified/ranked list, not the
  search-filtered one (searching narrows only the full-ranking table below
  it).
- URL-synced state: extend the existing `useSearchParams` pattern already
  used for `mode`/`metric`/`direction`/`offset` to also carry `search` and
  `minGames`, matching UI-UX.md's stated exception that Leaders-page view
  filters live in the URL.

## Out of scope

- The team-scope leaderboard (`TeamLeaderboard`) - untouched; build-plan
  item 17f's clauses describe the player leaderboard only.
- A dedicated `/leaders` route, archive-select header, "Compare top two",
  "Copy leaderboard link", or historical-records link from UI-UX.md's
  fuller Leaders page - not named in build-plan item 17f's text.
- Any backend change - every metric this feature ranks by is already
  sortable via the existing `getLeaderStats`/`SORTABLE_STATS_FIELDS`.
- Team-category qualification differences (points-allowed, fewest-turnovers
  ascending) from the guideline - out of scope since the team leaderboard
  itself is untouched.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (Continuous
Mode self-reviews each step) and `workflow.checkpointCommits` is `disabled`.

## Build steps

- [x] 1. Replace `PlayerLeaderboard`'s server-paginated fetch with a
      full-leaderboard loop-fetch (current phase/mode/metric/direction),
      add the minimum-games select and rate-category explainer, and switch
      the table's rank column to the computed tie-aware dense rank over the
      qualified list. Keep the existing group-tab/metric-select UI for now
      (category-grid comes in step 2); keep client-side pagination over the
      qualified list at 25/page.
      **Done when:** the table shows correct tie-sharing ranks for a metric
      with known ties (e.g. a low-count stat like triple-doubles), raising
      the minimum-games threshold removes unqualified players and
      re-numbers ranks accordingly, the rate-category explainer appears
      only for Advanced/Scoring metrics, verified in the running app against
      the raw leaderboard response; `npm run build` passes.
- [x] 2. Replace the category `TabStrip` + `CompactFilterSelect` with the
      responsive button-grid selector across all 23 sortable metrics.
      **Done when:** the grid is responsive at the specified breakpoints,
      selecting a button updates the ranked table and URL the same way the
      old controls did, active/inactive styling matches `btn-primary`/
      `btn-ghost bg-base-100`, verified in the running app; `npm run build`
      passes.
- [x] 3. Add the search input (name filter preserving true rank, with the
      "Actual rank is preserved while searching" copy), URL-synced
      alongside `minGames`.
      **Done when:** typing a name narrows the visible rows while each kept
      row still shows its original rank number (verified by comparing
      against the unfiltered table), clearing the search restores the full
      list, the URL reflects the search term, verified in the running app;
      `npm run build` passes.
- [x] 4. Add the podium: top 3 qualified/ranked players as three cards with
      the centered-and-lifted first-place layout above `md`, natural stacked
      order below it.
      **Done when:** the podium shows the correct top 3 for a known metric
      (cross-checked against the table below it), first place is visually
      centered and lifted at desktop width, cards stack in rank order at
      mobile width, a phase/metric with fewer than 3 qualified players
      shows only the available cards without erroring; verified in the
      running app; `npm run build` passes.

## Files / areas

- `frontend/src/statistics/StatisticsPage.jsx` - `PlayerLeaderboard` and
  its sub-components (kept in this file, matching this codebase's
  established per-page convention).
- `frontend/src/lib/statsFields.js` - reused `PLAYER_METRIC_GROUPS`,
  `metricLabelFor`, `formatStatValue`; no changes expected.
- `frontend/src/statistics/StatBarCell.jsx`, `statBarScale.js` - reused for
  the ranked table's bar cells.

## Data / contracts

No backend change. Reused response shape from
`GET /seasons/:seasonCode/season-stats?phase=&mode=&sort=&order=&limit=&offset=`:
`{ players: StatsEntry[], pagination: { hasMore, total } }`, looped to
completion the same way `fetchTeamRosterStats`/`fetchLeagueLeaderboard`
already loop it. Each `StatsEntry` carries `personKey`, `playerName`,
`playerImageUrl`, `clubName`, and the four stat-group objects
(`traditional`/`advanced`/`scoring`/`misc`) already used throughout
`statsFields.js`.

## Testing

- No unit test runner configured; `npm run build` is Verify for each step,
  plus direct browser verification (tie/rank values, minimum-games
  filtering, search behavior, podium layout at two viewport widths) since
  there's no browser-test coverage for this page.
- Verify against a metric/phase with real ties (e.g. triple-doubles, often
  0 for most players), a rate metric to confirm the explainer, and a phase
  with fewer than 3 qualified players at a high minimum-games threshold for
  the podium's partial-data case.

## Notes for the AI

- Reuse the exact loop-fetch shape from `PlayerPage.jsx`'s
  `fetchLeagueLeaderboard` (page size 100, page cap 5) rather than
  reinventing pagination logic.
- Dense-rank computation: sort by the active metric/direction (already the
  fetch's sort), then walk the array once, incrementing the visible rank
  only when the current value differs from the previous row's value.
- "Rate metric" for the explainer means the active category belongs to the
  Advanced or Scoring group in `PLAYER_METRIC_GROUPS`; Traditional and Misc
  are counting stats and don't get the explainer, though the minimum-games
  select itself stays available for every category.
- Keep `TeamLeaderboard` and its existing `CompactFilterSelect`/
  `DirectionSelect` untouched - this feature only restructures
  `PlayerLeaderboard`.

## Open questions

None - the category-granularity question was resolved above (reuse the
existing 23 sortable metrics rather than the guideline's illustrative,
partially-unsupported 12-item list), and every other clause maps directly
to data and patterns already in this codebase.
