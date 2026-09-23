# Feature: Single-game records

**From build-plan:** feature 17h-ii
**Build attempt:** 1
**Branch:** `feature/single-game-records`
**Expected archive:** `blueprint/history/features/17h-ii-single-game-records.md`
**Status:** verified - awaiting feature review

## Goal

Extend the archive-to-date Records route with single-game player performances, ranked and linked to their Game Detail pages.

## In scope

- Add a validated, bounded cross-season single-game records response from existing player game-stat rows.
- Enable the existing Single-game chooser option, preserving Player seasons and keeping Team-season disabled for 17h-iii.
- Render a podium, top-50 list, and chronological record progression for supported metrics, with player and game links.

## Out of scope

- Team-season records, new source data, migrations, or a competition selector.

## Build loop

Implement in small steps. Run backend build, frontend lint/build, and focused browser evidence. Checkpoints are disabled; `/complete` owns the commit.

## Build steps

- [x] **1. Add single-game records API data.** Aggregate existing player game-stat rows across the archived seasons for a fixed supported metric set and return deterministic top-50 records and progression data. **Done when:** invalid metrics receive the existing error shape and backend build passes.
- [x] **2. Add the Single-game Records view.** Enable its chooser option and render archive-to-date podium, progression, and top-50 rows with linked player and Game Detail targets. **Done when:** the view handles loading, empty, and error states without replacing missing source values with zero.
- [x] **3. Verify the route.** Add focused browser coverage for the enabled type and a linked record row. **Done when:** frontend lint/build and the focused browser test pass.

## Files / areas

- `backend/src/db/`, `backend/src/routes/seasons.ts`, `frontend/src/records/`, `frontend/src/lib/api.js`, and `frontend/e2e/`.

## Data / contracts

The server owns cross-season ranking. Responses remain read-only and preserve source nullability. A record row identifies its season, game, player, metric value, and available club context.

## Testing

- `cd backend && npm run build`
- `cd frontend && npm run lint && npm run build`
- `cd frontend && npm run test:browser -- <focused-single-game-records-spec>`

## Notes for the AI

- Reuse the 17h-i Records route, shared panels, existing game/player links, and route-validation patterns. Do not add dependencies.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2495,"specSha256":"2ff423d70535ae515ab4c7470ff962ec756920898f4345529daa993e1a42b34c","branch":"refs/heads/feature/single-game-records","head":"fe05c2405b9a4585b8725cff24863371c88c5b38","baseRef":"refs/heads/master","baseCommit":"fe05c2405b9a4585b8725cff24863371c88c5b38","sourceTree":"6fc4c19fcd61b07b9e0bbce9d20d1f91fae00a3c","absentOptional":[]} -->
