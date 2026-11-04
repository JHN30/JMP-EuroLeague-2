# Fix: Compare player Overview tab compaction and new insights

**Type:** Fix
**Status:** verified
**Branch:** fix/compare-player-overview-tab-compaction-and-new-insights

## The problem

A player comparison's Overview tab (`comparisons/ComparePlayerOverview.jsx`) repeats itself and spreads thin data over a
lot of room. For example, Vezenkov vs Nunn (`/2025/compare?view=players&playerA=003469&playerB=012774`, Overview) is
1,864px tall at 1440 and 2,556px at 390.

| Part | Height at 1440 | What takes the room |
|---|---|---|
| Profile | 380px | The two players' heads, the radar, and best/weakest badges. Wide empty bands sit either side of the radar. |
| Season line | 730px | The two players again (headshot, name, club), then 7 stats at about 77px each: a centred label over two full-width bars. |
| Recent form | 310px | Two columns of five games, with the line far from the opponent. |

Nothing shows the players' own meetings this season, their best games, or whether their recent form is up or down on
the season.

## The fix

These are frontend changes, in `comparisons/`. They use the data the tab already loads:
- the phase leaderboard (`fetchLeagueLeaderboard`), including each row's `positionName`, `playerAge` and `gamesStarted`;
- each player's season game log (`getPlayerGames`, key `["player-games", seasonCode, id]`).

There are no API or address changes.

1. **One slim pair header.** It replaces the Profile panel's two heads and the Season line's `PlayerPairHeader`.
   - From `sm`, one line per side, mirrored: headshot, name (linking to the player), club crest and name, then
     "Position · age · G games (S starts) · M min".
   - Below `sm`, the headshot sits over the name, club and a short line.
   - It is an opt-in `compact` prop (with the extra row data) on `PlayerPairHeader`, which keeps its
     `role="group"` "Players compared". The other tabs keep the current header.
   - A line under it counts who leads the season line, for example "Vezenkov ahead in 4 of 7 · Nunn in 2". MIN is
     left out of the count.
2. **Profile and Season line side by side from `lg`.**
   - **Profile** on the left: the radar a little smaller. Under it, one line per player: "Best: Scoring 100th ·
     Weakest: Playmaking 50th", in that player's radar colour.
   - **Season line** on the right: one aligned row per stat, the same pattern as the team Statistics tab. That is the
     stat name with its tip, then A's place, value and bar, then B's bar, value and place. The better value is marked.
   - The bars are each player's percentile in the phase. A player under the minimum games shows "Under the minimum
     games" in place of the place, as now.
   - Below `sm` a row is two lines, as on the team tab: the name between the two places, then the two numbers with a
     bar each.
3. **Recent form, compact.** For each player:
   - one line from `sm`: last-5 W/L dots (each linking to its game, with the game in a title), then PTS, REB, AST and
     PIR over those games, each with its change on the season per-game average (for example "15.8 −3.6"), coloured
     up or down;
   - the five games as tight aligned rows: W/L, vs/at, opponent, then PTS, REB, AST and PIR in fixed columns.
   - The two players sit side by side from `sm`, as now.
4. **When they met** (new panel). The games this season both players played in, found by the same game in both game
   logs.
   - For opponents, one row per game: date and round, the score, then each player's PTS, REB, AST and PIR. The higher
     PIR is marked. It links to the game.
   - A summary line on top, for example "Met 3 times · Vezenkov's side won 2 · PIR 18.3 vs 14.0".
   - Teammates (same side in a game) get one line instead: "Teammates: played N games together".
   - With no shared game it says "Their clubs have not met this season".
5. **Season highs** (new rows, in the same panel as When they met from `lg`, or below it). Each player's best PTS,
   REB, AST and PIR game this season, side by side as aligned rows. Each value links to its game and has the opponent
   in a title. This reuses `seasonHighGames` from `players/gameLog.js`.
6. **Layout**, top to bottom:
   - the slim header and the lead line;
   - Profile beside Season line;
   - Recent form;
   - When they met beside Season highs from `lg`.
8. **Changed while building.**
   - Recent form has no separate W/L dot line. Each game row starts with its W/L badge, so the dots would repeat it.
   - From `lg` each player's four averages sit in a two-by-two block beside the game rows, so the rows do not stretch
     across half the page.
   - When they met names the players over their halves with one shared "PTS · REB · AST · PIR" key between them, so
     the heads do not wrap on a phone.
   - The radar plot is 256px tall (from 288px).
   - Throughout the tab, each player keeps the radar's colour: primary for A, accent for B.
9. **Requested after review.**
   - **Steals and blocks.** STL and BLK join PTS, REB, AST and PIR in Recent form (the averages with their change, and
     the game rows), in When they met (each player's line) and in Season highs. `seasonHighGames` takes an optional
     list of stats; the player page keeps its default four.
   - **Averages under the games.** Below `xl` each player's six averages sit beneath the five game rows: three across
     below `sm` and from `lg`, six across between. The two players stack until `lg`, so the six columns have room.
     From `xl` the averages sit beside the games, two by three.
   - **When they met on a phone.** Below `sm` the score sits on its own line over the two players' lines.
   - **Same last names.** Two players with the same last name were both called by it (for example "Jones" and
     "Jones"). Every short name on the tab now comes from the radar's naming, which uses the full names when the last
     names match.
   - **Upcoming meetings.** When they met also lists the games still to play between the players' clubs, from A's
     club's schedule (`getTeamGames` with `status: "scheduled"`), soonest first. Each row shows "A-club vs/at
     B-club", the round, and the date and time, and links to the game. The list is "Next meeting" after past
     meetings and "Scheduled" when the clubs have not met. It shows "No meeting left on the schedule" when none
     remain, and an inline retry when the schedule fails. Nothing shows for teammates or for a player without a club.
   - **Even panels.** When they met and Season highs stretch to the same height from `lg`.
   - **Recent form on a phone.** Below `sm` the venue goes into the opponent's cell ("at ZAL") and the six number
     columns narrow, so a game row fits at 320px without overlapping.
7. **Skeletons** (`PlayerOverviewSkeleton`, `PlayerFormBodySkeleton` in `CompareSkeleton.jsx`). Match the new layout.
   The new panels show their own small loading and error states, inside their panels, from the game-log queries
   already used by Recent form.

The following must not break:
- every tab's "Players compared" header (the other tabs unchanged);
- the radar, named by last names;
- every stat name keeps its hover tip;
- club and opponent codes below 640px;
- the loading, error and empty states (a player who has not played, a player under the minimum games);
- both themes, keyboard focus, and no sideways scroll at 320px.

## Build steps

1. [x] **Header, Profile and Season line** (items 1, 2 and 6).
   - Done when the players appear once, in a slim header with position, age, games, starts, minutes and the lead
     line.
   - Done when Profile and Season line sit side by side from `lg`, with one aligned row per stat.
2. [x] **Recent form, When they met, Season highs** (items 3 to 5).
   - Done when the form is compact with changes on the season.
   - Done when Vezenkov vs Nunn lists their meetings with each player's line, and a teammate pair says so.
   - Done when the season highs link to their games.
   - Record the tab height at 1440 and 390 before and after.
   - Result (Vezenkov vs Nunn): 1,634px at 1440 (from 1,864) and 3,169px at 390 (from 2,556). Carlik Jones vs Chris Jones,
     with a next meeting: 1,626px at 1440 and 3,261px at 390. The phone layout is
     taller than before: the two new panels, steals and blocks, the averages under the games and 44px tap rows add
     more than the cleanup saves.
3. [x] **Skeletons and browser specs** (item 7). Update `e2e/compare-player-layout.spec.js` (the Overview test, the
   phone header test, the tips test) and the `compare.spec.js` Overview checks. Add checks for:
   - the header shown once;
   - the season line rows aligned on one line from 640px;
   - the When they met rows matching the shared games of mocked logs;
   - the teammates line;
   - the season highs links;
   - no sideways scroll at 1280, 1024, 640 and 320.
   - Done when the specs pass on the local DB.

## Verify

- On the local DB (`/api/health` reports `"target":"local"`), run
  `cd frontend && npx playwright test compare.spec.js compare-player-layout.spec.js responsive.spec.js -g "Compare|compar|Overview|player"`.
- Then `npm run lint` and `npm run build` in `frontend`.
- In the browser, open `/2025/compare?view=players&playerA=003469&playerB=012774`, Overview:
  - the slim header with the lead line;
  - Profile beside Season line;
  - compact form with changes;
  - When they met and Season highs.
- Check two teammates (for example two Olympiacos players).
- Check another tab to confirm its header is unchanged.
- Check 390 and 320, and both themes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9688,"specSha256":"3393aec9e626d3054ea04ee212f178bc3fd164495bbb82c2d71913bcfc45bd82","branch":"refs/heads/fix/compare-player-overview-tab-compaction-and-new-insights","head":"b05fbf016af5e8b11dd37cfce7b8463accfbd3e7","baseRef":"refs/heads/master","baseCommit":"b05fbf016af5e8b11dd37cfce7b8463accfbd3e7","sourceTree":"8f8621830bceb49620ccfff0b09690a416547ac6","absentOptional":[]} -->
