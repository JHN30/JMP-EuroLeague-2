# Fix: Advanced leaders and main page cards use the 50% games rule instead of minutes

**Type:** Fix
**Status:** verified
**Branch:** fix/advanced-leaders-and-main-page-cards-use-the-50-games-rule-instead-of-minutes

## The problem

`leaders-full-leaderboard-polish` made the Players board rank from a share of the games played (50% by default). Two parts
of Leaders still use minutes instead:

- **Advanced (cards and boards).** `/api/seasons/:season/advanced/leaders` filters by minutes only: `minMinutes`, defaulting
  to 20 early in the season (fewer than 10 rounds) and otherwise 100 (PER, win shares per 40 and the rest), 300 (on/off) or
  500 (RAPM) (`backend/src/routes/seasons.ts`, `LEADER_DEFAULT_MIN_MINUTES`). The board's filter is "Minutes: default
  (20+)" with fixed steps.
- **Players cards and board.** Six stats carry a "10+ minutes a game" volume rule on top of the games rule: assist to
  turnover, assist ratio, turnover ratio, rebound %, offensive rebound % and defensive rebound %
  (`frontend/src/leaders/leaderDefs.js`, `MINUTES`).

The user wants one rule everywhere: a player is ranked from 50% of the games played, with the same 25/50/67/75/90/100%/all
choice on the boards.

## The fix

1. **API: a games share.** `/advanced/leaders` takes `games=25|50|67|75|90|100|all` (default 50) instead of `minMinutes`.
   The games played so far (N) is the most games any player has in the scope's rows; the minimum is N × share rounded up
   (integer fractions, 67% is two thirds), as on the Players board. Rows already carry `gamesPlayed` (PER, win shares,
   round-table rates) or `games` (on/off).
   - **RAPM** has no games count (a whole-season table). Its rows get the player's games from the season statistics
     (scope "all", latest round, joined by person) so the same share applies.
   - The response replaces `minMinutes` / `defaultMinMinutes` with `games` (the share), `minGames` and `gamesPlayed` (N).
     `earlySeason` stays as the small-sample badge.
   - Nothing else changes: the player pages' advanced ranks keep their minutes minimum (a separate place; noted for later).
2. **Advanced cards and board.** The cards ask for the default share; the board's minutes select becomes the games select
   ("Games: 50% · 5+", "Games: 100% · 9", "Games: all players"), `?games=` in the address like the Players board, with
   Reset. The old `minMinutes` parameter is dropped.
3. **Players cards and full boards.** The six stats lose the "10+ minutes a game" volume rule everywhere on Leaders: the
   category cards on the main page and the full board for each stat (no "Ranked among players with 90+ minutes" line any
   more). The games rule already applies to both. Their card footnotes go (the shooting stats keep their attempt rules).

After this fix no minutes rule is left on the Leaders page: Players and Advanced, cards and full boards, all rank from the
same 50% games default.

Must not break: the Advanced board's paging, its fixed-order metrics, the scope (stage) choice, the early-season badge, and
the Players board's games share. No new dependency or table; the RAPM join reads an existing table.

## Build steps

- [x] 1. **API games share.** Done when `/advanced/leaders?metric=per` for 2026-27 returns only players with 5+ games by
   default (N 9), `games=100` only players with 9, `games=all` every player, RAPM rows have games and follow the same share,
   and the backend builds.
- [x] 2. **Frontend.** Advanced cards and board use the share (select, address, Reset); the six Players stats drop the
   minutes rule. Done when the Advanced PER board defaults to "Games: 50% · 5+", the Assist ratio card has no footnote, and
   the Leaders specs pass (updated for `minMinutes`).

## Verify

- `/E2026/leaders?scope=advanced`: cards ranked from 5+ games; open PER: "Games: 50% · 5+", switch to 100% and all players,
  Reset; RAPM and On/off boards follow the same choice.
- `/E2026/leaders`: the Assist ratio and Rebound % cards have no "10+ minutes" footnote.
- Local DB only: `cd backend && npm run build`, then
  `cd frontend && npx playwright test leaders.spec.js leaders-layout.spec.js scroll-in-page-views.spec.js skeleton-loading.spec.js`.

## Implementation notes

- API: every row is read (no minutes floor), N is the most games in the board's rows, and rows with N × share (rounded up)
  stay; `games` other than 25/50/67/75/90/100/all is a 400. RAPM rows get their games from `player_round_stats` at the
  season's latest round ("all" scope) through `getPlayerGames`. `LEADER_DEFAULT_MIN_MINUTES` and the early-season minutes stay
  for the player page's advanced ranks only.
- 2026-27 (9 rounds): PER, RAPM, on/off, usage and win shares per 40 all rank 238 players by default (5+ games), 131 at 100%,
  288 for all players: the same counts as the Players board.
- Frontend: the shares and their labels moved to `leaderDefs.js` (`GAME_SHARES`, `gameShareFrom`, `gamesNeeded`,
  `gameShareLabel`) and both boards use them; `?games=` replaces `?minMinutes=`; the six Players stats lost `volume: MINUTES`.
- The backend dev server stopped during its reload after the first backend edit (nothing on port 3000; `tsc` passed); the
  user restarted it.
- Checks: `/advanced/leaders` by curl (shares above); `leaders`, `leaders-layout`, `scroll-in-page-views`,
  `skeleton-loading` and `api-tv-codes` specs 109/109; a new `leaders.spec.js` test for the Advanced share and the API
  (PER, RAPM, usage at 100%, and a 400 for an unknown share); build and lint.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5595,"specSha256":"5bd1070694876e39ecf3e499909dad375736252a057f3ae5d633b4cab8d6691e","branch":"refs/heads/fix/advanced-leaders-and-main-page-cards-use-the-50-games-rule-instead-of-minutes","head":"b1d3130b60c25791d3d3f5c1a2f57c5a8cd9faa5","baseRef":"refs/heads/master","baseCommit":"b1d3130b60c25791d3d3f5c1a2f57c5a8cd9faa5","sourceTree":"b35f353f246dbf588fadf7ef3628e560feb88e51","absentOptional":[]} -->
