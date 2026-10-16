# Fix: Team and player Shooting tabs fit the window

**Type:** Fix
**Status:** verified
**Branch:** fix/team-and-player-shooting-tabs-fit-the-window

## The problem

On the team and player Shooting tabs the half court is drawn up to 46rem (736px) wide, so on a laptop window it is taller
than the screen and its bottom and legend are cut off. The Zones and Style tables beside it use generous row and panel
padding, so the whole tab runs long. Both tabs share `frontend/src/lib/ShootingBreakdown.jsx`.

## The fix

Size the court from the window and tighten the two tables. All changes stay in `ShootingBreakdown.jsx` (used only by the
team and player Shooting tabs); no other page changes.

- **Court sized to the window.** Its width is `min(46rem, max(24rem, 100svh - 8rem))`, so the whole court and its legend
  are in view once scrolled to, never wider than today and never below 24rem. The court column at xl takes the same width
  through a CSS variable, so no blank space is left beside a narrower court.
- **Tighter tables.** The Zones and Style rows use `py-1` instead of `py-2`, the panels `p-3` instead of `p-4`, and the
  note under each table `mt-2` instead of `mt-3`. Text size and columns are unchanged.

Must not break: phone layouts (percentage-only chips on a narrow court, the stacked badges), the zone and situation
columns fitting their panels, and the game Shooting tab (separate code).

## Build steps

1. [x] **Fit the court and tighten the tables.** Apply the sizing and padding above in `ShootingBreakdown.jsx` and add a
   court-fit test to `team-shooting-games-layout.spec.js`.
   - Done when: at 1280x800, 1440x900 and 1920x1080 the whole court is inside the window once scrolled to and is at least
     `min(700, height - 160)`px wide; the team and player shooting layout specs pass; lint passes.

## Verify

- Team page, Shooting tab, then a player's: scroll to the court and see all of it and its legend on one screen.
- The Zones and Style tables read as before, with slightly shorter rows and panels.
- At 390px nothing overflows sideways.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2074,"specSha256":"13453aa00bd7ba21f1f2cb1f02f1b05339da38bee1cb37ca3cf18ca61271d383","branch":"refs/heads/fix/team-and-player-shooting-tabs-fit-the-window","head":"ba23b522e25c634115916a5a172a7375b8bfb0c8","baseRef":"refs/heads/master","baseCommit":"ba23b522e25c634115916a5a172a7375b8bfb0c8","sourceTree":"bb0c2ae108395c996a0281204dd5f9ca28bab0fc","absentOptional":[]} -->
