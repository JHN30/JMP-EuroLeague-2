# Fix: Shot chart sides mirrored

**Type:** Fix
**Status:** verified
**Branch:** fix/shot-chart-sides-mirrored

## The problem

Every shot marker on the shot map and every zone's numbers on the zone map are
drawn on the wrong side of the court, mirrored across the line through the
basket. The Left/Right zone names are swapped too. The court is symmetric, so
nothing looks broken until you compare with EuroLeague's own chart.

The feed's `COORD_X` is negative on the **shooter's right** (facing the basket).
Our code assumes the opposite:

| Where | Now | Should be |
|---|---|---|
| `frontend/src/lib/shotZones.js` header comment | "+x toward the shooter's right" | +x toward the shooter's left |
| `classifyShotZone` | `coordX < 0 ? "Left" : "Right"` | `coordX < 0 ? "Right" : "Left"` |
| `toScreen` | `{ x: coordY, y: -coordX }` | `{ x: coordY, y: coordX }` |
| `ShootingCourt.jsx` `QUARTER_TURN` (court lines, zone fills) | `matrix(0 -1 1 0 0 0)` | `matrix(0 1 1 0 0 0)` |
| `zoneShapes.js` | the +x shapes are named Right, label points put Right on +x | the +x shapes are Left; Right is the mirrored copy |
| `e2e/support/game-fixtures.js` comment | "+x toward the shooter's right" | +x toward the shooter's left |

**Evidence (checked on 2026-10-21 against `live.euroleague.net/shootingchart`,
the iframe behind the euroleaguebasketball.net Shooting chart):**

- Game 59 (Virtus Bologna–Baskonia, E2026). The official landscape chart places
  the home team's shots at `cx = COORD_Y·k + 56`, `cy = COORD_X·k + 218`: the hoop
  on the left and negative `COORD_X` at the **top**. The away team is drawn at
  the other basket, turned 180° (`cx = 800 − …`, `cy = −COORD_X·k + 218`). The
  phone layout puts the hoop at the top with `cx = −COORD_X·k + 195`. We draw
  negative `COORD_X` at the bottom, so we are mirrored. Example: Wendell Moore's
  made corner three (06:11, Q4, `COORD_X −658`) is at the top on EuroLeague's
  chart and at the bottom on ours.
- Games 55 (Bešiktaš–Bayern) and 60 (Panathinaikos–Hapoel) use the same template.
- Our stored coordinates match the official Points feed exactly for games 59
  (129/129 field goals) and 60 (122/122). The defect is only in how we draw them.

## The fix

One mapping for everything. Our layout keeps the hoop on the left for both
teams, each on its own half court. That matches EuroLeague's home-team view,
and its 180° turn of the away team's half.

- `shotZones.js`: correct the frame comment; `classifyShotZone` names
  `coordX < 0` Right; `toScreen` returns `{ x: coordY, y: coordX }`. Update its
  comment, which is no longer "a quarter turn": the drawing is the feed frame
  with x and y swapped.
- `ShootingCourt.jsx`: the court-lines and zone-fills transform becomes
  `matrix(0 1 1 0 0 0)`, the same mapping as `toScreen`. Rename `QUARTER_TURN`
  (for example `FEED_TO_SCREEN`) and correct the comments at the top of the file.
- `zoneShapes.js`: the shapes built on +x are the shooter's **left** zones and
  their mirror images are the right zones. Swap the Left/Right assignments in
  `ZONE_SHAPES` (rename `rightSide` to `leftSide`) and swap the x signs in
  `ZONE_LABEL_POINTS`. The geometry does not change.
- Nothing else changes. On screen the Right zones stay at the top and Left at
  the bottom; only which shots land in them flips. Stored data, the API, the
  zone geometry, the zone list and its order, and the Backcourt strip stay as
  they are. The game page and the player and team Shooting pages
  (`ShootingBreakdown`) all go through these modules, so they are all fixed
  together.

## Build steps

- [x] 1. **Use the feed's real side convention.** Make the `shotZones.js`,
  `ShootingCourt.jsx`, `zoneShapes.js` and fixture-comment changes above. Update
  the e2e tests that encode the old convention:
  - `game-shooting.spec.js`: flip the x signs of the Left/Right rows in
    `ZONE_SHOTS`.
  - Rewrite the "hoop on the left and the shooter's right at the top" test to
    pin the side. A shot at `COORD_X = -400, COORD_Y = 300` must be drawn in the
    top half (`cy < 0`, `cx = 300`), and its zone name must contain "Right".
    `+400, 300` mirrors it: bottom half, "Left".
  - The Backcourt marker's expected `cy` becomes `100` for `COORD_X = 100`.
  - `game-shooting-layout.spec.js`: flip the x signs on lines 247–248 so the
    comments still name the right zones.

  *Done when:* in the running app, game 59's Virtus shot map shows Moore's
  corner threes (`COORD_X −658/−652`) at the top, as on EuroLeague's chart, and
  the zone map puts Virtus's three Right-corner/Right-wing attempts on the
  top side.

## Verify

- `cd frontend && npm run lint` and `npm run build` pass.
- Browser tests (`/api/health` must report `"target":"local"`):
  `cd frontend && npx playwright test game-shooting.spec.js game-shooting-layout.spec.js player-shooting-games-layout.spec.js team-shooting-games-layout.spec.js`.
- **Side-by-side comparison with EuroLeague, games 55, 59 and 60 (E2026), both
  teams.** A throwaway script in the scratchpad, not committed, reads every
  marker on our game page (local DB) and the official chart's template. It
  checks that each located shot is drawn on the same side as on EuroLeague's
  chart: `sign(cy) = sign(COORD_X)` on our court, matching the official
  home-team chart and the away team's 180° turn. It also checks that each
  zone's Left/Right name follows the shooter. Expect zero mismatches.
- **Zone totals unchanged:** for the same three games, every located shot falls
  in exactly one zone, and each team's zone total matches its located-shot
  count before and after the fix. Mirrored pairs swap counts, for example Left
  corner 3 ↔ Right corner 3.
- By hand: open game 59 and EuroLeague's Shooting chart side by side and
  compare corner threes for both teams, on the shot map and the zone map.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5864,"specSha256":"37daa12e2b9155d43cc1fc73f70895d24cf1284ceb93c212a81e8c9a0d356329","branch":"refs/heads/fix/shot-chart-sides-mirrored","head":"44a1ba82265fb3456e2473552f2565c988171d87","baseRef":"refs/heads/master","baseCommit":"44a1ba82265fb3456e2473552f2565c988171d87","sourceTree":"c497a69d0ffc7c443321504ca8a629abacb54a27","absentOptional":[]} -->
