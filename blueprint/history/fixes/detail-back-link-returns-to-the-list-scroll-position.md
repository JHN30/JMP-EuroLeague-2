# Fix: Detail back link returns to the list's scroll position

**Type:** Fix
**Status:** verified
**Branch:** fix/detail-back-link-returns-to-the-list-scroll-position

## The problem

On a team, player or game page, the "← Teams / Players / Games" link (at the top of the page from 640px, in the sticky bar below it) is an ordinary link, so it opens a new history entry. A new entry is a new visit, and since the scroll-to-top fix (`ScrollToTop`) it opens at the top. Scroll down the Teams list, open a club, look around and use the back link: the list is back at the top, not where it was left. The browser's own Back button already returns to the same position (measured at 390px: 500px before, 500px after) because it is a Back navigation, which `ScrollToTop` leaves alone and the browser restores.

React Router's `ScrollRestoration` was considered and does not help: it needs a data router (the app uses `BrowserRouter`) and by default keys positions by history entry, so the link's new entry would still open at the top; keyed by path it would restore old positions on every revisit and undo the scroll-to-top fix.

## The fix

Make the back link behave like the browser's Back when the page before is that list, and stay a link otherwise.

- `frontend/src/lib/historyTrail.js` (new): remembers, for the session, the path of each history entry by the index React Router keeps in `window.history.state.idx` (a module-level map, filled from a layout effect on every location change; nothing is stored, a reload empties it). Exports `useRecordHistory()` and `useBackLinkClick(to)`.
- `useBackLinkClick(to)` returns a click handler: for a plain left click, when the entry before the current one (`idx - 1`) is the same page as `to` (compared by path, ignoring the query string, so the list comes back as it was left: its round, phase and scroll), it prevents the link's own navigation and calls `navigate(-1)`. For a modified click (new tab, ctrl, shift, alt, meta), a missing trail (direct address, reload, a link from another site) or a different previous page, the handler does nothing and the link is an ordinary link to `to`, exactly as today (including the round-aware Games address).
- `BackLink.jsx` and the phone sticky bar link in `SeasonLayout.jsx` use the handler. The back link's `to`, label, accessible name and look do not change; `useRecordHistory()` is called from the existing `ScrollToTop` component.

Going back one step is a Back navigation, so `ScrollToTop` skips it and the browser restores the position. No dependency, no router change, no change to the pages.

## Build steps

- [x] **1. Back link goes back when it can.** Add `historyTrail.js`, call `useRecordHistory()` in `ScrollToTop`, use `useBackLinkClick(to)` in `BackLink` and in the sticky bar link, and add `frontend/e2e/back-link-scroll.spec.js`. **Done when:** at 390px (sticky bar link) and 1280px (page link), scrolling the Teams, Players or Games list, opening an item and using the back link returns to the list with `scrollY` within a few pixels of where it was left, and the browser's Forward then returns to the item; from a direct address the link still opens its list as a normal link (the Games link keeps its round) and Back returns to the page; a ctrl-click is left to the browser; `detail-back-links.spec.js`, `scroll-to-top.spec.js` and `responsive.spec.js` still pass; `npm run lint` and `npm run build` pass.

## Verify

`cd frontend && npx playwright test e2e/back-link-scroll.spec.js e2e/detail-back-links.spec.js e2e/scroll-to-top.spec.js e2e/responsive.spec.js`, then `npm run lint` and `npm run build`. By hand: scroll the Teams list halfway down, open a club, press "← Teams" (or the arrow in the phone bar): the list is where you left it. Open a club from its address directly and press "← Teams": the Teams list opens at the top as before.

## Notes

- The new spec fails for all six list-and-back cases (team, player, game at 390px and 1280px) with the click handler switched off, and passed 32 of 32 runs with it on.
- A case where a different page sits between the list and the item (list, item, Home, then the item again) is not in the spec: it needs a path from Home to an item that the spec cannot count on, and the code path is the same comparison that the direct-address case exercises (the previous entry is not the list, so the link is ordinary).
- In the whole-suite run `leaders.spec.js` ("goes back", which uses buttons, not a back link) and the phone-menu "closes on a tab" spec failed under load. The leaders spec also failed in a ten-run repeat with this change stashed (the same "not visible" error, I did not count how many of the ten), and the menu spec is the known flake, so neither comes from this change; both pass alone.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4799,"specSha256":"a29ed676340e03e36821a00ab2c2fc882bf08c66767dce5c19eb8d755d3c16b7","branch":"refs/heads/fix/detail-back-link-returns-to-the-list-scroll-position","head":"d7640cc4934fa9d05af98bf329cddbf36b81a76d","baseRef":"refs/heads/master","baseCommit":"d7640cc4934fa9d05af98bf329cddbf36b81a76d","sourceTree":"161724afad5d1a72cff94fbe259cfd1746424889","absentOptional":[]} -->
