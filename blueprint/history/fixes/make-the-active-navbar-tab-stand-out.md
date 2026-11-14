# Fix: Make the active navbar tab stand out

**Type:** Fix
**Status:** verified
**Branch:** fix/make-the-active-navbar-tab-stand-out

## The problem

On tablet and wider screens (from `sm`, 640px), the header's ten section tabs
([NavBar.jsx](../../frontend/src/season/NavBar.jsx)) mark the current page only by turning its label orange (`tab-active
text-primary`). Every tab is already `font-semibold`, and there is no other cue. The selection reads weakly. It is also
out of step with the rest of the site:

- the phone menu marks the active row with an orange bar and a tint;
- every in-page tab strip (`tab-level-*` in `index.css`) marks the chosen tab with an orange underline that grows in.

## The fix

A subtle restyle of the desktop/tablet tab row only. No change to markup roles, links, routing or the phone menu
(`SiteMenu.jsx`).

1. **Underline.** The active tab gets a 2px orange (`--color-primary`) line at the bottom of the tab row, sitting on the
   header's bottom border, so the tab reads as attached to the page below. It grows in with `scaleX`, the same motion as
   the `tab-level-*` strips. The global `prefers-reduced-motion` rule already cuts the transition.
2. **Bolder label.** The active label goes from semibold to bold. To stop neighbouring tabs shifting when the selection
   changes, each tab reserves its bold width: a hidden, bold copy of the label (for example a `data-label` `::after`
   with `content: attr(data-label)`, `font-weight: bold`, `height: 0`, `visibility: hidden`) sets the tab's width.
3. **Muted inactive tabs.** Inactive labels are visibly dimmer than the active one. They are base-content at reduced
   strength, and still at least 4.5:1 against the header background in both themes.
4. **Hover.** Hovering an inactive tab brings its label to full base-content and shows a faint underline preview
   (primary at low opacity). The active tab is unchanged on hover.

The styles live in `index.css` under a class on the nav's tab row (e.g. `.site-tabs`), beside the existing
`tab-level-*` rules. They do not reuse `tab-level-*`, whose `aria-selected` selector and sizes are for in-page strips.

Must not break:

- all ten tabs on one row with no horizontal scroll at 640px and up, and the 88px header (`responsive.spec.js`);
- `aria-current="page"` on the active link (NavLink's default);
- keyboard focus ring visibility;
- both light and dark themes.

## Build steps

- [x] **1. Restyle the tab row.** Add the class and `data-label` in `NavBar.jsx`; add the underline, bold-width
      reservation, muted, and hover rules to `index.css`.
      **Revised during build (measured):**
      - Bold labels apply from `lg` (1024px) only. At 640px the row has 598px and the semibold tabs use 595px; bold
        widths need about 18px more, so the row would scroll. Below `lg` the active tab keeps semibold, with the
        underline and full colour.
      - Inactive tabs were already at 50% base-content, which is only 3.3:1 in light mode. They are now 65%: 5.3:1
        light, 7.3:1 dark.
      - The tab row reaches 1px past the nav, so the underline covers the header's grey bottom border where it sits
        (user's choice after review).
      **Done when:**
      - At 640, 768, 1024 and 1440px, the active tab shows an orange label (bold from 1024px) with a 2px orange
        underline on the header's bottom edge.
      - Inactive tabs are dimmer; hovering one brightens it and shows a faint underline.
      - Switching tabs moves no other tab's position (left edges are identical before and after a click).
      - The row still fits without scrolling.
      - Lint and build pass.

## Verify

- `cd frontend && npm run lint && npm run build`.
- Browser specs (scope per the test-scope memory, since this is the shared header):
  - `responsive.spec.js`, `smoke.spec.js`, `urls-and-titles.spec.js`, `filter-controls.spec.js`;
  - the full suite only if the user asks.
- Screenshots at 640 and 1440px in light and dark, active tab and a hovered tab.
- A measured check that tab positions are unchanged across a tab switch.
- Manual: open any season page on a laptop-width window, then click through the tabs. The underline and bold label
  should follow the page, and nothing else should jump. Hover an inactive tab to see it brighten.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4293,"specSha256":"2b9a7a61d27fef25512bd4475b6a7329e31c6d0811ad562b378dff266c9b0483","branch":"refs/heads/fix/make-the-active-navbar-tab-stand-out","head":"bc741a0d1969919d51118bff53d151e650d83f57","baseRef":"refs/heads/master","baseCommit":"bc741a0d1969919d51118bff53d151e650d83f57","sourceTree":"fe469b8ca0a9cc44d6b7f1d8ea4790dfe61f1eb2","absentOptional":[]} -->
