# Fix: Scroll to the top when a page swaps its view in place

**Type:** Fix
**Status:** verified
**Branch:** fix/scroll-to-the-top-when-a-page-swaps-its-view-in-place

## The problem

Opening a page starts at its top (`ScrollToTop`, fix d7640cc), but only when the path changes, and the detail pages' back link
returns a list at its old position (ea3d099). A page that swaps one view for another as state or a query string on one path
runs neither, so the new view opens wherever the old one was scrolled. The Compare page had this and was fixed in 31l-ii. A probe
of the dev servers at 1280 and 390px, and a read of every page for in-page view changes, found:

- **Leaders, opening a category** (a card's "Full leaderboard" button, the "Hot right now" buttons) and **"← All categories"**:
  an address change of `?metric=` only. The landing is tall and the board is not, so the position is left to the browser's
  clamp (seen at 0 here with a cold cache, but a cached board is as tall as the landing and would keep the old position).
- **Leaders, "Previous page" and "Next page"** on the Players and Advanced boards: the buttons are at the bottom of a 25-row list and
  the next page opens at the same scrollY (1436 to 1436 at 1280px), so the reader lands at the end of the new page. The Players
  directory already brings the top of the new page into view after paging.
- **Postseason, picking a matchup**: below 1024px the detail panel is scrolled into view; from 1024px it is not, and at 1280px
  the panel sat from 666 to 1011px in an 800px window, half below the fold. (This is the one place the request's "Postseason"
  can mean; if something else on that page is meant, say so before building.)
- **Seen and fine, left alone:** the Players directory's paging (has its own scroll), the tab switches inside the Team, Player,
  Game, Standings and Compare pages (their controls sit at the top, and `scroll={false}` on their panels is deliberate, from the
  tab-switch jump fix), the Games round and phase controls (at the top), Home's "show more", the Teams, Records and Head-to-head
  pages.

## The fix

Scroll the window where the page itself changes the view, in the handlers that do it, as the Compare page now does:

- Leaders: opening a category and going back to the categories scroll to the top (`window.scrollTo(0, 0)`, instant). Previous and Next
  page bring the top of the board into view (the board panel's top, below the sticky bar), after the new page is in, as on the Players
  directory. Two boards have paging (Players and Advanced); the Teams board has none. Share one small helper only if the two boards
  would otherwise repeat more than a few lines.
- Postseason: picking a matchup brings its detail panel into view at every width (`block: "nearest"`, as below 1024px today), so
  it never sits half below the fold.
- Sweep: before finishing, load every other page once at 390px and 1280px, change what it lets you change in place (a filter, a view
  or a tab, a page of results), and note where the position ends up. Fix a page only if a view was swapped and the reader is left
  mid-page of the new one; list each page and its outcome in the final packet.

It must not change `ScrollToTop`, the back link's history handling, the TabPanel scroll behaviour, or what any page shows.

## Build steps

- [x] 1. **Leaders.** Scroll to the top on opening a category and on "← All categories" (all three scopes); bring the board's top
      into view after Previous or Next page on the Players and Advanced boards.
      Done when: from a scrolled landing (390 and 1280px) opening any category lands at scrollY 0 with the board's title in view,
      "← All categories" from a scrolled board lands at 0, and Next and Previous page from the bottom of a board put the first row
      of the new page in view; changing a filter or a statistic chip inside a board does not move the page.
- [x] 2. **Postseason.** Bring the detail panel into view on every selection.
      Done when: at 1280px and 390px clicking a matchup (a finished season, and the current one if it has any) leaves the whole detail
      panel, or its top when it is taller than the window, inside the window.
- [x] 3. **Sweep and spec.** Check the other pages as described, fix what the sweep finds, and add
      `frontend/e2e/scroll-in-page-views.spec.js` for the Leaders and Postseason cases (and any page the sweep fixes).
      Done when: the final packet lists every page checked with its outcome; the spec is written and lints cleanly, and is not run
      before 1 November 2026 unless the user says otherwise. Root `npm run build` and `cd frontend && npm run lint` pass.

## Verify

No unit test runner and no `Verify` command are declared, so the gate is root `npm run build` plus `cd frontend && npm run lint`.
Browser tests are paused until 1 November 2026, so the new spec is written but not run; evidence comes from single page visits
through the Playwright library against the dev servers, after `/api/health` reports `"target":"local"`. By hand: on Leaders scroll to
the bottom of the cards and open one (the board starts at the top), go to the bottom of its list and press Next page, then
"← All categories"; on Postseason click a matchup in the lower half of the bracket at desktop width.

## Notes

- Follow the user's rule to change only the pages being fixed, and shared components only through opt-in props (memory notes).
- No AI attribution in commit messages (AGENTS.md).

## Built as

- As specced, in `PlayersLeaders.jsx`, `TeamsLeaders.jsx`, `AdvancedLeaders.jsx` and `PostseasonPage.jsx`:
  - Opening a category and "← All categories" call `window.scrollTo(0, 0)` first, on all three scopes (the Hot right now buttons use
    the Players `openMetric`).
  - The Players and Advanced boards put a ref and `scroll-mt-28` on the list's panel. Players pages client-side, so Next and Previous
    scroll to the list's top at once; Advanced pages on the server and shows a loading state between pages (which shortens the page), so
    it scrolls once the new page has loaded. The Teams board has no paging.
  - Postseason's `select` scrolls the detail into view (`block: "nearest"`) at every width, not only below 1024px.
- Sweep (390 and 1280px, scrollY before then after): Players Next page 1092 to 200 and 3796 to 132, with the summary at 96 (its own
  scroll, unchanged); Games Previous round 0 to 0; Standings Advanced tab 200 to 0; Team Roster tab 250 to 0 and 250 to 250; Player
  Statistics tab 250 to 20 and 250 to 151; Game Box score tab 0 to 0; Records and Home have no in-place view swap (Home has no "show
  more" button here, Records only loaded). Tab switches keep or clamp the position with their strips in sight, as designed, so none
  needed a change.
- Evidence: single page visits through the Playwright library against the dev servers (target `local`). Leaders: opening and going back
  land at 0 on all scopes and widths, also the second time with a warm cache; Next and Previous page put the list's top at 112px on
  Players and Advanced (before: 1436 to 1436 on Players, and Advanced fell to 0 with the list at 572). Postseason (2025 and 2026, first,
  middle and last matchup, 390 and 1280px): the detail's top and bottom are inside the 800px window every time (before at 1280px:
  666 to 1011).
- `scroll-in-page-views.spec.js` is written and lints cleanly but was not run (browser tests are paused until 1 November 2026). Root
  `npm run build` and `cd frontend && npm run lint` pass. Nothing here proves how it looks in the user's browser.
- Not in this fix: the "← All categories" button on Leaders is to become a back link at the top like the Team, Player and Compare pages
  (a separate fix, at the user's request).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7769,"specSha256":"cb7a214b3ca801b1ae631f6278bc344c86f8efab3c2da64c8feb4f0af5216172","branch":"refs/heads/fix/scroll-to-the-top-when-a-page-swaps-its-view-in-place","head":"caf6c0d4ac64115e2febd9870e5013f0029d19b2","baseRef":"refs/heads/master","baseCommit":"caf6c0d4ac64115e2febd9870e5013f0029d19b2","sourceTree":"b8549f007949709c89d3fc6f0cb35083966f3d29","absentOptional":[]} -->
