# Feature 34n: historical qualifying stages and remaining coverage gaps acceptance

## Recorded evidence

Collected on 2026-10-14 from the existing local API (`/api/health` reported `target: local`) through `format`, `phases`, `teams`,
`phases/RS/standings` and local browser pages. No database write, pipeline command, Neon access or real `.env` read was involved.

- No season has a qualifying phase or game locally: the phases of E2001 and E2008-E2015 are only `RS`, `TS`, `PO`, `FF` (E2001: `RS`,
  `TS`, `FF`). The 34a inventory (section 6) establishes qualifying rounds for E2001 and E2009-E2014 and does not establish them for
  E2008 and E2015.
- Before this leaf the format `exceptions` carried nothing about qualifying and no page mentioned it.
- Because the data has no qualifying game, this leaf adds a fact and a note, not a stage, filter, tab, club or count.

## Results

Verified on 2026-10-14 against the local database (`/api/health` reported `target: local`).

Changes:
- `season-format-registry.ts`: a `qualifying` exception kind (`stage: "RS"`, a note) on E2001 and E2009-E2014 only, with notes limited to the
  inventory's established facts (the 2 of 32 clubs for E2001; two-legged knockout rounds for E2009-E2010; the Vilnius and Charleroi
  tournaments for E2011; the winners Cantù, Lietuvos rytas and UNICS for E2012-E2014), a `withQualifying` helper, and registry checks (non-empty
  note, stage `RS`). It is returned unchanged under `exceptions` by `GET /api/seasons/:season/format`. E2008 and E2015 carry none.
- `seasonFormat.js`: `competitionNotes` returns the qualifying note only for the `RS` phase and only when no game or club is named, and
  appends "The qualifying games are not loaded, so no qualifying results are shown and the regular-season counts, records and statistics cover
  only the main competition."
- `RaceView.jsx` / `StandingsPage.jsx`: an opt-in `showContext` prop (default true); a grouped Race now shows the competition note once, for its
  first group, instead of once per group. Not in the spec: found because the note appeared four times in the E2011 Race view. It also
  applies to the earlier stage notes on grouped Race views.
- `34n-coverage-gaps.md`: every open item of inventory sections 7 and 11 classified (resolved with a recorded check, app ok, pipeline/source,
  deferred or left for 34o), plus the note for the pipeline owner describing a qualifying feed.

Observed behaviour worth knowing:
- Home shows the note only while the regular season is the current stage. A finished grouped season's Home snapshot shows its Top 16 table, so
  it carries no qualifying note (the spec listed Home; the test records the actual behaviour).

Checks run:
- `npx playwright test qualifying-note.spec.js`: 10 passed (format API for E2001 and E2009-E2014 versus E2000, E2002, E2008, E2015, E2016,
  E2023 and others; no `QU` phase or stage; note logic; Standings, Games and Race show it once; absent for E2008, E2015, E2002, E2024 and on
  Top 16, Playoffs, Final Four, Postseason, a game page, a team page and a finished season's Home; team and standings counts equal the planned
  field; no overflow at 320, 390, 768 and 1024 px).
- A regression run over the competition-context, historical-era, home layout, standings, grouped, race, responsive, excluded and cancelled
  season specs: 421 passed.
- `cd backend && npm run build`, `npm run build` and `npm --prefix frontend run lint`: passed.
- Screenshots inspected: the note on `/2001/standings?phase=RS` at 1200 px (the 390 px text was read and the layout test passed).

Not run: the full suite, Neon/production checks, any verification of qualifying results (none are loaded), and the 34o items listed in
`34n-coverage-gaps.md` (event-derived statistics "unavailable" wording for E2000-E2006, effect of the scaled minimum games on older-season
rating records, Neon publisher compatibility).

## What 34o must still accept

- Every season's pages end to end against its format (the matrix in the 34a inventory), including the E2000-E2006 pre-event-data coverage and
  the records minimum for grouped seasons.
- The pipeline-owned gaps stay recorded as gaps: qualifying games, the E2000 replay, the E2021 snapshot alignment, and Neon publisher and
  row-volume compatibility.
