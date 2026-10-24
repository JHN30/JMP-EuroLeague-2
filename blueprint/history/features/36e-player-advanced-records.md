# Feature: Player advanced records

**From build-plan:** feature 36e
**Build attempt:** 1
**Status:** verified
**Branch:** feature/player-advanced-records

## Goal

On `/:season/records`, fill the player Advanced group with the season metrics the advanced player tables already hold
(Win Shares split by side and per 40, shooting efficiency, usage and the rate statistics, Game Score average, PIE) and
add Game PER to the single-game records, each with a minimum that keeps a handful of minutes or shots from setting a
record.

## In scope

- **Player seasons, Advanced** (after the season's latest round, scope `all`, qualified players as PER and Win Shares
  read them now). PER and Win Shares stay as they are; the new metrics follow them in this order:

  | Key | Label | Table, column | Format | Minimum |
  |---|---|---|---|---|
  | `offensiveWinShares` | Offensive Win Shares | `app_player_round_win_shares.off_win_shares` | decimal | none (a total, like Win Shares) |
  | `defensiveWinShares` | Defensive Win Shares | `app_player_round_win_shares.def_win_shares` | decimal | none |
  | `winSharesPer40` | Win Shares / 40 | `app_player_round_win_shares.win_shares_per_40` | decimal3 | 20 games, 10+ min |
  | `trueShootingPct` | True shooting % | `app_player_round_stats.ts_pct` | percent | 20 games, 10+ min, 4+ FGA |
  | `effectiveFieldGoalPct` | Effective FG% | `app_player_round_stats.efg_pct` | percent | 20 games, 10+ min, 4+ FGA |
  | `usagePct` | Usage % | `app_player_round_stats.usg_pct` | percent | 20 games, 10+ min |
  | `assistPct` | Assist % | `app_player_round_stats.ast_pct` | percent | 20 games, 10+ min |
  | `reboundPct` | Rebound % | `app_player_round_stats.trb_pct` | percent | 20 games, 10+ min |
  | `stealPct` | Steal % | `app_player_round_stats.stl_pct` | percent | 20 games, 10+ min |
  | `blockPct` | Block % | `app_player_round_stats.blk_pct` | percent | 20 games, 10+ min |
  | `gameScoreAverage` | Game Score average | `app_player_round_stats.game_score_average` | decimal | 20 games, 10+ min |
  | `pie` | PIE | `app_player_round_stats.pie` | percent | 20 games, 10+ min |

  - "20 games" is the scaled minimum the season ratings use (`seasonMinGames(season, 20)`, on the rows as now).
  - "10+ min" is 10 minutes a game (`seconds_played >= 600 * games_played` of the same round row), the Leaders
    `MINUTES` rule; "4+ FGA" is 4 field goal attempts a game (`field_goals_attempted >= 4 * games_played`), the
    Leaders `FIELD_GOALS` rule. Both read the round table, so they count the same games as the value.
- **Player games, Advanced:** `gamePer` ("Game PER", `app_game_player_advanced.game_per`, decimal) for players with
  10+ minutes in the game (`seconds_played >= 600`), the rule the game page uses for its best player by game PER.
  Game Score stays as it is.
- **Reply:** adds `volume`: a short phrase naming the extra minimum, or `null` ("10+ minutes a game", "10+ minutes
  and 4+ field goal attempts a game", "10+ minutes in the game"). The `format` set gains `"decimal3"` (three
  decimals) for Win Shares / 40.
- **Page:** the catalogue lists the new metrics in the order above; Win Shares / 40 shows three decimals; the line
  above the podium adds "Also needs {volume}." when the reply has one. Lower-is-better, per game, timeline and the
  existing notes keep working.
- **Coverage:** step 1 checks every new metric on the local data (seasons with values, value ranges for the
  fractions) and leaves out any metric with no data at all; a season without values stays a gap.
- **States:** loading, error and "No records are available for this metric." stay as they are.

## Out of scope

- The record book landing (36c).
- RAPM, on/off and per-100 figures; turnover % for players; minimum changes to PER and Win Shares.
- Per game for advanced metrics (they are already rates).

## Build loop

Continuous Mode (`/continuous`, run to finish feature 36): no review pauses; each step is verified and self-reviewed,
then the feature is completed and squash-merged locally. `checkpointCommits` is `disabled`.

## Build steps

- [x] 1. **API** - the player-season advanced column map and minimums in `season-records.ts` (one query path for
  PER, Win Shares and the new metrics), Game PER with its minutes rule, `volume` and `decimal3` in the reply, the
  coverage check, and `records-api.spec.js`: the player-season and single-game catalogues with label, format,
  direction and minimum; per-row minimums (`gamesPlayed >= minGames`); `volume` per metric.
  Done when: `cd backend && npm run build` passes; `/api/seasons/2026/records/player-seasons?metric=trueShootingPct`
  returns percentages of players with 20+ scaled games, 10+ minutes and 4+ FGA a game; the records-api spec passes.
- [x] 2. **Page** - catalogue, `decimal3`, the volume line; `records.spec.js` expects the new player and game metric
  tabs and a mocked volume line; `records-layout.spec.js` covers the new metrics live.
  Done when: Player seasons, Advanced, True shooting % shows percentages with the volume line; Win Shares / 40 shows
  three decimals; Player games, Game PER loads; `npm run lint` and `npm run build` pass; `npx playwright test
  records.spec.js records-api.spec.js records-layout.spec.js responsive.spec.js` passes with `/api/health` reporting
  `"target":"local"`.

## Files / areas

- `backend/src/db/season-records.ts`, `backend/src/routes/seasons.ts`.
- `frontend/src/records/recordData.js`, `RecordsPage.jsx`.
- `frontend/e2e/records-api.spec.js`, `records.spec.js`, `records-layout.spec.js`.

## Data / contracts

- Reply: `{ metric, label, group, minGames, per, lowerIsBetter, format, volume, records, bySeason, progression }`;
  `format` is one of `count`, `decimal`, `decimal3`, `signed`, `percent`; `volume` is a string or `null`.
- Percentages and PIE are stored fractions; the page multiplies by 100 for display only.
- Unknown metric keys still answer `400 INVALID_RECORD_METRIC`.

## Testing

- No unit test runner; API coverage on the live local backend (`records-api.spec.js`), page coverage on mocks
  (`records.spec.js`) and live layouts (`records-layout.spec.js`), local target only.

## Notes for the AI

- Labels follow the Leaders player catalogue (`frontend/src/leaders/leaderDefs.js`).
- Keep `advancedPlayerSeasonRows` one function driven by the column map; do not add a second query path.
- No em dashes in copy or comments. Keep comments to the why.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6421,"specSha256":"b760738bad04154345cf95982d729374241cff68c32d2d05e9eab27429af4f3d","branch":"refs/heads/feature/player-advanced-records","head":"82637f0f220f8bde595534f03d5e3add1522bd04","baseRef":"refs/heads/master","baseCommit":"82637f0f220f8bde595534f03d5e3add1522bd04","sourceTree":"d2a226e62625d93b3e1b23ebca9d7e44cf63b3d7","absentOptional":[]} -->
