# Feature: Play-by-play log

**From build-plan:** feature 18a
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/play-by-play-log`

## Goal

Add a season-scoped game play-by-play endpoint reading the pipeline's
`app_play_by_play` table, and replace the Game Detail Play-by-play tab's
"not tracked for this archive" placeholder with the real event log described
in `UI-UX.md` §6.9 (`mode="play-by-play"`): Key plays / Scoring / All events /
Fouls / Substitutions filters, a period filter, a team filter, a running
score, scoring-row tint, and "Show 60 more" paging. Replace the coverage
panel's already-live `playByPlay` count (fixed in 19b) with a working link
into this tab.

## Design reference

`UI-UX.md` §6.9 "`mode="play-by-play"` — the log" (lines ~822-835).

## In scope

- `backend/src/db/season-schema.ts`: map `app_play_by_play` with its full
  `competition_code, season_code, game_code, period, event_ordinal` key.
- `backend/src/db/season-games.ts`: `getPlayByPlay(seasonCode, gameCode)`
  returning events ordered by period position (`FirstQuarter` < `SecondQuarter`
  < `ThirdQuarter` < `ForthQuarter` < `ExtraTime`, mapped to a numeric
  `periodNumber` so the existing `formatPeriod` helper applies — `ExtraTime`
  splits into OT1/OT2/... using `minute` in 5-minute FIBA overtime blocks,
  starting at minute 41), then `event_ordinal`.
- `backend/src/routes/seasons.ts`: `GET /:seasonCode/games/:gameCode/play-by-play`,
  same 404 pattern as the existing box-score route.
- `frontend/src/lib/api.js`: `getPlayByPlay(seasonCode, gameCode)`.
- Rebuild `GameDetailPage.jsx`'s Play-by-play tab: header with event count
  badge and three filter selects (event type, period, team), a newest-first
  `divide-y` event list (period + clock, player/team + category badge + raw
  play text, running score), a subtle scoring tint, and "Show 60 more" paging
  that resets on any filter change.
- Consolidate the file's third private `useActiveTheme`/`themeColor` copy
  (GameDetailPage still has its own, after 17i already shared it between
  Season Overview and the Format page) into the same
  `frontend/src/lib/useActiveTheme.js` used there.
- Team-A/team-B scoring line assignment for the running score column: `points_a`
  is the home (local) side and `points_b` the road side per `DATA_DICTIONARY.md`
  (confirm against a live game before wiring the column).

## Out of scope

- Game flow reconstruction (lead changes, runs, the score-differential chart) —
  feature 18b.
- Shot charts and shooting studio — features 18c/18d.
- Season-aggregated shot locations — feature 18e.
- Any change to `getCoverage`; its `playByPlay` item already reads real pipeline
  counts as of 19b.

## Build loop

Continuous Mode: self-review each step, no per-step pause; one final packet.

## Build steps

- [x] **Step 1 - Schema mapping and query** - Add the Drizzle table and
  `getPlayByPlay`, including the period-name-to-number mapping. *Done when:*
  backend builds and a scratch query against a known `E2025` game returns
  events in correct game order with a numeric `periodNumber` on every row,
  including a multi-overtime game split into OT1/OT2 correctly.
- [x] **Step 2 - Route and API client** - Wire the route and frontend
  `getPlayByPlay`. *Done when:* `GET /api/seasons/E2025/games/<code>/play-by-play`
  returns the events array for a played game and 404s for an unknown game
  code, matching the box-score route's error shape.
- [x] **Step 3 - Play-by-play tab UI** - Replace the placeholder with the real
  log: filters, newest-first list, running score, scoring tint, paging.
  *Done when:* a played `E2025` game shows real events with working filters
  and paging, an unplayed/scheduled game keeps an honest empty state, and the
  shared `useActiveTheme` consolidation leaves Game Flow's existing chart
  colors unchanged.
- [x] **Step 4 - Verify** - Backend build, frontend lint/build, direct browser
  check of a played game (all filter combinations, paging) and a scheduled
  game (empty state), console/network clean.

## Files / areas

- `backend/src/db/season-schema.ts`
- `backend/src/db/season-games.ts`
- `backend/src/routes/seasons.ts`
- `frontend/src/lib/api.js`
- `frontend/src/games/GameDetailPage.jsx`
- `frontend/src/lib/useActiveTheme.js` (consolidation only, already exists)

## Data / contracts

- `app_play_by_play` key: `competition_code, season_code, game_code, period,
  event_ordinal`. `club_code`/`person_code`/`player_name` are nullable for
  team-neutral or unmatched events (period boundaries, jump balls); render a
  generic "Game event" label when absent, per the guideline.
- Response shape: `{ events: PlayByPlayEvent[] }`, one row per source event,
  camelCased, with `periodNumber` added by the API (not a source column).
- No new coverage contract; `playByPlay` coverage stays owned by 19b's
  `app_coverage_*` read.

## Testing

- No unit-test runner configured; rely on backend build, frontend build/lint,
  and direct browser verification (a finished `E2025` game with real events,
  a game with overtime if one exists in the data, and an `E2026` scheduled
  game for the empty state).

## Notes for the AI

- Reuse `formatPeriod` from `frontend/src/lib/format.js`; do not add a second
  period-label formatter.
- `play_type` categories (confirmed live against `E2025`): Key plays = `2FGM,
  3FGM, FTM, TO, ST, AG, FV, TOUT, TOUT_TV`; Scoring = `2FGM, 3FGM, FTM`;
  Fouls = `CM, OF, CMT, CMU, C, B, CMD, CMTI`; Substitutions = `IN, OUT`; All
  events = everything. Do not invent categories the guideline doesn't name.
- Team filter uses the game's own `localTeam`/`roadTeam` (already available
  from `getGame`), matched against each event's `club_code` — no new lookup.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5747,"specSha256":"47c33cd75e3900bb31b95503f8995509433fbdf319185cacf37bd168ba9e2eac","branch":"refs/heads/feature/play-by-play-log","head":"d5a9b301904e719c64c1be2cacafc99a5d194680","baseRef":"refs/heads/master","baseCommit":"d5a9b301904e719c64c1be2cacafc99a5d194680","sourceTree":"c1587abcfea174d94c9ec2ac360b2dc72ac43084","absentOptional":[]} -->
