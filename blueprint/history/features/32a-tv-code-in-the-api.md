# Feature: TV code in the API

**From build-plan:** feature 32a
**Build attempt:** 1
**Branch:** feature/tv-code-in-the-api
**Status:** verified

## Goal

Give the frontend each club's TV code, so later items (the matchup header in 31f-vi, the finished pages in 32b, and every remaining page of 31) can show it where a full name does not fit. A club has two codes: the **club code** (`club_code`), its permanent ID across all seasons (for example Fenerbahce is "ULK"), and the **TV code** (`club_tv_code`), the code in use that season (for example "FBT"), which changes with sponsors and renames. Today only the Standings entries carry the TV code (`clubTvCode`, read from `app_standings`); the games, teams, players, leaders and records responses carry only the club code, the name, the abbreviated name and the crest.

After this item every response that names a club carries its TV code for the requested season: team reference objects get a `tvCode`, and flat rows that carry `clubCode` and `clubName` get a `clubTvCode` (the name Standings already uses). The value is always a non-empty string when the club is known: the season's TV code, or when the season's standings hold none for that club, its abbreviated name, or failing that its club code. API only: no frontend change, no new table, no new endpoint, and every existing field keeps its name and value.

## Design reference

Current code (read; step 1 re-checks it before anything changes):

- `backend/src/db/season-schema.ts`: `app_clubs` (per season: `club_code`, `name`, `abbreviated_name`, `country_code`, `crest_url`; no TV code) and `app_standings` (per season, phase, round and club: `club_code`, `club_name`, `club_tv_code`, `crest_url`, ...). `season_stats` has a text `club_tv_codes` (plural, possibly several clubs for a traded player) that the season-stats response already returns.
- Team reference objects (`{ clubCode, name, abbreviatedName, crestUrl }`): `season-games.ts` builds `localTeam` and `roadTeam` for the games list, one game, and the games of a team or player (`gameTeam(...)`), and `PostseasonClub` for the postseason series; `season-identities.ts` has `Team` (`getTeams`, `getTeam`, and the `team` of a player's registrations).
- Flat rows with a club (`clubCode` plus `clubName`, often `crestUrl`): `routes/seasons.ts` builds them in the advanced standings (a `crests` map from `getTeams`), the advanced leaders (`club(clubCode)`), the player advanced, the player records, single-game and team-season records, the form leaders (`season-form.ts`), the players list and a player's page (`season-identities.ts`: `clubCode`, `clubName`, `crestUrl`), and the season statistics. Standings entries already carry `clubTvCode`.
- Rows that carry only a bare `clubCode` to match players or events to a side (box score, play-by-play, shots, lineups, team stats by club) are not "clubs named in a response" and are left alone.
- `catalogRead` wraps catalog queries; `backend` has no unit-test runner and no lint script, and its build is `tsc`. The Playwright specs reach the API with `page.request.get("http://localhost:3000/api/...")` against the live data.

## In scope

- **One lookup.** A function in the backend (next to the club identity queries in `season-identities.ts`) returns, for a season, a map from club code to TV code for every club of that season. The TV code of a club is the most recent non-empty `club_tv_code` the season's standings hold for it (rows of the regular season first, then the highest round); if there is none, its non-empty `abbreviated_name`; if there is none, its club code. One query for the standings and one for the clubs per request, no cache, no schema change.
- **Team reference objects get `tvCode`.** The games list, a single game, the games of a team and of a player, the postseason series clubs, the teams list, a single team, and the team of a player's registrations: each club object carries `tvCode`. A game side that is still to be set (all fields null) stays `null`, so a `null` team has no code. A side with names but no club code gets `tvCode` from its abbreviated name or name, or `null` when it has neither.
- **Flat rows get `clubTvCode`.** Every row in the other responses that names a club (the inventory in step 1 is the list: the advanced standings and advanced leaders entries, the player records, single-game and team-season records, the form leaders, the players list and a player's page, the player advanced response) carries `clubTvCode`, computed with the same lookup. Standings entries keep the `clubTvCode` they have (read from the standings row, possibly null); the season statistics keep `clubTvCodes`.
- **Documentation.** `DATA_DICTIONARY.md` documents `tvCode` and `clubTvCode`, the lookup rule and its fallbacks.
- **Browser (API) check.** A Playwright spec reads the API and checks the contract on the live data (see Testing).

## Out of scope

- Any frontend change: showing the code anywhere (31f-vi, 32b and the later pages of 31), mock changes, new labels.
- New tables, columns, pipeline changes, caching, a new endpoint, renaming any existing field, changing which clubs a response contains.
- Standings entries and the season-statistics `clubTvCodes` (they keep their existing fields), and rows with only a bare club code.
- Fixing Playwright reliability and flaky-spec items (31n).

## Build loop

`workflow.stepReview` is `feature`: build the steps in order without pausing, run the narrow check after each, run the final gate once after the last step, then present one review packet. `workflow.checkpointCommits` is `disabled`: no step commits; `/complete` makes the single work commit.

## Build steps

- [x] **1. Inventory and the lookup.** Read every handler in `routes/seasons.ts` and every query in `db/season-*.ts` that returns a club, and list in a scratch note outside the repo which responses carry a team reference, which a flat row, and which only a bare club code. Add the lookup function (club code to TV code for a season, with the fallbacks above). Done when the note covers every route that appears in the spec's lists, `cd backend && npm run build` passes, and the lookup returns, for the 2025 season, a non-empty string for every club of `GET /api/seasons/2025/teams` (checked with a scratch call that is not committed).
- [x] **2. Team reference objects.** Add `tvCode` to the games list, a single game, the team and player games, the postseason series clubs, the teams list, a single team and a player's registrations (the games mapper takes the lookup's result, so a request makes one lookup). Done when `cd backend && npm run build` passes and, for the 2025 season, `curl` of `/games?limit=3`, `/games/<code>`, `/teams`, `/teams/<code>`, `/postseason-series` shows a non-empty `tvCode` on every non-null club object.
- [x] **3. Flat rows.** Add `clubTvCode` to the flat rows found in step 1, with the same lookup. Done when `cd backend && npm run build` passes and a `curl` of each affected response shows a non-empty `clubTvCode` on every row that has a `clubCode`, and the standings and season-statistics responses are byte-for-byte unchanged.
- [x] **4. Dictionary and spec.** Document the two fields in `DATA_DICTIONARY.md` and add `frontend/e2e/api-tv-codes.spec.js` (see Testing). Done when `npx playwright test api-tv-codes` passes and the dictionary names the rule and its fallbacks.
- [x] **5. Final gate and handoff.** `npm run build` at the repository root and `cd frontend && npm run lint` pass, the existing browser specs that read the games, teams and players still pass, the spec's boxes are checked, the status is `verified`, and the review packet lists the checks run. Done when both commands exit 0 and the packet names them.

## Files / areas

- `backend/src/db/season-identities.ts` (the lookup; `Team` gets `tvCode`), `backend/src/db/season-games.ts` (the game team references, the postseason series clubs), `backend/src/db/season-form.ts` and `backend/src/routes/seasons.ts` (the flat rows), and any `db/season-*.ts` the inventory shows.
- `DATA_DICTIONARY.md`; `frontend/e2e/api-tv-codes.spec.js` (new).

## Data / contracts

- **Fields.** Team reference objects: `tvCode: string` (a game side with no club code may have `null`). Flat rows: `clubTvCode: string`. Both are present on every club that is known and absent (the object is `null`) or `null` on a row whose `clubCode` is `null`. Never an empty string.
- **Value.** For the requested season: the most recent non-empty `club_tv_code` in `app_standings` for that club (regular-season rows first, then the highest round number); else the club's non-empty `app_clubs.abbreviated_name`; else its `club_code`. The same club in two seasons may have two TV codes.
- **Unchanged.** Existing field names, values, ordering, status codes and error bodies; Standings entries' nullable `clubTvCode`; the season statistics' `clubTvCodes`. A new field on a response never removes or renames another.
- **Input and trust.** Read-only public API; the lookup uses the `seasonCode` the handler already validates and no new input. A database error follows each handler's existing error path (no new error shape).

## Testing

- `frontend/e2e/api-tv-codes.spec.js` (Playwright's API client against the running backend, as `compare.spec.js` does): for the 2025 season,
  - every club object in `/teams`, in `/games` (both sides of every game of a round) and in `/postseason-series` has a non-empty string `tvCode`, and a game side that is still to be set is `null`;
  - for every club in `/phases/RS/standings` that has a non-empty `clubTvCode`, the same club's `tvCode` in `/teams` and in that club's games equals it, and `/teams/:clubCode` agrees with `/teams`;
  - the flat rows of the advanced standings, advanced leaders, the players list, the form leaders and the team-season records carry a non-empty `clubTvCode` that matches the team's wherever they carry a `clubCode`; the single-game records carry `clubTvCode` (without exposing a club code) and the player-season records pass the season statistics' `clubTvCodes` through;
  - the standings entries and the season statistics still carry the fields they had.
- The fallbacks (no standings row, then no abbreviated name) cannot be produced from the live data and the backend has no unit-test runner, so they are reviewed in the code and reported as not tested by a test. There is no declared `Verify` command, so the final gate is the repository build and the frontend lint; the Playwright run is opt-in evidence and is reported as such.
- Existing specs that must stay green: those that read games, teams and players (`responsive`, `game-*`, `games-layout`, `urls-and-titles`, `compare`, `leaders`).

## Notes for the AI

- Keep the change small and mechanical: one lookup, the field added where a club object or row is built. Do not restructure the queries, do not add a join to every query when the lookup's map is enough, and do not change the frontend.
- A request calls the lookup once and reuses the map for every club it returns (a games page of 100 games must not run 200 queries).
- Reuse `catalogRead` and the existing season validation. Write long multi-line files with the Write tool. The Playwright runner starts the backend and frontend itself.
- The backend has no lint or test script: the checks are `npm run build` (`tsc`) and the Playwright API spec.

## Open questions

None. Decided with you: the field is `tvCode` (club objects) and `clubTvCode` (flat rows), and a club without a standings TV code falls back to its abbreviated name, then its club code.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11583,"specSha256":"1b97f6da7aac64f77b784f53eeb399e2708bfb678ba80c768749addc1e464de7","branch":"refs/heads/feature/tv-code-in-the-api","head":"008e59e8124162a7bb0f5fb737a407367d8c555b","baseRef":"refs/heads/master","baseCommit":"008e59e8124162a7bb0f5fb737a407367d8c555b","sourceTree":"ddd8ce5017bce976fc3902a83af88cb9ae35ca3e","absentOptional":[]} -->
