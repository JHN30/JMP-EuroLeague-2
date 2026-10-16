# Fix: Game Shooting tab shows both teams side by side

**Type:** Fix
**Status:** verified
**Branch:** fix/game-shooting-tab-side-by-side

## The problem

On a game's Shooting tab (`GameDetailPage.jsx`, `ShootingTab`) the shot map and the zone heatmap each drew one big court
with both teams mixed together, so the page was taller than the screen and the teams could not be compared. A third
tab, "Shooting comparison", already had one court per team, but only as a zone heatmap. The Team filter existed only to
split the combined court.

## The fix

Show both teams side by side on every tab, each court as tall as the window leaves room for. Changes are limited to the
game Shooting tab and its specs; `ShootingCourt`, the player and team Shooting tabs, and the zone table are unchanged.

- **Two tabs, two courts each.** "Shot map" shows one marker court per team; "Shooting zones" shows one heatmap court per
  team. Each team panel keeps its 2PT / 3PT / eFG% line, and the legend sits under the pair. The old combined "Zone
  heatmap" tab and the "Shooting comparison" tab are replaced by "Shooting zones".
- **Fit the screen.** Each court is capped at `max(18rem, 100svh - 20rem)` wide, so two panels sit in one window from
  900px tall; panels stack on a phone. Zone chips show made/attempts from 340px court width, the percentage alone below.
- **Filters.** The Team filter is removed (both teams are always shown). Player, Period, Play context and the quarter
  playback work on both tabs; Shot type and Result stay on the shot map only.
- **Zone comparison table stays** below the courts, following the same filters.

Must not break: no page overflow from 320px, the Period select hidden on phones where the quarter buttons replace it, the
TV-code club names on phones, and the player and team Shooting tabs.

## Build steps

1. [x] **Two courts per tab.** Replace the single combined court with `TeamComparisonPanel` per team in both modes, drop
   the Team filter and the combined heatmap, and size the courts from the window height.
   - Done when: on 1280x900 both panels sit side by side inside the window once the tab strip is at the top, on both
     tabs; at 390px they stack with no sideways scroll; lint and build pass.
2. [x] **Update the specs.** `game-shooting.spec.js`, `game-shooting-layout.spec.js` and `tv-codes-layout.spec.js` follow
   the new tab names, the per-team courts and the removed Team filter, and gain a fit-the-window test.
   - Done when: those specs and `responsive.spec.js` pass against the local database.

## Verify

- Open a played game, Shooting tab: Shot map shows two courts side by side, Shooting zones shows two heatmaps, and both
  fit the window at 1280x900.
- Choose a Result or Player filter: both courts update; on Shooting zones the Result and Shot type filters are absent.
- At 390px the panels stack and nothing scrolls sideways.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2890,"specSha256":"47216d3c28194fdc76c3fe842f5b231984f2394dbe8c941cbaf4fc301786a566","branch":"refs/heads/fix/game-shooting-tab-side-by-side","head":"15d33309748fccab335f2d3ed0b3b6f649aa9f5c","baseRef":"refs/heads/master","baseCommit":"15d33309748fccab335f2d3ed0b3b6f649aa9f5c","sourceTree":"4abb7dfcf0c09aa1ba29d0ff6afa50b43c38172f","absentOptional":[]} -->
