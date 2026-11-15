# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-01 [P3] open - No automated regression check for the new header, CORS and no-body-parser contract

**File:** backend/src/index.ts:12
**Found:** 2026-11-15 by /audit independent (scope: current; lens: tests)
**Why it matters:** The fix's guarantees (`X-Frame-Options: DENY` and `Referrer-Policy` on MISS and HIT, no `X-Powered-By`, no `Access-Control-Allow-Credentials`, `POST {bad` answering 404 rather than 400) were proven only by one-off manual curls. The middleware order is load-bearing: moving the header middleware below `responseCache`, or re-adding `express.json()` for a future route, would silently undo part of the hardening, and nothing in the repository would notice. The smoke specs prove cross-origin data loading still works, but assert none of the headers.
**Suggested fix:** Optional. Add one small API-level spec in `frontend/e2e/` following the existing `api-*.spec.js` pattern (`page.request` against `http://localhost:3000`): read one `/api/seasons/...` address twice and assert the two headers on both the MISS and the HIT, the absence of `x-powered-by` and `access-control-allow-credentials`, and that a `POST` with body `{bad` answers 404. Nothing is deleted; no current requirement is lost by leaving it out, since browser tests are opt-in evidence in this project.
**Resolution:**
