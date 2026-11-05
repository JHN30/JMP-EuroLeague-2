# Fix: Postseason next games, seed moves and holders

**Type:** Fix
**Status:** verified
**Branch:** fix/postseason-next-games-seed-moves-and-holders

The second half of the postseason ideas approved on 2026-10-24. The first half (one header, a matchup open by default,
format cards) is merged as `b610bc9`.

## The problem

On `/:season/postseason` (`frontend/src/postseason/`), during the regular season (2026-27, Round 10) the page projects a
bracket and shows the race tables. Three things it could show are missing:

- **What comes next.** Nothing says which of the next round's games decide the projected bracket. A reader has to cross the
  race tables with the Games page.
- **Movement.** The projected seeds give no sense of direction: a club that climbed from 9th to 6th last round looks the same
  as one that has sat 6th all season.
- **Empty space above the Final.** On a wide screen the Final column has an empty area of about two rows above the Final
  card, in every season that has the four-column (Play-In) or three-column (direct top eight) bracket.

## The fix

All changes stay in `frontend/src/postseason/` and its tests. The new data comes from existing endpoints with existing
query patterns: `getSeasonGames`, and `getSeasonStandings` with `{ round }`. There are no backend or API changes.

1. **"Games that move the bracket" (regular season only).**
   - `fetchRemaining` in `PostseasonPage.jsx` already pages through every scheduled regular-season game. It also returns
     the next round's games (those with `roundNumber === nextRound`): game code, date and the two clubs.
   - A game moves the bracket when both clubs sit within two places of a qualification line, from `bracketSeeds(tiers)`:
     - the line after `directSeeds` (6th/7th in Play-In seasons, 8th/9th in direct-eight seasons);
     - the line after `playInLast` (10th/11th), when it differs.

     So a club counts for a line at L when it is in places L-1 to L+2. Clubs the race marks as `out` do not count.
   - A new panel, `NextGamesPanel.jsx`, sits just above "Race for the bracket", with the compact heading
     "NEXT ROUND · Round N" / "Games that move the bracket".
   - It lists at most four games, closest to a line first. Each row shows:
     - the date;
     - the home and road club, each with its current place, crest and short name;
     - a badge naming the line: "Playoff line", "Play-In line", or "Both lines" when the two clubs straddle different
       lines.
   - Each row opens Compare for the two clubs and that game, the same link the matchup detail uses for an unplayed game.
   - The panel shows only where the race panel shows (a regular season under way, not grouped and not elimination), and
     only when at least one game qualifies.
2. **Seed moves on the projected bracket.**
   - While the bracket is projected, the page loads the regular-season standings of the round before the latest one
     (`nextRound - 2`, when that is at least 1).
   - In each projected matchup, a club that moved shows a small arrow after its seed: "▲2" in green or "▼1" in red. A
     club that didn't move shows nothing.
   - Screen readers get "up 2 places since Round 8" (or "down 1 place …").
   - `PostseasonPage` passes a `moves` map (club → places gained) through `Bracket` to `Matchup`. Only the postseason
     uses these two components.
   - Nothing shows when the earlier standings fail to load or the bracket is not projected.
3. **The holders in the Final column.**
   - On the Play-In and direct-eight brackets, from 1024px a small card fills the empty top of the Final column. It
     shows "HOLDERS · 2024-25", the previous season's champion's crest and name, and "Won the 2024-25 final", linking to
     that season's postseason page.
   - The champion comes from the previous season's Final Four games (`getSeasonGames(prev, { phase: "FF" })`), using the
     same rule the Overview uses: the played game whose label `isChampionshipLabel` accepts, and its winner.
   - The card is hidden below 1024px, where the bracket stacks and there is no gap to fill, and when no champion is found
     (2020-21 follows the cancelled 2019-20).
   - It sits in the Final column's first bracket row, above the centred Final card, so the bracket lines are unchanged.

Must not break:
- the bracket layout and its connecting lines at every width;
- the default matchup and the club focus;
- the race tables;
- grouped (2004, 2012) and elimination (2000) seasons, which get none of the three additions;
- no sideways page scroll.

## Build steps

- [x] **Games that move the bracket.** Make change 1. In `postseason.spec.js` or `postseason-layout.spec.js`, add a test
  for 2026: the panel shows above the race with one to four games. Each game's two clubs must be within two places of a
  line in the race tables, and each row links to Compare.

  *Done when:* 2026-27 shows the panel with the next round's qualifying games, and 2025-26 (finished) shows no panel.
- [x] **Seed moves and holders.** Make changes 2 and 3. Add tests:
  - 2026: at least one projected seed shows an arrow whose sr text names the round;
  - 2026 at 1440px: the holders card names 2025-26's champion (Olympiacos Piraeus) and links to `/2025/postseason`;
  - 2026 at 390px: the holders card is hidden;
  - 2004: there is no holders card.

  *Done when:* the arrows match the change in places between the two rounds' standings, the holders card fills the space
  above the Final without moving it, and the existing postseason specs still pass.

## Verify

- Open `/2026/postseason` at 1440px:
  - the header and bracket show as before, with ▲/▼ arrows on the seeds that moved last round;
  - the top of the Final column shows "HOLDERS · 2025-26" with Olympiacos;
  - above the race tables, "Games that move the bracket" lists the next round's games between clubs near the 6th and
    10th lines.
- Open `/2025/postseason`: no arrows and no next-games panel. The holders card shows the 2024-25 champion.
- Open `/2004/postseason` and `/2000/postseason`: unchanged.
- With `/api/health` reporting `"target":"local"`:
  `cd frontend && npx playwright test postseason.spec.js postseason-layout.spec.js postseason-clinch.spec.js grouped-postseason.spec.js`

## Result

- `bracketMovers` lives in `bracketModel.js`, beside `raceStatus`: the React fast-refresh lint rule keeps component
  files to components.
- 2026-27 at 1440px (next round 10, so the moves are since Round 8):
  - Seven seed arrows, for example Crvena Zvezda ▲4 and Real Madrid ▼3.
  - The holders card shows "HOLDERS · 2025-26, Olympiacos Piraeus" above the Final, which has not moved.
  - Two games move the bracket: 11th Besiktas v 10th Zalgiris (Play-In line), and 5th Hapoel TLV v 7th FC Barcelona
    (Playoff line).
- 2025-26 shows the 2024-25 holders (Fenerbahce Beko Istanbul), with no arrows and no next-games panel.
- 2004 shows none of the three.
- At 390px the holders card is hidden, and there is no sideways scroll. No page errors.
- Tests: two new tests in `postseason-layout.spec.js`. All passed: 30 in `postseason.spec.js`,
  `postseason-layout.spec.js`, `postseason-clinch.spec.js` and `grouped-postseason.spec.js`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7201,"specSha256":"ca08befb3afe0fd96beea07a750623bd3b5fcc2790d44b8160ba9a7d390eb883","branch":"refs/heads/fix/postseason-next-games-seed-moves-and-holders","head":"b610bc91b0e7c7c5827a26d3c4e7e11e741cf9f9","baseRef":"refs/heads/master","baseCommit":"b610bc91b0e7c7c5827a26d3c4e7e11e741cf9f9","sourceTree":"eb0bb21db5e51211d66fed6fcc489d09beeb37b1","absentOptional":[]} -->
