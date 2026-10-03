# Fix: Team Advanced tab - ratings chart, split cards, game flow and lineup cards

**Type:** Fix (polish)
**Status:** verified (awaiting the owner's review)
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

The Advanced tab was a trend line with a five-metric dropdown that said little (three points
early in a season), a plain splits table, a wall of fourteen text tiles, a shot-zone table that
still used the feed's old A-J zones (the rest of the app uses the 14 zones), and a lineup table
with no faces that showed nothing early in the season because its default minimum is 100
possessions.

## What changed

- `teams/TeamAdvancedSection.jsx` (rewritten) and `teams/RatingsChart.jsx` (new):
  - **Ratings:** one chart with the offensive and defensive rating as two lines through the
    rounds; the gap between them is the net rating, shaded green where the offense is ahead and
    red where it is behind. The metric dropdown (net, offense, defense, SRS, adjusted net) is
    gone, and the shared table under the old chart with it.
  - **Splits:** four cards (Home, Away, Last 5, Last 10) with the record, the net rating on one
    shared diverging bar, and offense, defense, margin and pace.
  - **Game flow:** a stacked bar for time leading, tied and trailing, a clutch points bar (both
    halves share one structure of big numbers, bar and caption, so the bars sit on the same
    line; they stack on a phone), and
    one slim row of the remaining numbers (lead changes, ties, largest lead, longest run, runs
    of 6+, assisted FG%, possessions, possession length). Fast-break, second-chance and
    off-turnover points are dropped because the Shooting tab's "How X scores" panel covers them.
  - **Shot zones:** the old A-J card is removed. A slim panel points to the Shooting tab (the
    14 zones, the court map and the opponents' view) with an "Open Shooting" button
    (`onOpenShooting` from `TeamPage.jsx`). The advanced endpoint still returns the A-J rows;
    nothing reads them.
  - **Lineups:** each lineup is a row with the five players' headshots (matched by person key
    from the club's regular-season stats), the surnames, a wide net-rating bar, ORtg, DRtg,
    possessions, minutes and games, with "Best net rating" and "Most used" badges. Size is a
    tab (5-man, 3-man, 2-man). The minimum is "Auto (100, else 50)" or a fixed 50, 100, 200 or
    300 (25 was removed).
- **Lineup minimum, worked out from data.** Bisecting the busiest lineup of every club:
  - 5-man: this season so far the median club's busiest lineup gets 8.7 possessions a game
    (100 after about 11 games, 50 after about 6), but over last season's 38 games it was 4.1 a
    game, so 100 took a median of about 24 games and 6 of 20 clubs never reached it.
  - 3-man: 18 to 23 possessions a game in both seasons, so 100 arrives after about 4 to 6 games.
  - So 100 stays the target, and only where no lineup of that size has reached 100 does Auto
    use 50, with a visible note that says so. When nothing reaches 50 either, an empty message
    says that 5-man lineups usually need a dozen games or more and suggests 3-man or 2-man.
- `teams/teamRosterStats.js` (new): `fetchTeamRosterStats`, moved out of `TeamPage.jsx` so the
  Advanced tab can reuse the Overview and Roster query for the photos.
- Shooting tab (earlier in the same session, recorded in its own file): the court and panels
  now animate when an option changes.

## Verify

- `eslint` (whole frontend) and `vite build` pass.
- Headless Chromium against the running app, dark and light, 1860px and 420px (no horizontal
  overflow): Partizan this season (5-man shows the empty message, 3-man and 2-man fall back to
  50+ with the note, 200+ shows the empty message) and Monaco in E2025 (38 rounds on the chart,
  red then green shading, four 100+ five-man lineups, 20 of 20 headshots loaded). The "Open
  Shooting" button opens the Shooting tab. No console errors.

## Known gaps

- The Advanced tab still hides the phase tabs and uses its own Regular season / All games /
  Postseason scope, unlike the other tabs.
- Ratings are cumulative, so the lines flatten as the season goes on; the early rounds carry the
  movement.
- Lineup photos come from regular-season stats, so a player who has only played in the
  postseason for the club shows initials.
