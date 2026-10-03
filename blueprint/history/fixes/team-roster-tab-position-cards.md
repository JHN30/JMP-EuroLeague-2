# Fix: Team Roster tab - position groups with player cards

**Type:** Fix (polish)
**Status:** verified (awaiting the owner's review)
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

The Roster tab was one dense table, the second to last tab. The owner wanted it modelled on the
EuroLeague roster page (players grouped by position as portrait cards) and moved right after
Statistics.

## What changed

- `teams/TeamPage.jsx`: the tab order is now Overview, Statistics, Roster, Shooting, Advanced,
  Trends, Games. The old `RosterSection` and its imports are gone.
- `teams/TeamRosterSection.jsx` (new):
  - **Cards view** (default): players grouped under Guard, Forward and Center (any other
    position after them), sorted by jersey number, four cards per row from `2xl`, then three,
    two and one. A card has the portrait on a dark panel (zooms slightly on hover), first name
    small over the last name large, the big jersey number, a quiet line of country, height and
    age, a points, rebounds and assists per-game line, and a minutes bar (full at 40 minutes)
    with the figure. The whole card opens the player's page.
  - Players who have not played yet have no photo, age or stats in the feed, so their card shows
    a silhouette and "Has not played yet" (4 of Partizan's 16). The portrait panel draws either
    the photo or the silhouette, never both (an earlier version left the silhouette behind real
    photos, which showed as a halo); a photo that fails to load falls back to the silhouette.
  - **Coaching staff** section under the position groups (Cards view only): the head coach
    first, then the assistants, as cards without number or stats, showing the role and the
    nationality over a silhouette, since staff have no photo in the data. Hidden when a club has
    none, and loaded separately so a failure never hides the players.
  - **Facts strip** above the cards: players, average age (noting when it covers only the
    players who have played), average height and the number of nationalities with their codes.
  - **Cards / Table switch:** the previous table (GP, MIN, PTS with bar, REB, AST, PIR, sticky
    first column, Former marker) is kept unchanged as the second view.
- The Overview's leaders are not repeated on the cards (decided with the owner).
- Backend: `GET /api/seasons/:seasonCode/teams/:clubCode/coaches` returns
  `{ coaches: [{ personKey, name, countryCode, roleCode }] }` (`getTeamCoaches` in
  `db/season-identities.ts`). Coaches live in `app_registrations` next to the players, which the
  roster query filters to role `J`; here role `E` is the head coach and `A` an assistant (the
  feed spells it "Assitant"), and only current registrations count (`active` true or unknown).
  Checked against the data: in E2025 Monaco's original head coach is marked as having left and
  his successor is the active one, which is who the endpoint returns. A club or season with no
  coach rows returns an empty list. The other roles in the table (doctor, team manager, team
  follower, scorers' crew) are not exposed. Unknown club returns 404 `TEAM_NOT_FOUND`.
- Frontend `getTeamCoaches` in `lib/api.js`; the query in `TeamPage.jsx` runs only on the Roster
  tab.

## Verify

- `eslint` (whole frontend) and `vite build` pass.
- Headless Chromium, dark and light, 1860px and 420px (no horizontal overflow): Partizan shows
  16 cards in Guard 4, Forward 7 and Center 5, 4 silhouettes, the table view lists 16 rows, a
  card click opens the player page, and the tab order reads as above. No console errors.
- Photo layering checked in the page: of Partizan's 16 cards, 12 have a photo and none of those
  also draws a silhouette; 4 show only the silhouette. The coaching staff section shows the head
  coach and three assistants, and the coaches endpoint was checked for Partizan, an unknown club
  (404) and a 2025 club with a mid-season coaching change. The backend type-checks.

## Known gaps

- Country flags are not shown: Windows does not render flag emoji, so the card shows the code.
- The minutes bar is minutes a game against a 40-minute game, not a share of the team's minutes.
- Coaches have no photo, so they get a silhouette. Doctors and team managers exist in the data
  but are not shown.
- Which coach counts as "current" relies on the feed's `active` flag.
