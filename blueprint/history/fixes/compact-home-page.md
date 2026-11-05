# Fix: Compact home page

**Type:** Fix
**Status:** verified
**Branch:** fix/compact-home-page

## The problem

The home page (`/:season/home`, `frontend/src/dashboard/`) has two side-scrolling rows on a phone and wastes some room on
a desktop. Measured on 2026-27 Round 10: the page is 2309px tall at 1440×900 and 3119px at 390×844.

- **Upcoming games (phone).** Below 640px the ten games are a sideways swipe row of 85%-wide cards. Reaching the last
  game means swiping through all ten. Latest scores, right below it, already shows five stacked cards and a
  "Show 5 more" button, which works better.
- **Player leaders (phone).** Below 640px the four leader cards (Points, Rebounds, Assists, PIR) are also a sideways
  swipe row. The four team cards just above them (Leader in wins, In-form team, Best offense, Best defense) sit two by
  two with nothing to swipe.
- **Desktop room:**
  - Every panel heading takes two lines (the kicker, then the title), and the page header is tall for one line of text.
  - The gaps between sections are `gap-6`.
  - The team cards are 149px tall with roughly 100px crests.
  - The league table's 20 rows are 35px each, so only 13 fit beside Latest scores and the rest scroll inside the panel.
  - The form chart is about 290px of plot, inside a 488px panel.

## The fix

All changes stay in `frontend/src/dashboard/` and the home page's own CSS classes (`games-row`, `leaders-row`,
`kpi-strip-4`, `leader-trend*`, `games-list*`). Each of these classes is used only by the home page and its skeleton.
Shared components change only through opt-in props that already exist: `PageHeader compact` and `PanelHeader compact`.
There are no data, query or API changes, and nothing is removed from the page.

### Phone (below 640px)

1. **Upcoming games: five, then "Show 5 more".**
   - Below 640px the schedule becomes a vertical list like Latest scores: the first five games stacked, then a full-width
     ghost button "Show 5 more" (or "Show N more" when fewer than ten games are scheduled). The button expands to all
     ten and then reads "Show fewer".
   - Reuse Latest scores' pattern: `match-card-extra` hides cards 6 to 10, the button has `aria-expanded` and
     `aria-controls`, and it shows only below `sm`.
   - From 640px the grid that shows all ten stays as it is.
   - The swipe-row code goes: the `tabIndex` handling for the swipe and the `games-row` scroll-snap rules. The list keeps
     `role="group"` and its "Upcoming games" label, which name it for screen readers and the layout tests.
   - The loading skeleton for Upcoming games follows the new phone layout, with five stacked cards below 640px.
2. **Player leaders: two by two like the team cards.**
   - Below 640px the four leader cards sit in a 2×2 grid with no sideways scroll, laid out like the team cards: the
     photo above the label, name, club and value.
   - The photo is smaller, so the cards stay about as tall as the team cards.
   - When a season shows two phases (Regular Season and a postseason phase), each phase is its own 2×2 grid under its
     heading, as today.
   - From 640px the current layout stays: two columns, then one row of four from 1024px.
   - The swipe handling goes, and so does the skeleton's swipe row.

### Desktop (from lg, 1024px), compact

3. **Headings.** The page header uses `PageHeader compact`. Every home panel heading uses `PanelHeader compact`, so the
   kicker and the title share one line. `WidgetPanel` passes `compact` to its `PanelHeader`, and only home uses
   `WidgetPanel`. The gaps between sections go from `gap-6` to `lg:gap-4`.
4. **Team cards.** In `kpi-strip-4`, from lg the crest is smaller (about 3.5rem) and the padding is tighter. The four cards
   stay in one row from xl and two by two below it.
5. **League table.**
   - Tighter rows at every width: crests go from 32px to 24px and the row gap from `space-y-2` to `space-y-1`, keeping
     the current text size.
   - The table still matches the Latest scores panel's height and scrolls inside when its rows do not fit.
   - Grouped seasons keep their per-group lists.
6. **Form chart.** From lg the plot is about 12rem tall, with the same points, axis labels, average line and caption.
   Below lg the chart keeps its current size. Built by drawing the chart on a lower canvas from lg (56 units tall instead
   of 90): a CSS height cap would stretch the dots into ovals.

7. **Form chart caption → tip** (added after review). The sentence under the chart moves into a hover/focus tip
   (`HeaderTip`) on the "Avg point diff, last N" label. The skeleton drops its caption lines.
8. **Qualification lines in the league table** (added after review). A coloured line runs under the last place of each
   qualifying tier, taken from the season's format with `tableTiers`, the same source as the Standings page:
   - green under the last Playoff place and amber under the last Play-In place (6th and 10th now; 8th in the
     direct-eight seasons; 2nd in each Top 16 group);
   - per group in a grouped table;
   - no lines when the format gives none (for example the cancelled 2019-20);
   - a screen-reader note ("Last Playoff place") on that row, and a one-line legend under the table naming only the tiers
     that are drawn ("Playoff places", "Play-In places", or "Top 16" / "Final Four" places in older formats).

Must not break:
- the round heading and status line;
- Latest scores' five-plus-button layout on a phone;
- the league table matching the results height and scrolling inside;
- grouped seasons such as 2004, and a season with two leader phases;
- the 2004 leader card's silhouette;
- links from the team cards, leader cards and match cards;
- no sideways page scroll at any width.

## Build steps

- [x] **Phone: schedule and player leaders.** Make changes 1 and 2, including the skeletons. In
  `frontend/e2e/home-layout.spec.js`:
  - replace the "swipe rows below 640px" tests for Upcoming games and Leaders with: five upcoming games and a
    "Show 5 more" button that reveals all ten below 640px, all ten with no button from 640px, and the leaders as a 2×2
    grid with no sideways scroll at 390px;
  - keep the "rows from 640px" checks.

  *Done when:* at 390px neither the schedule nor the leaders scroll sideways, the button shows and hides games 6 to 10,
  and the updated specs pass.
- [x] **Desktop: compact.** Make changes 3 to 6.

  *Done when:* at 1440×900 the panel headings are one line, the team cards and the form chart are visibly shorter, more
  league-table rows show beside Latest scores than the 13 today, and the page is clearly shorter than 2309px. Measure
  the new page height and report it.

- [x] **Caption tip and table lines.** Make changes 7 and 8, and update `home-form-chart.spec.js`: the caption is gone
  and the tip text shows when the label is focused.

  *Done when:* there is no caption under the chart, the tip shows on hover or focus, and the lines sit at 6/10 (2026-27),
  at 8 (2016-17), per group at 2 (2004-05, 2008-09), and nowhere for 2019-20.

## Verify

- Open `/2026/home` at 390px:
  - the schedule shows five games and "Show 5 more" reveals five more;
  - the player leaders sit two by two like the team cards;
  - nothing scrolls sideways.
- Open it at 1440px: one-line panel headings, smaller team cards, a shorter form chart, tighter league table rows.
- Open `/2004/home`: grouped tables, and the leader card without a photo still shows its silhouette.
- With `/api/health` reporting `"target":"local"`:
  `cd frontend && npx playwright test home-layout.spec.js home-round-status.spec.js home-form-chart.spec.js responsive.spec.js`

## Result

- At 1440×900 the page went from 2309px to 1973px, then to 1945px once the chart caption became a tip. Upcoming 342→312, table and scores 681→651, team cards 149→105,
  leaders 259→229, form chart 488→340. The league table now shows 17 rows before it scrolls, up from 13.
- At 390px the page went from 3119px to 3749px (3683px after the caption change). That growth is expected: the five stacked games and the 2×2 leader cards
  take the room the swipe rows used to hide. Nothing scrolls sideways.
- Tests changed:
  - `home-layout.spec.js`: the swipe tests are replaced, and the Latest scores button checks now look only inside their
    own panel, since Upcoming games has the same button.
  - `responsive.spec.js`: Home's header gap is now 16px from 1024px, as on the team page.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8450,"specSha256":"268b0e6685e401d406cfa0cebaf7bc3f424f1ad25ec88d284c0d39857ac72720","branch":"refs/heads/fix/compact-home-page","head":"92045f5eff41b3c3e50a09d80c8cf32fa8173596","baseRef":"refs/heads/master","baseCommit":"92045f5eff41b3c3e50a09d80c8cf32fa8173596","sourceTree":"7192d968ae5b2512a71fe6205836d50fd3a266dd","absentOptional":[]} -->
