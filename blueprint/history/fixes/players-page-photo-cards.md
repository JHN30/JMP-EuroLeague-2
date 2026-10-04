# Fix: Players page - photo cards with club, number and position

**Type:** Fix (polish)
**Status:** verified (awaiting the owner's review)
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

The Players directory was a plain list: a name link on the left and a country code on the right,
36 to a page. No photos, no club, and nothing on screen to tell two players apart or to show
which team someone plays for.

## What changed

- `backend/src/db/season-identities.ts`: `getPlayers` now returns a `PlayerListEntry` (the player plus
  `imageUrl`, `clubCode`, `clubName`, `crestUrl`, `dorsal`, `positionName`). It stays one paged
  query for the players, followed by two lookups for just that page's people: the current registration
  with its club (the active one, else the first by sort order, so a traded player shows the club they
  are registered with now) and a photo from the season statistics (the only place the feed keeps one).
  No route change; the `/players` response only gained fields.
- `lib/PlayerPortrait.jsx` (new, moved out of the Roster tab): the photo, or a silhouette when the
  player has no photo or it fails to load, never both. The width comes from the caller. The Roster tab
  now imports it. `lib/playerName.js` (new) holds `nameParts` ("LAST, FIRST") for both pages.
- `players/PlayersPage.jsx`: the list becomes a grid of cards (1, 2, 3 and 4 columns by width), in
  the style of the Roster cards: portrait, first name over a large surname, jersey number, the club
  crest and name, and position, country and height. Each card links to the player.
- Motion: the cards stagger in with a new tighter `denseListContainer` preset (36 cards still land
  inside a second) and lift on hover and press like the Teams cards; a new page or search replays the
  entrance, a refetch does not. Typing and paging keep the old cards until the new ones arrive instead
  of showing a spinner, and Previous or Next scrolls the top of the new page into view.

## Verify

- `eslint`, `vite build` and `tsc` pass.
- `/players` for E2025: of the first 40 players 37 have a photo, and all have a club, number and position.
- Headless Chromium, dark at 1860px and 420px and light at 1500px: no horizontal overflow, no page
  errors, no broken images; search ("kalaitzakis") returns one card, and Next page shows 37-72.

## Known gaps

- A player who has not played has no photo in the feed and gets the silhouette.
- This is only the directory; player statistics on the cards and filters are not part of this change.
