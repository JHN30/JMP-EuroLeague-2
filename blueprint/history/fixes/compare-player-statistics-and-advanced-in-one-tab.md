# Fix: Compare player Statistics and Advanced in one tab

**Type:** Fix
**Status:** verified
**Branch:** fix/compare-player-statistics-and-advanced-in-one-tab

## The problem

A player comparison has two long tables, Statistics (`PlayerComparisonTable` in `comparisons/ComparisonsPage.jsx`) and
Advanced (`comparisons/ComparePlayerAdvanced.jsx`). Both use the old row: a centred label over two full-width bars,
about 63px a stat. For Vezenkov vs Nunn (`/2025/compare?view=players&playerA=003469&playerB=012774`):

| Tab | 1440 | 390 | What it shows |
|---|---|---|---|
| Statistics | 2,441px | 2,373px | 28 stats in four groups (Traditional, Advanced, Scoring, Misc), values only, no places |
| Advanced | 3,277px | 3,241px | 34 stats (Overall, Per 100 possessions, Rates), each with "#N of M" |

The two tabs repeat each other: eFG%, TS%, rebound % and AST/TO appear in both. Neither shows a player's numbers
against their own club's, such as their share of its points.

## The fix

These are frontend changes, in `comparisons/`. They use data the tabs already load:
- each player's season-statistics row (`getPlayerSeasonStats`);
- the phase leaderboard in the selected mode (`fetchLeagueLeaderboard(seasonCode, phaseCode, mode)`);
- each player's advanced numbers (`getPlayerAdvanced`, extended);
- the league's team rows (`useTeamRows`), for the players' clubs.

There are no API or address changes.

1. **One Statistics tab.**
   - The player sections become Overview, Statistics and Trends. The Advanced tab and `ComparePlayerAdvanced.jsx` go;
     their numbers move into Statistics.
   - The "Player statistics" select (Per game / Accumulated) stays on Statistics.
2. **Team-tab rows.** Every stat is one aligned row, the same pattern as the team Statistics tab and the Overview's
   season line:
   - the stat name with its tip, then A's place, value and bar, then B's bar, value and place;
   - the better side in its player's colour (primary for A, accent for B), and "↓" for lower-is-better stats;
   - below `sm`, two lines: the name between the places, then the values with a bar each.
   - **Places and bars.** Box-score stats are placed among the qualified players in the leaderboard, in the selected
     mode, with the bar being the percentile (`rankPlayer`). Advanced stats use the endpoint's own rank, as the
     Advanced tab does now, with the bar from rank and count. Style stats with no better end (usage, shot mix) show
     no colour.
3. **Groups**, in two columns from `xl` that end on about the same line, with no stat repeated:
   - **Scoring:** points, 2-pointers, 3-pointers, free throws (made, attempted, %), eFG%, TS%, FT rate.
   - **Shot mix:** shots that are 2s and 3s, and points from 2s, 3s and free throws.
   - **Playmaking:** assists, AST/TO, assist ratio, turnovers, turnover ratio.
   - **Rebounding:** rebounds, offensive and defensive, and their %.
   - **Defense:** steals, blocks, fouls drawn, fouls committed.
   - **Impact:** PIR, PER, PIE, game score, Win Shares (offensive, defensive and per 40), RAPM, on/off net rating.
   - **Rates:** the advanced tab's Rates, except those already above.
   - **Per 100 possessions:** shown under Impact (first planned as folded; see Changed while building).
   - **With the club** (new, team data for the player):
     - the club's record and place in the phase;
     - minutes share (minutes per game out of 40);
     - share of the club's points, rebounds and assists per game;
     - usage %;
     - games and starts.
     These have no league place, only the two values and the better side.
   - **Overall:** minutes, games played, double-doubles, triple-doubles, possessions.
4. **Header.** The tab starts with the compact `PlayerPairHeader` the Overview uses, and a note: "Beside each value:
   the place among players with enough games. Hover or tap a name for what it means."
5. **States.**
   - Each source fails or loads on its own, inside its group. If advanced numbers are missing, the advanced rows say
     so in their groups and the box score still shows. If the team rows are missing, With the club is left out.
   - A player under the minimum games shows "—" for the place, with a tip.
7. **Changed while building.**
   - The box-score groups are the player page's stat sheet (`STAT_GROUPS` in `players/playerStatDefs.js`), with its
     places (`leagueStanding`). So the compare tab and the player page rank the same way, and nothing new had to be
     defined. The left column is Games and impact, Scoring, Efficiency and Impact. The right is Rebounding,
     Playmaking, Defense and fouls, Shot and point mix, Share of the team, The club and Rates.
   - The player page's value formatter moved to `playerStatDefs.js` (`formatSheetValue`), so both use one function.
   - "With the club" became "The club": club record, club place, minutes share, and points, rebounds and assists
     share. Usage % stays in Rates. Games and starts, team wins and losses, and the shot shares are already in Games
     and impact and Share of the team.
   - An advanced number neither player has is left out. The per-player feed has no split of Win Shares (it is kept
     for teams), so Offensive and Defensive Win Shares were always two dashes.
   - A row without league places (games played, the club's rows) has no bars.
   - Requested after review: Per 100 possessions is shown, not folded. Three splits were measured at 1440 for how far
     apart the column bottoms end:
     - Per 100 under Impact on the left, the club on the right: 47px (Vezenkov vs Nunn), 80px (Maledon vs Lessort, and
       Carlik vs Chris Jones).
     - The club on the left, Per 100 under Rates on the right: about 100px.
     - A browser-balanced single flow: 106 to 139px.
     The first is kept. Groups are never split, so the columns cannot end level. The left column is Games and impact,
     Scoring, Efficiency, Impact and Per 100 possessions. The right is Rebounding, Playmaking, Defense and fouls, Shot
     and point mix, Share of the team, The club and Rates.
   - Result (Vezenkov vs Nunn): about 2,100px at 1440, against 5,718px for the two old tabs together. At 390 it is
     5,260px, against 5,614px.
6. **Skeleton.** `PlayerStatsSkeleton` matches the new layout. `PlayerAdvancedSkeleton` goes.

The following must not break:
- every remaining tab's "Players compared" header;
- every stat name keeps a hover tip;
- the Per game / Accumulated select;
- the phase select;
- both themes, keyboard focus, and no sideways scroll at 320px.

## Build steps

1. [x] **Rows, groups and the merged tab** (items 1 to 4).
   - Done when the tab strip has no Advanced.
   - Done when Statistics shows the groups above as one-line rows from `sm` with places, in two columns from `xl`,
     with no stat twice.
   - Record the height at 1440 and 390 against the two old tabs together.
2. [x] **With the club and the states** (items 3 and 5).
   - Done when the club rows show both players' shares and records.
   - Done when failed advanced or team data leave the rest of the tab working.
3. [x] **Skeleton and browser specs** (item 6). Update `e2e/compare-player-layout.spec.js` (the Statistics and
   Advanced test, the phone test, the tips test, the failing-advanced state) and `compare.spec.js`. Add checks for:
   - no Advanced tab;
   - the rows on one line from 640px;
   - two columns from 1280px;
   - the per-100 fold;
   - With the club values from mocked team rows;
   - no sideways scroll at 1280, 1024, 640 and 320.
   - Done when the specs pass on the local DB.

## Verify

- On the local DB (`/api/health` reports `"target":"local"`), run
  `cd frontend && npx playwright test compare.spec.js compare-player-layout.spec.js responsive.spec.js`.
- Then `npm run lint` and `npm run build` in `frontend`.
- In the browser, open `/2025/compare?view=players&playerA=003469&playerB=012774`, Statistics:
  - no Advanced tab;
  - aligned rows with places in two columns;
  - With the club;
  - the per-100 fold;
  - switch Per game / Accumulated and the phase.
- Check 390 and 320, and both themes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8214,"specSha256":"4aa45ad459ff0c1b7ef66fb52cc810a93884258f7835db56dedc59ac7d42b00d","branch":"refs/heads/fix/compare-player-statistics-and-advanced-in-one-tab","head":"ec454e1ae1fcc0cc6c5f3aa33dc9c2b7e3930c66","baseRef":"refs/heads/master","baseCommit":"ec454e1ae1fcc0cc6c5f3aa33dc9c2b7e3930c66","sourceTree":"175e1460433135f47a508c650333a15d46871dc3","absentOptional":[]} -->
