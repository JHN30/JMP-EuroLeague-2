# Fix: Team Shooting tab as a shooting studio

**Type:** Fix
**Status:** verified
**Branch:** fix/team-shooting-tab-as-a-shooting-studio

## The problem

The team page's Shooting tab (`/:season/teams/:clubCode`, Shooting) shows one side at a time (the club or its
opponents, switched by a tab) on one court, with four summary cards, a zones table and a three-row style table. The
game page's Shooting tab ("Shooting studio", `ShootingTab` inside `games/GameDetailPage.jsx`) is far richer: both sides on
two courts next to each other with a shot-map / zones switch, filters for each side's player, shot type, period, result
and play context, an "Animate quarters" control, each court headed by 2PT, 3PT, FT, eFG% and paint points, then a zone
comparison table (paint, mid-range, threes with totals, the better side shaded), shooting by quarter, play context
(fast breaks, second chances, off turnovers) and each player's shooting. The user wants the team tab to work like it.

## The fix

### One studio, two pages

- Move `ShootingTab` and the helpers only it uses out of `GameDetailPage.jsx` into `games/ShootingStudio.jsx` (exported
  as `ShootingStudio`), unchanged for the game page, which imports it from there. Its tables (`ShootingTables.jsx`,
  `ZoneComparison.jsx`) are reused as they are.
- Opt-in props only the team page passes (the game page's behaviour is unchanged without them):
  - `freeThrows`: a function `(teamIndex, playerKey) => { made, attempted } | null` used for the court headers instead
    of the box score;
  - `playerFilterTeams`: which sides get a player list in the filters (default both);
  - `playerTableTeams`: which sides get the "each player's shooting" table (default both); a side without a player list
    shows its names as plain text;
  - `initialPresentation`: the presentation it opens on (default the shot map);
  - `title`: the heading (default "Shooting studio").

### The team tab

- **Sides:** the club on the left; on the right "Opponents", every opponent's shots in the chosen stage's played games
  gathered as one side (their club codes replaced by one opponents code for the studio, their players kept). The court
  colours, the zone comparison, the quarter and play-context tables then compare the club with what its opponents did
  against it.
- **Filters:** no player list for either side: both courts are always whole teams, so the club compares like with like
  with its opponents (a chosen player against every opponent shot would not). Shot type, period, result and play context
  apply to both courts as on the game page; "Animate quarters" plays the season's shots quarter by quarter. A player's
  own chart is on the player page's Shooting tab.
- **Court headers:** 2PT and 3PT from the shots; FT from the team-stats summary already loaded for the stage (own and
  opponent totals).
- **Player table:** the club's players only (the opponents' would be every player who faced the club), names as plain
  text.
- **Opens on** the zones (a season of shots reads better as zones than as thousands of markers); the shot map is one
  click away.
- **Kept from today:** the stage tabs, the loading state ("Aggregating N shooting charts"), the error with Retry, and
  the empty states (no played games; no shot data). The current one-side court, summary cards, zones and style tables
  are replaced by the studio, so `TeamShootingSection.jsx` becomes a thin wrapper around it and its now-unused imports
  go. The player page's Shooting tab, which shares `ShootingBreakdown`, is not touched.

Must not change: the game page's Shooting tab (same layout, filters and behaviour), the player page's Shooting tab, the
other team tabs.

### Changes found during implement

- **More opt-in props** than listed: `freeThrowsTip` (the FT hover tip names the stage's box scores, not one game's)
  and `emptyText` (the stage wording when no shot has a location). `PlayerShooting` gains `teamIndexes` for the
  club-only table and `selectableTeams` for plain-text names.
- **No player filter on the team tab** (decided in review): first the opponents' list was dropped, then the club's,
  since a chosen player against every opponent shot compares unlike things. With it went the stage's season totals
  request for a chosen player's free throws and the "—" for traded players. No link to the player page was added.
- `shootingPercentage` moved to `games/gameUtils.js` (a component file may only export components), imported by both
  the game page and the studio.
- The team-stats summary query now also runs on the Shooting tab, for the club's and opponents' free throws.
- The filter row's column count follows the number of selects it holds.
- The old Shooting tests (one-side layout, Filters button, zones and style tables, court size) are replaced by three
  studio tests; the court size and filter behaviour are covered by the game page's own Shooting specs, which run
  unchanged.

## Build steps

- [x] 1. **Move the studio.** `ShootingStudio.jsx` with the opt-in props; `GameDetailPage.jsx` imports it.
  Done when: lint passes and `game-shooting.spec.js` and `game-shooting-layout.spec.js` pass unchanged.
- [x] 2. **Team tab on the studio.** `TeamShootingSection.jsx` builds the club and opponents sides from the season shots,
  the free-throw function, and passes the opt-in props.
  Done when: lint passes and at 1440px a club's Shooting tab shows two courts (club and opponents), the filters, the
  zone comparison, quarter, play-context and the club's player table.
- [x] 3. **Browser checks.** Rewrite the Shooting tests in `team-shooting-games-layout.spec.js` for the studio: two
  courts and their headers, opponents as one side, no player filter, the shared filters narrowing both courts, the zones / shot map
  switch, the club-only player table, the empty, loading-failing and no-attempts states, and no sideways scroll at
  320, 390, 768, 1024 and 1440px.
  Done when: that spec, `game-shooting.spec.js`, `game-shooting-layout.spec.js` and `responsive.spec.js` pass against the
  local database.

## Verify

- `npm run build` (root) and `cd frontend && npm run lint` pass.
- The four specs above, after `/api/health` reports `"target":"local"`.
- By hand at 1440px: a club's Shooting tab opens on the zones with the club and its opponents side by side; switch to
  the shot map, pick a period and a play context; both courts and the tables below follow. A game's Shooting tab looks and
  works as before.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6472,"specSha256":"d8469f903678dadcb220f61622d721f886645cba2fba0667786e696aa0a74bfa","branch":"refs/heads/fix/team-shooting-tab-as-a-shooting-studio","head":"8e21f063b757855bebc93a4229bbd6a22a68613d","baseRef":"refs/heads/master","baseCommit":"8e21f063b757855bebc93a4229bbd6a22a68613d","sourceTree":"80120ef2bb227554eb609669b462fe055f58e60d","absentOptional":[]} -->
