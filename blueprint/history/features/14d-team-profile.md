# Feature: Team profile

**From build-plan:** feature 14d
**Build attempt:** 1
**Branch:** feature/team-profile
**Status:** verified

## Goal

Deepen the team profile page (`frontend/src/teams/TeamPage.jsx`) with a
next-game indicator, section sub-tabs (Overview/Roster/Schedule/Stats), an
enlarged point-differential trend chart, roster bar visualization, a
recent-form match list, and working compare shortcuts into the comparisons
page, per `prototypes/team.html` and the shared design system — using only
data the existing team, standings, season-stats, and games endpoints already
return.

## Design reference

`prototypes/team.html` (approved mockup). Its arena line ("OAKA Altion
arena") and "Rebounds/g"/"Assists/g" KPI chips are concept data this spec
does not build — there is no venue field and no team-level box-score
aggregate anywhere in the backend data model (confirmed; same finding as
14a's dashboard spec and the project overview's own "no team season
aggregate table" note). See **Notes for the AI**.

## In scope

- Next-game indicator in the team header: opponent, home/away, and
  scheduled date/time for the team's next unplayed game, derived from the
  already-fetched full games list (no new request). Omitted (not a fake
  "no game" chip) when there is no scheduled game.
- Section sub-tabs — Overview / Roster / Schedule / Stats — as client-side
  state (matching the existing phase-tabs pattern in this file), not
  separate routes:
  - **Overview**: KPI strip (points for/game, points against/game, point
    differential/game, win %, games played — all from `standings.basic`,
    already fetched), the enlarged point-differential trend chart, the
    recent-form match list, and the compare shortcuts panel.
  - **Roster**: the full roster table, enriched with per-player season
    stats and bar visualization (see below). Replaces the current bare
    #/Player/Position/Status table.
  - **Schedule**: the existing full schedule/results list, unchanged.
  - **Stats**: the existing season-record and team-statistics (scoring
    margins) sections, unchanged, relocated under this tab.
- Enlarged point-differential trend chart: the team's point differential
  per game across its last 10 played games, derived from the already-fetched
  full games list (no new request) — same computation as
  `dashboard/LeaderTrend.jsx`, applied to this team specifically, at a wider
  panel size ("enlarged" per the build-plan wording) rather than the
  dashboard's compact widget.
- Roster bar visualization: the Roster tab's table gains GP/MIN/PTS/REB/AST/PIR
  columns (per-game mode) joined from `/season-stats` by `personKey`, with an
  in-row bar on the PTS column, min-max normalized against this team's own
  roster (reusing `barWidthScale` from `frontend/src/statistics/statBarScale.js`,
  the same utility 14c added). See **Notes for the AI** for the bounded
  multi-page fetch this requires (the endpoint has no team filter).
- Recent-form match list: the last 5 played games (most recent first) as
  compact match cards (opponent, round, score, win/loss), derived from the
  already-fetched full games list (no new request).
- Compare shortcuts: two links from this team's Overview to
  `/{seasonCode}/comparisons?teamA={this}&teamB={other}` — vs. the next
  opponent (when there is one) and vs. the current standings leader (or the
  second-place team, when this team *is* the leader) — both derived from
  already-fetched data, no new requests. Making these actually work requires
  `ComparisonsPage.jsx` to read `teamA`/`teamB` search params and pre-select
  those teams on load (it currently has no URL-driven state at all); see
  **Notes for the AI** for why this small addition to another page is
  necessary rather than scope creep.

## Out of scope

- Team-level rebounds/assists-per-game KPI chips shown in the mockup — no
  team box-score aggregate exists (per-game team stats
  (`etl_flat_game_team_stats`) are only exposed per single game via the box
  score endpoint; there is no season aggregate, and summing every played
  game's box score client-side for one KPI chip would mean 20-38 extra
  requests, disproportionate). The KPI strip uses only
  `standings.basic`-backed metrics instead.
- An arena/venue line — confirmed absent from the backend data model
  (`backend/src/db`), same finding already recorded in 14a's spec.
- Any new backend endpoint, schema change, or new query param on the
  `/season-stats`, `/standings`, `/teams`, or `/games` routes. Every value
  comes from endpoints the frontend already calls.
- A duplicate roster preview on the Overview tab — the mockup shows a
  5-row roster preview there in addition to the full Roster tab; this spec
  builds the enriched roster table once (Roster tab only) rather than
  fetching/joining the same season-stats data twice for two views of the
  same thing. Overview links to the Roster tab instead.
- A mode (accumulated/per-game) toggle on the Roster tab — fixed to
  per-game, matching the mockup's single fixed column set.
- Changes to the home dashboard, standings, or statistics leaderboards
  pages — those are build-plan items 14a/14b/14c, already built. The one
  necessary exception is the narrow `ComparisonsPage.jsx` query-param
  addition above (14e, not yet built, is unaffected — see Notes).

## Build loop

Per `blueprint/config.json`, `workflow.stepReview` is `feature`: build all
steps below in order without pausing for approval after each one, then stop
for one review packet covering the whole feature. `checkpointCommits` is
disabled, so do not create intermediate commits between steps — `/complete`
makes the final commit. Keep the project working after every step regardless.

## Build steps

- [x] 1. Add section sub-tabs and move existing sections under them. In
      `TeamPage.jsx`, add a `section` state (`"overview" | "roster" |
      "schedule" | "stats"`, default `"overview"`) rendered as a tab row
      (reuse `tabs tabs-boxed tabs-sm`) below the existing phase tabs. Move
      the current `RosterSection` under `section === "roster"`, the current
      `ScheduleSection` under `section === "schedule"`, and the current
      `SeasonRecordSection`/`TeamStatisticsSection` pair under
      `section === "stats"`. Nothing under `section === "overview"` yet
      (steps 2-5 fill it).
      **Done when:** switching sub-tabs shows exactly one section's existing
      content at a time, against the running app, with no behavior change to
      those sections yet.

- [x] 2. Add the next-game indicator and Overview KPI strip. In the team
      header, compute the next game as the first `played === false` entry
      in the already-fetched, ascending-ordered `gamesQuery.data.games`
      (no new request); render opponent, home/away (`vs`/`@`), and
      `formatDateTime(scheduledAt)`, omitted entirely when none exists. In
      the Overview section, add a KPI strip (reuse `.kpi-strip`/`.kpi-chip`)
      with: Points for/game, Points against/game, Point differential/game
      (each `standings.basic.pointsFor|pointsAgainst|pointsDifference`
      divided by `basic.gamesPlayed`, one decimal), Win % (`basic.winPercentage`
      as-is), Games played (`basic.gamesPlayed`) — all from the
      already-fetched `standingsQuery`, omitting the strip entirely when
      the team has no standings entry for the selected phase yet.
      **Done when:** the header shows the real next game (or nothing, when
      none is scheduled) and the Overview KPI strip shows five real values
      against the running app, both updating when the phase tab changes.

- [x] 3. Add the enlarged point-differential trend chart. New
      `frontend/src/teams/TeamTrendChart.jsx`, following
      `dashboard/LeaderTrend.jsx`'s exact computation (point differential
      per played game, last 10, oldest to newest) but sized as a full-width
      panel rather than a compact dashboard widget, mounted in the Overview
      section and fed from the already-fetched `gamesQuery.data.games`
      (no new request). Empty state when fewer than 2 played games exist.
      **Done when:** the chart renders this team's real last-10 point
      differential trend against the running app, and its empty state when
      the team has fewer than 2 played games.

- [x] 4. Add the recent-form match list. In the Overview section, render
      the last 5 played games (most recent first) from the already-fetched
      `gamesQuery.data.games` as compact match cards (opponent, round,
      score, a win/loss chip), reusing the existing `opponent()`/
      `teamLabel()` helpers already in `TeamPage.jsx`. Empty state when the
      team has no played games yet.
      **Done when:** the Overview section shows up to 5 real recent results
      with correct win/loss styling against the running app.

- [x] 5. Add compare shortcuts, and make them functional. First, in
      `frontend/src/comparisons/ComparisonsPage.jsx`: read `teamA`/`teamB`
      from `useSearchParams()` (React Router); when both are present, lift
      the existing `getSeasonTeams(seasonCode)` query (currently fetched
      inside `TeamPicker`) to the page level, pass its data down to both
      `TeamPicker` instances as a prop instead of each fetching
      independently, and initialize `entityA`/`entityB` from the matching
      teams once that query resolves (ignore an unknown/missing club code
      rather than erroring). This is additive: `ComparisonsPage` behaves
      identically with no search params. Then, in the Team profile's
      Overview section, add a "Compare" panel with up to two links —
      vs. the next opponent (from step 2's already-computed next game, when
      one exists) and vs. the current standings leader (`basic.position ===
      1` in the already-fetched `standingsQuery`, or the `position === 2`
      team when this team itself is the leader) — each linking to
      `/${seasonCode}/comparisons?teamA=${clubCode}&teamB=${otherClubCode}`.
      Omit a link when its target team is unavailable (e.g. no next game,
      or fewer than 2 teams in the standings).
      **Done when:** clicking a compare shortcut from a team's Overview
      lands on the comparisons page with both teams already selected and
      the comparison table populated, against the running app; visiting
      `/comparisons` directly (no search params) still works exactly as
      before.

- [x] 6. Add roster bar visualization. In `TeamPage.jsx`'s Roster section,
      add a bounded loop-fetch of `getLeaderStats(seasonCode, { phase:
      phaseCode, mode: "perGame", limit: 100, offset: n })` for `n = 0, 100,
      200, 300, 400`, stopping early when a page's `pagination.hasMore` is
      `false`, merging all returned `players` arrays and filtering to
      `clubCode === clubCode` (this team), indexed by `personKey`. Join
      onto each roster registration to add GP/MIN/PTS/REB/AST/PIR columns
      (from the joined entry's `traditional` fields, `formatStatValue`-
      formatted), with an in-row bar on the PTS column (`StatBarCell` +
      `barWidthScale` over this team's own roster's `pointsScored` values,
      reusing the 14c utilities). A roster entry with no matching stats row
      (e.g. no games played yet) shows `-` in every stat column and no bar.
      **Done when:** the Roster tab shows real per-player season stats with
      a proportional PTS bar for players who have played, and `-` for those
      who haven't, against the running app.

- [x] 7. Responsive pass and lint. Confirm the KPI strip, sub-tabs, next-game
      chip, trend chart, and match-card list wrap or scroll sensibly at
      phone width (resize the running dev server, don't just read the CSS)
      — the roster and schedule tables already scroll horizontally via the
      existing `panel overflow-x-auto` wrapper. Run
      `cd frontend && npm run lint`.
      **Done when:** the team profile page is usable at phone, tablet, and
      desktop widths with no unintended horizontal scroll of the page
      itself, and lint passes.

## Files / areas

- `frontend/src/teams/TeamPage.jsx` — sub-tabs, next-game indicator, KPI
  strip, recent-form list, compare shortcuts, roster stat join
- `frontend/src/teams/TeamTrendChart.jsx` — new
- `frontend/src/comparisons/ComparisonsPage.jsx` — `useSearchParams`
  pre-selection (additive; step 5)
- `frontend/src/statistics/statBarScale.js` — reused, no changes expected
- `frontend/src/statistics/StatBarCell.jsx` — reused, no changes expected
- `frontend/src/lib/api.js` — no changes expected; `getLeaderStats` and
  `getTeamGames` already accept the needed params

## Data / contracts

No backend changes. Every value is sourced from already-existing endpoints:

- `GET /seasons/:seasonCode/teams/:clubCode` → team identity (existing).
- `GET /seasons/:seasonCode/phases/:phaseCode/standings` → `basic.*` for
  the KPI strip and compare-shortcut leader lookup (existing).
- `GET /seasons/:seasonCode/teams/:clubCode/games?limit&order` → already
  fetched with `limit: 100, order: "asc"`; reused for the next-game
  indicator, trend chart, and recent-form list (no new request).
- `GET /seasons/:seasonCode/season-stats?phase&mode&limit&offset` → looped
  (step 6) to build the roster's stat join; `limit` caps at 100
  server-side, no `clubCode` filter exists, so this spec filters
  client-side after fetching (bounded to 5 pages).
- `GET /seasons/:seasonCode/teams` → lifted to `ComparisonsPage`'s top
  level in step 5 (was previously fetched only inside `TeamPicker`).

## Testing

No frontend unit/logic test runner is configured
(`verification.logicTests: when-configured`, none installed) — this feature
does not add one. Ran `cd frontend && npm run lint` and `npm run build` after
implementation, both clean. The Playwright smoke test
(`frontend/e2e/smoke.spec.js`) does not reference team-profile-specific
markup and needed no update.

Behavioral verification performed against the already-running dev server
(`qualityGates.regular.check: manual`, done anyway given the number of new
derived-data sections and the cross-page change in step 5), using FC
Barcelona (`BAR`) in `E2025`:

- Overview: KPI strip showed 5 real values (83.3 PF/g, 82.8 PA/g, 0.5
  diff/g, 55.3 win%, 38 GP), matching the Stats tab's season-record numbers
  divided out by hand. The trend chart rendered a real last-10 point-
  differential line (+0.2 avg). The recent-form list showed the 5 most
  recent real results (rounds 40→36) with correct win/loss coloring.
- Compare shortcut: `E2025` regular season is fully complete for every team
  (round 40, including the Play-In phase, all played) — no team currently
  has a scheduled next game, so only the "vs league leader" shortcut
  rendered (correctly omitting the next-opponent one). Clicked it: landed
  on `/E2025/comparisons?teamA=BAR&teamB=OLY` with both teams already
  selected and the comparison table and points-trend chart fully populated
  with no further interaction — confirms the `ComparisonsPage.jsx` search-
  param wiring works end to end. Visiting `/E2025/comparisons` directly
  (no params) still works exactly as before.
- Roster tab: real per-player GP/MIN/PTS/REB/AST/PIR values joined in,
  proportional PTS bars for players who have played, and `-` with no bar
  for roster entries with no matching stats row (e.g. unplayed reserves) —
  confirms the bounded multi-page fetch and client-side `clubCode` filter
  work correctly.
- Schedule and Stats tabs: unchanged existing content, confirmed still
  rendering correctly under their new tab.
- No console errors or failed network requests across all of the above.
  Phone width (390px): no page-level horizontal overflow
  (`document.documentElement.scrollWidth === clientWidth`), KPI strip and
  compare panel wrap without overlap (reusing the 14b/14c overflow fix).
- **Not verified live:** the next-game indicator's "has a game" rendering
  path (opponent name, home/away, date/time) — no team in the current
  dataset has an unplayed game, so only the omission path could be
  exercised live. The rendering logic is a direct, simple consumption of
  already-verified data (`opponent()`/`teamLabel()`/`formatDateTime()`, all
  reused unchanged from the existing schedule list, which does render real
  future-game rows correctly when they exist), so this is a low-risk gap,
  but it is a gap — same situation as 14b's round-1 KPI degradation, which
  also couldn't be driven live from this season's current state.

## Notes for the AI

- **Why the mockup's arena line and Rebounds/g/Assists/g chips are
  dropped:** no venue/arena field exists anywhere in `backend/src/db`
  (already confirmed for 14a's dashboard spec — same finding applies here).
  Team-level rebounds/assists per game have no aggregate data source either:
  `etl_flat_game_team_stats` is only exposed per single game via the box
  score endpoint, and the project overview explicitly notes "No team season
  aggregate table is listed in the supplied SQL." Computing a season average
  client-side would mean fetching every played game's box score
  individually (20-38 extra requests for one KPI value), which is
  disproportionate. The KPI strip uses only what `standings.basic` already
  provides.
- **Why `ComparisonsPage.jsx` needs a small change:** the build-plan asks
  for "compare shortcuts... into the comparisons page." Checked
  `ComparisonsPage.jsx` before writing this spec: entity selection is
  entirely internal component state with no URL-driven initialization, so a
  link to `/comparisons` alone would land on an empty picker, not a working
  shortcut — the feature's literal promise wouldn't be met. The fix is
  narrow and additive (read two optional search params, lift one existing
  query up one level to avoid a duplicate fetch) and does not change
  `ComparisonsPage`'s existing behavior when no search params are present,
  so it doesn't preempt 14e (verdict KPI strip / season-series panel /
  winner markers), which is unbuilt and unrelated to entity selection.
- **Why the roster stat join loop-fetches instead of adding a backend
  filter:** `/season-stats` has no `clubCode` query param (confirmed against
  `backend/src/routes/seasons.ts`), and this feature's "no backend changes"
  constraint (consistent with 14a/14b/14c) means working within the
  existing `limit`/`offset` pagination. A season has ~200-220 tracked
  players, so a bounded loop of up to 5 requests (capped, stopping early on
  `hasMore: false`) reliably covers the full league once, from which this
  team's roster is filtered client-side by `clubCode`. This is a real,
  bounded cost specific to the Roster tab (not paid by Overview, Schedule,
  or Stats).
- Reuse `dashboard/LeaderTrend.jsx`'s trend-building math (not its
  component) for `TeamTrendChart.jsx`, and `statistics/statBarScale.js` +
  `StatBarCell.jsx` unchanged for the roster bars — this feature is
  deliberately parallel to 14a/14c's established patterns rather than
  inventing new ones.
- Follow `prototypes/team.html` for visual structure (team header, next-game
  chip, sub-tabs, KPI-chip row, enlarged trend panel, roster bar styling,
  match-card recent-form list, compare-link styling) but every number and
  label traces to a real computed value, not the mockup's hard-coded sample
  data (e.g. "Kostas Sloukas," "OAKA Altion," "+8.1" are illustrative only).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":19466,"specSha256":"ac2b7f16266c7d78eefacc141e5f5307a60eff960bdd909266b188f084aeeaa0","branch":"refs/heads/feature/team-profile","head":"64871d6cbc529deed56ff073c89970b804ecdf4e","baseRef":"refs/heads/master","baseCommit":"64871d6cbc529deed56ff073c89970b804ecdf4e","sourceTree":"7b3d3937bef981f384807acc6855cea98f303482","absentOptional":[]} -->
