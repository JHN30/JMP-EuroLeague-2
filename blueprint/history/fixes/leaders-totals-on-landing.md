# Fix: Leaders totals on the landing

**Type:** Fix
**Status:** verified
**Branch:** fix/leaders-totals-on-landing

## The problem

The Leaders tab's full boards for Players and Teams already have a Per game / Totals select (`?mode=accumulated`), but the
landing category cards are hard-coded to per game, so totals can't be seen without opening a board. The Advanced tab has no
totals and stays as it is.

## The fix

- Add a Per game / Totals select to the Players and Teams landings, using the same `mode` URL param and labels as the boards, so
  the choice carries into a card's full board and back.
- Players cards: request `mode` from `getLeaderStats` (and add it to the query key); pass `mode` to `hasVolume` and
  `formatPlayerValue`. In Totals the Players cards drop PIR, TS%, 3P% and assist-to-turnover (`PLAYER_TOTAL_CARDS`); both modes gain 2PM, 3PM, FTM, OREB, DREB, turnovers and fouls committed (the last two list the most, `showMost`, and open their board highest first). Adds a 2-pointers made stat.
- Teams cards: pass `mode` to `stat.get` and `formatTeamValue`; only `kind: "count"` stats change.
- Players' "Hot right now / who has moved" form section stays per game (it is a per-game feature).
- From sm up the mode is a tab strip (`ModeTabs` in `LeaderParts.jsx`), on a phone a select (`ModeSelect`), on the landings and the full boards.
- The Players landing is grouped by family; the Teams landing mirrors it (`TEAM_SECTIONS` in `teamData.js`: scoring, playmaking, rebounding, defense, then record and efficiency) with attempts, assist-to-turnover and fouls drawn added. The comparison page keeps its own grouping.
- The Advanced landing gets the same sectioned layout (no totals there), plus offensive and defensive rebound % (two published columns added to the leaders metric list in `season-advanced.ts`), nine calculated per-100 stats (2PM/2PA, 3PM/3PA, FTM/FTA, offensive and defensive rebounds, fouls), offensive and defensive Win Shares, and on Teams the free throw rate, opponents' turnover % and opponents' free throw rate. Shared components (`LeaderParts.jsx`) stay unchanged unless unavoidable.

## Build steps

1. [x] Add the landing select and thread `mode` through the Players and Teams cards. Done when switching to Totals shows season
   totals (whole numbers) on the count cards, percent cards are unchanged, opening a card lands on its board in Totals, and
   the Advanced tab is unchanged.

## Verify

- Leaders > Players: switch to Totals; Points shows season totals, 3-point % is unchanged; click Points and the board is in Totals.
- Same on Leaders > Teams.
- Per game (default) looks exactly as before; Advanced has no mode select.
- `cd frontend && npm run lint`; browser specs `leaders.spec.js leaders-layout.spec.js` (health must report `"target":"local"`).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2808,"specSha256":"57b20c26bbdb9a21335772578a076c03b75e2965db84dd2a21df68805a8e5a13","branch":"refs/heads/fix/leaders-totals-on-landing","head":"8845045f0a1a9ad75ed1171264b6183d92a64640","baseRef":"refs/heads/master","baseCommit":"8845045f0a1a9ad75ed1171264b6183d92a64640","sourceTree":"c2a51954df7f615de8c223f3deb9a43da1208630","absentOptional":[]} -->
