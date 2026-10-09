# Feature: Team page Advanced mobile layout

**From build-plan:** feature 31h-iv
**Build attempt:** 1
**Branch:** feature/team-page-advanced-mobile-layout
**Status:** verified

## Goal

Make the team page's **Advanced** tab (`/:season/teams/:clubCode`, `frontend/src/teams/TeamAdvancedSection.jsx` and `RatingsChart.jsx`) comfortable from 320px up: no sideways page scroll, nothing clipped or squeezed, and the tab not a very long scroll of loosely wrapped pieces. Layout and label only: no API, data or feature change. Mobile is below 640px (unprefixed styles), tablet is `sm` (640px), desktop is `lg` (1024px); `xl` stays. Last of the four parts of 31h (31h-i, 31h-ii and 31h-iii are done).

The tab has a scope strip (Regular season, All games), then five blocks: **Ratings** (a Chart.js line chart of offensive and defensive rating by round, with a "Net ... after R..." badge), **Splits** (four cards: Home, Away, Last 5, Last 10), **Play by play** ("How games unfold": time leading, tied and trailing, clutch points, eight facts), **Best lineups** (a size strip, a minimum-possessions select and up to ten lineup rows) and a pointer to the Shooting tab. The shot zones are on the Shooting tab (31h-iii), not here.

Measured at 320px with live data (Partizan, 2025 season, 38 rounds), and with the 2026 season's first four rounds:

- **The page is 326px wide** for a full season: in a lineup row the five faces take about 190px and the "Best net rating" badge beside them does not wrap, so it sticks out 6px.
- **Ratings:** the title ("Offense and defense through the season") is squeezed into a narrow column by the "Net -6.7 after R38" badge; with 38 rounds the chart's 4px point dots run together into a thick band, and its legend takes about 60px of the 288px height.
- **Splits:** four full-width cards stacked, each about 245px: 1,054px of scrolling for four small blocks.
- **Play by play:** the eight facts are a loosely wrapping flex row (two or three per line, uneven), under two bars that already fit.
- **Lineups:** the size strip and the select wrap acceptably; the empty message ("No 5-man lineup has reached ...") fits.

## In scope

1. **Ratings.** The "Net ... after R..." badge goes under the title below `sm` and stays `trailing` from `sm` (the same badge rendered once per slot, the hidden one `display: none`, as in 31h-i and 31h-iii). In `RatingsChart`: the point dots shrink with the number of rounds (4px up to 12 rounds, 2px up to 25, none beyond, with the line a little thinner), the legend's padding is smaller, and below `sm` the chart is a little shorter (`h-60`, from `sm` `h-72` as today); the net-rating tooltip footer, colours, fill and the accessible label are unchanged. The tick labels stay readable (Chart.js skips labels itself) and the chart never widens the page.
2. **Splits.** Below `sm` the four cards are a two-by-two grid (compact: `p-3`, the record `text-2xl`, the net rating `text-base`, the figures in two columns), so the block is about 330px tall instead of 1,054px; from `sm` as today (two columns, four from `xl`). Nothing in a card is cut at 320px, including a one-game split ("1 game"), a split with no games (the em dash) and a long run of decimals.
3. **Play by play.** The eight facts are a two-column grid below `sm` (a tidy four by two) and the flex row they are from `sm`. The two bars and their captions keep their text and fit at 320px, with and without clutch minutes ("No clutch minutes yet.") and with no timed games (the em dash).
4. **Lineups.** In a lineup row the faces and the badges can wrap: the badges go under the faces below `sm` instead of beside them, so the row never widens the page; the names line, the net-rating line and the stat line (ORtg, DRtg, possessions, minutes, games) wrap inside the row. The size strip and the select stay as they are unless measuring shows a clip. The fallback badge ("No 5-man lineup has reached 100 possessions yet, so this shows 50+") and the footnote fit.
5. **The rest.** The scope strip (one row), the Shooting pointer panel (text then the button; the button on its own line when the text is long), the loading, error ("Could not load advanced team stats.", "Could not load lineups.") and empty ("Advanced stats are not available yet for this club.", "Not enough rounds played yet to chart the ratings.") states fit at 320px.
6. **Browser check.** A new Playwright spec (see Testing).

## Out of scope

- The other tabs and the page header (done in 31h-i to 31h-iii); the Player page's tabs (31j).
- What the tab says: the figures, their order, the copy of the captions and footnotes, the lineups' ordering, the size and minimum-possessions choices and their defaults. No data hidden on phones, no new controls.
- Any API, data, query or routing change; TV code at desktop widths.
- Shared components: `Panel`, `PanelHeader`, `TabStrip` keep today's behaviour. `RatingsChart` is used only by this tab, so its own changes need no opt-in.

## Build loop

`workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`: build the steps in order, run the narrow check after each, run the final gate once, then present one review packet. `/complete` makes the single work commit.

## Build steps

- [x] **1. Ratings.** The badge under the title below `sm`, the chart's dots, legend and height; start `frontend/e2e/team-advanced-layout.spec.js` with the Ratings block at 320, 390, 639, 640, 768, 1023 and 1024px (the advanced and lineups answers mocked with the real shapes: a 38-round season, a 4-round one, one with fewer than two rounds). **Done when:** at 320px the badge is under the title and the title has the panel's width, the chart's canvas is as wide as its box and not taller than 240px, with 38 rounds no dot is drawn larger than 2px, the page does not scroll sideways at any width, and the spec passes.
- [x] **2. Splits and Play by play.** The two-by-two splits grid and the two-column facts grid below `sm`. **Done when:** at 320px the four cards are two rows of two, each card's content is inside it, the splits block is under 450px tall, the eight facts are four rows of two, from 640px the splits are two columns and the facts a flex row as before, a card with no games and one with a single game fit, and the spec covers each width.
- [x] **3. Lineups, the pointer and the states.** The lineup row's badges under the faces below `sm`, the rest of the lineup block, the pointer, the states listed in scope item 5. **Done when:** at 320px with a full season of lineups the page does not scroll sideways (it was 326px wide), every lineup row holds its content, the three size tabs and the minimum select work and change the rows, the fallback badge, the empty message, the loading and error states fit, and `lint`, `build`, this spec, `team-shooting-games-layout.spec.js`, `team-statistics-roster-layout.spec.js`, `team-overview-layout.spec.js` and the Team page entries of `responsive.spec.js` pass.

## Files / areas

- `frontend/src/teams/TeamAdvancedSection.jsx`, `RatingsChart.jsx` (and `index.css` only for a rule that classes cannot express).
- `frontend/e2e/team-advanced-layout.spec.js` (new). `PanelHeader`, `Panel`, `TabStrip` are reused, not changed.

## Data / contracts

No API or data change. The spec mocks `GET /api/seasons/:season/teams/:club/advanced` (`scope`, `scopes`, `trend[]` with `round`, `offensiveRating`, `defensiveRating`, `netRating`, `splits` with `home/away/last5/last10` games, wins, mov, ratings and pace, `pbp` with the time, clutch and fact fields) and `GET .../lineups` (`lineups[]` with `lineup` (comma-separated keys), `lineupNames` ("LAST, FIRST; ..."), `games`, `seconds`, `possessionsFor`, `ortg`, `drtg`, `netRating`) in the shapes the live endpoints return (read during this spec's measuring), and the roster-stats request the faces use is left live or answered empty.

## Testing

`npm run lint`, `npm run build` (no unit test command exists). Browser tests: `cd frontend && npm run test:browser`; the new spec and the other Team specs alone first, then the whole suite once (known load-flaky specs pass alone).

`team-advanced-layout.spec.js` (patterns from `team-shooting-games-layout.spec.js`): read the live season and a team from the API, mock the advanced and lineups answers with `page.route` (the later registration wins), load once and resize through 320, 390, 639, 640, 768, 1023 and 1024px. Checks: `documentElement.scrollWidth <= clientWidth`; the badge's place by width; the canvas's size against its box and the dots' radius (read from the chart instance through the canvas); the splits' columns, heights and content; the facts' rows; each lineup row's content inside its box; the controls' effect; every state at 320px.

## Notes for the AI

- Work only on this tab; shared pieces get opt-in props with today's default. Do not start a dev server (Playwright starts its own when none runs).
- Measure first: the numbers above are Partizan at 320px. Check the chart after changing its dots (a screenshot at 320px with 38 rounds), since a canvas cannot be read like the DOM.
- Reuse what exists: the badge pair from `TeamLeagueProfile` (31h-i), the facts grid of the Roster (31h-ii), the helpers' patterns in the other team specs.
- Review choices: the splits become a two-by-two grid on phones (alternative: a swipe row of four cards like the Home leader cards); the chart's dots disappear beyond 25 rounds (alternative: keep a 2px dot at every size).
- TV code on game and match cards at desktop widths is a separate, still-open product point.

## Notes

- Ratings, as built: the badge pair, dots of 4px up to 12 rounds, 2px up to 25 and none beyond (the lines 3px, 2px beyond 25), hover dots of 4px, legend padding 12, the chart 240px tall below `sm` and 288px from `sm`. `RatingsChart` carries a `data-point-radius` attribute so the spec can read the dot size (a canvas cannot be read otherwise). With 38 rounds at 320px the legend sits on one line and the two lines are clean; a screenshot was checked.
- Splits, as built: two by two below `sm`, compact cards. The block is about 560px tall at 320px with the footnote (1,054px before), not the 330px the spec guessed: each card's four-row figure list sets the height. The Play by play facts are a two-column grid below `sm`.
- Found at step 3: the lineups' fallback note ("No 5-man lineup has reached 100 possessions yet, so this shows 50+") is a `stat-badge`, which never wraps, so it stuck out of its panel at 320px. Below `sm` it now wraps inside the panel (`max-sm:whitespace-normal! max-sm:rounded-lg!`). The 326px page width of the full-season Partizan page was the "Best net rating" badge beside the faces; below `sm` the badges wrap under the faces (still beside them where they fit, from about 390px).
- Each of the Splits grid, the lineup wrap and the fallback wrap fails the spec when removed. In the whole-suite run one `home-layout.spec.js` case failed under load.
- Revision asked for at review: the "Shooting" pointer panel at the bottom of the tab ("Shot zones, the court map ... are on the Shooting tab" with an "Open Shooting" button) is deleted at every width, with the `onOpenShooting` prop that fed it (the Shooting tab is next to this one). The Ratings caption is reworded because "cumulative through each round" did not explain itself: it now says "Season to date, in points scored and allowed per 100 possessions: each point covers all of the club's games up to that round, not just that round's game. The shaded gap between the lines is the net rating (offense minus defense): green when the offense is ahead, red when it is behind." (the numbers are unchanged; the chart's rating for round N is computed over the games up to round N, as the trend rows' `gamesPlayed` shows). The spec checks the caption's first words and that no pointer is drawn.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11827,"specSha256":"ed4c6807f98d1f0fb3d844fa5dc486ed2c7db27d0fe9cfe28cb0a17b61994f5d","branch":"refs/heads/feature/team-page-advanced-mobile-layout","head":"c2ebcb11a06c7fbcb70d311267d5914c21149c20","baseRef":"refs/heads/master","baseCommit":"c2ebcb11a06c7fbcb70d311267d5914c21149c20","sourceTree":"58b4ca3914f33c649cb7b3b51ca7a9463092cf83","absentOptional":[]} -->
