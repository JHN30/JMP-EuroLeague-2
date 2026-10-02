# Fix: Play-by-play rows had no side padding and misaligned scores

**Type:** Fix
**Status:** verified
**Branch:** feature/game-shot-zones (done alongside feature 23h; not run through `/fix` and `/implement`)

Recorded after the work, from the owner's screenshot of the Play-by-play tab.

## The problem

- A scoring row has a tinted background, but the row had no horizontal padding, so its text and the running score
  sat against the very edge of the tint.
- A team crest cell was only rendered when the event had a club. Timeouts, TV timeouts and other game events have no
  crest, so their cells shifted one column to the left in the four-column grid and the running score no longer lined
  up with the score of the rows above and below it.

## What changed

- `frontend/src/games/GameDetailPage.jsx` (`PlayByPlayRow`): `px-3` on every row; the crest cell is always rendered
  (an empty placeholder when there is no crest) in a fixed 1.5rem column; the score cell has a minimum width of 4.5rem
  and stays right-aligned.
- `frontend/e2e/game-play-by-play.spec.js`: a scoring row, a TV timeout without a club and a team timeout, all ending
  at the same right edge and at least 8 px inside the row. The test fails on the previous row code.

## Verify

- `cd frontend && npm run lint`, `npm run build` and `npm run test:browser` (85 tests) pass.
- A live Playwright run of the Play-by-play tab on E2026 game 13 (dark theme) showed the scores in one right-aligned
  column, including the "Game event" and Timeout rows, with room before the edge and no console errors.

## Known gaps

- Mobile widths (below `sm`) hide the crest column by design and were not changed.
