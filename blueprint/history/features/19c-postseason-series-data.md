# Feature: Postseason series data

**From build-plan:** feature 19c
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/postseason-series-data`

## Goal

Replace 17i's client-computed knockout-journey series (grouped from raw
`getSeasonGames` rows by `groupName`) with the pipeline's dedicated
`app_postseason_series` table, matching the build-plan's stated design: 17i
built the knockout journey ahead of this table's adoption, and this step
swaps its data source without changing the page's behavior or layout.
Preserve incomplete and future series without inventing bracket positions,
seed numbers, or a completion rule the source data doesn't carry.

## Design reference

None (data-source swap only; UI/UX unchanged from 17i).

## In scope

- `backend/src/db/season-schema.ts`: map `app_postseason_series`
  (`competition_code, season_code, phase_code, club_a_code, club_b_code` key;
  `club_a_name, club_b_name, games_played, club_a_wins, club_b_wins,
  winner_club_code, games` JSONB).
- `backend/src/db/season-games.ts` (or a new `season-postseason.ts` if that
  reads cleaner): `getPostseasonSeries(seasonCode)`, joining crest URLs for
  both clubs from `app_clubs` (matching the existing local/road club alias
  join pattern already used for games), returning every series for the
  season across every postseason phase present.
- `backend/src/routes/seasons.ts`: `GET /:seasonCode/postseason-series`.
- `frontend/src/lib/api.js`: `getPostseasonSeries(seasonCode)`.
- Rewrite `PlayoffsPage.jsx`'s `buildSeries` to consume the new endpoint
  instead of grouping games by `groupName`:
  - `decided` becomes `winnerClubCode != null` (trust the pipeline's own
    determination instead of re-deriving it from "every game played" -
    this also removes 17i's edge case where an undecided series with a
    complete-looking game count could be mislabeled).
  - Classify each series structurally instead of by `groupName` text (the
    pipeline table carries no group label): within a phase, a series whose
    both clubs are each the `winnerClubCode` of two other decided series in
    the same phase is that phase's internal final (`isChampionship`); a
    series whose both clubs are each the *loser* of two other decided
    series in the same phase is a placement/3rd-place game (`isPlacement`).
    Every other series is a regular round. This replaces 17i's
    `isChampionshipLabel`/`isPlacementLabel` text matching for the knockout
    journey (Season Overview's own `isFinalGame` use of those helpers is
    unrelated and stays as-is).
  - Reuse the existing look-ahead `clubStatus`/`seriesResultText` logic
    unchanged; it already only depends on `decided`, `winnerClubCode`,
    `isChampionship`, `isPlacement`, and chronological order.
- Also source the phase-progression row's postseason-phase metrics (team
  count, game count, date range) from the flattened `series[].games` instead
  of a separate per-phase game fetch, removing that now-redundant network
  call for `PI`/`PO`/`FF`. `RS`'s own full-game fetch (needed for the
  round-volume chart) is unchanged.

## Out of scope

- Any change to the Regular Season panel, round-volume chart, or standings.
- Nav label/route rename to "Format" (19d).
- Retiring any `etl_flat_*` view or touching the ETL/pipeline.

## Build loop

Continuous Mode: self-review each step, no per-step pause; one final packet.

## Build steps

- [x] **Step 1 - Schema mapping and query** - Add the Drizzle table and
  `getPostseasonSeries`, with the crest-URL club join. *Done when:* backend
  builds and a scratch query against `E2025` returns every `PI`/`PO`/`FF`
  series with crest URLs on both clubs.
- [x] **Step 2 - Route and API client** - Wire the route and frontend
  `getPostseasonSeries`. *Done when:* `GET
  /api/seasons/E2025/postseason-series` returns the series array; `E2026`
  (no postseason yet) returns an empty array, not an error.
- [x] **Step 3 - Swap the knockout journey's data source** - Replace
  `buildSeries`'s game-grouping with the new endpoint, add the structural
  championship/placement classifier, and update the phase-progression row's
  postseason metrics to read from the flattened series games. *Done when:*
  `/E2025/playoffs` renders identically to 17i's verified output (same
  Advanced/Eliminated/Runner-up/Champion labels for every team, same
  Olympiacos championship path), sourced from the new endpoint instead of
  grouped games; `/E2026/playoffs` is unchanged (postseason not started).
- [x] **Step 4 - Verify** - Backend build, frontend lint/build, direct
  browser comparison against the 17i screenshots for `E2025` and `E2026`,
  console/network clean, confirm the per-postseason-phase game fetch is
  gone from the network panel.

## Files / areas

- `backend/src/db/season-schema.ts`
- `backend/src/db/season-games.ts`
- `backend/src/routes/seasons.ts`
- `frontend/src/lib/api.js`
- `frontend/src/playoffs/PlayoffsPage.jsx`

## Data / contracts

- `app_postseason_series` key: `competition_code, season_code, phase_code,
  club_a_code, club_b_code` (`club_a_code < club_b_code` alphabetically, so
  a pairing never produces two rows). `winner_club_code` is `null` for a
  tied/in-progress series - never infer a winner from `games_played` alone.
- Response shape: `{ series: PostseasonSeries[] }`, camelCased, with
  `clubA`/`clubB` each `{ clubCode, name, crestUrl }` and the existing
  `games` array shape unchanged (already camelCase in the source JSONB).
- No completion/decided flag beyond `winnerClubCode != null`; never
  reconstruct a best-of-N target or bracket-position label.

## Testing

- No unit-test runner configured; rely on backend/frontend build, frontend
  lint, and direct browser verification against `E2025` (finished
  postseason) and `E2026` (no postseason yet), diffed against 17i's
  captured behavior.

## Notes for the AI

- This is a data-source swap, not a redesign - the rendered page for
  `E2025`/`E2026` must look and behave exactly as 17i left it. Any visible
  difference is a regression to fix, not a new design decision.
- Keep `isChampionshipLabel`/`isPlacementLabel` in
  `frontend/src/lib/phaseSummary.js` for Season Overview's unrelated
  `isFinalGame` use; only the Playoffs/Format page's classifier changes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6269,"specSha256":"e3abf1313f7a6140959c6d36eb5a4db9e13c24f8b5ce559f51f6f0fd60bc69d8","branch":"refs/heads/feature/postseason-series-data","head":"add8d2b2701d52a2a6f1adf8f22006e20063e238","baseRef":"refs/heads/master","baseCommit":"add8d2b2701d52a2a6f1adf8f22006e20063e238","sourceTree":"b11d364e177717a0dcefacbaeb7910b57fa7327f","absentOptional":[]} -->
