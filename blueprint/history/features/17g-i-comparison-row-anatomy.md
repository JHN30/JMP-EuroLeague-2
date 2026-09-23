# Feature: Comparison row anatomy

**From build-plan:** feature 17g-i
**Build attempt:** 1
**Branch:** feature/comparison-row-anatomy
**Status:** verified

## Goal

Rebuild the Comparisons page's stat-comparison rows (both team and player)
to the guideline's `MetricComparison` anatomy, and add a swap control and a
copy-link action, per build-plan item 17g-i. This is the first of two
reviewable parts of build-plan item 17g; the second (a new cross-season
head-to-head route, 17g-ii) is a separate spec.

## Design reference

No `prototypes/` mockup covers this page. `UI-UX.md` §7.8 (Compare, lines
1188-1220) is read for intent, not literally: its route (`/compare`), file
path, and full page redesign (identity-row cards, a page of `Metric
Comparison` cards in a grid) don't apply - this app keeps its existing
`ComparisonsPage.jsx` structure (entity pickers, phase/mode selects, tabs)
and only rebuilds each row's own visual anatomy plus the two named
interactions. The exact anatomy quoted from §7.8 is used precisely: "the
label centred in small caps, then two halves. The winning side gets
`bg-primary/10 text-primary`; both sides carry a 6px bar whose width is
scaled into a 35-100% band ... and the right bar is `ml-auto` so the pair
mirrors around the centre. Metrics where less is better ... are flagged
with a 'Lower is better' caption and invert the winner test. Missing values
render `—` with a zero-width bar." The header action is named directly:
"Copy comparison link, which writes `window.location.href` to the
clipboard and flips its own label to 'Link copied'."

## In scope

- A new `ComparisonRow` component replacing each `<tr>` in
  `TeamComparisonTable` and `PlayerComparisonTable` (`ComparisonsPage.jsx`):
  centred label on top, two mirrored halves below. Bar width is scaled by
  relative magnitude between the two raw values into a 35-100% band (the
  larger value's bar is 100%, the smaller value's bar is
  `35 + (smaller/larger) * 65` percent, so even a near-tie still shows a
  visible gap and the trailing bar is never fully collapsed); the right
  bar uses `ml-auto`. The winning side (from the existing `winnerSide`
  helper and the existing `TEAM_METRIC_DIRECTIONS`/
  `PLAYER_METRIC_DIRECTIONS` maps, both already correct and reused
  unchanged) gets `bg-primary/10 text-primary`; bar width itself is not
  inverted for lower-is-better metrics, only which side is tinted as the
  winner - so a turnovers row still shows each side's bar sized to its own
  raw value, with the smaller (better) one tinted.
- A "Lower is better" caption on rows whose direction is `"lower"`.
- Missing-value handling: a side with a null/undefined value renders an em
  dash and a zero-width bar for that side only (the other side, if present,
  still renders its own bar normally, not compared against anything).
- Group header rows in `PlayerComparisonTable` (Traditional/Advanced/
  Scoring/Misc) stay as section dividers between the new row blocks,
  unchanged in position and content.
- A swap control (`btn-outline btn-square`, a bidirectional arrow icon)
  between the two entity pickers, swapping `entityA`/`entityB` in place.
- URL sync for the current selection so the page is shareable: extend the
  existing one-time `teamA`/`teamB` URL read (currently only used to seed
  initial state on mount) into an ongoing sync - `teamA`/`teamB` when
  `view === "teams"`, `playerA`/`playerB` when `view === "players"` -
  updated whenever the selection changes, mirroring the URL-sync pattern
  already used elsewhere in this app (e.g. the standings/leaderboard pages'
  `useSearchParams` usage).
- A "Copy comparison link" header action next to the page title: writes
  `window.location.href` to the clipboard via `navigator.clipboard`, and
  its own label flips to "Link copied" for a few seconds, matching the
  guideline's stated behavior verbatim. Disabled (or hidden) until both
  entities are selected, since there's nothing meaningful to copy before
  then.

## Out of scope

- Any restructuring of the page beyond the rows/swap/copy-link named above
  - the entity pickers, phase/mode selects, verdict strip, season-series
    list, and trends tab stay exactly as they are.
- The head-to-head route, its cross-season data, series hero, margin
  timeline, momentum splits, and notable meetings - build-plan item
  17g-ii, a separate spec.
- Any backend change - every value these rows render is already fetched by
  the existing `TeamComparisonTable`/`PlayerComparisonTable` queries.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (self-review
each step, one review packet at the end) and `workflow.checkpointCommits` is
`disabled` (no per-step commits; `/complete` makes the one feature commit).

## Build steps

- [x] 1. Build the `ComparisonRow` component (centred label, mirrored
      35-100%-banded bars, winner tint, "Lower is better" caption, em-dash/
      zero-width missing-value handling) and use it in place of the current
      `<tr>` rendering in both `TeamComparisonTable` and
      `PlayerComparisonTable`, keeping the existing group-header dividers
      in the player table.
      **Done when:** every comparison row shows the centred-label,
      mirrored-halves layout with a visible band-scaled bar on each side,
      the winning side (including inverted lower-is-better rows, e.g.
      turnovers) is tinted correctly, a metric missing on one side shows an
      em dash and no bar on that side only, verified in the running app
      against a known team pair and a known player pair; `npm run build`
      passes.
- [x] 2. Add the swap control between the entity pickers, sync the current
      selection into the URL (`teamA`/`teamB` or `playerA`/`playerB`
      depending on `view`), and add the "Copy comparison link" header
      action.
      **Done when:** clicking swap exchanges the two selections (and their
      comparison rows update accordingly), the URL reflects the current
      selection after picking or swapping entities, opening a copied link
      in a fresh tab restores the same comparison, clicking "Copy
      comparison link" copies the current URL and shows "Link copied" for
      a few seconds before reverting; verified in the running app; `npm run
      build` passes.

## Files / areas

- `frontend/src/comparisons/ComparisonsPage.jsx` - all changes (kept in
  this single file, matching this codebase's established per-page
  convention).

## Data / contracts

No backend change and no new data. Reused as-is:
`winnerSide`, `TEAM_METRIC_DIRECTIONS`, `PLAYER_METRIC_DIRECTIONS`,
`TeamComparisonTable`'s standings data, `PlayerComparisonTable`'s
`getPlayerSeasonStats` data.

## Testing

- No unit test runner configured; `npm run build` is Verify for each step,
  plus direct browser verification (bar widths/tint for a known team pair
  and player pair, missing-value rows, swap, URL sync, copy-link) since
  there's no browser-test coverage for this page.
- Verify a metric where the two sides are nearly equal (confirms the
  35% floor still shows a visible edge), a metric with a large gap
  (confirms the 100% cap), and a metric missing on one side (a player who
  hasn't recorded a Misc-group stat, or a team standings entry with a null
  `basic` field).

## Notes for the AI

- Bar width formula operates on raw magnitude only; direction affects only
  which side is tinted as the winner, not bar sizing - this matches the
  guideline's separation of "winner test" (invertible) from bar scaling
  (not inverted).
- Reuse `navigator.clipboard.writeText` for the copy action; no existing
  clipboard helper exists in this codebase to reuse, and none is needed
  beyond this one small handler.
- Keep `TeamPicker`/`PlayerPicker` components unchanged apart from adding
  the swap button between them; don't restructure the selection row into
  the guideline's `md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]` layout
  unless it's needed to fit the swap button - a minimal `flex`/`grid`
  wrapper around the two existing pickers is enough.

## Open questions

None - every value and interaction this feature needs is already fetched
or is a small, self-contained new handler with no product ambiguity.
