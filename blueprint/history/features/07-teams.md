# Feature: Teams

**From build-plan:** feature 7
**Build attempt:** 1
**Branch:** feature/teams
**Status:** verified

## Goal

Let a visitor browse the selected season's teams and open a team page showing
its identity, roster, schedule/results, season record, and available team
statistics for that season.

## In scope

- A team directory page at `/:seasonCode/teams` listing every team for the
  selected season (from the existing `GET /:seasonCode/teams`), each entry
  showing crest (when available), name, abbreviated name, and country, and
  linking to `/:seasonCode/teams/:clubCode` (the link target `StandingsTable`
  already points to).
  - Loading, error (with retry), and empty ("No teams available for this
    season.") states.
  - No pagination: `getTeams` already returns the season's full team list
    unpaginated.
- A team detail page at `/:seasonCode/teams/:clubCode` with:
  - **Identity header**: crest (when `crestUrl` is set), name (falling back to
    `abbreviatedName` or the club code), abbreviated name, and country code.
  - **Phase tabs** (same pattern as `StandingsPage`/`FixturesPage`: from
    `getPhases`, defaulting to `"RS"` when present else the first phase)
    driving the season record and team statistics sections below, since both
    are phase-scoped in the standings data.
  - **Season record**: this team's row from the existing
    `GET /:seasonCode/phases/:phaseCode/standings` response (latest round,
    filtered client-side to this `clubCode`), showing position, games
    played/won/lost, win percentage, points for/against, point differential,
    home/away record, and current form, reusing the same "-" fallback for
    unavailable fields `StandingsTable` already uses. When the phase has no
    standings yet, show "Standings not available yet for this phase."
    (matching `StandingsPage`'s empty-state wording).
  - **Team statistics**: this team's `margins` split from the same standings
    response (point-differential win/loss buckets, and rebounds/assists/
    blocks/threePointers/twoPointers/freeThrows splits), the only team-level
    statistical aggregate the data model provides (there is no team season
    stats table; season-stats endpoints are player-level only). Show
    "Team statistics not available yet for this phase." when the team's
    `margins` entry is null.
  - **Roster**: this team's roster from the existing
    `GET /:seasonCode/teams/:clubCode/roster`, not phase-scoped (roster
    registrations carry no phase). Show dorsal, player name (link-free, since
    player pages are out of scope), position, and active/inactive status.
    Table already paginates (`limit`/`offset`/`hasMore`); request one page of
    100 (a roster is at most a few dozen players, under the existing max
    `limit`) with no UI pager needed, matching the "whole round fits one page"
    precedent from `FixturesPage`. Show "Roster not available yet." when empty.
  - **Schedule/results**: every game this team plays across the whole season
    (all phases, not just the selected phase tab, so postseason games remain
    visible once a team qualifies), ordered by `scheduledAt` ascending, each
    row showing phase/round, opponent, date/time (or "TBD"), and score when
    played ("Not yet played" otherwise) &mdash; the same row shape
    `FixturesPage` already uses. Show "No games scheduled yet." when empty.
  - Not-found state ("Team not found.") when the team query 404s, matching
    `GameDetailPage`'s pattern.
  - Loading and error (with retry) states for each independently-loading
    section (standings, roster, games) so one slow/broken section does not
    block the others.
- Backend: add a new `GET /:seasonCode/teams/:clubCode/games` endpoint and a
  matching `getTeamGames` query (games where the team is `localClubCode` or
  `roadClubCode`), the one piece of team-scoped data access that does not
  already exist (feature 6 explicitly left "filtering fixtures by team" out
  of scope). Reuses the existing `games`/`Game` shape, pagination contract,
  and `status`/`order` query handling already validated for
  `GET /:seasonCode/games`; 404s `TEAM_NOT_FOUND` the same way
  `GET /:seasonCode/teams/:clubCode/roster` does today.

## Out of scope

- Player pages and linking roster rows to a player profile (feature 8).
- Statistics leaderboards, team comparisons, and playoff bracket views
  (features 9-11).
- Any new team-level aggregate table, endpoint, or computed stat beyond the
  existing standings `margins`/`basic` data (no such table exists yet per the
  project overview's data model; inventing one is out of scope for this
  feature).
- Changing `StandingsTable`, `FixturesPage`, `GameDetailPage`, or any existing
  endpoint response shape.
- A "current round" or "current phase" heuristic beyond the existing
  `"RS"`-else-first-phase default already used by `StandingsPage`.

## Build loop

Follow `blueprint/config.json`: `workflow.stepReview` is `feature` (one review
packet after all steps), `workflow.checkpointCommits` is `disabled`.

## Build steps

- [x] 1. Backend: add `getTeamGames(seasonCode, clubCode, limit, offset,
      status?, order?)` to `backend/src/db/season-games.ts` (same
      shape/pagination as `getGames`, filtered to games where `localClubCode`
      or `roadClubCode` equals `clubCode`), and wire
      `GET /:seasonCode/teams/:clubCode/games` in
      `backend/src/routes/seasons.ts` reusing `requestedPage`,
      `requestedGameStatus`, and `requestedGameOrder`, returning
      `404 TEAM_NOT_FOUND` when the team does not exist (same check
      `/teams/:clubCode/roster` already performs).
      Done when: `backend/npm run build` passes, and with the backend dev
      server running, `/api/seasons/E2025/teams/<real-club-code>/games`
      returns only that team's games (verified against the equivalent
      `/api/seasons/E2025/games` list), while an unknown club code returns
      404 `TEAM_NOT_FOUND`.
- [x] 2. Frontend: add `getSeasonTeams(seasonCode)`, `getTeam(seasonCode,
      clubCode)`, `getTeamRoster(seasonCode, clubCode, { limit, offset })`,
      and `getTeamGames(seasonCode, clubCode, { limit, offset, status, order
      })` to `frontend/src/lib/api.js`, calling the existing/new endpoints
      above.
      Done when: `frontend/npm run build` passes.
- [x] 3. Frontend: add `frontend/src/teams/TeamsPage.jsx` implementing the
      directory page described above, and wire it at `teams` under
      `SeasonLayout` in `frontend/src/App.jsx`.
      Done when: navigating to `/E2025/teams` in a running app lists the
      season's teams, each linking to its detail page; verified live with
      both dev servers running.
- [x] 4. Frontend: add `frontend/src/teams/TeamPage.jsx` implementing the
      detail page described above (identity header, phase tabs, season
      record, team statistics, roster, schedule/results, not-found and
      per-section loading/error/empty states), and wire it at
      `teams/:clubCode` under `SeasonLayout`.
      Done when: opening a real team from the directory shows its identity,
      roster, full-season schedule/results, and (for a phase with standings)
      season record and team statistics; opening an unknown club code shows
      "Team not found."; verified live with both dev servers running.

## Files / areas

- `backend/src/db/season-games.ts` (add `getTeamGames`)
- `backend/src/routes/seasons.ts` (add the `/teams/:clubCode/games` route)
- `frontend/src/lib/api.js` (new team/roster/team-games API calls)
- `frontend/src/teams/TeamsPage.jsx` (new)
- `frontend/src/teams/TeamPage.jsx` (new)
- `frontend/src/App.jsx` (new routes)

## Data / contracts

New: `GET /api/seasons/:seasonCode/teams/:clubCode/games` accepts the same
`limit`/`offset`/`status`/`order` query parameters as
`GET /api/seasons/:seasonCode/games` and returns the same shape, `{ games:
Game[], pagination: { limit, offset, hasMore } }`, restricted to games where
this team is the local or road side. `404 TEAM_NOT_FOUND` when the club code
does not exist for the season, matching `/teams/:clubCode/roster`'s existing
behavior. No other endpoint or response shape changes; `/teams`,
`/teams/:clubCode`, `/teams/:clubCode/roster`, and
`/phases/:phaseCode/standings` are consumed exactly as they exist today.

## Testing

No test runner is configured for either app, so verification is `npm run
build`/`npm run lint` (frontend) and `npm run build` (backend) plus live
verification: an API check for the new `/teams/:clubCode/games` endpoint
(team filter and 404 cases) and live-browser checks for both new pages
covering loading, empty, not-found, phase-tab switching, and roster/schedule
rendering.

## Notes for the AI

- `StandingsTable.jsx` already links team names to `/:seasonCode/teams/:clubCode`,
  so this feature's URL shape is already load-bearing elsewhere; do not change it.
- Reuse the local `CenteredSpinner`/`ErrorAlert` pattern duplicated in
  `StandingsPage.jsx`/`FixturesPage.jsx`/`GameDetailPage.jsx` rather than
  extracting a shared component now (established local-duplication
  convention, unchanged by this feature).
- `getSeasonStandings(seasonCode, phaseCode)` already returns the *latest*
  round when no `round` is passed (the route computes it via
  `getLatestStandingsRound`); do not add a round selector to the team page,
  just filter the returned array to this `clubCode`.
- Standings numeric fields (`pointsFor`, `winPercentage`, margins splits,
  etc.) arrive as PostgreSQL `NUMERIC`/text values already stringified by
  the API (see `season-standings.ts`); render them as given rather than
  re-parsing or reformatting.
- `getTeamRoster`'s `RosterEntry.player` can be `null` (a `leftJoin`); guard
  before reading `player.name`.
- Fetch the roster and schedule with `enabled: Boolean(clubCode)`-style
  gating on the team query's success, mirroring `GameDetailPage`'s
  `boxScoreQuery` gated on `gameQuery.isSuccess`, so a 404'd team does not
  also fire roster/games/standings requests.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9999,"specSha256":"46b6552a167f87c00b2a3b5b1b2c38d3e540824dbfd3aad1bac5438509fa877e","branch":"refs/heads/feature/teams","head":"8be4638f945eed281dc2f037c751ff9b0afda43d","baseRef":"refs/heads/master","baseCommit":"8be4638f945eed281dc2f037c751ff9b0afda43d","sourceTree":"e60aa54a2f9bef76a01e36aa6b8fac3c23706895","absentOptional":[]} -->
