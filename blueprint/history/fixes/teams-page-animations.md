# Fix: Teams page - Motion animations

**Type:** Fix (polish)
**Status:** verified
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

The main Teams page (the grid of club cards) appeared all at once and the cards did not
react to the pointer, unlike the dashboard, Games and season overview pages, which already
use Motion.

## What changed

- `teams/TeamsPage.jsx`: the club grid is now a `motion.ul` using the shared presets from
  `lib/motion.js`, and no new presets were added. Cards fade and rise in a short stagger
  (`listContainer`/`listItem`), the crest pops in a beat after its card (`centerPop`), and
  cards lift 3px on hover and press in slightly (`cardHover`). Each card link is a
  `motion.create(Link)`. The markup and classes are otherwise unchanged. The existing
  app-wide `<MotionConfig reducedMotion="user">` covers reduced-motion users.

## Verify

- `eslint` and `vite build` pass.
- Headless Chromium on E2026 at 1300px with the real backend: 20 cards, opacity sampled
  at 0, 150 and 400 ms shows the stagger rolling across the grid, all cards fully opaque
  once settled, hover lifts a card about 3px, no page errors.

## Known gaps

- The Team detail page is not covered here; it is the next part of the Teams work.
