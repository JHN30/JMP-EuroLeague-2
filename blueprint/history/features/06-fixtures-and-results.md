# Feature: Fixtures and results

**From build-plan:** feature 6
**Build attempt:** 1
**Branch:** feature/fixtures-and-results
**Status:** verified

## Goal

Let a visitor browse a season's games by phase, round, and status (scheduled
vs. completed), and open any game to see its score, metadata, and available
team/player box-score statistics.

## In scope

- A fixtures list page at `/:seasonCode/games` with:
  - Phase tabs (from `getPhases`, same pattern as `StandingsPage`), default
    `"RS"` when present else the first phase.
  - A round selector scoped to the selected phase (from
    `getRounds(seasonCode, phaseCode)`), defaulting to "All rounds" (no round
    filter) so the page is useful immediately without guessing a "current"
    round; picking a specific round narrows the list to just that round.
  - A status filter (All / Played / Scheduled) reusing the existing
    `status` values the games API already supports.
  - Each row shows both teams, scheduled date/time (or "TBD" when
    `scheduledAt` is null), round, and score when played; unplayed games show
    no score rather than `0-0`.
  - Loading, error (with retry), and empty ("No games match these filters.")
    states.
  - Pagination using the existing `limit`/`offset`/`hasMore` contract when no
    round is selected (an unfiltered list can be long); a selected round shows
    its full game list in one page (a round's games are drawn from
    `getRounds`, ordered before the games query never exceeds a few dozen
    rows, well under the existing max `limit` of 100).
- A game detail page at `/:seasonCode/games/:gameCode` with:
  - Team names, scheduled date/time, phase/round, game status, and score
    (final score when played, "Not yet played" when not).
  - Team box-score stats (both sides) and player box-score stats (both sides)
    from the existing `/box-score` endpoint, rendered as tables.
  - When the box score has no rows for a side (game not played, or data not
    available), show "Box score not available yet" for that section instead
    of an empty table.
  - Loading and error (with retry) states for both the game and box-score
    requests; a nonexistent game code shows a not-found message instead of a
    blank page.
- Backend: extend the existing `/:seasonCode/games` list endpoint and
  `getGames` query with optional `phase` and `round` filters (the `games` rows
  already carry `phaseCode` and `roundNumber`), validated against that
  season's real phases/rounds the same way the standings endpoint validates
  `phaseCode`/`round` today. `round` without `phase` is rejected (round
  numbers aren't unique across phases).
- Both new pages are reachable from the nav bar's existing "Fixtures and
  results" tab (`/:seasonCode/games`), which today falls through to the
  season-home redirect; this feature makes that tab resolve to a real page.

## Out of scope

- Live/in-progress game states beyond what `gameStatus`/`played` already
  distinguish (no polling or live score updates).
- Filtering fixtures by team.
- Changing the dashboard's existing `GamesSnapshot` widget.
- Any change to the standings, teams, players, or statistics endpoints.
- A "current round" default heuristic; the round filter starts unset ("All
  rounds") rather than guessing which round is most relevant.

## Build loop

Follow `blueprint/config.json`: `workflow.stepReview` is `feature` (one review
packet after all steps), `workflow.checkpointCommits` is `disabled`.

## Build steps

- [x] 1. Backend: add optional `phase` and `round` query-parameter support to
      `getGames` (`backend/src/db/season-games.ts`) and the
      `GET /:seasonCode/games` route (`backend/src/routes/seasons.ts`),
      validated against that season's real phases (via `getPhases`) and, when
      a round is also given, that phase's real rounds (via `getRounds`,
      reusing the existing `requestedRound` helper and the standings route's
      validation pattern). Reject `round` given without `phase` as
      `400 INVALID_ROUND`. Filtering with an unknown phase returns
      `404 PHASE_NOT_FOUND`, matching the standings route's existing
      behavior.
      Done when: `backend/npm run build` passes, and hitting
      `/api/seasons/E2025/games?phase=RS&round=1` returns only round 1 games
      for the regular season, while `?phase=RS&round=999` returns 404 and
      `?round=1` (no phase) returns 400 (verified with the backend dev server
      running).
- [x] 2. Frontend: extend `getSeasonGames` in `frontend/src/lib/api.js` to pass
      through `phase`/`round`, and add `getRounds(seasonCode, phaseCode)`,
      `getGame(seasonCode, gameCode)`, and `getBoxScore(seasonCode, gameCode)`
      calling the existing `/phases/:phaseCode/rounds`, `/games/:gameCode`,
      and `/games/:gameCode/box-score` endpoints.
      Done when: `frontend/npm run build` passes.
- [x] 3. Frontend: add `frontend/src/games/FixturesPage.jsx` implementing the
      list page described above, and wire it at `games` under `SeasonLayout`
      in `frontend/src/App.jsx`.
      Done when: navigating to `/E2025/games` in a running app shows phase
      tabs, a round selector, a status filter, and a list of games; changing
      any filter updates the list; verified live with the backend and
      frontend dev servers running.
- [x] 4. Frontend: add `frontend/src/games/GameDetailPage.jsx` implementing the
      detail page described above, and wire it at `games/:gameCode` under
      `SeasonLayout`.
      Done when: opening a played game from the fixtures list shows its score
      and non-empty box-score tables when the underlying data has rows, and
      opening a scheduled game shows "Not yet played" and the box-score
      "not available yet" state; verified live with both dev servers running.

## Files / areas

- `backend/src/db/season-games.ts` (extend `getGames`)
- `backend/src/routes/seasons.ts` (extend the `/games` route's query handling)
- `frontend/src/lib/api.js` (new/extended API calls)
- `frontend/src/games/FixturesPage.jsx` (new)
- `frontend/src/games/GameDetailPage.jsx` (new)
- `frontend/src/App.jsx` (new routes)

## Data / contracts

`GET /api/seasons/:seasonCode/games` gains optional `phase` (string, must
match a real phase code for the season) and `round` (positive integer, must
belong to that phase's real rounds; requires `phase`) query parameters,
alongside the existing `limit`/`offset`/`status`/`order`. No response-shape
change: still `{ games: Game[], pagination: { limit, offset, hasMore } }`.
No changes to `/games/:gameCode` or `/games/:gameCode/box-score`, which
already return the full game record and `{ periodScores, teamStats,
playerStats }` respectively.

## Testing

No test runner is configured for either app, so verification is
`npm run build`/`npm run lint` (frontend) and `npm run build` (backend) plus
live verification: curl/API checks for the backend query-parameter behavior,
and live-browser checks (Playwright, already used for features 2-4) for both
new pages covering loading, empty, filter-change, and not-found states.

## Notes for the AI

- Reuse the existing `requestedRound` and `requestedPage` helpers in
  `routes/seasons.ts` rather than writing new parsing logic; only the phase
  validation and the phase+round pairing check are new.
- `GameList` in `frontend/src/dashboard/GamesSnapshot.jsx` is dashboard-private
  (imports `WidgetPanel` from `Dashboard.jsx`); write `FixturesPage`'s own list
  markup rather than importing it, to avoid coupling the fixtures page to the
  dashboard module.
- Follow the loading/error/empty component pattern already duplicated locally
  in `StandingsPage.jsx` and `SeasonLayout.jsx` (`CenteredSpinner`,
  `ErrorAlert`) for consistency; the project has not extracted these into a
  shared module yet, so keep following that established local-duplication
  convention rather than introducing one now.
- `scheduledAt` is an ISO string or `null`; format with the browser's
  `Date`/`toLocaleString` (no date library is installed and none is needed for
  this).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8041,"specSha256":"aa187dbf2faaf705309d995cfd35cd717b0da2ff3516d268ddfd7312ce1d410a","branch":"refs/heads/feature/fixtures-and-results","head":"2d59c089460d5fd69629060cbd7c863893dae852","baseRef":"refs/heads/master","baseCommit":"2d59c089460d5fd69629060cbd7c863893dae852","sourceTree":"0d72252562cbab59c036cb54ad47736fa93389bf","absentOptional":[]} -->
