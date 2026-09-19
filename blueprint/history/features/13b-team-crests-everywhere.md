# Feature: Team crests everywhere

**From build-plan:** feature 13b
**Build attempt:** 1
**Status:** verified
**Branch:** feature/team-crests-everywhere

## Goal

Make team crests available in standings and game API responses, then show the
available crests consistently in the standings, fixtures, game-detail header,
dashboard standings snapshot, and team comparison table. This completes the
team-identity portion of richer stats presentation without changing the existing
team directory and detail pages, which already show crests.

## Design reference

None. Reuse the existing contained crest treatment in `TeamsPage.jsx` and
`TeamPage.jsx`: decorative images with `alt=""`, `object-contain`, and no
placeholder when a URL is absent or cannot load. Use the existing rank and
table/header layouts rather than adding a shared component or stylesheet.

## In scope

- Join `etl_flat_clubs.crest_url` into each game response's `localTeam` and
  `roadTeam` objects, preserving the existing nullable team behavior when a
  game has no team data.
- Join the same club crest into each standings entry as `crestUrl` using the
  response's competition, season, and club-code identity.
- Show a small crest beside a team name in the standings table, fixtures and
  results list, dashboard standings snapshot, and team-comparison header cells.
- Show both team crests around the game-detail matchup heading.
- Treat crests as decorative and hide a failed image element through `onError`.
  A missing crest URL must leave each existing name, score, empty state, and
  error state usable with no placeholder graphic.

## Out of scope

- Feature 13c's filter-control consolidation.
- Any new crest asset, image proxy, fallback art, shared image component,
  stylesheet token, migration, or database schema change.
- Team-directory and team-detail crest UI, which already uses `team.crestUrl`.
- Adding crests to native team-picker `<select>` options, which cannot display
  images and is not named by the plan.
- Player images or changes to player-stat, box-score, phase, pagination, score,
  or standings-metric behavior.

## Build loop

Follow `workflow.stepReview: "feature"` with one review packet after all steps
and `workflow.checkpointCommits: "disabled"`. Do not create checkpoint commits;
`/complete` creates the final feature commit.

## Build steps

- [x] 1. Extend the game data query and serializer in
  `backend/src/db/season-games.ts` to left-join the clubs table separately for
  local and road club codes, and include nullable `crestUrl` on each returned
  `GameTeam`. Do not change the game URL or other game fields. Done when:
  `cd backend && npm run build` passes and a real
  `GET /seasons/E2025/games` response includes each available team's crest URL
  under `localTeam.crestUrl` and `roadTeam.crestUrl`.
- [x] 2. Extend `getStandings` in `backend/src/db/season-standings.ts` to
  left-join clubs on competition code, season code, and club code, and expose a
  nullable `crestUrl` on every `StandingEntry`. Done when:
  `cd backend && npm run build` passes and a real
  `GET /seasons/E2025/phases/RS/standings` response includes a crest URL for a
  club known to have one while preserving the existing standings fields.
- [x] 3. Render compact decorative crest images beside team names in
  `frontend/src/standings/StandingsTable.jsx`,
  `frontend/src/games/FixturesPage.jsx`, and
  `frontend/src/dashboard/StandingsSnapshot.jsx`. Render the two available
  crests in `frontend/src/games/GameDetailPage.jsx`'s matchup heading without
  changing its score, loading, missing-game, or box-score states. Done when:
  the standings, fixtures, dashboard, and a game detail page display available
  crests next to the appropriate teams, while a missing or broken crest URL
  leaves the existing text-only presentation intact.
- [x] 4. Render the selected teams' decorative crests above their names in
  `frontend/src/comparisons/ComparisonsPage.jsx`'s team comparison header,
  taking the URLs from the standings entries already fetched there. Done when:
  comparing two teams with crest URLs displays one contained crest per header,
  and the existing "Select two teams to compare" plus loading and error states
  remain unchanged.
- [x] 5. Run `cd frontend && npm run build`, then
  `cd frontend && npm run test:browser`. Verify in both `light-euroleague` and
  `dark-euroleague` that crests are legible and contained on the named views,
  and that no broken-image icon remains after a failed crest request. Done when:
  both builds pass, the existing browser smoke test passes, and the browser
  evidence covers the rendered crest placements and fallback behavior.

## Files / areas

- `backend/src/db/season-games.ts`
- `backend/src/db/season-standings.ts`
- `frontend/src/standings/StandingsTable.jsx`
- `frontend/src/games/FixturesPage.jsx`
- `frontend/src/games/GameDetailPage.jsx`
- `frontend/src/dashboard/StandingsSnapshot.jsx`
- `frontend/src/comparisons/ComparisonsPage.jsx`

## Data / contracts

- Game API team objects gain `crestUrl: string | null` for both `localTeam` and
  `roadTeam`, sourced from the matching `etl_flat_clubs` row. A missing club row
  or missing URL returns `null`; an entirely absent game team remains `null`.
- Standings API entries gain `crestUrl: string | null`, sourced from the club
  matching the standings entry's competition, season, and club code. Existing
  standings fields retain their current names and values.
- The frontend uses only those response fields. Images are decorative (`alt=""`)
  and hide themselves on an image-load error; no client request or fallback is
  added.

## Testing

No unit-test command is configured. This work adds no independent domain logic:
the backend changes are typed Drizzle projections and the frontend changes are
presentational. Use the two live API checks in steps 1 and 2 to prove the
response contracts, run both package builds, and run the documented Playwright
browser smoke test as regression evidence. Capture direct browser evidence for
the new crest placements and error fallback because the smoke test does not
exercise them.

## Notes for the AI

- Import and alias the existing `clubs` table as needed for the two game-team
  joins. Keep joins scoped by competition code and season code as well as club
  code, matching the clubs primary key.
- Use the existing Tailwind sizing vocabulary: small inline crests should remain
  compact and `object-contain`; game-detail heading crests may match the
  established `h-16 w-16` team-detail treatment. Do not introduce a new shared
  abstraction merely to centralize differing layouts.
- Preserve all current link destinations, names, scores, query keys, pagination,
  and loading, empty, unavailable, and error messages.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6776,"specSha256":"24dbb74a3d54c44112dbf53283330d6680ac622e447276e1fa98e26b01b17bde","branch":"refs/heads/feature/team-crests-everywhere","head":"6dc0abfd22c7dbefd7ff5b9bf76b7352c80e62f4","baseRef":"refs/heads/master","baseCommit":"6dc0abfd22c7dbefd7ff5b9bf76b7352c80e62f4","sourceTree":"0e9d7d3cb15b5adb2ee06d88fc6efd287175c591","absentOptional":[]} -->
