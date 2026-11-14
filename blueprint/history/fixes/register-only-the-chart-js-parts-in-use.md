# Fix: Register only the Chart.js parts in use

**Type:** Fix
**Status:** verified
**Branch:** fix/register-only-the-chart-js-parts-in-use

## The problem

All 10 chart modules import `chart.js/auto`, which registers every controller, element, scale and plugin Chart.js
ships (about 202 KB, 68 KB gzipped). The app draws only a few chart kinds, so most of that code is never used:

- [CompareRadar.jsx](frontend/src/comparisons/CompareRadar.jsx), [HeadToHeadPage.jsx](frontend/src/comparisons/HeadToHeadPage.jsx),
  [TrendChart.jsx](frontend/src/comparisons/TrendChart.jsx), [TrendCharts.jsx](frontend/src/comparisons/TrendCharts.jsx)
- [gameFlow.jsx](frontend/src/games/gameFlow.jsx)
- [PlayerCareerCharts.jsx](frontend/src/players/PlayerCareerCharts.jsx), [PlayerOverviewSection.jsx](frontend/src/players/PlayerOverviewSection.jsx)
- [RecordTimeline.jsx](frontend/src/records/RecordTimeline.jsx)
- [SeasonOverviewPage.jsx](frontend/src/season/SeasonOverviewPage.jsx)
- [RatingsChart.jsx](frontend/src/teams/RatingsChart.jsx)

A first scan shows line, bar and radar charts; category, linear and radial-linear scales; and the tooltip, legend,
title, subtitle and filler (`fill:`) plugins. `gameFlow.jsx` also passes inline `plugins: [...]`, which need no
registration.

## The fix

- Add one shared module, `frontend/src/lib/chartSetup.js`, that imports `Chart` and the used controllers, elements,
  scales and plugins from `chart.js`, calls `Chart.register(...)` once, and exports `Chart`.
- Switch all 10 imports from `chart.js/auto` to it.
- Before registering, confirm each chart's config against the list above: chart `type`s, every scale `type` (including
  any `time` or `logarithmic`), `fill`, `title`/`subtitle`, `decimation`, and the element kinds each chart draws (lines,
  points, bars, arcs). Register exactly what is used, nothing more.

No new dependency. Must not break: any chart's look, tooltips, legends, fills, axis titles or animation, in both
themes. A missing registration shows as a console error such as `"x" is not a registered scale`.

## Build steps

1. [x] **Shared Chart.js setup.** Add `chartSetup.js` and switch the 10 imports.
   Done when: `cd frontend && npm run lint` and `npm run build` pass; the built chart chunk is smaller than before
   (record gzip sizes before and after); every chart renders with no console errors.
   Result: chart chunk 202.2 KB / 68.2 KB gzip (`auto`) → 179.4 KB / 61.4 KB gzip (`chartSetup`), about 10%. Chart.js core is
   most of it; the unused time and logarithmic scale classes stay in the chunk as dead code because the bundler keeps
   classes with static fields. Every chart page draws with no console errors on the local DB.

## Verify

- Note the chart chunk's gzip size from `cd frontend && npm run build` on `master`, then again after the change.
- With `/api/health` reporting `"target":"local"`, open every page that draws a chart and check the charts and
  the console: Overview (scoring trend), a game page (flow chart), a player page (overview radar and career charts),
  a team page (ratings chart), team and player compare pages (radar and trend charts), head-to-head, and Records
  (timeline). Check hover tooltips, legends and filled areas in both themes.
- Playwright: the specs for those pages only, not the full suite.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3309,"specSha256":"c73763138e061f989b50a256fe70bc1acd603b41c957deca1d86bef2faeefa6d","branch":"refs/heads/fix/register-only-the-chart-js-parts-in-use","head":"7461ddd9294d81dbb21f6c7a1175f27b20dd26ea","baseRef":"refs/heads/master","baseCommit":"7461ddd9294d81dbb21f6c7a1175f27b20dd26ea","sourceTree":"a5d24414ed7fa25cd5df6f2e20203a97dba186d1","absentOptional":[]} -->
