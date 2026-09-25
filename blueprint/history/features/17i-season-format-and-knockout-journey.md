# Feature: Season format and knockout journey

**From build-plan:** feature 17i
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/season-format-and-knockout-journey`

## Goal

Absorb the existing Playoffs page into the `UI-UX.md` guideline's format view: a
phase-progression row for the whole season, a Regular Season group panel with a
round-volume chart, and a real knockout journey (numbered stages, series cards
with computed Advanced/Eliminated/Runner-up/Champion status, a game-results
disclosure, and a placement branch when the data has one). This closes out
build-plan item 17, all scoped to `E2025`/`E2026` data already returned by the
existing phases/games/standings endpoints — no new backend endpoint is needed.

## Design reference

`UI-UX.md` §7.12 (Historical Formats) is the guideline reference; see the
"Guideline deviations" section of `blueprint/build-plan.md` for this project's
standing deviations (no competition selector, no archive stepping, EuroLeague
`E2025`/`E2026` only).

## In scope

- A phase-progression row (all phases in the season: RS plus whatever
  postseason phases exist) showing game/team counts, date range, and a
  "N teams continue to `<next phase>`" note when derivable.
- A Regular Season panel: a round-volume bar chart (scheduled vs. completed
  games per round, current 15g chart conventions) and a compact group card
  (position, crest, name, W-L record, point differential) sourced from
  `getSeasonStandings`. Our two seasons only ever have one Regular Season
  group ("Regular Season"), so this renders as one card, not a multi-group
  grid — see Notes.
- A knockout journey built from `getSeasonGames`, grouping each postseason
  phase's games by `groupName` into series: numbered stage cards, series
  cards (crest tiles, wins or score, a computed status line, a
  `<details>` game-results disclosure linking each game to Game Detail), a
  separated placement branch for a third-place game if the data has one, and
  a closing legend.
- Replacing the current `PlayoffsPage` tab-per-phase view with this content at
  the existing `/:seasonCode/playoffs` route. Route path and nav label are
  unchanged here; the full nav relabel to "Format" is build-plan item 19d.
- Extracting the phase-summary helpers (`phaseSortIndex`, `teamCountFromGames`,
  `dateRangeLabel`, phase order) already written for Season Overview into a
  shared module so both pages use one implementation.
- Handling an unstarted postseason (`E2026` today) the same way the current
  page does: an honest "not started yet" message, no fabricated phases.

## Out of scope

- Reading `app_postseason_series` (build-plan 19c reads that table for this
  same knockout journey; this step computes series directly from
  `getSeasonGames`, matching how the rest of feature 17 was built ahead of
  its later `app_*` adoption items).
- Nav label/route rename to "Format" (19d).
- Play-in explainer aside, zone heatmaps, and any shot/play-by-play content
  (features 18/19 elsewhere).
- Any change to the Standings page itself.

## Build loop

Build one small step at a time. Follow `workflow.stepReview` in
`blueprint/config.json`, but Continuous Mode replaces per-step review pauses
with self-review plus one final packet, per the `continuous` skill.

## Build steps

- [x] **Step 1 - Extract shared phase-summary helpers** - Move
  `phaseSortIndex`/`PHASE_ORDER`, `teamCountFromGames`, and `dateRangeLabel`
  out of `SeasonOverviewPage.jsx` into a new `frontend/src/lib/phaseSummary.js`,
  export them, and update `SeasonOverviewPage.jsx` to import them. *Done when:*
  frontend build and lint pass and the Season Overview page's phase story is
  visually unchanged.
- [x] **Step 2 - Phase progression row** - Add a non-interactive
  phase-progression row to the format page (game/team counts, date range per
  phase, a "N teams continue to `<phase>`" note between consecutive phases
  when both have data), using the shared helpers. *Done when:* `/E2025/playoffs`
  shows one card per phase (RS, PI, PO, FF) with correct counts, and
  `/E2026/playoffs` shows only the Regular Season card.
- [x] **Step 3 - Regular Season panel** - Add the round-volume bar chart
  (per-round scheduled-vs-completed bars, theme-driven colors, bordered well,
  thinned axis labels, image role with a descriptive label, per 15g) and the
  compact group card sourced from `getSeasonStandings(seasonCode, "RS")`.
  *Done when:* the chart renders for a season with played RS games and shows
  an honest empty state when none exist yet; the group card lists every RS
  club with position, crest, W-L, and a green/red differential.
- [x] **Step 4 - Knockout journey** - Replace the existing
  `MatchupCard`/`MatchupGroups`/phase-`TabStrip` implementation with the
  knockout journey: group each postseason phase's games by `groupName` into
  series, compute each side's win count (or score for a single-game series),
  the winner, and a status line by looking ahead to the team's next
  appearance (`Advanced · <next phase>`, `Eliminated`, `Runner-up`,
  `Champion`), a `<details>` disclosure per series listing each game
  (linked to `/:seasonCode/games/:gameCode`), a separated "Placement branch"
  for a third-place game when present, and a closing legend. *Done when:*
  `/E2025/playoffs` shows Olympiacos's actual path (PI/PO/FF wins) ending in
  `Champion`, Real Madrid ending in `Runner-up`, and every eliminated team
  correctly labelled; `/E2026/playoffs` still shows the existing "postseason
  has not started yet" message.
- [x] **Step 5 - Overview fingerprint fix and self-review** - Correct the
  stale `blueprint:source-hash` marker in `blueprint/context/project-overview.md`
  (recomputed from the current `project-plan.md`/`build-plan.md` bytes per the
  `/overview` hash contract; the overview's own content already matches the
  current plans, so no other change is needed) and do a final accessibility/
  correctness self-review of the new page (keyboard-operable, non-color-only
  status, alt text on crest images, no fabricated bracket data for an
  unstarted postseason). *Done when:* the recomputed hash matches the marker
  and the page passes a manual keyboard-only pass.

## Files / areas

- `frontend/src/playoffs/PlayoffsPage.jsx` (rebuilt)
- `frontend/src/lib/phaseSummary.js` (new, shared)
- `frontend/src/season/SeasonOverviewPage.jsx` (import shared helpers, no
  behavior change)
- `blueprint/context/project-overview.md` (hash-marker correction only)

## Data / contracts

- No new endpoint. Reuses `getPhases`, `getSeasonGames` (paged the same way
  `SeasonOverviewPage` already pages a full season), and `getSeasonStandings`.
- `groupName` is EuroLeague's own series/tie identifier (one game per group in
  Play-In and Final Four, 3-5 games per group in Playoffs); grouping by it,
  not by opponent alone, is the same approach `SeasonOverviewPage`'s
  `championRoadSteps` already uses, generalized to every team instead of just
  the champion.
- A series with no decided winner (an in-progress or future series) must not
  get a fabricated status; show it as in-progress instead.

## Testing

- No unit test runner is configured (`verification.logicTests: when-configured`
  and none exists yet); rely on frontend build, `npm run lint`, and direct
  browser verification against the running dev servers for `E2025` (finished
  postseason) and `E2026` (regular season in progress, no postseason yet).
- No existing Playwright spec covers the Playoffs/Format page, so none needs
  updating for this step.

## Notes for the AI

- Both `E2025` and `E2026` have exactly one Regular Season group
  ("Regular Season", 20 clubs); the guideline's multi-group grid degrades to
  one card here rather than being special-cased away, so it still works if a
  future season ever has real sub-groups.
- `getPhases` already only returns phases that have game rows, so an unstarted
  postseason naturally yields zero postseason phases - keep the existing
  "postseason has not started yet" early return for that case.
- Status computation must look ahead across phases using the same club code,
  never a hardcoded bracket shape (PI seasons, non-PI seasons, and any
  possible future format should all fall out of the same look-ahead logic).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8272,"specSha256":"7eb7638945f16f90958fba045e882be6e305108d1aee954750c18e5bf964c704","branch":"refs/heads/feature/season-format-and-knockout-journey","head":"5e9db714c2733539c67a5aa85cf86a20c0439d1d","baseRef":"refs/heads/master","baseCommit":"5e9db714c2733539c67a5aa85cf86a20c0439d1d","sourceTree":"819fb15b090c0528a47488c957060a9fe0e81725","absentOptional":[]} -->
