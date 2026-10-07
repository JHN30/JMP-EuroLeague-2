# Feature: View controls on phones

**From build-plan:** feature 31d-vi
**Build attempt:** 1
**Branch:** feature/view-controls-on-phones
**Status:** verified

## Goal

Cut the number of stacked controls on the Standings page's Table and Advanced tabs on a phone, and line up the labels that remain. Today the Table tab has the view tabs (Overall, Home, Away, Last 10) and a Breakdown select, and the Advanced tab has the scope tabs, a Round select and six view tabs, which wrap into three or four rows at 320px, and the "Round" and "Breakdown" labels sit further left than the tab text above them. After this item, below `sm` (640px): the Table tab has one View select (Overall, Home, Away, Last 10, Streaks and form, Winning margins, Ahead/behind), and the Advanced tab has a Scope select and a Round select side by side on one row with one View select (Overview, Ratings, Four factors, Schedule, Splits, Explained) under them. From `sm` up the tabs and selects are as today, with the labels that are still shown lined up with the tab text.

Layout only: no API, data or feature changes, and no new URL or stored state (the selected view stays in the page's existing React state).

## Design reference

Current code (step 1 measures it before anything is changed; the numbers here are from reading the code):

- `StandingsPage.jsx` holds `view` ("overall", "home", "away", "last10"), `mode` ("table", "race", "advanced") and `breakdown` ("overview", "streaks", "margins", "aheadBehind"). In Table mode it shows the view tabs only when `breakdown` is "overview" (picking a breakdown hides them), plus a `Breakdown` select, in one wrapping row. So the four views and the three breakdowns are already one mutually exclusive list of seven.
- `AdvancedStandingsView.jsx` holds `scope`, `round` and `viewKey` and shows the scope `TabStrip`, a `Round` select, then the view `TabStrip` (six tabs, Explained included) in two wrapping rows, above a `TabPanel`.
- `lib/TabStrip.jsx` renders `role="tablist"` buttons (`tab-level-N` classes in `index.css`), keyboard-navigable; the `Round` and `Breakdown` selects are plain `label` + `select.select-sm` elements with no shared component.
- The page's own Table, Race and Advanced strip (the mode strip) and the phase tabs above it are not part of this item.

Targets: at 320px the Table tab shows one select where it showed two controls, the Advanced tab shows two rows of controls where it showed five or six, every select is fully inside the screen and tall enough to tap, choosing an option does what the equivalent tab did, and the page never scrolls sideways; from 640px the tabs are as today and the labels line up with the tab text.

## In scope

- **A shared View select.** A small component in `frontend/src/lib/` (a label, a native `select`, the options, a change handler), used for the phone controls below. A native select is the proportionate choice: it needs no dependency, opens the platform picker on a phone, and is already what the Round and Breakdown controls use.
- **Table tab, below `sm`.** One View select with the seven options. Choosing Overall, Home, Away or Last 10 sets `breakdown` to "overview" and `view` to that value; choosing Streaks and form, Winning margins or Ahead/behind sets `breakdown` and leaves `view` as it was. The select shows the current choice (a breakdown if one is chosen, else the current view). The view tabs and the Breakdown select are hidden below `sm` and shown from `sm`, as today. Both controls always describe the same state: resizing across 640px keeps the selection.
- **Advanced tab, below `sm`.** A two-column row with a Scope select (Regular season, All games, Postseason, as the scope tabs offer, only the scopes the data has) and the existing Round select, each with its label above it; then one View select with the six views. The scope tabs and the view tabs are hidden below `sm` and shown from `sm`. Changing the scope resets the round to the latest, as the scope tabs do.
- **Alignment.** The `Round` and `Breakdown` labels (shown from `sm`) start at the same left edge as the tab text above them, and nothing is clipped at the left edge; measured first, fixed in `index.css` or the label markup.
- **Playwright spec.** A view-controls spec (below). The page-scroll spec already covers the page.

## Out of scope

- The mode strip (Table, Race, Advanced), the phase tabs, and the Race tab; the other pages' tab strips (31e onwards decide their own).
- Putting the selected view in the URL, remembering it between visits, or any change to what each view shows.
- Replacing the tab strips on tablet or desktop, a custom dropdown component, or a new dependency.
- Any backend or API change, a different `sm`, `lg` or `xl` break, adding the spec to Verify or CI.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (one review packet after all steps, no pause per step) and `workflow.checkpointCommits` is `disabled` (no step commits). `/complete` makes the single feature commit. The build-plan line for this item and the overview refresh that came with it are on the branch and go into the same commit. Each step leaves the app working and ends with its Done when.

## Build steps

- [x] **1. Measure the current state.** No code change. On `/2026/standings` and `/2025/standings` at 320, 390, 639, 640, 768, 1024 and 1280px: how many rows the controls take in the Table tab and in the Advanced tab, the left edge of the text of the first tab against the left edge of the `Round` and `Breakdown` labels (and whether any label is clipped), and each control's height. Write the findings in this step's Result line.
  Result (measured headless, both seasons): the Table tab's view tabs are one row at every width and the Breakdown select sits beside them (so the row count is one; the row itself is two controls); the Advanced tab's scope tabs are one row and its six view tabs are two rows at 320 and 390px (one row from 640px), with the Round select beside the scope tabs or wrapping under them, so the Advanced controls take four rows at 320px. A tab strip insets its text by 0.5rem: at 320 to 639px the first tab's text starts at x=20 and the `Round` and `Breakdown` labels at x=12, 8px to the left of it (the misalignment reported); at 640px the tab text is at x=28 and from 1024px at x=40 (the page gutter grows), and the labels sit beside the tabs there, so the offset only shows where a label has a row to itself. Every select is 32px tall.
  **Done when:** the Result line lists, per width, the number of control rows in both tabs and the label offset against the tab text.

- [x] **2. The View select and the Table tab.** A new `frontend/src/lib/ViewSelect.jsx`; `StandingsPage.jsx` renders it below `sm` and keeps the tabs and the Breakdown select from `sm`, with the mapping described above.
  **Done when:** `cd frontend && npm run lint` and `npm run build` pass. In a browser on `/2026/standings` and `/2025/standings` at 320 and 390px: one select named "View" with seven options is visible and the view tabs and the Breakdown select are not; choosing "Home" shows the Home table, "Last 10" the Last 10 table, "Winning margins" the margins view, and going back to "Overall" restores the overview; at 640px and wider the tabs and the Breakdown select are visible and the View select is not; choosing a breakdown at 320px and then widening the window to 1280px shows the same breakdown selected in the Breakdown select (and the same view tab after choosing "Away").

- [x] **3. The Advanced tab controls.** `AdvancedStandingsView.jsx` renders, below `sm`, a Scope select and the Round select side by side (labels above) and one View select with the six views; the scope and view tabs show from `sm`.
  **Done when:** lint and build pass. In a browser on both seasons at 320 and 390px: the controls take two rows (Scope and Round, then View); the scope tabs and the view tabs are not visible; choosing each of the six views shows that view (the table or the scatter and the table, the explainer for Explained); choosing another scope reloads for that scope and resets the Round to the latest; a season with only one scope shows a Scope select with that one option; at 640px and wider the scope tabs, the Round select and the view tabs are as today and the phone selects are not visible; a selection made at 320px is still selected after widening to 1280px.

- [x] **4. Align the labels.** `index.css` or the label markup, as step 1 shows.
  Built: the `Round` and `Breakdown` labels beside the tabs carry the tab strip's 0.5rem inset (`ms-2`), so a label that wraps under the tabs starts where the tab text starts; below 640px the labels are replaced by the View selects, whose label text has the same inset. The measured 8px offset is gone where it showed (below 640px).
  **Done when:** lint and build pass. From 640px to 1440px the `Round` and `Breakdown` labels' left edges equal the first tab's text left edge (within 1px) and no label is cut off at the left edge; at 320px every select and label is inside the viewport and the two rows are left aligned with the rest of the page content.

- [x] **5. View controls spec and regression pass.** `frontend/e2e/standings-view-controls.spec.js`: one page load per test, resized through 320, 390, 639, 640, 768 and 1280px: the option lists match the tabs they replace, each choice shows the right view, the selection survives a resize both ways, the phone selects are hidden from 640px and the tabs below it, the controls are inside the viewport, the label alignment from 640px, and the page overflow check. Existing specs that drive the tabs (`standings-table-layout`, `standings-breakdowns-layout`, `standings-advanced-layout`, `standings-race-layout`, `standings-explained-layout`) pass; the ones that start narrow are checked. A full lint, build and browser-suite run.
  **Done when:** `cd frontend && npx playwright test e2e/standings-view-controls.spec.js e2e/standings-table-layout.spec.js e2e/standings-breakdowns-layout.spec.js e2e/standings-advanced-layout.spec.js e2e/standings-explained-layout.spec.js e2e/responsive.spec.js` passes; lint and both builds pass; the full `npm run test:browser` passes or any failure is explained and traced to this change; nothing outside the files listed below changed.

## Files / areas

- `frontend/src/lib/ViewSelect.jsx` (new), `frontend/src/standings/StandingsPage.jsx`, `frontend/src/standings/AdvancedStandingsView.jsx`
- `frontend/src/index.css` (the label alignment, and a hide rule only if a Tailwind utility cannot do it)
- `frontend/e2e/standings-view-controls.spec.js` (new); the existing Standings specs only if a selector needs an update
- `blueprint/build-plan.md` and `blueprint/context/project-overview.md` (the new item and the overview refresh already made on this branch)
- Not changed: the backend, `frontend/src/lib/api.js`, `TabStrip.jsx`, the Race tab, the other pages.

## Data / contracts

- No API, database or persisted-data change. No new dependency. State stays in `StandingsPage` (`view`, `breakdown`, `mode`) and `AdvancedStandingsView` (`scope`, `round`, `viewKey`); the phone selects read and write the same state as the tabs, so the two controls cannot disagree.
- Breakpoint: `sm` 40rem. The phone selects are shown below it and hidden from it (display none, so the hidden control is out of the accessibility tree and the tab order, and the visible one is the only control with that name).
- Accessibility: each select has a visible label ("View", "Scope", "Round"); the option text equals the tab text it replaces; the select is native, so the platform handles focus and announcement; the touch target is at least the height the tabs have (the `touch-target` rule).
- Selecting a scope in the Advanced select calls the same handler as the scope tabs (it resets the round), so a loading state follows exactly as it does today.

## Testing

- Playwright browser spec (step 5) following the 31c to 31d-v pattern: one page load per test, resized through the widths. There is no unit test command; browser tests are evidence, not part of Verify.
- The existing Standings specs and the page-scroll spec must keep passing.

## Notes for the AI

- Phones are not available for testing: say that the controls were checked by driving the page in a headless browser, not by hand.
- Reuse the existing handlers; do not add state, a store or a URL parameter.
- No em or en dashes in generated content.
- Measure before fixing; change only what the steps list.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":12609,"specSha256":"a0ef2e626f1f26fe227878f6a8020adaab71c3aee4a05934d954b43047c5fdf6","branch":"refs/heads/feature/view-controls-on-phones","head":"312b5c894dac6a58294a16eb6c872fac2c7dbb5f","baseRef":"refs/heads/master","baseCommit":"312b5c894dac6a58294a16eb6c872fac2c7dbb5f","sourceTree":"b8060d407f019dbe70a381c5b43a5d244d473b11","absentOptional":[]} -->
