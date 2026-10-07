# Feature: Advanced Explained mobile layout

**From build-plan:** feature 31d-v
**Build attempt:** 1
**Branch:** feature/advanced-explained-mobile-layout
**Status:** verified

## Goal

Make the Explained view of the Standings page's Advanced mode (`/:season/standings`, the Advanced tab, the Explained view: the Example team select, and the long explainer of every statistic with its worked example and picture) readable from 320px up. Today it is a two-column table, "Statistic" beside "What it tells you", with the name column fixed at 14rem; on a phone that leaves a sliver for the text. As asked in review, after this item, below `sm` (640px) each statistic is a stacked block: the statistic (its name, its short label and its formula) on top, and the explanation (what it measures, why it exists, how to read it, the example) and then its picture underneath, all at the full width of the screen. From `sm` up the view looks as it does today. This is the last item of 31d.

Layout only: no API, data or feature changes, and no change to the explainer text.

## Design reference

Current code (step 1 measures it before anything is changed; the numbers here are from reading the code):

- `AdvancedExplainedView.jsx` renders a `table.explained-table` (inside an `overflow-x-auto` div) with a header row (Statistic, What it tells you), section rows (`tr.explained-section`, one `td colSpan=2` with the section title and intro) and one row per statistic: `td.explained-name` (a `div.explained-name-stack`: the name, an abbreviation badge, the formula in a `code`) and a second `td` holding `div.explained-body` with `div.explained-text` (four paragraphs) and `div.explained-visual` (the picture).
- `index.css` has the `.explained-*` rules: the name column is `width: 14rem`; `.explained-body` is a wrapping flex row with the text at `flex: 1 1 20rem` and the picture at `flex: 0 1 21rem; min-width: 15rem`; `.explained-svg` is `width: 100%; max-width: 22rem`; `.waffle` is 9.5rem wide.
- `explainedVisuals.jsx` has the pictures: `DotStrip` (a 320x66 viewBox scaled to its box), `Waffle`, `ShotGrid`, `ScaleBars`, `DivergingBars`, `Dumbbells`. The page passes the selected team and the whole league to each row's `example` and `visual` functions.
- The Example team select and its note are in a wrapping row above the table. The scope tabs, the Round select and the view tabs above them are shared with the other Advanced views (31d-iv, done).
- The table is a real `<table>`. Making its rows `display: block` below `sm` removes its table semantics in some browsers (the accessibility tree flattens), so the stacked layout must keep the content in reading order, and the "Statistic" and "What it tells you" header labels, which no longer line up with anything, are hidden visually below `sm` only.

Targets: at 320px every statistic is one block, name and formula first, then the four paragraphs, then the picture, with no sideways scroll inside or outside the table; every picture fits the width; the Example team select and its note fit; the page never scrolls sideways; at 640px and wider nothing changes.

## In scope

- **Stacked rows below `sm`.** The explained table's rows become blocks below `sm` (the header row is hidden visually; section rows span the full width; each statistic's two cells stack, the statistic cell first, then the explanation cell), using the plain `.explained-*` classes in `index.css` with `min-width` media queries (stacked is the unprefixed base, the current table layout returns from `sm`). The name column's fixed 14rem width applies from `sm` only. The text and the picture stack inside the explanation cell (the picture under the text, full width) below `sm`.
- **Pictures at 320px.** Measure first, then fix only what clips or overflows: the `DotStrip`, `ScaleBars`, `Dumbbells` and `DivergingBars` SVGs scale to the box, the `Waffle` and `ShotGrid` fit, and captions wrap.
- **Controls at 320px.** The Example team select (club names are long) and its note fit inside the screen; the note wraps under the select.
- **Playwright spec.** An Explained layout spec (below). The page-scroll spec already covers the page.

## Out of scope

- The explainer text, the order or number of statistics, the pictures' design, and the Example team behaviour.
- The other Advanced views, the scope tabs, the Round select and the view tabs (31d-iv, done).
- Any backend or API change, a different `sm`, `lg` or `xl` break, a new dependency, adding the spec to Verify or CI.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (one review packet after all steps, no pause per step) and `workflow.checkpointCommits` is `disabled` (no step commits). `/complete` makes the single feature commit. Each step leaves the app working and ends with its Done when.

## Build steps

- [x] **1. Measure the current state.** No code change. On `/2026/standings` and `/2025/standings` (Advanced, then Explained) at 320, 390, 639, 640, 768, 1024 and 1280px: the table's width against its box, the width left for the text beside the 14rem name column, the width and overflow of each kind of picture (DotStrip, Waffle, ShotGrid, ScaleBars, Dumbbells, DivergingBars), the Example team select and its note, and any page-level sideways scroll. Write the findings in this step's Result line.
  Result (measured headless, both seasons): at 320px the table is 384px wide in a 278px box (338px at 390) and the text column is 240px wide beside the 14rem name column; ten pictures reach past the box (the picture column has a 15rem minimum width), which is why the view scrolled sideways inside its box; the page itself never scrolls sideways. From 640px the table fills its box and nothing overflows (text 316px at 640, 572px at 1280). The Example team select ends at 149px (2026) and 156px (2025) at 320px, inside the viewport. The pictures themselves (DotStrip, Waffle, ShotGrid, ScaleBars, Dumbbells, DivergingBars) scale to their box, so no change to them was needed.
  **Done when:** the Result line lists the table and text widths at 320 and 390px and every picture or control that clips.

- [x] **2. Stack the rows below `sm`.** `index.css` (the `.explained-*` rules) and, only if a rule cannot do it, `AdvancedExplainedView.jsx` (a class on the table or its rows). Below `sm` the header row is hidden visually and the explained rows stack as described; from `sm` the table is as today.
  Built in `index.css` only: the unprefixed rules make the table, body, rows and cells blocks, hide the header group by clipping it to one pixel, and stack the text and the picture (`flex-direction: column`, the picture `min-width: 0`); a `min-width: 40rem` block restores the table display values, the 14rem name column, and the wrapping row of text and picture.
  **Done when:** `cd frontend && npm run lint` and `npm run build` pass. In a browser on `/2026/standings` and `/2025/standings` (Advanced, Explained) at 320 and 390px: for every statistic the name block is above the explanation block (its top is below the name block's bottom), both start at the table's left edge and are as wide as the table, the table has no sideways scroll (`scrollWidth` does not exceed `clientWidth`), the header labels are not visible, and each section title spans the full width; at 640px and wider the name block is to the left of the explanation (the row layout is unchanged: the name column is 14rem) and the header labels are visible.

- [x] **3. Pictures and controls fit at 320px.** Fix only what step 1 listed.
  Result: nothing to change (see step 1): once the rows stack, every picture is inside the table at 320 and 390px (the widest ends at 262px in a 278px table), and the select fits.
  **Done when:** lint and build pass. At 320 and 390px every picture is inside its block (its right edge is within the table's), no caption or paragraph is cut off, the Example team select and its note are fully inside the viewport, and the page does not scroll sideways (the Standings entry of the page-scroll spec still passes); the picture sizes at 640px and wider match the committed code.

- [x] **4. Explained layout spec and regression pass.** `frontend/e2e/standings-explained-layout.spec.js`: loading the Explained view once and resizing through 320, 390, 639, 640, 768 and 1280px: stacked below 640px and as a table from it for every statistic (all rows, not just the first), the header labels hidden and shown, no sideways scroll in or around the table, every picture inside its block, the select inside the viewport, and the page overflow check. Screenshots of the view at 320, 390, 768 and 1280px for the review. A full lint, build and browser-suite run.
  **Done when:** `cd frontend && npx playwright test e2e/standings-explained-layout.spec.js e2e/standings-advanced-layout.spec.js e2e/responsive.spec.js` passes; lint and both builds pass; the full `npm run test:browser` passes or any failure is explained and traced to this change; nothing outside the files listed below changed.

## Files / areas

- `frontend/src/index.css` (the `.explained-*` rules only)
- `frontend/src/standings/AdvancedExplainedView.jsx` and `explainedVisuals.jsx` only if a picture or the markup needs a change that CSS cannot make
- `frontend/e2e/standings-explained-layout.spec.js` (new)
- Not changed: the backend, `frontend/src/lib/api.js`, the explainer text, the other Advanced and Standings views, and every other page.

## Data / contracts

- No API, database or persisted-data change. No new dependency. The explainer reads the same advanced-standings data as the other Advanced views.
- Breakpoints: `sm` 40rem (the stack is the base layout and the table returns at `sm`, a mobile-first order); `lg` and `xl` are not used here.
- Accessibility: the content stays in reading order (name, label, formula, then the four paragraphs, then the picture); the visually hidden header keeps its text for assistive technology (clipped, not `display: none`); each picture keeps its `role="img"` and label; the Example team select keeps its label.
- CSS order matters (unlayered CSS outranks Tailwind utilities; equal specificity goes to the later rule), so the `sm` rules that restore the table layout must come after the stacked base rules.

## Testing

- Playwright browser spec (step 4) following the 31c to 31d-iv pattern: one page load per test, resized through the widths. There is no unit test command; browser tests are evidence, not part of Verify.
- The existing Standings specs (`standings-advanced-layout`, `standings-table-layout`, `standings-breakdowns-layout`, `standings-race-layout`, `responsive`, the page-scroll spec) must keep passing.

## Notes for the AI

- Phones are not available for testing: say that the layout was checked by driving the page in a headless browser, not by hand.
- No em or en dashes in generated content you add (the existing explainer text, which uses them, is not edited).
- Measure before fixing; change only what clips. Do not edit the explainer text.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11083,"specSha256":"57515e745e2437f8f98c7ce8b8fb06b160613fae57aa4fe453e34b2fb31e28a5","branch":"refs/heads/feature/advanced-explained-mobile-layout","head":"d65a5513c83378ade33368a136b55c1f09fbf474","baseRef":"refs/heads/master","baseCommit":"d65a5513c83378ade33368a136b55c1f09fbf474","sourceTree":"3ed5b940c715a336762ff37c6cb77c8165d31895","absentOptional":[]} -->
