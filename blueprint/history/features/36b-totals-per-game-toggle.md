# Feature: Totals / Per game toggle

**From build-plan:** feature 36b
**Build attempt:** 1
**Status:** verified
**Branch:** feature/totals-per-game-toggle

## Goal

On `/:season/records`, let player-season and team-season records for the traditional metrics be read per game as
well as in totals, so seasons of different lengths (about 20 games in the early 2000s, 34 plus playoffs now) can be
compared. The choice lives in the address (`per=game`); totals stay the default.

## In scope

- **API:** the `player-seasons` and `team-seasons` records routes accept `per=game` (or `per=total`, the default when
  absent) for the traditional metrics. The reply keeps its shape (`metric`, `label`, `group`, `minGames`, `records`,
  `bySeason`, `progression`) and adds `per` (`"total"` or `"game"`). With `per=game`:
  - `label` is the metric's label plus " per game" ("Points per game").
  - **Player seasons:** the per-game season statistics (`mode = 'perGame'`, phase `all`) of qualified players
    (`qualified = true`), as the Leaders boards rank them, who also have at least the season's scaled minimum
    (`seasonMinGames(season, 20)`, as for the PER records; user review: the league's own minimum, 4 games early in
    2026-27, was too low). Each row also carries `gamesPlayed` and `minGames` (that scaled minimum); the reply's
    `minGames` is 20.
  - **Team seasons:** the season total of the club's game totals divided by its games played (both from the same
    played games as the totals), only for clubs with at least the season's scaled minimum (`seasonMinGames(season, 20)`,
    the rule the season ratings use). Each row carries `gamesPlayed` and `minGames`; the reply's `minGames` is 20.
  - `bySeason` and `progression` come from the same per-game rows.
- **Errors (400, the existing error shape):** `per` other than `game` or `total` answers `INVALID_RECORD_PER`
  ("Invalid record per"); `per=game` on `single-games`, `team-games` or an advanced metric answers
  `RECORD_PER_NOT_AVAILABLE` ("Per game is not available for this record"). The response cache keys by the full URL,
  so each choice is cached on its own with no cache change.
- **Page:**
  - A Totals / Per game choice for Player seasons and Team seasons with a traditional metric, reusing `ModeTabs`
    (a strip from `sm`) and `ModeSelect` (a select below `sm`) from `frontend/src/leaders/LeaderParts.jsx`. It sits
    under the metric strip (from `sm`) and with the metric select (below `sm`). Hidden for Player games, Team games
    and the Advanced group.
  - The address carries `per=game`; Totals leaves it out (the default rule of `setAddress`). Choosing a record type or
    metric group that has no per-game view removes `per`; a choice that still supports it keeps it. A `per` value the
    page does not know, or `per=game` where it is not available, is read as Totals and not sent.
  - The query key and request include the choice, so Totals and Per game load and cache separately, and the rows stay
    on screen while the other loads (the existing placeholder behavior).
  - Per-game values show one decimal (`formatDecimal(value, 1)`), totals stay whole numbers. The podium, timeline
    (summary, tooltip, gains, list) and Top 50 use the reply's `label` and these values unchanged otherwise.
  - The note above the podium, per game: the existing sentence with the reply's `minGames` ("Counts players (or clubs)
    with at least 20 games of a 34-game regular season, or the same share of a shorter or longer one.").
- **States:** loading, error and "No records are available for this metric." stay as they are.

## Out of scope

- The record book landing (36c).
- Per game for game records (a single game is already one game) or for advanced metrics (already rates).
- Per-36, per-40 or per-100 figures; career or all-season leaderboards.
- Changes to the Leaders page or to `ModeTabs`/`ModeSelect` themselves.

## Build loop

`workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`: build both steps, then one review packet.
`/complete` makes the commit.

## Build steps

- [x] 1. **API per game** - the `per` option through `season-records.ts` (the player per-game rows from
  `season-stats.ts`, the team totals divided by games with the minimum), its validation and errors in
  `routes/seasons.ts`, and `records-api.spec.js` coverage: every traditional metric of both season kinds with
  `per=game` answers 200 with `per: "game"`, a label ending " per game", rows highest first with
  `gamesPlayed >= minGames`, one `bySeason` entry per season oldest first and a strictly increasing `progression`
  ending at `records[0]`; `per=total` matches no `per`; each 400 case answers its code.
  Done when: `cd backend && npm run build` passes and on the local backend
  `/api/seasons/2026/records/player-seasons?metric=pointsScored&per=game` returns decimal values with `bySeason`
  from 2000-01, and the records-api spec passes.
- [x] 2. **Page toggle** - `api.js` fetchers pass `per`; `RecordsPage.jsx` reads, writes and clears `per` and shows the
  toggle and note; `recordData.js` formats per-game values with one decimal. `records.spec.js`: the toggle shows for
  Player seasons and Team seasons on a traditional metric and not for the game types or Advanced; choosing Per game
  writes `per=game`, requests it and shows the per-game label and note; switching to Player games drops `per`;
  `/2026/records?per=bogus` reads as Totals. `records-layout.spec.js`: the per-game view fits at every width.
  Done when: on `/2026/records?per=game` the podium, timeline and Top 50 show per-game values with one decimal;
  `npm run lint` and `npm run build` pass; `npx playwright test records.spec.js records-api.spec.js
  records-layout.spec.js responsive.spec.js` passes with `/api/health` reporting `"target":"local"`.

## Files / areas

- `backend/src/db/season-records.ts` - the `per` option for player and team seasons.
- `backend/src/db/season-stats.ts` - `getSeasonRecordRows` reads the per-game qualified rows when asked.
- `backend/src/routes/seasons.ts` - the records route reads and validates `per`.
- `frontend/src/lib/api.js` - the four records fetchers (the season ones pass `per`).
- `frontend/src/records/RecordsPage.jsx`, `recordData.js`.
- `frontend/src/leaders/LeaderParts.jsx` - `ModeTabs`, `ModeSelect` reused as they are.
- `frontend/e2e/records-api.spec.js`, `records.spec.js`, `records-layout.spec.js`.

## Data / contracts

- Query: `per` is optional; `game` or `total`; any other value is a 400. `per=game` is valid only for `player-seasons`
  and `team-seasons` with a traditional metric.
- Reply: adds `per: "total" | "game"`; `label` gains " per game" with `per=game`. Rows keep the existing shape
  (`value` string, `numericValue` number); per-game rows add `gamesPlayed` (integer) and `minGames` (integer).
- Player per-game source: `app_season_player_stats_traditional` rows with `mode = 'perGame'`, `phase_code = 'all'`,
  `qualified = true`, `games_played >= seasonMinGames(season, 20)`. Team per-game value: `sum(metric) / count(games)` over the club's played games with
  `stats_kind = 'total'`, as the totals query sums them.

## Testing

- No unit test runner is configured; the API is covered by `records-api.spec.js` on the live local backend and the
  page by `records.spec.js` on mocked replies, as in step 1 and 2.
- Browser tests only against the local target (`/api/health` reports `"target":"local"`).

## Notes for the AI

- Follow the existing `best()` path so `records`, `bySeason` and `progression` come out the same way for per game.
- `ModeTabs` uses the keys `perGame` and `accumulated` and lists Per game first; map them to the address
  (`per=game`, no `per`) in `RecordsPage.jsx` rather than changing the shared component.
- Leaders writes its choice as `mode=accumulated`; the approved plan names `per=game` for Records, so the two pages
  use different address words.
- No em dashes in copy or comments. Keep comments to the why.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7991,"specSha256":"480299542c09bbc1e1cd729d067f665c239fa1e46e58bbdc6478af4167b2f08b","branch":"refs/heads/feature/totals-per-game-toggle","head":"47f5b773953e2c90225c8c29a07f8244c7654515","baseRef":"refs/heads/master","baseCommit":"47f5b773953e2c90225c8c29a07f8244c7654515","sourceTree":"3b87edfd5b535cf7c626f2c1b735c6c4eb19c45d","absentOptional":[]} -->
