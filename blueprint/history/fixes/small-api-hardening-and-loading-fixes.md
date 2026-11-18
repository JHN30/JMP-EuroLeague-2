# Fix: Small API hardening and loading fixes

**Type:** Fix
**Status:** verified
**Branch:** fix/small-api-hardening-and-loading-fixes
**Fixes:** F-03, F-04, F-05, F-06, F-07, F-09

## The problem

Six small findings from the 2026-11-18 audit (`blueprint/context/findings.md`), all P3:

| ID | Where | Problem |
|---|---|---|
| F-03 | `backend/src/routes/seasons.ts` career routes | `/players/:personKey/career` starts 5 queries per season the player played, all at once: up to ~135 on a 10-connection pool. `/career/advanced` starts 2 per season. A cold request queues every other request behind it. |
| F-04 | `backend/src/response-cache.ts` | HEAD requests skip the cache and request sharing, so each runs its route against the database. |
| F-05 | `seasons.ts` advanced leaders route | `games in LEADER_GAME_SHARES` is true for `constructor` or `toString`, so `?games=constructor` answers 200 with no players instead of 400. |
| F-06 | `backend/src/db/season-identities.ts` player search | The search text goes into an ILIKE pattern unescaped, so `_` and `%` act as wildcards (`_` matches every player). |
| F-07 | `frontend/src/players/leagueLeaderboard.js` | Ranking one player loads the whole league list in two rounds: page 1 first, then up to 4 more pages of 100. |
| F-09 | `/season-stats/leaders` | `stats=a,b` and `stats=b,a` are the same answer but two cache entries, and each miss runs up to 10 queries. |

## The fix

- **F-03:** Run the career routes' per-season queries for at most 2 seasons at a time, so at most 10 queries (the per-season
  ones) are in flight. Use a plain loop over chunks of the season list; no new dependency. Keep the answer identical,
  including season order and which seasons are dropped.
  A database statement timeout, also suggested by the finding, is not part of this fix: whether Neon's pooled connection
  accepts it can't be checked against the local database. It can follow once the live connection type is confirmed.
- **F-04:** Treat HEAD like GET in `responseCache`. Express already runs GET handlers for HEAD and sends no body, so a HEAD
  request is answered from the cache, or shares a pending answer, like a GET.
- **F-05:** `Object.hasOwn(LEADER_GAME_SHARES, games)`.
- **F-06:** Escape `\`, `%` and `_` in the search text before building the ILIKE pattern. PostgreSQL's default LIKE
  escape character is the backslash.
- **F-07:** Allow `limit` up to 500 on `/season-stats` only. It stays at 100 everywhere else: `requestedPage` gets an
  optional maximum. `fetchLeagueLeaderboard` then makes one request with `limit=500`. That is the same 500-player cap it
  has today, and the same rows in the same order. Its query key and its callers are unchanged.
- **F-09:** The frontend sends the stats list sorted (`getSeasonStatLeaders` in `lib/api.js`). The route answers 400 when
  the list is not in sorted order. The answer is keyed by stat name, so order never mattered to its readers.

Must not break:

- Every page that reads these routes: player Career tab, Leaders pages, Compare, player Overview ranks, Players search.
- The F-01 rules: each route's `allowQuery`, the canonical cache key, and the 100 MB cap.

## Build steps

- [x] 1. Validation (F-05, F-06, F-09): `Object.hasOwn`, escaped search, sorted stats on both sides. Add to
   `frontend/e2e/api-response-cache.spec.js`:
   - `?games=constructor` → 400;
   - a search for `_` finds no player, while a real name still does;
   - an unsorted `stats` list → 400, and the sorted one → 200.

   **Done when:** the backend builds and those tests pass.
- [x] 2. Load (F-03, F-04, F-07): the 2-seasons-at-a-time loop in both career routes, HEAD in the cache, and the
   `/season-stats` limit of 500 with the single leaderboard request. Add tests:
   - a second HEAD to the same address gets `X-Cache: HIT`;
   - `/season-stats?limit=500` → 200 and `limit=501` → 400.

   Check with scratch scripts, not committed, that the answers are byte-identical to `master`'s for:
   - `/career` and `/career/advanced` of a player with a long career;
   - the leaderboard rows, single request vs. the old paging.

   **Done when:** those checks match, the tests pass, and a player page makes one leaderboard request.
- [x] 3. (Review repair: F-11.) `e2e/progressive-disclosure.spec.js` still expected the old 100-row league request
   (lines 169 and 173). Expect `{ offset: 0, limit: 500 }`. This batch changed the API client (`lib/api.js`) and the
   league list it feeds, so run the full browser suite (AGENTS.md: a change to the API client reaches many pages).
   **Done when:** the full suite shows no failure caused by this work.

## Verify

- `cd backend && npm run build`, `cd frontend && npm run lint`.
- With `/api/health` reporting `"target":"local"`, run the specs for the pages these routes feed:
  `npx playwright test api-response-cache.spec.js leaders.spec.js player-career-layout.spec.js compare.spec.js compare-player-layout.spec.js players-layout.spec.js`.
  Add `responsive.spec.js` only if a layout changes (none expected).
- Manually: a player page's Overview ranks and Season by season tab look as before. Players search for `_` shows no
  results.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5184,"specSha256":"00bc2595f41f910f42f5f567cdadc04e6af579763aa1de9ebceb955feab64af9","branch":"refs/heads/fix/small-api-hardening-and-loading-fixes","head":"745105a13763b294fdb657df828d27d6da5d5eb1","baseRef":"refs/heads/master","baseCommit":"e5b687c5d3272ecf03e70aef8873aac9c879393a","sourceTree":"577eb8954da289611dea0cc959f751553d331717","absentOptional":[]} -->

## Findings

### small-api-hardening-and-loading-fixes/F-04 [P3] closed - HEAD requests skip the response cache and request sharing

**File:** backend/src/response-cache.ts:78
**Found:** 2026-11-18 by /audit (scope: full; lens: performance)
**Why it matters:** Express runs GET handlers for HEAD, but the cache only handles GET, so every HEAD runs the full route against the database.
**Suggested fix:** Treat HEAD like GET in `responseCache`.
**Resolution:** Repaired on fix/small-api-hardening-and-loading-fixes: `responseCache` treats HEAD like GET; a second HEAD gets X-Cache HIT (api-response-cache.spec.js). Awaiting review.
2026-11-18 independent review of e5b687c..740edfa: closed. response-cache.ts:129 lets HEAD through the cache; the patched `res.json` stores the full JSON a HEAD route builds, and Express/Node send no body to HEAD. Probed locally: HEAD MISS then GET HIT with the full body (same Content-Length); a GET waiting on a pending HEAD and a HEAD waiting on a pending GET both answered 200 with matching Content-Length.

### small-api-hardening-and-loading-fixes/F-05 [P3] closed - The leaders `games` filter accepts inherited property names

**File:** backend/src/routes/seasons.ts:525
**Found:** 2026-11-18 by /audit (scope: full; lens: security)
**Why it matters:** `games in LEADER_GAME_SHARES` is true for `constructor` or `toString`, so `?games=constructor` returns a 200 with no players instead of a 400. Harmless, but wrong.
**Suggested fix:** `Object.hasOwn(LEADER_GAME_SHARES, games)`.
**Resolution:** Repaired on fix/small-api-hardening-and-loading-fixes: `Object.hasOwn(LEADER_GAME_SHARES, games)`; constructor, toString and __proto__ get 400. Awaiting review.
2026-11-18 independent review of e5b687c..740edfa: closed. seasons.ts:522 uses `Object.hasOwn`; the backend builds and the new spec passes for all three names and `games=50`.

### small-api-hardening-and-loading-fixes/F-06 [P3] closed - Player search does not escape `%` and `_`

**File:** backend/src/db/season-identities.ts:272
**Found:** 2026-11-18 by /audit (scope: full; lens: security)
**Why it matters:** The search text goes into an ILIKE pattern unescaped, so `_` or `%` match any character. Values are still bound parameters, so this is not injection.
**Suggested fix:** Escape `\`, `%` and `_` before building the pattern.
**Resolution:** Repaired on fix/small-api-hardening-and-loading-fixes: backslash, `%` and `_` are escaped before the ILIKE pattern; searches for `_` and `%` find no player. Awaiting review.
2026-11-18 independent review of e5b687c..740edfa: closed. season-identities.ts:274 escapes `\`, `%` and `_` with a backslash, PostgreSQL's default LIKE escape; drizzle binds the pattern as a parameter, so standard_conforming_strings does not apply. Probed `_`, `%`, `\`, `a\`, `\_`, `\\`, `Mi_` and a non-ASCII value: all 200, no wildcard matches; a real name still matches. A NUL byte still fails, but that predates this repair (F-12).

### small-api-hardening-and-loading-fixes/F-07 [P3] closed - A player page waits for the first leaderboard page before fetching the rest

**File:** frontend/src/players/leagueLeaderboard.js:14
**Found:** 2026-11-18 by /audit (scope: full; lens: performance)
**Why it matters:** Ranking one player downloads up to 500 players in two sequential round trips. The query is shared with the Leaders page, so it is often cached already.
**Suggested fix:** Leave as is unless the player page feels slow; a per-player ranks endpoint would remove it.
**Resolution:** Repaired on fix/small-api-hardening-and-loading-fixes: /season-stats takes limit up to 500 (other lists stay at 100) and the league list is one request; rows byte-identical to the old paging (E2025 RS both modes, E2010 RS). Awaiting review.
2026-11-18 independent review of e5b687c..740edfa: the code is right, but it stays `fixed`. Single request vs the old paging was re-checked locally and matched for E2025 RS perGame and accumulated, E2015 PO and E2008 RS. All six callers keep the same query key and fetch. The repair left frontend/e2e/progressive-disclosure.spec.js:169 and :173 asserting `limit: 100`, so that spec now fails (F-11). Close this once F-11 is closed.
2026-11-18 independent review of e5b687c..745105a: closed. leagueLeaderboard.js:14 makes one `limit=500, offset=0` request; seasons.ts:611 allows 500 on /season-stats only (`requestedPage` default stays 100; `/players?limit=101` still 400). No caller or test still relies on the old 100-row paging. Probed locally: E2025 `phase=all` accumulated answers 335 rows, `hasMore: false`, about 718 KB uncompressed, about the same total as the old four pages. F-11 is closed in this pass.

### small-api-hardening-and-loading-fixes/F-09 [P3] closed - The season leaders' `stats` list is part of the cache key in any order

**File:** backend/src/routes/seasons.ts:642
**Found:** 2026-11-18 by /audit independent (scope: current; lens: performance)
**Why it matters:** `/season-stats/leaders?stats=a,b` and `stats=b,a` give the same leaders but are separate cache entries, and each runs one `getSeasonStats` query per stat (not memoised). With about 40 sortable fields and up to 10 per list, the orderings are effectively unlimited, so a caller can keep this route missing both caches (reproduced locally: both orders answer 200 `X-Cache: MISS`). Each answer is small and the cache is now capped at 100 MB, so the cost is database queries (up to 10 per request), not memory or large egress. Residual of F-01's "reordered `stats=` lists".
**Suggested fix:** Either refuse a `stats` list that is not in a fixed order (sorted, or the order of `SORTABLE_STATS_FIELDS`) with a 400 and have `getSeasonLeaders` in frontend/src/lib/api.js send it sorted, or sort the names when building the key in `responseCache`. Current requirement lost: None.
**Resolution:** Repaired on fix/small-api-hardening-and-loading-fixes: the frontend sends the stats list sorted and deduplicated, and the route answers 400 for an unsorted or repeated list. Awaiting review.
2026-11-18 independent review of e5b687c..740edfa: closed. lib/api.js:152 sends `[...new Set(stats)].sort()`, and seasons.ts:649 refuses any list that is not strictly increasing under JS `>=`. Both use UTF-16 code-unit order, so every list the frontend sends passes. The only caller (SeasonOverviewPage) reads the answer by stat key. The spec covers sorted 200 and unsorted or repeated 400.

### small-api-hardening-and-loading-fixes/F-11 [P2] closed - The progressive-disclosure browser spec still expects the old 100-player league page

**File:** frontend/e2e/progressive-disclosure.spec.js:169, :173
**Found:** 2026-11-18 by /audit independent (scope: current; lens: tests)
**Why it matters:** F-07's repair makes `fetchLeagueLeaderboard` request `limit=500`. This spec mocks the API and asserts the Leaders page makes exactly `[{ offset: 0, limit: 100 }]`, so it now fails. Reproduced: `npx playwright test progressive-disclosure.spec.js` gives Expected limit 100, Received 500. The spec was not in this fix's Verify list, so the failure was missed. The product behaviour is right, but the suite has a new red test.
**Suggested fix:** Change both expectations to `{ offset: 0, limit: 500 }`, or import the limit from leagueLeaderboard.js. Then rerun the spec. Current requirement lost: None.
**Resolution:** Repaired (step 3): both assertions expect `{ offset: 0, limit: 500 }`; the full browser suite passed 1236 of 1238, the two failures unrelated (game-detail header timing under load, passes alone; postseason-layout:133 fails on master too). Awaiting review.
2026-11-18 independent review of e5b687c..745105a: closed. progressive-disclosure.spec.js:169 and :173 expect `{ offset: 0, limit: 500 }`, which matches the mock (it still serves the requested offset/limit) and leagueLeaderboard.js. The spec passes. A search of frontend/e2e found no other test that assumes the old 100-row league paging or an unsorted `stats` list, or that expects a 400 for `/season-stats` above 100. The records-api, leaders and cancelled/excluded-season specs still use `limit=100`, and that remains valid.

## Independent review

**Status:** passed
**Target commit:** 745105a13763b294fdb657df828d27d6da5d5eb1
**Base commit:** e5b687c5d3272ecf03e70aef8873aac9c879393a
**Base ref:** refs/heads/master
**Spec hash:** 00bc2595f41f910f42f5f567cdadc04e6af579763aa1de9ebceb955feab64af9
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-11-18T20:18:15Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-18T20:21:06Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `e5b687c5d3272ecf03e70aef8873aac9c879393a..745105a13763b294fdb657df828d27d6da5d5eb1` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `git rev-parse HEAD` / `git merge-base master HEAD` / `git status --porcelain` / `sha256sum current-feature.md`: pass (HEAD = target, merge base = base, only review.md and findings.md differ, spec hash matches)
- `cd backend && npm run build`: pass
- `cd frontend && npm run lint`: pass
- `curl localhost:3000/api/health`: pass (`"target":"local"`)
- `cd frontend && npx playwright test api-response-cache.spec.js progressive-disclosure.spec.js leaders.spec.js player-career-layout.spec.js overview-sections.spec.js players-layout.spec.js`: pass (45/45)
- Read-only curl probes of `/season-stats` limits and player search: pass (results under Evidence)

### Evidence

- Delta reviewed: season-identities.ts (escaped ILIKE), response-cache.ts (HEAD), seasons.ts (`requestedPage` max, `Object.hasOwn`, sorted `stats`, `forEachSeasonInTurn`), lib/api.js, leagueLeaderboard.js, api-response-cache.spec.js, progressive-disclosure.spec.js.
- `/season-stats?limit=500` 200 (E2025 `all`/accumulated: 335 rows, `hasMore: false`, about 718 KB uncompressed); `limit=0` 400; `offset=10000&limit=500` 200 empty; `/players?limit=101` 400 (spec).
- No `/season-stats` caller or e2e mock depends on 100-row paging. Every `getSeasonLeaders` call goes through the sorted and deduplicated client, and its only caller (SeasonOverviewPage) reads the answer by key.
- No stale `LEADERBOARD_PAGE_LIMIT`/`MAX_PAGES` references remain in frontend/src.

### Findings

- F-07 [P3] closed: one league-list request, re-reviewed.
- F-11 [P2] closed: the progressive-disclosure spec expects limit 500 and passes.
- F-03 [P3] still open, does not block: the pool still has no `statement_timeout`.
- F-12 [P3] still open, does not block: unchanged (NUL search still 503).
- F-10 [P3] still unverified: outside this delta.
- No new findings.

### Remaining risk

- compare.spec.js and compare-player-layout.spec.js (in the spec's Verify list) were not rerun in this review. The builder reports a full-suite run with 2 unrelated failures.
- Production Neon behaviour of a 500-row answer (about 718 KB before Cloudflare compression) was not measured.
- F-03 timeout and F-12 remain open P3 items.
