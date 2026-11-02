# Fix: Player Games tab with a fuller chart, a split table, fuller box scores and season highs

**Type:** Fix
**Status:** verified
**Branch:** fix/player-games-tab-with-a-fuller-chart-a-split-table-fuller-box-scores-and-season-highs

## The problem

The player page's Games tab (`players/PlayerGamesSection.jsx`, `players/gameLog.js`) shows a bar chart, four split
cards and a box-score table. On Abalde's 2026-27 tab (9 games, 1440px):

- **The chart is mostly empty space.** The bars are short, it leaves about a third of its width unused, and under
  each bar sit two rows of tiny icons (crest, then home or away). It charts five stats only.
- **The split cards repeat the table.** Home, Away, Wins and Losses are also the table's filter tabs. Each card's
  ±0.1 differences say little, and the cards take a full row.
- **The table is incomplete.** The game log already carries FG, offensive and defensive rebounds, blocks, fouls and
  fouls drawn, but the table leaves them out. Its PTS and PIR cells are heavy orange bars.
- **The table's controls are scattered.** The filter tabs, "Sort by" and the game count sit on their own row.
- **No quick read of his best games.** Season highs only show as coloured numbers inside the table.

## The fix

### Season highs strip (new, top of the tab)

- **What it shows:** a compact row of his best game in points, rebounds, assists and PIR over the games shown (the
  phase switch applies). For example "15 PTS vs Maccabi", "6 REB vs Partizan".
- **Ties:** the latest game wins.
- **Each item** opens that game, as the chart's bars do.
- **Zero:** a stat whose best is 0 shows "—" and no link.
- **Table marks:** the table keeps its season-high colour marks.

### Chart: fills the width, more stats

- **Width:** with few games the bars stretch to fill the panel. With many they keep today's minimum column width and
  the chart scrolls, opening on the latest games as now.
- **Stats:** PTS, REB, AST, PIR and MIN, plus:
  - **FG%:** made over attempted twos and threes. A game without attempts has no bar and shows "—".
  - **3PM:** threes made.
  - **+/-:** bars go up or down from a zero line.
- **Under each bar:** one row: the opponent's crest, with home or away as a small mark on it (no second icon row). The
  bar's tooltip and accessible name still say the round, venue, opponent and result.
- **Lines:** the dashed average line stays. A thin line of the last-5-games rolling average (from each game's 5th
  game on) is added, with a legend in the note under the chart.
- **Height:** the chart is shorter overall: no empty band above the bars, and the values sit just above them.
- **Header badges:** the team record and the stat's average stay.

### Splits as one compact table

- **Replaces:** the four cards, with one table like the Advanced tab's on/off table.
- **Rows:** All games, Home, Away, Wins, Losses, Last 5, Started, Off the bench. A row with no games shows "—".
- **Columns:** GP, MIN, PTS, REB, AST, FG%, PIR (per game; FG% over the row's attempts).
- **Highlight:** a value clearly above the All games row is tinted green and one clearly below red, as the cards did,
  with the comparison in the cell's tooltip.
- **Started:** the API adds `started` to each game-log row (from `gamePlayerStats.started`). Without it (null), a game
  is in neither the Started nor the Off the bench row.

### Box scores: fuller and lighter

- **Columns:** Opponent, Result, MIN, PTS, REB (with OREB and DREB under it, small), AST, STL, BLK, TO, FG (made-att
  and %), 2P, 3P, FT, PF, FD, PIR, +/-.
- **Starter mark:** a small "S" by the opponent cell, with "Started" as its tooltip and accessible text.
- **PTS and PIR cells:** a plain number with a thin bar under it, scaled to the games shown, in place of the filled
  orange blocks.
- **Controls:** the filter tabs, the sort select and the game count move into one line in the panel header (they wrap
  under the title on narrow screens).
- **Note:** says what each new abbreviation means (BLK, PF, FD, OREB and DREB) and keeps the made-over-attempted
  and season-high lines.
- **Unchanged:** the phase switch, the filters, the sorts, the 12-row start with "Show all", and the row link to the
  game.

### Box scores: Basic / Advanced (added in review)

- **Switch:** "Box score numbers", with Basic and Advanced, in the heading before the filters. It shows only when a game
  has advanced numbers (the pipeline fills E2024 on).
- **Advanced columns:** the same games, filters and sorts, with Opponent, Result, MIN, GmSc, PER, TS%, eFG%, USG%, AST%,
  TOV%, ORB%, DRB%, STL% and BLK%.
- **Labels and rules:** as the game page's Advanced box score.
  - The headings and tips are the game page's `ADVANCED_TIPS`, now exported from `AdvancedBoxScore.jsx`.
  - The game PER shows from 10 minutes (`MIN_BEST_PLAYER_SECONDS`).
  - A missing number is "—".
  - The best game score shown is in colour.
- **API:** `getPlayerGameLog` left-joins `app_game_player_advanced` by game, side and player. It adds `advanced` to
  each game: { secondsPlayed, gameScore, gamePer, trueShootingPct, efgPct, usagePct, assistPct, tovPct, orbPct, drbPct,
  stealPct, blockPct }, with percentages as fractions. A game without a row has `advanced` null.
- **Tab ids:** the switch's keys are `basic-numbers` and `advanced-numbers`. A tab's id comes from its key, and the page
  tabs already have `tab-advanced`.
- **Tests:**
  - **40 games:** the advanced headers, PTS gone, a 5-minute game's PER "—" with its tooltip, TS% "50.0%", and the
    best game score in colour.
  - **States:** no switch for a season without advanced numbers.

### States

- **Loading:** the skeleton follows the new layout: highs strip, chart, split table, table.
- **Error and no games:** as today.
- **Filters:** a filter with no games keeps "No games match this filter."

Must not change: other player tabs, the team Games tab, the game log's existing fields or other callers of
`getPlayerGameLog`.

### Changes found during implement

- **Highs beside the splits:** the highs strip and the split table share one row from 1024px. The highs are a column of
  four cards on the left, as tall as the table; the splits table is on the right. Below 1024px the highs are two by two
  above the splits. One full-width split table at 1440px spread its seven columns thinly. Order: highs and splits,
  chart, box scores.
- **Chart average:** the badge and the average line keep one decimal for counts ("6.2 PTS a game").
- **Start mark:** "S" sits after the opponent's name, not on the date line, so the pinned column stays narrow on a
  phone. Its accessible text is "Started".
- **Split table:** its first column is pinned when it scrolls on a phone (`data-table-sticky`).
- **Grid column:** the highs and splits row uses a `minmax(0,1fr)` column below 1024px. An automatic column took the
  split table's width and pushed the page sideways at 320px.
- **Sort select:** in the heading it has no visible label ("Sort by" is its accessible name).
- **Underline hook:** the PTS and PIR underline has a `bar-line` class for the test.
- **Data:** `viewGame` only adds fields, so the Compare page's callers are unchanged.
- **Real data:** checked on Abalde (2026-27, 9 games) at 1440px and 390px. `started` comes back true or false, and
  there were no console errors.
- **Tests:** in `player-shooting-games-layout.spec.js`, the two Games tests are rewritten.
  - **40 games, starting every other one:**
    - the highs links;
    - the eight split rows (Started and Off the bench each 20);
    - the new columns and the start mark;
    - +/- at -10 under its bar and +5 over it;
    - the highs beside the splits from 1024px;
    - the box-score controls in the heading;
    - the pinned columns, the strips and the underlines at every width.
  - **States:**
    - three games filling the chart's width at 1280px;
    - FG% "—" with no bar for a game without attempts;
    - the Wins split row of dashes;
    - the filter, show all, empty and error states at 320px.
- **Skeleton test:** the Games tab's skeleton test passes unchanged (same label).

## Build steps

- [x] 1. **API.** Add `started` to `getPlayerGameLog`'s rows.
  Done when: the backend builds, and the local database's game log for a player returns `started` true or false per
  game.
- [x] 2. **Data.** In `gameLog.js`, read the new fields per game: FG, OREB, DREB, BLK, PF, FD, 3PM and started.
  Add the split rows and averages, the rolling 5-game average, and the season-high games (latest on ties).
  Done when: lint passes.
- [x] 3. **Highs and chart.** The season highs strip, and the chart filling the width with the new stats, one icon
  row, the rolling line and less height.
  Done when: at 1440px Abalde's 9 games fill the chart's width. With 30+ games it scrolls and opens on the latest.
  +/- bars go both ways, and at 320px nothing scrolls sideways outside the chart.
- [x] 4. **Splits and box scores.** The split table, and the fuller table with header controls, the starter mark and
  the lighter PTS and PIR cells, plus the skeleton.
  Done when: lint passes, and the table and splits fit 320px (the table scrolls inside its own box).
- [x] 5. **Browser checks.** Update the Games part of `player-shooting-games-layout.spec.js` and the player Games
  skeleton test in `skeleton-loading.spec.js`. Cover:
  - the highs strip and its links;
  - the chart filling the width with few games and scrolling with many;
  - the new stat tabs, with +/- going below zero and FG% "—" without attempts;
  - the split rows, including Started and Off the bench;
  - the new columns and the starter mark;
  - the header controls;
  - the states;
  - no sideways scroll at every width.

  Done when: those specs and `responsive.spec.js` pass against the local database.

## Verify

- `npm run build` (root) and `cd frontend && npm run lint` pass.
- The specs above, after `/api/health` reports `"target":"local"`.
- By hand:
  - **Abalde, 2026-27, Games tab:** the highs strip links to his 15-point game. The chart fills the width, and
    +/- shows Anadolu Efes and Dubai below zero. The split table's Wins row reads 8.0 PTS. The table shows FG, BLK,
    PF and FD, and the starter mark on his two starts.
  - **A player with a full season:** the chart scrolls and opens on the latest games.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10322,"specSha256":"d9f54a32f31f0cdb32206ef8a9502c54056e5bfb5af9c5dd4fab3a37c9db6d05","branch":"refs/heads/fix/player-games-tab-with-a-fuller-chart-a-split-table-fuller-box-scores-and-season-highs","head":"1c6a733f11c7dcf1b6cb38be08a080b3f9ec1402","baseRef":"refs/heads/master","baseCommit":"1c6a733f11c7dcf1b6cb38be08a080b3f9ec1402","sourceTree":"9653e67917ff550ae766232fddc9b0314dd5a781","absentOptional":[]} -->
