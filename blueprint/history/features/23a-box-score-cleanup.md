# Feature: Box score cleanup

**From build-plan:** feature 23a
**Build attempt:** 1
**Branch:** feature/box-score-cleanup
**Status:** verified

## Goal

Make the Game Detail box score read like a real box score: no data-coverage panel, the two
team tables stacked one under the other at full width, whole numbers instead of `9.0-9.0`,
the people who played listed first, player names that open the player page, and the game-high
in each column picked out. This is step 23a of "Game detail rebuild" and is the only step of
feature 23 that needs no new data. The Overview tab (23b), minutes timeline (23c), advanced
box score (23d), and Four Factors (23e) are separate steps.

## In scope

- Remove the data-coverage ("Archive") panel from the game page, including its query.
- Return the box score's measures as numbers from the backend (`GET .../games/:gameCode/box-score`).
- Show whole numbers and clean made-attempted lines (`9-9`) everywhere the box-score data is
  shown on the game page. That includes the Team comparison tab, which reads the same data and
  has the same `9.0-9.0` problem today, with no extra work beyond the backend change.
- Stack the two team tables vertically at full width.
- Order each team's players: starters first, then bench, each by minutes played (most first);
  players who did not play are not shown as rows of zeros but listed in one "Did not play" line.
- Link player names (including those in the "Did not play" line) to `/:seasonCode/players/:personKey`.
- Bold the game-high in each eligible column.
- Replace the browser test that checked the coverage panel.

## Out of scope

- The Overview tab, best-player cards, line score, and score-flow chart (23b).
- Minutes timeline and assist connections (23c); advanced columns, season PER, and the
  `games/:gameCode/advanced` endpoint (23d); Four Factors and mirrored comparison bars (23e).
- Deleting the shared `DataCoveragePanel` component, the `getCoverage` client function, or the
  backend `GET .../coverage` endpoint and its `gameCode` option. Other code still uses the
  panel and the endpoint; the game-scoped option becomes unused and is left for a later cleanup.
- Number formatting on other pages, and any change to the period-score table or the Shooting
  and Play-by-play tabs.
- Changing the numeric column type in `season-schema.ts`. Other queries (records, team
  statistics) read the same column helper and keep today's string values.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` and `checkpointCommits` is
`disabled`. Build the steps in order, running each step's check as you go, then present one
review packet after the last step. No per-step approval pauses and no checkpoint commits;
`/complete` makes the final commit.

## Build steps

- [x] **1. Box score measures as numbers.** In `backend/src/db/season-games.ts`, convert the 24
  measure fields (listed under Data / contracts) of every `teamStats` and `playerStats` row in
  `getBoxScore` to numbers before returning. `NULL` stays `null`; a value that is not a finite
  number becomes `null`. Update the comment above `measureFields`, which says the values are
  delivered as text. Do not touch `season-schema.ts`.
  **Done when:** `cd backend && npm run build` passes; `GET /api/seasons/E2026/games/13/box-score`
  returns `"points": 14` (a number, not `"14.0"`) for Dwayne Bacon's row and a null measure stays
  `null`; `periodScores` and all non-measure fields are byte-identical to before; the game page
  still renders its Box score, Team comparison, and Shooting tabs for game 13 with no console errors.

- [x] **2. Remove the coverage panel and replace its browser test.** In
  `frontend/src/games/GameDetailPage.jsx`, remove the `getCoverage` and `DataCoveragePanel`
  imports, `coverageQuery`, and the panel block above the tabs. Delete
  `frontend/e2e/coverage-panel.spec.js` and add `frontend/e2e/game-box-score.spec.js` with a
  mocked-API test (same `page.route` style as the deleted file, `box-score` returning the numeric
  shape from step 1) asserting that the game page loads with its box score and does not contain
  the heading "This game's data coverage".
  **Done when:** `cd frontend && npm run lint` and `npm run build` pass; the page for game 13 shows
  the header, then the tab strip, with no Archive panel; `npm run test:browser -- game-box-score`
  passes; no file under `frontend/e2e` or `frontend/src/games` still mentions the coverage panel.

- [x] **3. Stacked tables, whole numbers, ordering, and "Did not play".** In `GameDetailPage.jsx`:
  replace the `grid xl:grid-cols-2` wrapper with a single column so each team's table is full
  width; render counts with the shared `formatCount`, minutes with `formatMinutes`, plus/minus with
  `formatSignedDiff`, and made-attempted as `made-attempted` (both missing: an em dash, one missing:
  an em dash on that side). Use the same renderers for the Total row and the Team comparison rows
  (`row.points ?? "-"` becomes the shared formatter so a missing value is an em dash). Sort each
  team's players per Data / contracts; render players with no minutes only as the "Did not play"
  line under the table (names, comma separated). Keep the existing sticky first column,
  horizontal-scroll wrapper, starter badge, position, headshot, and "Winner" badge.
  **Done when:** at 1500px wide the two tables are one above the other and each spans the full
  content width with no horizontal scrollbar; at 400px wide the table scrolls inside its wrapper and
  the page itself does not; no cell shows a `.0`; Dubai's box score for game 13 lists the five
  starters first, then the bench by minutes, with Kondic listed under "Did not play" instead of as a
  zero row; the Team comparison tab shows `9-9 (100.0%)`-style values; lint, build, and the browser
  test (extended to check no `\d\.0` text in the tables, stacked order via bounding boxes, and the
  "Did not play" line) pass.

- [x] **4. Player links and game-highs.** Pass `seasonCode` into the box score table and make each
  player name (table rows and the "Did not play" line) a React Router link to
  `/${seasonCode}/players/${personKey}`, keeping the truncation and `title` tooltip. Compute the
  game-high once from the players who played on both teams for PTS, REB, OREB, DREB, AST, STL, BLK,
  FD, PIR, and +/-; a value is bolded only when it is greater than zero and equals the maximum (ties
  all bold). Bold uses `font-bold` on the cell; no colour is added. Do not bold MIN, the shooting
  splits, TO, BLKA, or FC.
  **Done when:** clicking a player name in game 13's box score opens that player's page; Punter's 25
  points is the only bold PTS value in game 13 and a tied maximum bolds both cells; the Total row is
  never bolded by this rule; keyboard Tab reaches each name link with a visible focus ring; lint,
  build, and the browser test (extended for the link `href` and bold cells) pass.

- [x] **5. Live check and polish.** With the dev servers running, open game 13 for `E2026` in
  headless Chromium at 1500px and 400px and in both themes; confirm loading, a scheduled (unplayed)
  game, and an empty box score still show their existing states, then fix anything the pass shows.
  **Done when:** screenshots reviewed with no layout break, overflow, or console errors in either
  theme; an unplayed game's page still shows its header and tabs with the existing empty states and no
  coverage panel; `cd backend && npm run build`, `cd frontend && npm run lint`, `npm run build`, and
  `npm run test:browser` all pass.

## Files / areas

- `backend/src/db/season-games.ts` - `getBoxScore`, `measureFields` comment.
- `backend/src/routes/seasons.ts` - the `box-score` route (no change expected; confirm).
- `frontend/src/games/GameDetailPage.jsx` - panel removal, `BoxScoreTable`, `BOX_SCORE_COLUMNS`,
  `COMPARISON_ROWS`, the Box score tab wrapper.
- `frontend/src/lib/format.js` - existing `formatCount`, `formatMinutes`, `formatSignedDiff`,
  `formatMissing`; extend only if a made-attempted helper is shared by more than one table.
- `frontend/e2e/coverage-panel.spec.js` (delete) and `frontend/e2e/game-box-score.spec.js` (new).

## Data / contracts

The `box-score` response keeps its shape: `{ periodScores, teamStats, playerStats }`. Only the
measure fields change type, from numeric text to `number | null`:

`points`, `timePlayed` (seconds), `valuation` (PIR), `fieldGoalsMade2`, `fieldGoalsAttempted2`,
`fieldGoalsMade3`, `fieldGoalsAttempted3`, `freeThrowsMade`, `freeThrowsAttempted`,
`fieldGoalsMadeTotal`, `fieldGoalsAttemptedTotal`, `accuracyMade`, `accuracyAttempted`,
`totalRebounds`, `defensiveRebounds`, `offensiveRebounds`, `assistances`, `steals`, `turnovers`,
`blocksFavour`, `blocksAgainst`, `foulsCommited`, `foulsReceived`, `plusMinus`.

- `null` means unavailable and renders as an em dash, never zero.
- `getBoxScore` has one caller (the `box-score` route) and the page is its only consumer; the new
  Playwright mocks use the numeric shape.
- "Did not play": `timePlayed` is `0` or `null`. If no player on that team has positive minutes
  (a box score without minutes), show every player and apply no "Did not play" grouping.
- Starter: `started ?? startedAlt` is true. Order: starters by `timePlayed` descending, then bench by
  `timePlayed` descending; ties by `personName`, then `personKey`.
- Game-high eligible columns: PTS (`points`), REB (`totalRebounds`), OREB, DREB, AST (`assistances`),
  STL, BLK (`blocksFavour`), FD (`foulsReceived`), PIR (`valuation`), +/- (`plusMinus`). Computed over
  players who played, from both teams together.
- Player link target: `/:seasonCode/players/:personKey` (existing route).

## Testing

- No unit test command is declared (`AGENTS.md`), so there is no unit-test gate and none is added.
- Browser: `frontend/e2e/game-box-score.spec.js` with a mocked API, run with
  `cd frontend && npm run test:browser -- game-box-score`. It covers: no coverage panel, stacked
  tables, no `.0` in tables, `Did not play` line, player link `href`, and bold game-high cells.
- Live: API output for game 13, and Chromium screenshots at 1500px and 400px in both themes.
- Checks: `cd backend && npm run build`, `cd frontend && npm run lint`, `npm run build`.
- No `Verify` command is declared, so none was run while writing this spec.

## Notes for the AI

- Backend: strict TypeScript, no `any`; read the DB only through the existing Drizzle helpers.
- Frontend: reuse shared formatters in `frontend/src/lib/format.js` and shared `Panel`; theme tokens
  only, no inline styles except runtime-dependent values; keep the 15b table-overflow rules (sticky
  first column, `min-w-0`, truncation with `title`).
- Removing the panel is an owner request that supersedes the compact game panel from 16a and the
  "coverage panel kept above the tabs" line in 17c. The Shooting and Play-by-play tabs keep their own
  honest empty states.
- Game-high bolding is weight-only so it never relies on colour. Which columns count is a reversible
  default; adjust only if the owner asks.
- Commits carry no AI attribution (`AGENTS.md`). This work was started from the owner's direct
  feedback, so `/complete` archives it as feature 23a.

## Added during implementation (owner requests)

- Fixed two stale labels in `frontend/e2e/filter-controls.spec.js` ("Statistics leaderboards" is now "Leaders", "Comparisons and trends" is now "Compare", renamed in 19d), so the full browser suite passes.
- Player headshots were cropped by a circular `object-cover` (the pictures are 3:4 cut-outs). All six uses now show the whole player: `aspect-3/4`, `object-contain`, no circle (`GameDetailPage.jsx`, `StatisticsPage.jsx` x2 including the empty placeholder, `PlayerPage.jsx`, `TeamPage.jsx`, `ComparisonsPage.jsx`). Box score photos are `h-10`; the others keep their previous heights.
- Added hover tips (the shared `HeaderTip` from the standings) to every box score column header and to the "S" starter badge, and to the 2PT, 3PT, FT, and PIR labels on the Team comparison tab. One `STAT_TIPS` map in `GameDetailPage.jsx` holds the text. Covered by a fourth browser test.
- Added restrained Motion to the game page with the shared presets: tab content fades in on switching, the team sections stagger in, box score and Team comparison rows rise in one after another (`AnimatedBody`/`AnimatedRow`), and rows get a subtle hover highlight. Reduced motion is handled globally by `MotionConfig`. No tests assert animation; the existing four still pass.
- Stopped the page scrolling when switching game tabs: the game tab panel and the nested Shooting mode panel now pass `scroll={false}` (as on Standings), so focus still moves but the page does not jump under the sticky nav. Other pages' `TabPanel`s are unchanged.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":12792,"specSha256":"1df9a3cab93bc2cfb42899f87a65b5af8a0effcc483f66497cacf19a8d8ebd1e","branch":"refs/heads/feature/box-score-cleanup","head":"969cd384a71317c89a63b89bdef6a366986de532","baseRef":"refs/heads/master","baseCommit":"969cd384a71317c89a63b89bdef6a366986de532","sourceTree":"ad22f39bdd8a45a1d288aa817a6df7c7a9f09dda","absentOptional":[]} -->
