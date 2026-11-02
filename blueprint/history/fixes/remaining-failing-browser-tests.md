# Fix: Remaining failing browser tests

**Type:** Fix
**Status:** verified
**Branch:** fix/remaining-failing-browser-tests

## The problem

The full browser run after `pre-existing-failing-browser-tests` still had seven failures (local DB, 2026-11-02):

| Spec | Test | Cause |
|---|---|---|
| `grouped-four-groups.spec.js` | 2008, 2009, 2010, 2011: "Overview, team Leaders and Compare keep the group wording and the unavailable-rating note" | `getByText(/played in separate groups/)` matches two texts on the Teams leaders view, the page note and the empty Net rating card ("Not available for this phase: the clubs played in ..."), so strict mode fails |
| `progressive-disclosure.spec.js` | "loads a player game log once ... and requests player pages in blocks of 36" | `players-list-with-weight-and-age-...` (dfba8bd) changed the Players list page size from 36 to 60; the test still expects 36 and a total of 72 |
| `standings-view-controls.spec.js` | "the Advanced tab has a Scope and Round row ..." | The app is right (after a scope change the Round select shows the new scope's last round: 47 of 47 for "All games"); the test reads the options as soon as a table is visible, before they change, so it compares with the old scope's 38 |
| `standings-race-layout.spec.js` | "where the chart cannot fit, the page follows the focused team while the race plays" | Failed once in the full run; passed 4 of 4 alone. It samples every 1.3s whether the focused crest is on screen while the page follows it |

## The fix

Test changes only, unless step 2 finds an app defect.

1. **Stale and racing tests.**
   - Grouped seasons: check the page note ("Clubs in this phase played in separate groups ...") and the card's "Not
     available for this phase" text as two separate expectations, so the test still proves both.
   - Players list: pages of 60 (the mock's total 120); the request checks become `{ offset: 0, limit: 60 }` and
     `{ offset: 60, limit: 60 }`, and the test's name says 60.
   - Round select: after a scope change, wait until the select's value is the last of its current options (polled), not
     the last of options read once.
2. **Race chart.** Reproduce under load (with the other standings specs, repeated) and record the cause before changing
   anything; repair it in the test, or in the app if the follow really falls behind. If it does not reproduce after a fair
   try, say so and leave the test unchanged.

Must not break: what each test proves.

## Build steps

- [x] 1. **Stale and racing tests.** Done when the four `grouped-four-groups` tests, the `progressive-disclosure` test and
   the `standings-view-controls` test pass.
- [x] 2. **Race chart.** Done when its cause is recorded here and `standings-race-layout.spec.js` passes three runs in a
   row alongside the other standings specs (or it is reported as not reproduced).

## Verify

- Local DB only (`/api/health` says `"target":"local"`).
- `cd frontend && npx playwright test grouped-four-groups.spec.js progressive-disclosure.spec.js standings-view-controls.spec.js standings-race-layout.spec.js`
- Then the full suite once (`npm run test:browser`), reporting anything else it shows.

## Implementation notes

- **Grouped seasons:** the two texts are now two expectations: the page note ("Clubs in this phase played in separate
  groups ...") and the Net rating card's "Not available for this phase: the clubs played in separate groups ...". The
  Compare check later in the test already matched one text and is unchanged.
- **Round select:** the check reads the options before the switch and polls until they have changed and the value is the
  last of them (polling "value is the last option" alone would also pass on the old scope's options).
- **Race chart, cause:** a test timing assumption, not the app. Play goes back to the season start, where every crest is
  drawn at opacity 0, and the page follows the focused crest from the first round shown. Under load (other standings specs
  in parallel, or a 6x CPU throttle) that first round came more than 1.3s after Play, so the first check measured the hidden
  crest, which sits just below the window after Play frames the chart (top 323 in a 320px window); from the next round on
  the follow kept it on screen in every logged run. Two app changes were tried and reverted (re-checking the follow on every
  round, and after Play's framing scroll ends): neither helped, because nothing is visible to follow at the season start.
  The test now starts its checks once the replay has two rounds on the chart (the slider below the value it had before
  Play and at least 2). Reproduced 2 of 3 loaded runs before; 0 of 6 after.
- Step 1 specs: 28/28. All seven standings specs together: 60/60 three runs in a row.
- Full suite after the fix: 1,192 passed, 1 failed: `compare-player-layout` "the Trends charts fit ..." at 768px, a chart
  canvas still outside its panel 20s after the window narrowed (the known Compare Trends flake; not in this fix's scope).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5068,"specSha256":"652ce836b59b716147648130f6a33808573bd0c5c8bae3f68774ae81a8b53e9f","branch":"refs/heads/fix/remaining-failing-browser-tests","head":"98699382ef6f456c97ce900efb01a46e61001700","baseRef":"refs/heads/master","baseCommit":"98699382ef6f456c97ce900efb01a46e61001700","sourceTree":"37dc7b4c2ce02db3d6bdfa0245adb8c4bc79b754","absentOptional":[]} -->
