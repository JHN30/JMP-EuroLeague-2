# Fix: Home and Away standings views show their own figures

**Type:** Fix
**Status:** verified
**Branch:** fix/home-and-away-standings-show-their-own-figures

## The problem

On the Standings page (table mode, Overview breakdown), the **Home** and **Away** view tabs
re-sort clubs by the win % in the Home or Away record column, and switch Net rtg to the split's
net rating. Every other column (W, L, PCT, PF, PA, DIFF) still shows the **overall** season
figures, and equal records are split by the **overall** point difference.

The result reads as the overall table shuffled, with a PCT column out of order. The user
misread it, and other visitors will too.

Code: `sortForView` and `OverviewTable` in `frontend/src/standings/StandingsTable.jsx`.

## The fix

In the Home and Away views, the table becomes a real home (or away) table:

- **GP, W, L, PCT, PF, PA, DIFF** show only that club's home (or away) games for the phase.
- **Order:** split PCT, then split DIFF, both visible columns. Clubs with no games in the
  split go last, as now.
- **Unchanged:** the `#`, Home, Away, L10 and Form columns; Net rtg (already the split's
  net rating); the Overall and Last 10 views; the breakdowns.

**Data:** `getPhaseResults` (`/phases/:phase/results`, already used by the breakdowns)
returns every played, scored game from each club's side with `home`, `pointsFor` and
`pointsAgainst`. The page already has a `resultsQuery` for it, enabled only for breakdowns.
Also enable it when the view is Home or Away, and work out each club's split totals from
those games, counting only games up to the standings' round.

**Overtime (decided during implement, 2026-11-09):** the published PF, PA and DIFF leave out
overtime points (EuroLeague rule), but `pointsFor`/`pointsAgainst` are final scores. Checked on
E2025 RS: the 5 clubs with no overtime games match exactly; the other 15 are off by 5-55
points. Decision: follow the league rule. The backend adds each game's regulation score
(`regulationPointsFor`/`regulationPointsAgainst`, the sum of quarters 1-4, null when a quarter
is missing) to `PhaseResult`. The split PF/PA/DIFF use it, so Home + Away equals Overall. W/L
still come from the final score. When a game's regulation score is missing, fall back to its
final score.

**Season rule and table scope (found while verifying against every season's published table):**
overtime is left out from 2016-17 on; through 2015-16 the published points use final scores, so
the split follows the season (`countsRegulationPoints`). Only games against clubs in the phase
table count, which drops the annulled 2021-22 games with CSKA, UNICS and Zenit. With both rules,
every RS and TS phase from 2000-01 to 2025-26 matches the published Home/Away records and
PF/PA, with these source-data exceptions:
- E2021: the published Home/Away records add up to one more win than the overall record (BAR
  14-1 + 8-5 vs 21-7); the derived split adds up to the overall.
- E2001, E2010, E2023 RS: one pair of clubs each is 1-2 points off, from one game whose stored
  score differs from the published total.

- **Loading or failed results:** keep today's order (published Home/Away record) and show
  `-` in the split figure cells. Don't show overall numbers under a Home/Away heading.
- **Header tips** in Home/Away views say the figures are home-only (or away-only).
- **Grouped phases** use the same path. The rows already filter to the group's clubs.
- Keep the change on the Standings page (no shared-component changes).

## Build steps

- [x] 0. **Regulation score in phase results.** Add `regulationPointsFor`/`regulationPointsAgainst`
   to `PhaseResult` in `backend/src/db/season-games.ts` from the period scores it already
   reads. *Done when* the backend builds and, for E2025 RS, each club's regulation totals equal
   its published PF and PA.
- [x] 1. **Split figures in Home/Away views.** Enable the results query for Home/Away, derive
   per-club split totals (a small helper next to `marginStats` in `breakdownUtils.js`), pass
   them to `OverviewTable`, render and sort from them, and update the header tips.
   *Done when* the Home view shows a club's home GP/W/L/PCT/PF/PA/DIFF, matching its Home
   record column, and rows are ordered by home PCT then home DIFF. The same holds for Away.
   Home PF + Away PF equals the Overall PF (likewise PA).

## Verify

- Standings → Regular Season → **Home**: for a few clubs, W-L equals the Home column, PCT
  descends down the table, and PF − PA = DIFF. Home PF + Away PF equals the Overall PF
  (overtime points excluded, as in the published table).
- **Away**: the same checks against the Away column.
- **Overall** and **Last 10**: unchanged.
- A grouped phase (an older season with groups): Home/Away tables work per group.
- Throttled network: split cells show `-` until results load, never overall numbers.
- Browser specs (with `/api/health` reporting `"target":"local"`):
  `npx playwright test standings-view-controls.spec.js grouped-standings.spec.js standings-table-layout.spec.js`


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5123,"specSha256":"40c791c1b5a5996acff25d9a921542435ab121e7278d1fbafeaa567bde20604e","branch":"refs/heads/fix/home-and-away-standings-show-their-own-figures","head":"aca021174f8d34c5f16718cbff510b1d7302c875","baseRef":"refs/heads/master","baseCommit":"aca021174f8d34c5f16718cbff510b1d7302c875","sourceTree":"8759aced2371e1d5b0b1ceb636f9460210d08083","absentOptional":[]} -->
