# Fix: Race replay button missing with reduce motion

**Type:** Fix
**Status:** verified
**Branch:** fix/race-replay-button-missing-with-reduce-motion

## The problem

On the Standings page's Race tab, an iPhone shows the slider but no "Play season" / "Replay season" button, so the race
cannot be played.

The cause is in `frontend/src/standings/RacePlayback.jsx`:
- The button renders only when `usePrefersReducedMotion()` is false: `{reducedMotion ? null : <button …>}`.
- Playing is also blocked, because `isPlaying = playing && !reducedMotion && value < total`.

iOS reports Settings → Accessibility → Motion → **Reduce Motion** to Safari as `prefers-reduced-motion: reduce`. A phone
with that setting on loses the control entirely. Desktop DevTools' device mode changes only the screen size, not that
setting, so the button shows there.

Reproduced in Playwright on `/2025/standings` → Race with an iPhone profile: one Play/Replay button with no motion
preference, and none with `reducedMotion: "reduce"`. The slider shows in both.

## The fix

Reduce Motion should change how the race moves, not whether it can be played. Playback is started by the user, steps one
round per second and can be paused or scrubbed at any time.

1. **`RacePlayback.jsx`.**
   - The Play / Pause / Replay button always renders.
   - `isPlaying` no longer depends on reduced motion, so Play steps one round per second either way.
   - The `usePrefersReducedMotion` import goes if nothing else in the file uses it.
2. **`RaceView.jsx`.** `frameRace`, the scroll that brings the chart under the playback bar when Play starts, uses
   `behavior: "auto"` (a jump) when reduced motion is on, and `"smooth"` otherwise. This matches `RaceChart`'s own
   follow-scroll, which already does this.
3. **The chart itself needs no change.** The crests' moves are motion transitions, and the app's `MotionConfig
   reducedMotion="user"` already makes them jump instead of glide under Reduce Motion.

Must not break:
- the slider: dragging it still pauses playback;
- Pause, and Replay going back to the start;
- the stage names ("Play Playoffs", "Replay Top 16", …) on staged and grouped races;
- the sticky playback bar, and the existing race layout tests.

## Build steps

- [x] **Show and play the race with Reduce Motion on.** Make changes 1 and 2. In
  `frontend/e2e/standings-race-layout.spec.js`, add a test that emulates `reducedMotion: "reduce"` at phone width:
  - the "Play season" or "Replay season" button shows;
  - clicking it starts playback: the button reads "Pause" and the round badge moves on from the start within a few
    seconds.

  *Done when:* the new test and the existing `standings-race-layout.spec.js` tests pass, and the earlier reproduction
  shows the button with `reducedMotion: "reduce"`.

## Verify

- On the iPhone with Reduce Motion on, open Standings → Race. The "Replay season" button is there, and pressing it plays
  the race round by round, with the crests jumping rather than gliding.
- With `/api/health` reporting `"target":"local"`:
  `cd frontend && npx playwright test standings-race-layout.spec.js`

## Result

- The reproduction now finds one Play/Replay button with `reducedMotion: "reduce"`, as it does without it.
- `standings-race-layout.spec.js`: 10 passed, including the new test "with Reduce Motion on, a phone still shows Play and
  plays the race". The test replays 2025-26 at 390px, waits for the slider to pass round 2, pauses, and checks that the
  button reads "Play season".


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3525,"specSha256":"01cfe44ac877c76efbdafbb989f0fb6a7af1c794af402e8446aa908593916109","branch":"refs/heads/fix/race-replay-button-missing-with-reduce-motion","head":"8a8d8decee48382f86b19cebbebef233801662cb","baseRef":"refs/heads/master","baseCommit":"8a8d8decee48382f86b19cebbebef233801662cb","sourceTree":"6305d2f79b27099de904f7d0afc6094b944e2e42","absentOptional":[]} -->
