# Feature: Badge taxonomy and content conventions

**From build-plan:** feature 15f-iii
**Build attempt:** 1
**Status:** verified

**Branch:** feature/badge-taxonomy-and-content-conventions

## Goal

Apply UI-UX.md section 8.4's badge taxonomy consistently to the badges the
app already has, and adopt its content rules (section 12 / 8.2): specific
present-participle loading text that names the actual work instead of a
generic "Loading", and empty states that suggest a next action where one
exists. Sort/ranking rules are already surfaced today (visible metric and
direction selects on every leaderboard; a tooltip explaining a standings
tie-break) and are out of scope here.

## In scope

- Badge taxonomy: the app has a small, already-mostly-consistent set of
  DaisyUI `.badge-*` usages (standings W/L, a tie-break tooltip marker, a
  player registration active/inactive marker). Fix the one real mismatch:
  `players/PlayerPage.jsx`'s registration marker uses `badge-success` for
  "active", but the taxonomy reserves `badge-success` for W/L results and
  `badge-primary` (solid) for "active state" - change it to `badge-primary`.
  `badge-ghost` for the inactive/former case already matches the taxonomy
  and is unchanged.
- Loading text: add an optional `label` prop to `AsyncState` (default
  `"Loading"`, already added) and pass specific present-participle text
  ("Loading standings…", "Loading fixtures…", etc.) at every
  `status="loading"` call site across the app, so the accessible name of
  the spinner names the actual work instead of a generic "Loading" at every
  one of the app's ~35 loading surfaces.
- Empty states: review every `EmptyText` message and add a concrete next
  step only where one genuinely exists (e.g. a search with no results can
  suggest trying a different term; a phase with no data yet cannot suggest
  anything true, so it stays a plain statement). Do not invent an action
  that isn't real.

## Out of scope

- Introducing badges for metadata the app doesn't display yet (jersey
  numbers, starter markers, overtime/scheduled indicators, close-game
  flags) - those surfaces don't exist yet and belong to the features that
  add them (17c/17d/17e box scores and rosters), not this content pass.
- Redesigning score displays (`stat-badge`/`stat-badge-positive/negative/
  neutral`) into DaisyUI `.badge-*` classes - this is an established,
  already-consistent local convention for scores specifically, distinct
  from the metadata-badge taxonomy, and changing it is a visual redesign
  beyond a content/consistency pass.
- Sort/tie-break disclosure - already adequately surfaced (visible
  metric/direction controls, a standings tie-break tooltip); no changes.
- Async/loading-state correctness (15f-i) and filter-state architecture
  (15f-ii) - already done.

## Build loop

Follow `workflow.stepReview: "feature"` (self-review, one final packet) and
`workflow.checkpointCommits: "disabled"` (no per-step commits; `/complete`
makes the one feature commit).

## Build steps

- [x] 1. Fix the registration badge in `players/PlayerPage.jsx`:
      `badge-success` -> `badge-primary` for the active case.
      **Done when:** `npm run lint` passes and the active/inactive colors
      still read correctly against both themes (checked visually via CDP).

      Verified via CDP: a real player page's registration badge renders as
      `badge badge-sm badge-primary` with text "Active".
- [x] 2. Add specific `label` text to every `AsyncState status="loading"`
      call site (`App.jsx`, `SeasonLayout.jsx`, and every page/section
      component listed under Files / areas), naming the actual data being
      loaded (e.g. "Loading seasons…", "Loading standings…", "Loading the
      box score…"). Leave the two truly generic top-level shell loaders
      (`App.jsx`'s and `SeasonLayout.jsx`'s season-resolution spinners) as
      "Loading" only if no more specific label is meaningful at that point;
      otherwise use "Loading seasons…".
      **Done when:** `npm run build` passes and a CDP accessibility check
      shows a handful of representative spinners (Standings, Fixtures, a
      Team page section, Game detail) exposing their specific `aria-label`
      instead of the old generic "Loading".

      All 35 `status="loading"` call sites across the app now pass a
      specific `label` (confirmed by grep: zero remaining `status="loading"`
      sites without a `label=` prop). `AsyncState`'s `label` prop defaults to
      "Loading" so nothing regresses if a future call site omits it.
- [x] 3. Review every `EmptyText` message in `frontend/src` and add a next
      step only where a real one exists. Concretely: `PlayersPage`'s
      search-empty case gets "Try a different name." appended; leave every
      "not available yet"/"not found" message as-is, since there is no
      truthful action to suggest for missing archive data.
      **Done when:** `npm run build` passes and the updated copy renders
      correctly via CDP.

      Also updated Fixtures' filter-empty case ("No games match these
      filters." -> "...Try a different round or status.") since it has the
      same genuine next step as the Players search case. Verified both via
      CDP: typing a non-matching search on Players rendered "No players
      match your search. Try a different name." exactly.

## Files / areas

- `frontend/src/lib/AsyncState.jsx` (`label` prop - already added)
- `frontend/src/App.jsx`
- `frontend/src/season/SeasonLayout.jsx`
- `frontend/src/comparisons/ComparisonsPage.jsx`
- `frontend/src/games/FixturesPage.jsx`
- `frontend/src/games/GameDetailPage.jsx`
- `frontend/src/players/PlayerPage.jsx`
- `frontend/src/players/PlayersPage.jsx`
- `frontend/src/playoffs/PlayoffsPage.jsx`
- `frontend/src/standings/StandingsPage.jsx`
- `frontend/src/statistics/StatisticsPage.jsx`
- `frontend/src/teams/TeamPage.jsx`
- `frontend/src/teams/TeamsPage.jsx`

## Data / contracts

None - presentation and copy only.

## Testing

No unit test runner is configured. Verification is `npm run lint`,
`npm run build`, and CDP evidence for the accessible loading labels and
updated empty-state copy.

## Notes for the AI

- `AsyncState`'s `label` prop already defaults to `"Loading"`, so any call
  site not explicitly updated keeps working exactly as before - update
  call sites incrementally without risk of a broken intermediate state.
- Keep each label short and specific to what's actually being fetched at
  that call site (e.g. "the box score", "the roster", "team statistics"),
  matching the noun already used in that section's error message for
  consistency (e.g. `TeamPage`'s roster error says "Could not load the
  roster." - the loading label should say "Loading the roster…").


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6759,"specSha256":"af40e6f75f30190c50030830ec5a3f20a539f9aba4b00818763057ef300245fa","branch":"refs/heads/feature/badge-taxonomy-and-content-conventions","head":"17e533411e68c0645912875a371996d583f74020","baseRef":"refs/heads/master","baseCommit":"17e533411e68c0645912875a371996d583f74020","sourceTree":"a7e748919bd2f86ef896c1fca789488562bc79a0","absentOptional":[]} -->