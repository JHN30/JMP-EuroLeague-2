# Fix: Shared chart theme

**Type:** Fix
**Status:** verified
**Branch:** fix/shared-chart-theme

## The problem

Nine chart components each read the theme and style themselves, so the charts drift from each other and from the
rest of the site (design plan step 2, after the typography fix):

- **Wrong font.** No chart sets a font, so every chart draws in Chart.js's default (Helvetica, which is Arial on
  Windows), while the site is now Inter. `gameFlow.jsx` hard-codes `700 18px system-ui` for its in-chart club codes.
- **Drifting colour mixes.**
  - Gridlines use the text colour at 14% (TrendCharts), 15% (RecordTimeline, RatingsChart), 20% (CompareRadar,
    PlayerCareerCharts, PlayerOverviewSection, SeasonOverviewPage, HeadToHeadPage) or 30% dashed (gameFlow).
  - Area fills use 14%, 15%, 18% or 25%.
- **Copied radar setup.** CompareRadar, PlayerCareerCharts and PlayerOverviewSection carry the same `r` scale
  (`stepSize: 25`, ticks, grid, angle lines, point labels).
- **Duplicated theme reading.** `HeadToHeadPage.jsx:56` has its own copy of `useActiveTheme`, and reads
  `getComputedStyle` three times by hand instead of `themeColor()`.
- **Unthemed tooltips.** Every tooltip is Chart.js's default near-black box in both themes, with no border and the
  default font. It looks foreign in the light theme.

## The fix

One small module of chart styles, used by every chart. Each chart keeps its own data, callbacks, plugins and layout.

**`lib/chartSetup.js` (global defaults, set once where the components are registered):**

- **Font:** `Chart.defaults.font.family` is the site's Inter stack, so ticks, legends and tooltips match the page.
  Read it from the body's computed `font-family`, so it can never drift from `index.css`.
- **Text colour:** `Chart.defaults.color` stays per chart, because it depends on the theme. Each chart passes the
  colour from the helper below.
- **Font loading:** Inter loads with `font-display: swap`, so a chart drawn before the font arrives would keep the
  fallback font. On `document.fonts` `loadingdone`, update every `Chart.instances` entry once.

**`lib/chartTheme.js` (new, next to `useActiveTheme.js`):**

- `chartTheme(canvas)` returns the resolved colours:
  - `text`, `primary`, `secondary`, `accent`, `success`, `error`
  - `grid`: text at 15%
  - `strongGrid`: text at 55% (a zero line, a phase divider)
  - `faint`: text at 25% (non-record bars)
  - `fill(colour)`: colour at 15% (an area under a line)
  - `radarFill(colour)`: colour at 20% (two radars overlap)
- `axis(theme, extra)` returns `{ ticks: { color }, grid: { color } }` merged with a chart's own options.
- `radarScale(theme)` returns the shared `r` scale.
- `tooltip(theme)` returns the shared tooltip style. A chart spreads its own `callbacks` over it.
  - base-100 background, base-content text, a 1px base-300 border
  - the Inter stack, a 6px radius and 8px padding
- Use the existing `themeColor` and `useActiveTheme` from `lib/useActiveTheme.js`. Delete the copy in
  `HeadToHeadPage.jsx`.

**Charts to move onto it:**

| File | Chart |
|---|---|
| `comparisons/CompareRadar.jsx` | radar |
| `players/PlayerCareerCharts.jsx` | radar |
| `players/PlayerOverviewSection.jsx` | radar |
| `comparisons/TrendCharts.jsx` | line and margin bars |
| `comparisons/HeadToHeadPage.jsx` | margin bars |
| `games/gameFlow.jsx` | lead bars and plugin |
| `records/RecordTimeline.jsx` | record bars and line |
| `season/SeasonOverviewPage.jsx` | scoring line and phase divider |
| `teams/RatingsChart.jsx` | rating lines |

Specific cases:

- **`gameFlow.jsx`:**
  - The grid becomes `grid` with its dash kept. Raise it to `strongGrid`'s 30% mix only if the dashed line becomes
    invisible.
  - Its plugin's club codes use the display face, `700 18px` plus the `--font-display` stack. They are scoreboard
    labels.
- **`SeasonOverviewPage.jsx`:** its divider plugin already reads `Chart.defaults.font.family`. Keep that.
- **`RatingsChart.jsx`:** its 70% defence line and its success/error fills at 28% are meaningful series colours.
  They stay as they are.
- **Chart-specific opacities** that encode meaning (rolling averages at 40%, the 90% lead bars) stay. Only gridlines,
  generic area fills, tick/legend text and tooltips are unified.

**Must not break:**

- every chart's data, tooltip text (its callbacks), legend behaviour, aria-label and height
- re-colouring on a theme switch (charts are rebuilt when `useActiveTheme` changes)
- `chart.js` tree-shaking: register nothing new
- No new dependency.

## Build steps

1. [x] **Defaults and the helper.**
   - Add the Inter default and the font-load update to `chartSetup.js`.
   - Add `lib/chartTheme.js`.
   - Move the three radar charts onto it.
   - **Done when:** the build passes, and the player Overview radar shows Inter labels and a themed tooltip in both
     themes.
2. [x] **The other six charts.**
   - Move TrendCharts, HeadToHeadPage (and delete its `useActiveTheme` copy), gameFlow, RecordTimeline,
     SeasonOverviewPage and RatingsChart onto the helper.
   - **Done when:**
     - no chart file builds its own `color-mix(... ${text} N%` for a grid, and only `chartTheme.js` defines the grid
       mix
     - `getComputedStyle` appears in no chart component
     - every tooltip spreads `tooltip(theme)`

## Verify

- `cd frontend && npm run lint` and `npm run build` pass.
- Browser specs for the chart pages (local DB, `/api/health` says `"target":"local"`): the compare, head-to-head,
  game flow, player overview/career, records, overview and team advanced specs. Run the full suite if the shared
  setup touches more.
- Screenshots of each chart in both themes:
  - every label is in Inter
  - gridlines look alike from chart to chart
  - a hovered tooltip matches the panel style in light and dark


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5807,"specSha256":"b628054c0c5ea03f08745675cc12c7b66e6b842e800acdd154066d0ac28d617b","branch":"refs/heads/fix/shared-chart-theme","head":"b4834d72c6f3fbdcb87925f504c18adb06765cd5","baseRef":"refs/heads/master","baseCommit":"b4834d72c6f3fbdcb87925f504c18adb06765cd5","sourceTree":"0c76f790df1c610ec5dab6a68ac011f137d681d3","absentOptional":[]} -->
