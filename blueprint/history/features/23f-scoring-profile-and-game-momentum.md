# Feature: Scoring profile and game momentum

**From build-plan:** feature 23f
**Build attempt:** 1
**Branch:** feature/scoring-profile-and-game-momentum
**Status:** verified

## Goal

Show how each team scored and how the game was led, using three pipeline tables that have one row per team per
game: `app_game_team_score_flow` (who led, for how long, runs, clutch), `app_game_team_shot_splits` (fast-break,
second-chance and points-off-turnover points, assisted baskets) and `app_game_team_possessions` (counted
possessions and possession length). One new endpoint serves them. The Team comparison tab gets a **Scoring
profile** section of mirrored bars, and the Overview's key stats gain the four rows that best tell the story of the
game. The backend only reads the tables; nothing is recomputed in the API or the browser.

## In scope

- **Backend:** Drizzle definitions for the three tables in `season-advanced-schema.ts`, one read function, and
  `GET /api/seasons/:seasonCode/games/:gameCode/team-flow` returning, per side, a `flow`, a `splits` and a
  `possessions` block (each `null` when that table has no row for the game).
- **Team comparison tab:** a third, full-width **Scoring profile** section under the Head to head / Four Factors pair,
  its rows in a two-column grid on wide screens (one column on narrow ones), as mirrored `ComparisonRow`s:
  - Time in front (higher), Biggest lead (higher), Longest run (higher), Runs of 6+ points (higher),
    Lead changes (neutral), Ties (neutral), Clutch points (higher).
  - Fast-break points (higher), Second-chance points (higher), Points off turnovers (higher), Assisted baskets
    (higher, bar sized by the assisted share).
  - Possessions counted (neutral) and Average possession (neutral, seconds).
- **Overview key stats:** four rows appended to the existing key-stat bars: Time in front, Biggest lead,
  Fast-break points and Second-chance points. If the team-flow request fails or has no rows, the Overview shows
  its existing rows and nothing else changes.
- **Display rules:** time in front prints as `m:ss` with its share of the game ("32:11 (80%)"); assisted baskets
  print as "19 of 30 (63.3%)"; a `NULL` is an em dash, never zero. **Clutch** is the points a team scored in the
  last five minutes of regulation and overtime while the margin was 5 or less; a game with no such time
  (`clutch_seconds` of 0, about 45% of E2025 team games) shows an em dash on both sides, not 0.
- **States:** the Scoring profile has its own loading, error (with retry) and "not available for this game yet"
  states, independent of the other two sections; an unplayed game still shows only the unplayed message.

## Out of scope

- Changing the Game flow tab, the score-flow chart or the Rotations tab. Lead changes, ties, biggest lead and
  longest run are read from the pipeline here; the Game flow tab keeps computing its own from play-by-play (checked
  on four E2025 games: the two agree).
- Shot zones, lineups and on-court intervals (23g, 23h); season averages or markers for these measures.
- Any write to Neon, any recomputation of a pipeline measure, and any new table.
- A new tab, or a change to the Four Factors and Head to head panels.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`. Build
the steps in order, running each step's check as you go, then present one review packet after the last step.
No per-step approval pauses and no checkpoint commits; `/complete` makes the final commit.

## Build steps

- [x] **1. Tables and endpoint.** In `backend/src/db/season-advanced-schema.ts` add `gameTeamScoreFlow`,
  `gameTeamShotSplits` and `gameTeamPossessions` (`app_game_team_score_flow`, `app_game_team_shot_splits`,
  `app_game_team_possessions`) with the columns in Data / contracts and the key `competition_code, season_code,
  game_code, side`. In `season-advanced.ts` add `getGameTeamFlow(seasonCode, gameCode)`. In `routes/seasons.ts` add
  the endpoint after `/advanced`, with the same season and game-code validation and `404 GAME_NOT_FOUND`.
  *Done when* `cd backend && npm run build` passes and, against the real database, `E2026` game 13 returns
  Dubai with `largestLead` 20, `longestRun` 12, `timeLeadingSeconds` 1931, `fastBreakPoints` 12, `assistedFgPct`
  0.633333 and `countedPossessions` 73, and Barcelona with `largestLead` 6, `secondChancePoints` 17 and
  `countedPossessions` 72.
- [x] **2. Row builders and the page query.** Add `getGameTeamFlow` to `frontend/src/lib/api.js`. Add
  `frontend/src/games/teamFlow.js` with pure functions that turn the endpoint's two sides into `ComparisonRow`
  shaped rows (`key`, `label`, `tip`, `direction`, `rawA`, `rawB`, `displayA`, `displayB`) for the full Scoring
  profile and for the four Overview rows, including the clutch and `NULL` rules. In `GameDetailPage.jsx` run one
  query (`["game-team-flow", seasonCode, gameCode]`, played games only, enabled on the Overview and Team comparison
  tabs, no retry) and pass it down. *Done when* `cd frontend && npm run lint` and `npm run build` pass.
- [x] **3. Scoring profile section.** Add `frontend/src/games/ScoringProfile.jsx` (rows in a two-column grid, its
  own loading, error and unavailable states, team labels above) and render it under the Head to head / Four
  Factors pair in `TeamComparisonTab`. *Done when* lint and build pass and the section shows for a game with data
  and an honest message for one without.
- [x] **4. Overview rows.** Append the four rows to `KeyStatsCard` in `OverviewTab.jsx` when team-flow data is
  available, without waiting for it and without an error state of their own. *Done when* lint and build pass and the
  Overview is unchanged when the request fails.
- [x] **5. Browser tests.** Add a team-flow fixture and a default mock to `frontend/e2e/support/game-fixtures.js`
  (an unmocked path returns the harness's 404), add `frontend/e2e/game-scoring-profile.spec.js`, and extend
  `game-overview.spec.js`. Cover: the rows with values and directions, `m:ss` and share display, assisted
  "x of y", the clutch em dash when there is no clutch time, `NULL` blocks, the unavailable and error states, the
  Overview rows appearing and being absent on failure, and the two-column grid on a wide screen. *Done when*
  `cd frontend && npm run test:browser` passes.

## Files / areas

- `backend/src/db/season-advanced-schema.ts`, `backend/src/db/season-advanced.ts`, `backend/src/routes/seasons.ts`.
- `frontend/src/lib/api.js`, new `frontend/src/games/teamFlow.js`, new `frontend/src/games/ScoringProfile.jsx`,
  `frontend/src/games/GameDetailPage.jsx`, `frontend/src/games/OverviewTab.jsx`.
- `frontend/e2e/support/game-fixtures.js`, new `frontend/e2e/game-scoring-profile.spec.js`,
  `frontend/e2e/game-overview.spec.js`.
- Reused, unchanged: `ComparisonRow`, `AsyncState`, `PanelHeader`, `TeamLabel`, `format.js` helpers.

## Data / contracts

**Tables read** (all in `public`, E2025 and E2026 only, SELECT granted to the API role; checked in Neon on
2026-10-02: 804 and 48 rows each, one pair of rows for every played game, no `NULL` in any column for these two
seasons). `numeric` decodes to numbers through the existing `measure()` helper, `integer` stays an integer.

- `app_game_team_score_flow`, key `competition_code, season_code, game_code, side`: `club_code`,
  `opponent_club_code`, `points_for`, `points_against`, `lead_changes`, `ties`, `time_leading_seconds`,
  `time_trailing_seconds`, `time_tied_seconds`, `largest_lead`, `longest_run`, `runs_6_plus`, `clutch_seconds`,
  `clutch_points_for`, `clutch_points_against`. `lead_changes` and `ties` are identical on both rows. The three
  time columns add up to 2,400 seconds plus 300 per overtime; they can be `NULL` for a game with an unusable clock
  (none in E2025 or E2026).
- `app_game_team_shot_splits`, same key: `club_code`, `opponent_club_code`, `fast_break_points`,
  `second_chance_points`, `points_off_turnover_points`, `field_goals_made`, `assisted_field_goals`,
  `assisted_fg_pct` (a fraction). The three point columns are `NULL` before E2016 and for a game with an unflagged
  shot.
- `app_game_team_possessions`, same key: `club_code`, `opponent_club_code`, `counted_possessions`,
  `possession_seconds`, `avg_possession_seconds`, `estimated_possessions`.

**Response** of `GET /api/seasons/:seasonCode/games/:gameCode/team-flow` (camelCase; numbers or `null`):

```json
{
  "available": true,
  "teams": [{
    "side": "local", "clubCode": "DUB",
    "flow": { "pointsFor": 94, "pointsAgainst": 87, "leadChanges": 5, "ties": 5, "timeLeadingSeconds": 1931,
      "timeTrailingSeconds": 258, "timeTiedSeconds": 211, "largestLead": 20, "longestRun": 12, "runs6Plus": 5,
      "clutchSeconds": 1, "clutchPointsFor": 1, "clutchPointsAgainst": 0 },
    "splits": { "fastBreakPoints": 12, "secondChancePoints": 8, "pointsOffTurnoverPoints": 10, "fieldGoalsMade": 30,
      "assistedFieldGoals": 19, "assistedFgPct": 0.633333 },
    "possessions": { "countedPossessions": 73, "possessionSeconds": 1249, "avgPossessionSeconds": 17.109589,
      "estimatedPossessions": 72.92 }
  }]
}
```

- A block is `null` when its table has no row for that side. `available` is `false` (with `teams: []`) when none of
  the three tables has any row for the game. Unknown game: `404 GAME_NOT_FOUND`; bad season or game code: the
  existing `400` errors.
- Reference game, `E2026` game 13 (Dubai 94, Barcelona 87): Dubai led for 1,931 of 2,400 seconds, 5 lead changes and
  5 ties; fast-break points 12 against 10; second-chance points 8 against 17; assisted share 63.3% against 42.9%;
  counted possessions 73 against 72 (box-score estimate 72.92).

## Testing

- No unit-test command exists. The API is checked against the real database in step 1 (game 13 values, a game with
  no rows, the 404 and 400 cases).
- Browser tests (Playwright, mocked API) in step 5 are the evidence for the UI. No live-browser check is claimed
  unless run.
- `cd backend && npm run build`, `cd frontend && npm run lint` and `npm run build` pass before review (all three
  passed at the start of this feature).

## Notes for the AI

- Reuse `ComparisonRow`; do not add new row components. Rows are plain objects built in `teamFlow.js` so the Overview
  and the Team comparison share them.
- `NULL` is an em dash, never zero. The one deliberate exception to "show the number" is clutch: no clutch time shows
  an em dash because 0 points would read as a real zero.
- Time in front is seconds on the wire; print it with `formatMinutes`. The share is the team's leading seconds over
  the sum of leading, trailing and tied seconds.
- Percentages from the pipeline are fractions; use `formatFractionPercent`.
- Lead changes, ties and the counted-possession and possession-length rows are neutral: both teams show the same
  number or no side is "better", so no highlight and no "Lower is better".
- The new query must not block the Overview or the other two Team comparison sections; a failure only affects its
  own rows.
- The Team comparison grid keeps the equal-height pair above untouched; the Scoring profile is a separate full-width
  section so adding rows never stretches the Head to head and Four Factors panels.

## Open questions

- **Which Overview rows.** The spec adds Time in front, Biggest lead, Fast-break points and Second-chance points to
  the Overview and keeps everything else on the Team comparison tab. Not blocking: the list is one array in
  `teamFlow.js`. Say if you want a different set.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11715,"specSha256":"f72c3dacde58cc6c1ebb604d9000594ec515223b75c4b25dc2bf51e24663b47b","branch":"refs/heads/feature/scoring-profile-and-game-momentum","head":"00a3ea9ff50b7dc576e5711d75c5a039fd7d0c15","baseRef":"refs/heads/master","baseCommit":"00a3ea9ff50b7dc576e5711d75c5a039fd7d0c15","sourceTree":"a5c6ecb4a8e08ed81155c8c3f5d9a7eb035e0fb7","absentOptional":[]} -->
