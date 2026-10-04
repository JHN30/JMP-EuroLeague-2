# Fix: Player page - hero header and a rebuilt Overview tab

**Type:** Fix (polish)
**Status:** verified (awaiting the owner's review)
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

A player page opened on a small thumbnail beside the name, a "Current team" list, and an Overview of six
identical rank cards over a radar chart. It said little about the player and nothing about how they had
played lately.

## What changed

- `backend/src/db/season-identities.ts`: `getPlayer` now returns the same photo, current club, jersey
  number and position as the Players directory (shared `listEntryDetails`), so the header does not depend on
  which phase has statistics.
- `players/PlayerHero.jsx` (new, above every tab): a large portrait (or silhouette) with the first name over a
  big surname, the number, position, a chip per club on this season's registrations (a traded player shows
  both, the earlier one marked "Former"), and the facts that do not change by tab: country, height, age,
  games and starts, and the team's record with the player. It replaces the thumbnail header and the "Current
  team" list.
- `players/PlayerOverviewSection.jsx` (new) and `players/playerOverview.js`:
  - **Season line:** points, rebounds, assists, steals, blocks, PIR and minutes per game, each with the
    league rank (green in the top third, red in the bottom third) and a bar.
  - **Profile:** the six-axis percentile radar (unchanged idea) with the strongest and weakest axis named.
  - **Recent form:** the last 10 games as bars of points (green for a win, red for a loss) with the opponent
    crest and a house or plane for home and away, each opening the game; the last 10's average points,
    rebounds, assists and PIR against the season's, and the best game by PIR. When the player has played
    10 games or fewer the recent games are the whole season, so the header reads "ALL n GAMES" and the
    comparison is left out (found in review: it showed meaningless red and green 0.0s from rounding). A
    difference that rounds to 0.0 reads "same as season" without a colour.
  - **Shooting:** 2PT, 3PT and FT percentage bars with makes over attempts, TS% and eFG% with a rank among
    players who have played at least 40% of the most games anyone has (shown as too few games otherwise),
    and a bar of how the points split between twos, threes and free throws.
- `players/PlayerPage.jsx`: the old ranking cards, radar, registrations list and header are removed; the
  game log is now also requested on the Overview, for the form panel (the Games tab reuses it).
- `e2e/progressive-disclosure.spec.js`: the test used to assert the game log was not fetched on arrival; it
  now asserts one fetch for the Overview that the Games tab reuses.

## Verify

- `eslint`, `vite build` and `tsc` pass.
- Headless Chromium, dark, light and 420px: Abalde (full page, no horizontal overflow, no page errors),
  Calathes (traded: two clubs, one "Former"), Amosov (no statistics: silhouette, and "No recorded stats for this
  player in this phase yet." under the header).

## Known gaps

- The Overview follows the default phase; there is no phase picker on this tab (the Statistics tab has one).
- The hero's right side is empty on a wide screen.
- The team record with the player counts every club the player played for in the phase.
- The other tabs (Season by season, Statistics, Advanced, Shooting, Games) are unchanged.
