# Feature: Team page Statistics and Roster mobile layout

**From build-plan:** feature 31h-ii
**Build attempt:** 1
**Branch:** feature/team-page-statistics-and-roster-mobile-layout
**Status:** verified

## Goal

Make the team page's **Statistics** and **Roster** tabs (`/:season/teams/:clubCode`, `frontend/src/teams/TeamStatisticsSection.jsx` and `TeamRosterSection.jsx`) comfortable from 320px up: no sideways page scroll, nothing clipped, and the long Roster tab not several screens of wasted space. Layout and label only: no API, data or feature change. Mobile is below 640px (unprefixed styles), tablet is `sm` (640px), desktop is `lg` (1024px); `xl` stays. This is the second of four parts of 31h; the page header, strips and Overview shipped in 31h-i, the Shooting and Games tabs (31h-iii) and Advanced (31h-iv) follow.

Measured at 320px with live data (Paris):

- **Statistics** already works: the rows are a grid with the stat name on its own line, the rank, the two numbers and two half-bars, and the page does not scroll sideways. What does not fit is the club's name in the column heading (`Paris`, but `Panathinaikos` or `Crvena Zvezda` is truncated in a column about 55px wide).
- **Roster, Cards** work but are long: one 150px-tall card per player (16 players, 5 coaches) makes a page about 3,600px tall; the facts panel (Players, Average age, Average height, Nationalities) wraps unevenly; each coach card carries a silhouette portrait that wastes the same space as a player's photo.
- **Roster, Table** is 674px wide in a 294px box. The pinned player column (jersey, thumbnail, name with a comma, a "Former" badge) takes about 225px, so only about 70px of the stats shows before swiping, and the names are cut ("HERRERA, SEBAS...").

## In scope

1. **Statistics: the club's heading.** Below `sm` the column heading over the club's numbers is its TV code (`team.tvCode`, then the abbreviated name, then the club code), from `sm` the name as today, through `ShortLabel` (the full name stays for screen readers). The panel title and the footnote keep the name. Check, and fix only what clips, the title wrapping, the rank/number/bar columns at 320px, the loading, error ("Could not load team statistics."), empty ("This club did not play any games in the selected phase.") and rank-less (the ranks failing to load) states.
2. **Roster: the facts panel.** Below `sm` the four facts (Players, Average age, Average height, Nationalities with their codes) are a two-column grid, with the nationalities on a row of its own, so they do not wrap unevenly; from `sm` as today.
3. **Roster: cards.** Below `sm` a player card has a narrower portrait (`w-20`, 80px, through `PlayerPortrait`'s existing `className` prop) and a shorter minimum height, so the page is shorter; from `sm` as today. The first name, last name (truncated, with its title), number, details line, stat line and minutes bar never overflow the card at 320px, for a long hyphenated name too.
4. **Roster: coaching staff.** Below `sm` a coach is a compact card without the empty portrait (name, role and nationality only); from `sm` as today.
5. **Roster: table.** Below `sm` the pinned first column is the jersey number and the player's last name (the full name from `sm`, kept for screen readers and the link's title), with no thumbnail and a narrower padding, so the stats start within about 140px of the left edge and swiping reveals the rest; the "Former" badge stays visible. From `sm` the column is as today. Player names are written without the feed's comma at every width ("NTILIKINA FRANK"), as 31h-i did for the leaders. The page itself never scrolls sideways; the table scrolls inside its panel.
6. **States and robustness.** The roster's loading, error ("Could not load the roster."), empty ("Roster not available yet."), the stats' error ("Could not load roster statistics.") and a coaches request that fails or is empty (the players still show), a player without a photo or without games ("Has not played yet"), a player without a number, and a former player in the table, at 320px.
7. **Browser check.** A new Playwright spec (see Testing).

## Out of scope

- The header, strips and Overview (31h-i), Shooting and Games (31h-iii), Advanced (31h-iv); the other pages' player names.
- What the tabs say: the stats, their order, groups, ranks, tips and copy, the roster's grouping by position, the Cards/Table switch and its labels, the table's columns and their order are unchanged. No hidden statistics on phones, no new controls.
- Any API, data, query or routing change; TV code at desktop widths.
- Shared components: `PlayerPortrait`, `Panel`, `TabStrip` and `StatBarCell` keep today's behaviour (the narrower portrait is the existing `className` prop; any other change is an opt-in prop with today's default).

## Build loop

`workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`: build the steps in order, run the narrow check after each, run the final gate once, then present one review packet. `/complete` makes the single work commit.

## Build steps

- [x] **1. Statistics heading and the spec.** `ShortLabel` for the club's column heading; start `frontend/e2e/team-statistics-roster-layout.spec.js` with the Statistics tab at 320, 390, 639, 640, 768, 1023 and 1024px (live data for the numbers, a mocked long-named club for the heading) and its states. **Done when:** at 320px the heading shows the TV code and the full name is in the page for screen readers, nothing in the panel sticks out of it, the page does not scroll sideways at any width, and the states fit; the spec passes.
- [x] **2. Roster facts, cards and coaches.** The two-column facts grid, the narrower portrait and shorter card, the compact coach card, all below `sm`. **Done when:** at 320px the facts hold their content in two columns, a card is shorter than before (about 150px down to the new minimum) with its text inside it for a long name, a coach card has no portrait and is about half as tall, from 640px nothing changed (card height, portrait width, grid columns), and the spec covers each.
- [x] **3. Roster table.** The compact pinned player column below `sm` (jersey, last name), the comma-free names at every width, the roster states. **Done when:** at 320px the pinned column is at most about 45% of the table's box, the stat columns can be swiped into view inside the panel while the page does not scroll sideways, the link's accessible name is the full name, the names have no comma at any width, the states (loading, error, empty, stats error, coaches failing, no photo, no games, former player) fit, and `lint`, `build`, this spec, `team-overview-layout.spec.js`, `team-stats-null.spec.js` and the Team page entries of `responsive.spec.js` pass.

## Files / areas

- `frontend/src/teams/TeamStatisticsSection.jsx`, `TeamRosterSection.jsx` (and `index.css` only for a rule that classes cannot express).
- `frontend/src/lib/ShortLabel.jsx` and `lib/playerName.js` (`nameParts`, `withoutComma`) are reused, not changed.
- `frontend/e2e/team-statistics-roster-layout.spec.js` (new).

## Data / contracts

No API or data change. The labels use fields the responses already carry: `tvCode` on the team (`getTeam`), the roster's `player.name` ("LAST, FIRST") split with `nameParts` for the last name. A last name is a label for narrow widths only: the link still goes to the same player and its title and accessible name are the full name. If a name has no comma the last name is the whole name.

## Testing

`npm run lint`, `npm run build` (no unit test command exists). Browser tests: `cd frontend && npm run test:browser`; the new spec and the existing Team specs alone first, then the whole suite once (known load-flaky specs pass alone).

`team-statistics-roster-layout.spec.js` (patterns from `team-overview-layout.spec.js`): read the live season and a team from the API, mock only what a case needs with `page.route` (the later registration wins), load once and resize through 320, 390, 639, 640, 768, 1023 and 1024px. Checks: `documentElement.scrollWidth <= clientWidth`; Statistics heading text by width and nothing inside the panel outside it; the facts' columns; card heights and portrait widths below and from 640px; coach cards without a portrait below 640px; the table's pinned column width against its box, its stat columns reachable by scrolling the panel (and the page not scrolling), names without a comma, accessible names. Mocked cases: a long-named club, a long hyphenated player, a player without number or photo or games, a former player, no coaches, and each tab's error and empty state at 320px.

## Notes for the AI

- Work only on these two tabs; shared pieces get opt-in props with today's default. Do not start a dev server (Playwright starts its own when none runs).
- Measure first (step 1): the numbers above come from Paris at 320px; re-check with a long-named club.
- Reuse what exists: `ShortLabel`, `PlayerPortrait`'s `className`, `nameParts`/`withoutComma`, the `.data-table-sticky` rule, the spec helpers' patterns.
- Two choices for review: below `sm` the roster table's pinned column shows the last name only (alternative: the full name truncated), and roster cards stay one per row but shorter (alternative: two per row, which at 320px leaves about 140px per card).
- TV code on game and match cards at desktop widths is a separate, still-open product point.

## Notes

- Measured at 320px with the live data after the change: a player card is 117px tall (150px before) with an 80px portrait (112px from 640px, unchanged); a coach card is 81px with no portrait (136px from 640px, unchanged); the roster page is about 3,560px tall. Two cards per row was not built (the spec's alternative).
- The pinned player column is about 43% of the panel at 320px: jersey number and last name (title and accessible name are the full name without the comma); a "Former" badge sits under the name below `sm`, because beside it the badge widened the whole column to 51%. Near 640px the table fits its panel and there is nothing to swipe.
- The Statistics tab needed only its column heading (the club's TV code below `sm`); everything else there already fitted.
- In the whole-suite run `leaders.spec.js` and the `phone-menu.spec.js` 639px case failed under load; both are existing load-dependent specs (the leaders spec also failed with an earlier change stashed, the menu spec is the known menu flake) and pass when run alone (on the first rerun of the menu spec a different case, the reduced-motion one at 390px, failed once; three further runs passed 13 of 13).
- Revision asked for at review (three screenshots): (1) the roster facts below `sm` are a plain two by two (Players, Average age / Average height, Nationalities) instead of the nationalities spanning a row of their own; (2) the roster table's panel has no left padding below `sm` (`max-sm:pl-0`), because the pinned column sticks to the panel's padding edge and the 8px gap showed the Position column scrolling past on its left (a point just inside the panel's edge now belongs to the pinned cell; the check fails without the fix); (3) a Statistics row below `sm` is now two lines on a four-column grid: the stat name centred over the whole row with the club's rank at the row's left edge, then the club's number, a bar each (the two bars meet at the row's middle) and the opponents' number, and the group heading row follows the same columns (Rank at the left, the club over its bar, Opp. over the other). From 640px the single-line row is unchanged.
- The full suite failed three load-dependent cases (`leaders.spec.js` and two phone-menu cases) after this revision; the three files pass together (122 of 122) when run alone.
- Second revision asked for at review: the roster table's points bar showed its number (orange, positioned with its own z-index) through the pinned player column while swiping, because the pinned cells' z-index 1 equalled it and it comes later in the page; the pinned body cells are now z-index 2 on this table only (`[&_tbody_td:first-child]:z-2!`, the shared sticky rule stays). A first try with z-index 10 put the names over the sticky bar (its z-index is 10 and the cells come later in the page) when the page was scrolled; 2 clears the bar's number (1) and stays under the bar, and the spec scrolls the table up behind the bar to check it (fails with 10). The table's text is 12px below `sm` (14px from `sm`, as before). Games played is a whole number: the per-game endpoint writes it as "3.0", and the table now shows "3" at every width (this table only; other places that print the raw value are not part of this item). The spec checks all three, each fails without its change, and the related specs (150 tests) pass.
- Last change asked for at review, made after the completion bookkeeping had been run and undone before any commit: the Statistics group heading no longer has a "Rank" label over the rank column at any width (the rank, "15th", says what it is; each rank keeps its title "15th of 20 clubs"). The heading row keeps an empty cell there so the club's heading and "Opp." stay over their bars. The spec checks that no "Rank" text is on the tab.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":13183,"specSha256":"1462282d3f23b2998eedf46d6b32c8ea8c71def490399712539d5589aaf91ec1","branch":"refs/heads/feature/team-page-statistics-and-roster-mobile-layout","head":"ea3d099dd5e68834b7592a001f5ecd58a4ad68e0","baseRef":"refs/heads/master","baseCommit":"ea3d099dd5e68834b7592a001f5ecd58a4ad68e0","sourceTree":"6755a2a9bd10c71311ef933ac4dcb4429d101f10","absentOptional":[]} -->
