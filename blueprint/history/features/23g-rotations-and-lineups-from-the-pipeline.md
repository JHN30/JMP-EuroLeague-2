# Feature: Rotations and lineups from the pipeline

**From build-plan:** feature 23g
**Build attempt:** 1
**Branch:** feature/rotations-and-lineups-from-the-pipeline
**Status:** verified

## Goal

Feed the game page's **Rotations** tab from the pipeline instead of rebuilding who was on the court in the browser, and
add a **Lineups** section for the game. `app_game_player_on_court` gives each player's on-court intervals in elapsed
game seconds; `app_game_team_lineup_stints` gives every stretch with the same ten players on the floor, with
possessions and points for and against. One new endpoint serves both. The tab keeps its minutes timeline and assist
connections and gains the Lineups below them. The backend only reads and rolls up the published rows; it does not
recompute on-court time or points.

## In scope

- **Backend:** Drizzle definitions for the two tables, one read function, and
  `GET /api/seasons/:seasonCode/games/:gameCode/lineups` returning:
  - `onCourt`: per side and player, the intervals (`startSeconds`, `endSeconds`).
  - `units`: per side, the stints rolled up by five-man unit (the sorted `person_key`s), with the unit's seconds,
    number of stints, possessions and points for and against, plus/minus, and offensive, defensive and net rating
    per 100 possessions (`NULL` when a side of possessions is 0).
  - `gameSeconds` (2,400 plus 300 per overtime, from the intervals) and `available`.
- **Minutes timeline:** rebuilt from `onCourt` plus the box score (names, starters, minutes), replacing
  `computeRotations` and its play-by-play reconstruction. The look stays: one bar per player across period
  boundaries, starters first, then minutes, the accessible "On court" text and the Min column. The reconciliation
  badge stays: "Matches the box score" when every player is within 30 seconds, otherwise "Approximate · up to N s off
  the box score". The old "some substitutions couldn't be placed" wording goes, since nothing is placed any more.
- **Assist connections:** unchanged, still computed from the play-by-play.
- **Lineups section:** below the connections, one panel per team listing the five-man units that played together in
  the game: the five players (linked, from the box score), minutes (`m:ss`), possessions for, points for and against,
  plus/minus, and net rating per 100 possessions. A **Minimum minutes** select (All stints, 2+ minutes, 4+ minutes,
  default 2+) filters the units; ordered by minutes, then plus/minus, then the unit key. A note says small samples
  swing a lot.
- **States:** the three sections load independently and each has its own loading, error (with retry) and
  empty/unavailable state; an unplayed game still shows only the "Rotations aren't available until this game is
  played." message. No fall-back to the old browser reconstruction.

## Out of scope

- Player on/off, RAPM and season lineup ratings (already on the Team and Player pages); lineups of other sizes (the
  table has only full five-man stints); opponent lineups (each side lists its own units).
- Changing the assist-connections logic, the Game flow tab or any other tab.
- Plus/minus per player (the box score already shows it) and lineup comparisons across games.
- Any write to Neon, any recomputation of a pipeline measure, and any new table.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`. Build
the steps in order, running each step's check as you go, then present one review packet after the last step.
No per-step approval pauses and no checkpoint commits; `/complete` makes the final commit.

## Build steps

- [x] **1. Tables and endpoint.** In `backend/src/db/season-advanced-schema.ts` add `gamePlayerOnCourt`
  (`app_game_player_on_court`, key `competition_code, season_code, game_code, side, person_key, interval_ordinal`) and
  `gameTeamLineupStints` (`app_game_team_lineup_stints`, key `competition_code, season_code, game_code, side,
  stint_ordinal`). In `season-advanced.ts` add `getGameLineups(seasonCode, gameCode)` that reads both and rolls the
  stints up by unit. In `routes/seasons.ts` add the endpoint after `team-flow`, with the same season and game-code
  validation and `404 GAME_NOT_FOUND`. *Done when* `cd backend && npm run build` passes and, against the real
  database, `E2026` game 13 returns each side's units with seconds summing to 2,400, local points for and against of
  94 and 87, local possessions for of 73, and Dubai's most-played unit
  `011212,011231,011286,012606,012796` at 1,041 seconds with 42 points for and 43 against.
- [x] **2. Interval-based rotations.** Add `getGameLineups` to `frontend/src/lib/api.js`. In
  `frontend/src/games/rotations.js` replace `computeRotations` with a function that builds the same row shape
  (`player`, `stints` with `startLabel`/`endLabel`, `seconds`) from `onCourt`, the box-score rows and `gameSeconds`,
  plus `maxDifference` and `matches` against the box-score minutes; remove the substitution-reconstruction code.
  In `GameDetailPage.jsx` run one query (`["game-lineups", seasonCode, gameCode]`, played games only, enabled on the
  Rotations tab, no retry) and pass it to `RotationsTab`. *Done when* `cd frontend && npm run lint` and `npm run build`
  pass.
- [x] **3. Timeline and connections on their own queries.** Rework `RotationsTab.jsx` so the timeline reads the
  lineups query and the box score, the connections read only the play-by-play, and neither waits for the other; the
  tab stops blocking on play-by-play as a whole. *Done when* lint and build pass and each section shows its own
  loading, error and empty state.
- [x] **4. Lineups section.** Add `frontend/src/games/LineupsSection.jsx` (the two team panels, the minimum-minutes
  select using `LabelledSelect`, names from the box score, the empty state "No five-man unit played N+ minutes
  together." and the small-sample note) and render it under the connections. *Done when* lint and build pass and the
  filter changes the rows.
- [x] **5. Browser tests.** Add a lineups fixture and default mock to `frontend/e2e/support/game-fixtures.js`
  (an unmocked path returns the harness's 404), rewrite the timeline tests in `frontend/e2e/game-rotations.spec.js`
  for interval data (bars across period boundaries, the three badge outcomes, a team without intervals), keep the
  connections tests, and add `frontend/e2e/game-lineups.spec.js`. *Done when* `cd frontend && npm run test:browser`
  passes.

## Files / areas

- `backend/src/db/season-advanced-schema.ts`, `backend/src/db/season-advanced.ts`, `backend/src/routes/seasons.ts`.
- `frontend/src/lib/api.js`, `frontend/src/games/rotations.js`, `frontend/src/games/RotationsTab.jsx`, new
  `frontend/src/games/LineupsSection.jsx`, `frontend/src/games/GameDetailPage.jsx`.
- `frontend/e2e/support/game-fixtures.js`, `frontend/e2e/game-rotations.spec.js`, new `frontend/e2e/game-lineups.spec.js`.
- Reused, unchanged: `computeConnections`, `PlayerLink`, `TeamLabel`, `LabelledSelect`, `AsyncState`, `format.js`.

## Data / contracts

**Tables read** (all in `public`, E2025 and E2026 only, SELECT granted to the API role; checked in Neon on
2026-10-02):

- `app_game_player_on_court`, key `competition_code, season_code, game_code, side, person_key, interval_ordinal`:
  `club_code`, `start_seconds`, `end_seconds` (integers, elapsed game seconds). Every player with box-score minutes
  has rows: 8,741 of 8,741 in E2025 and 545 of 545 in E2026. The summed intervals are within 5 seconds of the box
  score for 8,634 E2025 player-games (98.8%) and within 30 seconds for 8,640; 4 are more than 120 seconds off. E2026:
  all 545 within 5 seconds.
- `app_game_team_lineup_stints`, key `competition_code, season_code, game_code, side, stint_ordinal`: `club_code`,
  `opponent_club_code`, `start_seconds`, `end_seconds`, `players` and `opponent_players` (the five `person_key`s,
  sorted and joined by commas), `possessions_for`, `possessions_against`, `points_for`, `points_against`. Each stint
  appears once per side. In `E2026` game 13 each side's stints total 2,400 seconds and equal the final score (94
  and 87).

**Response** of `GET /api/seasons/:seasonCode/games/:gameCode/lineups` (camelCase; numbers or `null`):

```json
{
  "available": true,
  "gameSeconds": 2400,
  "onCourt": [{ "side": "local", "clubCode": "DUB", "personKey": "011286",
    "intervals": [{ "startSeconds": 0, "endSeconds": 416 }, { "startSeconds": 569, "endSeconds": 1462 }] }],
  "units": [{ "side": "local", "clubCode": "DUB", "players": ["011212", "011231", "011286", "012606", "012796"],
    "seconds": 1041, "stints": 9, "possessionsFor": 32, "possessionsAgainst": 30, "pointsFor": 42, "pointsAgainst": 43,
    "plusMinus": -1, "offensiveRating": 131.25, "defensiveRating": 143.33, "netRating": -12.08 }]
}
```

- `plusMinus` is points for minus points against. `offensiveRating` is `100 x pointsFor / possessionsFor` and
  `defensiveRating` is `100 x pointsAgainst / possessionsAgainst`; `netRating` is their difference; each is `null`
  when its possessions are 0. These are display roll-ups of the published stints for this one game.
- `onCourt` and `units` are independent: either list can be empty. `available` is `false` (both lists empty) when the
  game has no rows in either table. Unknown game: `404 GAME_NOT_FOUND`; bad season or game code: the existing `400`
  errors. Intervals are returned in time order; units are returned unsorted (the page sorts).
- A player's `person_key` is the same key the box score uses; names, starters and minutes come from the box score.

## Testing

- No unit-test command exists. The API is checked against the real database in step 1 (game 13 sums and the Dubai
  unit above, a game without rows, the 404 and 400 cases).
- Browser tests (Playwright, mocked API) in step 5 are the evidence for the UI. No live-browser check is claimed
  unless run.
- `cd backend && npm run build`, `cd frontend && npm run lint` and `npm run build` pass before review (all three
  passed at the start of this feature).

## Notes for the AI

- The elapsed-seconds convention is the pipeline's: Q1 starts at 0, each quarter is 600 seconds, each overtime 300.
  Label a stint start by the period it begins in and a stint end by the period it ends in, so an interval ending at
  600 reads "Q1 00:00" and one starting at 600 reads "Q2 10:00". Reuse `periodSeconds` and `formatPeriod`.
- Names, starter flags and the reference minutes come from the box-score rows (`started`, `timePlayed`); a key with
  no box-score row is shown as its key.
- Keep `computeConnections` and its tests as they are. Delete only what the reconstruction needed and nothing else
  uses.
- Filtering by minimum minutes is a view over the already-loaded units, not a new request.
- Plus/minus and ratings of a two-minute unit are noisy; the note under the tables says so, and ratings show an em
  dash when possessions are 0, never zero.
- One section failing must not hide another; each has its own retry.

## Open questions

- **Minimum-minutes options.** The spec offers All, 2+ and 4+ minutes and defaults to 2+ (about 7 units per team per
  game in E2025). The Team page's possession thresholds are for season samples and do not carry over to one game.
  Not blocking: the options are one array in `LineupsSection.jsx`. Say if you want others.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11529,"specSha256":"1fdeb457e7e58e65e19d4213d6690ada9ac7779de54c1a7b621c05b9a6c3f826","branch":"refs/heads/feature/rotations-and-lineups-from-the-pipeline","head":"77fee72cd714a4f38059f63d42c947041ce84e99","baseRef":"refs/heads/master","baseCommit":"77fee72cd714a4f38059f63d42c947041ce84e99","sourceTree":"853bce1573fa74338d6225db762faf08e62a86f1","absentOptional":[]} -->
