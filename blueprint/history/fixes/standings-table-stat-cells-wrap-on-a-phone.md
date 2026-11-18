# Fix: Standings table stat cells wrap on a phone

**Type:** Fix
**Status:** verified
**Branch:** fix/standings-table-stat-cells-wrap-on-a-phone

## The problem

On a 320px phone the Standings page's Overview table (`frontend/src/standings/StandingsTable.jsx`)
breaks the **L10** record over two lines: `7-` on one line, `3` under it.

Checked in the browser at 320px (season E2025, local DB):

- **Root cause.** The table is wider than its scroll box (587px vs 278px). DaisyUI's `.table` is
  `width: 100%`, so the browser shrinks every column to its narrowest possible width. A record like
  `7-3` may break after the hyphen. The L10 header is narrower than the record, so the record breaks.
  Home and Away do not break only because their headers ("Home", "Away") happen to be wider.
- **Rows are taller.** The two-line L10 cell makes each club row about 58px tall instead of 53px
  (the rank circle and crest set the rest of the height).
- **Stray dash.** When the table is scrolled to the end, the wrapped `7-` / `8-` fragment shows as a
  small dash next to the pinned team column.
- **Same risk elsewhere.** A double-digit record such as `10-2` in Home or Away, or a signed figure
  in DIFF or Net rtg, could break the same way. "Net rtg" is a two-word header that can also wrap.

Nothing else on the table is broken at 320px. The pinned rank and crest, the collapse on swipe,
the tier headings and the Form badges all work.

## The fix

Stop the Overview table's stat cells and headers from wrapping. Add `white-space: nowrap` to the
existing phone rule in `frontend/src/index.css` that already sizes those cells
(`.standings-table thead th:nth-child(n + 3)` and `.standings-table tbody tr:not(.tier-row) td:nth-child(n + 3)`).
The table already scrolls sideways, so the extra width scrolls with it.

Must not break:

- The pinned rank and team columns (cells 1–2 are not touched), or the team column collapsing on swipe.
- Tier heading rows (`.tier-row` is excluded by the selector).
- The breakdown tables (Streaks, Margins, Ahead/Behind). They use `.pinned-table` but not `.standings-table`.
- Desktop layout. From xl the table fits its box, so `nowrap` changes nothing there.

## Build steps

- [x] Add `white-space: nowrap` to the `.standings-table` stat-cell rule in `index.css`. Add a test to
   `frontend/e2e/standings-table-layout.spec.js`: at 320, 375 and 639px, every stat header and cell
   in the Overview table is a single line. Check the line count of each cell's text, not
   `findBrokenWords`, because that helper treats a hyphen as a word break.
   **Done when:** at 320px L10 shows `7-3` on one line, rows are back to 53px, no dash shows
   beside the pinned column, and the new test passes.
- [x] (Added on request.) The Overview table's PCT column always shows one decimal: `75` reads `75.0`.
   Format `winPercentage` with the existing `formatDecimal` in `StandingsTable.jsx`; a missing
   value still shows `-`. Add a test that every PCT cell has exactly one decimal.
   **Done when:** the first row of a season with a 9-3 record shows `75.0`, and the test passes.

## Verify

- At 320px open `/E2025/standings` (the Overview table). Scroll sideways: Home, Away, L10, DIFF and
  Net rtg are each on one line, and the rows are compact.
- Swipe: the team column still collapses to the crest, and the rank and crest stay pinned.
- Browser tests: `npx playwright test standings-table-layout.spec.js responsive.spec.js`
  (only after `/api/health` reports `"target":"local"`).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3505,"specSha256":"edddc3a9abc758bad9e3222a95b7571166c804cdf30e8d41202ede48dc25e40f","branch":"refs/heads/fix/standings-table-stat-cells-wrap-on-a-phone","head":"6a8195ab4acff0b324b5cb1cf82bc81eaf7db3ce","baseRef":"refs/heads/master","baseCommit":"6a8195ab4acff0b324b5cb1cf82bc81eaf7db3ce","sourceTree":"8bf49799be836397e15824d409d4987e3842c4cd","absentOptional":[]} -->
