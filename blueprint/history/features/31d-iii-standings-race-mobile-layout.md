# Feature: Standings race mobile layout

**From build-plan:** feature 31d-iii
**Build attempt:** 1
**Branch:** feature/standings-race-mobile-layout
**Status:** verified

## Goal

Make the Standings page's Race mode (`/:season/standings`, the Race tab: the insight cards, the legend, the playback controls, the bump chart and the snapshot table) usable from 320px up. Two things were reported: the snapshot table does not fit the screen, and the race chart is too big for a phone. After this item, below `sm` (640px) the snapshot table fits its box with no sideways scroll at 320px (tighter cells, short club names), and the race chart is built for a narrow screen: it scrolls sideways inside its own box instead of squeezing every round into 270px, it follows the round being shown, its crests and rows are smaller, its position numbers stay in view, and a portrait phone gets a one-line hint that landscape gives a wider chart. From `sm` the Race looks as it does today.

Layout only: no API, data or feature changes.

## Design reference

Current code (step 1 measures it before anything is changed; the numbers here are from reading the code):

- `RaceChart.jsx` draws an SVG as wide as its box. The x axis gives every played round an equal share of that width: a 34-round regular season in a 270px plot is about 8px per round. The height is `max(390, (teams + 1) * 50)` plus margins, so an 18-club table is about 980px tall. Every club has a crest circle of 19px radius (38px across) at the round being shown, and a line with a dot in every round.
- `RaceSnapshotTable.jsx` is a plain `table` in a `panel overflow-x-auto`: `#`, `Team` (full name, `max-w-40 truncate`), `W-L`, `Move`, with the default daisyUI cell padding. The standings table already gets short names from the teams list (`getSeasonTeams`, `abbreviatedName`), built in `StandingsPage.jsx`, but `RaceView` is not given them.
- `RaceView.jsx` stacks the insight cards (`grid-cols-2 sm:grid-cols-4`), the legend, `RacePlayback` (a wrapping row with a Play button, a range `max-w-xs`, labels and a badge), and a grid of chart and table that is one column below `lg`.
- Clicking a crest, a dot or a table row focuses that club (`focusedClub`); the chart has a "Team focus" select. Focus dims every other club.
- The race has no mobile-specific behaviour and no Playwright coverage of its layout (`postseason.spec.js` mentions it only in passing).

Options considered for the chart (decided below):

| Option | Verdict |
| --- | --- |
| Tell users to use landscape | Costs nothing but leaves the chart unusable for most phone users: kept as a hint, not the whole answer |
| Squeeze the same chart into the width | 8px per round, 38px crests on a 270px plot: spaghetti. Rejected |
| Scroll the chart sideways inside its box, smaller crests and rows, follow the round shown | Keeps the real chart; the race is a left-to-right story, so scrolling suits it. Chosen |
| Replace the chart with something else on phones (a heat grid, or the table only) | A different feature; not decided here |

Targets: at 320px the snapshot table's four columns fit with no scroll and the names are whole words or short names; the chart box scrolls sideways, keeps the latest shown round in view while the race plays or the slider moves, and the page itself never scrolls sideways; at 640px and wider nothing changes.

## In scope

- **Snapshot table below `sm`.** Short names (the same short-name map as the standings table, passed `StandingsPage` to `RaceView` to `RaceSnapshotTable`, the full name as the link's accessible name, full names while the teams list loads or fails), a smaller crest and tighter cell padding so `#`, `Team`, `W-L` and `Move` fit a 278px box at 320px without sideways scroll. From `sm` the table is as today (full names, default padding).
- **Race chart below `sm`.** The chart gets a minimum width per round, so it is wider than its box and the box scrolls sideways (`overflow-x-auto`, `overscroll-x-contain`); crest radius and row height are smaller (so an 18-club chart is well under today's ~980px); the position axis (1 to N) stays visible at the left while the rounds scroll; and the box scrolls to keep the crest column of the round being shown in view when the slider moves or the race plays (a smooth scroll, instant when the user prefers reduced motion). Above `sm` the chart is as wide as its box, as today.
- **Landscape hint.** Below `sm`, in portrait only, a one-line muted note by the chart: turning the phone sideways gives a wider chart. It is hidden in landscape and from `sm`.
- **Controls, cards and legend at 320px.** Measure first, then fix only what clips: the playback row (Play button, slider, labels, badge), the Team focus select, the legend, and the four insight cards (two columns below `sm`).
- **Playwright spec.** A Race layout spec (below). The page-scroll spec already covers the page.

## Out of scope

- Replacing the bump chart with a different visualisation on phones, or changing which clubs or rounds it shows.
- Changing what the cards, the table or the slider mean, adding sorting, or a pinned team column in the snapshot table (it should fit; pinning is for the wide tables).
- Advanced standings (31d-iv) and Advanced Explained (31d-v); the Overview and breakdown tables (done).
- Any backend or API change, a different `sm`, `lg` or `xl` break, a new dependency, adding the spec to Verify or CI.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (one review packet after all steps, no pause per step) and `workflow.checkpointCommits` is `disabled` (no step commits). `/complete` makes the single feature commit. Each step leaves the app working and ends with its Done when.

## Build steps

- [x] **1. Measure the current state.** No code change. On `/2026/standings` and `/2025/standings` (the Race tab; the regular season is the phase with the most rounds) at 320, 390, 639, 640, 768, 1024 and 1280px: the chart's width and height, the table's width against its box, what the cards, legend, playback row and Team focus select do, and any page-level sideways scroll. Write the findings in this step's Result line.
  Result (measured headless, both seasons): the chart SVG is as wide as its box (278px at 320, 338px at 390) and 1,082px tall for 20 clubs; the snapshot table is 395px wide in a 294px box at 320px and 354px at 390px (so it scrolled), and, found while measuring, also 395px in a 218px box at 1024px (the `lg` two-column grid gives the table a third of 932px) so it overflowed from 1024 to about 1270px as well; at 1280px it fits (396px box). The cards, legend, playback row and Team focus select stay inside the viewport at 320 and 390px (rightmost edge 308px at 320), and the page never scrolls sideways. So step 4 needed no change. The overflow at `lg` widened the table work: the tight cells and short names apply below `sm` and from `lg` to below `xl` (the side column), and the `lg` grid is `minmax(0,1fr) 22rem` (the chart takes the rest) with the old 2fr/1fr from `xl`; at 1024px the table is 334px in a 350px box.
  **Done when:** the Result line lists the chart and table sizes at 320 and 390px and every element that clips.

- [x] **2. Short names and tighter cells in the snapshot table.** `StandingsPage.jsx` passes `shortNames` to `RaceView`, which passes it to `RaceSnapshotTable`; the table shows the short name below `sm` (full name from `sm`, full name as the link's accessible name), with a 1.25rem crest and tighter padding below `sm`.
  **Done when:** `cd frontend && npm run lint` and `npm run build` pass. In a browser on `/2026/standings` (Race) and `/2025/standings` (Race) at 320 and 390px the table has no sideways scroll (its `scrollWidth` does not exceed its box), all four headers are fully visible, no short name is split across lines (checked per word), and each link's accessible name is the full club name; from 640px the full names show and the table's computed cell padding matches the committed code; with the teams request blocked the table shows full names, truncated, and no error appears.

- [x] **3. A race chart built for a narrow screen.** `RaceChart.jsx` and `index.css` as needed: below `sm` a minimum width per round (so the plot is wider than its box and scrolls), smaller crests and row height, a position axis that stays at the left while the rounds scroll, and the scroll-to-follow of the round shown. The hint line below `sm` in portrait. The focus, click and animation behaviour stays as it is.
  Built: below `sm` the chart keeps 22px per round (a 38-round season is 860px wide in a 252px box), 12px crests, 30px rows (662px tall for 20 clubs), and a separate 26px strip for the position numbers beside the scroll box; the box follows the shown round (the first run jumps to the latest round, later steps glide, instantly under reduced motion) and is a labelled, focusable region. The hint is a `race-hint` paragraph shown only below `sm` in portrait.
  **Done when:** lint and build pass. In a browser at 320 and 390px the chart's box scrolls sideways (its `scrollWidth` exceeds its `clientWidth`) while the page does not; the chart is shorter than 700px for an 18-club season; the position numbers stay in view while the box is scrolled to its far end; moving the slider to the first and then the last round brings that round's crest column into the visible part of the box; the Team focus select and a crest tap still focus a club; the hint is visible in portrait and not in landscape (320x640 and 600x320 viewports); at 640px and wider the chart is as wide as its box with no inner scroll and the hint is not shown.

- [x] **4. Controls, cards and legend fit at 320px.** Fix only what step 1 listed.
  Result: nothing to fix (see step 1); the new spec checks the slider, the Team focus select and the legend stay inside the viewport.
  **Done when:** lint and build pass. At 320 and 390px on both seasons every control and card is fully visible and nothing extends past the viewport; the page does not scroll sideways in the Race tab (the Standings entry of the page-scroll spec still passes).

- [x] **5. Race layout spec and regression pass.** `frontend/e2e/standings-race-layout.spec.js`: loading the Race tab once and resizing through 320, 390, 768, 1024 and 1280px: the table fits and shows short names below 640px and full names from it; the chart's inner scroll and the follow-the-round behaviour below 640px and none from it; the hint visibility by width and orientation; the controls and cards inside the viewport; no page overflow; the teams-blocked fallback. A full lint, build and browser-suite run.
  **Done when:** `cd frontend && npx playwright test e2e/standings-race-layout.spec.js e2e/standings-table-layout.spec.js e2e/standings-breakdowns-layout.spec.js e2e/responsive.spec.js` passes; lint and both builds pass; the full `npm run test:browser` passes or any failure is explained and traced to this change; nothing outside the files listed below changed.

- [x] **6. Crests on the insight cards (requested after the first review).** The four Race insight cards (Leader, Biggest climber, Most consistent, Most time in contention) showed only text at every width, although each club has a crest. `RaceInsightCards.jsx` puts the club's crest (2.25rem, 2.5rem from `sm`) on each card: above the label below `sm` (beside it, a 36px crest did not fit the 133px cards at 320px, caught by the page-overflow check) and at the top right beside the label from `sm`; hidden if the image fails to load. Not a mobile error, so it also applies on desktop.
  **Done when:** lint and build pass. In a browser at 390 and 1280px each of the four cards shows a loaded crest, the cards still fit two or four across with no sideways scroll, and the new spec test passes.

## Files / areas

- `frontend/src/standings/RaceChart.jsx`, `RaceSnapshotTable.jsx`, `RaceView.jsx`, `StandingsPage.jsx` (pass the short names), `RaceInsightCards.jsx` (the crests), and possibly `RacePlayback.jsx` if step 1 shows it clips
- `frontend/src/index.css` (the narrow-screen chart and table rules, the hint)
- `frontend/e2e/standings-race-layout.spec.js` (new)
- Not changed: the backend, `frontend/src/lib/api.js`, the Overview and breakdown tables, Advanced standings and every other page.

## Data / contracts

- No API, database or persisted-data change. No new dependency. The short names come from the existing teams list (`getSeasonTeams`, key `["teams", seasonCode]`), already read by `StandingsPage`.
- Breakpoints: `sm` 40rem, `lg` 64rem. The chart's narrow behaviour is below `sm`; from `sm` its width and height are today's.
- Accessibility: the chart stays an `img`-role SVG with its label; crests and dots keep their titles and click-to-focus; the table stays a real `<table>` with full-name accessible links; the scrolling box is keyboard reachable (`tabIndex={0}` and a label), because a scrollable region needs it; the follow-scroll respects `prefers-reduced-motion` (the existing `usePrefersReducedMotion`).
- The chart's SVG size comes from `useElementWidth`. With a minimum width per round the SVG width is `max(box width, rounds * per-round width + margins)`, so the measured element must be the scroll box (not the SVG that grows inside it).

## Testing

- Playwright browser spec (step 5) following the 31c to 31d-ii pattern: one page load per test, resized through the widths. There is no unit test command; browser tests are evidence, not part of Verify.
- The existing Standings specs (`standings-table-layout`, `standings-breakdowns-layout`, `responsive`, the page-scroll spec, `progressive-disclosure`, `team-stats-null`) must keep passing.

## Notes for the AI

- Phones are not available for testing: say that scrolling and following were checked by driving the page in a headless browser, not by hand.
- No em or en dashes in generated content.
- Measure before fixing; change only what clips. Do not touch Advanced standings (31d-iv, 31d-v).
- If the scrolling chart does not read well at 320px (for example the lines are unreadable even with the focus select), say so with screenshots in the review packet and propose the next option rather than shipping it silently.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":14301,"specSha256":"7fc964aec51eda14533796e9adba0bb98db38d6df1c1c04c05207bb70f341331","branch":"refs/heads/feature/standings-race-mobile-layout","head":"97eca1aafb782ac5ecc3e1745c59a3c362d245d8","baseRef":"refs/heads/master","baseCommit":"97eca1aafb782ac5ecc3e1745c59a3c362d245d8","sourceTree":"2367c1e870dfe0e8be91220cc11e137665a42517","absentOptional":[]} -->
