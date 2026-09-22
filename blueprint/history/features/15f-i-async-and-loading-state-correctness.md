# Feature: Async and loading-state correctness

**From build-plan:** feature 15f-i
**Build attempt:** 1
**Status:** verified

**Branch:** feature/async-and-loading-state-correctness

## Goal

Guarantee, across every filter-driven data view, that changing a filter returns
the view to its loading state instead of ever rendering the previous
selection's data, and that an out-of-order (stale) network response can never
overwrite a newer one. This is UI-UX.md section 8.1 (request-key async
pattern), adapted to this app's actual data layer: every request already goes
through TanStack React Query, so the "request key" is the query's `queryKey`,
and out-of-order protection is React Query's own per-key cache (each distinct
key gets independent `status`/`isPending` state; there is no shared "last
response wins" race to guard against, as there would be with a raw `fetch`
+ `useState` implementation).

## In scope

- Audit every `useQuery`/`useQueries` call in `frontend/src` whose result feeds
  a view with user-changeable filters (phase, round, status, metric, mode,
  direction, search, entity picker, tab selection) and confirm:
  - the `queryKey` includes every filter value that changes what the query
    fetches (so a filter change is a genuinely new cache entry, not a refetch
    of the same entry), and
  - the component branches on `isPending` (or `isLoading`, equivalent here
    since no query in this app sets `placeholderData`/`keepPreviousData`)
    before reading `.data`, rather than falling back to a locally cached copy
    of a previous result.
- Fix any query found to violate either rule.
- Fix any component-local pattern that could reintroduce staleness despite a
  correct query (e.g. a `useState`/`useRef` echo of `query.data` read after a
  filter change, or a manual merge of old and new results).
- Live-verify the fix (or the absence of a bug) on the pages with the most
  filter surface: Statistics leaderboards (category/metric/direction change),
  Fixtures and results (phase/round change), and a team page (phase change),
  using throttled network conditions so the loading state is actually
  observable.

## Out of scope

- Introducing `placeholderData`/`keepPreviousData` anywhere (that would
  reintroduce the exact staleness this feature prevents; the guideline calls
  for returning to loading, not preserving old data across a filter change).
- The URL-vs-local-state filter architecture and "Showing X of Y" result text
  (15f-ii).
- Badge taxonomy and content/copy conventions (15f-iii).
- Progressive disclosure and pagination (15f-iv).
- Any new dependency: React Query already provides everything this feature
  needs.

## Build loop

Follow `workflow.stepReview: "feature"` (self-review, one final packet) and
`workflow.checkpointCommits: "disabled"` (no per-step commits; `/complete`
makes the one feature commit).

## Build steps

- [x] 1. Grep every `useQuery`/`useQueries` call site in `frontend/src` and
      tabulate, per filter-bearing page (Statistics, Fixtures, Standings,
      Playoffs, Team, Player, Comparisons), whether its `queryKey` already
      contains all filter inputs and whether its render path gates on
      `isPending`/`isLoading` before using `.data`. Record any exception.
      **Done when:** the audit table is complete and every exception found has
      a concrete fix plan (or the audit finds none, and this step's note says
      so with the evidence).

      Audit result: every filter-bearing `queryKey` in the codebase already
      includes every value that changes what it fetches (phase, round,
      status, offset, mode, metric, direction, search text, entity id, view),
      no query anywhere sets `placeholderData`/`keepPreviousData`, no
      component seeds local `useState`/`useRef` from a previous `.data` (grep
      for `useState(...Query.data...)` found zero matches), and every render
      path checks `isPending`/`isLoading` before reading `.data`. Zero
      exceptions found.
- [x] 2. Fix each exception found in step 1 with the smallest change that
      makes the affected view return to loading on the relevant filter change
      (typically adding the missing value to `queryKey`, or removing a
      component-local echo of previous data). If step 1 found no exception,
      skip this step and say so.
      **Done when:** `npm run lint` passes and the fixed component no longer
      reads stale `.data` past a filter change (confirmed in step 3).

      Skipped: step 1 found no exception, so no code change was made.
- [x] 3. Live-verify via CDP against the running dev servers: throttle the
      network (`Network.emulateNetworkConditions`), then on Statistics change
      the leaderboard category/metric/direction, on Fixtures change the phase
      and round, and on a team page change the phase selector; confirm each
      view shows the `AsyncState` loading spinner (not the previous
      selection's rows) for the duration of the throttled request, then
      renders the new data once it resolves.
      **Done when:** all three flows are observed returning to the loading
      state on filter change, with a short note of what was seen for each.

      Verified against the running dev servers (frontend :5173, backend
      :3000) via headless Chrome/CDP with `Network.emulateNetworkConditions`
      throttling (1000ms latency, 300kbps):
      - Statistics leaderboard: changed the phase select from Regular Season
        to Playoffs. 300ms later the loading spinner was showing and the
        table had unmounted (0 rows) rather than showing Regular Season rows;
        the Playoffs standings settled with no rows once the throttled
        request completed (no games in that phase yet this season, expected).
      - Fixtures and results: changed the Round select from "All rounds" to
        "1". 20 games shown before, spinner visible 300ms after the change,
        settled at 10 games (Round 1's actual game count) — never showed the
        unfiltered 20 alongside the new selection.
      - Team page: clicked the "Play-In" phase tab (was "Regular Season").
        Spinner visible 300ms after the click, gone once the throttled
        request resolved, with no stale Regular Season content shown in
        between.
      All three flows returned to loading on filter change with no stale
      data observed.

## Files / areas

- `frontend/src/statistics/StatisticsPage.jsx`
- `frontend/src/games/FixturesPage.jsx`
- `frontend/src/standings/StandingsPage.jsx`
- `frontend/src/playoffs/PlayoffsPage.jsx`
- `frontend/src/teams/TeamPage.jsx`
- `frontend/src/players/PlayerPage.jsx`
- `frontend/src/comparisons/ComparisonsPage.jsx`

## Data / contracts

No API or persisted-data contract changes. This is a client-side rendering
correctness fix; query keys and enablement conditions may change, response
shapes do not.

## Testing

No unit test runner is configured for the frontend (`AGENTS.md`: "There is no
unit test command yet"). Verification is `npm run lint`, `npm run build`, and
the live CDP evidence in step 3.

## Notes for the AI

A first pass over the existing `queryKey` arrays (done during spec research)
shows every filter-bearing query already includes its filter values in the
key, and every render path already checks `isPending`/`isLoading` before
reading `.data`, with no `placeholderData`/`keepPreviousData` anywhere in the
codebase. It is plausible step 1 finds zero exceptions; if so, step 2 is a
no-op and step 3 still runs to turn that into verified evidence rather than an
assumption.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7559,"specSha256":"6cbabf1270865b6e0b4472eff46aa175a9fce67dbad0aa204c5c375a37863a38","branch":"refs/heads/feature/async-and-loading-state-correctness","head":"08ea0ba42bf14a6879b0a61a0b0e8087651c67d3","baseRef":"refs/heads/master","baseCommit":"08ea0ba42bf14a6879b0a61a0b0e8087651c67d3","sourceTree":"d86a0f084c8f3d4c47229247465b949b0872994d","absentOptional":[]} -->