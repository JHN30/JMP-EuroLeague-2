# Fix: Remove unused frontend files and exports

**Type:** Fix
**Status:** verified
**Branch:** fix/remove-unused-frontend-files-and-exports

## The problem

Earlier page reworks left frontend code that nothing uses. An import trace from `frontend/src/main.jsx` (static and
lazy `import()` imports) found four files the app never reaches. A whole-word search of `frontend/src`,
`frontend/e2e`, the configs, `index.html` and the root scripts found nothing else using them, nor the six exports
below.

**Unreachable files** (484 lines):

| File | Lines | Unused since |
|---|---|---|
| `comparisons/TrendChart.jsx` | 142 | `5020c43` (2026-11-01), player Advanced tab rework |
| `lib/ShootingBreakdown.jsx` | 251 | `1c6a733` (2026-11-02), player Shooting tab rework |
| `lib/shotBreakdown.js` | 67 | `1c6a733`; only `ShootingBreakdown.jsx` used it |
| `lib/shotFilters.js` | 24 | `1c6a733` |

**Exports used nowhere, including their own file:**

| Export | File | Note |
|---|---|---|
| `averageOf` | `players/gameLog.js` | `PlayerOverviewSection.jsx` defines its own |
| `shootingLine`, `PRESENTATION_TABS`, `RESULT_TABS` | `lib/shootingData.js` | `TeamGamesSection.jsx` defines its own `RESULT_TABS` |
| `cumulative` | `comparisons/trendMath.js` | |
| `TEAM_FAMILIES` | `leaders/teamData.js` | |

## The fix

- Delete the four files.
- Remove the six exports. Also remove any helper or import that only they used: for example, `isMade` in
  `shootingData.js` if `shootingLine` was its last user (check its other users before removing it).
- Reword the comment at `lib/Skeleton.jsx:135` that names `ShootingBreakdown`, so it describes the Shooting tab
  without pointing at a deleted file.

Out of scope:
- Exports used only inside their own file (about 30 in the frontend): removing their `export` keyword changes
  nothing that runs.
- The backend: it has no unused files or exports.
- `scripts/check-season-*.mjs`: deliberate tools from features 34b and 34o.

Must not break any page; nothing that runs uses this code.

## Build steps

1. [x] **Delete the unused files and exports.**
   Result: the 4 files were deleted and the 6 exports removed, along with `isMade` and the `formatPercentage` import in
   `shootingData.js` (only `shootingLine` used them; `ShootingTables.jsx` keeps its own `isMade`). The file comment
   there and the `Skeleton.jsx` comment were reworded. Lint and the root build pass. The import trace finds no
   unreachable files. No removed name remains: "cumulative" still appears as a word and a field in the standings
   views, but nothing calls or imports the function. The main chunk is 115.13 KB gzipped (115.14 before), with 65 JS
   chunks before and after (none of the deleted files was bundled). Smoke set: 6 passed.
   Done when:
   - `cd frontend && npm run lint` and `npm run build` pass.
   - The import trace from `main.jsx` finds no unreachable files.
   - None of the removed names appears anywhere in `frontend/src` or `frontend/e2e`, except the two unrelated local
     definitions (`averageOf` in `PlayerOverviewSection.jsx` and `RESULT_TABS` in `TeamGamesSection.jsx`).
   - The main and page chunk sizes are unchanged or smaller.

## Verify

- Root `npm run build` and `cd frontend && npm run lint`.
- Re-run the scratch import trace.
- Playwright: the smoke set (`smoke.spec.js`, `urls-and-titles.spec.js`). Nothing that runs changes, so per the agreed
  test scope this is not a full-suite change.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3446,"specSha256":"93800c4bea817bdd2ce79f0c745e850d32860bc32771dee788c5b5f1e43627fe","branch":"refs/heads/fix/remove-unused-frontend-files-and-exports","head":"728925860319080497444468d736f546693445e1","baseRef":"refs/heads/master","baseCommit":"728925860319080497444468d736f546693445e1","sourceTree":"0705e58f78127cee5ef2d73414fb5c2e67b7f162","absentOptional":[]} -->
