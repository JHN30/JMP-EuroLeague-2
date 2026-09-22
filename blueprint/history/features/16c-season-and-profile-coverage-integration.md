# Feature: Season and profile coverage integration

**From build-plan:** feature 16c
**Build attempt:** 1
**Status:** verified

**Branch:** feature/season-and-profile-coverage-integration

## Goal

Reuse 16a's already-generic coverage contract and `DataCoveragePanel` on an
existing season-scoped page, so a viewer can see how much of the current
season's data the archive actually holds without visiting a specific game.
The build-plan's note that player history should stay "archived seasons,
not a career" is a scoping decision for the future Career tab (feature
17e's `PlayerCareerStory`) - the current Player page has no cross-season or
career-framed view to change, so nothing there needs code today; this
feature does not touch it. Likewise the full coverage-panel layout stays
reserved for the Season Overview route (17a) - this feature only adds the
existing compact panel to one more page, exactly as 16a did for Game
Detail.

## In scope

- Add a season-scoped (no `gameCode`) compact coverage panel to the Home
  dashboard, reusing `getCoverage(seasonCode)` and the existing
  `DataCoveragePanel` component unchanged.
- Add a small wrapper component (`frontend/src/dashboard/SeasonCoverage.jsx`)
  that fetches the season-scoped coverage and renders it through the shared
  `WidgetPanel`/`AsyncState` loading and error pattern already used by every
  other dashboard widget, so it's visually and behaviorally consistent with
  its neighbors.

## Out of scope

- The full coverage-panel layout and the Season Overview route (17a).
- Any change to Game Detail's existing game-scoped panel (16a).
- Any change to Player, Team, Standings, or Statistics pages - the
  dashboard is the one existing page that already aggregates
  season-at-a-glance information, matching what a season-scoped coverage
  summary is for; adding the same panel to every other page would be
  redundant with the dedicated Season Overview page coming in 17a.
- Any change to `PlayerPage.jsx` or a new career/history view - there is no
  existing career-framed or cross-season view to rescope, and the guideline
  reserves that build (`PlayerCareerStory`) for feature 17e.
- New backend endpoints or schema changes - `getCoverage(seasonCode)`
  (game-scope omitted) already exists and returns season-level counts.

## Build loop

Follow `workflow.stepReview: "feature"` (self-review, one final packet) and
`workflow.checkpointCommits: "disabled"` (no per-step commits; `/complete`
makes the one feature commit).

## Build steps

- [x] 1. Add `frontend/src/dashboard/SeasonCoverage.jsx`: a component that
      reads `seasonCode` via `useParams`, queries `getCoverage(seasonCode)`
      with a `["coverage", seasonCode]` query key, and renders
      `DataCoveragePanel` directly - the same loading/error/render pattern
      `GameDetailPage` already uses for its game-scoped panel, not the
      `WidgetPanel` wrapper (which would nest `DataCoveragePanel`'s own
      `Panel`+heading inside a second one and duplicate the heading).
      **Done when:** `npm run lint` passes and the component has no
      game-specific assumptions (only `seasonCode`).
- [x] 2. Render `<SeasonCoverage />` on `Dashboard.jsx`, placed after
      `LeaderTrend`.
      **Done when:** `npm run build` passes and the panel appears at the
      bottom of the Home page with correct season-level counts, verified
      via CDP against the running dev servers.

      Verified via CDP on the E2025 home page: the panel renders with
      heading "Season data coverage" and all 8 tracked items, e.g. "Box
      scores - 402 of 402 applicable records - Available" and "Official
      standings - 20 of 20 applicable records - Available", matching the
      season-scoped `getCoverage` response.

## Files / areas

- `frontend/src/dashboard/SeasonCoverage.jsx` (new)
- `frontend/src/dashboard/Dashboard.jsx`

## Data / contracts

None - reuses the existing `GET /:seasonCode/coverage`-style endpoint (via
`getCoverage(seasonCode)` with no `gameCode`) and the existing
`DataCoveragePanel` component and item/status contract from 16a. No API or
persisted-data change.

## Testing

No unit test runner is configured. Verification is `npm run lint`,
`npm run build`, and CDP evidence that the panel renders real season-level
coverage counts on Home.

## Notes for the AI

- Reuse `WidgetPanel` from `Dashboard.jsx` (already exported) exactly as
  every sibling widget does, rather than inventing a second loading/error
  wrapper.
- `DataCoveragePanel` already renders its own heading
  (`data-coverage-heading`) and eyebrow; nest it inside `WidgetPanel`'s
  panel body without wrapping it in a second `Panel` (avoid a
  panel-in-panel double border). If that reads oddly once built, render the
  coverage items directly instead of nesting the whole component - use
  judgment on the smallest correct composition, not a rule to follow
  blindly.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4896,"specSha256":"eae05606b0c5f4990b668a6dffa14ba4417d88c28bc6929963ad2e8fdbabf8ce","branch":"refs/heads/feature/season-and-profile-coverage-integration","head":"b089d26cebc72761da26ea725dca5675092dfc9f","baseRef":"refs/heads/master","baseCommit":"b089d26cebc72761da26ea725dca5675092dfc9f","sourceTree":"ab7e20b9d7d57b900ee39efc9ec6f05f2fb0c01e","absentOptional":[]} -->