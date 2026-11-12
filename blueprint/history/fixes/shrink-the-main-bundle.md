# Fix: Shrink the main bundle

**Type:** Fix
**Status:** verified
**Branch:** fix/shrink-the-main-bundle

## The problem

The script every page loads first, `frontend/dist/assets/index-*.js`, is about
581 KB (170 KB gzipped). Two libraries in it are larger than their use needs:

| Library | Share of the main bundle | How it is used |
| --- | --- | --- |
| `motion` (animations) | about 20% | Imported as `motion` in 73 files, which bundles every animation feature up front |
| `axios` | about 7% | Only plain GET requests through `frontend/src/lib/axios.js` and `frontend/src/lib/api.js` |

## The fix

Nothing a visitor sees may change: same requests, same error and retry
behavior, same animations, same reduced-motion behavior.

### Replace axios with a small fetch wrapper

- Replace `frontend/src/lib/axios.js` with a module of the project's own that
  exposes the same `get(path, { params })` call returning `{ data }`, so the
  functions in `api.js` keep their bodies.
- Keep its behavior: the same base address rule (`VITE_API_URL`, else `/api`
  in production, else `http://localhost:3000/api`), cookies sent, `params`
  entries that are `undefined` or `null` left out, JSON answers parsed.
- A reply outside 200 to 299 must throw an error that carries
  `response.status` and `response.data`, because pages read
  `error.response?.status` (a 404 means "not in this season") and one place
  reads `error.response.data`. A network failure throws without `response`.
- Remove `axios` from `frontend/package.json` and its lock file with npm.

### Load the animation features separately

- Wrap the app in `LazyMotion` with `strict`, loading the features with a
  dynamic import so they leave the main bundle. Use the `domMax` set: the app
  uses layout animations (`layout="position"` in the standings tables and the
  shooting breakdown, `layoutId` on the Games round indicator).
- Change every `motion.<tag>` to `m.<tag>` and every `motion.create(...)` to
  `m.create(...)`. `AnimatePresence`, `MotionConfig` and `useReducedMotion`
  stay as they are, and `MotionConfig reducedMotion="user"` keeps wrapping the
  app.
- This is a mechanical rename across about 73 files. Do not restyle, retime or
  reorder anything while doing it.

Out of scope: the page skeletons stay in the main bundle. They are the loading
placeholders shown while a page's own script downloads, so they must already
be there, and they import nothing heavy.

## Build steps

1. **Fetch wrapper.** Replace the axios module, keep `api.js` call sites
   working, remove the dependency. Done when: no file imports `axios`, the
   build and lint pass, and a 404 and a network failure still reach pages in
   the shape they read.
2. **Lazy animation features.** Add `LazyMotion`, rename `motion` to `m`.
   Done when: no component imports `motion` from `motion/react`, the build and
   lint pass with no `strict` errors in the browser console, and the main
   bundle's gzipped size is reported before and after.

## Verify

- `cd frontend && npm run build` and `cd frontend && npm run lint` pass.
- Report the gzipped size of `index-*.js` before and after each step, and the
  size of the new animation-features chunk.
- This change reaches every page (the API client and shared animation), so run
  the full browser suite, `cd frontend && npm run test:browser`, on the local
  database. For any failure, check whether the same test fails on `master`
  before attributing it to this change.
- Open at least the Home, Standings (table and Race), Games, a game, a player
  and Records pages in a real browser run and confirm there are no console
  errors and that entrance, hover, layout and reduced-motion animations still
  run.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3781,"specSha256":"297a39b423a168ed60332049a9cfad80f1ae88b457ed9235029abf20257dc275","branch":"refs/heads/fix/shrink-the-main-bundle","head":"11823a3828af63db577713f40cc27378db25f260","baseRef":"refs/heads/master","baseCommit":"d30240f02cb61fc8c258109eb86cf31ad34ba140","sourceTree":"eded148c657b0f31c909d1552ba58240dc26defc","absentOptional":[]} -->

## Findings

### shrink-the-main-bundle/F-01 [P2] closed - A failed animation-features download leaves page content invisible with no recovery

**File:** frontend/src/main.jsx:19
**Found:** 2026-11-12 by /audit (scope: current; lens: quality, performance)
**Why it matters:** The animation features now arrive in a separate request (`motionFeatures-*.js`). `loadMotionFeatures` has no retry or failure handling, and `LazyMotion` does not catch a rejected load, so when that one request fails every `m` element stays in its `initial` state for the rest of the visit. Most entrance animations start at `opacity: 0`, so the content is in the page but cannot be seen, and nothing tells the visitor or offers a retry. Reproduced on the dev server against the local database: with `motionFeatures.js` blocked, all 23 rows of `/2025/standings` rendered at opacity 0 (0 hidden with the request allowed) and the only signal was an unhandled "Failed to fetch dynamically imported module" rejection. Before this change the features shipped inside the main bundle, so this failure did not exist; a failed page chunk, by comparison, is caught by `RouteErrorBoundary` and offers a reload. The spec requires that nothing a visitor sees changes.
**Suggested fix:** Handle the rejection in `loadMotionFeatures`: retry the import once, and if it still fails recover visibly, for example reload once or fall back so content is not left at its hidden start state. Keep it to that one function; no new dependency is needed.
**Resolution:** The features now load through `frontend/src/lib/LazyMotionFeatures.jsx`, which `main.jsx` wraps around the app (LazyMotion still `strict`, still a dynamic import, app still renders at once). A failed load is caught and LazyMotion is handed a pending promise instead of a rejection. Chromium keeps a failed module address as failed for the life of the page (a second import() made no request), so the first failure reloads the page once after 1 s, marked in sessionStorage; a failure after that replaces the page with the full-screen `AsyncState` error ("Could not finish loading the page. Check your connection and try again.") whose Retry reloads. A successful load clears the mark. Covered by a new test in `frontend/e2e/smoke.spec.js` (blocked: error and Retry, no rows and nothing at opacity 0; unblocked plus Retry: 23 rows at opacity 1). Re-reviewed 2026-11-13 by the independent review of `11823a3` and closed: `frontend/src/lib/LazyMotionFeatures.jsx` and `frontend/src/main.jsx` were in the reviewed set. The rejection is caught, the first failure reloads once, a second shows the full-screen error with Retry, and success clears the mark, so there is no reload loop (storage that throws goes straight to the error). `AsyncState` uses no `m` component, so the error itself cannot be left hidden. The new smoke test passed, and a probe of nine pages plus a game and a player found no console errors and nothing left at opacity 0. No new defect found in the repair.

### shrink-the-main-bundle/F-02 [P3] closed - Nothing automated stops a `motion` component from being added back

**File:** frontend/eslint.config.js:1
**Found:** 2026-11-12 by /audit (scope: current; lens: tests, quality)
**Why it matters:** Under `LazyMotion strict` a `motion.<tag>` component throws when it renders, which replaces the whole page with the route error message. The rule is written in `blueprint/context/coding-standards.md`, but lint and the build both pass with a `motion` import, so the mistake would only show at runtime on the page that uses it. All 73 files are correct today; this is about the next edit.
**Suggested fix:** Add ESLint's built-in `no-restricted-imports` to `frontend/eslint.config.js` for the name `motion` from `motion/react`, with a message pointing to `m`. No new package is needed and no current requirement is lost.
**Resolution:** `frontend/eslint.config.js` now sets `no-restricted-imports` for the name `motion` from `motion/react`, with a message pointing to `m`. A temporary file importing `motion` failed lint with that message; the same file importing only `m`, `AnimatePresence`, `MotionConfig`, `LazyMotion`, `useReducedMotion` and `domMax` passed. The file was then removed. Re-reviewed 2026-11-13 by the independent review of `11823a3` and closed: `frontend/eslint.config.js` was in the reviewed set, the rule sits in the block that covers every `.js` and `.jsx` file, `npm run lint` passes, and no file under `frontend/src` imports `motion` or uses `motion.<tag>`. No new defect found in the repair.

## Independent review

**Status:** passed
**Target commit:** 11823a3828af63db577713f40cc27378db25f260
**Base commit:** d30240f02cb61fc8c258109eb86cf31ad34ba140
**Base ref:** master
**Spec hash:** 297a39b423a168ed60332049a9cfad80f1ae88b457ed9235029abf20257dc275
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-fable-5-2
**Requested execution:** automatic
**Requested at:** 2026-11-12T21:00:15Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-fable-5-2
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-12T23:13:57Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `d30240f02cb61fc8c258109eb86cf31ad34ba140..11823a3828af63db577713f40cc27378db25f260` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `git rev-parse HEAD`, `git merge-base master HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --porcelain --untracked-files=all`: pass (HEAD is the target, merge base is the base commit, spec hash matches, only `review.md` and `findings.md` differ; rechecked after the builds and tests)
- `cd frontend && npm run lint`: pass
- `cd frontend && npm run build`: pass (`index-*.js` 408.38 kB, 114.81 kB gzip; `motionFeatures-*.js` 85.85 kB, 28.28 kB gzip)
- `cd backend && npm run build`: pass
- `cd frontend && npx playwright test smoke.spec.js standings-table-layout.spec.js standings-race-layout.spec.js games-layout.spec.js excluded-season.spec.js compare.spec.js players-layout.spec.js` (local database, existing dev servers; `games-layout.spec.js` also matched `team-shooting-games-layout.spec.js`): 66 passed, 3 failed on timeouts under parallel load
- Rerun of those 3 alone with one worker: 2 passed, 1 timed out at `page.goto`; that one then run alone three times (`team-shooting-games-layout.spec.js:172 --repeat-each=3`): 3 passed
- One-off read-only browser probe (script in the session scratchpad): pass

## Evidence

- All 73 renamed component files equal their base version with `motion` replaced by `m` once whitespace is removed; no restyle, retime or reorder. Two files flagged by the script were comment-only false matches, read by hand.
- No file under `frontend/src` or `frontend/e2e` imports `axios` or `motion`, or uses `motion.<tag>`. The lock file diff only removes axios and its dependencies.
- `apiClient.js` read against every call in `api.js` and every reader of `error.response` (four 404 checks and `teamCompare.js:74` reading `response.data.error.code`): same base address rule, cookies sent, `undefined` and `null` params dropped, same query encoding (probe saw `search=de+c`), non-2xx throws with `response.status` and `response.data`, network failure throws without `response`. Only scalar params are passed, so axios's array form is not needed.
- `LazyMotionFeatures.jsx` read line by line: one quiet reload on first failure, error with Retry on the second, mark cleared on success, no reload loop, storage errors handled. `AsyncState` has no `m` component. The new smoke test for this path passed.
- Probe of Home, Standings (table and Race), Games, a game, Players, a player, Records, Teams, Leaders and Compare: no console or page errors, no `strict` errors, no in-view element left at opacity 0. With reduced motion requested, Standings rendered 23 rows at opacity 1.
- The team page `page.goto` took 0.3 to 0.6 s alone, so the timeouts seen were load on the shared dev server, in tests whose spec files this delta does not touch.

## Findings

- None new. F-01 and F-02 re-examined and closed.

## Remaining risk

- The full browser suite (`cd frontend && npm run test:browser`) was not run by the reviewer; only the seven named spec files (eight matched). The spec asks the builder for the full suite.
- Three tests timed out in the parallel run (`standings-race-layout.spec.js:235`, `team-shooting-games-layout.spec.js:172` and `:392`) and passed when run alone. They were not compared against `master`, because the reviewer may not switch branches or start servers, so an intermittent slowdown from this change is not fully ruled out.
- Browser evidence is from the Vite dev server. The production build was compiled but not served, so the failed-chunk recovery was not exercised against hashed production chunks.
- No unit test command exists; `apiClient.js` error shapes are covered only by code reading and the browser specs that hit 404 pages.
- A visitor whose network always blocks the animation chunk now gets the error screen instead of the site. This is the accepted repair for F-01, noted for awareness.
- Adapter, model and fresh context are declared metadata, not proof.
