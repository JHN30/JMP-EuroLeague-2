# Fix: Records by season and progression over every season

**Type:** Fix
**Status:** verified
**Branch:** fix/records-by-season-and-progression-over-every-season

## The problem

On `/:season/records`, the "Record progression" and "Best in each season" panels are built in the browser from the
same 50 rows as the Top 50 (`recordProgression` and `bestOfEachSeason` in `frontend/src/records/recordData.js`).
A season with no row in the overall Top 50 never appears in either panel.

- Player-season Points: all 50 rows are from 2016-17 or later (longer seasons), so "Best in each season" starts at
  2016-17 and the progression starts at 609 (Langford), although all 27 seasons from 2000-01 are loaded.
- The same gap shows on any record type and metric where recent seasons fill the Top 50.
- The data is already there: each kind reads every season's best rows (up to 50 per season, or all rows for
  traditional team-season totals), then `best()` in `backend/src/db/season-records.ts` keeps only the overall 50.

## The fix

The backend works out both lists from all the rows it already reads, before the cut to 50, and sends them in the same
records response. The frontend draws the two panels from them.

- **Response:** each records route answers `{ metric, label, group, minGames, records, bySeason, progression }`.
  `records` is unchanged (the overall 50, highest first). `bySeason` and `progression` use the same row shape as
  `records` (`value` as a string, `numericValue` as a number, the same picture and club fields).
- **`bySeason`:** the best row of each season that has any rows for the metric, oldest season first. Ties keep the
  row `best()` would rank first (the same `tie` order). A season with no rows (for example a rating that has no data
  in an early season) is left out, as now.
- **`progression`:** the first season's best is the first record. After that, every row that beat the standing record
  (strictly higher), oldest first: games by `scheduledAt`, then `gameCode`; season totals by season. The last entry
  is the record that stands.
  - For season totals this is the usual "every season best that beat all before it".
  - For single games (player and team), a later season can add more than one step if the record was beaten twice
    in that season. The first season adds only its best, so the chain does not open with a run of early-season
    games from the first night of 2000-01.
- **Where:** one small helper in `season-records.ts` next to `best()` that takes all rows of a kind and returns the
  three lists. The four kind functions return its result instead of `best(...)`, and `getRecordRows` passes it on.
  The route spreads it into the reply. No new queries, tables or caching changes. The response cache already keys
  records by URL, so the bigger reply is cached the same way.
- **Frontend:** `RecordsContent` describes `data.bySeason` and `data.progression` with `describeRecord`, as it does
  `records`. `Progression` gets its steps from `progression` (the gain is each step's value minus the step before; null
  for the first). `BestOfEachSeason` gets `bySeason`, and the "Record" badge goes on the season entry whose key
  matches `records[0]` (it is a different object now, so the identity check becomes a key check).
  `recordProgression` and `bestOfEachSeason` are replaced by a small gains helper (or removed if no longer needed).
- **No layout changes.** Same panels, same markup, same breakpoints. The two panels get longer: up to 27 entries
  in "Best in each season".

Must not break:

- The Podium and Top 50 read `records` exactly as now.
- The minimum-games rule for PER and the team ratings applies to `bySeason` and `progression` too (they come from the
  same filtered rows).
- An empty metric still shows "No records are available for this metric."
- No horizontal page scroll at 320, 390, 768, 1024 and 1440px with the longer panels.

## Build steps

- [x] 1. **Backend lists** - the helper in `season-records.ts`, the four kinds and `getRecordRows` return
   `{ records, bySeason, progression }`, and the route sends them.
   Done when: `cd backend && npm run build` passes, and on the local backend
   `/api/seasons/2026/records/player-seasons?metric=pointsScored` returns `bySeason` with one entry per season from
   2000-01 and a `progression` whose last entry equals `records[0]` and whose values strictly increase.
- [x] 2. **Frontend panels** - `RecordsPage.jsx`, `RecordParts.jsx` and `recordData.js` draw the two panels from the
   new lists, and `records.spec.js` mocks send `bySeason` and `progression` (including a season that is not in
   `records`, to prove the panels no longer depend on the Top 50). `records-api.spec.js` checks the new lists on
   the live local backend: `bySeason` is one per season, oldest first; `progression` strictly increases and ends at
   `records[0]`.
   Done when: on `/2026/records`, Player seasons, Points, "Best in each season" starts at 2000-01 and the progression
   starts before 609; `cd frontend && npm run lint` and `npm run build` pass; the records specs pass.

## Verify

- `cd backend && npm run build`, `cd frontend && npm run lint` and `cd frontend && npm run build` pass.
- With `/api/health` reporting `"target":"local"`:
  `cd frontend && npx playwright test records.spec.js records-api.spec.js records-layout.spec.js responsive.spec.js`
- On `/2026/records`:
  - Player seasons, Points: "Best in each season" lists every season from 2000-01, and the progression ends at 802
    (Nunn, 2024-25) marked "Current record".
  - Player games, Points: the progression includes steps from before 2016-17.
  - Player seasons, PER: early seasons appear only where qualified players have a PER.
- Screenshots at 1440 and 390px, light and dark: the longer panels with no sideways scroll.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5810,"specSha256":"5ca1d554732a58b59936684cb0375eb8600a5a6dddf3b46843f9ce5708a963e3","branch":"refs/heads/fix/records-by-season-and-progression-over-every-season","head":"4c83927f70c895e222190447c4687d2b82bca7af","baseRef":"refs/heads/master","baseCommit":"4c83927f70c895e222190447c4687d2b82bca7af","sourceTree":"b253344f35a3f3454ce83051317454e11664c33a","absentOptional":[]} -->
