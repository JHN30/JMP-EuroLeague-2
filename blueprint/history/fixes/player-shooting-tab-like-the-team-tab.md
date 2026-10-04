# Fix: Player page - Shooting tab built like the team Shooting tab

**Type:** Fix (polish)
**Status:** verified (awaiting the owner's review)
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

The player Shooting tab was the older season chart: three dropdowns (Presentation, Game segment, Result) above four
cards and a court. The Result dropdown (all, made, missed) was offered on the zone heatmap, where a made-only zone is
always 100% and means nothing, and the tab had none of the team tab's zone and scoring-style tables or its animations.

## What changed

- `players/PlayerShootingSection.jsx` (new): the team tab's layout over one player's shots (picked out of each game's shot
  list by `personCode`): tabs for Zone heatmap / Every attempt, the Made / Missed result tabs only on Every attempt, a
  Game segment select; four cards (field goals, two-pointers, three-pointers, effective FG% with points per shot); the
  court; a zone table ("Where the shots come from", with hottest and coldest zone badges) and a "How Abalde scores" table
  (fast break, second chance, off turnovers, half court). Changing a filter replays the court's animation and animates
  the card values and table bars, as on the team tab.
- Shared code, so both tabs stay the same: `lib/ShootingBreakdown.jsx` (the cards, the court beside the two tables, and
  the tables), `lib/shootingData.js` (shot result, the "made-attempted (percent)" line, the view tabs and `useSeasonShots`)
  and `lib/shotBreakdown.js` (moved from `teams/teamShooting.js`: zone rows, hottest and coldest zone, situation rows).
  `teams/TeamShootingSection.jsx` now uses them with unchanged behaviour. `lib/playerName.js` gains `titleCase` for
  "Where Abalde shoots".
- `players/PlayerPage.jsx` waits for the game log and hands over to the new section; the old `lib/SeasonShootingChart.jsx`
  is deleted (nothing else used it).

## Verify

- `eslint`, `vite build` pass; the full browser suite passes (85 tests).
- Headless Chromium: Abalde (36 games mapped, 133 attempts: 63-133 field goals, 30-66 twos, 33-67 threes, 59.8% eFG):
  no Made tab on the heatmap, the tab appears on Every attempt and Made cuts the plot to 63 attempts, and a game
  segment (First half) cuts it to 34. The team tab (Partizan) still has its side tabs and both titles.

## Known gaps

- A player's shots are read from every game's shot list (about 40 requests for a full season, cached per game).
- The feed marks only scoring shots as fast break, second chance or off turnover, so there is no shooting percentage
  per situation (same as the team tab).
