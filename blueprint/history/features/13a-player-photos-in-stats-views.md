# Feature: Player photos in stats views

**From build-plan:** feature 13a
**Build attempt:** 1
**Status:** verified
**Branch:** feature/player-photos-in-stats-views

## Goal

Show real player headshots (already returned by the season-stats and
box-score APIs, and trivially addable to the player game-log API) in the
statistics leaderboard, comparisons page, game box scores, and the player
detail page, closing part of the gap between our stats pages and reference
sites like ESPN/NBA.com, which lean on player photos for scannability.

## Design reference

None. No `prototypes/` mockups; small circular photo treatment sized to
match the existing crest sizing precedent in `TeamPage.jsx`
(`h-16 w-16` header, `h-10 w-10` cards) and reusing the app's existing
`.rank`/badge sizing conventions for row thumbnails.

## In scope

- `frontend/src/statistics/StatisticsPage.jsx`: a small circular photo
  before the player name in `PlayerLeaderboard`'s rows, from the
  already-returned `player.playerImageUrl` (confirmed live via
  `GET /seasons/E2025/season-stats`).
- `frontend/src/comparisons/ComparisonsPage.jsx`: a photo in
  `PlayerComparisonTable`'s header cells (above/beside each player's
  name), from `a?.playerImageUrl`/`b?.playerImageUrl` (the same
  `getLeaderStats` response `PlayerLeaderboard` already uses).
- `frontend/src/games/GameDetailPage.jsx`: a small circular photo before
  the player name in `PlayerStatsTable`'s rows, from the already-returned
  `player.headshotUrl` (confirmed live via
  `GET /seasons/E2025/games/:gameCode/box-score`, populated for all 24
  players on a real game).
- `backend/src/db/season-games.ts`: add `headshotUrl: gamePlayerStats.headshotUrl`
  to `getPlayerGameLog`'s select (the function already joins
  `gamePlayerStats`; `getBoxScore` already selects this exact column from
  the same table two functions below it - this was simply omitted, not a
  schema gap).
- `frontend/src/players/PlayerPage.jsx`: a photo next to the player's name
  in the page header, sourced from the now-available
  `gamesQuery.data.games[0]?.headshotUrl` once the game log has loaded.
  Shown only when available; the header renders normally without it
  otherwise (a player with no game log yet, or whose most recent game row
  has no headshot, shows no photo - this is a real, expected gap, not a
  bug to work around).
- Every `<img>` added here handles a broken/404 image URL gracefully
  (hides itself via `onError` rather than showing a broken-image icon).

## Out of scope

- `frontend/src/players/PlayersPage.jsx` (directory list) and
  `frontend/src/teams/TeamPage.jsx`'s roster: the canonical `people`
  identity table (`backend/src/db/season-schema.ts`) has no photo column
  at all, and neither of these views has an already-fetched query that
  carries one (unlike `PlayerPage.jsx`, which can borrow from its own
  game-log fetch). Adding a photo here would mean either a new join to an
  unrelated stats/box-score table as a guess, or a real schema/pipeline
  change - out of scope for this presentational feature.
  `frontend/src/comparisons/ComparisonsPage.jsx`'s `PlayerPicker` search
  results are the same case (`getSeasonPlayers` returns no image) and stay
  unchanged.
- Team crests (`13b`) and filter-control consolidation (`13c`) - separate
  build-plan sub-items.
- Any new CSS token or shared component. A plain `<img>` with Tailwind
  utility classes at each of the four call sites is enough; the four
  contexts differ enough in size/layout (row thumbnail vs. table-header
  portrait vs. page-header portrait) that one shared component would need
  as many size/layout props as it saves lines.
- Any change to `getLeaderStats`, `getBoxScore`, or their existing fields
  beyond the one added `headshotUrl` column in `getPlayerGameLog`.

## Build loop

Follow `workflow.stepReview: "feature"` (one review packet after all steps)
and `workflow.checkpointCommits: "disabled"` (no per-step commits; `/complete`
makes the single work commit).

## Build steps

- [x] 1. Add `headshotUrl: gamePlayerStats.headshotUrl` to
  `getPlayerGameLog`'s select in `backend/src/db/season-games.ts`, next to
  the existing `side: gamePlayerStats.side`. Done when:
  `cd backend && npm run build` passes and
  `GET /seasons/E2025/players/<any personKey with games>/games` includes a
  populated `headshotUrl` field on each game (verify with `curl`).
- [x] 2. Add the player photo to `StatisticsPage.jsx`'s `PlayerLeaderboard`
  rows: a `h-8 w-8 rounded-full object-cover` image before the player name
  link when `player.playerImageUrl` is present, hidden via `onError` on
  load failure. Done when: the player leaderboard for a phase with data
  shows a photo next to each player name, and switching to a metric/phase
  with no data still renders the existing empty state unchanged.
- [x] 3. Add player photos to `ComparisonsPage.jsx`'s
  `PlayerComparisonTable` header cells: a `h-12 w-12 rounded-full
  object-cover` image above each player's name in their `<th>`, from
  `a?.playerImageUrl`/`b?.playerImageUrl`, hidden via `onError` on load
  failure. Done when: comparing two players shows both players' photos in
  the table header, and the "select two players to compare" empty state
  still renders unchanged.
- [x] 4. Add the player photo to `GameDetailPage.jsx`'s `PlayerStatsTable`
  rows: a `h-8 w-8 rounded-full object-cover` image before the player name
  when `player.headshotUrl` is present, hidden via `onError` on load
  failure. Done when: a played game's box score shows a photo next to
  each player's name in both team tables, and the "Box score not
  available yet" empty state still renders unchanged.
- [x] 5. Add a best-effort photo to `PlayerPage.jsx`'s header: a
  `h-16 w-16 rounded-full object-cover` image next to the `<h1>` when
  `gamesQuery.data?.games[0]?.headshotUrl` is present once the game log
  query resolves, hidden via `onError` on load failure, absent otherwise
  (no layout shift or placeholder when there's no photo). Done when: a
  player with a game log shows their photo in the header, and a player
  with no game log yet (or whose page loads before the game log query
  resolves) shows the header without a photo, with no layout glitch.
- [x] 6. Verify both themes and run the smoke check. Toggle to
  `light-euroleague` and confirm the added photos read correctly (the
  circular crop and border/background read fine against both panel
  backgrounds) on the statistics, comparisons, game detail, and player
  pages. Run `cd frontend && npm run test:browser` and confirm the
  existing smoke test still passes unmodified. Done when: both themes look
  correct with photos visible on all four pages, and `npm run test:browser`
  passes.

## Files / areas

- `backend/src/db/season-games.ts`
- `frontend/src/statistics/StatisticsPage.jsx`
- `frontend/src/comparisons/ComparisonsPage.jsx`
- `frontend/src/games/GameDetailPage.jsx`
- `frontend/src/players/PlayerPage.jsx`

## Data / contracts

One backend addition: `getPlayerGameLog`'s response gains a `headshotUrl:
string | null` field per game entry, using the existing `gamePlayerStats.headshotUrl`
column already selected elsewhere (`getBoxScore`) from the same table this
function already joins. No new table, column, join, or migration. No
change to `getLeaderStats` or `getBoxScore`'s existing response shapes -
both already return the fields this feature displays
(`playerImageUrl`/`headshotUrl`).

## Testing

No test runner is configured for frontend logic, and this feature adds no
frontend logic - nothing here meets the unit test scope rule. The one
backend change is a static field addition to an existing Drizzle select
with no branching logic, so it doesn't need a focused test either;
`cd backend && npm run build` plus the live `curl` check in step 1 is the
appropriate evidence. `Browser tests` (`cd frontend && npm run test:browser`)
is configured; step 6 runs the existing smoke test as regression evidence.

## Notes for the AI

- Use `alt=""` on every added photo (decorative; the player's name is
  always rendered as adjacent text), matching the existing `crestUrl`
  treatment in `TeamPage.jsx`/`TeamsPage.jsx`.
- The `onError` handler should hide the image element itself (e.g. set
  `event.currentTarget.style.display = "none"`), not swap in a
  placeholder graphic - no placeholder asset exists in this project and
  adding one is out of scope.
- `PlayerPage.jsx`'s `gamesQuery` already exists and is fetched
  unconditionally once `playerQuery.isSuccess` - step 5 reads its already-
  fetched data, it does not add a new query.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8594,"specSha256":"105c9b20666ba35e18c44cc9821c01654218e973f0485963c07a288d32560d5f","branch":"refs/heads/feature/player-photos-in-stats-views","head":"7de0807c30a23fd55cce808e3cce56c63b371164","baseRef":"refs/heads/master","baseCommit":"7de0807c30a23fd55cce808e3cce56c63b371164","sourceTree":"13d6ce3b642d03ee94f32244253aff8835daae58","absentOptional":[]} -->
