# Fix: Player Statistics tab against the league average, every stat grouped

**Type:** Fix
**Status:** verified
**Branch:** fix/player-statistics-tab-against-the-league-average-every-stat-grouped

## The problem

The player page's Statistics tab (`players/PlayerStatisticsSection.jsx`, `players/playerStatDefs.js`) is one tall sheet,
1,323px at 1440 for Isaac Bonga, and it is not built like the team Statistics tab:

- **One bar per stat, no reference:** every row is a percentile bar and a rank. Nothing shows what an ordinary player
  does, so "4.1 points, 191st of 238" has no scale.
- **Missing stats:** the feed (`season-stats`) sends numbers the tab never shows:
  - 2PT, 3PT and FT **attempts**;
  - **shots blocked** (`blocksAgainst`);
  - the player's **share of the team's** 2PT, 3PT and FT attempts and makes (`scoring.*Share`);
  - **2PT and 3PT attempts per 100 possessions** (`advanced.twoPointAttemptsRatio`, `threePointAttemptsRatio`).

  Field goals made, field goals attempted, FG% and win % can be worked out from the feed but are not shown either.
- **A wrong label:** "Free throw rate" says "free throws made per field goal attempt". The feed's number is attempts
  per field goal attempt (Bonga 2025-26: 2.9 FTA / 6.8 FGA = 42.6%, feed 42.1%).
- **Loose grouping:** "Traditional" mixes games, minutes, counts and PIR, while "Advanced" mixes rebounding and
  playmaking.
- **Rows are tall:** 44px each.

## The fix

Rebuild the sheet like the team Statistics tab, with the league average in place of the opponents, more compact,
and every stat grouped and labelled.

### Each row

- **Columns:**
  - the stat's name, with a hover tip where it needs one;
  - the player's league rank, coloured by third;
  - the player's number and a bar;
  - the league average's bar and number.
- **Bars:** the two grow out from the middle, the player's in the brand colour and the league's in grey. They are scaled
  to the bigger of the two, like the team tab.
- **League average:** the mean over the same players the rank is measured against:
  - per game, and any percentage or ratio: the players with the phase's minimum games;
  - season totals of a count (Accumulated): everyone who played.

  The header and the note under the sheet say which.
- **Without a rank or comparison:** rows that measure nothing comparable (games played and started, team wins and
  losses, win %) show the number only, with no bars, rank or average. Shot-mix rows show their rank in grey ("most
  ranks first"), like the team tab's style rows.
- **Compact:** rows are about 32px (`py-1.5`), and group headers are smaller.
- **Phones:** as on the team tab, the name sits on its own line above the rank, the numbers and the bars.

### Groups

From xl, two columns of about equal height; one column below that, in this order.

- **Left column:**
  - **Games and impact:** Games played, Games started, Minutes, Valuation (PIR), Double-doubles, Triple-doubles, Team
    wins, Team losses, Win % (worked out).
  - **Scoring:** Points, then made, attempted and % for field goals (worked out from twos and threes), 2PT, 3PT and FT.
  - **Efficiency:** eFG %, True shooting %, Free throw rate (attempts per field goal attempt), 2PT attempts per 100
    possessions, 3PT attempts per 100 possessions.
- **Right column:**
  - **Rebounding:** Rebounds, Off. rebounds, Def. rebounds, Rebound %, Off. rebound %, Def. rebound %.
  - **Playmaking:** Assists, Turnovers, Assist/turnover, Assist ratio, Turnover ratio, Possessions used.
  - **Defense and fouls:** Steals, Blocks, Shots blocked (fewest first), Fouls committed (fewest first), Fouls drawn.
  - **Shot and point mix:** Shots that are 2s, Shots that are 3s, Points from 2s, Points from 3s, Points from free
    throws.
  - **Share of the team:** the player's share of the team's 2PT attempts, 3PT attempts, FT attempts, 2PT made, 3PT
    made and FT made.

### Labels and tips

- Every label uses the team tab's wording (e.g. "2PT made", "Off. rebound %").
- Every derived or ratio stat gets a tip saying exactly what it is, e.g.:
  - **Assist ratio:** assists per 100 possessions the player used;
  - **Free throw rate:** free throw attempts per field goal attempt;
  - **Share of the team's 2PT attempts:** the share of the team's two-point attempts the player took.
- **Rates in Accumulated:** the feed's rates and shares are the same in both modes. In Accumulated they still show as
  rates, and Possessions used becomes the season total (per game × games).

### Kept as today

- **Controls:** the phase and Per game / Accumulated switches.
- **Messages:** the "Not ranked per game" note for a player under the minimum, the "Top 10 in the league" chips, and
  the empty, loading and error states.
- **Ranking:** today's rules, including "too few games" for an unranked player and fewest-first for turnovers,
  fouls and shots blocked.
- **Loading:** the league ranks and averages load on their own, and until then the numbers show without them.

Must not change: the other player tabs, the team Statistics tab and its components, the API.

### Changes found during implement

- **Worked-out numbers:**
  - **FG %** is the two shooting percentages weighted by the share of shots that are twos and threes (exact in both
    modes). Adding up the rounded per-game makes and attempts would be off by up to a point.
  - **Field goals made and attempted** are 2PT plus 3PT.
  - **Possessions used** is per game × games in Accumulated, since the feed's figure is per game in both modes.
- **Checked against the data:**
  - **Possessions used** is field goal attempts + 0.44 × free throw attempts + turnovers + assists (Bonga 2025-26:
    6.8 + 1.3 + 1.3 + 1.5 ≈ 10.9).
  - **Assist ratio, turnover ratio and 2PT/3PT attempts per 100** are per 100 of those possessions. The tips say so.
- **Rank cell:** shows only the ordinal ("15th"), with "of N players" in its title, as on the team tab. For a player
  under the minimum games the rank cell is a "–" with the title "Too few games to be ranked" (was "too few games"
  written out). The note above the sheet explains it.
- **Style rows:** the 2PT and 3PT attempts per 100 possessions rank as style (most first, no colour). Style rows are
  left out of the "Top 10" chips.
- **Share of the team:** the league average is about 8.9% on every row, about one player's share of a team. That is
  correct, and the tips explain each share.
- **Compare page:** it reads these definitions by feed field for its player Statistics labels and tips, so it now uses
  the same wording (e.g. "2PT made", "Team wins"). `compare-player-layout.spec.js` now expects "Team wins".
- **Measured** (Bonga, 1440px): the panel is 1,161px with 55 rows (was 1,323px with 47 rows). Rows are about 29px
  (`py-1`), with `gap-4` between groups.
- **Tests:** `player-statistics-layout.spec.js` gains:
  - every group with its "League avg" column;
  - Points with two bars and an average, and Games played with none;
  - the new rows (2PT and 3PT attempted, free throws attempted, shots blocked, attempts per 100);
  - the Free throw rate tip;
  - Accumulated ranking totals among everyone who played;
  - the unqualified dash.

  The row-layout check now compares the name with the number (on its own line below 640px). The Compare Trends chart
  test failed once on canvas fit; it fails the same way on master, and passed on rerun here.

## Build steps

- [x] 1. **Stat definitions.** Rewrite `playerStatDefs.js` as the groups above.
  - Each stat says how to read it from a player's entry: a feed field, or a function for the worked-out ones (FG made,
    attempted and %, win %, and Possessions used in Accumulated).
  - Each stat also says how it is written, its direction (higher or lower is better, or style), and its tip.
  - Add the league average.

  Done when: lint passes, and the definitions cover every number in the feed's `traditional`, `advanced`, `scoring`
  and `misc` groups except the feed's own ranking fields (`playerRanking`, `entryOrdinal`) and its repeats of games
  and minutes.
- [x] 2. **Sheet.** Rebuild `PlayerStatisticsSection.jsx` with the team-style rows (rank, player bar, league bar,
  league average) and the two columns, and update the skeleton.
  Done when: lint passes. At 1440px Bonga's sheet shows every group with the league average, its panel is shorter than
  1,323px, and at 320px nothing scrolls sideways.
- [x] 3. **Browser checks.** Update the Statistics specs: `player-statistics-layout.spec.js`, or whichever spec covers
  the tab.
  - every group present with the league column;
  - a row without a comparison (games played) showing no bars;
  - the Free throw rate tip;
  - Accumulated still ranking totals;
  - the unqualified note;
  - no sideways scroll at every width.

  Done when: those specs and `responsive.spec.js` pass against the local database.

## Verify

- `npm run build` (root) and `cd frontend && npm run lint` pass.
- The specs above, after `/api/health` reports `"target":"local"`.
- By hand:
  - **Bonga, Statistics, 1440px:** two columns of groups. Each row shows his rank, his number and bar, and the league
    average's bar and number. Hover "Free throw rate" to read "attempts per field goal attempt".
  - **Accumulated:** totals against the average total.
  - **390px:** names over their rows, and nothing cut.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9348,"specSha256":"b44a8b344cbd91caae36254a5cfe117b5d4b7b5cc41ecaa96ed634ee4112d948","branch":"refs/heads/fix/player-statistics-tab-against-the-league-average-every-stat-grouped","head":"b65ffce52408805835a6ee2a324b8fa0c82015dc","baseRef":"refs/heads/master","baseCommit":"b65ffce52408805835a6ee2a324b8fa0c82015dc","sourceTree":"80cac80871235e21e1b4b9438f1bbb95f67cb020","absentOptional":[]} -->
