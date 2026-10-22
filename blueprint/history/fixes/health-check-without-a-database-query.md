# Fix: Health check without a database query

**Type:** Fix
**Status:** verified
**Branch:** fix/health-check-without-a-database-query

## The problem

Neon's compute almost never scales to zero in production, even with little traffic, so the Launch plan bills it
around the clock (about 180 CU-hours a month at the 0.25 CU minimum).

- `render.yaml` sets `healthCheckPath: /api/health`. Render calls that path about every 5 seconds, and the
  interval cannot be changed.
- `/api/health` in `backend/src/index.ts` runs `select 1` on every call.
- Neon only scales to zero after 5 minutes without activity, so a query every 5 seconds keeps it awake
  permanently. On the Free plan the same load would have used up the 100 CU-hour monthly allowance in about
  16 days and suspended the compute.

The earlier fix `cache-api-responses-to-save-neon-transfer` deliberately left `/api/health` reaching the database.
This fix reverses that decision.

## The fix

In `backend/src/index.ts` only:

- `GET /api/health` becomes a liveness check: no database call, always `200` with `{ status: "ok" }`. Outside
  production it still adds `target: ENV.DB_TARGET`, which comes from config, not from a query.
- A new `GET /api/health/db` keeps today's database check unchanged: `select 1`, then `200` with
  `{ status: "ok", database: "connected" }` (plus `target` outside production), or `503` with the
  `DATABASE_UNAVAILABLE` error body. Render does not call it; it exists for manual checks.
- Short comments explain why the liveness check must not touch the database (Render's 5-second check would
  keep Neon awake).

No change to `render.yaml`. Render keeps `healthCheckPath: /api/health` for zero-downtime deploys and restarts
when the process stops responding.

Must not break:

- Playwright's `webServer` readiness wait on `http://localhost:3000/api/health` (it only needs a `200`).
- `frontend/e2e/all-seasons.spec.js` and the documented pre-test check, which read `target` from
  `/api/health` on a dev backend.
- `/api/health` stays outside `/api/seasons`, so the response cache never stores it.

Accepted trade-off: Render no longer restarts the service when only Neon is unreachable. A restart would not
fix a Neon outage, and the API routes still return their own errors in that case.

## Build steps

1. [x] Split the health check in `backend/src/index.ts` as described.
   **Done when:** `cd backend && npm run build` passes; on a local dev backend (`DB_TARGET=local`)
   `/api/health` answers `200 {"status":"ok","target":"local"}` without a query, and `/api/health/db` answers
   `200 {"status":"ok","database":"connected","target":"local"}`.

## Verify

- `cd backend && npm run build` passes.
- On a local dev backend, request `/api/health` and `/api/health/db` and compare the answers to step 1.
- Stop the local PostgreSQL (or point `LOCAL_DB_URL` at a closed port): `/api/health` still answers `200`;
  `/api/health/db` answers `503` with `DATABASE_UNAVAILABLE`.
- `cd frontend && npx playwright test all-seasons.spec.js` still starts the servers and passes the `target`
  check (local database only).
- After deploy (a separate decision): over a quiet stretch, Neon's Monitoring tab shows the compute going idle
  after about 5 minutes without visitors.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3263,"specSha256":"e2d929b12b7f8673f2e01c9757fedb03c5737c5a1e9477f7df3b3a445dcb9d33","branch":"refs/heads/fix/health-check-without-a-database-query","head":"9649daa82818be917d603c7ae2614c6a6ec003fa","baseRef":"refs/heads/master","baseCommit":"9649daa82818be917d603c7ae2614c6a6ec003fa","sourceTree":"ae5dfd545fbd24d711cbbd1eadc1a4399e2e0fb3","absentOptional":[]} -->
