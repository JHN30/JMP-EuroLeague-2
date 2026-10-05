# Fix: Player comparison with an Overview and the advanced numbers

**Type:** Fix (polish from feedback)
**Status:** verified
**Branch:** master (done from user feedback; not run through `/fix` and `/implement`)

Recorded after the work. This is part 3 of the Compare rework (parts 1 and 2: [compare-page-opens-on-the-upcoming-games.md](compare-page-opens-on-the-upcoming-games.md), [compare-teams-overview-and-statistics.md](compare-teams-overview-and-statistics.md)).

## The problem

The player comparison was one long table of stored numbers. It had no advanced figures (PER, Win Shares, per-100, rates), no
sense of where each player stands in the league, and no recent form.

## What changed

- A player comparison now has four sections, like the team comparison: **Overview**, **Statistics**, **Advanced**, **Trends**;
  it opens on the Overview. The way back from an open comparison is "← Players".
- `ComparePlayerOverview.jsx` (Overview):
  - **Profile**: both players' six percentiles (scoring, valuation, rebounding, playmaking, steals, shooting) on one radar
    (`CompareRadar.jsx`), with each player's card and their strongest and weakest axis beside it. The percentiles are among
    the players who meet the phase's games minimum, as on the player page.
  - **Season line**: points, rebounds, assists, steals, blocks, PIR and minutes per game as mirrored bars with each
    player's place among the league ("1st of 222"), or "Under the minimum games".
  - **Recent form**: the last five games of each (result, opponent, points, rebounds and assists) with their averages.
- `ComparePlayerAdvanced.jsx` (Advanced): PER, PIE, game score, Win Shares and per 40, RAPM and on/off net rating; points,
  rebounds, assists, steals, blocks and turnovers per 100 possessions; usage, assist, rebound, steal, block and turnover
  percentages and true and effective shooting. Each row has the better side tinted ("lower is better" for turnovers;
  usage is neutral) and the player's place among everyone with enough minutes. It reads the same stat catalog as the
  advanced Leaders (`leaders/leaderDefs.js`). The scope follows the phase (regular season, otherwise postseason).
- **Statistics** is the earlier full table, with its per game or accumulated switch (shown only there).
- Backend: `GET /seasons/:season/players/:personKey/advanced?extended=true` adds `extended: { values, ranks }` for the
  per-100 and rate figures. `getRoundStatRows` (`db/season-advanced.ts`) reads the league's rows for the scope's last
  round in one query and the ranks are worked out in memory with the same minutes rule as the existing ranks; turnovers per
  100 and turnover % rank lowest first (`rankAmong` takes a `lowerIsBetter` flag). Without `extended` the response is
  unchanged, so the player page pays nothing.
- A **Compare with another player** button on the player page opens the comparison with that player as Player A.
- Specs: `compare.spec.js` gains a player-comparison test; `filter-controls` opens the Statistics section first.

## Verify

- `cd backend && npm run build`; `cd frontend && npm run lint`, `npm run build`; the full browser suite passes.
- `GET /players/003941/advanced?extended=true` returns per-100 and rate values with ranks (turnover % ranked lowest first).
- Headless run of Milutinov against Vezenkov (2025): Overview, Advanced and a phone width show no page errors, failed
  requests or horizontal overflow.

## Known gaps

- Shooting zones and career comparisons between two players are not included.
- The Statistics table and the Trends chart are unchanged and still title the players as "Last, First".
