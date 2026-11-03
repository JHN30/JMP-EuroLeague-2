# Fix: Compact record detail view

**Type:** Fix
**Status:** verified
**Branch:** fix/compact-record-detail-view

## The problem

A record's detail view (`/:season/records?type=…&metric=…`) uses far more height than it needs. Measured on the local DB
for 2026-27, Player seasons › Points:

| Part | 1440×900 | 390 (phone) |
|---|---|---|
| Whole page | 4,691px | 7,083px |
| Podium | 226px | 638px (three stacked cards) |
| Timeline | 492px | 468px |
| Top 50 | 3,449px (66px rows) | 5,501px (107px rows) |

- The Top 50 rows are tall: a 36px picture, the club on a second line, a separate Game button column, and padded
  table cells. Below `sm` each row is a three-part card (holder, season and Game, bar).
- The podium repeats ranks 1-3 as three large cards above a full-width chart.
- The record type tabs, then the Metric select with Totals / Per game, then the minimum-games note each take a row of
  their own.
- The page does not mark rows from the season being viewed (the main page does), say how long the record has stood,
  or show who fills the list.

## The fix

These are frontend changes only. There are no API, query or address changes: everything new is worked out from the
reply already loaded (`records`, `bySeason`, `progression`). The record book (main page) stays as it is, apart from
any shared part noted below.

1. **Controls on one row.** From `lg`, the record type tabs (left) and the Metric select with Totals / Per game
   (right) share one row, wrapping when they do not fit. Below `lg` they stay as now. The Lower-is-better /
   minimum-games / volume note stays, as one small muted line under that row.
2. **Podium and timeline side by side.**
   - From `xl`, the podium is a compact column (about 18rem wide) of three rows: the rank badge, the value (#1 in
     primary), the holder (picture about 40px, name, club as its TV code), and the season (with the day and a Game
     link for a game record). The timeline panel takes the rest of the row.
   - Below `xl` the podium is the same three compact rows in one panel above the timeline, instead of three tall
     cards.
   - The timeline keeps its chart, legend and "Show every season" list.
3. **Record age line.** The timeline summary adds how long the record has stood, counted in loaded seasons from the
   season that set it to the latest season in the timeline. For example: "Record: 802, Kendrick Nunn, 2024-25.
   Standing for 3 seasons. Set 7 times since 2000-01." A record set in the latest season reads "Set this season."
4. **Tighter Top 50 rows.**
   - From `sm`, rows are about 40-44px: a smaller rank badge, a 32px picture, the name with the club's TV code on the
     same line (full name on hover and for screen readers), the season (with the day for a game), the game as a small
     link, and the value with its share bar (bar from `lg`).
   - Below `sm`, a row is two lines, about 56px: the rank, the holder and the value, then the season (and the game
     link) with a thin bar.
   - `Holder` in `records/RecordParts.jsx` is shared with the record book: the Top 50 uses the existing `compact`
     prop or a new opt-in, and the book's rows do not change.
5. **Show 25, expand to 50.** The Top 50 shows the first 25 rows, with a "Show all 50" button under them (it
   says how many when the list is shorter). The button reveals the rest; changing the record type, metric or per
   game starts at 25 again. The panel title stays "Top 50".
6. **One per holder.** A switch in the Top 50 header, "One per player" (or "One per club" for club records), keeps
   only each holder's best entry from the loaded 50, ranked again from 1. The list can then be shorter than 50, and the
   title says so ("Top 50 · 31 players"). It is local state that stays on while moving between metrics. The share bars
   still measure against the record.
   - Holders are matched by person key or club code; `describeRecord` exposes that key.
7. **Most entries strip.** One muted line under the Top 50 header: "Most entries: Sasha Vezenkov 3 · Walter Tavares
   2 · …", the top three holders that appear more than once in the loaded 50, each name linked as in the rows. The
   line is hidden when no holder appears twice, and while One per holder is on.
8. **Season highlight.** A podium row or Top 50 row set in the season being viewed (`seasonSlug(record.seasonCode)`
   equals the address's season) shows the same "New in <season>" badge as the record book, `badge-xs`.
9. **Skeleton.** `RecordDetailSkeleton` follows the new layout: compact podium rows (beside the chart from `xl`),
   the chart, and 25 shorter rows.

The following must not break:
- loading, error (Retry) and empty states, and the faded panel while the next choice loads (`aria-busy`);
- the address-driven choices and Back stepping through them;
- player, club and game links;
- the PIR tip in the value heading;
- the "Show every season" list, the chart's tooltip and the click-through to a holder;
- both themes, keyboard focus, and no sideways scroll at 320px.

## Build steps

1. [x] **Layout: controls, podium beside the timeline, record age, skeleton** (items 1, 2, 3, 9).
   - Done when at 1440×900 the controls are one row and the podium sits beside the chart.
   - Done when below `xl` the podium is three compact rows.
   - Done when the summary states how long the record has stood.
2. [x] **Top 50: tighter rows, Show 25 / all 50** (items 4, 5).
   - Done when at 1440×900 rows measure about 44px or less, and at 390 about 60px or less.
   - Done when the list shows 25 rows until "Show all 50" is used, and resets on a new choice.
   - Done when the page is about 2,000px or less at 1440×900 and about 3,500px or less at 390 (25 rows shown).
3. [x] **Extras: one per holder, most entries, season badge** (items 6, 7, 8).
   - Done when the switch leaves one row per holder, ranked from 1, with the count in the title.
   - Done when the strip names the repeat holders.
   - Done when 2026-27 rows carry the badge on `/2026/…`.
4. [x] **Browser specs.** Update `e2e/records.spec.js` and `e2e/records-layout.spec.js` for the new layout: podium rows
   instead of cards, the 25-row start and the Show all control, row heights, and the controls row. Add coverage for
   the record age line, One per holder, the Most entries strip and the season badge.
   - Done when both specs pass on the local DB.

## Verify

- On the local DB (`/api/health` reports `"target":"local"`):
  `cd frontend && npx playwright test records.spec.js records-layout.spec.js responsive.spec.js`.
- Measure `/2026/records?type=player&metric=pointsScored` at 1440×900 and 390 wide, and compare with 4,691px and
  7,083px.
- By hand at 1440, 1280, 1024, 640 and 320 px wide, in both themes:
  - a player-season record, a game record (Game links), a club record (One per club), and a lower-is-better rating
    (Defensive rating) with its note;
  - Show all 50, then switch the metric and check that the list is back to 25;
  - switch to another season and check that the badges follow it.
- `cd frontend && npm run lint` and `npm run build` pass.

## Outcome

- Measured on the local DB at `/2026/records?type=player&metric=pointsScored`, 25 rows shown:

  | Width | Before | After | Top 50 row |
  |---|---|---|---|
  | 1440×900 | 4,691px | 2,252px | 45px |
  | 1024 | n/a | 2,634px | 45px |
  | 390 | 7,083px | 2,935px | 59px |
  | 320 | n/a | 3,239px | 59px (median 75-79px on the live list, where the club code wraps under the name) |

  The phone is within its target. Desktop is about 250px over the ~2,000px estimate: the header, controls and the
  podium/timeline row take about 770px, and 25 rows at 45px take the rest.
- Changed while building:
  - The record age line reads "Standing for N seasons." in every case, including "Standing for 1 season.", instead
    of "Set this season.". The timeline's latest season is not always the season being viewed (a mocked timeline
    ending in 2025-26 viewed from 2026-27), so "this season" would have been wrong.
  - The game link stays an explicit small "Game" link after the date (`2023-24 · 29 Mar 2024 · Game`) rather than the
    date itself being the link, so it stays easy to spot. The table no longer has a separate Game column.
  - The podium shows the date (and Game link) and the badge on a third line under the name and club.
  - The Top 50 keeps the small club crest beside the club's TV code.
  - From 1024px the controls wrap to a second row when they do not fit (Points with Totals / Per game). From 1280px
    they always share one row.
- Shared parts touched: `Holder` gets an opt-in `inline` prop. `NewBadge` is now shared with the record book, which
  draws the same badge as before. `describeRecord` adds `holderKey`.
- Checks:
  - `npx playwright test records.spec.js records-layout.spec.js` (34 passed);
  - `npx playwright test responsive.spec.js -g Records` (19 passed);
  - `npm run lint` and `npm run build`.

### Review change: equal-height podium and a two-column Top 50

- The user found the podium shorter than the timeline beside it, and the one-column Top 50 table too empty on a wide
  screen.
- **Podium:** from xl the podium panel stretches to the timeline's height. Under the three rows it lists **Record
  facts**:
  - Lead over 2nd: the runner-up's name and season, or "own <season>" when it is the holder's;
  - Previous record: the value, holder and season it took over;
  - Standing: how many seasons, since when;
  - Times set: how often, since when.

  These replace the age clause in the timeline summary, which reads as before ("Record: … . Set N times since …").
- **Top 50:** the table became one list of one-line rows from sm (`#records-top`) that runs down two columns from xl
  (`xl:columns-2`: ranks 1-13 and 14-25, or 1-25 and 26-50 after Show all). The column header is replaced by the
  "Ranked by <metric>" line (with the PIR tip), and Most entries follows it on the same line.
- **Game dates:** in the podium and the one-line rows, a game record shows its day and the Game link, with the season
  on hover. The phone rows keep the season and the day.
- **Heights:**

  | Width | Height |
  |---|---|
  | 1440×900 | 1,672px (was 4,691px before this fix) |
  | 1024 | 2,731px |
  | 390 | 3,084px |
  | 320 | 3,408px |

  The facts add about 150px below xl. A game record measures 1,691px at 1440.
- **Checks:**
  - `npx playwright test records.spec.js records-layout.spec.js` (34 passed): they now cover the facts, equal panel
    heights from 1280, and rank 14 starting the second column;
  - `npx playwright test responsive.spec.js -g Records` (19 passed);
  - `npm run lint` and `npm run build`.

### Review change: records eligibility as on the Leaders boards

- The user asked for the same eligibility as Leaders: a player needs at least half of the season's games.
- **Changed in `backend/src/db/season-records.ts`:**
  - A season's minimum is half of its games, rounded up (Leaders' `gamesNeeded`).
  - A season's games are the most any club played in it (Leaders take the most any player has), but never fewer than
    its regular-season schedule. This keeps a season in progress out of the all-time lists until it is past halfway.
    It also counts the later stages of the 2000-2016 seasons, whose 10-game group stage alone would have let 5 games set
    a record (found with PER 77.4 from 5 games once the old `qualified` flag was gone).
- **Where it applies:**
  - every player-season per-game and advanced record, Win Shares totals included (Leaders rank them by the same rule);
  - every club-season per-game and advanced record.

  Season totals and single-game records keep no games minimum.
- **Dropped, as Leaders did in `8fc6475`:** the 10-minutes-a-game rule and the pipeline's `qualified` flag. Shooting
  percentages need Leaders' 5 field goal attempts a game (was 4).
- **Note text:** "Counts players (clubs) with at least half of their season's games, as on the Leaders boards." The
  answer's `minGames` is 17 (half of a 34-game season), and each row carries its season's own minimum.
- **Specs updated:** `records-api.spec.js` (17, no minutes volumes, the 5-attempt shooting text, a new test of the
  season minimum), and `records.spec.js` / `records-layout.spec.js` (note text and mocks).
- **Follow-up from the user:** the 10-minutes-a-game rule stays for the player rates (Win Shares / 40, Usage %, Assist %,
  Rebound %, Steal %, Block %, Game Score average, PIE), and shooting percentages need "10+ minutes and 5+ field goal
  attempts a game". Only the `qualified` flag and the old 20-of-34 games rule are gone.
- **Regular season only (the user's choice):** the minimum is half of a club's regular-season schedule, rounded up.
  - The regular season is the group stage plus the Top 16 where there was one. Per-season minimums:

    | Season | Schedule | Minimum |
    |---|---|---|
    | 2000-01 | 10 | 5 |
    | 2005-06 | 14 + 6 | 10 |
    | 2011-12 | 10 + 6 | 8 |
    | 2014-15 | 10 + 14 | 12 |
    | 2016-17 | 30 | 15 |
    | 2024-25 | 34 | 17 |
    | 2026-27 | 38 | 19 |

  - A player's games are counted the same way: their RS + TS games (`regularSeasonGames` in
    `backend/src/db/season-stats.ts`), so a playoff run no longer counts toward the minimum. Each row's `gamesPlayed` is
    those games.
  - The record values themselves stay whole-season.
  - A club always plays its whole regular season, so a club's games so far meet the minimum once a season in progress
    is past halfway.
  - The "most games any club played" step is gone.
  - Separate regular-season and postseason record lists were offered as a later, separate fix.
- **Checks after the eligibility change (backend restarted, `/api/health` target `local`):**
  - `npx playwright test records-api.spec.js records.spec.js records-layout.spec.js` (127 passed). The old "qualified
    players only" API test became "count regular-season games only, at least half of the schedule": each PER and Win
    Shares row's games equal the player's RS + TS games in the season statistics.
  - `npx playwright test responsive.spec.js -g Records` (19 passed);
  - `npm run lint`, `npm run build` (frontend), and `npm run build` (backend).
- **Raised to two thirds (the user's call: half was too low):** the minimum is two thirds of the regular-season
  schedule, rounded up. That is stricter than Leaders' half, so the notes no longer say "as on the Leaders boards".

  | Season | Schedule | Minimum |
  |---|---|---|
  | 2000-01 | 10 | 7 |
  | 2011-12 | 16 | 11 |
  | 2014-15 | 24 | 16 |
  | 2016-17 | 30 | 20 |
  | 2024-25 | 34 | 23 |
  | 2026-27 | 38 | 26 |

  - The answer's `minGames` is 23.
  - The detail note reads "Counts players (clubs) with at least two thirds of their season's regular-season games."
  - The record book header adds one line saying the rule for everyone: "Per-game and rate records count players and
    clubs with at least two thirds of their season's regular-season games (23 of 34), and player rates also 10+ minutes
    a game. Totals and single games count everyone."
  - Real data: Derrick Sharp's 8-game PER (2009-10) is out; Shane Larkin (25 of 34) still leads.
  - Checks: `npx playwright test records-api.spec.js records.spec.js records-layout.spec.js` (127 passed),
    `responsive.spec.js -g Records` (19 passed), frontend lint and build, backend build.
- **Wording:** the page notes say "67%" instead of "two thirds" ("…with at least 67% of their season's regular-season
  games (23 of 34)…").
  - `records.spec.js records-layout.spec.js`: 33 passed. "with reduced motion the cards and rows do not slide in"
    failed once in the full run and passed 3 of 3 when rerun alone (flaky under load).
  - The frontend build passes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":15962,"specSha256":"2b51ed7066cc96f3057b71a44b1b0d4bbc5327010c750f08dca2c7d08dc001fd","branch":"refs/heads/fix/compact-record-detail-view","head":"733d97ed356337ce5c3ce9b62fe5e4fa58a24ec4","baseRef":"refs/heads/master","baseCommit":"733d97ed356337ce5c3ce9b62fe5e4fa58a24ec4","sourceTree":"7e965ab6d6e76b2372467b3832c07e36e4c6c783","absentOptional":[]} -->
