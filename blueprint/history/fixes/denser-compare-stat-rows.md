# Fix: Denser Compare stat rows

**Type:** Fix
**Status:** verified
**Branch:** fix/denser-compare-stat-rows

## The problem

On the Compare page ([ComparisonRow.jsx](../../frontend/src/lib/ComparisonRow.jsx), used by the players and
teams Overview, Statistics, Rosters and Advanced views) each stat is a tall block: label, padded value, bar,
then the rank ("3rd of 223") on its own line, with generous padding and a wide gap between the two sides. About
three stats fit on a desktop screen, so comparing a whole stat sheet means a lot of scrolling.

## The fix

Add an opt-in `dense` prop to `ComparisonRow` and turn it on only for the Compare page's rows (the shared row
is also used on the game page, team Overview and quick compare, which stay as they are):

- the rank / average text (`avgA`/`avgB`) sits on the same line as the value, on the side away from the centre
  (value stays next to the label), in the muted small style, instead of on a line below the bar
- tighter row padding, label margin, side padding and the gap between the two sides; the bar stays as thin as now
- the better side's highlight, "Lower is better" note, hover tip, ticks and the 320px layout are unchanged

Every row also gets a hover tip, so none is missing: the rows whose definitions had no tip (most team and player
basics, W/L, the scoring shares, the roster summary, home/away record, and the four form averages on the player
Overview) take it from a small map in `comparisons/statTips.js`. A row's own tip still wins. A multi-column layout
was tried and dropped: the rows stay one per line.

The two notes that said "Under each bar" (Statistics, Advanced) now say "Beside each value".

No change to what is shown, only its density. The rank text must stay readable and inside its half at 320px.

Must not break: other users of `ComparisonRow` (game Overview, Four Factors, scoring profile, team quick
compare, player advanced section), and the sideA/sideB tags below sm.

## Build steps

- [x] 1. Add `dense` to `ComparisonRow` and pass it from the Compare views (`ComparePlayerOverview`,
  `CompareTeamStats`, `CompareRosters`, `ComparePlayerAdvanced`, `CompareTeamOverview`, and the row in
  `ComparisonsPage`).
  **Done when:** a Compare stat row is about half as tall on desktop with the rank on the value's line; rows on
  the game page and team page are unchanged; no horizontal overflow at 320px.

- [x] 2. Give every Compare stat row a hover tip.
  **Done when:** on team and player Overview, Statistics, Advanced and Rosters every stat row's name has a hover
  tip (a test checks it).

## Verify

Evidence: `npm run lint`, `npm run build`, and 190 Playwright tests (compare, compare-layout, compare-player-layout,
compare-team-layout, responsive, game-overview) passed on the local DB, including two new "every statistic row has a
hover tip" tests. Screenshots of team Statistics (before the layout was reverted to one column) showed a row going from
about 118px to about 77px with the rank beside the value and no overflow. The phone tip test now parks the pointer in a
corner, and one test now matches the W/L label by prefix because the label carries its tip text.

- Local DB (`/api/health` target `local`): open Compare for two players and two teams, on desktop and at 320px;
  rows are denser, nothing clipped. Open a played game's Overview: key stats look as before.
- `cd frontend && npm run lint`, then `npx playwright test compare-layout.spec.js compare-player-layout.spec.js
  responsive.spec.js` (plus the game Overview specs to confirm they are untouched).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3571,"specSha256":"981aba3a71e05309613ffed64e0ed9b815f92994f27c61197728b6e9ca77f152","branch":"refs/heads/fix/denser-compare-stat-rows","head":"ee69961e514320646505e2c2e6901b10c525859a","baseRef":"refs/heads/master","baseCommit":"ee69961e514320646505e2c2e6901b10c525859a","sourceTree":"81dd85e4fd392b77cc93eb65fde06f0c6abb08ff","absentOptional":[]} -->
