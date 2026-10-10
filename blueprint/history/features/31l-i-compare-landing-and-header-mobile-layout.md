# Feature: Compare landing and header mobile layout

**From build-plan:** feature 31l-i
**Build attempt:** 1
**Branch:** feature/compare-landing-and-header-mobile-layout
**Status:** verified

## Goal

Make the Compare page's landing and the top of an opened comparison (`/:season/compare`,
`frontend/src/comparisons/ComparisonsPage.jsx` and `CompareFixtures.jsx`) work from 320px up: no sideways page scroll, no
club or player names cut where they can shorten or wrap, and controls that fit. The tabs inside an opened comparison are
items 31l-ii (teams) and 31l-iii (players); the Head-to-head page is 31l-iv. Layout and labels only: no API or data change.
Mobile is below 640px (unprefixed styles), tablet is `sm` (640px), desktop is `lg` (1024px); `xl` stays.

Today:

- **Landing, Teams view:** a Teams/Players `TabStrip` (level 1, no `scrolling`); the "Upcoming games" panel
  (`CompareFixtures`), one compact button per game in the coming round (two columns from `lg`), each a grid of home side,
  date or score, away side, with the club's `abbreviatedName` cut by `truncate` and the regular-season record under it;
  then the "Compare any two teams" panel with two team `select`s and a swap button between them (stacked below `sm`, side
  by side from `sm`).
- **Landing, Players view:** two `PlayerPicker` search boxes with the same swap button. Focusing a box opens a list of
  the top scorers; typing searches. Each list row is a `truncate` name and a `truncate` sub line.
- **Opened comparison, top:** `PageHeader` with a Copy link button; `GameContext`, a wrapping line with "← Games" or
  "← Players", the game's round, date, "<club> at home" and a Game preview/overview link, and for teams an "All-time
  head-to-head" link; then a row with the section `TabStrip` (Overview, Statistics, Rosters or Advanced, Trends; level 1,
  no `scrolling`) and, on the right, the Phase select (plus the Mode select on the players' Statistics section).
- **Overflow spec:** `responsive.spec.js` checks the landing only (`staticPage("Compare", "compare")`).

## In scope

1. **Strips.** The Teams/Players strip and the section strip use `TabStrip`'s existing `scrolling` option: one row that
   scrolls below `lg`, with the active tab in view.
2. **Games panel.** Below `sm` each game row shows the clubs' TV codes instead of the abbreviated names, using the
   existing `ShortLabel` with `teamCode` and `shortTeamName` from `frontend/src/games/gameUtils.js` (as the dashboard's
   Recent results does); from `sm` the abbreviated names as today. Crests, the record line, and the score or date and
   time in the middle fit at 320px. The button's accessible name ("Compare <home> and <away>") is unchanged.
3. **Team pickers.** The two selects and the swap button fit at 320px stacked (as today), with the swap button reachable
   and labelled; from `sm` as today.
4. **Player pickers.** The search box and its open list fit at 320px: the list stays inside the window, a player's name
   wraps onto at most two lines instead of being cut, and the sub line shows the club's TV code where the list gives
   one (the step confirms which field the top-scorer and search rows carry). The chosen player's box shows the name
   wrapped or shortened to fit, with its clear button visible.
5. **Opened comparison top.** The Copy link button, the back button and the game line, and the head-to-head link wrap
   cleanly at 320px with nothing outside the window. Below `sm` the section strip takes its own row and the Phase (and
   Mode) selects sit below it, side by side and each half the width; from `sm` as today.
6. **States.** Loading ("Loading games", "Loading phases"), the games panel error with Retry, an over season with no
   upcoming games (the panel is not shown), and the player picker's "Searching...", "Loading..." and "No players match."
   fit at 320px.
7. **Specs.** A new `frontend/e2e/compare-layout.spec.js` (pattern from `leaders-layout.spec.js`) for the two landings
   and one opened team and one opened player comparison; opened comparisons are added to `responsive.spec.js`.

## Out of scope

- Any API or data change, what the panels show, the picking, swapping, URL or copy-link behaviour.
- The content of the comparison tabs (31l-ii, 31l-iii) and their `md:` classes, and the Head-to-head page (31l-iv).
- Changing shared components outside `frontend/src/comparisons/` (`TabStrip`, `LabelledSelect`, `PageHeader`,
  `ShortLabel`, `Panel`, `AsyncState`) beyond their existing options. Only an opt-in prop with today's default if one is
  unavoidable.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the
narrow check after each, then present one final review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Landing.** Scrolling Teams/Players strip; the games panel rows with TV codes below `sm`; the team pickers and
      swap button; the player pickers and their list; the landing states. First confirm the TV-code fields on game
      teams and on the player list rows.
      Done when: at 320 and 390px the games panel shows each game's TV codes, crests, records and score or date with
      nothing cut or outside its row; both pickers, the swap button and an open player list are inside the window;
      from 640px the game rows show abbreviated names as today; no landing view scrolls sideways at 320, 390, 768 or
      1024px.
- [x] 2. **Opened comparison top.** Scrolling section strip; the Copy link, back and game line; the Phase and Mode
      selects, for a team comparison opened from a game and a player comparison.
      Done when: at 320 and 390px the section strip is one scrolling row, the selects sit under it side by side, and the
      game line and links wrap with nothing outside the window; from 640px the top looks as today; no opened comparison
      scrolls sideways at 320, 390, 768 or 1024px.
- [x] 3. **Specs.** Write `compare-layout.spec.js` (live data, plus mocked responses for a long club name, a missing
      crest or TV code, an over season with no upcoming games, and the games error) and add an opened team and an
      opened player comparison to `responsive.spec.js`.
      Done when: both specs are written and lint cleanly; they are not run before 1 November 2026, and the final packet
      says so. Root `npm run build` and `cd frontend && npm run lint` pass.

## Files / areas

- `frontend/src/comparisons/CompareFixtures.jsx`: `Side`, `GameRow`, `GameContext`.
- `frontend/src/comparisons/ComparisonsPage.jsx`: `TeamPicker`, `PlayerPicker`, the landing and the opened comparison's
  top.
- `frontend/src/games/gameUtils.js`: read only (`teamCode`, `shortTeamName`).
- `frontend/e2e/compare-layout.spec.js` (new), `frontend/e2e/responsive.spec.js`.

## Data / contracts

None changed. The page reads the existing games, standings, teams, players and season-statistics responses. A `NULL`
crest, TV code or record means unavailable: the row omits that part and never shows zero. An opened comparison's URL
(`view`, `teamA`, `teamB`, `playerA`, `playerB`, `game`) is unchanged.

## Testing

No unit test runner is configured. Browser tests are paused until 1 November 2026 (`CLAUDE.local.md`), so the specs are
written now but not run. `compare-layout.spec.js` loads each view once and resizes through 320, 390, 639, 640, 768,
1023, 1024 and 1280px, checking: the games panel's labels equal a real TV code below 640px and the abbreviated name from
640px; every game row's content inside its row; no cut-off words in names (`findBrokenWords` from `support/layout.js`);
the strips scrolling below 1024px; the pickers, swap button, an open player list, the selects and the Copy link inside
the window; the document no wider than the window; and the mocked states at 320px.

Verify: no `Verify` command is declared in `AGENTS.md`, so none was run while writing this spec. The final gate is root
`npm run build` plus `cd frontend && npm run lint`. Evidence comes from single page visits through the Playwright
library against the running dev servers, as in 31k. Nothing here proves how it looks in the user's browser; the final
packet will say so.

## Built as

- As specced, with these details found while building:
  - The Copy link button reads "Copy link" (and "Link copied") below `sm` and "Copy comparison link" from `sm`: beside the
    full label the "HEAD-TO-HEAD" kicker broke over two lines at 320px. `PageHeader` is unchanged.
  - The player list rows show the name wrapped onto at most two lines and the club as `ShortLabel` (TV code below `sm`,
    from `clubTvCode` on search rows and `clubTvCodes` on top-scorer rows, a traded player's codes joined with "/"). Below
    `lg` a row puts the club under the name: from 640 to about 1000px the two pickers sit side by side and a club beside the
    name needed three lines. From `lg` the row is as before.
  - The Phase (and Mode) selects sit in a two-column grid below `sm`, full width of their column.
- Evidence: single page visits through the Playwright library against the running dev servers, each view loaded once and
  resized through 320, 390, 640, 768, 1024 and 1280px, before and after. No view scrolls sideways at any width (none did
  before either). At 320px the games panel showed 16 cut club names before and none after (TV codes FBT, ZAL, ASV, CZV...),
  with abbreviated names from 640px; the Teams/Players and section strips are one scrolling row (the section strip wrapped
  onto two lines at 320 and 390px before); the player list had 3 cut texts at 640px before and none after; the games error,
  a finished season (no games panel) and "No players match." fit at 320px.
- Not in this item: two player names are cut at 320px inside the team comparison's Overview tab, and a Matchup edges card
  reaches the panel edge there (31l-ii).
- `compare-layout.spec.js` and the two new `responsive.spec.js` entries are written and lint cleanly but were not run
  (browser tests are paused until 1 November 2026).

## Notes for the AI

- Follow the user's rules: changes stay on the page being built, and shared components only get opt-in props. The TV
  code is the short label wherever a full name does not fit; the club code is the permanent ID (memory notes on page
  scope and TV codes).
- Do not run `compare-layout.spec.js` or `responsive.spec.js` (Playwright is paused; a hook blocks it). Take a baseline
  with a throwaway probe before changing code, as in 31k, and delete the probe scripts afterwards.
- Match the surrounding code style and comment density. No AI attribution in commit messages (AGENTS.md).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10662,"specSha256":"dc5b887575d4a450326c4616cb5d7554bd4ad1d6bbb29f1c3e918b104ca822f0","branch":"refs/heads/feature/compare-landing-and-header-mobile-layout","head":"8d1cd2cb65a3a519c82d62004530827792be2c42","baseRef":"refs/heads/master","baseCommit":"8d1cd2cb65a3a519c82d62004530827792be2c42","sourceTree":"6e240ff58029104a9de8929531f5becc36f6c03e","absentOptional":[]} -->
