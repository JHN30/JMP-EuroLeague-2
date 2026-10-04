# Fix: Player page - Games tab with a game-by-game chart, splits and a fuller box-score table

**Type:** Fix (polish)
**Status:** verified (awaiting the owner's review)
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

The tab was one table of every game: opponent name, round, date, minutes, and six numbers. No crests, no sense of how the
games had gone or whether they were home or away, no result, no shooting lines, and no way to find the best games.

## What changed

- `players/gameLog.js` (new): the game log from the player's side (opponent, home or away, club-first score, win or loss,
  the box-score numbers as numbers), averages, season highs and the filter and sort lists.
- `players/PlayerGamesSection.jsx` (new, replaces `GameLogSection`):
  - **Phase tabs** (All games, Regular Season, Playoffs, Final Four) when the player has games in more than one phase.
  - **Game by game chart:** one bar per game, oldest to newest, as tall as the chosen stat (PTS, REB, AST, PIR or MIN),
    green for a win of the player's team and red for a loss, the value above it, the opponent's crest and a house or plane
    (home or away) below it, a dashed line at the average, and a ring on the best game. It opens on the latest games, the
    bars grow in, and each bar opens the game. The header shows the team record and the average.
  - **Splits:** at home, away, in wins and in losses: games, points, rebounds, assists and PIR, each with how far it is from
    the all-games average.
  - **Box scores:** every game with the crest, vs or @ and the venue icon, the round and date, a W or L badge with the score
    (player's team first), minutes, points and PIR with comparison bars, rebounds, assists, steals, turnovers, the 2P, 3P
    and FT lines, and plus-minus; filters (All, Wins, Losses, Home, Away), a sort (newest, oldest, most points, best
    valuation), the first 12 games with "Show all", and season highs in points, rebounds, assists and PIR in colour.
- `players/PlayerPage.jsx` drops the old table and its helpers.

## Verify

- `eslint`, `vite build` pass; the full browser suite passes (85 tests).
- Headless Chromium, dark and light at 1500px and 420px, no overflow: Abalde (42 games across three phases, 26-16 team record
  with him): the Playoffs tab shows 4 games, Wins shows 19, the stat tabs change the chart, and the 12-row limit and "Show
  all 42" work. Found while checking: the chart and table both keyed on the phase (a duplicate-key warning), and on a
  phone the sticky opponent column took most of the width, so it is narrower there.

## Known gaps

- The splits are worked out from the game log on the page (simple averages over the games shown).
- The log lists only games the player played in; games they missed are not shown.
