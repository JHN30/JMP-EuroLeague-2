# Fix: Game of the round in time order, fixed per round

**Type:** Fix
**Status:** verified
**Branch:** fix/game-of-the-round-for-every-round-in-time-order

## The problem

Home's Upcoming games panel (`frontend/src/dashboard/UpcomingGames.jsx`, `gameOfTheRound.js`, `MatchCard` in
`RecentResults.jsx`) has three problems with its "Game of the round" card:

- **It always comes first.** `UpcomingGames` moves the featured game to the front, so the list is no longer in
  tip-off order.
- **Only one round gets a pick.** The list (up to 10 scheduled games) often covers the end of one round and the
  start of the next. For example, on 13 Nov it showed the last 3 games of round 11 and 7 of round 12. Only the first
  round gets a pick, chosen from its few leftover games, and the next round gets none.
- **The header is cramped.** The featured card replaces its round label with "GAME OF THE ROUND", which leaves
  almost no gap before the time chip and hides which round the game belongs to.

## The fix

Decisions made in chat:
- **Game of the round, not of the day.** At first this was one pick per round shown; after review it became one pick
  for the current round only, fixed for the whole round.
- **Round label stays in the header**, and the badge moves below the teams.

- **Picks** (revised after review: current round only, fixed for the round). `gameOfTheRound.js` picks one game for the
  current round, which is the first upcoming game's round, and only in the regular season (`phaseCode` "RS"). The
  postseason gets its own treatment later.
  - The pick is chosen once from all the round's games, played or not, fetched with
    `/games?phase=RS&round=N`. It uses each club's record before the round (the table's record minus its result in
    the round), so the pick holds for the whole round.
  - The rule is unchanged: most combined wins, then the smallest gap in wins, then the earliest tip-off, among games
    whose clubs had both played.
  - Later rounds in the list get no pick until the current round is finished. If the pick has already been played,
    no upcoming card is highlighted.
  - The reason line shows the table as it stands, like the cards' records. For a game still to play, this equals the
    pre-round record.
  - The second standings request for the next stage's table and its format check are removed. The picks read the
    regular-season standings the panel already loads.
- **Order:** `UpcomingGames` keeps the API's tip-off order. The featured games stay where they fall.
- **Card:**
  - The featured card shows its round label ("Round 12") in the header like every other card.
  - Under the teams, the reason line becomes "★ Game of the round · 1st vs 4th · 8-2 vs 7-3". The badge part is
    in the primary colour and bold; the star is hidden from screen readers.
  - The card keeps its primary border and tint.
  - The `match-card-featured-label` style is removed if nothing else uses it.
- **Time chip:** slightly smaller (`0.64rem` to `0.6rem`) on upcoming cards only, so all upcoming cards still match.
  Latest scores' "Final" chips stay as they are, because `MatchCard` is shared and the change is scoped to Upcoming
  games through the `upcoming` class.
- **Comments:** update the comments that say the featured card is first (`UpcomingGames.jsx`, `index.css`,
  `RecentResults.jsx`).
- No backend change and no new dependency.
- **Must not break:**
  - Latest scores cards.
  - The phone layout: five cards, then "Show N more".
  - The `game-of-the-round` test id (now on each featured card).
  - No pick outside the regular season.

## Build steps

1. [x] **Picks per round, in time order, with the badge below** (`gameOfTheRound.js`, `UpcomingGames.jsx`,
   `RecentResults.jsx`, `index.css`).
   - Done when the panel lists games in tip-off order with each listed round's pick highlighted where it falls.
   - Each featured header shows its round label and time chip, and the badge line is under the teams.
   - Upcoming time chips are 0.6rem while Latest scores' chips are unchanged, and lint and build pass.
   - As built: "★ Game of the round" and the reason are two lines, because on one line the reason wrapped
     mid-phrase ("8-2 / vs 7-3"). A screen-reader-only colon joins them: "Game of the round: 1st vs 4th · 8-2 vs 7-3".
2. [x] **Browser specs.**
   - Update `home-form-chart.spec.js`: the current round's game with the most combined pre-round wins is the only pick
     (none when it is already played), and the cards are in tip-off order. The featured card is no longer asserted to be first.
   - Update the `home-layout.spec.js` comment.
   - Done when those specs pass on the local DB.

## Verify

- `cd frontend && npm run lint && npm run build` pass.
- With `/api/health` reporting `"target":"local"`, run
  `npx playwright test home-form-chart.spec.js home-layout.spec.js`, plus `responsive.spec.js` for the layout change.
- On Home with the live season:
  - The upcoming cards read in date and time order.
  - Only the current round's pick is highlighted, in place, with "Round N" in the header.
  - The badge line sits under the teams.
  - The time chips are a little smaller on upcoming cards only.
- Check at 390px and 1280px, in both themes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5321,"specSha256":"9eaeeb4ab08d01768d2e472c8a4a43e6313527a91c4625c2eccdf45663d58830","branch":"refs/heads/fix/game-of-the-round-for-every-round-in-time-order","head":"103aece16836262f670a85c437a204b13426ad97","baseRef":"refs/heads/master","baseCommit":"103aece16836262f670a85c437a204b13426ad97","sourceTree":"9e3945bec559a73a3fb2f50bfb18fd80f29f42c1","absentOptional":[]} -->
