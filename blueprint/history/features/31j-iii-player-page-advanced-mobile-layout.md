# Feature: Player page Advanced mobile layout

**From build-plan:** feature 31j-iii
**Build attempt:** 1
**Branch:** feature/player-page-advanced-mobile-layout
**Status:** verified

## Goal

Make the **Advanced** tab of the player page (`/:season/players/:personKey`) comfortable from 320px up: the scope strip, the scorecard (six stat cards with a gauge against the league), the "How to read these numbers" guide, the round-by-round ratings chart, the on/off cards and the RAPM bars. No sideways page scroll, nothing clipped, no word of a label cut mid-word. Layout and label only: no API, data or feature change. Mobile is below 640px (unprefixed styles), tablet is `sm` (640px), desktop is `lg` (1024px); `xl` stays.

This is the third of four parts of 31j: 31j-i (header, tabs and Overview) and 31j-ii (Season by season and Statistics) are done; 31j-iv (Shooting and Games) follows. The overflow spec (`responsive.spec.js`) opens the Overview tab only; it does not see this tab.

Read, not yet measured at 320px (step 1 measures it):

- `PlayerAdvancedSection.jsx`: a scope `TabStrip` (Regular season / All games / Postseason, `level={2}`, `w-fit`, not `scrolling`) over four sections in a `flex-col gap-8` stack. `Scorecard` is a header, a one-sentence summary, six `ScoreCard`s in `grid gap-3 md:grid-cols-2 xl:grid-cols-3` (no explicit column count below `md`, which is the trap that sized a one-column grid to its widest content in 31j-i and 31j-ii), a games-and-minutes line and a `ReadingGuide` (`<details>` with a verdict pill list and a `md:grid-cols-2` definitions list). `md:` is a breakpoint this project retires (31 uses `sm` and `lg`). A `ScoreCard` is `p-4`: label and verdict pill on one line, a `text-4xl` figure, an `AdvancedGauge`, the verdict line, and a paragraph of explanation.
- `AdvancedGauge.jsx`: a seven-zone track with a marker, and three absolutely positioned captions under it at 10%, 50% and 90% of the track (`-translate-x-1/2`, `whitespace-nowrap`), for example "−0.200 / 10th pct". They are not measured against the card's width.
- `RoundTrend`: a second `TabStrip` (PER, Win Shares, WS / 40, USG%, `w-fit`, not `scrolling`) in a `flex-wrap` row with a note, then the shared `TrendChart` (`comparisons/TrendChart.jsx`: a Chart.js line chart `h-64` in a `Panel p-4` with a `p-2` inner box, and a "Show the round-by-round numbers" `<details>` holding a table in its own scroll box). `TrendChart` is also used by the Compare, Season overview and Team pages, so it is not restyled here.
- `OnOffCard`: a `Panel p-4` with a `flex-wrap` header (crest and club name, then a `text-3xl` net rating with a verdict pill and a caption), an "On court · N min / Off court · N min" two-column caption, two `ComparisonRow`s (which already have an opt-in `compact` prop) and a paragraph. Cards sit in `grid gap-3 xl:grid-cols-2` when the player was traded.
- `RapmSection` / `ImpactBar`: rows of `grid-cols-[6rem_1fr_4rem]` (label, a centred bar, the value) and a scale caption row on the same grid whose middle cell holds "−2 worse / 0 / better +2" on one line. At 320px the middle track is about 80px wide, narrower than that caption.
- Existing pieces to reuse: `TabStrip`'s `scrolling` prop, `ComparisonRow`'s `compact` prop, `HeaderTip`, `findBrokenWords` in `e2e/support/layout.js`, the `veteranPlayer` helper in `e2e/support/player.js`, and the patching approach of `player-statistics-layout.spec.js` (patch a live response, or fulfil a mocked one).

Targets: at 320px the page does not scroll sideways; every card holds its content and its gauge captions are not cut off or on top of each other; both strips are one row; the scale caption under the RAPM bars is whole; the chart fits its panel; the on/off cards keep the net rating, the caption and the two rows readable.

## In scope

1. **Scope strip.** The scope strip is `scrolling` (one row below `lg`, the active tab kept on screen); from `lg` it looks as today.
2. **Scorecard grid.** `md:grid-cols-2` becomes `sm:grid-cols-2`, with an explicit one-column (`grid-cols-1`) below `sm` so a card is never sized by its widest content; `xl:grid-cols-3` stays. A card holds its content at 320px: the label and verdict pill share a line when they fit and wrap by whole words when they do not, the figure and the verdict line (for example "Better than most · 12th of 219 · league median 14.2") wrap by whole words, and the explanation paragraph wraps.
3. **Gauge captions.** The three captions under a gauge (10th percentile, median, 90th percentile) stay readable and inside the card at 320px: no caption is clipped by the card edge or overlaps its neighbour (shorter text such as "10th" and "50th"/"median" below `sm`, or a smaller size, whichever the measurement needs, with the same meaning kept for screen readers; the gauge already has an `aria-label`).
4. **Reading guide.** The "How to read these numbers" panel holds its content at 320px: the pill list wraps, the definitions list is one column below `sm` (`md:grid-cols-2` becomes `sm:grid-cols-2`).
5. **Round-by-round chart.** The rating strip (PER, Win Shares, WS / 40, USG%) is `scrolling` and the note under or beside it wraps; the chart (the shared `TrendChart`) fits its panel at 320px and is not restyled for other pages: if its panel padding or height needs a phone rule, it is an opt-in prop with today's default. The "Show the round-by-round numbers" table scrolls inside its own box. The chart is checked after a resize (it redraws a moment later).
6. **On/off cards.** At 320px the header (crest and club name, the net rating, the verdict pill and the caption) stacks cleanly instead of squeezing: the net rating sits under the club name, left-aligned, on a phone; from `sm` it is as today. The "On court / Off court" caption and the two `ComparisonRow`s (`compact`) hold their content, and the explanation paragraph wraps. A traded player's two cards stack (one column below `xl`, as today). The "Sample too small to show" card fits.
7. **RAPM.** An `ImpactBar` row at 320px keeps its label, its bar and its value on one line with a bar that is still readable (a narrower label and value column below `sm`, for example `grid-cols-[4.5rem_1fr_3.25rem]`, if the measurement needs it); the scale caption under the bars ("−2 worse", "0", "better +2") is whole and aligned with the bars' track, not cut off; the header line (the caption and the verdict pill with the rank) wraps; the explanation paragraph wraps.
8. **Breakpoints.** Only `sm` and `lg` (and the existing `xl`) are used on this tab after the change; no `md:` or stray media query remains in `PlayerAdvancedSection.jsx`.
9. **States.** Check, and fix only what clips: the tab's loading and error states and "Advanced stats are not available yet for this player." (with and without the RAPM section under it) at 320px; the early-season warning note; a scope with no on/off ("No on/off data for this scope."); a sample too small for on/off or RAPM; a player not ranked ("Not ranked: under N minutes played."); a scope with fewer than two rounds ("Not enough rounds yet to chart a trend."); a traded player with two on/off cards; a long club name in an on/off header; a player with no RAPM ("No RAPM estimate for this player.").
10. **Browser check.** A new Playwright spec (see Testing); no change to `responsive.spec.js` unless the tab needs adding there.

## Out of scope

- The other tabs: Overview (31j-i), Season by season and Statistics (31j-ii), Shooting and Games (31j-iv), and the player data they share.
- What the tab says: the panels, their order, the numbers, ranks, verdict words, explanations and copy are unchanged. No statistic is hidden on a phone, no new control.
- Any API, data, query or routing change; the verdict thresholds and the minimum-sample rules; the TV code (the on/off header shows the club's name as the data gives it, and a long one wraps).
- Restyling the shared `TrendChart`, `ComparisonRow`, `HeaderTip`, `TabStrip`, `Panel` or `PanelHeader` beyond opt-in props and a new `scrolling` use. Shared components used by other pages keep their look there (the memory note on scoping a change to the page being built).

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the narrow check after each, run the final gate once at the end, then present one review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Measure, then the scope strip, scorecard and reading guide.** Open the tab at 320, 390 and 639px with a veteran player (and the live data), take screenshots, and note what clips (write the findings under "Built as" at the end, correcting the assumptions above where they are wrong). Then scope items 1, 2, 3 and 4. Start `frontend/e2e/player-advanced-layout.spec.js` with the strip, the scorecard and the guide at 320, 390, 639, 640, 768, 1023 and 1024px. *Done when:* at 320px the scope strip is one row with the active tab on screen, the six cards hold their content with whole gauge captions, the guide fits, the page does not scroll sideways, the scorecard is one column below 640px and two from 640px (three from 1280px), and the new spec passes at all widths.
- [x] 2. **Round-by-round chart and on/off.** Scope items 5 and 6. *Done when:* at 320px the rating strip is one row, the chart fits its panel (also after a resize from 1280px), the round-by-round table scrolls in its own box, the on/off header stacks with the net rating under the club name, the two rows and captions hold their content, a traded player's two cards stack, and the spec covers each at 320, 390, 639, 640 and 1024px.
- [x] 3. **RAPM, states and final gate.** Scope items 7, 8 and 9: the RAPM rows and scale caption, the states mocked and checked at 320px. Then `cd frontend && npx playwright test player-advanced-layout.spec.js player-career-layout.spec.js player-statistics-layout.spec.js player-overview-layout.spec.js responsive.spec.js detail-back-links.spec.js smoke.spec.js`, `cd frontend && npm run lint` and root `npm run build`. *Done when:* the RAPM caption is whole and aligned, every state fits at 320px, and all of these pass.

## Files / areas

- `frontend/src/players/PlayerAdvancedSection.jsx` (scope strip, scorecard grid, guide, rating strip, on/off cards, RAPM rows), `AdvancedGauge.jsx` (captions).
- `frontend/src/comparisons/TrendChart.jsx`: only an opt-in prop with today's default, and only if the chart needs a phone rule.
- `frontend/src/index.css`: only if a rule cannot be written as utilities (unlayered rules outrank utilities).
- `frontend/e2e/player-advanced-layout.spec.js` (new).
- `TabStrip.scrolling`, `ComparisonRow.compact`, `findBrokenWords` and `veteranPlayer` are reused, not changed.

## Data / contracts

None. Reads the existing `GET /api/seasons/:seasonCode/players/:personKey/advanced?scope=` response: `scopes`, `scope`, `rounds[]` (`round`, `per`, `winShares`, `winSharesPer40`, `usgPct`, `gamesPlayed`, `secondsPlayed`), `onOff[]` (per club: `clubCode`, `clubName`, `crestUrl`, `onSeconds`, `offSeconds`, `onOrtg`, `offOrtg`, `onDrtg`, `offDrtg`, `ortgDiff`, `drtgDiff`, `netRatingDiff`), `rapm` (`rapm`, `offense`, `defense`, `seconds`, `possessionsOffense`, `possessionsDefense`), `ranks` (per stat: `rank`, `of`, `percentile`, `spread` with `p10`, `p50`, `p90`, `minMinutes`), `earlySeason` and `roundsPlayed`. `NULL` or a missing value means unavailable: the figure shows "—", never zero.

## Testing

No unit test runner is configured. Browser tests are opt-in evidence (`cd frontend && npx playwright test <file>`; Playwright starts its own servers). `player-advanced-layout.spec.js` loads the page once per test and resizes through 320, 390, 639, 640, 768, 1023 and 1024px, using the live data for a veteran player and patching or fulfilling the advanced response for the states (no on/off, small sample, no RAPM, one round, a traded player with two on/off cards, an early-season note, a long club name, an unranked player). It checks: the scope and rating strips on one row with the selected tab visible and arrow keys moving between tabs, the scorecard columns per width (1 below 640px, 2 from 640px, 3 from 1280px as a separate check), every card's content inside its card, the gauge captions inside the card and not overlapping each other, no cut-off word in the card labels and verdict lines (`findBrokenWords`), the reading guide's content inside its panel, the chart canvas inside its panel before and after a resize, the round-by-round table in its own scroll box, the on/off header stacking below 640px, the RAPM scale caption whole and inside the panel, the document not wider than the window, and the states at 320px. A screenshot of the tab at 320px is looked at during steps 1 to 3. Nothing here proves how it looks in the user's browser; the final packet will say so.

Verify: no `Verify` command is declared in `AGENTS.md`, so none was run while writing this spec. The final gate is `cd frontend && npm run lint` plus root `npm run build`, with the Playwright files in step 3.

## Notes for the AI

- Follow the user's rules: scope changes to the page being built, shared components only get opt-in props, and the TV code is the short label wherever a full name does not fit (memory notes on page scope and TV codes).
- Every one-column `grid` here gets `grid-cols-1`; 31j-i and 31j-ii each found a stretched page from a one-column grid sized by a chart or a wide card.
- The user judges layouts by how they look, and has asked for compact, centred or reordered arrangements after seeing screenshots: take screenshots at 320px, and if an arrangement is a real design choice (the gauge captions, the on/off header, the RAPM rows), say so and offer `/prototype` before settling it.
- Match the surrounding code style and comment density; no Co-Authored-By or AI attribution in the commit message (AGENTS.md).

## Built as

- Measured at 320px with a veteran player (screenshots; on/off and RAPM were also viewed with a patched response, because the live player's on/off sample was too small to show a card). The page was 320px wide and the scorecard, its gauge captions, the rating chart and the on/off cards already fitted; the one real clip was the RAPM scale caption ("−2 worse", "0", "better +2" on one line in a track about 80px wide, which overlapped).
- RAPM: the rows and the scale caption use `grid-cols-[4.5rem_1fr_3.25rem]` below `sm` (the bar is about 116px instead of 80px) and `sm:grid-cols-[6rem_1fr_4rem]` from `sm`; below `sm` the caption reads "−2", "0", "+2" (the words "worse" and "better" are hidden there, the caption is `aria-hidden` as before).
- The scope strip and the rating strip are `scrolling`. The scorecard grid is `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3` (was `md:grid-cols-2`), the reading-guide definitions `grid-cols-1 sm:grid-cols-2` (was `md:`), the on/off grid has `grid-cols-1`, the on/off rows are `compact` (the existing opt-in prop), and the net rating is left-aligned (it wraps under the club name on a phone) and right-aligned from `sm`. No `md:` is left in `PlayerAdvancedSection.jsx`.
- Scope item 3 (gauge captions) needed no change: the captions are inside their card and do not overlap at 320px; the spec checks that. The shared `TrendChart` and `AdvancedGauge` are untouched.
- On/off header: at 639px there is room for the net rating beside the club name, so it is under the name at 320 and 390px and beside it from 639px, not at exactly 640px; the spec asserts it under at 390px and below, and beside from 640px.
- Changed at the user's request after seeing it: the RAPM section's early-season note was inside the card, close against the "Points per 100 possessions..." caption; it now sits above the card, like the note above the on/off cards, so the two sections look alike.
- Checks run: `player-advanced-layout.spec.js` (3 passed), and with `player-career-layout.spec.js`, `player-statistics-layout.spec.js`, `player-overview-layout.spec.js`, `players-layout.spec.js`, `responsive.spec.js`, `detail-back-links.spec.js` and `smoke.spec.js` 136 passed in all, `cd frontend && npm run lint`, root `npm run build`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":16193,"specSha256":"b01e3ed20a81f97616915711f5536b08b22a8340fb1b4779088ca1b4646c2306","branch":"refs/heads/feature/player-page-advanced-mobile-layout","head":"3185fa494114049e83519bc559ddaec7ae52cc34","baseRef":"refs/heads/master","baseCommit":"3185fa494114049e83519bc559ddaec7ae52cc34","sourceTree":"da849c5bd5c6985830c32073573fde199bfa2b8b","absentOptional":[]} -->
