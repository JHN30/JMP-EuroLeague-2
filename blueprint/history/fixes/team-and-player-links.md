# Fix: Team and player links

**Type:** Fix
**Status:** verified
**Branch:** fix/team-and-player-links

## The problem

Some places show a team or player as something to act on, but clicking it does nothing, while similar spots elsewhere
do link. The user reviewed an audit of every page and chose these:

| Where | Today | Wanted |
|---|---|---|
| Game page header (`frontend/src/games/MatchupHeader.jsx`) | Crests and names are plain | Each team's crest and name opens its team page |
| Team page, Quick comparison (`frontend/src/teams/TeamQuickCompare.jsx`) | Both club labels plain | Only the opponent's label opens its team page (we are already on the own team's page) |
| Team summary chips: Home (`frontend/src/dashboard/KpiStrip.jsx`), Standings (`frontend/src/standings/StandingsKpiStrip.jsx`), Season overview hero (`frontend/src/season/SeasonOverviewPage.jsx`) | Team chips plain, while the player-leader chips beside them already link (`kpi-chip-link`) | Every chip that names a team opens that team's page |
| Postseason series panel (`frontend/src/postseason/MatchupDetail.jsx`) | Every game row opens the game page | A played game still opens the game page; a game not played yet opens the Compare page for its two teams |
| Compare page, teams view (`frontend/src/comparisons/ComparisonsPage.jsx`) | No header naming the two clubs above the sections | One header under the "HEAD-TO-HEAD / Compare" page header, styled like the game page's matchup header, whose crests and names open each team's page |

Left as they are, per the user: play-by-play player names and team labels above stats on the game page (visual
information only), game cards (Games list, Home recent
results, which keep opening the game), the Standings game-shape cards, the postseason bracket and champion panel,
the Compare section column heads (Team stats, Trends, Overview scorers), charts, and anything already inside a
row or card link.

## The fix

- Links use the existing route shapes: `/${seasonCode}/teams/${clubCode}`, `/${seasonCode}/players/${personKey}`,
  and for Compare `/${seasonCode}/compare?view=teams&teamA=<local>&teamB=<road>&game=<gameCode>` (the parameters
  the page already reads; Team A is the home club, as when a game is picked on Compare).
- `CompactMetric` (`frontend/src/lib/CompactMetric.jsx`) gets an opt-in `to` prop: with it the chip renders as a
  `Link` with the existing `kpi-chip kpi-chip-link` classes; without it nothing changes. A chip whose team is
  unknown (no club code) stays plain.
- The Compare header is one small component in `frontend/src/comparisons/` used only in the teams view, reading
  the crests and names the page already loads for the two clubs (no new request or endpoint). It mirrors the game
  header's look: crest over or beside the name, TV code on phones, full name from `sm`.
- Links keep the surrounding text style plus the repository's hover treatment (`hover:text-primary` or
  `link-hover`, as nearby links do); the visible layout does not move.

No backend change. No new dependency.

## Build steps

- [x] **1. Game page header.** Link both sides' crest and name in `MatchupHeader.jsx` to their team pages.
  **Done when:** on `/E2025/games/100` the header crests and names open the two team pages;
  `game-matchup-header.spec.js` passes, with a test for the new links.

- [x] **2. Team page and summary chips.** Opponent label in Quick comparison links to its team page (own label
  stays plain). `CompactMetric` gains the opt-in `to`; the four Home team chips, the five Standings team chips and
  the two Season overview team chips pass their team's page.
  **Done when:** each of those chips and the opponent label opens the right team page; `team-overview-layout.spec.js`,
  `home-layout.spec.js`, the Standings and Season overview specs that cover the chips, and `responsive.spec.js` pass,
  with tests for the new links.

- [x] **3. Postseason series panel.** In `MatchupDetail.jsx`, a game row with no final score links to the Compare
  page for its two clubs (home as Team A, with `game=`); played rows keep opening the game page.
  **Done when:** an unplayed series game opens Compare with both clubs selected and a played one opens its game page;
  `postseason.spec.js` and `postseason-layout.spec.js` pass, with a test for the unplayed-row link.

- [x] **4. Compare page header.** Add the two-club header to the teams view, under the page header and above the
  section tabs, linking each club to its team page.
  **Done when:** `/E2025/compare?view=teams&teamA=OLY&teamB=PAN` shows both crests and names in a header and each
  opens its team page, on every team section (Overview, Statistics, Rosters, Trends); `compare.spec.js`,
  `compare-team-layout.spec.js` and `compare-layout.spec.js` pass, with a test for the header links; no horizontal
  scroll at 390px.

## Result

- Lint and root build pass. On the local target: `game-matchup-header` (9), Home / Season overview / Standings /
  team overview layout specs (71), postseason specs (23), Compare specs (15 of 16) and grouped, head-to-head and
  responsive specs (229 of 233) pass, with new tests for every new link.
- Two existing failures, unchanged by this fix (both reproduced on `master` with this branch's changes stashed):
  `compare.spec.js` "Compare opens on the games of a round..." logs a React duplicate-key warning for player
  `005942` in the 2026 Compare rosters; `grouped-pages.spec.js` "team Leaders and Compare say adjusted ratings are
  unavailable across groups" (2012-2015) still finds "Simple rating" on team Leaders. Both are candidates for
  separate `/fix` work.
- Screenshots of `/2025/compare?view=teams&teamA=OLY&teamB=PAN` at 1400px and 390px: header with both crests and
  names (TV codes on phones), links `/2025/teams/OLY` and `/2025/teams/PAN`, no horizontal scroll.

- Revision (user request): the club header and the "HEAD-TO-HEAD / Compare" page header are one panel. With both clubs
  known, `TeamPairHeader` replaces `PageHeader`: clubs either side, the kicker over "vs" in the middle, the game
  context (round, date, host) and its buttons centred underneath (`ComparisonContext` gains `centred`), and a
  visually hidden `h1` "Compare <club> and <club>". The picker and the players view keep the old page header. Long
  names break anywhere if they must (`wrap-anywhere`), so a 60-letter name stays inside the panel at 320px.
  Compare, filter, titles and responsive specs: 183 passed, 1 failed (the existing duplicate-key test above).
  Screenshots of `/2026/compare?view=teams&teamA=DUB&teamB=PRS&game=72` at 1400px and 390px: one panel, no
  horizontal scroll.

## Verify

- `/api/health` reports `"target":"local"` before any browser run; root `npm run build` and `cd frontend && npm run lint`
  pass.
- Click through: the game header on `/E2025/games/100`; the opponent in a team page's Quick
  comparison; a team chip on Home, Standings and the Season overview; an unplayed and a played game in a postseason
  series panel; the club names in the Compare header.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7040,"specSha256":"e09e486bf30db88ce00669b6ba2ae77372ec86392fe8c81b2bfb97030c6fb5e6","branch":"refs/heads/fix/team-and-player-links","head":"12b71b499c1674da6b31450f5e37fc5ddd38870b","baseRef":"refs/heads/master","baseCommit":"12b71b499c1674da6b31450f5e37fc5ddd38870b","sourceTree":"0ac1fc5dff4d84a6b0ad35b36aaa5fd8b0566627","absentOptional":[]} -->
