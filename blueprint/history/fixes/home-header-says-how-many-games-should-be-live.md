# Fix: Home header says how many games should be live

**Type:** Fix
**Status:** verified
**Branch:** fix/home-header-says-how-many-games-should-be-live

## The problem

The Home header's round line (`dashboard/roundStatus.js`, shown by `dashboard/Dashboard.jsx`) gives no hint that a
game is being played right now. Once a round starts it reads, for example, "Under way · 0 of 10 games played · next
game tomorrow at 18:15", even at 20:45 on the Wednesday, when that night's game has just tipped off.

Real live scores are not built yet. Until they are, the header should give an estimate: most games last about two
hours, so a game that started less than two hours ago and has no result yet is probably on.

## The fix

- **The rule:** a game of the current round "should be live" when it is not played, its start time has passed, and
  it started less than 2 hours ago (from its start up to, but not including, start + 2 hours). A game marked played
  drops out at once, even inside its 2 hours.
- **The wording:** "1 game should be live" or "N games should be live". It says "should be", never "is" or "are": it
  is an estimate, and a viewer can check the EuroLeague site if a game is not on.
- **Where it goes:** in the round line, straight after "Under way":
  "Under way · 2 games should be live · 3 of 10 games played · next game today at 20:45".
- **When none is in its window:** the line stays exactly as today ("Under way · 3 of 10 games played · ...").
- **Before the round starts:** unchanged ("Starts ..."); no game can be live yet.
- **Updates by itself:** the header already re-reads the clock every minute, so the count rises at each tip-off and
  falls 2 hours later without a reload.
- **Real Round 10 times (CET), as a check:**

  | Time | Count |
  |---|---|
  | Wed 4 Nov 20:45 to 22:45 | 1 game |
  | Thu 5 Nov 18:15 | 1 game |
  | Thu 19:00 | 2 games |
  | Thu 19:45 | 3 games |
  | Thu 20:00 | 4 games |
  | Thu 20:15 | 3 games (the 18:15 game is out) |

- **Scope:** only the counting and the line in `roundStatus.js`; its comment that "nothing here claims a game is
  being played" is updated to say the count is an estimate. The 2-hour window is a named constant in that file, not
  a setting. No backend, API or other page changes.
- **Must not break:** the "Starts ..." lines, the played count, the next-game part, time zones, and the season
  status lines when nothing is scheduled.

## Build steps

- [x] **Count the games that should be live and add it to the round line.** In `roundStatus.js`, count the round's
   unplayed games inside their 2-hour window and add the "N game(s) should be live" part after "Under way" when the
   count is above zero. In `e2e/home-round-status.spec.js`, update the three tests whose fixed time now falls inside
   a game's window ("says how many games are played...", "leaves out the next game...", "moves on by itself...") and
   add tests for: several games live with one already past its 2 hours (Tuesday games at 17:45, 18:45, 19:45, 20:45
   UTC, none played, at 20:00 UTC: "Under way · 2 games should be live · 0 of 4 games played · next game today at
   8:45 PM"), and no game in its window (a late time when the unplayed games started over 2 hours ago: the line has
   no live part).
   - **Done when:** the Home header shows the count at the times above, the line is unchanged when no game is in its
     window, and `npx playwright test home-round-status.spec.js` passes on the local database.

## Verify

- `/api/health` reports `"target":"local"`, then `cd frontend && npx playwright test home-round-status.spec.js`.
- Frontend lint: `cd frontend && npm run lint`.
- By eye: on Home, the line under the round title reads "Under way · 1 game should be live · ..." during a game's
  first 2 hours (or with the browser clock set to Wed 4 Nov 2026, 21:00 CET).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3850,"specSha256":"f43d8c6533bde4591529c604ab1f46dabfcf325038770d99df3037257cba97a9","branch":"refs/heads/fix/home-header-says-how-many-games-should-be-live","head":"c0818cff92f634fb09e1ed07a807a7092d734277","baseRef":"refs/heads/master","baseCommit":"c0818cff92f634fb09e1ed07a807a7092d734277","sourceTree":"072605482d6548ae0b9bd90641535be40eadee85","absentOptional":[]} -->
