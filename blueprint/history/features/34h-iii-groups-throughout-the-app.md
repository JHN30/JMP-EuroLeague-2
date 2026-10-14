# Feature: Groups throughout the app

**From build-plan:** feature 34h-iii
**Build attempt:** 1
**Status:** verified
**Branch:** feature/groups-throughout-the-app

## Goal

Make every remaining page correct for the grouped E2012-E2015 seasons. A club's
standing, a game's label, a phase summary, a statistic or a comparison must name
the stage and group it belongs to, never imply one league table or a global
seed. Modern single-table seasons and the seasons already finished in 34c-34g
must not change.

## In scope

- **Audit first.** For E2012-E2015, walk Home, Overview, Games, Game detail,
  Teams, Team page, Players, Player page, Leaders, Compare, Records and Head to
  head. Record in `blueprint/reference/34h-iii-acceptance.md` every place that
  assumes one table (a league leader, a global rank, "position N of 18/20", a
  cutoff line, a round count) or a wrong cohort, with the page, season and
  observed value. Fix only what the audit finds; leave correct pages untouched.
- **Home.** Standings snapshot, KPI strip, round status and next/recent games
  use the current stage. In RS and Top 16 they show group-local positions and
  leaders under labelled group headings (reuse `standingsGroups.js`), with no
  single league leader or overall cutoff. Round status counts the stage's own
  rounds (10 RS, 14 Top 16), not a season-wide total.
- **Overview timelines.** Stage timeline and descriptions come from the format
  registry (four groups of six, two groups of eight, top four per group,
  best-of-five quarterfinals, Final Four). Champion/runner-up and the series
  summary follow the recorded path already verified in 34h-ii. No Play-In row
  or global seed.
- **Fixtures and game labels.** Games shows the group on RS and Top 16 games
  (for example "Group A · Round 3"), with an accessible group filter, shared in
  the URL as `group` beside `phase` and `round`; absence means all groups.
  Reset an invalid group on phase or season change. Fixture rows show the
  group-local position of each club instead of a league rank. Game cards,
  detail headers and team game lists use the same label; Top 16 and Final Four
  game labels never reuse regular-season wording.
- **Team page.** Standing labels read "Group A · 2nd" (or "Group E · 3rd" in the
  Top 16 phase), with the phase's own record. Season-level league comparisons
  (ranks among all clubs) are shown only as cohort-labelled values or marked
  unavailable; they are never a combined group ranking.
- **Players and Leaders.** Phase filters offer the real stages (RS, Top 16 `TS`,
  Playoffs, Final Four) and only scopes the app can serve. Leaders and player
  tables state their cohort ("all 24 clubs, regular season"). Qualification
  minimums (games played) use the stage's own game count, not the season total.
- **Compare and Head to head.** Team and player comparisons accept clubs from
  different groups, label each club's group, and state that cross-group
  opponent-adjusted ratings are unavailable (see below). Head to head shows
  only meetings that actually exist; two clubs from different RS groups may
  first meet in Top 16 or the Playoffs.
- **Unavailable data, said honestly.**
  - Opponent-adjusted ratings (adjusted net rating, SRS) are unavailable for
    clubs in a disconnected group stage (`connected = false` in the inventory).
    Show a short explanation where the value would appear, not a number, a
    blank or a zero. Raw per-100 ratings remain available.
  - Event-derived data (lineups, on/off, RAPM, shot zones, play-by-play, score
    flow) that the inventory records as missing before E2007 is not applicable
    to E2012-E2015 if the audit shows it exists. Where it is genuinely absent
    for a game, show the existing coverage state; never an empty chart.
- **Archive views** (Records, career and history views that include the four
  seasons) label grouped-season entries by stage and exclude nothing silently.
- **EuroCup drop-down games** stay outside this app; verify none appear in
  these seasons' fixtures, standings, statistics or Records.
- Verify all four seasons, plus modern regressions and phone, tablet and
  desktop layouts for every touched page.

## Out of scope

Four-group Top 16 and best-of-five eras (34i) and older seasons; qualifying
games; the Standings and Postseason pages (done in 34h-i and 34h-ii); new
formulas, rating engines, tiebreaker reconstruction or global rankings across
groups; schema, data or pipeline writes; new dependencies; Neon import, push
and deployment. A new API endpoint or response field only if the audit proves a
page cannot be correct from the existing responses; in that case stop and
propose it for review instead of adding it silently.

## Build loop

Approve this spec before `/implement`. Build the steps, then present one final
review packet (`stepReview: feature`); checkpoint commits are disabled.
`/complete` creates the final feature commit. Regular audit, Check and
try-guide gates are manual; independent review runs automatically if the work
proves sensitive or unusually broad. If the audit step finds the work too large
for one branch, stop and propose splitting this leaf before building further.

Archive path `blueprint/history/features/34h-iii-groups-throughout-the-app.md`
is frozen for attempt 1. No prior matching feature record or Git use of that path
was found, the archive leaf is absent, and the branch name is valid with no
existing or conflicting local ref. No branch is created by this command.

## Build steps

1. [x] **Audit the grouped seasons across pages.** Using the local API and the
   running local app (`/api/health` must report `"target":"local"`), inspect the
   pages listed above for E2012-E2015 and write the findings table to
   `blueprint/reference/34h-iii-acceptance.md`: page, season, observed
   behavior, correct behavior, fix needed (yes/no). Include the cross-group
   adjusted-rating and event-data observations.
   **Done when:** every page in scope has a row for each season and each "fix
   needed" row names the file to change. No source change is made in this step.
2. [x] **Shared group labelling helpers.** Extend the existing group helpers
   (`standingsGroups.js`, `seasonFormat.js`) with one function that builds a
   "Group A · 2nd" label and one that states the cohort of a stage, reused by
   the later steps. Add focused logic cases only if a unit test command exists;
   otherwise cover them through the browser specs below.
   **Done when:** modern single-table seasons produce no group label, and the
   helpers return a label only from observed group names (no synthetic group).
3. [x] **Home and Overview.** Apply the Home and Overview fixes from the audit.
   **Done when:** for each of the four seasons Home shows group-local standings
   under labelled groups with no single league leader, round status uses the
   stage's own round count, and Overview's timeline matches the registry;
   `home-layout`, `home-round-status`, `overview-layout` specs still pass.
4. [x] **Games, game labels and Team page.** Add the group filter and labels,
   group-local fixture positions, and team standing labels.
   **Done when:** the `group` URL parameter filters Games, resets on phase or
   season change, and team and game pages show the group label in RS and Top 16;
   `games-layout` and the touched team specs pass.
5. [x] **Players, Leaders, Compare, Head to head, Records.** Apply stage
   filters, cohort statements, minimum-games basis, cross-group labels and the
   unavailable adjusted-rating explanation.
   **Done when:** a cross-group comparison shows each club's group and the
   unavailable-rating note instead of a number, and Leaders states its cohort;
   `leaders`, `compare`, `head-to-head` and `records` specs still pass.
6. [x] **Grouped-pages browser spec and acceptance.** Add `grouped-pages.spec.js`
   covering all four seasons on the changed pages, the modern regression, and
   the phone/tablet/desktop layouts; confirm no EuroCup drop-down games appear.
   Update the acceptance report with the final results.
   **Done when:** the new spec plus the pages' own specs and `responsive.spec.js`
   pass against the local database, `npm run build` and `npm --prefix frontend
   run lint` pass, and the report records what was run and what was not.

## Files / areas

Evidence-based starting points; the audit finalises the list:
`frontend/src/standings/standingsGroups.js`, `frontend/src/lib/seasonFormat.js`,
`frontend/src/dashboard/` (StandingsSnapshot, KpiStrip, roundStatus),
`frontend/src/season/SeasonOverviewPage.jsx`, `frontend/src/games/`
(FixturesPage, GameCard, MatchupHeader), `frontend/src/teams/`
(TeamPage, TeamLeagueProfile, teamLeague.js), `frontend/src/leaders/`,
`frontend/src/comparisons/`, `frontend/e2e/`, `blueprint/reference/`.

## Data / contracts

Uses existing endpoints only: season format, phases, rounds, standings and
snapshots, games, team and player statistics. Group identity comes from the
observed `groupName`. The `group` URL parameter holds that exact name, encoded
through URLSearchParams, and absence means all groups, as on Standings. Group
positions are group-local ranks and are never merged into a league rank. No
persisted-data change.

## Testing

No unit test command exists. Behavior is covered with Playwright specs run by
file name (the touched pages' own specs, the new grouped-pages spec and
`responsive.spec.js`), only after `/api/health` reports `"target":"local"`.
The full suite is not run unless shared components, routing, the API client or
global CSS change. Build and frontend lint run at the end. No Neon, live or
production evidence will be claimed.

## Notes for the AI

- Apply changes to the page being fixed; shared components get opt-in props.
- Prefer the TV code as the short club label.
- Never open the real `.env`.
- Reuse the 34h-i and 34h-ii group helpers; do not add a ranking engine.
- A value the data cannot support stays unavailable with a reason.

## Open questions

None blocking. Two choices to confirm at review: (1) this leaf is broad, and I
kept it as one branch with an audit-first step, splitting it if the audit shows
it is too large; (2) the Games group filter defaults to all groups, as
Standings does, rather than selecting the first group.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10297,"specSha256":"e0e4c7259baad946e4d1f38aa44b7fa62bfd45436cf4f4bfdf90b30f46c26d07","branch":"refs/heads/feature/groups-throughout-the-app","head":"6994d9248fd4c3eac79e0746b1a3f746039d90ba","baseRef":"refs/heads/master","baseCommit":"6994d9248fd4c3eac79e0746b1a3f746039d90ba","sourceTree":"6a9dbfbcb78d756926ea465b2a5ca4aaa1b37ae1","absentOptional":[]} -->
