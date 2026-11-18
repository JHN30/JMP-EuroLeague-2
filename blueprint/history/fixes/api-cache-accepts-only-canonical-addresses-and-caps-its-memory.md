# Fix: API cache accepts only canonical addresses and caps its memory

**Type:** Fix
**Status:** verified
**Branch:** fix/api-cache-accepts-only-canonical-addresses-and-caps-its-memory
**Fixes:** F-01

## The problem

`backend/src/response-cache.ts` caches every 200 answer under its raw URL (`req.originalUrl`, line 41). It keeps up to
1000 entries (line 7) with no limit on their size. Any address that differs in its text but not in its meaning is
therefore a fresh database read and a fresh cache entry:

- **Unknown query parameters** are ignored by the routes: `?phase=RS&x=1`, `&x=2`, and so on.
- **Order and spelling of the query**: `?a=1&b=2` vs `?b=2&a=1`, a stray `&`, percent-encoded values.
- **Path spelling**: `/API/SEASONS/...` and `/E2025/SHOTS` route the same (Express matching is case-insensitive), as do
  a trailing slash and percent-encoded path characters (`/%452025/...`).

`/api/seasons/E2025/shots?phase=RS` is 1,516,863 bytes (measured locally). 1000 junk variants of it hold about 1.5 GB
in the Node heap and pull about 1.5 GB from Neon, whose plan meters bytes sent. Cloudflare's cache keys on the URL too,
so it passes every variant through. Its rate limit (150 per 10 s per IP) lets 1000 requests through in about 70 s.

## The fix

At the API's entrance (`responseCache`, which every `/api/seasons` request already passes), accept only canonical
addresses. Build the cache key from what the routes actually read. Cap the cache by bytes as well as by count.

1. **Reject what the route does not read.** Answer 400 `INVALID_QUERY` for these, before any database work:
   - a query parameter the requested route does not read. Each route lists its own parameters with
     `allowQuery(...)` in `routes/seasons.ts`. (Revised after the independent review: the first version used one
     shared list, so a name one route reads was still ignored, and cache-busting, on every other route);
   - a parameter given more than once (routes expect one string);
   - a `%` in the path. Every path value (season, club, player, game, phase codes) is plain letters and digits, so a
     real request never needs it.
2. **Exact path matching.** Create `seasonRouter` with `Router({ caseSensitive: true, strict: true })`. Upper-case route
   words and trailing slashes then fall through to Express's plain 404, with no database work. In `responseCache`,
   also answer 404 when `req.baseUrl` is not exactly `/api/seasons`, because the mount itself matches without regard
   to case. Path values such as `E2025` and `OLY` are unaffected, because case sensitivity applies to the route's
   fixed words only.
3. **Canonical cache key.** Build the key as `req.baseUrl + req.path` plus the query parameters sorted by name and
   re-encoded. Requests that mean the same thing then share one entry. Keep the existing records-route mapping, which
   lets every season share one records entry.
4. **Byte budget.** Track the total size of the stored bodies and drop the oldest entries while it exceeds 100 MB.
   Keep the existing 1000-entry cap. Never store a body larger than the budget.

Must not break:

- Every page's real requests. The allow-list must cover every name the routes read, and the frontend API client must
  send nothing else. The full browser suite proves it, because this touches every API call.
- Request sharing for identical cold requests, the records mapping, the `X-Cache` header, and `Cache-Control`.
- `/api/health` and `/api/health/db`, which are outside `/api/seasons`.
- HEAD handling. It is unchanged; F-04 tracks it separately.

## Build steps

- [x] 1. Add the allow-list, the duplicate-parameter and `%` checks, the `baseUrl` check, and the canonical key to
   `response-cache.ts`. Make `seasonRouter` case-sensitive and strict. Build the allow-list from every
   `req.query` read in `routes/seasons.ts`, including destructured ones such as `qualified`, `minGames` and `club`.
   Cross-check it against the parameters `frontend/src/lib/api.js` sends.
   Add `frontend/e2e/api-response-cache.spec.js` (API requests only). It checks that:
   - an unknown parameter, a repeated parameter and a `%` in the path each get 400;
   - `/API/SEASONS/...`, an upper-case route word and a trailing slash each get 404;
   - the same parameters in a different order get `X-Cache: HIT` after the first request.

   **Done when:** that spec passes and `cd backend && npm run build` passes.
- [x] 2. Add the 100 MB byte budget to `remember`, with the eviction kept in expiry order.
   **Done when:** the backend builds. A scratch script that calls the cache with oversized bodies shows the total
   held stays at or under the budget and a body larger than the budget is not stored. The script is not committed.
- [x] 3. (Review repair: F-01 reopened, F-08.) Replace the shared allow-list with an `allowQuery(...)` per route,
   listing exactly the `req.query` names that route reads, directly or through its helpers. Remove the
   now-unreachable malformed-encoding middleware and `URIError` branch in `routes/seasons.ts` (F-08). Add to the API
   spec: `/shots` with a name only another route reads (`search`, `limit`, `teamA`) gets a 400.
   **Done when:** the backend builds, the API specs pass, and the full browser suite shows no new failures.

## Verify

- `cd backend && npm run build`.
- With `/api/health` reporting `"target":"local"`, run the full browser suite: `cd frontend && npm run test:browser`.
  It covers every page, and any parameter missing from the allow-list shows up as a broken page.
- `curl -i "localhost:3000/api/seasons/E2025/shots?phase=RS&x=1"` gives 400, and
  `curl -i "localhost:3000/api/seasons/E2025/SHOTS?phase=RS"` gives 404.
- After deploy, purge Cloudflare's cache as usual and spot-check two pages on the live site.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5779,"specSha256":"855db6c2b6793b18dd743c1ec05b56a6e01287fd370b15272ec7ce63fc438d1d","branch":"refs/heads/fix/api-cache-accepts-only-canonical-addresses-and-caps-its-memory","head":"746c1ba6043c761f5816d6170802c8a0d228a5aa","baseRef":"refs/heads/master","baseCommit":"80db517af487cd43278f763ce6581f90bcd07952","sourceTree":"f199347c901e83e8d59f21dee90eb23524c8a1af","absentOptional":[]} -->

## Findings

### api-cache-accepts-only-canonical-addresses-and-caps-its-memory/F-01 [P1] closed - Junk query parameters bust the API response cache and can fill server memory

**File:** backend/src/response-cache.ts:41 (key = raw URL), :7 (cap is 1000 entries, not bytes)
**Found:** 2026-11-18 by /audit (scope: full; lens: security, performance)
**Why it matters:** The cache key is the full URL and no route rejects unknown query parameters, so `/api/seasons/E2025/shots?phase=RS&x=1`, `&x=2`, ... each miss the cache (and Cloudflare's, which also keys on the query string), run a fresh Neon read, and store the answer. That answer measured 1,516,863 bytes locally. 1000 such entries hold about 1.5 GB in the Node heap and pull about 1.5 GB from Neon, whose plan meters bytes sent; the Cloudflare limit (150 per 10 s per IP) allows 1000 requests in about 70 s. Upper-case paths, percent-encoded characters, a trailing slash and reordered `stats=` lists are further free variants. Whether this crashes the Render instance depends on its memory size (unverified).
**Suggested fix:** Answer 400 for any query parameter outside the route's allowed set (or build the key from the lower-cased path plus the sorted allowed parameters), and cap the cache by total bytes (for example 100 MB) as well as by count.
**Resolution:** Repaired on fix/api-cache-accepts-only-canonical-addresses-and-caps-its-memory: unknown, repeated and %-encoded inputs get 400, other spellings of the path get 404, the cache key is rebuilt from the path and sorted parameters, and stored bodies are capped at 100 MB. Awaiting review.
Independent review 2026-11-18 (target 5f593aa, claude-opus-5-5, fresh subagent): reopened. The memory half is repaired (byte budget accounting in `remember`/`drop` is consistent; heap now bounded at about 100 MB). The cache-bust/Neon-egress half is not: `QUERY_NAMES` (backend/src/response-cache.ts:24) is one allow-list for every route, so a name some *other* route reads is still ignored by the route that gets it. Reproduced on the local server: `/api/seasons/E2025/shots?phase=RS&search=<new value>` (also `limit=`, `teamA=`, ... any of the 24 names the shots route does not read) answers 200, 1,516,863 bytes, `X-Cache: MISS` for every new value, and `getPositionShots` is not memoised, so each is a fresh database read; Cloudflare keys on the URL and passes each through. Fix: make the allowed names per route (for example a small table from route pattern to names in `responseCache`, or each route refusing names it does not read), then add a spec that an allowed-elsewhere name on `/shots` gets 400.
Repaired again (step 3): the shared list is gone; each route refuses with a 400 any parameter it does not read (`allowQuery(...)` on all 47 routes in backend/src/routes/seasons.ts, derived from each route's `req.query` reads and helpers). `/shots` with `search`, `limit` or `teamA` now gets 400 (frontend/e2e/api-response-cache.spec.js). Awaiting review.
Independent review 2026-11-18 (target 746c1ba, claude-opus-5-5, fresh subagent): closed. All 47 `seasonRouter.get` routes carry `allowQuery(...)`; each list matches exactly the `req.query` names the route reads directly or through its helpers (`requestedPage`, `requestedRound`, `requestedStats*`, `requestedAdvancedScope`, `requestedPersonKeyFilter`, `requestedGame*`, `requestedSearch`), and every parameter `frontend/src/lib/api.js` sends is allowed on its route. Local probes: `/shots?phase=RS&x=1` and `&search=zz` are 400, `/E2025/SHOTS`, `/API/...`, `/api/Seasons/...`, trailing slash, `//` and `;x` are 404, repeated, `[]`, empty-name and `__proto__` names are 400, `/api/seasons` and `/api/seasons/` share one entry. Byte accounting is consistent (every removal goes through `drop`, an oversize body is never stored, the new entry can never evict itself). A 400 from `allowQuery` settles `pending` with null, so waiters run the route themselves and also get the 400 without database work. The residual reordered-`stats=` variant on a small answer is tracked as F-09.

### api-cache-accepts-only-canonical-addresses-and-caps-its-memory/F-08 [P3] closed - Malformed-encoding handlers in the season router are now unreachable

**File:** backend/src/routes/seasons.ts:242 (middleware), :1567 (URIError branch of the error handler)
**Found:** 2026-11-18 by /audit independent (scope: current; lens: quality)
**Why it matters:** `responseCache` now answers 400 `INVALID_QUERY` for any `%` in the path (backend/src/response-cache.ts:131) before `seasonRouter` runs, so the `hasMalformedEncoding` middleware and the `URIError` branch that map bad encodings to `INVALID_SEASON` / `PHASE_NOT_FOUND` / `INVALID_TEAM_CODE` can no longer be reached. Dead code that suggests behaviour the API no longer has.
**Suggested fix:** Delete the middleware at :242 and the `URIError` branch (and `hasMalformedEncoding` if nothing else uses it). The `%` check in `responseCache` replaces them; current requirement lost: None (the specific error codes for malformed paths, which no spec or page relies on).
**Resolution:** Repaired (step 3): the `hasMalformedEncoding` helper, its middleware and the `URIError` branch of the error handler are removed from backend/src/routes/seasons.ts. Awaiting review.
Independent review 2026-11-18 (target 746c1ba, claude-opus-5-5, fresh subagent): closed. No reference to `hasMalformedEncoding` remains and the backend builds. No request can now raise a `URIError` inside the router: `responseCache` refuses any `%` in `req.path` before `seasonRouter` decodes params (`/api/seasons/2025%2Fteams` is 400 `INVALID_QUERY`), the query uses Node's `querystring.parse`, which never throws (`?search=%ED%A0%80` and `%E0` answer 200), and the cache key's `encodeURIComponent` cannot meet a lone surrogate because `req.url` is Latin-1 and querystring falls back to U+FFFD. So a malformed encoding cannot become a 500 through the shortened error handler.

## Independent review

**Status:** passed
**Target commit:** 746c1ba6043c761f5816d6170802c8a0d228a5aa
**Base commit:** 80db517af487cd43278f763ce6581f90bcd07952
**Base ref:** refs/heads/master
**Spec hash:** 855db6c2b6793b18dd743c1ec05b56a6e01287fd370b15272ec7ce63fc438d1d
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-11-18T18:16:45Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-18T18:20:38Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `80db517af487cd43278f763ce6581f90bcd07952..746c1ba6043c761f5816d6170802c8a0d228a5aa` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `cd backend && npm run build`: pass
- `cd frontend && npm run lint`: pass
- `curl -s localhost:3000/api/health`: pass (`"target":"local"`)
- `cd frontend && npx playwright test api-response-cache.spec.js api-security-headers.spec.js`: pass (8 of 8)
- Read-only `curl` probes against localhost:3000 (about 35 addresses): pass, behaviour as below

### Evidence

- Preconditions: `HEAD` = target, `git merge-base master HEAD` = base, spec SHA-256 matches, only review.md and findings.md differ from the target.
- Delta reviewed: backend/src/response-cache.ts, backend/src/routes/seasons.ts, frontend/e2e/api-response-cache.spec.js, frontend/e2e/api-security-headers.spec.js, blueprint/context/current-feature.md; plus backend/src/index.ts, frontend/src/lib/api.js, frontend/src/lib/apiClient.js and the e2e API calls for context.
- 47 of 47 `seasonRouter.get` routes carry `allowQuery(...)`; every list equals the `req.query` names the route reads directly or via helpers, and every parameter api.js sends (and every query in e2e direct API calls) is allowed on its route. No other backend file reads `req.query`; no frontend code calls the API outside api.js.
- Probes: unknown, other-route (`search` on `/shots`), repeated, `[]`, empty-name and `__proto__` names are 400; `%` in the path (`2025%2Fteams`) is 400; `/API/`, `/api/Seasons/`, `/SHOTS`, trailing slash, `//`, `;x` are 404 without database work; `/api/seasons` and `/api/seasons/` share one entry (HIT); `?search=%ED%A0%80` and raw high bytes answer 200 (no `URIError`, so no 500 through the shortened error handler); CORS preflight is answered 204 by `cors` before `responseCache`; HEAD answers 200 without `X-Cache` (unchanged, F-04); POST is a JSON 404.
- Byte budget: every removal goes through `drop`, `storedBytes` is adjusted on each set and drop, an oversize body is skipped after its stale copy is dropped, and the eviction loop cannot evict the entry just stored (its size is within the budget).
- Coalescing: an `allowQuery` 400 settles `pending` with null; waiters then run the route themselves and get the same 400 with no database work.
- Express 5.2.1 uses `querystring.parse` (simple parser), so `typeof value !== "string"` catches every repeated parameter.

### Findings

- F-01 [P1] closed: per-route allow-lists and the 100 MB byte budget remove the large-answer cache-bust and memory growth.
- F-08 [P3] closed: the unreachable encoding handlers are gone and no URIError path remains.
- F-09 [P3] open (new): `season-stats/leaders` keys on the `stats` list order, so reordered lists miss the cache (small answers, up to 10 queries each).

### Remaining risk

- The full browser suite (`npm run test:browser`), which the spec names as the proof that no page sends a refused parameter, was not run by the reviewer; only the two API specs ran. The static cross-check of api.js against every route's list found no gap.
- The byte budget has no committed test (the spec chose an uncommitted scratch script) and no unit test command exists; reviewed by reading only.
- Cloudflare behaviour and the production build were not exercised (no network, no deploy).
- Pre-existing, outside the delta: `?search=` containing a NUL byte (`%00`) answers 503 `DATABASE_UNAVAILABLE` (Postgres rejects the string), not a 400; not cached, small cost.
