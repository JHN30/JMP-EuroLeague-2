# Fix: Compare head-to-head page compaction and new records

**Type:** Fix
**Status:** verified
**Branch:** fix/compare-head-to-head-page-compaction-and-new-records

## The problem

The all-time Head-to-head page (`comparisons/HeadToHeadPage.jsx`, `/:season/compare/head-to-head?teamA=…&teamB=…`)
uses space poorly and shows little beyond the series record.

| Part | What is wrong |
|---|---|
| Hero + four-card strip | The series record shows twice. The strip's streak repeats the Momentum panel's line. |
| Meeting margin + Series momentum | A 256px chart sits beside a panel of three small figures, which leaves most of that panel empty. |
| Notable meetings | Six unlabelled lines such as "Biggest margin: 90-60 (E2023)". They give no teams and no winner. |
| Season breakdown | A plain "2 meetings, 1-1" text list. |
| History | Every meeting ever played is a tall bordered card, listed oldest first under the title "Upcoming and latest meetings". |

## The fix

These are frontend changes only, in `comparisons/HeadToHeadPage.jsx` and `HeadToHeadSkeleton.jsx`. They use the
meetings the page already loads (`fetchMergedMatchups`). There are no API, query-key or address changes.

The rules for counting stay the same:
- The series record, streaks and runs count a recorded forfeit.
- Points, margins, averages and close games use real games only (`isForfeit`).
- Every figure reads from Team A's side, so the swap button flips them.

1. **One slim header.** This replaces `Hero` and `SummaryGridStrip`.
   - From `sm`: Team A's crest and full name on the left, Team B's mirrored on the right, and the big record between
     them with "N meetings" under it.
   - One line of figures under that:
     - average score for each club (for example "MAD 84.1 · PAN 80.3");
     - average margin;
     - the current streak (TV code below `sm`, abbreviated name from `sm`, as now).
   - Below `sm`: the crests and codes over the record, then the figures in a two-by-two grid.
2. **Last-10 form strip**, in the header's last line.
   - The last 10 played meetings, oldest first. Each is a small chip with the winner's TV code, coloured like the
     margin chart: primary when Team A won, error when Team B won.
   - Each chip links to its game and has the season, round and score in its title and aria-label.
   - With fewer than 10 meetings, it shows those there are.
3. **Records by type of game**, a new panel that replaces `MomentumPanel`.
   - Aligned rows: label, then the record from Team A's side (A wins-B wins), then the number of games. The club with
     more wins in a row is marked.
   - Stage rows, shown only for stages where the clubs met:
     - Regular season (`RS`);
     - Top 16 (`TS`);
     - Play-in (`PI`);
     - Playoffs (`PO`);
     - Final Four (`FF`).
   - Venue rows: "At <A>", "At <B>", and "Neutral (Final Four)". Neutral is shown only when there is a Final Four
     meeting.
   - "Close games (≤5)", counting real games only.
   - "Longest run": each club's longest winning streak in the series, for example "MAD 6 · PAN 4".
4. **Shorter margin chart.**
   - The plot drops from `h-64` to about 160px (`h-40`).
   - The explanatory paragraph becomes a `HeaderTip` on the title.
   - The chart's colours, tips and label thinning are unchanged.
5. **Notable meetings** as four labelled rows:
   - "Biggest <A> win" and "Biggest <B> win", each with its margin;
   - "Highest scoring" and "Lowest scoring", each with its total.
   - Each row shows the season and round, then the score as "A-code scoreA-scoreB B-code" with the winner bold, and
     links to the game.
   - A club with no win shows "—". Forfeits are left out.
6. **Season breakdown as aligned rows.**
   - One row per season they met in:
     - the season label;
     - the record from Team A's side;
     - one W/L dot per meeting, in date order, coloured like the form chips, each with its game in a title;
     - tags for "Playoffs a-b" (that season's playoff games from Team A's side) and "Final Four".
   - Columns line up between rows, and the list fits at 320px.
7. **History, newest first, as compact rows.**
   - The title becomes "Meetings".
   - Upcoming games come first, soonest first. Played games follow, newest first.
   - Each row is one line from `sm`:
     - date;
     - season and stage/round;
     - Team A's venue tag (H, A or N);
     - "A-code scoreA-scoreB B-code" with the winner bold, or the forfeit label as now;
     - the winner's margin.
   - Below `sm` each row has two lines. Rows are at least 44px tall to tap.
   - The upcoming games and the latest 10 played are shown. The rest fold behind a "Show all N meetings" button, which
     becomes "Show fewer". The button is not shown when there are 10 played games or fewer.
8. **Layout**, top to bottom:
   - the pickers;
   - the header with its form strip;
   - Records by type of game beside Meeting margin from `lg`;
   - Notable meetings beside Season breakdown from `lg`;
   - Meetings.
   - Changed while building: Notable meetings sits under Meeting margin in the right column, beside Records. Season
     breakdown is full width, with its rows in two columns from `lg` (in date order down each column). With 18 seasons,
     the breakdown beside Notable meetings left a tall empty stretch.
10. **Changed while building.**
    - Team B's colour is the theme's secondary, not error, in the chips, the dots and the margin chart's bars. In the
      light theme primary and error are both orange-red and could not be told apart.
    - The header keeps "N completed meetings", since upcoming games are listed too.
    - An upcoming meeting's row shows "Upcoming · <time>" instead of repeating its date.
9. **Skeleton.** Update `HeadToHeadHistorySkeleton` to match the new layout: the slim header with its strip, the two
   two-column rows, and about 10 history rows. The whole-page skeleton keeps using it.

The following must not break:
- the pickers, swap and URL parameters;
- the loading, error, empty and nothing-chosen states;
- a club absent from some seasons (404 TEAM_NOT_FOUND treated as no games);
- forfeit handling;
- links to each game;
- both themes, keyboard focus, and no sideways scroll at 320px.

11. **Requested after review.**
    - **Pickers in the header.** The separate picker panel goes. Each club's select sits in the series header beside
      its crest, in place of the big name, with the record and the swap button between them. Below `sm` they stack:
      Team A, the record with the swap button, then Team B. With no pair chosen, or while loading, the header holds
      only the pickers (and a placeholder for the figures while loading).
    - **Records as split bars.** Each record row shows A's wins, a bar split between the two clubs (primary for A,
      secondary for B), B's wins, then the games. The rows are grouped under small "By stage", "By venue" and
      "Other" labels, and the column heads show each club's crest and code in its colour. The row's meaning is read
      out as one sentence.
    - **Chart fills its column.** Records sit beside Meeting margin from `lg`, and the chart grows to the records'
      height (at least 160px). It stays 160px below `lg`.
    - **Notable meetings as cards.** Four cards across the full width from `lg` (two from `sm`, one below): the label,
      both crests and codes around a big score with the winner in its colour, then the season, round and margin or
      total.
    - **History as a scoreboard.** The score sits in a centred column, A's name and crest right-aligned to it and
      B's crest and name left-aligned, so the scores line up down the list. Each side uses that season's crest.

## Build steps

1. [x] **Header, form strip, records panel and shorter chart** (items 1 to 4, and the layout in item 8).
   - Done when the record shows once in a slim header with the averages, streak and last-10 chips.
   - Done when Records by type of game shows the stage, venue, close-game and longest-run rows for a real pair (for
     example Real Madrid vs Panathinaikos on the local DB).
   - Done when the margin plot is about 160px tall.
2. [x] **Notable meetings, Season breakdown and history** (items 5 to 7).
   - Done when the notable rows name each side's biggest win and the highest- and lowest-scoring games, with winners.
   - Done when the seasons are aligned rows with dots and playoff/Final Four tags.
   - Done when the history is newest first, compact, and folds after the latest 10.
   - Record the page height at 1440 and 390 before and after.
   - Result (Real Madrid vs Panathinaikos, 44 meetings): 2,132px at 1440 (from 4,089) and 3,207px at 390 (from 5,909).
3. [x] **Skeleton and browser specs** (item 9). Update `e2e/head-to-head-layout.spec.js` and `e2e/head-to-head.spec.js`
   (the strip test, the margin chart and meetings test, and the Season breakdown test). Add checks for:
   - the record shown once;
   - the form chips (count and links);
   - the Records by type of game rows matching the mocked meetings;
   - the notable rows' winners;
   - newest-first history with the fold and "Show all";
   - no sideways scroll at 1280, 1024, 640 and 320.
   - Done when the specs pass on the local DB.

4. [x] **Requested changes** (item 11), with the specs updated for the merged header, the records rows and the
   notable cards.
   - Done when the picker panel is gone, the records have split bars, the notable meetings are cards, and the
     history scores line up, with the head-to-head specs passing on the local DB.
   - Result (Real Madrid vs Panathinaikos): 2,258px at 1440 and 3,698px at 390. The page is taller than after step 2
     because the chart now matches the records' height and the notable cards stack below `sm`. It is still well under
     the original 4,089px and 5,909px.
   - Changed while building: between 640 and 1024px the history's date and round columns are narrower, and the club
     names cut off with an ellipsis rather than wrapping. Below 640px the records' column heads show codes without
     crests.

## Verify

- On the local DB (`/api/health` reports `"target":"local"`), run
  `cd frontend && npx playwright test head-to-head.spec.js head-to-head-layout.spec.js responsive.spec.js`.
- Then `npm run lint` and `npm run build` in `frontend`.
- In the browser, open `/2026/compare/head-to-head?teamA=MAD&teamB=PAN`:
  - one slim header with the averages, streak and last-10 chips;
  - Records by type of game beside a shorter margin chart;
  - labelled notable meetings with winners;
  - aligned season rows with dots and tags;
  - newest-first meetings, folded after 10.
- Press swap and confirm every figure flips sides.
- Check 390 and 320, and both themes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10888,"specSha256":"091c569e99bcaa66b45760d61b0f7cfa0753b1a08798162a5f56bbb91e4cd0f1","branch":"refs/heads/fix/compare-head-to-head-page-compaction-and-new-records","head":"64371c811ce5ab528f42048514700646a56c9b9f","baseRef":"refs/heads/master","baseCommit":"64371c811ce5ab528f42048514700646a56c9b9f","sourceTree":"0f1ee7c42b0340dda15d128833fdc572e6a9240f","absentOptional":[]} -->
