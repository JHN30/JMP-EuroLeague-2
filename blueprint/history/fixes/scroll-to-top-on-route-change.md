# Fix: Scroll to top on route change

**Type:** Fix
**Status:** verified
**Branch:** fix/scroll-to-top-on-route-change

## The problem

Opening a team, player or game from a list you have scrolled down sometimes opens the new page part-way down, where the list was, instead of at the top. Seen on a phone and on desktop. It is inconsistent: clicking fast tends to keep the old position, clicking slowly lands at the top.

Cause: the app uses a plain `BrowserRouter` (`frontend/src/main.jsx`) and nothing resets the window scroll when the route changes (a search of `frontend/src` finds no scroll reset or restoration). The browser keeps the scroll position across the route change and only lands at the top when the new page is shorter than that position, which clamps it. A first visit shows a short loading state first (clamped to the top). A visit whose data React Query already has renders tall at once, so the old position survives. That is the fast-versus-slow difference.

## The fix

One small component, mounted once inside the router in `frontend/src/App.jsx` next to `Routes`, that scrolls the window to the top (instantly, before paint) when `location.pathname` changes:

- Not on the first render (a reload keeps the browser's own restoration).
- Not for a Back or Forward navigation (`useNavigationType() === "POP"`): the browser's history behaviour stays as it is today.
- Not when only the query string or hash changes (the Games round and phase filters, `?phase=`, the comparison and leaderboard queries keep their position), and not when the address has a hash.
- Applies to PUSH and REPLACE, so a link, a redirect and a season switch all start at the top.

Tab switches inside a page are state, not a path change, so they are untouched (their own `TabPanel` scroll handling stays). No new dependency, no change to any page or to the data router.

## Build steps

- [x] **1. Scroll to the top on a path change.** Add the component (`frontend/src/lib/ScrollToTop.jsx`, using `useLocation` and `useNavigationType`) and mount it in `App.jsx`. Add `frontend/e2e/scroll-to-top.spec.js`. **Done when:** from a scrolled Teams list, clicking a team opens it at `scrollY` 0, both on the first visit and on a second visit with the data cached; the same from Players to a player and from Games to a game, at 390px and 1280px; a query-only change on the Games list (going back to a round already visited, so the list does not blank and shorten) keeps its scroll position; a Back after opening a team does not force the list to the top; the whole page set still passes `responsive.spec.js` and `detail-back-links.spec.js`; `npm run lint` and `npm run build` pass.

## Verify

`cd frontend && npx playwright test e2e/scroll-to-top.spec.js e2e/responsive.spec.js e2e/detail-back-links.spec.js`, then `npm run lint` and `npm run build`. By hand: scroll the Teams list halfway down and click a club, once for a club you have not opened and once for one you have; both open at the top. Change the Games round while scrolled down: the page stays where it is.

## Notes

- The spec records every frame after the click and requires each frame that shows the new page to be at `scrollY` 0, so a single frame at the old position fails it. Without the component the spec fails for a team (390px and 1280px) and for a player (390px); the repeat visit to a game or a player at 1280px renders short on its first frame, so the browser clamps the scroll there without help and those cases pass either way.
- `responsive.spec.js` "closes on a tab ... and a tap outside" failed once in the whole-suite run and about once in 70 runs with the component removed as well, so it is an existing flake, not caused by this change.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3710,"specSha256":"177e772b0c68d46718eef195f3f7737d3aef6f9c0349a077b935b2d530356c07","branch":"refs/heads/fix/scroll-to-top-on-route-change","head":"ba2b1148f453847758016acba54a90b2789d0eb8","baseRef":"refs/heads/master","baseCommit":"ba2b1148f453847758016acba54a90b2789d0eb8","sourceTree":"e01fa5cacae2c8d2b2d100474e0ffaaaf3c1aa6b","absentOptional":[]} -->
