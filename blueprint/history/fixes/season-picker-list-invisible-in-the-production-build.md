# Fix: Season picker list invisible in the production build

**Type:** Fix
**Status:** verified
**Branch:** fix/season-picker-list-invisible-in-the-production-build

## The problem

The customizable-select styles added in the earlier "Pickers open as a polished, animated list" fix (the `@supports (appearance: base-select)` block at the end of `frontend/src/index.css`) work in the dev server but not in the production build: clicking the season picker turns the arrow over but no list appears. The production CSS minifier drops three rules whose selector puts a pseudo-class after a pseudo-element: `.select::picker(select):popover-open { opacity: 1; scale: 1 }`, the `@starting-style` block around it, and `.select:open::picker-icon { rotate: 180deg }`. What is left is `.select::picker(select) { opacity: 0 }`, so the open list stays invisible. The browser specs only run against the dev server, so they did not catch it. The deployed site (origin/master) has the broken styles.

## The fix

Already made and uncommitted on the branch (`frontend/src/index.css`); `/implement` verifies it against the production build:

- The list fades in with a keyframe animation (`animation: picker-in 160ms ease-out` on `.select::picker(select)`, `@keyframes picker-in { from { opacity: 0; scale: 0.97 } }`) instead of an `opacity: 0` base state with a `:popover-open` rule and `@starting-style`. The list is fully visible by default, so a browser or minifier that ignores the animation still shows it. The fade-out on closing is dropped.
- The arrow turns with a custom property: `.select:open { --picker-turn: 180deg }` and `.select::picker-icon { rotate: var(--picker-turn, 0deg) }`, so no pseudo-class follows a pseudo-element.
- Reduced motion still turns the animation and transitions off.

Unchanged: the closed select, the option rows, hover and selected states, the check mark, the `@supports` fallback to native selects, and every component.

## Build steps

- [x] 1. **Verify against the production build.** Build with root `npm run build`, serve it with `PORT=3100 npm start` (the local database), open the season picker in Chromium at 1280px and check the list is visible with its options, the selected row marked and the arrow turned over, and that choosing an option navigates; confirm in `frontend/dist/assets/*.css` that the keyframes, the `animation` on the list and the `--picker-turn` rules are present and no `:popover-open` rule is needed. Stop the server on port 3100 afterwards. Done when the list is visible and works in the production build, the picker specs still pass in dev (`leaders.spec.js`, `standings-view-controls.spec.js`, `records-layout.spec.js`, `filter-controls.spec.js`), and root `npm run build` and `cd frontend && npm run lint` pass.

## Verify

Production build on a spare port as above (local database only; `/api/health` must say `local`). After a push and deploy, click the season picker on the live site.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2944,"specSha256":"6f80243c6ff75f7e0bbcced1feb63dd6232c2f325c4422da28e9bb115f696c93","branch":"refs/heads/fix/season-picker-list-invisible-in-the-production-build","head":"d9d73c525963f4b3fff968ace93f8e2a3982e5ad","baseRef":"refs/heads/master","baseCommit":"d9d73c525963f4b3fff968ace93f8e2a3982e5ad","sourceTree":"a1ac962e4350f323124bc6e490e5a36168b5d71a","absentOptional":[]} -->

## Completion evidence

- Diagnosis: the production build of the CSS (`frontend/dist/assets/*.css`) lacked the `.select::picker(select):popover-open`, `@starting-style` and `.select:open::picker-icon` rules (the minifier drops a pseudo-class after a pseudo-element) and kept `opacity: 0` on the list, so the list opened invisible. The dev server keeps them, which is why the earlier checks passed.
- Production build checked (root `npm run build`, `PORT=3100 npm start` on the local database, `/api/health` said `local`, server stopped afterwards): the built CSS has the `picker-in` keyframes, the animation on the list and the `--picker-turn` rules and no `:popover-open` rule; in Chromium the season picker opened with a visible list (36px option rows), the arrow turned over (180deg) and choosing 2024-25 navigated, at 1280px (dark) and 390px (light, in the phone menu). The 390px screenshot was read.
- Local database, dev server: `leaders.spec.js`, `standings-view-controls.spec.js`, `records-layout.spec.js` and `filter-controls.spec.js` passed (13 tests). `cd frontend && npm run lint` and root `npm run build` pass. No `Verify` command is declared in `AGENTS.md`. The browser specs do not run against the production build, so no spec covers this; it was checked by hand.
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested. To confirm on the live site: push, redeploy, click the season picker.
