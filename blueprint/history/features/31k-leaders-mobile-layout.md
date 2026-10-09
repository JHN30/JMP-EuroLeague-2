# Feature: Leaders mobile layout

**From build-plan:** feature 31k
**Build attempt:** 1
**Branch:** feature/leaders-mobile-layout
**Status:** verified

## Goal

Make the Leaders page (`/:season/leaders`, `frontend/src/leaders/`) work from 320px up in all three scopes (Players,
Teams, Advanced), on both the landing view (category cards, and for Players the "Hot right now" form panels) and the
full board for one statistic (`?metric=`): no sideways page scroll, no names or clubs cut off where they can wrap or
shorten, and controls that fit. Layout and labels only: no API or data change. Mobile is below 640px (unprefixed
styles), tablet is `sm` (640px), desktop is `lg` (1024px); `xl` stays.

Today:

- **Shared parts** (`LeaderParts.jsx`): `CardGrid` is 1 column, 2 at `md`, 3 at `xl`. `CategoryCard` rows put a rank
  badge, an avatar, a `truncate` name over a `TeamTag` (crest and `truncate` full club name) and a large value in one
  line. `BoardHeader` and `BoardRow` show the extra figures (GP and MIN, or GP and Record) only from `md`. `.board-row`
  in `frontend/src/index.css` has a 768px media query for those columns and the 14rem value column.
- **Strips**: the scope, phase, statistic-family and form-statistic `TabStrip`s do not use the `scrolling` option.
- **Board controls**: the Players board has 5 `LabelledSelect`s and a `SearchField` in one wrapping row, the Teams
  board 2 selects and a search, the Advanced board 2 selects. Above them sit `StatChips`, a wrapping row of
  statistic buttons.
- **Overflow spec**: `responsive.spec.js` checks the landing view only (`staticPage("Leaders", "leaders")`).

## In scope

1. **Breakpoints.** Retire every `md:` class and the 768px `.board-row` query in the Leaders files, using the two
   breaks. `CardGrid`: 1 column below `lg`, 2 at `lg`, 3 at `xl` (two cards side by side at 640px leave about 80px
   for a name, so tablets get one column). Board rows: below `sm` as today (rank, person, value); from `sm` the
   extra figures show, with the 9.5rem value column and its bar (as today); from `lg` the 14rem value column. The column
   header matches the rows at every width.
2. **Names and clubs.** Below `sm`, player and team names in category cards, form panels and board rows may wrap
   onto two lines (`line-clamp-2`, `wrap-break-word`) instead of being cut. `TeamTag` shows the club's TV code
   below `sm` and the full club name from `sm`, using the existing `ShortLabel`. It falls back to the club code,
   then the name, when a response has no TV code (`clubTvCode` on form and advanced entries, `clubTvCodes` on
   season-statistics rows; step 1 confirms each field). The full name stays available to screen readers. Crests and
   avatars keep their size.
3. **Strips.** The scope, phase, statistic-family and form-statistic strips use `TabStrip`'s existing `scrolling`
   option, as on the Player page (31j): one row that scrolls below `lg`.
4. **Statistic chips.** `StatChips` stay a wrapping row and fit at 320px; a chip's label never overflows it.
5. **Board controls.** Below `sm` the selects sit in a two-column grid (each half the width) and the search field
   takes the full width; from `sm` they wrap in one row as today. The "back to all categories" line, the "Showing x-y
   of N" line and the Previous/Next buttons fit at 320px.
6. **Form panels** (Players landing): the "Hot right now" and "who has moved" lists fit at 320px, with the value and
   difference on the right never squeezed.
7. **States.** Loading, error (with Retry), "No one yet." (empty card), "No players match these filters." and
   "No one has changed place." fit at 320px.
9. **Compact board controls on a phone** (added after review: the controls filled the first screen). Below `sm` the
   statistic-family tabs and the `StatChips` give way to one "Statistic" select grouped by family (`optgroup`), like the
   Standings View select (31d-vi). Order (and Per game / Totals where a board has it) stays visible; the other filters
   (minimum games or minutes, team, position, search) sit behind the existing `FilterDisclosure` button, which shows how many
   are active. From `sm` the tabs, chips and filters are as today.
8. **Specs.** A new `frontend/e2e/leaders-layout.spec.js` (pattern from `players-layout.spec.js`: load once, resize
   through the widths) for the three landings and one board per scope; the boards are added to `responsive.spec.js`.

## Out of scope

- Any API or data change, what a card or board shows, the metrics, ranking, paging size or URL parameters.
- Compare, Head-to-head, Records and Postseason (items 31l to 31n).
- Changing shared components outside `frontend/src/leaders/` (`TabStrip`, `LabelledSelect`, `SearchField`,
  `ShortLabel`, `Panel`, `AsyncState`) beyond using their existing options. Only an opt-in prop with today's default
  if one is unavoidable.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the
narrow check after each, then present one final review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Shared parts and breakpoints.** In `LeaderParts.jsx` and the `.board-row` rules in `index.css`: the
      `CardGrid`, board header and row breakpoints from In scope 1, wrapping names, and `TeamTag` with `ShortLabel`.
      First confirm which TV-code field each leaders response carries.
      Done when: at 320 and 390px a category card and a board row show the rank, avatar, a name on at most two
      lines, the TV code and the value, with nothing cut or outside the card; at 640 and 768px cards are one per
      row and boards show GP and MIN (or GP and Record); at 1024px cards are two per row and boards show the bar;
      at 1280px cards are three per row; `grep -n "md:" frontend/src/leaders` finds nothing and `index.css` has no
      768px `.board-row` query.
- [x] 2. **Landing views and strips.** `scrolling` on the four strips; the form panels and all landing states at
      320px, for Players, Teams and Advanced.
      Done when: at 320px each strip is one row that scrolls with the active tab visible, the form lists show name,
      club and value without overlap, and no landing view scrolls sideways at 320, 390, 768 or 1024px.
- [x] 3. **Board controls and states.** `StatChips`, the controls grid, the top line, the count line, the paging
      buttons and the board states for the three boards.
      Done when: at 320px every select, the search field and both paging buttons are inside the window and usable,
      no chip label overflows, and no board scrolls sideways at 320, 390, 768 or 1024px.
- [x] 4. **Specs.** Write `leaders-layout.spec.js` (live data, plus mocked responses for long names, a missing club,
      portrait or TV code, and the error and empty states) and add the three boards to `responsive.spec.js`.
      Done when: both specs are written and lint cleanly; they are not run before 1 November 2026 (the user's
      decision), and the final packet says so. Root `npm run build` and `cd frontend && npm run lint` pass.

- [x] 5. **Compact board controls on a phone.** In scope 9, for the three boards.
      Done when: at 320 and 390px a board shows the Statistic select, Order (and Mode), and a Filters button, with the
      first leaderboard row on the first screen (800px tall); choosing a statistic in the select opens its board; the
      Filters button opens and closes the other filters and counts the active ones; from 640px the tabs, chips and
      filters look as before; root `npm run build` and `cd frontend && npm run lint` pass.

## Files / areas

- `frontend/src/leaders/LeaderParts.jsx`: `CardGrid`, `CategoryCard`, `TeamTag`, `StatChips`, `BoardTopLine`,
  `BoardHeader`, `BoardRow`.
- `frontend/src/leaders/LeadersPage.jsx`, `PlayersLeaders.jsx`, `TeamsLeaders.jsx`, `AdvancedLeaders.jsx`: strips,
  controls, form panels, passing the TV code to `TeamTag`.
- `frontend/src/index.css`: the `.board-row` rules (and `.stat-chip` only if needed).
- `frontend/e2e/leaders-layout.spec.js` (new), `frontend/e2e/responsive.spec.js`.

## Data / contracts

None changed. The page reads the existing season-statistics, team-statistics, `leaders/form` and `advanced/leaders`
responses. A `NULL` club, TV code, portrait or value means unavailable: the row omits that part and never shows zero.

## Testing

No unit test runner is configured. The specs are written now but not run until browser tests resume after 1 November
2026. `leaders-layout.spec.js` loads each view once and resizes through 320, 390, 639,
640, 768, 1023, 1024 and 1280px, checking: cards per row (1, 1, 1, 1, 1, 1, 2, 3); board extra columns hidden below
640px and shown from 640px; the bar shown from 640px; every row's content inside its row; names on at most two
lines and no cut-off words (`findBrokenWords` from `support/layout.js`); the club label equal to a real TV code
below 640px and to the full name from 640px; strips scrolling below 1024px; controls and paging buttons inside the
window; the document no wider than the window; and the mocked error and empty states at 320px.

Verify: no `Verify` command is declared in `AGENTS.md`, so none was run while writing this spec. The final gate is
root `npm run build` plus `cd frontend && npm run lint`. Nothing here proves how it looks in the user's browser; the
final packet will say so.

## Notes for the AI

- Follow the user's rules: changes stay on the page being built, and shared components only get opt-in props. The
  TV code is the short label wherever a full name does not fit; the club code is the permanent ID (memory notes on
  page scope and TV codes).
- Playwright browser tests are paused until 1 November 2026 to save Neon network transfer (`CLAUDE.local.md`, enforced
  by a hook). Do not run `leaders-layout.spec.js` or `responsive.spec.js`. Gather evidence with single page visits
  driven through the Playwright library against the running dev servers, as in the last two fixes: each view loaded
  once and resized through the widths, so the server cache absorbs repeat reads.
- The responsive and layout specs elsewhere use `support/layout.js` helpers; reuse them.
- Match the surrounding code style and comment density. No AI attribution in commit messages (AGENTS.md).

## Built as

- As specced, with these changes found while building:
  - The spec said the board's bar shows only from `lg`; today it shows from `sm` in the 9.5rem column, and that was kept
    (the spec line and the Testing line were corrected).
  - Below `sm` the place change sits under the rank badge, so the rank column is 2rem instead of 4.25rem; at 320px a board
    name gets about 112px instead of 76px. From `sm` the rank and change sit side by side as before.
  - `TeamTag` wraps onto two lines at every width instead of being cut. Showing GP and MIN from `sm` left about 55px for
    the club on the Players board at 640px, so its club and position line also wraps (`flex-wrap`).
  - On the Players board below `sm`, Minimum games, Team and Position take a full row each (`col-span-2`): at half width
    "Qualified (20+ games)" and a chosen long team name were cut under the select's arrow. Mode and Order stay side by side;
    the Advanced board's two selects fit side by side.
- Evidence: single page visits through the Playwright library against the running dev servers, each Leaders view loaded once
  and resized through 320, 390, 640, 768, 1024 and 1280px, before and after. No view scrolls sideways at any width; at 320 and
  390px no name or club is cut and no word breaks (before: up to 40 cut texts and 5 broken words); cards are 1, 1, 1, 1, 2, 3
  per row; boards show the extra columns from 640px; strips are one scrolling row below 1024px; every select, the search
  field and the page buttons are inside the window. Mocked error and empty states at 320px fit. Desktop at 1280px looks as
  before.
- Known gaps: at exactly 640 to about 700px, the longest club name ("Crvena Zvezda Meridianbet Belgrade") needs three lines
  on a board row and ends with an ellipsis after two (the baseline cut it on one line). A traded player's crest URL arrives as
  two URLs joined with ";", so that crest fails to load; this predates the feature and is not changed here.
- Step 5, after the user's review of the phone boards: below `sm` each board has one "Statistic" select (`StatSelect` in
  `LeaderParts.jsx`, grouped by family) in place of the family tabs and chips, Order (and Mode) stay visible, and the other
  filters sit behind `FilterDisclosure` with the Shooting tab's `sm:contents` pattern, so from `sm` they flow into the row as
  before. Choosing a statistic in the select also moves the family tabs to its family. The first leaderboard row now starts
  at 568 to 640px on a 320 or 390px phone (it was below the first screen). The three full-row selects from the first pass
  went back to normal inside the disclosure.
- `leaders-layout.spec.js` and the three new `responsive.spec.js` entries are written and lint cleanly but were not run
  (browser tests are paused until 1 November 2026).

## Decisions

Settled by the user while reviewing this spec:

1. **Browser specs before 1 November.** Write `leaders-layout.spec.js` and the `responsive.spec.js` entries, but do not
   run them until browser tests resume; the feature completes with them unrun and says so.
2. **Board filters on a phone.** The selects sit in a two-column grid below `sm`, not behind `FilterDisclosure`.
3. **Category cards on a tablet.** One column from 640 to 1023px, two at `lg`, three at `xl`.
4. **Statistic picker on a phone** (after review): one "Statistic" select grouped by family, not a scrolling chip row.
5. **Board filters on a phone** (after review, replacing decision 2): Order and Mode stay visible; the rest go behind the
   `FilterDisclosure` button.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":13880,"specSha256":"32213e7cb6057dc36a3dcb092516878b36abff23bbbb4a5f623f27adc8a871b0","branch":"refs/heads/feature/leaders-mobile-layout","head":"4b0e1fac6b9b1613e52599aa9f87568a35c71609","baseRef":"refs/heads/master","baseCommit":"4b0e1fac6b9b1613e52599aa9f87568a35c71609","sourceTree":"729f0696d4175a4a89e6d64b8eecc254259ae1a1","absentOptional":[]} -->
