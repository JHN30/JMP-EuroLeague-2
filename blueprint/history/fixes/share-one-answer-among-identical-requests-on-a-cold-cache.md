# Fix: Share one answer among identical requests on a cold cache

**Type:** Fix
**Status:** verified
**Branch:** fix/share-one-answer-among-identical-requests-on-a-cold-cache

## The problem

[response-cache.ts](backend/src/response-cache.ts) caches successful `GET /api/seasons/...` answers by URL for
`DATA_TTL_MS` (10 minutes), but it has two gaps:

1. **No sharing on a miss.** The cache is empty after every deploy or restart, and an entry expires after 10 minutes.
   Identical requests that arrive while the first is still running all miss and each run the route. A page opened by
   several visitors at once, or one page whose components ask for the same URL, sends the same queries to Neon several
   times. The `remembered` lookups already share one promise per key, but the route work around them (and every
   lookup that is not memoized, such as the season-stats and game reads) does not.
2. **Expired entries linger.** An expired answer is only removed when the same URL is asked for again, or when the map
   passes 1000 entries. Under steady traffic the cache fills to 1000 bodies and stays there. This is the same issue
   the previous fix repaired in `remembered`.

## The fix

All in `response-cache.ts`; no new dependency or configuration.

- **Pending answers.** Keep a second map from cache key to a pending promise of the answer body (or `null` when the
  answer will not be cached).
  - On a miss with nothing pending, register a pending promise and run the route as now. The existing `res.json`
    wrapper resolves it with the body when the status is 200. Any other status resolves it with `null`. If the
    response finishes or the connection closes without passing through `res.json`, it also resolves with `null`.
    The pending entry is removed in every one of those cases.
  - On a miss with an answer pending, wait for it. A body is sent as a hit (`X-Cache: HIT`, the same `Cache-Control`
    as any hit). `null` means the first request failed or was not cacheable, so this request runs the route itself,
    exactly as today. Errors are never shared or cached.
- **Expired entries freed.** Before `remember` adds an entry, drop expired entries from the front of the map. Every
  entry lives `DATA_TTL_MS` from when it was stored, and a re-store moves it to the end, so the map is in expiry
  order and the sweep stops at the first live entry.

Must not break: cache keys (including the shared key for the records routes across seasons), hit and miss headers,
`Cache-Control` in production, error answers (never cached, never shared), non-GET requests, and every route's answer.

## Build steps

1. [x] **Pending answers and expired-entry sweep in the response cache.**
   Result: the scratch check passed all 12 cases: 5 identical requests ran the route once, giving 1 MISS and 4 HITs
   with one body; 5 concurrent 400s ran it 5 times; a failing first request left its 2 waiters to run the route
   themselves (500, 200, 200); a waiter, and a later request, were answered after the first connection closed; and
   150 large answers (+72.6 MB) were freed (−71.1 MB) by one new answer after expiry, which stayed cached. On the dev
   backend, 5 identical cold requests to RAPM leaders, season stats and phases each gave 1 MISS and 4 HITs with one
   body, while an invalid season gave five 400 MISSes. Browser tests: the smoke set (`smoke.spec.js`,
   `urls-and-titles.spec.js`, 6 passed), per the user's choice on 2026-11-14 to run a smoke set rather than the full
   suite for backend-only changes. A full-suite run started earlier had passed 145 tests with no failures when it was
   stopped.
   Done when:
   - `cd backend && npm run build` passes.
   - A scratch check mounts `responseCache` on a small Express app with a slow counting route:
     - five identical concurrent requests run the route once, and give one `MISS` and four `HIT`s with identical bodies;
     - five concurrent requests to a route answering 400 run it five times, and all answer 400;
     - a waiter whose first request fails runs the route itself;
     - after a fake-clock expiry, adding one entry frees the expired ones, so filling to the cap afterwards does not
       evict the new entry;
     - a request whose connection closes before answering does not leave later identical requests waiting.
   - Against the dev backend, five identical concurrent cold requests (fresh query parameter) to a heavy route, such
     as `/advanced/leaders` or `/season-stats`, give one `MISS` and four `HIT`s with identical bodies.

## Verify

- `npm run build` at the root.
- With `/api/health` reporting `"target":"local"`:
  - Run the scratch check above, and fire concurrent identical cold requests at the dev backend.
  - Open a few pages (Home, Overview, Leaders, a team, a game) and confirm they load as before.
- Playwright: the smoke set (`smoke.spec.js`, `urls-and-titles.spec.js`). This is a backend-only change whose
  behaviour the scratch check proves directly; the full suite is for shared frontend changes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5029,"specSha256":"abdb9ae4343bce6fe769b29845defbebe626397c6b4f96a1a5caeab0f8f7a281","branch":"refs/heads/fix/share-one-answer-among-identical-requests-on-a-cold-cache","head":"906d48e3e23db7c48d3f3da8c674ff4a7500ee5f","baseRef":"refs/heads/master","baseCommit":"906d48e3e23db7c48d3f3da8c674ff4a7500ee5f","sourceTree":"569d9581747397317c84bc40d04779c18b6390af","absentOptional":[]} -->
