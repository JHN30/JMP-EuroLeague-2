# Feature: Event-level game flow

**From build-plan:** feature 18b
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/event-level-game-flow`

## Goal

Rebuild Game Detail's Game flow tab from the play-by-play events added in
18a: lead changes and ties, each team's biggest lead, longest scoring run,
an event-resolution score-differential chart with period boundaries, and
turning-point cards, per `UI-UX.md` §6.9 `mode="flow"`. Keep the existing
period-score table unchanged.

## Design reference

`UI-UX.md` §6.9 "`mode="flow"` — Game flow" (lines ~807-820).

## In scope

- Compute, client-side, from the already-fetched play-by-play events (no new
  backend endpoint - this app's established pattern is presentational
  aggregation in the frontend from already-scoped rows, matching Season
  Overview's phase/trend computations):
  - Lead changes (running margin crossing zero) and tie count.
  - Each team's biggest lead: peak margin in that team's favor, with the
    period/clock/score moment it happened.
  - Each team's longest scoring run: most consecutive points scored without
    the other team scoring between them, with its start/end moment.
- Four compact `FlowMetric` panels: Lead changes (with tie count), each
  team's biggest lead (tinted primary/secondary, annotated with the moment),
  and the longer of the two teams' longest runs (naming that team).
- A `ScoreFlowChart`: one point per scoring event, running margin on the y
  axis, split-colored above/below zero (success favors home, error favors
  away, matching the existing chart's convention), a dashed vertical line at
  each period boundary (a small inline Chart.js plugin - no new dependency),
  period labels, and a per-point tooltip with period, clock, and score.
- Four `MomentCard`s (turning points): each team's peak lead and each team's
  best run, with crest, headline, and the moment description.
- Keep the existing `PeriodTable` (quarter-by-quarter score/margin grid)
  exactly as it is today.
- Extend `playByPlayQuery` to also run for the `game-flow` tab (currently
  scoped to `play-by-play` only), still gated on `game.played`.
- Honest empty/insufficient-data states: fewer than 2 scoring events (a
  barely-started or data-sparse game) shows a plain "Not enough play-by-play
  yet to chart game flow" message instead of an empty or broken chart.

## Out of scope

- Shot charts and shooting studio - features 18c/18d.
- Any change to the play-by-play log itself (18a) beyond reusing its query.
- Replacing `formatPeriod`/box-score-derived `PeriodTable`.

## Build loop

Continuous Mode: self-review each step, no per-step pause; one final packet.

## Build steps

- [x] **Step 1 - Flow analytics from play-by-play** - Add the client-side
  computation (lead changes/ties, per-team biggest lead with moment, per-team
  longest run with moment span) as a pure function over the sorted event
  list. *Done when:* against a real finished `E2025` game the computed lead
  changes/biggest leads/longest runs match a manual read of the event log
  (spot-checked in the browser dev console or a scratch script), and an
  unplayed/sparse game degrades to the honest empty state instead of
  throwing.
- [x] **Step 2 - FlowMetric panels and turning-point cards** - Build the four
  compact metric panels and the four `MomentCard`s. *Done when:* both render
  correctly for a real finished game, with non-color-only labelling (team
  name/value, not tint alone).
- [x] **Step 3 - Score-differential chart** - Replace `GameFlowChart`'s
  period-resolution line with the event-resolution `ScoreFlowChart`
  (split-colored fill, dashed period-boundary plugin, per-point tooltip).
  *Done when:* the chart renders for a real game with correctly placed period
  boundaries and a tooltip showing period/clock/score per point, themed for
  both light and dark mode.
- [x] **Step 4 - Wire the tab and verify** - Enable `playByPlayQuery` for the
  `game-flow` tab, assemble the tab content (metrics, chart, turning points,
  existing period table), and verify: backend/frontend build and lint, direct
  browser check of a played game (including at least one overtime game) and
  a scheduled game's empty state, console/network clean.

## Files / areas

- `frontend/src/games/GameDetailPage.jsx`

## Data / contracts

- No new endpoint or schema; reuses 18a's `getPlayByPlay` response
  (`{ events: PlayByPlayEvent[] }` with `periodNumber`, `pointsA`/`pointsB`,
  `markerTime`, `playType`, `clubCode`).
- Purely a presentational computation; no persisted state.

## Testing

- No unit-test runner configured; rely on backend/frontend build, frontend
  lint, and direct browser verification (a finished regular game, a finished
  overtime game, and a scheduled `E2026` game for the empty state).

## Notes for the AI

- Reuse the existing `themeColor`/`useActiveTheme` import already
  consolidated in 17i/18a; do not add a third copy.
- A "run" resets whenever the scoring team changes, not at every basket by
  the same team streaking with intervening misses/turnovers - use the
  scoring-event sequence (`2FGM`/`3FGM`/`FTM`), not the full event stream, so
  intervening non-scoring events don't break a run.
- The event-resolution chart described by the guideline is materially
  different from the existing period-resolution `GameFlowChart` (one point
  per event vs. one point per quarter); reuse its theming approach, not its
  data shape.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5439,"specSha256":"be4d344305b2e92bd842ee243f61330e19063ce85c271c35c28036df025f7f26","branch":"refs/heads/feature/event-level-game-flow","head":"8fd2c2584d3b6cababa53a5ca91196a64bde3afc","baseRef":"refs/heads/master","baseCommit":"8fd2c2584d3b6cababa53a5ca91196a64bde3afc","sourceTree":"31dc4dd92bfaeb0c1b22efb6d8611e00acb62de0","absentOptional":[]} -->
