# Fix: Compare opens on the games of the coming round

**Type:** Fix (polish from feedback)
**Status:** verified
**Branch:** master (done from user feedback; not run through `/fix` and `/implement`)

Recorded after the work. This is part 1 of the Compare rework; the deeper team comparison and the players
comparison are separate passes.

## The problem

Compare started on two empty pickers, so comparing the two clubs of a coming game meant finding both by hand. Once a
comparison was open, the pickers, the type tabs, a verdict strip and a season-series panel sat above the statistics.

## What changed

- `frontend/src/comparisons/CompareFixtures.jsx` (new): the games of the coming round only (the round of the next game
  to play), as compact rows, two to a row, with crests, regular-season records and the date and time (the score for a
  game already played). There are no round or phase controls, and nothing is shown once the season is over. It reads
  the same `games` and `standings` queries as the Games page. Picking a game opens the comparison with the home club as
  Team A and the statistics on the game's phase.
- `GameContext` (same file): the line above an opened comparison, with the way back and, for a comparison opened from a
  game, its round, date, host and a link to the game page. The game is kept in the URL (`game`), and changing a club by
  hand drops it.
- `frontend/src/comparisons/ComparisonsPage.jsx`: with nothing chosen, the Teams and Players tabs, the games panel,
  then "Compare any two teams". Once both sides are chosen the page shows only what the comparison needs: the way back,
  the sections (Comparison, Rosters, Trends) and the statistics phase. The pickers, the type tabs, the verdict strip
  and the season series are gone. The season series and the verdict will return inside the deeper comparison (part 2),
  and the cross-season head-to-head page is a link in the context line.
- `frontend/src/comparisons/CompareRosters.jsx` (new): the Rosters section. A few facts about each squad as mirrored
  bars (players, average age, average height, nationalities, points of the top 3 scorers, players on 15+ minutes),
  then both rosters side by side with each player's games, minutes, points, rebounds, assists and PIR, the biggest
  minutes first, linked to the player pages. It reuses the roster and roster-stats queries of the Team page.
- Animation: the landing and the open comparison fade in; the game rows lift on hover and press; the comparison rows and the roster rows enter one after another with the bars growing; crests and portraits reveal as they load (`RevealImage`). Each section switch replays its entrance.
- Specs: `filter-controls` follows the tabs and opens a player comparison by URL; new `compare.spec.js` covers the
  games, the open comparison, the Rosters section and the way back.

## Verify

- `cd frontend && npm run lint`, `npm run build`; the full browser suite passes (87 tests).
- Headless run of 2026 (round 4, ten games), opening a game, the Rosters section and a phone width: no page errors,
  failed requests or horizontal overflow.

## Known gaps

- The game rows carry no preview figures (ratings, form); the deeper comparison is the next pass.
- A finished season shows no games panel, only the pickers.
- Rosters are compared on the season's per-game numbers of the chosen phase; there is no injury or availability data.
