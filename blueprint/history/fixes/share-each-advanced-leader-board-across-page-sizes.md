# Fix: Share each advanced leader board across page sizes

**Type:** Fix
**Status:** verified
**Branch:** fix/share-each-advanced-leader-board-across-page-sizes

## The problem

`GET /:seasonCode/advanced/leaders` ([seasons.ts:418](backend/src/routes/seasons.ts#L418)) answers a few rows by
reading the whole board: up to 1000 players (`LEADERS_EVERYONE`) from `getPerLeaders`, `getWinShareLeaders`,
`getRoundStatLeaders`, `getOnOffLeaders` or `getRapmLeaders`. RAPM also needs `getPlayerGames` for everyone. The route
then qualifies the rows by the `games` share, sorts where needed and slices `offset`/`limit`. None of those leader
lookups is memoized.

The Leaders page asks for the same board in several shapes, and each is its own response-cache miss and full read:

- each Advanced card asks for `limit: 5` ([AdvancedLeaders.jsx:29](frontend/src/leaders/AdvancedLeaders.jsx#L29));
- an opened board asks for `limit: 25` for every page offset, plus a `limit: 1` "best" row for the bars
  ([AdvancedLeaders.jsx:66-76](frontend/src/leaders/AdvancedLeaders.jsx#L66-L76));
- changing the games share (25 % to 100 %, or all) re-reads the same rows to apply a different minimum;
- the scope check (`metric: "per", limit: 1`) and the overview's MVP and RAPM panels
  ([OverviewExtras.jsx:102-106](frontend/src/season/OverviewExtras.jsx#L102-L106)) read PER, Win Shares and RAPM boards again.

## The fix

Memoize the part that doesn't depend on paging or the games share, using the existing `remembered` helper
([remembered.ts](backend/src/db/remembered.ts)): `DATA_TTL_MS` (10 minutes), concurrent callers share one promise,
failures are dropped.

- Add one helper outside the handler, `advancedBoard(seasonCode, metric, scope, order)`. It returns
  `{ round, rows }` for a board: the scope's latest round (null for RAPM and on/off), and every row the route reads
  today, in final order, each carrying its `games` count. The win-share re-sort and RAPM's `getPlayerGames` move inside
  it. `order` matters only for the round-table metrics; the others ignore it today, so their key always uses `desc`
  and both directions share one entry.
- The route keeps its validation, the `scopes`/`earlySeason` lookups and the empty answers. It then calls
  `advancedBoard`, applies the games-share qualification (`gamesPlayed`, `minGames`, `total`), slices the page, and
  adds the per-page parts it adds today: the club fields, RAPM's `getPlayerClubs` for the shown rows, and
  `getPlayerImages`.
- Nothing mutates a cached board. The qualification filters into a new array, and the win-share sort happens before
  the board is cached.

The response stays byte-for-byte the same for every metric, scope, order, games share, limit and offset, including
`round`, `gamesPlayed`, `minGames`, `total` and `offset`. The frontend doesn't change. No new dependency or
configuration.

Memory, measured on the local database: a board holds a median of 300 rows (444 at most, E2001), about 170–220 bytes
each, so about 55–72 KB per board for E2025 and about 100 KB for the largest. Clients can request 5,667 distinct boards
(27 seasons × 34 metrics × each season's scopes, with two orders for the 27 round-table rates), so a cache's entry cap
is what bounds memory. `remembered` caps every lookup at 1000 entries but only frees an expired entry when that key is
asked for again or the map overflows. Left alone, this cache would fill toward about 65–100 MB under steady traffic or a
scripted sweep, on a 512 MB Render `starter` instance.

- **Cap the board cache at 200 entries.** `remembered` gains an optional `maxEntries` argument (default stays 1000);
  `advancedBoard` passes 200, for a worst case of about 20 MB. A visitor browsing one season touches about 40 boards,
  so 200 covers several seasons being browsed at once. An evicted board is simply read again.
- **Free expired entries.** When `remembered` adds an entry, it first drops expired entries from the front of its map.
  Entries carry one fixed lifetime and a hit never moves an entry, so the map is in expiry order and the sweep stops at
  the first live entry. A pending lookup is never dropped early, and a failed one is still removed at once. This applies
  to every `remembered` lookup. It only changes when memory is freed, never what a lookup returns or how long a value
  is reused.

Out of scope: a Cloudflare rate-limiting rule on `/api/*` (a dashboard setting for the user), and the same expiry
behaviour in `response-cache.ts` (the next fix in the queue reworks that file).

## Build steps

1. [x] **Memoized advanced board.**
   Result: 1404 saved responses (E2025, E2026, E2015; every scope; 13 metric and order pairs including RAPM, on/off,
   PER ascending and both orders of two round-table rates; nine limit, offset and games-share shapes) are byte-identical
   after the change, also when every request is forced to miss the response cache. On the local database a board's later
   shapes answer in 4.0–4.7 ms against 15.7 ms for its first (astPct), 4.3 against 8.1 (on/off) and 9.9 against 13.7 (RAPM,
   which still looks up the shown players' clubs). The JSON and the frontend are unchanged.
   Done when:
   - `cd backend && npm run build` passes.
   - Saved pre-change responses match the new ones exactly. The set covers PER, Win Shares, `winSharesPer40`, one
     round-table rate in both orders, a per-100 metric, on/off and RAPM; `limit` 1, 5 and 25 at offsets 0 and 25;
     games shares 25, 50, 100 and `all`; both a completed season (E2025) and the current one (E2026). It also
     includes the early-season and empty answers where a season has them.
   - A second request for the same board with a different `limit`, offset or games share is clearly faster than the
     first on a cold response cache.
2. [x] **Bounded board cache and expired entries freed.**
   Result: the fake-clock scratch check passed all nine cases (cap of 3, hit reuse, sweep keeps live entries and drops
   expired ones, sweep makes room so the cap does not evict a fresh key, failed lookup retried, default cap 1000), and
   the 1404 responses still match on forced cache misses. Because `remembered` backs every API lookup, the full
   Playwright suite ran: 1222 passed (27 minutes).
   Done when:
   - `cd backend && npm run build` passes.
   - A scratch script against `remembered` (fake clock) shows: a cap of 3 keeps the 3 newest keys; an entry past its
     lifetime is dropped when a later key is added, while live ones stay; a hit within the lifetime returns the same
     promise without a second lookup; a failed lookup is dropped and retried; the default cap is still 1000.
   - The 1404-response comparison from step 1 still matches on forced cache misses.

## Verify

- `npm run build` at the root.
- With `/api/health` reporting `"target":"local"`, save the response set above before the change and compare it
  afterwards (scratch script).
- Open the Leaders page's Advanced view: the cards, an opened board paged forward, the games-share select and the
  direction toggle all show the same values as before. The season overview's MVP and RAPM panels are unchanged.
- Playwright: `leaders.spec.js`, `leaders-layout.spec.js` and `overview-sections.spec.js`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7239,"specSha256":"41bcace95e86b5cce6fa5f3933d046bebc1edc6577288b371baf439028c72db0","branch":"refs/heads/fix/share-each-advanced-leader-board-across-page-sizes","head":"0dc73c2551c8bb6d20e214611e7ed5b050cd7484","baseRef":"refs/heads/master","baseCommit":"0dc73c2551c8bb6d20e214611e7ed5b050cd7484","sourceTree":"98b082acebd9e46969da5133b9087363a49195a7","absentOptional":[]} -->
