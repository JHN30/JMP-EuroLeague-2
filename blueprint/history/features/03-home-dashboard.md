# Feature: Home dashboard

**From build-plan:** feature 3
**Build attempt:** 1
**Branch:** feature/home-dashboard
**Status:** verified

## Goal

Give the selected season's home page (`/:seasonCode`, currently `HomePlaceholder`) a real at-a-glance view: a standings snapshot, recent results, upcoming games, and leading team/player statistics, each linking toward its future detail page.

## In scope

- Extend the existing `GET /api/seasons/:seasonCode/games` route with optional, backward-compatible `status` (`played`/`scheduled`) and `order` (`asc`/`desc`) query parameters, so the dashboard can ask for "most recently played" and "next scheduled" without fetching an entire season (E2025 alone has 402 games).
- A **Standings snapshot** widget: top 5 `RS`-phase standings entries (by `basic.position`) from the existing standings endpoint (round omitted, so the backend's own latest-round default applies), linking to the future `/:seasonCode/standings` page.
- A **Games snapshot** area with two lists: recent results (`status=played&order=desc`, limit 5) and upcoming games (`status=scheduled&order=asc`, limit 5), each game linking to the future `/:seasonCode/games/:gameCode` page.
- A **Leaders panel**: team leaders (best offense = highest `basic.pointsFor`, best defense = lowest `basic.pointsAgainst`, both derived client-side from the same standings response already fetched for the snapshot widget — ties broken by better `basic.position`) and player leaders (top 5 from `GET /api/seasons/:seasonCode/season-stats?phase=all&mode=perGame&limit=5`, in the source's own ranking order), each item linking to its future `/:seasonCode/teams/:clubCode` or `/:seasonCode/players/:personKey` page.
- Independent loading, empty, and error handling per widget (one widget's failure or empty result must not block the others).
- Replace `frontend/src/season/HomePlaceholder.jsx` with the real dashboard at the same `/:seasonCode` index route.

## Out of scope

- The actual standings, game-detail, team-detail, player-detail, and leaderboard pages (features 4-8); the dashboard links to their planned URLs (`/:seasonCode/standings`, `/:seasonCode/games/:gameCode`, `/:seasonCode/teams/:clubCode`, `/:seasonCode/players/:personKey`) before those routes exist. Until each lands, clicking falls through to the existing catch-all and redirects to the season home — expected interim behavior, not a regression to fix here.
- Any further browsing, filtering, or pagination of games, standings, or statistics (feature 5/8's job).
- Non-Regular-Season standings on the dashboard (no other phase currently has data; revisit if that changes).
- Any change to `season-standings.ts`, `season-stats.ts`, or the standings/season-stats routes.

## Build loop

Use the configured Efficient workflow on `feature/home-dashboard`: implement the small steps, run relevant checks, and present one review packet after all steps. Step checkpoint commits are disabled. `/complete` creates the final feature commit after approval.

## Build steps

- [x] **1. Extend the games list with status/order filters.** In `backend/src/db/season-games.ts`, add optional `status?: "played" | "scheduled"` and `order: "asc" | "desc" = "asc"` parameters to `getGames`. `status: "played"` adds `eq(games.played, true)`; `status: "scheduled"` adds `or(eq(games.played, false), isNull(games.played))`; omitted `status` keeps the existing unfiltered behavior. Order by `scheduledAt` in the requested direction with nulls always last (via a raw `sql` order expression, since Drizzle's column-level `nullsLast()` is not usable via the query builder in the installed version), then `gameCode` ascending as before. In `backend/src/routes/seasons.ts`, add query validation: `status` must be `played`/`scheduled` or omitted (`400 INVALID_STATUS` otherwise); `order` must be `asc`/`desc` or omitted, defaulting to `asc` (`400 INVALID_ORDER` otherwise). **Done when:** `cd backend && npm run build` passes; live requests confirm `status=played`/`status=scheduled` filter correctly, `order=desc` returns newest-first with nulls last, omitting either parameter reproduces the exact prior response for an existing request, invalid values return the documented errors, and existing routes (including the plain `/games` list, game detail, box score, standings, season-stats) still respond unchanged.
- [x] **2. Add the dashboard data layer.** In `frontend/src/lib/api.js`, add `getSeasonStandings(seasonCode, phaseCode, { round } = {})` (`GET /seasons/:seasonCode/phases/:phaseCode/standings`) and `getLeaderStats(seasonCode, { phase, mode, limit } = {})` (`GET /seasons/:seasonCode/season-stats`); extend `getSeasonGames` to accept and forward `status`/`order`. **Done when:** `cd frontend && npm run build` passes; `npm run lint` passes.
- [x] **3. Build the dashboard UI.** Add `frontend/src/dashboard/Dashboard.jsx`, `StandingsSnapshot.jsx`, `GamesSnapshot.jsx`, and `LeadersPanel.jsx`; each fetches its own data via TanStack Query with independent loading/empty/error states, matching the loading spinner and error-alert patterns already used in `frontend/src/season/SeasonLayout.jsx`. Wire `Dashboard` as the `/:seasonCode` index element in `App.jsx` and delete `HomePlaceholder.jsx`. **Done when:** `cd frontend && npm run build` and `npm run lint` pass; with both dev servers running, `E2025`'s dashboard shows a 5-team standings snapshot, 5 recent results, 5 upcoming games, one offense leader, one defense leader, and 5 player leaders, each linking to its future URL; `E2026`'s dashboard shows populated upcoming games but empty/graceful states for standings, recent results, and leaders; the browser console shows no errors in either case.

## Files / areas

- `backend/src/db/season-games.ts`, `backend/src/routes/seasons.ts` for the games-list filter/order extension.
- `frontend/src/lib/api.js` for the new/extended API helpers.
- `frontend/src/dashboard/Dashboard.jsx`, `StandingsSnapshot.jsx`, `GamesSnapshot.jsx`, `LeadersPanel.jsx` (new).
- `frontend/src/App.jsx` (swap `HomePlaceholder` for `Dashboard`); delete `frontend/src/season/HomePlaceholder.jsx`.

## Data / contracts

`GET /api/seasons/:seasonCode/games` gains two optional query parameters, fully backward compatible:

| Param | Values | Effect | Invalid |
| --- | --- | --- | --- |
| `status` | `played`, `scheduled` | Filters by `games.played` (`scheduled` includes `false` and `null`) | `400 INVALID_STATUS` |
| `order` | `asc` (default), `desc` | Direction for `scheduledAt`; nulls always sort last; `gameCode` tiebreak stays ascending | `400 INVALID_ORDER` |

No other route or response shape changes. The dashboard consumes existing contracts otherwise unchanged: `GET /seasons/:seasonCode/phases/RS/standings` (round omitted), `GET /seasons/:seasonCode/season-stats?phase=all&mode=perGame&limit=5`.

`StandingsSnapshot` reads `standings.slice(0, 5)` from the (already `basic.position`-ordered) response; if `standings` is empty, show "Standings not available yet." `GamesSnapshot`'s recent-results list shows "No results yet" when empty; its upcoming-games list shows "No games scheduled yet" when empty — these are independent per E2026 (upcoming may be populated while recent results is empty). `LeadersPanel`'s team leaders are computed only over entries with a non-null `basic`; if none exist, show "Not available yet" for both team leaders; player leaders show "Not available yet" when the `players` array is empty.

## Testing

- No test runner configured for either package; this is UI/integration behavior, routed to browser verification per the coding standards. Run `cd backend && npm run build` and `cd frontend && npm run build && npm run lint` after each step.
- `/implement` needs both dev servers running to verify steps 1 and 3 live; ask the user to start whichever is not already running.
- Manually verify: `status`/`order` combinations and their invalid-value errors (step 1); the full dashboard for `E2025` and the mixed-empty-state dashboard for `E2026` (step 3); that a dashboard link (e.g. "View full standings") redirects to the season home via the existing catch-all rather than erroring.

## Notes for the AI

- The `status`/`order` extension must not change any existing `/games` response when both are omitted — this is the same endpoint feature 1c shipped, being extended, not replaced.
- Features 4-7 should implement their routes at exactly `/:seasonCode/standings`, `/:seasonCode/games/:gameCode`, `/:seasonCode/teams/:clubCode`, and `/:seasonCode/players/:personKey` so this dashboard's existing links resolve without rework.
- Reuse the loading-spinner/error-alert markup pattern and DaisyUI theme tokens already established in `frontend/src/season/SeasonLayout.jsx`; don't hardcode colors.
- Season is always read from `useParams()` per feature 2's convention; do not introduce a separate season store here.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8884,"specSha256":"2057f29b6bfadaa890014b29f6fa1bc675f5346ab2a9222205dea9e9940f8026","branch":"refs/heads/feature/home-dashboard","head":"4c27895f1662957e2c39b24664a0d52793114a1d","baseRef":"refs/heads/master","baseCommit":"4c27895f1662957e2c39b24664a0d52793114a1d","sourceTree":"01686c02234c9eff0ad29825bd973fa57e5830bf","absentOptional":[]} -->
