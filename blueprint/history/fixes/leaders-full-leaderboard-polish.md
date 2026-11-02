# Fix: Leaders full leaderboard polish

**Type:** Fix
**Status:** verified
**Branch:** fix/leaders-full-leaderboard-polish

## The problem

The full leaderboard (`/:season/leaders?metric=...`, all three scopes) is loose and its controls are untidy. Measured at
1440×900 on the local DB for 2026-27: the Points board is 1,744px tall with 46px rows; at 390px it is 2,302px with 64px rows.

- **Controls (the user's screenshot):** under the tabs and the Statistic / Show row sits a second row of a muted line
  ("Per game · qualified players (5+ games)"), then Order, Minimum games, Team and Position selects, each with its own
  label above, and a long search field. Labels, sizes and the line's baseline do not line up; the line repeats what the
  Minimum games select already says. On a phone the Order select and the line take their own rows above "Filters".
- **Minimum games** offers "Qualified (5+ games)", All players, 5+, 10+, 15+: fixed numbers that mean little early in a
  season and too little late in it.
- **The list:** "Showing 1-25 of 238 players" is a separate line inside the panel, and Previous / Next page are two full
  buttons at the foot. Each row is two lines (name, then team and position).

## The fix

Layout and filter changes on the full board only; the category cards stay as they are. Players, Teams and Advanced boards
share the new layout (each keeps only the filters it has today). All state stays in the address.

1. **Minimum games as a share of the games played** (Players board).
   - Options: All players, 25%, **50% (default)**, 67%, 75%, 90%, 100% of N, each labelled with the games it means, e.g.
     "50% · 5+ games". The games needed are N × share, rounded up (50% of 9 = 5, of 14 = 7, of 38 = 19), matching the
     cards' rule from `compact-leaders-page-on-desktop`.
   - N is the stage's rounds played (`useRankingRule`). A stage without standings (play-in, playoffs, Final Four) uses the
     most games any player has in that stage.
   - The address keeps the share as `?games=25|67|75|90|100|all` (50% is the default and is left out); the old `minGames`
     parameter is dropped.
2. **One tidy filter bar, attached to the list.** The board's controls move into the list panel's header as one row:
   compact selects without separate labels above them (the label is part of the choice, e.g. "Games: 50% · 5+", "All
   teams", "All positions"), and a short search field with an icon on the right. Advanced keeps its Minimum minutes the same
   way; Teams has only the search.
   - **Order** is no longer a select: the value column's heading (PTS, PER, ...) is a button that flips highest / lowest
     first, with an arrow and `aria-sort` on the column; it still writes `?direction=`.
   - The muted "Per game · qualified players (...)" line goes. The panel's header says what the list is, on one line:
     "238 players · per game", with the Advanced stat's description and its early-season badge beside it, and the volume
     rule ("Ranked among players with 45+ field goal attempts") only when the stat has one.
   - When any filter differs from its default, a small "Reset" link clears them all.
   - On a phone the bar keeps the existing "Filters" disclosure for the selects and the search; the sort heading replaces
     the Order select.
3. **Paging and rows.**
   - Range and paging share one compact control, "‹ 1-25 of 238 ›", in the panel header and again at its foot; the page
     buttons keep their accessible names "Previous page" / "Next page" and the list's scroll-to-top behaviour.
   - From `lg` a row is one line: name, then team and position after it, muted, so a row is about 40px (was 46px). Below
     `lg` the row is unchanged.

Must not break: every URL parameter other than `minGames` (metric, mode, direction, team, position, search, offset,
phase, ascope, minMinutes), the board's loading skeleton and empty states, keyboard use of every control, the phone layout
(`responsive.spec.js`), and the volume minimums and qualification counts from the last Leaders fix.

## Build steps

- [x] 1. **Minimum games as a share.** Item 1. Done when the 2026-27 Points board defaults to "50% · 5+ games" with the
   same 238 players as now, 100% shows only players with 9 games, and a playoff board uses the most games played.
- [x] 2. **Filter bar, sort heading, paging and rows.** Items 2 and 3 on all three boards. Done when the controls under the
   tabs are one bar in the list panel at 1440px, the value heading sorts both ways, a row is about 40px from `lg`, the
   390px board keeps the Filters disclosure, and the Leaders specs pass (updated for the removed Order select and
   `minGames`).

## Verify

- `/E2026/leaders?metric=pointsScored`: default "50% · 5+ games"; switch to 25%, 100% and All players; flip the order from
  the PTS heading; filter by team, position and search; Reset; page forward and back.
- `/E2026/leaders?scope=teams&metric=points` and `?scope=advanced&metric=per`: the same bar with only their filters.
- A playoff board (`/2025/leaders?phase=PO&metric=pointsScored`): the shares use the most games played.
- 390px wide: Filters disclosure, sort heading, no sideways scroll.
- Local DB only: `cd frontend && npx playwright test leaders.spec.js leaders-layout.spec.js scroll-in-page-views.spec.js responsive.spec.js`.

## Implementation notes

- **Paging deviation:** the range is in the bar's summary only ("Showing 1-25 of 238 players · per game"), and the foot has
  "‹ Page 1 of 10 ›" with buttons named "Previous page" / "Next page" (not the same range twice, which would duplicate
  the text and the buttons for anyone reading the page). The pager is hidden when the list fits one page (Teams).
- **Sort heading:** a button in the value column named, e.g., "PTS: highest first. Show lowest first"; no `aria-sort`, since
  the board is a list, not a table. Advanced boards the API orders one way (RAPM, on/off, PER, win shares) keep a plain
  heading, as their Order select was disabled before.
- **Shares:** `?games=25|67|75|90|100|all`, rounded up with integer fractions (67% is two thirds). The board waits for its
  list (`isPending`, not `isLoading`), so it no longer shows an empty "No players" list before the season's stages load.
- **Shared parts** (`LeaderParts.jsx`, Leaders only): `BoardBar`, `BarSelect`, `BarSearch`, `BoardPager` replace
  `BoardTopLine` and `BoardControls`; `BoardHeader` takes `sort`; `BoardRow` is one line from `lg`.
- Measured at 1440×900: Points board 1,584px (was 1,744), rows 42px (was 46); 390px: 2,190px (was 2,302).
- Tests: `leaders-layout` finds the column header as the row that is not a link; a new `leaders.spec.js` test covers the
  default share, 100%, the sort heading and Reset. Passing: `leaders`, `leaders-layout`, `scroll-in-page-views`,
  `skeleton-loading`, `progressive-disclosure`, and the Leaders tests in `responsive`.
- After review: the 100% option reads "Games: 100% · 9" (no "+", since nobody can have more than every game).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7104,"specSha256":"2921274a120288c61d3d1592ff8e5a4343785df96705451354a2192bf8e8923b","branch":"refs/heads/fix/leaders-full-leaderboard-polish","head":"4244f3cf97cdc634031deb7cb937239379f625a1","baseRef":"refs/heads/master","baseCommit":"4244f3cf97cdc634031deb7cb937239379f625a1","sourceTree":"15dcca47945281ba91b158bdd395eae94a87a9da","absentOptional":[]} -->
