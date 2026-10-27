# Feature: Team comparison extras

**From build-plan:** feature 38
**Build attempt:** 1
**Branch:** feature/team-comparison-extras
**Status:** verified

## Goal

Give the game's Team comparison tab four more numbers per team: bench points and points in the paint in the
Head to head panel, and true shooting % and assist ratio in the Four Factors panel with season-average ticks. Where
the data behind a number is missing, the number is a dash, never a 0.

## In scope

- **Bench points** (Head to head panel): per side, the sum of `points` over that side's box-score player rows that
  did not start (`isStarter` from `frontend/src/games/gameUtils.js`, which reads `started ?? startedAlt`).
- **Points in the paint** (Head to head panel): per side, 2 x the made field goals whose zone from `shotZone`
  (`frontend/src/lib/shotZones.js`) is `Restricted area` or `In the paint`. Shots are matched to a team by
  `clubCode`, as the Shooting tab does.
- **True shooting %** and **Assist ratio** (Four Factors panel): the game values `trueShootingPct` and `assistRatio`
  that `GET /api/seasons/:seasonCode/games/:gameCode/advanced` already returns on each team row, plus the matching
  season-to-date values from `app_standings_stats` (`true_shooting_pct`, `assist_ratio`) added to that endpoint's
  `season` block, drawn as the existing season-average tick and "Season avg" text.
- The shots request (`["shots", seasonCode, gameCode]`) also runs on the Team comparison tab, sharing the Shooting
  tab's query and cache.

## Out of scope

- Any new endpoint, table, column or backend shot classification. Paint points stay a frontend calculation over the
  existing shots reply.
- Bench or paint season averages, and bench/paint figures anywhere other than the Team comparison tab.
- Changes to the Overview, Box score, Shooting or Scoring profile panels, or to the existing Four Factors rows.
- Second-chance, fast-break or points-off-turnover rows (the Scoring profile already shows those).

## Build loop

`workflow.stepReview` is `feature`: build all steps, then one review of the whole feature. Checkpoint commits are
disabled; `/complete` creates the single feature commit. Before any browser test run, `/api/health` must report
`"target":"local"`.

## Build steps

- [x] **1. Season TS% and assist ratio on the advanced endpoint.** In `backend/src/db/season-advanced.ts`, add
  `trueShootingPct` and `assistRatio` to `TeamSeasonToDate` and to the `getTeamsSeasonToDate` select. In
  `backend/src/routes/seasons.ts` (`games/:gameCode/advanced`), add both to the team `season` block with the same
  `hidden ? null : value` rule as the other fields. First confirm on the local data (read-only query or a dev request)
  that `assist_ratio` in `app_game_team_advanced` and `app_standings_stats` use the same scale (record whether it is
  a fraction or a per-100 number) and that `true_shooting_pct` is a fraction like `efg_pct`.
  **Done when:** `cd backend && npm run build` passes, and on the local target the advanced reply for a played
  E2025 game has `trueShootingPct` and `assistRatio` on each team row and in each non-hidden `season` block; the
  reply stays otherwise unchanged (additive only).

- [x] **2. TS% and assist ratio rows in the Four Factors.** In `frontend/src/games/FourFactors.jsx`, add a fourth
  block, "Shooting and passing", with `TS%` (field `trueShootingPct`, `pct`, higher is better, tip "True shooting:
  points per shooting possession, counting free throws and threes") and `Assist ratio` (field `assistRatio`, higher
  is better, format and tip matching the scale confirmed in step 1). A null game value prints a dash through the
  existing formatters and gets no bar highlight; a null season value draws no tick and no "Season avg" text (the
  existing `seasonValue`/`averageText` path).
  **Done when:** the Team comparison tab of a played local game shows both rows with values and ticks, a team row
  with null `trueShootingPct` or `assistRatio` shows a dash, and `game-four-factors.spec.js` covers both.

- [x] **3. Bench points and points in the paint in Head to head.** In `frontend/src/games/GameDetailPage.jsx`:
  enable `shotsQuery` on `tab === "comparison"` as well as `"shooting"`; pass the box-score `playerStats` and the
  shots query to `TeamComparisonRows`; add two rows directly after `Points`: `Bench points` and `Points in the
  paint`, each with a `STAT_TIPS`-style tip (paint: "Points from made shots in the restricted area and the paint,
  over shots with a court location"). Put the two calculations in a small pure helper next to the existing game
  helpers (for example `gameUtils.js`):
  - Bench points for a side is a dash when the side has no player row with `isStarter` true (the feed has no
    starters for that game); otherwise the sum of non-starters' `points` (a real 0 stays 0).
  - Points in the paint for a side is a dash when the shots reply is empty, has failed, or has no shot with a
    location for that side's `clubCode`; otherwise 2 x the side's made (`actionCode` ending in `M`) located shots in
    the two paint zones (a real 0 stays 0).
  - While shots load, the paint row prints a muted "…" on both sides with no highlight; the rest of the panel is
    not held back. A shots error prints dashes plus one muted line under the rows, "Points in the paint couldn't be
    loaded." with a Retry button that refetches the shots. Box-score loading and error states stay as they are.
  **Done when:** a played local game shows both rows on both sides with the better side highlighted; the Shooting
  tab still works from the shared query; in mocked browser tests, a game with no starter flags shows a bench dash,
  a game with an empty shots reply shows paint dashes, a 500 on shots shows the dashes and the Retry line while the
  other Head to head rows and the Four Factors stay, and an unplayed game requests no shots.

- [x] **4. Coverage check and verification.** On the local data, find one season or game with shots and one
  without, and one with starter flags and one without, and confirm each shows a value or a dash as above (record
  which seasons lack shots, starters or advanced rows in the review notes, not in the UI). Check the tab at phone
  width: the two panels stay equally tall and nothing scrolls sideways.
  **Done when:** `npm run build` (root) and `cd frontend && npm run lint` pass, and
  `cd frontend && npx playwright test game-four-factors.spec.js game-shooting.spec.js responsive.spec.js` passes
  against the local target.

- [x] **5. Compact layout (user-requested revision during review).** Head to head rows carry no tips (basic counts)
  and sit in groups (Scoring, Shooting, Rebounds, Ball and defense, Fouls and PIR), one line per stat. The Head to
  head, Four Factors and Scoring profile rows all use a new opt-in `inline` mode of `frontend/src/lib/ComparisonRow.jsx`
  (label in a centre column between the values; bars and season averages under each value), so the tab is about
  half as tall and the two top panels stay equally tall. Other pages keep the default row.
  **Done when:** root build and lint pass; `game-four-factors`, `game-scoring-profile`, `game-shooting`,
  `game-overview` and `responsive` specs pass on the local target (223 passed); screenshots of E2025 game 100 at
  1400px and 390px show no horizontal scroll.
  Also per the user: the Scoring profile gains a 14th row, **Time of possession** (`possession_seconds` from
  `app_game_team_possessions`, already in the team-flow reply; neutral, mm:ss; a dash when null), so its two columns
  are even. `game-scoring-profile.spec.js` covers it. E2010 and E2016 have the value; E2000 and E2004 have no team
  flow at all, so the whole Scoring profile shows its unavailable state there, as before.

**Coverage (step 4, local data):** starter flags were present in a sampled game of every season E2000-E2026; shots
are absent for E2000 and E2004 (Points in the paint shows a dash) and present from E2007; advanced game rows are
present in every sampled season, and season TS% / assist ratio exist for E2004, E2010, E2016 and E2025 games past
round 3.

**Step 1 finding:** `assist_ratio` is assists / made field goals as a fraction (E2025 game 100 local: 18 / 33 =
0.545), on the same scale in `app_game_team_advanced` and `app_standings_stats`; `true_shooting_pct` is a fraction
too. Both rows use the percent format. A row where either side is missing is shown without a highlight (direction
`neutral`), because `winnerSide` would otherwise read the dash as 0; this guard covers every Four Factors row.

## Files / areas

- `backend/src/db/season-advanced.ts` - `TeamSeasonToDate`, `getTeamsSeasonToDate`
- `backend/src/routes/seasons.ts` - `games/:gameCode/advanced` team `season` block
- `frontend/src/games/FourFactors.jsx` - new block of two rows
- `frontend/src/games/GameDetailPage.jsx` - `shotsQuery` enabling, `TeamComparisonRows`, `TeamComparisonTab`,
  `STAT_TIPS` entries
- `frontend/src/games/gameUtils.js` - bench and paint calculations
- `frontend/src/lib/ComparisonRow.jsx` - opt-in `inline` and `missingText` props (step 5)
- `frontend/src/games/ScoringProfile.jsx` - inline rows (step 5)
- `frontend/src/games/teamFlow.js` - Time of possession row (step 5)
- `frontend/src/lib/shotZones.js` - reused as is (`shotZone`, `hasLocation`)
- `frontend/e2e/game-four-factors.spec.js`, `frontend/e2e/support/game-fixtures.js` - fixtures and tests

## Data / contracts

- `GET /api/seasons/:seasonCode/games/:gameCode/advanced`, additive only: each `teams[].season` (when present)
  gains `trueShootingPct: number | null` and `assistRatio: number | null`, null when `hidden` (fewer than
  `minSeasonGames` games) or when the standings row has no value. Team rows already carry the game's
  `trueShootingPct` and `assistRatio` (nullable) from `app_game_team_advanced`. No other field changes; the
  unavailable reply (`available: false`) is unchanged.
- `GET .../games/:gameCode/shots` and `.../box-score` are reused unchanged.
- All tables stay read-only. No user input beyond the existing validated `seasonCode` and `gameCode`.

## Testing

- No unit test command exists; the helpers stay pure so a later `/tests` can cover them.
- Browser tests (Playwright, mocked API through `mockGameApi`): extend `game-four-factors.spec.js` and the shared
  fixtures for the two new Four Factors rows (values, a null game value, a hidden season), bench points (values and
  the no-starter dash), paint points (values, empty shots, shots 500 with Retry), and that an unplayed game requests
  neither advanced nor shots. Run with `game-shooting.spec.js` (shared shots query) and `responsive.spec.js`
  (layout). Live checks in step 4 run only on the local target.

## Notes for the AI

- Read `/api/health` before any browser run and stop if it is not `"target":"local"`. Never open `backend/.env`.
- Keep the change on this tab: no shared component prop changes are needed (`ComparisonRow` already handles null
  raw values and the `bars={false}` mode the Head to head panel uses).
- A dash means "no data", 0 means "data says none". Never fall back from a missing starter flag or missing shots to 0.
- Paint points count field goals only (no and-one free throws), over located shots; the tip says so.
- `blueprint/build-plan.md` and `blueprint/context/project-overview.md` carry the uncommitted feature 38 planning
  lines; leave them for `/complete` (or a separate planning commit) and do not revert them.

## Open questions

None blocking. Chosen defaults to confirm at review: the new Four Factors rows sit in their own "Shooting and
passing" block rather than inside Offense, and the bench and paint rows sit right after Points.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11714,"specSha256":"d2fd2c0b5868e9ddb70484348dfef5839d753a5a0935e1f756fc5b7866a55b3f","branch":"refs/heads/feature/team-comparison-extras","head":"7d296ef6a9395a4f03e26528168057ea9fc9ec2c","baseRef":"refs/heads/master","baseCommit":"7d296ef6a9395a4f03e26528168057ea9fc9ec2c","sourceTree":"c5835e44aa683a7eab72c5ed54332127a9cf9bed","absentOptional":[]} -->
