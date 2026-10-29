# Fix: Parallel league pages and one shared league list for the Leaders board

**Type:** Fix
**Status:** verified
**Branch:** fix/parallel-league-pages-and-one-shared-league-list-for-the-leaders-board

## The problem

Two helpers download a whole season's player list (about 335 players, ~720 KB raw, four 100-row pages of
`season-stats`). Both read the pages one after another, so each page waits for the previous one.

| Helper | Used by | Extra cost |
| --- | --- | --- |
| `fetchLeagueLeaderboard` (`frontend/src/players/leagueLeaderboard.js`) | Player page Overview and Statistics tabs, Compare player overview, the career profile radar (one list per season) | Pages one after another |
| `fetchFullPlayerBoard` (`frontend/src/leaders/leaderData.js`) | The Leaders player board (`/:season/leaders?metric=...`) | Pages one after another, **and** the server sorts it, so the query key includes the stat and direction. Every stat or direction change downloads the whole league again (4 requests, ~720 KB) and shows the loading state. |

Both fetch the same rows: every player in the season, phase and mode. The only difference is the board's server-side
sort. The server breaks ties by `entryOrdinal`, and the unsorted list already arrives in that order (the same fact the
Leaders cards rely on since `fix/one-shared-player-pool-for-the-leaders-cards`). A stable sort in the browser therefore
gives the server's order.

## The fix

Frontend only. No API change.

- **Pages in parallel.** `fetchLeagueLeaderboard` reads the first page, then the remaining pages from `pagination.total`
  at the same time, as `fetchQualifiedPool` does.
  - Keep its 5-page cap (500 players).
  - Keep its query key, `leaderboardQueryKey`, so the Player page, Statistics tab and Compare keep sharing one cached
    list.
- **The board reuses that list.** `PlayersBoard` reads `leaderboardQueryKey(seasonCode, phaseCode, mode)` with
  `fetchLeagueLeaderboard`.
  - It sorts the players by the chosen stat in the browser with a stable sort: descending or ascending by `direction`,
    with nulls last as the server does.
  - Then it applies its existing filters and ranking unchanged (qualified or minimum games, volume, team, position,
    search, `rankRows`, 25 per page).
  - Changing the stat or direction then makes no request and shows no loading state.
  - Opening a board after a Player page in the same season, phase and mode reuses the cached list.
- **Remove `fetchFullPlayerBoard`** once nothing calls it.

Must not break:
- the board's order, ranks, ties, filters, paging, rank-movement arrows and "Showing x-y of n";
- the Player page Overview and Statistics tabs;
- Compare;
- the career radar.

Out of scope:
- **A server-side rank/percentile endpoint.** It would move about 60 stats' ranking rules (qualified only, unqualified
  ranked among the qualified, lower-is-better, per mode) into the API for four screens. That is a `/feature` if it is
  ever wanted.
- **The career radar's one list per season.** It only loads on a click; it gets parallel pages here.

## Build steps

- [x] 1. **Parallel pages, and the board on the shared list.** Make `fetchLeagueLeaderboard` parallel, move
  `PlayersBoard` onto it with the browser sort, and remove `fetchFullPlayerBoard`.
  Done when, on `/2025/leaders?metric=pointsScored`:
  - the list arrives in two rounds of requests (page 1, then the rest together);
  - choosing another statistic sends no `season-stats` request.
- [x] 2. **Tests.** In `frontend/e2e/leaders.spec.js`, add a test on `/2025/leaders?metric=pointsScored` that:
  - for Points (desc), Turnovers (ascending, via `direction=asc`) and 3-point % (a volume stat), compares the board's
    first 25 player links with the API's own sorted order (`sort`, `order`, `qualified: true`), with the volume rule
    applied for 3-point %;
  - switches the statistic in the Statistic select and expects no new `season-stats` request.

  Done when: the new test passes, and these still pass:
  - the existing `leaders.spec.js` and `leaders-layout.spec.js`, apart from the board-statistic `phase=PO` test that
    already fails on `master`;
  - the player page specs (`player-*-layout.spec.js`);
  - the Compare specs `compare.spec.js` and `compare-player-layout.spec.js`.

## Verify

- Browser tests (local DB; `/api/health` must report `"target":"local"`):
  `cd frontend && npx playwright test leaders.spec.js leaders-layout.spec.js player- compare.spec.js compare-player-layout.spec.js`
- Manual, with DevTools Network filtered to Fetch/XHR:
  - `/2025/leaders?metric=pointsScored`: page 1, then the other pages together.
  - Change the Statistic select and the direction: no new requests, no loading flash, the board re-ranks.
  - Open a player from the board: the Overview tab's rankings appear without re-downloading the league.
- `cd frontend && npm run lint` passes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4871,"specSha256":"7f2f86467144cb8d00c64099be85871834f3327a427941ca0cc97b925050b460","branch":"refs/heads/fix/parallel-league-pages-and-one-shared-league-list-for-the-leaders-board","head":"0304dc4d0bd6c7104df255ea42e33368c41796ae","baseRef":"refs/heads/master","baseCommit":"0304dc4d0bd6c7104df255ea42e33368c41796ae","sourceTree":"fa0d8d49a0a413643960e0c1eb0f5e118510c73c","absentOptional":[]} -->
