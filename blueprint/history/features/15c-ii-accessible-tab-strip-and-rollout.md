# Feature: Accessible tab strip and rollout

**From build-plan:** feature 15c-ii
**Build attempt:** 1
**Branch:** feature/accessible-tab-strip-and-rollout
**Status:** verified

## Goal

Replace every hand-rolled same-page tab-panel switcher in the app with one
shared, accessible tab-strip component implementing roving tabindex,
Arrow/Home/End navigation, disabled-tab skipping, and manual activation,
paired with a tab-panel wrapper that moves focus to itself when the
selection changes but not on first render.

## Scope correction found during spec review

The build-plan text names 8 tab rows across 7 files, including `NavBar.jsx`.
Inspection found **11** `role="tablist"` groups across 7 files, and one of
them — `NavBar.jsx`'s primary section nav — is not a tab-panel switcher at
all: its "tabs" are `<NavLink>`s that navigate to different routes. The ARIA
Authoring Practices tab pattern is for switching panels within one view via
manual activation and roving tabindex (only one tab is Tab-reachable at a
time); applying that to primary route navigation would make each nav item
un-Tab-reachable except the active one, which is a real keyboard-navigation
regression, not an improvement. `role="tablist"`/`role="tab"` on real
navigation links is a known ARIA-APG anti-pattern.

This spec therefore fixes `NavBar.jsx` separately (remove the incorrect
`tablist`/`tab` roles so its links keep normal, fully Tab-reachable semantics
as a `<nav>` list) rather than converting it to the new component, and
converts the other 10 genuine same-page tab-panel groups across 6 files.

## In scope

- `frontend/src/lib/TabStrip.jsx`: exports `TabStrip` (the `role="tablist"`
  button row: roving tabindex via a focus-tracking `tabIndex`, Arrow-Left/Up
  and Arrow-Right/Down move focus among enabled tabs and wrap, Home/End jump
  to the first/last enabled tab, disabled tabs are skipped by arrow
  navigation, activation stays manual — arrow keys move focus only, a native
  `<button>`'s own Enter/Space activation calls `onChange`) and `TabPanel`
  (the `role="tabpanel"` wrapper: focusable via `tabIndex={-1}`, moves focus
  to itself when its `focusKey` prop changes, skipping the initial mount).
- Fix `NavBar.jsx`: remove `role="tablist"` and `role="tab"` from the section
  nav; keep the existing `<nav aria-label="Sections">` and `<NavLink>`
  elements exactly as they render today.
- Convert the 10 genuine tab-panel groups to `TabStrip`/`TabPanel`:
  - `StandingsPage.jsx` — phase tabs and view tabs, both driving the single
    standings-table panel.
  - `FixturesPage.jsx` — phase tabs and status tabs, both driving the single
    games-list panel.
  - `TeamPage.jsx` — phase tabs and section tabs, both driving the single
    section-content panel.
  - `PlayerPage.jsx` — phase tabs and stats-mode tabs, both driving the
    single season-statistics panel.
  - `StatisticsPage.jsx` — the metric-category tabs driving the leaderboard
    panel.
  - `PlayoffsPage.jsx` — the postseason-phase tabs driving the matchups
    panel.
  Where two tab groups in the same file drive one shared panel, both
  `TabStrip`s get `aria-controls` pointing at that one panel's id, and the
  panel's `TabPanel` receives a `focusKey` that changes when either group's
  selection changes, so activating any control still moves focus to the
  updated result.
- Apply `.touch-target` (added in 15c-i) to every converted tab button, since
  15c-i deliberately deferred tab-button sizing to this feature.

## Out of scope

- `NavBar.jsx`'s links are not converted to the new component (see the scope
  correction above); this is a fix to existing markup, not a rollout target.
- Any tab-like control not using `role="tablist"` today (for example
  `TeamPage.jsx`'s roster/overview switch already found to use tabs, covered
  above; any button-group filter without `role="tablist"` is untouched).
- 15d-15g and any other build-plan item.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (one review
packet after all steps) and `workflow.checkpointCommits` is `disabled` (no
per-step commits; `/complete` makes the one work commit).

## Build steps

- [x] 1. Build `frontend/src/lib/TabStrip.jsx` exporting `TabStrip` and
      `TabPanel` as described above, with no consumer yet.
      **Done when:** `npm run lint` and `npm run build` pass.
- [x] 2. Fix `NavBar.jsx` (remove `tablist`/`tab` roles).
      **Done when:** `npm run build` passes; CDP check confirms all 8
      `<NavLink>` elements are present with no `role` attribute and every one
      is reachable via sequential `Tab` key presses (not roving).
- [x] 3. Convert `StandingsPage.jsx`'s phase and view tabs to `TabStrip` /
      `TabPanel`.
      **Done when:** `npm run build` passes; CDP check on the Standings page
      confirms: clicking a tab updates the table, Arrow-Right moves DOM focus
      to the next tab without changing the table, Home/End jump to the first
      and last tab, and activating a tab (Enter) after arrowing moves focus
      into the results panel.
- [x] 4. Convert `FixturesPage.jsx`'s phase and status tabs.
      **Done when:** same CDP check pattern as step 3, run against Fixtures.
- [x] 5. Convert `TeamPage.jsx`'s phase and section tabs.
      **Done when:** same CDP check pattern, run against a Team page.
- [x] 6. Convert `PlayerPage.jsx`'s phase and stats-mode tabs.
      **Done when:** same CDP check pattern, run against a Player page.
- [x] 7. Convert `StatisticsPage.jsx`'s metric-category tabs.
      **Done when:** same CDP check pattern, run against Statistics.
- [x] 8. Convert `PlayoffsPage.jsx`'s postseason-phase tabs.
      **Done when:** same CDP check pattern, run against Playoffs (may need
      a season/phase with postseason data, or note if only the empty-state
      branch is reachable with current data and verify that branch instead).

## Files / areas

- `frontend/src/lib/TabStrip.jsx` (new)
- `frontend/src/season/NavBar.jsx`
- `frontend/src/standings/StandingsPage.jsx`
- `frontend/src/games/FixturesPage.jsx`
- `frontend/src/teams/TeamPage.jsx`
- `frontend/src/players/PlayerPage.jsx`
- `frontend/src/statistics/StatisticsPage.jsx`
- `frontend/src/playoffs/PlayoffsPage.jsx`

## Data / contracts

None — presentation and interaction only, no API or persisted-data changes.

## Testing

No unit test runner is configured. Verify via `cd frontend && npm run lint`
and `npm run build`, plus the CDP-based keyboard-interaction evidence named
in each step's `Done when` against the running dev server.

## Notes for the AI

- Each of the 6 conversion steps is a real per-file diff (tab markup plus its
  panel wrapper); keep each one to exactly the tabs and panel named in that
  step, matching the pattern from step 3 once it is proven.
- Preserve every existing `onClick`/state-update handler's behavior exactly;
  this feature changes markup and keyboard semantics, not what a selection
  does.
- `aria-controls`/`aria-labelledby` ids must be stable and unique per tab
  group (prefix with the file's tab-group name, e.g. `standings-phase`,
  `standings-view`) so two tab groups in the same file never collide.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7179,"specSha256":"30b214b0ed5f0811139c31a15922f7f8f61ae811a7b0c58f4b98a46d74e68f2b","branch":"refs/heads/feature/accessible-tab-strip-and-rollout","head":"3a7729b76312639b39561bb8376131874de73852","baseRef":"refs/heads/master","baseCommit":"3a7729b76312639b39561bb8376131874de73852","sourceTree":"1cd614c20a68974493ce8883d22d85e62b665581","absentOptional":[]} -->
