# Fix: Player page - Season by season rebuilt as a career view

**Type:** Fix (polish)
**Status:** verified (awaiting the owner's review)
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

The tab was one small card per season (clubs and four numbers: GP, PTS, REB, PIR). With two seasons loaded
(and the second only three games in) it said little, and it had nothing that would grow into a career
view as more seasons are added.

## What changed

Everything is built for any number of seasons; with two it already works, with more it fills out.

- `players/careerData.js` (new): fetches, for each season the player appears in, their registrations,
  regular-season per-game stats, game log and advanced summary (a season without advanced data just has no
  PER column; a season they are not in is skipped), then works out career averages (counting stats weighted
  by games, shooting percentages by minutes played), exact regular-season totals from the game logs, the
  change from one season to the next, and career highs.
- `players/PlayerCareerSection.jsx` (new, replaces `SeasonStorySection`):
  - **Career summary:** seasons, games, minutes, points, and career per-game points, rebounds, assists, PIR.
  - **Season table:** one row per season (age, club crests, GP, MIN, PTS, REB, AST, STL, BLK, PIR, 2P%, 3P%,
    FT%, TS%) with a green ▲ or red ▼ change from the season before on the main columns, and a Career row.
    A season with fewer than 10 games is marked "small sample" and never compared.
  - **Career highs:** the best game for points, rebounds, assists, steals, blocks, threes and PIR across every
    season and phase, each opening that game (playoff games are named by phase, not round number).
  - **Role:** starts out of games, minutes, usage % and a bar of where the points came from, per season.
  - **Teams by season:** a timeline of clubs with crests, "Former" for an earlier club in a season.
- `players/PlayerCareerCharts.jsx` (new): **Trends** (nine small lines, a point per season; a hollow dot and
  dashed stretch for a small-sample season; the headline is the latest season with enough games), and
  **Profile by season**, the Overview's percentile radar with one outline per season, loaded on a button
  press because it reads each season's league leaderboard (shares the Overview's cached request).
- `players/leagueLeaderboard.js` (new): the leaderboard fetch moved out of `PlayerPage.jsx`, which drops the
  old season-story query and card code.

- **Players missing from the league table** (found in review: Carlik Jones, 15 games for Partizan in 2025-26,
  had no row in `app_season_player_stats_*` in any phase, while his game log and advanced rows are complete, so
  only the PER, usage and win-share trends had two dots): `seasonLine` now works a season's per-game numbers
  out from its regular-season game log when the league table has no row (minutes, points, rebounds, assists,
  steals, blocks, PIR, 2P/3P/FT percentages, TS% from points over shots used, and the points mix). Starts and
  age are not in a game log, so they show a dash. Such rows carry a "from games" badge.

## Verify

- `eslint` and `vite build` pass.
- Headless Chromium, 1500px and 420px: Abalde (two real seasons, one a small sample), no overflow or page
  errors. A five-season check with three seasons mocked from real data (varied numbers) showed the
  changes, the trend lines, a five-outline radar and a five-stop timeline all laying out correctly.

## Known gaps

- The Overview tab still reads the league table, so for a player it has no row for (Carlik Jones in 2025-26) it
  says there are no recorded stats for the phase, and the "Profile by season" radar leaves that season out
  (it ranks against the league table); only this tab fills the gap from the game log.

- Regular season only; playoffs appear only in the career highs.
- A player with many seasons makes a few requests per season on opening the tab (and the leaderboard ones
  when the profile button is pressed); fine for a handful of seasons, worth paging if the archive grows large.
- The season table scrolls sideways on a phone.
