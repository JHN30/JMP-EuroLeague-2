# Feature: Progressive disclosure and pagination

**From build-plan:** 15f-iv. Progressive disclosure and pagination
**Build attempt:** 1
**Branch:** `feature/progressive-disclosure-and-pagination`
**Expected archive:** `blueprint/history/features/15f-iv-progressive-disclosure-and-pagination.md`
**Status:** verified — awaiting feature review

## Goal

Avoid loading archive-sized data before a visitor asks for it, and make the two long player lists use the fixed block sizes defined by the product guidance.

## In scope

- Turn the player detail's season statistics and game log into accessible sections, loading the game-log request only after the Games section is opened.
- Separate comparison results from the trend view, loading the trend chart's rounds and per-entity game requests only after the Trends section is opened.
- Change the Players directory to 36 rows per page and the player leaderboard to 25 rows per page, preserving their existing offset, result count, and previous/next behavior.
- Add focused browser coverage for the new disclosure controls and pagination block sizes where it can make stable assertions.

## Out of scope

- Career stories and play-by-play pagination: neither screen or API exists in the current application.
- Changing fixture, team roster, playoff, or backend pagination contracts.
- Changing filtering, URL-state behavior, visual styling, API payloads, or route structure beyond the new local disclosure controls.

## Build loop

Work in the listed order. Run frontend lint and build after each applicable step; run the relevant Playwright browser test after the end-to-end step. Present one feature-level review packet after all steps, per the configured feature review cadence.

## Build steps

### 1. Defer the player game log

**Areas:** `frontend/src/players/PlayerPage.jsx`

- Add an accessible Statistics/Games section control around the existing player detail content while retaining the phase and statistics-mode controls inside Statistics.
- Gate the `getPlayerGames` query on both a resolved player and the Games section being active; preserve its existing loading, error, and empty states after it is opened.
- Keep registrations and player identity available without needing to open Games.

**Done when:** Visiting a player starts no player-game request until Games is selected; selecting Games shows the existing game-log state and data, and returning to Statistics leaves its controls and presentation working.

### 2. Defer comparison trend reads

**Areas:** `frontend/src/comparisons/ComparisonsPage.jsx`

- Add an accessible Comparison/Trends section control after two entities are selected.
- Render comparison and verdict/series content only in Comparison; render `TrendSection` only in Trends so its rounds and two game-history queries do not mount early.
- Preserve the selected type, phase, entities, comparison behavior, and existing trend loading/error/empty states when switching sections.

**Done when:** Selecting two teams or players initially loads comparison data without issuing trend-history reads; opening Trends starts the trend reads and renders the existing chart or its state; switching back does not discard the chosen entities or filters.

### 3. Align fixed list blocks and verify behavior

**Areas:** `frontend/src/players/PlayersPage.jsx`, `frontend/src/statistics/StatisticsPage.jsx`, `frontend/e2e/` (focused existing or new browser spec as appropriate)

- Set the directory players page to a 36-item request block and the player leaderboard to a 25-item request block.
- Keep offsets reset by the existing filters, preserve the URL-backed leaderboard offset, and continue to use the API `pagination.hasMore` value for the next-page control.
- Add or update a stable browser check for the new disclosure controls and list behavior; do not rewrite unrelated stale selectors.

**Done when:** Player directory requests advance by 36 and leaderboard requests advance by 25, their displayed ranges remain accurate, and focused browser evidence proves the new controls are reachable and usable.

## Files / areas

- `frontend/src/players/PlayerPage.jsx` — player detail disclosure and deferred game-log query.
- `frontend/src/comparisons/ComparisonsPage.jsx` — comparison/trend disclosure and deferred trend queries.
- `frontend/src/players/PlayersPage.jsx` — 36-row directory block.
- `frontend/src/statistics/StatisticsPage.jsx` — 25-row player leaderboard block.
- `frontend/e2e/` — focused browser evidence only if a stable scenario is available.

## Data / contracts

No backend or API contract changes. Existing `getPlayerGames`, `getTeamGames`, `getRounds`, `getSeasonPlayers`, and `getLeaderStats` requests retain their response shapes and pagination fields. Only their frontend activation timing or `limit` values change.

## Testing

- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm run test:browser` for the focused disclosure/pagination evidence (or record a specific environmental blocker if the browser harness cannot run).
- Manually verify a player page does not fetch its game log before Games, and a selected comparison does not fetch trend history before Trends.

## Notes for AI

- Reuse `TabStrip` and `TabPanel`; keep their ARIA relationships and keyboard behavior intact.
- Do not add a generic pagination abstraction for two constant changes.
- `UI-UX.md` is an untracked user document and defines the product intent: players 36, leaders 25, and deferred player game logs/trends. Do not modify it.
- The current app has no career-story or play-by-play implementation, so do not invent either to satisfy future-facing wording from that document.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5707,"specSha256":"b816327ea7ecef91182185c6f65f1cb4208da2a666a2c267ed2b6b9e2a75367f","branch":"refs/heads/feature/progressive-disclosure-and-pagination","head":"f6b09a6f6f20c0d173004c9515ae1a6e9f828b38","baseRef":"refs/heads/master","baseCommit":"f6b09a6f6f20c0d173004c9515ae1a6e9f828b38","sourceTree":"ecaafb6b661a2c8376e49ab15c4bfe8caaf0825f","absentOptional":[]} -->
