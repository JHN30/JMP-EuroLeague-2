# Fix: Data audit of Home, Season overview, Standings and Games

**Type:** Fix (data correctness)
**Status:** verified (awaiting the owner's review)
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's request, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## What was checked

For all four seasons (`E2023` to `E2026`): the standings against the game results and the team totals, the advanced standings
for internal consistency, the games by phase and status, the leaders, the champion, and every page and view (Home, Overview,
Standings with its Race and Advanced views and breakdowns, Games for each phase, and a game detail page with all seven tabs)
for failed requests, errors and broken values (`NaN`, `undefined`). Everything loads without errors, and the advanced
standings are consistent (league offensive and defensive ratings average the same, net rating is exactly the difference,
SRS averages zero, no non-numeric values in any season).

## What was wrong, and what changed

- **The official standings count regulation time only.** Their points for and against leave out overtime (Real Madrid
  2023-24: standings 2,924, game results 2,999, the 75 extra points came in three overtime games), so in the three finished
  seasons they differ from the game scores and from `app_team_season_stats`. Three places divided those points by games:
  - Home "Best offense" and "Best defense" named the wrong club in two seasons (2023-24: Telekom 87.3 where the true leader
    is Real Madrid 88.2; 2025-26: Paris 90.1 where it is Valencia 90.9). They now read the league team totals
    (`league-team-stats`, shared cache key with the Team Statistics tab).
  - The Season overview hero's "Points per game" for the league leader reads the same totals.
  - The Team Overview snapshot (points scored and allowed per game and the difference) read the standings and disagreed with
    the Statistics tab for any club with overtime games; it now reads the team totals.
  - The Standings table keeps the official PF, PA and DIFF, and a note under the table says they count regulation time only.
- **Games page records:** every card showed the club's end-of-season record, even on round 5 of a finished season. An
  as-of-the-round record (2-3 on round 5) was tried and dropped on review: it surprises people (a "1-0" on round 1 in the
  middle of a season looks wrong), the league's own site and the NBA show the season record whatever the round, and the
  round-by-round story is on the Standings race view. The cards keep the season record, with a line above the games saying
  whether it is the final regular-season record (season over) or the record so far; playoff rounds show none.
- **Standings, knockout phases:** the Play-In, Playoffs and Final Four tabs said "Standings not available yet for this
  phase" even for a finished season. They are knockouts and never have a league table; the message now says so and links to
  the Format page (regular season keeps the original wording).

## Verify

- `eslint` and `vite build` pass; the full browser suite passes.
- Home KPIs against the team totals in all four seasons; the Games records on rounds 5 and 34 of 2024-25 and on two rounds of
  2026-27; Madrid's snapshot (88.2 scored, 80.7 allowed) equals the Statistics tab; the Standings note and the Format link.

## Known gaps

- Removed as unused, after a second search of the code, the tests and git history (the Home dashboard was the only page that ever
  rendered the first three, and dropped them in feature 20): `dashboard/Spotlight.jsx`, `FormWatch.jsx` and `SeasonCoverage.jsx`, and
  with them `lib/DataCoveragePanel.jsx`, the `getCoverage` API call and the `.coverage-*` and `.spotlight-*` styles in `index.css`.
  The API's `/coverage` endpoint and the coverage tables are untouched.
- The Standings table's PF, PA and DIFF stay regulation-only because they are the official figures (and the official order
  depends on them); only the note explains it.
