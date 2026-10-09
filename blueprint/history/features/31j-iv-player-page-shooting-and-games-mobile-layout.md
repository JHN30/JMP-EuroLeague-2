# Feature: Player page Shooting and Games mobile layout

**From build-plan:** feature 31j-iv
**Build attempt:** 1
**Branch:** feature/player-page-shooting-and-games-mobile-layout
**Status:** verified

## Goal

Make the Player page's **Shooting** and **Games** tabs (`/:season/players/:personKey`, `frontend/src/players/PlayerShootingSection.jsx` and `PlayerGamesSection.jsx`) work from 320px up: no sideways page scroll, nothing clipped or squeezed, the Shooting tab's controls not a wall above the court, and the game table's pinned column narrow enough to leave room for the numbers. Layout and label only: no API, data or feature change. Mobile is below 640px (unprefixed styles), tablet is `sm` (640px), desktop is `lg` (1024px); `xl` stays. Last of four parts of 31j (31j-i, 31j-ii and 31j-iii are done); it closes the Player page.

Both tabs copy a team tab that 31h-iii already made mobile-friendly (`TeamShootingSection.jsx`, `TeamGamesSection.jsx`), so most of the pieces exist: `FilterDisclosure`, `ShortLabel`, `ShootingBreakdown`'s opt-in `phoneLayout` and `plainWording`, `TabStrip`'s `scrolling`. Nothing has been measured yet (no dev server is started while specifying). What reading the code predicts, to be confirmed first in each step:

- **Games, "How each game went":** the panel header's two badges ("Team 20-10", "14.2 PTS a game") sit beside the title in a `trailing` slot and squeeze it; the "Stat to chart" strip has five tabs in a `w-fit` strip.
- **Games, splits:** a `grid-cols-2` grid with no `minmax(0, 1fr)`, and each card holds a four-column stat row of `text-lg` numbers in about 118px, so the numbers will overlap or widen the page.
- **Games, "Every game":** a 13-column table whose pinned first column carries a home/away icon, a crest and a name up to 112px wide (about 190px with padding on a 296px panel); the filter strip (five tabs), the "Sort by" select and the "N games" count wrap loosely; the "Phase" strip is `w-fit` with a long tab list.
- **Shooting:** the "N games mapped · M attempts plotted" badge beside the title, four controls in a wrapping row above the court, and `ShootingBreakdown` without `phoneLayout`, which is what overflowed the team tab by 362px (a one-column grid with no `minmax(0, 1fr)`).

## In scope

1. **Games: Phase and "Stat to chart" strips.** Both stay one row. The Phase strip (only shown with two or more phases; "All games" plus each phase by name) and the "Stat to chart" strip (PTS, REB, AST, PIR, MIN) use `scrolling` where they are wider than the screen, with the selected tab on screen, as the Statistics tab does (31j-ii).
2. **Games: "How each game went" header.** The two badges go under the title below `sm` and stay `trailing` from `sm` (the same pair rendered once per slot, the hidden one `display: none`, as the team Games tab does). The bar chart still scrolls inside its own box and opens on the latest games, with few games (3) and many (a full season, 38 to 60), and with the dashed average line and its "average N" label inside the box. The caption fits.
3. **Games: splits.** One column below `sm` and two columns from `sm` to `xl` (four from `xl` as today), with `minmax(0, 1fr)` columns so the content never sets the width. Each card's four stats (PTS, REB, AST, PIR) with their difference lines stay on one row, whole, at 320px. The empty split ("No games.") fits.
4. **Games: "Every game" table.** Scrolls inside its own panel (a keyboard can reach it: region, label, `tabIndex={0}`), the page does not. Below `sm`: `table-sm`; the pinned Opponent column is narrow: the home/away icon, no crest, the opponent as its TV code (`ShortLabel`, the abbreviated name from `sm`) after "vs" or "@", and a one-line date under it; the full round and phase text stays in the link's `title` and in the page for screen readers. The pinned column's width is under 40% of the panel at 320px, scrolled cells never show beside it (no padding on the scroll box, as the season table in 31j-ii), and the Result cell keeps the W/L badge and score on one line. From `sm` the table is as today. The bars in the PTS and PIR cells keep their `min-width: 5.5rem` from `sm`; below `sm` they are dropped to save the width, leaving the numbers (as the Role table did in 31j-ii), and the footnote then names only what is drawn.
5. **Games: controls and states.** The filter strip (All, Wins, Losses, Home, Away) scrolls in one row; the "Sort by" select and the "N games" count sit on one line under it below `sm` and in the old row from `sm`. The "Show all N" / "Show fewer" button, "No games match this filter.", "No game log available yet.", the loading ("Loading the game log") and error ("Could not load the game log." with Retry) states fit at 320px.
6. **Shooting: header.** The "N games mapped · M attempts plotted" badge is removed at every width, as on the team tab (the attempts are in the cards). Asked for at review.
7. **Shooting: controls.** Below `sm` the "Presentation" strip stays visible; the "Result" strip (only on "Every attempt") and the "Game segment" select move behind `FilterDisclosure` ("Filters" or "Filters · N active", N counting the segment and the result when not at their defaults), always visible from `sm` as today; closing the button never resets a filter. (The team tab's "Whose shots" strip has no Player counterpart.)
8. **Shooting: court, tables and states.** `phoneLayout` on the `ShootingBreakdown` (the one-column `minmax(0, 1fr)` grid, the smaller court padding, `compactBelow` 420, the Zones badges under their title, the adaptive tables with their headings drawn on phones). The cards, the Zones and Style tables (also at 1280 and 1440px, where the right-hand column is tightest), the footnotes, and the states ("No played games yet this phase to map shot locations from.", "Aggregating N shooting charts", "Could not load this player's shot locations." with Retry, the empty selection texts the court and tables already show) fit at 320px.
9. **Shooting: wording (review choice).** `plainWording` on the same `ShootingBreakdown`, so both Shooting tabs read the same: the "Half court" row left out, "Baskets" for "Made", the Style share as a share of all attempts ("Of att."), the shortened notes. It changes desktop wording on this tab as well, which 31h-iii's revisions asked for on the team tab; say at review if the Player tab should keep today's wording (drop the one prop).
10. **Browser check.** A new Playwright spec (see Testing).

## Out of scope

- The Overview, Season by season, Statistics and Advanced tabs (done) and the header (done).
- What the tabs say apart from items 6 and 9: the game log's order, counts, figures, highs, splits, zones, situations, their tips and copy; no hidden data on phones other than the bars in item 4 (the numbers stay).
- Any API, data, query or routing change; the opponent as TV code at desktop widths (a separate, still-open product point).
- Shared components: `ShootingBreakdown`, `ShootingCourt`, `PanelHeader`, `FilterDisclosure`, `TabStrip`, `ShortLabel`, `StatBarCell` keep today's behaviour by default (opt-in props only); the team tabs are untouched.
- The `hero keeps a long surname whole` flake in `player-overview-layout.spec.js` (a separate `/fix`).

## Build loop

`workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`: build the steps in order, run the narrow check after each, run the final gate once, then present one review packet. `/complete` makes the single work commit.

## Build steps

- [x] **1. Games tab.** Measure at 320px first (a player with a full log; the spec's mocks for few games and many). Then items 1 to 5: the scrolling strips, the stacked badges, the one-column splits, the compact table with its narrow pinned Opponent column, the filter row, the states. Start `frontend/e2e/player-shooting-games-layout.spec.js` with the Games tab at 320, 390, 639, 640, 768, 1023 and 1024px. **Done when:** at 320px the page does not scroll sideways, no panel is wider than the page, no number or label is cut or overlaps (the splits' four stats are whole), the table scrolls in its own region with the Opponent column pinned and under 40% of the panel and no scrolled cell showing beside it, the opponent shows a TV code below 640px and the abbreviated name from 640px, the badges are under the chart's title below 640px and beside it from 640px, the strips are one row each with the selected tab on screen, the states fit, and the spec passes.
- [x] **2. Shooting tab.** Measure at 320px first. Then items 6 to 9: the badge under the title, the Result strip and Game segment behind `FilterDisclosure` with a correct count, `phoneLayout` and `plainWording` on the breakdown, the states. Add the Shooting tests to the spec (the shot charts mocked with located attempts carrying the player's `personCode`, as the team spec mocks theirs). **Done when:** at 320px the page does not scroll sideways on the Shooting tab, the title has the panel's whole width, the controls take about a third of their former height with the disclosure closed, the disclosure's count is right for each combination, filtering still changes the numbers and the court, from 640px the controls are in a wrapping row with no button, nothing inside the court's panel or the two table panels sticks out (at 1280 and 1440px too), the heatmap's chips show the percentage alone on a narrow court, and every state fits; the spec passes.
- [x] **3. Final gate.** Whole-suite run and the entries of related specs. **Done when:** `cd frontend && npm run lint`, root `npm run build`, this spec, `player-overview-layout.spec.js`, `player-career-layout.spec.js`, `player-statistics-layout.spec.js`, `player-advanced-layout.spec.js`, `team-shooting-games-layout.spec.js`, `game-shooting-layout.spec.js` and the Player page entries of `responsive.spec.js` pass (known load-flaky specs pass alone), and screenshots of both tabs at 320, 390 and 768px have been looked at.

## Files / areas

- `frontend/src/players/PlayerGamesSection.jsx` (strips, header badges, splits grid and cards, `GameTable` and its row, controls row), `frontend/src/players/PlayerShootingSection.jsx` (badge, `FilterDisclosure`, `phoneLayout`, `plainWording`).
- Reused, not changed: `lib/ShootingBreakdown.jsx`, `lib/ShootingCourt.jsx`, `lib/PanelHeader.jsx`, `lib/TabStrip.jsx`, `lib/ShortLabel.jsx`, `lib/LabelledSelect.jsx`, `games/FilterDisclosure.jsx`, `players/gameLog.js`, the `data-table-sticky` class. If `LabelledSelect` or `StatBarCell` need a phone variant, it is an opt-in prop with today's default.
- `frontend/e2e/player-shooting-games-layout.spec.js` (new), with `e2e/support/player.js` (`veteranPlayer`) and the shot-chart mock patterns from `team-shooting-games-layout.spec.js`.

## Data / contracts

No API or data change. Labels use fields the responses carry: `tvCode` on a game's `localTeam` / `roadTeam` (to be confirmed against the player game-log response in step 1; the fallback is the abbreviated name, then the club code, then "TBD", as `teamCode` does elsewhere); each full name stays in the page for screen readers (`ShortLabel`) and each game row keeps its link. The shot data comes from the same per-game shot charts (`useSeasonShots`), the player's attempts picked out by `personCode`; the spec mocks them rather than waiting for a season's worth of live fetches.

## Testing

`npm run lint`, `npm run build` (no unit test command exists; there is no declared Verify command, so these are the fallback gate). Browser tests: `cd frontend && npm run test:browser`; the new spec and the related specs alone first, then the whole suite once.

`player-shooting-games-layout.spec.js` (patterns from `team-shooting-games-layout.spec.js` and `player-career-layout.spec.js`): a live veteran player; the game log mocked where a case needs a shape (3 games, 40 games, several phases, none played, a failing request) and the shot charts mocked for Shooting; load once and resize through 320, 390, 639, 640, 768, 1023 and 1024px (1280 and 1440 for the breakdown tables). Checks: `documentElement.scrollWidth <= clientWidth`; panels against the page; nothing inside a panel outside it (skipping what scrolls on its own); the badges' place by width; the strips' rows and selected tab; the splits' columns by width and their stats whole; the table's region, pinned column (width, no leak), opponent label by width; the Shooting controls' visibility by width, the disclosure label and count, a filter changing the figures; the court's chips below and from 640px; every state at 320px.

## Notes for the AI

- Work only on these two tabs; shared pieces get opt-in props with today's default. Do not start a dev server (Playwright starts its own when none runs).
- Measure first in each step; the predictions above are from reading the code. Known traps from earlier items: a one-column grid without `grid-cols-1` or `minmax(0, 1fr)` is sized by wide content; a scroll box with padding shows scrolled cells beside a sticky pinned column; `findBrokenWords`-style checks give false positives on sr-only text and fractional widths; holdsContent helpers must skip truncated nodes, scroll regions and tablists.
- Reuse what exists: the badge pair from the team Games tab, `FilterDisclosure` and `phoneLayout` as `TeamShootingSection` uses them, the pinned-column region from the season table (31j-ii), `scrolling` strips.
- Review choices: `plainWording` (item 9) and dropping the bars below `sm` (item 4); the mapped-games badge was removed at review (item 6).

## Notes

- Games, as built: the Phase, "Stat to chart" and "Games to show" strips scroll (`scrolling`); the chart's badges sit under its title below `sm`; the splits are one column below `sm`, two from `sm`, four from `xl`; the table is a labelled, focusable region with `table-sm`, no crest, the opponent as `ShortLabel` (the TV code below `sm`), the date alone under it (round and phase stay for screen readers), and 8px side padding on the pinned column, which is 94px of 262px at 320px. Dropping the bars below `sm` is a new opt-in prop on the shared `StatBarCell` (`numbersOnPhone`, default off, with a phone rule in `index.css`); the footnote's bar sentence hides with them.
- Shooting, as built: no mapped-games badge, the Result strip and Game segment behind `FilterDisclosure` with the same count as the team tab, and `phoneLayout` plus `plainWording` on the breakdown (the two review choices from items 6 and 9, both applied).
- The spec's mocks build the game log from one of the player's real games; the first test's "pinned column under 40%" and the leak check pass only with the narrow cell. Against the old components five of the six tests fail (the states test for Games passes, those states already fitted).
- Checks run: `npm run lint`, root `npm run build`, and Playwright on this spec, `player-overview-layout`, `player-career-layout`, `player-statistics-layout`, `player-advanced-layout`, `team-shooting-games-layout`, `game-shooting-layout` and `responsive`: 150 passed. Screenshots of both tabs at 320, 390 and 768px were taken; 320 and 768 were looked at, 390 was not.
- Revision asked for at review (two screenshots): (1) the mapped-games badge is gone from the Player Shooting tab at every width. (2) On the Games table the PTS and PIR numbers painted over the pinned Opponent column when scrolled: `.stat-bar-cell .num-val` has `z-index: 1`, the same as the sticky first column, and the later cell won. `.stat-bar-cell` now has `isolation: isolate`, so a cell's bar and number stack inside the cell only; this is a shared rule, so every table with bar cells gets the same fix and nothing else changes. The spec now samples points across the pinned cell at five scroll positions (it fails without the rule).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":15749,"specSha256":"2a726d7954f2c3153656fbfcc6a0d56ead2305da3eaa393d92c5e8703e552fef","branch":"refs/heads/feature/player-page-shooting-and-games-mobile-layout","head":"ab58af6da71856b612d3965387699c7d6eb87dc4","baseRef":"refs/heads/master","baseCommit":"ab58af6da71856b612d3965387699c7d6eb87dc4","sourceTree":"7ad2839c613cc40ad43912122b01b0939611d75a","absentOptional":[]} -->
