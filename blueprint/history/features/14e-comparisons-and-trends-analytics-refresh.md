# Feature: Comparisons and trends analytics refresh

**From build-plan:** feature 14e
**Build attempt:** 1
**Branch:** feature/comparisons-and-trends-analytics-refresh
**Status:** verified

## Goal

Bring the team comparison view in line with the rest of the analytics-forward
refresh (14a-14d): add a verdict KPI strip, a season-series panel, and
non-color-only winner markers on stat comparison rows, per
`prototypes/comparisons.html`.

## Design reference

`prototypes/comparisons.html` (`.kpi-strip`/`.kpi-chip`, `.series-row`,
`.cmp-value .winner-mark`). The prototype's window toggle (L3/L6/L10/Season)
and its "Point differential trend" chart are illustrative extras not in the
build-plan line for 14e and are out of scope here (see Out of scope). Port
only the classes this feature actually uses; do not add unused prototype
markup.

## In scope

- A verdict KPI strip above the Teams comparison table, shown only when both
  Team A and Team B are selected, with three chips:
  - **Season series** - head-to-head record between the two selected teams in
    the selected phase this season, as `<winsA>-<winsB>`. Prefix the value
    with the leading team's short name when one side has more head-to-head
    wins (e.g. "PAO 1-0"); show the plain score with no prefix when tied,
    including 0-0.
  - **Categories won** - count of `TEAM_METRICS` rows (see Data / contracts)
    where each team's standings value leads the other, as `<countA>-<countB>`.
    Label reads "Categories won" plus the leading team's short name, or "Even"
    when tied.
  - **Better recent form** - whichever team has the better record across its
    last 10 played games this season (all games, not just head-to-head), tie
    broken by average point differential over that window. Value is the
    leading team's short name, or "Even" when tied (including when neither
    team has played yet).
- A season-series panel (new panel section) below the KPI strip, listing every
  head-to-head game between Team A and Team B in the selected phase this
  season, ordered by round: played games show the round, final score, and a
  non-color-only indicator of which team won; unplayed/scheduled fixtures show
  the round and scheduled date/time (reuse the existing `formatDateTime`
  pattern already used on the team page). Render an empty state ("No matchups
  this phase yet.") when the two teams have no games against each other in the
  selected phase.
- Non-color-only winner markers on stat comparison rows, applied to **both**
  the Teams and the Players comparison tables: next to the leading side's
  value, render a small triangle glyph (`&#9650;`) with an accessible label
  naming which side leads (e.g. `title="<name> leads"`), matching the
  prototype's `.winner-mark`. No marker when the metric is direction-neutral
  (see Data / contracts) or the two values are equal or not both available.
- Reuse the existing shared design tokens (`.panel`, `.kpi-strip`,
  `.kpi-chip`) already defined in `frontend/src/index.css` from 14a-14d; add
  only the new `.series-row`/`.winner-mark`-equivalent classes this feature
  needs.

## Out of scope

- The prototype's L3/L6/L10/Season game-window toggle - not named in the
  build-plan line for 14e; the comparison table keeps showing full-season
  standings values as it does today.
- The prototype's "Point differential trend" chart - the page's existing
  "Points scored trend" section (`TrendSection`) is unchanged.
- Verdict KPI strip and season-series panel for the Players comparison view -
  a season series is a team-vs-team concept; two selected players' teams may
  not have played each other, may be teammates, or may have played multiple
  times outside a clean "series" framing. Winner markers still apply to player
  rows (explicitly named in the build-plan line), but the KPI strip and series
  panel stay Teams-only, matching the prototype.
- Any backend/API change - all data needed (standings, team games, team
  abbreviations) is already exposed by existing endpoints.

## Build loop

Follow `workflow.stepReview: "feature"`: build all steps below, then present
one final review packet instead of stopping after each step.
`workflow.checkpointCommits: "disabled"`: no intermediate commits: `/complete`
makes the single work-level commit after review.

## Build steps

- [x] 1. **Winner markers on both comparison tables.** Add a small `winnerSide`
   helper (module-level, in `ComparisonsPage.jsx`) that takes two raw values
   and a direction (`"higher"` | `"lower"` | `"neutral"`) and returns
   `"a"`, `"b"`, or `null` (tie, neutral, or either side not a finite number
   after `Number(value)` coercion). Add a `TEAM_METRIC_DIRECTIONS` map keyed
   by the existing `TEAM_METRICS` keys (see Data / contracts) and a
   `PLAYER_METRIC_DIRECTIONS` map keyed by every option key across
   `PLAYER_METRIC_GROUPS`. In `TeamComparisonTable` and
   `PlayerComparisonTable`, compute the winning side per row and render the
   triangle marker (`&#9650;`) next to that side's `<td>` value with a
   `title`/accessible name identifying the leading team or player by its
   `label`. Add `.winner-mark` CSS to `frontend/src/index.css` (small inline
   glyph, `color: var(--color-primary)`, not the row's only distinguishing
   style). Done when: on `/E2025/comparisons` with two teams selected, a
   metric where the teams differ (e.g. PF) shows the triangle next to the
   leading team's value only, confirmed by reading the rendered DOM
   (`title` attribute present) via the running dev server; same check for two
   players on a metric such as PTS.
- [x] 2. **Season-series panel.** Add a `TeamSeriesSection` component that queries
   `getTeamGames(seasonCode, entityA.id, { limit: 100 })` and
   `getTeamGames(seasonCode, entityB.id, { limit: 100 })` using the same
   `["trend-games", seasonCode, "teams", <id>]` query key `TrendSection`
   already uses (so TanStack Query dedupes the network call once `TrendSection`
   also mounts), filters the A-side games to where the opponent
   (`localTeam`/`roadTeam` clubCode not equal to `entityA.id`) equals
   `entityB.id` and `game.phaseCode === phaseCode`, and sorts by
   `roundNumber`. Render one `.series-row`-equivalent list item per matchup:
   played games show round label, final score, and bold/underline (not color
   alone) on the winning team's name; scheduled games show round label and
   `formatDateTime(game.scheduledAt)`. Show the empty-state copy when the
   filtered list is empty. Mount this section (Teams view only, both entities
   selected) above the existing "Comparison" section. Done when: comparing two
   teams that played each other this phase shows their actual result(s) with
   correct scores and winner styling, verified against the live app for a
   known pair from the standings screenshot data (e.g. two teams from the same
   phase) via the running dev server.
- [x] 3. **Verdict KPI strip.** Add a `TeamVerdictStrip` component (Teams view only,
   both entities selected) that reuses the standings query
   (`["standings", seasonCode, phaseCode]`, same key as
   `TeamComparisonTable`) and the two team-games queries from step 2 to
   compute the three chips described in In scope. Look up each team's
   `abbreviatedName` from the already-loaded `allTeams` list (fall back to
   `entity.label` if not found). Mount it directly above the season-series
   panel using the existing `.kpi-strip`/`.kpi-chip` classes. Done when: the
   three chips render with correct values for a selected pair, cross-checked
   against the season-series panel's own head-to-head list and against the
   standings table's PF/PA/DIFF for that pair, via the running dev server.
- [x] 4. **Verify.** Run `cd frontend && npm run lint` and `cd frontend && npm run
   build`. Take a desktop and a ~390px-wide screenshot of
   `/E2025/comparisons` (Teams view, two teams selected) via the running dev
   server and confirm the KPI strip, series panel, and winner markers all
   render without overflow or clipping, matching the mobile pattern already
   used elsewhere on this page (`overflow-x-auto` on wide tables). Done when:
   lint and build pass, and both screenshots show the three new pieces
   correctly.

## Companion fix (out of original spec scope)

While verifying the winner markers live against `PlayerComparisonTable`, found
that both players' stat queries always returned identical (wrong) data:
`getLeaderStats` (`frontend/src/lib/api.js`) does not forward a `personKey`
parameter, so `PlayerComparisonTable`'s calls to
`getLeaderStats(seasonCode, { phase, mode, personKey: entityA.id })` silently
dropped the filter and both sides fetched the same unfiltered page. This bug
predates 14e (present since the comparisons feature originally shipped) and
made the Players comparison view non-functional. With the user's explicit
approval, fixed in this branch by switching `PlayerComparisonTable` to
`getPlayerSeasonStats(seasonCode, entityA.id, { phase, mode })` /
`getPlayerSeasonStats(seasonCode, entityB.id, { phase, mode })`, the existing
API function that already forwards `personKey` correctly. No API changes;
`getLeaderStats` import removed since nothing else in the file used it.
Verified live: distinct players (Vezenkov vs. Nunn) now show distinct,
correct per-metric data with correctly-placed winner markers.

## Files / areas

- `frontend/src/comparisons/ComparisonsPage.jsx` - add `TEAM_METRIC_DIRECTIONS`,
  `PLAYER_METRIC_DIRECTIONS`, `winnerSide`, `TeamVerdictStrip`,
  `TeamSeriesSection`; extend `TeamComparisonTable`/`PlayerComparisonTable`
  with marker rendering; mount the two new sections in `ComparisonsBody`
  (Teams view only, gated on `entityA && entityB`, alongside the existing
  `TrendSection` gate); companion fix switches `PlayerComparisonTable`'s stats
  queries from `getLeaderStats` to `getPlayerSeasonStats` (see Companion fix).
- `frontend/src/index.css` - add `.winner-mark` and `.series-row`-equivalent
  classes (reuse `.panel`, `.kpi-strip`, `.kpi-chip` as-is).
- `frontend/src/lib/statsFields.js` - no changes; `TEAM_METRICS` and
  `PLAYER_METRIC_GROUPS` are read-only inputs to the new direction maps.

## Data / contracts

No API or persisted-data changes. All data comes from already-exposed
endpoints: `getSeasonStandings` (`basic.*` fields), `getTeamGames`
(`localTeam`/`roadTeam`/`localScore`/`roadScore`/`played`/`phaseCode`/
`roundNumber`/`roundName`/`scheduledAt`), and `getSeasonTeams`
(`abbreviatedName`). Coerce every compared value with `Number(value)` before
comparison (standings' `winPercentage` is a numeric string; other fields are
already numbers) and treat `NaN`/`null`/`undefined` as "not comparable" (no
marker, excluded from the categories-won count).

Winner-marker direction per metric (higher-is-better, lower-is-better, or
neutral/no-marker):

**`TEAM_METRICS`:**

| key | direction |
| --- | --- |
| gamesPlayed | neutral |
| gamesWon | higher |
| gamesLost | lower |
| winPercentage | higher |
| pointsFor | higher |
| pointsAgainst | lower |
| pointsDifference | higher |

**`PLAYER_METRIC_GROUPS`:**

| key | direction | key | direction |
| --- | --- | --- | --- |
| pointsScored | higher | trueShootingPercentage | higher |
| totalRebounds | higher | reboundsPercentage | higher |
| assists | higher | assistsToTurnoversRatio | higher |
| steals | higher | possessions | neutral |
| turnovers | lower | twoPointRate | neutral |
| blocks | higher | threePointRate | neutral |
| pir | higher | pointsFromTwoPointersPercentage | neutral |
| minutesPlayed | neutral | pointsFromThreePointersPercentage | neutral |
| gamesPlayed | neutral | pointsFromFreeThrowsPercentage | neutral |
| effectiveFieldGoalPercentage | higher | wins | higher |
| | | losses | lower |
| | | doubleDoubles | higher |
| | | tripleDoubles | higher |

The "Misc" group's `wins`/`losses` are separate metric-group keys from
`TEAM_METRICS`' `gamesWon`/`gamesLost` and get their own map entries.

## Testing

No test runner is configured for the frontend (`AGENTS.md` Commands: lint and
build only, no unit test command). Verify via `npm run lint`, `npm run build`,
and live browser evidence per the Verify step above.

## Notes for the AI

- Match the existing code style in `ComparisonsPage.jsx`: plain function
  components, TanStack Query hooks, no new dependencies.
- `TrendSection` already demonstrates the exact games-query and phase-filter
  pattern (`["trend-games", seasonCode, view, entityId]`,
  `game.phaseCode !== phaseCode` skip) reuse it rather than inventing a new
  fetch shape.
- Keep the KPI strip and series panel out of the Players view entirely (no
  empty/disabled placeholder) - the "Out of scope" section covers why.
- Do not add a window-size toggle, don't fabricate venue data (not returned by
  any endpoint) for scheduled fixtures.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":12827,"specSha256":"e3c09b0b93995b0d66c42e09d109a5ed629c48fbd94e0f69b1cbdaa7cd2b3949","branch":"refs/heads/feature/comparisons-and-trends-analytics-refresh","head":"3454aed37198f33611fedf990c44e8377e5c73e5","baseRef":"refs/heads/master","baseCommit":"3454aed37198f33611fedf990c44e8377e5c73e5","sourceTree":"ff36bc306d43b3df8f73e903f6437e6e917c1ccd","absentOptional":[]} -->
