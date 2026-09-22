# Feature: Page shell, hero, and phase story

**From build-plan:** feature 17a-i
**Build attempt:** 1
**Status:** verified

**Branch:** feature/page-shell-hero-and-phase-story

## Goal

Add the Season Overview route: the editorial season-recap page's shell,
hero, four summary cards, phase story, and the full (non-compact) data
coverage panel. This lands the page's foundation; the two-column
chart/leaders content (17a-ii) and the postseason/closing content
(17a-iii) build on top of it in later branches.

## Design reference

UI-UX.md section 7.13 (Season Overview) describes the target content and
layout; section 6.4 describes the coverage panel's full vs. compact modes.
No `prototypes/` mockup exists for this page - follow the guideline's
described structure using this app's existing tokens, panel/card
primitives, and formatting helpers, adapting names and data sources to
what this app actually has (see Notes for the AI for the specific
adaptations already decided).

## In scope

- New route `/:seasonCode/overview` rendering `SeasonOverviewPage`, added
  to `App.jsx`'s lazy route list and to `NavBar`'s tab list (right after
  Home, since this is a season-level recap).
- `PageHeader` with kicker "RECAP" and title `EuroLeague {formatSeasonLabel(seasonCode)}`
  (e.g. "EuroLeague 2025-26").
- A hero block: the champion's crest and club name in a success-tinted
  card when a Final Four championship game has been played and won;
  otherwise the current phase's status (e.g. "Regular Season in
  progress"), or "Season not yet started" when zero games have been played
  anywhere yet. Current phase = the last phase in RS -> PI -> PO -> FF
  order with at least one played game, defaulting to RS when none have
  been played yet. Champion = the winner of the FF-phase game whose group
  or round name contains "championship", or otherwise "final" but not
  "semifinal"/"3rd"/"third" (a semifinal or 3rd-place game).
- Four summary cards: Games (total games this season, all phases), Scoring
  level (average combined score across played games this season), Average
  margin of victory (average `|localScore - roadScore|` across played
  games), and Competition path (the static phase sequence, e.g. "Regular
  Season -> Play-In -> Playoffs -> Final Four", with the current phase
  highlighted).
- Phase story: one numbered card per phase from `getPhases`, each showing
  the phase name, its game count, its team count, and its date range
  (earliest-latest `scheduledAt` among that phase's games) - or "Not yet
  applicable" when a phase has zero games. Team count for Regular Season
  is the season's full registered team directory (every team plays in a
  round-robin regular season, and this is available from day one, unlike
  standings which only materialize once games are played); team count for
  the knockout phases (Play-In, Playoffs, Final Four) is the union of that
  phase's own home/away clubs, since those phases have no standings
  concept at all. Connect the cards with a `→` at `xl` and above, matching
  the guideline's described treatment.
- Extend `DataCoveragePanel` with a `full` boolean prop: when `true`,
  render a `text-2xl` heading, an explanatory paragraph ("Missing source
  data is shown explicitly and is not treated as a page error."), an
  outlined counter badge ("N of 8 available"), a larger card grid
  (`lg:grid-cols-3 xl:grid-cols-5`), and - only when at least one item is
  not `available` - an `alert alert-warning alert-soft` listing the
  degraded items by label. The existing compact usages (Game Detail, Home
  dashboard) are unaffected since `full` defaults to `false`.
- Season-scoped coverage panel using `getCoverage(seasonCode)` (no game
  scope), rendered with `full`.
- Loading and error states for every query this page issues (phases,
  per-phase/season-wide games, coverage), using the shared `AsyncState`
  component exactly as every other page does - a failed phases fetch
  blocks the whole page (nothing below it has data without phases); a
  failed coverage fetch degrades only that panel, matching how Game Detail
  already isolates its coverage-panel failure from the rest of the page.

## Out of scope

- The scoring-through-the-season chart, defining games, statistical
  leaders, and standings snapshot (17a-ii).
- The road-to-the-title knockout steps and the closing links bar
  (17a-iii).
- A season-to-season `← selects →` stepper duplicating the existing
  persistent nav `SeasonSelector` - this app has exactly two seasons
  already reachable from every page's nav bar; a second season switcher
  on this one page would be redundant. The season shown is whatever the
  URL's `:seasonCode` already is, same as every other page.
- Any change to the existing compact `DataCoveragePanel` visual output
  (Game Detail, Home dashboard) beyond adding the new opt-in `full` prop.
- Any backend endpoint or schema change - every summary and phase-story
  value is derived from `getPhases` and `getSeasonGames` responses this
  app already has.

## Build loop

Follow `workflow.stepReview: "feature"` (self-review, one final packet) and
`workflow.checkpointCommits: "disabled"` (no per-step commits; `/complete`
makes the one feature commit).

## Build steps

- [x] 1. Add the route and nav entry: `SeasonOverviewPage` lazy-imported and
      mounted at `overview` inside `SeasonLayout`'s routes in `App.jsx`,
      and a "Season overview" tab added to `NavBar.jsx`'s `TABS` array
      right after Home.
      **Done when:** navigating to `/:seasonCode/overview` renders a page
      (even a stub) and the nav bar shows the new tab, verified via CDP.
      Wire the phases fetch's loading/error states via `AsyncState` from
      this step onward so every later step has a page that already
      behaves correctly while phases are loading or fail to load.

      Verified via CDP: the nav bar shows "Season overview" right after
      Home, and `/E2025/overview` renders the page shell with no console
      exceptions.
- [x] 2. Extend `DataCoveragePanel` with the `full` prop (heading size,
      explanatory paragraph, outlined counter badge, `lg:grid-cols-3
      xl:grid-cols-5` grid, and the degraded-items alert when applicable).
      Add the season-scoped coverage fetch and render it with `full` on
      the new page.
      **Done when:** `npm run build` passes, the existing compact usages on
      Game Detail and Home render unchanged (confirmed via CDP), and the
      new page's panel shows the full layout with a correct "N of 8
      available" count.

      Verified via CDP: the new page shows "Season data coverage", "5 of 8
      fully available" (E2025) with the explanatory paragraph and a
      degraded-items alert ("Player photos, Shot locations,
      Play-by-play"). The existing compact usages on Home and Game Detail
      were re-checked afterward and are byte-for-byte the same
      (`panel-title` heading class, no paragraph, no counter badge).
- [x] 3. Build the hero: derive current phase and champion from
      `getPhases` plus a played-games fetch per phase (or a single
      all-phases played-games fetch, whichever is simpler once the phase
      story's own per-phase fetches exist - reuse rather than duplicate).
      Render the champion card or the season-status fallback.
      **Done when:** `npm run build` passes and CDP against a real season
      (which has no completed Final Four yet) shows the correct
      season-status fallback with the correct current-phase name.

      The premise that no in-scope season could exercise the champion path
      no longer held once tested: with today's date, `E2025`'s season has
      fully concluded (Final Four played in May 2026), so the champion
      path *did* run against real data and initially returned a false
      positive - "semifinal" contains the substring "final", so the
      original heuristic picked a semifinal winner instead of the actual
      championship-game winner (they happened to be the same team here,
      which would have hidden the bug). Fixed by matching "championship"
      first and explicitly excluding "semifinal"/"semi-final" before the
      plain "final" fallback. Re-verified: `/E2025/overview` now correctly
      shows "Olympiacos Piraeus" as champion, matching the actual
      championship game (Olympiacos 92-85 Real Madrid). `/E2026/overview`
      (a season with zero played games) correctly shows "Season not yet
      started" rather than a misleading "Regular Season in progress" -
      also fixed during verification, since the original fallback didn't
      distinguish a phase actively in progress from a season that hasn't
      started at all.
- [x] 4. Build the four summary cards from the season-wide games fetch
      (Games, Scoring level, Average margin of victory) and the static
      phase sequence (Competition path, current phase highlighted).
      **Done when:** `npm run build` passes and CDP shows correct,
      non-fabricated numbers matching a manual spot check against the
      games API for the same season.

      The season API caps `limit` at 100, so an initial 500-row request
      failed with `400 INVALID_QUERY` (this was checked by reasoning, not
      verified against the real endpoint, before implementation - a gap
      the CDP evidence step exists specifically to catch). Fixed by paging
      through played games in blocks of 100 until `hasMore` is false.
      Verified via CDP on `E2025`: Games 402, Scoring level 172.0
      pts/game, Average margin of victory 10.3 pts, Competition path
      correctly highlighting "Final Four" as the current (most advanced
      played) phase.
- [x] 5. Build the phase story: one card per phase with game count, team
      count, and date range derived from that phase's games, "Not yet
      applicable" for phases with zero games, and `→` connectors at `xl`.
      **Done when:** `npm run build` passes and CDP shows a phase with
      games rendering real counts/dates, and a phase with none (this
      season's Final Four) rendering the honest empty state instead of
      zeros or blanks.

      Team count also needed a mid-implementation fix: standings don't
      exist for knockout phases (`getSeasonStandings` returns
      `{standings: []}` for Play-In/Playoffs/Final Four even after their
      games are played), which produced a fabricated-looking "0 teams" on
      every non-Regular-Season phase, and Regular Season's own standings
      are empty until games are played, which would show "0 teams" for a
      not-yet-started season despite its full team directory already
      existing. Fixed by sourcing Regular Season's team count from
      `getSeasonTeams` (the season's registered team directory, correct
      regardless of games played) and each knockout phase's team count
      from the union of that phase's own games' home/away clubs (fetched
      in one request each, safely under the page-size cap for a knockout
      bracket). Verified via CDP on `E2025`: Regular Season "380 games ·
      20 teams", Play-In "3 games · 4 teams", Playoffs "16 games · 8
      teams", Final Four "3 games · 4 teams" - all internally consistent
      with a real EuroLeague bracket. `E2026` (zero games played anywhere)
      correctly shows "380 games · 20 teams" for its one existing phase
      (Regular Season) rather than "0 teams".

## Files / areas

- `frontend/src/App.jsx` (new lazy route)
- `frontend/src/season/NavBar.jsx` (new tab)
- `frontend/src/season/SeasonOverviewPage.jsx` (new)
- `frontend/src/lib/DataCoveragePanel.jsx` (`full` prop)
- `frontend/src/lib/api.js` (no new function expected; reuses
  `getPhases`, `getSeasonGames`, `getCoverage`)

## Data / contracts

None - every value comes from `getPhases(seasonCode)`,
`getSeasonGames(seasonCode, { phase, status, order, limit })`, and
`getCoverage(seasonCode)`, all already implemented. No API or
persisted-data change.

## Testing

No unit test runner is configured. Verification is `npm run lint`,
`npm run build`, and CDP evidence for the route, nav entry, coverage
panel's full mode (and its unchanged compact usages), hero fallback, and
phase story on a real season.

## Notes for the AI

- Reuse `formatSeasonLabel`, `formatCount`, `formatPerGame`,
  `formatSignedDiff`, and `formatDateTime` from `frontend/src/lib/
  format.js` rather than hand-rolling any of these.
- The season API caps `limit` at 100 (`pageParameter(..., 1, 100)` in
  `backend/src/routes/seasons.ts`); page through results in blocks of 100
  wherever a full season's rows are needed (e.g. every played game's
  score), rather than assuming one large request suffices.
- `getSeasonGames`'s `pagination.total` (added in 15f-ii) gives an exact
  count without needing to fetch every row when only the count is needed;
  use it for the phase story's and summary cards' counts, and fetch actual
  rows only where a real value (score, date) is read from them.
- Keep the champion-detection heuristic isolated in one small function so
  it's easy to verify by reading; test it against a season whose Final
  Four has actually concluded once one exists in the data (verified
  against `E2025`, which turned out to already qualify).
- `WidgetPanel` (from `dashboard/Dashboard.jsx`) is dashboard-specific
  (its own kicker/title props differ from `PanelHeader`'s); use `Panel` +
  `PanelHeader` directly for this page's cards, matching how every
  non-dashboard page already composes panels.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":13472,"specSha256":"b50547327060630d6aef0093ef359f3af4766c8332df24d903df1cf3ffb30e06","branch":"refs/heads/feature/page-shell-hero-and-phase-story","head":"cc8228fa29384dfce7c02756e9badc1fc8e57423","baseRef":"refs/heads/master","baseCommit":"cc8228fa29384dfce7c02756e9badc1fc8e57423","sourceTree":"45c741ac76f1b4ffde6d8cf549f1bc03e0f2ae0c","absentOptional":[]} -->