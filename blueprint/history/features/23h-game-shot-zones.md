# Feature: Game shot zones

**From build-plan:** feature 23h
**Build attempt:** 1
**Branch:** feature/game-shot-zones
**Status:** verified

## Goal

Give the game's Shooting tab real shot zones and a correct court. Zones are derived in the browser from each shot's
court coordinates (hoop at the origin, centimetres, as the feed supplies them) into 14 named zones, shown beside the
court as a two-team comparison of shot share and FG% per zone. The court is redrawn to true FIBA proportions at one
SVG unit per centimetre, laid out horizontally (baseline on the left, half-court line on the right), scaling with its
container. Only one half court is drawn; a shot taken past the half-court line is plotted on the line and its hover
text says where it was really taken from. Shots with no usable coordinates are counted as a gap, not placed anywhere.

## In scope

- **FIBA court.** Measured in cm from the hoop, +y toward the half-court line, +x toward the shooter's right:
  - sidelines at x = ±750; baseline at y = -157.5; half-court line at y = 1242.5 (court half is 1,400 x 1,500);
  - lane x = ±245 from the baseline to the free-throw line at y = 422.5; free-throw circle radius 180 (solid beyond the
    line, dashed inside the lane);
  - restricted-area arc radius 125 with 37.5 cm straight ends running toward the baseline;
  - three-point line: straight segments at x = ±660 from the baseline to y = sqrt(675^2 - 660^2) (about 141.7), then the
    arc of radius 675 around the hoop;
  - backboard 180 wide at y = -37.5, rim radius 22.5 at the origin, centre circle radius 180 (the half that lies in
    this half court).
  The old drawing is wrong on four of these (key depth 580, baseline -197.5, half-court 1282.5, width 1580) and is
  replaced, not adjusted. The data agrees with the FIBA numbers (x reaches ±740, y starts near -125, the shortest
  three is about 671).
- **Layout.** Landscape: hoop on the left, y runs left to right, x runs bottom to top (shooter's right is up, since
  the shooter faces the hoop). One SVG, `viewBox` in cm including a 20 cm margin and a 100 cm "Backcourt" strip outside
  the half-court line (`-177.5 -770 1555 1540`), `width: 100%`, `height: auto`, centred, with a `max-width` of the
  viewBox width in pixels (the court itself is 1,400 x 1,500 px at 1 px = 1 cm at most) and never taller than 90% of
  the window, so the whole court fits on screen and shrinks proportionally with the container and window. No watermark. A half court is 14 x 15 m, so the picture stays close to
  square; what changes is the orientation.
- **14 zones**, by shot position and the feed's 2-point/3-point flag (the same flag the box score uses):
  1. Restricted area: distance from the hoop <= 125, or behind the hoop (y < 0) with |x| <= 125.
  2. In the paint (non-restricted): |x| <= 245 and y <= 422.5, outside the restricted area.
  3. Mid-range, outside the paint, split by angle `a = atan2(max(y, 0), |x|)` measured from the baseline direction:
     a < 36 degrees corner, 36 to 72 wing, 72 to 90 central: Left/Right corner mid-range, Left/Right wing mid-range,
     Central mid-range (left and right by the sign of x).
  4. Threes: Left/Right corner 3 (y <= 141.7); otherwise Left/Right wing 3 (a < 72) or Top of the key 3 (a >= 72).
  5. Deep 3: a three at 914 cm (30 ft) or more from the hoop.
  6. Backcourt: any shot with y > 1242.5. This is checked first, then Deep 3, then the rest.
- **Zone comparison table** in its own full-width panel below the Shooting studio panel, where `ZoneSummary` was,
  replacing `ZoneSummary`:
  one row per zone in the order above, per team the share of its located shots and FG% (made-attempts as the hover
  or small text), an em dash when a zone has no attempts, and a final "Location unknown" row with each team's shots
  that could not be placed. It follows the tab's filters (team, player, shot type, period, result, play context).
  It shows in every mode except Shooting comparison, which keeps its two team panels.
- **Zone heatmap** on the court: the 13 on-court zones drawn as tiled regions that partition the half court (the
  lane minus the restricted area, the mid-range and three-point sectors cut by the same 36 and 72 degree rays, the
  corner threes, Deep 3 beyond 914 cm) plus the Backcourt strip. A zone with attempts is filled by the existing
  efficiency ramp (the primary colour, more opaque the higher the FG%) and carries a chip with made/attempts and FG%;
  a zone without attempts is left unfilled and unlabelled. The legend drops "Size represents volume".
- **Beyond half court.** A backcourt marker is drawn on the half-court line at its own lateral position. Every
  marker's hover text gives player, result, 2PT/3PT, zone and distance from the hoop (metres, one decimal); a
  backcourt marker's text adds "past the half-court line" and its real distance from the baseline.
- **Unusable coordinates.** A shot is not placed when either coordinate is missing or not a number, or both are -1
  (the feed's "no location" value; 5 shots in E2025). It is not drawn, not in any zone, and counts in "Location
  unknown". The header badge reports plotted shots (the located ones) and, when any are missing, how many have no
  location. "Box score matched" still compares all field-goal attempts with the box score.
- **Shared consumers.** `ShootingCourt` and `shotZones` are also used by the Team and Player season shot charts and by
  Shooting comparison. They get the new court and zones; the season chart's "Zone efficiency" list shows the
  14 zones. No other change to those pages.

## Out of scope

- Any backend or API change: the shots endpoint already returns `coordX`/`coordY`. No new table. `app_game_team_shot_zones`
  (the feed's A to J letters) is not read; it is only a development cross-check of totals.
- Season or per-game zone trends on the Team page (a later reuse), zone-based filters.
- Shot-clock or defender data, free throws, and any new filter.
- The Game flow, Rotations and other tabs; the player and team pages other than the shared court look.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`. Build the steps
in order, running each step's check as you go, then present one review packet after the last step. No per-step
approval pauses and no checkpoint commits; `/complete` makes the final commit.

## Build steps

- [x] **1. Zones and court geometry.** Rewrite `frontend/src/lib/shotZones.js` with the FIBA constants, the 14 zones
  in display order, `hasLocation(shot)`, `classifyShotZone(coordX, coordY, isThree)`, `summarizeZones(shots)` (rows
  `{ zone, attempts, made }` for located shots only, so existing callers keep working), `countWithoutLocation(shots)`,
  and the mapping from data coordinates to the landscape SVG frame. Use one set of constants for the classifier and the
  court so they cannot drift. *Done when* `cd frontend && npm run lint` and `npm run build` pass, and a scratch Node
  script (not committed) returns the zones in the table under Data / contracts, and over all E2025 shots returns
  51,750 shots in total with 5 without location, 62 Backcourt, 435 Deep 3 and 8,942 Restricted area.
- [x] **2. Court renderer.** Rework `frontend/src/lib/ShootingCourt.jsx`: the horizontal FIBA court at 1 unit = 1 cm,
  responsive sizing, markers (made circles, missed crosses, replay highlight) placed with the shared mapping and
  clamped to the half-court line, the new hover text, unplaceable shots skipped, and the 14-anchor heatmap bubbles.
  Keep the component's props. *Done when* lint and build pass and, in a Playwright run against the mocked Shooting
  tab, the court matches the geometry above (checked in step 4).
- [x] **3. Zone table and header.** In `frontend/src/games/GameDetailPage.jsx` replace `ZoneSummary` with the
  two-team zone comparison (a small component in its own file, `ZoneComparison.jsx`, using plain table markup like the
  other tables), put it beside the court in the Shot map and Zone heatmap modes (grid at `xl`, stacked below), keep it
  below the replay in Replay mode, drop the old panel, and update the header badge for unlocated shots. Update the
  season chart's zone list in `frontend/src/lib/SeasonShootingChart.jsx` only if its markup needs it. *Done when* lint
  and build pass and the table's rows change with the filters.
- [x] **4. Browser tests.** Add `shots` and `shotsStatus` options (default: no shots) and a shots route to
  `frontend/e2e/support/game-fixtures.js`, and add `frontend/e2e/game-shooting.spec.js` covering: the court's
  `viewBox`, aspect ratio and no page scroll at 1280 and 600 px wide; one crafted shot per zone landing in the right
  table row; a shot in each of the 14 zones plotted at the expected position (hoop left, shooter's right up); a
  backcourt shot drawn on the half-court line with its true distance in the hover text; the "Location unknown" row
  and the badge for a `(-1,-1)` shot; a filter changing the table; and the empty state. *Done when* `cd frontend &&
  npm run test:browser` passes.
- [x] **5. Shared consumers.** Confirm the Team and Player season shot charts and the Replay and Shooting comparison
  modes render with the new court. *Done when* lint, build and the browser tests pass and one live Playwright run
  against the running dev servers shows a Team page season shot chart and a game's Shot map with no console errors
  (screenshots kept in the scratch folder, not committed). If the dev servers are not running, say so instead of
  claiming this.
- [x] **6. Review changes.** After the first review the owner asked for: the watermark removed; the zone table
  back below the studio panel; the court sized so it is not taller than the window (a half court is 14 x 15 m, so
  the drawing is nearly square either way); and the heatmap drawn as zone regions like a basketball shot-chart
  (NBA.com style) instead of bubbles, with the FG% shown as fill opacity in the existing primary ramp and a made/attempts
  chip in each zone. Update `ShootingCourt.jsx` (regions, backcourt strip, no watermark, height cap),
  `HeatmapLegend.jsx`, `GameDetailPage.jsx` (table placement) and the browser tests. *Done when* lint, build and
  `npm run test:browser` pass and a live Playwright run of the Zone heatmap on a game and on a Team page shows the
  regions and no console errors.
- [x] **7. Second review changes.** The owner asked for: the court drawn at its true size (1,400 x 1,500 px at 1 px =
  1 cm, as wide as its container allows) instead of the 88%-of-window cap added in step 6, and the Replay mode of the
  Shooting tab removed (the `ReplayPanel`, its tab and the marker highlight and select props that only it used). *Done
  when* lint, build and `npm run test:browser` pass, the Shooting tab has Shot map, Zone heatmap and Shooting
  comparison only, and a live Playwright run shows the court filling its panel with no console errors.
- [x] **8. Third review changes.** The owner asked for the court to shrink to fit the window height again (90% of the
  window, replacing step 7's uncapped size) and for the zone table to span the whole panel (full width, centred
  numeric columns). *Done when* lint, build and `npm run test:browser` pass and a live Playwright run shows the
  court within the window height and the table at panel width with no console errors.
- [x] **9. Fourth review changes.** The owner asked for the Shot type and Result selects to appear on the Shot map
  only: a heatmap of misses is all 0% and of makes all 100%, and the zones already separate twos from threes. They are
  hidden in Zone heatmap and Shooting comparison, and a value chosen on the shot map does not filter there. *Done when*
  lint, build and `npm run test:browser` pass.
- [x] **10. Fifth review changes.** The owner asked for a bigger zone-table text that still fits the screen (single-line
  FG% with made-attempts beside it, tighter rows: the panel is 652 px tall) and for the Play-by-play rows to get side
  padding and a fixed crest column so every score lines up on the right. The Play-by-play fix is a separate bug found
  during review and is recorded in `blueprint/history/fixes/play-by-play-row-padding-and-alignment.md`. *Done when*
  lint, build and `npm run test:browser` pass and a live run shows both screens with no console errors.

## Files / areas

- `frontend/src/lib/shotZones.js`, `frontend/src/lib/ShootingCourt.jsx`, `frontend/src/lib/SeasonShootingChart.jsx`
  (zone list only).
- `frontend/src/games/GameDetailPage.jsx` (`ShootingTab`, `ZoneSummary`, `TeamComparisonPanel`, `ReplayPanel`), new
  `frontend/src/games/ZoneComparison.jsx`.
- `frontend/e2e/support/game-fixtures.js`, new `frontend/e2e/game-shooting.spec.js`.
- Reused, unchanged: `chartHelpers` (`efficiencyRamp`), `TabStrip`, `LabelledSelect`, `Panel`, `PanelHeader`,
  `format.js`, `getShots`.

## Data / contracts

**Shot input** (existing `GET /api/seasons/:seasonCode/games/:gameCode/shots`, unchanged): `shotOrdinal`, `clubCode`,
`personCode`, `playerName`, `actionCode` (`2FGM`, `2FGA`, `3FGM`, `3FGA`), `coordX`, `coordY` (numeric, read with
`Number()`), `minute`, and the play-context flags. Coordinates are centimetres from the hoop. Checked in Neon for E2025
and E2026: 51,750 E2025 field-goal attempts, none with a null coordinate, x within ±740, y from -125 to 1304, five
`(-1,-1)` shots with an empty feed zone, no shot beyond the sidelines. The feed's A to J zone letters are not used.

**Zone names** (display order): Restricted area, In the paint, Left corner mid-range, Left wing mid-range, Central
mid-range, Right wing mid-range, Right corner mid-range, Left corner 3, Left wing 3, Top of the key 3, Right wing 3,
Right corner 3, Deep 3, Backcourt.

**Classifier check table** (x, y, three?): expected zone.

| x | y | three | zone |
|---|---|---|---|
| 0 | 50 | no | Restricted area |
| 0 | -30 | no | Restricted area |
| 200 | 300 | no | In the paint |
| 245 | 400 | no | In the paint |
| 0 | 500 | no | Central mid-range |
| 400 | 100 | no | Right corner mid-range |
| -400 | 100 | no | Left corner mid-range |
| 350 | 350 | no | Right wing mid-range |
| -350 | 350 | no | Left wing mid-range |
| 700 | 50 | yes | Right corner 3 |
| -700 | 50 | yes | Left corner 3 |
| 500 | 480 | yes | Right wing 3 |
| -500 | 480 | yes | Left wing 3 |
| 100 | 700 | yes | Top of the key 3 |
| 0 | 950 | yes | Deep 3 |
| 300 | 1250 | no | Backcourt |
| -1 | -1 | either | no location |

**Measurements.** Court dimensions follow FIBA's rules (28 x 15 m court, basket centre 1.575 m from the baseline, free
throw line 5.80 m from the baseline, lane 4.90 m wide, restricted area radius 1.25 m, three-point line 6.75 m with
straight parts 0.90 m from the sideline, backboard 1.80 m wide and 1.20 m from the baseline, centre circle radius 1.80
m), checked against the web on 2026-10-02 (Wikipedia's Basketball court page and a general dimensions search). FIBA's
own PDF could not be read as text, so the 4.90 m lane width, the 0.375 m restricted-area ends and the backboard
position come from the rulebook as remembered, not from a fetched source; they are constants in one place.

## Testing

- No unit-test command exists. The classifier is checked by a scratch Node script against the table above and against
  E2025 totals from the real database (step 1); that evidence is not committed.
- Browser tests (Playwright, mocked API) in step 4 are the evidence for the UI. Live evidence is claimed only if step 5
  ran against the dev servers.
- `cd backend && npm run build`, `cd frontend && npm run lint` and `npm run build` pass before review (all three passed
  at the start of this feature; no backend file changes).

## Notes for the AI

- The data frame is (coordX, coordY) with the hoop at the origin; the screen frame is `sx = coordY`, `sy = -coordX`
  (a quarter turn). Do the mapping in one function and draw the court lines inside one group with the equivalent
  transform; text (zone labels, the zone chips) is positioned in screen coordinates, never inside the
  rotated group.
- Sign convention: +x is the shooter's right, as the old renderer already assumed. If the feed turns out to be the
  other way round, flip the sign in the one mapping function and in the left/right names.
- Keep stroke widths in cm units (5 for court lines) so the drawing scales as one picture; markers keep a fixed size in
  cm (about 18 radius) so they stay readable when the chart shrinks.
- Percentages from shot counts are `made / attempts`, em dash at zero attempts, never 0%. Shares are over a team's
  located shots.
- The zone table must work with one or both teams missing from the filtered shots; a team with no shots shows dashes.
- Hover text is plain `<title>` text, as today; markers with a handler keep their keyboard behaviour.
- Do not touch the backend or the pipeline tables. The A to J letters stay unused.
- Only seasons E2025 and E2026 have per-game data in the app, so a live check uses those.

## Open questions

All three were reviewed and accepted by the owner before implementation; the 23h build-plan line was amended to match.

- **Angle and distance cut-offs.** Mid-range and wing/top-of-the-key boundaries are 36 and 72 degrees from the
  baseline direction (the same radial lines cut both the mid-range and the three-point area), and Deep 3 starts at 30
  ft (914 cm), as in your list. These are constants in `shotZones.js`; say if you want other numbers, for example a
  wider top of the key. Not blocking.
- **Left/right convention.** "Left" and "right" are the shooter's, facing the basket, with the feed's +x taken as right.
  I could not verify the feed's sign from the data alone. Not blocking: one sign in one function.
- **Plan wording.** The 23h line in the build plan describes the zones but not the court rebuild or the season-chart
  side effect. Not blocking; say if you want the line amended.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":18174,"specSha256":"d01af385196d3df657c95cd821404dd0857c5fc009c79680230bd78197ac992a","branch":"refs/heads/feature/game-shot-zones","head":"f8b4c4fdfffc2052fe48c774a7c7411f19c9ceb1","baseRef":"refs/heads/master","baseCommit":"f8b4c4fdfffc2052fe48c774a7c7411f19c9ceb1","sourceTree":"b1544ffc7696801b37005ca682a03665c496e946","absentOptional":[]} -->
