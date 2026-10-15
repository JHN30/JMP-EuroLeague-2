# Fix: Remove dead code

**Type:** Fix
**Status:** verified
**Branch:** fix/remove-dead-code

Spec written after the work. The cleanup was built on this branch straight from chat, before this spec existed.

## The problem

A stale-file sweep (an import-graph scan from `frontend/src/main.jsx` and `backend/src/index.ts`, plus a search for
exported names and CSS classes used nowhere else) found code and files left behind by earlier reworks:

- Three shared components that nothing imports: `frontend/src/lib/InfoRow.jsx`, `InfoTile.jsx`, `SummaryGrid.jsx`.
- Six exported functions with no caller anywhere, including their own file: `isRecordKind`
  (`backend/src/db/season-records.ts`), `rolling` (`frontend/src/comparisons/trendMath.js`, left from the removed team
  Trends tab), `computeDomain` (`frontend/src/lib/chartHelpers.js`), `initialsFor` (`frontend/src/lib/format.js`),
  `metricGroupFor` and `metricLabelFor` (`frontend/src/lib/statsFields.js`).
- About twenty CSS classes in `frontend/src/index.css` that no source file uses, including dynamically built names:
  `app-panel`, `app-card`, `app-card-interactive`, `court-lines`, `swatch-*`, `stat-badge-leader`, `stat-callout`,
  `form-watch-row` and `fw-*`, `winner-mark`.
- `frontend/README.md` is the stock Vite template text and says nothing about this project.
- Findings F-02 and F-03 in `blueprint/context/findings.md` no longer apply: `.scope-toggle` no longer exists, every
  `<TabPanel>` passes `scroll={false}`, and two of F-03's files are gone.

## The fix

Delete the unused files, functions and CSS rules, and close F-02 and F-03 as stale with their evidence. No behaviour
changes. Kept on purpose: the `zustand` dependency (the owner expects to use it), `drizzle-kit` (named as the migration
tool in the coding standards), and `GET /api/seasons/:seasonCode`. The "Inset well" comment in `index.css`, which sat
between removed rules, stays. Local ignored clutter (a stray root `node_modules`, `frontend/debug.log`,
`frontend/test-results/`) was also removed; it is not part of the commit.

## Build steps

1. Remove the dead files, functions and CSS rules, and close F-02 and F-03.
   - Done when: none of the removed names appear anywhere in `frontend/src`, `frontend/e2e`, `backend/src` or
     `scripts`; F-02 and F-03 are `closed` with a resolution; frontend lint and both builds pass.

## Verify

- `cd frontend && npm run lint` passes.
- `npm run build` (root) builds both apps.
- Optional: open any page in `npm run dev` and see no visual change. The removed classes were not applied anywhere.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2578,"specSha256":"eb62225a007dcbe86b3c95d3ca7b3163cf724f61095837ac6c0308a25d90b4e2","branch":"refs/heads/fix/remove-dead-code","head":"acdb7166c0f8cd0b4b1f494c3b1cbfd98a4e79bd","baseRef":"refs/heads/master","baseCommit":"acdb7166c0f8cd0b4b1f494c3b1cbfd98a4e79bd","sourceTree":"3051e6f46fec6959156f4b714a19f84a93e7253b","absentOptional":[]} -->

## Findings

### remove-dead-code/F-02 [P3] closed - Leaderboard scope still selected by CSS class in the progressive-disclosure test

**File:** frontend/e2e/progressive-disclosure.spec.js:166
**Found:** 2026-09-25 by /audit (scope: current; lens: tests)
**Why it matters:** The test clicks the Players scope with `page.locator(".scope-toggle button", { hasText: "Players" })`, which depends on a styling class. `filter-controls.spec.js` now reaches the same control through its accessible `Leaderboard scope` group. A class rename would break this test the same way F-01's role changes broke the others, and the two specs now select one control in two different ways.
**Suggested fix:** Use `page.getByRole("group", { name: "Leaderboard scope" }).getByRole("button", { name: "Players", exact: true })`, matching `filter-controls.spec.js`. No product change, and no current requirement is lost.
**Resolution:** Closed 2026-10-15 as stale during the dead-code cleanup: `.scope-toggle` no longer exists in `frontend/src` or `frontend/e2e`, so no test selects the scope by that class.

### remove-dead-code/F-03 [P3] closed - Tab panels on other pages still scroll the page on tab switch

**File:** frontend/src/comparisons/ComparisonsPage.jsx:881, frontend/src/players/PlayerPage.jsx:639 and :665, frontend/src/players/PlayerAdvancedSection.jsx:275, frontend/src/statistics/StatisticsPage.jsx:340, frontend/src/statistics/AdvancedLeaderboard.jsx:157, frontend/src/teams/TeamPage.jsx:897, frontend/src/teams/TeamAdvancedSection.jsx:362
**Found:** 2026-10-01 while building 23a (owner note, not an `/audit` pass; scope: current; lens: quality)
**Why it matters:** `TabPanel` moves focus to itself when its tab changes, and by default the browser scrolls it into view, under the 82px sticky nav, so switching a tab on these pages jumps the page and half-hides the content. Standings, Games, and Game Detail already pass `scroll={false}` for this reason. Where a `TabPanel` mounts late (data loads after the page), React StrictMode in dev can trigger the same jump on first mount.
**Suggested fix:** Pass `scroll={false}` to each listed `TabPanel` that holds most of its page (keeping the focus move), and check each page's tab switch in a browser. Fix with the polish pass on those pages; no data or contract change. Separate from this: switching tabs while scrolled partway down can leave the page at the top because the page briefly shortens while the new tab loads; a minimum height on the panel would prevent it.
**Resolution:** Closed 2026-10-15 as stale during the dead-code cleanup: every `<TabPanel>` in `frontend/src` now passes `scroll={false}`, and `StatisticsPage.jsx` and `AdvancedLeaderboard.jsx` no longer exist. The separate minimum-height note was not re-checked.
