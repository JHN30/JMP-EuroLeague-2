# Feature: Advanced standings mobile layout

**From build-plan:** feature 31d-iv
**Build attempt:** 1
**Branch:** feature/advanced-standings-mobile-layout
**Status:** verified

## Goal

Make the Standings page's Advanced mode (`/:season/standings`, the Advanced tab: the scope tabs, the Round select, the view tabs Overview, Ratings, Four factors, Schedule and Splits, the Ratings scatter, and the table under each view) usable from 320px up, with the table behaviour 31d-i to 31d-iii gave the other Standings tables: the rank and crest stay pinned on the left, a short club name stands in below `sm`, and swiping the stats sideways narrows the team column to the crest alone in step with the finger. After this item, below `xl` (1280px) the Advanced table behaves like the Overview and breakdown tables, the controls fit at 320px, the wide cells (the Net bar, the Away to Home link, the shaded four-factor cells) read on a phone, and the Ratings scatter is readable at 320px. From `xl` the views look as they do today. The Explained view (31d-v) is not part of this item.

Layout only: no API, data or feature changes.

## Design reference

Current code (step 1 measures it before anything is changed; the numbers here are from reading the code):

- `AdvancedStandingsView.jsx` renders one table for every view, built from `VIEWS` (groups of columns). It uses `className="table breakdown-table"` in a plain `overflow-x-auto` div, with `ClubCell` (no short name) and a bare `.rank` circle for the first two columns. Views with labelled column groups (Ratings, Four factors, Schedule, Splits) have a second header row above the column headers whose first cell is an empty `th colSpan={2}`; that matters for pinning, because the pinned-column CSS selects the first two cells of every header row.
- `index.css` has the `.breakdown-table` rules and, since 31d-i, the shared `pinned-table` rules (sticky rank and team, `--collapse`, the clipped name) and `.wrap-head` (a header may wrap to two lines). `ScrollingTable.jsx` is the shared scroll box that writes `--collapse`; it leaves a table alone when it barely overflows.
- Wide cells: `NetBar` (a centred bar next to the number), `HomeAwayLink` (an SVG fixed at 240px), the four-factor cells (shaded by rank, centred), long headers such as "Away → Home net", "Adj ORtg", "FT rate allowed", "eFG% allowed".
- `RatingsScatter` (Ratings view) draws every club as a crest on an offence against defence plot sized from its box (`width * 0.68`, between 380 and 560px tall; a `compact` mode below 560px wide), with a hover tooltip and dashed league averages.
- Controls: the scope `TabStrip` (Regular season, All games, Postseason), the Round select, and the view `TabStrip` (six tabs including Explained), all in wrapping rows; a footnote and a per-view legend sit under the table.
- `StandingsPage.jsx` already builds the short-name map and passes it to `StandingsTable` and `RaceView`; `AdvancedStandingsView` is not given it.

Targets: at 320px the first screen of each view shows the pinned rank and crest with short name, then the first stats; a short swipe folds the name away; every control and legend fits; the Net bar and the Away to Home link fit between the pinned crest and the right edge; the scatter is readable (crests do not hide each other into a blob) at 320px; the page never scrolls sideways; at 1280px and wider nothing changes.

## In scope

- **Pinned table.** The Advanced table carries `pinned-table` and sits in `ScrollingTable`, so below `xl` the rank and team are pinned and the team collapses on swipe (below `sm`), as in 31d-ii. The group header row gets two empty cells (instead of one `colSpan={2}` cell) so the pinned rules line up in both header rows. The rank cell keeps its circle. Pinning is reset from `xl`, as for the other tables, but only where the table fits its box at 1280px: step 1 measures each view's natural width at 1280 and 1440px and the breakpoint is set from that.
- **Short names.** `StandingsPage` passes `shortNames` to `AdvancedStandingsView`, which passes `shortName` to `ClubCell` (full name from `sm`, short name below, the full name as the link's accessible name; full names while the teams list loads or fails).
- **Wide cells on a phone.** Below `sm` the Away to Home link and the Net bar are narrower (the same approach as the 31d-ii margin strip: a maximum width, scaling the SVG), long headers wrap (`wrap-head`), and four-factor cells keep their shading and rank tooltip. The first stat column is not a wide visual where that can be avoided by the column order (the 31d-ii finding: a wide visual first among the stats looks wrong during the first swipe); if a view's first stat is a wide visual (Overview has none, Splits starts with the Away to Home link), the column moves after the numbers it summarises (Home adv, Home W-L, Home Net, Away W-L, Away Net) and keeps its group.
- **Ratings scatter at 320px.** Measure first, then make the scatter readable on a phone: smaller crests below a width, the tick density following the plot size, and a tap on a crest showing its numbers (hover today). If crests still hide each other at 320px, say so with screenshots in the review packet rather than shipping silently (the next option would be a scrollable plot as in 31d-iii).
- **Controls, legends and footnotes at 320px.** Measure first, then fix only what clips: the scope tabs, the Round select, the six view tabs, the per-view legend, the rank ramp, the footnote, and the "schedule not available" note.
- **Playwright spec.** An Advanced standings layout spec (below). The page-scroll spec already covers the page.

## Out of scope

- The Explained view (31d-v), including its explainer text and visuals; the Overview table, the breakdowns and the Race (done).
- Changing which statistics a view shows, adding sorting, or restyling the shading beyond what 320px needs.
- Any backend or API change, a different `sm`, `lg` or `xl` break, a new dependency, adding the spec to Verify or CI.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (one review packet after all steps, no pause per step) and `workflow.checkpointCommits` is `disabled` (no step commits). `/complete` makes the single feature commit. Each step leaves the app working and ends with its Done when.

## Build steps

- [x] **1. Measure the current state.** No code change. On `/2026/standings` and `/2025/standings` (the Advanced tab) for Overview, Ratings, Four factors, Schedule and Splits at 320, 390, 768, 1024, 1279, 1280 and 1440px: the table's natural width against its box, the first screen at rest, the width of the Net bar and the Away to Home link, what the controls, legend and footnote do, the scatter's size and how much the crests overlap at 320px, and any page-level sideways scroll. Write the findings in this step's Result line.
  Result (measured headless, both seasons): at 1280px Overview, Ratings, Four factors and Schedule fit their box (table width equals box width; natural widths 627 to 1,033px); the Splits table is 1,284px wide in a 1,188px box at 1280 and 1279px, so it still overflowed there and fits only from about 1376px (it is 1,348px in a 1,348px box at 1440px), which is why the Splits table keeps its pinning until 86rem (`pin-wide`) and the other views unpin at 80rem. At 320px the tables are 627 to 1,220px wide in a 278px box and the page itself never scrolls sideways; the Net bar cell is 162px (fits the 206px between the pinned crest and the edge), the Away to Home link is a fixed 240px (does not fit), the first stat of Splits is that link (a wide visual first). The three tab strips and the Round select do not clip at 320 or 390px. The scatter is 270px wide and 380px tall at 320px with 26px crests that pile up in the middle cluster (readable but crowded).
  **Done when:** the Result line lists, per view, the table width at 1280 and 1440px and every element that clips or overlaps at 320px.

- [x] **2. Pinned table and short names.** `AdvancedStandingsView.jsx` (the `pinned-table` class, `ScrollingTable`, the two empty header cells, `shortNames` into `ClubCell`), `StandingsPage.jsx` (pass `shortNames`), and `index.css` only if the group header row needs a rule.
  **Done when:** `cd frontend && npm run lint` and `npm run build` pass. In a browser on `/2026/standings` and `/2025/standings` (Advanced), for each of the five views at 320 and 390px, the first two cells of every row and of both header rows are sticky; after scrolling 300px the rank and crest cells' left edges equal the scroller's left edge and no stat shows through them; below 640px every club shows its short name (never longer than the full name), from 640px the full name, with the full name as each link's accessible name; with the teams request blocked the table shows full names and no error appears; no short name splits across lines (checked per word at 320px). The Overview, breakdown and Race specs still pass.

- [x] **3. Collapse and the first screen at 320px.** Verify the collapse for each view: the team column narrows with the swipe and ends at the crest, a view that barely overflows is left alone, and nothing oscillates; tighten padding only where step 1 showed something clipped.
  **Done when:** lint and build pass. For each of the five views on both seasons at 320, 390 and 500px, swept over scroll positions 0, 18, 36, 80 and the maximum: the team width is monotonic in the scroll position, the name's opacity goes from 1 to 0 (or the table is left uncollapsed), the crest stays inside its cell, scrolling back to 0 restores the name and width, and two readings 150ms apart agree. From 640px the team column does not collapse.

- [x] **4. Wide cells and header wrapping.** `AdvancedStandingsView.jsx`, `advancedVisuals.jsx` and `index.css`: a maximum width for the Away to Home link and the Net bar below `sm`, `wrap-head` on the long headers, and the Splits column order if step 1 shows the first stat is a wide visual.
  Built: the Away to Home link has a `home-away-link` class capped at 11.5rem below `sm` (as the 31d-ii margin strip); the Net bar already fits; the Splits link moved to the end of the "Home and away" group, so Home adv is the first stat. Revised after review: below `sm` the Away to Home dot chart is left out (it shows from `sm`, as the last column) and the Splits columns are Home W-L, Away W-L, Home Net, Away Net, Home adv (the difference) at every width, then the chart; record cells and header words never break at a hyphen (`whitespace-nowrap`, a header label breaks only between words, so "L5 W-L" is no longer three lines); the group heading row has one cell for a phone and one for `sm` and up so its span matches the columns shown. The Splits table is 775px wide on a phone (1,220px before).
  **Done when:** lint and build pass. At 320 and 390px the Away to Home link and the Net bar cells are narrower than the room between the pinned crest and the right edge (the box width minus 72px), and their dots and bars are still all inside the cell; no long header is cut mid-word; at 640px and wider the cells are as wide as today (the link is 240px).

- [x] **5. The Ratings scatter at 320px.** `advancedVisuals.jsx` (`RatingsScatter`) and `index.css` as needed, from what step 1 measured.
  Built: crests are 9px radius (13px before) when the plot is under 400px wide; tick density already followed the plot size, and the tap tooltip already works through focus (each crest has `tabIndex={0}` and `onFocus`), so a tap on a crest shows its numbers and a tap elsewhere blurs it. Screenshot review: at 320px the smaller crests still touch in the middle cluster (about five clubs) but each can be told apart and tapped; a scrollable plot was not needed.
  **Done when:** lint and build pass. At 320 and 390px the scatter fits its box with no sideways scroll, its crests are smaller than today's, its axis labels do not overlap, and tapping a crest shows its numbers (a tap on another crest moves the tooltip; a tap elsewhere clears it); from 640px the chart is unchanged. Screenshots of the scatter at 320px are taken and the review packet says whether the crests still hide each other.

- [x] **6. Controls, legends and footnotes fit at 320px.** Fix only what step 1 listed.
  Result: nothing clipped (see step 1), so nothing changed; the long headers wrap (`wrap-head` on every column header of the Advanced table).
  **Done when:** lint and build pass. At 320 and 390px on both seasons every tab strip, the Round select, the legends and the footnote are fully visible and nothing extends past the viewport; the page does not scroll sideways in any of the five views (the Standings entry of the page-scroll spec still passes).

- [x] **7. Advanced layout spec and regression pass.** `frontend/e2e/standings-advanced-layout.spec.js`: for each of the five views, loading the page once and resizing through the widths: sticky first two cells in both header rows, the collapse partway and at the end and its restore, short against full names and accessible names, the teams-blocked fallback, the wide cells' widths, the scatter's fit and tap, no page overflow at 320 and 390px, and unpinned (or still fitting) at 1280px and wider as step 1 decided. Screenshots of each view at 320, 390, 768 and 1280px for the review. A full lint, build and browser-suite run.
  **Done when:** `cd frontend && npx playwright test e2e/standings-advanced-layout.spec.js e2e/standings-table-layout.spec.js e2e/standings-breakdowns-layout.spec.js e2e/standings-race-layout.spec.js e2e/responsive.spec.js` passes; lint and both builds pass; the full `npm run test:browser` passes or any failure is explained and traced to this change; nothing outside the files listed below changed.

## Files / areas

- `frontend/src/standings/AdvancedStandingsView.jsx`, `advancedVisuals.jsx`, `StandingsPage.jsx` (pass the short names)
- `frontend/src/index.css` (only what the group header row, the wide cells and the scatter need; the shared pinned rules are reused, not copied)
- `frontend/e2e/standings-advanced-layout.spec.js` (new)
- Not changed: the backend, `frontend/src/lib/api.js`, `ScrollingTable.jsx` (unless the collapse guard needs a change, which the review packet would say), `AdvancedExplainedView.jsx` and `explainedVisuals.jsx` (31d-v), the other Standings views and every other page.

## Data / contracts

- No API, database or persisted-data change. No new dependency. The short names come from the existing teams list (`getSeasonTeams`, key `["teams", seasonCode]`), already read by `StandingsPage`.
- Breakpoints: `sm` 40rem, `lg` 64rem, `xl` 80rem. The collapse runs below `sm` only, for the reason recorded in 31d-i.
- Accessibility: the table stays a real `<table>`; sticky cells keep a visible fill; each club link's accessible name is the full club name at every width; the scatter keeps its labels and its tap or hover tooltip must also be reachable by keyboard focus as it is today (no regression); a header cell that is split into two empty cells keeps the same column count for assistive technology (the empty group-row cells have no text and are decorative).
- CSS order matters (unlayered CSS outranks Tailwind utilities; equal specificity goes to the later rule), so any new rule must sit relative to the shared pinned rules as in 31d-ii.

## Testing

- Playwright browser spec (step 7) following the 31c to 31d-iii pattern: one page load per test, resized through the widths. There is no unit test command; browser tests are evidence, not part of Verify.
- The existing Standings specs (`standings-table-layout`, `standings-breakdowns-layout`, `standings-race-layout`, `responsive`, the page-scroll spec) must keep passing.

## Notes for the AI

- Reuse what 31d-i to 31d-iii built; do not copy the pinned CSS or the scroll wrapper under a second name.
- Phones are not available for testing: say that scrolling and the tap tooltip were checked by driving the page in a headless browser, not by hand.
- No em or en dashes in generated content (the existing "—" empty-cell marker and the "→" in a header label stay as they are).
- Measure before fixing; change only what clips. Do not touch the Explained view (31d-v).
- If the scatter is still unreadable at 320px, say so with screenshots in the review packet and propose the next option rather than shipping it silently.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":16455,"specSha256":"0810fb9c4dd10c2ab4b4aa5e88f32aa4186c48439425a4d2e868bab11bfdd325","branch":"refs/heads/feature/advanced-standings-mobile-layout","head":"c934aa6d933fd028e4bc0572859486823b7db8fa","baseRef":"refs/heads/master","baseCommit":"c934aa6d933fd028e4bc0572859486823b7db8fa","sourceTree":"9598c1dfc8432fcd13762e7101543e465a331714","absentOptional":[]} -->
