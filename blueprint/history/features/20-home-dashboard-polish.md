# Feature: Home dashboard polish

**From build-plan:** feature 20
**Build attempt:** 1
**Status:** verified
**Branch:** feature/home-dashboard-polish

## Goal

Rework the Home dashboard's layout and content per direct user request: a
current-round indicator, a 4-KPI strip, a horizontal upcoming-games row, a
two-column standings/results section, a horizontal 5-stat leaders row, an
unchanged Spotlight, and removal of the season data-coverage panel. Add team
crests and player photos next to team/player references across the page where
the underlying data already carries them. Reuse existing API endpoints
(`getSeasonStandings`, `getSeasonGames`, `getLeaderStats`, `getRounds`); no
backend changes.

## In scope

- `frontend/src/dashboard/Dashboard.jsx` layout reorder.
- `frontend/src/dashboard/KpiStrip.jsx`: split into a standalone current-round
  indicator plus a 4-metric KPI strip (Leader in wins, Top scorer, Best
  offensive team, Best defensive team).
- New upcoming-games horizontal row (extracted from `GamesSnapshot.jsx`).
- `StandingsSnapshot.jsx`: add one more key column (point differential)
  alongside rank/crest/name/record.
- Recent-results list (from `GamesSnapshot.jsx`) paired with the standings
  snapshot in a two-column section.
- `LeadersPanel.jsx`: extend from 3 to 5 categories (add Steals, PIR) and lay
  out horizontally instead of the current vertical grid.
- Remove `SeasonCoverage.jsx` usage from `Dashboard.jsx` and remove
  `FormWatch.jsx` / `LeaderTrend.jsx` usage from `Dashboard.jsx` (see Open
  questions - not named in the requested section list).
- Team crest / player photo images added to KPI cards and leader cards that
  don't already show one.
- `frontend/src/index.css`: new/adjusted classes for the horizontal upcoming
  games row and horizontal leaders row, and the round-indicator element.

## Out of scope

- Any backend/API change - all data already exposed.
- `SeasonCoverage`/`DataCoveragePanel`, `FormWatch`, `LeaderTrend` component
  files themselves (left in place, unused by Home; still available for reuse
  elsewhere per existing conventions, so not deleted).
- Any other page (Standings, Fixtures, Team/Player detail, etc.).
- Mobile-specific redesign beyond keeping the existing horizontal-scroll /
  wrap conventions already used elsewhere in the app (`overflow-x-auto` on
  tables, navbar wrap) - new horizontal rows here follow that same pattern.

## Build loop

Per `blueprint/config.json` (`workflow.stepReview: "feature"`,
`checkpointCommits: "disabled"`): implement all steps below in one pass with
no per-step approval pause and no intermediate checkpoint commits; the whole
feature is reviewed as one packet at the end, before `/complete`.

## Build steps

- [x] 1. **Round indicator + 4-KPI strip.** In `KpiStrip.jsx`: render a small
      standalone round indicator ("Round {n}", no total) ahead of the KPI
      strip, using the existing `standingsQuery`/`round` value (drop
      `getRounds`/`totalRounds`, no longer needed). Replace the KPI strip's
      contents with four `CompactMetric` cards: Leader in wins (existing
      `leader` calc, add crest image), Top scorer (existing `topScorer` calc,
      add player photo), Best offensive team (highest `pointsFor /
      gamesPlayed` across `standings`, formatted with `formatPerGame`, with
      crest), Best defensive team (lowest `pointsAgainst / gamesPlayed`, with
      crest). Drop the old "League avg PPG" and "Biggest mover" metrics and
      the now-unused `previousRoundQuery`/`biggestMover` logic. Extend
      `CompactMetric` with an optional `imageUrl`/`imageAlt` prop that renders
      a small crest/photo before the value when present (same `onError`
      hide-on-broken-image pattern used elsewhere), so this and other KPI-like
      cards can share it. Done when: Home shows "Round N" then four KPI cards
      each with a small team crest or player photo, verified against the
      running app with real season data, and `cd frontend && npm run build`
      passes.
- [x] 2. **Upcoming games as a horizontal row.** Extract the "Upcoming games"
      `GameList` out of `GamesSnapshot.jsx` into a new
      `frontend/src/dashboard/UpcomingGames.jsx` that renders the same
      `MatchCard`s inside a new horizontally-scrolling row (fixed card width,
      `overflow-x-auto overscroll-x-contain`, matching the table
      overflow-discipline convention already used elsewhere) instead of the
      vertical `games-list`. Add the row's CSS to `index.css`. Place it in
      `Dashboard.jsx` directly after the round indicator/KPI strip. Done when:
      Home shows the next 5 scheduled games scrolling horizontally, each
      still a working link to its game page and still showing crests, and
      `npm run build` passes.
- [x] 3. **Two-column standings + results section.** Rename the remaining
      `GamesSnapshot.jsx` content to just the "Recent results" `GameList`
      (vertical, unchanged). In `Dashboard.jsx`, replace the current 3-column
      grid with a 2-column grid (`lg:grid-cols-2`): left = `StandingsSnapshot`,
      right = the recent-results list. In `StandingsSnapshot.jsx`, add a point
      differential column (`entry.basic.pointsDifference`, via
      `formatSignedDiff`) next to the existing rank/crest/name/record columns.
      Done when: Home shows standings (rank, crest, team, W-L, point diff) and
      recent results (with crests and scores) side by side on desktop, stacked
      on narrow widths, `npm run build` passes.
- [x] 4. **Five-stat horizontal leaders row.** In `LeadersPanel.jsx`, extend
      `CATEGORIES` with Steals (`steals`) and PIR (`pir`), matching the
      existing `pointsScored`/`totalRebounds`/`assists` entries (same
      `getLeaderStats` call shape, already-supported sort keys). Change the
      layout from the current vertical `leaders-grid` to a horizontal
      scrolling row of the same `leader-card`s (mirroring step 2's row
      pattern), each already showing the player's photo. Done when: Home
      shows 5 leader cards (PPG, REB, AST, STL, PIR) scrolling horizontally,
      each with a player photo where available, `npm run build` passes.
- [x] 5. **Remove season coverage; drop Form Watch / League leader trend from
      Home; final wiring.** In `Dashboard.jsx`: remove the `<SeasonCoverage />`
      render and its import; remove the `<FormWatch />` and `<LeaderTrend />`
      renders and their imports (per the Open Questions default below);
      assemble the final order: `PageHeader` -> round indicator + KPI strip ->
      upcoming games row -> standings/results 2-column section -> leaders row
      -> `Spotlight` (unchanged). Done when: Home renders top-to-bottom in
      that order with no coverage panel and no Form Watch/trend chart,
      `npm run build` and `npm run lint` both pass, and a manual pass in the
      running app confirms loading/empty/error states still render correctly
      for a slow network (existing `AsyncState`/`WidgetPanel` wiring is
      unchanged per section, only reordered/extended).

## Files / areas

- `frontend/src/dashboard/Dashboard.jsx`
- `frontend/src/dashboard/KpiStrip.jsx`
- `frontend/src/dashboard/GamesSnapshot.jsx` (recent results only after step 2)
- `frontend/src/dashboard/UpcomingGames.jsx` (new)
- `frontend/src/dashboard/StandingsSnapshot.jsx`
- `frontend/src/dashboard/LeadersPanel.jsx`
- `frontend/src/lib/CompactMetric.jsx` (add optional image)
- `frontend/src/index.css` (horizontal row + round-indicator styles)

## Data / contracts

No backend changes. All values come from already-exposed endpoints:

- `getSeasonStandings(seasonCode, "RS")` - `standings[].basic.{position,
  gamesWon, gamesLost, pointsFor, pointsAgainst, pointsDifference,
  gamesPlayed}`, `standings[].{clubCode, clubName, crestUrl}`. Best
  offense/defense and the round indicator are computed client-side from this
  one query, same as the current KPI strip's league-average calc.
- `getSeasonGames(seasonCode, { status, order, limit })` - unchanged shape,
  already includes `localTeam`/`roadTeam` crest URLs.
- `getLeaderStats(seasonCode, { phase: "all", mode: "perGame", sort, order,
  limit: 1 })` - `players[].{playerName, personKey, clubName, clubCode,
  playerImageUrl, traditional.{pointsScored, totalRebounds, assists, steals,
  pir}}`; `steals` and `pir` are already-supported sort keys (used on the
  Statistics leaderboard).
- `getRounds` is dropped from Home (no longer needed once the round indicator
  reads `round` alone from the standings response).

Missing values keep the shared formatting convention (em dash / "-", never
zero) via existing `formatPerGame`/`formatSignedDiff`/`CompactMetric`
loading-error handling - no new formatting rules.

## Testing

No unit test command is configured for this project (`AGENTS.md`: "There is no
unit test command or required test gate yet"). Verify by running
`cd frontend && npm run build` and `npm run lint` after each step, and a
manual pass in the running dev server (`npm run dev`) checking: normal render,
a season/round with only 1-4 upcoming games (row doesn't break), a season with
zero upcoming games (existing empty state), and throttled network (loading
states per section still isolated, not blocking the whole page).

## Notes for the AI

- Reuse `MatchCard` as-is for the new horizontal row; only the wrapper
  changes from vertical `games-list` to a horizontal scroll container.
- Reuse `leader-card`/`leaders-grid` styling for the new 5-card row; add a
  horizontal-scroll variant class rather than inventing new card visuals.
- The round indicator must read "Round {n}" (a literal string), not the
  existing `formatRound` helper, which produces the abbreviated "R{n}" form
  used elsewhere (box scores, etc.) - the user explicitly asked for the
  spelled-out word.
- Best offensive/defensive team ties: keep it simple and take the first
  matching entry in standings order (already position-sorted) - no dedicated
  tie-break rule was requested and none of the existing dashboard KPIs
  tie-break either.
- Do not touch `SeasonCoverage.jsx`, `FormWatch.jsx`, or `LeaderTrend.jsx`
  themselves - only stop importing/rendering them from `Dashboard.jsx`, since
  nothing in this request says to delete the components (and `LeaderTrend`'s
  "SPOTLIGHT" kicker collides with the real Spotlight component's kicker
  regardless, so it was already slightly mislabeled).

**Post-implementation revision (still within step 1/5, before `/complete`):**
during review the user removed `Dashboard.jsx`'s `<PageHeader>` because a
generic "OVERVIEW / Home" title was filler, but asked to keep the page's `<h1>`
if it could carry genuinely useful data instead of being deleted outright. The
"Round {n}" indicator (originally a standalone eyebrow line inside `KpiStrip`,
per step 1 above) was moved into that `PageHeader` instead: `Dashboard.jsx` now
runs its own `getSeasonStandings(seasonCode, "RS")` query to read `round` and
renders `PageHeader` with `kicker={formatSeasonLabel(seasonCode)}` (e.g.
"2025-26") and `title="Round {n}"` (or "Season overview" before the season's
first round). `KpiStrip.jsx` no longer renders its own round text - it returns
only the four-card `HeaderStats` strip. This keeps the h1 real/current instead
of static filler and avoids showing the round twice. Confirmed with
`npm run build` and `npm run lint`.

**Second post-implementation revision (KPI card layout, before `/complete`):**
the user asked for the KPI cards' image to be bigger and repositioned: value,
then the category label ("Leader in wins" etc.), then the team/player name,
stacked on the left, with the crest/photo enlarged and moved to the card's
right edge (previously a small image sat above the value, and the category
label and name were combined into one string). `CompactMetric` (shared by
`KpiStrip` and four other pages' KPI strips) now takes `label` and `name` as
separate props plus an `imageRounded` flag, and lays out as a flex row: a text
column (`value`/`label`/`name`) on the left, the image (2.75rem, up from
1.5rem) on the right via `justify-content: space-between`. `KpiStrip.jsx`
passes the category text as `label` and the entity name as `name` separately,
and sets `imageRounded` on the Top scorer card (player photo, circular/cover)
while the team-crest cards stay `object-contain`/square. The other four
`CompactMetric` consumers (`TeamPage`, `ComparisonsPage`, `HeadToHeadPage`,
`LeaderboardKpiStrip`, `StandingsKpiStrip`) pass neither `imageUrl` nor `name`,
so their cards render unchanged - confirmed by reading each call site.
Confirmed with `npm run build` and `npm run lint`.

**Third post-implementation revision (match EuroLeague-style KPI card, before
`/complete`):** the user shared a screenshot of a EuroLeague-site KPI card
(small label, bold name, bold value stacked left; a large uncropped player
photo bleeding to the card's right/bottom edge) and asked to match that
layout, keeping our own visual styling. `CompactMetric` now renders
label → name → value (top to bottom) whenever `name` is supplied, vs. the
original value → label order when it isn't - so the 5 pre-existing
`CompactMetric` call sites (which never pass `name`) keep their original
order unchanged, and only Home's new photo+name cards reorder. Dropped the
`imageRounded`/circular-avatar treatment (it was cropping player photos) in
favor of one consistent `object-fit: contain` treatment at a larger size
(1.5rem to start, then 2.75rem, now 5.5rem tall) with small negative margins
so the image bleeds slightly past the card's padding toward the right/top/
bottom edges (clipped by the card's own rounded corners via `overflow:
hidden`), approximating the reference without a literal edge-to-edge photo.
Confirmed with `npm run build` and `npm run lint`.

**Fourth post-implementation revision (row-fill and leaders-row card style,
before `/complete`):** two further rounds of feedback. (1) The upcoming-games
row and the leaders row left dead space on the right when there were only
enough cards to partly fill the row width (fixed-width flex items). Changed
both `.games-row .match-card` and `.leaders-row .kpi-chip` from `flex: 0 0
auto; width: Xrem` to `flex: 1 1 0; min-width: Xrem`, so cards grow to fill
available width but still stop growing and let the row scroll horizontally
once there are enough cards to exceed it. (2) `LeadersPanel`'s `StatLeaderCard`
was rebuilt on the same `kpi-chip`/`kpi-chip-body` markup as the KPI strip
(label → name → club → value, big bottom-anchored photo) instead of its
previous bespoke `leader-card`/`leader-top`/`leader-value` markup, wrapped in
a `Link` to the player's page (new `.kpi-chip-link` hover style) instead of
only the name being a link. Deliberately did not touch the underlying
`.leader-card`/`.leader-top`/`.leader-value`/`.cat` CSS classes themselves,
since `SeasonOverviewPage.jsx` (out of scope for this feature) still uses them
unchanged for its own four leader cards - only `.leaders-row`'s child selector
was repointed from `.leader-card` to `.kpi-chip`. The shared enlarged-card
rules (padding, 8.5rem photo, larger name/value type) were generalized from
`.kpi-strip-4 .kpi-chip` to `.kpi-strip-4 .kpi-chip, .leaders-row .kpi-chip`
rather than duplicated. Confirmed with `npm run build` and `npm run lint`.

**Fifth post-implementation revision (section order, Top scorer, and
Spotlight/LeaderTrend swap, before `/complete`):** the user reordered
`Dashboard.jsx`'s sections directly (Upcoming games, then Standings/Results,
then the KPI strip, then Leaders, then the final section) so the most
time-sensitive content leads the page; this order is now final. Two more
changes on top of that: (1) "Top scorer" in the KPI strip was empty/redundant
with the Leaders row's own "Points per game" card, so it was replaced (per the
user's "your choosing") with "In-form team" - the club with the best
`lastTenRecord` win count from the same already-fetched standings query,
mirroring the logic the now-unused `FormWatch.jsx` used. (2) The user was
confused why the final section ("Spotlight", showing the next game) duplicated
the Upcoming games row already at the top, and remembered a "team's recent
form" feature under that name. Checked the archived `14a-home-dashboard.md`
spec: "Spotlight" was always officially the next-game matchup card
(`Spotlight.jsx`) - the recent-form feature the user meant is the separate
`LeaderTrend.jsx` (the league leader's recent point-differential trend), which
had a pre-existing bug of also using the kicker text "SPOTLIGHT", the actual
source of the confusion. Resolved by dropping `Spotlight.jsx` from Home
(genuinely redundant now that Upcoming games exists) and restoring
`LeaderTrend.jsx` as the final section instead, with its kicker corrected from
"SPOTLIGHT" to "FORM". `Spotlight.jsx` itself is left untouched/unused, same
treatment as `FormWatch.jsx`/`SeasonCoverage.jsx`. This supersedes the first
Open Question below (Form Watch stays dropped; League leader trend is back,
just not under the "Spotlight" name). Confirmed with `npm run build` and
`npm run lint`.

**Sixth post-implementation revision (LeaderTrend content, before
`/complete`):** discussed whether point differential was the most meaningful
metric for the restored trend chart; recommended keeping it as the summary
stat but agreed to try a richer chart. `LeaderTrend.jsx` now plots two lines
(points scored and points allowed per game, shared y-scale, so the gap
between them visually reads as the differential) instead of one differential
line, plus a second, smaller rolling win-percentage chart (last-5-game window)
underneath - both computed from the same already-fetched `getTeamGames` data,
no new endpoint. The user asked for both to be tried together and will drop
the win% chart later if it feels crowded. Implementation note:
`TeamTrendChart.jsx` (Team Detail's Trends tab, out of scope here) reuses the
same base `leader-trend-stat`/`chart-well`/`leader-trend-line`/
`leader-trend-point`/`leader-trend-area`/`leader-trend-baseline` CSS classes
for its own single-line chart, so those base classes and their default
(primary-color) appearance were left untouched; the new second/third lines
use additive `--allowed`/`--accent` modifier classes instead, and the
`.leader-trend` container (only ever used by `LeaderTrend.jsx`) was freely
restructured from a row to a column layout. Confirmed with `npm run build`
and `npm run lint`.

**Seventh post-implementation revision (revert dual-line/win% experiment,
before `/complete`):** the user tried the dual-line + rolling-win% version and
did not like it, and asked to go back to the original single point-differential
chart, "with a little bit more info about the graph" so it reads as plain
"how good is this team playing" rather than analyst jargon (echoing the earlier
suggested option of a plain-language caption). `LeaderTrend.jsx` is back to its
original single `buildTrend`/area/baseline/one-line rendering exactly as
archived in `14a-home-dashboard.md`, with one addition: a one-sentence
`.leader-trend-caption` paragraph under the chart explaining what the line
means in plain language (e.g. "above the line means winning comfortably;
below means it's been close or a loss - the higher above, the more dominant
the form"). The now-dead dual-line/win% CSS added in the sixth revision
(`leader-trend-summary`, `leader-trend-legend`, `legend-item`, `legend-swatch`,
`leader-trend-subhead`, the `--allowed`/`--accent` line/point modifiers) was
removed from `index.css` rather than left orphaned, since nothing else in the
app used it. The stat+chart row itself was renamed from `.leader-trend` to
`.leader-trend-row` (nested one level, with `.leader-trend` now the outer
column wrapper for row + caption) - `TeamTrendChart.jsx` never used
`.leader-trend` itself, only the inner primitives, which kept their original
CSS unchanged throughout. Confirmed with `npm run build` and `npm run lint`.

**Eighth post-implementation revision (standings fill, heading repetition,
postseason round labels, before `/complete`):** three fixes from a screenshot
review. (1) The standings/results two-column row used `items-stretch`, so
`StandingsSnapshot`'s fixed top-10 list left visible dead space below "View
full standings" whenever `RecentResults`' 5 match-cards were taller.
`WidgetPanel` (the shared wrapper for all of Home's dashboard panels, used
only within `frontend/src/dashboard/`) is now `flex h-full flex-col`;
`StandingsSnapshot` drops the `slice(0, 10)` cap, renders the full standings
list, and its `<ol>` is `flex-1 min-h-0 overflow-y-auto` so it naturally fills
whatever height the row ends up being and scrolls internally for any teams
past that - "View full standings" stays a fixed, always-visible link to the
full page for full detail, per the user's explicit ask. (2) Fixed the
kicker/title word-repetition the user flagged (STANDINGS/"Standings",
RESULTS/"Recent results") and, for the same reason, the same pattern
elsewhere on Home: `StandingsSnapshot` title -> "League table",
`RecentResults` title -> "Latest scores", `LeadersPanel` title
(LEADERS/"Statistical leaders") -> "Top performers", `LeaderTrend` title
(FORM/"... recent form") -> "... point margin trend". (3) `RecentResults`
(and `UpcomingGames`, which reuses the same `MatchCard`) were showing
`Round 47`/`Round 46` for Play-in/Playoffs/Final Four games, because those
games' `roundNumber` continues counting up from the regular season rather
than resetting, and there was no phase context on a mixed-phase list. Fixed
`MatchCard`'s shared `roundLabel()`: for any game whose `phaseCode !== "RS"`,
it now shows `roundName ?? phaseName ?? phaseCode` (e.g. "Final Four")
instead of the misleading absolute round number; Regular Season games are
unaffected. Confirmed with `npm run build` and `npm run lint`.

**Ninth post-implementation revision (real height matching, round-label
follow-up, before `/complete`):** two more fixes from a follow-up screenshot.
(1) The eighth revision's `flex-1`/`overflow-y-auto`/grid-`items-stretch`
approach did not actually clip the standings list - it rendered full-height
(swapping which panel had the dead space) because CSS Grid's implicit `auto`
row tracks size to each item's max-content height regardless of a descendant's
`overflow`/`flex-basis`; there is no space constraint being imposed for
`overflow:auto` to collapse into. A declarative-only fix cannot discover "the
sibling's real rendered height," so this now uses a small `ResizeObserver`
-based `useMeasuredHeight()` hook (new, local to `Dashboard.jsx`, no
dependency added - native browser API) that measures `RecentResults`' actual
rendered height and passes it to `StandingsSnapshot` as a `height` prop.
`WidgetPanel` gained a passthrough `style` prop (Panel already forwards
arbitrary props); `StandingsSnapshot`'s panel gets an explicit
`height: <measured>px` inline style, and *inside* that now-genuinely-definite
height, the `flex-1 min-h-0 overflow-y-auto` list correctly clips and scrolls
- the grid track auto-sizing pitfall only applied to the previous percentage
(`h-full`)-based approach. The grid's `items-stretch` was changed to
`items-start` since stretch is no longer needed (both panels now reach the
same explicit height by construction, not by grid stretching). This is the
first `ResizeObserver` usage in the codebase; not extracted to a shared
`lib/` hook since `Dashboard.jsx` is its only consumer. (2) The user reported
still seeing "Round 44" for a Final Four game after the eighth revision's fix;
root cause was that `roundName` was itself non-null and already contained the
misleading absolute-round text for postseason games, so the original fallback
order (`roundName ?? phaseName ?? phaseCode`) still picked the bad value
before ever reaching `phaseName`. Fixed `roundLabel()` to skip `roundName`
entirely for any non-`RS` phase and go straight to `phaseName ?? phaseCode`.
Confirmed with `npm run build` and `npm run lint`.

**Tenth post-implementation revision (drop point differential column, before
`/complete`):** the user felt the unlabeled `+19`/`0` column next to W-L in
`StandingsSnapshot` wasn't obviously meaningful to a casual visitor, unlike
the record itself, and asked to either label it or drop it. Chose to drop it
(the user's own stated lean) - removed the point-differential `<span>` and the
now-unused `formatSignedDiff` import; the row is back to rank, crest, name,
and W-L record only. The full Standings page (linked via "View full
standings") still shows point differential, labeled, for anyone who wants it.
Confirmed with `npm run build` and `npm run lint`.

## Open questions

- **Form Watch and League leader trend chart on Home.** The user's requested
  section list (round indicator, KPI strip, upcoming games, standings/results,
  5-stat leaders, Spotlight) does not mention the current "Form watch" panel
  or the "League leader recent form" trend chart, both of which exist on Home
  today. Default taken in this spec: drop both from Home (not add them back
  after the reorder), same treatment as the removed coverage panel. This is
  reversible - the components are left intact, just unused by Home - so it
  was not treated as a blocking question. Confirm during this spec review if
  either should stay.
- **Standings snapshot "key statistics."** The current snapshot already shows
  only rank, crest, name, and W-L. This spec adds one more column (point
  differential) as the "key statistic" beyond bare record, rather than
  matching the full 14-column Standings page. Confirm this is the right
  amount, or say which columns you'd want instead.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":25682,"specSha256":"378d70e16086b4be8d84f14cf027aa7f08fb999110a6a0bb906ad49c8f6f90bd","branch":"refs/heads/feature/home-dashboard-polish","head":"fbbfb4141d5c1cd34ba2066114787f3e52250853","baseRef":"refs/heads/master","baseCommit":"fbbfb4141d5c1cd34ba2066114787f3e52250853","sourceTree":"a40c9e5554079e86b4b47b97efb6f2dc95fa7c23","absentOptional":[]} -->
