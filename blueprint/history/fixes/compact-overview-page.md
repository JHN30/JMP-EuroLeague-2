# Fix: Compact overview page

**Type:** Fix
**Status:** verified
**Branch:** fix/compact-overview-page

## The problem

The Season overview (`/:season/overview`, `frontend/src/season/SeasonOverviewPage.jsx`) is the last page without the light
compaction Home and the other pages got, and it still has a sideways swipe row on a phone. Measured on the local database:

| Season | 1440×900 | 390×844 |
|---|---|---|
| 2026-27 (live, Round 10) | 1929px | 2377px |
| 2025-26 (finished) | 2696px | 2999px |

- **Season leaders (phone).** Below 640px each phase's six leader cards (Points, Rebounds, Assists, Steals, Blocks, PIR) are
  a swipe row of 85%-wide cards, the same pattern Home just dropped. A finished season has two of these rows.
- **Headings and gaps.**
  - Every panel heading takes two lines: the kicker, then the title.
  - The page header is tall for one line of text.
  - The sections sit `gap-6` apart.
- **Phase story (phone).** The four phase cards stack at full padding with `gap-4`, which takes 656px at 390px.
- **Scoring chart.**
  - The plot is 256px tall at every width.
  - The line "Average points per team, by round" sits under it as a separate caption.
- **Road to the title (desktop).** Each defeated opponent is its own full-width row (about 64px with its gap), so the panel
  is 460px tall at 1440px for three short lines.

## The fix

All changes stay in `SeasonOverviewPage.jsx`, `OverviewSkeleton.jsx` and the overview-only CSS (`season-leaders-grid`).
Shared components change only through opt-in props that already exist: `PageHeader compact` and `PanelHeader compact`.
There are no data, query or API changes, and nothing is removed except the chart caption, whose words move onto the chart.

### Phone (below 640px)

1. **Leaders two by two, like Home.**
   - Below 640px each phase's six leader cards form a two-column grid, three rows of two, with no sideways scroll.
   - The cards use Home's phone leader layout: the photo sits above the label, name, club and value, and it is smaller.
   - From 640px the current layout stays: two columns, then three from 1280px.
   - The swipe code goes: the `tabIndex`/`useMediaQuery` handling in `PhaseLeadersGroup`, and the scroll-snap and bleed
     rules on `season-leaders-grid`.
   - The group keeps `role="group"` and its "… leaders" label.
   - The page skeleton's leaders block follows the grid.
2. **Tighter phase story.** Below 640px the phase cards use `p-3` and a `gap-3` between them. They stay one per row, since
   the Regular Season description is too long for half a phone width. From 640px the cards are unchanged.

### Every width, compact headings (from lg)

3. **Headings and gaps.**
   - The page header uses `PageHeader compact`.
   - Every overview panel heading uses `PanelHeader compact`, including the Phase story heading outside a panel, so the
     kicker and the title share one line from lg.
   - The page's section gap goes from `gap-6` to `gap-6 lg:gap-4`, and so does the gap between the two leader phases.
   - The skeletons follow the same gaps.

### Desktop (from lg, 1024px)

4. **Scoring chart.**
   - From lg the plot is 13rem tall instead of 16rem (`h-64 lg:h-52`). It is a Chart.js canvas that redraws to its box,
     so the points stay round.
   - The caption under it goes. Its words become the chart's y-axis title, "Points per team", next to the existing x-axis
     title.
5. **Road to the title in a row.**
   - From lg the defeated-opponent steps sit side by side, as many per row as fit at about 15rem each (three or four in
     every format), instead of one per line.
   - At every width the step cards use `p-3` and the list uses `gap-2`.
   - The champion banner stays as it is.
   - Below lg the steps stay one per line.

Must not break:
- the hero cards side by side, and their links to the leading club;
- the season-status panels (finished, cancelled, not started) and the loading-issues note;
- the defining games' crest and name rules at every width;
- the scoring chart's highest, lowest and latest boxes and its Postseason divider;
- the 2004 leader card's silhouette;
- leader names not cut mid-word;
- every road-to-the-title opponent shown in full;
- no sideways page scroll at any width.

## Build steps

- [x] **Phone: leaders and phase story.** Make changes 1 and 2, including the skeleton. In
  `frontend/e2e/overview-layout.spec.js`, replace the "swipe rows below 640px" test with: below 640px each leaders group
  is two columns with no sideways scroll (at 320 and 390). Keep the "two columns, then three from 1280px" test.

  *Done when:* at 390px no leaders group scrolls sideways, six cards sit three rows by two, and the phase cards are visibly
  tighter.
- [x] **Compact headings, chart and road to the title.** Make changes 3 to 5, and update the tests:
  - `responsive.spec.js`: Overview's header gap is 16px from 1024px, like Home and the team page.
  - `overview-layout.spec.js`: at 1280px the road-to-the-title steps of 2025-26 sit in one row.

  *Done when:*
  - at 1440px the panel headings are one line, and the chart has its y-axis title and no caption under it;
  - the road-to-the-title steps sit side by side;
  - both seasons' pages are clearly shorter than 1929px and 2696px at 1440px.

  Measure the new heights at both widths and report them.

## Verify

- Open `/2026/overview` and `/2025/overview` at 390px. The leaders sit two by two with no sideways scroll, and the phase
  cards are tighter.
- Open both at 1440px:
  - the headings are on one line;
  - the scoring chart is shorter, with "Points per team" on its axis;
  - in 2025-26 the three road-to-the-title steps sit in one row.
- Open `/2004/overview`: the leader card without a photo still shows its silhouette, and the grouped season's hero reads
  "Most wins · any group".
- With `/api/health` reporting `"target":"local"`:
  `cd frontend && npx playwright test overview-layout.spec.js responsive.spec.js`

## Result

| Season | 1440×900 | 390×844 |
|---|---|---|
| 2026-27 (live) | 1929 → 1676px | 2377 → 2777px |
| 2025-26 (finished) | 2696 → 2225px | 2999 → 3797px |

- Desktop sections at 1440px (2025-26):
  - header 96→80;
  - phase story 222→192;
  - leaders 771→732;
  - defining games 300→270;
  - scoring chart 485→387;
  - road to the title 460→250.
- The phone pages grow because the leader cards the swipe row used to hide now show, three rows of two per phase. The cards
  are the same size as Home's phone leader cards (175–195px), and the phase story is 656→612px. Nothing scrolls sideways.
- Tests changed:
  - `overview-layout.spec.js`: the leaders swipe test is replaced with a two-by-two check at 320 and 390px, and a new
    test checks that the road-to-the-title steps sit in one row from 1024px and one per line at 390px. It measures the
    step cards, because a long opponent name wraps and its centred text sits lower.
  - `responsive.spec.js`: Overview's header gap is 16px from 1024px.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6980,"specSha256":"0f686594404a3699ca42e935b86e53f75db1c906eebbc029056ef045f45ab459","branch":"refs/heads/fix/compact-overview-page","head":"2c7679d853ba6b345dda08ce679d5cc28ba3a13a","baseRef":"refs/heads/master","baseCommit":"2c7679d853ba6b345dda08ce679d5cc28ba3a13a","sourceTree":"aeea4ecb82dc60bfed831682c04100b63026b39c","absentOptional":[]} -->
