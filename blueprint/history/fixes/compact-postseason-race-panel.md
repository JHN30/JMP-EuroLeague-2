# Fix: Compact postseason race panel

**Type:** Fix
**Status:** verified
**Branch:** fix/compact-postseason-race-panel

## The problem

The "Race for the bracket" panel on `/<season>/postseason` (`frontend/src/postseason/RacePanel.jsx`, shown during the
regular season for Play-In and direct-top-eight formats) carries more text than it needs:

- a long intro paragraph under the heading ("Top 6: straight to the Playoffs. Ranks 7 to 10: the Play-In. Every club
  that can still get a place is listed (20 of 20), with 28 to 29 games left per club. The margin is…"). The format is
  already explained in "How the postseason works" at the bottom of the page;
- an "Against 7th: FC Barcelona (6-3). FC Barcelona has 1 game in hand on 1 of them." line under each zone title;
- roomy rows: the Chasing column (up to 10+ clubs) runs far taller than Playoffs (6) and Play-In (4).

## The fix

All changes stay inside `RacePanel.jsx`; no shared component, data or API changes.

1. **Drop the intro paragraph.** The panel keeps the `THE RACE` eyebrow and the "Race for the bracket" heading, then
   the zone grid.
2. **Drop the per-zone "Against …" line.** Remove `referenceText` and `gamesLeftText` (no longer used).
3. **Reference club as a header tooltip.** The `vs 7th` column header gets a `title` naming the club it is measured
   against, in one wording for every zone: "Wins against FC Barcelona, 7th (6-3)" or "Wins against Zalgiris, 10th
   (5-4)". The visible header text stays `vs 7th`, so the specs' column-header checks still match.
   Per-row "N games in hand" under a margin stays as it is.
4. **Tighter rows.** Use `table-xs` row padding and 20px (`h-5 w-5`) crests instead of `table-sm` and 24px, keeping
   the same columns, badges and mobile padding rules.
5. **Shorter status line.** When no club has a badge: "No club has clinched or been knocked out yet." (or "No club has
   clinched yet." when some are out). The "Out of the race (n): …" line stays.

Must not break: the zone headings (`Playoffs 1-6`, `Play-In 7-10`, `Chasing 11-20`), the `vs Nth` column headers,
the clinch badges, the direct-top-eight two-zone layout, and the phone layout.

## Build steps

- [x] **Compact the panel** - apply changes 1-5 in `RacePanel.jsx` and update
   `frontend/e2e/historical-direct-eight.spec.js:154`, which checks the removed "Top 8: straight to the Playoffs" text,
   to rely on the existing `Playoffs 1-8` heading check instead.
   *Done when:* the panel shows no intro or "Against" text, the `vs Nth` header shows the reference club on hover,
   rows are visibly tighter, and the specs below pass.

## Verify

- Open `/2025/postseason` (or the current season mid-regular-season): heading, then three zone tables directly; hover
  `vs 7th` / `vs 11th` / `vs 10th` to see the reference club; rows tighter than before.
- Open `/2016/postseason`: two zones (`Playoffs 1-8`, `Chasing`), `vs 9th` header, no Play-In text.
- With `/api/health` reporting `"target":"local"`:
  `cd frontend && npx playwright test postseason.spec.js postseason-layout.spec.js postseason-clinch.spec.js historical-direct-eight.spec.js responsive.spec.js`


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3146,"specSha256":"a8adc70d723d5df9174486bcd8c07cc87818150ac987b002c604c6493a9a0d61","branch":"refs/heads/fix/compact-postseason-race-panel","head":"05d64c451ad025cbdae387bd9e723ab5c75a39c8","baseRef":"refs/heads/master","baseCommit":"05d64c451ad025cbdae387bd9e723ab5c75a39c8","sourceTree":"a6fc89ea91bef5dbeda41fd8043b98cd3ebc8dad","absentOptional":[]} -->
