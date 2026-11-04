# Fix: Compare player Trends tab

**Type:** Fix
**Status:** verified
**Branch:** fix/compare-player-trends-tab

## The problem

The player Trends tab (`frontend/src/comparisons/ComparePlayerTrends.jsx`, at
`/<season>/compare?view=players&playerA=…&playerB=…`, Trends) is the last Compare tab still on the old layout:

- the large two-avatar header repeats the one the Overview and Statistics tabs have already slimmed down;
- there are four tall (`h-64`) game-by-game charts for points, rebounds, assists and PIR, drawn as raw, noisy lines with no
  average, and each one repeats its note as a paragraph;
- PER and Win Shares by round are two more tall charts;
- nothing shows how the players are trending: their role (minutes), their efficiency, how consistent they are, or how they
  play in different kinds of game. The team Trends tab already has this (form strip, records by type of game, rolling
  averages).

## The fix

Rebuild the tab from the game logs alone: `getPlayerGames` and each game's `advanced` block (TS%, usage, PER, Game Score).
The tab no longer requests the season-advanced endpoint. There are no new endpoints or dependencies. The rows and
colours follow the Statistics and Overview tabs: A uses `primary`, B uses `accent`, and names come from `chartNames`.

1. **Slim header.** Replace the old header with `PlayerPairHeader compact`, the same as Overview.
2. **Form chart** ("The last 10 games against the season"):
   - A summary per player, side by side from sm: the headshot, a swatch of the player's colour and the name, then the last
     10 games' PTS and PIR averages, each with its change on the season (`+2.1`), and the season PIR.
   - One chart, 9-10rem tall, with a pair of bars per game: each player's PIR in their colour, on one shared scale, with the
     latest game on the right. The number sits on top of each bar from sm, and a tooltip names the game. A dashed line marks
     each player's season average. The taller bar is the better game, so it is obvious who is in better form.

   This revision follows review feedback: the first strip of small per-player bars was too short to compare the two players.
3. **Splits** ("By type of game"). One-line rows in the shared ROW_GRID style. Each side shows points and PIR per game,
   with the games count muted. The better PIR side is shown in its player's colour. Rows:
   - Home and Away;
   - In wins and In losses;
   - Started and Off the bench, shown only when the feed knows the starts;
   - First half and Second half of the player's games.

   A split with no games shows "—".
4. **Consistency** ("How reliable"). One-line rows with the better side in its player's colour:
   - 10+ point games;
   - 20+ point games;
   - 20+ PIR games;
   - Double-doubles, counting points, rebounds and assists;
   - PIR spread (the standard deviation; lower is better, and a tip says so);
   - Best 5-game stretch (the highest 5-game PIR average);
   - Worst game share (games under 5 PIR).

   Splits and Consistency sit side by side from xl.
5. **Charts.** Use compact `LineTrend` panels (`h-44`, with the note moved into the title tip), in this order. Each plots
   each game's own value over each player's last 10 games, with the latest on the right as in the form chart. There is no
   rolling average and no running season value, at the user's request: a whole season of 30+ games was too crowded. From xl they
   sit three to a row when the charts fill whole rows, and two otherwise. An opt-in `stretch` prop keeps the charts in a row
   level when one panel's heading wraps.
   - **Production**: a segmented control picks Points, Rebounds, Assists or PIR. This one chart replaces the four.
   - **Minutes**: shows whether the player's role is growing or shrinking.
   - **True shooting %**: from each game's `advanced.trueShootingPct`. Games with no shot attempts are gaps.
   - **Usage %**: from `advanced.usagePct`.
   - **PER**: each game's `advanced.gamePer`.
   - **Game Score**: `advanced.gameScore`. It replaces the round-by-round Win Shares, which only exists as a running value.

   The last four charts are hidden when neither player has advanced game rows.
   - **Legend** (shared `LineTrend`, so the team Trends tab gets it too): each dot is 8px and filled in its series' full
     colour, with 16px before the name. Before, the point overlapped the name.
6. **Phase.** Count only the games of the chosen phase, as the header and the team Trends tab do. Until now the tab drew
   every game of the season whatever phase was picked. The empty state says "in this phase".
7. Update `TrendsSkeleton`, which only this tab uses, to the new layout. The skeleton must not overflow at 320px.

It must not break:

- the loading, error and retry states;
- the "Not enough games played in this phase to show a trend yet." empty state (fewer than 4 games in the phase);
- the season-advanced endpoint failing: the tab no longer uses it, so every chart still shows.
- no sideways scroll at 320–1440px;
- the dark theme;
- the team Trends tab: the shared `LineTrend` and `ChartPanel` only gain opt-in props, apart from the legend fix above.

## Build steps

- [x] **1. Header, form strip, splits and consistency.** Add the pure helpers next to the component: last-10 form, splits,
  consistency counts, spread and the best 5-game stretch. Render the slim header, the form strip and the two row panels.
  *Done when* the tab shows the form strip and both panels for `playerA=003469&playerB=012774` (E2025), the values match a
  manual count from the game log for one row, and the rows are on one line from 640px.
- [x] **2. Compact charts.** Replace the six tall charts with the Production chart and its stat picker, plus Minutes, TS%,
  Usage, PER and Win Shares, as compact rolling panels in rows of three from xl. Update `TrendsSkeleton`. *Done when* the
  picker switches the Production series, the page at 1440 is measurably shorter than before (record the before and after
  heights), and nothing overflows at 320px. Measured: 1,704 → 1,634px at 1440, with three new panels. At 390 the page went from
  2,938 to 3,313px, because the new rows stack there. After the review revision, which made the form chart taller, the page
  measures 1,765px at 1440 and 3,312px at 390. The user asked for the taller chart, so this was accepted over the height goal.
- [x] **3. Specs.** Update the Trends test in `e2e/compare-player-layout.spec.js` to cover:
  - the form chart, at least 140px tall;
  - the split and consistency regions;
  - the picker;
  - the two columns from 1280px;
  - fitting at every width.

  Keep the games-failure, phone and tips tests passing. *Done when* `compare-player-layout.spec.js`, `compare.spec.js` and
  `responsive.spec.js` pass against the local DB, and lint and the root build are clean.

## Verify

- Open `/2025/compare?view=players&playerA=003469&playerB=012774` and go to Trends:
  - the header is slim;
  - the last-10 strips have their averages and changes;
  - the splits and consistency rows are on one line, with the better side coloured;
  - the Production picker switches stats;
  - the charts show bold 3-game averages over faint game dots.
- Check at 390px, 768px and 1440px, and in the dark theme.
- Pick a pair where one player has fewer than 4 games and check the empty state.
- Block `/players/*/advanced` and check that the tab still renders every chart, since it only uses the game logs.
- Run `cd frontend && npx playwright test compare-player-layout.spec.js compare.spec.js responsive.spec.js` with `/api/health`
  reporting `"target":"local"`, then `npm run lint` and the root `npm run build`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7765,"specSha256":"18315d3e9f18531dd4ebb2416334b6c7866a475b9e5721745f54b1054f97fd78","branch":"refs/heads/fix/compare-player-trends-tab","head":"a84637410be8caf61e4437e4e86e86e0f789b762","baseRef":"refs/heads/master","baseCommit":"a84637410be8caf61e4437e4e86e86e0f789b762","sourceTree":"9f53c33f7b9947c65a8b02b2670d593ff7aa1aa4","absentOptional":[]} -->
