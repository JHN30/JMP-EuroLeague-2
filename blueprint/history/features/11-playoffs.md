# Feature: Playoffs

**From build-plan:** feature 11
**Build attempt:** 1
**Branch:** feature/playoffs
**Status:** verified

## Goal

Let a visitor see the selected season's Play-In, Playoffs, and Final Four
matchups and results, without inventing a participant or outcome the data
doesn't yet have.

## In scope

- A playoffs page at `/:seasonCode/playoffs` (the URL the nav bar's existing
  "Playoffs" tab already points to and currently falls through to the
  season-home redirect; this feature makes that tab resolve to a real page).
- **No new backend surface.** Confirmed live against real E2025 data: the
  project overview's data model flagged "postseason matchup" as a possible
  missing table, but the existing `app_games` rows already carry
  everything needed. Play-In, Playoffs, and Final Four are just `games` rows
  with `phaseCode` `PI`/`PO`/`FF`, and each matchup (a Play-In pairing, a
  best-of-5 Playoff series, a Final Four semifinal/championship game) is
  exactly one `groupId`/`groupName` value already on those rows (verified:
  E2025's `PO` phase returns 16 games across 4 groups named "Group PLAYOFF
  A".."D", each with 2-5 games; `PI` returns 3 games across "Group A"/"Group
  B"/"Group C"; `FF` returns 3 games across "Group SEMIFINAL A/B" and "Group
  CHAMPIONSHIP GAME"). This feature is a pure read/group/display layer over
  the existing `GET /:seasonCode/games?phase=` endpoint (already extended
  with phase filtering in feature 6) and `GET /:seasonCode/phases` (already
  returned in chronological order by earliest round).
- **Phase tabs**: only the season's actual non-`RS` phases (from the
  existing `getPhases`, filtered to `phase.code !== "RS"`), defaulting to
  the earliest one that exists. When a season has no postseason phase yet
  (confirmed live: `E2026` currently returns only `RS`), show "The
  postseason has not started yet for this season." instead of empty tabs.
  This is the feature's entire answer to "future... rounds": an unreached
  phase simply has no tab, the same way `StatisticsPage`/`TeamPage` already
  only show phases that exist.
- **Matchup grouping**: for the selected phase's games (`GET
  /:seasonCode/games?phase=<code>&limit=100`, well under the existing max
  `limit` for these small phases), group by `groupId` (falling back to
  `groupName` only if `groupId` is ever null), and order the groups by each
  group's earliest `roundNumber` (so Final Four semifinals sort before the
  championship game, and Play-In round-1 pairings sort before the round-2
  pairing, independent of alphabetical group naming). Each matchup renders
  as a card: the raw `groupName` as its title (shown verbatim, the same way
  `roundName`/`phaseName` are already shown verbatim elsewhere, no invented
  reformatting), and its games in `roundNumber` order, each showing both
  teams (linking to `/:seasonCode/teams/:clubCode`), the round's own name
  (`roundName`, e.g. "Game 3"), date/time ("TBD" when `scheduledAt` is
  null), and the score when played ("Not yet played" otherwise) &mdash; the
  same row shape `FixturesPage` already uses. A game whose participant isn't
  determined yet has a null `localTeam`/`roadTeam`; render "TBD" for that
  side (`FixturesPage`'s existing `teamLabel` fallback), never a guessed
  team. Each game links to `/:seasonCode/games/:gameCode` for its full box
  score, reusing the existing game detail page.
- "No games scheduled yet for this phase." when the selected phase exists
  but currently returns no games (a phase can exist from round data alone
  before its first game is scheduled).
- Loading and error (with retry) states for the phases and games requests.

## Out of scope

- A computed series won-loss tally (e.g. "leads 3-1") or bracket diagram.
  The build-plan item asks to "show... matchups/results," which plain
  grouped game listings already satisfy; a tally is a reversible future
  enhancement, not required here.
- Automated playoff simulation or outcome prediction (already listed as
  deferred beyond Phase 1 in `build-plan.md`).
- Any backend change; every value already exists through endpoints features
  6 and 1a already built and verified (`/games`, `/phases`).
- Changing `FixturesPage`, `GameDetailPage`, `TeamPage`, or any existing
  endpoint's response shape.

## Build loop

Follow `blueprint/config.json`: `workflow.stepReview` is `feature` (one review
packet after all steps), `workflow.checkpointCommits` is `disabled`.

## Build steps

- [x] 1. Frontend: add `frontend/src/playoffs/PlayoffsPage.jsx` implementing
      the phase tabs, matchup grouping/ordering, matchup cards, and
      loading/error/empty states described above, and wire it at `playoffs`
      under `SeasonLayout` in `frontend/src/App.jsx`. No `frontend/src/lib/api.js`
      change is needed; reuse the existing `getPhases` and `getSeasonGames`.
      Done when: navigating to `/E2025/playoffs` shows Play-In/Playoffs/Final
      Four tabs with the real 2025-26 postseason results grouped into their
      correct matchups in chronological order (verified against the live API
      response used while writing this spec); navigating to `/E2026/playoffs`
      (a season with only a Regular Season phase so far) shows "The
      postseason has not started yet for this season."; verified live with
      both dev servers running.

## Files / areas

- `frontend/src/playoffs/PlayoffsPage.jsx` (new)
- `frontend/src/App.jsx` (new route)

## Data / contracts

No backend changes. This feature only reads the existing
`GET /:seasonCode/phases` and `GET /:seasonCode/games?phase=<code>` (added in
feature 6), both already exposing everything a matchup needs: `groupId`,
`groupName`, `roundNumber`, `roundName`, `scheduledAt`, `played`, `localTeam`,
`roadTeam`, `localScore`, `roadScore`.

## Testing

No unit test runner is configured, so verification is `npm run build`/`npm
run lint` plus live verification with both dev servers running, using the
`Browser tests` Playwright harness (set up in a prior session) for the
scripted checks: phase tabs render with real grouped matchups, a
no-postseason-yet season shows the empty state, and a TBD/unplayed game (if
reachable in the live data) renders without a fabricated participant or
score.

## Notes for the AI

- Reuse `FixturesPage.jsx`'s `formatDateTime`/`teamLabel` pattern and the
  local `CenteredSpinner`/`ErrorAlert` pattern duplicated across every other
  page, rather than extracting a shared component now.
- `getPhases` already returns phases sorted by earliest round number
  (confirmed in `backend/src/db/season-catalog.ts`), so filtering out `"RS"`
  and taking the first remaining entry is already the correct chronological
  default; no extra sort is needed for the phase tabs themselves.
- Guard the group-ordering `Math.min` over `roundNumber` with a `?? Infinity`
  fallback per game, in case a future/unscheduled game in a group has no
  round number yet.
- Key matchup cards on `groupId` (or the exact same fallback key used to
  build the grouping map), not on `groupName` alone, the same defensive
  lesson learned in feature 10's `TrendChart` duplicate-key fix &mdash; two
  matchups sharing a display name is unlikely here but costs nothing to
  avoid.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7232,"specSha256":"38d3aa94eed5092a6843c917dbd0ae054f440c95f0560d5b94300c5149ea6556","branch":"refs/heads/feature/playoffs","head":"ae9ba5eea7048b9019c0eeda931279f905df9ae2","baseRef":"refs/heads/master","baseCommit":"ae9ba5eea7048b9019c0eeda931279f905df9ae2","sourceTree":"cd4ec68f8a3f798c1dc37b7c5a652a8a249b61b7","absentOptional":[]} -->
