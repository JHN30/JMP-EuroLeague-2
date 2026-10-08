# Feature: Team page header, tabs and Overview mobile layout

**From build-plan:** feature 31h-i
**Build attempt:** 1
**Branch:** feature/team-page-header-tabs-and-overview-mobile-layout
**Status:** verified

## Goal

Make the top of the team page (`/:season/teams/:clubCode`) and its **Overview** tab comfortable from 320px up: the page header (crest, names, "Next game" chip), the two tab strips under it (Section and Phase), and the Overview panels (record snapshot, team leaders, league profile, quick comparison, recent form and upcoming games). No sideways page scroll, nothing clipped, nothing squeezed to a few characters. Layout and label only: no API, data or feature change. Mobile is below 640px (unprefixed styles), tablet is `sm` (640px), desktop is `lg` (1024px); `xl` stays.

This is the first of four parts of 31h: 31h-ii (Statistics and Roster), 31h-iii (Shooting and Games) and 31h-iv (Advanced) follow. The Team page is already in the overflow spec (`responsive.spec.js`, "Team page"), which only reports elements that stick out of the page; it does not see squeezed or truncated content.

Read, not yet measured at 320px (step 1 measures it):

- `TeamPage.jsx`: `PageHeader` with a 64px crest, the club name as `h1` and "ABBREVIATED · COUNTRY" under it, then `NextGameChip` (`ml-auto text-right`, "vs/@ opponent" and the date). Two `TabStrip`s with `w-fit`: Section (6 tabs, `level={1}`) and Phase (one tab per phase, `level={2}`), neither `scrolling`. `TeamSnapshot` is a `Panel p-5` (record in `text-4xl`, streak badge, form pills, two points bars on a `grid-cols-[4.5rem_1fr_3rem]`, a facts row). `TeamLeaders` is `.team-leaders-grid`: one column below `sm`, four tall photo cards (padding 1.5rem, 8.5rem image) stacked, so about 700px of scrolling. `GameLinkRow` is a line with a `w-16` round label, the opponent's abbreviated name and a result (`w-14` score) or a date, where the date is `flex-none` and can squeeze the opponent.
- `TeamLeagueProfile.jsx`: `PanelHeader` with its two `stat-badge`s as `trailing` (the header is a non-wrapping flex row), a `md:grid-cols-2` grid of ten rank bars. `TeamQuickCompare.jsx`: `ClubLabel` (24px crest and the abbreviated name) in two half-width cells, a "Compare against" `TabStrip` whose longest label is "Next opponent · league leader", `ComparisonRow`s.
- Existing pieces to reuse: `TabStrip`'s `scrolling` prop (a one-row strip that scrolls on its own and keeps the active tab centred), `ShortLabel` (`lib/ShortLabel.jsx`: short text below `sm`, full text from `sm`, full text kept for screen readers), `teamCode` in `games/gameUtils.js` (TV code, then abbreviated name, club code, "TBD"), `ComparisonRow`'s existing `compact` prop. Club TV code is the season's code; the game rows carry it as `tvCode` on `localTeam`/`roadTeam` (32a) and the Teams list as `tvCode` (see the memory note on club TV code versus club code).

Targets: at 320px the page does not scroll sideways; both tab strips are one row each, with the active tab visible; the header, the Next game chip and every Overview panel hold their content inside their box; opponent and club labels use the TV code where the abbreviated name does not fit; the four leader cards are a swipe row instead of a long stack.

## In scope

1. **Header.** Below `sm` the Next game chip sits under the names, left-aligned, as a full-width line (not floated right); from `sm` it stays as today. The crest stays 64px (never squeezed: `flex-none`) and a long name ("Panathinaikos AKTOR Athens", "Crvena Zvezda Meridianbet Belgrade") wraps by whole words inside the header. The chip's opponent is the TV code below `sm` and the abbreviated name from `sm`.
2. **Section and Phase strips.** Both are `scrolling` (one row; below `lg` they scroll on their own and keep the active tab centred), so six section tabs and the phases (including a long "Regular Season" label) never wrap onto several rows or sit wider than the screen. At `lg` and up they look as today. The spacing between the header, the strips and the panel stays the `mb-4`/`mb-6` rhythm used today.
3. **Snapshot.** The panel uses `p-4 sm:p-5` (the page gutter scale). The record and streak badge, the form pills, the two points bars and the facts row hold their content at 320px; the facts row (League position, Home, Away, Played, Remaining) is a tidy grid below `sm` instead of loose wrapping items if measuring shows it wraps unevenly.
4. **Team leaders.** Below `sm` the four cards are a swipe row like Home's leader cards: about 85% card width, scroll-snap, the row a labelled group (`role="group"`, `aria-label="Team leaders"`), the cards (already links) focusable. From `sm` the grid is today's (two columns, four from `2xl`). The rules are written on `.team-leaders-grid`, so Home's `.leaders-row` and the Season overview's grid are untouched.
5. **League profile.** The header's two badges ("Strongest: ...", "Weakest: ...") go under the title on their own line(s) below `sm` and stay as `trailing` from `sm` (the same badges rendered once per slot, the hidden one `display: none`, so screen readers read them once). `md:grid-cols-2` becomes `sm:grid-cols-2` (the two retired-`md` breaks are 640 and 1024; at 768 the grid is two columns as today). Ten rank rows keep label, value and rank on one line at 320px (the label may wrap, the value and the rank never do).
6. **Quick comparison.** `ClubLabel` shows the club's TV code below `sm` and its name from `sm`, when the data has one (the next opponent comes from a game row with `tvCode`; the league leader from the standings row; fall back to today's name when it has none). The "Compare against" strip is `scrolling`. Rows use `ComparisonRow compact`, bars kept unless a measurement shows they do not fit. The header's "Full comparison →" link stays beside the title and does not wrap.
7. **Recent form and Upcoming games.** In `GameLinkRow` the opponent is the TV code below `sm` and the abbreviated name from `sm` (through `ShortLabel`); the round label, the Win/Loss word, the score and the date never squeeze the opponent to nothing. A long date text is shortened below `sm` (the short date form `lib/format.js` or the game header already uses, with the time) and unchanged from `sm`.
8. **States and robustness.** Check, and fix only what clips: the team's loading, "Team not found." and error states (with the back link) at 320px; the snapshot's loading, error and "No record yet for this phase." states; the leaders' loading, error and empty states; the profile's and the comparison's loading, error and empty states; a club with no crest (no media), a club with no games (no Next game chip, "No played games yet."), a long player name in a leader card.
9. **Browser check.** A new Playwright spec (see Testing).

## Out of scope

- The other tabs: Statistics and Roster (31h-ii), Shooting and Games (31h-iii), Advanced (31h-iv), and the roster and games data the Overview shares with them.
- What the Overview says: the panels, their order, the numbers, the ranks and their copy are unchanged. No hidden statistics on phones, no new controls, no phase select in place of the Phase strip.
- Any API, data, query or routing change; the leader name form (kept as the feed gives it); the TV code at desktop widths (this item changes only what is shown below `sm`).
- Changes to shared components other than opt-in props and a new `scrolling` use: `PageHeader`, `PanelHeader`, `Panel`, `TabStrip` and `ComparisonRow` keep today's default behaviour.

## Build loop

`workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`: build the steps in order, run the narrow check after each, run the final gate once at the end, then present one review packet. `/complete` makes the single work commit.

## Build steps

- [x] **1. Measure, then the header and the two strips.** Open the page at 320, 390 and 639px with a long-named club (and the live data), note what clips (write the findings under Notes below, replacing the assumptions above where they are wrong). Then: the Next game chip under the names below `sm` with the TV code, the crest `flex-none`, `scrolling` on the Section and Phase strips. Start `frontend/e2e/team-overview-layout.spec.js` with a header and strips test at 320, 390, 639, 640, 768, 1023 and 1024px. **Done when:** at 320px the header holds its content, the chip is left-aligned under the names, each strip is one row with the active tab on screen, the page does not scroll sideways, and the new spec passes at all widths.
- [x] **2. Snapshot and Team leaders.** The snapshot's padding and facts row, then the leaders swipe row below `sm` (labelled group, 85% cards, snap) and today's grid from `sm`. **Done when:** at 320px the snapshot holds its content, the leaders are one row that scrolls sideways inside its own box (the page does not) with the first card about 85% of the panel's width, from 640px the grid is two columns as today, and the spec covers both.
- [x] **3. League profile and Quick comparison.** The profile's badges under the title below `sm` and `sm:grid-cols-2`; the comparison's TV-code labels, scrolling "Compare against" strip and compact rows. **Done when:** at 320px the badges are under the title, ten profile rows keep value and rank on one line, the comparison's two club labels show TV codes, the strip is one row, and the spec covers each width.
- [x] **4. Recent form, Upcoming games, states, final pass.** `GameLinkRow` with `ShortLabel` and the short date below `sm`; the states listed in scope item 8 mocked and checked at 320px; update `responsive.spec.js`'s "Team page" entry only if it needs it. **Done when:** the form and upcoming rows keep their opponent readable at 320px, every state fits without sideways scroll, the new spec, `team-stats-null.spec.js` and the Team page entries of `responsive.spec.js` and `detail-back-links.spec.js` pass, `npm run lint` and `npm run build` pass.

## Files / areas

- `frontend/src/teams/TeamPage.jsx` (header, strips, chip, snapshot, leaders, `GameLinkRow`), `TeamLeagueProfile.jsx`, `TeamQuickCompare.jsx`.
- `frontend/src/index.css`: `.team-leaders-grid` phone rules (and `.next-chip` if it needs a phone rule), nothing else shared.
- `frontend/src/lib/ShortLabel.jsx` and `games/gameUtils.js` (`teamCode`) are reused, not changed. `TabStrip.scrolling` is reused.
- `frontend/e2e/team-overview-layout.spec.js` (new).

## Data / contracts

No API or data change. The labels use fields the responses already carry: `tvCode` on game rows' `localTeam`/`roadTeam` and on team objects where present (step 1 checks that the team detail and standings rows carry it; where one does not, the label falls back to `abbreviatedName` through `teamCode`, never to an empty string). Every link keeps its accessible name: the full name stays in the markup (`ShortLabel`) so a TV code never becomes the only text a screen reader gets. The leaders' group label and the swipe row are the only new accessible names.

## Testing

`npm run lint` and `npm run build` (no unit test command exists). Browser tests: `cd frontend && npm run test:browser`; run the new spec and the existing Team-related specs alone first, then the whole suite once (known load-flaky specs pass alone).

`team-overview-layout.spec.js` (patterns from `teams-layout.spec.js` and `game-rotations-layout.spec.js`): read the live season and a team from the API, load once and resize through 320, 390, 639, 640, 768, 1023 and 1024px. Checks: `documentElement.scrollWidth <= clientWidth`; each strip's tabs on one row and the active tab inside the strip's visible box; the chip beneath the names below 640px and the opponent text a TV code from the API below 640px and the abbreviated name from 640px; the leaders row scrolls sideways inside its own box below 640px (its `scrollWidth` exceeds its `clientWidth`, the page's does not) and has four cards in a grid from 640px; the profile badges below the title below 640px; the comparison labels; nothing inside a panel sticks out of it. Mocked cases with `page.route` (the later registration wins): a long-named club, a club without a crest or games, and each Overview panel's error and empty state at 320px.

## Notes for the AI

- Work only on this page: do not change `Home`, Season overview or the other tabs. Shared pieces get opt-in props with today's default.
- Do not start a dev server; ask the user to start one if a check needs it (Playwright starts its own when none is running).
- Prefer the pattern already in the repo over a new one (`ShortLabel`, `scrolling`, `compact`, the `.leaders-row` snap rules as the model for the leaders row).
- Two choices for review: the Phase strip stays a scrolling strip (not a select), and the leaders are a swipe row. If measuring shows either reads badly, change that in step 1 or 2 and say so in the handoff.
- Measured at 320px with the live data (step 1) and built as above, with these differences from the assumptions: the document was 12px too wide because of the profile badges (fixed in step 3); the header's name was squeezed to 41px by the crest and the chip (the chip now takes its own line below `sm`); the Section strip wrapped onto two rows (now one scrolling row, 463px of tabs in 296px); the form and upcoming rows cut the opponent to "vs ..." (below `sm` a row is two lines: opponent over the round, the result or date at the right). The date in an upcoming row fits beside the TV code at 320px, so scope item 7's shortened date was not needed and the date text is unchanged. The snapshot's facts are a two-column grid below `sm` with League position on its own row (the panel is 44px taller). The leaders row is 85% of the width inside the 12px gutters.
- Revision asked for at review: below `sm` the header is centred (a 96px crest above the kicker, name, "ABBREVIATED · COUNTRY" and a bordered, centred Next game line), through an opt-in `centred` prop on `PageHeader` (default off, so no other page changes); from `sm` it is as before. The team leaders' names are written without the feed's comma ("JONES CARLIK") at every width, with `withoutComma`. Other tabs' player names are for 31h-ii.
- TV code on game and match cards at desktop widths is a separate, still-open product point; do not change it here.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":14243,"specSha256":"329f666a046f62b7ccbbbcb62e8bd6bdc6b2654118fd5f69fddbb0400caa007a","branch":"refs/heads/feature/team-page-header-tabs-and-overview-mobile-layout","head":"8dff46e78b82ebfd9bf5c9534a30df152ef5e47d","baseRef":"refs/heads/master","baseCommit":"8dff46e78b82ebfd9bf5c9534a30df152ef5e47d","sourceTree":"60da20ac21623f97222aab958554ccacd0f043f3","absentOptional":[]} -->
