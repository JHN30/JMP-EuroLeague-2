# Feature: Grouped standings and race playback

**From build-plan:** feature 34h-i
**Build attempt:** 1
**Status:** verified
**Branch:** feature/grouped-standings-and-race-playback

## Goal

Adapt the Standings page's official Table, breakdowns and Race views to the
grouped regular season and Top 16 in E2012-E2015. Every group keeps its own
official ranks, qualification places, snapshots and race. Preserve the existing
single-table experience for modern seasons.

## In scope

- E2012, E2013, E2014 and E2015: four RS groups of six, ten games per club;
  two Top 16 groups of eight, fourteen games per club. Top four per RS group
  reach Top 16; top four per Top 16 group reach the Playoffs.
- Labelled group sections and an accessible Group select in Table and Race.
  With no group parameter, show all groups as separate sections. Selecting one
  group shows that group alone. This is a reversible presentation choice, not
  a new competition rule or an overall ranking.
- Share phase and selected group in the existing Standings URL. Use `phase`
  as today and a `group` parameter containing the exact observed `groupName`,
  encoded through URLSearchParams. Absence of `group` means all groups; do not
  reserve a source group name as a synthetic all-groups value.
- Latest standings and existing race/historical snapshots, group-local KPI
  strips, all existing traditional views and breakdowns, qualification bands,
  and source-backed phase-local round labels.
- Per the user's mobile review, use compact race-axis labels such as R1/R14,
  thin them according to available chart width, and retain complete mapped
  stage/round names in tooltips and playback. Missing names stay unavailable.
- Scope every group's leaders, cutoff, movement, net-rating KPI, breakdown
  rows, race insights, chart and snapshot table to that group's clubs. Do not
  display one league leader or sort repeated group positions into a global table.
- Reset invalid group selection after successful phase/group loading, on phase
  changes and on season changes. Retain valid same-phase selection across
  Table/Race switching, refresh and back/forward navigation.
- Verify both table stages and each actual season, including the source's
  unreliable pre-E2015 `basic.qualified` flags and continuous round keys.

## Out of scope

34h-ii postseason advancement/bracket mappings; 34h-iii Home, Overview, Team,
Player, Leaders, Compare and archive adaptations; qualifying-stage work;
advanced-statistics ranking/scoping changes; new statistical formulas, official
tiebreaker reconstruction, schema/data/pipeline writes, new endpoints or
dependencies, older-season Neon import, push and deployment.

The Advanced tab keeps its existing independent statistics scope controls and
descriptive metric rankings. Hide the official-table Group select there; it
must not imply that the statistics view is an official combined group table.
Do not expand this leaf into all remaining grouped-era page work.

## Build loop

Review this spec before `/implement`. Build the small steps, then present one
feature review packet. Checkpoint commits are disabled; `/complete` creates
the final feature commit. Regular audit, Check and try-guide gates are manual;
independent review is selected only if the implementation establishes a
sensitive boundary or unusually broad change.

Freeze attempt 1 and archive path
`blueprint/history/features/34h-i-grouped-standings-and-race-playback.md`.
No prior matching feature records or Git use of that path were found; the
archive leaf is absent, its parents are ordinary directories, and the configured
branch is valid and has no existing or conflicting local ref. No branch is
created by this planning command.

## Build steps

1. [x] **Group the official standings and URL selection.** Use the current
   standings response's `groupName` and the shared format's stage/group metadata
   to form ordered, labelled groups. Add the Group control for grouped Table
   and Race views; keep ungrouped seasons on their existing rendering path.
   Render all groups separately by default or the selected group alone. Apply
   selection to the group's latest table, traditional views, breakdowns and KPI
   strip. Reset invalid URL values only after successful authoritative loading;
   loading/error must not erase a shareable selection. Phase changes clear the
   old group; the existing season selector already clears season query state.
   Fix the empty-state distinction: RS and TS are table stages, so missing TS
   standings must not be described as a knockout. Missing group labels stay
   visibly unavailable rather than silently becoming an official group.
   **Done when:** each of the four seasons shows four labelled six-club RS
   tables and two labelled eight-club TS tables, duplicate positions stay local,
   Group selection and phase/group URLs survive refresh/back/forward, invalid
   selection resets safely, and all traditional breakdowns/KPIs stay in the
   chosen group. Existing modern controls and single-table output pass focused
   regression checks.

2. [x] **Apply group-local qualification and race playback.** Derive 1-4 bands
   from `within: group` rules only when rendering an individual group. Keep
   the default single-table helper behavior unchanged so later consumers cannot
   interpret group-local ranks as global seeds. Use destination-aware words:
   RS bands/cutoffs refer to Top 16; TS bands/cutoffs refer to the Playoffs.
   Do not depend on the source `qualified` flag or label earlier snapshots as
   confirmed advancement; any qualification marker must follow verified final
   group positions and the completed stage. Filter every snapshot to its group
   before calculating movements, insights and charts. All-groups Race shows
   separate labelled group races, sharing the existing cached phase snapshot
   queries, with independent playback/focus state reset on group/phase changes.
   Use `app_rounds` names for labels, retaining source round numbers for API
   requests. TS source rounds 11-24 must read as Top 16 rounds 1-14; use the
   source mapping rather than a guessed subtraction. Stage start is distinct
   from season start. The previous-snapshot query stays inside the selected
   phase; never request RS round 10 as a TS predecessor.
   **Done when:** E2012-E2015 have correctly named top-four bands in each RS/TS
   group despite false qualification flags, each race contains only that group's
   clubs and local ranks, playback labels/start/end match phase round names,
   earlier/final snapshots preserve their official records, and a missing or
   one-snapshot race gives an honest state. Existing modern tiers and race
   playback still pass focused regression checks.

3. [x] **Verify all four seasons and responsive behavior.** Add focused cases
   using the installed Playwright harness for group partitioning/selection,
   qualification boundaries, group-local movements and source/display round
   mappings. Verify actual latest and historical RS/TS snapshots for every
   E2012-E2015 season; do not substitute one representative season. Exercise
   loading, retryable errors, missing/empty group or TS data, invalid URLs,
   season/phase switching and keyboard selection. Check all-groups and selected
   group Table/Race at 320/390/768/1024px in both themes, preserving accessible
   group headings, chart descriptions, focus and non-color-only bands.
   Check SVG axis label bounds directly for overlap; page overflow alone does
   not prove the labels are readable. Keep the first and last round visible.
   Update the inventory's 34h-i evidence and add a focused acceptance report.
   **Done when:** the four-season API/browser matrix and relevant group/race/
   layout regressions pass against `target: local`, root build and frontend
   lint pass, and the report distinguishes verified group standings from still
   pending bracket, qualifying and remaining-page work.

## Files / areas

- `frontend/src/standings/StandingsPage.jsx`, `StandingsTable.jsx`,
  `StandingsKpiStrip.jsx` and the existing traditional breakdown components.
- `frontend/src/standings/RaceView.jsx`, `RaceChart.jsx`, `RacePlayback.jsx`,
  `RaceSnapshotTable.jsx`, `RaceInsightCards.jsx`.
- `frontend/src/lib/seasonFormat.js`, `usePhaseParam.js`, existing URL/filter
  primitives and API calls; add only a small local grouping helper if needed
  to share actual partition/selection logic between these consumers.
- Existing backend `season-standings.ts`, `season-format.ts`,
  `season-format-registry.ts`, `season-catalog.ts` and routes are contract
  evidence. Existing reads already return group names, official positions and
  phase-scoped rounds; no backend mutation or contract extension is planned.
- Existing standings/race layout and view-control specs, direct-eight/modern
  regression cases and `responsive.spec.js`; a focused grouped-standings spec.
- `blueprint/reference/historical-season-inventory.md` and
  `blueprint/reference/34h-i-acceptance.md`.

## Data / contracts

- Preserve current season/phase endpoints and response shapes. Standings rows
  keep exact `clubCode`, `groupName` and `basic.position`; the backend orders by
  group, official position and club ID. Group membership is phase-specific.
  Null statistics remain unavailable, not zero. Group labels render as React
  text; URL values never become HTML, selectors or database query fragments.
- Group discovery uses observed phase groups/rows, not a list of invented
  participants. No game score recomputation, cross-group sorting or ranking
  engine. Qualification rules come from the existing typed registry, which
  explicitly distinguishes `within: group` from `within: table`.
- `GET /seasons/:season/phases/:phase/standings?round=<source number>` remains
  the snapshot contract. `getRounds` supplies source numbers and display names;
  keys/query caches retain season and phase. Partition existing bounded phase
  responses in the frontend rather than adding server group filters.
- `group` is validated against successfully loaded groups for the selected
  table phase. Invalid, repeated or unknown group values fall back to all
  separate groups and are canonicalized without losing unrelated URL fields.
  Valid exact names retain their source case/spacing. On a successful phase
  change clear group and stage-dependent playback/focus state. On errors retain
  context and retry; never show a stale previous phase/group as current data.
- Failed/missing format metadata must not fabricate a qualification cutoff.
  Loaded standings still render separately by their recorded groups when that
  is identifiable. Unknown qualification stays unmarked. Empty tables and
  unavailable snapshots remain distinct from denied/invalid request errors.
- The app remains public/read-only, with existing season/competition-scoped,
  parameterized and validated bounded backend reads. No auth, tenant or
  persisted-data contract is added.

## Testing

No separate Verify or unit-test command is declared; no runner is added.
Use existing Playwright for focused helper cases and actual API/browser
acceptance. Check `/api/health` for `target: local` before each browser run;
never read the real `.env`, verify against Neon or start dev servers during
planning. During implementation, select the grouped spec plus the affected
standings/race/view-control/layout specs and modern/direct-eight regressions;
include `responsive.spec.js` for layout changes. No broad whole-suite run is
required for this Standings-only leaf. Final commands: `npm run build` and
`npm --prefix frontend run lint`.

## Notes for the AI

The critique caught three inherited single-table assumptions: a global KPI
leader/cutoff, fixed playoff qualification copy and TS playback using continuous
source numbers as displayed round numbers. Keep all three group/stage scoped.
The inventory verifies RS/TS group standings for this leaf; unresolved QF
pairings and E2015 qualifying evidence belong to later leaves, not a repair
hidden in this feature. Reuse existing tables, selects, query cache and theme
tokens. Preserve the current mobile/tablet layouts, keyboard access, readable
contrast and reduced-motion behavior. This is functional adaptation, not visual
replication. No implementation, runtime acceptance or build results are claimed
by this planning command.

## Implementation evidence

- `npm run build`: backend and frontend passed after the final navigation fix.
- `npm --prefix frontend run lint`: passed.
- From frontend, `npx playwright test grouped-standings.spec.js
  standings-view-controls.spec.js`: 15 passed (25.3 seconds). `/api/health`
  reported `target: local` immediately before the run.
- The broader run of grouped, view-control, table/breakdown/race layout,
  historical-direct-eight, postseason-clinch and responsive specs had 216
  passed and four failures. The failures were confined to grouped loading/
  keyboard assertions and an existing Advanced scope/round timing assertion;
  all affected cases passed in the final focused rerun. The other 205 cases
  passed in the broad run and are unaffected by the final group-event guard.
  Do not describe the initial broad run as wholly passing.
- All four seasons' 96 available RS/TS snapshots were checked. Every RS group
  has six clubs; every TS group has eight. Source rounds 1-10 and 11-24 map to
  phase-local rounds 1-10 and 1-14. E2012-E2014 source qualification flags are
  false; final-stage UI markers follow the verified top-four group positions.
- URL refresh/back/forward, keyboard type-ahead, repeated/invalid group values,
  phase/season changes, independent race resets, empty TS data, failed format/
  standings queries, missing group assignments and first-round history passed.
  Rapid native type-ahead no longer creates duplicate entries for the same URL.
- All-groups and selected-group Table/Race passed at 320/390/768/1024px in both
  themes. Desktop Table and 320px Race screenshots were visually inspected in
  ignored `frontend/test-results/34h-i-table-desktop.png` and
  `34h-i-race-mobile.png`; CDN crests were mocked for deterministic screenshots.
- `git diff --check`: passed. No P0/P1 blocker or pending independent review;
  unrelated open P3 findings F-02 and F-03 remain. Audit, Check and try-guide
  gates are manual. Independent review is not selected for this bounded
  Standings adaptation with no backend, persisted-data or security mutation.
- `blueprint/reference/34h-i-acceptance.md` records the observed contracts and
  remaining scope. No commit, merge, push, data write or deployment performed.
  Ready for `/complete`; 34h-i and its parents stay unchecked until completion.

### Mobile race-axis refinement

The user's screenshot exposed internal SVG label overlap that page-overflow
checks did not cover. Axis labels now use compact phase-local R1/R14 wording
and width-aware thinning, retaining first/last labels. Full source-mapped names
remain in point tooltips, playback and snapshot headings; absent names use a
compact `?` cue while full context says the round name is unavailable.

- `npm run build` and `npm --prefix frontend run lint`: passed.
- From frontend, `npx playwright test grouped-standings.spec.js
  standings-race-layout.spec.js`: 19 passed (38.5 seconds), with a confirmed
  local target. SVG label rectangles are checked for at least 2px separation
  at 320/390/768/1024px, in both themes and RS/TS group selections.
- Visually inspected the complete mobile chart and axis in ignored
  `frontend/test-results/34h-i-axis-mobile.png` after animations settled.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":15617,"specSha256":"6731a9e8c8cc2aa1710672ebdc550f48cdea4195db816570d7247ec2a7a010dc","branch":"refs/heads/feature/grouped-standings-and-race-playback","head":"0b534ab5ba35f2a219a45fdbe6cf7331bafb29d5","baseRef":"refs/heads/master","baseCommit":"0b534ab5ba35f2a219a45fdbe6cf7331bafb29d5","sourceTree":"581de250f291bb98e7d40da1c1a54dc2536c1152","absentOptional":[]} -->
