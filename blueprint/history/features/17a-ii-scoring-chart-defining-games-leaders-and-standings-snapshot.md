# Feature: Scoring chart, defining games, leaders, and standings snapshot

**From build-plan:** feature 17a-ii
**Build attempt:** 1
**Status:** verified

**Branch:** feature/scoring-chart-defining-games-leaders-and-standings-snapshot

## Goal

Add the Season Overview page's data-dense middle section: a scoring trend
chart paired with the season's closest games, and statistical leaders
paired with a standings snapshot. This builds on 17a-i's page shell,
inserting these sections between the phase story and the (already
present) data coverage panel.

## Design reference

UI-UX.md section 7.13 (Season Overview), content-flow items 3-4: "Scoring
through the season" (a filled area chart of monthly average combined
scoring) beside "Defining games" (highlight cards for notable games), and
"Statistical leaders" (four linked cards) beside "Standings snapshot".
Two adaptations to the app's actual conventions and prior decisions:

- "Defining games" = the season's closest games by score margin (decided
  when 17a was split, since "defining" has no other objective, data-driven
  meaning here).
- "Standings snapshot" mirrors the Home dashboard's existing flat
  top-N-with-a-"View full standings" link pattern
  (`dashboard/StandingsSnapshot.jsx`) rather than the guideline's
  multi-tier-group version - this app's tiering (direct/play-in/out of
  contention) lives in `StandingsTable.jsx` on the full Standings page, and
  lifting that grouping logic onto this page is a bigger, separate lift
  than this reviewable step should take. Using the same simplification the
  Dashboard already uses keeps the app internally consistent.

## In scope

- `ScoringTrendChart`: a Chart.js line chart (filled, single series) of
  monthly average combined score, built from `playedGames` (already
  fetched by `SeasonOverviewPage` for the summary cards) grouped by
  `scheduledAt`'s year-month, in chronological order, with month labels
  thinned via the existing `thinAxisLabels` helper. Follows this app's
  established chart conventions (theme-aware colors via the
  `useActiveTheme`-style hook already used in `TrendChart.jsx`, `role="img"`
  with a descriptive `aria-label`, inset in the bordered well, fluid
  width). An empty state ("Not enough played games yet") when fewer than 2
  months have played games.
- `DefiningGames`: the 3 played games with the smallest `|localScore -
  roadScore|` this season, each as a card with the round label, a mirrored
  mini scoreline (both crests and scores), and the game date, linking to
  that game's detail page. An empty state when there are no played games
  yet.
- `SeasonLeaders`: four linked leader cards (Points, Rebounds, Assists,
  PIR - all per-game, all phases combined via `phase: "all"`, matching
  `dashboard/LeadersPanel.jsx`'s existing category-card pattern extended
  to a 4th category), each linking to that player's page, with a "Full
  leaderboards →" link to the Statistics page.
- `SeasonStandingsSnapshot`: the top 8 Regular Season standings rows
  (rank, crest, team, W-L record), mirroring
  `dashboard/StandingsSnapshot.jsx`'s existing pattern, with a "Full
  standings →" link to the Standings page.
- Place `ScoringTrendChart` beside `DefiningGames`, and `SeasonLeaders`
  beside `SeasonStandingsSnapshot`, each pair in a responsive two-column
  layout at `xl` and stacked below, between the phase story and the data
  coverage panel on `SeasonOverviewPage.jsx`.
- Loading and error states for every new query, using the shared
  `AsyncState` component, each isolated to its own section (a failed
  leaders fetch does not block the standings snapshot next to it, matching
  how the existing dashboard widgets each fail independently).

## Out of scope

- The road-to-the-title knockout steps and the closing links bar
  (17a-iii).
- Any change to 17a-i's hero, summary cards, phase story, or the coverage
  panel.
- Standings tiering/grouping on this page (see Design reference).
- Any backend endpoint or schema change - every value comes from
  `getSeasonGames`, `getLeaderStats`, and `getSeasonStandings`, all
  already implemented and already used elsewhere in the app.
- A shared/extracted "leader card" or "standings row" component - the
  existing dashboard versions are already small and per-page; duplicating
  their JSX locally (as this app already does between e.g.
  `TeamStatsTable`-style tables across pages) is more consistent with this
  codebase's existing pattern than a new premature shared component.

## Build loop

Follow `workflow.stepReview: "feature"` (self-review, one final packet) and
`workflow.checkpointCommits: "disabled"` (no per-step commits; `/complete`
makes the one feature commit).

## Build steps

- [x] 1. Add `DefiningGames` and `SeasonStandingsSnapshot` to
      `SeasonOverviewPage.jsx`: `DefiningGames` reuses the already-fetched
      `playedGames` (no new query); `SeasonStandingsSnapshot` adds one
      `getSeasonStandings(seasonCode, "RS")` query. Place both without the
      chart/leaders yet, in their final two-column layout positions.
      **Done when:** `npm run build` passes and CDP shows the three
      closest games (by margin) and the top 8 standings rows rendering
      correctly on a real season, each linking to the right route.

      Verified via CDP on `E2025`: 3 defining-games links and 8 standings
      rows (each linking to `/E2025/games/...` and `/E2025/teams/...`
      respectively).
- [x] 2. Add `SeasonLeaders` with its four category queries
      (`getLeaderStats(seasonCode, { phase: "all", mode: "perGame", sort,
      order: "desc", limit: 1 })` for Points, Rebounds, Assists, PIR).
      **Done when:** `npm run build` passes and CDP shows four correct
      leaders (name, club, value) each linking to their player page.

      Verified via CDP on `E2025`: Points (Vezenkov, Olympiacos, 19.0),
      Rebounds (Milutinov, Olympiacos, 7.2), Assists (Miller-McIntyre,
      Crvena Zvezda, 7.4), PIR (Vezenkov, Olympiacos, 22.1) - PIR
      cross-checked against a direct API call to the same endpoint.
- [x] 3. Add `ScoringTrendChart`, grouping `playedGames` by month and
      charting the average combined score per month.
      **Done when:** `npm run build` passes, the chart renders with
      correct theme colors in both themes (verified via CDP), and the
      chart's `aria-label` names what it shows.

      Verified via CDP on `E2025`: one canvas with `aria-label` "Average
      combined score per month across the season, from 169 to 176
      points" (consistent with the summary card's 172.0 pts/game season
      average). Toggled the theme (dark → light) via the real nav toggle
      button and confirmed the chart survives the switch and re-renders
      without error (it destroys and recreates itself on the
      `data-theme` mutation, matching `TrendChart.jsx`'s existing
      pattern).
- [x] 4. Final layout pass: confirm the two-column pairing collapses
      correctly below `xl`, and that a season with fewer than 2 played
      months (a season that just started) shows `ScoringTrendChart`'s and
      `DefiningGames`' empty states instead of a broken or empty-looking
      chart.
      **Done when:** `npm run lint` and `npm run build` pass, and CDP
      shows both the full-data case (a season with real history) and the
      early-season empty-state case rendering correctly.

      Verified via CDP on `E2026` (zero played games anywhere): "Not
      enough played games yet to chart a trend." (no canvas rendered -
      confirmed 0 canvases), "No played games yet this season." for
      Defining games, "Not available yet." for each of the 4 leader
      cards, and "Standings not available yet." for the snapshot - no
      fabricated zeros or broken layout, no console exceptions in either
      case.

## Files / areas

- `frontend/src/season/SeasonOverviewPage.jsx`

## Data / contracts

None - every value comes from `getSeasonGames`, `getLeaderStats`, and
`getSeasonStandings`, all already implemented and already used elsewhere
in the app. No API or persisted-data change.

## Testing

No unit test runner is configured. Verification is `npm run lint`,
`npm run build`, and CDP evidence for each new section against a real
season, plus the early-season empty-state case.

## Notes for the AI

- `playedGames` (from 17a-i) already includes every played game's
  `scheduledAt`, `localScore`/`roadScore`, `localTeam`/`roadTeam`, and
  `roundName`/`roundNumber` - no new games query is needed for
  `DefiningGames` or `ScoringTrendChart`.
- Follow `TrendChart.jsx`'s exact theme-color-via-CSS-custom-property
  pattern (reading `--color-primary`/`--color-base-content` off the canvas
  element) for `ScoringTrendChart`, rather than hardcoding colors.
- `getLeaderStats`'s `phase: "all"` and `dashboard/LeadersPanel.jsx`'s
  category-card shape are already proven in this app; match them exactly
  rather than inventing a different query shape for the 4th category.
- Watch for the same page-size cap (`limit` capped at 100 server-side)
  that required paging in 17a-i - none of this feature's new queries need
  more than `limit: 1` (leaders, since only the top entry is shown) or an
  already-small result (top-8 standings), so no new pagination loop should
  be needed, but confirm this against the real season-stats/standings
  responses rather than assuming.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9362,"specSha256":"0fb0eeaa8e0190a6598dce8ccd14ef72cf7e82bfb9142f86cbde693efb65fc77","branch":"refs/heads/feature/scoring-chart-defining-games-leaders-and-standings-snapshot","head":"31bd81243ec04ebed63483766e5773c01be07020","baseRef":"refs/heads/master","baseCommit":"31bd81243ec04ebed63483766e5773c01be07020","sourceTree":"ef9fa3bf76c24af896407abe837d8856ec10c107","absentOptional":[]} -->