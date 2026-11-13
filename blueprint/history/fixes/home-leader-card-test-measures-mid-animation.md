# Fix: Home leader-card test measures mid-animation

**Type:** Fix
**Status:** verified
**Branch:** fix/home-leader-card-test-measures-mid-animation

## The problem

`frontend/e2e/home-layout.spec.js` "upcoming games stack and leader cards are a 2x2 grid, with nothing scrolling
sideways" fails at 320px and 390px, on `master` too. The number of distinct card tops it sees varies between runs
(3 or 4, where 2 are expected).

The layout is not broken. The Hot right now cards (`frontend/src/dashboard/HotRightNow.jsx`) enter with the
staggered `listContainer` / `listItem` motion, which slides each card up into place. The test measures the cards'
`getBoundingClientRect()` as soon as they exist:

- **Right away:** the vertical offsets still differ, from `translateY` 0.4px to 10px (tops 2978, 2979, 3185, 3190).
- **About 300ms later:** they have settled into a clean 2x2 grid (tops 2976, 2976, 3179, 3179).

The probe ran at 390px on the live local season. The lefts are unaffected, because the entrance only moves cards
vertically.

## The fix

- Measure after the entrance settles. Poll the distinct-top count with `expect.poll` until it is 2, with the
  default timeout, instead of reading it once.
  - A real layout break still fails, because the poll times out.
  - The card count (4) and the distinct-left count (2) checks stay as they are.
- Test-only change. No app change, because the animation and the layout are correct.
- Keep the change to this test. Other tests in the file don't measure the leader cards' tops.
- **Must not break:** the test's other checks, which are the upcoming cards in one column, no sideways scroll in
  the two rows, and no page-wide sideways scroll.

## Build steps

1. [x] **Poll the leader-card rows** (`frontend/e2e/home-layout.spec.js`). Done when the test passes at 320px and
   390px on 5 repeated runs (`--repeat-each 5`).
   - Done also needs a check that the poll still fails when the grid really breaks. Temporarily expect 3 rows: the
     test must fail.
   - As built: expecting 3 rows passed, because the cards really do pass through 3 distinct tops mid-entrance. The
     negative check used 5 instead, a count the four cards can never reach, and it failed as it should ("Expected: 5,
     Received: 2"). A broken grid (for example one column) has 4 tops at every moment, so it can never satisfy 2.

## Verify

- With `/api/health` reporting `"target":"local"`, run `npx playwright test home-layout.spec.js` (the whole file)
  and the target test with `--repeat-each 5`.
- `cd frontend && npm run lint` passes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2615,"specSha256":"3e6b97b223ceca7c7b434a8188ef38da349bd0338e450324ebd439547ef5d041","branch":"refs/heads/fix/home-leader-card-test-measures-mid-animation","head":"34540e485943333bb77f442cd7bfb30197113afb","baseRef":"refs/heads/master","baseCommit":"34540e485943333bb77f442cd7bfb30197113afb","sourceTree":"595fa5d856bdff96b1b118ce9fe0c60763978cb2","absentOptional":[]} -->
