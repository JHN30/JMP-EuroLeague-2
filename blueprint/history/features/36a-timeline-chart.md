# Feature: Timeline chart

**From build-plan:** feature 36a
**Build attempt:** 1
**Status:** verified
**Branch:** feature/timeline-chart

## Goal

On `/:season/records`, replace the two side-by-side panels "Record progression" and "Best in each season" with one
full-width timeline chart over every season that has a record for the chosen metric: a bar per season best, a step
line for the all-time record as it stood after each season, the seasons that set a record highlighted, a tooltip
with the holder, and a click through to the holder in that season. The per-season list stays reachable as an
accessible list under a disclosure. Frontend only: the records routes already send `bySeason` and `progression`.

## In scope

- **One timeline panel** (`PanelHeader` kicker `TIMELINE`, title `Best of each season`) in place of the
  `Progression` and `BestOfEachSeason` grid in `RecordsContent`. The Podium above and the Top 50 below are unchanged.
- **A summary line** under the title, from the two lists: the record that stands and its holder and season, and how
  many times it was set since the first season ("Record: 802, Kendrick Nunn, 2024-25. Set 7 times since 2000-01.").
  The count is the number of `progression` entries. This replaces the information of the removed progression list.
- **Chart (Chart.js, already installed)**, a bar chart with a line dataset on top:
  - **x axis:** every season from the first to the last season in `bySeason`, in order, labelled with
    `formatSeasonLabel`. A season in that range with no row (for example PER in a season with no qualified player)
    keeps its slot with no bar, so a gap reads as a gap.
  - **Bars:** each season's best (`bySeason` value). Seasons that hold a `progression` entry use the theme's
    primary color; the others a muted base-content mix.
  - **Step line:** the standing record after each season, from `progression`: the value of the last entry whose
    season is at or before that season (Chart.js `stepped`). Points shown only on record-setting seasons.
  - **Tooltip:** season, holder name, the second line (club, or "vs" opponent for team games), the value with the
    metric label, the game date for game records, and for a record-setting season "New record" with the gain over
    the record before it ("First record" for the first entry). Values use the row's own `format` (decimals for
    advanced metrics).
  - **Click through:** clicking a bar opens that row's `to` (the player or club in that season) with React Router.
    Pointer cursor over bars. Only on devices with hover (`(hover: hover)` through `useMediaQuery`); on touch a tap
    shows the tooltip and does not navigate, and the list under the disclosure is the way to the holder.
  - **Legend:** a small HTML legend under the chart (Season best, Record-setting season, Standing record), so the
    highlight is not told by color alone; the Chart.js legend is off.
  - **Theme:** colors from theme variables through `themeColor` and re-built on theme change with `useActiveTheme`
    (`frontend/src/lib/useActiveTheme.js`), as `TrendChart.jsx` does.
  - **Reduced motion:** Chart.js animation off when `usePrefersReducedMotion()` is true.
  - **Accessible name:** the canvas has `role="img"` and an `aria-label` naming the metric, the season range and the
    record (value, holder, season).
- **Disclosure** under the chart: a `<details>` whose summary reads "Show every season (N)", closed by default. Inside,
  the existing best-of-each-season list markup (season, holder with its link, value, the "Record" badge on the overall
  record), without its own panel and heading, plus a marker on record-setting seasons: "New record +gain" or
  "First record". Below `sm` it keeps the current two-line row layout.
- **Sizes:** chart height fixed by its wrapper (about 18rem from `sm`, 14rem below), no horizontal page scroll at 320,
  390, 768, 1024 and 1280px; tick labels auto-skip with no rotation.
- **States:** loading, error and "No records are available for this metric." stay as they are in `RecordsPage.jsx`
  (the timeline only renders with at least one record). While the next metric loads, the timeline stays on screen
  dimmed with the rest of the panel, as now.

## Out of scope

- The Totals / Per game choice (36b) and the record book landing (36c).
- Any backend or API change. `progression` stays in the response as is.
- Changes to the Podium, the Top 50, the tab strips or the address.

## Build loop

`workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`: build both steps, then one review packet.
`/complete` makes the commit. The build-plan and overview edits for item 36, still uncommitted on `master`, go with
this feature's commit.

## Build steps

- [x] 1. **Timeline panel** - `RecordTimeline.jsx` with the chart, summary line, legend and disclosure list; the
  pure data shaping (season slots, standing-record line, record-setting seasons with their gains) as small helpers in
  `recordData.js`; `RecordsPage.jsx` renders it instead of the two panels; `Progression` and the panel wrapper of
  `BestOfEachSeason` go from `RecordParts.jsx` (the list markup is kept for the disclosure).
  Done when: on `/2026/records` Player seasons, Points, the chart shows 27 bars from 2000-01 to 2026-27 with seven
  highlighted (2000-01, 2001-02, 2015-16, 2016-17, 2017-18, 2023-24, 2024-25) and the step line ending at 802; the
  tooltip on 2024-25 names Kendrick Nunn with "New record +43"; clicking that bar opens `/2024/players/<key>`;
  Player seasons, PER shows its gap seasons empty; light and dark themes both read; `npm run lint` and
  `npm run build` pass.
- [x] 2. **Browser specs** - `records.spec.js`: the timeline's accessible name, the summary line, the disclosure
  closed then open with the four mocked seasons in order, the markers ("First record", "+300", "+80", "+40") and one
  "Record" badge, and the old progression and best-in-each-season headings gone; the reduced-motion test still
  passes. `records-layout.spec.js`: the timeline panel and the open disclosure fit at every width, including the
  27-season long-name mock at 320px.
  Done when: `npx playwright test records.spec.js records-layout.spec.js responsive.spec.js` passes with
  `/api/health` reporting `"target":"local"`.

## Files / areas

- `frontend/src/records/RecordTimeline.jsx` (new) - the timeline panel.
- `frontend/src/records/RecordsPage.jsx` - `RecordsContent` renders the timeline.
- `frontend/src/records/RecordParts.jsx` - `Progression` removed; the best-of-each-season list kept for the disclosure.
- `frontend/src/records/recordData.js` - `withGains` replaced or reused by the timeline helpers.
- `frontend/src/lib/useActiveTheme.js`, `useMediaQuery.js`, `usePrefersReducedMotion.js`, `format.js` - reused.
- `frontend/e2e/records.spec.js`, `frontend/e2e/records-layout.spec.js`.

## Data / contracts

- Input per records response (unchanged): `records`, `bySeason` (one best row per season, oldest first),
  `progression` (opens with the first season's best, then every row that beat the standing record, oldest first;
  strictly increasing), each row described by `describeRecord` (`seasonCode`, `season`, `value`, `valueText`,
  `format`, `name`, `line`, `to`, `date`, `key`).
- Season slots: from the first to the last `bySeason` season code, one per year (`E2000` ... `E2026`; codes are `E`
  plus the starting year). Helpers are pure and take the described rows.
- A record-setting season is a season with at least one `progression` entry. Its gain is the season's last entry
  value minus the standing record at the end of the season before (null for the first season).

## Testing

- No unit test runner is configured, so the helpers are covered through the browser specs on mocked data.
- Browser tests (Playwright, local target only) as in step 2. The chart's own drawing and the click through are
  checked by screenshots and by hand in step 1; the specs do not read pixels on the canvas.

## Notes for the AI

- Follow `TrendChart.jsx` for creating and destroying the Chart.js instance in an effect and theming it; import from
  `chart.js/auto` as the other charts do.
- Club labels below `sm` use the TV code (`short` on `Holder`), as the list does now.
- No em dashes in copy or comments. Keep comments to the why.
- The gap seasons come from codes, not from a season list request: no new request.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8398,"specSha256":"bd1ed685498f27e0911f3f9ac229bedf63c63a036867733aad02339c455b2ba7","branch":"refs/heads/feature/timeline-chart","head":"01d9a0a5100cd4f7e029bbcc1ab884c925081820","baseRef":"refs/heads/master","baseCommit":"01d9a0a5100cd4f7e029bbcc1ab884c925081820","sourceTree":"7c17e63fbaf04e422e57c267f5eaae0ba4de8ed0","absentOptional":[]} -->
