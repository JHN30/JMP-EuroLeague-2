# Fix: Team page tabs follow the stage tabs

**Type:** Fix
**Status:** verified
**Branch:** fix/team-games-follow-the-phase-tabs

The branch name was frozen before the scope grew to cover every stage-driven tab on the team page. The title and branch name use "stage" and "phase" for the same thing. That's fine, since the archive name comes from this file.

## The problem

**Games ignores the stage.** On the team page, `TeamPage` passes the selected phase to every tab except Games ([TeamPage.jsx](../../frontend/src/teams/TeamPage.jsx)). The form strip, its badges, Next games and Latest results always show the whole season.

**Unplayed stages are confusing.** When the club never reached the chosen stage (for example Crvena Zvezda and the Final Four), each tab falls back on its own empty text:

| Tab | Message today |
|---|---|
| Overview | "No record yet for this phase." / "No statistics recorded yet for this phase." / "No league rankings yet for this phase." / quick-compare "in this phase" lines |
| Statistics | "This club did not play any games in the selected phase." |
| Shooting | "No played games yet this phase to map shot locations from." |

These say "phase" instead of the stage's name. None of them says the club may simply not have qualified.

**Roster offers a stage choice it shouldn't.** The roster is the season's squad, but the tab still shows the stage strip.

## The fix

**1. Games follows the stage.**
- `TeamPage` passes `phaseCode` to `TeamGamesSection`, keyed on season, club and phase like `TeamShootingSection`. `TabPanel` only moves focus and never remounts its children, so the key is what resets the Wins/Losses filter and "Show all" when the stage changes.
- `TeamGamesSection` keeps only the games with `game.phaseCode === phaseCode`. The strip, its record and average-margin badges, and both columns come from those games.
- Its "No games left to play." / "No games played yet." / "No games scheduled yet." texts are unchanged.

**2. One message when the club never reached the stage.**
- `TeamPage` decides this once from the season-wide games it already loads: `gamesQuery` succeeded, the season has games, and none has `phaseCode` equal to the chosen stage.
- In that case, Overview, Statistics, Shooting and Games all show the same single message in place of their body.
- The message names the club (`team.abbreviatedName ?? team.name ?? team.clubCode`) and the stage name from the phases list, and never says "phase":

| Case | Message |
|---|---|
| The season's first stage (first in the phases list; every club plays it) | "{club} has no {stage} games yet." |
| The club has games in a later stage (e.g. went straight to the Playoffs past the Play-In) | "{club} didn't play in the {stage} in {season}." |
| Season format status `completed` | "{club} didn't qualify for the {stage} in {season}." |
| Otherwise (in progress, or the format is unknown or failed) | "{club} hasn't played in the {stage} yet. Only the clubs that qualify play in it." |

- `{stage}` is preceded by "the", for example "the Final Four" or "the Play-In".
- `{season}` comes from `formatSeasonLabel(seasonCode)`, for example "2024-25".
- The status comes from the shared `useSeasonFormat` query. If that query fails, the "Otherwise" wording is used and nothing is blocked.

**3. Roster has no stage strip.**
- The stage `TabStrip` is hidden on Roster, as it already is on Advanced.
- The roster stats query asks for the whole season (`phase=all`, which `/season-stats` accepts) while the Roster tab is open.
- Overview's team leaders keep using the chosen stage.

**4. The remaining empty texts name the stage.** These only appear when the club has games in the stage but no data yet:
- "No record yet for the {stage}."
- "No statistics recorded yet for the {stage}."
- "No league rankings yet for the {stage}."
- "No upcoming game or league leader to compare against in the {stage}."
- "Advanced numbers for this comparison aren't available yet for the {stage}."
- Statistics: "No games played in the {stage} yet."
- Shooting: "No played games yet in the {stage} to map shot locations from."
- "Loading/Could not load the phase record." becomes "...the record."

**Must not change:**
- The header's next-game chip stays season-wide.
- Advanced is untouched.
- The player page's own shooting text is untouched (it's a different page).
- No backend change.

## Build steps

- [x] **1. Filter the Games tab by phase.**
  - Pass `phaseCode` into `TeamGamesSection`, keyed per phase, and filter its games.
  - **Done when:** switching stage changes the strip, badges and both columns. Lint and build pass.
- [x] **2. Shared message for a stage the club never reached, and no stage strip on Roster.**
  - In `TeamPage`, compute the absence once and render the message for Overview, Statistics, Shooting and Games (wording table above, from the phases order and the season format).
  - Remove the now-redundant check from `TeamGamesSection`.
  - Hide the stage strip on Roster and make its stats query use `all` there.
  - **Done when:** on the local DB, a club that missed the Final Four shows the right sentence on all four tabs. Roster has no stage strip and shows whole-season stats. Lint and build pass.
- [x] **3. Name the stage in the remaining empty texts.**
  - Pass the stage name to the Overview panels (`TeamSnapshot`, team leaders, `TeamLeagueProfile`, `TeamQuickCompare`), `TeamStatisticsSection` and `TeamShootingSection`, and use the texts above.
  - **Done when:** no team-page message says "phase". Lint and build pass.
- [x] **4. Browser specs.**
  - In `team-shooting-games-layout.spec.js`, the Games-follows-stage test mocks phases RS, PO and FF:
    - RS and PO each show only their own games.
    - FF shows the in-progress sentence, and the next-game chip is unchanged.
    - The Shooting tab shows the same sentence on FF.
  - The long-names test keeps the RS phase.
  - Add a case for the completed-season wording and the "didn't play in" wording, using a mocked season format and mocked games.
  - In `team-statistics-roster-layout.spec.js`:
    - The Roster tab has no Phase tablist.
    - Statistics on FF shows the sentence.
    - The zero-games text becomes "No games played in the Regular Season yet."
  - In `team-overview-layout.spec.js`, update the three empty texts and the "Could not load the record." text.
  - **Done when:** `npx playwright test team-shooting-games-layout.spec.js team-overview-layout.spec.js team-statistics-roster-layout.spec.js` passes on the local DB.
  - As built, the Statistics, Overview and Shooting checks of the stage sentence live in the Games-follows-stage test in `team-shooting-games-layout.spec.js` (one set of phase, format and games mocks for all four tabs), not in the statistics spec.

## Verify

- `/api/health` reports `"target":"local"`.
- Run `cd frontend && npm run lint`, `npm run build`, and `cd backend && npm run build`.
- Run `cd frontend && npx playwright test team-shooting-games-layout.spec.js team-overview-layout.spec.js team-statistics-roster-layout.spec.js responsive.spec.js`.
- **Manual check, Crvena Zvezda team page:**
  - Games follows each stage.
  - Final Four shows "Crvena Zvezda hasn't played in the Final Four yet. Only the clubs that qualify play in it." on Overview, Statistics, Shooting and Games.
  - In 2024-25, a stage they missed says "didn't qualify for the ... in 2024-25".
  - Roster shows no stage strip.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7438,"specSha256":"e73bce83283bcbda5ef8a06bb7ce885487ec659e2a57a705ea5bd81df9c30fe8","branch":"refs/heads/fix/team-games-follow-the-phase-tabs","head":"8e12f263e99b386e9675d2748ee5413069a8f686","baseRef":"refs/heads/master","baseCommit":"8e12f263e99b386e9675d2748ee5413069a8f686","sourceTree":"fa1e20fc768eb6a5cc64f40c1d9b417bda20a84e","absentOptional":[]} -->
