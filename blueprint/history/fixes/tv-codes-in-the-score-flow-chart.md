# Fix: TV codes in the Score flow chart

**Type:** Fix
**Status:** verified
**Branch:** fix/tv-codes-in-the-score-flow-chart

## The problem

On the game page's Overview tab, the Score flow chart labels the two teams with
their permanent club code (for example ULK for Fenerbahce) instead of the code
the club uses that season (its TV code, FBT). The club code often looks outdated.

## The fix

- In `frontend/src/games/gameFlow.jsx`, build the two chart labels with the
  existing `teamCode` helper (`gameUtils.js`): TV code, then abbreviated name,
  then club code.
- Only the chart's team labels change; the margin readout and aria label keep
  using the full team names. No new helper or setting.

## Build steps

- [x] 1. **Use the TV code in the chart labels.** Replace the two `clubCode` labels
   with `teamCode(localTeam)` and `teamCode(roadTeam)`.
   *Done when:* the Score flow chart labels show the season's TV codes.

## Verify

- `cd frontend && npx eslint src/games/gameFlow.jsx` passes (done).
- By hand: open a game, Overview tab; the two labels on the Score flow chart show TV
  codes (for example FBT, not ULK).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":1132,"specSha256":"4821a532cd2e929694934c75f82ccf1aab9a286f6e952e59511a35602fb46e4b","branch":"refs/heads/fix/tv-codes-in-the-score-flow-chart","head":"249d0ecf3ab5976aa260d7bd1c5a9fd3dce4a5d8","baseRef":"refs/heads/master","baseCommit":"249d0ecf3ab5976aa260d7bd1c5a9fd3dce4a5d8","sourceTree":"5c82b36724a4bfcc1bbf21fbcdb4f893ca77ed9c","absentOptional":[]} -->
