# Feature: Player comparison tabs mobile layout

**From build-plan:** feature 31l-iii
**Build attempt:** 1
**Branch:** feature/player-comparison-tabs-mobile-layout
**Status:** verified

## Goal

Make the four tabs of an opened player comparison (`/:season/compare?view=players&playerA=..&playerB=..`: Overview, Statistics,
Advanced, Trends) work from 320px up: no sideways page scroll, no player name or club cut where it can wrap or shorten, a radar and
charts that fit, and the same touches the team comparison got in 31l-ii. The top of the comparison was 31l-i, the team tabs 31l-ii,
and the Head-to-head page is 31l-iv. Mobile is below 640px (unprefixed styles), tablet is `sm` (640px), desktop is `lg` (1024px);
`xl` stays. Layout and labels, plus the Trends reading described below; no API or data change.

Today (read from the code; not yet probed in a browser at 320px, that is step 1):

- **Overview** (`ComparePlayerOverview.jsx`), three panels. *Profile*: each player's head (headshot, a `truncate` name that links to the
  player, the club crest and a `truncate` club name, games and minutes) and two outline badges ("Scoring · 91st percentile", the
  strongest and weakest axis) on either side of a six-axis Chart.js radar (`h-72`, legend with both full names, `lg:grid-cols-[...]`
  stays one column below `lg`). *Season line*: seven `ComparisonRow`s (PTS to MIN) with league places. *Recent form*: two lists of the
  last five games (W/L badge, vs/at, a `truncate` opponent abbreviated name, "N pts · N reb · N ast" as a non-shrinking line), in
  `md:grid-cols-2`, with four averages above each.
- **Statistics** (`PlayerComparisonTable` and `PlayerHeaderCell` in `ComparisonsPage.jsx`): a `p-3` panel with two headshots over the
  raw picker labels (`entity.label`, not the "First Last" form the other tabs use) and one `ComparisonRow` per statistic under group
  headings.
- **Advanced** (`ComparePlayerAdvanced.jsx`): the same panel shape with the two names (`niceName`), a note, and `ComparisonRow`s per
  family with league places.
- **Trends** (`ComparePlayerTrends.jsx`, charts from `TrendCharts.jsx`): four five-game-average line charts (points, rebounds, assists,
  PIR; the average starts at the third game) and two round-by-round charts (PER, Win Shares), in plain `grid gap-6 xl:grid-cols-2`
  grids, with the legend and tooltip naming each player by their full name and the note "Hover a point for the game".
- `responsive.spec.js` has the opened team comparison but not an opened player comparison (its comment says it joins with this item).

31l-ii found, on the team tabs, grids that grew past the window because a grid track does not shrink below its content (fixed with
`grid-cols-[minmax(0,1fr)]`), `truncate`d names, tables that scrolled the player away, and "Hover" wording for touch. The same
patterns are in these files and are the starting hypothesis; step 1 measures before changing anything.

## In scope

1. **Breaks.** Retire the `md:` classes in these four tabs. Two-up lists are one column below `sm` and two from `sm` (one until `lg` if
   anything is cut at 640 or 768px). Every grid that holds charts, cards or lists gets `grid-cols-[minmax(0,1fr)]`.
2. **Names.** A player name wraps (at most two lines) instead of being cut by `truncate`, in the Profile heads, the Statistics header
   and the Advanced header. The Statistics header uses the same "First Last" form as the other tabs (`niceName`/`nameOf`), not the raw
   picker label. The club in a Profile head shows its crest and the club's TV code below `sm` and its name from `sm`, when the leaderboard
   row carries a TV code (step 1 confirms the field; otherwise the club name wraps). The opponent in a Recent form row uses
   `ShortLabel` with `teamCode` and `shortTeamName` from `games/gameUtils.js`, as in 31l-ii.
3. **Overview.** The Profile heads and badges, the radar (its six axis labels not clipped or overlapping, its legend wrapping, a height
   that reads at 320px), the seven season-line rows, and the two form lists, whose game rows put the result, the opponent and the
   "N pts · N reb · N ast" figures on one row or wrap them onto a second line inside the row; nothing outside its panel at 320px.
4. **Statistics and Advanced.** Header names, the note, the group headings and every row (value, bar, place line, "Lower is better" tag)
   fit at 320px; rows use `ComparisonRow`'s `compact` option below `sm`.
5. **Trends.** The six charts, their titles, notes and legends fit at 320px, the chart pairs side by side from `xl` as today, and the
   notes say "Hover or tap". See the open questions for what the first four charts plot.
6. **States.** "Loading the players", "Loading recent games", "Loading the trends", the error states with Retry, "Has not played yet",
   "Neither player has enough games to chart percentiles", "One of the two has not played enough games to be ranked", "No games played
   yet", "Advanced numbers are not available for these players", "Not enough games played to show a trend yet" and "Select two players to
   compare" fit at 320px in the same layout as loaded content.
7. **Specs.** A new `frontend/e2e/compare-player-layout.spec.js` (pattern from `compare-team-layout.spec.js`), and an opened player
   comparison added to `responsive.spec.js`.

## Out of scope

- Any API or data change, the picking, swapping, URL and back-link behaviour, what the Overview and Statistics tabs compute
  (percentiles, places, rankings), the phase and mode selects, and the team tabs (31l-ii) and Head-to-head (31l-iv).
- `TrendCharts.jsx` changes beyond an opt-in prop with today's default (it also serves the team Trends tab, which already uses `markers`).
- Changing shared components outside `frontend/src/comparisons/` beyond their existing options (`ComparisonRow`'s `compact`, `ShortLabel`,
  `Avatar`, `Panel`, `AsyncState`).
- Header tips (`HeaderTip`) and chart tooltip behaviour on touch beyond the note wording.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the narrow check after
each, then present one final review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Baseline and Overview.** Before changing code, take a baseline of the four tabs of one live player comparison (two players with
      the longest names, and two with a short pair) with a throwaway probe: each tab loaded once and resized through 320, 390, 640, 768,
      1024 and 1280px, recording page width, cut texts, broken words and anything outside its panel; delete the probe afterwards. Confirm
      whether the leaderboard rows carry a club TV code. Then fix the Overview: breaks, wrapping names, the club and opponent labels, the
      radar and the form rows.
      Done when: at 320 and 390px the Overview has no cut text, no word broken mid-word, nothing outside its panel, no sideways page scroll,
      and a radar whose labels and legend are readable; from 1024px it looks as today.
- [x] 2. **Statistics and Advanced.** `compact` rows, wrapping headers with the shared name form, and any grid fix the baseline shows.
      Done when: at 320 and 390px both tabs have every row inside its panel and no cut text; the Statistics header shows "First Last";
      from 640px both look as today; no sideways page scroll at 320, 390, 768 or 1024px.
- [x] 3. **Trends.** `minmax(0,1fr)` chart grids, chart sizes, "Hover or tap" notes, and the charts' content as decided in the open questions.
      Done when: at 320 and 390px the six charts sit inside their panels with legends, axes and titles unclipped, also after resizing from
      1280px down to 320px without a reload; from `xl` the pairs sit side by side as today.
- [x] 4. **States and specs.** Check the states at 320px with mocked responses, write `compare-player-layout.spec.js`, add the opened player
      comparison to `responsive.spec.js`, and run both with `compare.spec.js`, `compare-layout.spec.js`, `compare-team-layout.spec.js`
      and `phone-menu.spec.js`.
      Done when they pass on the local database (`/api/health` says `local`), with root `npm run build` and `cd frontend && npm run lint`.
- [x] 5. **Changes asked for at review** (the user, after trying the built tabs on a phone):
      (a) each tab has the two players at its top, as the team tabs show the two clubs: a headshot over the name and the club (crest and TV code
      below `sm`), one shared header on the Overview's Season line, Statistics, Advanced and Trends (changed at the user's request from a tag over every row);
      (b) the Statistics rows use the player page's readable labels and tips (`players/playerStatDefs.js`: "Double-doubles", "Triple-doubles",
      "Team wins when playing", "Possessions", ...) in place of "DD", "TD", "W", "L" and the other abbreviations, with tips added there for the rows that
      lack one (double-doubles, triple-doubles, possessions, assist to turnover);
      (c) every Advanced statistic has a hover tip (`leaders/leaderDefs.js`: the per-100 and rate rows had none);
      (d) `HeaderTip`: on a touch device a tap on an open tip's label closes it (today only a tap elsewhere does); mouse and keyboard behaviour is unchanged;
      (e) the notes say how to read a tip on a phone: "Hover or tap a name for what it means." on Advanced, and the Rosters note
      "Hover or tap a column for what it means." (no note on Statistics: its rows are named in full).
      Done when: on a phone width each of those rows shows both players above their values; the Statistics rows read "Double-doubles", "Triple-doubles" and the
      other readable labels, each with a tip where one is defined; every Advanced row has a tip; tapping a tip's label opens it and tapping it again closes it
      (touch emulation), while a mouse hover still opens and closes it; the specs and `game-box-score.spec.js`, `game-four-factors.spec.js` and
      `game-scoring-profile.spec.js` (they read tips) pass, with root `npm run build` and `cd frontend && npm run lint`.

## Files / areas

- `frontend/src/comparisons/ComparePlayerOverview.jsx`, `ComparePlayerAdvanced.jsx`, `ComparePlayerTrends.jsx`, `CompareRadar.jsx`.
- `frontend/src/comparisons/ComparisonsPage.jsx`: `PlayerComparisonTable` and `PlayerHeaderCell` only.
- `frontend/src/comparisons/TrendCharts.jsx`: only if a chart needs an opt-in prop.
- `frontend/src/games/gameUtils.js`: read only (`teamCode`, `shortTeamName`). `frontend/src/players/leagueLeaderboard.js` and
  `playerOverview.js`: read only.
- `frontend/e2e/compare-player-layout.spec.js` (new), `frontend/e2e/responsive.spec.js`.

## Data / contracts

None changed. The tabs read the existing league leaderboard, player games, player advanced (extended) and player season-stats responses. A
`NULL` value, rank, crest or TV code means unavailable: the row omits that part or shows "—", never zero (as today). A comparison's URL
(`view`, `playerA`, `playerB`) is unchanged. Player and club names are rendered as React text, never as HTML.

## Testing

No unit test runner is configured and no `Verify` command is declared in `AGENTS.md`, so none was run while writing this spec. Browser tests run on
the local database (`/api/health` must say `local` first). `compare-player-layout.spec.js` opens one player comparison, clicks through the four
tabs and resizes through 320, 390, 639, 640, 768, 1023, 1024 and 1280px (widest first, so a chart must shrink), checking per tab: the document
no wider than the window, no cut text and no word broken mid-word, panel content inside its panel, the radar and every chart inside their
panels, the opponent label a TV code below 640px and the abbreviated name from it, and the Statistics header in the "First Last" form. Mocked
responses cover two long names, a missing headshot and crest, a player with no games, failing games, and too few games for Trends. Evidence while
building comes from single page visits through the Playwright library, as in 31l-ii. Final gate: root `npm run build` plus `cd frontend && npm run lint`.

## Notes for the AI

- Follow the user's rules: changes stay on the page being built, shared components get opt-in props only. The TV code is the short label wherever
  a full name does not fit; the club code is the permanent ID (memory notes).
- Reuse what 31l-ii built (`ShortLabel` slots, `compact` rows, `grid-cols-[minmax(0,1fr)]`, `LineTrend`'s `markers`) and read
  `blueprint/history/features/31l-ii-team-comparison-tabs-mobile-layout.md` for the details and the mistakes to avoid. Never open the real `.env`.
- Take the baseline with a throwaway probe before changing code and delete it afterwards. Browser tests are not paused; run the specs.
- Match the surrounding code style and comment density. No AI attribution in commit messages (AGENTS.md).

## Decisions on the open questions

Both recommended defaults were confirmed by the user at review and built.

1. **What do the four Trends line charts plot?** Today a five-game average that starts at the third game, so the first two games never show
   (the team Trends charts had this and were changed at the user's request to every game, with a dot on each point). *Recommended:* the same
   here, each game's own points, rebounds, assists and PIR from Game 1 with `LineTrend`'s `markers`, and the note "Every game, in order. Hover or
   tap a point for the game." The round-by-round PER and Win Shares charts stay as they are.
2. **How are the two players named in the legends and tooltips?** Today the full name in both. The team charts use the club's abbreviated
   name. *Recommended:* the last name in legends and tooltips ("Nwora", "Lawson"), the full "First Last" in headings; if the two share a last
   name, the full names.

## Built as

- As specced, in `ComparePlayerOverview.jsx`, `ComparePlayerAdvanced.jsx`, `ComparePlayerTrends.jsx`, `ComparisonsPage.jsx` (`PlayerComparisonTable`) and a new
  `comparisons/playerLabels.js` (`fullName`: "Derrick Alston Jr."; `chartNames`: last names, full names when the two share one).
- Baseline (the two longest-named qualified players, widest first and ascending): Overview 509px wide at 320 and 390px (the Profile grid, and the
  badges that do not wrap), Trends 603px wide at 320 and 390px; Statistics and Advanced already fitted at 320px. Opponent names were cut on the form
  rows.
- Overview: `grid-cols-[minmax(0,1fr)]` on the Profile and form grids (`sm:grid-cols-2` for the lists), names and the club wrap, the club shows its
  crest and its TV code below `sm` (`ShortLabel`, from `clubTvCodes` on the leaderboard row, a traded player's codes joined with "/") and its name from
  `sm`, the percentile badges wrap (`h-auto whitespace-normal`), the season line rows are `compact`, and each form row wraps its "N pts · N reb · N ast"
  onto a second line below `sm`, the opponent a TV code below `sm`. The radar's legend and tooltips use last names.
- The club crest in a Profile head read `player.crestUrl`, a field the leaderboard row does not have, so it never showed; it now reads `clubImageUrl`.
- Statistics and Advanced: `compact` rows and the "First Last" name in both headers (the raw picker label is gone from Statistics).
- Trends: `minmax` chart grids, the four line charts plot each game from Game 1 with dots (the five-game average and its "from the third game on" are
  gone) and the note reads "Every game, in order. Hover or tap a point for the game."; the PER and Win Shares charts are unchanged; legends and
  tooltips use last names.
- `compare-player-layout.spec.js` (5 tests) and a "Compare (two players)" entry in `responsive.spec.js`. A first run failed on my own assertions (words in
  narrow bold labels, an unbroken 29-letter name no real player has, and canvases polled for 5s under parallel load); fixed. 181 of 181 pass on the local
  database with `compare.spec.js`, `compare-layout.spec.js`, `compare-team-layout.spec.js` and `phone-menu.spec.js`. Root `npm run build` and
  `cd frontend && npm run lint` pass.
- Changes asked for at review (step 5), built after the user tried the tabs on a phone:
  - A shared `PlayerPairHeader` (`comparisons/PlayerPairHeader.jsx`, a `role="group"` named "Players compared") sits at the top of the Overview's Season line, Statistics,
    Advanced and Trends (a panel of its own): headshot, "First Last" name linking to the player, club crest and TV code below `sm`. `usePlayerRows` supplies the rows
    (the Statistics tab's per-game query key, so it is shared); on Overview the leaderboard rows are used. A first attempt put a headshot-and-name tag over every row
    (`sideA`/`sideB`); the user asked for the header instead, so the tags and `PlayerSideTag` are gone.
  - The Statistics rows take their label and tip from the player page's definitions (`PLAYER_STAT_DEFS` in `ComparisonsPage.jsx`, from `players/playerStatDefs.js`):
    "Double-doubles", "Triple-doubles", "Team wins when playing", "Possessions", "Assist to turnover" in place of DD, TD, W, L, POSS, AST/TO. Tips were added there for
    assist to turnover, possessions and the two milestones. This also changes the player page's Statistics tab, which reads the same definitions.
  - Every Advanced statistic now has a tip (`leaders/leaderDefs.js`: the seven per-100 and rate rows had none), which the Leaders Advanced board shares.
  - `HeaderTip`: a touch tap on an open tip's label closes it (`onPointerDown` notes whether it was open, `onClick` closes it and blurs the label so the next tap opens it
    again); mouse and keyboard are unchanged. It applies wherever `HeaderTip` is used.
  - Notes: "Hover or tap a name for what it means." on Advanced and "Hover or tap a column for what it means." on the team Rosters tab; the Statistics note was removed at the user's request.
  - Evidence: touch emulation tap 1 opens, tap 2 closes, tap 3 opens; desktop hover as before; no Advanced row lacks a tip; the header shows on every tab at 390px with two headshots.
    `compare-player-layout.spec.js` has 7 tests, all passing; its resize test (and the team one) pause 250ms between resizes after a Chart.js resize race made it flaky 1 run in 4
    (8 of 8 after). Earlier broader runs (243 and 191 tests with the tip-reading, standings, Leaders and phone-menu specs) passed except two load flakes in untouched areas
    and a 43.99997px rounding in `phone-menu.spec.js`. Root `npm run build` and `cd frontend && npm run lint` pass.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":18685,"specSha256":"6ea0bf64c0d1d623f064819e455c7756f351acf3b100f11345b3fa3f1ea4ca64","branch":"refs/heads/feature/player-comparison-tabs-mobile-layout","head":"004a4cdbdecc356b38b688b36c557b714026d1ba","baseRef":"refs/heads/master","baseCommit":"004a4cdbdecc356b38b688b36c557b714026d1ba","sourceTree":"df4a5570f33ffc51b7a434b820bd9e0c7f23e77b","absentOptional":[]} -->
