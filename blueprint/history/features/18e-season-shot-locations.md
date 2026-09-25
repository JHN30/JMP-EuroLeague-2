# Feature: Season shot locations

**From build-plan:** feature 18e
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/season-shot-locations`

## Goal

Add aggregated season/phase shot-location charts to Team Detail's existing
Shooting tab and a new Player Detail Shooting tab, per `UI-UX.md` §6.7
`SeasonShootingChart`, completing build-plan feature 18.

## Design reference

`UI-UX.md` §6.7 `SeasonShootingChart` (lines ~727-754): adaptive title,
coverage badges, three filters (Presentation, Game segment, Result), four
metric cards, court-plus-aside layout. The bespoke "Half-by-half split
cards" aside widget is simplified to the existing Game segment filter,
which already covers the same period-scoping need (matching this app's
established practice of reusing one filter control instead of a filter
plus a duplicate bespoke widget for the same choice).

## In scope

- `frontend/src/lib/SeasonShootingChart.jsx` (new, shared): fetches every
  supplied played game's shots via 18c's existing `getShots(seasonCode,
  gameCode)` (no new backend endpoint - matches this app's established
  pattern of client-side aggregation across already-scoped per-game rows,
  e.g. Season Overview's full-season game fetch, and mirrors the
  guideline's own "Aggregating N shooting charts…" loading copy, which
  describes the same per-game-then-combine approach), filters to the
  subject's own attempts via a caller-supplied `ownerFilter`, and renders
  the adaptive header with a "N games mapped · N attempts plotted" badge,
  Presentation (Zone heatmap/Every attempt)/Game segment (Full game, both
  halves, each quarter, Overtime)/Result filters, four metric cards (Field
  goals, Two-pointers, Three-pointers, Effective FG% with points-per-shot),
  the shared `ShootingCourt` (heatmap or markers), the matching legend, and
  a zone-efficiency list (reusing `summarizeZones`).
- `TeamPage.jsx`: add the chart to the existing "Shooting" section below
  the current box-score-derived splits table, scoped to the team's own
  played games in the active phase (reusing the already-fetched
  `gamesQuery`).
- `PlayerPage.jsx`: add a new "Shooting" tab (Overview, Season by season,
  Statistics, **Shooting**, Games) rendering the chart scoped to the
  player's own played games in the active phase, with the player's current
  team (from the already-fetched registrations) supplying the court's crest
  and color.

## Out of scope

- Any new backend endpoint or schema change.
- Bespoke half-by-half split cards (simplified to the Game segment filter,
  see Design reference).
- Any change to Team Detail's existing box-score splits table or Player
  Detail's existing tabs beyond adding the new one.

## Build loop

Continuous Mode: self-review each step, no per-step pause; one final packet.

## Build steps

- [x] **Step 1 - `SeasonShootingChart` component** - Build the shared
  component: parallel per-game shot fetch, owner filtering, the three
  filters, four metric cards, court, legend, and zone list. *Done when:*
  given a set of played games and an owner filter, it renders correct
  aggregated makes/attempts/percentages.
- [x] **Step 2 - Team Detail integration** - Wire it into `TeamPage.jsx`'s
  Shooting section. *Done when:* a real team's season shot profile
  reconciles exactly against the existing box-score splits table's 2PT/3PT
  totals (verified: Anadolu Efes Istanbul `E2025` Regular Season - 733-1349
  2PT + 348-980 3PT = 1081-2329 field goals, matching the chart's own
  1081-2329 (46.4%) card exactly; 38 games mapped, 2,329 attempts plotted).
- [x] **Step 3 - Player Detail integration** - Add the new tab and wire it
  into `PlayerPage.jsx`. *Done when:* a real player's season shot profile
  shows their current team's crest/colors and reconciles against their own
  makes/attempts (verified: Rolands Smits, `E2025` Regular Season - 88-176
  field goals (50.0%), 35 games mapped, 176 attempts plotted).
- [x] **Step 4 - Verify** - Backend build (unaffected), frontend lint/build,
  direct browser check of both integrations for a full-season team/player
  (`E2025`) and a just-started team (`E2026`, 1 game mapped, honest partial
  count, no fabrication), both presentation modes, console/network clean.

## Files / areas

- `frontend/src/lib/SeasonShootingChart.jsx` (new)
- `frontend/src/teams/TeamPage.jsx`
- `frontend/src/players/PlayerPage.jsx`

## Data / contracts

- No new endpoint; reuses 18c's per-game `getShots` response, fetched once
  per game the subject played in the active phase.
- "Games mapped" counts successfully fetched game-shot responses, not a
  server-declared total, so a season in progress reports its true partial
  count rather than a fabricated full-season figure.

## Testing

- No unit-test runner configured; rely on frontend build/lint and direct
  browser verification (a full season for both a team and a player, and a
  just-started season for a team, reconciling every aggregate against
  already-known box-score/splits totals).

## Notes for the AI

- Reuse `summarizeZones`, `ShootingCourt`, `ShootingLegend`, and
  `HeatmapLegend` from 18c/18d; this feature adds no new zone or court
  rendering logic, only the season-wide fetch/aggregate/filter layer around
  them.
- Both Team and Player integrations reuse each page's already-fetched games
  list (`gamesQuery`/`registrationsQuery`) rather than issuing a new
  redundant top-level query.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5425,"specSha256":"9b9f466bd06f0a254875331c011ede6687117175f2bb092667b45b658c388a05","branch":"refs/heads/feature/season-shot-locations","head":"050d3d88cb902ea56e8e9fe39a44d2b2ace54a0c","baseRef":"refs/heads/master","baseCommit":"050d3d88cb902ea56e8e9fe39a44d2b2ace54a0c","sourceTree":"16e8ff691be7f9b4e3d15d9ae0d5d71c64a4f735","absentOptional":[]} -->
