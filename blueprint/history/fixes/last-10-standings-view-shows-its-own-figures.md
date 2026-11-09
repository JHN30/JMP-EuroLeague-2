# Fix: Last 10 standings view shows its own figures

**Type:** Fix
**Status:** verified
**Branch:** fix/last-10-standings-view-shows-its-own-figures

## The problem

On the Standings page (table mode, Overview breakdown), the Home and Away views now count
GP, W, L, PCT, PF, PA and DIFF from that split's games only (fix
`home-and-away-standings-show-their-own-figures`). The **Last 10** view still works the old
way. It re-sorts clubs by the win % of the published L10 record, ties go to the **overall**
point difference, and every figure column shows **full-season** numbers. Only the order and
Net rtg change, so it reads as the overall table shuffled, which is the same confusion the
Home/Away fix removed.

Code: `splitFiguresByClub` / `splitTotals` in `frontend/src/standings/breakdownUtils.js`,
`sortForView` and `OverviewTable` in `frontend/src/standings/StandingsTable.jsx`, the
`resultsQuery` in `frontend/src/standings/StandingsPage.jsx`.

## The fix

The Last 10 view becomes a real last-10 table, the same way as Home/Away:

- **GP, W, L, PCT, PF, PA, DIFF** count only each club's last 10 games of the phase (fewer
  when it has played fewer).
- **Which games:** the club's results in date order, counted the way the Home/Away split
  already counts them: through the standings' round, only against clubs in the table, then
  the last 10. Points follow the same season rule: overtime is left out from 2016-17 on and
  counted before, falling back to the final score when quarter scores are missing.
- **Order:** last-10 PCT, then last-10 DIFF, as in Home/Away. Clubs with no games go last.
- **Loading or failed results:** today's order (published L10) with dashes in the figure
  cells, as in Home/Away.
- **Header tips** say "in the last 10 games only".
- **Unchanged:** `#`, Home, Away, L10 and Form columns; Net rtg (already last-10 net rating);
  the Overall, Home and Away views; the breakdowns.

**Reuse:** extend the existing split path (enable `resultsQuery` for `last10` too, and let the
split helper select the last 10 games instead of home or away games). No backend change: the
phase results already carry everything needed.

**Check first:** confirm that the derived last-10 W-L matches the published `lastTenRecord`
for every RS and TS phase, as the Home/Away records were checked. If the published L10
follows a different rule (for example, spanning phases or counting annulled games), stop and
report the difference before choosing.

**Check result (2026-11-09):** the derived last 10 (date order, through the round, table
opponents only) matches the published `lastTenRecord` for every club in every regular season
from 2000-01 to 2025-26, except 2021-22. Older Top 16 phases (TS) publish no L10, so their L10
column shows a dash while the figures are derived. In 2021-22, 11 of 15 clubs differ, and no
counting rule reproduces them. Olympiacos's published 6-4 is its record one game earlier
(rounds 23-32), so that season's published L10 is one game behind. It is the same season whose
published Home/Away records don't add up to the overall record. Recorded as a source-data
quirk; the derived figures are used.

## Build steps

- [x] 1. **Last-10 figures in the Last 10 view.** Check the published L10 against derived
   records, extend the split helper and page query to `last10`, and update the header tip
   text. *Done when* the Last 10 view shows each club's last-10 GP/W/L/PCT/PF/PA/DIFF, W-L
   matches its L10 column (apart from recorded source-data quirks), rows are ordered by
   last-10 PCT then last-10 DIFF, and the Home/Away views are unchanged.
- [x] 2. **Overtime rule reads the page's season code.** Found in review: on 2026-27 after
   round 10, Last 10 put Olympiacos (+56) above Fenerbahce (+49), but the main table has
   Fenerbahce +49, Olympiacos +46. The page passes the season as its address names it
   (`2026`), while `countsRegulationPoints` expected the API's `E2026` and read every season
   as pre-2016, so overtime points were counted. This also affected the Home/Away fix already
   merged to master (not pushed). The script checks used `E` codes, so they missed it. Parse the
   year with `seasonSlug`, which accepts both forms. *Done when* the rendered page, for 2026,
   2025 and 2015, shows Home/Away/Last 10 W-L equal to the published columns, Home PF + Away
   PF (and PA) equal to the Overall PF (and PA), and the 2026 Last 10 order equals the Overall
   order.

## Verify

- Standings → Regular Season → **Last 10**: GP is 10 (or fewer early in a phase), W-L equals
  the L10 column, PCT goes down the table, and PF − PA = DIFF.
- **Home**, **Away** and **Overall** are unchanged.
- A grouped phase (an older season with groups): Last 10 works per group.
- Slowed results: figure cells show dashes until the results load.
- Browser specs (with `/api/health` reporting `"target":"local"`):
  `npx playwright test standings-view-controls.spec.js grouped-standings.spec.js standings-table-layout.spec.js`


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4984,"specSha256":"dd544ec6e90ff4a695d60810908358f08d46785f2301ff0721654ed86c948f1a","branch":"refs/heads/fix/last-10-standings-view-shows-its-own-figures","head":"ccfc7f6bb73e5433b036cc5ee2aae67e76dda5c7","baseRef":"refs/heads/master","baseCommit":"ccfc7f6bb73e5433b036cc5ee2aae67e76dda5c7","sourceTree":"7c0c891d8e4fa376e38fb30bc2f79216f58b20fa","absentOptional":[]} -->
