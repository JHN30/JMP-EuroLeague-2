# Feature: Table overflow discipline

**From build-plan:** feature 15b-iv
**Build attempt:** 1
**Branch:** feature/table-overflow-discipline
**Status:** verified

## Goal

Apply the guideline's overflow defences to the app's data tables: a
non-chaining horizontal scroll wrapper, truncation with a `title` tooltip on
every variable-length identity cell, and a sticky first column where the
identity column is genuinely already first. This is the last piece needed to
finish build-plan 15b.

## Design reference

`UI-UX.md` section 8.7 (overflow discipline) and section 6 (`.data-table-sticky`).
Guideline, not literal spec: this app's tables put a rank/jersey/index column
before the name in most places, which the guideline's own tables don't do (see
Out of scope).

## In scope

Every table in the app was inspected. All nine already sit inside a
`.panel overflow-x-auto` wrapper.

- **Non-chaining horizontal scroll**: add `overscroll-x-contain` to all nine
  existing table wrapper `className` strings (`StandingsTable.jsx`,
  `GameDetailPage.jsx` x2, `TeamPage.jsx` roster, `StatisticsPage.jsx` x2,
  `PlayerPage.jsx` game log, `ComparisonsPage.jsx` x2), so a horizontal table
  fling can't chain into browser back/forward navigation.
- **Truncation with `title` tooltips** on every cell whose text is genuinely
  variable-length source data (a club or player name), wrapped in a flex
  container that needs `min-w-0` for `truncate` to actually take effect
  (the classic flexbox truncation requirement - a flex item's default
  `min-width: auto` prevents it from shrinking below its content otherwise):
  - `StandingsTable.jsx` - team name link
  - `GameDetailPage.jsx` - `TeamStatsTable`'s team name cell,
    `PlayerStatsTable`'s player name cell
  - `TeamPage.jsx` - roster player name link
  - `StatisticsPage.jsx` - team leaderboard club name link, player leaderboard
    player name link
  - `PlayerPage.jsx` - game log opponent name cell
- **New `.data-table-sticky` CSS class** in `index.css`, and applying it to
  the two tables where the identity column is genuinely already the first
  column: `GameDetailPage.jsx`'s `TeamStatsTable` (Team is column 1) and
  `PlayerPage.jsx`'s game log (Opponent is column 1).

## Out of scope

- Sticky-first-column treatment on the other five tables (standings, both
  box-score tables, roster, both leaderboards). Every one of them puts a
  rank, jersey number, or `#` column before the name, so a literal
  `:first-child` sticky lock would freeze the uninformative index column
  instead of the name - the opposite of what sticky is for. The guideline's
  own `.box-score-table` avoids this by combining the jersey number and name
  into one first cell; restructuring these tables' columns that way is a real
  layout change, not a mechanical overflow fix, and belongs with 15d's
  planned rebuild of these same tables into shared components.
- `ComparisonsPage.jsx`'s two comparison tables and `TrendChart.jsx`'s round
  table. Their identity data (team/player names) lives in the header row via
  `TeamHeaderCell`/column headers, not in per-row cells; their per-row first
  column is a short, fixed-length metric label ("PTS", "REB") or a round
  number, neither of which is a truncation or sticky-column candidate. Still
  get the `overscroll-x-contain` addition since they scroll horizontally too.
- Combining build-plan 15b-iii's deferred section-kicker adoption into 15d
  (already updated in `build-plan.md`; included in this feature's commit
  since no other feature has touched that file since).

## Build loop

`workflow.stepReview` is `feature`, but this run is under an explicit
Continuous Mode invocation, which replaces per-step review pauses with
self-review plus one final packet. `workflow.checkpointCommits` is
`disabled`: no commits between steps; completion makes the single work
commit.

## Build steps

- [x] 1. **Add `.data-table-sticky`.** Add the new class to `index.css`:
  ```css
  .data-table-sticky th:first-child,
  .data-table-sticky td:first-child {
    position: sticky;
    left: 0;
    z-index: 1;
    background-color: var(--color-base-100);
    box-shadow: 1px 0 0 var(--color-base-300);
  }
  .data-table-sticky thead th:first-child {
    z-index: 2;
  }
  ```
  Uses `--color-base-100` (not a `-200` header tint) because none of this
  app's tables use zebra striping or a tinted header today (confirmed: no
  `table-zebra` usage anywhere), so the sticky cell should match the plain
  panel fill every other cell already has. Done when: `npm run lint` and
  `npm run build` pass in `frontend/`, and applying the class to a throwaway
  table in devtools shows the first column's computed `position: sticky`.

- [x] 2. **StandingsTable.jsx.** Add `overscroll-x-contain` to the wrapper's
  className. Wrap the team name text in a `<span className="truncate"
  title={entry.clubName ?? entry.clubCode}>`, and add `min-w-0` to the
  containing `<Link>`'s className (currently `"link link-hover flex
  items-center gap-2 font-medium"`). Done when: `npm run lint` and `npm run
  build` pass, and in the browser, narrowing the standings table's team
  column (or picking a long club name) shows the name truncate with an
  ellipsis and a native tooltip on hover showing the full name, with the
  crest still fully visible (not squeezed).

- [x] 3. **GameDetailPage.jsx.** Add `overscroll-x-contain` to both table
  wrappers. In `TeamStatsTable`, wrap the team name cell's text the same way
  (`truncate` + `title`, `min-w-0` on its containing element) and add
  `data-table-sticky` to that table's className. In `PlayerStatsTable`, apply
  the same truncate/title/min-w-0 treatment to the player name text inside
  its existing `flex items-center gap-2` wrapper, but do not add
  `data-table-sticky` there (jersey/portrait precede the name; see Out of
  scope). Done when: `npm run lint` and `npm run build` pass, and on a game
  detail page, the team-stats table's team column stays pinned while
  scrolling the table horizontally on a narrow viewport, and both tables'
  name cells truncate with a tooltip on a sufficiently long name.

- [x] 4. **TeamPage.jsx roster.** Add `overscroll-x-contain` to the wrapper.
  Apply truncate/title/min-w-0 to the roster player name link the same way.
  Done when: `npm run lint` and `npm run build` pass, and the roster table's
  player names truncate with a tooltip on a long name.

- [x] 5. **StatisticsPage.jsx.** Add `overscroll-x-contain` to both
  leaderboard wrappers (team and player). Apply truncate/title/min-w-0 to
  both leaderboards' name links. Done when: `npm run lint` and `npm run
  build` pass, and both leaderboards' name columns truncate with a tooltip on
  a long name.

- [x] 6. **PlayerPage.jsx game log and the two excluded tables.** Add
  `overscroll-x-contain` to the game log wrapper, apply truncate/title/min-w-0
  to the opponent name cell, and add `data-table-sticky` to that table (its
  Opponent column is already first). Also add `overscroll-x-contain` (only)
  to `ComparisonsPage.jsx`'s two comparison-table wrappers and
  `TrendChart.jsx`'s wrapper, per Out of scope. Done when: `npm run lint` and
  `npm run build` pass, the game log's opponent column stays pinned while
  scrolling horizontally on a narrow viewport with truncation and a tooltip
  on a long opponent name, and a horizontal fling on any of the nine tables
  no longer triggers browser back/forward navigation (`overscroll-x-contain`
  present in each computed style).

## Files / areas

- `frontend/src/index.css` - one new class.
- `frontend/src/standings/StandingsTable.jsx`
- `frontend/src/games/GameDetailPage.jsx`
- `frontend/src/teams/TeamPage.jsx`
- `frontend/src/statistics/StatisticsPage.jsx`
- `frontend/src/players/PlayerPage.jsx`
- `frontend/src/comparisons/ComparisonsPage.jsx` (wrapper class only)
- `frontend/src/comparisons/TrendChart.jsx` (wrapper class only)
- `blueprint/build-plan.md` - already carries the 15b-iii-to-15d deferral from
  this run's earlier decision; included in this feature's commit.

No new files, no dependency changes, no data or API changes.

## Data / contracts

No data or API contracts. Nine JSX edits plus one new CSS class, both
described exactly above.

## Testing

No test runner is configured, so per `coding-standards.md` this is verified
by build output and direct browser evidence:

- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser evidence for each step's `Done when`, using the same no-new-
  dependency approach as prior work (Chrome via CDP over the running dev
  server): computed-style checks for `overscroll-x-contain` and
  `position: sticky`, a DOM check that a long name's rendered text is
  visually clipped with its `title` attribute set to the full name, and a
  screenshot of the standings table and one box score confirming crests and
  layout are unaffected.
- `cd backend && npm run build` once at the end, to confirm nothing here
  touched backend code.

## Notes for the AI

- Read each target file fresh before editing; this spec's line references
  are approximate.
- The truncate/title/min-w-0 pattern is the same in every site, corrected
  during step 2 from what this spec originally described: a bare `truncate`
  class has no visible effect in a `<table>` with default `table-layout:
  auto`, since the column just grows to fit the content instead of clipping
  it. The span needs an explicit `max-w-40 sm:max-w-56` alongside `truncate`
  so the browser actually has something to clip against:
  `<span className="max-w-40 truncate sm:max-w-56" title={fullName}>{fullName}</span>`,
  with `min-w-0` on the nearest flex-container ancestor (usually the `<Link>`
  or wrapping `<div className="flex items-center gap-2">`) so that flex item
  can shrink to the span's max-width instead of being forced wider by flex
  sizing. Use this exact corrected pattern at every remaining site (steps 3-6),
  not the incomplete one originally described in those steps. Do not add
  `min-w-0` to the `<td>` itself; table cells don't need it and it has no
  effect there.
- Do not add `data-table-sticky` to any table not named in step 3 or step 6.
  Applying it to a table whose first column is a rank/jersey/index would
  freeze the wrong column, which is worse than no sticky column at all.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10312,"specSha256":"3c58a0f03ce77bd66389e92d681849714aa9d87179e685a3a04c1a53f8be33ac","branch":"refs/heads/feature/table-overflow-discipline","head":"041101d6ed27c63961e53b68ab683de08da2ecb3","baseRef":"refs/heads/master","baseCommit":"041101d6ed27c63961e53b68ab683de08da2ecb3","sourceTree":"f15ee3698ea98c97bb3b6cbcda79f3b7474c638a","absentOptional":[]} -->
