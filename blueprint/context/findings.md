# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-03 [P3] open - Career routes start up to ~135 queries at once on a 10-connection pool with no statement timeout

**File:** backend/src/routes/seasons.ts:1214, :1250; backend/src/db/client.ts:5
**Found:** 2026-11-18 by /audit (scope: full; lens: performance)
**Why it matters:** `/players/:personKey/career` runs 5 queries per season the player played (up to 27 seasons) all in parallel; the pool has pg's default 10 connections, so one cold career request queues every other request behind it. No `statement_timeout` bounds a slow query. Answers are cached afterwards, so this hits only cold requests.
**Suggested fix:** Set `max` and `statement_timeout` on the Pool; later, batch the per-season queries with `season_code = ANY(...)`.
**Resolution:**

### F-04 [P3] open - HEAD requests skip the response cache and request sharing

**File:** backend/src/response-cache.ts:78
**Found:** 2026-11-18 by /audit (scope: full; lens: performance)
**Why it matters:** Express runs GET handlers for HEAD, but the cache only handles GET, so every HEAD runs the full route against the database.
**Suggested fix:** Treat HEAD like GET in `responseCache`.
**Resolution:**

### F-05 [P3] open - The leaders `games` filter accepts inherited property names

**File:** backend/src/routes/seasons.ts:525
**Found:** 2026-11-18 by /audit (scope: full; lens: security)
**Why it matters:** `games in LEADER_GAME_SHARES` is true for `constructor` or `toString`, so `?games=constructor` returns a 200 with no players instead of a 400. Harmless, but wrong.
**Suggested fix:** `Object.hasOwn(LEADER_GAME_SHARES, games)`.
**Resolution:**

### F-06 [P3] open - Player search does not escape `%` and `_`

**File:** backend/src/db/season-identities.ts:272
**Found:** 2026-11-18 by /audit (scope: full; lens: security)
**Why it matters:** The search text goes into an ILIKE pattern unescaped, so `_` or `%` match any character. Values are still bound parameters, so this is not injection.
**Suggested fix:** Escape `\`, `%` and `_` before building the pattern.
**Resolution:**

### F-07 [P3] open - A player page waits for the first leaderboard page before fetching the rest

**File:** frontend/src/players/leagueLeaderboard.js:14
**Found:** 2026-11-18 by /audit (scope: full; lens: performance)
**Why it matters:** Ranking one player downloads up to 500 players in two sequential round trips. The query is shared with the Leaders page, so it is often cached already.
**Suggested fix:** Leave as is unless the player page feels slow; a per-player ranks endpoint would remove it.
**Resolution:**

### F-09 [P3] open - The season leaders' `stats` list is part of the cache key in any order

**File:** backend/src/routes/seasons.ts:642
**Found:** 2026-11-18 by /audit independent (scope: current; lens: performance)
**Why it matters:** `/season-stats/leaders?stats=a,b` and `stats=b,a` give the same leaders but are separate cache entries, and each runs one `getSeasonStats` query per stat (not memoised). With about 40 sortable fields and up to 10 per list, the orderings are effectively unlimited, so a caller can keep this route missing both caches (reproduced locally: both orders answer 200 `X-Cache: MISS`). Each answer is small and the cache is now capped at 100 MB, so the cost is database queries (up to 10 per request), not memory or large egress. Residual of F-01's "reordered `stats=` lists".
**Suggested fix:** Either refuse a `stats` list that is not in a fixed order (sorted, or the order of `SORTABLE_STATS_FIELDS`) with a 400 and have `getSeasonLeaders` in frontend/src/lib/api.js send it sorted, or sort the names when building the key in `responseCache`. Current requirement lost: None.
**Resolution:**

### F-10 [P3] unverified - Team stage shots include games the page does not count as played

**File:** backend/src/db/season-games.ts (`getTeamShots`)
**Found:** 2026-11-18 by /audit (scope: current; lens: all)
**Why it matters:** The old loader fetched shots only for games the page counts as played (`played` and both scores set). `getTeamShots` takes every game of the stage that has shot rows, as `getPlayerShots` already does. If the live data ever holds shots for a game in progress, the team courts would include them, while the loading label's game count and the free-throw totals would not. The local data shows none: 522 unplayed 2026 games, no shots, and the counts match for all 20 teams.
**Suggested fix:** If live games can carry shots, add `eq(games.played, true)` to `getTeamShots` (and to `getPlayerShots` for the player tab).
**Resolution:**
