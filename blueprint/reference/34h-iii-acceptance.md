# Feature 34h-iii: Groups throughout the app

## Audit (step 1)

Collected on 2026-10-14 from the existing local API (`/api/health` reported
`target: local`) and a read of the page code. No database write, pipeline
command, Neon access or real `.env` read was involved. Observed identically in
E2012-E2015 unless noted.

Data facts the fixes rely on:

- Standings rows carry `groupName` as the bare name ("A"); game rows carry it as
  "Group D". RS games are labelled by RS group; Top 16 games by their TS group.
- Advanced standings for scope `RS` and `TS` return `connected: false` and
  `srs`/`sos`/`adj*` as null in all four seasons. Scope `PS` is connected with
  values. Raw per-100 ratings are present in every scope.
- RS has 24 clubs, 10 rounds; TS 16 clubs, 14 rounds.

| Page / area | Observed behavior in grouped seasons | Fix needed | File |
| --- | --- | --- | --- |
| Home standings snapshot | One flat "League table" of 24 clubs; positions 1-6 repeat four times | yes | `dashboard/StandingsSnapshot.jsx` |
| Home KPI "Leader in wins" | Picks the first club with position 1, i.e. one of four group leaders, presented as the league leader | yes | `dashboard/KpiStrip.jsx` |
| Home leader trend | Title and data follow that arbitrary position-1 club | yes | `dashboard/LeaderTrend.jsx` |
| Home / Overview source stage | Always RS, even after Top 16 was played | yes (grouped seasons only) | dashboard files, `season/SeasonOverviewPage.jsx` |
| Overview hero "League leader" | Same position-1 assumption | yes | `season/SeasonOverviewPage.jsx` |
| Overview stage timeline and descriptions | Built from the format registry; correct (groups of six, top four, Top 16) | no | - |
| Home round status | Counts games of the round across all groups; correct | no | - |
| Games: group label | Group is not shown anywhere on game cards | yes | `games/GameCard.jsx`, `FixturesPage.jsx` |
| Games: group filter | None | yes | `games/FixturesPage.jsx` |
| Games: club records | Shown for RS only, never for Top 16 | yes | `games/FixturesPage.jsx` |
| Game header position | RS-only league position bracket with no group | yes | `games/MatchupHeader.jsx` |
| Team snapshot "League position" | Reads "2nd of 24" from the group-local position | yes | `teams/TeamPage.jsx` |
| Team quick comparison | "League leader" is the position-1 club of another group | yes | `teams/TeamQuickCompare.jsx` |
| Team league profile | Ranks 24 clubs on raw per-100 numbers without saying the groups played different schedules | yes (note) | `teams/TeamLeagueProfile.jsx` |
| Leaders (players, phase tabs) | Phase tabs come from the real phases (RS, TS, PO, FF); correct | no | - |
| Leaders (teams) | SRS silently missing for RS/TS; no reason given | yes (note) | `leaders/TeamsLeaders.jsx` |
| Compare (teams) | Places among all clubs on raw numbers; SRS silently missing | yes (note) | `comparisons/CompareTeamStats.jsx` |
| Players, player page, Records, Head to head | Season/phase-scoped and cohort-independent; no group assumption found | no | - |
| EuroCup drop-down games | Not present in the four seasons' phases | no | - |
| Event-derived data (lineups, shots, play-by-play) | Present for these seasons per the inventory; coverage states already exist | no | - |

## Results

Verified on 2026-10-14 against the local database (`/api/health` reported
`target: local`). No Neon, pipeline, database write or deployment was involved.

Changes: Home (group tables under labelled groups from the Top 16 once it has
games, "Most wins · any group" instead of a league leader, trend follows that
club), Overview (same hero rule, Top 16 no longer drawn as postseason on the
scoring chart, group on highlight games), Games (group filter in the `group`
URL parameter, dropped when invalid or on phase change; group label on RS/Top 16
cards; Top 16 records), game header (group-local position), team page ("1st in
Group D" instead of "of 24"; group leader in the quick comparison), and the
unavailable-adjusted-rating note on the team profile, team Leaders, and team
Compare Overview and Statistics (shown only when the source reports
`connected: false`). Modern single-table seasons keep their previous wording.

Checks run:
- `npx playwright test grouped-pages.spec.js`: 35 passed (E2012-E2015 on Home,
  Overview, Games, game header, team page, Leaders, Compare, no EuroCup games;
  modern regression; 320/390/768/1024 layouts).
- Regression run of home, overview, games, matchup header, leaders, compare,
  head-to-head, grouped standings/postseason, competition context, cancelled and
  excluded season, historical era, season status, team and responsive specs:
  345 passed, 2 failed (`competition-context.spec.js:142` dark-euroleague and
  `excluded-season.spec.js:115`). Both passed when rerun alone (3 passed); the
  failures looked like timeouts under the 347-test load, not a code defect.
- `npm run build` and `npm --prefix frontend run lint`: passed.

Follow-up fix after review: Overview's "Road to the title" treated the Top 16
as a knockout stage, so its single group name produced a false "7-5 series"
and inflated the postseason record. It now counts Playoffs and Final Four only;
`grouped-pages.spec.js` checks three steps and no series above five games for
all four seasons. Build, lint, `grouped-pages.spec.js` and `overview-layout.spec.js`
passed again afterwards.

Not run: the full suite, Neon/production checks, and visual inspection of
screenshots. Head to head, Players, Records and the player pages had no group
assumption and were not changed.
