# Fix: Standings polish and rebuilt breakdown views

**Type:** Fix (polish; not a build-plan item)
**Status:** verified
**Branch:** fix/standings-overview, squash-merged to master as `fac0e74`

> Recorded after the work, not before it. It was done directly from the owner's
> page-by-page feedback (mockups first for the breakdowns), not through `/fix`
> and `/implement`. Audit, Check, and independent review were not run.

## The problem

After feature 22 the Standings page worked but read poorly:

- The KPI strip had no crests, riser and faller looked the same, and "average margin
  of victory" said little next to net rating.
- The Trend column cost five extra history requests per load.
- The three breakdown tabs (Streaks and form, Winning margins, Ahead/behind) were
  confusing, especially the ahead/behind chart.
- Some clubs showed one game fewer than they had played in streaks and margins.

## What changed

- **KPIs:** every Standings KPI shows a crest, the biggest riser is green and the
  biggest faller red, and "Best net rating" replaces average margin. The season
  overview's points-per-game KPI also gets its crest.
- **Table:** a Net rtg column (overall, home, away, or last 10 to match the selected
  view) replaces the Trend column.
- **Streaks and form:** record bars for home, away, and last 10, a game-by-game results
  ribbon, and the longest streaks for the current season only. The rolling Form
  column was removed again at the owner's request.
- **Winning margins:** one bar per game (up is a win, down a loss, one scale for
  every club), average, biggest and close-game figures, an actual-versus-expected wins
  chart (Pythagorean), and the existing "what wins games" table.
- **Ahead/behind:** the comeback chart was removed. It now shows net points per
  quarter or a small game-shape line per club, time in front, and the record when
  leading or trailing at half-time.
- **Why the views derive their figures:** the source's per-view standings feeds can
  lag the basic view by a game (a pipeline issue, since fixed upstream). The views
  compute everything from `app_games`, `app_game_team_stats`, and
  `app_game_period_scores`, so they always agree with the games played.

## Backend

- `GET /:season/phases/:phase/results`: each club's played games, oldest first, with
  quarter margins and box-score category edges (`getPhaseResults` in
  `backend/src/db/season-games.ts`).
- `GET /:season/advanced/game-flow`: time leading, tied, and trailing, lead changes,
  and largest lead per club from play-by-play.
- `DATA_DICTIONARY.md` was synced with the pipeline in the same commit.

## Files

`frontend/src/standings/`: `StandingsKpiStrip`, `StandingsPage`, `StandingsTable`,
`StreaksFormView`, `MarginsView`, `MarginStrip`, `AheadBehindView`, `RecordBar`,
`breakdownUtils`; `season/SeasonOverviewPage.jsx`; `lib/CompactMetric`, `lib/api`,
`lib/format`; `index.css`.

## Verify

- `tsc`, `eslint`, and `vite build` pass.
- 39 endpoints answer 200. Derived figures were compared with the feeds for E2025:
  0 differences.
- Playwright: 8 of 9. The failing one (`filter-controls.spec.js`, a stale selector)
  was failing before this work.

## Known gaps

- Play-In, Playoffs, and Final Four standings tabs are empty because `app_standings`
  only holds the regular season.
- E2026 RAPM in Neon is stale until the pipeline republishes.
