# Fix: Games page - round picker and two-up game cards

**Type:** Fix (polish)
**Status:** verified
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

The Games page was a single plain list with a "Round" dropdown that included "All rounds",
a Played/Scheduled filter, and previous/next paging. One game per row, no crests-first
layout, and no way to see a whole round at a glance.

## What changed

- `games/FixturesPage.jsx`: the dropdown, the "All rounds" option, the status filter, and
  paging are gone. A scrolling strip of round tabs (with previous/next arrows) selects one
  round at a time. With no `?round=` in the URL it opens on the round holding the next
  scheduled game, or the phase's last round once everything is played. Tab labels come from
  the rounds endpoint, so playoffs show "Game 1"-"Game 5" rather than "Round 41".
- `games/GameCard.jsx` (new): one card per game, two per row. Teams show crest above name;
  regular-season games also show the W-L record (from the same standings query the dashboard
  uses). Upcoming games put the date and tip-off time in the middle (the NBA layout);
  finished games put the score pill there with the winner's side filled (the EuroLeague
  layout). Each card ends in a Preview or Overview button, and the whole card links to the game.
- `index.css`: `.fixture-*` and `.score-pill` styles. The grid goes to two columns by the
  container's own width (a container query), so phones get one column.
- `lib/format.js`: `formatShortDate` and `formatTimeOfDay`.
- Motion (added in a follow-up from the owner): cards fade and rise in a short stagger each
  time the round changes, then the score pill or date and time pops in a beat after its card
  (`centerPop`). Cards lift 2px on hover and press in slightly (`wideCardHover`, both in
  `lib/motion.js`). The selected round tab has a tinted pill that slides to the new tab
  (`layoutId`), and the arrow buttons shrink on press. All of it respects the app-wide
  reduced-motion setting.

## Verify

- `eslint` and `vite build` pass.
- Opened in headless Chromium: E2026 at 1400px (two columns, Round 2 finished games with
  score pills, Round 3 upcoming games with centred date and time), at 400px (one column),
  and E2025 Playoffs (round tabs read "Game 1"-"Game 5", defaults to Game 5). No page errors.
- Motion: caught the round pill mid-slide between tabs, and after a jump from Round 5 to
  Round 12 it sat exactly on the active tab.

## Known gaps

- The Played/Scheduled filter was removed along with "All rounds"; a round rarely needs it.
- No venue is shown (the EuroLeague card has one); the games API does not return it.
- The web search for other layouts returned nothing useful, so the design is the two
  screenshots combined.
