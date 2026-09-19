# Feature: Comparisons and trends

**From build-plan:** feature 10
**Build attempt:** 1
**Branch:** feature/comparisons-and-trends
**Status:** verified

## Goal

Let a visitor compare two selected teams or two selected players side by side
and see a responsive, accessible chart-and-table view of their points-scored
trend across the selected phase's rounds.

## In scope

- A comparisons page at `/:seasonCode/comparisons` (the URL the nav bar's
  existing "Comparisons and trends" tab already points to and currently falls
  through to the season-home redirect; this feature makes that tab resolve to
  a real page), with a Teams/Players toggle (default Teams) and phase tabs
  (from `getPhases`, defaulting to `"RS"`, same pattern as `StatisticsPage`)
  that scope both the comparison table and the trend chart.
- **Entity selection**: exactly two entities at a time (A and B), the
  smallest interpretation of "compare selected teams or players" that still
  satisfies the build-plan item without inventing an N-way comparison UI.
  - Teams: two plain `<select>` pickers populated from the existing
    `GET /:seasonCode/teams` (already unpaginated, ~18 teams; no search
    needed at that size).
  - Players: two type-to-search pickers reusing the existing `search` query
    parameter on `GET /:seasonCode/players` (added in feature 8), each
    showing up to a handful of matches to pick from, since the full player
    list is too large for a plain `<select>`.
  - Before both A and B are chosen: "Select two teams to compare." /
    "Select two players to compare." (no table or chart rendered yet).
- **Comparison table**: once both are selected, a table with one column per
  entity and one row per metric, reusing the exact metric sets
  `StatisticsPage` already defines (see Files / areas: these move to a
  shared module so both pages use the identical, already-vetted field list,
  not a duplicated copy) &mdash; the team `basic` fields (GP, W, L, PCT, PF,
  PA, DIFF) from the existing standings response, or, for players, the full
  Traditional/Advanced/Scoring/Misc groups from the existing `/season-stats`
  response with the same Accumulated/Per game mode toggle `StatisticsPage`
  already has (default Per game). "-" for a null value, same convention as
  every other page.
- **Trend chart**: a responsive line chart plotting each selected entity's
  points scored per round across the selected phase, x-axis aligned to that
  phase's actual round numbers (from the existing `GET
  /:seasonCode/phases/:phaseCode/rounds`, so a round either entity didn't
  play shows as a gap rather than a fabricated zero or a misaligned point),
  y-axis points scored (each team's `localScore`/`roadScore` depending on
  which side they were on that game, from the existing
  `GET /:seasonCode/teams/:clubCode/games`; each player's `points` from the
  existing `GET /:seasonCode/players/:personKey/games`, both already
  phase-tagged per row so the selected phase's games are filtered
  client-side). Built with Chart.js (the project's own named, not-yet-used
  charting library from the overview's tech stack; "optional when it
  materially improves a view", and a round-by-round trend genuinely needs a
  chart over a wide table). The two entities are distinguished by color *and*
  line style (solid vs. dashed), not color alone, per the project's
  non-color-only status-cue rule. A real, always-visible `<table>` of the
  same round/value pairs is rendered directly under the chart (canvas
  charts aren't screen-reader-accessible on their own, and the build-plan
  item itself asks for "charts *and* tables"), plus a `role="img"` and
  `aria-label` summary on the canvas. "Not enough played games to chart a
  trend yet." when an entity has fewer than two played games in the
  selected phase.
- Loading and error (with retry) states for each independently-loading piece
  (teams/players list for the pickers, each selected entity's stats, each
  selected entity's games).

## Out of scope

- More than two entities at once, or comparing a team against a player.
- A configurable trend metric (only points scored per round; picking a
  different stat to trend, e.g. rebounds or PIR, is a reversible future
  enhancement, not required to satisfy this build-plan item).
- Team accumulated-vs-per-game toggle for the comparison table (feature 9
  already established that no per-game team data source exists; this
  feature doesn't change that).
- Motion (the overview's other optional library) or any animation beyond
  Chart.js's own defaults.
- Any backend change. Every value this feature needs already exists through
  endpoints features 7-9 already built and verified
  (`/teams`, `/teams/:clubCode/games`, `/players?search=`,
  `/players/:personKey/games`, `/season-stats`, `/phases/:phaseCode/rounds`,
  `/phases/:phaseCode/standings`).
- Changing `StatisticsPage`'s rendered output; extracting its metric
  constants into a shared module must not change what it displays.

## Build loop

Follow `blueprint/config.json`: `workflow.stepReview` is `feature` (one review
packet after all steps), `workflow.checkpointCommits` is `disabled`.

## Build steps

- [x] 1. Frontend: add `chart.js` as a dependency (`cd frontend && npm install
      chart.js`, matching the browser-test setup's install-then-verify
      pattern). Extract `TEAM_METRICS`, `PLAYER_METRIC_GROUPS`,
      `metricGroupFor`, and `metricLabelFor` from
      `frontend/src/statistics/StatisticsPage.jsx` into a new
      `frontend/src/lib/statsFields.js`, and update `StatisticsPage.jsx` to
      import them from there instead (no behavioral change).
      Done when: `frontend/npm run build` and `npm run lint` pass, and
      `/E2025/statistics` still renders and sorts identically to before;
      verified live with a temporary Playwright check (added, run, then
      deleted) exercising the team metric switch and the players view,
      using the `Browser tests` harness set up in the prior session.
      Along the way, `npm run lint` surfaced a pre-existing failure in
      `frontend/eslint.config.js` (`playwright.config.js`'s `process` global
      wasn't recognized, from the prior session's Playwright setup, which
      never ran lint). Fixed with a small `files: ['playwright.config.js']`
      override using Node globals; unrelated to this feature's scope but
      needed for `npm run lint` to pass cleanly.
- [x] 2. Frontend: add `frontend/src/comparisons/TrendChart.jsx`, a small
      component wrapping a `<canvas>` and Chart.js (created in a `useEffect`,
      destroyed on unmount/update, since Chart.js owns canvas state outside
      React) that renders a two-series line chart (solid + dashed) from
      `{ label, points: (number|null)[] }[]` and x-axis labels, plus the
      always-visible accessible `<table>` of the same round/value pairs and
      the `role="img"`/`aria-label` canvas summary described above.
      Done when: `frontend/npm run build` passes.
- [x] 3. Frontend: add `frontend/src/comparisons/ComparisonsPage.jsx`
      implementing the Teams/Players toggle, phase tabs, entity pickers, and
      comparison table described above, and wire it at `comparisons` under
      `SeasonLayout` in `frontend/src/App.jsx`.
      Done when: navigating to `/E2025/comparisons` shows the empty-selection
      prompt, picking two teams (or two players, after switching) shows a
      populated comparison table with the right per-mode values; verified
      live with both dev servers running.
- [x] 4. Frontend: add the trend chart section to `ComparisonsPage.jsx`
      (fetch each selected entity's games, filter to the selected phase,
      build the round-aligned points-scored series using the phase's real
      rounds, render via `TrendChart`).
      Done when: comparing two teams or two players with enough played games
      in the selected phase shows a two-line chart with a visible legend
      distinguishing solid/dashed series and a matching data table beneath
      it; an entity with fewer than two played games in that phase shows
      "Not enough played games to chart a trend yet." instead; verified live
      with a temporary Playwright check (added, run, then deleted).
      Live verification surfaced a real bug: nothing stopped a user picking
      the same team (or player) for both A and B, which produced a React
      duplicate-key warning in `TrendChart`'s data table (two series sharing
      one label) and is semantically meaningless anyway (comparing an entity
      to itself). Fixed by adding an `excludeId` prop to `TeamPicker` and
      `PlayerPicker` so each picker omits whichever entity is already chosen
      on the other side, and by keying `TrendChart`'s table columns on
      series index rather than label as defense in depth.

## Files / areas

- `frontend/package.json` (add `chart.js`)
- `frontend/src/lib/statsFields.js` (new, extracted from `StatisticsPage.jsx`)
- `frontend/src/statistics/StatisticsPage.jsx` (import from the new module)
- `frontend/src/comparisons/TrendChart.jsx` (new)
- `frontend/src/comparisons/ComparisonsPage.jsx` (new)
- `frontend/src/App.jsx` (new route)
- `frontend/eslint.config.js` (step 1: pre-existing lint gap fix, no other
  change)

## Data / contracts

No backend changes. This feature only reads existing endpoints:
`GET /:seasonCode/teams`, `GET /:seasonCode/teams/:clubCode/games`,
`GET /:seasonCode/players?search=`, `GET /:seasonCode/players/:personKey/games`,
`GET /:seasonCode/season-stats` (with the existing `personKey` filter, called
once per selected player), `GET /:seasonCode/phases/:phaseCode/rounds`, and
`GET /:seasonCode/phases/:phaseCode/standings`. The trend chart's x-axis is
exactly that phase's round list; a round with no played game for an entity is
a gap in that entity's series, never a zero.

## Testing

No unit test runner is configured, so verification is `npm run build`/`npm
run lint` plus live verification with both dev servers running. A `Browser
tests` command now exists (`cd frontend && npm run test:browser`, set up
separately); it is not required by any configured gate for this feature, and
its one existing smoke test (Teams directory) is unrelated to this page, so
it is not extended here.

## Notes for the AI

- Chart.js instances must be destroyed in the `useEffect` cleanup (or before
  re-creating on data change); leaving a stale instance attached to a reused
  canvas throws when React re-renders.
- Reuse the local `CenteredSpinner`/`ErrorAlert` pattern already duplicated
  across every other page rather than extracting a shared component now.
- `getSeasonTeams`, `getTeamGames`, `getSeasonPlayers` (with `search`),
  `getPlayerGames`, `getPlayerSeasonStats` (via the existing `getLeaderStats`
  with a `personKey` filter added in feature 8), `getRounds`, and
  `getSeasonStandings` already exist in `frontend/src/lib/api.js`; no new API
  client functions are needed.
- `getPlayerSeasonStats`/`getLeaderStats` returns `players: StatsEntry[]`
  filtered to one entry when `personKey` is given; read `data.players[0]`,
  guarding for a player with no stats row in that phase/mode the same way
  `PlayerPage`'s `SeasonStatsSection` already does.
- Team game rows carry `localTeam`/`roadTeam`/`localScore`/`roadScore` and
  `phaseCode`/`roundNumber`; player game rows carry `side`,
  `points`/`phaseCode`/`roundNumber` directly (see `TeamPage.jsx`'s
  `opponent()` helper and `PlayerPage.jsx`'s `GameLogSection` for the
  existing side-aware access patterns to follow).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11533,"specSha256":"bb8db89e51281ee93b46d02ccb61678b16d0c10251fb0022d7f60d3d2a01dc3e","branch":"refs/heads/feature/comparisons-and-trends","head":"0bf3cb7a58d7471a4355ecab96135d1319649f80","baseRef":"refs/heads/master","baseCommit":"0bf3cb7a58d7471a4355ecab96135d1319649f80","sourceTree":"eafeb24a299e6e30ce97efacbab1e839e8a84778","absentOptional":[]} -->
