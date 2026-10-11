# Feature: Records page: metric groups, team games, pictures

**From build-plan:** feature 33d
**Build attempt:** 1
**Branch:** feature/records-page-metric-groups-team-games-pictures
**Status:** verified

## Goal

Put what 33c made available on the Records page (`/:season/records`): a strip for the metric group (Traditional, Advanced) with its metrics under it,
a fourth record type (team games) beside player seasons, player games and team seasons, and a picture for every holder (the player's headshot, the
club's crest). Alongside, a minimum number of games for the records that are ratings of a season in progress, so that a club or player is not at the
top of a list after a few games (asked for at review: "we probably should use minimum amount of games for some records"). That last part needs a small
addition to the records API (the rule is applied on the server, where the games are), so this item is the page plus that one addition.
Desktop first, as 33b: below `lg` the panels stack and the page must keep passing the overflow spec; its tablet and phone layouts are 31m.

Today (read from the code after 33b and 33c):

- **Page** (`RecordsPage.jsx`, `RecordParts.jsx`, `recordData.js`): three families (`type` = `player`, `game`, `team`), four metrics (`metric`), both in the
  address; the page maps its four metric keys onto the old single-game vocabulary through `ROUTE_METRICS`; crests for team rows come from a second request
  (the season's teams, `["teams", seasonCode]`); players show no picture.
- **API** (33c, all additive): `GET /api/seasons/:seasonCode/records/{player-seasons|single-games|team-seasons|team-games}?metric=<key>` answers
  `{ metric, label, group, records }` with `group` `traditional` or `advanced`, 50 rows highest first, and the picture fields on every row (`playerImageUrl`
  on player rows, `clubImageUrl` on all, a URL or `null`); team-games rows carry the opponent (`opponentClubCode`, `opponentName`, `opponentTvCode`). The
  catalogue (`backend/src/db/season-records.ts`): eleven traditional metrics on every kind (`pointsScored`, `totalRebounds`, `offensiveRebounds`,
  `defensiveRebounds`, `assists`, `steals`, `blocks`, `twoPointersMade`, `threePointersMade`, `freeThrowsMade`, `pir`); advanced ones `per` and `winShares`
  (player seasons, qualified players, read after the season's latest round), `gameScore` (single games), `offensiveRating` and `netRating` (team seasons,
  team games). The metric keys are the same on every route (the old `points`, `assistances`, `valuation` still answer on two of them).
- **The weakness this item closes** (found in 33c): the ratings and PER are read after a season's latest round, so in the season still being played a club's
  net rating or a qualified player's PER after a few games tops the list (a net rating of 27.6, a PER of 32). `app_season_player_stats_traditional.games_played`
  (players) and `app_team_round_stats.games_played` (clubs, `standingsStats`) hold the games.
- `records.spec.js` (9 mocked tests), `records-layout.spec.js` (3 live tests), `records-api.spec.js` (56 live tests) and the Records entries of
  `responsive.spec.js` cover the page and the API today.

## In scope

1. **Four record types.** The family strip becomes "Player seasons", "Player games", "Team seasons", "Team games", with descriptions ("The highest season
   totals by one player.", "The best single games by one player.", "The highest season totals by one club.", "The best single games by one club."). Their address
   values stay `player`, `game`, `team` and add `teamgame` (an unknown value still means the default), so a link made after 33b still opens the same view.
2. **Metric groups.** Under the family strip, a level-2 strip with the groups that family has ("Traditional", "Advanced") and, under it, a level-3 strip with that
   group's metrics (labels from the catalogue: Points, Rebounds, Offensive rebounds, ... PIR; PER, Win Shares, Game Score, Offensive rating, Net rating). The page
   keeps one static list of the families, groups and metrics (mirroring the API's catalogue). Choosing a group opens its first metric; changing the family keeps the
   metric when the new family has it and otherwise opens that family's first metric. `metric` stays in the address (any catalogue key; the default `pointsScored`
   is left out); the group follows from the metric, not the address. The page asks for the canonical keys, so `ROUTE_METRICS` goes.
3. **Pictures.** Every holder shows a picture from the row: the player's headshot (the shared `Avatar`, as Leaders does) for a player, with the club's crest beside the
   club name; the crest for a club. In the podium (large), the progression and the best of each season (small) and the Top 50. A missing picture is just
   absent. The second request for the season's teams is removed (the rows carry the crest).
4. **Team games.** The podium, progression, best of each season and Top 50 work for a team game: the club, "vs <opponent>" (the opponent's TV code or name), the date and
   the game link; a game a club played appears once per club that is in the top.
5. **A minimum number of games** (server, then page): the catalogue gets a `minGames` on the metrics that are ratings or rates of a season: PER, offensive rating and
   net rating on the season records; their queries keep only players or clubs with at least that many games (see the open questions for the number and which
   metrics), the answer carries `minGames` (a number, or `null` for the metrics without one), and rows of those metrics carry `gamesPlayed`. The page says it
   under the strips ("Counts players with at least 20 games." / "...clubs..."), from the answer's `minGames`. A season too young to have such rows contributes none.
6. **Keep what 33b built:** the address behaviour (history like Leaders), the previous rows staying while the next choice loads, the podium, progression, best of
   each season and Top 50, the PIR tip, the motion rules, the states (first load, error with Retry, no rows), and the overflow behaviour below `lg`.
7. **Specs.** `records.spec.js`, `records-layout.spec.js` and `records-api.spec.js` updated, with the Records entries of `responsive.spec.js` kept passing.

## Out of scope

- Percentage and per-100 metrics, negative records, any metric beyond the catalogue's sixteen; the ranking rule (top 50 across the loaded seasons); a rule for single-game
  records (a game's value needs no minimum); a change to the `qualified` rule that PER and Win Shares already use.
- The tablet and phone layouts (31m); other pages; changing the route names or the shape of any existing field (the API only grows).

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the narrow check after
each, then present one final review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Minimum games on the server.** In `season-records.ts` add `minGames` to the catalogue entries named above, apply it in the player-season advanced query
      (`seasonStatsTraditional.gamesPlayed`) and the team-season ratings query (`standingsStats.gamesPlayed`), add `gamesPlayed` to those rows and `minGames` to
      every record answer (null where none). Before changing code, take a throwaway baseline of the answers that must not change (every metric without a minimum) and compare after.
      Done when: `cd backend && npm run build` passes; every row of PER, offensive rating and net rating (season records) has `gamesPlayed` at least the answer's
      `minGames`; the answers of metrics without a minimum are identical to the baseline apart from the new `minGames: null`; `records-api.spec.js` is updated and passes.
- [x] 2. **Families, groups and metrics on the page.** Rebuild the strips (items 1 and 2): the four record types, the group strip and the metric strip from one static
      list, the address, the canonical metric keys, the minimum-games note; remove `ROUTE_METRICS` and the season-teams request. Measure first (a throwaway probe at 1280 and
      1024px) how the eleven-metric strip sits and decide between wrapping and scrolling before building.
      Done when: all four types open, each with its groups and metrics; every metric the page offers loads from the live API; a link such as
      `/2026/records?type=teamgame&metric=netRating` opens on that choice; the note shows for PER, offensive rating and net rating; Back steps through choices as on Leaders; the
      strips fit at 1280 and 1024px without a sideways page scroll.
- [x] 3. **Pictures and team games.** Items 3 and 4: the headshots and crests everywhere a holder appears, the team-games rows (opponent, date, game link) in the podium,
      progression, best of each season and Top 50.
      Done when: for a player type each podium card, progression row, best-of-season row and table row shows the headshot (when the row has one) and the club crest beside the club;
      for the team types the crest; for team games each row names its opponent and links to the game; a row with no picture shows none and nothing breaks.
- [x] 4. **Specs and gate.** Update the three specs per Testing and keep the Records entries of `responsive.spec.js` passing; run them with root `npm run build` and
      `cd frontend && npm run lint`.
      Done when they pass on the local database (`/api/health` says `local`).

## Files / areas

- Server: `backend/src/db/season-records.ts` (and `season-stats.ts` only if `getSeasonRecordRows` needs the games count; it does not for the traditional metrics).
- Page: `frontend/src/records/RecordsPage.jsx`, `RecordParts.jsx`, `recordData.js`; reuse `lib/TabStrip.jsx` (levels 1 to 3), `leaders/LeaderParts.jsx` (`Avatar`, `RankBadge`),
  `lib/format.js`.
- `frontend/e2e/records.spec.js`, `records-layout.spec.js`, `records-api.spec.js`, `responsive.spec.js` (only if its Records entry needs a change).

## Data / contracts

Additive on the server. Each `records/<kind>` answer gains `minGames: number | null`; rows of a metric with a minimum gain `gamesPlayed: number`; nothing else changes
(`metric`, `label`, `group`, `records`, every row field and the 50-row, highest-first rule stay). A player or club under the minimum is left out before the top 50 is cut, so
the list is still 50 rows when there are enough. The page reads `group` and `minGames` from the answer and keeps its own list of the families, groups and metrics (a metric not in the
API's catalogue would answer 400; `records-layout.spec.js` loads every metric the page offers). The address keeps `type` (`player`, `game`, `team`, `teamgame`) and `metric`, validated against fixed lists
on read. Picture URLs are the pipeline's, used as image sources and never as HTML; names and codes are rendered as React text.

## Testing

No unit test runner is configured and no `Verify` command is declared in `AGENTS.md`, so none was run while writing this spec. Browser tests run on the local database (`/api/health` must say
`local` first; when nothing listens on 3000 Playwright starts the backend, so check that one's health in the first test). `records-api.spec.js`: the minimum (every PER, offensive rating and net rating row
has `gamesPlayed` at least `minGames`; `minGames` null for the others) next to the present checks. `records.spec.js` (mocked): the four types by role, the groups and metrics per family, choosing a group
opens its first metric, a family change keeps a shared metric, the address for each choice including `teamgame` and a direct open, the note from `minGames`, the pictures on a podium card,
a row and the table (and none when the row has none), a team-games podium with its opponent and game link, and the existing states. `records-layout.spec.js` (live, 1280 and 1024px): for every family
and group the strips fit, no sideways page scroll, nothing outside its panel, the podium three across from 1024px, and every metric the page offers loads without the error state. Run only these
spec files with the Records entries of `responsive.spec.js` (`-g Records`); rerun a single failing test with `-g`, never the set. Final gate: root `npm run build` plus `cd frontend && npm run lint`.

## Notes for the AI

- Follow the user's rules: changes stay on the page being built (plus the one server addition above); shared components get opt-in props only. Desktop first; do not design the tablet or phone
  layout (31m), but do not leave the page overflowing. Never open the real `.env`.
- Reuse what 33b and 33c built (the strips, `keepPreviousData`, the panels, the catalogue). Read `blueprint/history/features/33b-records-desktop-polish.md` and `33c-records-data.md` for the details
  and the mistakes to avoid (the animation timing in the podium test, the `aria-label` on strips, the metric name vocabulary).
- Take any baseline with a throwaway probe before changing code and delete it afterwards. Match the surrounding code style and comment density. No AI attribution in commit messages (AGENTS.md).

## Open questions

Each has a recommended default, which the steps above build unless you say otherwise.

1. **The minimum.** *Recommended:* 20 games, for PER, offensive rating and net rating on the season records (a player's games, a club's games that season). A regular season is 34 games, so 20
   leaves a finished season whole and keeps a season in progress out until it is past the middle. Win Shares has none (it is a total that grows with games) and neither do the game records.
   Alternative: another number, or a share of the season's games.
2. **Which metrics have one.** *Recommended:* only PER, offensive rating and net rating. Alternative: none (leave the weakness), or every season advanced metric.
3. **Names.** *Recommended:* the four tabs "Player seasons", "Player games", "Team seasons", "Team games", and the groups "Traditional" and "Advanced". Alternative: your wording.
4. **The strips.** *Recommended:* family (level 1), group (level 2), metric (level 3); the metric strip wraps onto a second line on desktop if eleven do not fit, scrolls below `lg`. Alternative: the
   metrics as a select.

## Built

All four open questions were built with their recommended defaults (a minimum of 20 games for PER, offensive rating and net rating on the season records; the four type names; the group and metric strips).

- Server: `season-records.ts` has `minGames` on the three season ratings, applied in their queries (`seasonStatsTraditional.gamesPlayed` for PER, `standingsStats.gamesPlayed` for the clubs' ratings), `gamesPlayed`
  on those rows and `minGames` (a number or `null`) in every answer. Before the change the answers of eleven metric and kind pairs were saved and, after it, compared with a throwaway spec: the eight without a minimum
  are identical apart from `minGames: null`; for the three with one the season being played (2026-27) is gone and every remaining row has at least 27 games (PER) or 34 (clubs); the top PER is now 27.3 (2023-24) instead
  of 32.3 (2026-27), the top net rating 10.9 (2025-26) instead of 27.6. The spec and files were deleted.
- Page: `recordData.js` (the four families, the groups and metrics, `describeRecord`, the progression and best of each season), `RecordParts.jsx` (holders with headshots, crests and the second line, the panels) and
  `RecordsPage.jsx` (three strips, the address, the minimum-games note); `getTeamGameRecords` was added to `lib/api.js`; `ROUTE_METRICS` and the season-teams request are gone. The metric strip fits one row at 1280px and wraps
  to two rows at 1024px for the eleven traditional metrics (probe), so it wraps rather than scrolls on desktop.
- Evidence (local database, `/api/health` said `local`): `records.spec.js` (12 mocked tests), `records-layout.spec.js` (6 live tests, including every metric the page offers answering with records), `records-api.spec.js` (56 live tests,
  with the minimum) and the Records entries of `responsive.spec.js` (7) pass; root `npm run build` (with the backend `tsc` check) and `cd frontend && npm run lint` pass. Screenshots at 1280px and a probe at 1280 and 1024px
  (no sideways scroll, no console errors, pictures present) were checked.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":16214,"specSha256":"a4ab71cb511943c71a084dc3cae0310473fa74c635cff3279c550a9f9af49c29","branch":"refs/heads/feature/records-page-metric-groups-team-games-pictures","head":"45edc6065b80dc4f10f7b4a3eea8280d5ef43a49","baseRef":"refs/heads/master","baseCommit":"45edc6065b80dc4f10f7b4a3eea8280d5ef43a49","sourceTree":"d267cabd5d9d923b48eaea06398dc14d9c5aeb4e","absentOptional":[]} -->

## Completion evidence

- Browser tests on the local database (`/api/health` said `local`): `records.spec.js` (12 mocked tests), `records-layout.spec.js` (6 live tests, including every metric the page offers answering with records) and `records-api.spec.js` (56 live tests, with the minimum number of games) passed, and the Records entries of `responsive.spec.js` (7) passed.
- Root `npm run build` (with the backend `tsc` check) and `cd frontend && npm run lint` pass (rerun at completion). No `Verify` command is declared in `AGENTS.md`.
- Before the server change, 11 record answers were saved and compared afterwards with a throwaway spec (deleted): the 8 without a minimum are identical apart from `minGames: null`. A probe at 1280 and 1024px and screenshots at 1280px were checked.
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested.
