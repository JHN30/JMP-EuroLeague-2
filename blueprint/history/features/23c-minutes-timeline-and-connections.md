# Feature: Minutes timeline and connections

**From build-plan:** feature 23c
**Build attempt:** 1
**Branch:** feature/minutes-timeline-and-connections
**Status:** verified

## Goal

Add a **Rotations** tab to Game Detail that shows who was on the court when, and who scored off whose
assists. A minutes timeline draws each player's stints across the game from the substitution events, and an
assist-connections list shows each team's most frequent passer-to-scorer pairs. Both are built only from the
play-by-play and box score the page already fetches, so this step needs no backend change and no new table,
and it does not depend on the per-game advanced tables (23d, 23e).

## In scope

- A new **Rotations** tab, after Game flow in the tab strip. Its play-by-play is fetched only when the tab is open.
- **Minutes timeline**, one block per team: a row per player who played, with a bar for each stint on the court,
  period boundaries marked (Q1 to Q4, plus overtimes), and a time axis. Starters are known from the box score;
  substitutions come from `IN` and `OUT` events.
- A **reconciliation badge** on the timeline in the style of the shot chart's: "Matches the box score" when every
  player's reconstructed time is within 30 seconds of the box-score minutes, otherwise "Approximate" with the largest
  difference.
- **Assist connections**, one block per team: the five most frequent passer-to-scorer pairs with their baskets and
  points, the team's assisted-basket count, and an honest note of how many recorded assists could be linked to a basket.
- Loading, error (with retry), empty, and not-yet-played states, each isolated so one failing does not hide the other.
- Restrained Motion entrance using the shared presets; accessible text for the timeline.

## Out of scope

- Five-man lineup units, lineup ratings, on-court plus/minus, and anything from `app_lineup_ratings` or `app_player_on_off`.
- Season-level or cross-game connections, and shot locations (the shots table).
- Per-game advanced stats and Four Factors (23d, 23e), and any backend change or new endpoint.
- Changing the existing Game flow, Play-by-play, or Shooting tabs.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` and `checkpointCommits` is
`disabled`. Build the steps in order, running each step's check as you go, then present one review
packet after the last step. No per-step approval pauses and no checkpoint commits; `/complete` makes
the final commit.

## Build steps

- [x] **1. Rotations tab shell.** In `frontend/src/games/GameDetailPage.jsx` add `{ key: "rotations", label: "Rotations" }`
  after Game flow, fetch play-by-play also when this tab is open (extend the existing `enabled` condition), and render a new
  `frontend/src/games/RotationsTab.jsx`. The tab shows an "isn't available until this game is played" message for an
  unplayed game, and the loading and error-with-retry states for the box score and play-by-play queries. Add
  `frontend/e2e/game-rotations.spec.js` with the unplayed and error cases, using `mockGameApi` from the shared fixtures.
  **Done when:** the Rotations tab appears after Game flow, opens without scrolling the page, shows the not-yet-played message for an
  unplayed game and a retry control when play-by-play fails; lint, build, and the browser suite pass.

- [x] **2. Minutes timeline.** Add `frontend/src/games/rotations.js` (pure; rules under Data / contracts) with `computeRotations`,
  and render the timeline in `RotationsTab.jsx`: a row per player with positioned stint bars, a period-boundary axis, a per-row
  accessible label listing the stints, a `title` tooltip on each bar, the reconciliation badge, and the "can't build" message when
  a team does not have exactly five starters. Add mocked-game tests: a normal game with a mid-period swap, a substitution at a
  period start, an overtime, a player who starts and never leaves, and a team without five starters.
  **Done when:** in the mocked tests every bar's start and end match the substitution times, a stint spanning a period boundary is one
  bar, the badge reads "Matches the box score" when minutes agree and "Approximate" with the largest difference when they do not, and
  the no-five-starters case shows its message; for `E2026` games 2, 3, 11, and 13 every player's reconstructed time is within 30 seconds
  of the box-score minutes (report the largest difference found; if any exceeds 30 seconds, stop and revise this spec); lint, build, and
  the browser suite pass.

- [x] **3. Assist connections.** Extend `rotations.js` with `computeConnections` and render the connections block per team in
  `RotationsTab.jsx`: top five pairs (baskets and points), the assisted-basket count, and the linked-assists note. Names link to
  `/:seasonCode/players/:personKey`. Add mocked-game tests for the linking rule, ties, an assist that cannot be linked, and no assists.
  **Done when:** in the mocked tests an assist is linked only when the event immediately before it is a made field goal by a different
  teammate, free throws and other events break the link, ties order as specified, unlinked assists are counted in the note but not in
  any pair, and a team with no linked assists shows its empty text; on `E2026` game 13 the note reports 30 of 34 assists linked; lint,
  build, and the browser suite pass.

- [x] **4. Live check and polish.** With the dev servers running, open `E2026` game 13 in headless Chromium at 1500px and 400px in
  both themes (switch with the real theme toggle), an overtime game if one exists, and an unplayed game; confirm no horizontal page
  scroll, no console errors, and that switching tabs does not scroll the page; fix anything the pass shows.
  **Done when:** screenshots reviewed with no layout break or overflow in either theme; `cd backend && npm run build`,
  `cd frontend && npm run lint`, `npm run build`, and `npm run test:browser` all pass.

## Files / areas

- `frontend/src/games/GameDetailPage.jsx` - tab list, play-by-play query `enabled`, rendering the new tab.
- `frontend/src/games/RotationsTab.jsx` (new) and `frontend/src/games/rotations.js` (new, pure).
- Reused: `gameUtils.js`, `PlayerLink.jsx`, `lib/AsyncState`, `lib/EmptyText`, `lib/PanelHeader`, `lib/Panel`, `lib/motion`.
- `frontend/e2e/game-rotations.spec.js` (new); `frontend/e2e/support/game-fixtures.js` may gain small helpers.
- No backend files change. Existing endpoints used: `.../games/:gameCode/box-score` and `.../play-by-play`.

## Data / contracts

Inputs already exist. Box score rows have `personKey`, `personName`, `side`, `started`/`startedAlt`, and `timePlayed` (seconds,
`number | null`). Play-by-play events (in order, as returned) have `periodNumber`, `markerTime` (`"MM:SS"` time **remaining** in the
period, or `null`), `playType`, `clubCode`, `personCode`, and `playerName`. A play-by-play `personCode` equals the box score's
`personKey` (confirmed for E2026 game 13: every code is in the box score). `localTeam.clubCode` and `roadTeam.clubCode` map clubs to sides.

**Rotations (`computeRotations`)**
- Period length is 600 seconds for periods 1 to 4 and 300 for each later period; elapsed seconds at the start of a period is the
  sum of the earlier lengths; an event's elapsed time is its period start plus `length - remaining`.
- Per team, the starting five are the box-score players of that side with `started ?? startedAlt` true. If that is not exactly five
  players, the team's timeline is not built and shows "Starting lineup isn't available for this game."
- A player's stints: the starters begin at elapsed 0; an `IN` event begins a stint at its elapsed time; an `OUT` event ends the
  current stint; a stint still open at the end of the game ends at the end of the last period seen. A stint continues across period
  boundaries unless an `OUT` ends it. An `IN`/`OUT` without a usable `markerTime`, an `OUT` for a player not on court, or an `IN`
  for a player already on court is skipped and marks the team's result Approximate.
- Rows: players with at least one stint, ordered starters first, then by total reconstructed seconds descending, then by name.
- Reconciliation: for each player compare reconstructed seconds with `timePlayed`; the badge reads "Matches the box score" when every
  player is within 30 seconds, otherwise "Approximate" plus the largest absolute difference in seconds. A player with `timePlayed`
  `null` is ignored in the comparison.

**Connections (`computeConnections`)**
- An `AS` event is **linked** when the event immediately before it (by array order) is a `2FGM` or `3FGM` by the same `clubCode`
  and a different `personCode`. The pair is (passer = `AS` player, scorer = the made shot's player) and is worth 2 or 3 points. Any
  other `AS` is **unlinked**: counted in the note, never in a pair. (On E2026 game 13, 4 of 34 assists follow a free throw instead.)
- Pairs are grouped per team, ordered by baskets descending, then points descending, then passer name, then scorer name; the top five
  are shown. "Assisted baskets" is the number of linked assists against the team's made field goals (`2FGM` plus `3FGM` events),
  shown as `N of M`. The note reads "N of M recorded assists were linked to a basket."
- Names render as text; links use `personKey`.

## Testing

- No unit test command is declared (`AGENTS.md`), so no unit-test gate is added. `rotations.js` is pure and unit-testable later.
- Browser (Playwright, mocked API, `cd frontend && npm run test:browser`): `game-rotations.spec.js` covers the cases listed in steps 1 to 3.
- Live: Chromium on `E2026` games 2, 3, 11, and 13 for the reconciliation numbers, game 13 for the connections note, plus the sizes and
  themes in step 4.
- Checks: `cd backend && npm run build`, `cd frontend && npm run lint`, `npm run build`.
- No `Verify` command is declared, so none was run while writing this spec.

## Notes for the AI

- Follow the existing code style; reuse `Panel`, `PanelHeader`, `EmptyText`, `AsyncState`, `PlayerLink`, and the Motion presets. Theme tokens
  only; inline `style` only for runtime positions and widths of the bars.
- Keep `scroll={false}` on the game tab panel and add no new `TabPanel`.
- The timeline is plain HTML and CSS (positioned bars), not Chart.js: it is a row-per-player layout, and a chart library adds nothing here.
- The tab label "Rotations" and the section headings (ROTATIONS, CONNECTIONS) are new copy for review.
- A limitation to state in the UI, not hide: connections cover assists that sit directly after a made field goal in the feed.
- Commits carry no AI attribution (`AGENTS.md`).

## Added during implementation

Where the build differed from the plan above (behavior as specified unless noted):

- `TeamLabel` moved from `OverviewTab.jsx` to its own `frontend/src/games/TeamLabel.jsx` because the Overview and Rotations tabs both use it.
- The shared test fixtures gained a `boxScoreStatus` option (`frontend/e2e/support/game-fixtures.js`) so a box-score failure can be tested separately from a play-by-play failure.
- The reconciliation badge has a third wording: when the minutes agree but a substitution event could not be placed it reads
  "Approximate · some substitutions couldn't be placed", so it never says "up to 0 s off".
- The "30 of 34 assists linked" check on `E2026` game 13 is shown per team: Dubai 16 of 19 and Barcelona 14 of 15. The recorded assists equal each
  team's box-score assists exactly (19 and 15).

Real-data findings (reconstructed rotations against box-score minutes, using the real `computeRotations` through the dev server):

- All 20 played `E2026` games: every player within 0 seconds, so every team's badge reads "Matches the box score". Games 2, 3, 11, and 13 are among them.
- `E2025`, a sample of 14 regulation games: 12 exact; game 21 is 60 seconds off for both teams (one substitution a minute off in the feed).
- `E2025`, six overtime games: game 86 one team exact (so overtime handling is right) and the other 60 s off; games 87, 168, 173, 221, 239 were 60 to 501 s
  off, from feed timing and in two games missing substitution events (the reconstructed lineup then does not always hold five players). The badge
  says so honestly. The box score's own minutes always sum to exactly five players times the game length.
- Not done: no test asserts animation; the overtime check was visual (game 86) rather than a stored fixture.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":12408,"specSha256":"1aa9d62c53f68c2f043ce075be4455a9e7fbda7e984db2a82658558cd41928e1","branch":"refs/heads/feature/minutes-timeline-and-connections","head":"a124fd0c0aaee351000446f6b56af145a19115b4","baseRef":"refs/heads/master","baseCommit":"a124fd0c0aaee351000446f6b56af145a19115b4","sourceTree":"a329f8be0ebc0c6e0a39fcd15ab9a4466a5c21d4","absentOptional":[]} -->
