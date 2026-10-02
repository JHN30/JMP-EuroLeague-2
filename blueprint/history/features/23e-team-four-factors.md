# Feature: Team Four Factors

**From build-plan:** feature 23e
**Build attempt:** 1
**Branch:** feature/team-four-factors
**Status:** verified

## Goal

Rebuild the game page's **Team comparison** tab around the pipeline's per-game team stats. On the right, a
**Four Factors** panel shows, for both teams, each factor in this game against the team's season average through
the game's round: eFG%, TOV%, ORB% and FT rate for the offense, and the opponent's eFG%, TOV% and FT rate plus
DRB% for the defense, then pace and offensive, defensive and net rating. On the left, the existing box-score
comparison rows become **mirrored bars** instead of a plain table; the two sit side by side on wide screens and stack on narrow ones. The backend reads `app_game_team_advanced`
(already returned by the 23d endpoint) and adds the teams' season averages from `app_standings_stats`; nothing
is recomputed in the API or the browser.

## In scope

- **Backend:** add a `season` block to each team row of `GET /api/seasons/:seasonCode/games/:gameCode/advanced`:
  the club's cumulative values at scope `all` and the game's own round, read from `app_standings_stats`
  (`games_played`, `pace`, `offensive_rating`, `defensive_rating`, `net_rating`, `efg_pct`, `tov_pct`,
  `orb_pct`, `drb_pct`, `ft_rate`, `opp_efg_pct`, `opp_tov_pct`, `opp_ft_rate`).
- **Small-sample hiding:** the season block is hidden (values `null`, `gamesPlayed` still returned) when the club
  has played fewer than 3 games through that round, because an average of one or two games is mostly the game itself.
- **Four Factors panel**, mirrored (local team left, road team right), in three blocks of `ComparisonRow`s:
  - **Offense:** eFG% (higher is better), TOV% (lower), ORB% (higher), FT rate (higher).
  - **Defense** (what each team held its opponent to): Opp eFG% (lower), Opp TOV% forced (higher), DRB% (higher),
    Opp FT rate (lower).
  - **Pace and ratings:** Pace (neutral), Offensive rating (higher), Defensive rating (lower), Net rating (higher).
- **Season-average markers:** each side of a row shows a thin tick on its bar at the team's season average, drawn on
  the same scale as the bar, and the average as visible text under the value ("Season avg 52.1%"), so the tick is
  never the only carrier of the information. A hidden season block shows no tick or average and the panel notes
  that averages need at least 3 games.
- **Mirrored-bar box-score comparison:** the existing rows (points, 2PT, 3PT, FT, rebounds, offensive and defensive
  rebounds, assists, steals, turnovers, blocks, blocks against, fouls committed, fouls drawn, PIR) render as
  `ComparisonRow`s with the same values and tooltips as today; lower-is-better rows are turnovers, blocks against and
  fouls committed.
- **Shared primitive change:** `ComparisonRow` gains optional `tip`, `markerA`/`markerB` and `avgA`/`avgB`; callers
  that pass none render exactly as before (the Overview key stats and the Comparisons page).
- States: the panel has its own loading, error (with retry) and "not available for this game yet" states and never
  hides the mirrored box-score rows; the tab keeps its "not available until this game is played" state.

## Out of scope

- Score flow, shot splits, possessions, rotations, lineups and shot zones (23f, 23g, 23h).
- Changing the Advanced box score (23d), the Overview, or any other tab.
- A different season-average scope or window (last 5 or 10 games), home/away splits, or averages that exclude this
  game. The averages include this game and the other games of its round, as the 23d season values do.
- Any write to Neon, any recomputation of a pipeline measure, and any new table.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`. Build
the steps in order, running each step's check as you go, then present one review packet after the last step.
No per-step approval pauses and no checkpoint commits; `/complete` makes the final commit.

## Build steps

- [x] **1. Teams' season averages in the endpoint.** In `backend/src/db/season-advanced.ts` add
  `getTeamsSeasonToDate(seasonCode, roundNumber, clubCodes)` reading `standingsStats` at scope `all` and the round
  with `inArray(clubCode)`. In the `/advanced` handler in `backend/src/routes/seasons.ts` add `minSeasonGames: 3`
  to the response and a `season` block to every team row (`null` when the club has no row at that round, `hidden`
  and nulled values below 3 games). *Done when* `cd backend && npm run build` passes and, against the real
  database, `E2026` game 13 (round 2) returns `season` blocks for `DUB` and `BAR` with `gamesPlayed` 2, hidden,
  and `E2025` game 331 (round 34) returns visible blocks whose `efgPct` equals each club's
  `app_standings_stats` row at that round.
- [x] **2. Marker support in the shared row.** In `frontend/src/lib/comparisonMath.js` add a pure
  `markerPosition(value, rawA, rawB)` using the same 35-100 band scale as `comparisonBand`, clamped to 0-100, and
  `null` when any input is missing. Extend `frontend/src/lib/ComparisonRow.jsx` with the optional props above
  (label wrapped in `HeaderTip` when `tip` is given, a tick element with `title`, the average text). *Done when*
  lint and build pass and the Overview key stats and the Comparisons page render unchanged.
- [x] **3. Four Factors panel.** Add `frontend/src/games/FourFactors.jsx`: row definitions (label, tip, direction,
  value and average fields, formatter), the three blocks, team labels above, and the loading, error, unavailable
  and hidden-average states. Fractions use `formatFractionPercent`, ratings and pace `formatDecimal`, net rating
  `formatSignedDecimal`. In `GameDetailPage.jsx` enable the advanced query on the Team comparison tab and render
  the panel above the comparison. *Done when* lint and build pass and the panel shows for a game with advanced
  data and an honest message for one without.
- [x] **4. Mirrored-bar comparison.** Replace `TeamComparisonTable` with a version that maps `COMPARISON_ROWS`
  to `ComparisonRow`s (raw value for the bar, the existing `render` text for display, `lowerIsBetter` as the
  direction, `STAT_TIPS` as the tip). Keep the unplayed empty state. *Done when* every previous row appears
  with the same text, bars and winner highlight work, and lint and build pass.
- [x] **5. Browser tests.** Add season blocks to the `ADVANCED` fixture in `frontend/e2e/support/game-fixtures.js`
  (one team visible, one hidden), add `frontend/e2e/game-four-factors.spec.js`, and update
  `frontend/e2e/game-box-score.spec.js` where it reads the old table. Cover: the three blocks with values,
  directions and the winner highlight, the tick and "Season avg" text, the hidden-average note, the unavailable and
  error states with the mirrored rows still shown, and the tooltip on a box-score row. *Done when*
  `cd frontend && npm run test:browser` passes the game specs.

## Files / areas

- `backend/src/db/season-advanced.ts`, `backend/src/routes/seasons.ts`.
- `frontend/src/lib/comparisonMath.js`, `frontend/src/lib/ComparisonRow.jsx`, new
  `frontend/src/games/FourFactors.jsx`, `frontend/src/games/GameDetailPage.jsx`.
- `frontend/e2e/support/game-fixtures.js`, new `frontend/e2e/game-four-factors.spec.js`,
  `frontend/e2e/game-box-score.spec.js`.
- Reused, unchanged: `app_game_team_advanced` definitions (23d), `HeaderTip`, `AsyncState`, `TeamLabel`,
  `format.js` helpers.

## Data / contracts

Nothing new is stored. The `/advanced` response keeps its 23d shape; each element of `teams` gains `season`, and the
response gains `minSeasonGames`:

```json
{
  "minSeasonGames": 3,
  "teams": [{ "side": "local", "clubCode": "DUB", "possessions": 72.92, "pace": 72.92, "offensiveRating": 128.9,
    "defensiveRating": 119.3, "netRating": 9.6, "efgPct": 0.616, "oppEfgPct": 0.54, "tovPct": 0.18, "oppTovPct": 0.06,
    "orbPct": 0.36, "drbPct": 0.7, "ftRate": 0.45, "oppFtRate": 0.08, "trueShootingPct": 0.6, "assistRatio": 0.5,
    "season": { "gamesPlayed": 2, "hidden": true, "pace": null, "offensiveRating": null, "defensiveRating": null,
      "netRating": null, "efgPct": null, "tovPct": null, "orbPct": null, "drbPct": null, "ftRate": null,
      "oppEfgPct": null, "oppTovPct": null, "oppFtRate": null } }]
}
```

- **Source of `season`:** `app_standings_stats`, key `competition_code, season_code, scope, round_number, club_code`,
  scope `all`, `round_number` the game's round (rounds run across phases, as in 23d). Values are cumulative through
  that round; fractions stay fractions; `NULL` stays `null`.
- **`season: null`** when the club has no row at that round (checked 2026-10-02: every played E2025 and E2026 game
  has a row for both clubs).
- **Hidden rule:** `hidden` is `true` when `gamesPlayed` is below `minSeasonGames`; then every measure is `null`.
- Errors and the unavailable case are unchanged from 23d (`available: false`, `404 GAME_NOT_FOUND`, `400` codes).
- Reference game, E2026 game 13 (Dubai 94, Barcelona 87): possessions 72.92, Dubai ORtg 128.908393 and DRtg
  119.308832, Dubai eFG% 0.616071, Barcelona TOV% 0.059866.

## Testing

- No unit-test command exists. The API is checked against the real database in step 1 (`E2026` game 13 hidden blocks,
  `E2025` game 331 against `app_standings_stats`, a game without advanced rows).
- Browser tests (Playwright, mocked API) in step 5 are the evidence for the UI. No live-browser check is claimed
  unless run.
- `cd backend && npm run build`, `cd frontend && npm run lint` and `npm run build` pass before review (all three
  passed at the start of this feature).

## Notes for the AI

- The panel reads the same `advancedQuery` the box score and Overview use (`["game-advanced", seasonCode, gameCode]`);
  widen its `enabled` tabs, do not add a second request.
- In a two-team game each team's "opp" value equals the other team's own value (A's Opp eFG% is B's eFG%), so the
  Defense block repeats the game numbers on purpose: its job is the season-average tick for the defensive side.
- `NULL` is an em dash, never zero; a missing season block shows no tick and no average text, not zeros.
- Percentages are fractions; use `formatFractionPercent`. Ratings are per 100 possessions, pace per 40 minutes.
- Keep `ComparisonRow` backward compatible: the Comparisons page and the Overview must render byte-for-byte as before
  when they pass no new props.
- Season averages include this game; label them "Season avg" and do not call them an opponent-adjusted baseline.

## Open questions

- **Minimum games for a season average.** The spec hides it below 3 games, a judgement made here (the app has no team
  games minimum yet). Not blocking: it is one constant in the endpoint. Say if you want a different number.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10927,"specSha256":"db5e6d86c1ec66e1c252abd54d962681d77cf9f767ff8fda23b151cfd91cb212","branch":"refs/heads/feature/team-four-factors","head":"f41a50b42a6ef57dfeb4d9df884378b4eb90f85d","baseRef":"refs/heads/master","baseCommit":"f41a50b42a6ef57dfeb4d9df884378b4eb90f85d","sourceTree":"e0d274d0ab21e2d7f6aa41c9278722e1e02d3c1a","absentOptional":[]} -->
