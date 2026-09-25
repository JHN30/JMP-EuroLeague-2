# Feature: Players

**From build-plan:** feature 8
**Build attempt:** 1
**Branch:** feature/players
**Status:** verified

## Goal

Let a visitor search and browse the selected season's players and open a
player page showing profile information, the team(s) they're registered to
this season, season totals/per-game statistics, and game-by-game performance.

## In scope

- A player directory page at `/:seasonCode/players` with:
  - A text search input filtering by name (case-insensitive substring match
    against `name` or `jerseyName`), backed by a new optional `search` query
    parameter on the existing `GET /:seasonCode/players` endpoint. Changing
    the search resets pagination to the first page, the same convention
    `FixturesPage` already uses for its filters.
  - The existing paginated (`limit`/`offset`/`hasMore`) list, each row linking
    to `/:seasonCode/players/:personKey` (the link target `LeadersPanel`
    already points to).
  - Loading, error (with retry), "No players available for this season."
    (empty season) and "No players match your search." (empty search result)
    states.
- A player detail page at `/:seasonCode/players/:personKey` with:
  - **Profile**: name, jersey name, country code, and height (cm) from the
    existing `GET /:seasonCode/players/:personKey`. No photo field exists on
    the `people` source table, so none is shown (season-stats' `playerImageUrl`
    is a stats-view artifact tied to having stats rows, not a profile field;
    reusing it here would silently omit players with no stats yet, so it's
    left out of the profile section rather than invented as a reliable field).
  - **Team(s) this season**: every registration from the existing
    `GET /:seasonCode/players/:personKey/registrations`, each showing the
    team (linking to `/:seasonCode/teams/:clubCode` when the team resolves)
    and dorsal/position, labeled "Active" or "Inactive" from the
    registration's own `active` field. The source data has no transfer-date
    field, so when exactly one registration is active it's shown as "Current
    team"; when more than one is active (mid-season move without one side yet
    marked inactive) or none are, all registrations are listed as-is under
    "Teams this season" rather than guessing which one is current. Show
    "No team registration found for this season." when the list is empty.
  - **Season statistics**: phase tabs (same `getPhases`-driven pattern as
    `TeamPage`, defaulting to `"RS"`) and an Accumulated/Per game mode toggle
    (the existing `accumulated`/`perGame` values `/season-stats` already
    supports), driving a new optional `personKey` filter on the existing
    `GET /:seasonCode/season-stats` endpoint. Render the returned entry's
    traditional, advanced, scoring, and misc groups as labeled stat grids
    (same `dl` pattern `TeamPage`'s record/statistics sections use). Show
    "Season statistics not available yet for this phase." when no entry
    comes back for the selected phase/mode.
  - **Game-by-game performance**: every game this player has a box-score row
    for this season (all phases), from a new `GET
    /:seasonCode/players/:personKey/games` endpoint, ordered by the game's
    `scheduledAt` ascending, each row showing opponent, phase/round, date,
    minutes, points, rebounds, assists, steals, turnovers, and valuation
    (the same measure columns `GameDetailPage`'s `PlayerStatsTable` already
    surfaces). Show "No game log available yet." when empty.
  - Not-found state ("Player not found.") when the player query 404s, the
    same pattern `TeamPage`/`GameDetailPage` use.
  - Loading and error (with retry) states for each independently-loading
    section (registrations, season statistics, game log).
- Backend additions, all extending existing validated patterns:
  - Optional `search` query parameter on `GET /:seasonCode/players` and
    `getPlayers` (trimmed, 1-100 chars, case-insensitive substring on `name`
    or `jerseyName`; empty/missing means no filter). Invalid type/length
    returns `400 INVALID_QUERY` (the code the route's existing pagination
    validation already uses for a bad query parameter).
  - Optional `personKey` query parameter on `GET /:seasonCode/season-stats`
    and `getSeasonStats`, validated with the existing `validIdentity` check
    (`400 INVALID_PLAYER_KEY` on failure, matching
    `/players/:personKey`'s existing error code). An unmatched `personKey`
    simply returns an empty `players` array, like an unmatched phase/round
    filter does elsewhere; no new 404 is introduced on this list endpoint.
  - New `GET /:seasonCode/players/:personKey/games` endpoint and matching
    `getPlayerGameLog` query (join `app_game_player_stats` to
    `app_games` on `gameCode`, scoped to this player, ordered by
    `scheduledAt`), reusing the box-score measure columns already selected in
    `getBoxScore`. `404 PLAYER_NOT_FOUND` when the player does not exist,
    matching `/players/:personKey/registrations`'s existing check.

## Out of scope

- Statistics leaderboards, team/player comparisons, and playoff bracket views
  (features 9-11).
- Any change to `StandingsTable`, `FixturesPage`, `GameDetailPage`, `TeamsPage`,
  `TeamPage`, or any existing endpoint's response shape beyond the additive
  optional filters above.
- A player photo/headshot on the profile section (no reliable source field;
  see Profile above).
- Search debouncing or a client-side search library; the season's player list
  is modest, so each keystroke re-querying through TanStack Query's normal
  caching is proportionate.
- Escaping `%`/`_` as literal characters in the search filter; they behave as
  SQL `LIKE` wildcards, a minor, non-blocking UX quirk for a read-only public
  search with no security implication.
- Determining a single "current team" when the data itself doesn't
  disambiguate (see Team(s) this season above).

## Build loop

Follow `blueprint/config.json`: `workflow.stepReview` is `feature` (one review
packet after all steps), `workflow.checkpointCommits` is `disabled`.

## Build steps

- [x] 1. Backend: add an optional `search` parameter to `getPlayers` in
      `backend/src/db/season-identities.ts` (case-insensitive `ilike` on
      `people.name` or `people.jerseyName`) and to the
      `GET /:seasonCode/players` route in `backend/src/routes/seasons.ts`
      (trim, reject longer than 100 chars or a non-string value with
      `400 INVALID_QUERY`, treat empty/missing as no filter).
      Done when: `backend/npm run build` passes, and with the backend dev
      server running, `/api/seasons/E2025/players?search=<partial-name>`
      returns only matching players (verified against the full
      `/api/seasons/E2025/players` list), while a 101-character search
      returns 400 `INVALID_QUERY`.
- [x] 2. Backend: add an optional `personKey` parameter to `getSeasonStats` in
      `backend/src/db/season-stats.ts` (an additional `eq` condition on
      `seasonStatsTraditional.personKey`) and to the `GET
      /:seasonCode/season-stats` route, validated with the existing
      `validIdentity` helper (`400 INVALID_PLAYER_KEY` on failure).
      Done when: `backend/npm run build` passes, and with the backend dev
      server running, `/api/seasons/E2025/season-stats?phase=RS&mode=perGame&personKey=<real-key>`
      returns at most one entry for that player, while an unknown real-shaped
      key returns an empty `players` array (not an error).
- [x] 3. Backend: add `getPlayerGameLog(seasonCode, personKey, limit, offset)`
      to `backend/src/db/season-games.ts` (join `gamePlayerStats` to `games`
      on `gameCode`/`competitionCode`/`seasonCode`, reusing `measureFields`
      and the existing game context fields), and wire `GET
      /:seasonCode/players/:personKey/games` in
      `backend/src/routes/seasons.ts` reusing `requestedPage` and the
      existing `getPlayer` 404 check.
      Done when: `backend/npm run build` passes, and with the backend dev
      server running, `/api/seasons/E2025/players/<real-key>/games` returns
      only that player's game rows ordered by date, while an unknown player
      key returns 404 `PLAYER_NOT_FOUND`.
- [x] 4. Frontend: add `getSeasonPlayers(seasonCode, { search, limit, offset })`,
      `getPlayer(seasonCode, personKey)`, `getPlayerRegistrations(seasonCode,
      personKey)`, `getPlayerSeasonStats(seasonCode, personKey, { phase, mode
      })`, and `getPlayerGames(seasonCode, personKey, { limit, offset })` to
      `frontend/src/lib/api.js`, calling the existing/new endpoints above
      (`getPlayerSeasonStats` calls the existing `/season-stats` path with
      the new `personKey` param).
      Done when: `frontend/npm run build` passes.
- [x] 5. Frontend: add `frontend/src/players/PlayersPage.jsx` implementing the
      directory/search page described above, and wire it at `players` under
      `SeasonLayout` in `frontend/src/App.jsx`.
      Done when: navigating to `/E2025/players` lists the season's players,
      typing in the search box narrows the list, and each result links to
      its detail page; verified live with both dev servers running.
- [x] 6. Frontend: add `frontend/src/players/PlayerPage.jsx` implementing the
      detail page described above (profile, team(s) this season, season
      statistics with phase tabs and mode toggle, game-by-game performance,
      not-found and per-section loading/error/empty states), and wire it at
      `players/:personKey` under `SeasonLayout`.
      Done when: opening a real player from the directory shows their
      profile, team registration(s), and (for a phase with stats) season
      statistics and game log; opening an unknown player key shows "Player
      not found."; verified live with both dev servers running.
- [x] 7. Bug fix (found during live verification of step 6): TanStack Query
      v5's `isLoading` is `isPending && isFetching`, which is `false` while a
      dependent query is still `enabled: false` (waiting on `phaseCode`, or on
      `teamQuery`/`playerQuery` success). `SeasonStatsSection` in the new
      `PlayerPage.jsx` crashed (`Cannot read properties of undefined (reading
      'players')`) during that window, and the identical pattern existed in
      `frontend/src/teams/TeamPage.jsx`'s `SeasonRecordSection`,
      `TeamStatisticsSection`, `RosterSection`, and `ScheduleSection` (shipped
      in feature 7). Fixed by switching those section-level loading guards
      from `.isLoading` to `.isPending` in both files, which also covers the
      disabled-but-not-yet-fetched window.
      Done when: `frontend/npm run build` passes, and the user confirmed live
      that both a team page and a player page render without error after the
      fix (both had reproduced the crash before it).
- [x] 8. Bug fix (found during live verification of step 6): the box score
      `timePlayed` column is stored in seconds (confirmed by summing all 12
      players' `timePlayed` for game 3, which totals exactly 12000 = 5 players
      x 2400 seconds for a 40-minute game), not minutes. The new `PlayerPage`
      game log displayed it raw. The already-shipped `GameDetailPage.jsx`
      (feature 6) has the identical bug in its box score "Min" column; the
      user asked to fix both together rather than defer the second one.
      Added a shared `formatMinutes` helper (seconds -> `M:SS`) in each file
      and used it in place of the raw value.
      Done when: `frontend/npm run build` passes, and the user confirmed live
      that both the player game log and the game detail box score now show
      plausible minutes (e.g. ~21:00 instead of 1260).

## Files / areas

- `backend/src/db/season-identities.ts` (add `search` to `getPlayers`)
- `backend/src/db/season-stats.ts` (add `personKey` to `getSeasonStats`)
- `backend/src/db/season-games.ts` (add `getPlayerGameLog`)
- `frontend/src/teams/TeamPage.jsx` (step 7: `.isLoading` -> `.isPending` fix,
  no other change)
- `frontend/src/games/GameDetailPage.jsx` (step 8: `formatMinutes` fix, no
  other change)
- `backend/src/routes/seasons.ts` (extend `/players` and `/season-stats`;
  add `/players/:personKey/games`)
- `frontend/src/lib/api.js` (new/extended player API calls)
- `frontend/src/players/PlayersPage.jsx` (new)
- `frontend/src/players/PlayerPage.jsx` (new)
- `frontend/src/App.jsx` (new routes)

## Data / contracts

- `GET /api/seasons/:seasonCode/players` gains an optional `search` query
  parameter (string, 1-100 chars after trim; longer or non-string values
  return `400 INVALID_QUERY`). No response-shape change: still `{ players:
  Player[], pagination: { limit, offset, hasMore } }`.
- `GET /api/seasons/:seasonCode/season-stats` gains an optional `personKey`
  query parameter (must match `/^[A-Za-z0-9]{1,128}$/`, else `400
  INVALID_PLAYER_KEY`). No response-shape change: still `{ phase, mode,
  players: StatsEntry[], pagination: { limit, offset, hasMore } }`, filtered
  to that player when given.
- New `GET /api/seasons/:seasonCode/players/:personKey/games` accepts
  `limit`/`offset` (same bounds as other paginated endpoints) and returns `{
  games: PlayerGameLogEntry[], pagination: { limit, offset, hasMore } }`
  where each entry combines the existing `Game` context fields (gameCode,
  phase/round, scheduledAt, played, opponent side info) with this player's
  box-score measures (points, rebounds, assists, steals, turnovers,
  valuation, minutes, etc., the same fields `getBoxScore`'s `playerStats`
  already returns). `404 PLAYER_NOT_FOUND` for an unknown player.

## Testing

No test runner is configured for either app, so verification is `npm run
build`/`npm run lint` (frontend) and `npm run build` (backend) plus live
verification: API checks for the three extended/new backend endpoints
(search filtering, personKey filtering, game-log filtering and 404), and
live-browser checks for both new pages covering loading, empty, not-found,
search, phase/mode switching, and roster/statistics/game-log rendering.

## Notes for the AI

- `LeadersPanel.jsx` already links to `/:seasonCode/players/:personKey`, so
  this feature's URL shape is already load-bearing elsewhere; do not change it.
- Reuse the local `CenteredSpinner`/`ErrorAlert` pattern duplicated across
  `StandingsPage.jsx`/`FixturesPage.jsx`/`GameDetailPage.jsx`/`TeamPage.jsx`
  rather than extracting a shared component now (established local-duplication
  convention, unchanged by this feature).
- `getPlayerRegistrations`'s `PlayerRegistration.team` can be `null` (a
  `leftJoin`); guard before reading `team.name`/`team.clubCode`, and only
  render the team link when `team` is present.
- Standings-style numeric stat fields in `StatsEntry` (traditional, advanced,
  scoring, misc) arrive as PostgreSQL `NUMERIC` values already stringified by
  the API; render them as given rather than re-parsing or reformatting, same
  as `TeamPage`'s margins section.
- Gate the registrations/season-stats/game-log queries with `enabled:
  playerQuery.isSuccess`, mirroring `TeamPage`'s pattern, so a 404'd player
  does not also fire the other requests.
- `ilike` is already exported from the installed `drizzle-orm` package
  (confirmed in `node_modules`); no new dependency is needed for the search
  filter.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":15272,"specSha256":"0b64cf1af6955ebf4cc17c22759671291c63af109e57260ad31127d756dfa4e9","branch":"refs/heads/feature/players","head":"6a8751f4b1bb4bcce1a3c96bd89cc83d695c9cc5","baseRef":"refs/heads/master","baseCommit":"6a8751f4b1bb4bcce1a3c96bd89cc83d695c9cc5","sourceTree":"b88f2038576ef6d914267149802c5c2dfa370afc","absentOptional":[]} -->
