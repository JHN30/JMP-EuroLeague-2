# Fix: Phone menu as a single column with icons

**Type:** Fix
**Status:** verified
**Branch:** fix/phone-menu-as-a-single-column-with-icons

## The problem

Below 640px the header's menu (`season/SiteMenu.jsx`, opened by the hamburger) is a two-column grid of text links, a footer with the
season picker and the theme switch under it. It was made a grid in `ab58af6` because the single-column list before it (9 rows of 48px
and the footer, about 604px with the 48px bar) was a few pixels taller than a 568px-high phone. The grid looks unlike the rest of
the app and unlike EuroLeague's own menu, a full-width list with an icon before each label and a line between the rows.

## The fix

Make the menu a single column again, tight enough to fit, with an icon on each row.

- **Layout** (`SiteMenu.jsx`, the `motion.nav` and its links): one column of full-width rows at the 44px touch-target minimum (`min-h-11`,
  the same minimum the footer controls and the spec already hold), a hairline between rows (`divide-y divide-base-300`, none after
  the last), the icon (20px, 1.75 stroke, muted; the primary colour on the current page) then the label (`text-base font-semibold`).
  The current page keeps its orange left marker (`before:` bar) and tint (`bg-primary/10`) and `aria-current="page"`; hover keeps
  `hover:bg-base-300`. The grid, the odd-last-row `col-span-2` rule and the row gaps go.
- **Fit.** Nine 44px rows with their dividers are about 404px; with the unchanged 96px footer the panel is about 500px, 548px with the
  bar: inside 568px, so the menu does not scroll at 320x568. The panel keeps its `max-h` and `overflow-y-auto` for anything shorter.
- **Icons.** `@tabler/icons-react` is added to `frontend/package.json` (the user approved this dependency in the request), and the
  nine icons are imported one by one from their own files (not the package's barrel), so the bundle gets only these and Vite's dev
  server stays fast. They live in a small map keyed by the tab's `path` inside `SiteMenu.jsx`: `home` IconHome, `overview`
  IconLayoutDashboard, `standings` IconListNumbers, `games` IconBallBasketball, `teams` IconUsersGroup, `players` IconUserCircle,
  `leaders` IconChartBar, `compare` IconArrowsExchange, `postseason` IconTrophy. Icons are decoration: `aria-hidden`, so the links keep
  their names ("Home", "Standings", ...). `sections.js` (also read by the desktop tab strip) is unchanged.
- **Kept as is:** the hamburger and its morph, the overlay, the panel's slide-and-fade open and close, the staggered row entrance, reduced
  motion, the closing on navigation, Escape and a tap outside, the logo link, and the footer (the "Season" label, the season picker, the
  theme switch). From 640px nothing changes: the inline tabs are untouched and take no icons.
- A tab list that grows later is handled by the same map (an unknown path renders no icon, not an error).

## Build steps

- [x] 1. **Dependency and menu.** Install `@tabler/icons-react`, check that its single-icon files can be imported by path (its package
      `exports`), and rebuild the menu as above.
      Done when: at 320x568 and 390x844 the open menu shows nine full-width rows (44px or taller, one shared left edge and width, each
      with an icon and its label, dividers between them, the current page marked), the footer below, the panel not scrolling and its
      bottom inside the window; the animation and the closing behaviour are as before; at 640px and wider the header is unchanged.
- [x] 2. **Specs.** Rewrite the two-column test in `phone-menu.spec.js` as a single-column one (shared left and width, rows in order and
      44px or taller, a divider between rows, an icon in each link that the accessible name does not include), keep the fit test for
      320x568 and 390x844, and run `phone-menu.spec.js`, `responsive.spec.js`, `back-link-scroll.spec.js`, `detail-back-links.spec.js`
      and `urls-and-titles.spec.js`.
      Done when they pass, with root `npm run build` and `cd frontend && npm run lint`; the build's output shows the icons adding only a
      few KB.

## Verify

Root `npm run build`, `cd frontend && npm run lint` and the specs in step 2 on the local database (`/api/health` says `local`). By hand: open
the menu on a phone width, check the icons and the active row, pick a page, and open it again on the smallest phone you have.

## Notes

- The dependency is authorised by this spec (the user's request), nothing else is added; no icon wrapper component or config.
- No AI attribution in commit messages (AGENTS.md).

## Built as

- As specced. `@tabler/icons-react` ^3.49.0 is in `frontend/package.json`; the package has no `exports` map, so the nine icons import by path
  (`@tabler/icons-react/dist/esm/icons/IconHome.mjs`, each file's default export). In `SiteMenu.jsx` a `TAB_ICONS` map keyed by the tab path
  feeds the links; the nav is `divide-y divide-base-300` (Tailwind 4 puts the line on each row's bottom edge, none after the last), the rows
  `min-h-11 gap-3 px-4`, and the icons `aria-hidden`, 20px, 1.75 stroke, at 70% opacity until the page is current.
- Measured on the live app: at 320x568 and 390x844 nine rows of 44px, one shared left edge, nine icons, the panel's bottom at 547px, not
  scrolling, no sideways scroll (before: the grid was 368px tall; the old single column would have been about 604px).
- The two-column test in `phone-menu.spec.js` is now a single-column one (shared left and width, ascending tops, 44px rows, icon in each, the
  line between rows, none after the last); its first run failed on my own assumption that dividers sit on the top edge, fixed to the bottom
  edge. `phone-menu.spec.js` (19), `responsive.spec.js`, `back-link-scroll.spec.js`, `detail-back-links.spec.js` and `urls-and-titles.spec.js`
  pass (170 plus 19 again after the fix) on the local database. Root `npm run build` (main bundle 368.65 to 372.63 kB, about 4 kB for the nine
  icons) and `cd frontend && npm run lint` pass.
- `npm audit` reports one high-severity advisory in `source-map-js`, a transitive dependency that was already there, not in the new package.
- During the work I ran `git stash` by mistake and restored it at once with `git stash pop`; the stash list is empty and the files are intact.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6342,"specSha256":"cb9f4645add99b9139c1072891b5410b0e8c4f4b1933a1fa75e85ee6f9d8927c","branch":"refs/heads/fix/phone-menu-as-a-single-column-with-icons","head":"b4c4e7f12c7424a0286646ef0e888607b2d912d6","baseRef":"refs/heads/master","baseCommit":"b4c4e7f12c7424a0286646ef0e888607b2d912d6","sourceTree":"759c931595b88ae0a4f0310dba87c3da624d0aa9","absentOptional":[]} -->
