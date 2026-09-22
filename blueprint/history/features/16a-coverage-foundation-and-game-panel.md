# Feature: Coverage foundation and game panel

**From build-plan:** feature 16a
**Build attempt:** 1
**Branch:** `feature/coverage-foundation-and-game-panel`
**Expected archive:** `blueprint/history/features/16a-coverage-foundation-and-game-panel.md`
**Status:** verified - awaiting feature review

## Goal

Make the current Game Detail page state exactly what the archive can provide. Add a compact, accessible coverage panel backed by API-derived counts and the approved five-status vocabulary, without fabricating shot locations or play-by-play.

## Design reference

`UI-UX.md` section 6.4 defines the coverage inventory, status semantics, and compact treatment. Its full panel is reserved for the Season Overview introduced in feature 17a; this feature delivers only the reusable data contract and the compact Game Detail use.

## In scope

- Add one season-scoped API coverage response that derives game and available-record counts on the server, with an optional valid game scope for the compact Game Detail panel.
- Classify box scores, period scores, official standings, rosters, player photos, and season statistics from actual returned data. Classify shot locations and play-by-play as permanently unavailable because their source columns do not exist.
- Add a reusable compact `DataCoveragePanel` to Game Detail, with semantic text and non-color-only status cues for available, partial, incomplete, unavailable, and not yet applicable.
- Preserve Game Detail's current loading, not-found, error, scheduled-game, and box-score states. The panel must not turn missing values into zero or claim reconstruction as official data.

## Out of scope

- The full coverage-panel layout and the Season Overview route, which belong to 17a.
- Shooting or play-by-play tabs and their placeholder content, which belong to 16b.
- Team, player, and season-page coverage integration, which belongs to 16c.
- New source data, migrations, authentication, or changes to existing game/box-score response shapes.

## Build loop

Implement the steps in order, keeping each one working. Present one feature-level review packet after all steps; checkpoint commits are disabled. `/complete` owns the final feature commit and merge. Run focused browser coverage where it can assert the compact panel's stable title and status text, then run frontend lint and build plus the backend TypeScript build.

## Build steps

- [x] **1. Define and expose the coverage contract.**
  - Areas: `backend/src/db/`, `backend/src/routes/seasons.ts`, and a focused coverage module if reuse keeps the route thin.
  - Use existing season-scoped tables and server-side queries to return a stable coverage inventory with item key, status, available count, applicable count, and a human-readable server-independent label or enough values for the client to format it. Validate the optional game code using the established route rules and return the project's existing JSON error shape for invalid, unknown, or unsupported scope.
  - Compute availability only from data actually held: distinguish no completed games (`not yet applicable`) from missing records (`unavailable` or `incomplete`) and partial records (`partial`); do not query raw ingestion tables or make frontend aggregation authoritative.
  - **Done when:** a valid season request returns all tracked coverage items with the five approved statuses as applicable, an optional existing-game request is limited to that game, invalid scope is rejected consistently, and the backend build passes.

- [x] **2. Build the reusable compact coverage panel.**
  - Areas: `frontend/src/lib/`, `frontend/src/index.css`, and `frontend/src/lib/api.js`.
  - Add a focused presentational component that renders a compact heading, explanatory context, status icon/text, badge, token-driven border/tint, and count detail. Keep the visible wording as the accessible equivalent; do not rely on colour or an icon alone.
  - Add the corresponding frontend API call and a stable TanStack Query key that includes season and optional game scope. Handle loading, empty/unexpected payload, and request error with the shared async primitives.
  - **Done when:** the component has no game-page-specific assumptions, renders each known status legibly in both themes, and has an accessible heading and status descriptions.

- [x] **3. Integrate compact coverage on Game Detail and verify it.**
  - Areas: `frontend/src/games/GameDetailPage.jsx`, `frontend/e2e/`, and any focused API/browser fixtures already used for game detail.
  - Fetch the game-scoped coverage only after the game is known, place the compact panel below the game summary, and retain the existing page behavior when the coverage request is loading or fails. Scheduled games must honestly show that completed-game-dependent data is not yet applicable.
  - Add proportionate browser coverage for the panel's stable heading and one representative status/count. Run the documented frontend browser command for that focused spec, frontend lint/build, and backend build.
  - **Done when:** a user opening a valid game sees its data-coverage title and truthful status text without blocking the existing box score, and all listed checks pass.

## Files / areas

- `backend/src/db/season-games.ts`, `backend/src/db/season-schema.ts`, and a small coverage query module if needed for season/game count queries.
- `backend/src/routes/seasons.ts` for the validated season and optional game coverage endpoint.
- `frontend/src/lib/api.js` and `frontend/src/lib/` for the API client and reusable compact panel.
- `frontend/src/games/GameDetailPage.jsx` for the reachable integration.
- `frontend/src/index.css` for theme-token coverage styles.
- `frontend/e2e/` for focused browser evidence.

## Data / contracts

The new read-only endpoint is season-scoped and may accept only an existing numeric game code validated by the current API. Its payload must identify the scope and return a fixed inventory: box scores, period scores, official standings, rosters, player photos, season statistics, shot locations, and play-by-play. Each item exposes a status from `available`, `partial`, `incomplete`, `unavailable`, or `notYetApplicable`; nullable counts remain nullable rather than becoming zero. Shot locations and play-by-play remain unavailable because no source data exists. Existing API responses and routes remain unchanged.

## Testing

- `cd backend && npm run build`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm run test:browser -- <focused-coverage-spec>`

## Notes for the AI

- Keep aggregation ownership on the server and reuse existing Drizzle schemas and route-validation helpers.
- Use the shared `AsyncState`, `EmptyText`, `Panel`, and theme tokens. Do not add a library for icons, charting, validation, or formatting.
- A count only supports a claim it actually measures. Missing and unapplicable are different states.
- Do not add future tabs or use the full panel layout before the routes that consume them exist.

<!-- blueprint:completion {"schemaVersion":1,"specBytes":7020,"specSha256":"5dfc59c6b0b9f5c86f9a267ac6bffe11f3dbdf4de025f957e4dae8e6514a70c4","branch":"refs/heads/feature/coverage-foundation-and-game-panel","head":"7e2aa55284aeea587a8f707ba6a66ae71ac91044","baseRef":"refs/heads/master","baseCommit":"7e2aa55284aeea587a8f707ba6a66ae71ac91044","sourceTree":"1bcd35452e945d8a62ae4749db81771213e1858f","absentOptional":[]} -->
