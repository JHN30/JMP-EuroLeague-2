# Fix: Phone menu layout, animation and logo link

**Type:** Fix
**Status:** verified
**Branch:** fix/phone-menu-layout-animation-and-logo-link

## The problem

The phone menu (`frontend/src/season/SiteMenu.jsx`, opened by the hamburger in the sticky bar of `frontend/src/season/SeasonLayout.jsx`) is a plain two-column grid of text tiles that appears instantly: the nine sections leave "Postseason" alone on the last row, the current page is only a tinted tile, the season picker and theme switch sit in an unlabelled row at the bottom, and nothing animates. The logo in the sticky bar is a plain image, so tapping it does nothing, although it is the natural way to go to the home page. Below `sm` (640px) only.

## The fix

**Layout.** One column of full-width, left-aligned rows (`min-h-11`, larger text), in the existing order (Home, Overview, Standings, Games, Teams, Players, Leaders, Compare, Postseason). The current page's row has a primary accent bar on its left edge plus the primary text colour (the accent is not the only cue: the row also keeps `aria-current="page"` from `NavLink`). A divider separates the rows from a footer with a small "Season" label above the season picker, and the theme switch beside it, as today. The panel still scrolls (`max-h`) when the phone is short, the dim overlay under the bar stays, and closing on navigation, Escape, a tap outside and growing to `sm` is unchanged.

**Animation** (the `motion` library already in the project, `AnimatePresence`):

- The panel slides down a little and fades in (about 0.2s, the project's `EASE_OUT`), and slides up and fades out on close; the dim overlay fades with it.
- The rows then appear one after another with a short stagger (the existing `listContainer` / `listItem` variants, or a tighter one if the full stagger feels slow: all nine inside about 0.4s).
- The hamburger icon morphs into the X (its three bars rotate and fade into a cross) instead of swapping.
- With `prefers-reduced-motion` (`usePrefersReducedMotion`) the panel and rows appear and disappear at once, and the icon swaps with no movement.
- The menu is usable the moment it starts opening (links clickable, focus works); the exit animation must not leave an invisible panel catching taps (it is removed when the exit ends).

**Logo.** The brand mark in the sticky bar becomes a link to `/:season/home` with the accessible name "Home" (`aria-label`), on every width. From `sm` the "EuroLeague" wordmark beside it is inside the same link. Tapping it on a phone also closes an open menu (navigation closes it already; when already on Home the click still closes it). The "← Teams"-style back link and the page name stay as they are; the logo link sits to their left.

Nothing else changes: the tab row from `sm`, the menu's contents and order, the season and theme controls, the header height (48px bar below `sm`), and the specs in `responsive.spec.js`.

Must not break: `responsive.spec.js` (menu tests at 320, 390 and 639px), no sideways page scroll, keyboard use (the button keeps `aria-expanded` and `aria-controls`, Escape returns focus to it), and the back-link bar from the last fix.

## Build steps

- [x] 1. **Menu layout, animation and logo.** Rework `SiteMenu.jsx` (one-column rows with the active accent bar, labelled footer, animated panel, staggered rows, morphing icon, reduced-motion path) and make the logo (and, from `sm`, the wordmark) a Home link in `SeasonLayout.jsx`; add CSS in `index.css` only where a utility cannot do it (unlayered rules outrank utilities). *Done when:* at 320, 390 and 639px the menu opens with a visible slide-and-fade and staggered rows and settles fully opaque and in place; the hamburger turns into an X; the current page's row has the accent bar and `aria-current`; the footer shows a "Season" label, the picker and the theme switch; closing animates and then removes the panel; the logo link goes to Home from every page and closes an open menu; with reduced motion nothing slides; no page overflow.
- [x] 2. **Spec and gate.** Add `frontend/e2e/phone-menu.spec.js` and keep `responsive.spec.js` passing. *Done when:* the new spec passes (open settles visible and in place, nine rows in order, active row marked, footer label, icon state, Escape and outside tap, logo link and its menu close, reduced-motion path via `page.emulateMedia({ reducedMotion: "reduce" })`, no overflow at 320px), `responsive.spec.js`, `detail-back-links.spec.js` and `smoke.spec.js` still pass, and root `npm run build` and `cd frontend && npm run lint` pass.

## Verify

Open the site at about 390px and tap the hamburger: the menu slides and fades in, the rows follow one by one, the icon turns into an X, and the current page has an accent bar on the left. The season picker has a "Season" label above it. Tap the logo from any page: you land on Home (and an open menu closes). Turn on "reduce motion" in the system settings: the menu appears with no movement. No Co-Authored-By or AI attribution in the commit (AGENTS.md).

## Built as

- As specced. The rows stagger in 0.025s apart (all nine settle inside about 0.5s). The panel's top is 47px, not 48: it hangs from the bar's padding edge, under its 1px border, as before. The overlay and panel carry `pointer-events: none` while they fade out, so they cannot catch a tap.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5314,"specSha256":"b24b833397c9506d64714f224e2efd49addb9eec84c846c2097577954915c77b","branch":"refs/heads/fix/phone-menu-layout-animation-and-logo-link","head":"0e9a4f21677f65741386cda3b7d9cd26bcbaaffe","baseRef":"refs/heads/master","baseCommit":"0e9a4f21677f65741386cda3b7d9cd26bcbaaffe","sourceTree":"56b4da726ff77b35c1614220f20730f894383f8a","absentOptional":[]} -->
