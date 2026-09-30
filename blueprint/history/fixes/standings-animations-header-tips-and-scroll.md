# Fix: Standings animations, column header tips, and the tab scroll jump

**Type:** Fix (polish)
**Status:** verified
**Branch:** master

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## What changed

**Animations (Motion).** Shared presets in `lib/motion.js` (`tableBody`, `tableRow`,
`barFill`, exported `EASE_OUT`) and `standings/motionTable.jsx` (`AnimatedBody`,
`AnimatedRow`). Reduced motion is handled globally by `MotionConfig` in `App.jsx`, and
bars use transforms so it skips them.

- Switching Table, Race, and Advanced fades the content in, and switching the
  breakdown fades the new view in.
- Overview rows fade up one after another, and switching Overall, Home, Away, and
  Last 10 makes the rows slide into their new order.
- Every breakdown table reveals its rows the same way. Record bars, quarter bars,
  time-in-front bars, margin bars, and the results ribbon grow in; the game-shape lines
  draw themselves and the shape cards stagger in.
- Race: the chart and table animation are described in `standings-race-tab-repair.md`.

**Column header tips** (`lib/HeaderTip.jsx`). The full name first, then a short
explanation, on every standings table (overview, the three breakdowns, the race table,
and the Advanced tabs). It is drawn in a portal so a scrolling table never clips it,
animates in and out, opens below the label or above when there is no room, is nudged
to stay on screen, and also opens on keyboard focus. The text is also read out after
the label for screen readers. The tie-break and "schedule not connected" badges use it
too. It replaced the browser `title` tips on those headers.

**Scroll jump.** Clicking a tab such as Home on Standings scrolled the page about 274px,
because `TabPanel` moves focus to the panel and the browser scrolls it into view, under
the 82px sticky nav. `TabPanel` now has a `scroll` prop (default true). The three
Standings panels pass `scroll={false}`, which keeps the focus move but not the scroll.
Every other `TabPanel` still scrolls, now with `scroll-margin-top: 7rem` (the
`.tab-panel` class) so the panel lands below the nav.

## Verify

- `eslint` and `vite build` pass. Playwright 8 of 9 (same pre-existing failure).
- Headless Chromium: tips checked at the left edge, the right edge, and the middle of
  the overview and Advanced tables; scroll position unchanged after clicking Home.
- No console errors while switching every tab.

## Known gaps

- Reduced-motion mode was not exercised in the browser.
- Other pages' tab switching was not re-checked after the new scroll margin.
