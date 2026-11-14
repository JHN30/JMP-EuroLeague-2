# Fix: Fewer requests on the season overview

**Type:** Fix
**Status:** verified
**Branch:** fix/fewer-requests-on-the-season-overview

## The problem

The season overview ([SeasonOverviewPage.jsx](frontend/src/season/SeasonOverviewPage.jsx)) makes many small requests
for data the API could hand over in fewer:

1. **Phase dates.** Each phase gets two `limit: 1` game requests, ascending and descending, only to read its first
   and last game's `scheduledAt` for the date range ([SeasonOverviewPage.jsx:768-779](frontend/src/season/SeasonOverviewPage.jsx#L768-L779),
   used at lines 831-837). A four-phase season makes 8 requests, and the page waits on all of them.
   `getPhases` ([season-catalog.ts:94](backend/src/db/season-catalog.ts#L94)) already queries the season's games for
   phase names.
2. **Leader cards.** Each of the six cards (points, rebounds, assists, steals, blocks, PIR) sends its own
   `/season-stats?sort=<stat>&limit=1&qualified=true` request ([SeasonOverviewPage.jsx:537-542](frontend/src/season/SeasonOverviewPage.jsx#L537-L542)),
   for each phase shown. That's six round trips and six response-cache entries per phase.
3. **Played games.** `fetchAllPlayedGames` ([SeasonOverviewPage.jsx:58-73](frontend/src/season/SeasonOverviewPage.jsx#L58-L73))
   pages every played game 100 at a time, one page after another. A full season is 3 or more requests in sequence,
   though the games route already returns `pagination.total`.

## The fix

1. **Phase dates from `/phases`.** In `getPhases`, change the game query from a distinct select to one grouped by
   phase code and name, with `min(scheduled_at)` and `max(scheduled_at)`. Each phase gets `startDate` and `endDate`
   (ISO strings, or `null` when it has no dated game); a phase whose games carry several names takes the earliest
   and latest over all of them. Add both fields to the `Phase` type. This matches the current reads: ascending
   order already leaves undated games last, and descending uses `NULLS LAST`. The overview reads `phase.startDate`
   and `phase.endDate`, and drops both `useQueries`, including their loading, error and retry wiring. Cancelled
   seasons keep using the played games, as now. Other `/phases` callers ignore the new fields.
2. **One leaders request.** Add `GET /:seasonCode/season-stats/leaders?phase=&mode=&stats=a,b,c`. It takes up to 10
   comma-separated fields, each checked against `SORTABLE_STATS_FIELDS`, with `phase` and `mode` validated as
   `/season-stats` does them; any bad value answers `400 INVALID_QUERY`. It runs the existing qualified,
   descending, `limit 1` `getSeasonStats` read per field in parallel and answers
   `{ phase, mode, leaders: { <field>: <player or null> } }`, with each player shaped as on `/season-stats`.
   Add `getSeasonLeaders` to `api.js`. The overview makes one shared query per phase,
   `["season-leaders", seasonCode, phaseCode, "perGame"]`, and each `LeaderCard` reads its field from it. Each card
   keeps its own loading, empty ("Not available yet.") and error ("Could not load.") states. This saves 5 round
   trips and cache entries per phase. Database work stays the same: six small sorted reads, now made on the server.
3. **Played games in parallel.** `fetchAllPlayedGames` fetches page one, then requests the remaining pages together
   using `pagination.total`. It keeps the `MAX_PAGES` cap and ascending order by concatenating pages in offset order.

Must not break: phase date ranges (including a season with a phase that has no games yet), the six leader cards and
their states, the defining games, home versus road and the scoring trend, the active phase and champion, the
retry button, and cancelled seasons.

## Build steps

1. [x] **Phase dates from `/phases`.**
   Done when: `cd backend && npm run build` passes. `/api/seasons/E2025/phases` gives each phase `startDate` and
   `endDate` equal to the first and last `scheduledAt` from the old `limit=1` ascending and descending game requests.
   The overview's phase date ranges read the same as on master, and its network log has no `limit=1` game requests.
2. [x] **One leaders request.**
   Done when: `/api/seasons/E2025/season-stats/leaders?phase=RS&mode=perGame&stats=pointsScored,totalRebounds,assists,steals,blocks,pir`
   returns, for each field, the same player and values as `/season-stats?sort=<field>&order=desc&limit=1&qualified=true`.
   A bad field, phase or mode, or more than 10 fields, answers `400`. The overview sends one leaders request per phase
   shown, and its cards show the same leaders as on master.
3. [x] **Played games in parallel.**
   Done when: `cd frontend && npm run lint` and `npm run build` pass. The overview's played-games pages go out
   together after the first, and the defining games, home versus road and scoring trend match master.

Result: on E2025, E2015, E2026 and E2019, every phase's `startDate`/`endDate` and every leader (RS, TS, PO, FF, all;
six stats) equals the saved pre-change answers, including the phases the old requests answered with an error. Six
kinds of bad input answer 400. In the browser the overview sends no per-phase date requests and no per-stat leader
requests (one leaders request per phase shown), and the played-game pages after the first leave together. The
remaining `limit=1` game request is the latest played game (current phase), outside this fix. Bad phase and mode reuse
the `/season-stats` validators, so they answer `400 INVALID_PHASE` / `INVALID_MODE`, not `INVALID_QUERY`.

## Verify

- `npm run build` at the root.
- With `/api/health` reporting `"target":"local"`:
  - Before the change, save the old phase-date and leader-card answers for a completed season (E2025), a season with
    a Top 16 (for example E2015), and the current one (E2026). Compare them with the new endpoints afterwards.
  - Open each of those overviews and compare the hero, phase dates, leader cards, defining games and scoring trend
    with master. Count the requests in the network panel.
  - Open a cancelled season (E2019) and check its phase dates still come from the played games.
- Playwright: `overview-sections.spec.js`, `overview-layout.spec.js`, plus `cancelled-season.spec.js` and
  `skeleton-loading.spec.js` if they visit the overview.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6252,"specSha256":"2c534d5ebdb8275ab77c1c7336b6344ae6f0ba6c4f6547db928b76eceac4822e","branch":"refs/heads/fix/fewer-requests-on-the-season-overview","head":"0d62213402bf1b2d3239a6ea34f6e825814c86d4","baseRef":"refs/heads/master","baseCommit":"0d62213402bf1b2d3239a6ea34f6e825814c86d4","sourceTree":"a3550baa69aa3b9d35b04de664095fdbcfba60ef","absentOptional":[]} -->
