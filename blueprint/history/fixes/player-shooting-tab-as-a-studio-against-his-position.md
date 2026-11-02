# Fix: Player Shooting tab as a studio against his position

**Type:** Fix
**Status:** verified
**Branch:** fix/player-shooting-tab-as-a-studio-against-his-position

## The problem

The player page's Shooting tab (`players/PlayerShootingSection.jsx`) shows one player's court, four totals, zones and
style, with nothing to compare them to. The team Shooting tab (`teams/TeamShootingSection.jsx`) puts the club beside
its opponents in the shooting studio, which reads much better.

A one-to-one comparison with another player needs a way to pick among about 238 players a season. Teammates (tried
first, in review) are not a fair reference. A player of the same position is: a forward against another forward, picked
from a search over the position, with the whole position as a baseline.

## The fix

### The studio, player against a player of his position

- **Same studio as the team tab:** the Shooting tab renders `games/ShootingStudio`.
- **Left side:** the player's own shots in the phase, under his surname (e.g. "Bonga").
- **Right side:** one other player of his position in the same season and phase, under that player's surname. The
  position is his registration's. A season without positions (older seasons, or a player with none) lists every
  player.
- **The picker** ("Compare with a forward" for screen readers), in place of the other side's name over its court:
  - a search box (combobox) over the position's other shooters, most attempts first, each with club, shots and games;
  - the search ignores case and accents, and matches every typed word;
  - the arrow keys move, Enter chooses, Escape keeps the choice;
  - first in the list is "All forwards" (or guards, centers, players): every other player of the position pooled.
- **Picked first:** the forward whose shot profile is closest to his, tagged "Most similar". The profile is the share
  of located attempts in each kind of zone (left and right as one) plus attempts per game. Only players with at least
  20 attempts are suggested (any, when none has). With no candidate it falls back to the pooled position.
- **The studio's usual parts, unchanged:**
  - zones heatmap first, then every attempt and the map;
  - the shot type, period, result and play-context filters;
  - the side-by-side zone, quarter and play-context comparisons.
- **Studio options:** no player filter and no player table (`playerFilterTeams={[]}`, `playerTableTeams={[]}`). No
  free throws (`freeThrows` null).
- **Title:** "<Surname> against <Surname>, <phase name>", or "<Surname> against every <position>, <phase name>" for
  the pooled side.
- **Per game:** two players rarely play the same number of games, so paint points and the play-context baskets and
  points are per game on both sides (the pooled side per player game). The 2PT and 3PT lines and zones are totals.
  A note under the studio says so, with each side's games.

### API: the position's shots, compact

- **Route:** `GET /api/seasons/:seasonCode/shots?phase=<code>&position=<Guard|Forward|Center>`. Without `position`,
  it returns every player's shots.
- **What it returns:** every field-goal attempt in that phase by players registered at that position in the season
  (any club).
- **Shape:**
  - `shots`: compact rows `[coordX, coordY, actionCode, minute, flags, personCode]`; `flags`: 1 fast break, 2 second
    chance, 4 off a turnover;
  - `players`: each shooter once, `{ personCode, name, club, games }`: the club TV code of his latest game in the phase,
    and his games played in the phase (box-score rows, as the player's own game log counts them).
- **Validation:** an invalid phase answers 400 `INVALID_PHASE`, a phase outside the season's format 404, and an
  unknown position 400 `INVALID_POSITION_FILTER`. This matches the existing routes.
- **Caching:** the client caches each season, phase and position once (React Query). Picking another player filters
  the loaded shots, with no new request. Production compresses JSON at Cloudflare.

### Data on the client

- **His shots:** the existing `players/:personKey/shots` request is the left side.
- **Position shots:** `getPositionShots` in `lib/api.js` and `usePositionShots` in `lib/shootingData.js`. The rows
  become the studio's shot objects. His own shots are left out of the other side and of the list.
- **States:**
  - **Loading:** "Loading <position> shots" while either request runs.
  - **No games:** as today.
  - **Error:** "Could not load this player's shot locations.", with a retry for both requests.
  - **Empty:** "No shot locations recorded for this player in this phase yet."

### Removed

The tab's own court, totals, zones and style layout and its Game segment select go. The studio's period filter covers
quarters; halves are no longer a choice.

Must not change: the team and game Shooting tabs, the studio's existing props and behaviour, other player tabs, the
existing API routes.

### Changes found during implement

- **Teammates version first:** built and shown first, then dropped in review ("comparing against teammates doesn't make
  sense"). Its per-game shot charts and `shotsByGame` were taken back out.
- **Whole position second:** the next version set him against every forward pooled. In review the user asked for one
  player picked from his position instead, so the pooled side became the picker's first choice and the default became
  the most similar player. The API added the shooters' names, clubs and games for the list and the per-game counts.
- **Studio changes (opt-in, the team and game tabs unaffected):**
  - `countScale` (default `[1, 1]`) on `ShootingStudio` and `PlayContextComparison` scales a side's paint points and
    play-context counts, shown with one decimal when scaled.
  - The player table is drawn only when `playerTableTeams` lists a side. No existing page passes an empty list.
- **Picker:** `players/ShotRivalPicker.jsx`, on the Comparisons page's `PickerPanel` and `PickerOption`. The choice is
  not in the URL, since the player page's tabs are not either.
- **Picker placement (review):** first above the studio (its list pushed the page down), then on the right of the
  studio title, where it stood apart. It now replaces the other side's name over its court: "vs Mantzoukas PAO ▾", so the
  side is changed where it is shown. This is an opt-in `sideHeadings` on `ShootingStudio`; its `tallHeading` keeps both
  sides' name rows as tall as the box, so their numbers line up. The list floats over the court, so nothing moves when it
  opens; it sits under the sticky filters (z-20) and the navigation when the page scrolls (it was above them first, a
  bug found in review). The box has a "vs" tag, the name, the club code and a turning arrow, as the Comparisons team picker. A press on
  it opens the list, also after Escape left it focused.
- **Client data:** `usePositionShots` unpacks the compact rows with a module-level `select`, so React Query unpacks
  them once per response rather than on every render.
- **Measured** (local database):
  - **E2025 regular season:** guards 22,798 shots from 139 players, 700 KB; forwards 17,526 shots; everyone
    48,864 shots, 1.5 MB.
  - **With the shooter list** (E2025 RS forwards): 113 players, 531 KB, 631 ms the first time. Every shooter has a
    name, a club and games.
  - **On the page** (Bonga, current season): the tab loads in about 1.2 s the first time. It suggests Papanikolaou,
    with 107 other forwards in the list.
- **Dev server:** the backend dev server stopped while the route was added (nodemon reload). Playwright started its
  own servers for the test runs. `/api/health` reported `"target":"local"`.
- **Tests:**
  - `player-shooting-games-layout.spec.js`: the Shooting part is rewritten. The mocks are his shots, plus the
    position's compact rows and shooters: one of his own, a player with his profile and fewer games, and a player of
    missed threes. It checks:
    - the suggested player first, with both sides' lines and the per-game paint points and note;
    - the list order, the "Most similar" tag, the details, and his own name left out;
    - Escape, search and Enter;
    - the open list staying under the sticky filters when scrolled;
    - the pooled side without his shot, with its players and player games;
    - no player filter or table;
    - the "All players" fallback, which sends no `position`;
    - the four states;
    - every width, with the list open at 320px.
  - `skeleton-loading.spec.js`: the player Shooting skeleton holds `players/:key/shots`, with the new label.

## Build steps

- [x] 1. **API.** Add `getPositionShots` (season-games) and the `/shots` route with its validation, with the shooters'
  names, clubs and games.
  Done when: the backend builds. On the local database `/api/seasons/E2025/shots?phase=RS&position=Forward` answers
  compact rows and the shooters. A bad position gives 400, and a phase outside the format gives 404.
- [x] 2. **Tab.** Rebuild `PlayerShootingSection` on the studio: his shots against the picked player of his position
  (the most similar first, or the pooled position), with the picker, per-game counts and the skeleton with both sides.
  Done when: lint passes. Bonga's tab shows his shots beside a suggested forward, the search finds another, and at
  320px nothing scrolls sideways.
- [x] 3. **Browser checks.** Update the Shooting part of `player-shooting-games-layout.spec.js` and the player
  Shooting skeleton test, as listed above.
  Done when: those specs and `responsive.spec.js` pass against the local database.

## Verify

- `npm run build` (root) and `cd frontend && npm run lint` pass.
- The specs above, after `/api/health` reports `"target":"local"`.
- By hand, Bonga's Shooting tab at 1440px: the suggested forward, a search for "vez" picks Vezenkov, and "All
  forwards" pools the position.
- At 390px the picker and the studio stack.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9876,"specSha256":"cd6b08b4b97cd56ee5856fe1a3cbdd40bdc7725c23b202a31761c405a748130f","branch":"refs/heads/fix/player-shooting-tab-as-a-studio-against-his-position","head":"5020c43c07985c358d10f847044f77b23ea67bcf","baseRef":"refs/heads/master","baseCommit":"5020c43c07985c358d10f847044f77b23ea67bcf","sourceTree":"d2e220f6c6672d86a100dc1106922c509d2d3635","absentOptional":[]} -->
