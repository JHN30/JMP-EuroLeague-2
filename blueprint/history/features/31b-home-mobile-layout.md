# Feature: Home mobile layout

**From build-plan:** feature 31b
**Build attempt:** 1
**Branch:** feature/home-mobile-layout
**Status:** verified

## Goal

Make Home (`/:season/home`) a deliberate mobile page at 320px and up, on top of the 31a foundation. Today it is 5,700px tall at 320px: ten upcoming-game cards and ten results stack vertically, the standings table scrolls inside a fixed-height box that only makes sense beside the results, the KPI strip sits at the bottom, and the panels carry desktop padding. After this item, below `sm` the upcoming games and the leader cards are swipeable rows that lock one card into focus, standings show in full with no inner scroll below `lg`, the KPI strip is a 2x2 grid, and the latest scores show five with a "Show more" button. Desktop (`lg` and up) keeps its current layout.

Layout only: no API, data or feature changes.

## Design reference

Observed in the running app before this work (Home, light theme, earlier browser run):

- 320px: page 5,711px tall; the upcoming games are 10 stacked cards (about 1,000px); the standings list is a scroll box sized to the results panel; panel padding is 24px, which leaves about 224px of card width inside a 12px page gutter.
- Standings at `lg` and up: height-matched to the Results panel through `useMeasuredHeight` in `frontend/src/dashboard/Dashboard.jsx` and an inner `overflow-y-auto` list. Below `lg` the two panels stack, so the matched height and inner scroll only add a scroll area inside a scrolling page.
- KPI cards (31a state): below 1280px a sideways-scrolling row of 20rem cards; at 1280px and up four across.
- Leader cards: a row that scrolls sideways at every width (cards at least 15rem wide), with heavy photo cards (1.5rem padding, 8.5rem photo).

Targets: in each swipe row the first and last card on the panel's content edge (in line with the heading), the cards between them centred, and the neighbouring card peeking out to the panel border; panel padding 16px (`p-4`) on mobile; the page far shorter at 320px.

## In scope

- **Panel padding.** The shared dashboard panels (`WidgetPanel` in `Dashboard.jsx`, and the Leaders panel) use `p-4` below `sm`, `sm:p-5` from `sm`, and `lg:p-6` from `lg` (so desktop is unchanged at 24px). The match cards (`.match-card`) use tighter padding below `sm` and their current padding from `sm` up.
- **Section order.** Unchanged at every width: header, Upcoming games, Standings and Latest scores, KPI strip, Leaders, Form trend. (An earlier draft moved the KPI strip up near the top below `lg`; after review it stays between the scores and the leaders.)
- **Page header gap.** The space between a page header and the first section under it is 24px at every width on every page. Home, Season overview and Postseason stack their sections in a `gap-6` column, so the header's own `mb-6` made it 48px there; `PageHeader` takes a `stacked` option that drops its own margin, used by those three pages. Pages that wrap the header in a plain `div` already had 24px.
- **KPI strip.** Below `xl` (1280px) a 2x2 grid with no sideways scroll; from `xl` four across, as now. Below `sm` each card is compact and stacked (small crest on top, then label, name, value, left-aligned) so club names wrap by whole words in a card about 140px wide. From `sm` the photo card stays, and if a club name breaks mid-word at 640 to 767px the photo shrinks between `sm` and `lg` until it does not. The 31a rule (20rem minimum column, sideways scroll below `xl`) is replaced for the 4-up Home strip only; the plain `.kpi-strip` used by Standings and Head-to-head is unchanged.
- **Upcoming games.** Below `sm` a sideways-scrolling row with `scroll-snap-type: x mandatory`, each card about 85% of the panel's content width, centred on snap (`scroll-snap-align: center`) and unskippable (`scroll-snap-stop: always`). The row bleeds out to the panel edge (negative side margin equal to the panel's 1rem padding, with matching scroll padding), so the first card rests on the content edge in line with the heading, the last card ends on the opposite content edge, the cards in between rest centred, and the neighbouring card peeks out to the panel border. From `sm` the current grid (two or three columns) is unchanged.
- **Leader cards.** Below `sm` the same snap row. From `sm` to `lg` a 2-column grid with no sideways scroll. From `lg` the current row (cards at least 15rem wide, sideways scroll if they do not fit) is unchanged. Below `sm` the Home leader cards use a smaller photo (6rem) and tighter padding so a player name is not cut mid-word (measured: "TUBELIS, AZUOLAS" broke beside the 8.5rem photo); from `sm` up the cards are as before. Season overview and Team page leader cards keep their rules.
- **Snap row accessibility.** Each snap row is `role="group"` with an `aria-label` ("Upcoming games"; "<phase name> leaders"). Below `sm` it is keyboard-focusable (`tabIndex={0}`) so the arrow keys scroll it; from `sm` it is not (no stray tab stop). The choice is made with a small shared `useMediaQuery` hook rather than a permanent tab stop.
- **Standings.** Below `lg` the list shows every row at natural height with no inner scroll and no fixed panel height. From `lg` the panel is height-matched to the Results panel with the inner scroll, as now. The matched height reaches the markup as a CSS custom property used only from `lg`, not as an unconditional inline height.
- **Latest scores.** Below `sm` the first five games show, with a "Show 5 more" button (`aria-expanded`, `aria-controls` the list) that reveals the rest and then reads "Show fewer". From `sm` all ten show and the button is hidden. No button when there are five games or fewer. The hidden cards are `display: none` so they take no tab stops. The list's existing two-column rule (container 34rem or wider) now also requires `sm`, so a 576 to 639px screen shows one column rather than five cards in the left column only. The hiding is a plain class in `index.css`, because the unlayered `.match-card { display: block }` outranks Tailwind's `max-sm:hidden`.
- **Form trend.** The `leader-trend-row` media query moves from `max-width: 639px` to a mobile-first `min-width: 40rem` (retiring the stray 639 value). The stat sits above the chart below `sm` and beside it from `sm`, as now.
- **Playwright spec.** A Home layout spec (below) and Home stays in the existing page-scroll spec.

## Out of scope

- A position-dots indicator for the swipe rows (the peeking card is the cue; add dots only if the review finds it unclear).
- The intermittent `postseason.spec.js` failure under full-suite load (a 5-second wait on the postseason page's text; it passes alone). It is a Postseason page and spec matter, left for item 31n.
- Any other page, including the `md:` and stray media queries on other pages, and the shared `kpi-chip` photo rules used by Season overview and Team pages.
- Changing what Home shows or how many games or leaders it fetches (still 10 and 10; the "5" is only how many are visible on mobile).
- A tablet hamburger, a different `sm` or `lg`, any new dependency.
- Adding the spec to Verify or CI.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (one review packet after all steps, no pause per step) and `workflow.checkpointCommits` is `disabled`. `/complete` makes the single feature commit. Each step leaves the app working and ends with its Done when.

## Build steps

- [x] **1. Panel padding, standings height and the trend breakpoint.** `WidgetPanel` and `LeadersPanel`: `p-4 sm:p-5 lg:p-6`. `.match-card` padding mobile-first. `StandingsSnapshot.jsx` and `Dashboard.jsx`: pass the measured height as a CSS custom property and use it, with the inner scroll and its right padding, only from `lg`. Rewrite `.leader-trend-row` and `.leader-trend-stat` mobile-first at 40rem and remove the `max-width: 639px` block.
  **Done when:** `cd frontend && npm run lint` and `npm run build` pass. In a browser: panel padding is 16px at 320 and 390, 20px at 640 and 768, 24px at 1024 and 1280. Standings has no inner scroll and shows all rows at 320, 390, 768 and 1023 (`scrollHeight` equals `clientHeight` for the list); at 1024 and 1280 the Standings panel height equals the Results panel height (within 1px) and the list is `overflow-y: auto` (the 18 rows fit in that height today, so it does not scroll; it would with more rows). The trend stat is above the chart at 639 and beside it at 640. Desktop is unchanged (screenshots of Home at 1280 before and after match).

- [x] **2. KPI strip: 2x2 and compact below `sm`.** `index.css` (the `.kpi-strip-4` rules and a compact below-`sm` chip). (The first build also reordered the strip near the top with `order-*` classes in `Dashboard.jsx`; step 6 reverts that.)
  **Done when:** lint and build pass. In a browser: at 320, 390, 639, 640, 768, 1023 and 1279 the four cards form a 2x2 grid (two distinct tops, two distinct lefts) with no sideways scroll inside the strip; at 1280 they are four across. Club names ("Panathinaikos AKTOR Athens", "Valencia Basket", "Fenerbahce Tarfin Istanbul" or whichever four clubs are live) wrap by whole words at every one of those widths (no word is cut). At every width the strip is below the Standings and Latest scores panels and above the leaders. Standings and Head-to-head KPI strips look as before at 1024px and 1280px.

- [x] **3. Snap rows for the upcoming games and the leader cards.** `index.css` (`.games-row`, `.leaders-row` mobile-first; the tablet 2-column grid for leaders), `UpcomingGames.jsx`, `LeadersPanel.jsx`, and a new `frontend/src/lib/useMediaQuery.js` for the below-`sm` tab stop.
  **Done when:** lint and build pass. In a browser at 320 and 390: each row's computed `scroll-snap-type` is `x mandatory`; a card is about 85% of the panel's content width; at rest the first card's left edge is on the panel's content edge and the second card peeks out; after a programmatic scroll or a swipe the row settles with a card centred (the nearest card's centre is within 2px of the row's centre); the page does not scroll sideways. At 639 the row is still a snap row; at 640 and 768 the upcoming games are the grid and the leaders are 2 columns with no snapping. At 1024 and 1280 both look as before. With keyboard focus on the row below `sm`, ArrowRight moves to the next card; at 640 and up the row is not in the tab order. Loading, empty and error states of both panels still show (the snap row is not rendered for them).

- [x] **4. Latest scores: five shown, "Show 5 more".** `RecentResults.jsx` (the button, the toggle state, marking cards six to ten) and `MatchCard`'s optional class.
  **Done when:** lint and build pass. In a browser at 390: five result cards are visible, the button reads "Show 5 more" with `aria-expanded="false"`; pressing it shows ten and reads "Show fewer"; pressing again returns to five. At 768 and 1280 all ten are visible and there is no button. The two-column layout of the list at 768 and wider is unchanged (five per column). With five or fewer games there is no button at any width. Hidden cards are not reachable by Tab.

- [x] **5. Home layout spec and regression pass.** `frontend/e2e/home-layout.spec.js` covering the browser checks of steps 1 to 4 that are stable (panel padding, standings scroll and matched height, the KPI grid and its position, the snap row's snap type, card width and centring, the keyboard stop, the results button), plus a full lint, build and browser-suite run, and screenshots of Home at 320, 390, 768 and 1280px for review.
  **Done when:** `cd frontend && npx playwright test e2e/home-layout.spec.js` passes; lint and build pass; the full `npm run test:browser` passes or any failure is explained and traced to this change; Home is still in the page-scroll spec and passes at all four widths; nothing outside the files listed below changed.

- [x] **6. Review revisions (requested after the first review).** Three changes: the KPI strip returns to its place between the latest scores and the leaders (the `order-*` classes in `Dashboard.jsx` are removed); the swipe rows' edges are fixed (the row bleeds to the panel edge with matching scroll padding and 85% cards, so the first and last card line up with the heading and the panel content, replacing the 1.5rem side padding that left a wider gap at both ends than between cards); the page header gap is 24px on every page (`PageHeader` `stacked`). The specs follow: the KPI position test, the swipe-row geometry test, and a 24px header-gap test over every real page at 390 and 1280px.
  **Done when:** lint and build pass. In a browser at 320, 390 and 639: the first card's left edge is within 1px of the panel's content edge, the last card's right edge is on the opposite content edge after scrolling to the end, the gap between cards is about 10px, the neighbouring card peeks out 40px or more, and the page does not scroll sideways. The header gap is 24px on Home, Season overview, Postseason, Standings and Teams at 390 and 1280px. The KPI strip is below the Latest scores panel and above the leaders at 390 and 1280px. `home-layout.spec.js` and `responsive.spec.js` pass, and the full browser suite passes or any failure is explained.

## Files / areas

- `frontend/src/dashboard/Dashboard.jsx` (`WidgetPanel` padding, order classes, the measured-height property)
- `frontend/src/dashboard/StandingsSnapshot.jsx`, `RecentResults.jsx`, `UpcomingGames.jsx`, `LeadersPanel.jsx`, `LeaderTrend.jsx` (only if its markup needs it), `KpiStrip.jsx` (only if the compact chip needs a hook)
- `frontend/src/index.css` (`.match-card`, `.games-row`, `.games-list`, `.leaders-row`, `.kpi-strip-4` rules, `.leader-trend-row` and `.leader-trend-stat`)
- `frontend/src/lib/PageHeader.jsx` (the `stacked` option), `frontend/src/season/SeasonOverviewPage.jsx` and `frontend/src/postseason/PostseasonPage.jsx` (one prop each)
- `frontend/src/lib/useMediaQuery.js` (new) and `frontend/src/lib/HeaderStats.jsx` (passes extra props through, for the strip's `data-testid`)
- `frontend/e2e/home-layout.spec.js` (new), `frontend/e2e/support/layout.js` (a mid-word-break probe), and `frontend/e2e/responsive.spec.js` (the loading wait raised to 15 seconds in both specs, after a spinner outlasted 5 seconds under four parallel workers)
- Not changed: the backend, the API client, `CompactMetric.jsx`, and every other page.

## Data / contracts

- No API, database or persisted-data change. No new dependency. The same queries and query keys; Upcoming games and Latest scores still fetch 10 each.
- Breakpoints as in 31a: `sm` 40rem and `lg` 64rem; `xl` 80rem remains a desktop-only refinement for the KPI strip.
- Accessible names and roles that existing specs rely on stay. New: snap rows are `role="group"` with the labels above; the "Show 5 more" / "Show fewer" button has `aria-expanded` and `aria-controls`.
- Snap contract below `sm`: `scroll-snap-type: x mandatory`; cards `scroll-snap-align: center` and `scroll-snap-stop: always`; about 85% card width.
- Motion: the existing `listContainer` and `listItem` entrance and the card hover and tap stay; nothing new animates (reduced-motion users are already handled by `MotionConfig`).

## Testing

- No unit test command exists, so there is no unit test. The one new logic piece (how many results show) is covered through the browser spec.
- Browser tests are declared (`cd frontend && npm run test:browser`), so `home-layout.spec.js` is added as proportionate coverage of the stable layout behaviour. They stay opt-in and are not part of Verify or CI (none is declared). The snap-settling check uses a programmatic scroll in Chromium; if it proves flaky it is reduced to the computed snap properties and card geometry rather than loosened silently.
- What this will not prove: real swipe gestures and momentum on a phone, Safari and iOS behaviour, and visual polish. The screenshots from step 5 are the visual evidence; the user judges them.
- `/check` runs the full `npm run test:browser`.

## Notes for the AI

- Follow `coding-standards.md`: theme tokens, no blur, no commented-out code, no unused imports, comments only for the why, no em or en dashes anywhere.
- Prefer CSS for the breakpoint switching; the only JavaScript media query is the below-`sm` tab stop on the snap rows. Keep desktop (`lg` and up) pixel-for-pixel as today: compare screenshots before and after.
- The measured-height value is runtime data, so a CSS custom property set inline is the justified inline style; do not add other inline styles.
- Do not start 31c work: Season overview, and the other pages, keep their own items.
- No Verify command is declared, so none was run while writing this spec.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":16692,"specSha256":"cc1dec3bc15bb2280863cb70d353347e46281bda66d9065417ca7778716b47fd","branch":"refs/heads/feature/home-mobile-layout","head":"2d14dfb844173f925bd9cc55e9e091ce53f818ea","baseRef":"refs/heads/master","baseCommit":"2d14dfb844173f925bd9cc55e9e091ce53f818ea","sourceTree":"73dc393f76812aef2d5da5414de3869f1879ba76","absentOptional":[]} -->
