# Fix: One shared player pool for the Leaders cards

**Type:** Fix
**Status:** verified
**Branch:** fix/one-shared-player-pool-for-the-leaders-cards

## The problem

The Players tab of the Leaders landing (`/:season/leaders`) fetches every card's top 5 separately.
`PlayerCard` in `frontend/src/leaders/PlayersLeaders.jsx` calls `getLeaderStats` once per card, with `qualified: true`
and sorted by the card's stat:

| Mode | Cards | Requests | Rows each |
| --- | --- | --- | --- |
| Per game | 28 (`PLAYER_CARDS`) | 28 | 5, or 60 for the 12 stats with a `volume` minimum (filtered on the page before the top 5) |
| Totals | 18 (`PLAYER_TOTAL_CARDS`) | 18 | 5 |

Every row is a full stat line (~2.2 KB, 66 fields), so per game is about 1.7 MB of JSON in 28 requests to show 140
names. Each 60-row volume pool can also, in principle, fall short: if more than 55 of a stat's leaders lack the volume,
the card shows fewer than 5.

Measured on the local data: a season has 222-254 qualified players in a phase, which is three 100-row pages of the same
endpoint (~650 KB raw, about 90 KB with the live site's Brotli).

## The fix

Frontend only. No API change. The user chose this over a new cards endpoint, so that the card rules (volume minimums,
order) stay defined once, in `leaderDefs.js`.

- **One pool.** Add `fetchQualifiedPool(seasonCode, phaseCode, mode)` to `frontend/src/leaders/leaderData.js`.
  - Read the first 100-row page of `season-stats` with `qualified: true` and no `sort`, then the remaining pages from
    `pagination.total` in parallel.
  - Return the players in the API's order (`entryOrdinal`), which is the same tie-break the server uses when it sorts.
- **One query.** `PlayersLanding` runs that query once, keyed `["leaders-card-pool", seasonCode, phaseCode, mode]`, and
  passes the pool and its loading/error state to each `PlayerCard`. The per-card `useQuery` goes away.
- **Same ranking on the page.** `PlayerCard` keeps its current rules:
  - It drops null values and players without the stat's volume (`hasVolume`).
  - It sorts by the stat with a stable sort: descending, or ascending when `lowerIsBetter && !showMost` (as the `order`
    it sends today). Equal values keep the pool order, which is the server's tie-break.
  - It takes the top 5 and ranks them with `rankRows`.
- **Card states.** Each card still shows its own skeleton while the pool loads, and its own error with Retry if the pool
  fails. Retry refetches the pool. "No one yet." stays for a card with no qualifying players.

Must not break:
- the cards' names, order, values and bars;
- per game and totals;
- the stage select;
- the "See the full leaderboard" links;
- the "Hot right now" section;
- the full boards;
- the Teams and Advanced tabs, which are untouched. Advanced cards are 5-row requests of ~2 KB each, and Teams already
  shares four queries.

Out of scope:
- the full boards' whole-league fetch (`fetchFullPlayerBoard`);
- the Player and Compare pages' `fetchLeagueLeaderboard`.

Those are optimization #4.

## Build steps

- [x] 1. **Shared pool and cards.** Add `fetchQualifiedPool`, move the query to `PlayersLanding`, and rank each card
  from the pool.
  Done when: the per-game landing for 2025 makes at most 3 `season-stats` requests (it makes 28 today) and the
  Points card shows the same five players as before.
- [x] 2. **Tests.** In `frontend/e2e/leaders.spec.js`, add a test on `/2025/leaders` that:
  - counts the `season-stats` requests the per-game landing sends, and expects at most 3;
  - for Points, Assists and Turnovers (which lists the most first), asks the API directly for that stat's top 5
    (`sort`, `order`, `limit: 5`, `qualified: true`) and expects the card to list the same names in the same order;
  - for 3-point % (a volume stat), asks the API for its 60-row pool, applies the 1+ attempt a game rule, and expects the
    card to match its top 5.

  Done when: the new test and the existing `leaders.spec.js` and `leaders-layout.spec.js` tests pass, apart from the
  board-statistic `phase=PO` test that already fails on `master`.

## Verify

- Browser tests (local DB; `/api/health` must report `"target":"local"`):
  `cd frontend && npx playwright test leaders.spec.js leaders-layout.spec.js`
- Manual, with DevTools Network filtered to Fetch/XHR:
  - `/2025/leaders`: 3 `season-stats` requests instead of 28, and the cards look as before.
  - Switch to Totals: 3 requests.
  - Choose Playoffs: the cards change to the playoffs.
  - Open a card: its full board opens as before.
- `cd frontend && npm run lint` passes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4572,"specSha256":"6b211ef8bea95e42a24bab4df711f5dd701dcd284fbb7f6ad96df1521cd45762","branch":"refs/heads/fix/one-shared-player-pool-for-the-leaders-cards","head":"9abec2f96d547b853da2af86be07e61903c8334c","baseRef":"refs/heads/master","baseCommit":"9abec2f96d547b853da2af86be07e61903c8334c","sourceTree":"d8e5756b505f88bab5f442376b7583ed20181187","absentOptional":[]} -->
