# Fix: Postseason header, default matchup and format cards

**Type:** Fix
**Status:** verified
**Branch:** fix/postseason-header-default-matchup-and-format-cards

This is the first half of the postseason ideas approved on 2026-10-24: the ones that rework what is already on the page.
The other three add something new and come in a second fix:
- a "Games that move the bracket" panel;
- seed arrows against last round;
- a card in the empty space above the Final.

## The problem

On `/:season/postseason` (`frontend/src/postseason/PostseasonPage.jsx`), measured on 2026-27 Round 10 and 2025-26:

- **Two header panels.** The page header says only "SEASON / Postseason". A second panel right under it carries the real
  headline ("Round 10 of 38: the bracket is a projection", or "Olympiacos Piraeus are the champions") and the stage
  steps. Two panels say one thing.
- **A dead line.** Under the bracket, "Select a matchup to see its games." sits alone until a card is clicked, so the space
  looks empty, even on a finished season where the final is the obvious thing to show.
- **"How the postseason works" looks blank.**
  - It is a closed `<details>` with a one-line summary.
  - Opened, it is three or four grey paragraphs in one column with nothing to tell the stages apart.
  - It must keep working for every format: the modern Play-In (2023-24 on), the direct top eight (for example 2016-17), the
    grouped Top 16 (2004-05, 2008-09 and later grouped seasons, with or without quarterfinals) and the elimination series
    (2000-01).

## The fix

All changes stay in `PostseasonPage.jsx` and its tests. There are no data, query or API changes, and no change to the bracket,
the race panel or the champion panel.

1. **One header.** The `PageHeader` carries the status:
   - the kicker is the status kicker ("REGULAR SEASON", "UNDER WAY", "THE SEASON IS OVER", …) and the `h1` stays
     "Postseason";
   - the headline ("Round 10 of 38: the bracket is a projection") is the header's `description`, one line of
     `font-semibold`;
   - the stage steps sit under it inside the same header, full width (a `basis-full` child, since the header row wraps);
   - the separate status panel goes.

   The header uses `PageHeader compact` and the page gap becomes `gap-6 lg:gap-4`, like Home and the Overview. The
   cancelled-season and no-standings headers stay as they are.
2. **A matchup open by default.** When nobody has picked a card, the detail under the bracket shows a default matchup:
   - a series in progress, the one with the latest game; otherwise
   - the latest finished matchup (the Final on a finished season); otherwise
   - the first matchup with both clubs known, for example the projected 1 v 8 during the regular season, which already shows
     the two clubs, "Projected from the current standings" and the Compare button.

   The default card is highlighted as selected. Opening the page does not scroll to it; only a click scrolls the detail
   into view, as today. A season switch clears the pick, so the new season shows its own default. When no matchup has
   two clubs, nothing shows: the "Select a matchup to see its games." line goes.
3. **"How the postseason works" as stage cards.**
   - It becomes an always-open `Panel` with a compact `PanelHeader` (kicker "FORMAT", title "How the postseason works").
   - Inside, one card per stage in a grid: one column on a phone, two from 640px, and one row from 1024px. Each card shows
     its number, the stage name and the existing paragraph for that stage. The wording is unchanged and only split per
     stage:

     | Format | Cards |
     |---|---|
     | Play-In seasons | Regular season · Play-In · Playoffs · Final Four |
     | Direct top eight | Regular season · Playoffs · Final Four |
     | Grouped, with quarterfinals | Regular season · Top 16 · Quarterfinals · Final Four |
     | Grouped, winners to the Final Four | Regular season · Top 16 · Final Four |
     | Elimination series | Regular season · Knockout rounds |

   - The elimination season's two knockout paragraphs share its one card.

Must not break:
- the bracket and elimination grid, the club focus, and clicking a matchup to open it;
- the champion panel, the race panel and the loading-issues notes;
- the grouped and elimination notes with their standings links;
- no sideways page scroll at any width.

## Build steps

- [x] **Header and default matchup.** Make changes 1 and 2. Update the tests:
  - `responsive.spec.js`: Postseason's header gap is 16px from 1024px, like Home's.
  - `grouped-postseason.spec.js` "season switches clear matchup detail and club focus": after switching to 2013, the
    detail shows 2013's own default matchup, not 2012's E1 v F4, and not the removed line.
  - `postseason-layout.spec.js`: add a check that 2025-26 opens with the Final in the detail, and that 2026-27 opens
    with a projected matchup and no "Select a matchup" line.

  *Done when:*
  - one header panel carries the status and the steps;
  - 2025-26 opens on the Final;
  - 2026-27 opens on a projected matchup;
  - clicking another card still switches the detail and scrolls it into view.
- [x] **Format cards.** Make change 3. In `grouped-postseason.spec.js`, read the format panel without clicking a
  `<details>` summary.

  *Done when:* each format in the table shows its cards in order, with nothing cut and no sideways scroll at 390px and
  1440px. Check 2026, 2016, 2012 (grouped with quarterfinals), 2004 (winners to the Final Four, if that is its format)
  and 2000.

## Verify

- Open `/2025/postseason`:
  - one header reads "THE SEASON IS OVER / Postseason / Olympiacos Piraeus are the champions" with the four ticked
    steps;
  - the Final is open under the bracket;
  - the format cards sit in one row on desktop.
- Open `/2026/postseason`: the header shows "Round 10 of 38: the bracket is a projection", and a projected matchup is open.
- Open `/2016`, `/2012`, `/2004` and `/2000` postseason: each shows its own format cards, and a matchup is open.
- With `/api/health` reporting `"target":"local"`:
  `cd frontend && npx playwright test postseason.spec.js postseason-layout.spec.js postseason-clinch.spec.js grouped-postseason.spec.js responsive.spec.js`

## Result

- Checked at 1440px:
  - 2025-26 opens on its Final, highlighted in the bracket.
  - 2026-27 opens on its projected 1 v 8.
  - 2000-01 opens on its final series.
- Format cards found:

  | Season | Cards |
  |---|---|
  | 2025 and 2026 | Regular season · Play-In · Playoffs · Final Four |
  | 2016 | Regular season · Playoffs · Final Four |
  | 2012 and 2004 | Regular season · Top 16 · Quarterfinals · Final Four (2004 has quarterfinals) |
  | 2000 | Regular season · Knockout rounds |

- Page heights:
  - 2025-26 at 1440px: 1583 → 1685px. The Final's detail and the always-open cards replace the empty line and the
    closed summary.
  - 2026-27 at 390px: 3468 → 3918px, for the same reason.
- Known, left as it was: on 2000-01 the open final's eyebrow reads "FINAL · FINAL", because the stage and the matchup are
  both named "Final". It read the same before whenever that card was clicked.
- Tests:
  - `postseason-layout.spec.js`: a new header and default matchup test (2025, 2026 and a click on 4 v 5), and a
    format-cards test for 2026, 2016, 2012 and 2000 at 1440 and 390px.
  - `grouped-postseason.spec.js`: the season-switch test expects 2013's own Final, and the format check reads the list
    without clicking.
  - `responsive.spec.js`: Postseason's header gap is 16px from 1024px.
  - All passed: 28 in the four postseason specs, and 6 Postseason runs of `responsive.spec.js`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7674,"specSha256":"6093072c613aee1c8bef3e295008f32194462a08f9152e2c92b6383bf2348a14","branch":"refs/heads/fix/postseason-header-default-matchup-and-format-cards","head":"1b1b589df25717ae5f736bac280a1bf55daa1dd4","baseRef":"refs/heads/master","baseCommit":"1b1b589df25717ae5f736bac280a1bf55daa1dd4","sourceTree":"ce205a18761c2f7a498a970f8d2f4b889b577cc7","absentOptional":[]} -->
