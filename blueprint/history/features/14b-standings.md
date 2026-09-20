# Feature: Standings

**From build-plan:** feature 14b
**Build attempt:** 1
**Branch:** feature/standings
**Status:** verified

## Goal

Deepen the standings page (`frontend/src/standings/`) with a KPI strip,
secondary view tabs (Overall/Home/Away/Last 10), fixed-position tiered
grouping (direct to playoffs / play-in tournament / out of playoff
contention), and a per-team position-trend sparkline column, per
`prototypes/standings.html` and the shared design system — using only data
the existing standings API already returns.

## Design reference

`prototypes/standings.html` (approved mockup) for the KPI-chip, subtab,
tier-row, and sparkline visual language. Its illustrative 18-team field is
concept data — see **Notes for the AI** for the real 20-team cutoffs this
spec uses instead, and why.

## In scope

- KPI strip (`StandingsKpiStrip.jsx`, new): league leader (record), playoff
  cutoff team (record, position 6), biggest riser and biggest faller since
  the previous standings round, and average margin of victory — all computed
  from data the standings endpoint already returns, following the
  `frontend/src/dashboard/KpiStrip.jsx` pattern (independent loading/empty
  handling per chip, omit a chip rather than fake a zero when there's no
  previous round yet).
- Secondary view subtabs — Overall / Home / Away / Last 10 — that re-sort the
  existing standings table by the corresponding split's win percentage,
  parsed from the already-returned `basic.homeRecord` / `basic.awayRecord` /
  `basic.lastTenRecord` "W-L" strings. No new requests.
- Fixed-position tiered grouping, shown only on the Overall subtab and only
  for the `RS` (Regular Season) phase: rows 1-6 under a "Direct to playoffs"
  header, 7-10 under "Play-in tournament", 11+ under "Out of playoff
  contention" (see **Notes for the AI** for why these are the real cutoffs
  for this competition, not derived from the `qualified` flag). Replaces the
  current single `qualified`-based dashed divider in `StandingsTable.jsx`,
  which is unreliable for this purpose (see Notes).
- Per-team trend sparkline column: an inline SVG line of each team's
  standings position across the last up to 6 available rounds of the current
  phase (oldest to newest, most recent round last), following the
  `LeaderTrend.jsx` sparkline pattern. Teams with fewer than 2 data points
  show no sparkline (a dash), not a flat/fake line.
- Tie-break asterisk marker (existing behavior, unchanged) stays on the
  Overall subtab only.

## Out of scope

- Any new backend endpoint, schema change, or new query param. Every value in
  this feature comes from `GET /seasons/:seasonCode/phases/:phaseCode/standings[?round]`
  and `GET /seasons/:seasonCode/phases/:phaseCode/rounds`, both already called
  by the frontend.
- Tiered grouping or the playoff-cutoff KPI chip logic being re-derived for
  non-`RS` phases (e.g. `PO`, `FF`) — tiers only render for `RS`; the cutoff
  chip simply doesn't match on phases with fewer than 6 teams and is omitted.
- Deriving tier cutoffs from the `qualified` flag or from the play-in bracket
  games directly — both were checked against real data; `qualified` was
  rejected as a driver, while the play-in bracket's actual participants
  (positions 7-10) confirmed the fixed cutoff used here (Notes for the AI).
- Chart.js or any new charting dependency — the trend column is a small
  fixed-axis inline SVG, matching `LeaderTrend.jsx`'s existing precedent, not
  an interactive chart.
- Changes to the home dashboard, statistics leaderboards, team profile, or
  comparisons pages — those are build-plan items 14a (done), 14c, 14d, 14e,
  specced separately.

## Build loop

Per `blueprint/config.json`, `workflow.stepReview` is `feature`: build all
steps below in order without pausing for approval after each one, then stop
for one review packet covering the whole feature. `checkpointCommits` is
disabled, so do not create intermediate commits between steps — `/complete`
makes the final commit. Keep the project working after every step regardless.

## Build steps

- [x] 1. Replace the `qualified`-based divider with fixed-position tier
      grouping in `StandingsTable.jsx`. Add a `showTiers` boolean prop (passed
      from `StandingsPage.jsx` as `phaseCode === "RS"`). When true and the
      view is Overall, render a tier-header row (matching
      `prototypes/standings.html`'s `.tier-row` styling — add the small
      `.tier-row`/`.tier-row-postseason`/`.tier-row-playin`/`.tier-row-out`
      rule set to `frontend/src/index.css`, reusing existing
      `--color-success`/`--color-warning`/`--color-base-200` tokens)
      immediately before rank 1, rank 7, and rank 11 (using
      `entry.basic.position`, 1-indexed), labeled "Direct to playoffs",
      "Play-in tournament", and "Out of playoff contention". Remove the old
      `qualifiedDivider` dashed-border logic entirely. Keep the existing
      tie-break asterisk logic unchanged.
      **Done when:** on the `RS` phase, Overall subtab, the table shows the
      three labeled tier groups at the correct rank boundaries against the
      running app; on a non-`RS` phase, no tier rows render.

- [x] 2. Add the Overall/Home/Away/Last 10 subtabs. In `StandingsPage.jsx`,
      add a `view` state (default `"overall"`) rendered as a second tab row
      below the phase tabs, reusing the existing `tabs tabs-boxed tabs-sm`
      classes already used for phase selection. Pass `view` into
      `StandingsTable.jsx`. Add a `recordWinPct(record)` helper (parses a
      `"W-L"` string into `W / (W + L)`, returning `null` for a missing or
      malformed string) and use it to sort a copy of the standings array when
      `view !== "overall"`: by the matching split's win pct descending
      (`basic.homeRecord` / `basic.awayRecord` / `basic.lastTenRecord`), tie
      broken by `basic.pointsDifference` descending, entries with no parsable
      record pushed to the end in their original order. Display rank for a
      split view is the sorted index + 1, not `basic.position`. Tiers and the
      tie-break asterisk only render on the Overall view (per step 1).
      **Done when:** switching tabs re-sorts the table by the correct split
      against the running app (spot-check a team's Home tab position against
      its `basic.homeRecord`), and Overall returns to official position
      order.

- [x] 3. Add the KPI strip. New `frontend/src/standings/StandingsKpiStrip.jsx`,
      rendered above the subtabs in `StandingsPage.jsx`, taking `seasonCode`,
      `phaseCode`, `round`, and the already-fetched `standings` array as
      props (no duplicate standings request). Fetch
      `getSeasonStandings(seasonCode, phaseCode, { round: round - 1 })` when
      `round > 1` (enabled-gated), following `dashboard/KpiStrip.jsx`'s
      existing pattern exactly for the previous-round fetch and the
      riser/faller diff by `clubCode`. Chips: Leader (`W-L` record, team
      name), Playoff cutoff (the team at `basic.position === 6`, its
      record), Biggest riser (largest positive position delta vs previous
      round), Biggest faller (largest negative delta), Average margin of
      victory (`mean(|basic.pointsDifference| / basic.gamesPlayed)` across
      entries with `gamesPlayed > 0`, one decimal). Omit the cutoff chip when
      no team has `position === 6`; omit riser/faller when there is no
      previous round or no entry changed position. Each chip has independent
      loading/error/empty handling like the dashboard's `KpiChip`.
      **Done when:** the strip renders real values against the running app
      for the current `RS` round, degrades correctly at round 1 (no
      riser/faller chips), and updates correctly when switching phases.

- [x] 4. Add the per-team trend sparkline column. In `StandingsPage.jsx`,
      after the main standings query resolves, fetch up to 5 additional
      previous rounds (`round - 1` down to `max(1, round - 5)`, each via
      `getSeasonStandings(seasonCode, phaseCode, { round: n })`, run in
      parallel) and build a `Map<clubCode, number[]>` of `basic.position`
      oldest-to-newest, including the current round, skipping any round whose
      response has no entry for that club. Pass this map into
      `StandingsTable.jsx` as `trendByClub`. Add a `TrendCell` (in
      `StandingsTable.jsx`) that renders an inline SVG polyline of
      `-position` values (so an improving/lower position draws upward,
      matching `LeaderTrend.jsx`'s `buildTrend` scaling approach) when the
      club has 2+ data points, and a plain dash otherwise. Stroke color is
      `--color-success` for a net-improving trend (last value better than
      first), `--color-error` for net-declining, `--color-base-content` for
      unchanged.
      **Done when:** the Trend column renders a real multi-round sparkline
      for teams with standings history, and a dash for a team with only the
      current round's data (e.g. round 1), against the running app.

- [x] 5. Responsive pass and lint. Confirm the KPI strip wraps/scrolls
      instead of compressing illegibly and the subtab row doesn't overflow
      awkwardly at phone width (resize the running dev server, don't just
      read the CSS) — the table itself already scrolls horizontally via the
      existing `panel overflow-x-auto` wrapper. Run
      `cd frontend && npm run lint`.
      **Done when:** the standings page is usable at phone, tablet, and
      desktop widths with no unintended horizontal scroll of the page itself,
      and lint passes.

- [x] 6. Fix KPI chip label overflow found by `/check`. At narrow widths
      (phone and tablet, where `.kpi-strip` switches to the horizontally
      scrollable `grid-auto-columns: minmax(9rem, 1fr)` layout), `.kpi-chip
      .label` was silently losing its `white-space` to DaisyUI's own `.label`
      component class (also unqualified `.label`, in a higher-priority
      source position), which forces `white-space: nowrap`. With no explicit
      `white-space` in our rule, DaisyUI's nowrap won, so a chip's label text
      didn't wrap and painted past its chip's boundary into the next chip.
      Add `white-space: normal;` to `.kpi-chip .label` in
      `frontend/src/index.css` so it explicitly wins and wraps within its
      chip. This class is shared with `dashboard/KpiStrip.jsx`, so the same
      latent bug existed there too (confirmed, now also fixed) — no
      dashboard-specific change was needed.
      **Done when:** no KPI chip's label text visually overlaps a neighboring
      chip at phone (390px) or tablet (820px) width, on both the standings
      page and the dashboard, confirmed via computed-style inspection
      (`white-space: normal`) and screenshots against the running app.

## Files / areas

- `frontend/src/standings/StandingsTable.jsx` — tier grouping, view-based
  sort, trend column
- `frontend/src/standings/StandingsPage.jsx` — subtab state, KPI strip
  mount, historical-rounds fetch for trend
- `frontend/src/standings/StandingsKpiStrip.jsx` — new
- `frontend/src/index.css` — tier-row rule set (reusing existing tokens)
- `frontend/src/lib/api.js` — no changes expected; `getSeasonStandings`
  already accepts `{ round }`

## Data / contracts

No backend changes. Every value is sourced from already-existing endpoints:

- `GET /seasons/:seasonCode/phases/:phaseCode/standings[?round]` →
  `{ round, standings }` (`backend/src/routes/seasons.ts:225`), reused
  repeatedly with different `round` values for the KPI strip's previous round
  and the trend column's history window. Requesting a round with no
  `standingsBasic` snapshot yet (but present in the phase's round list)
  returns `{ round, standings: [] }`, not an error — the trend/KPI fetch
  logic must treat an empty `standings` array as "no data for this round",
  not fail.
- `GET /seasons/:seasonCode/phases/:phaseCode/rounds` → `{ rounds }`,
  already fetched by `StandingsPage.jsx` indirectly via phases; no new call
  needed since the trend window is derived from the current `round` number,
  not the full round list.
- `basic.homeRecord`, `basic.awayRecord`, `basic.lastTenRecord` are nullable
  `"W-L"` strings (confirmed in `backend/src/db/season-standings.ts`); parse
  defensively.

## Testing

No frontend unit/logic test runner is configured
(`verification.logicTests: when-configured`, none installed) — this feature
does not add one. Ran `cd frontend && npm run lint` and `npm run build` after
implementation, both clean. The Playwright smoke test
(`frontend/e2e/smoke.spec.js`) does not reference standings-specific markup
and needed no update.

Behavioral verification performed against the already-running dev server
(`qualityGates.regular.check: manual`, done anyway given the amount of new
derived-data logic):

- Hand-computed the expected KPI values, Overall order, and Home-view sort
  order from the live `E2025` `RS` round-38 and round-37 API responses
  (`GET /api/seasons/E2025/phases/RS/standings[?round=37]`), then screenshot-
  compared the running app at desktop and phone widths — KPI strip (leader
  26-12, playoff cutoff 23-15, biggest riser ▲1 Fenerbahce, biggest faller
  ▼3 Crvena Zvezda, avg margin 3.3), tier boundaries at ranks 6/10, and the
  Home-view re-sort all matched exactly.
- Confirmed `E2026` (no standings rows yet) renders the pre-existing "not
  available yet" empty state without error, exercising the empty-round path
  used by the KPI/trend fetch logic.
- Confirmed the trend sparkline renders distinct colors (green/red/muted)
  and shapes per team, consistent with each team's actual position history.
- A first `/check` pass caught a real bug (step 6): KPI chip labels
  overlapping neighboring chips at phone/tablet width, root-caused to a
  DaisyUI `.label` class collision. After the fix, re-verified via
  computed-style inspection (`white-space: normal`) and fresh screenshots at
  390px and 820px on both the standings page and the dashboard — no overlap.

## Notes for the AI

- **Why fixed tier cutoffs are 1-6 / 7-10 / 11+, not derived from the
  `qualified` flag:** confirmed directly against the live Neon data for
  `E2025` before writing this spec. The competition has 20 teams per season,
  not the mockup's 18. All five `qualified` columns
  (basic/calendar/streaks/aheadBehind/margins) are `false`/`null` for every
  team at every round of the season except the final regular-season round, so
  `qualified` cannot drive a mid-season tier display and was rejected as a
  data source. The actual play-in bracket games that season (`PI` phase)
  were contested by exactly the teams at positions 7, 8, 9, and 10 at the
  time (a 7-vs-10 / 8-vs-9 style bracket feeding 2 winners into an 8-team
  `PO` phase alongside the top 6) — confirming this competition follows the
  standard top-6-direct / next-4-play-in format for both `E2025` and
  `E2026`, per direct user confirmation. Do not attempt to re-derive tier
  cutoffs from `qualified` or vary them by season; 1-6/7-10/11+ is a fixed
  competition-format rule, not season-specific data.
- **Why the trend column plots position, not point differential:** the
  build-plan explicitly asks for "a per-team trend sparkline column" on the
  standings page, distinct from the dashboard's existing leader-only point-
  differential trend (14a). Position across recent rounds is the standings-
  native metric and is already returned per-round by the existing endpoint,
  so no new aggregate is needed.
- **Gotcha for future work on any `.kpi-chip`/`.label`-classed element:**
  DaisyUI ships its own unqualified `.label` component class (`white-space:
  nowrap; color: currentColor; ...`) that silently wins over
  `.kpi-chip .label` for any property our rule doesn't explicitly set, even
  though our selector has higher specificity — its source position beats
  specificity here. Always declare every visually load-bearing property
  explicitly on `.kpi-chip .label` (don't rely on the CSS-normal default)
  rather than assuming an unset property falls back to the CSS initial value.
- Reused `dashboard/KpiStrip.jsx`'s and `dashboard/LeaderTrend.jsx`'s
  existing patterns (chip loading/empty handling, previous-round diff,
  inline SVG scaling) rather than inventing new ones — this feature is
  deliberately parallel to 14a's approach, just applied to the full
  standings table instead of the dashboard summary.
- Followed `prototypes/standings.html` for visual structure (KPI chip
  styling, subtab styling, tier-row styling, sparkline sizing) but every
  number and label traces to a real computed value, not the mockup's
  hard-coded sample data.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":16698,"specSha256":"dcefd9b2001b07efb5ffc1fc7742845def0657eb2dbc0186479272b08cf6b62d","branch":"refs/heads/feature/standings","head":"c3ff554b95492cc00f1bd6b1c1625e48b0379459","baseRef":"refs/heads/master","baseCommit":"c3ff554b95492cc00f1bd6b1c1625e48b0379459","sourceTree":"15b3e6ac4a008fa3089adba4220beafa9359b1af","absentOptional":[]} -->
