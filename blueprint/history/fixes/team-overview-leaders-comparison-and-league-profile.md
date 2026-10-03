# Fix: Team Overview - photo leaders, quick comparison and league profile

**Type:** Fix (polish)
**Status:** verified
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

On a team's Overview tab: the second tile row held 7 tiles in a 4-wide grid, the stat
leaders were plain text with no player photos, the "Shortcuts" panel was only two links to
the Compare page, and the point-differential sparkline said little about what makes a club
different.

## What changed

- `teams/TeamPage.jsx`:
  - The 5-chip KPI strip and the 8-tile grid are replaced by one `TeamSnapshot` panel
    (about 210px tall instead of about 300px, with no duplicated Win % or point diff):
    the record as a large number over a win/loss bar with the win % and streak, the last
    five results as W/L pills, points scored and allowed as paired bars with the per-game
    difference, and one slim row for league position (e.g. "4th of 20"), home, away,
    played and remaining. `HeaderStats` and `CompactMetric` are no longer used here.
  - Leaders use the same photo `kpi-chip` cards as the season overview (name, per-game
    value, player photo, link to the player), with the shared stagger and hover motion.
    `index.css` adds `.team-leaders-grid` to the taller-card rules; the grid is 1 column on
    phones, 2 from `sm`, 4 from `2xl`.
  - The Overview now loads the league-wide advanced standings once and feeds the two new
    panels. Regular season uses the `RS` scope, every other phase the `PS` scope.
  - A small "Upcoming games" panel (next three fixtures) sits under Recent form so the left
    column is not left empty beside the taller comparison. The last panel in that column
  grows to the comparison's height and spreads its rows evenly, so the two columns end on
  the same line (checked with a fixture-less club too, where Recent form is the last panel).
- `teams/TeamQuickCompare.jsx` (new, replaces the Shortcuts panel): the club set against its
  next opponent or the league leader (the runner-up on the leader's own page) on net,
  offensive and defensive rating, eFG% and turnover %, using the mirrored-bar
  `ComparisonRow`. Tabs switch the opponent; a "Full comparison" link keeps the old route
  into the Compare page.
- `teams/TeamLeagueProfile.jsx` and `teams/teamLeague.js` (new, replace `TeamTrendChart`):
  where the club ranks among all clubs on ten offensive and defensive numbers (ratings,
  eFG%, turnover %, rebounding, free throw rate, and the opponent versions). Bars are green
  in the top third and red in the bottom third, with badges for the strongest and weakest
  area.
- `teams/TeamTrendChart.jsx` deleted (no other user). The Trends tab is unchanged.
- `lib/ComparisonRow.jsx`: the bar fill's class string read `bg-current${...}` with no
  space, so Tailwind never generated `bg-current` and every comparison bar was invisible
  (also on the game page's Four Factors). Added the space.

## Verify

- `eslint` and `vite build` pass.
- Headless Chromium against the running app: Partizan at 1860px and 420px (tiles, photo
  leaders, profile, comparison all render, no page errors); the League leader tab switches
  the opponent and the edge highlight; the leader's own page reads "Runner-up"; a finished
  playoff phase shows the empty comparison message; bar fills now have a real colour.

## Known gaps

- The ranking counts only clubs that have played, so it is noisy this early in a season.
- In a finished phase with no standings position (for example E2025 Playoffs) there is no
  league leader, so the comparison shows an empty message rather than the champion.
- The snapshot's points bars start at zero, so a 10-point gap looks small; the diff badge
  carries the exact number.
