# Fix: Compare Trends redesigned, advanced numbers on the Rosters tab, player picker no longer shifts

**Type:** Fix (polish from feedback)
**Status:** verified
**Branch:** master (done from user feedback; not run through `/fix` and `/implement`)

Recorded after the work, on top of parts 1 to 3 of the Compare rework.

## The problem

- The Trends tab was one points-per-round line chart over every round of the season, with a round table: crowded, and the
  rounds said nothing about how the clubs or players were actually playing.
- The team Rosters tab had no advanced numbers, which only the player comparison had.
- On the player comparison, typing in one picker pushed the other picker down, because the open result list stretched the
  grid row that the pickers were bottom-aligned in.

## What changed

- **Team Trends** (`CompareTeamTrends.jsx`): the last five games of each club against its season (record, streak, a strip of
  results, points scored and allowed with the difference from the season average), then five-game averages of points scored and
  allowed, the running point differential with a stronger zero line, and a margin bar for every game (green won, red lost) for
  each club. The x axis is the game number, and a tooltip names the game.
- **Player Trends** (`ComparePlayerTrends.jsx`): five-game averages of points, rebounds, assists and PIR, then PER and Win
  Shares built up round by round from the advanced numbers.
- `TrendCharts.jsx` (`LineTrend`, `MarginTrend`) and `trendMath.js` (rolling and running figures) draw them with no table. The
  old points-per-round section was removed from `ComparisonsPage.jsx` (`TrendChart.jsx` stays: the player Advanced tab uses it).
- **Rosters, advanced** (`CompareRosters.jsx`): "Most impactful players" under the squad facts: each club's five players with the
  most Win Shares, with PER, Win Shares, Win Shares per 40, usage, true shooting and PIE, and a bar for their Win Shares.
- Backend: `GET /seasons/:season/teams/:clubCode/players-advanced?scope=` returns the advanced figures of a club's players after
  the scope's last round (`getClubPlayersAdvanced` in `db/season-advanced.ts`: the club's rows of the round table joined with
  each player's PER and Win Shares).
- **Pickers**: the result list is an overlay under the search box instead of part of the layout, the pickers are top-aligned, and
  a chosen player is shown in a box the same height as the search box.
- **Pickers, then**: clicking into a player search offers the league's top scorers (nine, from the season stats) straight
  away, and typing narrows it to the names that match once the typing pauses (`lib/useDebouncedValue.js`, 250 ms), so typing a
  full name sends one request, not one per key. The Players directory search uses the same hook. The list closes on Escape or
  when focus leaves.
- Spec: unchanged (the Trends tab is not asserted); `compare.spec.js` still covers the sections.

## Verify

- `cd backend && npm run build`; `cd frontend && npm run lint`, `npm run build`; the full browser suite passes.
- `GET /teams/OLY/players-advanced?scope=RS` returns 19 players with PER, Win Shares, usage and shooting.
- Headless run of Olympiacos against Real Madrid (Trends, Rosters) and Milutinov against Vezenkov (Trends), the picker with a
  result list open, and a phone width: no page errors, failed requests or horizontal overflow.

## Known gaps

- The player Trends charts use the regular season's games and rounds of the chosen phase only.
