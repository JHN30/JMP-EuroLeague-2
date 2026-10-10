# Feature: Team comparison tabs mobile layout

**From build-plan:** feature 31l-ii
**Build attempt:** 1
**Branch:** feature/team-comparison-tabs-mobile-layout
**Status:** verified

## Goal

Make the four tabs of an opened team comparison (`/:season/compare?teamA=..&teamB=..`: Overview, Statistics, Rosters,
Trends) work from 320px up: no sideways page scroll, no club or player name cut where it can wrap or shorten, tables that
keep the player visible while the numbers swipe, and charts that fit. The top of the comparison (strips, selects, Copy
link) was 31l-i; the player comparison tabs are 31l-iii and the Head-to-head page is 31l-iv. Layout and labels only: no API
or data change. Mobile is below 640px (unprefixed styles), tablet is `sm` (640px), desktop is `lg` (1024px); `xl` stays.

Today (read from the code, not yet seen in a browser at 320px):

- **Overview** (`CompareTeamOverview.jsx`), four panels. *Matchup edges*: two cards (`md:grid-cols-2`), each a crest, the
  full club name in a `truncate` line, a count line, and up to three rows of a `truncate` statistic label and a "#3 vs #12"
  figure. *Form*: two lists of the last five games (W/L badge, vs/at, crest, a `truncate` opponent abbreviated name, the
  score; `md:grid-cols-2`), then the Home and Away record `ComparisonRow`s. *Top scorers*: two lists (`md:grid-cols-2`),
  each row a headshot, a `truncate` name with an assists and rebounds line, and the points; under them a `btn-sm` "Compare
  <name> and <name>" link. *Meetings*: one link row per game, a wrapping round and date and a "<home abbreviated> 82-79
  <away abbreviated>" line. 31l-i found two player names cut at 320px here and a Matchup edges card reaching the panel edge.
- **Statistics** (`CompareTeamStats.jsx`): a `p-3` panel with two club heads (crest, centred full name, record), a note, and
  one `ComparisonRow` per statistic under family headings, each with the club's place ("#3 of 18") under its bar.
  `ComparisonRow` already has an opt-in `compact` prop for phones.
- **Rosters** (`CompareRosters.jsx`): a summary panel (two club heads and six `ComparisonRow`s); "Most impactful players",
  one table per club (Player, PER, WS, WS/40, USG%, TS%, PIE) and the roster tables (#, Player, GP, MIN, PTS, REB, AST, PIR),
  each in a plain `overflow-x-auto` box with a `truncate` club name in its header, the grids `grid-cols-[minmax(0,1fr)]
  xl:grid-cols-2`. Swiping the numbers scrolls the player away.
- **Trends** (`CompareTeamTrends.jsx`, charts in `TrendCharts.jsx`): a Form panel with two cards (`md:grid-cols-2`; crest,
  `truncate` club name, last-5 record and streak, a five-segment strip, Scored and Allowed with a delta line), three
  Chart.js line charts (`h-64`) and two margin bar charts (`h-56`), in plain `grid gap-6 xl:grid-cols-2` grids.
- `responsive.spec.js` checks the opened team comparison's Overview only; a section is component state, not part of the URL,
  so the other tabs can only be reached by clicking.

## In scope

1. **Breaks.** Retire the `md:` classes in these four tabs. The two-card and two-list grids (edges, form, top scorers,
   Trends form) are one column below `sm` and two columns from `sm`; if a column cut or overflowed anything at 640 or 768px
   in the step's evidence, the grid stays one column until `lg` instead.
2. **Names.** A club name or player name in the four tabs wraps (at most two lines) instead of being cut by `truncate`;
   a long statistic label in a matchup edge wraps. In one-line slots that hold the *other* club (the opponent in the form
   lists and the two clubs in a meeting row) the club's TV code shows below `sm` and the abbreviated name from `sm`, using
   `ShortLabel` with `teamCode` and `shortTeamName` from `frontend/src/games/gameUtils.js` as 31l-i did. Full names stay
   where they wrap (card heads, summary heads, table headers).
3. **Overview.** All four panels fit at 320px: the edge cards and their rows, the form rows (the W/L badge, vs/at, crest,
   opponent, score on one row), the record rows, the scorer rows with the points kept visible, the "Compare <name> and
   <name>" link wrapping to its text instead of overflowing its button, and the meeting rows (round and date, then the
   fixture, wrapping onto a second line).
4. **Statistics.** The club heads, the note, the family headings and every statistic row (with its place line and the
   "Lower is better" tag) fit at 320px; rows use the existing `compact` option of `ComparisonRow`.
5. **Rosters.** The summary, the two Most impactful players tables and the two roster tables keep the player visible
   while the numbers swipe below `sm`, reusing an existing pinned-column pattern in the app (`data-table-sticky` as in
   `TeamRosterSection.jsx`, `ScrollingTable` and `pinned-table` as in Standings and the Box score) rather than a new one;
   how the jersey number sits beside the pinned player (the roster table's `#` column precedes the player) is chosen in
   the step. A club name in a table header wraps. From `sm` the tables look as today.
6. **Trends.** The form cards, the five charts and their titles, notes and legends fit at 320px: the chart grids get
   `grid-cols-[minmax(0,1fr)]` so a canvas cannot widen its column, the charts keep a readable height, and their axis
   labels do not overlap. The notes say "Hover or tap a point" instead of "Hover a point" (touch has no hover).
7. **States.** "Loading the matchup", "Loading recent form", "Loading the players", the error states with Retry, "No one
   has played yet", "No games played yet", "No big edge", "These clubs have no statistics in this phase yet", "No roster is
   registered for these clubs yet", "No advanced numbers for this club yet" and "Not enough games played in this phase to
   show a trend yet" fit at 320px and read in the same layout as the loaded content.
8. **Specs.** A new `frontend/e2e/compare-team-layout.spec.js` (pattern from `compare-layout.spec.js`) for the four tabs.

## Out of scope

- Any API or data change, what the tabs show, the statistics, edges or trends maths, the picking, swapping, URL or
  copy-link behaviour, the phase select.
- The top of the comparison (31l-i), the player comparison tabs (31l-iii) and the Head-to-head page (31l-iv). `TrendCharts.jsx`
  is shared with the player Trends tab: a change to it must be an opt-in prop with today's default, so the player tab is
  untouched until 31l-iii. The unused older `TrendChart.jsx` is not touched.
- New abstractions: no new shared component or CSS pattern unless the step shows the existing pinned-column patterns cannot
  serve the roster tables.
- Changing shared components outside `frontend/src/comparisons/` (`ComparisonRow`, `Panel`, `AsyncState`, `HeaderTip`,
  `ShortLabel`, `RevealImage`, `Avatar`) beyond their existing options.
- Tap behaviour of the column-header tips (`HeaderTip`) and chart tooltips beyond the note wording above.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the
narrow check after each, then present one final review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Baseline and Overview.** Before changing code, take a baseline of the four tabs of one live team comparison
      with a throwaway probe (each tab loaded once, resized through 320, 390, 640, 768, 1024 and 1280px, recording page
      width, cut texts, broken words and anything outside its panel); delete the probe afterwards. Then fix the Overview
      panels: the breaks, wrapping names, TV codes in the opponent and meeting slots, and the compare link.
      Done when: at 320 and 390px the Overview has no cut text, no word broken mid-word, nothing outside its panel and no
      sideways page scroll, with the W/L, opponent and score on one row of the form lists and the points visible on every
      scorer row; at 640 and 768px the two-column grids hold their content or stay one column; from 1024px the tab looks
      as today.
- [x] 2. **Statistics and Rosters.** `compact` rows and wrapping heads on Statistics; the pinned player column and wrapping
      club names on the four Rosters tables.
      Done when: at 320 and 390px Statistics has every row inside its panel and no cut text; on Rosters the player (name
      and headshot, or the number and name) stays in view while the numbers swipe on all four tables, the tables scroll
      inside their own box and not the page, and club names wrap; from 640px both tabs look as today; no sideways page
      scroll at 320, 390, 768 or 1024px.
- [x] 3. **Trends.** The form cards, `minmax(0,1fr)` chart grids, chart sizes and the notes wording.
      Done when: at 320 and 390px the form cards and all five charts sit inside their panels with legends, axes and titles
      unclipped and no sideways page scroll (also after resizing from 1280px down to 320px without reloading), with the
      charts drawn at the new width; from `xl` the chart pairs sit side by side as today.
- [x] 4. **States and specs.** Check the loading, error and empty states at 320px (mocked responses), and write
      `compare-team-layout.spec.js`.
      Done when: the states fit at 320px in the step's evidence; the spec is written and lints cleanly; it is not run
      before 1 November 2026 unless the user says otherwise, and the final packet says so. Root `npm run build` and
      `cd frontend && npm run lint` pass.

## Files / areas

- `frontend/src/comparisons/CompareTeamOverview.jsx`, `CompareTeamStats.jsx`, `CompareRosters.jsx`,
  `CompareTeamTrends.jsx`.
- `frontend/src/comparisons/TrendCharts.jsx`: only if a chart needs an opt-in prop (see Out of scope).
- `frontend/src/index.css`: only if a roster table needs a rule the existing pinned-column classes lack, scoped to a class
  these tables add.
- `frontend/src/games/gameUtils.js`: read only (`teamCode`, `shortTeamName`).
- `frontend/e2e/compare-team-layout.spec.js` (new). `responsive.spec.js` already holds the opened team comparison; it is
  left as is because a tab is not part of the URL.

## Data / contracts

None changed. The tabs read the existing team rows, team games, team roster and roster statistics, and team players-advanced
responses. A `NULL` crest, TV code, value or rank means unavailable: the row omits that part or shows "—" and never zero
(as today). A comparison's URL (`view`, `teamA`, `teamB`, `game`) is unchanged. Club and player names are rendered as React
text, never as HTML.

## Testing

No unit test runner is configured and no `Verify` command is declared in `AGENTS.md`, so none was run while writing this
spec. Browser tests are paused until 1 November 2026 (recorded in 31k and 31l-i; `CLAUDE.local.md` is not in this checkout,
so confirm the pause still stands before running anything), so the spec is written now but not run.
`compare-team-layout.spec.js` opens one team comparison, clicks through the four tabs and resizes through 320, 390, 639, 640,
768, 1023, 1024 and 1280px, checking per tab: the document no wider than the window; no cut-off text (`truncate` and
`line-clamp` elements, `findBrokenWords` from `support/layout.js`); panel content inside its panel; below 640px the opponent
and meeting slots show a real TV code and from 640px the abbreviated name; the roster and impact tables scroll in their own
box with the player column still in view after a swipe; the charts inside their panels. Mocked responses cover a long club
name, a missing crest or TV code, an empty roster, the games error and a club with too few games for Trends.

Evidence while building comes from single page visits through the Playwright library against the running dev servers (each tab
loaded once and resized, so the server cache absorbs repeat reads), after `/api/health` reports `"target":"local"`. Final
gate: root `npm run build` plus `cd frontend && npm run lint`. Nothing here proves how it looks in the user's browser; the
final packet will say so.

## Notes for the AI

- Follow the user's rules: changes stay on the page being built, and shared components only get opt-in props. The TV code is
  the short label wherever a full name does not fit; the club code is the permanent ID (memory notes on page scope and TV
  codes).
- Do not run `compare-team-layout.spec.js`, `compare-layout.spec.js` or `responsive.spec.js` while the pause stands. Take the
  baseline with a throwaway probe before changing code, as in 31k and 31l-i, and delete the probe scripts afterwards. Never
  open the real `.env`.
- The `ShortLabel` wrapper is positioned so its hidden copy cannot widen a row; reuse it rather than adding `hidden` spans.
- Match the surrounding code style and comment density. No AI attribution in commit messages (AGENTS.md).

## Built as

- As specced, with these details found while building:
  - The baseline (longest-named clubs, Crvena Zvezda and Baskonia) found the Overview and Trends form grids pushing the page
    to 391px and 603px wide at 320px: a grid track does not shrink below its content. `grid-cols-[minmax(0,1fr)]` on the
    two-column grids (Overview edges, form, top scorers; Trends form and chart pairs) fixed it; the chart canvases then
    shrink when the window narrows.
  - The roster table's `#` column is now inside the pinned Player cell (number, then name) at every width, so the first
    column is the player, as on the Team page's roster table. Below `sm` the cell shows the last name only (the headshot
    and the position line are hidden); from `sm` the full name, headshot and position line as before. A player who has not
    played is dimmed cell by cell, so the swiped numbers do not show through the pinned player.
  - A `PlayerName` helper in `CompareRosters.jsx` serves both tables; the impact table's Win Shares bar is full width below
    `sm`.
  - Statistics needed no layout change beyond `compact` rows (it had none at 320px in the baseline); the Rosters summary
    rows are `compact` too.
  - No change to `TrendCharts.jsx`, `index.css` or `responsive.spec.js`.
- Evidence: single page visits through the Playwright library against the running dev servers (`/api/health` target
  `local`), each tab loaded once and resized through 320, 390, 640, 768, 1024 and 1280px, with the longest-named clubs and
  with the first two. After the change no tab scrolls sideways at any width, with no cut text and nothing outside its panel
  (before: Overview 391px and Trends 603px wide at 320px, club names cut on Rosters). On Rosters all four tables swiped to
  the end keep the pinned player cell on the box's left edge at 320px. With mocked responses at 320px a 60-letter club name
  with no crest or TV code wraps in every tab, and the failing games ("Could not load recent form.", "Could not load the
  trends."), no games ("No games played yet.", "Not enough games played...") and no roster states fit.
- `compare-team-layout.spec.js` is written and lints cleanly but was not run (browser tests are paused until 1 November 2026).
  Root `npm run build` and `cd frontend && npm run lint` pass. Nothing here proves how it looks in the user's browser.
- Added on review (user request, Overview Form panel, below 640px only): each form list's heading shows the club's crest and
  abbreviated name instead of the full name, and the Home and Away record rows show each club's crest and TV code over its
  own side's value, since stacked lists no longer show which side is which. From 640px both are as before. The record tags
  use new opt-in `sideA`/`sideB` props on `ComparisonRow` (default `null`, so no other row changes); the club data comes from
  the cached season teams query. Checked at 320px, with 390 and 768px page widths still fitting.
- Added on review (user request, team Trends tab; a change to what the charts show, outside the original "layout only" scope):
  Points scored and Points allowed draw every game's own points from Game 1 (they were a five-game average that started at
  Game 3, so the first two games never showed), and the "Running point differential" chart is now "Point differential": the
  margin of each game, not a running total, above the zero line a win and below it a loss. The three line charts draw a dot
  on every point through a new opt-in `markers` prop on `LineTrend` (default off, so the player Trends tab is unchanged).
  The Form cards still compare the last five games with the season. The two "Margin in every game" bar charts below now show
  the same numbers per club; they were left as they are.
- Added on review: the Form list headings below 640px keep the club name and ": last 5" in one text so they line up with
  the crest (the colon had sat on a different baseline). The team Trends line charts name a club by its abbreviated name in
  the tooltip ("Crvena Zvezda: 5"); the legend keeps the full name. `LineTrend` series take an optional `short` label for the
  tooltip, so the player Trends tab, which passes none, is unchanged.
- Added on review (user request; supersedes the tooltip-only `short` label above): the four team tabs name a club by its
  abbreviated name, with its crest where there is room, at every width: the matchup edge cards, the Form and Players to watch
  headings (the Form heading's phone-only version now applies from `sm` up too), the Statistics club heads, the Rosters
  summary and table headers, the Trends form cards, and the chart legends, tooltips and bar chart kickers (name only, no
  crest). A `useClubEntities` hook (`comparisons/useClubEntities.js`) gives each tab the two clubs with the abbreviated name
  as `label` and the crest and TV code from the cached season teams, so the `short` series label on `LineTrend` was removed
  again. The 60-letter mock in `compare-team-layout.spec.js` now also lengthens `abbreviatedName`. Checked in screenshots at
  320 and 1280px; no tab scrolls sideways. Root build and frontend lint pass.
- Added on review (user request, the top of an opened comparison, built in 31l-i): the way back is now the shared back
  link, "← Games" (or "← Players") above the header on tablet and desktop and the sticky bar's "← Compare" on phones, as on
  the Team and Player pages. Going back is a change of the page's state, not an address, so `BackLink` and the sticky bar take
  an opt-in `onBack` (a plain click runs it; the address, `/compare?view=…`, serves a new tab). The game line is gone: the
  page header now holds, under the title, the round and date, "Hosted by <club>", and two outline buttons, "Game preview" or
  "Game overview" and "All-time head-to-head" (the second also for a comparison not opened from a game), instead of the
  dotted line and the loose link. `GameContext` became `ComparisonContext` (`CompareFixtures.jsx`). The "← Games" button
  lookups in `compare.spec.js` and `compare-layout.spec.js` now find the link "Back to Games". Checked at 1280 and 360px:
  back works from both the link and the phone bar, and the page fits.
- Added on review (user report): opening a comparison (picking a game, or picking the second club or player) and going back
  left the page where it was scrolled. The app's scroll reset (`ScrollToTop`, fix d7640cc) only runs when the path changes, and
  the back link's history handling (ea3d099) only when the previous page is the list; Compare switches between its landing and
  an opened comparison as page state on one path, so neither ran (the old "← Games" button had the same gap). The Compare page
  now scrolls to the top itself in those four handlers (`toTop` in `ComparisonsPage.jsx`); a swap, a phase change and a reload
  are untouched. Checked at 1280 and 360px: from a scrolled landing and from a scrolled comparison, each opens at scrollY 0.
- Added on review (user request): the Copy link button is removed from the opened comparison's header (its state and handler
  too), so the header's text column has the whole width: the round and date and "Hosted by" lines, and the Game preview and
  All-time head-to-head buttons side by side, down to 320px. The "short Copy link" checks are gone from
  `compare-layout.spec.js`. Checked at 320, 360 and 1280px, with and without a game; the page fits.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":20188,"specSha256":"7882b1c21919a81bd703615c52998744cabc2b91ba3f2ecfbeebaf01e7b76fde","branch":"refs/heads/feature/team-comparison-tabs-mobile-layout","head":"6227f5d314202cf317c1055ab10bac45b612df30","baseRef":"refs/heads/master","baseCommit":"6227f5d314202cf317c1055ab10bac45b612df30","sourceTree":"11e2d9810ed857abf3de1be8aeaa8dae7f76664a","absentOptional":[]} -->
