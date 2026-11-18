# Fix: Bound how long one database query can run

**Type:** Fix
**Status:** verified
**Branch:** fix/bound-how-long-one-database-query-can-run
**Fixes:** F-03

## The problem

`backend/src/db/client.ts` creates the `pg` Pool without a time limit on queries. A query that hangs (a slow plan, a
lock, a Neon compute that stalls) keeps its connection busy and its request waiting with no end. The pool has pg's
default of 10 connections, so a handful of stuck queries queue every other request behind them.

The other half of F-03 is already repaired: since 6f73e3b both career routes read two seasons at a time
(`forEachSeasonInTurn`), so one career request has at most 10 queries running at once. The review left F-03 `open`
only because there is still no time limit.

Production connects through Neon's **pooled** host (`-pooler`, PgBouncer in transaction mode; the user confirmed
this on 2026-11-18). That rules out pg's `statement_timeout` option and `options=-c statement_timeout=...`. Both are
sent as connection startup parameters, and the pooler may refuse an unknown one, which would make every connection
fail on the live site. A `SET statement_timeout` per connection doesn't work either, because the pooler hands each
transaction to whichever server connection is free.

## The fix

- Give the Pool pg's client-side `query_timeout` of **15 seconds** (`QUERY_TIMEOUT_MS`, with a one-line reason
  comment). It sends nothing to the server, so it works the same on the pooled Neon host and on the local copy.
- When the time runs out, pg rejects the query with "Query read timeout" and `pool.query` releases that client with
  the error, so the pool closes it and stops counting it. The server side runs on until the query tries to send its
  result to the closed connection, so a stuck query still uses the database for a while, but it no longer holds a
  pool slot or a request. The rejection
  goes through the existing `catalogRead` path to the existing 503 `DATABASE_UNAVAILABLE` answer, and the response
  cache already never stores errors, so the next request tries again. No new error path is needed.
- Set `max: 10` on the Pool explicitly, with a comment saying it is pg's default and that `forEachSeasonInTurn`
  keeps one career request within it. This makes the pool size visible next to the timeout. It does not change
  behavior.
- 15 seconds is far above any normal answer (a cold career request is about 1-2 s) and still allows for Neon waking a
  suspended compute during the first query through the pooler.

Must not break: every existing route and its answers, the 503 for a real outage, `connectionTimeoutMillis`, the
local `search_path` option, and `/api/health` (which doesn't touch the database).

Not in this fix: a server-side limit that also stops the query inside Postgres. On the pooled host it would be a
role setting (`ALTER ROLE ... SET statement_timeout`). The user decided on 2026-11-18 not to set it, because the data
pipeline most likely uses the same role and would have its long loads cut off. The client-side limit doesn't depend on
it.

## Build steps

- [x] **Step 1 - add the query time limit.** In `backend/src/db/client.ts`, add `max: 10` and
  `query_timeout: QUERY_TIMEOUT_MS` (15 000) to the Pool, each with a short reason comment.
  **Done when:** `cd backend && npm run build` passes. Against the local database, a scratch script (in the
  scratchpad, not the repo) that imports the built pool and runs `select pg_sleep(20)` is rejected after about 15 s
  with "Query read timeout". In the same script, a following `select 1` succeeds, and the pool's `totalCount` shows
  the timed-out client was removed.

## Verify

- `cd backend && npm run build` (TypeScript check).
- The scratch `pg_sleep(20)` script from Step 1: rejected at about 15 s, and the pool recovers.
- Backend smoke browser set, against the local database (`/api/health` must report `"target":"local"`):
  `npx playwright test api-response-cache.spec.js api-security-headers.spec.js`. Normal queries are unaffected and
  the API answers as before.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4069,"specSha256":"3fa9ad364db3ec569000e3c98a833f8eee1d51c4f4c80f32e2d620de25963ec3","branch":"refs/heads/fix/bound-how-long-one-database-query-can-run","head":"8bb99b02fbb8387edb3122e0bbd78f1a4586e44b","baseRef":"refs/heads/master","baseCommit":"8bb99b02fbb8387edb3122e0bbd78f1a4586e44b","sourceTree":"bbc7d46363036134f0f64690c0dc70aa50acb91c","absentOptional":[]} -->

## Findings

### bound-how-long-one-database-query-can-run/F-03 [P3] closed - Career routes start up to ~135 queries at once on a 10-connection pool with no statement timeout

**File:** backend/src/routes/seasons.ts:1214, :1250; backend/src/db/client.ts:5
**Found:** 2026-11-18 by /audit (scope: full; lens: performance)
**Why it matters:** `/players/:personKey/career` runs 5 queries per season the player played (up to 27 seasons) all in parallel; the pool has pg's default 10 connections, so one cold career request queues every other request behind it. No `statement_timeout` bounds a slow query. Answers are cached afterwards, so this hits only cold requests.
**Suggested fix:** Set `max` and `statement_timeout` on the Pool; later, batch the per-season queries with `season_code = ANY(...)`.
**Resolution:** Repaired on fix/small-api-hardening-and-loading-fixes: both career routes read two seasons at a time (`forEachSeasonInTurn`, at most 10 queries in flight); answers byte-identical to master for a 14-season career. The statement timeout is not part of this fix: whether Neon's pooled connection accepts it could not be checked locally. Awaiting review.
2026-11-18 independent review of e5b687c..740edfa: the fan-out part is repaired (seasons.ts:1213-1221, at most 2 seasons in flight, results in season order; a failing season still rejects the route, and later chunks are no longer started). Back to `open` because the finding's title and first suggested fix are only partly done: client.ts:5 still sets neither `max` nor `statement_timeout`, so one slow query is still unbounded. Close it once the timeout is added, or narrow/accept it by the user's decision.
2026-11-18 independent review of e5b687c..745105a: still `open` (P3, does not block). seasons.ts:1215-1221 has not changed and remains correct. client.ts:5-10 still sets neither `max` nor `statement_timeout`.
2026-11-18 repair on fix/bound-how-long-one-database-query-can-run: client.ts now sets `query_timeout: 15000` (client-side, because production uses Neon's pooled host, which may refuse a `statement_timeout` startup parameter) and `max: 10` explicitly. Local probe: `select pg_sleep(20)` rejected after 15.1 s with "Query read timeout", the pool dropped that client (total 0), and the next `select 1` succeeded on a fresh client. The abandoned query keeps running on the server until it tries to send its result; a server-side role `statement_timeout` was declined by the user (the data pipeline likely shares the role). Awaiting review.
2026-11-18 /audit (scope: current; all lenses) of master 8bb99b0..working tree: closed. client.ts:5-16 sets `query_timeout: 15000` and `max: 10`; with the career fan-out already bounded (seasons.ts forEachSeasonInTurn), both halves of the finding are repaired. Every executed query goes through `catalogRead` (the unwrapped `db.select` calls are `exists(...)`/subquery builders), so a timeout answers 503 DATABASE_UNAVAILABLE and is never cached. pg-pool 8.x `pool.query` releases the timed-out client with the error, so it is destroyed, not reused. Local cold answers for heavy routes took 0.03-0.12 s, far under 15 s. No new defect found.
