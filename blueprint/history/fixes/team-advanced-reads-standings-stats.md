# Fix: Team advanced reads standings stats

**Type:** Fix
**Status:** verified
**Branch:** fix/team-advanced-reads-standings-stats

## The problem

`GET /seasons/:season/teams/:club/advanced` (the team page's Advanced tab) reads three per-club tables:
- `app_team_round_stats` for the trend and the round-alone ratings,
- `app_team_round_ratings` for SRS and adjusted net,
- `app_team_round_splits` for home, away, last 5 and last 10.

It also uses `app_team_round_stats` for the list of scopes the club has.

`app_standings_stats`, which the league views already read, holds the same rows joined. A database check compared all 31,716 rows, keyed by season, scope, round and club. Every row exists in all four tables, and the shared values are identical: record, net rating, Pythagorean wins, adjusted net, SOS, home MOV and last-10 pace. The only columns `app_standings_stats` lacks are raw shooting and assist totals in `app_team_round_stats`, and no code or page uses them.

So the same data is stored twice (about 36 MB), and the team page reads the duplicate.

## The fix

**Read `app_standings_stats` only, filtered to the club.**
- `getTeamStatsScopes` reads its distinct scopes from `standingsStats`.
- One new reader, `getTeamRounds(seasonCode, scope, clubCode)`, returns the club's rows for the scope, oldest round first. It replaces `getTeamRoundStats`, `getTeamRoundRatings` and `getTeamRoundSplits`.
- `teamRoundOwnRatings` keeps its logic. Its row type points at `StandingsStatsRow` instead, which has the same `gamesPlayed`, `pointsFor`, `pointsAgainst` and `possessions`.

**The route builds the same response from those rows:**
- **`trend`:** same fields as before. `srs` and `adjNetRating` come from the same row instead of a lookup in a second table.
- **`splits`:** the latest row, cut down to exactly the fields it has today. Those are the key fields (`competitionCode`, `seasonCode`, `scope`, `roundNumber`, `clubCode`) plus the home, away, last 5 and last 10 split columns. The response must not grow by the other 60 columns.

**Remove** the three readers, their row types, and the `teamRoundStats`, `teamRoundRatings` and `teamRoundSplits` Drizzle tables, plus the helper functions only they used.

**Must not change:**
- The API response, byte for byte, for every club and scope.
- `pbp` and every other route.
- The team Advanced tab.
- The database: the three tables stay in Postgres until you drop them in the pipeline.

## Build steps

- [x] **1. Record the current responses.**
  - Before changing code, save the team advanced JSON for every club of E2025 and E2026 in every scope it has, plus one E2018 and one E2012 club in each of their scopes. Save them to a scratch file outside the repo.
  - **Done when:** the file holds those responses.
- [x] **2. Switch to `app_standings_stats` and remove the three readers and tables.**
  - **Done when:**
    - `cd backend && npm run build` passes.
    - `npx tsc --noEmit --noUnusedLocals` reports nothing.
    - No backend code mentions `teamRoundStats`, `teamRoundRatings` or `teamRoundSplits`.
    - Every saved response is byte-identical to the same request after the change.

## Verify

- `/api/health` reports `"target":"local"`.
- Run `cd backend && npm run build`, `cd frontend && npm run lint`, and `npm run build`.
- The step 1 comparison shows zero differences.
- Run `cd frontend && npx playwright test api-team-advanced.spec.js team-advanced-layout.spec.js`.
- **Manual check:** a team page's Advanced tab (trend chart, splits, SRS) looks the same as before.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3548,"specSha256":"f34b426e8865e795c2735e13ac1288e3a108c1e9ca3ac7ddaccfeba2093e7d10","branch":"refs/heads/fix/team-advanced-reads-standings-stats","head":"04f65f598c8dab9036bc1cb28ec1466e2118b3fb","baseRef":"refs/heads/master","baseCommit":"04f65f598c8dab9036bc1cb28ec1466e2118b3fb","sourceTree":"de3ebc5e83dbf029e59ffcb37d76d06ce27fa6f1","absentOptional":[]} -->
