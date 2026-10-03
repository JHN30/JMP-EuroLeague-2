# Fix: Team Statistics tab - versus opponents with league ranks

**Type:** Fix (polish)
**Status:** verified
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

The Statistics tab was 32 identical number boxes in three blocks (Traditional 13, Advanced 6,
Opponent 13), with the thirteenth box alone on its row. The Opponent block repeated the
Traditional labels without setting the two side by side, and no number said whether it was
good or bad for the league.

## What changed

- `teams/TeamStatisticsSection.jsx` (new, replaces `StatisticsSection` in `TeamPage.jsx`):
  one panel, in two columns from `xl` (Traditional on the left, Shooting and Advanced on the
  right; both columns end on the same line). Every stat is one aligned table row: stat name,
  the club's league rank, the club's per-game number and bar, then what its opponents put up
  against it (bar and number). All groups share one grid and one header row (Rank, club,
  Opponents); on a phone the stat name moves to its own line. The rank is the club's own only
  (green top third, red bottom third, grey between, the same tiers as the Overview profile);
  an earlier version also ranked the opponents' side, which read as clunky and was dropped.
  Rows stagger in and the bars grow from the middle. The league ranks load separately, so a
  failed ranking request still shows numbers and bars.
- `teams/teamStatDefs.js` (new): the 19 stats as pure functions of one side's season totals
  and the other side's, so the same formula gives the club's number, its opponents' number and
  every other club's number for the ranking (`leagueRank`). Shooting and advanced numbers keep the formulas
  the old tab used (eFG%, true shooting, assist/turnover, rebound %, free throw attempts per
  field goal attempt).
- Backend: `GET /api/seasons/:seasonCode/team-stats?phase=` returns every club's season
  totals for a phase (`getLeagueTeamStats` in `db/season-games.ts`, route in
  `routes/seasons.ts`). The per-club select was lifted into a shared `teamStatsColumns` map
  used by both functions. Unknown phase returns 404 `PHASE_NOT_FOUND`, like the per-club route.
  The frontend wrapper is `getLeagueTeamStats` in `lib/api.js`.
- `teams/teamLeague.js`: `rankTier` moved here from the Overview profile so both tabs share it.
- Overview quick comparison: switching between Next opponent and League leader now replays a
  staggered entrance, and the bars grow from their anchored end. `ComparisonRow` takes an
  opt-in `animated` prop, so the game page's Four Factors is unchanged.

## Verify

- `eslint` (whole frontend), `vite build` and the backend `tsc` build pass.
- Ranks recomputed independently from the raw endpoint for Partizan (points 6th, turnovers
  3rd, 3PT% 4th of 20) and matched the badges.
- Headless Chromium, dark theme: Partizan at 1860px, 1100px and 420px, and Olympiacos in the
  E2025 playoffs (ranks present); no page errors. At 1860px the two columns' bottoms are at
  the same pixel. The comparison switch was sampled mid-animation
  (rows at 0 to 1 opacity in sequence, bar scale 0 to 1).

## Known gaps

- The ranks count only clubs with games in the phase, so they swing early in a season.
- Bars start at zero, so close values (30.3 against 31.7 rebounds) look the same length; the
  numbers carry the difference.
- The old per-club "attempts" detail is only on the Shooting tab now.
