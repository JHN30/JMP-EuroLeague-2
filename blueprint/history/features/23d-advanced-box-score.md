# Feature: Advanced box score

**From build-plan:** feature 23d
**Build attempt:** 1
**Branch:** feature/advanced-box-score
**Status:** verified

## Goal

Give the Game Detail **Box score** tab a Traditional / Advanced toggle. The Advanced view shows, for every
player, the per-game measures from the pipeline table `app_game_player_advanced` (TS%, eFG%, USG%, AST%,
TOV%, ORB%, DRB%, TRB%, STL%, BLK%, Game Score and game PER) next to the player's season-to-date PER, USG%
and Win Shares through the game's round. The Overview tab's "best player" card switches from PIR to game PER.
The backend only **reads** the published tables; it never recomputes them (aggregates have one owner, the
pipeline). One new endpoint serves both.

## In scope

- **Backend:** Drizzle definitions for `app_game_player_advanced` and `app_game_team_advanced`, query
  functions, and `GET /api/seasons/:seasonCode/games/:gameCode/advanced`. The team rows are returned too
  (23e reuses them); 23d uses them only for the Advanced totals line.
- **Season-to-date values** from the existing tables, read at scope `all` and the game's own round
  (`app_player_round_ratings`, `app_player_round_stats`, `app_player_round_win_shares`): `per`, `usg_pct` and `win_shares`, plus cumulative `seconds_played`.
  Rounds are numbered across the whole season (`E2025` regular season 1-38, play-in 39-40, playoffs 41-45,
  Final Four 46-47), so the game's `roundNumber` indexes the `all` scope directly.
- **Small-sample hiding**, decided in the API: the season-to-date values are hidden (returned `null`, with the
  cumulative seconds still returned) when the player has fewer than 100 minutes through that round, or 20
  minutes when the game's round is below 10. These are the thresholds the Advanced leaders already use.
- **Frontend:** a Traditional / Advanced toggle above the two team tables; the Advanced table described
  below; the unavailable, loading and error states; the Overview best-player switch to game PER with a PIR
  fallback.
- **Advanced columns**, in order: MIN, Game Score, PER, TS%, eFG%, USG%, AST%, TOV%, ORB%, DRB%, TRB%, STL%,
  BLK%, then a "Season through round N" group of PER, USG% and WS (Win Shares). Each header has a tip. Ratios
  arrive as fractions and are shown as percentages with one decimal; Game Score and PER with one decimal, WS with two (as on the Player page).
- **Game PER visibility:** shown only for players with at least 10 minutes in the game
  (`MIN_BEST_PLAYER_SECONDS`, already in `overview.js`), because the table has no cutoff and a short cameo can be
  extreme (E2025 ranges from -183 to 377). Under 10 minutes the cell is an em dash whose tooltip says why.
- **Totals line** in the Advanced view from the team row: TS%, eFG%, TOV%, ORB%, DRB%. Every other total cell is
  an em dash.
- Players who did not play stay in the "Did not play" line, as in Traditional; starters first, then by
  minutes, the same order as Traditional.

## Out of scope

- Four Factors, pace and ratings panels and the mirrored team comparison (23e).
- Score flow, shot splits, possessions, rotations, lineups and shot zones (23f, 23g, 23h).
- A Win Shares rate column. The pipeline renamed `win_shares_per_48` to `win_shares_per_40` (`WIN_SHARES_PER_40.md`);
  the app uses WS/40 on the leaderboard and Player page, and this feature shows total Win Shares only.
- Putting the toggle in the URL, sorting, and any change to the Traditional columns.
- Any write to Neon, and any recomputation of a pipeline measure in the API or the browser.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`. Build
the steps in order, running each step's check as you go, then present one review packet after the last step.
No per-step approval pauses and no checkpoint commits; `/complete` makes the final commit.

## Build steps

- [x] **1. Table definitions and read functions.** In `backend/src/db/season-advanced-schema.ts` add
  `gamePlayerAdvanced` (`app_game_player_advanced`) and `gameTeamAdvanced` (`app_game_team_advanced`) with the
  column names in Data / contracts, using the file's `measure()` helper and composite primary keys. In
  `backend/src/db/season-advanced.ts` add `getGameAdvanced(seasonCode, gameCode)` (both tables, scoped by
  competition, season and game) and `getPlayersSeasonToDate(seasonCode, roundNumber, personKeys)` (the three
  round tables at scope `all`, one `inArray` query each). *Done when* `cd backend && npm run build` passes.
- [x] **2. The endpoint.** Add `GET /:seasonCode/games/:gameCode/advanced` in `backend/src/routes/seasons.ts`
  after the box-score route, with the same season and game-code validation and the same 404 `GAME_NOT_FOUND`.
  It builds the response in Data / contracts, applies the small-sample rule, and returns
  `available: false` with empty arrays when the game has no rows. *Done when* the backend build passes and,
  against the real database, `E2026` game 2 returns Bacon (`011286`) with `secondsPlayed` 1744, `usagePct`
  0.258519 and `gamePer` 27.804814, and game 13 returns two team rows with identical `possessions`.
- [x] **3. Client call and page-level query.** Add `getGameAdvanced(seasonCode, gameCode)` to
  `frontend/src/lib/api.js`. In `GameDetailPage.jsx` run one query (same key shape as the box score query,
  enabled only for a played game) and pass it down to the Box score and Overview tabs. A failed or empty
  advanced query must never change the Traditional view or the rest of the page. *Done when*
  `cd frontend && npm run lint` and `npm run build` pass.
- [x] **4. Advanced box score.** Add `frontend/src/games/AdvancedBoxScore.jsx` (the page file is already over
  1,200 lines): the toggle (a shared primitive such as `TabStrip`, not a new control), the Advanced table per
  team with a sticky player column and horizontal scroll, the "This game" and "Season through round N" header
  groups, header tips, em dashes for `null`, and the game PER and Game Score game-highs bolded among players
  who played at least 10 minutes. Hidden season values show an em dash with a tooltip giving the player's
  minutes and the minimum. Loading and error states use `AsyncState` (error has retry); `available: false` shows
  "Advanced stats are not available for this game yet." *Done when* lint and build pass and Traditional is
  unchanged.
- [x] **5. Overview best player by game PER.** In `overview.js` make the best-player metric a function of the
  advanced data: game PER when the game has advanced rows, otherwise PIR, with the card label changing between
  "PER" and "PIR". Keep the 10-minute minimum, the tie-breaks and the single swappable place. *Done when* the
  card shows PER for a game with advanced data and PIR when the advanced request fails or the game has none.
- [x] **6. Browser tests.** Extend `frontend/e2e/support/game-fixtures.js` with a mocked `/advanced` response
  (and make it part of `mockGameApi`, since an unmocked path now returns the harness's 404). Add
  `frontend/e2e/game-advanced-box-score.spec.js`: the toggle switches tables; `null` shows an em dash; a player
  under 10 minutes has no game PER; a small season sample is hidden with its explanation; the unavailable and
  error states; Traditional remains available when advanced fails. Update `game-overview.spec.js` for the
  PER / PIR label. *Done when* `cd frontend && npm run test:browser` passes the game specs.

## Files / areas

- `backend/src/db/season-advanced-schema.ts`, `backend/src/db/season-advanced.ts`,
  `backend/src/routes/seasons.ts`.
- `frontend/src/lib/api.js`, `frontend/src/games/GameDetailPage.jsx`, new `frontend/src/games/AdvancedBoxScore.jsx`,
  `frontend/src/games/overview.js`, `frontend/src/games/OverviewTab.jsx`.
- `frontend/e2e/support/game-fixtures.js`, new `frontend/e2e/game-advanced-box-score.spec.js`,
  `frontend/e2e/game-overview.spec.js`.
- Reused, unchanged: `HeaderTip`, `AsyncState`, `PlayerLink`, `format.js` (`formatFractionPercent`,
  `formatDecimal`), `gameUtils.js` (`hasMinutes`, `isStarter`).

## Data / contracts

**Tables read** (both in `public`, E2025 and E2026 only, SELECT already granted to the API role; checked in Neon
on 2026-10-02: 9,540 and 575 player rows, 804 and 48 team rows). `numeric` columns decode to numbers through the
existing `measure()` helper and `NULL` stays `null`.

- `app_game_player_advanced`, key `competition_code, season_code, game_code, side, person_key`: `club_code`,
  `seconds_played`, `game_score`, `usage_pct`, `assist_pct`, `orb_pct`, `drb_pct`, `trb_pct`, `steal_pct`,
  `block_pct`, `tov_pct`, `efg_pct`, `true_shooting_pct`, `game_uper`, `game_aper`, `game_per`. Ratios are
  fractions. Zero-minute rows have `NULL` rates and `NULL` PER but keep `game_score`.
- `app_game_team_advanced`, key `competition_code, season_code, game_code, side`: `club_code`, `game_minutes`,
  `own_possessions_estimate`, `possessions`, `pace`, `offensive_rating`, `defensive_rating`, `net_rating`,
  `efg_pct`, `opp_efg_pct`, `tov_pct`, `opp_tov_pct`, `orb_pct`, `drb_pct`, `ft_rate`, `opp_ft_rate`,
  `true_shooting_pct`, `assist_ratio`.
- Season to date: `app_player_round_ratings.per`, `app_player_round_stats.usg_pct`,
  `app_player_round_win_shares.win_shares`, each with cumulative `seconds_played`, at scope `all` and the game's
  `round_number`, matched by `person_key`. A player with no row at that round gets `season: null`.

**Response** of `GET /api/seasons/:seasonCode/games/:gameCode/advanced` (camelCase, numbers or `null`):

```json
{
  "available": true,
  "scope": "all",
  "round": 2,
  "minSeasonMinutes": 20,
  "teams": [{ "side": "local", "clubCode": "DUB", "possessions": 72.92, "pace": 72.92, "offensiveRating": 128.9,
    "defensiveRating": 119.3, "netRating": 9.6, "efgPct": 0.616, "oppEfgPct": 0.54, "tovPct": 0.18, "oppTovPct": 0.06,
    "orbPct": 0.36, "drbPct": 0.7, "ftRate": 0.45, "oppFtRate": 0.08, "trueShootingPct": 0.6, "assistRatio": 0.5,
    "gameMinutes": 40, "ownPossessionsEstimate": 72.9 }],
  "players": [{ "side": "local", "personKey": "011286", "clubCode": "DUB", "secondsPlayed": 1744, "gameScore": 21.4,
    "usagePct": 0.258519, "assistPct": null, "orbPct": null, "drbPct": null, "trbPct": null, "stealPct": null,
    "blockPct": null, "tovPct": null, "efgPct": 0.692308, "trueShootingPct": 0.746269, "gamePer": 27.804814,
    "season": { "secondsPlayed": 1744, "hidden": true, "per": null, "usgPct": null, "winShares": null } }]
}
```

When the game has no advanced rows (older season, forfeit, unplayed): `200` with `available: false`, `teams: []`,
`players: []`, `round` as stored. Unknown game: `404 GAME_NOT_FOUND`; bad season or game code: the existing
`400` errors. `season.hidden` is `true` when the cumulative seconds are below `minSeasonMinutes` x 60.

## Testing

- No unit-test command exists, so the API is verified against the real database with the reference cases in
  step 2 (E2026 game 2, Bacon; game 13 team rows) and a game with no advanced rows. Record what was run.
- Browser tests (Playwright, mocked API) in step 6 are the evidence for the UI states. Nothing in this feature
  claims live-browser verification that was not run.
- `cd backend && npm run build`, `cd frontend && npm run lint` and `npm run build` pass before review (all three
  passed at the start of this feature).

## Notes for the AI

- The percentages are fractions; `format.js` already has `formatFractionPercent`. Do not multiply twice.
- `NULL` is never zero: format it as an em dash. Do not compute a missing rate from the box score.
- A short cameo can be extreme; the 10-minute rule for game PER is a display rule in the browser, while the
  season small-sample rule is applied in the API. Keep each in one place.
- Season-to-date means cumulative through the game's round, so it includes games of the same round played after
  this one. Label the group "Season through round N".
- Use parameterised Drizzle queries scoped by competition and season, and the existing route validators. No new
  dependency, no new configuration.
- The `/advanced` request must not block the box score: Traditional renders from the box-score query alone.
- Win Shares appear as the total (`win_shares`) only. Do not add "WS/48"; the rate is WS/40 (renamed in a
  separate change once the pipeline published `win_shares_per_40`).

## Open questions

- **Which scope for "season to date"?** The spec uses scope `all` (the whole season so far, all phases) so a
  playoff game shows the player's season PER. The alternative is the game's own phase scope (`RS`, `PO`, ...),
  which matches the scope game PER's league constants use. Not blocking: the default is chosen and one constant
  in the endpoint changes it.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":12921,"specSha256":"21c05413adec09e9899b743e070020c534d1210bb7bdfeec139307023cf7c498","branch":"refs/heads/feature/advanced-box-score","head":"3a704fbfec96e1e6a20f596faa87267e0ee6863d","baseRef":"refs/heads/master","baseCommit":"3a704fbfec96e1e6a20f596faa87267e0ee6863d","sourceTree":"841512ff187f46c668df6017c02d706562f38cf4","absentOptional":[]} -->
