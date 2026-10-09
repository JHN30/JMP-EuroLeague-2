# Feature: Player page Season by season and Statistics mobile layout

**From build-plan:** feature 31j-ii
**Build attempt:** 1
**Branch:** feature/player-season-by-season-and-statistics-mobile-layout
**Status:** verified

## Goal

Make two tabs of the player page (`/:season/players/:personKey`) comfortable from 320px up: **Season by season** (career summary, season table, trends, career highs, profile by season, role table, clubs timeline) and **Statistics** (the phase and mode strips, the top-ranks chips and the ranked stat sheet). No sideways page scroll, nothing clipped, no word of a label cut mid-word. Layout and label only: no API, data or feature change. Mobile is below 640px (unprefixed styles), tablet is `sm` (640px), desktop is `lg` (1024px); `xl` stays.

This is the second of four parts of 31j: 31j-i (header, tabs and Overview) is done; 31j-iii (Advanced) and 31j-iv (Shooting and Games) follow. 31j-i already put the player page in the overflow spec (`responsive.spec.js`, which opens the Overview tab only; it does not see these two tabs or squeezed content).

Read, not yet measured at 320px (step 1 measures it):

- `PlayerCareerSection.jsx`: `CareerSummary` is eight `SummaryStat` cards in `grid-cols-2 sm:grid-cols-4 xl:grid-cols-8`. `SeasonTable` is a `Panel` with its own horizontal scroll (`overflow-x-auto`) around a 15-column table (`data-table-sticky`, which already pins the first column) whose first cell holds the season link plus "small sample" and "calculated" badges on the same line (`whitespace-nowrap`), so the pinned column is wide. `CareerHighs` is `grid-cols-2 md:grid-cols-4` of `HighCard` links (opponent name `truncate`). `RoleTable` is a 5-column table (a 160px `PointMix` bar, a `w-20` start bar) with no pinned column. `TeamsTimeline` is a flex row of `min-w-44` season columns that scrolls on its own. The highs and profile sit side by side from `xl` (`xl:grid-cols-2`).
- `PlayerCareerCharts.jsx`: `TrendGrid` is nine `TrendCard`s in `grid-cols-2 md:grid-cols-3` (an SVG sparkline, a `text-2xl` figure, a change figure and two season labels); `ProfileComparison` is a button, then a Chart.js radar (`h-80`) with a bottom legend that lists one entry per season, then dashed-season notes. `md:` is one of the breakpoints this project retires (31 uses `sm` and `lg` only).
- `PlayerStatisticsSection.jsx`: an `h2`, then one `flex flex-wrap` row with two `TabStrip`s (Phase: one tab per phase, and Mode: Per game / Accumulated, both `level={2}`, `w-fit`, neither `scrolling`), the "Top 10 in the league" chips, the "not ranked" notice, then groups of `StatRow`s. A row is `grid-cols-[1fr_auto]` below `sm` (name and value on the first line, bar and rank on a second line) and a four-column grid from `sm`; two columns of groups from `xl`. The label is `truncate`d and has a `HeaderTip` tooltip.
- Existing pieces to reuse: `TabStrip`'s `scrolling` prop, `ShortLabel`, `data-table-sticky` (the pinned first column), `findBrokenWords` in `e2e/support/layout.js`, the Chart.js options approach from 31j-i (`PlayerOverviewSection`'s radar fit its panel at 320px with the defaults; this radar needs checking because of its legend).

Targets: at 320px the page does not scroll sideways; the season table scrolls inside its own box with the season pinned and legible; every other panel holds its content inside its box; the two strips of the Statistics tab are each one row; stat rows keep their label, value, bar and rank readable.

## In scope

1. **Career summary.** The eight cards hold their content at 320px (two per row below `sm`, as today); the "Minutes" and "Points" figures with thousands separators do not wrap.
2. **Season table.** The table keeps scrolling inside its own panel (the page does not), with the season column pinned and narrow: below `sm` the "small sample" and "calculated" badges sit on a second line under the season instead of beside it (or are shortened), so the pinned column is about a season label wide and leaves room to see the next column. The panel is a focusable, labelled scroll region (`tabindex="0"`, `role="region"`, an `aria-label`) so a keyboard can scroll it. The "Career" footer row keeps working. From `sm` the table looks as today.
3. **Trends.** `md:grid-cols-3` becomes `sm:grid-cols-3` (the project's two breaks; 640 to 767px goes from two columns to three). Each trend card (figure, change, sparkline, first and last season) fits at 320px (two per row) and 640px (three per row) with no cut label ("Valuation (PIR)" and "True shooting %" wrap by whole words).
4. **Career highs.** `md:grid-cols-4` becomes `sm:grid-cols-2 lg:grid-cols-4` (or `sm:grid-cols-4` if a measurement shows four fit at 640px). A card's opponent line keeps the crest and the home/away icon and truncates the opponent name only after the room is used; the competition line wraps by whole words. Whether the card says the opponent's TV code below `sm` is decided by the measurement (the TV code only where the abbreviated name does not fit).
5. **Profile by season.** The "Compare the profile by season" button and its description wrap inside the panel; once it is opened, the radar and its legend (one entry per season, up to the archive's seasons) fit the panel at 320px with the labels readable and the legend wrapping onto lines; the notes under it wrap. Chart options only (label size, padding, legend layout); no new chart and no new request.
6. **Role table.** A pinned season column (`data-table-sticky`) and the table scrolling inside its own focusable, labelled region like the season table; the legend under it wraps. The "Started" and "Where the points came from" bars keep a fixed size.
7. **Teams timeline.** The row of season columns scrolls inside its own box; it is a focusable, labelled scroll region; a long club name wraps or truncates inside its `min-w-44` column; the clubs' crests keep their size.
8. **Statistics: strips.** The Phase strip is `scrolling` (one row; below `lg` it scrolls on its own and keeps the active tab centred), the Mode strip stays a plain strip of two tabs; the two strips stack on separate rows below `sm` (the `flex-wrap` row does that when they do not fit) and sit side by side from `sm` as today. The "Season statistics" heading, the chips and the notice wrap inside the panel.
9. **Statistics: rows.** A stat row at 320px shows its label, value, bar and rank without a cut-off word (the label may use two lines instead of `truncate` if a long one such as "Valuation (PIR)" or "Turnover ratio" is cut; the `HeaderTip` keeps working by tap and focus and stays inside the screen). The bar and the rank line under the name keep their widths. From `sm` the rows are as today (the four-column row), and `xl:` two columns stay.
10. **States.** Check, and fix only what clips: Season by season's loading, error and "No archived seasons found for this player." states; a player with one season (the table without a Career row, trends with single dots, highs with one season, the radar with one outline); a season with no statistics (the "Not drawn" note); Statistics' loading, error and "No season statistics in this phase..." states; a not-ranked player (the "Not ranked per game" notice and "too few games" rows); the ranks still loading ("League ranks are loading."); a phase with a long name.
11. **Browser check.** Two new Playwright specs (see Testing); no change to `responsive.spec.js` unless a tab needs adding there.

## Out of scope

- The other tabs: Overview (31j-i, done), Advanced (31j-iii), Shooting and Games (31j-iv), and the player data they share.
- What the tabs say: the panels, their order, the numbers, ranks, notes and copy are unchanged. No statistic is hidden on a phone, no new control, no phase select in place of the Phase strip.
- Any API, data, query or routing change (the career still fetches every season as today); the team and player name forms the feed gives; changes at `lg` and up beyond the `md` retirement above.
- Changing `TabStrip`, `Panel`, `PanelHeader`, `HeaderTip`, `RevealImage` or other shared components beyond opt-in props and a new `scrolling` use; `data-table-sticky` keeps its rule. Shared components used by other pages keep their look there (the memory note on scoping a change to the page being built).

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the narrow check after each, run the final gate once at the end, then present one review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Measure, then the summary, season table and trends.** Open both tabs at 320, 390 and 639px with a player who has several seasons (and the live data), take screenshots, and note what clips (write the findings under "Built as" at the end, correcting the assumptions above where they are wrong). Then scope items 1, 2 and 3. Start `frontend/e2e/player-career-layout.spec.js` with the summary, table and trends at 320, 390, 639, 640, 768, 1023 and 1024px. *Done when:* at 320px the summary cards, the season table (scrolling inside its panel, the season column pinned and narrow, keyboard-scrollable) and the nine trend cards hold their content, the page does not scroll sideways, trends are three per row from 640px, and the new spec passes at all widths.
- [x] 2. **Highs, profile, role and clubs.** Scope items 4, 5, 6 and 7. *Done when:* at 320px the career highs, the opened profile radar with its legend, the role table (scrolling inside its panel, season pinned) and the clubs timeline hold their content inside their panels, and the spec covers each at 320, 390, 639, 640 and 1024px.
- [x] 3. **Statistics.** Create `frontend/e2e/player-statistics-layout.spec.js` and do scope items 8 and 9. *Done when:* at 320px the Phase strip is one row with the active tab on screen, the two strips are on separate rows when they do not fit, every stat row shows its label, value, bar and rank without a cut word, from 640px the rows are the four-column grid, and the new spec passes at all widths.
- [x] 4. **States and final gate.** Scope item 10: the states mocked and checked at 320px in both specs. Then `cd frontend && npx playwright test player-career-layout.spec.js player-statistics-layout.spec.js player-overview-layout.spec.js responsive.spec.js detail-back-links.spec.js smoke.spec.js`, `cd frontend && npm run lint` and root `npm run build`. *Done when:* every state fits at 320px and all of these pass.

## Files / areas

- `frontend/src/players/PlayerCareerSection.jsx` (summary, season table, highs, role table, clubs timeline), `PlayerCareerCharts.jsx` (trends grid, radar and legend), `PlayerStatisticsSection.jsx` (strips, rows).
- `frontend/src/index.css`: only if a rule cannot be written as utilities (unlayered rules outrank utilities).
- `frontend/e2e/player-career-layout.spec.js` and `frontend/e2e/player-statistics-layout.spec.js` (new).
- `TabStrip.scrolling`, `ShortLabel`, `data-table-sticky` and `findBrokenWords` are reused, not changed.

## Data / contracts

None. Reads the existing queries: the seasons list, and per season `GET /api/seasons/:seasonCode/players/:personKey` (and `/registrations`, `/games`, `/advanced`), `season-stats` for the player and the league leaderboard. `NULL` or a missing value means unavailable: the cell shows "—", never zero.

## Testing

No unit test runner is configured. Browser tests are opt-in evidence (`cd frontend && npx playwright test <file>`; Playwright starts its own servers). Both specs load a page once per test and resize through 320, 390, 639, 640, 768, 1023 and 1024px, using the live data (`player-career-layout.spec.js` finds a current player who also has an earlier season by asking the API) and mocked responses for the states. They check: the season table scrolling inside its panel while the document does not, the season column pinned (its left edge fixed after the table scrolls) and narrower than half the panel at 320px, the scroll regions focusable and named, every panel's content inside its panel, trend cards per row (2 below 640px, 3 from 640px), the highs' columns per width, the radar canvas and its legend inside the panel after the button is pressed, the clubs timeline scrolling on its own, the Phase strip on one row with the selected tab visible and arrow keys moving between tabs, no cut-off word in the stat labels (`findBrokenWords`), the row grid (second line below 640px, four columns from 640px), the `HeaderTip` bubble inside the window after a tap, the document not wider than the window, and the states at 320px. A screenshot of each tab at 320px is looked at during steps 1 to 3. Nothing here proves how it looks in the user's browser; the final packet will say so.

Verify: no `Verify` command is declared in `AGENTS.md`, so none was run while writing this spec. The final gate is `cd frontend && npm run lint` plus root `npm run build`, with the Playwright files in step 4.

## Notes for the AI

- Follow the user's rules: scope changes to the page being built, shared components only get opt-in props, and the TV code is the short label wherever a full name does not fit (memory notes on page scope and TV codes).
- The two tabs are more than one panel of work each; if step 2 grows beyond a reviewable diff, stop and ask whether to split it rather than trimming scope.
- The user judges layouts by how they look: take screenshots at 320px as in 31j-i, and if an arrangement is a real design choice (the season table's pinned column, the career highs grid), say so and offer `/prototype` before building the final arrangement.
- Match the surrounding code style and comment density; no Co-Authored-By or AI attribution in the commit message (AGENTS.md).

## Built as

- Measured at 320px with a veteran player (screenshots of both tabs). The Statistics tab already fitted: its rows were built for a phone (name and value on the first line, bar and rank on a second line), no label was cut, and the page was 320px wide. Season by season was 346px wide once the profile radar was opened: the highs-and-profile grid was a one-column `grid` whose track sized itself to the radar canvas (the same trap as 31j-i), now `grid-cols-1 xl:grid-cols-2`.
- Season table: the "small sample" and "calculated" badges sit under the season below `sm` (a column of badges) and beside it from `sm`, so the pinned season column is about a season label wide; the table is a labelled, focusable region (`role="region"`, `tabIndex=0`). The role table is a labelled, focusable region with `data-table-sticky` (pinned season column), and the clubs timeline row is wrapped in a labelled, focusable region.
- Trends: `md:grid-cols-3` became `sm:grid-cols-3`. Career highs: `md:grid-cols-4` became `lg:grid-cols-4` (two per row below 1024px, four from 1024px), and the opponent is its TV code below `sm` through `ShortLabel` (`opponent.tvCode`, then the abbreviated name, then the name) because the names were cut ("FC Barcel...").
- The profile radar and its legend needed no chart change; the legend wraps onto two lines at 320px.
- Statistics: the Phase strip is `scrolling`. The rows and the tooltip needed no change.
- One fix beyond layout, found by the error-state test: the Season by season error state could never show. A failed history leaves nothing to derive from, and the loading check ran first and waited forever. The error check now comes first in `PlayerCareerSection`.
- Changed at the user's request after seeing the first version (scope items 2, 4, 6, 8 and the trends in 3 revised): (a) the season table's panel had padding inside its scrolling box, so scrolled cells showed in a sliver beside the pinned season column (the same bug the Team page had); the padding is gone, and the spec checks that the point just inside the panel's left edge belongs to the season cell after scrolling; (b) the season and role tables are compact on a phone (daisyUI `table-sm`, shorter role bars: `w-14` start bar, `w-28` points bar); (c) the career highs have eight cards, adding "Free throws made", so the last row is not a lone card at two or four per row; (d) the trends have twelve cards, adding Steals, Blocks and 3-point %, so the last row is full at two and at three per row; (e) the Statistics "Top 10 in the league" chips are smaller below `sm` and take two lines instead of five.
- Changed again at the user's request: the role table has no bars. "Started" is the numbers only (for example 23/34), and "Where the points came from" is three percentage columns ("Pts from 2s", "Pts from 3s", "Pts from FT") in place of the stacked bar and its legend, so scope item 6's bars and legend no longer exist.
- No mockup was needed; the spec's two design questions (the season table's pinned column and badges, the highs grid) were confirmed from screenshots.
- New `e2e/support/player.js` (`veteranPlayer`: a current-season player who also played in the earliest season) is shared by the two new specs.
- Checks run (after the changes above): `player-career-layout.spec.js` (3 passed), `player-statistics-layout.spec.js` (2 passed), and with `player-overview-layout.spec.js`, `responsive.spec.js`, `detail-back-links.spec.js` and `smoke.spec.js` 129 passed in all (one load timeout in the 320px Overview overflow check passed on rerun), `cd frontend && npm run lint`, root `npm run build`. The two state tests wait out the app's request retries, so they take about a minute each.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":17441,"specSha256":"e0f955e0bf50451bc294fb5e01fafc072d404d1ee7ba0e45f7d06989d130f318","branch":"refs/heads/feature/player-season-by-season-and-statistics-mobile-layout","head":"abe2b0d8b5213978bf80d3aa2e4184bf717c65db","baseRef":"refs/heads/master","baseCommit":"abe2b0d8b5213978bf80d3aa2e4184bf717c65db","sourceTree":"62b63ff9d3786b6913b94304b17bd28b625962be","absentOptional":[]} -->
