# Fix: Standings race tab ran to round 38 and its table and cards were empty

**Type:** Fix
**Status:** verified
**Branch:** master

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## The problem

- The race chart went to round 38 in E2026, where only 2 rounds are played.
- The standings table beside it never showed movement, and the four insight cards were
  blank.
- Biggest climber showed +11 or +15: it measured the first round against the latest.
- The table did not follow the race, and there was no 0-0 starting point.

**Cause:** the rounds list comes from the schedule (`app_rounds`), so it holds every
scheduled round. Unplayed rounds return empty standings, so everything that read "the
last round" (chart axis, table, cards) read round 38 and found nothing.

## The fix

- `RaceView` now takes the latest round with standings and only uses played rounds
  that have a non-empty snapshot. `StandingsPage` passes `latestRound`, and keys the
  view by season and phase.
- **The table follows the race:** step 0 is the season start (everyone 0-0, in name
  order, no positions). After that it shows that round's real position, W-L, and
  movement against the previous round, and rows slide into their new order. It opens
  on the latest round.
- **The cards follow the round:** leader, most consistent, and time in contention use
  the rounds up to the selected one. Biggest climber is the biggest jump in that round
  alone (the same number as the Move column), ties broken by the higher position.
- **Playback:** a controlled slider from 0 to the last round, a play button that steps
  one round at a time, and a slider that also shows for reduced-motion users.
- **The chart was rebuilt as SVG with Motion** (`RaceChart.jsx`; the Chart.js canvas
  redrew from scratch on every step, so crests could not glide). One line per club, the
  club's crest at the line's end, lines revealed left to right while the crest slides
  along them, a fixed x axis over the played rounds, one empty row above first and
  below last place, hover title and click-to-focus, dimming of the other clubs.
- The footer note about historical snapshots was removed.
- New shared hook `lib/useElementWidth.js`.

## Verify

- E2026 (2 rounds) and E2025 (38 rounds) in headless Chromium: axis, table, cards, and
  crests correct at the start, a middle round, and the latest round; climber shows
  +1 at round 38, +3 at round 12, and +8 at round 2 for E2025.
- `eslint` and `vite build` pass. Playwright 8 of 9 (same pre-existing failure).

## Known gaps

- The x axis covers every played round from the start, so the early part of a replay
  has a lot of empty space on the right.
- When several clubs sit close together their crests overlap.
