# Fix: Log the requests that reach the database

**Type:** Fix
**Status:** verified
**Branch:** fix/log-the-requests-that-reach-the-database

## The problem

Neon's compute is awake about 89% of the time, overnight included: from 9:20 pm on Nov 19 to 10:03 am on Nov 20 it
was awake about 11 of the 12¾ hours. Scale-to-zero works, because the operations log shows a suspend after every 5
idle minutes. Something then wakes the compute again within minutes, all night (for example suspended 2:39 am, started
2:40 am; suspended 4:29 am, started 4:30 am). The pooler charts show bursts of 1-2 server connections about every 5-6
minutes, about one page's worth of queries each.

These causes are ruled out:

- **The app:** nothing polls. The Home page's one-minute timer only re-renders the round status line.
- **Render's health check:** it now calls `/api/health`, which doesn't query the database.
- **The data pipeline:** it runs once a day, around 6 am.
- **Cloudflare:** the bot settings, Tiered Cache and the cache rules for current and older seasons are all on, and
  the waking hasn't stopped.

What's left is outside requests that miss both Cloudflare and the server's response cache. Nothing records which
requests those are, so the cause can't be named or fixed. The app has no request logging, and Cloudflare's free
analytics don't show which requests reached the origin.

## The fix

In `backend/src/response-cache.ts`, write one log line for each request that runs its route, which is where the
database reads happen. That's every `runRoute` call: a cache miss, or a request that waited on an answer that failed.
Write it when the response finishes. The line holds:

- the method, path and query (the cache key);
- the status code and the time taken in ms;
- Cloudflare's `cf-ipcountry` header;
- the `user-agent`, cut to 200 characters.

Example: `cache miss 200 184ms GET /api/seasons/E2025/players/003733/career country=US ua="Mozilla/5.0 (compatible; Googlebot/2.1; ...)"`.

- **Production only** (`ENV.NODE_ENV === "production"`), like `BROWSER_CACHE`. Development and Playwright runs stay
  quiet.
- **No IP address** and nothing else that identifies a person. Country and user agent are enough to tell a crawler,
  a scraper or a real visitor apart.
- Cache hits, requests that share a pending answer, and the 400s and 404s from the checks before the cache aren't
  logged. They don't touch the database. A route's own `allowQuery` 400 (an unknown parameter) runs after the cache,
  so it is logged with its status. It reads nothing, but it shows junk traffic.
- The prefix is `cache miss`, not `db read`: a miss can still be answered by the ten-minute lookup cache
  (`remembered`) without a query. The time taken tells a real read (tens of ms) from a remembered one (0 ms).
- The lines go to stdout, which Render keeps in the service's Logs. No logging library or new config.

The log is diagnostic. Once the cause is known and fixed, it can stay (it's quiet, because cached answers aren't
logged) or come out in a later fix.

Must not break: the cached and uncached answers, their headers (`X-Cache`, `Cache-Control`), shared pending answers,
the 400 and 404 checks, and HEAD handling.

## Build steps

- [x] **Step 1 - log each route run in production.** In `runRoute`, when in production, note the start time and, on
  the response's `finish` event, `console.log` the line above. A short comment above it says why: it shows what
  wakes Neon.
  **Done when:** `cd backend && npm run build` passes. A local backend started with `NODE_ENV=production`, checked
  beforehand against the local database (dev `/api/health` reports `"target":"local"`), prints one `cache miss 200 ...`
  line for the first request to an API address, and nothing for the same request repeated (an `X-Cache: HIT`).

## Verify

- `cd backend && npm run build` (TypeScript check).
- The local production-mode run from Step 1: a miss logs one line with method, path, status, time, country (`-` when
  the header is missing) and user agent. A hit logs nothing.
- After deploy: check Render's Logs for 2-5 am the next night and see who is reaching the database.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4226,"specSha256":"2dd056e1eda4de09cbbf8cfd519a12147dffa70a9a6269136c98ce634e78bbdc","branch":"refs/heads/fix/log-the-requests-that-reach-the-database","head":"7a1e83498476a0976e9dcbab42e697a75d988c58","baseRef":"refs/heads/master","baseCommit":"7a1e83498476a0976e9dcbab42e697a75d988c58","sourceTree":"84383c5fd55ca7ea4c922de5620243ea0b60ac5b","absentOptional":[]} -->
