# Feature: Richer result cards

**From build-plan:** feature 40b
**Build attempt:** 1
**Type:** Feature
**Status:** verified
**Branch:** feature/richer-result-cards

## Goal

On `/:season/games`, a finished game's card shows each team's top scorer (photo, name and points) and an overtime marker
(OT, 2OT). Top scorers and the overtime count come from an opt-in addition to the games list; a
game without a box score shows no scorer, never an invented one.

## In scope

- **API, opt-in.** `GET /seasons/:seasonCode/games` takes `cards=true`. With it, each game also carries:
  - `topScorers: { local: TopScorer | null, road: TopScorer | null }`, where `TopScorer` is
    `{ personKey, personName, headshotUrl, points }`: the player of that side with the most points in
    `app_game_player_stats`. Ties go to the higher `valuation` (PIR), then the name (A to Z). Players with no recorded
    points are skipped; a side with no such player, or a game not played, is `null`.
  - `overtimes: number | null`: the number of periods after the fourth in `app_game_period_scores` (0 for a regulation
    game), `null` when the game has no period scores.
  - Without `cards`, the response is byte-for-byte what it is today, so Home, Compare, Leaders, Postseason, the season
    Overview and every other caller are unchanged. Any `cards` value other than `true` is a 400 `INVALID_CARDS`, like
    the route's other parameters.
  - Both come from one batched query each over the page's game codes, not one query per game.
- **Games page.** `FixturesPage` asks for `cards=true` on the round and stage requests only. On a played game's card:
  - under each club, its top scorer: a small round photo (silhouette when there is none), the name as it reads in a
    sentence (`displayName`, shortened to the surname where the column is too narrow), and the points ("24 PTS");
  - in the centre, the status line reads "Final · OT" or "Final · 2OT" when the game went to overtime (also in the
    score's accessible label, "after OT").
  - The winning margin, planned with this item, was dropped at review: the score already shows it.
- **Missing data shows nothing.** No scorer row for a side without one, and no OT marker when `overtimes` is 0 or `null`. Scheduled and cancelled cards are unchanged.
- The card stays a single link to the game; the scorer is plain text inside it (no nested link).
- Every season format and 320, 390, 768 and 1024px, with no sideways scroll and no clipped card content.

## Out of scope

- Upcoming-game cards: form and venue (40c).
- Top scorers or overtime on any other page, and any change to the single-game or box-score endpoints.
- New tables, columns or pipeline changes.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then one review packet for the whole feature.
`workflow.checkpointCommits` is `disabled`: no step commits; `/complete` makes the one feature commit.

## Build steps

- [x] 1. **`cards=true` on the games list.** In `backend/src/routes/seasons.ts`, validate `cards` (absent or `"true"`,
  otherwise 400 `INVALID_CARDS`) and pass it to `getGames`. In `backend/src/db/season-games.ts`, when it is set, read the
  top scorer per game and side from `gamePlayerStats` and the overtime count from `gamePeriodScores` for the page's game
  codes (one query each, scoped by competition and season), and add `topScorers` and `overtimes` to each game. Extend
  the `Game` type with the two optional fields.
  Done when: `cd backend && npm run build` passes; on the local dev backend a played round with `cards=true` returns
  both fields (a known overtime game gives `overtimes >= 1`), a scheduled game gives `topScorers` of two `null`s, a
  request without `cards` returns no new fields, and `cards=yes` returns 400 `INVALID_CARDS`.
- [x] 2. **Scorers and OT on the cards.** Pass `cards: true` through `getSeasonGames` in
  `frontend/src/lib/api.js` (as a new optional option) from the round and stage queries in
  `frontend/src/games/FixturesPage.jsx`, and add the option to their query keys. In `frontend/src/games/GameCard.jsx`
  render the top scorer under each club, and the OT marker in the status line, with the
  styles beside the `.fixture-*` rules in `frontend/src/index.css` (including the below-640px block). Reuse
  `displayName` and the silhouette from `lib/PlayerPortrait.jsx`.
  Done when: in the running app a played round shows both scorers and OT on an overtime game; a forfeit
  shows no scorer; scheduled rounds look as before; nothing overflows at 320px; `cd frontend && npm run
  lint` passes.
- [x] 3. **Browser checks.** In `frontend/e2e/games-layout.spec.js`: the API cases from step 1 (through `request`), a
  mocked round covering an overtime game, a double-overtime game, a forfeit and a side with no scorer, and the existing
  compact/height checks updated for the taller played cards (new limits set from the measured heights, still checked at
  320, 390, 639, 640, 768 and 1024px).
  Done when: `cd frontend && npx playwright test games-layout.spec.js` passes against the local database.

## Files / areas

- `backend/src/routes/seasons.ts` - the `cards` parameter on `/:seasonCode/games`.
- `backend/src/db/season-games.ts` - `getGames`, the `Game` type, and the two batched reads.
- `frontend/src/lib/api.js` - `getSeasonGames` gains a `cards` option.
- `frontend/src/games/FixturesPage.jsx` - the round and stage queries ask for `cards`.
- `frontend/src/games/GameCard.jsx` - scorer rows and the OT marker.
- `frontend/src/index.css` - the new card parts, desktop and below 640px.
- `frontend/e2e/games-layout.spec.js` - API and layout checks.

## Data / contracts

- Additive and opt-in public API change; existing responses unchanged without `cards=true`. The response cache keys
  by full URL, so the two forms are cached separately.
- `personName` is the feed's text ("LAST, FIRST") and `headshotUrl` may be `null`; both are rendered as text and an image
  `src`, never as HTML.
- `points` is a whole number from the box score; a side whose players all have `null` points has no scorer.
- `overtimes` counts distinct `period_number` values above 4 for the game (either side).

## Testing

- No unit test command exists; logic is covered through the API checks and the browser spec.
- Browser tests: `games-layout.spec.js` only (the page's own spec), after `/api/health` reports `"target":"local"`.
- `npm run build` (root) and `cd frontend && npm run lint` must pass.

## Notes for the AI

- Keep the Game Detail page, Home and every other `getSeasonGames` caller untouched.
- Do not put a `<Link>` or `<a>` inside the card; it is already one link.
- Ties and missing values follow the rules above; never fall back to 0 points or a guessed player.
- Scorer names may be long: truncate with a `title` holding the full name, never let them widen the team column.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6958,"specSha256":"7b73b077ca90bc954f7df59a0f2781c9e5ee2b8b8ca8d6fda05dd411a6fed53e","branch":"refs/heads/feature/richer-result-cards","head":"d2c10bc35f215d30a5b755b699a3d674d0974e0f","baseRef":"refs/heads/master","baseCommit":"d2c10bc35f215d30a5b755b699a3d674d0974e0f","sourceTree":"807150d2b08a212e94ad326a35349226bf3cf16f","absentOptional":[]} -->
