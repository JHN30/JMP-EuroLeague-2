# Feature: Records data and player-season records

**From build-plan:** feature 17h-i
**Build attempt:** 1
**Branch:** `feature/records-data-and-player-season-records`
**Expected archive:** `blueprint/history/features/17h-i-records-data-and-player-season-records.md`
**Status:** verified - awaiting feature review

## Goal

Add an archive-to-date player-season records route backed by a read-only cross-season records response.

## In scope

- Expose bounded player-season records from the existing season-statistics tables, scoped to the two archived seasons and preserving nullable source values.
- Add a lazy Records route, record-type chooser with secondary descriptions, and player-season podium, top-50, progression, and best-in-each-season views.
- Label every result archive-to-date, not all-time; defer game and team-season record families to 17h-ii and 17h-iii.

## Out of scope

- Single-game or team-season record data and views.
- New source data, migrations, or a competition selector.

## Build loop

Implement ordered steps, run backend build, frontend lint/build, and proportionate focused browser evidence. Checkpoints are disabled; `/complete` owns the commit.

## Build steps

- [x] **1. Add the records API contract.** Use existing validated season-statistics data to return bounded player-season rows, supported metric metadata, and deterministic descending rankings across archived seasons. **Done when:** invalid record options receive the existing JSON error shape and backend build passes.
- [x] **2. Add the Records route and player-season views.** Build the chooser, podium, top-50, record progression, and best-by-season sections with loading, empty, and error states. **Done when:** the route is reachable, labels results archive-to-date, and source links reach player profiles.
- [x] **3. Verify records behavior.** Add focused browser coverage for a stable ranking and empty/error state. **Done when:** frontend lint/build and focused browser evidence pass.

## Files / areas

- `backend/src/db/`, `backend/src/routes/seasons.ts`, `frontend/src/App.jsx`, `frontend/src/`, and `frontend/e2e/`.

## Data / contracts

No persisted-data changes. The server owns cross-season aggregation; the frontend renders returned rankings without replacing null values with zero.

## Testing

- `cd backend && npm run build`
- `cd frontend && npm run lint && npm run build`
- `cd frontend && npm run test:browser -- <focused-records-spec>`

## Notes for the AI

- Reuse existing route validation, pagination limits, shared panels, and theme tokens. Do not add dependencies.
- The record-type chooser shows Single-game and Team-season as disabled “Coming next” options until 17h-ii and 17h-iii are built.

<!-- blueprint:completion {"schemaVersion":1,"specBytes":2724,"specSha256":"1829150e00d9e0105deee2dc323c656c600e7da28e162c990ff52d02f3936d61","branch":"refs/heads/feature/records-data-and-player-season-records","head":"9423f1f11137a06d27b61a47314555a603273a6a","baseRef":"refs/heads/master","baseCommit":"9423f1f11137a06d27b61a47314555a603273a6a","sourceTree":"4f95c2696f148646c8ad6dc7be5d3f3f1da215f1","absentOptional":[]} -->
