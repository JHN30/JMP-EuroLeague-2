# Fix: Show the warehouse's display-form names and places as stored

**Type:** Fix
**Status:** verified
**Branch:** fix/show-the-warehouses-display-form-names-and-places-as-stored

## The problem

The warehouse now stores text in display form (local DB already has it; Neon gets it when every season E2000-E2026
is republished in one go). Person names are `Larkin, Shane` instead of `LARKIN, SHANE`, with suffixes, inner capitals
and initials already right (`Brown III, John`, `McCarty`, `Dozier, PJ`, `Cowan Jr., Anthony`). Cities are title case
with one spelling each. The frontend still re-cases these values, and its first-letter casing now breaks names:
`III` becomes `Iii`, `McCarty` becomes `Mccarty`, `PJ` becomes `Pj`, `DeJuan` becomes `Dejuan`.

Where the app re-cases today:

| Place | What it does |
|---|---|
| `frontend/src/lib/playerName.js` | `titleCase`, and `displayName` title-cases both name parts |
| Local copies of the same idea | `AdvancedLeaders.jsx`, `PlayersLeaders.jsx`, `ComparePlayerOverview.jsx`, `CompareTeamOverview.jsx`, `CompareRosters.jsx` (2), `comparisons/playerLabels.js`, `GameCard.jsx`, `PlayerShootingSection.jsx` |
| Own casing code | `TeamAdvancedSection.jsx` (its own `titleCase` for lineup names and impact rows), `PlayerStatisticsSection.jsx` (`surname()` lower-cases all but the first letter) |
| Surname-first caps look | `withoutComma` in the Home, Season overview and Team leader cards and the roster name tooltip relied on the data being capitals ("LARKIN SHANE"); with the new data it reads "Larkin Shane", which looks like given name + surname |
| Cities | `TeamsPage.jsx` and `TeamPage.jsx` pass the city through `readableName`; `TeamsPage` `CITY_NAMES` still maps `St Petersburg`, `Nizhni Nóvgorod` and `Ovarense`, which the warehouse now corrects itself |
| Game status | The app reads the raw `game_status` (`"Cancelled"` checks in `season-games.ts`, `season-format.ts`, `TeamPage.jsx`, `groupedBracket.js`, `seasonFormat.js`; the raw label as the Game page badge). The warehouse says to use the derived `status` (`completed`, `scheduled`, `awaiting_result`, `postponed`, `cancelled`), because `game_status` can contradict the facts (some unplayed E2019 games say `Confirmed`). `status` is already in gold `app_games`. |

Checked and needing no change:

- **Countries:** the app shows `countryCode` as is; there is no flag or country lookup to clean up.
- **Roles:** the backend selects coaches and players by `role_code`, never `role_name`.
- **Position:** the app uses `position_name` (`Guard`, `Forward`, `Center`), never the numeric `position`.
- **Group names:** `finalFourKind` and `eliminationStageOf` lower-case before matching and accept `semifinal` and
  `semi-final`, so `Group Semifinal A` still matches.
- **Venue names:** still capitals in the warehouse, so `readableName` for arenas stays (`TeamPage` club facts,
  `MatchupHeader` arena).
- **Forfeits:** `status` has no walkover value, so `gameStatus === "Walkover"` stays the forfeit test.

## The fix

Display names as stored; split on the first comma only to reorder given name before surname. No new helpers.

1. `lib/playerName.js`: `displayName` becomes `` `${first} ${last}`.trim() `` with no casing. `titleCase` stays only
   inside the file as the venue fallback behind `readableName`; it is no longer exported. Comments updated to the
   new data form.
2. Every local `${titleCase(first)} ${titleCase(last)}` becomes the shared `displayName`; every surname `titleCase(last)`
   becomes `last` as is. `TeamAdvancedSection` drops its own `titleCase` and uses `displayName`/`nameParts`;
   `PlayerStatisticsSection.surname()` returns the surname as is. `MatchupHeader`'s arena uses `readableName`
   instead of its inline copy.
3. **Leader cards, roster tooltip and box score (approved: given name first):** replace `withoutComma` with
   `displayName`, so cards read "Shane Larkin" like the rest of the app, and delete `withoutComma`. `PlayerLink`'s
   `noComma` (Game page box score and "Did not play" list) follows the same rule; it was found during the build.
4. Cities: `TeamsPage` and `TeamPage` use `club.city` as is (no `readableName`); `CITY_NAMES` loses the three entries
   the warehouse now fixes and keeps the English names the warehouse leaves alone (Rome, Naples, Cantù, Málaga, Kyiv,
   İzmir). `TeamPage` club facts use the same `cityName` so the two pages agree.
5. Status: the backend games queries select `status` alongside `gameStatus`; every "is this game cancelled" test
   uses `status === "cancelled"` (SQL `status <> 'cancelled'` / `is null`). The Game page badge for an unplayed
   game shows a label from `status` (Scheduled, Awaiting result, Postponed, Cancelled) instead of the raw label.

Must not break: name search and type-ahead (they already compare lower-cased), the player hero (its CSS
`uppercase` stays), box score, play-by-play and rotations tables that show `Surname, Given` as is, forfeit handling,
and postseason stage matching.

**Timing:** do not deploy until the warehouse republishes all seasons to Neon. Against Neon's current capitals this
code would show "SHANE LARKIN" and "ISTANBUL", so it ships together with that publish.

## Build steps

- [x] 1. **Names.** Items 1-3 above. Done when no file under `frontend/src` imports or defines `titleCase` outside
   `playerName.js`, and on the local DB the Leaders, Compare, Team (roster, advanced lineups) and Game pages show
   names such as `McCarty`, `Brown III`, `PJ` correctly.
- [x] 2. **Cities.** Item 4. Done when the Teams page and a Team page show the same city for every E2025 club, and
   `Saint Petersburg` comes from the data.
- [x] 3. **Status.** Item 5. Done when the backend builds, a cancelled game (U2019/E2019 or E2021 RS) is still left out of
   remaining-games counts and series, and an unplayed game's badge reads from `status`.

- [x] 4. **Failing browser tests (requested after step 3).** Rewrite the tests that already failed on `master` to the
   current app, and delete the assertions for behavior that was removed on purpose. Done when every one of them passes.

   | Test | Cause | Change |
   |---|---|---|
   | `all-seasons:114`, `qualifying-note:66`, `skeleton-loading:248` | the Postseason page gained a "How the postseason works" heading | heading matched exactly |
   | `cancelled-season:23` | `status` marks E2019's 54 unplayed games cancelled, so they are not owed (as E2021's already were); records count 67% of games | stage `loaded`, records minimum 23 |
   | `competition-context:159` | records count 67% of the regular-season games (`8c4e4de`) | minimum 23, not 20 |
   | `filter-controls:3` | the sort direction select became a sortable heading (`b1d3130`) | deleted the select's lines |
   | `grouped-four-groups:93`, `grouped-pages:132` | Compare Statistics no longer shows group places (`2caf37d`) | deleted the group-place lines |
   | `grouped-thirty-two:193` | the meeting history shows the latest 10; the 2003 forfeit is older | opens Show all first |
   | `game-overview:34` | the first 100 games of 2026 are all played | asks for scheduled games |
   | `player-career-layout:186, 238` | Llull now has 2026-27 games | no fixed 2026-27 or 326; the radar's last three seasons and the total come from the table |
   | `skeleton-loading:12, 348, 359, 407, 470` | Home's leader cards became the In-form team card (`814e071`), the players' Advanced tab merged into Statistics (`a846374`), the games panel and the Records and Head-to-head skeletons were reworked | new labels and markers; deleted the Advanced case |

- [x] 5. **Compare player skeletons (found by step 4).** The players' Compare overview showed spinners in "When they met" and
   "Season highs" while the game logs loaded (since `ec454e1`); both now show body skeletons, shared with the page skeleton
   (Season highs has six rows, one per stat). Done when `skeleton-loading:359` and `compare-player-layout.spec.js` pass.

## Verify

- `cd backend && npm run build`, `cd frontend && npm run lint && npm run build`.
- `/api/health` reports `"target":"local"` (the local DB already holds the new values).
- Browser: Leaders (Players, Advanced), Compare (players and teams), a Team page (roster, advanced, header city),
  Teams, Home and Season overview leader cards, a Game page (box score, officials, coach, arena, status badge).
- Playwright, only the specs for touched pages: `leaders.spec.js leaders-layout.spec.js`, the compare specs,
  `team-*.spec.js teams-layout.spec.js`, `game-overview.spec.js game-detail-layout.spec.js games-layout.spec.js`,
  `season-status.spec.js`. Mocked fixtures in capitals are shown as is, so expectations that assumed title-casing
  (for example a coach line) are updated to the display form.

## Verification results

- `npm run lint` (frontend) and `npm run build` (root: backend `tsc` and the frontend build) pass.
- Local API (`/api/health` target `local`): games carry `status` next to `gameStatus`. E2019's 54 unplayed games are
  `gameStatus` "Confirmed" but `status` "cancelled", E2021's 28 are "cancelled", and neither season has games still owed.
- Full Playwright suite (the change reaches most pages): 1182 passed, 49 failed. The failed tests were rerun with
  `master`'s code: 29 fail there too and are left as they are (grouped pages, skeleton loading, Head to head E2003,
  player career, cancelled season, competition context, qualifying note, filter controls, and `game-overview:34`,
  which finds no unplayed game in the first 100 of 2026). The rest were specs written for capitals: mocks that test
  how names and cities read now use the stored display form, and the box score expectations read "Given Surname"
  (a `shownName` helper in `e2e/support/game-fixtures.js`). After that every one of them passes, and the two live-data
  asserts that also failed on `master` (`team-club-details:17`, the officials in `game-overview:34`) read the new values.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10065,"specSha256":"0efdec5f769e46a5c98a8da47dff5bc1a7dbdd37fcb40b4bb09ea67b664c068b","branch":"refs/heads/fix/show-the-warehouses-display-form-names-and-places-as-stored","head":"5b84f6d0b4586a87b226c805199d07a2c2a95cda","baseRef":"refs/heads/master","baseCommit":"5b84f6d0b4586a87b226c805199d07a2c2a95cda","sourceTree":"2027b3e64ae826500c5fcbb895b0c66397420643","absentOptional":[]} -->
