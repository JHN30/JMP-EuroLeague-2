# Fix: Overview points per game shows the top-scoring team

**Type:** Fix
**Status:** verified
**Branch:** fix/overview-points-per-game-shows-top-scoring-team

## The problem

On the season overview, the second hero card is labelled "Points per game" but shows the
**league leader's** scoring average, not the team that scores the most
(`frontend/src/season/SeasonOverviewPage.jsx`, `SeasonHero` and `leaderPointsPerGame`). Read on
its own, the label suggests a leaderboard, so a club at the top of the table (Panathinaikos now)
looks like the best offense even when another club averages more.

## The fix

- Pick the club with the highest points per game from the league team totals the page already
  loads (`getLeagueTeamStats(seasonCode, tablePhaseCode)`): own points (overtime counted) divided
  by games played, over clubs that have a row in `tableStandings` and at least one game. On a tie,
  keep the first club, as the home page's "Best offense" card does
  (`frontend/src/dashboard/KpiStrip.jsx`).
- The card shows that club's name, crest (from its standings row), and average, and opens that
  club's page. The first card stays on the league leader, or the most wins in any group for a
  grouped table.
- Rename the label to "Most points per game" so it reads as a ranking.
- Each card gets its own link: the leader card opens the leader's page, the scoring card opens the
  top scorer's page. The two may be the same club.
- While the team totals are loading or failed, the scoring card shows "-" for its value, as it does
  now. Its name and crest fall back to the leader's only if no top scorer can be found.
- Must not break: the hero's status variants (cancelled, finished, not started), the side-by-side
  layout and crest sizes, grouped-season labels, and the player "Points per game" leader card
  lower on the page.
- No new query, endpoint, or shared component. Change only the overview page.

## Build steps

- [x] 1. **Top-scoring club in the overview hero.** Compute the top-scoring club in
   `SeasonOverviewPage`, pass it to `SeasonHero`, and render the second card from it with its own
   link and the "Most points per game" label. Update the overview-layout spec
   "both hero cards open the leading team's page": the first card links to the leader's page, and
   the second links to the page of the club with the highest own points per game in the league
   team stats API for that phase. Rename the test to match.
   *Done when:* the overview's second card names the club with the highest points per game for
   the season's table phase, and its value and link match that club. The spec covers this.

## Verify

- Open `/overview` for the live season. The "Most points per game" card should name the club
  with the highest points per game on the Leaders page (teams, same phase). Its value should match
  that club's own points divided by games played, and clicking it should open that club's page.
- The first card still shows the league leader and its record.
- Browser tests (only after `/api/health` reports `"target":"local"`):
  `cd frontend && npx playwright test overview-layout.spec.js grouped-pages.spec.js`


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3150,"specSha256":"0392c534aa72257f5242c32ff54ebd5646ed08ae6ce57592bacd51606c2b970e","branch":"refs/heads/fix/overview-points-per-game-shows-top-scoring-team","head":"fd66f22e02bf0bfc3547f93453a9d7bc929207e8","baseRef":"refs/heads/master","baseCommit":"fd66f22e02bf0bfc3547f93453a9d7bc929207e8","sourceTree":"be3e77a3f2823399453e44b203b3beec43a9f620","absentOptional":[]} -->
