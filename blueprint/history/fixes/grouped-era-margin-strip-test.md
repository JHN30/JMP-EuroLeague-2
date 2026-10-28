# Fix: Grouped-era margin strip test

**Type:** Fix
**Status:** verified
**Branch:** fix/grouped-era-margin-strip-test

## The problem

`frontend/e2e/grouped-thirty-two.spec.js`, "Team Games margin strip excludes the forfeit and results label it", fails
for 2001 and 2003. It opens `/:season/teams/TEL?phase=TS`, but it computes the expected average margin and the W-L record
from TEL's games in every phase (`clubGames(request, season, "TEL", null)`). Its comment says "The strip covers the whole
season, every phase."

Since `9e8e128` (fix: team page tabs follow the stage tabs), the team Games tab covers only the selected stage. The page
correctly shows the Top 16 alone:

| Season | TEL's Top 16 (`TS`) | Page shows | Test expects (every phase) |
| --- | --- | --- | --- |
| 2001 | 6 games, 1 forfeit | 4-2, +7.6 average margin | +5.4 |
| 2003 | 6 games, 1 forfeit | the `TS` figures | +8.1 |

The test is stale, not the app.

## The fix

- Compute the expected margin and record from TEL's `TS` games (`clubGames(request, season, "TEL", "TS")`).
- Update the comment to say the strip covers the selected stage.
- Keep every check:
  - the forfeit is excluded from the margin;
  - the forfeit note and the "Forfeit" result label show;
  - the record still counts the forfeit.
- Also keep the guard that exactly one of the games is a forfeit, so the test still proves the exclusion.

No app change. This fix doesn't cover the other failure the full run found: the `grouped-pages` SRS card in 2012-2015.
That is left until the user checks whether it belongs in the warehouse or the app.

## Build steps

- [x] 1. **Point the margin strip test at the selected stage.**

  **Done when:**
  - `grouped-thirty-two.spec.js` passes for 2001 and 2003 on the local target.
  - Frontend lint passes.

## Verify

- Run `cd frontend && npx playwright test grouped-thirty-two.spec.js` with `/api/health` reporting `"target":"local"`.
  All tests pass.

## Result

- The test now reads TEL’s `TS` games, and its comment says the strip covers the selected stage. Every check is kept,
  including the guard that exactly one game is a forfeit.
- `grouped-thirty-two.spec.js` on the local target: 17 passed, 0 failed (2001 and 2003 included).
- Frontend lint passes. No app code changed, so the build is unaffected.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2304,"specSha256":"a4ed61f22853c6a07f73259c7acc7f5f30e2fb54bc33557aeaee5dbcd9863243","branch":"refs/heads/fix/grouped-era-margin-strip-test","head":"7d4c0054f1f95654a1aef02db5cb4909eb5f1a37","baseRef":"refs/heads/master","baseCommit":"7d4c0054f1f95654a1aef02db5cb4909eb5f1a37","sourceTree":"8fc3beb55f50b9ce13bba4c07b061658e7e462d3","absentOptional":[]} -->
