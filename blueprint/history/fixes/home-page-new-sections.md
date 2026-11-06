# Fix: Home page new sections

**Type:** Fix
**Status:** verified
**Branch:** fix/home-page-new-sections

## The problem

Home was only compacted in the last polish pass. Three of its sections add little:

- **Top performers** (`dashboard/LeadersPanel.jsx`) shows season per-game leaders, the same thing Overview's
  Statistical leaders and the Leaders page show. Home should be about *now*.
- **Point margin trend** (`dashboard/LeaderTrend.jsx`) follows one club (the leader) over its last 10 games, which
  says little about the league.
- **Upcoming games** lists the next 10 games with nothing to say which one matters most.

## The fix

Home only; shared components change only by an added export. No backend changes: every number comes from endpoints Home or other pages already use.

1. **Game of the round** — inside the Upcoming games panel, the next round's biggest game is shown as one larger
   featured card above the grid, labelled "Game of the round", with a short reason line (both clubs' positions and
   records, e.g. "2nd vs 4th · 9-2 vs 8-3"). That game is left out of the grid below, so it is not shown twice.
   - Picked from the scheduled games of the next round only (the round of the first upcoming game).
   - Rule: most combined wins; tie → smallest gap in wins; tie → earliest tip-off.
   - Shown only in a table stage (Regular Season, Top 16, grouped tables) and only once both clubs have played a
     game. In playoffs, the Final Four, round 1, or when standings fail to load, no featured card is shown and the panel
     looks as it does today.
2. **Hot right now** replaces Top performers — four cards (Points, Rebounds, Assists, PIR) in the existing leader card
   style (2×2 on phones, one row on wide screens). Each card shows the player with the best average over their last 5
   games and that average, plus their season average in smaller text, linking to the player page.
   - Data: the `/leaders/form` endpoint (`getLeaderForm`, `games: 5`, same query key as the Leaders page so the cache is
     shared), for the current stage (`useCurrentPhaseCode`, as Top performers uses now).
   - Only players who played all 5 of their recent games count, the same rule as the Leaders page's Hot right now.
   - When no game is scheduled (season finished or between stages), the title reads "Closing stretch" instead of "Hot
     right now", as on the Leaders page.
3. **Form board** replaces the leader's Point margin trend — every club of the summary table stage with its last 5
   results as win/loss dots, sorted by wins in those 5, then by table position. Each club links to its team page.
   - Data: `getPhaseResults` for the summary table stage (the request the Standings page already makes).
   - Reuses the Standings page's results ribbon by exporting `ResultsRibbon` from `standings/StreaksFormView.jsx`,
     without changing how it behaves there.
   - Phones: the first 8 clubs, then a "Show N more" button (as in Latest scores), with no horizontal swipe row.
   - Wide screens: Hot right now and Form board sit side by side under the KPI strip.

Stays the same: the header, the League table and Latest scores, and the KPI strip. `LeadersPanel.jsx`,
`LeaderTrend.jsx` and their skeletons are deleted if nothing else imports them. Every new section keeps the loading
skeleton, error with retry, and empty-state behaviour of the existing `WidgetPanel`, and works for grouped, cancelled
and historical seasons.

## Build steps

- [x] 1. **Game of the round** in `UpcomingGames.jsx`. Done when: E2026 Home shows one featured game above the grid, the grid
   no longer contains it, and a playoff or finished season shows no featured card.
- [x] 2. **Hot right now** replaces Top performers. Done when: four cards show the last-5 leaders with values that match the
   Leaders page's Hot right now for the same stat, and a finished season reads "Closing stretch".
- [x] 3. **Form board** replaces the margin trend, and the layout is updated. Done when: every club of the table shows 5 dots
   (fewer early in the season) in the stated order, phones show 8 plus "Show N more", wide screens show the two
   panels side by side, and `eslint` and `vite build` pass.

## Verify

- Open Home for E2026 at phone (390px), tablet (768px) and desktop (1280px) widths: no horizontal page scroll, no
  swipe rows, and every link goes to the right game, player or team.
- Open Home for a finished season, a grouped-table season and a cancelled season: no broken or empty panels.
- Browser tests (with `/api/health` reporting `"target":"local"`): `home-layout.spec.js`, `home-round-status.spec.js`,
  `responsive.spec.js`, and `home-form-chart.spec.js`, rewritten to cover the Form board instead of the deleted margin
  chart.

## Changes from the plan

- **Layout:** Hot right now and the Form board are stacked, not side by side. The spec also asked for Hot right now's
  four cards to sit in one row on wide screens, which a half-width column cannot hold. The Form board fills the width in
  2 columns from 640px and 3 from 1024px instead, read top to bottom.
- **Hot right now in a young stage:** when no player has 5 games in the current stage yet (the first playoff weeks, the
  Final Four), it shows the regular season's closing stretch instead of an empty panel. A finished season therefore
  shows the regular season's last 5 games.
- **Game of the round placement (owner feedback):** a separate banner above the grid left a wide empty strip on desktop.
  The game is now the first card of the Upcoming games grid instead, highlighted in the primary colour, with "Game of
  the round" in place of the round name and the reason line under the teams. `MatchCard` gained an opt-in
  `featuredReason` prop for this; Latest scores does not pass it.
- **Game of the round** only checks regular-season rounds in its browser test. Top 16 rounds use the same code path.

## Evidence

- `eslint` (src and the two changed specs) and the root `npm run build` pass.
- Playwright on the local DB: `home-layout`, `home-round-status`, `home-form-chart` and `responsive` specs pass (213
  tests), and the three Home specs pass again after the final fixes (50 tests).
- Screenshots reviewed: 2026 at 390px and 1280px, plus 2025 (finished), 2013 (grouped Top 16) and 2020 (cancelled) at
  1280px.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6408,"specSha256":"118c09d9e696d757ed9385cbcd3b2819a99446c369ae9d40caa36c614e0c608c","branch":"refs/heads/fix/home-page-new-sections","head":"68851d3509045707a48a81fe9cbd8db763830f9d","baseRef":"refs/heads/master","baseCommit":"68851d3509045707a48a81fe9cbd8db763830f9d","sourceTree":"5070355bc833a232b702d5246f2f5ff7e577e3bf","absentOptional":[]} -->
