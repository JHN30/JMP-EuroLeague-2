# Fix: Leaders page rebuilt around category cards

**Type:** Fix (polish from feedback)
**Status:** verified
**Branch:** master (done from user feedback; not run through `/fix` and `/implement`)

Recorded after the work.

## The problem

The Leaders page (`/:season/statistics`) was one sortable table per scope. The Teams scope read data that
disagreed with the rest of the app (it left overtime out), there were no team or position filters, nothing showed
who was improving, and the Advanced scope had no per-100 or rate statistics.

## What changed

- **Landing with category cards** for Players, Teams and Advanced: each card is a top 5 with photo or crest, team,
  value and a bar, and opens the full leaderboard for that statistic. The old table mode is gone; boards are sorted
  by the statistic itself, with an order switch.
- **Players board**: family tabs and statistic chips, per game or totals, minimum games (default: the qualified
  rule), team and position filters, search, 25 per page, and movement arrows (places gained or lost since before
  the latest round) for the six form statistics. Percentage boards carry a volume rule (for example 3P% needs 1+
  attempt a game) that is stated under the board.
- **Hot right now / Strong finish**: last 5 games against the season average for points, rebounds, assists,
  steals, blocks and PIR, plus the biggest rank movers. It shows a message until players have five games.
- **Teams board**: rebuilt on `league-team-stats` (overtime counted), advanced standings and standings, so it
  agrees with Home, the season overview and the team pages.
- **Advanced board**: scope tabs from the API, per-100 and rate statistics from `app_player_round_stats`, minimum
  minutes, order, server paging and player photos.
- Backend: `GET /advanced/leaders` takes `limit`, `offset`, `order`, `minMinutes` and returns `imageUrl` and
  `total`; new `GET /leaders/form`; `season-stats` returns `positionName` and sorts on more fields.
  `backend/src/db/season-form.ts` is new. The form and rank logic lives in the API, as the project plan asks.
- Files: `frontend/src/leaders/*` replace `frontend/src/statistics/StatisticsPage.jsx`,
  `AdvancedLeaderboard.jsx` and `LeaderboardKpiStrip.jsx` (deleted).
- Tabs: the scope (Players, Teams, Advanced) and the phase are the shared `TabStrip`, in place of the segmented toggle and phase select. `TabStrip` now has a `level` (1 main navigation, 2 the filter under it, 3 detail strips, the default): bigger tabs for the more important strip, and an orange underline under the chosen tab, on every page. Levels: page sections (team, player, game, comparison, Leaders scope, Standings and Games phase) are 1; phases, Advanced scopes and the Standings display are 2; the rest are 3. The team page now shows its section strip above the phase strip. The statistic pickers are filled chips (`.stat-chip`), the lowest rung. The line above a board keeps the way back and the description together on the left (the Advanced early-season note is a badge there).
- Team Overview grid: gets a `minmax(0, 1fr)` column so two panels no longer widen the page on a phone.
- Phone: the bar on a board row is hidden below 640px so names fit; card grids use `minmax(0, 1fr)` so a long
  name cannot widen the page.
- Specs: `filter-controls` and `progressive-disclosure` updated for the new page; new `leaders.spec.js`.

## Verify

- `cd frontend && npm run lint` and `npm run build`, `cd backend && npm run build` pass; the full browser suite
  passes (86 tests).
- Headless crawl of the three landings, full boards, filters, paging, E2026 (early season), the playoffs phase,
  E2023 and phone width: no page errors, no failed requests, no horizontal overflow.

## Known gaps

- No per-36 or per-30 statistics (not wanted for now). Career and all-season leaders wait until all seasons are
  loaded.
