# Feature: No-copy shared primitives and rollout

**From build-plan:** feature 15d-ii
**Build attempt:** 1
**Branch:** feature/no-copy-shared-primitives-and-rollout
**Status:** verified

## Goal

Extract the app's repeated structural patterns - panel, summary grid, header
stats, info tile, compact metric, info row, empty text, labelled select,
compact filter select, search field, and a single loading/empty/error surface
with an inline variant - into shared components in `frontend/src/lib/`, then
replace the app's existing per-page copies with them. None of these need new
copy: each formalizes markup and behavior already in production today.

## Scope findings from inspection

- `.panel` is applied as a raw `<div className="panel ...">` at 26 call
  sites across 15 files, each with its own extra utility classes
  (`p-4`, `p-6`, `overflow-x-auto overscroll-x-contain p-2`, etc).
- The loading/error/empty triad (`CenteredSpinner`, `ErrorAlert`, a bare
  `<p role="status" className="muted">`) is defined locally, nearly
  identically, in 14 files (the same files found during 15c-i). A smaller
  "inline" variant of the same idea already exists ad hoc in
  `LeadersPanel.jsx` (a bare `<span role="status">`/`<span role="alert">`
  pair sized for a small per-item card, not a full block).
- `.kpi-strip`/`.kpi-chip` (header stats + compact metric) is defined and
  used identically in 5 files (`KpiStrip.jsx`, `StandingsKpiStrip.jsx`,
  `LeaderboardKpiStrip.jsx`, `TeamPage.jsx`, and consumed via a shared
  `KpiChip` sub-component already local to two of those files).
- `PlayerPage.jsx`'s `StatGrid` (a `<dl>` of `<dt>/<dd>` tiles) is the only
  current summary-grid/info-tile consumer, used 4 times in one file
  (Traditional/Advanced/Scoring/Misc).
- `PlayerPage.jsx`'s `RegistrationsSection` list row (`<li className="flex
  items-center justify-between ...">` with a name/subtitle on the left and a
  status badge on the right) is the only current info-row consumer.
- A labelled `<select>` (`<label><span>Text</span><select aria-label=.../>
  </label>`) appears 6 times across `ComparisonsPage.jsx` and
  `StatisticsPage.jsx`. A compact, unlabelled `<select aria-label=... />`
  with no visible wrapper appears 4 times (`SeasonSelector.jsx`,
  `FixturesPage.jsx`'s Round select, `StatisticsPage.jsx`'s Team metric and
  Player metric selects).
- `PlayersPage.jsx` has the app's only search field (`type="search"` input
  with local `search` state).

## In scope

Build these components in `frontend/src/lib/`, each matching current
behavior exactly (no new visual or interaction decisions):

- `Panel` - renders `<div className="panel [className]">`, forwarding any
  extra className and all other props (`role`, etc).
- `AsyncState` - the shared loading/error/empty surface. Props:
  `status` (`"loading" | "error" | "empty" | "ready"`), `message` (error or
  empty text), `onRetry`, `inline` (renders the small span-based variant
  seen in `LeadersPanel.jsx` instead of the full centered block), and
  `children` (rendered when `status === "ready"`).
- `HeaderStats` - renders `<div className="kpi-strip">{children}</div>`.
- `CompactMetric` - renders one `.kpi-chip` (`value`, `label` props),
  replacing the small local `KpiChip` components.
- `SummaryGrid` - renders the `<dl className="grid ...">` wrapper.
- `InfoTile` - renders one `<dt>/<dd>` pair inside a `SummaryGrid`.
- `InfoRow` - renders the list-row pattern (`primary`, `secondary`,
  `trailing` props for the name/subtitle/badge slots).
- `EmptyText` - renders `<p role="status" className="muted">{children}</p>`.
- `LabelledSelect` - renders the wrapping `<label><span>{label}</span>
  <select aria-label={label} ...>{children}</select></label>` pattern.
- `CompactFilterSelect` - renders a bare `<select aria-label={label}
  className="select select-bordered select-sm" ...>{children}</select>`
  with no visible wrapper.
- `SearchField` - renders the `type="search"` input pattern from
  `PlayersPage.jsx`.

Replace the existing per-page copies with these components:

- All 26 raw `.panel` divs -> `Panel`.
- All 14 local `CenteredSpinner`/`ErrorAlert`/empty-paragraph triads, plus
  `LeadersPanel.jsx`'s inline span pair -> `AsyncState`.
- The 5 `.kpi-strip`/`.kpi-chip` sites -> `HeaderStats`/`CompactMetric`.
- `PlayerPage.jsx`'s 4 `StatGrid` calls -> `SummaryGrid`/`InfoTile`.
- `PlayerPage.jsx`'s `RegistrationsSection` list row -> `InfoRow`.
- The 6 labelled-select sites -> `LabelledSelect`.
- The 4 compact-select sites -> `CompactFilterSelect`.
- `PlayersPage.jsx`'s search input -> `SearchField`.
- Every bare empty-state `<p role="status" className="muted">` found during
  15c-i (the 22 non-`StatGrid`/`RegistrationsSection` sites) -> `EmptyText`.

## Out of scope

- `ComparisonsPage.jsx`'s team-picker select (line ~116) uses a separate
  `<label htmlFor>`/`<select id>` pair rather than a wrapping label, likely
  for its own grid alignment; left as-is rather than forced into
  `LabelledSelect`'s wrapping shape.
- 15d-iii (page header, kicker copy) and any later 15d/15e-15g item.
- No new component variant, size, or behavior beyond what's already in
  production; this feature formalizes existing markup, it doesn't design
  anything new.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (one review
packet after all steps) and `workflow.checkpointCommits` is `disabled`.

## Build steps

- [x] 1. Build `Panel`, `EmptyText`, `LabelledSelect`, `CompactFilterSelect`,
      and `SearchField` in `frontend/src/lib/` (the smallest, most
      mechanical primitives), with no consumer yet.
      **Done when:** `npm run lint` and `npm run build` pass.
- [x] 2. Build `AsyncState`, `HeaderStats`, `CompactMetric`, `SummaryGrid`,
      and `InfoTile`, and `InfoRow`, with no consumer yet.
      **Done when:** `npm run lint` and `npm run build` pass.
- [x] 3. Replace all raw `.panel` divs with `Panel`. Correction found while
      implementing: the actual count is 21 distinct panel roots, not 26 - the
      original count double-counted `panel-title`/`panel-header`/`panel-link`
      sub-elements, which are separate CSS classes on children, not another
      `.panel` wrapper. All 21 are converted, including two (`Dashboard.jsx`'s
      `WidgetPanel` and `LeadersPanel.jsx`) whose internal loading/error/empty
      branches were converted together with `AsyncState` since they were the
      same shape as step 4's target and splitting the panel and async-state
      change across two steps for those two files would have meant touching
      each file twice.
      **Done when:** `npm run build` passes; CDP screenshot comparison on
      Standings, a game detail page, and Teams shows no visible layout
      change.
- [x] 4. Replace the 14 loading/error/empty triads and `LeadersPanel.jsx`'s
      inline pair with `AsyncState`.
      **Done when:** `npm run build` passes; CDP check confirms a loading
      spinner, an error alert, and an empty-state message each still render
      with their existing `role` attributes on Standings, Fixtures, and a
      not-yet-played game's box score.
- [x] 5. Replace the 5 `.kpi-strip`/`.kpi-chip` sites with
      `HeaderStats`/`CompactMetric`.
      **Done when:** `npm run build` passes; CDP check confirms the
      Dashboard, Standings, Statistics, and a team page's KPI values render
      unchanged.
- [x] 6. Replace `PlayerPage.jsx`'s `StatGrid` calls with
      `SummaryGrid`/`InfoTile`, and its `RegistrationsSection` row with
      `InfoRow`.
      **Done when:** `npm run build` passes; CDP check on a player page
      confirms season-statistics tiles and the registrations list render
      unchanged.
- [x] 7. Replace the 6 labelled-select and 4 compact-select sites with
      `LabelledSelect`/`CompactFilterSelect`, and `PlayersPage.jsx`'s search
      input with `SearchField`.
      **Done when:** `npm run build` passes; CDP check confirms each
      select's `aria-label` and options are unchanged and the search input
      still filters the players list.
- [x] 8. Replace the remaining 22 bare empty-state paragraphs with
      `EmptyText`.
      **Done when:** `npm run lint` and `npm run build` pass; CDP spot-check
      on two of the empty-state pages confirms `role="status"` still renders.

## Files / areas

- `frontend/src/lib/` (11 new component files)
- The 15 files using `.panel`, the 14 files with the loading/error/empty
  triad, the 5 KPI-strip files, `PlayerPage.jsx`, `PlayersPage.jsx`,
  `ComparisonsPage.jsx`, `StatisticsPage.jsx`, `FixturesPage.jsx`,
  `SeasonSelector.jsx`

## Data / contracts

None - presentation and structure only, no API or persisted-data changes.

## Testing

No unit test runner is configured. Verify via `cd frontend && npm run lint`
and `npm run build`, plus the CDP-based evidence named in each step.

## Notes for the AI

- Each component must match existing markup byte-for-byte in the DOM shape
  that matters for styling (classes, roles) - this is an extraction, not a
  redesign. When two per-page copies differ slightly (for example
  `AsyncState`'s inline vs block variant), preserve both as an explicit prop,
  never silently pick one.
- Re-grep each pattern's exact call-site list at the start of its step
  rather than trusting the counts above blindly, matching the practice from
  15c-i and 15b-iv.
- Steps 3-8 are large in file count but mechanical; keep each one to exactly
  the pattern named, and split further within a step if a single file's
  diff becomes hard to review.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9546,"specSha256":"2e649d37ed0818b139b1c402a557b53d17e7d44e9650542192fda4ac9950b0af","branch":"refs/heads/feature/no-copy-shared-primitives-and-rollout","head":"7ffeb648186c3291463a6849f207ee60e25bcba7","baseRef":"refs/heads/master","baseCommit":"702f55b620bd39a61fb0d3c94f767164ef5ecf49","sourceTree":"a24028c9c3f501083fd639ace6c2223721ee6d24","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 7ffeb648186c3291463a6849f207ee60e25bcba7
**Base commit:** 702f55b620bd39a61fb0d3c94f767164ef5ecf49
**Base ref:** master
**Spec hash:** 2e649d37ed0818b139b1c402a557b53d17e7d44e9650542192fda4ac9950b0af
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6-astra
**Requested execution:** automatic
**Requested at:** 2026-09-22T14:15:53.281Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-6-astra
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-09-22T14:19:02.978Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `702f55b620bd39a61fb0d3c94f767164ef5ecf49..7ffeb648186c3291463a6849f207ee60e25bcba7` delta in a fresh session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or reuse the existing findings as the review scope.

## Commands

- `git status --short`, `git rev-parse HEAD`, and `git merge-base master HEAD`: pass; exact requested checkpoint and base, with only permitted evidence files dirty.
- `Get-FileHash blueprint/context/current-feature.md -Algorithm SHA256`: pass; exact recorded spec hash. The spec is tracked, so no local snapshot is required.
- `git diff master...HEAD` and targeted source/test reads: pass; reviewed all 33 changed files, including the active spec, and relevant existing browser tests and navigation.
- `git diff --check master...HEAD`: pass.
- `cd frontend && npm run lint`: pass. An initial invocation from the repository root failed because that directory has no package.json; rerunning from the documented frontend directory passed.
- `cd frontend && npm run build`: pass, with the large-chunk warning.
- `cd frontend && npm run test:browser`: fail; both tests time out on stale tab-role navigation locators. Recorded as pre-existing P2 finding F-01.
- Targeted searches for old primitive copies and skipped/focused browser tests: pass; no remaining local CenteredSpinner/ErrorAlert or KPI markup copies, and no skipped/focused tests found.

## Evidence

- Reviewed the complete `702f55b620bd39a61fb0d3c94f767164ef5ecf49..7ffeb648186c3291463a6849f207ee60e25bcba7` delta across all four lenses, independently of builder conversation.
- Reviewed all eleven new primitives and every changed consumer in App, comparisons, dashboard, games, players, playoffs, season, standings, statistics, and teams. Checked the project's React, styling/accessibility, proportionality, and testing standards.
- Compared old and new markup, classes, semantic elements, accessible names, conditional branches, retry callbacks, select options and event forwarding, metric values, registration rows, and summary tiles. No blocking product regression found.
- Security and performance review found no added network/data contracts, trust-boundary changes, unsafe HTML rendering, new unbounded work, or additional queries in the target delta.
- The existing two browser tests contain no skip/focus markers. Playwright failure snapshots show a loaded dashboard with navigation links; the test expectations use tabs. The missing leaderboard-type select is also absent from the base version of StatisticsPage.
- Excluded dependencies, generated dist/test-results artifacts, and unrelated backend code from source review. Review and findings files did not define the code scope.

## Findings

- F-01 [P2] open: pre-existing browser selectors prevent the available suite from reaching the migrated UI. No P0 or P1 findings are open or fixed.

## Remaining risk

- Browser suite failed on pre-existing selectors, so it does not verify the migrated filters or teams route. Repair F-01 first, then rerun the existing suite.
- No unit test command is configured. This review did not independently reproduce every spec CDP screenshot comparison, player search, or loading/error/empty scenario; Check was not required.
- Production build emits a large-chunk warning (approximately 646 kB minified JavaScript); no new loading or bundling mechanism is introduced by this presentation extraction.
