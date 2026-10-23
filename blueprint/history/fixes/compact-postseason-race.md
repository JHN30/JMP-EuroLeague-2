# Fix: Compact postseason race

**Type:** Fix
**Status:** verified
**Branch:** fix/compact-postseason-race

## The problem

The "Race for the bracket" panel on `/:season/postseason` (`frontend/src/postseason/RacePanel.jsx`) is one long table
that takes about 900px of a 2,200px page and still leaves most of the panel empty.

- The table is capped at `max-w-3xl` inside a full-width panel, so the right ~40% of the panel is blank at desktop width.
- Every club that can still get a place gets a row: 20 rows in a 20-club league for most of the season.
- The Status column is the same for every club until late in the season (all 20 read "In the race" at round 7 of 38
  in 2026-27), so it adds width without information.
- The Left column barely varies (31 or 32 for everyone at round 7).

## The fix

Replace the single table with **one column per zone**, side by side from `lg`, stacked below it:

| Zone | Clubs | Margin is measured against |
|---|---|---|
| Playoffs | positions 1 to `directSeeds` | the club at `directSeeds + 1` |
| Play-In | `directSeeds + 1` to `playInLast` (only when `playInLast > directSeeds`) | the club at `playInLast + 1` |
| Chasing | the rest of the clubs still in the race | the club at `playInLast` |

- Seasons without a Play-In (`E2016`-`E2018`, `E2020`, `E2022`) show two zones, Playoffs and Chasing, and never the
  words "Play-In" (the existing `historical-direct-eight` assertion).
- Each zone has a short heading with its positions ("Playoffs · 1-6") and its own small table: position, crest and
  name, W-L, and the margin. The margin column header names its reference ("vs 7th").
- **Margin** is whole wins ahead of the reference club, `W - refW`, shown as `+2 W`, `-3 W` or `Level` (no half
  games: EuroLeague ranks by wins, and fans count wins). When the two clubs have played a different number of games, a
  small muted note under it says `1 game in hand` when the club has played fewer. Each zone names its reference club
  once under its heading ("Against 10th: Virtus Bologna (4-2).") and, only when that club has played fewer games than
  some rows, adds one sentence ("Virtus Bologna has 1 game in hand on 9 of them.") instead of repeating it per row.
  Screen readers hear "wins" for `W`. Reference clubs come from the full standings (out clubs
  included), so the reference always exists. Position stays the standings' own order; the margin never re-sorts or
  re-ranks clubs.
- **Status badges only when they say something:** a club whose status is not `alive` keeps its existing badge
  (In the Playoffs, Play-In or better, Play-In race, with the same short labels below `sm`). "In the race" is no
  longer shown. When no club has a badge, one line says that no club has clinched a place or been knocked out yet.
- The **Left** column goes. The intro states the range instead ("31 to 32 games left per club", or one number when
  they are equal).
- The intro's line rule and tiebreaker note stay, including "Top N: straight to the Playoffs" and the
  "(stillIn of total)" count. The "Out of the race (n): ..." line under the zones stays.
- The margin is a small pure helper in `bracketModel.js` next to `raceStatus`; `raceStatus` itself is unchanged.

Must not break:

- The race still shows only while the regular season is on, and never for grouped, elimination or cancelled seasons,
  or when regular-season data is incomplete (the existing unavailable note).
- No horizontal page scroll at 320, 390, 768, 1024 and 1440px; long club names wrap below `sm` as they do now.
- Light and dark themes use theme tokens only; the zone tables keep readable headers for screen readers.

Accepted trade-offs:

- The per-club Left column goes; the games-in-hand note shows the difference that matters, and the intro gives the
  range.

## Build steps

- [x] 1. **Zone layout and margins** - add the margin helper to `bracketModel.js` and rebuild `RacePanel.jsx` as zone
   columns with margins, conditional badges and the games-left range.
   Done when: on `/2026/postseason` at 1440px the race shows three columns (Playoffs 1-6, Play-In 7-10, Chasing
   11-20) with margins, no "In the race" badges, and a panel clearly shorter than the old ~900px; at 390px the zones
   stack with no sideways scroll.
- [x] 2. **Browser specs** - `postseason-layout.spec.js` checks every race table for sideways scroll (it currently locates a
   single `table`, which now matches several); `postseason.spec.js` asserts the three zone headings on `/2026`;
   `historical-direct-eight.spec.js` asserts two zones and no Play-In zone on the mocked in-progress `/2016`.
   Done when: those specs pass.
- [x] 3. **Wins margin** - replace the half-game margin with whole wins and the games-in-hand note (user review: the
   decimals read as confusing). `postseason.spec.js` asserts a margin cell reads `Level` or `+n W`/`-n W`.
   Done when: no decimal margins remain on `/2026/postseason`; with standings mocked so 6th, 10th and 12th are a game
   short, 6th reads `Level` with `1 game in hand`, the Chasing zone tells 10th's games in hand once, nothing scrolls
   sideways at 320px, and the specs pass.

## Verify

- `cd frontend && npm run lint` and `npm run build` pass.
- With `/api/health` reporting `"target":"local"`:
  `cd frontend && npx playwright test postseason.spec.js postseason-layout.spec.js historical-direct-eight.spec.js responsive.spec.js`
- Screenshots of `/2026/postseason` at 1440, 1024, 768, 390 and 320px, light and dark: zones side by side from
  1024px, stacked below, margins read correctly against the stated reference club (for example a 6th club at 4-2 vs
  7th at 4-3 shows `Level` with `1 game in hand`).
- `/2025/postseason` (finished season) shows no race, unchanged.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5731,"specSha256":"29a5487519ddef2bcc4976517a729a82f9ec63236329958cd78e020bd5296289","branch":"refs/heads/fix/compact-postseason-race","head":"b44d8e2dde17b7c163472a748253befd5a0e762c","baseRef":"refs/heads/master","baseCommit":"b44d8e2dde17b7c163472a748253befd5a0e762c","sourceTree":"56b3b3ea3d0f16200d8febfb0e279e38048b62ec","absentOptional":[]} -->
