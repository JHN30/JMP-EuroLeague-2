# Fix: Team Trends tab removed, and the team stats browser test brought up to date

**Type:** Fix (polish)
**Status:** verified
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

The owner could not tell what the team Trends tab was for. It was a dropdown (points scored,
points allowed or margin) over one game-by-game line with a 5-game rolling average, and a table
with a row for every round (38 for a full season, printing values like 89.66666666666667). It
came from the original six-tab spec (feature 17d) and answered no question the other tabs do not
answer better: points for and against are on the Overview snapshot and the Statistics tab, the
trend of the ratings is the chart on the Advanced tab, and results by round are on the Games tab.

## What changed

- `teams/TeamPage.jsx`: the Trends tab, `TrendsSection`, the rolling average and the metric
  list are removed, with the `TrendChart` import. The tabs are now Overview, Statistics, Roster,
  Shooting, Advanced and Games. The shared `comparisons/TrendChart.jsx` stays: the Compare page
  uses it (and so does its own "Trends" tab, which is unrelated to the team page).
- The one idea worth keeping, a quick look at how recent games went (a bar per game, green for a
  win and red for a loss, the height as the margin, the opponent's crest under it, each bar
  linking to the game), was built at the top of the Games tab (see
  `team-games-tab-margin-strip-and-two-columns.md`).
- `e2e/team-stats-null.spec.js`: updated for the rebuilt Statistics and Shooting tabs. It still
  checks that a missing stat shows a dash and a real zero shows as zero (assists missing against
  80.0 points a game; twos with no makes recorded against 0 of 4 threes), now through the
  labelled Traditional and Shooting regions, and that the Shooting tab says it has no played
  games to map. The old version looked for the previous tile layout and the removed "This team"
  splits row, so it had been failing since the Statistics rework.

## Verify

- `eslint` and `vite build` pass; every remaining team tab renders without console errors.
- Full browser suite (`npx playwright test`, against the running servers): 84 passed and the one
  failure was the outdated `team-stats-null` spec above; it passes after the update.

## Known gaps

- Nothing in the app links to the old tab; the tab was never addressed by URL.
- This round of team-page work added no new browser tests of its own; the suite only guards the
  older behaviour (including the shared shooting court, which still passes).
