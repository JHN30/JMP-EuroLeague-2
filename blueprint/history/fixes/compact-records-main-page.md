# Fix: Compact records main page

**Type:** Fix
**Status:** verified
**Branch:** fix/compact-records-main-page

## The problem

The record book (`/:season/records` with no `type`, `metric` or `per` in the address) uses far more height than
its 24 headline records need. Measured on the local DB for 2026-27:

| Width | Page height | Main cost |
|---|---|---|
| 1440×900 | 2,328px | 4 sections × 6 cards, three per row, each card 206px |
| 390 (phone) | 5,840px | the same 24 cards in one column |

- Each card (`BookCard` in `records/RecordBook.jsx`) spends most of its height on padding. The metric link and the
  season are on one line, then a `text-3xl` value, then the holder with a 48px picture, then "+43 over 2nd" on its own
  line.
- Every section repeats its type's description ("The highest season totals by one player.") under the heading.
- The book links only the six traditional headline metrics. The advanced records (PER, Win Shares, ratings, eFG% and
  the rest) are reachable only after opening a detail view and changing the metric there.
- "+43 over 2nd" does not say who the record leads, although the book reply already carries the 2nd row.
- Nothing marks a headline record that was set in the season being viewed.

## The fix

These are frontend changes only. There are no API, query-key or address changes. The detail view (podium, timeline,
Top 50) stays as it is; it gets its own fix later. `Holder` in `records/RecordParts.jsx` is used by both views, so any
change to it is an opt-in prop that only the book passes.

1. **Record types as list panels.**
   - Each of the four record types is one `Panel`. Its heading is the type label (an `h2`, as now), and the panel holds
     an ordered list of its six headline records, in the API's order.
   - The panels form one column below `lg` and two per row from `lg` (Player seasons and Player games on the first row,
     Team seasons and Team games on the second).
   - **One row:** the metric (still the link into its detail view, `?type=…&metric=…`, accessible name starting with the
     metric), the value (bold, primary colour, smaller than the card's `text-3xl`), the holder (picture about 32px, the
     name linked as now, the club or opponent line under it), and on the right the season (with the day for a game)
     over the lead line.
   - In the book, the club line of a holder is the club's TV code with the full name on hover and for screen readers.
     The opponent of a team game is also the TV code. This uses an opt-in `Holder` prop; the detail view keeps its
     current labels.
   - Below `sm` a row wraps to two or three lines (metric and value, then holder, then season and lead) with no
     sideways scroll at 320px.
   - Targets: about 1,100px or less at 1440×900, and about 2,600px or less at 390 wide.
2. **Lead line names the runner-up.**
   - "+43 over 2nd" becomes "+43 over <runner-up>", where the runner-up is the 2nd row's display name: a player's name,
     or a club's TV code (full name on hover). A tie reads "Tied with <runner-up>".
   - When the type has only one row there is still no lead line.
3. **Section descriptions move to a tip.**
   - The description sentence under each heading goes away. The heading label becomes a `HeaderTip` carrying the
     description (`FAMILIES[].description`), so it shows on hover or focus and is read out by screen readers.
   - The page header's own description stays.
4. **Open any record.**
   - Between the page header and the panels there is one row of controls:
     - a Record type select (the four `FAMILIES`);
     - a Metric select (that type's metrics in Traditional and Advanced groups, from `allMetrics` and `metricsOf`);
     - an "Open record" link button to `/:season/records?type=<type>&metric=<metric>`.
   - The selects are local UI state, starting at the defaults (Player seasons, Points). Changing the type keeps the
     metric when the new type has it, and otherwise falls back to Points, as the detail view does.
   - Nothing navigates until the button is used. The controls reuse `ViewSelect` and sit on one row from `sm`, stacked
     below it.
5. **"New in <season>" badge.**
   - A headline record set in the season being viewed (`seasonSlug(record.seasonCode)` equals the address's season)
     shows a small badge, for example "New in 2026-27" on Fenerbahce's 14 blocks (15 Oct 2026). The badge uses data the
     book already loads.
   - A record from any other season shows no badge.
6. **Skeleton.** `RecordBookSkeleton` in `records/RecordsSkeleton.jsx` is drawn the same way as the new book: list
   panels, one column below `lg`, two from `lg`. The whole-page `RecordsSkeleton` keeps using it, so the code-loading
   and data-loading states still match.

The following must not break:
- loading, error (with Retry) and empty states;
- the link from each metric into its detail view and the "Record book" back link;
- player and club links on holders;
- the detail view and its `Holder` labels;
- both themes, keyboard focus on the links, selects and tips;
- no sideways scroll at 320px.

## Build steps

1. [x] **List panels, runner-up and tips.** Rework `RecordBook.jsx` (items 1-3), add the opt-in `Holder` prop, and update
   `RecordBookSkeleton` (item 6).
   - Done when the book shows four panels of six rows each, two per row from `lg`, and the lead lines name the
     runner-up.
   - Done when the descriptions open as tips.
   - Done when the page measures within the targets at 1440×900 and 390 wide on the local DB.
2. [x] **Picker and badge.** Add the Open any record controls (item 4) and the "New in <season>" badge (item 5).
   - Done when picking Team games → Net rating and using Open record lands on `?type=teamgame&metric=netRating`.
   - Done when only records from the viewed season carry the badge.
3. [x] **Browser specs.** Update the book tests in `e2e/records.spec.js` and `e2e/records-layout.spec.js` for the new
   layout: panels and rows instead of cards, one column below `lg` and two from `lg`, the lead line text, and the
   heading names with their tips. Add coverage for the picker and the badge. The mocked first record is from 2026 and
   the page is `/2026/records`, so it carries the badge.
   - Done when both specs pass on the local DB.

## Verify

- On the local DB (`/api/health` reports `"target":"local"`):
  `cd frontend && npx playwright test records.spec.js records-layout.spec.js responsive.spec.js`.
- Measure the page height at 1440×900 and 390 wide on `/2026/records` and compare with 2,328px and 5,840px.
- By hand at 1440, 1024, 640 and 320 px wide, in both themes:
  - check the panel layout, a metric link into its detail view and back, a tip on a heading, the picker opening an
    advanced record, and the badge on 2026-27 records;
  - switch to another season (for example 2022-23) and check that the badges follow it.
- `cd frontend && npm run lint` and `npm run build` pass.

## Outcome

- Measured on the local DB at `/2026/records`:

  | Width | Before | After |
  |---|---|---|
  | 1440×900 | 2,328px | 1,218px |
  | 1024 | n/a | 1,554px |
  | 390 | 5,840px | 2,508px |
  | 320 | n/a | 3,252px |

  The phone is within its target. Desktop is about 120px over the ~1,100px estimate: a row is 57px with its two lines,
  and reaching 1,100px would mean dropping the second line (club, season and lead).
- Added during the build: when the record holder also holds the row behind (Tavares's blocks, Vezenkov's PIR, Real
  Madrid's team blocks), the lead line reads "+16 over own 2025-26" instead of repeating the holder's name. Holders are
  compared by person key or club code.
- Below `sm` the value sits under the metric in a narrow first column beside the holder, and the badge is `badge-xs`.
  The holder's second line wraps, so nothing scrolls sideways at 320px.
- The `Holder` opt-in prop is `compact` (TV-code club line, `text-xs` second line) plus `extra`. The detail view
  passes neither.
- Checks: `npx playwright test records.spec.js records-layout.spec.js responsive.spec.js` (194 passed after the
  same-holder repair; the book tests rerun green), `npm run lint`, `npm run build`.

### Review change: picker apart from the popular records

- The user found the picker could read as a filter of the book under it (changing it changes nothing there). The picker
  is now a titled panel of its own (`BROWSE` · "Find any record", with a line saying it opens any record's Top 50 and
  timeline, advanced ones included). The book sits under its own `h2`, "Popular records" ("Points, rebounds, assists,
  steals, blocks and PIR for every record type"), and the record-type panel headings became `h3`. The whole-page
  skeleton draws both.
- Heights after this change: 1,338px at 1440×900, 2,736px at 390, 3,520px at 320, with no sideways scroll.
- Checks: `npx playwright test records.spec.js records-layout.spec.js` (31 passed), `responsive.spec.js -g Records`
  (19 passed), `npm run lint`, `npm run build`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9121,"specSha256":"92a235e95f915fce0ae5c79937bbc817a974b6c0ac2b2c814250076a284be636","branch":"refs/heads/fix/compact-records-main-page","head":"8fc647522073b95fbe9e127b09fdfe4a21484c9b","baseRef":"refs/heads/master","baseCommit":"8fc647522073b95fbe9e127b09fdfe4a21484c9b","sourceTree":"6d8f64cb2bf946ae8a9ceff30ee074d7585ae4b3","absentOptional":[]} -->
