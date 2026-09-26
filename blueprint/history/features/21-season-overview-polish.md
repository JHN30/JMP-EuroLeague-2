# Feature: Season overview polish

**From build-plan:** feature 21
**Build attempt:** 1
**Status:** verified
**Branch:** feature/season-overview-polish

## Goal

Rework the season overview page's layout and content per direct user request:
drop the summary KPI card row, turn the phase timeline into the page's answer
for "what phase are we in and what does it mean" (active-phase highlight,
short format blurb, no raw counts), chart average points per team instead of
combined per-game score, split Defining games and Statistical leaders into two
separate full-width sections (each expanded), and remove the standings
snapshot, "Keep exploring" links, and data-coverage panel (redundant with the
Home dashboard, the persistent navbar, and developer-facing content
respectively). Reuse existing endpoints (`getPhases`, `getSeasonGames`,
`getLeaderStats`); no backend changes. Apply the same restrained Motion
animation already used on Home.

## In scope

- `frontend/src/season/SeasonOverviewPage.jsx`: remove `SummaryCards`,
  `SeasonStandingsSnapshot`, and `ClosingLinksBar` (all defined in this file);
  remove the `DataCoveragePanel` render, its `coverageQuery`, and the
  now-unused `totalGamesQuery`/`seasonTeamsQuery` fetches.
- `PhaseStory`: accept the active phase code, highlight that phase's card, drop
  the game-count/team-count line, add one static format-description line per
  phase code.
- `ScoringTrendChart`: change the charted/labeled metric from combined
  per-game score to average points scored per team; move it to its own
  full-width row.
- `DefiningGames`: 3 to 4 games, a 2-column grid instead of a single vertical
  list, winner highlighted, series/round-group context shown when present.
- `SeasonLeaders`: 4 to 6 categories (add Steals, Blocks), grid adjusted for
  the extra cards.
- Final page order: `PageHeader` -> `SeasonHero` -> `PhaseStory` ->
  `ScoringTrendChart` -> `DefiningGames` -> `SeasonLeaders` -> `RoadToTitle`.
- Motion entrance/hover animation on this page's sections and cards, reusing
  `frontend/src/lib/motion.js` presets as-is.

## Out of scope

- Any backend/API change - all data already exposed.
- `DataCoveragePanel.jsx` itself (left in place; `GameDetailPage.jsx` still
  uses it) and `SeasonCoverage.jsx` (already unused/orphaned before this
  feature, not touched here).
- Any other page (Home, Standings, Team/Player detail, etc.).
- New `frontend/src/lib/motion.js` presets - reuse the existing
  `sectionContainer`/`sectionItem`/`listContainer`/`listItem`/`cardHover` set
  built for Home.
- `RoadToTitle` - unchanged, no complaints raised against it.

## Build loop

Per `blueprint/config.json` (`workflow.stepReview: "feature"`,
`checkpointCommits: "disabled"`): implement all steps below in one pass with
no per-step approval pause and no intermediate checkpoint commits; the whole
feature is reviewed as one packet at the end, before `/complete`.

## Build steps

- [x] 1. **Remove the KPI card row; revise the phase timeline.** Delete
      `SummaryCards` and its render call. Delete the now-unused
      `totalGamesQuery` (`getSeasonGames(seasonCode, { limit: 1 })`) and
      `seasonTeamsQuery` (`getSeasonTeams`) fetches, and drop them from
      `summaryLoading`/`summaryError`/`retrySummary`. Remove the
      `getSeasonTeams`, `teamCountFromGames`, and `formatCount` imports (all
      become unused). In `PhaseStory`: accept a new `activePhaseCode` prop
      (pass `activePhase?.code` from the page); stop reading
      `summary.gameCount`/`summary.teamCount` (keep `summary.dateRange`); add
      a local `PHASE_BLURBS` map (`RS`/`PI`/`PO`/`PO`/`FF` -> one plain-language
      sentence, see Data / contracts for the exact draft text) and render the
      matching sentence under the date range, falling back to nothing when a
      phase code isn't in the map. Highlight the phase whose code equals
      `activePhaseCode`: that card's top accent bar and border use
      `border-primary`/`bg-primary` (already the existing accent-bar pattern),
      every other phase's card has no colored accent, and the highlighted card
      gets a small `badge badge-primary badge-sm` reading "Current" next to
      its "Phase N" eyebrow (matches the existing "active state -> badge-primary"
      taxonomy from feature 15f-iii). Done when: the page shows no KPI card
      row, the timeline shows only a date range and one description sentence
      per phase (no counts), exactly one phase is visually highlighted and
      matches the `SeasonHero` phase name above it, `cd frontend && npm run
      build` and `npm run lint` pass, and a manual check against a
      mid-season, real dataset confirms the right phase is highlighted.
- [x] 2. **Per-team scoring average; standalone full-width row.** In
      `monthlyScoringSeries`, change the monthly value from
      `entry.total / entry.count` (combined two-team score per game) to
      `entry.total / entry.count / 2` (average points scored per team per
      game). Update the dataset label from "Average combined score" to
      "Average points per team" and the canvas `aria-label` to match ("Average
      points scored per team per month across the season, from X to Y
      points"). Remove the `xl:grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.6fr)]`
      wrapper that currently pairs this chart with `DefiningGames`; render
      `ScoringTrendChart` alone, full width. Done when: the charted values are
      roughly half their previous magnitude for the same season (~85 instead
      of ~170), the label reads "Average points per team", the chart spans
      the full page width, and `npm run build` passes.
- [x] 3. **Expand Defining games.** Change the `slice(0, 3)` to `slice(0, 4)`.
      Change the card list's wrapper from `flex flex-col gap-3` to `grid gap-3
      sm:grid-cols-2`. Add two more pieces of information per card, using
      data already on each `game` object: (a) tint the winning team's name and
      score with `text-primary font-semibold` (the losing side keeps its
      current styling) - no shared CSS class needed, just conditional
      Tailwind classes on the existing markup; (b) when `game.groupName` is
      present, show it before the existing round label (e.g. "Quarterfinals ·
      Round 3") for knockout-phase context. Render this section as its own
      full-width row directly after `ScoringTrendChart`. Done when: up to 4
      defining games render in a 2-column grid, the winning team in each is
      visually distinguished, playoff-phase cards show their series/group
      name, and `npm run build` passes.
- [x] 4. **Expand Statistical leaders; remove standings snapshot, closing
      links, and data coverage.** In `SeasonLeaders`, extend
      `LEADER_CATEGORIES` with Steals (`steals`) and Blocks (`blocks`) -
      both already-supported `getLeaderStats` sort keys (Steals already used
      on Home; Blocks already used on the Statistics leaderboard). Change the
      grid from `sm:grid-cols-2` to `sm:grid-cols-2 xl:grid-cols-3` so the 6
      cards form a clean 2x3/3x2 layout. Delete `SeasonStandingsSnapshot` and
      `ClosingLinksBar` (both defined in this file) and their render calls.
      Delete the `coverageQuery` (`getCoverage`) fetch, the trailing
      `DataCoveragePanel` render block, and the now-unused `getCoverage` and
      `DataCoveragePanel` imports. Remove the now-unused `getSeasonStandings`
      import (only `SeasonStandingsSnapshot` used it). Assemble the final
      section order: `PageHeader` -> `SeasonHero` -> `PhaseStory` ->
      `ScoringTrendChart` -> `DefiningGames` -> `SeasonLeaders` ->
      `RoadToTitle`. Done when: the page ends after `RoadToTitle` (or after
      `SeasonLeaders` for a season with no champion yet) with no standings
      list, no "Keep exploring" bar, and no data-coverage panel anywhere on
      the page, `npm run build` and `npm run lint` pass, and a manual pass
      confirms loading/empty/error states still render correctly per section
      for a slow network.
- [x] 5. **Motion animation pass.** Wrap the page's returned JSX in a
      `motion.div` with `sectionContainer`/`initial="hidden"
      animate="show"`, and each top-level section (`SeasonHero`, `PhaseStory`,
      `ScoringTrendChart`, `DefiningGames`, `SeasonLeaders`, `RoadToTitle`) in
      a child `motion.div variants={sectionItem}`, matching
      `Dashboard.jsx`'s existing pattern exactly. Inside `PhaseStory`, wrap the
      phase-card row in a `motion.div` with `listContainer` and each phase
      card in `motion.div variants={listItem}`. Inside `DefiningGames`,
      convert each card's `Link` to `motion.create(Link)` with `variants={
      listItem}` and the shared `cardHover` spread (hover lift + tap), wrapped
      in a `listContainer` parent, mirroring `RecentResults.jsx`'s `MatchCard`
      treatment. Do the same for each leader card's `Link` in `SeasonLeaders`.
      Do not add any Motion wrapper to `ScoringTrendChart`'s canvas - Chart.js
      already animates its own line draw-in on mount. Done when: the page
      fades/rises in section by section on load, defining-game and leader
      cards lift slightly on hover and press down on tap, this matches Home's
      existing feel, `prefers-reduced-motion` still collapses all of it (already
      handled globally by `MotionConfig` in `App.jsx`, no per-component check
      needed here), and `npm run build` passes.

## Files / areas

- `frontend/src/season/SeasonOverviewPage.jsx` (all changes are within this
  one file)

## Data / contracts

No backend changes. All values come from already-exposed endpoints already
used by this page:

- `getPhases(seasonCode)`, `getSeasonGames(seasonCode, { phase, limit,
  order })` - unchanged shapes; `dateRangeLabel` still reads
  `games[0].scheduledAt` from the existing first/last-game-per-phase queries.
- `getLeaderStats(seasonCode, { phase: "all", mode: "perGame", sort, order,
  limit: 1 })` - `steals` and `blocks` are already-supported sort keys (used
  on Home and the Statistics leaderboard respectively), so no new contract.
- Removed from this page (endpoints stay available for other pages):
  `getSeasonTeams`, `getSeasonStandings`, `getCoverage`.

Phase blurb copy (static, not derived from season data - same sentence every
season, please confirm or edit before I build this in):

| Code | Blurb |
| --- | --- |
| RS | "Every team plays every other team home and away." |
| PI | "Teams ranked 7th-10th play for the two remaining playoff spots." |
| PO | "Best-of-five series between the top eight teams." |
| FF | "Championship weekend: the semifinals and the final." |

Missing values keep the shared formatting convention (em dash / "-", never
zero) via existing `formatPerGame`/`formatDateTime` - no new formatting rules.

## Testing

No unit test command is configured for this project (`AGENTS.md`: "There is no
unit test command or required test gate yet"). Verify by running `cd frontend
&& npm run build` and `npm run lint` after each step, and a manual pass in the
running dev server (`npm run dev`) checking: a season with games already
played (phase highlight lands on the right phase, defining games and leaders
populate), a season not yet started (`SeasonHero`'s existing "not yet started"
state, phase story with no highlighted phase since none has played games yet,
`DefiningGames`/`SeasonLeaders` existing empty states), a season with a
champion (`RoadToTitle` renders), and throttled network (per-section loading
states stay isolated).

## Notes for the AI

**In-flight refinement (step 3, before review):** live data showed the API
returns a non-null `game.groupName` for regular-season games too (a generic
value, not a genuine series identifier), which made the "GROUP REGULAR SEASON
· ROUND 1" label read as redundant noise rather than useful context. Gated the
group-name display on `game.phaseCode !== "RS"` (the same non-RS check
`dashboard/RecentResults.jsx`'s `roundLabel()` already uses for the identical
problem), so it only shows for actual knockout-phase games where it's a real
series identifier. Confirmed with a live-app screenshot before and after.

**Post-implementation revision (after first review, before `/complete`):** the
user reviewed the built page and asked for eight changes:

1. `SeasonHero` no longer shows a generic "{phase} in progress" line. It now
   re-adds a `getSeasonStandings(seasonCode, "RS")` query (removed in step 1's
   KPI-card cleanup, now reintroduced for this narrower purpose only - it is
   not restoring the removed standings-snapshot list) and shows the current
   standings leader as two `kpi-chip`-styled tiles ("League leader" / record,
   "Points per game" / PPG), matching Home's KPI-card visual language.
2. `PhaseStory` now always renders all four canonical phases
   (`PHASE_ORDER` from `lib/phaseSummary.js`: RS/PI/PO/FF), not just whichever
   phases already exist in this early season's data. A phase absent from the
   API response renders as a placeholder (`{ code, name: PHASE_NAMES[code] }`)
   and falls into the existing "Not yet applicable" branch.
3. Phase date ranges no longer show a time of day. Root cause:
   `dateRangeLabel` (`lib/phaseSummary.js`) called the shared `formatDateTime`,
   which hardcodes `timeStyle: "short"` regardless of the `dateStyle` option
   passed to it. Added a new `formatDate` (date-only) export in `lib/format.js`
   and pointed `dateRangeLabel` at it instead. `formatDateTime` itself is
   unchanged (still used everywhere a real timestamp, like a game's kickoff
   time, is wanted). This also fixes the identical issue in
   `PlayoffsPage.jsx`, the only other `dateRangeLabel` consumer.
4. The winner highlight in Defining Games no longer uses `text-primary`
   (looked like a dull/dark orange on this card). Switched to a new
   `.highlight-leader` CSS class (`color: var(--color-rank-leader)`, the same
   gold/amber token already used for `.rank-1` and `.stat-badge-leader`
   elsewhere) for the winner, and dims the loser with `opacity-60` instead of
   leaving it unstyled, so the contrast comes from both ends, not just a
   color swap.
5. Defining Games no longer takes the 4 closest-margin games. New
   `pickDefiningGames` picks one game per category - closest margin,
   highest combined score, lowest combined score, biggest blowout - skipping
   a game already claimed by an earlier category. Each card's eyebrow shows
   its category tag instead of the round; the round/group context moved into
   the caption line alongside a category-appropriate stat (margin-based for
   closest/blowout, combined-points for highest/lowest-scoring).
6. `RoadToTitle` now takes a `champion` prop and renders a merged "Season
   champion" banner (crest, name, and a new postseason win-loss record line
   summed from the existing `steps[].championWins/opponentWins`) directly
   inside the same panel as the step list, instead of a separate empty-feeling
   `SeasonHero` champion block. `SeasonHero` itself now just says "Season
   finished" when a champion exists.
7. Fixes point 7's actual complaint: `SeasonHero` no longer computes or shows
   any "{phase} in progress" text derived from `activePhase`, so it can't say
   a phase is active once the season has a determined champion - the
   champion check now runs first and wins unconditionally.
8. `SeasonLeaders`'s `LeaderCard` was rebuilt on the same `kpi-chip`/
   `kpi-chip-body`/`kpi-chip-link` markup Home's `LeadersPanel` uses (label ->
   name -> club -> value, bottom-anchored photo), replacing the page's own
   `leader-card`/`leader-top`/`leader-value`/`.cat` classes. Those classes had
   no other consumer after this change (confirmed via repo-wide grep) and were
   deleted from `index.css`, along with the also-unused `.leaders-grid`.
   Extended the existing "Home's photo KPI cards read taller" CSS selector
   list to also cover `.season-leaders-grid`/`.season-hero-kpis` so both the
   new leader grid and the new hero tiles get the same enlarged photo/type
   sizing Home uses, without duplicating those rules.

Verified points 1-5 and 8 against the live dev app with real early-2026-27
(`E2026`) data via Playwright screenshots. Points 6-7 were then also verified
against `E2025` (2025-26), a concluded season in the same dataset: `SeasonHero`
correctly reads "Season finished" (not a stale "Final Four in progress"), and
the merged `RoadToTitle` panel shows the real champion (Olympiacos Piraeus),
its "5-0 in the postseason · defeated 3 opponents" summary line, and the three
real series results (3-0 vs AS Monaco, 79-61 vs Fenerbahce, 92-85 vs Real
Madrid) with no duplication between the summary line and the step list.
Confirmed with `npm run build` and `npm run lint` after every change in this
round.

**Second post-implementation revision (after second review, before
`/complete`):** a screenshot-driven review of the previous round's changes
surfaced six more fixes:

1. `PhaseStory`'s four phase cards rendered at different heights (the active
   card's longer blurb made it taller than the others). The wrapping
   `motion.div` was `flex items-center`, which only vertically centers the
   `Panel` at its own content height inside the (correctly grid-stretched)
   row, instead of letting the `Panel` fill it. Changed to `items-stretch`
   (with `self-center` added to the `→` connector span so the glyph itself
   stays vertically centered while its container stretches) - all four cards
   now match height.
2. The `activePhaseCode` passed to `PhaseStory` is now `champion ? null :
   activePhase?.code`, so once a season has a determined champion, no phase
   card shows the "Current" badge/highlight - fixes the same underlying
   "stale phase-in-progress" problem as the prior round's `SeasonHero` fix,
   just for this second place it also showed up.
3. `ScoringTrendChart` now groups by `game.roundNumber` instead of by
   calendar month (`roundScoringSeries` replaces `monthlyScoringSeries`),
   labeled with the existing `formatRound` helper (e.g. "R12") instead of a
   month/year string. Same per-team-average math, same `thinAxisLabels`
   thinning, just a different, more granular x-axis - a finished season now
   shows one point per round (~47 rounds) instead of ~8 monthly points.
4. Defining Games' score badge changed from `stat-badge stat-badge-neutral`
   (a warning-orange-tinted pill that read as low-contrast/muddy per the
   user's report) to a plain, larger `badge badge-lg` - neutral background,
   no color competing with the `.highlight-leader` gold winner text inside it.
5. The same cards' team-vs-score-vs-team row changed from a `flex
   justify-between` layout to `grid grid-cols-[1fr_auto_1fr]`. With flex, the
   score badge's horizontal position depended on how much space each side's
   team name actually consumed, so it visibly drifted card-to-card whenever
   team-name lengths differed (worst case seen: a long truncated name pushing
   the badge off-center relative to the other three cards). The 3-column grid
   gives both team-name zones a guaranteed equal `1fr` width regardless of
   content, so the badge now sits at the same horizontal position on every
   card. The road-team span also gained `justify-end` to keep hugging the
   right edge of its now-fixed-width column, matching its original visual
   alignment.
6. None of the above needed new CSS beyond one selector list extension
   already made in the prior round; no shared component or other page was
   touched.

Verified all six against the live app: `E2026` (in-progress) for the phase
heights, the badge restyle, and the grid-alignment fix (four cards' badges now
visibly line up); `E2025` (finished) for the "Current" badge correctly absent
from Final Four now that "Season finished" shows, and the round-based trend
chart rendering ~47 individual round points instead of ~8 months. Confirmed
with `npm run build` and `npm run lint`.

- `SeasonStandingsSnapshot` and `ClosingLinksBar` are functions defined inside
  `SeasonOverviewPage.jsx` itself, not separate files - removing their render
  calls means deleting the function definitions too, not leaving them
  orphaned (unlike `DataCoveragePanel.jsx`, a real shared file that stays
  since `GameDetailPage.jsx` still uses it).
- The phase blurb text is static UI copy describing the general EuroLeague
  format, not a per-season fact pulled from data - don't try to source it from
  an API response, and don't invent more specific numbers than the draft above
  states (e.g. don't add exact team counts if a future season's bracket size
  could differ).
- Reuse the exact `sectionContainer`/`sectionItem`/`listContainer`/`listItem`/
  `cardHover` presets from `frontend/src/lib/motion.js` - do not add new ones
  for this page.
- `DefiningGames`' cards are bespoke markup (not the shared `MatchCard` from
  `dashboard/RecentResults.jsx`), so the winner-tint and group-name additions
  should be applied directly here with existing Tailwind utilities, not by
  importing `MatchCard` across the dashboard/season folder boundary.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":21074,"specSha256":"732d89c26a9ac6f5b70f03fff1431c8962368ca30606f23332207ba168a9da42","branch":"refs/heads/feature/season-overview-polish","head":"9b6c2e96dc0ca0df35fc0ab006d93456755252af","baseRef":"refs/heads/master","baseCommit":"9b6c2e96dc0ca0df35fc0ab006d93456755252af","sourceTree":"de768498747e6c8b2de120f33f5ef8f0a3cb1c64","absentOptional":[]} -->
