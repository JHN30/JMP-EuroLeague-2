# Feature: Records mobile and tablet layouts

**From build-plan:** feature 31m
**Build attempt:** 1
**Branch:** feature/records-mobile-and-tablet-layouts
**Status:** verified

## Goal

Make the Records page (`/:season/records?type=..&metric=..`) work from 320px up: no sideways page scroll, nothing cut or broken
mid-word, the three strips (record type, metric group, metric) easy to use by touch, the podium, progression, best-in-season list and Top 50
readable on a phone, and the same touches the other pages got in 31k and 31l (the club's TV code where a full name does not fit,
touch-sized targets). Mobile is below 640px (unprefixed styles), tablet is `sm` (640px), desktop is `lg` (1024px); `xl` stays. The page's
desktop layout (feature 33b/33d) must not change. Layout and labels only; no API or data change.

Today (read from `RecordsPage.jsx`, `RecordParts.jsx`, `recordData.js`; not yet probed in a browser below 1023px, that is step 1):

- **Strips**: three `TabStrip scrolling` strips (levels 1, 2, 3: record type, metric group, metric), each one row that scrolls on its own
  below `lg`, the active tab centred. The record-type and group strips are `w-fit`.
- **Podium**: three `Panel` cards, `lg:grid-cols-3`, one column below `lg`, each a rank badge and season, a `text-4xl` value with its
  label, the holder (`Holder`, a `h-14` picture, the name and a second line) and a "Game" button for game records.
- **Progression and Best in each season**: `lg:grid-cols-2` with `grid-cols-[minmax(0,1fr)]` below. Best in each season is a flex row of a
  `w-16` season, the holder and the value with a "Record" badge; Progression is a timeline of the value, the gain, a "Current record"
  badge, and the holder with the season or date.
- **Top 50**: a `table` in an `overflow-x-auto` box with Rank, holder, Season, Game (game types) and a value cell with a `w-24` bar and a
  `w-16` value. On a phone this table is wider than the screen, so it scrolls inside its panel.
- **Holder**: a picture (headshot or crest), the name (a link) and a second line (a player's club with its crest, or "vs <opponent>").
  Names wrap with `wrap-break-word`; club names in team rows are full names.
- `responsive.spec.js` has Records as a `staticPage` (the default type and metric only). `records-layout.spec.js` checks the desktop widths
  (1280, 1024, 1023) for five cases; `records.spec.js` (12 mocked tests) covers the behaviour.

Earlier mobile items found the same few failures: grids that grew past the window because a track does not shrink below its content
(fixed with `grid-cols-[minmax(0,1fr)]`), long names that did not wrap, tables wider than the screen, and tab strips that clip. They are the
starting hypothesis; step 1 measures before changing anything.

## In scope

1. **Baseline.** A throwaway probe loads each record type once and resizes through 320, 390, 639, 640, 768, 1023, 1024 and 1280px,
   recording page width, text cut or broken mid-word, and anything outside its panel. It is deleted afterwards. What it finds decides the
   items below; an item that the baseline shows is already fine is left as it is.
2. **Strips and the metric select.** The record-type and group strips fit the window below `lg` (scrolling inside themselves, never widening
   the page), with touch-sized tabs (44px high below `sm`) and the active tab in view after a change of type or group. The metric strip
   (11 tabs for Traditional) is replaced below `sm` by one labelled native select, "Metric", built on `ViewSelect` (`lib/ViewSelect.jsx`, as
   Standings does in 31d-vi) and listing the metrics of the chosen group, under the group strip; from `sm` the metric strip stays as it is.
   The select writes the same `metric` address value as the strip, so links, Back and the group strip behave as today. Order and labels of
   the three controls are unchanged.
3. **Podium.** One card under another below `lg` (as today) with the picture, value and holder readable at 320px: a long player or club name
   wraps by whole words inside the card, the value never wraps or is cut, the "Game" button is a 44px target below `sm`. From `sm` the
   cards may sit in two columns only if the baseline shows the stacked cards waste the width (see the open questions); from `lg` three
   across as today.
4. **Progression and Best in each season.** Rows fit at 320px: the season, the holder and the value never overlap; the Best in each season
   row stacks (season and value on one line, the holder under it) below `sm`; long names wrap by whole words.
5. **Top 50.** Below `sm` the table becomes a list of rows (the Leaders boards' pattern, `BoardRow` in `leaders/LeaderParts.jsx`, is the
   reference): the rank badge, the picture and holder, and the value on the first line, the season (and the date for a game) and the
   "Game" link on the second, with the bar kept under the value if it fits; no horizontal scrolling inside the panel. From `sm` it is
   the table as today, inside its panel at 640 and 768px (dropping the bar column or narrowing it if the baseline shows the table wider than
   its panel). Rank stays a visible `RankBadge`; the value column header keeps the `PIR` tip.
6. **TV codes.** Where a full club name does not fit (the opponent line of a team game, a player's club in the second line, a team's name in
   a narrow row), a club shows its TV code below `sm` and its abbreviated name from `sm`, through `ShortLabel` (`teamCode` and
   `shortTeamName` from `games/gameUtils.js`). The record rows already carry the club's TV code (`clubTvCode` or `clubTvCodes`) and
   name; a row without a code falls back to the name, then the club code.
7. **Minimum-games note and states.** The "Counts players with at least N games." note, "Loading archive records", "Could not load archive
   records." with Retry, and "No records are available for this metric." fit at 320px in the same layout as loaded content. The panel
   keeps dimming while the next choice loads.
8. **Specs.** `records-layout.spec.js` gains the phone and tablet widths for the five cases (320, 390, 639, 640, 768, in addition to its
   desktop widths) with the checks listed under Testing; the Records entry in `responsive.spec.js` stays and is extended with one other
   record type (a team game) so a club-based board is measured too; `records.spec.js` is updated only for wording or structure this item
   changes.

## Out of scope

- Any API or data change, the metric catalogue, the minimum-games rules, what the record types or progression compute, the address
  (`type`, `metric`) and the keepPreviousData behaviour.
- The desktop layout and animations of the page (33b, 33d): from `lg` the page must look as it does now.
- The Postseason page (31n), the site header and menu, and the Leaders boards (31k): `BoardRow`, `Avatar`, `RankBadge`, `TabStrip`,
  `Panel` and `PanelHeader` are used as they are, with at most an opt-in prop; nothing about how those render elsewhere changes.
- A new shared component: the phone list rows are built inside `records/RecordParts.jsx` unless `BoardRow` fits as it is.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the narrow check after
each, then present one final review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Baseline and strips.** Take the baseline probe described in scope item 1 (live data, local database, the four record types plus
      an advanced metric), then fix the type and group strips and add the metric select.
      Done when: at 320 and 390px the type and group strips are inside the window with tabs at least 44px high, the metric control is a
      select (no metric strip) listing the group's metrics, choosing a metric from it loads that metric and updates the address, switching
      the group keeps a valid metric selected, and the page has no sideways scroll; from 640px the metric strip shows and the select does
      not; the probe is deleted and the desktop strips look as today.
- [x] 2. **Podium, Progression and Best in each season.** The card, timeline and list changes of items 3 and 4.
      Done when: at 320 and 390px, for all four types, every card and row is inside its panel with no cut text and no word broken
      mid-word (a very long mocked name included), the "Game" button is at least 44px high, and from `lg` the page looks as today.
- [x] 3. **Top 50.** The phone row list below `sm`, the tablet table at 640 and 768px, and the TV codes of item 6.
      Done when: at 320 and 390px the Top 50 has no horizontal scrolling inside or outside its panel, shows rank, holder, season (and
      date), the value and (for game types) a "Game" link for each of the 50 rows; at 640 and 768px the table fits its panel; from
      `lg` it is the table as today; a club shows its TV code below 640px and its abbreviated name from it.
- [x] 4. **States and specs.** Check the states of item 7 at 320px with mocked responses, extend `records-layout.spec.js` and
      `responsive.spec.js` as item 8 says, and update `records.spec.js` if needed. Run those three specs on the local database
      (`/api/health` says `local`), plus root `npm run build` and `cd frontend && npm run lint`.
      Done when they pass.

## Files / areas

- `frontend/src/records/RecordsPage.jsx`, `RecordParts.jsx` and `recordData.js` (the club label and the second line).
- `frontend/src/index.css` only if a rule cannot be written as utilities.
- `frontend/src/lib/ViewSelect.jsx` (used as it is for the metric select), `leaders/LeaderParts.jsx`, `lib/TabStrip.jsx`, `lib/ShortLabel.jsx`,
  `games/gameUtils.js`: read, and use as they are.
- `frontend/e2e/records-layout.spec.js`, `frontend/e2e/responsive.spec.js`, `frontend/e2e/records.spec.js`.

## Data / contracts

None changed. The page reads the existing records answers (`GET /api/seasons/:season/records/{kind}?metric=`, 50 rows, highest first).
A `NULL` picture, TV code or name means unavailable: the picture is left out, and the name then the club code stands in for a missing code.
Player and club names are rendered as React text, never as HTML. The address keeps `type` and `metric`, and every link to a player, club or
game keeps the season's year (never `E2025`).

## Testing

No unit test runner is configured and no `Verify` command is declared in `AGENTS.md`, so none was run while writing this spec. Browser
tests run on the local database only (`/api/health` must say `local` first). `records-layout.spec.js` opens each of its five live cases and
resizes through 320, 390, 639, 640, 768, 1023, 1024 and 1280px (widest first), checking: the document no wider than the window, nothing
outside its panel (apart from the strips that scroll on purpose), no word broken mid-word, the podium stacked below `lg` and three across
from it, the Top 50 as a list below 640px (no `table`, 50 rows) and as a table from 640px that fits its panel, tabs at least 44px high
below 640px, the metric a select below 640px (with every metric of the group as an option, and choosing one changing the address) and the
strip from 640px, and TV codes below 640px for a club board. A mocked case with a very long player and club name covers wrapping and the
loading, error and empty states at 320px. Evidence while building comes from single page visits through the Playwright library. Final gate:
root `npm run build` plus `cd frontend && npm run lint`.

## Notes for the AI

- Follow the user's rules: changes stay on the page being built, shared components get opt-in props only. The TV code is the short label
  wherever a full name does not fit; the club code is the permanent ID (memory notes).
- Reuse what 31k and 31l built (`ShortLabel`, `grid-cols-[minmax(0,1fr)]`, the Leaders board rows) and read
  `blueprint/history/features/31k-leaders-mobile-layout.md` for the details and the mistakes to avoid. Never open the real `.env`.
- Take the baseline with a throwaway probe before changing code and delete it afterwards. Run only the specs named here; rerun a single
  failing test with `-g`, never the set.
- The error state is the shared `AsyncState` (redesigned in a fix just before this item); do not restyle it here.
- Match the surrounding code style and comment density. No AI attribution in commit messages (AGENTS.md).

## Open questions

Each has a recommended default.

1. **Podium on tablet.** Recommended: keep one card under another below `lg`, as today, and change it only if the baseline shows a
   640 to 1023px page that is mostly empty space. The alternative is a two-column podium from `sm` with the winner spanning both.
2. **Bar in the phone rows.** Recommended: keep the bar under the value in the Top 50 rows if it fits at 320px without crowding, and
   drop it otherwise (the value and rank carry the meaning).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":12849,"specSha256":"1e565c34d8d6d72600c5d4b4b66b34d0a327bba20e3aa390034d4a9eb37f3b2b","branch":"refs/heads/feature/records-mobile-and-tablet-layouts","head":"dbaa0b6fef60058b041f1a9e297f68b42128e73d","baseRef":"refs/heads/master","baseCommit":"dbaa0b6fef60058b041f1a9e297f68b42128e73d","sourceTree":"e6d58e0512963008a7f8844664073fdf9ac3804a","absentOptional":[]} -->

## Completion evidence

- Baseline before the change (a throwaway probe on the live data at 1280 to 320px, deleted afterwards): no page-level sideways scroll, but the Top 50 table was 537 to 708px wide in a 296px panel below 640px and wider than its panel at 640px for the game types; the group strip tabs were 32px high.
- Local database (`/api/health` said `local`): `records-layout.spec.js` (8 tests: five live cases at 1280, 1024, 1023, 768, 640, 639, 390 and 320px, the phone metric select, and a mocked 320px test with very long names, loading, error and empty states) and `records.spec.js` with the Records entries of `responsive.spec.js` (25 tests, including the new team games page) all passed.
- Screenshots at 390px of the team games page (podium, Best in each season, Progression, Top 50 rows) were read; the Progression date was moved under the holder after the first look.
- Root `npm run build` (with the backend `tsc` check) and `cd frontend && npm run lint` pass. No `Verify` command is declared in `AGENTS.md`.
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested.
