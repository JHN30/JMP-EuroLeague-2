# Feature: Game detail header, tabs and Overview mobile layout

**From build-plan:** feature 31f-i
**Build attempt:** 1
**Branch:** feature/game-detail-header-tabs-and-overview-mobile-layout
**Status:** verified

## Goal

Make the top of the game page (`/:season/games/:gameCode`) and its default Overview tab comfortable from 320px up: the matchup header (two crests, two club names, "vs", the date line and the final score), the seven-tab strip (Overview, Box score, Game flow, Rotations, Team comparison, Shooting, Play-by-play), and the Overview tab's five sections (Score by period, Best player on each team, Game leaders, Key stats, Score flow). The other six tabs are the later sub-items 31f-ii to 31f-v and are not touched, except where they share a component this item changes.

Below `sm` (640px) the header is compact (smaller crests and names, so the two teams and the score fit without stacking into a tall block), the tab strip is one row that scrolls on its own and keeps the chosen tab in view (seven tabs do not fit 320px in one row, and a wrapped strip would take three rows of the first screen), and every Overview section reads correctly with long club names, long player names, three-digit scores and overtimes. From `sm` up the page looks as it does today, except that the tab strip stays on one row (scrolling if it must) until `lg` instead of wrapping.

Layout only: no API, data or feature changes. The tab keys, the data each tab loads, the empty, loading and error states, and the "play-by-play failure leaves the rest of the Overview intact" behaviour stay exactly as they are.

## Design reference

Current code (read, not yet measured at 320px; step 1 measures it before anything is changed):

- `GameDetailPage.jsx`: `PageHeader` (`p-4 sm:p-5`, an `h1` of `text-2xl`) whose title is a `flex flex-wrap` of two team spans (a `h-12 w-12` crest and the full `teamName`) around a "vs"; the description is "round or phase · full date"; the `children` slot holds the score as a `.stat-callout` (2rem number, "Final" label) or a "Scheduled" badge. Under it a level-1 `TabStrip` (`mb-4 w-fit`) of the seven tabs.
- `lib/TabStrip.jsx` and the `.tabs[class*="tab-level-"]` rules in `index.css`: level 1 is `1rem` text with `0.9rem` side padding, 44px tall on coarse pointers (`touch-target`). DaisyUI's `.tabs` wraps onto more rows when the tabs do not fit; the seven labels need roughly 800px on one row. `FixturesPage.jsx` already has the pattern this item needs for a one-row strip: an `overflow-x: auto` row with a hidden scrollbar, kept centred on the selected tab by an effect with a `ResizeObserver` (31e).
- `OverviewTab.jsx`: `PeriodTable` (in `gameFlow.jsx`: a `Panel` with `overflow-x-auto` around a `table-sm`, a team column of full names plus one column per period and a total), two grids of cards (`StandoutCard`: a `TeamLabel`, a `h-16` headshot and a `text-lg` player link with a points/rebounds/assists line and a badge; `LeadersCard`: rows of a label and a truncated player link with a value), `KeyStatsCard` (a pair of `TeamLabel`s over `ComparisonRow` mirrored bars in two columns), and `ScoreFlowChart` (Chart.js on a `h-52` canvas).
- `games/TeamLabel.jsx` is a `h-6` crest and the full `teamName` (`font-semibold`, no wrapping rule) and is shared with the Team comparison, Rotations and Lineups sections. Each half of the `KeyStatsCard` header is about 120px wide at 320px, so a long single word such as "Panathinaikos" overflows or breaks mid-word.
- The game API returns each team as `{ clubCode, name, abbreviatedName, crestUrl }` (the same shape the Games list uses, where the cards show `abbreviatedName ?? name ?? "TBD"`). `gameUtils.teamName` returns `name ?? abbreviatedName ?? "TBD"`.
- `responsive.spec.js` already opens one game from the Games page at 320, 390, 768 and 1024px and fails on sideways page scroll, but only on the default Overview tab with the live data. There is no game-detail layout spec. `e2e/support/game-fixtures.js` has `mockGameApi` (it mocks every request the page makes, with `Team A` / `Team B` and no crests) and the `player`, `BOX_SCORE`, `ADVANCED` fixtures.

Targets: at 320px the header shows both crests, both names and the score without a name cut mid-word or a block taller than it needs to be; the tab strip is one row of about 44px (a taller row only on coarse pointers) that scrolls inside its own box and never moves the page sideways; the chosen tab stays in view after a tap, a keyboard move or a resize; the period table fits without scrolling for a regulation game; best-player and leader cards hold a long player name; the key-stats header shows each club on its own half without a mid-word cut; the score-flow chart fills the panel; the page never scrolls sideways; at 640px and wider the header, cards and chart look as they do today.

## In scope

- **Scrolling tab strip.** `TabStrip` gets an optional `scrolling` prop. When it is set, the strip is one row (no wrapping, `max-w-full`, `overflow-x: auto`, hidden scrollbar, tabs that do not shrink or wrap their text) below `lg` (1024px), and the chosen tab is scrolled into the middle of the strip when it changes and when the strip is resized (reusing the 31e logic, see the next item). Below `sm` the tabs are compact (about `0.875rem` text, `0.75rem` side padding; the 44px tap height on coarse pointers stays); from `sm` they keep today's size. From `lg` the strip is as today. The next tab peeks out at the edge of the strip as the hint that it scrolls (no new arrows or fades). Keyboard behaviour (arrow keys, Home, End) and the underline animation stay. The game page sets `scrolling`; no other page does yet (the Team and Player pages choose it in 31h and 31j).
- **One centring helper.** The effect in `FixturesPage.jsx` that centres the selected round (smooth on a change, instant on a resize, via a `ResizeObserver` that skips its first call) moves into a small hook in `frontend/src/lib/` used by both the Games round strip and `TabStrip`'s `scrolling` mode, so the logic exists once. The Games page behaves exactly as after 31e (its `games-layout.spec.js` stays green).
- **Compact header below `sm`.** Smaller crests (about 2.5rem against 3rem), smaller team names (about `1.125rem` against `1.5rem`, set on the team spans so the shared `PageHeader` is unchanged), a smaller gap and "vs" margin, so two teams share a row when they fit and stack by whole names when they do not; a name wraps at its spaces and never mid-word at 320px; the score (or the "Scheduled" badge) wraps under the names when it does not fit beside them; the round and date line wraps. From `sm` the header is as today. A team still to be set shows "TBD" without a crest and holds its place.
- **Overview sections below `sm`.**
  - Score by period: the team column shows the abbreviated name (`abbreviatedName ?? name ?? "TBD"`) below `sm` and the full name from `sm` (both in the markup, one hidden, with the full name kept available to screen readers as the accessible name of the row header), tighter cell padding, so a regulation game (Q1 to Q4 and Total) fits the panel at 320px without scrolling. Games with overtimes may scroll inside the panel (the page never does).
  - Best player: the player name wraps at its spaces and breaks only a single word that is wider than the card; the headshot, name block and badge stay inside the card at 320px; a missing headshot keeps its placeholder.
  - Game leaders: label, player and value stay on one row at 320px with the player name truncated, as today, and never push the value out of the card.
  - Key stats: each half of the club header shows the crest and the abbreviated name below `sm` (wrapping at spaces) so neither half overflows; the mirrored bars and their printed values stay inside their halves, including values like "27-55 (49.1%)". `TeamLabel` gets this behaviour (abbreviated name below `sm`, full name from `sm`), so the Team comparison, Rotations and Lineups team headers get it too; their own layouts are not changed here.
  - Score flow: the compact chart (`h-52`) fills its panel at 320px with the period labels, the two team codes and the crest watermarks readable and the tooltip on tap still working; it redraws when the window is resized.
- **Revisions asked for at review.** (1) The header's date line has no time for a played game ("Friday, 2 October 2026", not "... at 20:00"); a game still to come keeps its tip-off time. (2) The Overview's Key stats show the printed values and the highlight on the better side without the bar under each value: `ComparisonRow` gets an optional `bars` prop (default on) that only the Overview key stats turn off, so the Team comparison, Four Factors, Scoring profile and Compare pages keep their bars. (3) The lead tracker (`ScoreFlowChart`, so also the Game flow tab's) draws the home side in the theme's primary colour and the road side in its secondary colour, as the shot chart does, instead of success green and error red, because a lead is not good or bad.
- **Robustness at 320px.** Check, and fix only what clips: a long single-word club name, a long hyphenated player name, a three-digit score, an overtime game (five or six periods), a game with no crest URL, a team still to be set, and a game that is not played (header with the "Scheduled" badge, and the Overview's "isn't available until this game is played" note inside the panel width).
- **Browser check.** A new Playwright spec for this page's top and Overview (see Testing), and the game page's other tabs stay covered by their existing specs.

## Out of scope

- The other six tabs' own layouts (Box score 31f-ii, Game flow and Team comparison 31f-iii, Rotations 31f-iv, Shooting and Play-by-play 31f-v), even where a shared component (`TeamLabel`, `PeriodTable`, `ScoreFlowChart`, `ComparisonRow`) is also used there. A change to a shared component that this item needs is kept small and does not change those tabs' layout beyond it.
- Any API, data, routing, URL or copy change; new features (a sticky score bar, a tab select, swipe between tabs).
- The pinned-column table system, `ViewSelect`, and the Standings and Games pages beyond the shared hook swap.
- Fixing the Playwright reliability and flaky-spec items (31n).

## Build loop

`workflow.stepReview` is `feature`: build the steps in order without pausing, run the narrow check after each, run the final automated gate once after the last step, then present one review packet. `workflow.checkpointCommits` is `disabled`: no step commits; `/complete` makes the single work commit.

## Build steps

- [x] **1. Measure the current page.** With the dev servers running (ask the user to start them if they are not), open a played game at 320, 390, 768 and 1024px (live season and `2025`) and record, in a scratch note outside the repo, the header height, which names wrap or cut, the tab strip's row count and width, whether the period table scrolls, and the first Overview element that is wider than the screen. Done when the numbers are in hand and no repository file has changed.
- [x] **2. Shared centring hook and scrolling `TabStrip`.** Add the hook in `frontend/src/lib/` from the `FixturesPage.jsx` effect, switch `FixturesPage` to it, add the `scrolling` prop to `TabStrip` (with the `index.css` rules for the one-row strip below `lg` and the compact tabs below `sm`), and set it on the game page's strip. Done when `npm run lint` passes, the Games round strip still centres its selected round on a change and on a resize (`npx playwright test games-layout` passes), and at 320, 390 and 768px the game page's seven tabs are one row that scrolls inside its box, the chosen tab is in view after a click, an arrow-key move and a resize, and the page does not scroll sideways.
- [x] **3. Compact header.** The crest, name, "vs", gap and wrapping rules for the header below `sm`, in `GameDetailPage.jsx` (classes on the team spans and the crest images). Done when at 320px both names (including a long single-word name and a name still to be set) are whole, the score is visible, the header is shorter than the measured one, and at 640px and wider its crests are 48px and its names `1.5rem`.
- [x] **4. Overview below `sm`.** The period table's abbreviated team names and padding (`PeriodTable` in `gameFlow.jsx`), `TeamLabel`'s short name, the best-player card's name wrapping, the leaders row, the key-stats halves, and the score-flow panel (`OverviewTab.jsx`, `TeamLabel.jsx`, `index.css` only if a class is needed). Done when at 320px a regulation game's period table has no sideways scroll, no name or number is cut or outside its card, a three-digit score and a long player name fit, and the chart fills its panel.
- [x] **5. Browser spec.** Add `frontend/e2e/game-detail-layout.spec.js` (see Testing) and run it together with the page-scroll spec and the existing game specs. Done when `npx playwright test game-detail-layout games-layout responsive game-overview` passes, and a re-run of `game-overview` and `game-four-factors` (which use `TeamLabel`) is green.
- [x] **6. Final gate and handoff.** `npm run build` at the repository root and `cd frontend && npm run lint` pass, the spec's boxes are checked, the status is `verified`, and the review packet lists the checks run. Done when both commands exit 0 and the packet names them.

## Files / areas

- `frontend/src/lib/TabStrip.jsx` (the `scrolling` prop), a new hook in `frontend/src/lib/` (centring), `frontend/src/games/FixturesPage.jsx` (uses the hook).
- `frontend/src/games/GameDetailPage.jsx` (header classes, `scrolling` on the strip), `frontend/src/lib/PageHeader.jsx` (an optional `childrenBelowSm` prop that puts the score on its own row below `sm`), `frontend/src/games/OverviewTab.jsx` (single-column card grids below `sm`, so a long name cannot widen them), `frontend/src/games/gameFlow.jsx` (`PeriodTable` team column), `frontend/src/games/TeamLabel.jsx` (a `TeamName` that pairs the short and full names), `frontend/src/games/gameUtils.js` (`shortTeamName`), `frontend/src/lib/ComparisonRow.jsx` (the `bars` prop) and the lead tracker colours in `frontend/src/games/gameFlow.jsx`.
- `frontend/src/index.css` (the scrolling tab strip rules, and a class only if the Overview needs one).
- `frontend/e2e/game-detail-layout.spec.js` (new), `frontend/e2e/support/game-fixtures.js` only if a fixture needs long names (prefer overriding the game route inside the new spec).

## Data / contracts

No API or data change. The page keeps reading `game.localTeam` / `game.roadTeam` as `{ clubCode, name, abbreviatedName, crestUrl }` (any of them may be null for a team still to be set) and the existing box-score, play-by-play, advanced and team-flow responses. The short name is `abbreviatedName ?? name ?? "TBD"`; the full name is `name ?? abbreviatedName ?? "TBD"` (`teamName`), unchanged. The link and tab accessibility contract stays: the tab list is labelled "Game detail", each tab keeps its id, `aria-selected`, `aria-controls` and roving tabindex, and a row header in the period table keeps the full team name as its accessible name.

## Testing

- `frontend/e2e/game-detail-layout.spec.js`, following the games-layout pattern (load once, resize through the widths, `findPageOverflow`, a per-word `Range.getClientRects` check for mid-word splits), with `mockGameApi` and the game route overridden for long names:
  - at 320, 390 and 639px: the seven tabs are one row inside a box that scrolls on its own; the page does not scroll sideways; the chosen tab is in view after a click on "Play-by-play" and back, after ArrowRight moves, and after a resize between 320 and 390; the tab text is `0.875rem` below `sm` and `1rem` from it;
  - at 640 and 768px the strip is one row and scrolls if it must; at 1024 and 1280px it is as today;
  - header: crests are 40px below `sm` and 48px from it, names are `1.125rem` and `1.5rem`, no word of a name is split across lines at 320px with "Panathinaikos AKTOR Athens" against "Crvena Zvezda Meridianbet Belgrade", a three-digit score fits, and a game with a missing road team shows "TBD" without overflow; an unplayed game shows the "Scheduled" badge and the unavailable note inside the panel;
  - Overview at 320px: the period table does not scroll sideways for four periods and shows the short names, a five-period game may scroll inside its panel but not the page, the row header's accessible name is the full name; a best-player card with a long hyphenated name, the leaders rows and both key-stats halves hold their content; the score-flow canvas is as wide as its panel; from 640px the full names show.
- Existing specs that must stay green: `games-layout`, `responsive` (the game page at the four widths), `game-overview`, `game-four-factors`, `game-scoring-profile`, `game-rotations`, `game-lineups` (they use `TeamLabel` and the tab strip).
- No unit-test command exists, and the changes are layout, so there is no logic test. There is no declared `Verify` command, so the final gate is the repository build and the frontend lint; the Playwright run is opt-in evidence and is reported as such. Live visual checks at the four widths are done by the user from the "How to try it" note, because the agent does not start a dev server.

## Notes for the AI

- Follow the 31d and 31e conventions: mobile-first unprefixed styles, `sm` and `lg` as the only breaks, `max-sm:` or `hidden sm:inline` for phone-only changes, and an unlayered `index.css` rule only where a Tailwind utility cannot do it (unlayered CSS outranks utilities, so check before adding one).
- `useElementWidth` observes only an element present at mount; use a `ResizeObserver` inside the effect, as the 31e fix does.
- The tab strip's hidden scrollbar and `scrollTo` with `behavior` need the strip to be the scrolling element, not a wrapper; `w-fit` on a `nowrap` flex container can overflow its parent, so use `max-w-full` and check it at 320px.
- Write long multi-line files with the Write tool, not a heredoc. Use `expect.poll` for values that update a frame after a scroll or resize.
- Do not touch the other game tabs' layouts; if a shared component change affects them, say so in the review packet.

## Open questions

None that block the build. One choice was made for the user to confirm at review: the seven tabs become a scrolling one-row strip (the next tab peeks as the hint) rather than a View-style select as on the Standings tabs, because these are the page's main tabs and a select would hide where the other views are. Say if a select is preferred and the build step 2 changes to a `ViewSelect` below `sm`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":18593,"specSha256":"773474745cfd778b9e273326f2ee31ae33fe1ff0ba5e1b4d004909573bdaec26","branch":"refs/heads/feature/game-detail-header-tabs-and-overview-mobile-layout","head":"69c6ecf6d955788ec02d5f2cae691f135d09fae5","baseRef":"refs/heads/master","baseCommit":"69c6ecf6d955788ec02d5f2cae691f135d09fae5","sourceTree":"d6f2d7275c4153aedcc6409ef19736f4dc8fde23","absentOptional":[]} -->
