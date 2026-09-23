# Feature: Team-season records

**From build-plan:** feature 17h-iii
**Build attempt:** 1
**Branch:** `feature/team-season-records`
**Expected archive:** `blueprint/history/features/17h-iii-team-season-records.md`
**Status:** verified - awaiting feature review

## Goal

Finish the archive-to-date Records route with team-season performances ranked across supported EuroLeague seasons and linked to Team Detail.

## In scope

- Aggregate completed-game `total` team box-score rows into one season total per club across the archived seasons.
- Add a validated, bounded team-season records response for points, rebounds, assists, and PIR, preserving missing source values rather than treating them as zero.
- Enable the existing Team-season chooser option and render its podium, chronological record progression, top-50 list, empty state, and Team Detail links.

## Out of scope

- New source data, migrations, a competition selector, per-game averages, or changes to player-season and single-game records.

## Build loop

Implement in small steps. Run backend build, frontend lint/build, and focused browser evidence. Feature-level review is configured and checkpoints are disabled; `/complete` owns the final commit.

## Build steps

- [x] **1. Add team-season records API data.** Sum supported metrics from completed `total` team-stat rows, resolving the club from each game side and returning deterministic top-50 archive rows. **Done when:** unsupported metrics use the existing error shape, null source measures are not converted to zero, and backend build passes.
- [x] **2. Add the Team-season Records view.** Enable the chooser and route the shared Records presentation to the team endpoint with podium, progression, top-50, loading, empty, and error states. **Done when:** each populated row links to `/:seasonCode/teams/:clubCode`, while the Player seasons and Single-game views remain available.
- [x] **3. Verify team-season records.** Add focused browser coverage for switching to Team-season and following a team record link. **Done when:** frontend lint/build and the focused records browser spec pass.

## Files / areas

- `backend/src/routes/seasons.ts`, existing season schemas, `frontend/src/records/RecordsPage.jsx`, `frontend/src/lib/api.js`, and `frontend/e2e/records.spec.js`.

## Data / contracts

The server owns the cross-season aggregation, validates the requested metric, limits the ranked response to 50, and orders ties deterministically. It includes `seasonCode`, `clubCode`, `clubName`, the metric value, and a numeric display value. The client maps its shared metric chooser to the team-stat field names and preserves source nullability by relying only on server-returned valid totals.

## Testing

- `cd backend && npm run build`
- `cd frontend && npm run lint && npm run build`
- `cd frontend && npm run test:browser -- e2e/records.spec.js`

## Notes for the AI

- Reuse the Records route controls and the completed-game / `statsKind: "total"` conventions already used by team statistics. Do not add dependencies or replace missing data with zero.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3082,"specSha256":"35acc66f678b50a87ce51f8541b810a8586e450d732b5909987cfabac91511f8","branch":"refs/heads/feature/team-season-records","head":"d00ee421f1ff0b42771f5c768ba45217ebe9d535","baseRef":"refs/heads/master","baseCommit":"d00ee421f1ff0b42771f5c768ba45217ebe9d535","sourceTree":"7ba20f9f0554ee51cfdad89ab9781d7ec2806d57","absentOptional":[]} -->
