# Fix: Home page shows 10 upcoming games and 10 latest results

**Type:** Fix (polish)
**Status:** verified
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## What changed

- `dashboard/UpcomingGames.jsx` and `dashboard/RecentResults.jsx` request 10 games
  instead of 5.
- The upcoming games row (`.games-row` in `index.css`) was a single horizontally
  scrolling row. It is now a wrapping grid (`repeat(auto-fill, minmax(15rem, 1fr))`),
  so 10 games show as 5 columns by 2 rows on a wide screen and fewer columns on
  narrower ones, with no sideways scrolling.
- The results list holds 10 games in two columns, the five newest on the left and the
  next five on the right. It switches by the box's own width (a container query on
  `.games-list-box`), so it stays one column when the box is narrow. The standings
  snapshot beside it still matches its height.

## Verify

- `eslint` and `vite build` pass. The games endpoint returns 10 for E2026.
- Home opened in headless Chromium for E2026: 10 upcoming in a 5 by 2 grid, 10 results in two columns of five,
  standings panel height matches.

## Known gaps

- Checked at 1500px and 1000px wide; the 420px phone layout screenshot was taken but not reviewed.
