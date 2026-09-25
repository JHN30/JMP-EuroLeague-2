# Fix: Read renamed app_* Neon tables

**Type:** Fix
**Status:** verified
**Branch:** fix/read-renamed-app-neon-tables

## The problem

The data pipeline renames the Neon tables this app reads. Every
`etl_flat_<name>` table becomes `app_<name>` in the `public` schema, with
identical columns, types, keys, and rows. The app still names the old tables.

- After the owner's next pipeline publish, the old `etl_flat_*` names survive
  only as temporary views. The owner drops those views once this change is live,
  so the current app stops working at that point.
- Rows added after the rename appear under the new names, and any new columns
  appear only under the `app_*` names.
- The pipeline also publishes `app_standings`: one wide row per club and round
  with the basic, calendar, streaks, ahead/behind, and margins views, plus
  `form` and `streak_history` as JSON. The app does not read it. Instead it
  joins the seven `standings_*` feed tables in
  `backend/src/db/season-standings.ts` and counts standings clubs from the basic
  feed table in `backend/src/db/season-coverage.ts`.

## The fix

1. **Rename every table reference.** Replace the `etl_flat_` prefix with `app_`
   everywhere it appears: the Drizzle `pgTable(...)` names in
   `backend/src/db/season-schema.ts`, the schema reference
   `create_v2_v3_tables.sql`, `blueprint/context/project-overview.md`, and the
   feature archives under `blueprint/history/features/`. Every name in the
   rename map is exactly this prefix swap. No column name or TypeScript
   property changes.
2. **Read standings from `app_standings`.** Replace the seven feed-table
   mappings with one `standings` mapping of `app_standings`, including its
   `jsonb` `form` and `streak_history` columns. Rewrite `getStandings` and
   `getLatestStandingsRound` as single-table reads, and point the coverage
   standings count at the same table.

Must not break:

- **The standings API response shape.** Keep `StandingEntry` and its nested
  types unchanged. A view whose columns are all null still returns `null`, as
  the old left joins did. `form` and `streakHistory` stay ordered by their
  ordinals, and the crest comes from `app_standings.crest_url`.
- **Neon.** No `drizzle-kit push`, `migrate`, generated migration, or DDL
  against Neon. The pipeline owns these tables, and the app only reads them.
  There is no `drizzle.config` or table filter to update.
- **The old tables.** Do not drop the seven `app_standings_*` feed tables or
  any `etl_flat_*` table or view. The owner removes the old-name views after
  this ships.

## Build steps

- [x] **Rename table references and switch standings to `app_standings`.**
   The code for this is already in the working tree on `master`. Move it onto
   the fix branch, review it, and verify it.
   - Done when `git grep etl_flat_` matches nothing outside this spec, `cd backend && npm run build`
     passes, and `backend/src/db/season-standings.ts` imports only the
     `standings` table.

## Verify

- **Build and lint.** `cd backend && npm run build` and
  `cd frontend && npm run build && npm run lint` pass.
- **Standings parity.** Call `getStandings("E2026", "RS", latestRound)` against
  Neon and compare it with the old feed tables for the same round. It should
  return the same clubs in the same order with equal basic, streaks, and margins
  values and the same number of form entries. This passed for E2026 round 1 of
  the regular season before the spec was written.
- **Browser tests.** Blocked until the pipeline publish:
  `SELECT to_regclass('public.app_games')` must be non-null. Then run
  `cd frontend && npm run test:browser`, and check Standings, Game Detail,
  Players, Statistics, and the coverage panel in the running app.
- **Deploy gate.** Deploy only after `app_games` exists in Neon.

## Known gaps

- `app_standings` holds only E2026 round 1. The feed tables also hold E2025
  rounds 1 to 38, so E2025 standings and the E2025 standings coverage count are
  empty after this ships until the pipeline loads E2025 into `app_standings`.
  Ask the pipeline owner to backfill before the feed tables are dropped.
- The app connects to Neon as `neondb_owner`. If the pipeline publishes with a
  different role, `neondb_owner` needs `SELECT` on the `app_*` tables, and on
  the old-name views during the switch.

## Verification results

- `cd backend && npm run build`: passes.
- `cd frontend && npm run build` and `npm run lint`: pass.
- `git grep etl_flat_`: matches only this spec.
- Old versus new output, run against live Neon after the rename publish: every
  regular-season round (E2025 rounds 1-38 and E2026 round 1) from
  `getStandings` and `getLatestStandingsRound`, plus both seasons' coverage, is
  `deepStrictEqual` between the pre-fix code (reading the `etl_flat_*` views) and
  this fix (reading `app_standings`).
- `cd frontend && npm run test:browser`: 4 passed, 4 failed. The same 4 tests
  also fail on the unchanged pre-fix code (a missing Teams and Statistics tab
  role, an ambiguous `Play-by-play` text match, and an expected "Showing 1-25 of
  50 players" label), so the failures predate this fix and are out of scope.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5162,"specSha256":"ec5ddabbb042a9fa0cef4f661f53b5e5d91f8b479583e0bdd27ab2890a5dde59","branch":"refs/heads/fix/read-renamed-app-neon-tables","head":"a06c6648331f841a9b2af7af812171e7862ac7d1","baseRef":"refs/heads/master","baseCommit":"a06c6648331f841a9b2af7af812171e7862ac7d1","sourceTree":"96620f693298ac87ec5bb4cca8fa7e2cae89f04f","absentOptional":[]} -->
