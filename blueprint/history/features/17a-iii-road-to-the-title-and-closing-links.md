# Feature: Road to the title and closing links

**From build-plan:** feature 17a-iii
**Build attempt:** 1
**Status:** verified

**Branch:** feature/road-to-the-title-and-closing-links

## Goal

Add the Season Overview page's final two pieces: a numbered "Road to the
title" trail showing the champion's knockout path, and a closing links
bar. This is the last part of feature 17a - once merged, 17a itself is
complete.

## Design reference

UI-UX.md section 7.13 (Season Overview), content-flow items 5-6: "Road to
the title" (success-tinted cards for each knockout step, numbered, showing
who was defeated and whether the result is a score, an aggregate or a
series) and a closing "Keep exploring" bar. The build-plan's own item text
already names this app's four closing links exactly: All games, Standings,
Teams, Playoffs (the guideline's fourth link, "Format", maps to this app's
existing Playoffs page - there is no separate season-format page yet;
that's feature 17i, not built).

## In scope

- `RoadToTitle`: only rendered when a champion exists (reuses 17a-i's
  already-computed `champion`). Traces the champion's knockout path using
  data 17a-i already fetches for the knockout phases (`Play-In`,
  `Playoffs`, `Final Four` games, already loaded for team-count
  purposes): every knockout-phase game involving the champion's club,
  grouped by `(phaseCode, groupName)` - EuroLeague's own series/tie
  identifier, confirmed against real Play-In (one game per group),
  Playoffs (one group per best-of-5 series, 3-5 games), and Final Four
  (one group per single game: two semifinals, one championship) data.
  Each group becomes one numbered, success-tinted step: the opponent's
  name and crest, and the result - a single score for a one-game group,
  or a W-L series record for a multi-game group. Steps are ordered by
  phase (Play-In, then Playoffs, then Final Four) and, within a phase, by
  the group's earliest game date.
- When there is no champion yet (mid-season or not started), the section
  is omitted entirely rather than showing an empty or speculative step -
  there is nothing honest to show about a path that hasn't happened, and
  the hero above it already states the season's status.
- A closing "Keep exploring" links bar with four links: All games
  (`/:seasonCode/games`), Standings (`/:seasonCode/standings`), Teams
  (`/:seasonCode/teams`), Playoffs (`/:seasonCode/playoffs`). Always
  rendered regardless of season progress, since every one of these routes
  is always reachable.
- Placed after `SeasonLeaders`/`SeasonStandingsSnapshot` and before the
  data coverage panel on `SeasonOverviewPage.jsx`. `RoadToTitle` depends on
  `champion` and the knockout-phase game queries, which are already inside
  the page's existing `summaryLoading`/`summaryError` gate (the same one
  guarding the hero, summary cards, and phase story) - it needs no new
  loading or error state of its own. The closing links bar needs neither,
  since it has no data dependency at all.

## Out of scope

- Any change to 17a-i's or 17a-ii's sections (hero, summary cards, phase
  story, coverage panel, scoring chart, defining games, leaders,
  standings snapshot).
- A dedicated season-format/knockout-journey page - that's feature 17i.
  This feature only links to the existing Playoffs page.
- Any backend endpoint or schema change - `RoadToTitle` is built entirely
  from the knockout-phase games `SeasonOverviewPage.jsx` already fetches.
- Handling a two-legged "aggregate" tie - this app's actual playoff format
  is single games and best-of-N series only (confirmed against real
  Play-In and Playoffs data); no aggregate-score case exists to build for.

## Build loop

Follow `workflow.stepReview: "feature"` (self-review, one final packet) and
`workflow.checkpointCommits: "disabled"` (no per-step commits; `/complete`
makes the one feature commit).

## Build steps

- [x] 1. Add a `championRoadSteps(champion, knockoutPhases,
      knockoutGamesByPhase)` function: flatten every knockout-phase game,
      keep only games where the champion's `clubCode` is the home or away
      team, group by `${phaseCode}:${groupName}`, and for each group
      compute the opponent (the other club), the champion's win count, the
      opponent's win count, and the earliest game date in that group. Sort
      groups by phase order then earliest date.
      **Done when:** `npm run build` passes and, reasoned against the real
      `E2025` knockout data already inspected (Playoffs "Group PLAYOFF A"
      Olympiacos 3-0 over Monaco, Final Four semifinal Olympiacos over
      Fenerbahce, Final Four championship Olympiacos over Real Madrid),
      the function returns the three correct steps in the correct order.

      Verified via CDP (not just reasoning): the live page produced
      exactly the three predicted steps in the predicted order.
- [x] 2. Add the `RoadToTitle` component rendering those steps as numbered,
      success-tinted cards (opponent name/crest, and a single score or a
      series record depending on the group's game count), and wire it into
      `SeasonOverviewPage.jsx` conditioned on `champion` being present.
      **Done when:** `npm run build` passes and CDP against `E2025` (whose
      champion this session already confirmed is Olympiacos Piraeus) shows
      three correct steps: a 3-0 series over Monaco, a single-game win
      over Fenerbahce, and a single-game win over Real Madrid.

      Verified via CDP: "1. Defeated AS Monaco - Won series 3-0",
      "2. Defeated Fenerbahce Beko Istanbul - Won 79-61",
      "3. Defeated Real Madrid - Won 92-85" - all three scores match the
      real games inspected during spec research exactly.
- [x] 3. Add the closing links bar (All games, Standings, Teams, Playoffs)
      and confirm `RoadToTitle` is correctly absent (not an empty state -
      simply not rendered) for a season with no champion yet.
      **Done when:** `npm run lint` and `npm run build` pass, and CDP shows
      all four links resolving to the right routes, and confirms
      `RoadToTitle`'s heading text does not appear anywhere on `E2026`'s
      page (a season with no champion).

      Verified via CDP on `E2025`: the closing bar's own links (scoped to
      its panel, distinct from the persistent nav's own "Standings" etc.
      tabs) are exactly `/E2025/games`, `/E2025/standings`,
      `/E2025/teams`, `/E2025/playoffs`. On `E2026` (no champion, per
      17a-i's already-established "Season not yet started" fallback),
      "Road to the title" does not appear anywhere on the page while the
      closing bar still renders normally - no console exceptions in
      either case.

## Files / areas

- `frontend/src/season/SeasonOverviewPage.jsx`

## Data / contracts

None - `RoadToTitle` is built entirely from `SeasonOverviewPage.jsx`'s
existing knockout-phase games data (`knockoutPhaseGamesQueries`, already
fetched in 17a-i) and the already-computed `champion` value. No new query,
no API or persisted-data change.

## Testing

No unit test runner is configured. Verification is `npm run lint`,
`npm run build`, and CDP evidence against `E2025` (has a champion) and
`E2026` (does not).

## Notes for the AI

- `knockoutPhaseGamesQueries` (from 17a-i) already fetches Play-In,
  Playoffs, and Final Four games with `limit: 100`, safely covering a
  full knockout bracket in one request per phase - reuse `.data.games`
  directly; no new fetch.
- A group's `groupName` is EuroLeague's own series/tie identifier - do not
  invent a different grouping key (e.g. by opponent alone), since two
  different ties could in principle share the same opponent pairing
  across different phases and must stay separate steps.
- Keep `championRoadSteps` a pure function taking already-fetched data, so
  it can be reasoned about directly against the real data already
  inspected during spec research, the same way `findChampion` and
  `isFinalGame` were in 17a-i.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7946,"specSha256":"0a4ece2e035a92e3ef4e44caae907d4eedae565920cdbb59a053765504394227","branch":"refs/heads/feature/road-to-the-title-and-closing-links","head":"d8dac6cb48e13c43738e93556b676a1bcc689a0c","baseRef":"refs/heads/master","baseCommit":"d8dac6cb48e13c43738e93556b676a1bcc689a0c","sourceTree":"1e904bfda4bd7997604ec04b19fe088e810ec8af","absentOptional":[]} -->