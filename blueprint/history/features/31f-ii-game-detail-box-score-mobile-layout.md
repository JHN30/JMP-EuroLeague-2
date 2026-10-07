# Feature: Game detail Box score mobile layout

**From build-plan:** feature 31f-ii
**Build attempt:** 1
**Branch:** feature/game-detail-box-score-mobile-layout
**Status:** verified

## Goal

Make the game page's Box score tab (`/:season/games/:gameCode`, Box score tab) usable from 320px up, in both views (Traditional and Advanced). Today each team's table has a sticky first column that is about 200px wide at its widest (jersey number, a 30px headshot, a name up to 8rem, a Starter badge and the position under the name), so on a 320px screen the pinned column covers most of the table and the 16 or 17 stat columns can hardly be reached.

Below `sm` (640px) the player column becomes a narrow pinned column that follows the Standings pattern (31d-i): it is about 7.6rem wide at rest (jersey number and name), narrows as the table is swiped sideways until only the player's headshot (or the jersey number, when there is none) is left, and the stats get the room; the stat cells are smaller and tighter (12px), so three stats show at rest at 320px and four at 390px (the current page shows one and two). The team header above each table and the Traditional/Advanced switch fit 320px. From `sm` up the page looks and behaves as it does today.

Layout only: no API, data or feature changes. The rows, their order (starters first, then the bench by minutes, players who did not play listed apart), the game-high bolding, the tips, the group headings of the Advanced view and every empty, loading and error state stay exactly as they are.

## Design reference

Current code (read, not yet measured at 320px; step 1 measures it):

- `GameDetailPage.jsx`, `BoxScoreTab` and `BoxScoreTable`: a `TabStrip` (Traditional, Advanced; `w-fit`) over one block per team. The block is a header row (`flex flex-wrap`: a `h-8` crest, an `h3` club name, a "Winner" badge, "Coach: ..." text, and a "N players" badge pushed right) over a `Panel` (`overflow-x-auto overscroll-x-contain p-2`) holding `table.data-table-sticky.table.table-sm.hover`. The first cell of every row is one cell: the jersey number (`w-6`), the headshot (`h-10`, 3:4, when there is one), and a block with the player link (`max-w-32 truncate sm:max-w-48`), the Starter "S" badge (with a hover tip) and the position line (`text-xs`). Then one `num text-center tabular-nums` cell per stat column: 17 in Traditional (MIN to PIR), 16 in Advanced (13 "This game" columns and 3 "Season through round N" columns, with a first header row of group headings and a `col-group-start` divider). The footer row is "Total" plus the team's totals; players with no minutes are listed under the table as "Did not play: ...".
- `index.css`: `.data-table-sticky` pins the first column of any table (a fill, a right-edge shadow). The Standings tables use `.pinned-table` (pinned rank and team, `--pin-rank`, `--pin-team` that narrows with `--collapse`, the name fading out, reset at the larger breakpoints) and `standings/ScrollingTable.jsx`, a scroll box that writes `--collapse` (scrollLeft over 36px, at most 1) from its scroll event without React state, and leaves it at 0 for a table that overflows by less than 122px.
- The Box score specs (`game-box-score`, `game-advanced-box-score`) read the tables by role and text, not by class.

Targets: at 320px the pinned player column is no wider than 7.7rem at rest and about 2.3rem when swiped, the first three stats at 320px and four at 390px are visible at rest, every stat is reachable by swiping, no name, number or badge is cut or overlaps a stat, and the page never scrolls sideways; at 640px and wider the tables look and scroll as today.

## In scope

- **Narrow player column below `sm`.** The first column of a box score table (header, player rows, the Total row, and the Advanced view's group-heading row) is pinned at a fixed width (about 7.625rem at rest, with `padding-inline` of about 0.3rem): the jersey number in a fixed slot (about 1.25rem) and the name beside it, with the Starter badge after the name. The headshot and the position line are not shown below `sm` (the player's page has both). A long name wraps at its spaces and breaks only a single word wider than the column; it never widens the column. The player link keeps its `title` and its accessible name.
- **Collapse on swipe.** The player column's scroll box is `ScrollingTable` (reused as it is, imported from `standings/`), so below `sm` the column narrows from about 7.6rem to about 2.25rem as the table is swiped about 36px and the name (and the "Player" heading, and the word "Total") fades out, leaving the jersey number. The Starter marker stays attached to the name and fades with it. A table that barely overflows does not collapse (the 31d-i rule, which `ScrollingTable` already has). From `sm` the collapse variable is not read and the first column is as today (`data-table-sticky`).
- **Compact stat cells below `sm`.** Stat headings and cells at 12px with about 0.375rem of side padding (the Standings phone sizes), `tabular-nums` kept; made-attempted cells (such as "10-12") never break at their hyphen. The group heading row and the divider of the Advanced view are kept (the heading text may be clipped by its own cell, never overflow the page).
- **Team header and switch below `sm`.** The crest and club name, the Winner badge, the coach and the player-count badge wrap onto more lines when they must, with the club name wrapping at its spaces; the Traditional/Advanced switch fits; the "Did not play" line wraps inside the panel.
- **Robustness at 320px.** Check, and fix only what clips: a very long hyphenated player name, a three-digit stat, a player with no jersey number (shown as "-"), a player with a headshot and one without, an overtime game's minutes, an Advanced table with missing values (em dashes), a team with no players or no total ("Box score not available yet." inside the panel width), and a game with no box score.
- **Revisions asked for at review.** (1) The tab's player names are written "LAST FIRST", without the feed's comma, at every width (the player links in the tables and the "Did not play" list): `PlayerLink` gets an optional `noComma` prop that only the Box score uses; the other tabs and pages keep their names as they are. (2) The folded column shows the player's headshot instead of the jersey number, because a jersey number tells few people who a player is: the headshot takes the number's place as the column folds (and the number as it unfolds); a player with no usable headshot keeps the number. The headshot is not shown at rest, where the number and the name are.
- **Browser check.** A new Playwright spec for this tab (see Testing).

## Out of scope

- The other game tabs: Game flow and Team comparison (31f-iii), Rotations (31f-iv), Shooting and Play-by-play (31f-v). The header, tab strip and Overview were 31f-i.
- Any change at 640px and wider: no new columns, no change to what is pinned there, no restyle.
- Changing the Standings tables or `ScrollingTable` itself, a View select for the two views, a sticky team header while scrolling the page, hiding statistics on phones, any API, data or copy change.
- Fixing the Playwright reliability and flaky-spec items (31n).

## Build loop

`workflow.stepReview` is `feature`: build the steps in order without pausing, run the narrow check after each, run the final gate once after the last step, then present one review packet. `workflow.checkpointCommits` is `disabled`: no step commits; `/complete` makes the single work commit.

## Build steps

- [x] **1. Measure the current tab.** With the dev servers running, open the Box score tab of a played game (Traditional and Advanced; live season and `2025`) at 320, 390, 768 and 1024px and record, in a scratch note outside the repo, the pinned column's width, how many stat columns are visible at rest, the table's overflow, and the first element that is wider than the screen (use a scratch Playwright spec and delete it afterwards). Done when the numbers are in hand and no repository file has changed.
- [x] **2. Player column below `sm`.** In `BoxScoreTable` (`GameDetailPage.jsx`) wrap the table in `ScrollingTable`, give the table a `box-score-table` class, and mark up the first cell (jersey number slot, name block with the badge, headshot and position `hidden sm:block`, the Total label and the "Player" heading in a fading span); add the `box-score-table` rules to `index.css` inside `@media (max-width: 39.999rem)` (fixed pinned width from `--collapse`, `overflow: hidden` on the cell, fading name, wrapping name). Done when at 320px the pinned column is at most 7.7rem wide at rest, swiping 36px or more narrows it to about 2.3rem with only the jersey number visible, swiping back restores it, the sticky header and footer cells follow it, `npm run lint` passes, and at 768px the first cell still shows the headshot, the full name and the position as today.
- [x] **3. Stats, header and switch.** The 12px compact stat cells and headings, the non-breaking made-attempted cells, and the wrapping team header, switch and "Did not play" line, in both views. Done when at 320px at least three, and at 390px at least four, stats are visible at rest in Traditional and in Advanced, every stat is reachable by swiping, no cell text wraps mid-value, the Advanced group row still spans its columns, and the page does not scroll sideways.
- [x] **4. Browser spec.** Add `frontend/e2e/game-box-score-layout.spec.js` (see Testing) and run it with the existing box score specs and the page-scroll spec. Done when `npx playwright test game-box-score-layout game-box-score game-advanced-box-score responsive` passes.
- [x] **5. Final gate and handoff.** `npm run build` at the repository root and `cd frontend && npm run lint` pass, the spec's boxes are checked, the status is `verified`, and the review packet lists the checks run. Done when both commands exit 0 and the packet names them.

## Files / areas

- `frontend/src/games/GameDetailPage.jsx` (`BoxScoreTable`: the scroll box, the table class, the first cell's markup, the team header classes).
- `frontend/src/index.css` (a `box-score-table` block inside one `max-width: 39.999rem` media query).
- `frontend/src/standings/ScrollingTable.jsx` is imported unchanged.
- `frontend/e2e/game-box-score-layout.spec.js` (new); `frontend/e2e/support/game-fixtures.js` only if a fixture needs a long name (prefer overriding the box score inside the new spec).

## Data / contracts

No API or data change. The page keeps reading the box score response (`playerStats`, `teamStats`, `periodScores`) and the advanced response as today. Markup contract: the table keeps its header, one `tr` per player who played, a footer "Total" row and the "Did not play" paragraph; the player link keeps its href, `title` and accessible name (the full `personName`); what is hidden visually below `sm` is only the headshot and the position line, never the player's name. The Starter badge keeps its hover tip, and the stat headings keep their tips.

## Testing

- `frontend/e2e/game-box-score-layout.spec.js`, following the games and standings layout specs (load once, resize through the widths, `findPageOverflow`, `expect.poll` for values that update a frame after a swipe), with `mockGameApi` and a box score override that has a very long hyphenated name, a player with no jersey number, a headshot, an overtime-length minute total and, for the Advanced view, the `ADVANCED` fixture:
  - at 320, 390 and 639px, both views: the first column of every row (header, group row, players, Total) is sticky; the pinned column is at most 7.7rem wide at rest; at least three stat columns (four from 390px) are visible at rest; no headshot and no position line are visible; no name word is split across lines, the long name stays inside its cell; a swipe of 18px narrows the column part way and the name fades, a swipe of 100px leaves about 2.3rem and an opacity-0 name with the jersey number still visible, and swiping back restores both; the page does not scroll sideways (the barely-overflowing rule belongs to `ScrollingTable` and is not retested here);
  - at 640, 768 and 1024px: the headshot, the full name and the position line show, the first column is sticky and as wide as today, and swiping does not change its width;
  - the team header wraps without overflow at 320px with a long club name, a Winner badge and a coach name, and the Traditional/Advanced switch fits;
  - a team with no box score rows shows "Box score not available yet." inside the panel.
- Existing specs that must stay green: `game-box-score`, `game-advanced-box-score`, `game-overview` and `responsive` (the game page at the four widths).
- No unit-test command exists, and the changes are layout, so there is no logic test. There is no declared `Verify` command, so the final gate is the repository build and the frontend lint; the Playwright run is opt-in evidence and is reported as such. Live visual checks at 320, 390, 768 and 1024px are done by the user from the "How to try it" note.

## Notes for the AI

- Follow the 31d conventions: mobile-first unprefixed styles, `sm` and `lg` as the only breaks, new phone-only rules inside `@media (max-width: 39.999rem)` so nothing changes from `sm`, and note that unlayered CSS outranks Tailwind utilities.
- Reuse `ScrollingTable` as it is. Its collapse maths assumes a column that shrinks by 5.375rem (86px) over 36px of swipe, so the rest and collapsed widths above (7.625rem and 2.25rem) must differ by exactly that.
- A sticky cell needs an opaque background and the right-edge shadow so the stats do not show through; the Advanced view's group-row first cell is an empty `th` and must be pinned too.
- Write long multi-line files with the Write tool. Do not start a dev server; ask the user to start one for step 1, or use the Playwright spec runner, which starts its own.
- Scope each design choice to this page: do not restyle other pages' tables. Say in the review packet if a shared piece is touched.

## Open questions

None that block the build. Three choices were made for review: below 640px the headshot and the position line are not shown (the player's page has both), the collapsed column shows the jersey number, and the Standings collapse pattern is reused. If a headshot-only collapsed column or a surname-only name is preferred, say so and step 2 changes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":14362,"specSha256":"4fcd31fa8e79bd5f210343a873fd2ac8aa58c8f64b72e181818bbf8096feddc8","branch":"refs/heads/feature/game-detail-box-score-mobile-layout","head":"c8661ffd9319325b9bfc947789add7ff7d2e93e8","baseRef":"refs/heads/master","baseCommit":"c8661ffd9319325b9bfc947789add7ff7d2e93e8","sourceTree":"7a47604602c1b3cf4d1d36ce44f786f8aa27a622","absentOptional":[]} -->
