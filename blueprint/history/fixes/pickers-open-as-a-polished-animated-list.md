# Fix: Pickers open as a polished, animated list

**Type:** Fix
**Status:** verified
**Branch:** fix/pickers-open-as-a-polished-animated-list

## The problem

Every picker in the app is a native `<select>` styled by daisyUI's `.select` (the season selector in the header, the Leaders statistic select, the Standings view and race selects, the Records metric select, the Head-to-head and Compare team selects, the Shooting and Games filters, and others: `CompactFilterSelect`, `LabelledSelect`, `ViewSelect` in `frontend/src/lib/` plus a few inline `<select class="select ...">`). The closed select is plain and the open list is drawn by the browser, so it has no animation, no rounded panel and a bare checkmark.

## The fix

Opt every `.select` into the browser's customizable select (`appearance: base-select`, Chrome and Edge 135+) in the shared stylesheet `frontend/src/index.css`, inside an `@supports (appearance: base-select)` block so Firefox, Safari and older Chrome keep today's native select and list unchanged. No component, markup or prop changes: the selects stay native `<select>` elements with the same options, values, `optgroup`s, labels, keyboard behaviour and `onChange` events, so every existing page and test keeps working.

Inside that block (colours come from the daisyUI theme variables so light and dark both work):

- **Trigger.** Same size, border and text as today; a smooth border and shadow transition on hover and a clear focus ring; the arrow is the select's `::picker-icon` and turns over when the list is open, and it is hidden from the old background arrow so there is only one.
- **List** (`::picker(select)`). A rounded panel (the theme's field radius) with a thin border, a soft shadow, a small gap under the trigger, padding, a maximum height with its own scrolling, and the theme's background; opens with a short fade and slide (about 150 to 200ms, `@starting-style` and `transition` with `allow-discrete` so it also fades out), and the closing animation is not required to be longer than the opening.
- **Options.** Taller rows (at least 2.25rem, 2.75rem on a coarse pointer so touch targets stay), rounded, a soft background on hover and keyboard focus, the selected option in the accent colour with the check mark (`::checkmark`) on the right instead of the left, and `optgroup` labels as small muted headings.
- **Reduced motion.** With `prefers-reduced-motion: reduce` the open and close transitions and the arrow turn are off (the list appears at once).

Out of scope: building a custom dropdown component, changing what any select lists, the Season selector's navigation, tab strips, and the native look of the select in browsers without support.

## Build steps

- [x] 1. **Shared select styles.** Add the `@supports (appearance: base-select)` block to `frontend/src/index.css` as described, placed after the existing select and touch-target rules. Done when: with the page open in the Playwright Chromium, the season selector's open list shows as a rounded panel with its options as DOM (a screenshot at 1280px and at 390px shows the panel, the hover or focus row, the selected row with its check mark), a Leaders or Standings select looks the same, choosing an option still changes the page, and `cd frontend && npm run lint` and `npm run build` pass.
- [x] 2. **Checks.** Done when `responsive.spec.js` and the specs that use `selectOption` (`leaders.spec.js`, `leaders-layout.spec.js`, `standings-view-controls.spec.js`, `records-layout.spec.js`, `filter-controls.spec.js`) pass on the local database (`/api/health` says `local`), and the open-list screenshots are read. If a spec fails because of the new rendering, the styles are adjusted, not the spec, unless the spec asserted something about the native arrow or sizes this fix changes on purpose.

## Verify

On the local DB only (`/api/health` target `local`): `cd frontend && npx playwright test responsive.spec.js leaders.spec.js leaders-layout.spec.js standings-view-controls.spec.js records-layout.spec.js filter-controls.spec.js`, plus screenshots of the open season selector and one Leaders or Standings select at 1280px and 390px in the light and dark themes. Manually in Chrome or Edge: open the season picker and a few others, check the animation, hover, selected row and keyboard (arrows, Enter, Escape); in a browser without support (Firefox) a picker looks and works as before.

## Notes

- A throwaway probe may be needed to open a select (`click` on the select) before the screenshot; delete it afterwards. Never open the real `.env`. No AI attribution in commit messages.
- Shared CSS change by request ("every picker"), so it is allowed to reach all pages; keep it to the `.select` class and nothing else.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4731,"specSha256":"096e5d65e2e80b2eb5078225e715b388050499de3be91f2fdac91f579a648f4e","branch":"refs/heads/fix/pickers-open-as-a-polished-animated-list","head":"dac3252c9e317bffc51abe4b05703ce7730e9a17","baseRef":"refs/heads/master","baseCommit":"dac3252c9e317bffc51abe4b05703ce7730e9a17","sourceTree":"01da7df441821d18b396329220ad327823cc1b9b","absentOptional":[]} -->

## Completion evidence

- Screenshots read in the Playwright Chromium: the open season selector at 1280px in the dark and light themes, and at 390px the Leaders statistic select (with its group headings) and the season picker in the phone menu, which opens upward. Each showed the rounded panel, the hover row, the selected row in the accent colour and the check mark on the right.
- Local database (`/api/health` said `local`): `responsive.spec.js`, `leaders.spec.js`, `leaders-layout.spec.js`, `standings-view-controls.spec.js`, `records-layout.spec.js` and `filter-controls.spec.js` passed (171 of 172 on the first run). The one failure, a Round select in the Advanced standings test that read round 47 instead of 38, passed on a rerun of its spec with and without this change, so it is treated as a timing flake.
- `cd frontend && npm run lint` and `npm run build` pass. No `Verify` command is declared in `AGENTS.md`. Not tried on a real phone: iPhone browsers (Safari engine) keep the native picker.
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested.
