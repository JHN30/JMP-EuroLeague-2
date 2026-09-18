# Feature: Season navigation

**From build-plan:** feature 2
**Build attempt:** 1
**Branch:** feature/season-navigation
**Status:** verified

## Goal

Give the frontend a season-scoped routing shell: a global season selector that lets a fan switch between `E2025` and `E2026`, with the selected season preserved across every route and defaulted to the most relevant available season on first load, without ever mixing data from two seasons in one view.

## In scope

- Encode the selected season as the first URL path segment (`/:seasonCode/...`) so every current and future route inherits it structurally; no separate client-side season store.
- A root `/` route that resolves the "most relevant" season and redirects (replace) to `/:seasonCode`.
- A season-scoped layout route at `/:seasonCode` that renders a persistent header containing the season selector plus an `<Outlet />` for page content, and validates `:seasonCode` against the live supported-season list.
- A `SeasonSelector` component that lists the supported seasons (from `GET /api/seasons`) and, on change, navigates to the same path/query/hash with only the season segment replaced.
- "Most relevant" default: the newest season (API order, already descending) whose earliest-scheduled game (`games[0]` from `GET /seasons/:seasonCode/games?limit=1`, ordered `scheduledAt` ascending) has `played: true`; if no season has started, the newest season overall. Resolved once via one shared hook reused by both the root redirect and the invalid-season fallback below.
- An unsupported or unknown `:seasonCode` in the URL redirects (replace) to the resolved default season, preserving the rest of the path/query/hash.
- A minimal placeholder index page under the layout (to be replaced by feature 3's Home dashboard) so the shell has visible, working content.
- Loading and error states for the season list/default-resolution fetch (spinner while loading; a DaisyUI alert with a retry action on failure — the season selector and shell cannot render meaningfully without this data).
- Add `getSeasons()` and `getSeasonGames(seasonCode, params)` to `frontend/src/lib/api.js`, and give the shared Axios client (`frontend/src/lib/axios.js`) a `http://localhost:3000/api` fallback `baseURL` so the app works without a `.env` file in local dev.

## Out of scope

- The Home dashboard's real content (feature 3), the standings/fixtures/teams/players/leaderboards/comparisons/playoffs pages (features 4-10), and any data-quality annotation UI.
- Persisting the selected season across browser sessions (localStorage/cookies); "preserve across routes" is satisfied by the URL alone.
- A dedicated 404/not-found design system; a stray path under the layout or an entirely unmatched top-level path both redirect to the resolved default season path.
- Zustand, Chart.js, or Motion; none is needed for this feature and none is installed.
- Any change to the backend API.

## Build loop

Use the configured Efficient workflow on `feature/season-navigation`: implement the small steps, run relevant checks, and present one review packet after all steps. Step checkpoint commits are disabled. `/complete` creates the final feature commit after approval.

## Build steps

- [x] **1. Add the season data layer.** In `frontend/src/lib/axios.js`, default `baseURL` to `import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"`. In `frontend/src/lib/api.js`, add `getSeasons()` (`GET /seasons`) and `getSeasonGames(seasonCode, { limit })` (`GET /seasons/:seasonCode/games`), both returning the parsed response body. Add `frontend/src/season/useDefaultSeasonCode.js`: a TanStack Query hook (key `["default-season"]`) whose query function calls `getSeasons()`, then, in the returned (already-descending) order, calls `getSeasonGames(seasonCode, { limit: 1 })` for each until one returns a `games[0]` with `played: true`, returning that `seasonCode`; if none do, or the season list is empty, return the first season's code or `null` when the list is empty. **Done when:** `cd frontend && npm run build` passes; `npm run lint` passes.
- [x] **2. Add the routing shell and selector.** Replace `App.jsx`'s placeholder body with `<Routes>`: `/` renders a component that uses `useDefaultSeasonCode()` and redirects (`<Navigate replace>`) to `/:seasonCode` once resolved, showing a loading spinner meanwhile and an error alert if the seasons request fails; `/:seasonCode/*` renders `frontend/src/season/SeasonLayout.jsx`, which fetches `getSeasons()` via TanStack Query, shows the same loading/error states, redirects (replace, preserving the rest of the path/query/hash) to the resolved default season when the URL's `:seasonCode` is not in the supported list, and otherwise renders a header with `frontend/src/season/SeasonSelector.jsx` plus an `<Outlet />` around a new minimal placeholder index page; a catch-all `*` route redirects to `/`. `SeasonSelector` reads `:seasonCode` via `useParams`, lists seasons from the same `["seasons"]` query, and on change navigates to the current `pathname`/`search`/`hash` with only the leading season segment replaced. **Done when:** `cd frontend && npm run build` passes; with the backend and frontend dev servers running, loading `/` redirects to a season path, the selector switches between `E2025`/`E2026` while staying on the same page, an unsupported season in the URL (for example `/E1999`) redirects to the default, and the browser console/network tab show no errors during these flows.

## Files / areas

- `frontend/src/lib/axios.js` for the fallback `baseURL`.
- `frontend/src/lib/api.js` for `getSeasons`/`getSeasonGames`.
- `frontend/src/season/useDefaultSeasonCode.js`, `frontend/src/season/SeasonLayout.jsx`, `frontend/src/season/SeasonSelector.jsx`, `frontend/src/season/HomePlaceholder.jsx` (new).
- `frontend/src/App.jsx` for the route tree; `frontend/src/main.jsx` is unchanged (`BrowserRouter`/`QueryClientProvider` already wrap `App`).

## Data / contracts

Consumes the existing backend contract unchanged: `GET /api/seasons` → `{ seasons: [{ seasonCode, name, startYear, competition }] }` (already ordered newest-first); `GET /api/seasons/:seasonCode/games?limit=1` → `{ games: [...], pagination }`. No backend changes.

`useDefaultSeasonCode()` returns `{ data: string | null, isLoading, isError }` (standard `useQuery` shape). The season segment in the URL is always a raw `seasonCode` string; `SeasonLayout` treats any value not present in the fetched `seasons` list as unsupported, regardless of format, and redirects rather than showing a dedicated invalid-format error.

## Testing

- No test runner is configured for the frontend; this is UI/integration behavior, which the standards route to browser verification rather than unit tests. Run `cd frontend && npm run build` and `npm run lint` after each step.
- `/implement` needs both dev servers running to verify step 2 live (`cd backend && npm run dev`, `cd frontend && npm run dev`); ask the user to start whichever is not already running before capturing browser evidence.
- Manually verify: default redirect from `/`, season switch preserving the current path, invalid season code redirecting to the default, and the loading/error states (the error state can be exercised by pointing `VITE_API_URL` at an unreachable port).

## Notes for the AI

- Every future season-scoped feature must read the season from route params (`useParams().seasonCode`), never from a separate store or cached value, so seasons can never mix. This feature's URL-as-source-of-truth design exists specifically to make that structural rather than a rule to remember.
- Keep the placeholder index page trivial (a heading and one sentence); feature 3 replaces it entirely.
- Reuse the existing `dark-euroleague`/`light-euroleague` DaisyUI theme tokens and the `.app-shell`/`.panel`/`.muted` classes already in `index.css`; do not hardcode colors.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7886,"specSha256":"2e0c915bf858f149f41dc633a37d5a958b0b2e336a54c84c3cad0bd924469eaa","branch":"refs/heads/feature/season-navigation","head":"96b53075dcef99d39a229d803908617ddb4e63ef","baseRef":"refs/heads/master","baseCommit":"96b53075dcef99d39a229d803908617ddb4e63ef","sourceTree":"3a809645557a87bb024d2a9ea1bc78ca08d0118a","absentOptional":[]} -->
