# Fix: Team Statistics tab with every stat, grouped

**Type:** Fix
**Status:** verified
**Branch:** fix/team-statistics-tab-with-every-stat-grouped

## The problem

The team page's Statistics tab (`/:season/teams/:clubCode`, Statistics) shows 19 numbers in three groups (Traditional,
Shooting, Advanced): per-game averages with the club on the left, its opponents on the right, and the club's league rank.
Much of what the database holds for a club is missing:

- **Box score** (`app_team_season_stats`, own and opponent totals per phase): made and attempted field goals, 2PT, 3PT
  and free throws (only the three percentages show), field goal %, fouls drawn, and shots blocked by the opponent.
- **Rates from the box score:** 3-point attempt rate, the share of points from 2s, 3s and free throws, and the assist
  ratio.
- **Scoring context** (`app_game_team_shot_splits`, one row per club per played game, both sides): fast-break,
  second-chance and points-off-turnover points, and assisted field goal %. None of it is on the team page's Statistics.

## Boundary with the Advanced tab

Statistics holds the per-game box score and every rate worked out from it, always the club against its opponents with
the club's league rank. Per-100-possession ratings, pace, the four-factor ratings, schedule strength, splits, clutch,
lineups and player impact stay on the Advanced tab (reworked in a later fix). eFG%, TS%, the rebound percentages and
the free throw rate stay here as they are today, since they come straight from the box score.

## The fix

### Backend

`getTeamStatsSummary` and `getLeagueTeamStats` (`backend/src/db/season-games.ts`) add the scoring-context totals for
the club and for its opponents in the phase, summed from `app_game_team_shot_splits` over the phase's played games (the
club's own side for `own`, the other side of the same games for `opponent`): fast-break points, second-chance points,
points off turnovers, field goals made, assisted field goals, the number of games that have a split row
(`splitGames`) and the number of those that recorded the fast-break, second-chance and off-turnover points
(`contextGames`). The new fields sit beside the existing totals in `own` and `opponent` as nullable numbers (null when
no game has a split). Same routes, same phase validation; no new endpoint, table or migration.

Coverage found during implement (local database, regular season): split rows exist from E2007; the three point
columns are recorded in every game from E2016, in about half the games in E2015, and in a single game for two clubs in
each of E2008 and E2013.

### Groups and rows

Every row keeps today's form: name (with a tip where the name needs one), the club's rank, the club's per-game value,
the two half bars, the opponents' value. Per-game counts divide by games played; the fast-break, second-chance and
off-turnover points divide by `contextGames`.

| Group | Rows |
|---|---|
| Scoring | Points; Field goals made, attempted, FG %; 2PT made, attempted, 2PT %; 3PT made, attempted, 3PT %; Free throws made, attempted, FT % |
| Rebounding | Rebounds; Off. rebounds; Def. rebounds; Off. rebound %; Def. rebound % |
| Playmaking | Assists; Turnovers (fewest ranks first); Assist/turnover; Assist ratio (assists per 100 plays ending in a shot, free throws or turnover); Assisted FG % |
| Defense and fouls | Steals; Blocks; Shots blocked (the club's shots the opponent blocked; fewest ranks first); Fouls committed (fewest first); Fouls drawn |
| Efficiency | eFG %; True shooting %; Free throw rate; 3PT attempt rate (share of field goal attempts that are threes); Points from 2s, from 3s and from free throws (shares of points) |
| Scoring context | Fast-break points; Second-chance points; Points off turnovers; PIR |

- **Style rows** (3PT attempt rate and the three point shares) have no better or worse direction: their rank orders
  the most first and is shown without the green or red colour.
- **Missing context:** when the club has no split rows in the phase, the four rows from shot splits (fast break,
  second chance, points off turnovers, assisted FG %) are left out rather than shown as dashes; PIR stays. The three
  point rows count only when the club has them in at least half its split games (so E2015 shows them and the stray
  single games of E2008 and E2013 do not); when they cover only part of the games, the footnote says how many. A club
  whose own value is missing gets no rank on that row, as today.
- **Layout:** from `xl` the groups sit in two columns: Scoring and Efficiency on the left (all the shooting numbers
  together), Rebounding, Playmaking, Defense and fouls and Scoring context on the right. Requested after the first
  review: Scoring and Rebounding on the left left a ~270px empty stretch under the left column; with this split the
  columns end within about one row of each other (59px at 1440px). Below `xl` one column, left column first. The stat name column widens
  from 8rem to 10.5rem from `lg`, so no name wraps from 1024px (between 640 and 1023px it stays 8rem, so the club's name
  over the bars is not cut). The phone layout of a row (name over the numbers, rank at the left) and the footnote stay;
  the footnote adds that style rows rank the most first without a colour.
- The skeleton (`TeamStatisticsSkeleton`) mirrors the two columns.

Must not change: the phone row layout, the league-rank loading behaviour (numbers and bars show before ranks arrive),
the forfeit note, the empty and failing states, the Overview (which reads the same summary), and other pages that read
`/team-stats` (they only gain fields).

## Build steps

- [x] 1. **Scoring-context totals.** Extend both queries in `season-games.ts` and their types with the shot-split
  totals for own and opponent per phase.
  Done when: `npm run build` passes and `/api/seasons/E2025/teams/<club>/team-stats?phase=RS` and
  `/api/seasons/E2025/team-stats?phase=RS` return the new fields with values, and an E2015 club returns them as null.
- [x] 2. **Groups and rows.** Rework `teamStatDefs.js` into the six groups with the new rows, the style-row ranking, and
  the shot-split rows left out without data; two balanced columns from `xl` in `TeamStatisticsSection.jsx`; the
  skeleton.
  Done when: lint passes and at 1440px the tab shows all six groups in two columns with ranks on every ranked row.
- [x] 3. **Browser checks.** Update `team-statistics-roster-layout.spec.js`: the six group headings, rows from each new
  group, style rows without rank colour, shot-split rows absent when the summary has no split totals (mocked), two
  columns from 1280px and one below, and the existing phone-row and state checks.
  Done when: that spec plus `responsive.spec.js` pass against the local database.

## Verify

- `npm run build` (root) and `cd frontend && npm run lint` pass.
- `team-statistics-roster-layout.spec.js` and `responsive.spec.js`, after `/api/health` reports `"target":"local"`.
- By hand at 1440px: open a club's Statistics tab in a recent season. Six groups, Scoring and Efficiency on the left,
  every row with the club, the opponents and a rank; fast-break and second-chance rows have values. In an older season
  (before 2016-17) the shot-split rows are absent and the rest is unchanged. At 390px each row is the name over the
  numbers, as today.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7332,"specSha256":"d39579afedacf089c0d7ba24adc3d80159530ecd2abfc286d55e3c41e6a3b37a","branch":"refs/heads/fix/team-statistics-tab-with-every-stat-grouped","head":"a8c1104bf9969b4c795748953ca4f2392db449c3","baseRef":"refs/heads/master","baseCommit":"a8c1104bf9969b4c795748953ca4f2392db449c3","sourceTree":"415b840dc0f8e4151aad5b2c5735daa1938c15e8","absentOptional":[]} -->
