# Feature: Records data

**From build-plan:** feature 33c
**Build attempt:** 1
**Branch:** feature/records-data
**Status:** verified

## Goal

Give the Records page the data it was asked for at review (33d builds the page on it): more metrics for the records, grouped as traditional
and advanced, a fourth record type (team single games) beside player seasons, player single games and team seasons, and a picture for every
holder (the player's headshot and the club's crest) in the rows. The API only grows: every response and field that exists today stays as it is.
No table, migration or frontend change; the Records page keeps working unchanged on the four metrics it uses now.

Today (read from `backend/src/routes/seasons.ts` and `backend/src/db/season-stats.ts`):

- **Three routes**, each `GET /api/seasons/:seasonCode/records/<kind>?metric=`, each merging the loaded seasons (`SUPPORTED_SEASONS`) into the
  top 50 rows and answering `{ metric, label, records }`:
  - `player-seasons` (metric `pointsScored`, `totalRebounds`, `assists`, `pir`; `RECORD_METRICS`): season totals over all phases
    (`app_season_player_stats_traditional`, phase `all`, mode `accumulated`) through `getSeasonRecordRows`; rows `seasonCode`, `personKey`,
    `playerName`, `clubName`, `clubTvCodes`, `value` (a string), `numericValue`.
  - `single-games` (metric `points`, `valuation`, `totalRebounds`, `assistances`: the box-score column names): the best 50 per season from
    `app_game_player_stats` joined to played games; rows `gameCode`, `personKey`, `playerName`, `clubName`, `scheduledAt`, `seasonCode`,
    `clubTvCode`, `value`, `numericValue`.
  - `team-seasons` (the same four box-score names): the season sum of `app_game_team_stats` (`stats_kind = 'total'`, played games) per club;
    rows `seasonCode`, `clubCode`, `clubName`, `clubTvCode`, `value`, `numericValue`.
  - An unknown metric answers 400 `INVALID_RECORD_METRIC`. A row whose value is null or not finite is dropped.
- **Images:** no record row carries a picture. The data has them: `app_season_player_stats_traditional.player_image_url` and `club_image_url`,
  `app_game_player_stats.headshot_url`, and club crests from the season's teams (`getTeams`, `crestUrl`).
- **The two metric vocabularies differ** (`pointsScored`/`assists`/`pir` on the season route, `points`/`assistances`/`valuation` on the other two);
  the page maps one onto the other (`ROUTE_METRICS` in `RecordsPage`).
- **Advanced data that exists:** `app_player_round_ratings` (`per`) and `app_player_round_win_shares` (`win_shares`), cumulative by round and scope;
  `app_game_player_advanced` (`game_score`, per game); `app_team_round_ratings` (team ratings by round) and `app_game_team_advanced`
  (`offensive_rating`, `net_rating`, per game). The Leaders Advanced board already ranks PER and Win Shares and applies a minimum.

## In scope

1. **One metric catalogue.** A new `backend/src/db/season-records.ts` holds, per record type, the metrics it supports: key, label, group
   (`traditional` or `advanced`) and where its value comes from. The four routes read it, so a new metric is one entry. The keys are the
   season route's (`pointsScored`, `totalRebounds`, ...); the single-game and team routes also keep accepting their present names
   (`points`, `assistances`, `valuation`) as aliases, so nothing that calls them today breaks.
2. **Traditional metrics, all four record types:** `pointsScored` (Points), `totalRebounds` (Rebounds), `offensiveRebounds`, `defensiveRebounds`,
   `assists`, `steals`, `blocks`, `twoPointersMade`, `threePointersMade`, `freeThrowsMade`, `pir` (PIR). Season records sum or read the season
   total; game records read the game's column.
3. **Advanced metrics** (counts and ratings only; see the open questions): player seasons `per` (PER) and `winShares` (Win Shares), for qualified
   players only and read after the season's latest round; player games `gameScore` (Game Score); team seasons `offensiveRating` and
   `netRating`, read after the season's latest round; team games `offensiveRating` and `netRating`.
4. **Team single games.** A new route `GET /api/seasons/:seasonCode/records/team-games?metric=` with the best 50 team games across the loaded
   seasons (played games only, both clubs' rows), rows `seasonCode`, `gameCode`, `clubCode`, `clubName`, `clubTvCode`, the opponent
   (`opponentClubCode`, `opponentName`, `opponentTvCode`), `scheduledAt`, `value`, `numericValue`.
5. **Pictures.** Every row of every route carries `playerImageUrl` (player rows) and `clubImageUrl`, each a string or `null`: from the season
   stats row for player seasons, from the game row's headshot and the season's team list for single games, from the season's team list
   for the two team routes. A missing picture is `null`, never an empty string.
6. **Response.** Every record route answers `{ metric, label, group, records }`: the requested key, its label, its group, the rows. Rows keep
   every field they have today.
7. **Checks.** A new `frontend/e2e/records-api.spec.js` reads the live local API for every record type and metric.

## Out of scope

- The Records page and every other frontend file (33d); the metric strip, the team-games tab and the pictures on screen are there.
- New tables, migrations, indexes or pipeline changes; percentage metrics (true shooting, effective field goal, rebound or usage
  percentages), per-100 and per-40 rates, and the "negative" records (turnovers, fouls); minutes; double-doubles and triple-doubles.
- Changing the ranking rule (the top 50 across the loaded seasons, highest first), the loaded seasons, or any existing response field.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the narrow check after
each, then present one final review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Baseline and catalogue.** Before changing code, save the answers of the three routes for every present metric (season `2025`, local
      database) as throwaway JSON files outside the repo, and read how the Leaders Advanced board reads PER and Win Shares (the scope, the
      latest round, the minimum) and which columns `app_team_round_ratings` and `app_game_team_advanced` carry for the offensive and net
      ratings. Then add `season-records.ts` with the catalogue and route the existing four metrics of each route through it.
      Done when: `cd backend && npm run build` passes and, for the present metrics, each route's answer equals the saved baseline apart from
      the added `group` field and the new image fields (compared with a throwaway script; the script and files are deleted afterwards).
- [x] 2. **Player seasons.** The traditional metrics, `per` and `winShares` (qualified players, latest round), and the image fields.
      Done when: every player-season metric answers 200 with at most 50 rows, highest first, finite `numericValue`, and rows carry
      `playerImageUrl` and `clubImageUrl` (a string or `null`); the PER and Win Shares rows are qualified players only.
- [x] 3. **Player games.** The traditional metrics, `gameScore`, and the image fields (the headshot from the game row, the crest from the
      season's team list).
      Done when: every metric answers 200 with at most 50 rows, highest first; the old names (`points`, `assistances`, `valuation`) still
      answer as before; rows carry both image fields.
- [x] 4. **Team seasons and team games.** The traditional metrics and the ratings on `team-seasons`; the new `team-games` route; crests on
      both.
      Done when: both routes answer every metric with at most 50 rows, highest first; `team-games` rows carry the game, the club and the
      opponent; a game appears for each club separately; the old team-season names still answer as before.
- [x] 5. **API spec and gate.** Write `records-api.spec.js`, run it, and run the backend build and the frontend lint.
      Done when the spec passes on the local database (`/api/health` says `local`), with root `npm run build` and `cd frontend && npm run lint`.

## Files / areas

- `backend/src/db/season-records.ts` (new: the catalogue and the record queries), `backend/src/routes/seasons.ts` (the four record routes call
  it; the inline record code moves), `backend/src/db/season-stats.ts` (`getSeasonRecordRows` and `RecordMetric` are generalised or replaced by the
  catalogue), `backend/src/db/season-schema.ts` and `season-advanced-schema.ts` read only.
- `frontend/e2e/records-api.spec.js` (new). No other frontend file.

## Data / contracts

Additive on the server, no table change. `GET /api/seasons/:seasonCode/records/{player-seasons|single-games|team-seasons|team-games}?metric=<key>`:

- `metric` is a key of the catalogue for that record type, or (single-games, team-seasons) one of the three old names; the default stays the first
  traditional metric (`pointsScored`, or `points` where the old default was kept). Anything else answers 400 `INVALID_RECORD_METRIC`, as now.
- `200`: `{ metric: string, label: string, group: "traditional" | "advanced", records: Row[] }`, `records` at most 50, ordered by
  `numericValue` descending (ties as today: season, then the club or game code).
- `Row` keeps today's fields and adds `playerImageUrl` (player rows only) and `clubImageUrl`, each `string | null`; `team-games` rows add
  `opponentClubCode`, `opponentName`, `opponentTvCode`. `value` stays the stored number as a string, `numericValue` a finite number.
- A row whose value is null or not finite is dropped; `PER` and `winShares` rows are for qualified players only; a season with no advanced rows
  contributes none. All values are read-only reads of existing tables; the picture URLs are the pipeline's, passed through as stored and
  rendered by the client as image sources, never as HTML.
- Errors and limits: only the existing 400 and the existing server error path; the response is bounded by the 50-row limit and by the four
  loaded seasons.

## Testing

No unit test runner is configured and no `Verify` command is declared in `AGENTS.md`, so none was run while writing this spec. The backend is checked
by `cd backend && npm run build` (the TypeScript check) and by `frontend/e2e/records-api.spec.js`, which calls the live local API (the dev backend
must report `"target":"local"` at `/api/health` first; Playwright starts it when nothing listens on 3000, so check its health before trusting the run).
For each record type and each metric of its catalogue it checks: status 200, `metric`, `label` and `group` as catalogued, at most 50 rows, ordered by
`numericValue` descending, every `numericValue` finite, the image fields present and each a string or `null`, the team-games opponent fields; and
it checks an unknown metric answers 400 `INVALID_RECORD_METRIC`, the old metric names still answer, and the PER and Win Shares rows are qualified
players (a spot check against the season stats' `qualified` flag). Run only this spec file (and nothing else; no page changes here); rerun a single
failing test with `-g`. Final gate: root `npm run build` plus `cd frontend && npm run lint`.

## Notes for the AI

- Follow the user's rules: changes stay in the area being built (the records API), nothing in the frontend. The existing four metrics of the three
  routes must answer as they do today; compare against the baseline before and after (step 1). Never open the real `.env`; the local database is the
  `DB_TARGET=local` one.
- Reuse what exists: `catalogRead`, `getClubTvCodes`, `getTeams` (crests), `SUPPORTED_SEASONS`, the `qualified` column of the season stats, and
  the Leaders Advanced board's way of reading PER and Win Shares (find it in `backend/src/db/`); do not invent a second rule for "latest round" or
  "qualified". Match the surrounding code style and comment density. No AI attribution in commit messages (AGENTS.md).
- Percentage and per-100 records need a minimum-volume rule (Leaders has one per stat) and are a later item if wanted.

## Open questions

Each has a recommended default, which the steps above build unless you say otherwise.

1. **Which metrics.** *Recommended:* the lists above (eleven traditional on every record type; PER and Win Shares, Game Score, offensive and net
   rating as the advanced ones). Left out on purpose: percentages and rates (they need a minimum-volume rule per stat, as Leaders has), turnovers and
   fouls (records of a bad thing), minutes, double-doubles. Alternative: tell me the list you want.
2. **Qualified players for PER and Win Shares.** *Recommended:* only players the season stats mark `qualified` (Leaders' own rule), so a record is
   never set in a handful of games. Alternative: all players.
3. **Old metric names stay.** *Recommended:* `points`, `assistances` and `valuation` keep working on the single-game and team-season routes
   alongside the new keys, so nothing breaks while the page is moved over in 33d. Alternative: switch the page and the routes to one vocabulary now.
4. **The opponent on team-games rows.** *Recommended:* include it (a team record reads poorly without who it was against). Player-game rows
   do not get it here. Alternative: leave it out.

## Built

All four open questions were built with their recommended defaults.

- `backend/src/db/season-records.ts` holds the catalogue (eleven traditional metrics on every kind; PER and Win Shares, Game Score, offensive and net
  rating as the advanced ones), the old-name aliases and the four record queries; the four routes in `seasons.ts` are one loop over `RECORD_KINDS`
  that validates the metric against it (400 `INVALID_RECORD_METRIC` otherwise) and answers `{ metric, label, group, records }`.
  `season-stats.ts` only gained the wider `RecordMetric` type and the two image fields in `getSeasonRecordRows`.
- Before the change the three routes' answers for all twelve present metric and kind pairs (season 2025, local database) were saved; after it a
  throwaway spec compared them: every present answer is identical apart from the added `group` and image fields (13 of 13). The spec and files
  were deleted.
- Evidence: `records-api.spec.js` (55 tests: every kind and metric, ordering, labels, groups, picture fields, the pictures being present, the
  400s and the old names, and the qualified-players rule for PER and Win Shares) passes on the local database (`/api/health` said `local`);
  `cd backend && npm run build` (through root `npm run build`) and `cd frontend && npm run lint` pass.
- Known weakness, not a defect of this item: the ratings and PER read after a season's latest round, so in the season still being played
  (E2026) a club's net rating or a qualified player's PER after a few games can top the list (a net rating of 27.6 for one club, a PER of 32).
  A rule for it (a minimum number of games, or finished seasons only) is a product choice for 33d or a follow-up.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":14940,"specSha256":"bf2738f8cda58061f282b5103abd58993fd4c3f2e0b306e8046d2c18c21fd9d9","branch":"refs/heads/feature/records-data","head":"8c5845a83815c9f7c33a21b518457e1e6003a1b0","baseRef":"refs/heads/master","baseCommit":"8c5845a83815c9f7c33a21b518457e1e6003a1b0","sourceTree":"0953114c1c6bd760d4fcccbd79eced9f21342935","absentOptional":[]} -->

## Completion evidence

- Browser tests on the local database (`/api/health` said `local`): `records-api.spec.js` (55 tests, every record kind and metric, ordering, labels, groups, picture fields, the 400s, the old names, and the qualified-players rule) passed.
- Before the change the 12 present metric and kind answers (season 2025) were saved and, after it, compared with a throwaway spec: identical apart from the added `group` and picture fields (13 of 13); the spec and files were deleted.
- Root `npm run build` (including the backend `tsc` check) and `cd frontend && npm run lint` pass (rerun at completion). No `Verify` command is declared in `AGENTS.md`.
- No page changed; the Records page is built on this data in 33d.
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested.
