# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-01 [P2] open - Browser selectors no longer match the shipped navigation and scope controls

**File:** frontend/e2e/filter-controls.spec.js:14; frontend/e2e/smoke.spec.js:7
**Found:** 2026-09-22 by /audit independent (scope: current; lens: tests)
**Why it matters:** Both existing browser tests time out waiting for navigation tabs, while the rendered navigation exposes links. The filter test also expects a `Leaderboard type` select at line 17, but StatisticsPage uses a `Leaderboard scope` button group. These mismatches already exist at base commit `702f55b620bd39a61fb0d3c94f767164ef5ecf49`; this extraction did not introduce them. They prevent the available suite from exercising the migrated filter controls or the teams directory. `npm run test:browser` reproduced both navigation failures, and the Playwright page snapshot confirms the link roles.
**Suggested fix:** Update the navigation locators to the existing link roles and the leaderboard selector interaction to the current scope buttons, then rerun the two existing tests. Preserve the product's current controls.
**Resolution:** Open, pre-existing test maintenance issue; no product regression identified. Browser tests are optional evidence and Check was not required for this receipt.
