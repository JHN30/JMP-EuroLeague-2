# Fix: Back links on detail pages

**Type:** Fix
**Status:** verified
**Branch:** fix/back-links-on-detail-pages

## The problem

The game page (`/:season/games/:gameCode`), the team page (`/:season/teams/:clubCode`) and the player page (`/:season/players/:personKey`) have no visible way back to their list. To pick another game, team or player the user has to open the hamburger menu and choose the section that is already selected, which goes to the plain list, and then pick again (on the Games list that also loses the round they were looking at). The browser's Back button works but is not obvious and returns to wherever the user came from, which is not always the list.

## The fix

One small shared component, `BackLink` in `frontend/src/lib/BackLink.jsx`: a quiet text link, "← Games", "← Teams" or "← Players", placed at the top of each of the three detail pages, above the page header, so it is the first thing in the page and costs one short line. It is a plain React Router `Link` (no new route, no data).

- **Game page:** goes to the Games list opened on that game's own round and phase: `/:season/games?phase=<phaseCode>&round=<roundNumber>` (the list already reads both from the URL). When the game has no round or phase it goes to the plain `/:season/games`.
- **Team page:** `/:season/teams`. **Player page:** `/:season/players`.
- It shows when the page has loaded and in its "not found" and "could not load" states (so a bad address is not a dead end); it is not drawn while the page is still loading.
- Look: small, muted text that turns to the primary colour on hover and focus, the arrow hidden from screen readers and "Back to " added visually hidden, so the accessible name is "Back to Games"; a hit area at least as tall as a text line plus padding without adding a tall gap, and a visible focus ring.
- Nothing else changes: the headers, tabs, menu and the list pages stay as they are. Head-to-head and Compare are out of this fix.

Must not break: the layout of the three pages at 320 to 1280px (no sideways page scroll), the existing game, team and player specs, and the Games list reading its `round` and `phase` from the URL.

## Build steps

- [x] 1. **Back link.** Add `BackLink.jsx` and place it on the game, team and player pages (loaded, not-found and error states). *Done when:* on each of the three pages at 390px and 1280px a "← Games / Teams / Players" link sits above the header; clicking it from a game opens the Games list on that game's round (the round strip shows that round, with the game in the list), from a team opens Teams, from a player opens Players; the not-found state of each page shows the link too; the link's accessible name is "Back to <Section>"; no page overflow at 320px.
- [x] 2. **Spec and gate.** Add `frontend/e2e/detail-back-links.spec.js` (live data like `games-layout.spec.js`, plus mocked 404 responses for the not-found states) and run the game, team and player specs. *Done when:* the new spec passes, `game-detail-layout.spec.js`, `game-matchup-header.spec.js`, `teams-layout.spec.js` and `smoke.spec.js` still pass, and root `npm run build` and `cd frontend && npm run lint` pass.

## Verify

Open a game from the Games list, then click "← Games": you are back on the list, on that game's round, and can pick another game. Do the same from a team (back to Teams) and a player (back to Players). Open a made-up game address: "Game not found." with the back link above it. No Co-Authored-By or AI attribution in the commit (AGENTS.md).

## Built as

- As specced. While running lint I found an unused `width` parameter left in `frontend/e2e/teams-layout.spec.js` by the 31g work (lint failed on `master` since that merge), and removed it here.
- Added after the first review, at the user's request: below 640px the sticky top bar carries the way back. The page's `BackLink` hands its target (`to`, `label`) up through a small context (`lib/backTarget.js`, provided by `SeasonLayout`), and the bar's page name becomes a tappable "← Games" (the same target, so the game page still returns to its round) that stays on screen however far the page is scrolled; the page-top link is hidden below 640px because it would duplicate it, and shown from 640px, where the sticky nav already has the section tab. The bar is a plain name again on every other page.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4337,"specSha256":"710085e90359b14124fabb5693ad1444957f8be07c5206d2b085e8202d33fb37","branch":"refs/heads/fix/back-links-on-detail-pages","head":"0343191a8d44c12a70f8cca9c48ae08f3f389c7d","baseRef":"refs/heads/master","baseCommit":"0343191a8d44c12a70f8cca9c48ae08f3f389c7d","sourceTree":"6334f1c2da63f225c8cc92418e42351b8771aa41","absentOptional":[]} -->
