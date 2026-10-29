# Fix: Leaders choices read the live address

**Type:** Fix
**Status:** verified
**Branch:** fix/leaders-choices-read-the-live-address

## The problem

On the Leaders page (`/:season/leaders`), a choice can silently undo the previous one. Seen with:
- Totals and the Stage select;
- the Stage select and opening a board;
- opening a board and the Statistic select.

Cause, confirmed with `/debug`:
- Every Leaders address change goes through `setParams` from `useSearchParams()` in `LeadersPage.jsx`, which it passes to
  the Players, Teams and Advanced views. Each change uses the updater form, `setParams((current) => ...)`.
- In React Router 8.4 that `current` is the address from the component's **last render**, not the live one
  (`node_modules/react-router/dist/development/lib/dom/lib.js:747-751`).
- The browser's address changes at once; React re-renders a little later. A second choice in that gap is built from the
  old address, and the first choice disappears.

Measured, Totals then Playoffs:
- at normal CPU speed, every delay kept both choices;
- with the CPU slowed 4× (about a mid-range phone), Playoffs within 0, 100, 250 and 500 ms after Totals dropped
  `mode=accumulated`; after 1 s both were kept.

The Leaders test "one row of choices under the scope tabs…" fails on `master` for this reason. Parallel test workers slow
the browser the same way.

A second, smaller copy of the same problem: `chooseStat` in `PlayersBoard` (`PlayersLeaders.jsx`) writes
`mode: params.get("mode")`, a value read at render time, so it can put back an old mode even when the updater starts from
the live address.

## The fix

Scoped to the Leaders page, following the "current page only" rule.

- **One wrapper in `LeadersPage`.** The `setParams` it uses and passes down runs the caller's updater on
  `new URLSearchParams(window.location.search)`, the live address, and hands the result to React Router's setter.
  - Every Leaders change already uses the updater form, so no caller changes.
  - Navigation options, if a caller ever passes them, pass through unchanged.
- **`chooseStat`.** Only write `mode` when it must change: when the current stat is a games count (`stat.kind ===
  "games"`) it keeps the effective mode. Otherwise `mode` is left out of the patch, so whatever the live address has is
  kept. Leaving it out keeps the live mode, which is what writing `params.get("mode")` meant to do.
- **Out of scope.** The same updater pattern exists on Fixtures, Standings, Records, Head-to-head and in the shared
  `usePhaseParam`. They weren't tested, and are left for their own fix if wanted.

Must not break:
- the scope tabs clearing their own parameters;
- choosing a stage clearing the board filters;
- opening a board and going back to the cards;
- the Back button stepping through choices;
- every other Leaders test.

## Build steps

- [x] 1. **Live address for every Leaders change, and `chooseStat`.**
  Done when the "one row of choices under the scope tabs…" test passes in the full `leaders.spec.js` run.
- [x] 2. **Regression test.** In `frontend/e2e/leaders.spec.js`, add a test that slows the CPU 4× (CDP
  `Emulation.setCPUThrottlingRate`) and makes each pair of choices back to back, with no wait between them:
  - Totals, then Playoffs: the address keeps `mode=accumulated` and `phase=PO`;
  - opening the Points board, then choosing Assists: `metric=assists` with `phase=PO` and `mode=accumulated` kept.

  Done when the new test passes. Before the fix it would drop a parameter, as the `/debug` timing showed.

## Verify

- Browser tests (local DB; `/api/health` must report `"target":"local"`):
  `cd frontend && npx playwright test leaders.spec.js leaders-layout.spec.js`, with every test passing (including the one
  that failed on `master`).
- Manual: in DevTools set CPU to 4× slowdown, open `/2025/leaders`, click Totals and quickly pick Playoffs. The address
  keeps both, and the cards show playoff totals.
- `cd frontend && npm run lint` passes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3995,"specSha256":"ac3d81f373a38059e9091dadbb6614e322460bf17fb5641080ac322bd33a91d8","branch":"refs/heads/fix/leaders-choices-read-the-live-address","head":"39efa4459682a0b009050b7cfa250ba938494505","baseRef":"refs/heads/master","baseCommit":"39efa4459682a0b009050b7cfa250ba938494505","sourceTree":"2261e5c989415a41c207d729f01fe8752a98136d","absentOptional":[]} -->
