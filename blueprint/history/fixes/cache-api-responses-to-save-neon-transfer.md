# Fix: Cache API responses to save Neon transfer

**Type:** Fix
**Status:** verified
**Branch:** fix/cache-api-responses-to-save-neon-transfer

## The problem

Neon's free plan allows 5 GB of public network transfer a month per project. Going over suspends the compute
until the next period, which takes www.jmpeuroleague.com offline. October 1-9 used 4.56 GB of the 5 GB (testing
branch 3.22 GB, production 1.22 GB); the period resets on 1 November.

Measured with a byte counter on the `pg` connection:

| Activity | Read from Neon |
|---|---|
| Every page and every tab once | ~5 MB |
| One full Playwright run (448 tests) | ~56 MB |
| The same run if each distinct URL were read once | ~7 MB |

The suite makes 4,584 API calls to 249 distinct URLs. Two causes:

- **Backend:** nothing is cached. Every request under `/api/seasons` queries Neon, although the data only changes
  when the pipeline publishes (`backend/src/index.ts`, `backend/src/routes/seasons.ts`).
- **Frontend:** `new QueryClient()` in `frontend/src/main.jsx` uses TanStack Query's defaults (`staleTime` 0,
  `refetchOnWindowFocus` true), so every return to the browser tab refetches every active query on the page.

## The fix

### Backend response cache

- A small Express middleware module (for example `backend/src/response-cache.ts`), mounted on `/api/seasons` in
  `backend/src/index.ts` before `seasonRouter`.
- Applies to `GET` only. Key: `req.originalUrl` (path and query string).
- On a hit: set `X-Cache: HIT` and send the stored JSON string with a JSON content type. Use `res.send` so
  Express still sets the ETag and answers `304`.
- On a miss: set `X-Cache: MISS` and wrap `res.json` so the serialized body is stored only when the status is
  `200`. Errors (400, 404, 503) are never stored.
- Time to live: one constant, 10 minutes. An expired entry is dropped on read and counts as a miss.
- At most about 1000 entries. The `Map` keeps insertion order, so an insert past the cap deletes the oldest key.
- No new dependency, environment variable or configuration surface. A restart empties the cache.
- `/api/health` is mounted outside `/api/seasons`, so it is not cached and still reaches the database on every
  call (Render's health check depends on that).

Must not break:

- Response bodies and status codes are unchanged; only the `X-Cache` header is new.
- CORS headers still apply (the `cors` middleware runs before the cache).
- Live and just-finished games can show data up to 10 minutes old. That is accepted, because the pipeline does
  not publish in real time.

### Frontend query defaults

- `frontend/src/main.jsx`: `new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false } } })`.
- Per-query options stay as they are (`ComparisonsPage` already sets `staleTime` to 5 minutes).
- Explicit retries (`refetch()` behind Retry buttons) still work, because they ignore `staleTime`.

### Out of scope (a later fix)

- Endpoints that read far more than they return: player advanced ranks (~195 kB read for an 8 kB reply), records
  player-seasons (341 kB for 8 kB), and the Player Shooting tab's one request per game.
- HTTP `Cache-Control` for the API, Cloudflare caching, a local database for development.

## Build steps

- [x] 1. **Backend response cache.** Add the middleware and mount it on `/api/seasons`.
      Done when: the backend builds, a repeated `GET` of the same URL answers `X-Cache: HIT` with an identical body,
      and 400 and 404 replies are answered `MISS` every time.
- [x] 2. **Frontend query defaults.** Set the `QueryClient` defaults in `main.jsx`.
      Done when: the frontend builds and lints, and switching away from the tab and back makes no new API requests.

## Verify

Playwright is paused until 1 November to save Neon transfer (`CLAUDE.local.md`), so this fix has no browser-test
evidence.

- `cd backend && npm run build`; `cd frontend && npm run build && npm run lint`.
- With the backend running, `curl -i` `/api/seasons/2025/phases/RS/standings` twice: `X-Cache: MISS`, then
  `X-Cache: HIT`, and the two bodies are identical.
- `curl -i` an unknown season or player twice: a 404 both times, `X-Cache: MISS` both times.
- `curl -i` a request with an invalid query (for example `/api/seasons/2025/records/player-seasons?metric=x`)
  twice: a 400 both times, `MISS` both times.
- `curl` with the second request's `If-None-Match` set to the first reply's `ETag`: `304`.
- `curl /api/health` still answers `{"status":"ok","database":"connected"}`.
- In the browser (dev server), open a page, check the Network tab, switch to another window and back: no new
  `/api` requests.

## Also in this commit

Related Neon transfer work, included at the user's request:

- `.gitignore`: ignores the local-only Claude Code browser-test pause (`CLAUDE.local.md`,
  `.claude/settings.local.json`, `.claude/hooks/`), which lasts until the allowance resets on 1 November 2026.
- `blueprint/build-plan.md`: two deferred items, Cloudflare edge caching for the API and cache clearing on
  pipeline publish.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5070,"specSha256":"a7a2a5a5fa353e0d9d0e59aed56b11b0ca1a316feeedfd147810e80fbe38399f","branch":"refs/heads/fix/cache-api-responses-to-save-neon-transfer","head":"a33b95ba423dec87455affafd71962ece8905dbe","baseRef":"refs/heads/master","baseCommit":"a33b95ba423dec87455affafd71962ece8905dbe","sourceTree":"f92efbac4226f117842976095217e94283a84e05","absentOptional":[]} -->
