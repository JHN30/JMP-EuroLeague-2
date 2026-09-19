# Feature: Compact filter controls

**From build-plan:** feature 13c
**Build attempt:** 1
**Branch:** feature/compact-filter-controls
**Status:** verified

## Goal

Reduce visual clutter on the statistics and comparisons pages by replacing their stacked tab-row filter controls with compact, labeled native dropdown selects. Preserve the pages' current defaults, data requests, navigation, and selection behavior.

## Design reference

Follow the compact native select treatment already used for leaderboard metrics and entity selection in the existing statistics and comparisons screens. No separate visual reference was provided.

## In scope

- On `frontend/src/statistics/StatisticsPage.jsx`, replace the tab-row controls for teams versus players, phase, player accumulated versus per-game mode, and sort direction with compact selects.
- On `frontend/src/comparisons/ComparisonsPage.jsx`, replace the tab-row controls for teams versus players, phase, and player accumulated versus per-game mode with compact selects.
- Give every select an accessible label and retain the existing selected values, defaults, callbacks, and responsive layout.
- Retain the existing behavior that changing a statistics filter resets the player leaderboard offset where it does today, and that switching the comparison view clears the selected entities.
- Add proportionate browser coverage for changing the new controls on both pages.

## Out of scope

- Changing the existing metric dropdowns, team pickers, player search pickers, data APIs, query parameters, routes, or URL persistence.
- Changing statistics, comparison calculations, loading, empty, or error states.
- Restyling filters on other pages or introducing a shared filter-control abstraction.

## Build loop

Implement and review the feature as one review packet. Step checkpoint commits are disabled. Keep every step independently working, run its named check, and present the completed packet for review before `/check`, audit, and `/complete`.

## Build steps

- [x] 1. Replace the statistics-page tab-row filters with labeled compact selects, including a select-based direction control shared by the team and player leaderboards.
  - **Done when:** Teams or players, phase, player mode, and direction can be changed with keyboard-operable selects; the existing default values, leaderboard data updates, and player pagination reset behavior remain intact. `cd frontend && npm run build` passes.

- [x] 2. Replace the comparisons-page tab-row filters with labeled compact selects while preserving the current view-switch reset and player comparison mode behavior.
  - **Done when:** Teams or players, phase, and player mode can be changed with keyboard-operable selects; switching comparison type still clears the current pair and existing picker, loading, empty, and error behavior remains reachable. `cd frontend && npm run build` passes.

- [x] 3. Add focused Playwright coverage for the compact controls on the statistics and comparisons pages.
  - **Done when:** The browser suite proves that each page renders native selects and that changing representative values preserves the expected visible state or request-driven content. `cd frontend && npm run test:browser` passes.

- [x] 4. Run the final frontend quality and browser checks.
  - **Done when:** `cd frontend && npm run lint`, `cd frontend && npm run build`, and `cd frontend && npm run test:browser` all pass, with no new console errors during the covered page interactions.

## Files / areas

- `frontend/src/statistics/StatisticsPage.jsx` for statistics filters and the direction control.
- `frontend/src/comparisons/ComparisonsPage.jsx` for comparisons filters.
- `frontend/e2e/` for focused browser coverage, using the existing Playwright setup.

## Data / contracts

- No backend or API contract changes are required.
- Statistics retains its current `teams` default view, regular-season-preferred phase selection, player `perGame` default mode, and ascending or descending sort values. Existing handlers continue to own offset resets.
- Comparisons retains its current `teams` default view, regular-season-preferred phase selection, player `perGame` default mode, and the existing clearing of selected entities when the view changes.
- Each new select uses explicit option values that map to the current in-memory state values. Labels remain programmatically associated with their controls.

## Testing

- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm run test:browser`
- Manually verify both pages at a desktop and narrow viewport, including keyboard selection and the existing loading, empty, and error presentations.

## Notes for the AI

- Reuse the repository's existing Tailwind and DaisyUI select styling. Do not add dependencies.
- Keep the page-local implementation small and avoid moving the existing data-fetching or selection logic.
- Preserve current control names and values where they already feed callbacks or queries.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4998,"specSha256":"132db2a5c7484d9b3df9392f88d7102cdaa77b104cd756bb2ecf8d3bcca179f3","branch":"refs/heads/feature/compact-filter-controls","head":"309fb8d1efd90380ecaa114af7dd61274fc5717e","baseRef":"refs/heads/master","baseCommit":"309fb8d1efd90380ecaa114af7dd61274fc5717e","sourceTree":"76057c327335bd2aa9a1a61cbf735e54056f1fee","absentOptional":[]} -->
