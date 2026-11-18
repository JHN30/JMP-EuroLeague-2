# Fix: Player search refuses control characters

**Type:** Fix
**Status:** verified
**Branch:** fix/player-search-refuses-control-characters
**Fixes:** F-12

## The problem

`/api/seasons/:season/players?search=ab%00c` answers 503 `DATABASE_UNAVAILABLE` (reproduced locally). PostgreSQL rejects
a NUL character in a text parameter. The query fails, and the router's error handler reports the failure as an outage.
That is a client error shown as a server one, and each such request can add a server error log.

`requestedSearch` (`backend/src/routes/seasons.ts:115`) checks only the type and the length (1–100 after trimming).
Other control characters, such as `%01`, are accepted and simply match no player.

The search is the API's only free-text parameter. Every other parameter is a number, an allow-listed value, or a code
checked by a pattern, so none of them can carry a NUL.

## The fix

In `requestedSearch`, answer 400 `INVALID_QUERY` ("Invalid search query") when the text contains a control character:
U+0000–U+001F or U+007F. The check runs after trimming, so leading or trailing whitespace is still trimmed as now. No
player name contains a control character, so no real search changes.

Must not break:
- Ordinary searches, including names with accents, spaces, hyphens and apostrophes.
- The F-06 escaping of `\`, `%` and `_`.
- An empty or whitespace-only search, which still means "no filter".

## Build steps

- [x] 1. Add the control-character check to `requestedSearch`. Add a test to `frontend/e2e/api-response-cache.spec.js`,
   next to the search test. It checks that:
   - `search=ab%00c`, `ab%01c` and `ab%7Fc` get 400 `INVALID_QUERY`;
   - an accented name such as `Dončić` and a spaced name still get 200.

   **Done when:** the backend builds, that spec passes, and the curl above answers 400.

## Verify

- `cd backend && npm run build`.
- With `/api/health` reporting `"target":"local"`: `npx playwright test api-response-cache.spec.js players-layout.spec.js`.
- `curl -i "localhost:3000/api/seasons/E2025/players?search=ab%00c"` → 400.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2076,"specSha256":"25b03332c8ba163604aafb28bb2d6ab7b09cdb7b4fe2dec1a4396374dbca4f39","branch":"refs/heads/fix/player-search-refuses-control-characters","head":"ed32a35db0f6b3537bb180f1f44426db7bc0fa18","baseRef":"refs/heads/master","baseCommit":"2b977a38d11f2877bdb84f8f773a89ba60b024a7","sourceTree":"09af5d11d11094a8df5017e71583aed15014fbc8","absentOptional":[]} -->

## Findings

### player-search-refuses-control-characters/F-12 [P3] closed - A NUL byte in the player search answers 503 "Database unavailable"

**File:** backend/src/routes/seasons.ts:114 (`requestedSearch`)
**Found:** 2026-11-18 by /audit independent (scope: current; lens: security)
**Why it matters:** PostgreSQL rejects a `\0` in a text parameter, so `/players?search=ab%00c` reaches the database, fails, and gets 503 `DATABASE_UNAVAILABLE`. That should be a 400. The search reports a client error as an outage and can add server error logs or alerts. This predates the F-06 repair, which does not touch it. It is not injection: the value is still a bound parameter.
**Suggested fix:** In `requestedSearch`, answer 400 `INVALID_QUERY` when the text contains a control character, for example `/[\u0000-\u001f]/`. Current requirement lost: None.
**Resolution:** Repaired on fix/player-search-refuses-control-characters: `requestedSearch` answers 400 `INVALID_QUERY` for U+0000-U+001F and U+007F after trimming; `search=ab%00c` now gets 400 instead of 503, accented and spaced searches still 200 (api-response-cache.spec.js). Awaiting review.
2026-11-18 independent review of 2b977a3..ed32a35: closed. seasons.ts:122-128 rejects U+0000-U+001F and U+007F after `trim()`; local probes give 400 `INVALID_QUERY` for `ab%00c`, `%00ab`, `ab%01c`, `ab%7Fc` and `a%09b`, while edge whitespace (`ab%09`, `%09ab`, `ab%0A`) is still trimmed and searches. Same code and message as the other search errors. Every other query or path parameter in seasons.ts is a pattern-checked identity, a pagination integer or an allow-listed value, so none reaches the database as free text. No new defect found.

## Independent review

**Status:** passed
**Target commit:** ed32a35db0f6b3537bb180f1f44426db7bc0fa18
**Base commit:** 2b977a38d11f2877bdb84f8f773a89ba60b024a7
**Base ref:** refs/heads/master
**Spec hash:** 25b03332c8ba163604aafb28bb2d6ab7b09cdb7b4fe2dec1a4396374dbca4f39
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-11-18T21:26:32Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-18T21:28:13Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `2b977a38d11f2877bdb84f8f773a89ba60b024a7..ed32a35db0f6b3537bb180f1f44426db7bc0fa18` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `cd backend && npm run build`: pass
- `cd frontend && npm run lint`: pass
- `curl -s localhost:3000/api/health`: pass (`"target":"local"`)
- `cd frontend && npx playwright test api-response-cache.spec.js players-layout.spec.js`: pass (19 passed)
- `curl` probes of `/api/seasons/E2025/players?search=...` (14 edge values): pass

### Evidence

- Delta 2b977a3..ed32a35: backend/src/routes/seasons.ts (control-character check in `requestedSearch`), frontend/e2e/api-response-cache.spec.js (new test), blueprint/context/current-feature.md (spec).
- `search=ab%00c`, `%00ab`, `ab%01c`, `ab%7Fc`, `a%09b` answer 400 `INVALID_QUERY` "Invalid search query", the same code and message as the type and length errors.
- Edge whitespace is trimmed before the check: `ab%09`, `%09ab`, `ab%0A` and `%20%20` still answer 200; C1 controls (`%C2%85`), invalid UTF-8 (`%FF`, `%ED%A0%80`) answer 200 with no database error.
- Every other query and path parameter in seasons.ts is a `validIdentity` pattern, a pagination integer or an allow-listed value, so the search is the only free text that reaches the database.
- Regex runs once per request on at most 100 characters; no performance impact.

### Findings

- F-12 closed (re-reviewed; original defect gone, no new defect).
- No new findings.

### Remaining risk

- A tab pasted inside a name in the Players search box (single-line inputs keep tabs, strip only line breaks) now shows the page's error state instead of "no match"; not observed in a browser.
- The new test's "Abalde, Alberto" exactly-one assertion depends on the local E2025 data.
- F-03 (open, P3) and F-10 (unverified, P3) are outside this delta and were not re-examined.
