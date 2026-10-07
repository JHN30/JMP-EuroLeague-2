# Feature: Standings breakdowns mobile layout

**From build-plan:** feature 31d-ii
**Build attempt:** 1
**Branch:** feature/standings-breakdowns-mobile-layout
**Status:** verified

## Goal

Make the three breakdown views of the Standings page (`/:season/standings`, Table mode, the Breakdown select: Streaks and form, Winning margins, Ahead/behind) usable from 320px up, with the same table behaviour 31d-i gave the Overview table: the rank and the crest stay pinned on the left, a short club name stands in below `sm`, and swiping the stats sideways narrows the team column to the crest alone in step with the finger (the "scroll behaviour", requested for this item). Today the three views hold six tables that scroll sideways under a pinned team name only up to 1100px, with the rank column dropped below 720px, a full club name that eats most of a phone screen, and no collapse. After this item, below `xl` (1280px) each breakdown table behaves like the Overview table, and every legend, panel header and chart fits at 320px. From `xl` up the views look as they do today.

Layout only: no API, data or feature changes.

## Design reference

Current code (measure in step 1 before changing anything, the numbers below are expectations, not measurements):

- `index.css` has `.breakdown-table` rules in `max-width` media queries: a sticky second column up to 1100px and the rank column hidden up to 720px. Those two queries are the "720 and 1100px rules" the build plan says move to the two breaks.
- Six tables use `className="table breakdown-table"` inside a plain `overflow-x-auto` div: Streaks and form (1), Winning margins (3: margins, expected wins, what wins games), Ahead/behind (2: quarters, time in front). All use `PositionCell` then `ClubCell` as the first two columns, with no short name.
- Wide cells: the results ribbon (`min-width: 12rem`), the margin strip chart, the record bars (`4.3rem`), the state bar (`8.5rem`), quarter cells (`4.6rem` to `7.5rem`).
- Ahead/behind also has a grid of game-shape cards (`minmax(215px, 1fr)`) and legends (`.breakdown-legend`) above each view; the select sits in a wrapping row above the table.
- 31d-i already built the reusable pieces for the Overview table: `ScrollingTable` (writes `--collapse` from the scroll position, `COLLAPSE_DISTANCE`) in `StandingsTable.jsx`; `.standings-table` rules in `index.css` for the pinned rank and team, the narrow team column, the corner Q badge, the clipped name and its fade; the short-name map built in `StandingsPage.jsx` and passed to `StandingsTable`; `ClubCell` takes an optional `shortName`.

Targets: at 320px the first screen of each table shows the pinned rank and crest with short name, then the first stats; after a short swipe the name is gone and only the crest remains; the legends wrap, the panel headers fit, the game-shape cards fit one column, and no page scrolls sideways. At 1280px and wider nothing changes.

## In scope

- **Shared scrolling wrapper.** Move `ScrollingTable` out of `StandingsTable.jsx` into its own small module in `frontend/src/standings/` and use it for the Overview table and all six breakdown tables (replacing their plain scroll divs). Same behaviour and `COLLAPSE_DISTANCE`.
- **Shared pinned-column CSS.** The pinned rank and team rules from 31d-i (sticky columns, `--pin-rank`, `--pin-team`, `--collapse`, the name's fixed width and fade, the "Team" header fade, the corner Q badge, the tighter cell padding) move to a shared class (`pinned-table`) that the Overview table and the breakdown tables both carry. The Overview-only parts (GP hidden, the first stat's left padding, the 12px stat text) stay on `.standings-table`. The Overview table must render exactly as it does now: verified against its computed widths and the existing 31d-i spec.
- **Short names.** The six breakdown tables get `shortNames` through `StandingsTable` and pass each club's short name to `ClubCell`, so the full name shows from `sm` and the short name below, with the full name as the link's accessible name (the same contract as 31d-i). Full names show while the teams list loads or fails.
- **Retire the old rules.** The `max-width: 1100px` sticky rule and the `max-width: 720px` rank-hiding rule for `.breakdown-table` are removed; the pinning follows the shared rules (below `xl`, by the two project breaks) instead of those two widths. A breakdown table that still overflows its box at 1280px keeps pinning there: step 1 measures each table's width at 1280 and 1440px and the pinning breakpoint is set from that (the rule is "pinned wherever the table scrolls", reset only where the table fits).
- **Collapse on scroll.** The same continuous collapse as 31d-i below `sm`: the team column narrows with the swipe to the crest alone and the name fades. It is not applied from `sm`. The collapsed table must still overflow its box (the 31d-i overflow reasoning), and a table that cannot overflow by enough settles at a partial collapse, never oscillates; step 4 samples each table.
- **Cells and legends at 320px.** Measure first, then fix only what clips or overflows: the legends (`.breakdown-legend` wraps already; check the sentence), the panel headers, the Breakdown select row, the record bars, the state bar and quarter cells, the margin strip and form line, the game-shape cards (one column when the box is narrower than 215px), and the footnotes.
- **Playwright spec.** A breakdowns layout spec (below). The page-scroll spec already covers the page.

## Out of scope

- The Overview table and KPI strip (31d-i, done: no behaviour change), Race (31d-iii), Advanced standings (31d-iv), Advanced Explained (31d-v).
- Changing which statistics a breakdown shows, sorting, row cards, a column chooser, or restyling the charts and bars beyond what 320px needs.
- Any backend or API change, a different `sm`, `lg` or `xl` break, a new dependency, adding the spec to Verify or CI.
- The Breakdown select's placement (it already wraps), unless it clips at 320px.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (one review packet after all steps, no pause per step) and `workflow.checkpointCommits` is `disabled` (no step commits). `/complete` makes the single feature commit. Each step leaves the app working and ends with its Done when.

## Build steps

- [x] **1. Measure the current state.** No code change. On `/2026/standings` and `/2025/standings` (Q badges), for each of the three breakdown views at 320, 390, 768, 1024, 1279, 1280 and 1440px: each table's width against its box, the first screen at rest, what the legends, headers and cards do, and any page-level sideways scroll. Write the findings in this step's Result line, including which tables still overflow at 1280px.
  Result (measured on `/2026/standings` and `/2025/standings`, headless browser): at 1280 and 1440px every table exactly fills its box (the widest natural width at 1279px or below is 1157px, so every table fits from about 1200px); so pinning below `xl` is correct and no table needs it at `xl`. At 320px the tables are 633 to 1018px wide in a 278px box (the box scrolls, not the page: no page-level sideways scroll at any width). Nothing else clips at 320px: the legends wrap, the panel headers and the Breakdown select fit, and the game-shape cards (a sub-tab of Ahead/behind, "Shape of a typical game") sit in one column. So step 5 needed no change. Ahead/behind has two sub-tabs (net points per quarter, shape of a typical game), which the spec's six tables count as two tables (quarters and time in front).
  **Done when:** the Result line lists, per table, its width at 1280 and 1440px and every element that clips at 320px.

- [x] **2. Share the wrapper and the pinned-column CSS.** New module for `ScrollingTable`; `StandingsTable.jsx` and the three breakdown views use it; the pinned rules move to the shared `pinned-table` class carried by the Overview table (no visible change) and by the breakdown tables (they pick it up here); the two old `.breakdown-table` media rules are removed. The breakdown tables get the pinned, narrow rank and the collapsing team column.
  **Done when:** `cd frontend && npm run lint` and `npm run build` pass. `standings-table-layout.spec.js` still passes unchanged. In a browser on `/2026/standings`, for each breakdown view at 320 and 390px, the first two cells of every row are sticky, the rank and crest stay at the left edge after scrolling 300px, and nothing shows through them; the Overview table's computed widths at 320, 390, 768 and 1280px match the measurements from before this step.

- [x] **3. Short names in the breakdown tables.** `StandingsTable.jsx` passes `shortNames` into `StreaksFormView`, `MarginsView` and `AheadBehindView`, which pass `shortName` to every `ClubCell`.
  **Done when:** lint and build pass. In a browser, below 640px every club in all six tables shows its short name (never longer than the full name), from 640px the full name; each link's accessible name is the full club name at both widths; with the teams request blocked the tables render full names and no error appears; no short name splits across lines (checked per word on two seasons at 320px).

- [x] **4. Collapse and the first screen at 320px.** Verify and tune the collapse for each table: the team column narrows with the swipe and ends at the crest, a table that cannot overflow enough settles without oscillating, and the first stats are readable at rest. Tighten cell padding only where step 1 showed something clipped.
  **Done when:** lint and build pass. For each of the six tables on both seasons at 320, 390 and 500px, swept over scroll positions 0, 18, 36, 80 and the maximum: the team width is monotonic in the scroll position, the name's opacity goes from 1 to 0, the crest stays inside its cell, more stat columns show when collapsed, scrolling back to 0 restores the name and width, and two readings taken 150ms apart at each position agree (no oscillation). From 640px the team column does not collapse.

- [x] **5. Legends, headers and cards fit at 320px.** Fix only what step 1 listed: legend wrapping, panel headers, the select row, the game-shape cards in one column, the bars and quarter cells inside their cells.
  Result: nothing clipped (see step 1); one change after review: the Streaks and form headers "Longest W" and "Longest L" (one-digit columns) are renamed "W streak" and "L streak" (the tooltips still say "Longest winning streak" and "Longest losing streak") and may wrap to two lines, which takes about 40px off each column. Second review round: the other long headers wrap too (`wrap-head`: "Biggest win" and "Biggest loss" stack, as do the Time in front and half-time headers); below `sm` the expected-wins table drops its dot chart (and the dot-chart paragraph) for Wins, Expected and a coloured Diff column, the chart returning from `sm`; the results ribbon and the margin strip are 11.5rem wide below `sm` (bars share that width) so a whole season fits between the pinned crest and the edge at 320px, the time-in-front bar already does (136px). Third review round: the two wide visuals that sat first among the stats looked wrong during the first 36px of a swipe (the collapse moves them), so they moved: in Winning margins "Season, game by game" now follows Avg loss (after Avg margin, Avg win and Avg loss, before Biggest win and Biggest loss, the extremes it shows), and in Ahead/behind "Time leading / tied / trailing" now follows Biggest lead (after Lead changes and Biggest lead, before the half-time records). A table that barely overflows no longer collapses at all (`ScrollingTable` leaves `--collapse` at 0 when the overflow without the collapse is under 122px, 86px of shrink plus the 36px distance): the expected-wins table at 320px used to stop half way with a half-faded name and then jump. Scroll snapping to a column was tried on paper and rejected: the team column changes width as it is swiped, so snap points would move under the finger and loop; confirmed again after the changes with the page-overflow check in the new spec.
  **Done when:** lint and build pass. At 320 and 390px on both seasons the page does not scroll sideways in any of the three views (the Standings entry of the page-scroll spec still passes), every legend and panel header is fully visible, and no card or control extends past the viewport.

- [x] **6. Breakdowns layout spec and regression pass.** `frontend/e2e/standings-breakdowns-layout.spec.js`: for each breakdown view, loading the page once and resizing through the widths: sticky first two cells, the collapse partway and at the end and its restore, short against full names and accessible names, the teams-blocked fallback, no page overflow at 320 and 390px, and unpinned (or still fitting) at 1280px and wider as step 1 decided. Screenshots of each view at 320, 390, 768 and 1280px for the review. A full lint, build and browser-suite run.
  **Done when:** `cd frontend && npx playwright test e2e/standings-breakdowns-layout.spec.js e2e/standings-table-layout.spec.js e2e/responsive.spec.js` passes; lint and both builds pass; the full `npm run test:browser` passes or any failure is explained and traced to this change; nothing outside the files listed below changed.

## Files / areas

- `frontend/src/standings/StandingsTable.jsx`, `StreaksFormView.jsx`, `MarginsView.jsx`, `AheadBehindView.jsx`, a new shared wrapper module, and possibly `RecordBar.jsx`, `standingsCells.jsx` if a cell clips
- `frontend/src/index.css` (the pinned-column rules made shared, the `.breakdown-table` media rules removed, any 320px fixes for the bars and cards)
- `frontend/e2e/standings-breakdowns-layout.spec.js` (new); `standings-table-layout.spec.js` only if the shared class renaming needs a selector update
- Not changed: the backend, `frontend/src/lib/api.js`, the Overview table's behaviour, Race, Advanced standings and every other page.

## Data / contracts

- No API, database or persisted-data change. No new dependency. The short names come from the existing teams list (`getSeasonTeams`, key `["teams", seasonCode]`), already read by `StandingsPage` and passed to `StandingsTable`.
- Breakpoints: `sm` 40rem, `lg` 64rem, `xl` 80rem. The collapse runs below `sm` only, for the reason recorded in 31d-i (a collapsed table narrower than its box would stop scrolling and jump).
- Accessibility: the tables stay real `<table>`s; sticky cells keep a visible fill; each club link's accessible name is the full club name at every width; the results ribbon, state bars and quarter cells keep their existing labels.
- CSS order matters (unlayered CSS outranks Tailwind utilities; equal specificity goes to the later rule), so the shared pinned rules must sit before the breakpoint overrides that reset them.

## Testing

- Playwright browser spec (step 6) following the 31c/31d-i pattern: one page load per test, resized through the widths. There is no unit test command; browser tests are evidence, not part of Verify.
- The existing specs for Standings (`standings-table-layout`, `responsive`, the page-scroll spec, `progressive-disclosure`, `team-stats-null`) must keep passing.

## Notes for the AI

- Reuse what 31d-i built; do not copy the Overview CSS under a second name. If the shared class needs the Overview-only rules split, keep the Overview table pixel-identical.
- No em or en dashes in generated content (the existing "—" empty-cell marker in the views stays as it is).
- Do not touch the 31d-iii to 31d-v views. Measure before fixing; change only what clips.
- Phones are not available for testing: say that motion was checked by sampling scroll positions in a headless browser, not by hand.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":15767,"specSha256":"e633431fbaa609aabdd661f2cc42e4fef1e6c04d5951c8881a29144d0c141dc4","branch":"refs/heads/feature/standings-breakdowns-mobile-layout","head":"331539abb2f0fa7ff343c0654d832ff83515993c","baseRef":"refs/heads/master","baseCommit":"331539abb2f0fa7ff343c0654d832ff83515993c","sourceTree":"3f33bef22a20d17578de0e7ec1d9357cfab99d1b","absentOptional":[]} -->
