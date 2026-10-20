# Fix: Slow the standings Race playback

**Type:** Fix
**Status:** verified
**Branch:** fix/slow-the-standings-race-playback

## The problem

On the Standings page, Race tab, pressing Play advances the race graph too fast.
`RacePlayback.jsx` steps one round every `STEP_MS = 650` ms, and `RaceChart.jsx`
animates each move in 0.6 s (0.35 s when a scrub jumps more than one round), so
the lines barely settle before the next round starts.

## The fix

- Raise `STEP_MS` in `frontend/src/standings/RacePlayback.jsx` from 650 to 1000.
- Lengthen the chart move in `frontend/src/standings/RaceChart.jsx` to match, so
  each move still finishes before the next round: 0.6 s to 0.9 s, and the
  multi-round jump 0.35 s to 0.5 s. The fade (0.25 s) stays.
- Only `RaceView` uses these two components, so no other page is affected
  (confirm with a grep before editing). No new setting or speed control.
- Must not break: Pause, Replay, scrubbing, and the reduced-motion behaviour (no
  Play button).

## Build steps

- [x] 1. **Slow the pace.** Change the three values above.
   *Done when:* Play on the Race tab advances a round about every second and the
   lines finish moving before the next round starts.

## Verify

- Run `cd frontend && npm run lint`.
- Run `cd frontend && npx playwright test` for the standings specs (check `/api/health`
  reports `"target":"local"` first).
- By hand: Standings, Race tab, press Play; the race is visibly calmer, and Pause
  and dragging the slider still work.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":1496,"specSha256":"2b1b960e6b2a8fe46b7657b8453a459de5fef462e19e6a08eb6e005a57e4f1d7","branch":"refs/heads/fix/slow-the-standings-race-playback","head":"788efbe88edbb34851f5649b8cb331d1aba0dc11","baseRef":"refs/heads/master","baseCommit":"788efbe88edbb34851f5649b8cb331d1aba0dc11","sourceTree":"849b575ffbf89470d9b0fe5381211118b1934482","absentOptional":[]} -->
