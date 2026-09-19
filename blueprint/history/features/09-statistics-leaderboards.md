# Feature: Statistics leaderboards

**From build-plan:** feature 9
**Build attempt:** 1
**Branch:** feature/statistics-leaderboards
**Status:** verified

## Goal

Let a visitor rank and filter the selected season's team and player metrics,
across the data's available accumulated, per-game, and rate-based views,
without presenting a missing value as zero.

## In scope

- A statistics page at `/:seasonCode/statistics` (the URL the nav bar's
  existing "Statistics leaderboards" tab already points to and currently
  falls through to the season-home redirect; this feature makes that tab
  resolve to a real page), with a Teams/Players toggle (default Teams) and
  phase tabs (from `getPhases`, defaulting to `"RS"` when present else the
  first phase, same pattern as `StandingsPage`/`TeamPage`) that scope both
  views.
- **Team leaderboard**: sourced from the existing
  `GET /:seasonCode/phases/:phaseCode/standings` response (already
  unpaginated, at most ~18 teams), which is the *only* team-level statistical
  data the app has (confirmed again here: there is still no team season
  aggregate table, only the seven `standings_*` views already exposed).
  Sortable client-side (the full team list for a phase is always already in
  memory) by: games played, wins, losses, win percentage, points for, points
  against, and point differential (`StandingBasic`'s numeric fields, the
  same ones `StandingsTable` already renders). A rank column (1-based
  position under the current sort), team name (linking to
  `/:seasonCode/teams/:clubCode`), and the selected metric's value. Default
  sort: points for, descending. A direction toggle (ascending/descending)
  reuses the same tab-button pattern as the metric picker. "-" for a null
  value, matching `StandingsTable`'s existing fallback.
- **Player leaderboard**: sourced from the existing `GET
  /:seasonCode/season-stats`, extended with new optional `sort`/`order`
  query parameters (see Data / contracts) so results come back genuinely
  ranked by the chosen metric; the endpoint's current default order
  (`entryOrdinal`) is confirmed (via a live check against real E2025 data) to
  be an arbitrary source-list order, not a ranking by any displayed stat, so
  it cannot serve a leaderboard without this addition. Controls: mode
  toggle (Accumulated / Per game, the two values `/season-stats` already
  supports), a metric picker grouped the same way `PlayerPage`'s stat grids
  already are (Traditional / Advanced / Scoring / Misc, the same field sets
  `PlayerPage` already displays; "rate-based views" in the build-plan item
  maps to the Advanced/Scoring groups, which are already-available
  percentage/ratio fields, not a third literal mode: `/season-stats` only
  ever accepts `accumulated`/`perGame`), and the same ascending/descending
  direction toggle as the team leaderboard. Default sort: `pointsScored`
  (Traditional), descending. Table columns: rank (1-based position within
  the current page and sort, not a stable cross-page rank), player name
  (linking to `/:seasonCode/players/:personKey`), and the selected metric's
  value. Existing `limit`/`offset`/`hasMore` pagination (Previous/Next
  buttons, the same pattern `PlayersPage` uses).
- Loading, error (with retry), and empty ("No standings available yet for
  this phase." for teams, matching `StandingsPage`'s wording; "No season
  statistics available yet for this phase." for players) states for each
  leaderboard.

## Out of scope

- Any new team-level aggregate table, endpoint, or computed stat beyond the
  existing standings `basic` fields (same reasoning as feature 7: no such
  table exists yet).
- A derived "team per-game" view computed by dividing standings totals by
  games played. The data model note on aggregation ownership ("Document one
  owner for each aggregation... do not recompute it independently in the
  frontend") argues against introducing a frontend-computed average alongside
  the pipeline-owned totals; the build-plan's accumulated/per-game/rate-based
  wording is fully satisfied by the player leaderboard, which the API already
  natively supports in all of those forms.
- A minimum games-played/minutes-played qualification threshold for
  percentage or ratio metrics (a real EuroLeague convention, but no threshold
  value exists in the plans or data; inventing one would be guessing a
  business rule).
- Player name search on this page (already covered by `/:seasonCode/players`
  in feature 8).
- Team/player comparisons and trend charts (feature 10) and playoff views
  (feature 11).
- Changing `StandingsPage`, `StandingsTable`, `TeamPage`, `PlayersPage`,
  `PlayerPage`, or `LeadersPanel`'s existing behavior; `LeadersPanel`'s call
  to the extended `getLeaderStats` omits the new `sort`/`order` parameters,
  so its existing entryOrdinal-ordered "leaders" widget is unchanged.

## Build loop

Follow `blueprint/config.json`: `workflow.stepReview` is `feature` (one review
packet after all steps), `workflow.checkpointCommits` is `disabled`.

## Build steps

- [x] 1. Backend: add optional `sort` and `order` query parameters to `GET
      /:seasonCode/season-stats` and `getSeasonStats` in
      `backend/src/db/season-stats.ts`. `sort` is validated against a fixed
      allow-list mapping each accepted key to its real Drizzle column across
      the already-joined traditional/advanced/scoring/misc tables (the same
      field sets `PlayerPage`'s `TRADITIONAL_FIELDS`/`ADVANCED_FIELDS`/
      `SCORING_FIELDS`/`MISC_FIELDS` already use: traditional
      `gamesPlayed`/`minutesPlayed`/`pointsScored`/`totalRebounds`/`assists`/
      `steals`/`turnovers`/`blocks`/`pir`; advanced
      `effectiveFieldGoalPercentage`/`trueShootingPercentage`/
      `reboundsPercentage`/`assistsToTurnoversRatio`/`possessions`; scoring
      `twoPointRate`/`threePointRate`/`pointsFromTwoPointersPercentage`/
      `pointsFromThreePointersPercentage`/`pointsFromFreeThrowsPercentage`;
      misc `wins`/`losses`/`doubleDoubles`/`tripleDoubles`); an unlisted key
      returns `400 INVALID_QUERY`. `order` is `asc`/`desc` (default `asc`
      when `sort` is given, matching `requestedGameOrder`'s existing
      default), invalid value returns `400 INVALID_QUERY`. When `sort` is
      given, order by that column with `NULLS LAST` in both directions (the
      same explicit-`NULLS LAST`-on-`desc` pattern `getGames` already uses
      for `scheduledAt`, since Postgres's default for `ASC` is already `NULLS
      LAST`), then `entryOrdinal` as a stable tiebreaker; omitting `sort`
      keeps today's exact behavior (order by `entryOrdinal` alone).
      Done when: `backend/npm run build` passes, and with the backend dev
      server running, `/api/seasons/E2025/season-stats?phase=RS&mode=perGame&sort=pointsScored&order=desc`
      returns players in strictly non-increasing `pointsScored` order (spot
      checked against the same data fetched unsorted), `sort=notAField`
      returns 400 `INVALID_QUERY`, and the endpoint's existing behavior
      without `sort`/`order` is unchanged.
- [x] 2. Frontend: extend `getLeaderStats` in `frontend/src/lib/api.js` to
      pass through optional `sort`/`order` params to the existing
      `/season-stats` call.
      Done when: `frontend/npm run build` passes, and `LeadersPanel.jsx`'s
      existing call (which does not pass `sort`/`order`) is unchanged.
- [x] 3. Frontend: add `frontend/src/statistics/StatisticsPage.jsx`
      implementing the Teams/Players toggle, phase tabs, and the team
      leaderboard section described above (client-side sortable table from
      `getSeasonStandings`), and wire it at `statistics` under
      `SeasonLayout` in `frontend/src/App.jsx`.
      Done when: navigating to `/E2025/statistics` shows the team
      leaderboard sorted by points for by default, and clicking a different
      metric or the direction toggle re-sorts the table; verified live with
      both dev servers running.
- [x] 4. Frontend: add the player leaderboard section to
      `StatisticsPage.jsx` (mode toggle, grouped metric picker, direction
      toggle, paginated table via the extended `getLeaderStats`), reachable
      through the page's Teams/Players toggle.
      Done when: switching to Players shows a leaderboard sorted by points
      scored per game by default (regular season), changing the mode,
      metric, or direction updates the ranking and values accordingly, and
      paging through moves to the next/previous rank band; verified live
      with both dev servers running.

## Files / areas

- `backend/src/db/season-stats.ts` (add `sort`/`order` to `getSeasonStats`)
- `backend/src/routes/seasons.ts` (extend `/season-stats` route validation)
- `frontend/src/lib/api.js` (extend `getLeaderStats`)
- `frontend/src/statistics/StatisticsPage.jsx` (new)
- `frontend/src/App.jsx` (new route)

## Data / contracts

`GET /api/seasons/:seasonCode/season-stats` gains optional `sort` (must be
one of the allow-listed keys above, else `400 INVALID_QUERY`) and `order`
(`asc`|`desc`, else `400 INVALID_QUERY`) query parameters, alongside the
existing `phase`/`mode`/`limit`/`offset`. No response-shape change: still
`{ phase, mode, players: StatsEntry[], pagination: { limit, offset, hasMore
} }`, just reordered when `sort` is given. No other endpoint changes; team
leaderboard data comes entirely from the existing, unmodified
`/phases/:phaseCode/standings` response.

## Testing

No test runner is configured for either app, so verification is `npm run
build`/`npm run lint` (frontend) and `npm run build` (backend) plus live
verification: an API check for the new `sort`/`order` behavior and its
validation errors, and live-browser checks for the statistics page covering
loading, empty, the Teams/Players toggle, phase switching, metric/mode/
direction changes, and player pagination.

## Notes for the AI

- The `entryOrdinal`-is-not-a-ranking finding above was confirmed live
  (`/api/seasons/E2025/season-stats?phase=RS&mode=perGame&limit=10` shows
  `pointsScored` values of 12.4, 16.5, 15.9, 19.0, ... in `entryOrdinal`
  order, not descending), not assumed; this is why step 1 is necessary
  rather than just reusing the existing default order.
- Reuse the local `CenteredSpinner`/`ErrorAlert` pattern already duplicated
  across `StandingsPage.jsx`/`FixturesPage.jsx`/`TeamPage.jsx`/`PlayerPage.jsx`
  rather than extracting a shared component now.
- `StandingBasic.winPercentage` is a numeric string; parse with `Number(...)`
  only for the client-side comparator, not for display (render the original
  string, same as `StandingsTable` already does).
- `getSeasonStandings(seasonCode, phaseCode)` already returns the *latest*
  round when no `round` is passed; no round selector is needed here, same as
  `TeamPage`.
- Give each `useQuery` call a stable key that includes every parameter
  affecting its result (phase, mode, sort, order, offset), per
  `coding-standards.md`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10944,"specSha256":"49689f84fbabacf5d4838f125c705e7724ebfda02851b70ba4f4af0ee2786277","branch":"refs/heads/feature/statistics-leaderboards","head":"0ebf7dcc50ff33cea99a0c78cf068f025e9cd836","baseRef":"refs/heads/master","baseCommit":"0ebf7dcc50ff33cea99a0c78cf068f025e9cd836","sourceTree":"d617bdb65b2eba3d934e015fd8c017861e1b6c76","absentOptional":[]} -->
