# Fix: Cut request fan-out on the career, head-to-head and race views

**Type:** Fix
**Status:** verified
**Branch:** fix/cut-request-fan-out-on-career-head-to-head-and-race

## The problem

Three views build one screen out of many API requests, so a first visit is slow
and each request repeats the same season and existence lookups on the server.

| View | Where | Requests today |
| --- | --- | --- |
| Player page, Career tab | `fetchPlayerCareer` in `frontend/src/players/careerData.js` | 1 per archived season (27) to find the player, then 6 more for each season they are in: up to about 190 |
| Head-to-head page | `fetchCrossSeasonTeams` and `fetchMergedMatchups` in `frontend/src/comparisons/HeadToHeadPage.jsx` | 27 for the club list, then 27 for one club's full game list per season, filtered for the opponent in the browser |
| Standings, Race view | `useQueries` in `frontend/src/standings/RaceView.jsx` | 1 full standings table per played round (up to 38), of which only position, wins and losses are used |

## The fix

Add one read-only endpoint per view (two for head-to-head) and point each view
at it. What each view shows must not change: same rows, same numbers, same
order, same empty and error states.

Rules for all three:

- Routes go in `backend/src/routes/seasons.ts`, queries in the matching
  `backend/src/db/` module. Follow the existing handlers: `requestedSeason`,
  `validIdentity`, `sendError`, `catalogRead`, the same JSON error shape.
- Each route sits under `/:seasonCode/` like the rest, so the response cache and
  season validation apply unchanged. The career and head-to-head answers span
  every loaded season and do not depend on the season in the address, as with
  the records routes.
- Reuse the existing query functions and row mappers so each item in a new
  response has the same shape as the item the old endpoint returned. Do not
  remove or change any existing endpoint.
- No new dependencies, no schema changes, no new configuration.
- Frontend changes are limited to the fetch helper in `frontend/src/lib/api.js`
  and the three data-loading spots named above. Keep the derived-data functions
  (`seasonLine`, `careerHighs`, `clubStints`, the head-to-head panels, the race
  memo) reading the same shapes they read today.

### Endpoints

| Route | Answer |
| --- | --- |
| `GET /:seasonCode/players/:personKey/career` | `{ seasons: [...] }`, oldest season first, one item per loaded season the player is in. Each item carries what the Career tab reads today: `seasonCode`, `player`, `registrations`, `entries: { RS, all }` (the per-game season-stats entry for each, or null), `games` (the game log, up to the 100 the tab requests now) and `advanced: { RS, all }` (the last round of the player's advanced rounds for that scope, or null when the season has none). Find the player's seasons with one query instead of probing each season. A valid key that matches no season answers 404 `PLAYER_NOT_FOUND`. |
| `GET /:seasonCode/head-to-head/teams` | `{ teams: [...] }`: every club across the loaded seasons, one item per `clubCode`, taken from the latest season the club appears in, in the same shape as `/teams` items. |
| `GET /:seasonCode/head-to-head/games?teamA=&teamB=` | `{ games: [...] }`: every game between the two clubs across the loaded seasons, oldest first by `scheduledAt`, each in the team-games shape (with that season's club TV codes) plus the season it belongs to. Both codes are required and validated with `validIdentity` (400 otherwise); two clubs that never met answer an empty list. |
| `GET /:seasonCode/phases/:phaseCode/standings/race` | `{ rounds: [{ round, standings: [{ clubCode, groupName, position, gamesWon, gamesLost }] }] }`: every round that has standings, ascending, read with one query. Same phase checks as the standings route. |

## Build steps

1. **Career endpoint.** Add the route and query, add `getPlayerCareer` to
   `api.js`, and make `fetchPlayerCareer` build its cards from the one response.
   Done when: opening a Career tab sends one `/career` request and no
   per-season player requests, and the tab shows the same content as before.
2. **Head-to-head endpoints.** Add both routes and queries, add the two helpers
   to `api.js`, and replace `fetchCrossSeasonTeams` and `fetchMergedMatchups`.
   Done when: the page sends one teams request and one games request per pair,
   and shows the same clubs, meetings and figures as before.
3. **Race endpoint.** Add the route and query, add the helper to `api.js`, and
   replace the per-round `useQueries` in `RaceView.jsx`; drop the rounds query
   there if nothing else in the view needs it. Done when: the Race view sends
   one `/standings/race` request and replays the same positions and records.
4. **Advanced figures fail on their own.** A failure reading a player's
   advanced figures (PER, WS, USG%) must not take down the Season by season
   tab. Move them out of `/career` into their own request,
   `GET /:seasonCode/players/:personKey/career/advanced`, answering
   `{ seasons: [{ seasonCode, advanced: { RS, all } }] }`, and load it as a
   second query. While it loads or after it fails, the tab shows everything
   else with those columns empty; after a failure it also shows a short inline
   error with a retry button that refetches only that request. A season with
   no advanced data stays an empty value, not an error. A failed answer is
   never cached, so the retry reaches the database. Done when: with the
   advanced request forced to fail, the tab renders its tables and charts, the
   error and retry show, and retrying after the failure is lifted fills the
   columns in; with it succeeding, the tab matches the old content exactly.
   Name the tab "Season by season" in code comments, as the page does.

## Verify

- `cd backend && npm run build`, `cd frontend && npm run build` and
  `cd frontend && npm run lint` pass.
- With the dev backend on the local database (`/api/health` reports
  `"target":"local"`), compare each new answer against the old requests for at
  least two cases each, including a long career (10 or more seasons), a player
  with a mid-season club change, a pair of clubs with many meetings, a pair
  that never met, a current-format season and a grouped (Top 16) season.
- Browser tests, by file name only: `player-career-layout.spec.js`,
  `head-to-head.spec.js`, `head-to-head-layout.spec.js`,
  `standings-race-layout.spec.js`. Several of these intercept the old request
  addresses (the per-season player, teams and team-games routes), so update
  their route mocks to the new endpoints while keeping what they assert.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6627,"specSha256":"fe7b6d7a501b8a6aa34098911988c6b579317f1dcb1553750b374d9958c7183b","branch":"refs/heads/fix/cut-request-fan-out-on-career-head-to-head-and-race","head":"a9a60e52c087f7f4f19faba9a9e45c2a19ffa8c2","baseRef":"refs/heads/master","baseCommit":"a9a60e52c087f7f4f19faba9a9e45c2a19ffa8c2","sourceTree":"8ebee70a6d980e45fffcc84d55c23f5377ea9697","absentOptional":[]} -->
