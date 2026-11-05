# Fix: Leaders round-in-progress note

**Type:** Fix
**Status:** verified
**Branch:** fix/leaders-round-in-progress-note

## The problem

On the Leaders page, while a round is still being played (for example round 10 with only a few games done), the Players
view says almost every club "have played fewer than 10 rounds (postponed games)". Nothing was postponed: those clubs just
haven't played their round 10 game yet.

The cause is `useRankingRule` in `frontend/src/leaders/PlayersLeaders.jsx`. It takes the round from the latest standings
(`max(roundNumber)`, which exists as soon as the round's first game is played). It then calls every club with fewer games
than that round "behind", and `BehindNote` always says that is because of a postponed game.

The same round also sets the ranking bar: half the rounds in games, and volume totals over the rounds. While the round is
in progress, that holds most players to a round their club has not played yet.

## The fix

- **Round in progress.** The selected stage's latest standings round `R` is in progress when that round still has a game
  that hasn't been played. To check this, fetch that round's games (`getSeasonGames(season, { phase, round: R })`, the same
  request the Games page and the home page make) and look at `played`. Put this in one small hook in `frontend/src/leaders/`
  that both the page and `useRankingRule` use. React Query shares the request.
- **Header note.** While `R` is in progress, the Leaders page header shows one muted line through `PageHeader`'s existing
  `description` prop, so it is the first thing seen, on every scope (Players, Teams, Advanced), for the selected stage:
  > Round 10 in progress · 3 of 10 games played. Leaders include every game so far and settle once the round is complete.

  The line goes away once every game of the round is played. A stage without standings rounds (the postseason) and a
  finished season never show it. `PageHeader` is not changed.
- **Ranking bar.** While `R` is in progress, `useRankingRule` measures on the last completed round, `R - 1`. That covers
  the minimum games, the volume totals, and the cards' "Needs …" footnotes. If `R - 1` is 0 (round 1 in progress), it
  falls back to the feed's own minimum, as for a stage with no rounds. Once the round is complete, the bar is `R` again,
  as it is today.
- **Postponed note.** `BehindNote` stays for genuinely postponed games only: clubs with fewer games than the bar's round
  (`R - 1` while in progress, otherwise `R`). Its wording does not change.

- **Every game option.** The full board's "Games: 100%" choice drops its "no +" claim while some players already have a
  game more than the completed rounds (a round in progress).

Must not break: the full board's "Ranked among players with …" note, the Teams and Advanced views, finished seasons, and
stages without standings.

## Build steps

- [x] 1. Add the round-in-progress hook. Use it for the Leaders header line and for `useRankingRule`'s bar and `behind` list.
   - **Done when:** a season with a partly played latest round shows the header line with the right counts, and no
     postponed note for clubs that are only waiting on that round. The cards' footnotes use the completed round's totals.
     A season whose latest round is complete shows neither line.

## Verify

- With the local DB, open `/<current season>/leaders` while the latest round is partly played. The header shows
  "Round N in progress · X of Y games played…", there is no "postponed games" line, and the "Needs …" footnotes use
  `N - 1` rounds. Switch to Teams and Advanced: the header line stays.
- Open a finished season's Leaders (for example the previous season). There is no header line and no postponed note.
- Choose a postseason stage. There is no header line.
- Run `cd frontend && npx playwright test leaders.spec.js leaders-layout.spec.js` (after `/api/health` reports
  `"target":"local"`).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3939,"specSha256":"cd2d937ffb5eeb1705510b448feaca683f766bba9788c30a4fccd437adf82fed","branch":"refs/heads/fix/leaders-round-in-progress-note","head":"d5e7a8399010b3558470511521d096d138a88a36","baseRef":"refs/heads/master","baseCommit":"d5e7a8399010b3558470511521d096d138a88a36","sourceTree":"46af3def6c8ee2dfaa51d681abcf8f0146eaf340","absentOptional":[]} -->
