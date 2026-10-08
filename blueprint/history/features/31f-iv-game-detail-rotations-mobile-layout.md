# Feature: Game detail Rotations mobile layout

**From build-plan:** feature 31f-iv
**Build attempt:** 1
**Branch:** feature/game-detail-rotations-mobile-layout
**Status:** verified

## Goal

Make the game page's Rotations tab (`/:season/games/:gameCode`, Rotations tab) comfortable from 320px up: **Minutes on the court** (one timeline bar per player for each team), **Assist connections** (who assisted whom, per team) and **Five-man units** (the lineup table with a minimum-minutes filter). The header, tab strip and Overview were 31f-i, the Box score 31f-ii, and Game flow and Team comparison 31f-iii.

Today the timeline's grid gives the bar only about 90px at 320px (a 7rem name column, a 3rem minutes column and the gaps leave the rest), so the period labels collide and the bars say little; the five-man units table is seven columns wide inside a scrolling panel with the five names of each unit in one row; and the assist connections switch to two columns at the retired `md` breakpoint. Below `sm` (640px) each timeline row becomes two lines (name and minutes, then the bar across the whole panel, under one period ruler), the units table keeps its first column pinned with the five names stacked so the stats can be swiped, and the panels are compact. From `sm` up the tab looks as it does today, except that the assist connections move to two columns from `lg` instead of `md` (the plan retires `md:`).

Layout only: no API, data or feature changes. The data, the reconciliation badge and its wording, the "approximate" and unavailable states, every section loading, failing and retrying on its own, the minimum-minutes filter and its default, the small-sample note and each bar's accessible text stay exactly as they are.

## Design reference

Current code (read, not yet measured at 320px; step 1 measures it):

- `RotationsTab.jsx`: `TimelineSection` renders one `TeamTimeline` per team (`Panel p-4`): a header row (`TeamLabel`, and a "Matches the box score" or "Approximate · up to N s off the box score" badge), a period ruler (`aria-hidden`, a spacer, a `relative h-4` strip with absolutely positioned `Q1`...`OT2` labels at each period's start, and a "Min" label) and a list with one `li` per player: the player link (`truncate text-sm`), an `sr-only` text of the on-court stints, the bar (`relative h-5` with a period divider per period and one `absolute` `span[title]` per stint) and the minutes. All use `GRID = grid-cols-[7rem_minmax(0,1fr)_3rem] gap-2` below `sm` and `sm:grid-cols-[11rem_minmax(0,1fr)_3.5rem] sm:gap-3`. `ConnectionsSection` renders one `TeamConnections` panel per team in `grid gap-4 md:grid-cols-2`: a header (`TeamLabel` and "Assisted baskets: N of M"), then `li`s with `passer → scorer` (two player links) and `N baskets · P pts` in a `flex flex-wrap` row, and a footnote.
- `LineupsSection.jsx`: a `LabelledSelect` ("Minimum minutes", `w-40`), then one `TeamUnits` panel per team (`Panel p-4`): `TeamLabel`, then in `overflow-x-auto` a `table.table-sm` of seven columns (Unit, Min, Poss, PF, PA, +/-, Net rtg), the Unit cell being a `ul.flex.flex-wrap` of the five player links; and a small-sample note.
- `games/TeamLabel.jsx` shows the short club name below `sm` (31f-i). Player names here are shown as the feed writes them ("LAST, FIRST"); the comma removal done on the Box score is not part of this item.
- Specs: `game-rotations.spec.js` (timeline, badge, connections; reads rows as `li` with the player's name and the bars as `span[title]`) and `game-lineups.spec.js` (rows and cells by index). `e2e/support/game-fixtures.js` has `rosterBox`, `LINEUPS` (one overtime, 2,700 seconds) and `mockGameApi`.

Targets: at 320px no page scrolls sideways; a timeline bar is as wide as its panel's content and the period labels do not overlap (including a game with two overtimes); no name or label is cut; the five-man units table keeps the unit names pinned and readable while the stats scroll inside the panel; at 640px and wider the tab looks as today.

## In scope

- **Minutes on the court below `sm`.** Each player row is two lines in the same `li`: the name (truncated as today) and the minutes on the first, the bar across the full width of the panel's content on the second (a 20px tall bar, as now). The period ruler is one full-width row with the period labels, without the spacer and the "Min" column (the minutes sit beside each name). The panel and its header are compact (`p-3`, the badge wrapping under the team name). The bar's period dividers, stint spans and titles, the `sr-only` stint text and the accessible markup (a list, one item per player) are unchanged.
- **Assist connections.** The two team panels stack below `lg` and sit side by side from `lg` (replacing `md:grid-cols-2`); panels are `p-3` below `sm`; each row keeps the passer, an arrow and the scorer on one line where they fit and wraps its two links and the "N baskets · P pts" text at their spaces otherwise, never wider than the panel.
- **Five-man units below `sm`.** Each unit is a card (decided at review, replacing a pinned-column table that stacked the five names): the five names run across the card's full width and wrap, and under them a strip of the six figures (Min, Poss, PF, PA, +/-, Net rtg) with each label above its value, nothing to swipe; the table keeps explicit ARIA roles and its header row (visually hidden) so it is still a table to a screen reader; the minimum-minutes select, the panel header and the note fit and wrap. From `sm` the table is as today.
- **Revision asked for at review: the game header's date line.** Below `sm` the line under the names is one line, for a high round and a long date too ("Round 38 · Mon, 30 Nov 2026"): a short date for a played game, and a short date with the tip-off time (no year) for a game still to come. From `sm` it is as today.
- **Robustness at 320px.** Check, and fix only what clips: a long hyphenated player name, a game with two overtimes (six period labels on the ruler), a team with no on-court rows ("On-court times aren't available for this team."), the "Approximate" badge text, a unit with a missing rating (an em dash), the empty and error states of each section, and a game that is not played (the tab's note inside the panel width).
- **Browser check.** A new Playwright spec for this tab (see Testing).

## Out of scope

- The other tabs: Overview (31f-i), Box score (31f-ii), Game flow and Team comparison (31f-iii), Shooting and Play-by-play (31f-v).
- Writing the player names without the feed's comma on this tab (the existing specs read the names with the comma), new columns, hiding statistics on phones, changing the minimum-minutes options, any API, data or copy change.
- Any change at 640px and wider other than the `lg` breakpoint for the assist panels.
- Fixing the Playwright reliability and flaky-spec items (31n).

## Build loop

`workflow.stepReview` is `feature`: build the steps in order without pausing, run the narrow check after each, run the final gate once after the last step, then present one review packet. `workflow.checkpointCommits` is `disabled`: no step commits; `/complete` makes the single work commit.

## Build steps

- [x] **1. Measure the tab.** With the dev servers running (or the Playwright runner, which starts its own), open the Rotations tab of a played game (live season and `2025`) at 320, 390, 768 and 1024px and record, in a scratch note outside the repo, the timeline bar's width, whether the period labels overlap, the first element wider than the screen, the units table's overflow and the unit column's width (use a scratch Playwright spec and delete it afterwards). Done when the numbers are in hand and no repository file has changed.
- [x] **2. Minutes on the court below `sm`.** The two-line rows, the full-width ruler and the compact panel, in `RotationsTab.jsx` (`GRID` and the `li`, ruler and panel classes). Done when at 320px each bar is as wide as its panel's content, the labels of a six-period game do not overlap, no name is cut mid-word, `npm run lint` passes, `npx playwright test game-rotations` passes, and at 768px the rows are one line as before.
- [x] **3. Assist connections and five-man units below `sm`.** `lg:grid-cols-2` for the connection panels, the compact panels, and the unit cards (`RotationsTab.jsx`, `LineupsSection.jsx`, and `index.css` inside one `max-width: 39.999rem` media query), and the phone date line in `GameDetailPage.jsx`. Done when at 320px each unit is a card with its names above one strip of labelled figures and the date line is one line, every connection row stays inside its panel, the page does not scroll sideways, `npx playwright test game-lineups game-rotations` passes, and at 768px the units table and the connections look as before (the panels are still stacked at 768px).
- [x] **4. Browser spec.** Add `frontend/e2e/game-rotations-layout.spec.js` (see Testing) and run it with the existing Rotations and Lineups specs and the page-scroll spec. Done when `npx playwright test game-rotations-layout game-rotations game-lineups responsive` passes.
- [x] **5. Final gate and handoff.** `npm run build` at the repository root and `cd frontend && npm run lint` pass, the spec's boxes are checked, the status is `verified`, and the review packet lists the checks run. Done when both commands exit 0 and the packet names them.

## Files / areas

- `frontend/src/games/RotationsTab.jsx` (the grid constant, the ruler, the player rows, the panels, the connections grid).
- `frontend/src/games/LineupsSection.jsx` (the units table's classes), `frontend/src/index.css` (one phone-only block for the pinned unit column, if classes alone cannot do it).
- `frontend/e2e/game-rotations-layout.spec.js` (new); fixtures are reused, with a six-period `LINEUPS` and long names built inside the new spec.

## Data / contracts

No API or data change. The tab keeps reading the box score, play-by-play and lineups responses as today. Markup contract: the timeline stays a list with one item per player, each item holding the player link, the `sr-only` on-court text, the bar (with its `span[title]` stints) and the minutes; the units stay a real `table` with its header row and one `tr` per unit; every player name stays a link to the player's page. A hidden or reordered visual element never removes the text from the accessible tree.

## Testing

- `frontend/e2e/game-rotations-layout.spec.js`, following the other game layout specs (load once, resize through the widths, `findPageOverflow`, a per-word `Range.getClientRects` check for mid-word splits, `expect.poll` for values that update a frame after a resize or swipe), with `mockGameApi`, `rosterBox`, a `LINEUPS` variant with two overtimes and a long hyphenated name, and a play-by-play with assists:
  - Minutes on the court at 320, 390 and 639px: no sideways scroll; every bar is as wide as its panel's content (within a few pixels) and sits on the line below its name and minutes; the period labels' boxes do not overlap each other; no name is split mid-word; the `sr-only` stint text and `span[title]` bars are still there; the panel padding is 12px;
  - Assist connections at 320, 390 and 639px: every row's content is inside its panel; the two panels are stacked (same left) at 320, 390, 639, 768 and 1023px, and side by side at 1024px;
  - Five-man units at 320, 390 and 639px: each row is a card, the names above the six figures, the figures on one line each under its label, everything inside the panel, nothing to swipe, the header row still in the accessibility tree; from 640px the rows are table rows without labels;
  - the game header's date line is one line at 320, 390, 639 and 768px for round 38 and a 30 November date, played and not played;
  - the minimum-minutes select, the badge and the small-sample note are inside their panels at 320px; a team without intervals shows its note inside the panel; a game that is not played shows the tab's note inside the panel width.
- Existing specs that must stay green: `game-rotations`, `game-lineups` and `responsive`.
- No unit-test command exists, and the changes are layout, so there is no logic test. There is no declared `Verify` command, so the final gate is the repository build and the frontend lint; the Playwright run is opt-in evidence and is reported as such. Live visual checks at 320, 390, 768 and 1024px are done by the user from the "How to try it" note.

## Notes for the AI

- Follow the 31d to 31f conventions: mobile-first unprefixed styles, `sm` and `lg` as the only breaks (retire `md:` where this tab uses it), new phone-only rules inside `@media (max-width: 39.999rem)` or `max-sm:` so nothing changes from `sm`, and unlayered CSS outranks Tailwind utilities.
- Scope every design choice to this page; any shared piece (`TeamLabel`, `PlayerLink`) is not changed here, and the review packet says so.
- Keep the DOM order and the markup the existing specs read (`li` per player, `span[title]` per stint, `td` by index); place the phone layout with CSS grid placement, not by moving elements.
- Write long multi-line files with the Write tool. Do not start a dev server: use the Playwright runner, which starts its own, or ask the user to start one.

## Open questions

None. Decided at review: the five-man units became cards; the names on this tab keep the feed's comma.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":13324,"specSha256":"00dc98e35c79e3dc8d08007d2943b74ee872476079a498676642c749cd005d63","branch":"refs/heads/feature/game-detail-rotations-mobile-layout","head":"ea3b1871a5b929c1ae834cae4ac651298cba38d9","baseRef":"refs/heads/master","baseCommit":"ea3b1871a5b929c1ae834cae4ac651298cba38d9","sourceTree":"46de897173c70de725214e54070e5492911f3400","absentOptional":[]} -->
