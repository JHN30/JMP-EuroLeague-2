# Feature: Home dashboard

**From build-plan:** feature 14a
**Build attempt:** 1
**Branch:** feature/home-dashboard
**Status:** verified

## Goal

Rework the home dashboard from three flat panels into an analytics-forward
landing page: a KPI strip, a featured next-game spotlight, a denser
three-column working layout (standings snapshot, fixtures, stat leaders plus a
new form-watch panel), and a trend chart for the current standings leader —
all backed by real season data, with genuine mobile layouts (not just
horizontal overflow).

## Design reference

`prototypes/dashboard.html` (approved mockup) and `prototypes/theme.css`
(evolved token set). The mockup's exact KPI set, spotlight narrative text, and
"league-wide scoring trend by round" are illustrative; see **Notes for the AI**
for where this spec intentionally diverges to stay grounded in data the API
actually exposes, and why.

## In scope

- Port `prototypes/theme.css`'s shared tokens (tightened `--radius-box`,
  display-weight for large numbers, surface/border refinements) into
  `frontend/src/index.css`'s `dark-euroleague` DaisyUI theme block, since this
  is the first feature built from this prototype round.
- KPI strip: round progress, standings leader, top scorer average, league
  average points per game, biggest position mover since the previous round.
- Spotlight: the next scheduled game, with each side's last-10 record when
  present.
- Fixtures panel restyled as match cards (same recent-results and
  upcoming-games data, denser presentation).
- Standings snapshot extended from top 5 to top 10 teams.
- Statistical leaders restructured into three single-stat leader cards
  (points, rebounds, assists per game) replacing the current
  offense/defense + top-5-scorers layout.
- New form-watch panel: the team with the best and worst last-10 record.
- New trend chart: the current #1 standings team's point differential across
  its last 10 played games.
- Genuine responsive layout: the three-column grid collapses to a single
  column on narrow viewports, the KPI strip wraps or scrolls instead of
  compressing illegibly, and every new panel is usable at phone width.

## Out of scope

- League-wide round-by-round scoring trend (see Notes for the AI — not
  cleanly derivable from existing endpoints without a new aggregate; left for
  a future feature if wanted).
- Any change to `standings.html`'s tiering, `statistics.html`'s category
  tabs, `team.html`, or `comparisons.html` — those are build-plan items
  14b-14e, specced and built separately.
- New backend endpoints or schema changes. Every data point in this feature
  must come from an endpoint `frontend/src/lib/api.js` already calls.
- Light-mode (`light-euroleague`) visual refinement — this prototype round
  only designed the dark theme, which is already the app's default
  (`default: true; prefersdark: true`). Structural tokens (radius, the new
  display-weight) apply to both themes; color refinements apply to
  `dark-euroleague` only.
- An invented "why this game matters" narrative on the spotlight card — only
  factual, derivable content (records, last-10 form, date) is shown. No venue
  line either: there is no venue/arena field anywhere in the backend data
  model.

## Build loop

Per `blueprint/config.json`, `workflow.stepReview` is `feature`: build all
steps below in order without pausing for approval after each one, then stop
for one review packet covering the whole feature. `checkpointCommits` is
disabled, so do not create intermediate commits between steps — `/complete`
makes the final commit. Keep the project working after every step regardless.

## Build steps

- [x] 1. Port shared prototype tokens into the real theme. Update the
      `dark-euroleague` block in `frontend/src/index.css`: tighten
      `--radius-box` to `0.875rem` (from `1rem`), and add a shared
      (theme-independent) display-weight custom property for large stat
      numbers, matching `prototypes/theme.css`. Do not change
      `light-euroleague` color values.
      **Done when:** existing pages (dashboard, standings, teams, playoffs)
      still render correctly with the tightened radius — spot-check in the
      running dev server — and `cd frontend && npm run lint` passes.

- [x] 2. Add the KPI strip. New `frontend/src/dashboard/KpiStrip.jsx`
      consuming the standings query already fetched for the snapshot
      (`getSeasonStandings(seasonCode, "RS")`, which already returns
      `{ round, standings }`) plus one new `getRounds(seasonCode, "RS")` call
      for the total round count, plus the existing leader-stats query's first
      entry for top scorer average. Compute league average PPG as the mean of
      `basic.pointsFor / basic.gamesPlayed` across the returned standings.
      Compute the biggest mover by fetching
      `getSeasonStandings(seasonCode, "RS", { round: round - 1 })` when
      `round > 1` and diffing `basic.position` per `clubCode`; when there is
      no previous round, omit that chip rather than showing a fake "no
      change" value. Each chip needs its own loading/empty read (some values
      may be null before the season has games).
      **Done when:** the strip renders five real values against the running
      app (or fewer when a value has no data yet, e.g. round 1), with no
      hard-coded numbers.

- [x] 3. Add the spotlight card. New `frontend/src/dashboard/Spotlight.jsx`
      reading the first entry of the existing "Upcoming games" query
      (`getSeasonGames(seasonCode, { status: "scheduled", order: "asc",
      limit: 1 })`). Show both teams, their current records (from the
      standings already fetched), and the scheduled date/time. No venue line:
      there is no venue/arena field in the backend data model.
      For each side, show its `basic.gamesPlayed`-gated `streaks.last10`
      value (a `"W-L"` string, same shape as the already-rendered
      `basic.homeRecord`/`awayRecord`) as "Last 10: 8-2" when present; omit
      otherwise. There is no venue/arena field anywhere in
      `backend/src/db` (confirmed), so no venue line is shown.
      **Done when:** the spotlight shows the real next game with accurate
      records and (when available) each side's last-10 record, and handles
      the "no upcoming games scheduled" case without erroring.

- [x] 4. Restyle the fixtures panel as match cards. Update
      `frontend/src/dashboard/GamesSnapshot.jsx` (or extract shared card
      markup) to render each game as a card (teams, records inline from
      standings data already on the page, score or scheduled time, status
      chip) instead of the current single-line list, reusing the same two
      existing queries (recent results, upcoming games). No new data.
      **Done when:** recent and upcoming games render as cards with the same
      loading/empty/error handling `WidgetPanel` already provides.

- [x] 5. Extend the standings snapshot to 10 rows. Update
      `StandingsSnapshot.jsx`'s slice from `top5` to `top10`. (Bumped from the
      originally specced 8 to 10 during review: with the step-7/9 equal-height
      fix, 10 rows track the three-column layout's height more closely and
      line up with the play-in cutoff ranks 7-10 that `standings.html`/14b
      will use.)
      **Done when:** up to 10 rows render (fewer if the league has fewer
      teams with recorded standings), consistent with the existing empty
      state when there are none.

- [x] 6. Split statistical leaders into three per-stat cards. Replace
      `LeadersPanel.jsx`'s current offense/defense + top-5-scorers layout
      with three single-leader cards (points, rebounds, assists per game),
      each calling `getLeaderStats(seasonCode, { phase: "all", mode:
      "perGame", limit: 1, sort: <field> })`. Confirm the exact rebounds and
      assists sort field names against `SORTABLE_STATS_FIELDS` in
      `backend/src/db/season-stats.ts` before wiring the calls (do not guess
      the field names).
      **Done when:** three cards render the real per-game leader for each
      stat, each linking to that player's page, with independent
      loading/empty/error handling.

- [x] 7. Add the form-watch panel. New
      `frontend/src/dashboard/FormWatch.jsx` deriving the hottest and
      coldest team from `streaks.last10` (a `"W-L"` string) across the
      standings response already fetched for the snapshot (no new request):
      parse the win count from each team's `last10`, and surface the team
      with the highest win count as "hot" and the lowest as "cold" among
      teams that have `streaks.last10` present. Show the empty state when
      fewer than two teams have a usable `last10` value.
      **Done when:** the panel shows the real hot and cold teams by last-10
      record from the current standings, or its empty state when there
      isn't enough data.

- [x] 8. Add the league leader's recent-form trend chart. New
      `frontend/src/dashboard/LeaderTrend.jsx` calling
      `getTeamGames(seasonCode, leaderClubCode, { limit: 10, status:
      "played", order: "desc" })` for the #1 standings team and plotting
      point differential per game as an inline SVG line (no new dependency;
      follow the `prototypes/team.html` sparkline pattern, not Chart.js,
      since this is a small fixed-axis trend, not an interactive chart).
      **Done when:** the chart renders the real leader's last-10 point
      differential, and its loading/empty state covers a leader with fewer
      than 10 played games.

- [x] 9. Responsive layout pass. Apply Tailwind breakpoints so the
      three-column grid (`grid-template-columns`) collapses to one column
      below the `md` breakpoint, the KPI strip switches from 5-across to a
      wrapping or horizontally scrollable row, and match cards / leader cards
      remain legible at phone width. Verify by resizing the running dev
      server, not just reading the CSS.
      **Done when:** the dashboard is usable (no overlapping or clipped
      content, no unintended horizontal scroll of the whole page) at a phone
      viewport width, a tablet width, and desktop.

## Files / areas

- `frontend/src/index.css` — theme token port (step 1)
- `frontend/src/dashboard/Dashboard.jsx` — layout/grid restructure
- `frontend/src/dashboard/StandingsSnapshot.jsx` — row count
- `frontend/src/dashboard/GamesSnapshot.jsx` — match-card restyle
- `frontend/src/dashboard/LeadersPanel.jsx` — per-stat card restructure
- `frontend/src/dashboard/KpiStrip.jsx` — new
- `frontend/src/dashboard/Spotlight.jsx` — new
- `frontend/src/dashboard/FormWatch.jsx` — new
- `frontend/src/dashboard/LeaderTrend.jsx` — new
- `frontend/src/lib/api.js` — no changes expected; confirm `getRounds` and
  `getTeamGames` signatures already cover the new call shapes above

## Data / contracts

No backend changes. Every value in this feature is read-only, sourced from
already-existing endpoints:

- `GET /seasons/:seasonCode/phases/:phaseCode/standings[?round]` → confirmed
  to return `{ round, standings }` (`backend/src/routes/seasons.ts:225`).
  `standings[].basic.{position,pointsFor,pointsAgainst,gamesPlayed,
  gamesWon,gamesLost}` is already used in `StandingsTable.jsx`.
  `standings[].basic.lastTenRecord` (a `"W-L"` string) is used by steps 3 and
  7 — already precedented in `TeamPage.jsx`'s "Last 10" display, so this
  feature reuses it rather than the parallel `streaks.last10` field or the
  unconfirmed-format `streakHistory[].winLossRecord`.
- `GET /seasons/:seasonCode/phases/:phaseCode/rounds` → `{ rounds }`, used
  only for `rounds.length`.
- `GET /seasons/:seasonCode/season-stats?phase&mode&sort&limit` → used three
  times with different `sort` values for the per-stat leader cards; field
  names must be confirmed against `SORTABLE_STATS_FIELDS`.
- `GET /seasons/:seasonCode/games?status&order&limit` → already used for
  recent/upcoming games; reused for the spotlight (`limit: 1`).
- `GET /seasons/:seasonCode/teams/:clubCode/games?status&order&limit` →
  already used by team pages; reused for the leader trend chart.

## Testing

No frontend unit/logic test runner is configured
(`verification.logicTests: when-configured`, none installed) — this feature
does not add one. Run `cd frontend && npm run lint` after each step that
touches frontend code. The Playwright smoke test
(`frontend/e2e/smoke.spec.js`) does not reference dashboard-specific markup
and needs no update. Use `/check` against the running dev server for
behavioral verification: KPI values against known standings/leader data,
spotlight/empty states, and the responsive pass at multiple widths — this is
manual per `qualityGates.regular.check: manual`, not automatically required,
but recommended given the number of new data-driven panels.

## Notes for the AI

- The prototype's "league scoring trend by round" KPI/chart is intentionally
  replaced with the current #1 team's own last-10-game trend (step 8) because
  no existing endpoint aggregates league-wide scoring by round, and building
  one would be new backend scope beyond this frontend-only feature. If a true
  league-wide trend is wanted later, it needs its own small feature adding a
  backend aggregate (do not invent one here).
- The spotlight's mockup included invented narrative text ("A win clinches
  the season series..."); this spec only shows facts the API can prove
  (records, streaks, date). Do not add generated commentary.
- Reuse `WidgetPanel` (`Dashboard.jsx`) for loading/error/empty states
  wherever a new component fetches its own query, consistent with the
  existing dashboard components, unless a component's layout genuinely does
  not fit that wrapper (say so in the implementation, don't silently diverge).
- Follow `prototypes/dashboard.html` for visual structure (KPI chip styling,
  spotlight layout, match-card styling, leader-card styling, form-watch row
  styling) but every number and label must trace to a real prop, not the
  mockup's hard-coded sample data.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":14023,"specSha256":"83694acc2a71e062770b27211416cb6b484882fa9506afd2c2ba1ea22bee8b26","branch":"refs/heads/feature/home-dashboard","head":"ce16b86f8b146c39d5b3e15767f61c43a0dd131e","baseRef":"refs/heads/master","baseCommit":"ce16b86f8b146c39d5b3e15767f61c43a0dd131e","sourceTree":"6f423325a7241df02426c0fad4dca61f08799ce9","absentOptional":[]} -->
