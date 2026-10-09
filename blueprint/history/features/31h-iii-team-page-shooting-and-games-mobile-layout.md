# Feature: Team page Shooting and Games mobile layout

**From build-plan:** feature 31h-iii
**Build attempt:** 1
**Branch:** feature/team-page-shooting-and-games-mobile-layout
**Status:** verified

## Goal

Make the team page's **Shooting** and **Games** tabs (`/:season/teams/:clubCode`, `frontend/src/teams/TeamShootingSection.jsx` and `TeamGamesSection.jsx`) work from 320px up: no sideways page scroll, nothing clipped or squeezed, and the Shooting tab's controls not a wall above the court. Layout and label only: no API, data or feature change. Mobile is below 640px (unprefixed styles), tablet is `sm` (640px), desktop is `lg` (1024px); `xl` stays. Third of four parts of 31h (31h-i and 31h-ii are done; Advanced, 31h-iv, follows).

Measured at 320px with live data (Partizan):

- **Games: the page is 389px wide.** The Next games and Latest results panels sit in a `lg:grid-cols-2` grid with no `minmax(0, 1fr)` column, so a row's content (crest, name, the "Next" badge, the date) sets the column's width and the panels grow to 357px in a 296px page (the same cause fixed for the Overview in 31h-i). The margin strip's header squeezes its title to two short lines beside two badges.
- **Shooting: the page is 362px wide.** The "3 games mapped · 192 attempts plotted" badge, the court's container and its legend stick out; the title ("Where Partizan shoots") is squeezed into a column about 60px wide beside the badge, and the Zones title the same beside the Hottest/Coldest badges. The controls are three tab strips and a select stacked above the cards (about 230px).
- The metric cards (two by two), the Zone and Style tables (name on its own line above the bar and numbers on a phone) already fit.

## In scope

1. **Games: columns.** The two-panel grid is `grid-cols-[minmax(0,1fr)] lg:grid-cols-2`, so below `lg` the panels are as wide as the page and rows truncate their text instead of widening the panel.
2. **Games: the margin strip.** The "How the games went" header's badges (the record and the average margin) go under the title below `sm` and stay as `trailing` from `sm` (the same badges rendered once per slot, the hidden one `display: none`, as the league profile did in 31h-i). The strip itself (one bar per game, scrolling inside its own box) is checked at 320px with few games (3) and many (a full season, 38) and with long and short margins; it opens on the latest games as today.
3. **Games: rows.** A row's opponent is the club's TV code below `sm` and the abbreviated name from `sm` (`ShortLabel`), so the name is never cut to "Real Mad..." beside the date; the "Next" badge, date and time, the score and the W/L badge keep their sizes and never push the name out. The "Show all N" button, the Results filter strip (All, Wins, Losses) and the empty texts ("No games left to play.", "No games played yet.", "No games match this filter.", "No games scheduled yet.") fit at 320px.
4. **Shooting: header.** The "N games mapped · M attempts plotted" badge goes under the title below `sm` (title wraps across the panel's width) and stays `trailing` from `sm`. In the Zones panel the Hottest and Coldest badges do the same through an opt-in prop on the shared `ShootingBreakdown` (default today's), because the Player page's Shooting tab (31j) uses the same component.
5. **Shooting: controls.** Below `sm` the "Whose shots" and "Presentation" strips stay visible (each fits one row); the "Result" strip (only on "Every attempt") and the "Game segment" select move behind the `FilterDisclosure` button from 31f-v ("Filters" or "Filters · N active", N counting the result and the segment when they are not their defaults), content always visible from `sm` as today. Closing the button never resets a filter, and the label and options of each control are unchanged.
6. **Shooting: court and tables.** The court fits its container at 320px: its panel padding is smaller below `sm`, the heatmap's chips show only the percentage when the court is drawn narrow (the existing `ShootingCourt` `compactBelow` prop, as the game Shooting tab does), the legend wraps inside the container. The zone and style tables, the four cards, the footnotes and the empty states ("No played games yet this phase to map shot locations from.", "No attempts match these filters.", "No located attempts.", "No made shots in this selection.") fit at 320px; loading ("Aggregating N shooting charts") and the error with its Retry fit.
7. **Browser check.** A new Playwright spec (see Testing).

## Out of scope

- The Advanced tab (31h-iv) and the Overview, Statistics and Roster (done); the Player page's Shooting tab (31j), which only gets the opt-in prop's default.
- What the tabs say: the margin strip's bars and caption, the games' order and counts, the shot figures, the zones, the situations, their order, tips and copy are unchanged. No hidden data on phones.
- Any API, data, query or routing change; TV code at desktop widths.
- Shared components: `ShootingBreakdown`, `ShootingCourt`, `PanelHeader`, `FilterDisclosure` and `TabStrip` keep today's behaviour by default (opt-in props only).

## Build loop

`workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`: build the steps in order, run the narrow check after each, run the final gate once, then present one review packet. `/complete` makes the single work commit.

## Build steps

- [x] **1. Games tab.** The `minmax(0,1fr)` grid, the margin strip's badges under the title below `sm`, the `ShortLabel` opponent in `GameRow` and in the strip's accessible text unchanged; start `frontend/e2e/team-shooting-games-layout.spec.js` with the Games tab at 320, 390, 639, 640, 768, 1023 and 1024px (live data plus mocked game lists: 3 games, 38 games, none played, none upcoming, an empty season) and its error state. **Done when:** at 320px the page does not scroll sideways, both panels are as wide as the page, no row's text is cut mid-word (the opponent shows a TV code), the badges are under the strip's title below 640px and beside it from 640px, the strip scrolls inside its own box with 38 games, and the spec passes.
- [x] **2. Shooting header and controls.** The mapped-games badge and the Zones badges under their titles below `sm` (the Zones one through an opt-in prop on `ShootingBreakdown`), the Result strip and the Game segment select behind `FilterDisclosure`, keeping "Whose shots" and "Presentation" visible. **Done when:** at 320px the titles have the panel's whole width, the controls take about one third of their former height with the disclosure closed, the button's count is right for each combination, filtering still changes the numbers and the court, and from 640px the layout is as before (the controls in a wrapping row, no button); the spec covers each.
- [x] **3. Shooting court, tables and states.** The court's container padding, `compactBelow` on the court, the legend wrapping, any remaining overflow found by measuring, the states of the tab. **Done when:** at 320px the page does not scroll sideways on the Shooting tab, nothing inside the court's panel or the two table panels sticks out of it, the heatmap's chips are readable (percentage only), the loading, error, empty and no-match states fit, `lint`, `build`, this spec, `team-statistics-roster-layout.spec.js`, `team-overview-layout.spec.js`, `game-shooting-layout.spec.js` and the Team page entries of `responsive.spec.js` pass.

## Files / areas

- `frontend/src/teams/TeamShootingSection.jsx`, `TeamGamesSection.jsx`; `frontend/src/lib/ShootingBreakdown.jsx` (opt-in prop for the Zones panel's header, and the court's padding class through a prop) with `PanelHeader` reused.
- `frontend/src/games/FilterDisclosure.jsx`, `lib/ShortLabel.jsx`, `games/gameUtils.js` (`teamCode`), `lib/ShootingCourt.jsx` (`compactBelow`) are reused, not changed.
- `frontend/e2e/team-shooting-games-layout.spec.js` (new).

## Data / contracts

No API or data change. Labels use fields the responses carry: `tvCode` on a game's `localTeam`/`roadTeam` (`teamCode` falls back to the abbreviated name, the club code, "TBD"); each full name stays in the page for screen readers (`ShortLabel`) and each game row keeps its link. The shot data comes from the same per-game shot charts (`useSeasonShots`); the spec mocks them rather than waiting for a season's worth of live fetches.

## Testing

`npm run lint`, `npm run build` (no unit test command exists). Browser tests: `cd frontend && npm run test:browser`; the new spec and the Team and Game Shooting specs alone first, then the whole suite once (known load-flaky specs pass alone).

`team-shooting-games-layout.spec.js` (patterns from `team-statistics-roster-layout.spec.js` and `game-shooting-layout.spec.js`): read the live season and a team from the API, mock the games list (`page.route`; the later registration wins) and, for Shooting, the per-game shot charts with a handful of located attempts, load once and resize through 320, 390, 639, 640, 768, 1023 and 1024px. Checks: `documentElement.scrollWidth <= clientWidth`; panel widths against the page; nothing inside a panel outside it; the badges' place by width; row labels by width; the strip's scroll box; the controls' visibility by width, the disclosure's label and count, a filter changing the figures; the court's chips below and from 640px; every state at 320px.

## Notes for the AI

- Work only on these two tabs; shared pieces get opt-in props with today's default. Do not start a dev server (Playwright starts its own when none runs).
- Measure first (steps 1 and 3): the numbers above are Partizan at 320px; what makes the court's container overflow is not yet known, so step 3 starts by finding it.
- Reuse what exists: `FilterDisclosure` (31f-v), the badge pair from `TeamLeagueProfile` (31h-i), `ShortLabel`, `compactBelow`, the helpers' patterns in the other team specs.
- Review choices: the opponent in Games rows is the TV code below `sm` (alternative: the abbreviated name, which "Panathinaikos" or "Crvena Zvezda" would truncate); "Whose shots" and "Presentation" stay visible and only "Result" and "Game segment" are behind the disclosure (alternative: all four behind it).
- TV code on game and match cards at desktop widths is a separate, still-open product point.

## Notes

- Games, as built: the `minmax(0, 1fr)` grid, the strip's badges under the title below `sm`, the opponent as a `ShortLabel` (TV code below `sm`). Measuring showed the 389px page came from the next-game row, not the grid alone: the "Next" badge plus the date squeezed the opponent to 7px. The "Next" badge now sits after the round line below `sm` (`stat-badge` sets its own display, so a wrapper is what is hidden), and the result's score takes its natural width below `sm` (`w-16` from `sm`), which gave the opponent the last two pixels. The grid fix alone is not what the spec fails without (the long-names case passes either way); it stays as a cheap guard.
- Shooting, as built: the mapped-games badge and the Zones badges under their titles below `sm` (the Zones one through `ZonesPanel`'s new `stackBadges` and `ShootingBreakdown`'s new `phoneLayout`, both default off, set only by the team tab; the Player tab is untouched), the Result strip and Game segment behind `FilterDisclosure` (new optional `className` prop with today's default `mb-4`; from `sm` the wrapper and grid are `contents`, so the controls sit in the old row). The court's overflow came from the breakdown grid's single column having no `minmax(0, 1fr)`; with `phoneLayout` it has one, the court panel is `p-2` below `sm`, and `compactBelow` is 420 (chips show the percentage alone when the court is drawn under 420px wide, which is a phone up to about 440px, not up to 640px).
- The spec fails at 320px for both Shooting layout tests when the team tab stops passing `phoneLayout`.
- In the whole-suite run one `back-link-scroll.spec.js` case (the 1280px game) failed under load; the file passes alone (32 of 32 over four repeats).
- Revision asked for at review (three screenshots): (1) the "N games mapped · M attempts plotted" badge is gone from the team Shooting tab at every width (the attempts are in the cards); the earlier under-the-title copy of it went with it. (2) The Zones note keeps only "Hottest and coldest only count zones with a fair number of attempts." (3) The Style table: the "Half court" row is left out (it was every basket not marked fast break, second chance or off a turnover, which reads like shots from the half-court line), the second figure is headed "Baskets" instead of "Made", and the note says what Of pts, Baskets and Points are. The column headings are drawn below `sm` too (a second line under the table's first column; they were hidden there, which is why 13 and 27 could not be read), for the Zones table as well ("Share", "Made", "FG%"). All of it is opt-in on the shared `ShootingBreakdown` (`plainWording`, with `phoneLayout` now also meaning the headings and an adaptive grid), set only by the team tab; the Player tab keeps today's wording.
- Found while checking the Style table at 1280px: from `xl` the breakdown's right-hand column is only about 420px wide, and the tables' fixed columns (11.5rem name, 3rem, 4.5rem, 3.5rem and the gaps) need about 410px of a 388px content width, so the last column ("Points", its numbers) was cut (this was already so before this item). With `phoneLayout` the name and bar columns now give way (`minmax(0, 11.5rem)` and `minmax(2rem, 1fr)`); the spec checks both tables at 1280 and 1440px.
- The full suite failed three load-dependent cases (`leaders.spec.js` and two menu cases), the known ones.
- Second revision asked for at review (the Style table screenshot): the Style note is now only "A basket can be in more than one situation (a fast break off a turnover counts in both)."; the first column has no heading in the Zones and Style tables (a zone and a situation name themselves), so on a phone the headings are one row over their columns (it was two rows, "SITUATION" over "OF PTS"); the Style percentage is now each situation's baskets as a share of all the attempts shown (13 of 192 is 7%, as in the Field goals card), headed "Of att.", instead of the share of the points. This reading of "percentage of total attempts" is mine: attempts are the denominator, baskets the numerator; if the share of points was wanted back, it is the one line in `SituationsPanel`. The Games strip's note is "Oldest on the left. Click a bar to open the game." (the green/red and house/plane explanations are gone from it; the bars keep their accessible names).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":14566,"specSha256":"44ed4d32eb447a6dca0b31c1f1fa2c9ae584f560bd57c9901144b36b8aacdfdc","branch":"refs/heads/feature/team-page-shooting-and-games-mobile-layout","head":"371a7c865562ab14fcb1866b53d92688b514e532","baseRef":"refs/heads/master","baseCommit":"371a7c865562ab14fcb1866b53d92688b514e532","sourceTree":"29755b9544a1a6d2a186c3c5271e742b8f5d07fb","absentOptional":[]} -->
