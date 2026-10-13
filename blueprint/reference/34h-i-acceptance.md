# Feature 34h-i: grouped standings and race acceptance

## Scope and evidence boundary

Verified on 2026-10-13 against the running local API and frontend. `/api/health`
reported `target: local` before every browser run and the final matrix read.
No real `.env`, direct SQL, pipeline command, database mutation, Neon request,
production import, push or deployment was involved.

This leaf adapts the Standings page's official Table, traditional breakdowns,
group-local KPIs and Race for E2012-E2015. It does not complete grouped-era
postseason mappings, qualifying support or the other pages' adaptation.

## Observed local matrix

| Season | RS groups / clubs per group | RS source rounds / final GP | TS groups / clubs per group | TS source rounds / final GP | Source qualified flags, RS / TS |
| --- | --- | --- | --- | --- | --- |
| E2012 | A-D / 6 | 1-10 / 10 | E-F / 8 | 11-24 / 14 | 0 / 0 |
| E2013 | A-D / 6 | 1-10 / 10 | E-F / 8 | 11-24 / 14 | 0 / 0 |
| E2014 | A-D / 6 | 1-10 / 10 | E-F / 8 | 11-24 / 14 | 0 / 0 |
| E2015 | A-D / 6 | 1-10 / 10 | E-F / 8 | 11-24 / 14 | 16 / 8 |

Existing endpoints provide latest standings, all available historical snapshots,
phase-scoped round numbers/names and format rules. The focused matrix checks
all 96 available snapshots: 10 RS and 14 TS rounds in each of four seasons.
Each snapshot has the expected group cohort, with positions bounded by its own
six- or eight-club group. Latest positions are 1 through the group's size.
The records and order are read from the stored official standings, not
reconstructed from scores or cross-group comparisons.

RS round names run Round 1 through Round 10. TS round names run Round 1 through
Round 14 while their source keys remain 11 through 24. These names drive race
playback, chart labels/tooltips and snapshot headings; the original keys drive
API requests and query caches.

## Resulting behavior

- Default Table and Race show separately labelled group sections. An accessible
  native Group select can show one group, with `phase` and exact source
  `groupName` in the Standings URL. All-groups selection omits `group`.
- Group selection survives refresh and back/forward navigation. Phase changes
  clear the old group, season selection clears query state, invalid/repeated
  groups canonicalize safely, and loading/failure retains a valid shared URL.
  Rapid native type-ahead ignores repeat events targeting the same current URL.
- Each group's latest table, Home/Away/Last 10 views, traditional breakdowns,
  leaders, qualification cutoff, movement and best net-rating KPI use that
  group's clubs. Multiple group leaders are never collapsed into one league
  leader or overall official table.
- Top-four bands say Top 16 places in RS and Playoff places in TS. Group-local
  qualification rules require explicit helper opt-in; existing global-seed
  consumers continue to reject group rules. Completed-stage markers use the
  final official positions, not the unreliable historical source flags.
- Each group race has its own history, insights, focused club and playback.
  Phase-wide snapshot reads reuse existing cached query keys. Selection/phase
  changes reset playback; one group's replay does not move another group's.
- The first loaded TS round has no RS predecessor KPI or completed-stage marker.
  Empty TS standings describe unavailable table data, not a knockout. Missing
  group assignments show unavailable context without a synthesized combined
  table. Missing format metadata does not invent qualification bands.
- The Advanced tab retains its existing independent statistics controls and
  metric rankings; the official-table Group select is hidden there. Modern
  single-table rendering and qualification rules remain intact.

## Verification results

- `npm run build`: backend TypeScript and frontend production build passed.
- `npm --prefix frontend run lint`: passed.
- Final focused run from frontend:
  `npx playwright test grouped-standings.spec.js standings-view-controls.spec.js`:
  15 passed (25.3 seconds), including all four seasons, keyboard/URL behavior,
  edge states and both themes at 320/390/768/1024px.
- Broader run from frontend:
  `npx playwright test grouped-standings.spec.js standings-view-controls.spec.js
  standings-table-layout.spec.js standings-breakdowns-layout.spec.js
  standings-race-layout.spec.js historical-direct-eight.spec.js
  postseason-clinch.spec.js responsive.spec.js`: 216 passed, four failed.
  Failures were confined to grouped page-load/keyboard assertions and an
  existing Advanced scope/round timing assertion. Group loading checks now wait
  for the lazy page using the existing 30-second browser convention; keyboard
  type-ahead found and fixed duplicate same-group URL entries. All affected
  cases passed in the final focused rerun. The 205 other regression cases in
  the broad run passed and are unaffected by the final group-event guard.
  This is not a claim that the original combined run was wholly green.
- `git diff --check`: passed.
- Visually inspected ignored local screenshots:
  `frontend/test-results/34h-i-table-desktop.png` and
  `34h-i-race-mobile.png`. Image CDN crests were replaced by deterministic
  placeholders for these screenshots; production image behavior is unchanged.

### Mobile axis follow-up

The user's mobile screenshot revealed overlapping full round names inside the
SVG, which the earlier page-overflow and heading checks missed. The axis now
uses compact phase-local labels (R1, R10, R14) and thins them according to plot
width. First/last ticks remain in the label set; full names remain in tooltips,
playback and snapshot headings. Missing round names use `?` on the compact axis
and explicit unavailable wording in the full context.

After this refinement, `npm run build` and frontend lint passed. From frontend,
`npx playwright test grouped-standings.spec.js standings-race-layout.spec.js`
passed 19 tests (38.5 seconds) against the confirmed local target. The responsive
group cases now compare rendered SVG label bounds directly for at least 2px
separation across all supported widths and both themes, and check first/last
labels and the unavailable-name state. The entire mobile chart/axis was visually
inspected after animation settled in ignored local evidence
`frontend/test-results/34h-i-axis-mobile.png`.

The source/API matrix and browser behavior are verified separately. Browser
availability is not new evidence for historical tiebreaker or qualifying rules.

## Remaining work

- 34h-ii owns group-to-quarterfinal mappings, advancement and the postseason path.
- 34h-iii owns Home, Overview, team/player pages, Leaders, comparisons, archive
  views and remaining grouped-stage statistics context.
- Qualifying coverage and remaining source/pipeline gaps retain their existing
  reviewed feature boundaries. No new overall classification is inferred here.
