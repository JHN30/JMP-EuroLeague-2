# Fix: Harden the API's dependencies, headers and CORS

**Type:** Fix
**Status:** verified
**Branch:** fix/harden-the-api-dependencies-headers-and-cors

## The problem

A security review (2026-11-15) found no exploitable bugs in the app's own code. Every route parameter is validated,
all SQL is parameterized and there is no login. It did find five easy hardening gaps:

1. **Vulnerable dependencies.** The backend shipped `body-parser` 2.3.0 (high: a crafted compressed body can stall the
   server) and `qs` 6.16.0 (moderate). The frontend's dev and build tools had `vite` 8.3.2 (high: several dev-server
   file and command issues, some Windows-only) and `source-map-js` 1.2.1 (high).
2. **Body parsers nothing uses.** [index.ts](../../backend/src/index.ts) registers `express.json()` and
   `express.urlencoded()` for every request, but every API route is a GET and nothing reads `req.body`. The live site
   parses any POST body sent to any address, including addresses that don't exist (`POST /api/nothing` with `{bad`
   answers 400; with `{}` it answers 404). So every current and future body-parser bug can be reached without logging in.
3. **`X-Powered-By: Express`** goes out on every response and tells automated scanners what to target.
4. **No framing or referrer policy.** Any site can show the app inside a frame. The referrer behaviour is left to
   browser defaults. HSTS and `nosniff` are being switched on in Cloudflare, so they are not part of this fix.
5. **CORS allows credentials it never uses.** The backend sends `Access-Control-Allow-Credentials: true` and
   [apiClient.js](../../frontend/src/lib/apiClient.js) sends `credentials: "include"`, but the app has no cookies or
   auth. Nothing can be exploited today. If a login cookie and a looser origin were added later, though, other sites
   could make logged-in reads.

## The fix

**Dependencies (already done by the user):** `npm audit fix` in both apps. `npm audit --omit=dev` now reports 0
vulnerabilities in each (`body-parser` 2.4.0, `qs` 6.17.1, `vite` 8.3.8, `source-map-js` 1.2.2). The lockfile changes
are part of this fix.

The remaining advisories offered only through `--force` are **not taken**:

| Advisory | Where | Why not |
|---|---|---|
| `esbuild` (moderate) via `drizzle-kit` | backend dev | `--force` would *downgrade* drizzle-kit from 0.31 to 0.18, a breaking change, to swap an esbuild whose bug is in `esbuild --serve`, which drizzle-kit never runs. drizzle-kit is kept on purpose as the migration tool. |
| `minimatch` (moderate) via `nodemon` | backend dev | `--force` swaps in a different nodemon (3.1.11). The bug needs attacker-written glob patterns; nodemon only reads the globs in our own `nodemon.json`. |
| `minimatch` (moderate) via `@typescript-eslint` | frontend dev | Same bug, same reason: only our ESLint config supplies the patterns. Not shipped to users. |

None of these reach production (`--omit=dev` is clean). Revisit when drizzle-kit, nodemon or typescript-eslint release
versions that fix them.

**Code ([index.ts](../../backend/src/index.ts), [apiClient.js](../../frontend/src/lib/apiClient.js)):**

1. Remove `app.use(express.json())` and `app.use(express.urlencoded({ extended: true }))`. With no parser registered,
   no request body is read; a POST anywhere gets a plain 404.
2. `app.disable("x-powered-by")`.
3. One small middleware, registered first so cached API hits, the static files and `index.html` all get it. It sets:
   - `X-Frame-Options: DENY`: no site, not even this one, can show the app in a frame.
   - `Referrer-Policy: strict-origin-when-cross-origin`: links to other sites (club websites) pass on only the domain.
   No new dependency (no `helmet`): two headers don't need one.
4. CORS: drop `credentials: true` and keep `origin: ENV.FRONTEND_URL`. Production is same-origin and doesn't use CORS;
   the dev server (5173 → 3000) still gets `Access-Control-Allow-Origin`.
5. `apiClient.js`: drop `credentials: "include"`. The default (`same-origin`) sends no cookies cross-origin, and a
   credentialed request would now fail CORS in dev.

Must not break:

- every API answer body stays byte-for-byte the same (only headers change);
- the dev frontend on 5173 still loads data from the API on 3000;
- the production build still serves `/assets`, page addresses and `/api` from one server;
- `/api/health` and `/api/health/db` stay the same apart from the new headers;
- the response cache (`X-Cache` HIT/MISS) still works, and cached hits carry the new headers too.

## Build steps

- [x] **1. Harden the server and the API client.** Make the five code changes above in `index.ts` and `apiClient.js`.
      **Verified (local DB):** both builds and lint pass. The headers are on the MISS, the HIT, `/api/health` and
      `index.html`, with no `X-Powered-By` and no `Access-Control-Allow-Credentials`. `POST {bad` answers 404 at
      `/api/nothing` and at a real route. 8 API answers are byte-identical before and after. The smoke set passed
      (6/6, 13.5 s).
      **Done when:**
      - `cd backend && npm run build` and `cd frontend && npm run build` pass; `cd frontend && npm run lint` is clean.
      - Against the local dev backend:
        - `curl -sI /api/seasons/<season>/teams` shows `X-Frame-Options: DENY` and
          `Referrer-Policy: strict-origin-when-cross-origin`, and no `X-Powered-By`, on both the MISS and the HIT.
        - With `Origin: http://localhost:5173`, the response has `Access-Control-Allow-Origin: http://localhost:5173`
          and no `Access-Control-Allow-Credentials`.
        - `POST /api/nothing` with `Content-Type: application/json` and body `{bad` answers 404, not 400.
      - A scratch before/after comparison of a handful of API answers shows identical bodies.

## Verify

- The build, lint and curl checks above.
- Browser tests (local DB only; `/api/health` must report `"target":"local"`): the smoke set, `smoke.spec.js` and
  `urls-and-titles.spec.js`. These run the real dev frontend against the real dev API across origins (5173 → 3000), so
  they prove CORS still works without credentials. Every request goes through the same `get()`, so one working page
  shows that all of them work. The full suite is not needed for a one-line fetch option.
- After deploy, check the live site: `curl -sI https://www.jmpeuroleague.com/` shows the two new headers and no
  `x-powered-by`. A page loads normally.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6411,"specSha256":"c619be793cc34e11028ca1a5f17efdf8b83e353e545c13ebe736e49c459241ac","branch":"refs/heads/fix/harden-the-api-dependencies-headers-and-cors","head":"64c3d0ecb0c0f9b9531694747c696ed9811d80c7","baseRef":"refs/heads/master","baseCommit":"53885c2e991e2b0c8f8503912b92fd7720a00e99","sourceTree":"aa1a40962bac0f2163fbf1c8d2231421cd092511","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 64c3d0ecb0c0f9b9531694747c696ed9811d80c7
**Base commit:** 53885c2e991e2b0c8f8503912b92fd7720a00e99
**Base ref:** master
**Spec hash:** c619be793cc34e11028ca1a5f17efdf8b83e353e545c13ebe736e49c459241ac
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-11-15T19:16:44Z
**Workflow:** regular
**Check required:** no

## Handoff

Review the active spec and the complete `53885c2e991e2b0c8f8503912b92fd7720a00e99..64c3d0ecb0c0f9b9531694747c696ed9811d80c7` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-15T19:19:09Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD` / `git merge-base master HEAD` / `sha256sum blueprint/context/current-feature.md` / `git status --porcelain --untracked-files=all`: pass (HEAD, merge base and spec hash match the request; only `blueprint/context/review.md` differed)
- `cd backend && npx tsc --noEmit`: pass
- `cd frontend && npm run lint`: pass
- `cd frontend && npx vite build --outDir <scratchpad>`: pass (built outside the repo so no tracked or ignored project output was written)
- `curl` against the local dev backend (`/api/health` reported `"target":"local"`): pass
- `cd frontend && npx playwright test smoke.spec.js urls-and-titles.spec.js`: pass (6/6, 10.7 s)

## Evidence

- `backend/src/index.ts`: `express.json()` and `express.urlencoded()` removed, `x-powered-by` disabled, header middleware registered before CORS, `responseCache`, health routes and static serving; CORS is `cors({ origin: ENV.FRONTEND_URL })` with no credentials. No `req.body` use anywhere in `backend/src`.
- `frontend/src/lib/apiClient.js`: `credentials: "include"` removed; it is the only `fetch` call site in `frontend/src`.
- Local runtime: `X-Frame-Options: DENY` and `Referrer-Policy: strict-origin-when-cross-origin` present on `/api/health`, a CORS preflight, a season route on both `X-Cache: MISS` and `X-Cache: HIT`, and on 404s; no `X-Powered-By` and no `Access-Control-Allow-Credentials` anywhere; `POST {bad` answers 404 at `/api/nothing` and at a real route; `Access-Control-Allow-Origin: http://localhost:5173` still sent.
- Lockfiles: backend `body-parser` 2.3.0 -> 2.4.0, `qs` 6.16.0 -> 6.17.1; frontend `vite` 8.3.0 -> 8.3.8, `source-map-js` 1.2.1 -> 1.2.2; installed `node_modules` match. Every `resolved` URL in both lockfiles is `registry.npmjs.org`. New frontend entries are the optional `@rolldown/binding-wasm32-wasi` chain (`@emnapi/*`, `@napi-rs/wasm-runtime`, `@tybys/wasm-util`, all `optional: true`) and dev-only `minimatch` 11.0.8 with `@isaacs/nonrecursive-glob-match`; `package.json` files are unchanged.
- Note: the spec names the old frontend `vite` as 8.3.2, but the base lockfile pinned 8.3.0; both are below the fixed 8.3.8, so the outcome is unaffected.

## Findings

- F-01 [P3] open: no automated regression check for the new header, CORS and no-body-parser contract (non-blocking)

## Remaining risk

- No unit test command exists and Verify/CI is not configured, so there is no automated gate for this change beyond the opt-in browser smoke set.
- The production build served by `npm start` and the live site (`curl -sI https://www.jmpeuroleague.com/`) were not exercised; the live check is the spec's post-deploy step and external requests were out of scope.
- `npm audit` was not run (network-backed); dependency status relies on lockfile versions matching the advisories named in the spec. The dev-only `esbuild`, `minimatch` and `@typescript-eslint` advisories remain by documented decision.
- CORS preflight still advertises the `cors` package's default method list (GET,HEAD,PUT,PATCH,POST,DELETE); harmless today with GET-only routes and no credentials, pre-existing behavior.
