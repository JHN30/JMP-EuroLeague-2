# Fix: Format becomes Postseason, with a real bracket

**Type:** Fix (polish from feedback)
**Status:** verified
**Branch:** master (done from user feedback; not run through `/fix` and `/implement`)

Recorded after the work.

## The problem

The Format page was a progression row, a round-by-round bar chart of games and a regular-season table, followed by series
cards. The chart and the table said nothing about the postseason, the name did not say what the page was about, and before the
postseason started there was nothing to look at.

## What changed

- **Renamed**: the nav label, page title and route are now Postseason (`/:season/postseason`); `/:season/playoffs` redirects to it.
  `frontend/src/postseason/` replaces `frontend/src/playoffs/PlayoffsPage.jsx`, and the bar chart, the standings table and the
  progression row are gone (so are the helpers only they used in `lib/phaseSummary.js`).
- **Status**: a banner says where the season is ("Round 4 of 38: the bracket is a projection", "The Playoffs are on", "X are the
  champions") with four steps (regular season, Play-In, Playoffs, Final Four) that show done, under way or waiting and the real dates.
- **The bracket** (`Bracket.jsx`, `Matchup.jsx`): Play-In, Playoffs, Final Four and Final as columns joined by lines, each
  matchup with its two sides, their regular-season places and the score (wins in the best-of-five Playoffs, points in a single
  game, the winner highlighted). Hovering or focusing a club dims every matchup it is not in. A season with a third-place game
  shows it under the final. On a phone the stages stack.
- **`bracketModel.js`**: builds the bracket from the regular-season standings and the recorded series. Structure: Play-In 7 v 8,
  9 v 10 and the loser of 7 v 8 against the winner of 9 v 10; Playoffs 1 v 8, 2 v 7, 3 v 6, 4 v 5; semifinals (1 v 8 winner against
  4 v 5 winner, 2 v 7 winner against 3 v 6 winner), final, and a third-place game where the data has one. A matchup that has not been
  played is filled from the seeds and the earlier winners, or shows a placeholder ("Winner of 7 v 8"). While the regular season is
  on and nothing is recorded, the matchups from the standings are dashed and marked Projected.
- **Matchup detail** (`MatchupDetail.jsx`): selecting a matchup lists its games (date, score, link to the game); one not played yet
  offers a link into the Compare page for the two clubs.
- **Race for the bracket** (`RacePanel.jsx`, `raceStatus`): while the regular season is on, the table around the lines (top six to the
  Playoffs, seventh to tenth to the Play-In) with games left and a status: in the Playoffs, Play-In or better, Play-In race, in the
  race. Every club that can still get a place is listed (early in the season, all of them); a club drops off once it is out, and the
  clubs that are out are named underneath. A club is only called in or out when no tiebreaker could change it (from wins and games
  left).
- **Finished seasons** (`ChampionPanel.jsx`): the champion and how every other club finished (runner-up, third and fourth or the
  Final Four, Playoffs exits, Play-In exits).
- A short "How the postseason works" explains the structure. No backend change: the page uses the standings, the postseason series,
  the teams, the rounds and the regular-season games still to play.
- Spec: new `postseason.spec.js` (a finished season, a projected one, a season with a third-place game and one with 18 clubs).

## Verify

- `cd frontend && npm run lint`, `npm run build`; the full browser suite passes.
- The model was run on real data in four states (nothing played after the regular season, Play-In played, Playoffs half played with
  one series live, complete) and its clinch logic on a small invented table.
- Headless runs of 2023, 2024, 2025 and 2026 at desktop width and 2026 at phone width: no page errors, failed requests or
  horizontal overflow.

## Known gaps

- Seeding follows the standings' own order; a tie during the season can swap two clubs.
- The race panel counts wins and games left only, so it is slow to call a club in or out.
- The Home and Overview pages still describe the postseason in their own way (not changed).
