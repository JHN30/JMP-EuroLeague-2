# Feature: Shooting studio modes

**From build-plan:** feature 18d
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/shooting-studio-modes`

## Goal

Turn 18c's single-mode shot map into the guideline's "shooting studio": a
mode-switcher tab strip adding a zone heatmap, a team-comparison view, and a
made-shot replay, plus a quarter-playback bar with its reduced-motion
"Next quarter" behavior, per `UI-UX.md` §6.8.

## Design reference

`UI-UX.md` §6.6 (`efficiencyRamp`/heatmap description, lines ~711-722) and
§6.8 `GameShootingChart` (lines ~756-799) for the four modes, quarter
playback, and reduced-motion fallback.

## In scope

- A mode tab strip above the existing filters: Shot map (18c, unchanged),
  Zone heatmap, Team comparison, Replay. Reuse the existing `TabStrip`
  component already used for the game's own tab bar.
- `frontend/src/lib/chartHelpers.js`: add `efficiencyRamp(percentage)` - a
  five-stop sequential ramp from a desaturated neutral (under 30%) to the
  full saturated primary color (60%+), built with `color-mix()` over
  `--color-primary`/`--color-base-300` so it re-themes automatically; no
  red/amber/green, single hue family, colorblind- and greyscale-safe. Export
  the stop thresholds/labels for a legend.
- `frontend/src/lib/HeatmapLegend.jsx` (new): five labelled swatches from
  the ramp, plus "Size represents volume".
- Extend `ShootingCourt.jsx`'s existing `mode="heatmap"` branch (the prop
  already exists from 18c, unused until now): one bubble per zone at a fixed
  anchor point, radius scaled by attempt volume (relative to the busiest
  zone in view), fill from `efficiencyRamp` on that zone's make percentage,
  a `<title>` tooltip with zone/attempts/percentage.
- Team comparison mode: two side-by-side panels (crest, name, made-attempted
  and effective-FG mini metrics, that team's own heatmap), built from the
  same already-fetched shots split by `clubCode`; hides the team filter
  while active (comparison implies both teams).
- Replay mode: reveal made shots one at a time in chronological order, a
  counter ("12/48"), the current shot's player/period/clock/value, the
  running score, a range scrubber, and Play/Pause/Replay (auto-advance
  850ms per make) that becomes "Next make" under
  `usePrefersReducedMotion` - mirror `RacePlayback.jsx`'s established
  playback/reduced-motion pattern, don't invent a second one.
- Quarter playback bar (Shot map and Zone heatmap modes only): one chip per
  period present in the game plus "Full game", an Animate/Pause button that
  advances one period every 1100ms and stops at the last, "Next quarter"
  under reduced motion. Changing any filter or switching modes stops
  playback.
- Update `ShootingCourt`'s JSDoc-style comment (the one added in 18c noting
  `mode="heatmap"` was reserved) since it is no longer just reserved.

## Out of scope

- Season/phase-aggregated shot charts on Team Detail and Player Detail -
  18e.
- Play-context/shot-type/result/period filter set itself (18c, unchanged);
  this feature only adds the playback bar and the three new modes.
- Any change to the `getShots` endpoint or contract.

## Build loop

Continuous Mode: self-review each step, no per-step pause; one final packet.

## Build steps

- [x] **Step 1 - `efficiencyRamp` and `HeatmapLegend`** - Add the ramp
  helper and legend component. *Done when:* the ramp returns five visually
  distinct, monotonically more saturated colors as percentage increases,
  matching light/dark theme via `color-mix()`.
- [x] **Step 2 - Zone heatmap mode** - Wire `ShootingCourt`'s heatmap
  branch: per-zone bubbles sized by volume and colored by efficiency. *Done
  when:* switching to Zone heatmap on a real finished game shows five
  bubbles whose relative sizes match the zone summary's attempt counts and
  whose colors track make percentage.
- [x] **Step 3 - Team comparison mode** - Build the two-panel side-by-side
  view. *Done when:* both teams' heatmaps and mini metrics render
  correctly from the one already-fetched shots list, and the team filter
  is hidden while this mode is active.
- [x] **Step 4 - Replay mode** - Build the made-shot sequence, scrubber,
  playback button, and reduced-motion fallback. *Done when:* playing
  advances one made shot every 850ms highlighting it on the court with a
  correct running score and counter, stops at the last make, and the
  reduced-motion variant steps once per "Next make" press.
- [x] **Step 5 - Quarter playback bar** - Add the period-stepping bar for
  Shot map/Heatmap modes, wired to stop on any filter or mode change. *Done
  when:* animating advances through every period present in the game at
  1100ms per step and the reduced-motion variant steps once per press.
- [x] **Step 6 - Verify** - Backend unaffected (no backend change this
  feature; run its build anyway as part of Verify); frontend lint/build;
  direct browser check of all four modes, the playback bar, and the replay
  control on a real finished game, both themes, console/network clean.

## Files / areas

- `frontend/src/lib/chartHelpers.js`
- `frontend/src/lib/HeatmapLegend.jsx` (new)
- `frontend/src/lib/ShootingCourt.jsx`
- `frontend/src/games/GameDetailPage.jsx`

## Data / contracts

- No backend or endpoint change; all four modes read the same `getShots`
  response already fetched for the Shooting tab.

## Testing

- No unit-test runner configured; rely on frontend build/lint and direct
  browser verification (a finished `E2025` game, both themes, reduced
  motion via the OS/browser emulation flag).

## Notes for the AI

- Reuse `usePrefersReducedMotion` (`frontend/src/lib/usePrefersReducedMotion.js`)
  and mirror `RacePlayback.jsx`'s structure for both playback controls; do
  not add a second reduced-motion hook.
- Team comparison mode's "both teams" framing means the mode itself already
  answers the team question - don't also show the team filter select while
  it's active, matching the guideline's "team strip is hidden in
  Team-comparison mode."


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6015,"specSha256":"9f2fb3e642eea3a1db1b075fb6ec92bfb20f92f187725a0f2f24952975577cae","branch":"refs/heads/feature/shooting-studio-modes","head":"925e284420e7abf9e3eb624159d5c196666ed265","baseRef":"refs/heads/master","baseCommit":"925e284420e7abf9e3eb624159d5c196666ed265","sourceTree":"9e1b779e967c0e2fbd485cfc635723a2b5af53d9","absentOptional":[]} -->
