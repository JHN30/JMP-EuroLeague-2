# Feature: Records desktop polish

**From build-plan:** feature 33b
**Build attempt:** 1
**Branch:** feature/records-desktop-polish
**Status:** verified

## Goal

Rebuild the Records page (`/:season/records`) so it looks and behaves like the pages around it on a desktop screen: the record families and
metrics as tab strips (with the descriptions 17h-i promised), a podium, a record progression you can read at a glance, a best-in-each-season
view, and a Top 50 board with names, clubs and seasons written the way the rest of the app writes them, with the same restrained animation as
Leaders and Compare. No API or data change. Desktop first: the layout is designed for `lg` (1024px) and wider; below that the panels stack and
the page must keep its place in the overflow spec, but its tablet and phone layouts are 31m.

Today (read from `RecordsPage.jsx`, 66 lines, unchanged since 17h, and from the three records routes in `backend/src/routes/seasons.ts`):

- **Chooser:** three plain `btn` buttons ("Player seasons", "Single-game", "Team-season") and a `CompactFilterSelect` for the metric (Points,
  Rebounds, Assists, PIR). The descriptions 17h-i specified for the chooser are not there. The choice is component state only: it is not in the
  address, so a link cannot open "Team-season, PIR" and Back does not step through choices.
- **Loading:** `query.isLoading` replaces the whole page, controls included, with a spinner, and every metric or family change loads again from
  scratch (the query key changes, no previous data is kept), so the page flashes.
- **Content:** a "Podium" panel (three `<p>` lines), a "Record progression" panel (one `<p>` per record that beat the one before, in season
  order), "Best in each season" (player records only) and a "Top 50" `table` with no styling beyond `.table`. Season codes show raw ("E2025"),
  player names raw and upper-case ("VEZENKOV, SASHA"), the best-in-season links use the raw code (they work only through the season redirect),
  and nothing animates.
- **Data the rows carry** (all that exists; no portrait or crest is in any record row): player seasons `seasonCode`, `personKey`, `playerName`,
  `clubName`, `clubTvCodes`, `numericValue` (season totals over all phases, top 50 across the loaded seasons); single games `seasonCode`,
  `gameCode`, `personKey`, `playerName`, `clubName`, `clubTvCode`, `scheduledAt`, `numericValue`; team seasons `seasonCode`, `clubCode`,
  `clubName`, `clubTvCode`, `numericValue` (the season's summed total). `label` names the metric. Single-game and team-season metrics are
  `points`, `totalRebounds`, `assistances`, `valuation`; the page maps its four metric keys onto them.
- `records.spec.js` (3 mocked tests) clicks the family buttons by role "button". `responsive.spec.js` has a Records entry (overflow at 320,
  390, 768 and 1024px; the header spacing; the phone bar names it).

## In scope

1. **Chooser.** The family is a level-1 `TabStrip` ("Player seasons", "Single-game", "Team-season") with the active family's description under
   it ("The highest season totals by one player", "The best single games by one player", "The highest season totals by one club"); the
   metric is a level-2 `TabStrip` (Points, Rebounds, Assists, PIR). The active family description sits in the page header under the title (see "Changed at review"). Both choices live in the address as `type` (`player`, `game`, `team`) and `metric` (the four keys); the defaults (`player`,
   `pointsScored`) are left out of it, an unknown value falls back to its default, and the choice behaves in history like Leaders' scope and
   metric (read `LeadersPage.jsx` and follow it).
2. **No flash.** The controls and the page header stay on screen while a choice loads; the content area keeps the previous rows (TanStack
   Query `placeholderData: keepPreviousData`), marks itself busy, and swaps when the new rows arrive. The full loading state, with Retry on
   failure, shows only when there is nothing to show yet.
3. **Podium.** The top three as three cards in a row from `lg`: a rank medal (the numeral is always there; colour is only a second cue), the
   value large with the metric's label, the name (players as "First Last", clubs by `clubName`) linked to its page, the club for a player
   (TV code and name) or the crest for a club (taken from the season's teams query when the club is in it; no crest otherwise), the season as
   "2025-26" (`formatSeasonLabel`), and for a game the date and a "Game" link. Fewer than three rows show the cards there are.
4. **Record progression.** A vertical timeline, oldest first, of each record that beat the one before: the value, the name, the season (or
   the game's date), the gain over the previous record ("+12"), and a "Current record" mark on the last. One row shows without a gain.
5. **Best in each season.** For all three families (see the open questions): one row or card per season that has rows, the leader's name
   (linked), value and club, the season's record holder, with the overall record marked.
6. **Top 50.** A styled table inside its panel: the rank (the top three with the medal), the name linked with the club under it, the
   season, the game link for a single game, and the value with a thin bar sized against the first row. The value column header carries
   the metric's label, with the PIR tip text that already exists in `leaders/leaderDefs.js` through `HeaderTip` for PIR, and nothing
   invented for the other three.
7. **Names and links.** Player names go through the helper the app already uses for "LAST, FIRST" to "First Last"; every link to a
   player, team or game uses the season slug (`seasonSlug`), the best-in-season ones included.
8. **Motion.** A short staggered entrance for the podium cards and the list rows with the presets in `lib/motion.js`, and a fade of the
   content area when the family or metric changes (as Leaders' panel does); nothing moves under `prefers-reduced-motion` (the global
   `MotionConfig` already handles it); no animation on a data refresh that changes nothing.
9. **States.** First load, error with Retry, no rows ("No records are available for this metric.", in the content area and not only in the
   table), and a row with a missing club, crest, date or name show their part as absent (never zero or "undefined").
10. **Below `lg`.** The panels stack in one column with `grid-cols-[minmax(0,1fr)]` and the table scrolls inside its panel, so the page
    keeps passing the overflow spec at 320, 390, 768 and 1024px; nothing else is designed for those widths here (31m).
11. **Specs.** `records.spec.js` updated (tabs by role, the address), a new `records-layout.spec.js` for 1024 and 1280px, and the Records
    entries of `responsive.spec.js` kept passing.

## Out of scope

- Any API or data change: no new metric, no new family, no portraits or club crests added to the record rows, no all-time or archive-wide
  wording (the page stays "archive-to-date" over the loaded seasons).
- The tablet and phone layouts and their checks (31m); other pages; the navigation tab (33a, done).
- Changing how a record is computed or ranked on the server; the 50-row limit.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the narrow check after
each, then present one final review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Baseline, chooser, address and loading.** Before changing code, take a baseline of the live page (every family, the Points and PIR
      metrics) at 1280 and 1024px with a throwaway probe (page width, anything outside its panel, the tables' widths, the screenshots);
      delete the probe afterwards. Then rebuild the top of the page: the two `TabStrip`s with the family description, `type` and `metric` in
      the address, and `keepPreviousData` with a content area that stays while a choice loads. Split the page into `RecordsPage.jsx` (state,
      query, layout) and `RecordParts.jsx` (the panels) as the work grows.
      Done when: the strips switch by click and arrow keys, the address carries `type` and `metric` (and drops the defaults), a link such as
      `/2026/records?type=team&metric=pir` opens on that choice, Back steps through choices as it does on Leaders, and a metric change keeps the
      header and strips on screen with no spinner after the first load.
- [x] 2. **Podium and progression.** Build the podium cards and the timeline per items 3, 4 and 7, with the shared name helper, the season label
      and the season-slug links, and the team crest from the season's teams query.
      Done when: for each family the podium shows three cards with the medal numeral, value, name link, club (or crest) and season (and the
      game date and link), the timeline shows each record with its gain and the current record marked, and a family with one row or none
      shows its empty or single state.
- [x] 3. **Best in each season and Top 50.** Build item 5 for all three families and the Top 50 board per item 6, with the PIR tip.
      Done when: every family shows one entry per season that has rows, the Top 50 shows 50 rows (or as many as there are) with rank, linked name
      and club, season, game link for single games and the value bar, and the PIR header opens its tip on hover and focus.
- [x] 4. **Motion and states.** Add item 8 and check item 9.
      Done when: the podium and the rows enter in a short stagger on first view and on a family or metric change, nothing animates with reduced
      motion (emulated), an error shows Retry and the retry reloads, and an empty response shows its message in the content area.
- [x] 5. **Specs.** Update `records.spec.js`, write `records-layout.spec.js`, keep the Records entries of `responsive.spec.js` passing, then run
      them.
      Done when they pass on the local database (`/api/health` says `local`), with root `npm run build` and `cd frontend && npm run lint`.

## Files / areas

- `frontend/src/records/RecordsPage.jsx` and a new `frontend/src/records/RecordParts.jsx` (and a small helper file only if the grouping and
  progression maths grow past what reads well in the page).
- Read and reuse: `lib/TabStrip.jsx`, `lib/HeaderTip.jsx`, `lib/Panel.jsx`, `lib/PanelHeader.jsx`, `lib/PageHeader.jsx`, `lib/AsyncState.jsx`,
  `lib/motion.js`, `lib/format.js` (`formatSeasonLabel`, `formatCount`, `formatDate`), `lib/seasonSlug.js`, the player-name helper, `leaders/LeaderParts.jsx`
  (`Avatar` for a crest), `leaders/leaderDefs.js` (the PIR tip), `lib/api.js` (`getSeasonTeams` for crests). `LeadersPage.jsx` is read for its
  address handling.
- `frontend/e2e/records.spec.js`, new `frontend/e2e/records-layout.spec.js`, `frontend/e2e/responsive.spec.js` (only if its Records entry needs a change).

## Data / contracts

None changed on the server. The page reads the existing `records/player-seasons`, `records/single-games` and `records/team-seasons` responses with
the existing `metric` values, and (for crests) the cached `["teams", seasonCode]` season-teams response. A `NULL`, missing or non-finite value
is skipped by the server already; on the client a missing club, crest, date or name omits that part. The address gains two optional query
parameters, `type` and `metric`, validated against fixed lists on read (an unknown value means the default); record, player and club names
are rendered as React text, never as HTML.

## Testing

No unit test runner is configured and no `Verify` command is declared in `AGENTS.md`, so none was run while writing this spec. Browser tests run on
the local database (`/api/health` must say `local` first). `records.spec.js` (mocked): the three families through the tabs by role, the address
for each choice and a direct open on `?type=team&metric=pir`, the podium and the timeline for a family with several rows, one row and none,
the player name written "First Last", links with the season slug, the game link, the error state with Retry, and no spinner on a metric
change after the first load. `records-layout.spec.js` (live data, 1280 and 1024px): no sideways page scroll, nothing outside its panel, the
podium three across, the Top 50 table inside its panel with its columns visible, and every link's season in the address a slug. The Records
entries of `responsive.spec.js` (overflow at 320, 390, 768 and 1024px; the header spacing at 390 and 1280px) are run with `-g Records`. Run
only these three spec files and rerun a single failing test with `-g`, never the set. Evidence while building comes from single page visits
through the Playwright library. Final gate: root `npm run build` plus `cd frontend && npm run lint`.

## Notes for the AI

- Follow the user's rules: changes stay on the page being built, shared components get opt-in props only. Desktop first; do not design the
  tablet or phone layout here (31m), but do not leave the page overflowing.
- Match what the other pages did: read `LeadersPage.jsx` (tab strips, address, panel fade), the team and player page headers for the card
  language, and `blueprint/history/features/` for 31k (Leaders) and 33a for the latest conventions. Colour is never the only cue (the medal
  numeral is always shown). Never open the real `.env`.
- Take the baseline with a throwaway probe before changing code and delete it afterwards. Run only the specs named here. Match the surrounding
  code style and comment density. No AI attribution in commit messages (AGENTS.md).
- Player headshots are not in the record rows, so none are shown; adding them is an API change and a later item if wanted.

## Open questions

Each has a recommended default, which the steps above build unless you say otherwise.

1. **Best in each season for every family.** Today only player records have it. *Recommended:* all three families (the rows already carry the
   season), which also fills the page when a progression has few entries. Alternative: player seasons only, as now.
2. **The choice in the address.** *Recommended:* `type` and `metric` in the address (item 1), so a record view can be linked and Back works.
   Alternative: keep it in component state, as now.
3. **Crests.** *Recommended:* a crest on team-season records only, joined from the season's teams (a club missing from that season's list shows
   none). Alternative: no images anywhere, as the rows have none.

## Built

All three open questions were built with their recommended defaults.

- `RecordsPage.jsx` holds the state (the address, the query with `keepPreviousData`, the crests from the season's teams) and the layout;
  `RecordParts.jsx` the podium, the progression, the best of each season and the Top 50; `recordData.js` the pure parts (the family and metric
  lists, a row as the page shows it, the progression and the best of each season).
- The fetched data is tagged with the family and metric that fetched it, so while the next choice loads the page keeps drawing the old rows as
  their own family; the content area is marked `aria-busy` and dimmed, and its entrance animation is keyed by what it shows.
- Baseline before the change: no sideways scroll at 1280 or 1024px and nothing outside a panel (the page was plain, not broken); the live rows
  carry no portrait or crest, as the spec said.
- Evidence: 9 mocked tests in `records.spec.js` and 3 live ones in `records-layout.spec.js` pass, with the Records entries of `responsive.spec.js`
  (7 tests: overflow at 320, 390, 768 and 1024px, the header spacing, the phone bar), on the local database; root `npm run build` and
  `cd frontend && npm run lint` pass. Screenshots of the three record types at 1280px were checked.

## Changed at review

After trying the page, the user asked for the family's description ("The highest season totals by one player.") to move up under the page title,
in the header, and for the line "Archive-to-date player-season records." to go. Done: the header's description is the active family's, the
line between the two strips is gone, the `noun` field of the family list is removed, and the three tests that read the old sentence read the
new one. The records specs pass again (9 mocked tests, 3 live, and the 7 Records entries of `responsive.spec.js`).

The same review asked for more than this item may do (no API change): a strip of traditional and advanced metrics for every record type,
team single-game records, and player portraits and club crests in the rows. Those need new record routes and image fields, so they are
proposed as separate plan items.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":16543,"specSha256":"a2ec19b27e22758a2d732a7d6ee83c78e44df21dae490bef847404eb1713311a","branch":"refs/heads/feature/records-desktop-polish","head":"2186fda5cf37e293bab8019db5a408786087f054","baseRef":"refs/heads/master","baseCommit":"2186fda5cf37e293bab8019db5a408786087f054","sourceTree":"6aa89e3fc15d70d4dcbf5352cee2e6c12bf9800a","absentOptional":[]} -->

## Completion evidence

- Browser tests on the local database (`/api/health` said `local`), run after the last change (the header description): `records.spec.js` (9 mocked tests) and `records-layout.spec.js` (3 live tests) 12 passed, and the Records entries of `responsive.spec.js` 7 passed.
- Root `npm run build` and `cd frontend && npm run lint` pass (rerun at completion). No `Verify` command is declared in `AGENTS.md`.
- Screenshots of the three record types at 1280px were checked while building.
- The plan lines for 33c (Records data) and 33d (Records page: metric groups, team games, pictures) were added to `build-plan.md` during review and travel in this work commit. The overview body and its fingerprint were not changed here: `/overview` has not been run for them yet, so the fingerprint still differs from the plan on purpose.
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested.
