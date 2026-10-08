# Feature: TV code on the finished pages

**From build-plan:** feature 32b
**Build attempt:** 1
**Branch:** feature/tv-code-on-the-finished-pages
**Status:** verified

## Goal

Show each club's TV code (the code in use that season, such as FBT for Fenerbahce; `club_code` is the permanent ID and can look outdated) wherever Home, Season overview, Standings, Games and Game detail currently use the abbreviated name, or the club code, because the full name does not fit. Full names stay wherever they fit. Layout and label only: item 32a already put `tvCode` on every club object and `clubTvCode` on every standings row, so there is no API or data change.

## In scope

The rule for every label below: **below `sm` (640px) the TV code, from `sm` the label it has today**, unless the item says otherwise. The full name stays in the page for screen readers and as a `title` where there is room for one (the same pattern as `TeamName` and the matchup header: the short text is `aria-hidden`, the full name is `sr-only` below `sm`). A club with no TV code falls back to the abbreviated name, then the club code, then "TBD" (`teamCode` in `frontend/src/games/gameUtils.js`; for a standings row `clubTvCode ?? abbreviatedName ?? clubCode`).

1. **Shared label.** One small `ShortLabel` component in `frontend/src/lib/` (the pair "short text below `sm`, full text from `sm`, full text kept for screen readers"), replacing the identical local copy in `GameDetailPage.jsx` and used by the places below. No other shared component changes.
2. **Standings.**
   - The short club name the tables show on a phone (`shortNames` in `StandingsPage.jsx`, used by `ClubCell`, `RaceSnapshotTable`, the breakdown views and the advanced table) becomes the club's TV code from the teams list (`tvCode`, then the abbreviated name). The lg-to-xl short form in `RaceSnapshotTable` follows.
   - The club code printed in the advanced-standings scatter chart's crest fallback (`advancedVisuals.jsx`) and in the example label of the explainer dot strips (`explainedVisuals.jsx`) becomes the TV code (`clubTvCode`), at every width, because the club code is the permanent ID and can look outdated.
   - The standings KPI strip, the Standings explainer's club names and the race chart's club select and legend are checked at 320 and 390px; where a full name is clipped, wraps to more than two lines or forces overflow, it shows the TV code below `sm`; where it fits it is left alone.
3. **Games list.** The team label on each game card (`GameCard.jsx`) shows the TV code below `sm` and the abbreviated name from `sm`.
4. **Game detail.** `TeamName` in `TeamLabel.jsx` (used by the flow metric and moment cards, the period table, the box-score and comparison headings) uses the TV code, not the abbreviated name, below `sm`. `ShootingLegend` is left alone (it is shared with the Team and Player pages and its names wrap).
5. **Home.**
   - The latest-results and upcoming match cards (`MatchCard` in `RecentResults.jsx`, also used by `UpcomingGames.jsx`) show the TV code below `sm`, the abbreviated name from `sm`.
   - The KPI strip club names, the standings snapshot rows, the player-leaders club line and the leader-trend labels are checked at 320 and 390px with the same clip/wrap/overflow rule as above, and use the TV code below `sm` where the name does not fit. The leaders' club line uses a TV code only when the season-stats response gives an unambiguous one for the leader's club; otherwise it stays as it is and the final report says so.
6. **Season overview.** The defining-games `TeamName` (`SeasonOverviewPage.jsx`): the text shown in the crest slot of a club whose crest is missing or fails to load (below `lg`) is the TV code, not the abbreviated name; the abbreviated name beside the crest from `lg` stays. The hero KPI chips' club names are checked at 320 and 390px with the same rule.
7. **Tests.** A new `frontend/e2e/tv-codes-layout.spec.js` mocks teams, standings and games with TV codes that differ from the abbreviated names and checks each page at 320, 390, 639 and 640 and up (see Testing).

## Out of scope

- Any API or data change (done in 32a) and any change to how `tvCode` is chosen.
- Pages after 31f: Teams, Team, Players, Player, Leaders, Compare, Head-to-head, Records, Postseason. Each takes the TV code in its own item (31g to 31n), so the shared `ShootingLegend` and the Team and Player shooting labels are left as they are.
- Changing full names that fit, removing names from tables, or any other layout change.
- Using the TV code at desktop widths (see Open questions).
- Page titles, link targets and URLs: they keep using the club code and full name.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the narrow check after each, then present one final review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Shared label and Standings.** Add `frontend/src/lib/ShortLabel.jsx`, switch `GameDetailPage.jsx` to it, point `shortNames` at the teams' `tvCode`, replace the club code in the advanced scatter and the explainer example label with the TV code, and audit the other Standings club names at 320 and 390px (screenshot or measured box) and fix those that clip or wrap past two lines. *Done when:* at 390px the standings tables, the breakdown views and the race snapshot show each club's TV code in place of the abbreviated name, with the full name still the link's accessible name; the advanced scatter shows TV codes for clubs without a crest; at 640px and up the full names show as before; `npx playwright test standings-table-layout.spec.js standings-race-layout.spec.js standings-breakdowns-layout.spec.js standings-advanced-layout.spec.js standings-explained-layout.spec.js` still passes.
- [x] 2. **Games list and Game detail.** Use the TV code below `sm` in `GameCard.jsx` and in `TeamName`. *Done when:* at 390px a game card names each club by its TV code, at 640px and up by its abbreviated name; the game-detail flow cards and period table use the TV code below `sm`, with the full name unchanged from `sm`; `npx playwright test games-layout.spec.js game-flow-layout.spec.js game-detail-layout.spec.js game-box-score-layout.spec.js` still passes.
- [x] 3. **Home.** Use the TV code below `sm` in `MatchCard`, and run the clip/wrap/overflow audit on the KPI strip, standings snapshot, leaders and leader-trend labels, changing only those that fail. *Done when:* at 320 and 390px the match cards show TV codes and no Home club label is clipped, wraps past two lines or overflows; at 640px and up they are as before; `npx playwright test home-layout.spec.js` still passes.
- [x] 4. **Season overview.** Use the TV code in the crest-slot fallback of the defining-games `TeamName`, and audit the hero chips. *Done when:* a defining game whose crest is missing shows the TV code below `lg`; no overview label overflows at 320 and 390px; `npx playwright test overview-layout.spec.js` still passes.
- [x] 5. **Spec and final gate.** Add `tv-codes-layout.spec.js` for all five pages. *Done when:* the new spec passes, the specs named in steps 1 to 4 and `game-matchup-header.spec.js` still pass, and root `npm run build` and `cd frontend && npm run lint` pass.

## Files / areas

- `frontend/src/lib/ShortLabel.jsx`: new.
- `frontend/src/games/GameDetailPage.jsx`, `TeamLabel.jsx`, `GameCard.jsx`.
- `frontend/src/standings/StandingsPage.jsx`, `standingsCells.jsx`, `RaceSnapshotTable.jsx`, `advancedVisuals.jsx`, `explainedVisuals.jsx`, and any other Standings view the audit changes.
- `frontend/src/dashboard/RecentResults.jsx`, and any other Home panel the audit changes.
- `frontend/src/season/SeasonOverviewPage.jsx`.
- `frontend/e2e/tv-codes-layout.spec.js`: new. Existing layout specs only change if one of them asserts an abbreviated name that now shows a TV code.

## Data / contracts

None new. Reads `tvCode` on club objects (teams list, games) and `clubTvCode` on standings rows, both from 32a; the standings page already has the teams list query for its short names. Mocks and older responses without a TV code keep today's labels through the fallback chain.

## Testing

No unit test runner is configured. Browser tests are opt-in evidence (`cd frontend && npx playwright test <file>`; Playwright starts its own servers). `tv-codes-layout.spec.js` mocks clubs with a TV code unlike their abbreviated name and checks, with the page loaded once and resized through the widths: Standings, Games, Game detail, Home and Season overview show the TV code at 320, 390 and 639px and the abbreviated or full name at 640px and up; a club without a TV code shows its abbreviated name; the full name is still the accessible name; no page overflow at 320px. `api-tv-codes.spec.js` already covers the API. Nothing here proves the labels look right with the live data in the user's browser; the final packet will say so and give a short try path.

Verify: no `Verify` command is declared in `AGENTS.md`; the final gate is root `npm run build` plus `cd frontend && npm run lint`, not run while writing this spec.

## Notes for the AI

- Follow the user's rules: scope changes to the page being built, and shared components only get opt-in props with today's default. `ShortLabel` is a new component, not a change to an existing one.
- `club_code` is the permanent ID and can look outdated; never show it as a label when a TV code exists. See the memory note on TV codes.
- Standings rows carry `clubTvCode` directly (the season's latest standings row); the teams list carries `tvCode`. Use whichever the component already has; do not add a request.
- Unlayered rules in `index.css` outrank Tailwind utilities, so a label that is hidden or shown by a class from the stylesheet needs its own rule.
- No Co-Authored-By or AI attribution in the commit (AGENTS.md).

## Open questions

- **TV code at desktop widths.** The plan says "where a label is too narrow for the full name", so this spec uses the TV code only below `sm` (and below `lg` in the Season overview crest slot) and keeps the abbreviated name on cards from `sm` up, where it fits. If you would rather have the TV code at every width on the game and match cards, as the matchup header does, say so and the label rule changes from "below `sm`" to "always" for those two cards only.

## Built as

- Audit result at 320 and 390px with the live data: the Standings KPI strip, the Season overview hero chips, the Home KPI strip and the player-leaders club line show full names on at most two lines without overflow, so they were left alone. The Home league-table snapshot wrapped to three lines for the longest names, so it shows the TV code below 640px (from `clubTvCode`, full name kept for screen readers). The leader-trend labels were not changed (they wrap to two lines).
- `ShortLabel` wraps its two spans in a positioned span: a hidden screen-reader copy inside a horizontally scrolling row (the Home match cards) otherwise widened the whole page to 2,187px at 320px, which the existing overflow helper does not report. The new spec checks the document width directly.
- `TeamName` (game detail) uses the TV code and falls back to the abbreviated name, not the club code, so mocks and clubs without a TV code keep their earlier label; the Games list and match cards use `teamCode`, falling back to the abbreviated name, then the club code.
- `games-layout.spec.js` reads the shown text through a tree walker, because the card name is now a label pair.
- Added after the first review, at the user's request: (1) the Season overview defining games show each club's crest (24px, smaller than before) with its TV code beside it below 1024px, from 1024px the abbreviated name as before; a missing crest leaves just the code (this replaces the crest-slot fallback in In scope item 6). (2) The pinned team column of the Standings tables is narrower on a phone now that it holds a TV code, not a name: 5rem at rest (was 7.625rem) and 2.25rem with the crest alone, so more stat columns show. `ScrollingTable` got an opt-in `shrink` prop (default 44px for the Standings tables); the game Box score passes its own 86px. The three standings specs' hard-coded collapse numbers changed to match (122 to 80, 100 to 70).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":12375,"specSha256":"c1af0372350e3307ec1d064cbd8718311e68e531714a870946cb1ad72adda853","branch":"refs/heads/feature/tv-code-on-the-finished-pages","head":"da7e9f722815364938f5411c120c6a3a1c4b6951","baseRef":"refs/heads/master","baseCommit":"da7e9f722815364938f5411c120c6a3a1c4b6951","sourceTree":"35df31d8ec581ffca56ad74113c8b6609d4f57d8","absentOptional":[]} -->
