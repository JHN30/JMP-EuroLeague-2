# Fix: Score differential chart redrawn as a lead tracker over game time

**Type:** Fix
**Status:** verified
**Branch:** fix/score-differential-chart (not run through `/fix` and `/implement`)

Recorded after the work, from the owner's screenshot of the Game flow tab and, after the first redraw, the NBA lead
tracker as the reference.

## The problem

- The chart drew one point per scoring play, spaced evenly, so a quarter with many baskets was wide and a quiet one
  narrow, and the line slanted between plays although the margin only changes at a scoring play.
- Each line segment took its colour from the sign of its end point, so a segment that crossed zero was one colour all
  the way, and the fill under it did not split where the lead changed hands. That is the odd behaviour when the lead
  changes.
- It was not clear which side a positive margin favoured, and the period lines and labels sat at the first scoring play
  of each period.

## What changed

- `frontend/src/games/gameFlowData.js`: `elapsedSeconds` and `buildMarginSeries` build the margin as a step series over
  elapsed game seconds (tip-off at 0-0, a point at each scoring play, held to the end of the last period).
- `frontend/src/games/rotations.js`: `periodStart` is exported so both use one definition of period times.
- `frontend/src/games/gameFlow.jsx` (`ScoreFlowChart`), laid out like the NBA lead tracker: one solid bar per stretch of
  play from the tie line to the margin, drawn as plain rectangles by a small `leadBarsPlugin` (a stepped, outlined line
  with a fill showed stray lines at every lead change and in tight games), no outline,
  green when the home side leads and red when the road side leads (no club colours exist in the data), split exactly at
  the tie line; a symmetric axis in steps of 5 (10 beyond a 30-point lead) with zero always a tick and dotted gridlines;
  each team's three-letter code at its end of the axis and its crest as a faint watermark in its half; dotted lines
  between periods and one label per period; the tooltip names the scoring play ("Q2 01:59 · 45-30") and the leader,
  and "Tip-off" / "End of game" at the ends. The canvas plugin uses the resolved theme text colour (it was invisible in
  the dark theme). The panel title is "Lead tracker" and the chart is taller (h-80, compact h-52).

## Verify

- Through `tsx` on E2026 game 13: the series is non-decreasing in time, ends at +7 (the 94-87 final) at 2,400 s and
  peaks at +20, matching the page's biggest lead; the first basket is at 19 s.
- `cd frontend && npm run lint`, `npm run build` and `npm run test:browser` (85 tests) pass; the existing tests do not
  inspect the canvas.
- Live Playwright runs of the Game flow tab on E2026 games 13 and 5, dark and light themes, with a hover tooltip: no
  console errors.

## Known gaps

- The chart itself is canvas and has no browser test; the series is checked by a scratch script, not a committed test.
- A game whose clock is missing on some plays places those plays at the previous play's time.
- Real club colours are not available (the data has names and crests only); a crest that fails to load is simply
  left out of the watermark.
