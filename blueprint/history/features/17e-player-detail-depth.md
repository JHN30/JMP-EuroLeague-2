# Feature: Player detail depth

**From build-plan:** feature 17e
**Build attempt:** 1
**Branch:** feature/player-detail-depth
**Status:** verified

## Goal

Restructure the Player page around a four-tab set (Overview, Season by
season, Statistics, Games), adding player rankings cards, a percentile
radar, and a season-by-season story, per build-plan item 17e. The existing
Statistics and Games tabs (including the Games tab's already-lazy game log)
move under the new tab bar unchanged.

## Design reference

No `prototypes/` mockup exists for player detail. `UI-UX.md` §7.7 (Player
detail, lines 1164-1187) and §6.11 (`PlayerCareerStory`, lines 884-895) are
read for intent only: their route, file paths, and full tab set (Overview/
Career/Statistics/Shooting/Games) don't apply as literal instructions - a
Shooting tab is not named in build-plan item 17e's text and is left out (the
existing Statistics tab already surfaces shooting percentages in its
Advanced/Scoring groups). The rank-chip (`badge-primary badge-outline`),
percentile-bar, and radar conventions are read from the guideline text and
built with the daisyUI classes and Chart.js pattern already established in
this codebase.

## In scope

- **Ranking basis**: a full, unfiltered per-game leaderboard fetch for the
  currently selected phase (`getLeaderStats(seasonCode, { phase: phaseCode,
  mode: "perGame" })`, paginated the same way `TeamPage.jsx`'s
  `fetchTeamRosterStats` already paginates a leaderboard, but without a
  `clubCode` filter), used to compute this player's rank and percentile in
  six categories: Scoring (`pointsScored`), Valuation (`pir`), Rebounding
  (`totalRebounds`), Playmaking (`assists`), Steals (`steals`), and Shooting
  (`trueShootingPercentage`). `playerRanking` (a field already present on
  each stats group) was checked live and does not match the rank order for
  the category it's fetched under, so it is not used; rank is computed
  client-side by sorting the fetched leaderboard per category and locating
  this player's position, same technique `TeamPage.jsx`'s `TeamLeaders`
  already uses at team scope.
- **Overview tab** (new, becomes the default tab): six ranking cards, each
  showing the formatted value (`formatStatValue`), a `badge-primary
  badge-outline` rank chip ("#12"), a percentile bar, and a "12th of 248
  players with recorded stats" line (the denominator is the count of players
  with a non-null value in that category from the same fetch). Beneath the
  cards, a Chart.js radar chart across the same six categories plotted as
  percentiles (0-100 scale, rings at 25/50/75/100), following the existing
  local `useActiveTheme`/`themeColor` Chart.js theming pattern (no shared
  chart wrapper exists in this codebase; do not add one).
- **Season by season tab** (new, replaces a career timeline): one card per
  season from `getSeasons()` in which this player has a `people` row for
  this `personKey` (checked via `getPlayer(seasonCode, personKey)`,
  treating a 404 as "not in this season" - `people` rows are season-scoped
  in this schema), each card showing the season label, this player's
  team(s) that season (`getPlayerRegistrations`), and per-game mini-metrics
  (GP, PTS, REB, PIR) from `getPlayerSeasonStats(seasonCode, personKey, {
  mode: "perGame" })` with no `phase` (defaults to `"all"` server-side -
  the season's overall line, not one phase). Scoped to the archived seasons
  only (currently two); no competition selector or multi-year timeline
  chart, since there's nothing to timeline with two data points.
- **Statistics tab**: the existing `SeasonStatsSection` (phase/mode
  sub-tabs, four stat groups) moves under the new tab bar unchanged.
- **Games tab**: the existing `GameLogSection` moves under the new tab bar
  unchanged; it already loads only when this tab is opened
  (`enabled: ... && section === "games"`), already satisfying the build-plan
  clause about the game log.
- Source the header portrait from the Overview ranking fetch's
  `playerImageUrl` (already returned per player on every `getLeaderStats`
  row) as well as the existing `gamesQuery` source, so the header portrait
  no longer depends on visiting the Games tab first.

## Out of scope

- A Shooting tab - not named in build-plan item 17e's text; shooting
  percentages already live in the existing Statistics tab's Advanced/
  Scoring groups.
- Any backend change - every field this feature renders is already returned
  by `getLeaderStats`, `getPlayer`, `getPlayerRegistrations`, and
  `getPlayerSeasonStats`.
- A minimum-games qualification threshold for rankings - that's build-plan
  item 17f's (Leaderboard depth) concern, not this one; ranking here always
  reflects the full per-game leaderboard for the selected phase.
- Cross-competition or pre-archive career history - this app holds only the
  two archived EuroLeague seasons already established by prior features.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (Continuous
Mode self-reviews each step) and `workflow.checkpointCommits` is `disabled`.

## Build steps

- [x] 1. Add the league-wide per-game leaderboard fetch (paginated, no
      `clubCode` filter, gated on `section === "overview"`) and build the
      Overview tab: six ranking cards (value, rank chip, percentile bar,
      "Nth of M" line) and the percentile radar chart. Insert Overview as
      the new first/default tab. Wire the header portrait to prefer the
      ranking fetch's `playerImageUrl` for this player, falling back to the
      existing `gamesQuery` source.
      **Done when:** the six ranking cards show correct values, ranks, and
      totals for a known player/phase (spot-checked by counting the raw
      leaderboard response), the radar renders six axes with plausible
      percentiles, the header portrait shows immediately on page load for a
      player with a photo, verified in the running app; `npm run build`
      passes.
- [x] 2. Add the Season by season tab: one card per archived season this
      player appears in, with team(s) and per-game mini-metrics; move the
      existing Statistics and Games tab content under the restructured tab
      bar unchanged.
      **Done when:** a player who played in both archived seasons shows two
      cards with correct team/GP/PTS/REB/PIR values (spot-checked against
      each season's own player page), a player in only one season shows one
      card, the Statistics and Games tabs render exactly as before this
      feature, verified in the running app; `npm run build` passes.

## Files / areas

- `frontend/src/players/PlayerPage.jsx` - all tab content (kept in this
  single file, matching this codebase's established per-page convention).
- `frontend/src/lib/api.js` - reused `getLeaderStats`, `getPlayer`,
  `getPlayerRegistrations`, `getPlayerSeasonStats`, `getSeasons`; no
  changes expected.

## Data / contracts

No backend change. Reused response shapes:

- `GET /seasons/:seasonCode/season-stats?phase=&mode=perGame&limit=&offset=`
  -> `{ players: StatsEntry[], pagination: { hasMore, total } }`, each
  `StatsEntry` carrying `personKey`, `playerImageUrl`, and
  `traditional.{pointsScored,pir,totalRebounds,assists,steals}` /
  `advanced.trueShootingPercentage` - the ranking/radar source.
- `GET /seasons/:seasonCode/players/:personKey` -> `{ player }`; 404
  `PLAYER_NOT_FOUND` used to detect "not in this season" for the season-by-
  season tab.
- `GET /seasons/:seasonCode/players/:personKey/registrations` -> `{
  registrations }` - per-season team card content.
- `GET /seasons/:seasonCode/players/:personKey/games?phase=all&mode=perGame`
  -> `{ phase, mode, players: [entry] }` - per-season mini-metrics
  (`traditional.{gamesPlayed,pointsScored,totalRebounds,pir}`).
- `GET /seasons` -> `{ seasons }` - the season list to iterate for the
  season-by-season tab.

## Testing

- No unit test runner configured; `npm run build` is Verify for each step,
  plus direct browser verification (rank/percentile values spot-checked
  against raw API responses, radar rendering, season cards) since there's
  no browser-test coverage for this page.
- Verify against a player who played meaningful minutes in the selected
  phase (non-empty rankings) and a player with no recorded stats in a phase
  (empty-state rankings/radar), plus a player present in only one archived
  season for the season-by-season empty/partial case.

## Notes for the AI

- Reuse the Chart.js theming pattern local to each chart file
  (`useActiveTheme`/`themeColor`, destroy-on-cleanup `useEffect`,
  `role="img"` canvas) rather than a shared wrapper - confirmed still the
  only pattern in this codebase across features 17b-17d.
- Percentile formula: `((total - rank) / (total - 1)) * 100`, rounded,
  computed only over players with a non-null value in that category (`total`
  is that filtered count, matching the "N of M players with recorded stats"
  denominator).
- Reuse `TeamPage.jsx`'s existing full-leaderboard pagination pattern
  (`fetchTeamRosterStats`) as the template for the new unfiltered
  leaderboard fetch - same page size and page-count cap, just without the
  `clubCode` filter.
- Keep `SeasonStatsSection` and `GameLogSection` byte-for-byte unchanged
  apart from relocation under the new tab bar.

## Open questions

None - every field this feature renders is already returned by existing
endpoints, and the one ranking-data ambiguity (`playerRanking` vs. computed
rank) was resolved by checking the live data before writing this spec.
