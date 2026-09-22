# Feature: Chart conventions

**From build-plan:** feature 15g
**Build attempt:** 1
**Branch:** `feature/chart-conventions`
**Expected archive:** `blueprint/history/features/15g-chart-conventions.md`
**Status:** verified — awaiting feature review

## Goal

Bring every current data visualization into the shared chart convention: theme-aware colours, readable axes, accessible descriptions and point details, responsive chart wells, and thinned labels where the chart has an x-axis.

## Design reference

`UI-UX.md` sections 2.2 and 8.6: charts use theme tokens, low-opacity `currentColor` axes/gridlines, descriptive image roles, native point tooltips, first/last-preserving label thinning, fluid sizing, and an inset bordered well. The build-plan explicitly keeps Chart.js only where it already exists and retains inline SVG for sparklines and table bars.

## In scope

- Update the existing Chart.js comparison trend chart to use the shared label-thinning helper, explicit per-point tooltip interaction, current-theme axis/grid/legend colours, and an inset well.
- Apply responsive well, SVG `title` tooltip, non-scaling stroke, and theme-token conventions to the dashboard leader trend, team profile trend, and standings table sparkline.
- Keep the statistics in-row bar visualization responsive and theme-token-driven; retain its value in the table as the accessible equivalent rather than turning it into a separate chart.
- Add proportionate browser coverage for stable chart accessibility and reachability, without repairing unrelated known-stale browser selectors.

## Out of scope

- New chart types, routes, API requests, data enrichment, animation, or playback controls.
- Rebuilding Chart.js views as SVG, adding another charting library, or changing the existing data-series semantics.
- Future charts planned under features 16 and 17.
- Reworking ordinary decorative SVG icons.

## Build loop

Complete the steps in order. Run focused browser evidence for the changed chart route when it can make stable assertions, then run `cd frontend && npm run lint` and `cd frontend && npm run build` once after all steps. Present one feature-level review packet; checkpoints are disabled and `/complete` owns the final commit.

## Build steps

- [x] **1. Normalize the Chart.js trend surface.**
  - Areas: `frontend/src/comparisons/TrendChart.jsx`, `frontend/src/lib/chartHelpers.js` if the existing helper needs a narrow extension.
  - Reuse `thinAxisLabels` to retain the first and last labels while limiting dense x-axes; make Chart.js point tooltips explicit; retain theme-change observation and derive all displayed colours from current theme tokens.
  - Wrap the canvas in the established inset-well utility pattern, retaining responsive sizing and its descriptive canvas label.
  - **Done when:** a comparison trend keeps its endpoint round labels, exposes an individual data-point tooltip, re-renders after a theme change without fixed grey/orange colours, and cannot overflow its panel horizontally.

- [x] **2. Standardize the inline SVG trend views.**
  - Areas: `frontend/src/dashboard/LeaderTrend.jsx`, `frontend/src/teams/TeamTrendChart.jsx`, `frontend/src/standings/StandingsTable.jsx`, `frontend/src/index.css`.
  - Put the dashboard/team trend graphics in bordered inset wells; preserve their current data and empty states.
  - Add native SVG titles for plotted data points, `vectorEffect="non-scaling-stroke"` where line weight matters, and token/current-colour-derived axis or baseline treatments; keep existing descriptive image labels.
  - Preserve the standings sparkline's compact table-cell form and its status-direction colour semantics.
  - **Done when:** every non-decorative inline SVG chart has a descriptive image label and point-level title data, remains legible in both themes, and scales without horizontal overflow or distorted strokes.

- [x] **3. Confirm in-row bars and browser-visible chart behavior.**
  - Areas: `frontend/src/statistics/StatBarCell.jsx`, `frontend/src/statistics/statBarScale.js` only if a small presentational correction is necessary, `frontend/e2e/`.
  - Keep bar values exposed through their existing table cells and headers; ensure the visual bar remains a token-driven background enhancement, not the sole carrier of the value.
  - Add or extend a focused Playwright scenario only for stable chart roles, labels, or theme/reachability behavior introduced here. Do not modify the pre-existing stale-selector specs.
  - **Done when:** leaderboard values remain readable without the bar, focused browser evidence reaches a changed chart and asserts its accessible label or equivalent data state, and lint/build remain green.

## Files / areas

- `frontend/src/comparisons/TrendChart.jsx` — the sole existing Chart.js chart.
- `frontend/src/dashboard/LeaderTrend.jsx` and `frontend/src/teams/TeamTrendChart.jsx` — full-width inline SVG trends.
- `frontend/src/standings/StandingsTable.jsx` — compact standings sparkline.
- `frontend/src/statistics/StatBarCell.jsx`, `frontend/src/statistics/statBarScale.js` — in-table stat visualization.
- `frontend/src/lib/chartHelpers.js` and `frontend/src/index.css` — existing chart helper and chart styling.
- `frontend/e2e/` — targeted browser evidence, if stable against mocked data.

## Data / contracts

No backend, request, URL, or persisted-data contract changes. Existing chart props and data-series shapes remain intact. The frontend continues to use Chart.js only in `TrendChart`; inline SVG remains the implementation for trends/sparklines, and CSS bars remain table visualizations.

## Testing

- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm run test:browser -- <focused-chart-spec>` when the added/updated focused spec is in place.
- Manually verify the comparison trend after changing the theme, the team/dashboard trend tooltips, and a standings sparkline at narrow viewport width.

## Notes for the AI

- Use CSS variables and current colour; do not hard-code hex chart colours or add a charting dependency.
- Keep the `Panel` hierarchy and the documented inline inset-well utility pattern rather than adding a speculative chart framework.
- A canvas uses Chart.js tooltip behavior; SVG points use native `<title>` elements. Do not add a positioned custom tooltip layer.
- Preserve existing loading, error, and empty states; this is a rendering-convention pass, not a data-behavior change.

<!-- blueprint:completion {"schemaVersion":1,"specBytes":6462,"specSha256":"fffd0461722408f5b02691f08856ad007e5a81210690f3d4bc5c69a685039b7a","branch":"refs/heads/feature/chart-conventions","head":"ae47e5dd6bfba408521dc8d93606509091bdd4b1","baseRef":"refs/heads/master","baseCommit":"ae47e5dd6bfba408521dc8d93606509091bdd4b1","sourceTree":"dbb0c0eb284703a792377ba99a084194cad4a2db","absentOptional":[]} -->
