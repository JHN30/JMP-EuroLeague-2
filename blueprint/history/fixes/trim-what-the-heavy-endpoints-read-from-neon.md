# Fix: Trim what the heavy endpoints read from Neon

**Type:** Fix
**Status:** verified
**Branch:** fix/trim-what-the-heavy-endpoints-read-from-neon

## The problem

Neon's free plan meters every byte it sends back (5 GB a month; October was nearly used up by the 9th). The
server cache from the previous fix stops repeat reads, but every cache miss still pulls far more than the page
needs. Measured with a byte counter on the `pg` connection:

| Endpoint | Read from Neon | Sent to the browser |
|---|---|---|
| `GET /players/:personKey/advanced` | ~195 kB | ~8 kB |
| `GET /advanced/leaders` (a Leaders card, `limit=5`) | 40 to 67 kB each, 28 calls on the Leaders page | ~2 kB each |
| `GET /records/player-seasons` | ~341 kB | ~8 kB |
| Player Shooting tab (`GET /games/:gameCode/shots` per game) | ~1.3 MB for 73 games | the player's own shots only |

Three causes:

- **Whole rows from very wide tables.** `getPerLeaders` and `getWinShareLeaders` (`backend/src/db/season-advanced.ts`)
  use `db.select()` on `app_player_round_ratings` and `app_player_round_win_shares`, and the leaderboard calls of
  `getPlayerRapm` and `getPlayerOnOff` do the same on `app_player_rapm` and `app_player_on_off`. These tables have
  dozens to over a hundred columns, and the queries ask for everyone (`limit` 1000). Both callers use a handful of
  columns: `getPlayerAdvancedRanks` (`backend/src/routes/seasons.ts`) needs only each player's key and the metric,
  because it ranks the player and computes a percentile spread over everyone; the `/advanced/leaders` route needs 6
  to 8 columns per metric, then shows one page.
- **Records reuses the full stats sheet.** `/records/player-seasons` calls `getSeasonStats` once per season for 100
  players, which joins four stats tables, selects every field and runs a position subquery per row. The route keeps
  five fields and one statistic, and shows the top 50.
- **The Player Shooting tab fetches both teams' shots for every game.** `useSeasonShots`
  (`frontend/src/lib/shootingData.js`) requests `/games/:gameCode/shots` once per played game, then
  `PlayerShootingSection` keeps only `shot.personCode === personKey`.

## The fix

### Narrow leaderboard reads (ranks and Advanced leaders)

- `getPerLeaders` and `getWinShareLeaders` select only the columns their two callers use: `personKey`,
  `playerName`, `clubCode`, `gamesPlayed`, `secondsPlayed`, and the metric (`per`; `winShares` and
  `winSharesPer40`). Their filters, order and limit stay the same.
- Two list queries next to them, for example `getRapmLeaders` and `getOnOffLeaders`, with the same filters,
  order and limit as the list calls today. They select only what the leaderboard and ranks use (RAPM: `personKey`,
  `playerName`, `seconds`, `rapm`, `offense`, `defense`; on/off: `personKey`, `playerName`, `clubCode`, `games`,
  `onSeconds`, `netRatingDiff`, `onNetRating`, `offNetRating`).
- The `/advanced/leaders` route and `getPlayerAdvancedRanks` use the list queries. The per-player calls
  (`getPlayerRapm(..., { personKey, limit: 1 })`, `getPlayerOnOff(..., { personKey, limit: 10 })`) stay as they
  are, because the Player Advanced response passes those full rows through.
- `getUsageLeaders` and `getRoundStatLeaders` already select narrow columns and stay as they are.
- `getExtendedAdvanced` (the Compare page's `extended=true`) reads many round-table metrics on purpose and is not
  changed.

### Narrow Records read

- A dedicated query in `backend/src/db/season-stats.ts` returns, for one season, the top 50 `all` phase,
  `accumulated` rows ordered by the metric's column (descending, nulls last, then `entry_ordinal`, as today), with
  only `personKey`, `playerName`, `clubName`, `clubTvCodes` and the metric value from the traditional table. No
  joins and no position subquery.
- `/records/player-seasons` uses it for each season; its merge, sort and top-50 cut stay the same.
- Asking each season for 50 rows instead of 100 cannot change the result: the route shows 50, and a season's
  rows past its own 50th never sort above that season's 50th.

### One shots request for the Player Shooting tab

- `GET /api/seasons/:seasonCode/players/:personKey/shots?phase=<RS|PI|PO|FF>`: that player's field-goal shots
  in the season's games of that phase, as `{ shots }` with the same fields as the per-game shots endpoint.
  `phase` is required. An invalid player key answers 400 `INVALID_PLAYER_KEY`, an unknown player 404
  `PLAYER_NOT_FOUND`, a missing or unknown phase 400 `INVALID_PHASE`. Shots are ordered by game, then
  `shot_ordinal`.
- `PlayerShootingSection` reads it through one TanStack Query keyed on season, player and phase. The loading,
  error, retry and empty states stay as they are (an empty list shows the existing no-shots state).
- `useSeasonShots` and the Team Shooting tab stay as they are: a team's tab needs both sides of every game, so
  its per-game requests read nothing it throws away.

### Must not break

- Every changed response body is identical to before (Player Advanced, every `/advanced/leaders` metric,
  scope and page, Records for each metric). The Player Shooting tab shows the same shots, totals and zones.
- No new dependency, table, index or configuration.

### Out of scope

- The Team Shooting tab's per-game requests, the Compare page's `extended=true` read, and Cloudflare edge caching
  (deferred in the build plan).

## Build steps

- [x] 1. **Narrow leaderboard reads.** Narrow `getPerLeaders` and `getWinShareLeaders`, add the RAPM and on/off
      list queries, and use them in `/advanced/leaders` and `getPlayerAdvancedRanks`.
      Done when: the backend builds; `/players/:personKey/advanced` (with and without `scope`, and with
      `extended=true`) and `/advanced/leaders` for `per`, `winShares`, `winSharesPer40`, `rapm` and `onOff`
      (with `limit`, `offset` and `order`) return bodies identical to ones saved before the change; and the bytes
      read from Neon for those requests drop.
- [x] 2. **Narrow Records read.** Add the records query and use it in `/records/player-seasons`.
      Done when: the backend builds; all four metrics return bodies identical to ones saved before the change;
      and the bytes read from Neon drop.
- [x] 3. **Player shots endpoint and tab.** Add the endpoint, and switch `PlayerShootingSection` to it.
      Done when: the backend and frontend build and lint; for a player in two phases, the endpoint returns the
      same set of shots the old per-game method kept; the 400 and 404 cases answer as specified; and the Player
      Shooting tab makes one shots request instead of one per game.

## Verify

Playwright is paused until 1 November to save Neon transfer (`CLAUDE.local.md`), so there is no browser-test run.

- Before changing code, save the current responses of the requests named in steps 1 and 2 from the running
  backend; after each step, compare byte for byte.
- Measure Neon bytes per request before and after with a `pg` byte counter on a backend run from a spare port.
- `cd backend && npm run build`; `cd frontend && npm run build && npm run lint`.
- `curl` the new shots endpoint for a valid player and phase, an invalid key, an unknown player, and a missing or
  unknown phase.
- In the browser, open a player's Shooting tab, switch phase, and confirm one `/players/:personKey/shots`
  request per phase in the Network tab and the same court, totals and zone table as before.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7430,"specSha256":"4c5b5c658b6300dd368a8831d7360bf75365a6e0f7e09014639281d84f40c279","branch":"refs/heads/fix/trim-what-the-heavy-endpoints-read-from-neon","head":"c1a9a7dbbd9f565d0762a1a9a2bc2e37a1575276","baseRef":"refs/heads/master","baseCommit":"c1a9a7dbbd9f565d0762a1a9a2bc2e37a1575276","sourceTree":"4300cecdee2ea06612d249685599f953a32e278f","absentOptional":[]} -->
