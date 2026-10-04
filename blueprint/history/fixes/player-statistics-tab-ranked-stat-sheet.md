# Fix: Player page - Statistics tab as a ranked stat sheet

**Type:** Fix (polish)
**Status:** verified (awaiting the owner's review)
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

The tab was a plain grid of 23 number tiles (GP, MIN, PTS and so on) with no context: no sense of whether a
number was good, and only a fraction of what the feed has for a player (it had no shooting made counts,
fouls, offensive and defensive rebounds, rebound percentages, assist and turnover ratios or free throw rate).

## What changed

- `players/playerStatDefs.js` (new): about 40 rows in five groups (Traditional, Shooting, Advanced, Shot and
  point mix, Record and milestones), each with how it is written and whether fewer is better (turnovers, fouls,
  turnover ratio).
- `players/PlayerStatisticsSection.jsx` (new, replaces `SeasonStatsSection` and `StatSection`): the phase tabs
  and a Per game / Accumulated switch (per game is now the default, it was accumulated), then a sheet in two
  columns in the style of the team Statistics tab. Every row has its value, a bar filled to the player's
  percentile and the league rank ("173rd of 222", green in the top third, red in the bottom third); shares
  (points from threes) fill by the share itself; rows with nothing to rank have no bar. A "Top 10 in the
  league" strip names the player's best ranks.
  - Ranks come from the league leaderboard for the same phase and mode (shared cache key
    `leaderboardQueryKey`), so totals are ranked on totals. Percentages and ratios are ranked among players
    with at least 40% of the most games anyone has played, as on the Overview.
  - A zero on a "more is better" count (no triple-doubles) is not ranked: it is a tie with most of the league,
    not a first place (found in review, it first showed as "1st of 222" and in the top-10 strip).
- `players/PlayerPage.jsx`: loses its stat grid code and the stats mode state; the header keeps its own
  accumulated-totals query. `players/leagueLeaderboard.js`: `fetchLeagueLeaderboard` takes a mode and the shared
  query key; `playerOverview.js`: `rankPlayer` ranks lowest-first for `lowerIsBetter`.

## Verify

- `eslint` and `vite build` pass.
- Headless Chromium, light and dark at 1500 and 1860px and 420px: Abalde per game and accumulated (no overflow
  or page errors); the highlights strip; a player with no row shows the explanatory empty message.

## Known gaps

- The per-game table (not the accumulated one) omits players with fewer than about 20 games, so for them this
  tab says there are no statistics in the phase; the database fix for that is being done separately.
- No per-36-minute view (it would be a calculation, to be done in the database if wanted).
