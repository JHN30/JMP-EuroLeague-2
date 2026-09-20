# Feature: Statistics leaderboards

**From build-plan:** feature 14c
**Build attempt:** 1
**Branch:** feature/statistics-leaderboards
**Status:** verified

## Goal

Deepen the statistics leaderboards page (`frontend/src/statistics/StatisticsPage.jsx`)
with a KPI strip, stat-category tabs for player metrics, a real Players/Teams
segmented scope toggle, and in-row bar visualization for the sorted stat, per
`prototypes/statistics.html` and the shared design system — using only data
the existing season-stats and standings endpoints already return.

## Design reference

`prototypes/statistics.html` (approved mockup) for the KPI-chip, category-tab,
scope-toggle, and stat-bar visual language. Its "Round 14 high" and "Biggest
L10 riser" KPI chips, its five illustrative category names (Scoring/
Rebounding/Playmaking/Efficiency/Defense), and its per-row rank-delta column
are concept data / concept scope that this spec does not build — see **Notes
for the AI** for why.

## In scope

- KPI strip: category leader (name + value), runner-up gap (leader's value
  minus 2nd place's value), and the current page's average value for the
  selected metric — computed entirely from the already-fetched leaderboard
  page (no new requests). Recomputes when metric, mode, scope, or phase
  changes. Shown for both Teams and Players scope.
- Stat-category tabs for the Players scope only: one tab per existing
  `PLAYER_METRIC_GROUPS` entry (Traditional / Advanced / Scoring / Misc —
  the real backend table groupings already used by the metric dropdown's
  `optgroup`s), narrowing the metric dropdown to that category's metrics and
  auto-selecting its first metric on tab change. Not shown for Teams scope
  (`TEAM_METRICS` is one flat list with no established grouping).
- Players/Teams scope switches from a `<select>` to a real two-button
  segmented toggle (`role="group"`, matching `prototypes/statistics.html`'s
  `.scope-toggle`), keeping the same `view` state and behavior.
- In-row bar visualization on the sorted metric's column, for both
  leaderboards: a background bar sized by min-max normalizing each visible
  row's value against the current page's own min/max (handles metrics that
  can be negative, e.g. team point differential), matching the sparkline
  normalization already used in `StandingsTable.jsx`.

## Out of scope

- Rank-delta indicators. The season-stats tables
  (`etl_flat_season_stats_traditional` and its advanced/scoring/misc
  siblings) have no round or timestamp dimension — every row is the single
  current cumulative snapshot, confirmed against live `E2025` data before
  writing this spec. There is no prior state to diff against, and the
  existing `playerRanking` field is not metric-specific (confirmed: sorting
  live data by `points_scored` desc produced non-monotonic `player_ranking`
  values like 6, 3, 44, 61, 16, 73 — it's a fixed, likely PIR-based overall
  ranking, not a per-metric rank). The user confirmed dropping this from the
  feature rather than adding a new persisted snapshot mechanism, which would
  be its own build-plan item.
- A true "league-wide average" KPI. The `/season-stats` endpoint caps `limit`
  at 100 server-side and returns no total count, while a season has ~200+
  tracked players — computing a real population average would need multiple
  sequential paginated fetches. The KPI strip instead uses the current page's
  own average, which needs no extra requests (see **Notes for the AI**).
- Any new backend endpoint, schema change, or new query param. Every value
  in this feature comes from `GET /seasons/:seasonCode/season-stats` and
  `GET /seasons/:seasonCode/phases/:phaseCode/standings`, both already
  called by the frontend.
- A window toggle (L3/L6/L10/Season) shown in the mockup — there is no
  rolling-window data source (see the rank-delta point above; same
  no-history limitation applies). Only the existing accumulated/per-game
  `mode` toggle remains.
- Changes to the home dashboard, standings, team profile, or comparisons
  pages — those are build-plan items 14a (done), 14b (done), 14d, 14e,
  specced separately.

## Build loop

Per `blueprint/config.json`, `workflow.stepReview` is `feature`: build all
steps below in order without pausing for approval after each one, then stop
for one review packet covering the whole feature. `checkpointCommits` is
disabled, so do not create intermediate commits between steps — `/complete`
makes the final commit. Keep the project working after every step regardless.

## Build steps

- [x] 1. Add the KPI strip. New `frontend/src/statistics/LeaderboardKpiStrip.jsx`,
      a presentational component taking `entries` (the already-fetched,
      already-sorted page array), `offset`, `valueOf(entry)` (a numeric-value
      accessor), `nameOf(entry)`/`subtitleOf(entry)` (leader label
      accessors), and `metricLabel`. Compute: Leader (`nameOf`/`subtitleOf`
      and `valueOf` of `entries[0]`, only meaningful when `offset === 0`),
      Runner-up gap (`valueOf(entries[0]) - valueOf(entries[1])`, only when
      `offset === 0` and `entries.length >= 2`), Page average (mean of
      `valueOf` across all entries with a non-null value, labeled "Page
      average" not "League average"). Omit a chip when its precondition
      isn't met rather than showing a misleading value. Mount it in both
      `TeamLeaderboard` and `PlayerLeaderboard` (in `StatisticsPage.jsx`)
      above their existing filter row, passing each page's own value/name
      accessors (team: `entry.basic?.[metric]`/`winPercentage` numeric
      coercion already in `TeamLeaderboard`; player: `formatStatValue`'s
      underlying raw value via `player[group]?.[metric]` parsed with
      `Number`).
      **Done when:** the KPI strip renders real leader/gap/average values
      against the running app for both Teams and Players scope, updates when
      switching metric or page, and omits gap/leader correctly on page 2+.

- [x] 2. Add player stat-category tabs. In `PlayerLeaderboard`
      (`StatisticsPage.jsx`), add a `category` state defaulting to
      `PLAYER_METRIC_GROUPS[0].group` ("traditional"), rendered as a tab row
      (reuse `tabs tabs-boxed tabs-sm`, one tab per `PLAYER_METRIC_GROUPS`
      entry) above the existing filter row. Replace the metric `<select>`'s
      full `PLAYER_METRIC_GROUPS` iteration with just the selected
      category's `options`. On tab change, reset `metric` to the new
      category's first option and `offset` to 0 (same pattern as
      `handleModeChange`).
      **Done when:** selecting a category tab narrows the metric dropdown to
      that category's stats and switches the active metric, against the
      running app.

- [x] 3. Convert the Players/Teams selector to a segmented toggle. In
      `StatisticsPage.jsx`, replace the `<select>` driving `view` with a
      two-button `role="group"` toggle (`Players`, `Teams`), styled to match
      `prototypes/statistics.html`'s `.scope-toggle` — add a small
      `.scope-toggle`/`.scope-toggle button`/`.scope-toggle button.active`
      rule set to `frontend/src/index.css` using existing tokens
      (`--color-primary`/`--color-primary-content`/`--color-base-200`/
      `--radius-field`), consistent with the DaisyUI-less custom controls
      already added for standings (`tier-row`, etc.). Keep the same `view`
      state and behavior.
      **Done when:** the toggle switches between Teams and Players
      leaderboards identically to the current dropdown, against the running
      app.

- [x] 4. Add in-row bar visualization. New small helper (co-located in
      `StatisticsPage.jsx` or a new `frontend/src/statistics/StatBarCell.jsx`)
      that, given the current page's numeric values for the sorted metric,
      computes each row's bar width as `(value - min) / (max - min) * 100`
      (100% when `max === min`), and renders a background bar behind the
      value in the sorted metric's `<td>` for both `TeamLeaderboard` and
      `PlayerLeaderboard` (matching `prototypes/statistics.html`'s
      `.stat-bar-cell`/`.bar`/`.bar-fill` pattern — add that rule set to
      `frontend/src/index.css` reusing `--color-primary` at reduced opacity
      for the fill). Cells with a null value render no bar.
      **Done when:** the sorted stat's column shows a proportional bar per
      row on both leaderboards, correctly handling a negative-capable metric
      (e.g. team `pointsDifference`), against the running app.

- [x] 5. Responsive pass and lint. Confirm the KPI strip, category tabs, and
      scope toggle wrap or scroll sensibly at phone width (resize the
      running dev server, don't just read the CSS) — the leaderboard table
      itself already scrolls horizontally via the existing
      `panel overflow-x-auto` wrapper. Run `cd frontend && npm run lint`.
      **Done when:** the statistics page is usable at phone, tablet, and
      desktop widths with no unintended horizontal scroll of the page
      itself, and lint passes.

## Files / areas

- `frontend/src/statistics/StatisticsPage.jsx` — scope toggle, category
  tabs, KPI strip mounts, bar-cell wiring
- `frontend/src/statistics/LeaderboardKpiStrip.jsx` — new
- `frontend/src/statistics/StatBarCell.jsx` — new (presentational component only)
- `frontend/src/statistics/statBarScale.js` — new; `barWidthScale` pure
  function extracted here rather than co-located with `StatBarCell.jsx`,
  because `eslint-plugin-react-refresh` (`react-refresh/only-export-components`)
  forbids a component file from also exporting a non-component value
- `frontend/src/index.css` — scope-toggle and stat-bar-cell rule sets
- `frontend/src/lib/statsFields.js` — no changes expected; `PLAYER_METRIC_GROUPS`
  already has the four real category groupings needed by step 2

## Data / contracts

No backend changes. Every value is sourced from already-existing endpoints:

- `GET /seasons/:seasonCode/season-stats?phase&mode&sort&order&limit&offset`
  → `{ phase, mode, players, pagination: { limit, offset, hasMore } }`
  (`backend/src/routes/seasons.ts:238`), already called by
  `PlayerLeaderboard`. `limit` is capped at 100 server-side
  (`backend/src/routes/seasons.ts:47`); no total-count field exists, which
  is why the KPI strip uses page-scoped values only (see Out of scope).
- `GET /seasons/:seasonCode/phases/:phaseCode/standings[?round]` → already
  called by `TeamLeaderboard` for team metrics (`entry.basic.*`).
- Player stat values are nullable numeric strings; team `basic.*` values are
  a mix of numbers and one numeric-string field (`winPercentage`), already
  handled by `TeamLeaderboard`'s existing `value()` helper. `valueOf`
  accessors passed into `LeaderboardKpiStrip`/`StatBarCell` must coerce with
  `Number()` and treat `null`/`undefined`/`NaN` as "no value", not zero.

## Testing

No frontend unit/logic test runner is configured
(`verification.logicTests: when-configured`, none installed) — this feature
does not add one. Ran `cd frontend && npm run lint` and `npm run build` after
implementation, both clean. The Playwright smoke test
(`frontend/e2e/smoke.spec.js`) does not reference statistics-specific markup
and needed no update.

Behavioral verification performed against the already-running dev server
(`qualityGates.regular.check: manual`, done anyway given the amount of new
derived-data logic):

- Players scope, Traditional category, PTS descending: KPI strip showed
  Leader 19.4 (Vezenkov, Sasha), Gap to 2nd 0.4, Page average 16.2 — matched
  the visible table rows exactly.
- Switched to the Advanced category tab: metric dropdown narrowed to
  eFG%/TS%/REB%/AST-TO/POSS, auto-selected eFG%, KPI strip recomputed to the
  new metric (Leader 92.1 Jones Kai, Gap 15.2, Page average 70.6), and the
  in-row bars rescaled correctly.
- Clicked "Next page": Leader and Gap-to-2nd chips correctly disappeared
  (only meaningful at `offset === 0`), Page average recomputed for rows
  21-40.
- Teams scope, sorted by point differential (DIFF, a negative-capable
  metric, range -281 to +262): bar widths correctly min-max normalized —
  the leader (262) filled ~100%, a near-zero team (-1) filled ~52%, and the
  most negative team (-281) rendered an ~0%-width bar, confirming negative
  values don't break the scale.
- Confirmed the Players/Teams segmented toggle switches leaderboards
  correctly and highlights the active side.
- No console errors or failed network requests across all of the above.
- Phone width (390px): KPI strip wraps without overlap (reusing the
  overflow fix from 14b), scope toggle and table remain usable, no
  page-level horizontal scroll (`document.documentElement.scrollWidth ===
  clientWidth`).

## Notes for the AI

- **Why rank-delta and the window toggle are dropped, not reinterpreted:**
  confirmed directly against live `E2025` data before writing this spec that
  the season-stats tables carry no history (primary key is
  `(competition, season, phase, mode, entryOrdinal)`, no round/timestamp
  column) and that `playerRanking` is a fixed, metric-independent value, not
  a per-metric official rank standings-style tie-break markers could compare
  against. Unlike 14b's standings tier cutoffs (a real product-format
  question with a real answer), this is a genuine absence of any usable data
  source — the user confirmed dropping both rather than adding a new
  snapshot-persistence mechanism, which belongs in its own build-plan item if
  wanted later.
- **Why the KPI strip uses "Page average," not a league-wide average:** the
  `/season-stats` endpoint hard-caps `limit` at 100 and returns no total
  count, while a season has ~200-220 tracked players — a true population
  average would need 2-3 sequential paginated fetches per KPI-strip render.
  Computing it from the already-fetched, already-paginated leaderboard data
  needs zero extra requests and is honestly labeled instead of overstating
  what it measures.
- **Why "stat-category tabs" don't conflict with 13c's dropdown
  consolidation:** 13c replaced *stacked, multi-row* tab filters with compact
  dropdowns to reduce clutter on this exact page. 14c adds back exactly one
  tab row for a distinct purpose — narrowing the metric dropdown by real
  data-table category — not a reversion to the old multi-row layout. The
  Teams/Players scope, phase, and mode selectors stay as compact controls
  (dropdown or the new toggle); only the player metric category becomes
  tabs, reusing the same `PLAYER_METRIC_GROUPS` categories already backing
  the dropdown's `optgroup`s.
  - The mockup's five illustrative category names (Scoring/Rebounding/
  Playmaking/Efficiency/Defense) are concept labels, not real backend
  groupings — this spec uses the four real ones (`PLAYER_METRIC_GROUPS`:
  Traditional/Advanced/Scoring/Misc) that already exist and already
  correspond to the four real season-stats tables, rather than inventing a
  new taxonomy that would need to reshuffle real metrics into fictional
  buckets.
- Bar-cell and KPI-strip math reuse the min-max normalization pattern
  already established in `StandingsTable.jsx`'s trend sparkline
  (`buildPositionTrend`), rather than inventing a new scaling approach.
- Follow `prototypes/statistics.html` for visual structure (KPI chip
  styling, category-tab styling, scope-toggle styling, stat-bar-cell
  styling) but every number and label traces to a real computed value, not
  the mockup's hard-coded sample data (e.g. "S. Vezenkov," "24.1," "Round 14
  high" are illustrative only).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":15555,"specSha256":"e2347867f92ec0e516fe3df8fb120a3e9c139f42700e2790498e86888682e440","branch":"refs/heads/feature/statistics-leaderboards","head":"cb6752230c5b4e3b93aaa84e893a86bb4291ade0","baseRef":"refs/heads/master","baseCommit":"cb6752230c5b4e3b93aaa84e893a86bb4291ade0","sourceTree":"34823ddb27e7c5d8a4dadcf08c8392a9818ae61f","absentOptional":[]} -->
