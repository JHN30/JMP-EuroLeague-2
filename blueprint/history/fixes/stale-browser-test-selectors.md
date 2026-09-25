# Fix: Stale browser-test selectors

**Type:** Fix
**Status:** verified
**Branch:** fix/stale-browser-test-selectors
**Fixes:** F-01

## The problem

4 of the 8 Playwright tests (`cd frontend && npm run test:browser`) fail on
current `master`, and they failed identically before the `app_*` rename. The
product behaves correctly. The tests assert markup and data-loading behavior
that later features changed, so the suite no longer checks what it claims to.

| Test | Failure | Cause |
|---|---|---|
| `e2e/smoke.spec.js:7` | Times out on `getByRole("tab", { name: "Teams" })` | The "Sections" navigation renders links, not tabs. (F-01) |
| `e2e/filter-controls.spec.js:14` | Times out on the `Statistics leaderboards` tab | Same navigation change. Then at line 17 it expects a `Leaderboard type` select, but `StatisticsPage.jsx` now has a `Leaderboard scope` button group (Players/Teams, `aria-pressed`). (F-01) |
| `e2e/coverage-panel.spec.js:31` | Strict-mode violation on `getByText("Play-by-play")` | Game Detail now has a `Play-by-play` tab as well as the coverage heading, so the text matches two elements. |
| `e2e/progressive-disclosure.spec.js:165` | `Showing 1-25 of 50 players` not found | `StatisticsPage.jsx` now loads the full leaderboard in blocks of `limit=100` and pages through it in the browser, 25 per page. The mock always returns `limit` rows and ignores its own total of 50, so the page shows 100 players. The request assertions (`limit: 25`, and a second request for page 2) describe the old server-side paging. |

## The fix

Update only the 4 spec files under `frontend/e2e/` to match the current UI and
data flow. Do not change product code.

- **Navigation (smoke and filter-controls):** click the section links inside
  the `Sections` navigation, using
  `getByRole("navigation", { name: "Sections" }).getByRole("link", { name, exact: true })`.
- **Leaderboard scope (filter-controls):** replace the `Leaderboard type`
  select with a click on the `Players` button in the `Leaderboard scope` group,
  and assert it is `aria-pressed="true"`. Keep the native-select checks that
  still apply: `Statistics phase`, `Player statistics mode`,
  `Player sort direction`, and all the Comparisons controls.
- **Coverage (coverage-panel):** target the coverage entry by its heading,
  `getByRole("heading", { name: "Play-by-play", level: 3 })`, so the tab no
  longer matches.
- **Leaderboard paging (progressive-disclosure):**
  - Make the season-stats mock return at most `total - offset` rows, as the real
    API does.
  - Assert one request of `{ offset: 0, limit: 100 }`, then "Showing 1-25 of 50
    players".
  - After `Next page`, assert "Showing 26-50 of 50 players" with no further
    request.
  - The player directory part (blocks of 36) is unchanged.
  - Clear the recorded leaderboard requests just before visiting Statistics.
    The player page earlier in the same test also reads the leaderboard
    (`fetchLeagueLeaderboard` in `PlayerPage.jsx`, `limit=100`), and that
    request must not count toward the Statistics assertions.

Must not break: the 4 tests that pass now (`head-to-head.spec.js` and the three
`records.spec.js` tests), and each test's original intent. Change only the
assertions the UI changed; don't delete them or weaken them to visibility-only
checks.

## Build steps

- [x] **Update the 4 failing browser specs to the current UI.**
  - Done when `cd frontend && npm run test:browser` reports 8 passed, 0 failed,
    and `cd frontend && npm run lint` passes.

## Verify

- `cd frontend && npm run test:browser` reports 8 passed.
- `cd frontend && npm run lint` passes.
- `git diff --stat` shows changes only under `frontend/e2e/` (plus workflow
  files).

## Verification results

- `cd frontend && npm run test:browser`: 8 passed, 0 failed.
- `cd frontend && npm run lint`: passes.
- `cd frontend && npm run build`: passes.
- The diff touches only `frontend/e2e/` (coverage-panel, filter-controls,
  progressive-disclosure, smoke) and this spec. No product code changed.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4032,"specSha256":"0bd5b622b20e496b86c4e50385167d3fbd6d6a193718295e711f6319ee710bdf","branch":"refs/heads/fix/stale-browser-test-selectors","head":"4a9cb7206f2bfb5e1afabfda3580a07ac73dc8fe","baseRef":"refs/heads/master","baseCommit":"4a9cb7206f2bfb5e1afabfda3580a07ac73dc8fe","sourceTree":"9f8bf503801a8de4a19db1539d84e9a937275de6","absentOptional":[]} -->

## Findings

### stale-browser-test-selectors/F-01 [P2] closed - Browser selectors no longer match the shipped navigation and scope controls

**File:** frontend/e2e/filter-controls.spec.js:14; frontend/e2e/smoke.spec.js:7
**Found:** 2026-09-22 by /audit independent (scope: current; lens: tests)
**Why it matters:** Both existing browser tests time out waiting for navigation tabs, while the rendered navigation exposes links. The filter test also expects a `Leaderboard type` select at line 17, but StatisticsPage uses a `Leaderboard scope` button group. These mismatches already exist at base commit `702f55b620bd39a61fb0d3c94f767164ef5ecf49`; this extraction did not introduce them. They prevent the available suite from exercising the migrated filter controls or the teams directory. `npm run test:browser` reproduced both navigation failures, and the Playwright page snapshot confirms the link roles.
**Suggested fix:** Update the navigation locators to the existing link roles and the leaderboard selector interaction to the current scope buttons, then rerun the two existing tests. Preserve the product's current controls.
**Resolution:** Fixed by fix/stale-browser-test-selectors: section navigation is clicked by link role inside the `Sections` navigation, and the leaderboard scope is chosen with the `Leaderboard scope` Players button (asserted `aria-pressed`). `npm run test:browser` passes 8 of 8. Closed 2026-09-25 by /audit (scope: current; lens: all): re-examined `smoke.spec.js:7` and `filter-controls.spec.js:14-23`. Both now use the rendered link roles and the `Leaderboard scope` button group, the original timeouts are gone (the 4 changed specs passed 3 repeats each, 12 of 12), and the repair introduced no new defect in those files.
