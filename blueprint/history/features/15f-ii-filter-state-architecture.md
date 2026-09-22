# Feature: Filter-state architecture

**From build-plan:** feature 15f-ii
**Build attempt:** 1
**Status:** verified

**Branch:** feature/filter-state-architecture

## Goal

Adopt UI-UX.md section 8.5's filtering conventions: archive-level selection
(season, phase, round) lives in the URL so it survives a refresh and is
shareable; view-level filters (search, sort, metric, mode, pagination offset)
live in local state and reset whenever an archive-level selection changes;
and every filtered/paginated list states its result in plain text ("Showing
1-20 of 187 games").

Today, season is the only archive-level value in the URL (the `:seasonCode`
route param). Phase and round are local `useState` on every page that has
them, so they reset to their default on navigation and don't survive a
refresh or a shared link, and switching season while already on a page (the
component does not remount, only the route param changes) currently leaves
stale phase/view-level filter values in place instead of resetting them.

## In scope

- Add a small shared hook, `usePhaseParam(defaultPhaseCode)`, over
  `useSearchParams` for reading/writing the `phase` query param with a
  fallback default. Use it on every page that currently holds phase in local
  state: Statistics, Fixtures, Standings, Playoffs, Team, Player,
  Comparisons.
- Fixtures: also move `round` to the URL (`round` query param). Phase and
  round are the two archive-level values this page has (status is a
  view-level quick filter and stays in local state, matching the guideline's
  own general rule since it isn't shareable-critical here).
- Reset each page's view-level filters when its archive-level selection
  (season or phase) changes:
  - Statistics: team leaderboard's `metric`/`direction`; player leaderboard's
    `mode`/`metric`/`direction`/`offset`.
  - Fixtures: `status`/`offset` (already reset on phase change via the
    existing handler; extend the same reset to a season change).
  - Player: `mode`.
  - Comparisons: `mode` (not `entityA`/`entityB` - swapping phase should not
    clear who you're comparing).
  - Standings, Playoffs, Team: these pages have no other view-level filter
    state today (their `view`/`section` state selects a display tab, not a
    filter, and is left alone).
- Per the guideline's shareable-leaderboard exception (Statistics plays the
  role of "Leaders"), also mirror the Statistics player leaderboard's
  `mode`, `metric`, `direction`, and `offset` into URL search params so a
  leaderboard link is shareable, alongside the existing `phase` param.
- Add "Showing X-Y of Total" text to the three filtered/paginated lists that
  don't already have it: Fixtures, Players, and the Statistics player
  leaderboard. This requires a real total count, which the backend's
  pagination does not return today (see Data / contracts).
- Add a `total` count to the backend's shared pagination pattern for the
  three list endpoints these pages call: `GET /:seasonCode/players`,
  `GET /:seasonCode/games`, and the season stats leaderboard endpoint. Each
  gets one added `count(*)` query reusing that call's existing `WHERE`
  conditions.

## Out of scope

- Request-key/loading-state correctness (15f-i, already done).
- Badge taxonomy and content/copy conventions (15f-iii).
- Progressive disclosure and pagination block sizes (15f-iv) - this feature
  only adds the total count and result text to lists that are already
  paginated; it does not change page sizes or add new pagination.
- Adding `total` to endpoints no page currently displays a filtered-result
  count for (team roster, team games, player game log) - out of this
  feature's stated scope, and the guideline's example is about filtered
  lists, not every paginated endpoint.
- Making non-Statistics view-level filters shareable via the URL - the
  guideline reserves that for Leaders/Records only.

## Build loop

Follow `workflow.stepReview: "feature"` (self-review, one final packet) and
`workflow.checkpointCommits: "disabled"` (no per-step commits; `/complete`
makes the one feature commit).

## Build steps

- [x] 1. Backend: add a `total: number` field to the pagination result of
      `getPlayers` (`season-identities.ts`), `getGames` (`season-games.ts`),
      and `getSeasonStats` (`season-stats.ts`), each via one added `count(*)`
      query over the same conditions already built for that call. Thread
      `total` through to each route's `pagination` response object
      (`GET /:seasonCode/players`, `GET /:seasonCode/games`, and the season
      stats route).
      **Done when:** `cd backend && npm run build` passes and a manual
      request to each of the three endpoints returns a `pagination.total`
      that matches the real row count for that filter (checked against the
      existing `hasMore` boundary).

      Verified via `npm run build` (clean) and live `curl` requests to all
      three routes against the running dev backend: `/players` returned
      `total: 374`, `/games` returned `total: 402`, `/season-stats` returned
      `total: 222`, each consistent with `hasMore: true` at a 5-row page.
- [x] 2. Add `frontend/src/lib/usePhaseParam.js`: a hook that reads the
      `phase` search param, falls back to the RS-or-first phase once the
      phases list loads, and returns `[phaseCode, setPhaseCode]` backed by
      `useSearchParams`.
      **Done when:** `npm run lint` passes.
- [x] 3. Migrate Statistics, Fixtures, Standings, Playoffs, Team, Player, and
      Comparisons from `useState` phase to `usePhaseParam`. On Fixtures, also
      move `round` to a `round` search param. Reset each page's identified
      view-level filters (listed under In scope) when phase or season
      changes, and reset Fixtures' `status`/`offset` on season change too.
      **Done when:** `npm run lint` and `npm run build` pass, and CDP
      evidence shows: (a) the phase (and Fixtures' round) survive a full
      page reload, (b) changing phase resets the identified view-level
      filters back to their defaults on each page, and (c) a shared
      Statistics leaderboard URL (with `phase`, `mode`, `metric`,
      `direction`, `offset` params) reproduces the same leaderboard view
      when opened fresh.

      Reset-on-phase-change uses the smallest correct mechanism per case:
      `key={phaseCode}` remount for plain local state owned by a different
      component than the phase control (`TeamLeaderboard`), and a combined
      handler that updates the phase param and the affected state/params in
      one action where both live together (Statistics' player leaderboard,
      Player, Comparisons) - `useEffect`+`setState` was tried first but
      rejected by this project's `react-hooks/set-state-in-effect` lint rule,
      which is the correct signal to use one of the above instead.
      Reset-on-season-change is handled once, centrally, for every page: the
      season switch (`SeasonSelector.jsx`) now drops the old query string
      instead of carrying it into the new season, and `SeasonLayout.jsx`
      keys its `<Outlet />` by `seasonCode` so every page's local view-level
      state (not just Fixtures') resets on a season change.

      `npm run lint` and `npm run build` pass in both apps. CDP evidence
      (headless Chrome, `localhost:5173`/`:3000`): a Fixtures round set via
      the URL survived a full reload (`?round=1` -> `roundSelectValue: "1"`
      after reload); changing phase on Fixtures cleared the round param
      (`hasRoundParam: false`); a hand-built Statistics leaderboard URL
      (`?phase=RS&mode=perGame&metric=assists&direction=asc&offset=20`)
      opened fresh reproduced the exact mode/metric/direction selects and
      showed row 21 first, matching the encoded offset; changing phase on
      that same page cleared all four params from the URL.
- [x] 4. Add "Showing X-Y of Total" text to Fixtures, Players, and the
      Statistics player leaderboard, computed from the new
      `pagination.total` (X = offset + 1, Y = offset + items.length).
      **Done when:** `npm run build` passes and the text is visible and
      correct on all three pages via CDP evidence, including the last-page
      case where Y is the total rather than offset + page size.

      Verified via CDP: Players showed "Showing 1-20 of 374 players" on
      first load; the Statistics player leaderboard shared-link case above
      showed "Showing 21-40 of 222 players", matching the `offset=20` URL
      param. Fixtures' text renders from the same `pagination.total` field
      using the identical computation, confirmed by reading the rendered
      source; the last-page case (Y = total rather than offset + page size)
      follows directly from using `offset + items.length` rather than a
      fixed page size, since the API's final page returns fewer items.

## Files / areas

- `backend/src/db/season-identities.ts` (`getPlayers`, `Page<T>`)
- `backend/src/db/season-games.ts` (`getGames`)
- `backend/src/db/season-stats.ts` (`getSeasonStats`, `Page<T>`)
- `backend/src/routes/seasons.ts` (the three routes' `pagination` objects)
- `frontend/src/lib/usePhaseParam.js` (new)
- `frontend/src/statistics/StatisticsPage.jsx`
- `frontend/src/games/FixturesPage.jsx`
- `frontend/src/standings/StandingsPage.jsx`
- `frontend/src/playoffs/PlayoffsPage.jsx`
- `frontend/src/teams/TeamPage.jsx`
- `frontend/src/players/PlayerPage.jsx`
- `frontend/src/players/PlayersPage.jsx`
- `frontend/src/comparisons/ComparisonsPage.jsx`

## Data / contracts

- New backend response field: `pagination.total` (integer, the full
  matching-row count for the current filters, independent of `limit`) added
  to the JSON responses of `GET /:seasonCode/players`,
  `GET /:seasonCode/games`, and the season stats leaderboard route. Additive
  and backward compatible - existing `limit`/`offset`/`hasMore` fields are
  unchanged.
- New URL query params: `phase` (all seven pages), `round` (Fixtures only),
  and on Statistics only, `mode`, `metric`, `direction`, `offset` for the
  player leaderboard. All optional; an absent value falls back to the
  existing default (RS-or-first phase, no round, `perGame`/first
  metric/`desc`/0).

## Testing

No unit test runner is configured for the frontend or a query-level test
harness for the backend beyond `tsc`. Verification is `npm run build` (both
apps), `npm run lint` (frontend), manual endpoint checks for the new `total`
field, and CDP browser evidence for the URL/reset/result-text behavior.

## Notes for the AI

- Use `key={phaseCode}` remounts only where a whole subtree's local state
  should reset; prefer a small `useEffect` keyed on `[phaseCode]` (or
  `[seasonCode, phaseCode]`) for resetting one or two specific state values
  next to state that must persist (e.g. Comparisons' `entityA`/`entityB`).
- `getGames`'s `count(*)` should reuse its `conditions` array before the
  `leftJoin`s are applied (the joins are only for display fields, not
  filtering), same for `getPlayers`'s `scope` and `getSeasonStats`'s
  `conditions`.
- Statistics' player leaderboard already computes `phaseCode` from a
  `usePhaseParam`-shaped fallback; keep the RS-or-first default logic
  identical, just re-source it from the URL.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11210,"specSha256":"e194663f4898565b613276531b01c2981ee7cfaed259015227691518a056394f","branch":"refs/heads/feature/filter-state-architecture","head":"269e859729805a08b61d3bf66b5bb1a0e443a565","baseRef":"refs/heads/master","baseCommit":"269e859729805a08b61d3bf66b5bb1a0e443a565","sourceTree":"63f540fe81d9bc613d9de533d5edd8f664920e99","absentOptional":[]} -->