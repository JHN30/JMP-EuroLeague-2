# Fix: Pictures reveal as they load, and tab changes no longer scroll the team and player pages

**Type:** Fix (polish)
**Status:** verified (awaiting the owner's review)
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

- Player photos and club crests appeared abruptly, a blank gap and then the picture, whenever the
  download finished.
- On a team page and a player page, switching a tab scrolled the whole page down by 180 to 375px.

## What changed

- `lib/RevealImage.jsx` (new): an image that stays invisible until it has downloaded (cached images
  are detected too), then animates in. `effect="pop"` springs a crest up from small; `effect="wipe"`
  opens a photo from its middle line outward. A failed image renders nothing. `onLoad` and `onError`
  still reach the caller.
- `lib/PlayerPortrait.jsx`: a light shimmer (`.image-shimmer` in `index.css`, still under reduced motion)
  holds the portrait's place until the photo arrives, then the photo wipes in. The silhouette still
  shows only when there is no photo or it fails. Used by the Players cards and the Roster tab.
- `RevealImage` replaces the plain images for the Teams grid crests, the team header crest, the club crest
  on the Players cards, and the photo on the leader cards (team Overview, season Overview and the home
  page's leaders panel).
- Scroll: the team page and player page tab panels moved focus to themselves on every tab change, and the
  browser scrolled them into view. Those panels (`team-panel`, `team-advanced-panel`, `player-detail-panel`,
  `player-stats-panel`, `player-advanced-panel`) now use `scroll={false}`; keyboard focus still moves.

## Verify

- `eslint` and `vite build` pass.
- Headless Chromium: before the change every tab but the first moved the page by up to 375px; after
  it, all 6 team tabs and all 6 player tabs stay at scroll 0. Navigating from a list to a team or player
  already started at the top.
- With image requests delayed by 1.8s: the cards show the shimmer, then the photos open from the middle one
  by one (caught mid-wipe), and every image ends fully visible; no page errors.

## Known gaps

- Crests and photos elsewhere (game cards, standings, statistics tables, game detail, comparison) still
  use plain images; they can move to `RevealImage` if wanted.
