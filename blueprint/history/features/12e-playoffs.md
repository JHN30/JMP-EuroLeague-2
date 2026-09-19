# Feature: Playoffs

**From build-plan:** feature 12e
**Build attempt:** 1
**Status:** verified
**Branch:** feature/playoffs

## Goal

Apply the shared design system established in features 12a-12d to the
playoffs matchup page, completing build-plan item 12 (all five sub-items).

## Design reference

None. No new `prototypes/` mockups; reuses the exact winner/score-pill row
pattern already shipped in `frontend/src/games/FixturesPage.jsx` and the
`.panel-title` typography from `frontend/src/index.css` (feature 12a).

## In scope

- `frontend/src/playoffs/PlayoffsPage.jsx`: compact (`tabs-sm`) phase tabs,
  `MatchupCard`'s heading restyled with the existing `.panel-title` class,
  and each matchup row restyled with the winner/score-pill pattern already
  shipped in `FixturesPage.jsx` (bold winning team, `.stat-badge-neutral`
  score pill for played games, plain "Not yet played" text otherwise).
  `MatchupCard` already uses `.panel p-4`; keep that wrapper.

## Out of scope

- Any other page - this is the last of the five 12a-12e sub-items; nothing
  else in build-plan item 12 remains after this.
- Any new API endpoint, query, derived statistic, CSS token, or component
  class. Everything needed (`.panel`, `.panel-title`, `.stat-badge`,
  `.stat-badge-neutral`) already exists from 12a/12b.
- Changing route paths, query keys, phase-tab selection logic, matchup
  grouping/sorting logic, or any other behavioral contract - this is a
  presentational restyle only.

## Build loop

Follow `workflow.stepReview: "feature"` (one review packet after all steps)
and `workflow.checkpointCommits: "disabled"` (no per-step commits; `/complete`
makes the single work commit).

## Build steps

- [x] 1. Restyle `PlayoffsPage.jsx`: change the phase tabs to `tabs-sm`.
  In `MatchupCard`, replace the `<h3 className="mb-3 font-semibold">` with
  `<h3 className="panel-title mb-3">`, and restyle each row with the exact
  winner/score-pill pattern from `FixturesPage.jsx`: bold the winning
  team's name (compute `localWon`/`roadWon` from `game.played` and
  `game.localScore`/`game.roadScore` with `!= null` guards, same as
  `FixturesPage.jsx`), replace the plain score text with a
  `.stat-badge-neutral` pill for played games, and keep plain "Not yet
  played" text otherwise. Keep the existing `MatchupGroups` grouping/
  sorting logic, the postseason-phase filtering, and the empty states
  ("No games scheduled yet for this phase." and "The postseason has not
  started yet for this season.") unchanged. Done when: a phase with
  scheduled matchup games shows the restyled cards with winner emphasis and
  score pills, and both empty states still render correctly (a season/phase
  with no postseason data, and a selected phase with no games yet).
- [x] 2. Verify both themes and run the smoke check. Toggle to
  `light-euroleague` and confirm the restyled playoffs page reads correctly
  in both themes. Run `cd frontend && npm run test:browser` and confirm the
  existing smoke test still passes unmodified. Done when: both themes look
  correct on the playoffs page, and `npm run test:browser` passes.

## Files / areas

- `frontend/src/playoffs/PlayoffsPage.jsx`

## Data / contracts

No API, data model, or CSS token changes. Reuses `.panel`, `.panel-title`,
`.stat-badge`, and `.stat-badge-neutral` exactly as defined in
`frontend/src/index.css` by feature 12a.

## Testing

No test runner is configured for frontend logic, and this feature adds no
logic - nothing here meets the unit test scope rule. `Browser tests`
(`cd frontend && npm run test:browser`) is configured; step 2 runs the
existing smoke test as regression evidence. No new Playwright spec is
added: this feature touches no new behavioral surface beyond what the
smoke test and manual verification already cover.

## Notes for the AI

- `E2025` and `E2026` may both have no postseason games yet (regular
  season in progress); verify the "postseason has not started" empty state
  using whichever season/phase combination the live data actually produces
  it for, rather than assuming one.
- Reuse the winner/score-pill JSX inline in `MatchupCard` rather than
  extracting a shared component; the spec's earlier features (12a-12c) did
  the same targeted inline reuse rather than introducing a new shared row
  component, since the exact row shape (team-vs-opponent style, home/away
  labels, etc.) still differs slightly between pages.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4418,"specSha256":"6b46ac6a8a34f96c55230f68cb7de7dfd147537f95aef794ed279b646fdfe412","branch":"refs/heads/feature/playoffs","head":"e2493220e81900ffcdb36e5bd03ffd309ca702a7","baseRef":"refs/heads/master","baseCommit":"e2493220e81900ffcdb36e5bd03ffd309ca702a7","sourceTree":"627338e5d18260292451e8eb9360ce7c1c1acb3e","absentOptional":[]} -->
