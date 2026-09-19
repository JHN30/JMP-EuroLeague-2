# Feature: Shared design system, navbar, dashboard, and standings

**From build-plan:** feature 12a
**Build attempt:** 1
**Status:** verified
**Branch:** feature/shared-design-system-navbar-dashboard-and-standings

## Goal

Replace the current plain-text visual treatment of the home dashboard and
standings page with a consistent, theme-aware DaisyUI visual language: a
compact sticky navbar with a persistent season selector, and stronger visual
hierarchy (badges, rank emphasis, big stat numerals) so key numbers and
results stand out instead of reading as undifferentiated text. This also
establishes the shared CSS primitives (tokens and component classes) that
build-plan items 12b-12e will reuse on the remaining pages.

## Design reference

`prototypes/theme.css`, `prototypes/dashboard.html`, `prototypes/standings.html`.
Port `theme.css`'s new tokens and component classes into
`frontend/src/index.css` as the first build step; the two mockup HTML files
are the visual reference for the real React markup, not code to copy
verbatim.

## In scope

- `frontend/src/index.css`: new theme-aware CSS custom properties and
  component classes (status colors, rank-tier accent, stat-badge, stat
  callout, rank marker, form-pill track, panel header, sticky nav shell,
  theme-aware scrollbar styling) added to both the `dark-euroleague` and
  `light-euroleague` theme blocks and the shared stylesheet body.
- `frontend/src/season/SeasonLayout.jsx` and `frontend/src/season/NavBar.jsx`:
  restyle into a compact, responsive, sticky navbar that keeps the season
  selector persistently visible alongside the section tabs.
- `frontend/src/dashboard/Dashboard.jsx`, `StandingsSnapshot.jsx`,
  `GamesSnapshot.jsx`, `LeadersPanel.jsx`: restyle the widget panels with the
  new primitives (rank badges, W-L emphasis, winner/score emphasis, big stat
  numerals with "Leader" badges for team/player leaders).
- `frontend/src/standings/StandingsPage.jsx` and `StandingsTable.jsx`:
  restyle the phase tabs and the full standings table with rank badges (gold
  tier for rank 1), a clearer qualified/cutline divider, and a badge-based
  form column.
- Both DaisyUI themes (`dark-euroleague` default, `light-euroleague`) must
  render correctly; verify both, not only dark.

## Out of scope

- Fixtures/results, game detail, teams, players, statistics leaderboards,
  comparisons/trends, and playoffs pages (12b-12e).
- Any new API endpoint, query, or derived statistic. Every value shown must
  already be returned by an endpoint these components already call
  (`getSeasonStandings`, `getSeasonGames`, `getLeaderStats`, `getSeasons`).
  In particular, no "current streak" badge: the standings API exposes
  `longestWinStreakCurrentSeason`/`longestLoseStreakCurrentSeason` (streak
  bests, not an active streak) and a `streakHistory` list whose
  `winLossRecord` string format is unverified; neither is used.
- Changing route paths, query keys, loading/error/empty state logic, or any
  behavioral contract - this is a presentational restyle only.
- Renaming or restructuring the existing DaisyUI `badge` component usages in
  `StandingsTable.jsx` (form result pills, tie-break marker) or `PlayerPage.jsx`
  (registration status) - those already use DaisyUI's own `badge`/`badge-*`
  classes and must keep doing so (see Notes for the AI on the naming
  collision this implies for new classes).
- Discarding `prototypes/`; `/complete` handles that after this feature merges.

## Build loop

Follow `workflow.stepReview: "feature"` (one review packet after all steps)
and `workflow.checkpointCommits: "disabled"` (no per-step commits; `/complete`
makes the single work commit).

## Build steps

- [x] 1. Port the design tokens and shared component CSS into
  `frontend/src/index.css`. Add the new custom properties to both theme
  blocks (see Data / contracts) and add new global component classes:
  `.stat-badge` (+ `-positive`/`-negative`/`-neutral`/`-leader` modifiers,
  named to avoid colliding with DaisyUI's own `.badge`), `.stat-callout`
  (+ `.value`/`.label`), `.rank` (+ `.rank-1` gold tier), `.form-track`/
  `.form-pill` (`.w`/`.l` modifiers), `.panel-header`/`.panel-title`/
  `.panel-link`, and theme-aware `::-webkit-scrollbar`/`scrollbar-color`
  rules using existing `--color-base-*`/`--color-primary` tokens. Reuse
  `var(--color-success)`/`var(--color-error)`/`var(--color-warning)` for
  positive/negative/neutral status instead of adding parallel tokens.
  Done when: `cd frontend && npm run build` passes and the new classes render
  with no console errors on a page that doesn't use them yet (existing pages
  visually unchanged).
- [x] 2. Restyle `SeasonLayout.jsx`'s header and `NavBar.jsx` into a compact
  sticky navbar: a small brand mark/label, the season selector kept
  persistently visible in the same row, and the section tabs below or
  alongside it, responsive down to mobile widths. Preserve the existing
  `nav[aria-label="Sections"]`, `role="tablist"`, and `role="tab"` structure
  exactly (the Playwright smoke test and other pages' in-page tabs depend on
  this a11y contract). Done when: navigating between sections and changing
  the season both still work, the nav bar stays visible on scroll, and it
  reflows sensibly at a narrow viewport width.
- [x] 3. Restyle the dashboard widgets (`Dashboard.jsx`'s `WidgetPanel`,
  `StandingsSnapshot.jsx`, `GamesSnapshot.jsx`, `LeadersPanel.jsx`) with the
  new primitives: rank badges and W-L emphasis in the standings snapshot,
  winner/score emphasis in the games snapshot, and big stat-callout numerals
  with a "Leader" badge for the team/player leaders panel. Keep all existing
  loading/error/empty states and data. Done when: the dashboard for a season
  with data shows the restyled widgets with no missing or duplicated
  information versus today, and loading/error/empty states still render
  correctly (verify by throttling or by a season/phase with no data).
- [x] 4. Restyle `StandingsPage.jsx`'s phase tabs and `StandingsTable.jsx`
  with rank badges (gold tier for rank 1), a clearer qualified/cutline
  divider than the current `border-t-2`, and the existing form/tie-break
  badges kept as DaisyUI `badge` elements (only their surrounding table
  styling changes). Done when: the standings table for a phase with data
  renders correctly, the qualified/non-qualified boundary and tie-break
  marker remain visible and functionally identical, and the empty-standings
  state still renders.
- [x] 5. Verify both themes and run the smoke check. Toggle to
  `light-euroleague` (via the existing theme toggle, or by temporarily
  setting `document.documentElement.dataset.theme` in the browser) and
  confirm the new components read correctly in both themes. Run
  `cd frontend && npm run test:browser` and confirm the existing smoke test
  still passes unmodified. Done when: both themes look correct on the
  dashboard and standings pages, and `npm run test:browser` passes.

## Files / areas

- `frontend/src/index.css`
- `frontend/src/season/SeasonLayout.jsx`
- `frontend/src/season/NavBar.jsx`
- `frontend/src/dashboard/Dashboard.jsx`
- `frontend/src/dashboard/StandingsSnapshot.jsx`
- `frontend/src/dashboard/GamesSnapshot.jsx`
- `frontend/src/dashboard/LeadersPanel.jsx`
- `frontend/src/standings/StandingsPage.jsx`
- `frontend/src/standings/StandingsTable.jsx`

## Data / contracts

No API or data model changes. New CSS custom properties to add to both
`dark-euroleague` and `light-euroleague` theme blocks in
`frontend/src/index.css` (values derived from `prototypes/theme.css`,
adjusted per theme the way the existing tokens already are):

- `--color-rank-leader`, `--color-rank-leader-content` - the rank-1/leader
  gold accent used by `.rank-1` and `.stat-badge-leader`. New token pair;
  everything else reuses existing `--color-success`/`--color-error`/
  `--color-warning`/`--color-primary`/`--color-base-*` tokens via
  `color-mix()` for soft backgrounds, matching the existing `.muted`/
  `.app-shell` pattern already in the file.

No new component classes are named `badge`; DaisyUI's own `badge` component
class stays exactly as used today in `StandingsTable.jsx` and
`PlayerPage.jsx`.

## Testing

No test runner is configured for frontend logic, and this feature adds no
logic (no parsers, transforms, or validation) - nothing here meets the unit
test scope rule. `Browser tests` (`cd frontend && npm run test:browser`) is
configured; step 5 runs the existing smoke test as regression evidence that
navigation and the Teams link still work after the navbar restyle. No new
Playwright spec is added: the existing smoke test already covers the only
new behavioral surface this feature touches (the nav's `role="tab"`
structure), and the rest is presentational.

## Notes for the AI

- `frontend/src/index.css` already defines `.panel`, `.muted`, and
  `.eyebrow`; extend them rather than duplicating. `prototypes/theme.css`
  redefined these three from scratch for the standalone mockup - when
  porting, merge into the existing rules instead of overwriting them.
- `prototypes/theme.css` names its badge/pill class `.badge`; rename it to
  `.stat-badge` when porting since DaisyUI already owns the global `.badge`
  component class, used elsewhere in the app.
- Keep `color-mix(in srgb, ...)` usage consistent with the existing pattern
  in `.app-shell` and `.muted`.
- `StandingsTable.jsx`'s `qualifiedDivider` and `tieBreak` logic is existing
  behavior; only its visual treatment changes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9502,"specSha256":"922b94ccee86775a17927d986d4c66744dee1339510214f5911932c5ad3fe23a","branch":"refs/heads/feature/shared-design-system-navbar-dashboard-and-standings","head":"63a7e75e4523c1060cf399b9f2dafa930427238f","baseRef":"refs/heads/master","baseCommit":"63a7e75e4523c1060cf399b9f2dafa930427238f","sourceTree":"c9a272f7d91a6435687d562fffe1547430b94f98","absentOptional":[]} -->
