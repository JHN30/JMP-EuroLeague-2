# Fix: Qualified and calculated season stats, minimum-games leaderboards, and 2023

**Type:** Fix (data and polish)
**Status:** verified (awaiting the owner's review)
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

The league's per-game season statistics only listed players with about 20 or more games, so the 113 players of
2025-26 with fewer (Carlik Jones, 15 games) had no per-game numbers anywhere: the roster said "Has not played
yet", the player Overview and Statistics tabs said there were no stats, and the Season by season tab needed a
workaround. The owner had the pipeline fix this in the database (all four `app_season_player_stats_*` tables):
the missing per-game rows are derived from the accumulated ones, and every row carries `is_calculated`,
`min_games` (floor(G / 2) + 1 of the most games any club has played in the phase, 20 for a full regular season,
the same rule the feed follows) and `qualified`. The 2023 season was imported as well.

## What changed

- `backend/src/db/season-catalog.ts`: `E2023` is a supported season (with `E2024` already added), so it appears
  in the season list and the cross-season records.
- `backend/src/db/season-schema.ts`, `season-stats.ts`, `routes/seasons.ts`: `season-stats` returns `isCalculated`,
  `minGames` and `qualified` on every entry, and takes `?qualified=true` (only players who meet the minimum) and
  `?minGames=N` (at least N games; wins over `qualified`), both validated.
- Leaderboards keep qualified players only: the home Leaders panel and the season Overview leaders ask for
  `qualified=true`; a team's Overview leaders filter on `qualified`; the Leaders and Statistics page's player
  leaderboard defaults to "Qualified (20+ games)" with "All players", 5, 10 and 15 as alternatives, and its
  count is 222 qualified of 335 players for 2025-26.
- Player ranks use the flag instead of a guessed threshold: `rankPlayer` takes `qualifiedOnly` (per game and
  percentages rank among qualified players, season totals of a count among everyone who played). A player under
  the minimum is shown without a rank ("too few games" / "Not ranked: under 20 games") and a notice says how many
  games the league needs and, for calculated rows, that the per-game numbers are worked out from the season totals.
- Season by season: the game-log fallback is gone; a calculated season has a "calculated" badge from `is_calculated`.
- Statistics tab alignment: at the two-column width every row, group header and group gap is one fixed line
  (`h-11`), the groups are rebalanced to 24 and 23 lines (Traditional and Advanced on the left; Shooting, Shot and
  point mix and Record and milestones on the right), so a row on the left is level with its neighbour on the right.

## Verify

- `eslint`, `vite build` and `tsc` pass.
- API: `qualified=true` returns 222 players for 2025-26 RS per game, `minGames=10` 278, a bad value is a 400, and
  2023 has teams and 287 players. Headless Chromium: the Statistics tab rows are all 44px and 20 of 21 right-column
  rows are level with a left-column row; the leaderboard shows 222 by default and 335 on "All players"; Jones'
  Statistics, Overview and Season by season tabs show his per-game numbers with the notice.

## A bug found in review (mine, not the database's)

The API first showed the advanced, scoring and misc groups empty for every calculated player (421 rows), and the
database was wrongly blamed: its rows were complete in all four tables. `getSeasonStats` left-joins those three
groups, and Drizzle drops a whole left-joined group when the first selected column is null; each group started with
`player_ranking`, which is null on calculated rows. The groups now start with `entry_ordinal` (part of the primary
key). Checked afterwards on all 3,476 rows of every season, phase and mode: none is missing a group, and Jones'
Statistics tab has no dashes.

## Known gaps

- The per-game table also now has combined phases `PS` and `all` the app does not use for these tabs.
