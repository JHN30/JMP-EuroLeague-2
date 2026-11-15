# Fix: Header regression test and Cloudflare cache comment

**Type:** Fix
**Status:** verified
**Branch:** fix/header-regression-test-and-cloudflare-cache-comment
**Fixes:** F-01

## The problem

1. **F-01 [P3]: nothing automated guards the API hardening.** The fix "Harden the API's dependencies, headers and CORS"
   ([archive](../history/fixes/harden-the-api-dependencies-headers-and-cors.md)) was proven only by one-off curls:
   - `X-Frame-Options: DENY` and `Referrer-Policy: strict-origin-when-cross-origin` on cached (HIT) and uncached (MISS)
     answers;
   - no `X-Powered-By` and no `Access-Control-Allow-Credentials`;
   - a POST body is never parsed (`POST {bad` → 404, not 400).

   The middleware order in [index.ts](../../backend/src/index.ts) matters. Moving the header middleware below
   `responseCache`, or adding `express.json()` back for a future route, would quietly undo part of it, and no test would
   notice.
2. **An outdated comment.** [response-cache.ts:9-12](../../backend/src/response-cache.ts#L9-L12) says `private` keeps
   Cloudflare out, so a publish is never held back. On the live site, Cloudflare cache rules now cache API answers on
   purpose (the current season for 2 hours, older seasons for 1 month) and override `private`. So a publish is held back
   until those copies expire or the cache is purged. A reader of the comment would be misled about where stale data
   comes from.

## The fix

1. **One API-level spec**, `frontend/e2e/api-security-headers.spec.js`, following the existing `api-*.spec.js` pattern
   (`page.request` against `http://localhost:3000`). It needs no new dependency or helper. It checks:
   - one season address with a unique query string (so the first read is a MISS whatever ran before), read twice:
     - both answers are 200, the first with `X-Cache: MISS` and the second with `X-Cache: HIT`;
     - both carry `x-frame-options: DENY` and `referrer-policy: strict-origin-when-cross-origin`;
     - neither has `x-powered-by` or `access-control-allow-credentials`;
     - sent with `Origin: http://localhost:5173`, both answer `access-control-allow-origin: http://localhost:5173`;
   - `/api/health` carries the same two headers and no `x-powered-by`;
   - `POST /api/nothing` and `POST` to a real season route, each with `Content-Type: application/json` and body `{bad`,
     answer 404.
2. **Rewrite the `BROWSER_CACHE` comment** to say what happens now:
   - `private, max-age=300` lets the browser reuse an answer for 5 minutes;
   - on the live site, Cloudflare cache rules override `private` on purpose (current season 2 hours, older seasons
     1 month), to save Neon traffic;
   - so after a publish or deploy, purge Cloudflare's cache for new data or headers to show at once;
   - development sends nothing.

   This is a comment only; the header value doesn't change.

Must not break: no product behaviour changes; the API answers and headers stay exactly as they are.

## Build steps

- [x] **1. Add the spec and correct the comment.**
      **Verified (local DB, dev servers running):** the spec passes 3/3. With `app.use(express.json())` added back, the
      POST test failed (expected 404, received 400). With the header middleware moved below `/api/seasons`, the season test
      failed already on the MISS (`x-frame-options` undefined): the route answers before the middleware runs, so the HIT
      can't have it either. After both were reverted, `git diff` showed no change to `index.ts`, the spec passed 3/3
      again, and the backend typecheck and frontend lint passed.
      **Done when:**
      - With `/api/health` reporting `"target":"local"`, `cd frontend && npx playwright test api-security-headers.spec.js`
        passes.
      - The spec catches a regression. With `app.use(express.json())` temporarily added back in `index.ts` (dev server
        reloaded), the POST check fails. With the header middleware temporarily moved below the `/api/seasons` line, the
        HIT check fails. Both temporary changes are then reverted, and `git diff` shows no change to `index.ts`.
      - `cd backend && npm run build` and `cd frontend && npm run lint` pass.
      - The comment in `response-cache.ts` matches the Cloudflare setup above, and the code is unchanged.

## Verify

- `cd frontend && npx playwright test api-security-headers.spec.js`, on the local DB only.
- No other browser specs: the change adds one API spec and edits a comment, so no page, component or API answer changes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4493,"specSha256":"4399e6241008c289e159ac94a7148bbec6b7f697b0103d7f2ec884f6955f5565","branch":"refs/heads/fix/header-regression-test-and-cloudflare-cache-comment","head":"785ac48d974323bf9e47539745147c50e0ae1f04","baseRef":"refs/heads/master","baseCommit":"785ac48d974323bf9e47539745147c50e0ae1f04","sourceTree":"b10f8eb59d8b45413dd640ea2578046be2ec28c2","absentOptional":[]} -->

## Findings

### header-regression-test-and-cloudflare-cache-comment/F-01 [P3] closed - No automated regression check for the new header, CORS and no-body-parser contract

**File:** backend/src/index.ts:12
**Found:** 2026-11-15 by /audit independent (scope: current; lens: tests)
**Why it matters:** The fix's guarantees (`X-Frame-Options: DENY` and `Referrer-Policy` on MISS and HIT, no `X-Powered-By`, no `Access-Control-Allow-Credentials`, `POST {bad` answering 404 rather than 400) were proven only by one-off manual curls. The middleware order is load-bearing: moving the header middleware below `responseCache`, or re-adding `express.json()` for a future route, would silently undo part of the hardening, and nothing in the repository would notice. The smoke specs prove cross-origin data loading still works, but assert none of the headers.
**Suggested fix:** Optional. Add one small API-level spec in `frontend/e2e/` following the existing `api-*.spec.js` pattern (`page.request` against `http://localhost:3000`): read one `/api/seasons/...` address twice and assert the two headers on both the MISS and the HIT, the absence of `x-powered-by` and `access-control-allow-credentials`, and that a `POST` with body `{bad` answers 404. Nothing is deleted; no current requirement is lost by leaving it out, since browser tests are opt-in evidence in this project.
**Resolution:** Fixed by `frontend/e2e/api-security-headers.spec.js` (fix "Header regression test and Cloudflare cache comment"): one season address with a unique query string read twice (MISS then HIT, both with `x-frame-options: DENY` and `referrer-policy`, neither with `x-powered-by` or `access-control-allow-credentials`, both allowing the dev origin), `/api/health` with the same headers, and `POST {bad` answering 404 at `/api/nothing` and a real route. Passes 3/3 on the local DB. Proven to catch both named regressions: re-adding `express.json()` failed the POST test (400), and moving the header middleware below `/api/seasons` failed the season test on the MISS; both were reverted and `index.ts` is unchanged. Re-reviewed 2026-11-15 by /audit (scope: current; lenses: quality, security, performance, tests) and closed: `frontend/e2e/api-security-headers.spec.js` and `backend/src/index.ts` were in the reviewed set. The spec asserts every guarantee named above on both MISS and HIT, uses a unique address so the first read cannot be a HIT, has no skip/only, and passed 9/9 with `--repeat-each=3` under the parallel config. No new defect found in the repair.
