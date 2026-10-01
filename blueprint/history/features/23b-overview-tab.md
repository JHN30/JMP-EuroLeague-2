# Feature: Overview tab

**From build-plan:** feature 23b
**Build attempt:** 1
**Branch:** feature/overview-tab
**Status:** verified

## Goal

Give Game Detail a summary page that answers "what happened?" at a glance: the quarter-by-quarter
line score, the best player on each team, the game leaders in points, rebounds and assists, a few
key team stats as mirrored bars, and a small score-flow chart. It is a new first tab and the page's
default, with Box score second. This is step 23b of "Game detail rebuild". It uses only data the
game page already fetches (game, box score, play-by-play) and needs no backend change and no new
table. The advanced box score (23d) and Four Factors (23e) stay out.

## In scope

- A new **Overview** tab, first in the tab strip and selected by default; the other tabs keep their
  order after it.
- **Line score**: one row per team with each period, a Total column, and the margin row, reusing the
  existing period table.
- **Best player per team**: a card each for the home and road team with headshot, name (linked to the
  player page), position and jersey number, and a stat line (points, rebounds, assists) plus the
  ranking metric's value. Chosen by one swappable function: PIR now, among players with at least
  10 minutes. The owner will publish a per-game PER with `app_game_player_advanced` (23d) and the
  function is the single place to change then.
- **Game leaders**: for each team, the leader in points, rebounds and assists with their value.
- **Key stats as mirrored bars**: field-goal %, 3-point %, free-throw %, rebounds, assists, steals,
  and turnovers (lower is better), from each team's total row, using the shared mirrored comparison row.
- **Score-flow chart**: a compact version of the existing score-differential chart, built from
  play-by-play with the existing `computeGameFlow`.
- Loading, error (with retry), empty, and not-yet-played states; the play-by-play failing or being
  empty must not hide the other sections.
- Restrained Motion entrance on the new sections using the shared presets.
- Small no-behavior-change extractions so the new tab can reuse existing code (see Build steps 1 and 2).

## Out of scope

- Per-game advanced stats, season PER/WS/USG, Four Factors, pace and ratings (23d, 23e), and any
  backend change or new endpoint.
- Switching the best-player metric to game PER (it needs the published table; 23d). This step only
  makes that a one-place change.
- The minutes timeline and assist connections (23c).
- Redesigning the Game flow, Team comparison, Shooting, or Play-by-play tabs. The only change to
  existing tabs is a Total column on the period table, which both the Overview and Game flow show.
- A pre-game preview for unplayed games, an overall "player of the game" badge, and URL-synced tab state.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` and `checkpointCommits` is
`disabled`. Build the steps in order, running each step's check as you go, then present one review
packet after the last step. No per-step approval pauses and no checkpoint commits; `/complete` makes
the final commit.

## Build steps

- [x] **1. Extract shared game helpers and flow pieces (no behavior change).** Create
  `frontend/src/games/gameUtils.js` exporting `teamName`, `hasMinutes`, `isStarter`, and
  `compareByName`, and `frontend/src/games/gameFlow.jsx` exporting `withRunningScore`,
  `computeGameFlow`, `ScoreFlowChart`, and `PeriodTable` (with their private helpers:
  `SCORE_VALUE`, `eventMoment`, `momentLabel`, `periodBoundaryPlugin`). Move the code as is and import
  it back into `GameDetailPage.jsx`; the Play-by-play section keeps using `withRunningScore`.
  **Done when:** `cd frontend && npm run lint` and `npm run build` pass; on game 13 of `E2026` the
  Game flow tab's text and chart and the Box score tab render exactly as before (compare the panel
  text before and after the move); the existing browser suite passes.

- [x] **2. Extract the mirrored comparison row (no behavior change).** Move `ComparisonRow`,
  `winnerSide`, `toNumber`, `BAND_MIN`, and `comparisonBand` from `ComparisonsPage.jsx` to
  `frontend/src/lib/ComparisonRow.jsx` (default export `ComparisonRow`) and import it back. Directions
  stay `"higher"`, `"lower"`, or `"neutral"`.
  **Done when:** lint and build pass; the Compare page's team and player comparisons render the same
  rows and bars as before (compare the page text before and after); `filter-controls.spec.js` and
  `head-to-head.spec.js` pass.

- [x] **3. Overview tab shell and line score.** In `GameDetailPage.jsx` add `{ key: "overview",
  label: "Overview" }` first in `GAME_TABS`, default `tab` to `"overview"`, and render a new
  `frontend/src/games/OverviewTab.jsx` for it. Fetch play-by-play also when the Overview tab is open
  (extend the existing `enabled` condition). The tab shows the loading, error-with-retry, and empty
  states from the box score query, an "Overview isn't available until this game is played." message
  for an unplayed game, and the line score (the extracted `PeriodTable`). Add a Total column to
  `PeriodTable`: the sum of a team's periods, or an em dash if any period is missing. Update
  `frontend/e2e/game-box-score.spec.js`: its tests now select the Box score tab first and mock
  `play-by-play` (`{ events: [] }`) so the new default tab does not hit an unexpected request.
  **Done when:** opening `/E2026/games/13` lands on the Overview tab with the line score showing Q1-Q4,
  a Total column of 94 and 87, and the margin row; an unplayed game shows the not-yet-played message and
  no errors; switching to Box score shows the same tables as before; lint, build, and the full
  browser suite pass.

- [x] **4. Best player per team and game leaders.** Add `frontend/src/games/overview.js` with
  `BEST_PLAYER_METRIC` (`{ label: "PIR", value: (row) => row.valuation }`), `MIN_BEST_PLAYER_SECONDS`
  (600), `pickBestPlayer(rows)`, and `gameLeaders(rows)` as pure functions (rules under Data / contracts),
  and render a Standouts section (two best-player cards, stacked on phones) and a Game leaders section
  (points, rebounds, assists per team) in `OverviewTab.jsx`. Names link to `/:seasonCode/players/:personKey`;
  headshots use the whole-picture style from 23a (`aspect-3/4 object-contain`); a team with no eligible
  player shows "Not enough minutes data to pick a best player." Add `frontend/e2e/game-overview.spec.js`
  with a mocked game covering the rules.
  **Done when:** for game 13 the best players are Kabengele (Dubai, PIR 24) and Punter (Barcelona, PIR 28),
  the points leaders are Kabengele 21 and Punter 25, the assists leaders are Okobo 6 and Robinson 5, and
  the rebounds tie for Barcelona (Martin and Punter, 5 each) goes to Punter, who played more; in the mocked
  test a player with the highest PIR but under 10 minutes is not chosen, ties break as specified, and a
  team with no eligible player shows the message; lint, build, and the browser suite pass.

- [x] **5. Key-stat bars and compact score flow.** Add the Key stats section using the extracted
  `ComparisonRow` for field-goal %, 3-point %, free-throw %, rebounds, assists, steals, and turnovers (lower is
  better), with each team's name above its half of the rows; a missing total row hides the section with an
  honest message. Add a `compact` prop to `ScoreFlowChart` (shorter height) and render it in a Flow section from
  the play-by-play query, with its own loading, error-with-retry, and empty states that do not affect the other
  sections. Add Motion entrances with `sectionContainer`/`sectionItem`.
  **Done when:** game 13 shows the seven bars with the better side tinted and turnovers marked "Lower is better";
  the compact chart renders from real play-by-play with no console errors; in a mocked test a failing
  play-by-play request shows the flow error with a retry button while the line score, standouts, leaders, and key
  stats still render; lint, build, and the browser suite pass.

- [x] **6. Live check and polish.** With the dev servers running, open game 13 in headless Chromium at 1500px and
  400px in both themes, plus an unplayed game and a game with no play-by-play; confirm the tab switch does not
  scroll the page (`scroll={false}` stays on the game tab panel), nothing overflows sideways, and fix anything the
  pass shows.
  **Done when:** screenshots reviewed with no layout break, overflow, or console errors in either theme;
  `cd backend && npm run build`, `cd frontend && npm run lint`, `npm run build`, and `npm run test:browser` all pass.

## Files / areas

- `frontend/src/games/GameDetailPage.jsx` - tab list and default, query `enabled`, rendering the new tab, imports.
- `frontend/src/games/OverviewTab.jsx` (new), `overview.js` (new), `gameUtils.js` (new), `gameFlow.jsx` (new).
- `frontend/src/lib/ComparisonRow.jsx` (new) and `frontend/src/comparisons/ComparisonsPage.jsx` (import only).
- `frontend/e2e/game-box-score.spec.js` (updated) and `frontend/e2e/game-overview.spec.js` (new).
- No backend files change. Existing endpoints used: `GET /api/seasons/:seasonCode/games/:gameCode`, `.../box-score`,
  `.../play-by-play`.

## Data / contracts

All inputs already exist; box score measures are `number | null` since 23a.

- `pickBestPlayer(rows)`: `rows` are one team's `playerStats`. Eligible: `timePlayed >= MIN_BEST_PLAYER_SECONDS`
  (600) and `BEST_PLAYER_METRIC.value(row)` is a finite number. Highest metric wins; ties by more points, then more
  minutes, then `compareByName`. Returns the row, or `null` when none is eligible.
- `BEST_PLAYER_METRIC` is the only place that names the ranking metric: its `label` is shown on the card and its
  `value` ranks players. Today it is PIR (`valuation`). Switching to game PER later changes this object (and the
  data the rows carry), not the card.
- `gameLeaders(rows)`: for each of points, rebounds (`totalRebounds`), and assists (`assistances`), among players with
  `timePlayed > 0` (or everyone if nobody on the team has minutes), the highest value; ties by more minutes, then
  `compareByName`; a maximum of 0 or a missing value shows an em dash, not a leader.
- Key stat percentages come from the team `total` row: field goals `fieldGoalsMadeTotal / fieldGoalsAttemptedTotal`,
  3-point `fieldGoalsMade3 / fieldGoalsAttempted3`, free throws `freeThrowsMade / freeThrowsAttempted`, shown to one
  decimal with the made-attempted line; a zero or missing denominator is an em dash with an empty bar. Rebounds
  (`totalRebounds`), assists (`assistances`), steals, and turnovers are counts.
- Total column: sum of that side's `periodScores`; an em dash if the side has no rows or any period is `null`.
- Play-by-play uses the existing response (`{ events }`) and `computeGameFlow`; fewer than two scoring events shows the
  existing "Not enough play-by-play yet" text.
- Names, positions, and team names render as text (React escapes them); links use `personKey` from the API.

## Testing

- No unit test command is declared (`AGENTS.md`), so no unit-test gate is added. `overview.js` is pure so it can be
  unit-tested if a runner is added later.
- Browser (Playwright, mocked API, `cd frontend && npm run test:browser`): `game-overview.spec.js` covers the default
  tab, line score and totals, best-player rules (under-10-minute exclusion, tie breaks, no eligible player), leaders,
  key-stat bars including "Lower is better", the unplayed message, and the isolated play-by-play failure;
  `game-box-score.spec.js` is updated for the new default tab.
- Live: Chromium on game 13 at 1500px and 400px in both themes, an unplayed game, and a game without play-by-play.
- Checks: `cd backend && npm run build`, `cd frontend && npm run lint`, `npm run build`.
- No `Verify` command is declared, so none was run while writing this spec.

## Notes for the AI

- Follow the code style already in `GameDetailPage.jsx`; reuse `Panel`, `PanelHeader`, `EmptyText`, `AsyncState`,
  `formatCount`, `formatPercentage`, `formatMissing`, and the Motion presets. Theme tokens only; inline `style` only
  for runtime widths.
- Keep `scroll={false}` on the game tab panel (23a). The Overview adds no new `TabPanel`.
- Section kicker copy is new content for review: LINE SCORE, STANDOUTS, GAME LEADERS, KEY STATS, FLOW.
- Best-player pick is PIR for now by design; do not add per-game advanced fetching in this step.
- The extractions in steps 1 and 2 move code without changing behavior; verify by comparing before and after.
- Commits carry no AI attribution (`AGENTS.md`).

## Added during implementation

Where the build differed from the plan above (all mechanical, behavior as specified):

- The repository lints `.jsx` files for component-only exports, so the extracted pure code lives in `.js` files:
  `frontend/src/games/gameFlowData.js` (`withRunningScore`, `eventMoment`, `momentLabel`, `computeGameFlow`) next to
  `gameFlow.jsx` (`PeriodTable`, `ScoreFlowChart`), and `frontend/src/lib/comparisonMath.js` (`winnerSide`,
  `comparisonBand`) next to `ComparisonRow.jsx`. `winnerSide` is also used by the Compare page itself.
- `PlayerLink` moved to its own `frontend/src/games/PlayerLink.jsx` because the Box score and Overview both use it.
- Browser-test fixtures moved to `frontend/e2e/support/game-fixtures.js`, shared by `game-box-score.spec.js` and
  `game-overview.spec.js`.
- The period table uses `table-sm` so the Total column stays visible on a 400px phone (it scrolls inside its wrapper at 360px).
- Verification notes: the compare-before-and-after checks for steps 1 and 2 matched exactly; best players, leaders, and key
  stats were checked on game 13 of `E2026`; both themes were checked with the real theme toggle. No played game in the real
  data lacks play-by-play, so the "no play-by-play" state is covered by the mocked test only.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":13854,"specSha256":"1f78d2092d116070b6f64d6354a1612cf4914f51669dce2cbd874026f41bccae","branch":"refs/heads/feature/overview-tab","head":"fe1bd1613f79d3a34d90925d7143e0eb468eb970","baseRef":"refs/heads/master","baseCommit":"fe1bd1613f79d3a34d90925d7143e0eb468eb970","sourceTree":"d8c4a6af51b16ea15a7ab33a3470b9d78ee03ef9","absentOptional":[]} -->
