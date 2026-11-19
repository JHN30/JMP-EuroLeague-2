# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-02 [P3] open - The readable-addresses redirect checks wait only the default 5 s and failed once on a cold run

**File:** frontend/e2e/readable-addresses.spec.js:25
**Found:** 2026-11-19 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** Each `toHaveURL` at lines 13 and 25 waits only the default 5 s for the canonical redirect. That redirect needs the page chunk and the entity's API answer first. In this review's first targeted run (4 specs, 4 workers, cold), `/2025/players/someone-else-003733` had not moved within 5000 ms and the test failed. It then passed 3 of 3 times with `--repeat-each=3`. A flaky new spec weakens the full-suite gate the spec relies on.
**Suggested fix:** Pass `{ timeout: 30_000 }` to these redirect waits, as other cold-load waits already do (for example detail-back-links.spec.js:42).
**Resolution:**

### F-03 [P3] open - Box-score and game-overview fixtures keep hyphenated person keys, so the asserted player links don't lead back to the fixture player

**File:** frontend/e2e/game-box-score.spec.js:58
**Found:** 2026-11-19 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** The fixture keys `A-STARTER`, `A-DNP` and `A-LONG` contain a hyphen, which real keys never do (`[A-Z0-9]+`). So the expected links `/players/sam-starter-a-starter` (game-box-score.spec.js:58, game-overview.spec.js:160), `/players/sid-sitter-a-dnp` (game-box-score.spec.js:59) and `...-a-long` (game-box-score-layout.spec.js:116) read back as `STARTER`, `DNP` and `LONG`. Opening any of them would show "Player not found". The assertions pass but lock in links that are broken for these fixtures. progressive-disclosure.spec.js was already moved to the hyphen-free `PLAYER1` for this reason.
**Suggested fix:** Rename these fixture keys to hyphen-free forms (for example `ASTARTER`, `ADNP`, `ALONG`) and update the expected hrefs. Keep game-shooting specs that use the key consistent. No product change; no current requirement lost.
**Resolution:**
