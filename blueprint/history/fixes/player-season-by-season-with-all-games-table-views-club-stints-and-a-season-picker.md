# Fix: Player Season by season with all games, table views, club stints and a season picker

**Type:** Fix
**Status:** verified
**Branch:** fix/player-season-by-season-with-all-games-table-views-club-stints-and-a-season-picker

## The problem

The player page's Season by season tab (`players/PlayerCareerSection.jsx`, `PlayerCareerCharts.jsx`, `careerData.js`)
counts only the regular season and grows long for players with many seasons. Measured on the local database at 1440px:

- **Regular season only:** older seasons had a 10-game regular season, so long careers are undercounted. Sergio Llull
  (`TGB`) shows 326 career games. His 2014-15 is 10 games in the regular season and 30 across every phase
  (`season-stats?phase=all`). His 2017-18 row is all dashes, though he played 4 playoff and Final Four games.
- **Empty seasons:** a season with a registration but no games (Llull's 2026-27 so far) is a row of dashes. It counts in
  "Seasons" (20) and stretches every trend axis to a season with no point.
- **Role table:** repeats every season in a second table under the trends. It is 1,061px tall for Llull and 371px for
  Isaac Bonga.
- **Teams by season:** one stop per season, so Llull has 20 identical Real Madrid stops in a sideways scroll.
- **Profile by season:** draws one radar outline per season, 20 for Llull, which can't be read.
- **Page height:** Llull's tab is 4,298px tall and Bonga's (5 seasons) is 2,873px.

## The fix

### Regular season / All games switch

- **Switch:** "All games" and "Regular season", above the career summary. The tab opens on **All games** (every
  phase: regular season, Top 16, play-in, playoffs and Final Four).
- **What it drives:** the summary, the season table (all three views), the trends and the profile radar.
  Career highs already cover every game and are unchanged.
- **Where the numbers come from:**
  - **Per-game line:** `season-stats` with `phase=all` (All games) or `phase=RS`, as today.
  - **Advanced numbers** (PER, usage, win shares): advanced scope `all` or `RS`.
  - **Totals:** from the game logs, filtered by phase in the Regular season view.
  - **Radar:** the league leaderboard for `all` or `RS`.
- **Loading:** both phases are fetched with the career, so switching is instant. That is two more requests per
  season the player appears in. The switch is local state, like the page's tabs.
- **Small sample:** fewer than 10 games is still a small sample, counted in the selected view.

### Empty seasons left out

- **Stats views:** a season with no games in the selected view leaves the season table, the trends, the radar's season
  choices and the "Seasons" count. In the Regular season view Llull's 2017-18 (playoffs only) drops out; in All
  games it shows its 4 games.
- **Clubs:** "Teams by season" still uses every registered season, since it describes rosters.
- **No games in the view:** the tab keeps the switch and says "No regular-season games recorded." (or "No games
  recorded.") in place of the stats sections. The clubs and career highs stay.

### Season table with three views

- **View switch:** **Per game**, **Totals** and **Role**, in the table's panel header. The season, team and age
  columns stay pinned in every view, and the current season keeps its highlight.
- **Per game:** today's columns, with the ▲/▼ changes and the career row.
- **Totals:** from the game logs, so the numbers are exact.
  - Columns: GP, MIN, PTS, REB, AST, STL, BLK, PIR, 2PM-A, 3PM-A, FTM-A.
  - The career row is the sum.
- **Role:** today's role table moved in.
  - Columns: Started, MIN, USG%, Pts from 2s, Pts from 3s, Pts from FT.
  - The career row shows minutes and usage weighted by games. Point shares are left blank.
- **Removed:** the separate "How the role changed" panel goes.
- **Note under the table:** follows the view and the phase switch.

### Clubs as stints

- **One stop per stint:** consecutive registered seasons at the same club become one stop. For example, Real Madrid,
  "2007-08 to 2026-27 · 20 seasons", with the crest, and positions and numbers when they changed (e.g. "Guard · #23").
- **More than one club in a season:** each club is its own stint, and a mid-season move keeps "Former" on the club
  left. A club the player comes back to later starts a new stint.
- **Links:** each stint links to that club's page in the stint's last season.
- **Unchanged:** the timeline look and the current-season marker (a filled dot on the stint containing it).

### Radar: pick the seasons

- **Season chips:** the profile panel shows a chip per season with games in the selected view, as toggle buttons
  (`aria-pressed`).
- **Default:** the last 3 such seasons are selected (all of them when there are fewer). At least one season always
  stays selected.
- **Loading:** only the selected seasons' leaderboards load, still after the "Compare the profile by season" button.
- **Unchanged:**
  - colours, from newest to oldest;
  - dashed outlines and their notes for a season under the minimum games or with few games;
  - the "Not drawn" note.
- **Removed:** the "Click a season in the legend to hide it" note goes. The legend stays as the key.

Must not change: the other player tabs, the hero, the career highs, the trend cards' look, the `calculated` and
`small sample` badges, how career averages are weighted, the skeleton's overall shape (it gains the switch's place).

### Changes found during implement

- **Trends redrawn (asked for in review).** The twelve sparkline cards drew a small line in the middle of each wide card,
  with no season labels or scale. They are replaced by one chart:
  - a stat picker (Points, Rebounds, Assists, Steals, Blocks, PIR, Minutes, TS%, 3P%, PER, USG%, Win shares);
  - three facts: the latest season with its change on the season before, the best season, and the career figure;
  - a bar per season with its value over it and the season under it.

  The career figure is the games-weighted average (minutes-weighted for TS% and 3P%), or the sum for win shares. It is
  drawn as a dashed line, except for win shares. The best season is filled, and a small-sample season is striped
  (`.trend-bar-small` in `index.css`) and never the best. With many seasons the chart scrolls in its own region. The
  skeleton matches.
- **No ▲/▼ in the table (asked for in review):** the trend chart already shows how each season moved. The Per game
  view has no change arrows, and the note under it no longer mentions them. The small-sample badge's tooltip now says
  to read those numbers with care.
- **Games after the regular season under GP (asked for in review):** in All games, the GP cell (Per game and Totals
  views, and the career row) lists the season's Top 16 games (older seasons) and postseason games (play-in, playoffs,
  Final Four) under the total. This shows they are counted, e.g. Alberto Abalde's 2025-26 "42 / 6 postseason".
  Counted from the game log, as `stages` on each line and on the career totals.
- **Table header on phones:** the Per game / Totals / Role tabs wrap under the panel title instead of squeezing beside
  it. The shared `PanelHeader` is unchanged.
- **Pinned columns:** only the season column is pinned, as before. Team and age stay in every view.
- **Calculated badge:** shown in the Per game and Role views only, since totals come from the game logs.
- **Radar chips:** the last selected season is `aria-disabled` with a title saying why. The radar's legend no longer
  hides seasons on click.
- **Measured** (local database):

  | Player | Width | Before | After |
  |---|---|---|---|
  | Llull | 1440px | 4,298px | 2,967px |
  | Bonga | 390px | 4,229px | 3,372px |

- **Tests:**
  - `player-career-layout.spec.js` covers the switch with Llull's numbers, the three table views (Totals adds up to its
    career row), the club stints (Llull, Bonga), the radar chips and the trend chart's stat picker.
  - Its fit check now skips a scrolling tab strip, like a scrolling region.
  - `skeleton-loading.spec.js` uses the radar's new loading label.
- **Failing before this fix:** these tests fail on master without these changes, on pages this fix doesn't touch:
  - `historical-era-pages` (2016, 2017, 2018, 2020, 2022) and `cancelled-season`: the team Statistics tab's
    "Traditional" region;
  - `skeleton-loading`: the game page's box-score skeleton.

## Build steps

- [x] 1. **Data.** In `careerData.js`, fetch each season's stats and advanced numbers for both `RS` and `all`. Add a
  phase to `seasonLine`, `careerTotals` and the averages, with per-season totals from the game logs. Leave out
  seasons with no games in the view. Group the registrations into club stints.
  Done when: lint passes. In All games, Llull's career has more than 326 games, 2014-15 shows 30 GP and 2017-18
  shows 4 GP. In Regular season it has 326 games and no 2017-18 or 2026-27 row.
- [x] 2. **Tab.** Add the switch, the table's Per game / Totals / Role views (the Role panel goes), the club stints
  and the radar's season chips, and update the skeleton.
  Done when: lint passes. At 1440px Llull's tab is noticeably shorter than 4,298px and shows one Real Madrid stint.
  The radar draws 3 outlines by default. At 320px nothing scrolls sideways.
- [x] 3. **Browser checks.** Update `player-career-layout.spec.js`:
  - the switch, opening on All games, and the regular-season numbers after switching;
  - the three table views;
  - an empty season left out;
  - club stints, including a player who moved clubs;
  - the radar chips (3 selected by default, never fewer than one).

  Done when: that spec and `responsive.spec.js` pass against the local database. The other specs that open this tab
  (`historical-era-pages`, `cancelled-season`, `skeleton-loading`) are run and pass, or are updated for the new
  layout.

## Verify

- `npm run build` (root) and `cd frontend && npm run lint` pass.
- The specs above, after `/api/health` reports `"target":"local"`.
- By hand:
  - **Llull at 1440px, All games:** about 30 games in 2014-15, one Real Madrid stint, and 3 outlines on the radar.
    Switching to Regular season shows the 10-game seasons and drops 2017-18.
  - **Bonga:** three stints (Bayern, Partizan, Panathinaikos), and the Totals view adds up to the career row.
  - **390px:** everything stacks and fits.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10292,"specSha256":"678e386eae59b0cee839a00a02406afce42a8e0b60229d5f11e63a812ca44d47","branch":"refs/heads/fix/player-season-by-season-with-all-games-table-views-club-stints-and-a-season-picker","head":"3f90a24e74f8e3814472c9759304a904f1893b2d","baseRef":"refs/heads/master","baseCommit":"3f90a24e74f8e3814472c9759304a904f1893b2d","sourceTree":"1830af034bf78ddb17673cb845023ec97d44a87e","absentOptional":[]} -->
