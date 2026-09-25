# Feature: Game shot chart

**From build-plan:** feature 18c
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/game-shot-chart`

## Goal

Add a season-scoped game shots endpoint reading the pipeline's `app_shots`
table, build the shared FIBA half-court renderer described in `UI-UX.md`
§6.6, and replace Game Detail's box-score-derived "Shooting splits"
placeholder with a real shot map: player/shot-type/period/result/play-context
filters, a team filter, a zone summary, and a box-score reconciliation
badge. The shot-location coverage entry already reads real pipeline counts
(fixed in 19b); this feature is the UI/endpoint that makes that coverage
real.

## Design reference

`UI-UX.md` §6.6 "`ShootingCourt` and `ShootingLegend`" (lines ~688-725) for
the renderer, and the "Shot map" mode plus the five filter selects and
reconciliation badge from §6.8 "`GameShootingChart`" (lines ~756-784) - the
mode-switcher tab strip, zone heatmap, team comparison, replay mode, and
quarter playback described later in §6.8 are 18d's scope, not this one.

## In scope

- `backend/src/db/season-schema.ts`: map `app_shots` (`competition_code,
  season_code, game_code, shot_ordinal` key; `club_code, person_code,
  player_name, action_code, points, coord_x, coord_y, zone, fastbreak,
  second_chance, points_off_turnover, minute, marker_time` - note: the
  source column is `console_time`; expose it as `markerTime` to match the
  naming already used for play-by-play's clock text).
- `backend/src/db/season-games.ts`: `getShots(seasonCode, gameCode)`,
  filtered to field-goal attempts only (`action_code IN ('2FGM', '2FGA',
  '3FGM', '3FGA')` - free throws have no real court coordinates and are out
  of scope for a shot chart), ordered by `shotOrdinal`.
- `backend/src/routes/seasons.ts`: `GET /:seasonCode/games/:gameCode/shots`,
  same 404 pattern as box-score/play-by-play.
- `frontend/src/lib/api.js`: `getShots(seasonCode, gameCode)`.
- `frontend/src/lib/shotZones.js` (new, shared with 18e later): a pure
  `classifyShotZone(coordX, coordY, isThree)` returning one of the
  guideline's five named zones (Restricted area, Paint, Mid-range, Corner
  three, Above-break three), computed geometrically from the coordinates
  and made/miss-independent shot type - not from the source's own opaque
  `zone` letter, which a live query showed does not line up with the
  guideline's five categories (it's a left/right split, not a
  corner/wing split; a real corner-three cluster is visible in the raw
  y-coordinates but the source zone letters don't isolate it). Use real
  FIBA measurements already implied by the guideline's own court
  dimensions: 125 restricted-area radius, a 245-half-width/580-deep key,
  and corner three defined by `y <= 145` (where the straight sideline
  three-point segment meets the arc at radius 675).
- `frontend/src/lib/ShootingCourt.jsx` (new, shared with 18d/18e): the FIBA
  half-court SVG renderer from §6.6 - court lines, marker mode only for now
  (made shots as filled circles, misses as crosses, team color by position:
  index 0 primary, 1 secondary), each marker with an SVG `<title>` tooltip.
  Accept a `mode` prop now (`"markers"` is the only value used until 18d
  adds `"heatmap"`) so 18d doesn't have to change this component's public
  shape.
- `frontend/src/lib/ShootingLegend.jsx` (new): the marker legend (team
  swatches, made dot, missed cross).
- Rebuild Game Detail's Shooting tab: a three-way team filter (Both/home/
  away), five filter selects (Player - filtered by the active team, Shot
  type, Period, Result, Play context), the court, a zone-summary list
  (attempts/makes/percentage per zone), and a reconciliation badge
  comparing the *unfiltered* plotted attempt count against both teams'
  combined box-score `fieldGoalsAttemptedTotal`.
- Honest empty state for a scheduled game (unchanged wording pattern) and a
  separate "shot data not available for this game yet" state for a played
  game with zero rows (coverage can lag the schedule per
  `DATA_DICTIONARY.md`).

## Out of scope

- Zone heatmap, team comparison, and made-shot replay presentation modes,
  and the quarter-playback bar - 18d.
- Season/phase-aggregated shot charts on Team Detail and Player Detail -
  18e.
- Any change to `getCoverage`; `shotLocations` already reads real pipeline
  counts as of 19b.

## Build loop

Continuous Mode: self-review each step, no per-step pause; one final packet.

## Build steps

- [x] **Step 1 - Schema mapping, query, and route** - Add the Drizzle table,
  `getShots`, and the route. *Done when:* backend builds and a scratch query
  against a known `E2025` game returns only field-goal attempts, ordered by
  `shotOrdinal`, with real `coord_x`/`coord_y` in the guideline's court
  coordinate space (confirmed the source range already matches the
  renderer's viewBox with no transform needed).
- [x] **Step 2 - Zone classifier** - Add `shotZones.js` and verify it against
  real data: every 3PT attempt with `coord_y <= 145` reads as "Corner
  three", the rest of the makes/misses split sensibly into the other four
  zones for a real game. *Done when:* a scratch check against a full
  season's shots shows a plausible zone distribution (restricted area is
  the highest-volume zone; corner three is a real minority, not empty or
  everything).
- [x] **Step 3 - `ShootingCourt`/`ShootingLegend`** - Build the shared SVG
  renderer (marker mode) and legend. *Done when:* a shot list renders as
  correctly positioned, correctly colored (team position, make/miss),
  hoverable (native `<title>` tooltip) markers on a recognizable FIBA
  half-court, matching in both themes.
- [x] **Step 4 - Shooting tab UI** - Replace `ShootingSplitsSection` with
  the filtered shot map, zone summary, and reconciliation badge. *Done
  when:* for a real finished `E2025` game, the unfiltered reconciliation
  badge matches the box score's field-goal-attempted totals exactly, every
  filter narrows the plotted markers correctly, and the player filter's
  options change with the team filter.
- [x] **Step 5 - Verify** - Backend build, frontend lint/build, direct
  browser check of a played game (all filters, reconciliation badge, both
  themes) and a scheduled game (empty state), console/network clean.

## Files / areas

- `backend/src/db/season-schema.ts`
- `backend/src/db/season-games.ts`
- `backend/src/routes/seasons.ts`
- `frontend/src/lib/api.js`
- `frontend/src/lib/shotZones.js` (new)
- `frontend/src/lib/ShootingCourt.jsx` (new)
- `frontend/src/lib/ShootingLegend.jsx` (new)
- `frontend/src/games/GameDetailPage.jsx`

## Data / contracts

- `app_shots` key: `competition_code, season_code, game_code, shot_ordinal`.
  `coord_x`/`coord_y` are basket-origin numeric coordinates already in the
  renderer's coordinate space; `zone` (source letter) is read but not used
  for the guideline's five named zones (see Step 2).
- Response shape: `{ shots: Shot[] }`, camelCased, field-goal attempts only.
- The reconciliation badge is informational only; a mismatch shows
  "Partial chart coverage" rather than blocking the page.

## Testing

- No unit-test runner configured; rely on backend/frontend build, frontend
  lint, and direct browser verification (a finished `E2025` game and a
  scheduled `E2026` game).

## Notes for the AI

- Free throws are excluded from `getShots` entirely (no real coordinates);
  do not special-case them in the UI.
- Reuse `useActiveTheme`/`themeColor` from `frontend/src/lib/useActiveTheme.js`
  for any theme-driven SVG colors; do not add a fourth copy.
- The renderer's `mode` prop exists now so 18d only adds a new mode value
  and toggle UI, never a breaking prop-shape change.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7696,"specSha256":"3b6258163be66332896a3cf2870ab433b0e737f7e15dd74fa45021f2028a8e39","branch":"refs/heads/feature/game-shot-chart","head":"8ca608b406fa29409b89eb1ca7e2d1e02a893839","baseRef":"refs/heads/master","baseCommit":"8ca608b406fa29409b89eb1ca7e2d1e02a893839","sourceTree":"0defebdfe56beb227be1f2ca29385c85a8ac69c6","absentOptional":[]} -->
