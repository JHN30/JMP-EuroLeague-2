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
**Resolution:** Repaired on fix/small-api-hardening-and-loading-fixes: both career routes read two seasons at a time (`forEachSeasonInTurn`, at most 10 queries in flight); answers byte-identical to master for a 14-season career. The statement timeout is not part of this fix: whether Neon's pooled connection accepts it could not be checked locally. Awaiting review.
2026-11-18 independent review of e5b687c..740edfa: the fan-out part is repaired (seasons.ts:1213-1221, at most 2 seasons in flight, results in season order; a failing season still rejects the route, and later chunks are no longer started). Back to `open` because the finding's title and first suggested fix are only partly done: client.ts:5 still sets neither `max` nor `statement_timeout`, so one slow query is still unbounded. Close it once the timeout is added, or narrow/accept it by the user's decision.
2026-11-18 independent review of e5b687c..745105a: still `open` (P3, does not block). seasons.ts:1215-1221 has not changed and remains correct. client.ts:5-10 still sets neither `max` nor `statement_timeout`.

### F-10 [P3] unverified - Team stage shots include games the page does not count as played

**File:** backend/src/db/season-games.ts (`getTeamShots`)
**Found:** 2026-11-18 by /audit (scope: current; lens: all)
**Why it matters:** The old loader fetched shots only for games the page counts as played (`played` and both scores set). `getTeamShots` takes every game of the stage that has shot rows, as `getPlayerShots` already does. If the live data ever holds shots for a game in progress, the team courts would include them, while the loading label's game count and the free-throw totals would not. The local data shows none: 522 unplayed 2026 games, no shots, and the counts match for all 20 teams.
**Suggested fix:** If live games can carry shots, add `eq(games.played, true)` to `getTeamShots` (and to `getPlayerShots` for the player tab).
**Resolution:**

### F-12 [P3] open - A NUL byte in the player search answers 503 "Database unavailable"

**File:** backend/src/routes/seasons.ts:114 (`requestedSearch`)
**Found:** 2026-11-18 by /audit independent (scope: current; lens: security)
**Why it matters:** PostgreSQL rejects a `\0` in a text parameter, so `/players?search=ab%00c` reaches the database, fails, and gets 503 `DATABASE_UNAVAILABLE`. That should be a 400. The search reports a client error as an outage and can add server error logs or alerts. This predates the F-06 repair, which does not touch it. It is not injection: the value is still a bound parameter.
**Suggested fix:** In `requestedSearch`, answer 400 `INVALID_QUERY` when the text contains a control character, for example `/[\u0000-\u001f]/`. Current requirement lost: None.
**Resolution:**
