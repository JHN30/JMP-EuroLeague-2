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

### F-03 [P3] open - Tab panels on other pages still scroll the page on tab switch

**File:** frontend/src/comparisons/ComparisonsPage.jsx:881, frontend/src/players/PlayerPage.jsx:639 and :665, frontend/src/players/PlayerAdvancedSection.jsx:275, frontend/src/statistics/StatisticsPage.jsx:340, frontend/src/statistics/AdvancedLeaderboard.jsx:157, frontend/src/teams/TeamPage.jsx:897, frontend/src/teams/TeamAdvancedSection.jsx:362
**Found:** 2026-10-01 while building 23a (owner note, not an `/audit` pass; scope: current; lens: quality)
**Why it matters:** `TabPanel` moves focus to itself when its tab changes, and by default the browser scrolls it into view, under the 82px sticky nav, so switching a tab on these pages jumps the page and half-hides the content. Standings, Games, and Game Detail already pass `scroll={false}` for this reason. Where a `TabPanel` mounts late (data loads after the page), React StrictMode in dev can trigger the same jump on first mount.
**Suggested fix:** Pass `scroll={false}` to each listed `TabPanel` that holds most of its page (keeping the focus move), and check each page's tab switch in a browser. Fix with the polish pass on those pages; no data or contract change. Separate from this: switching tabs while scrolled partway down can leave the page at the top because the page briefly shortens while the new tab loads; a minimum height on the panel would prevent it.
**Resolution:**
