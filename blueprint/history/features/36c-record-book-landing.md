# Feature: Record book landing

**From build-plan:** feature 36c
**Build attempt:** 1
**Status:** verified
**Branch:** feature/record-book-landing

## Goal

`/:season/records` with no choice in the address opens a record book: for each of the four record types, a card per
headline metric (Points, Rebounds, Assists, Steals, Blocks, PIR) with the record, its holder and the margin over
second place. A card opens that metric's detail view (podium, timeline, Top 50), whose address always names its type
and metric.

## In scope

- **API:** `GET /api/seasons/:seasonCode/records/book` answers
  `{ sections: [{ kind, cards: [{ metric, label, format, lowerIsBetter, records }] }] }` with the four kinds in the
  order player-seasons, single-games, team-seasons, team-games and the six headline metrics in the order
  `pointsScored`, `totalRebounds`, `assists`, `steals`, `blocks`, `pir`. `records` holds the best two rows over every
  loaded season, in the same row shape and order as the kind's records route (`value` string, `numericValue`, the
  picture, club, opponent, game and date fields). One query per kind and metric (24 in all) orders the whole loaded
  range and keeps two rows, with the same tie order as `best()` (value, then season, then the kind's tie key) and
  nulls left out; picture and TV code lookups only for the seasons those rows come from. The season in the address
  is validated as for the other records routes (unsupported season: 400). The response cache already serves every
  `/records/` URL from one entry for all seasons.
- **Landing:** with none of `type`, `metric` or `per` in the address, the page shows the record book:
  - The page header ("Records") with the description "The best of every loaded season. Open a record for its Top 50,
    its timeline and every season."
  - One section per record type (its label as the heading), each a grid of six cards: one column below `sm`, two
    from `sm`, three from `lg`.
  - A card: the metric label as a link to its detail view (`?type=<family>&metric=<key>`), the value in the
    record's format, the holder (`Holder`: picture, name linked to the player or club in that season, club or
    opponent line), the season (and the date for a game), and the margin over second place ("+43 over 2nd"; "Tied
    with 2nd" when equal; nothing when there is no second row).
  - Loading, error (with Retry) and an empty card ("No record yet") states.
- **Detail view:** any of `type`, `metric` or `per` in the address opens the existing view. Every choice writes both
  `type` and `metric` to the address (no default left out); `per=game` stays as in 36b (totals leave it out). A
  "Record book" back link (`BackLink`) leads to `/:season/records`. An address naming only one of them still opens
  the detail view with the other at its default, as now.
- **Navigation:** the Records tab keeps pointing at `/:season/records`, so it now opens the record book.

## Out of scope

- Headline cards for advanced metrics or per-game records; editing which metrics are headlines.
- Changes to the detail view's content (podium, timeline, Top 50, toggles) beyond its address and back link.

## Build loop

Continuous Mode (`/continuous`, run to finish feature 36): no review pauses; each step is verified and self-reviewed,
then the feature is completed and squash-merged locally. `checkpointCommits` is `disabled`.

## Build steps

- [x] 1. **Book route** - `getRecordBook` in the backend records module with the 24 two-row queries, the route, and
  `records-api.spec.js`: four sections, six cards each in order, each card's first row equal to the first row of the
  kind's records route for that metric (value, season, holder key), the second row no better than the first, and an
  unsupported season answering 400.
  Done when: `cd backend && npm run build` passes; `/api/seasons/2026/records/book` answers 24 cards; the
  records-api spec passes.
- [x] 2. **Landing and detail address** - `api.js` `getRecordBook`; the landing in the records page; the detail view's
  address rule and back link; specs: `records.spec.js` mocks the book route and checks the 24 cards, a card's
  margin and its link into the detail view and back, the address always naming type and metric, and the detail
  tests opening their view by address; `records-layout.spec.js` checks the landing fits at every width (live) and
  opens its detail cases by address; `responsive.spec.js` keeps `records` (now the landing) and adds the detail view.
  Done when: `/2026/records` shows four sections of six cards with values, holders and margins; a card opens
  `?type=player&metric=pointsScored` and "Record book" returns; `npm run lint` and `npm run build` pass;
  `npx playwright test records.spec.js records-api.spec.js records-layout.spec.js responsive.spec.js` passes with
  `/api/health` reporting `"target":"local"`.

## Files / areas

- `backend/src/db/season-records.ts`, `backend/src/routes/seasons.ts`.
- `frontend/src/lib/api.js`, `frontend/src/records/RecordsPage.jsx`, a `RecordBook.jsx` for the landing,
  `recordData.js` (headline list), `RecordParts.jsx` (`Holder` reused).
- `frontend/e2e/records-api.spec.js`, `records.spec.js`, `records-layout.spec.js`, `responsive.spec.js`.

## Data / contracts

- Book reply as above; each card's `records` has 0 to 2 rows. Rows match the kind's records route rows.
- Detail address: `?type=<player|game|team|teamgame>&metric=<key>` always, plus `per=game` when chosen.

## Testing

- No unit test runner; API coverage on the live local backend, page coverage on mocks and live layouts, local target
  only.

## Notes for the AI

- Reuse `describeRecord`, `Holder`, `Panel`, `PanelHeader`, `AsyncState`, `BackLink` and the motion list helpers.
- Keep the book queries in the records module's style (catalogRead, COMPETITION_CODE, SUPPORTED_SEASONS).
- No em dashes in copy or comments. Keep comments to the why.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5906,"specSha256":"b6fdb6af28b5cedd1d165bafdc7ee9f20a5909ffe9dca0839e26169036cb2052","branch":"refs/heads/feature/record-book-landing","head":"61bf5021dfaeaef8946a23472f2949aaacfa648c","baseRef":"refs/heads/master","baseCommit":"61bf5021dfaeaef8946a23472f2949aaacfa648c","sourceTree":"4fee18a35fdde8a66049cd86284b2ad32f51b3f1","absentOptional":[]} -->
