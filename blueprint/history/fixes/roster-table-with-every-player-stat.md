# Fix: Roster table with every player stat

**Type:** Fix
**Status:** verified
**Branch:** fix/roster-table-with-every-player-stat

## The problem

The team page's Roster tab (`/:season/teams/:clubCode`, Roster, Table view) shows eight columns per player: position, GP,
MIN, PTS (with a bar), REB, AST and PIR. The data already loaded for the same table holds far more:

- **Season-stats feed** (`/season-stats`, already fetched per page for the club's players by `teamRosterStats.js`): the
  `traditional`, `advanced`, `scoring` and `misc` blocks with every number the league publishes per player: games
  started, made, attempted and % for 2PT, 3PT and FT, offensive and defensive rebounds, steals, blocks, blocks against,
  turnovers, fouls committed and drawn, eFG%, TS%, rebound percentages, assist ratio, turnover ratio, attempt ratios,
  free throw rate, possessions, the team shares of attempts and makes, points split by shot type, wins, losses,
  double-doubles and triple-doubles.
- **Per-round advanced tables** (`/teams/:clubCode/players-advanced`, today returning usage, TS%, PIE, game score, PER
  and win shares only): AST%, STL%, BLK%, TOV%, rebound percentages, per-100-possession numbers, offensive and defensive
  win shares; plus `app_player_on_off` (by club) and `app_player_rapm` (whole season).

Players who have not played show "-" in some columns and "—" in others.

## The fix

### Backend

`getClubPlayersAdvanced` (`backend/src/db/season-advanced.ts`) also returns, from the same latest round of the scope:
`astPct`, `stlPct`, `blkPct`, `tovPct`, `orbPct`, `drbPct`, `trbPct`, `efgPct`, `pointsPer100`, `reboundsPer100`,
`assistsPer100`, `stealsPer100`, `blocksPer100`, `turnoversPer100`, `offWinShares`, `defWinShares`; the player's on/off
for this club and scope from `app_player_on_off` (`onNetRating`, `offNetRating`, `netRatingDiff`, `onSeconds`); and
`rapm`, `rapmOffense`, `rapmDefense` from `app_player_rapm` (scope `all`, the whole season). Missing rows give nulls.
Same route and validation; no new endpoint, table or migration.

### The table

The Table view gets two levels of tabs above the table, both with the existing `TabStrip`:

- **Traditional / Advanced**, then the group within it. Traditional also gets **Per game / Totals** (Totals reads the
  same feed with `mode=accumulated`, fetched only when chosen).
- The pinned first column (number, photo, name, Former badge) stays in every group. Every stat column header sorts the
  table (first click most first, second click least first; turnovers, fouls and shots blocked first click fewest), with
  `aria-sort` on the sorted header. Default order stays as today (by position, as the API returns).
- Every column has a short header with a hover tip naming it in full (the existing `HeaderTip`).

| Level | Group | Columns |
|---|---|---|
| Traditional | Overview | Pos, GP, GS, MIN, PTS (bar), REB, AST, STL, BLK, TO, PIR |
| Traditional | Scoring | PTS, 2PM, 2PA, 2P%, 3PM, 3PA, 3P%, FTM, FTA, FT% |
| Traditional | Rebounding | OREB, DREB, REB |
| Traditional | Playmaking | AST, TO, AST/TO, Fouls drawn |
| Traditional | Defense | STL, BLK, Blocks against, Fouls |
| Traditional | Record | W, L, Win %, Double-doubles, Triple-doubles |
| Advanced | Efficiency | eFG%, TS%, FT rate, USG%, PER, Game score, PIE |
| Advanced | Shot profile | 2PA ratio, 3PA ratio, Points from 2s / 3s / FT (%), team share of 2PA, 3PA, FTA |
| Advanced | Rebounding | OREB%, DREB%, REB% |
| Advanced | Playmaking | AST%, Assist ratio, TOV%, Turnover ratio |
| Advanced | Defense | STL%, BLK% |
| Advanced | Per 100 | PTS, REB, AST, STL, BLK, TO per 100 possessions, Possessions |
| Advanced | Impact | Win shares, Off. WS, Def. WS, WS/40, On-court net, Off-court net, On/off, RAPM |

- **Season, not stage (corrected during implement):** the Roster tab has no stage choice; its numbers are the whole
  season (phase `all`), as before. The per-round columns therefore use the scope `all` too, and the "stage without an
  advanced scope" case cannot arise. RAPM is always the whole season and its tip says so.
- **Loading and errors:** the Advanced level's per-round data loads only when Advanced is first chosen; while it loads
  the season-stats columns show and the others show the loading mark; if it fails, an error with Retry sits above the
  table and the season-stats columns still show.
- **Missing values:** every missing value, including a player with no games, shows the same "—".
- **Widths:** the table keeps scrolling sideways inside its panel with the name pinned, on every width; the page never
  scrolls sideways. The Cards view is unchanged.

### Changes found during implement

- **Header tips:** `HeaderTip` is a focusable span and cannot sit inside the sort button (nested interactive elements),
  so each header is one sort button showing the short name, with the full name as its `title` (the browser's hover tip)
  and read out to screen readers after the short name.
- **Players who changed clubs (existing bug):** in the whole-season feed a player who played for two clubs has one row
  with both codes joined by ";" (Partizan 2025-26: Jones and Ntilikina `OLY;PAR`, Fernando `PAR;MAD`, Calathes
  `MCO;PAR`, Radanov `MUN;PAR`). `fetchTeamRosterStats` compared the code exactly, so those five showed no numbers in
  the table and wrongly appeared under "Not played yet" in the Cards view. It now matches either code, which also
  fixes the Overview's team leaders for a stage with such a player. The feed has no split by club, so their league
  numbers cover all their games; a note under the table names them and says the per-round Advanced figures are this
  club's only.
- **Shot profile:** the feed's `twoPointAttemptsRatio` / `threePointAttemptsRatio` are not the share of a player's own
  attempts, so the attempt-mix columns read the scoring block's 2PT / 3PT rate, and the two league ratios are kept as
  "2PA ratio" / "3PA ratio" with a tip saying they are as the league publishes them. The shares of the team's made
  shots (2PM, 3PM, FTM) are in the group as well.
- **Defense (Advanced):** STL% and BLK% plus DREB%, defensive win shares and defensive RAPM, so the group is not two
  columns; Impact adds offensive RAPM.
- **Record:** GP sits first so W and L read against it.
- The level, group and Per game / Totals strips use the existing tab levels 3 and 2 (there is no level 4).

Must not change: the Cards view, the Overview's team leaders (they read the same per-game data), the Roster facts and
coaches, the season-stats and players-advanced callers elsewhere (they only gain fields).

## Build steps

- [x] 1. **More per-round fields.** Extend `getClubPlayersAdvanced` with the rate, per-100, win-share split, on/off and
  RAPM fields.
  Done when: `npm run build` passes and `/api/seasons/E2025/teams/PAR/players-advanced?scope=RS` returns them with
  values.
- [x] 2. **Grouped, sortable table.** Column definitions for the 13 groups, the level, group and Per game / Totals
  tabs, sorting with `aria-sort`, header tips, one missing mark, the lazy Advanced and Totals queries with loading and
  error states (`TeamRosterSection.jsx`, a column-definition module beside it, `teamRosterStats.js`).
  Done when: lint passes and at 1440px every group shows its columns for a real club, sorting works, and Totals and
  Advanced load on demand.
- [x] 3. **Browser checks.** Extend `team-statistics-roster-layout.spec.js`: every group's headers, sorting both ways
  with `aria-sort`, Totals and Advanced loading on demand, the Advanced error state (mocked) with season-stats columns
  still shown, the single missing mark for a player without games, the stage with no advanced scope, and no page
  sideways scroll at 320, 390, 768, 1024 and 1440px with the name column pinned.
  Done when: that spec plus `responsive.spec.js` pass against the local database.

## Verify

- `npm run build` (root) and `cd frontend && npm run lint` pass.
- `team-statistics-roster-layout.spec.js` and `responsive.spec.js`, after `/api/health` reports `"target":"local"`.
- By hand at 1440px: open a club's Roster tab, Table. Go through each Traditional group, switch to Totals, then each
  Advanced group; sort a column both ways. At 390px the table scrolls inside its panel with the names pinned.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8303,"specSha256":"8adb6f28e059ce1895dfd3a6ecd4b76d2ca278f34d526b3d5bf0c936594454a4","branch":"refs/heads/fix/roster-table-with-every-player-stat","head":"c08a436bcc14760b0607cfd05f06b099f6d1b55d","baseRef":"refs/heads/master","baseCommit":"c08a436bcc14760b0607cfd05f06b099f6d1b55d","sourceTree":"053bfd8ec962358d0af7e8087eeb05760a1017c9","absentOptional":[]} -->
