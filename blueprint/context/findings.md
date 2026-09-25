# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-02 [P3] open - Leaderboard scope still selected by CSS class in the progressive-disclosure test

**File:** frontend/e2e/progressive-disclosure.spec.js:166
**Found:** 2026-09-25 by /audit (scope: current; lens: tests)
**Why it matters:** The test clicks the Players scope with `page.locator(".scope-toggle button", { hasText: "Players" })`, which depends on a styling class. `filter-controls.spec.js` now reaches the same control through its accessible `Leaderboard scope` group. A class rename would break this test the same way F-01's role changes broke the others, and the two specs now select one control in two different ways.
**Suggested fix:** Use `page.getByRole("group", { name: "Leaderboard scope" }).getByRole("button", { name: "Players", exact: true })`, matching `filter-controls.spec.js`. No product change, and no current requirement is lost.
**Resolution:**
