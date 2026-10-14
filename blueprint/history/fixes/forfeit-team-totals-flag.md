# Fix: Forfeit team totals flag

**Type:** Fix
**Status:** verified
**Branch:** fix/forfeit-team-totals-flag

## The problem

The pipeline now fills `team_season_stats` for the four clubs that played a recorded forfeit (E2001 Top 16 TEL and ULK, game 264 awarded 2-0; E2003 Top 16 TEL and PAM, game 200 awarded 20-0). Their totals cover only the real games, so `gamesPlayed` is 5 while the standings still count six games and the awarded score. Checked on the local API: `/2001/teams/TEL/team-stats?phase=TS` returns `gamesPlayed: 5` with real totals, and `/2003/teams/PAM/team-stats?phase=TS` the same.

The app still shows the old note "Team totals are unavailable for X in this phase: it includes a recorded forfeit..." ([ForfeitStatsNote.jsx](frontend/src/lib/ForfeitStatsNote.jsx)) on the team page Overview, the team Statistics section, team Leaders and Compare Statistics. That is now false. For these four clubs only, wins plus losses (6) no longer equal `gamesPlayed` (5), and standings points differ from the team-stats points; a reader needs one line saying why.

## The fix

Replace the "unavailable" note with a games-played flag. The numbers are not changed: per-game values keep dividing by `gamesPlayed` (5), and standings stay as they are.

- **Same component slot, new wording.** `ForfeitStatsNote` keeps its four call sites and its `clubCodes` / `className` props, but now says the totals cover the real games only. For one club (team page, Compare): "Totals cover 5 games. The forfeit against ULK (2-0) counts in the standings only." The score is the club's own awarded score first. A board (Leaders, no `clubCodes`) lists each affected club once in one sentence, for example "Totals for Maccabi Elite and Ulker cover 5 games each. Their forfeit (2-0) counts in the standings only."
- **Source of the facts.** The forfeit game, its clubs, the opponent and the awarded score still come from the format's `walkover` exception for the stage and the game itself (`useForfeitClubs`, extended to return, per club, its opponent's name and its own and the opponent's awarded score). No season, club or game code is hardcoded in the component. The number of games comes from the club's `gamesPlayed` in the already cached league team stats (`getLeagueTeamStats`, query key `league-team-stats`). While it has not loaded, the flag is not shown.
- **Only the four clubs.** A club outside the forfeit, another phase (RS) and every other season show no flag. Wins, losses, standings and the 34l forfeit handling elsewhere (game page, fixture cards, score statistics) are untouched.
- **Do not "fix" either number.** No change to standings, records or any average.
- **Other team-totals views.** Check that the league-wide aggregates that read the same table (Home KPI strip, Season Overview team tables) stay consistent now that the four clubs have totals (they divide by `gamesPlayed`); add the flag there only if a single club's numbers are shown with a games column. No change expected.
- Remove the old absence wording and the e2e checks that assert it.

## Build steps

- [x] **1. Flag component and data.** Extend `useForfeitClubs` with opponent name and awarded score per club; rewrite `ForfeitStatsNote` to the games-played flag (club and board wording) reading `gamesPlayed` from the cached league team stats. Done when `npm --prefix frontend run lint` passes and, on a local run, `/2001/teams/TEL?phase=TS` (Overview and Statistics) shows "Totals cover 5 games. The forfeit against ULK (2-0)..." with no "unavailable" text.
- [x] **2. Boards and Compare.** Confirm the same flag appears on `/2001/leaders?scope=teams&phase=TS`, `/2003/leaders?scope=teams&phase=TS` and the Compare Statistics tab for a forfeit club (and only for it), that TEL and ULK / TEL and PAM now appear on the boards with values, and that the Home and Season Overview aggregates still render. Done when a screenshot of the Leaders board and the Compare tab shows the flag and the clubs' values.
- [x] **3. Update the browser spec.** In [grouped-thirty-two.spec.js](frontend/e2e/grouped-thirty-two.spec.js) replace the "clubs of the forfeit get a note where team totals are missing" test: the API now returns no null team totals, `gamesPlayed` is 5 for the four clubs (6 for their opponents' peers), the flag text appears on the team page, Leaders and Compare for forfeit clubs only, and `getByRole("note")` is absent for a non-forfeit club and the RS phase. Done when `npx playwright test grouped-thirty-two.spec.js grouped-direct-final-four.spec.js` passes (with `/api/health` reporting `target: local`), and `npm run build` and `npm --prefix frontend run lint` pass.

## Files / areas

- frontend/src/lib/ForfeitStatsNote.jsx, frontend/src/lib/useForfeitClubs.js
- Call sites unchanged: teams/TeamPage.jsx, teams/TeamStatisticsSection.jsx, leaders/TeamsLeaders.jsx, comparisons/CompareTeamStats.jsx
- frontend/e2e/grouped-thirty-two.spec.js
- No backend or pipeline change.

## Verify

Open `/2001/teams/TEL?phase=TS` and `/2003/teams/PAM?phase=TS` (Overview and Statistics): the flag reads "Totals cover 5 games. The forfeit against ... counts in the standings only." and the totals show real values. Open the team Leaders board for both seasons' Top 16: the two clubs appear with values and one flag. Open Compare with a forfeit club: flag for that club only. A club outside the forfeit, the RS phase and any other season show no flag.

## Results

Verified on 2026-10-14 against the local database (`/api/health` reported `target: local`).

- `useForfeitClubs` now returns, per forfeit club, its opponent and the awarded score from its own side; `ForfeitStatsNote` became the games-played flag ("Totals cover 5 games. The forfeit against X (2-0) counts in the standings only."), with a board wording for several clubs, hidden until `gamesPlayed` loads.
- Checks run: `npx playwright test grouped-thirty-two.spec.js grouped-direct-final-four.spec.js` (31 passed), `npm run build`, `npm --prefix frontend run lint`; screenshots of the team page and the Leaders board inspected, Compare flag text read.
- Not run: the full suite and Neon/production checks.
