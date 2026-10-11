# Feature: Postseason mobile layout

**From build-plan:** feature 31n
**Build attempt:** 1
**Branch:** feature/postseason-mobile-layout
**Status:** verified

## Goal

Make the Postseason page (`/:season/postseason`) work from 320px up: no sideways page scroll, nothing cut or broken mid-word, the bracket
readable and tappable below `lg` (where it stacks stage by stage), the champion panel, the matchup detail and the race table fitting a
phone, and touch-sized targets. This is the last page of feature 31. Mobile is below 640px (unprefixed styles), tablet is `sm` (640px),
desktop is `lg` (1024px); `xl` stays. The desktop bracket (four columns joined by lines from `lg`) must not change. Layout and labels only;
no API or data change.

Today (read from `PostseasonPage.jsx`, `Bracket.jsx`, `Matchup.jsx`, `MatchupDetail.jsx`, `RacePanel.jsx`, `ChampionPanel.jsx`; not yet
probed in a browser below 1024px, that is step 1):

- **Summary panel + `Steps`**: a title and four stage steps in `grid gap-3 sm:grid-cols-2 lg:grid-cols-4` (one column on a phone).
- **Champion panel** (finished seasons): a `h-24` crest and a `text-3xl` club name in a `flex-wrap` row, then "Runner-up" and the placing groups
  in `sm:grid-cols-2 xl:grid-cols-4`; club names `truncate`.
- **Bracket**: below `lg` one column, stage by stage (headings Play-In, Playoffs, Final Four, Final, each followed by its matchup cards), the
  `bk-*` join lines only from `lg`; each `Matchup` card is a header (label, Live/Projected badge, format) and two `TeamRow` buttons (seed,
  crest, name `truncate`, score). The name is `slot.short` (the abbreviated name, from `bracketModel.js`).
- **Matchup detail** (`MatchupDetail`) under the bracket at every width, `scroll-mt-28`: two `Side`s (a `h-12` crest, a `text-lg` truncated name,
  a `text-3xl` score) in `md:grid-cols-2`, a result line, then one `Link` row per game in a `grid-cols-[4.5rem_minmax(0,1fr)_auto]`, and a
  "Compare X and Y" button. `md:` is a break the project is retiring.
- **Race panel** (a season in progress): a table in an `overflow-x-auto` box with #, Club, W-L, Left (from `sm`) and a status badge
  (`whitespace-nowrap`, "Play-In or better"), and a muted paragraph listing the clubs that are out.
- **"How the postseason works"**: a `details` box.
- `postseason.spec.js` has three behaviour tests (2025 finished, 2026 projected, 2024 and 2023 with a third-place game and a smaller
  league); `responsive.spec.js` has Postseason as a `staticPage` (the default season only).

Earlier mobile items found the same few failures: grids that grew past the window because a track does not shrink below its content
(fixed with `grid-cols-[minmax(0,1fr)]`), long names that did not wrap, tables wider than the screen, strips that clip, and club names where
a TV code was needed. They are the starting hypothesis; step 1 measures before changing anything.

## In scope

1. **Baseline.** A throwaway probe loads the postseason of a finished season (2025), the season in progress (2026), a season with a
   third-place game (2024), a smaller-league season (2023) and an old season (2004), once each, and resizes through 320, 390, 639, 640, 768,
   1023, 1024 and 1280px, recording page width, text cut or broken mid-word, and anything outside its panel. It is deleted afterwards. What
   it finds decides the items below; an item the baseline shows is already fine is left as it is.
2. **Breaks.** The page's grids are one column below `lg` with `grid-cols-[minmax(0,1fr)]` where a track could grow past the window; the
   `md:` class in `MatchupDetail` becomes `sm:` or `lg:` (the project's two breaks); no new `md:` classes.
3. **Summary and stages.** The four steps read at 320px (a two-by-two grid from 390px if the baseline shows one column wastes the width; see
   the open questions), the date ranges wrap by whole words.
4. **Champion panel.** The crest, the club name and the "Won the final against ..." line fit at 320px (the crest smaller below `sm`, the name
   wrapping by whole words instead of cutting), and the Runner-up and placing groups fit.
5. **Bracket below `lg`.** Each matchup card fits at 320px with both clubs readable: the seed, the crest, the club name (the abbreviated name
   wrapping to at most two lines, or the TV code where the baseline shows it does not fit) and the score, rows at least 44px high below
   `sm` so a tap is easy, the Live and Projected badges not squeezing the label; the stage headings keep their place. From `lg` the
   bracket is as today.
6. **Matchup detail.** Below `sm` the two sides stack with the score beside each club; the game rows fit at 320px with the date, the
   clubs (the abbreviated name or the TV code through `ShortLabel` if they do not fit) and the score or time never overlapping; the
   "Compare" button is a 44px target and its label wraps by whole words. Selecting a matchup still brings the detail into view (the
   `scroll-mt` offset follows the header height variable, `--app-nav-height`, instead of a fixed `scroll-mt-28`, if the baseline shows the
   header covering the top).
7. **Race panel.** The table fits its panel at 320px without the box scrolling sideways if it can (the status shown as a short chip, or the
   Club column wrapping), and where a scrolling box remains it is a tab stop with an edge hint like the Standings table; the "Out of the race"
   list wraps by whole words.
8. **States.** "Loading the postseason", "Could not load the postseason." with Retry, and "The standings are not available yet, so there is
   no bracket to show." fit at 320px, and the empty matchup detail ("Select a matchup to see its games.") reads in place.
9. **Specs.** A new `frontend/e2e/postseason-layout.spec.js` (pattern from `records-layout.spec.js`) for the five seasons at the widths above
   with the checks under Testing; the Postseason entry of `responsive.spec.js` stays; `postseason.spec.js` is updated only for wording or
   structure this item changes.

## Out of scope

- Any API or data change, how the bracket is built (`bracketModel.js`: seeds, projections, the race status, placements, the third-place
  rule), and what each stage is called.
- The desktop bracket from `lg` (four columns, join lines, row heights) and its hover highlight of a club's path.
- The Records page (31m), the site header and menu, the shared `Panel`, `PageHeader` and `AsyncState` (used as they are, with at most an
  opt-in prop).
- A new bracket component or a swipe layout for the bracket: it stays a stack of stages below `lg`, as the plan says ("the bracket below `lg`").

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the narrow check after
each, then present one final review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Baseline, breaks and summary.** Take the baseline probe of scope item 1, then fix the grids and `md:` class (item 2) and the summary
      and steps (item 3).
      Done when: at 320 and 390px the summary panel has no cut text and the page has no sideways scroll on any of the five seasons; the probe
      is deleted and the desktop page looks as today.
- [x] 2. **Champion panel and bracket.** Items 4 and 5.
      Done when: at 320 and 390px, on 2025 and 2024, the champion panel and every matchup card are inside their panels with no cut text and no
      word broken mid-word, a matchup row is at least 44px high below 640px, and tapping a matchup still opens its detail; from `lg` the
      bracket is as today (four columns, lines).
- [x] 3. **Matchup detail and race panel.** Items 6 and 7.
      Done when: at 320 and 390px the detail of a matchup with games (2025, a best-of-five) and of a projected one (2026) fits its panel with
      no overlapping texts and a 44px Compare button, and the race table on 2026 fits (or scrolls as a labelled, focusable box) with the
      out-of-the-race list wrapping; at 768px both look right.
- [x] 4. **States and specs.** Check the states of item 8 at 320px with mocked responses, write `postseason-layout.spec.js`, and run it with
      `postseason.spec.js` and the Postseason entries of `responsive.spec.js` on the local database (`/api/health` says `local`), plus root
      `npm run build` and `cd frontend && npm run lint`.
      Done when they pass.

## Files / areas

- `frontend/src/postseason/PostseasonPage.jsx`, `Bracket.jsx`, `Matchup.jsx`, `MatchupDetail.jsx`, `RacePanel.jsx`, `ChampionPanel.jsx`.
- `frontend/src/index.css` only for the bracket join lines or a rule that cannot be written as utilities (the `bk-*` rules stay from `lg`).
- `frontend/src/lib/ShortLabel.jsx`, `games/gameUtils.js` (`teamCode`): read and use as they are. `postseason/bracketModel.js` is read only.
- `frontend/e2e/postseason-layout.spec.js` (new), `frontend/e2e/postseason.spec.js`, `frontend/e2e/responsive.spec.js`.

## Data / contracts

None changed. The page reads the existing standings, teams, postseason series, remaining games and rounds responses. A `NULL` crest, seed,
score or name means unavailable: the crest or seed is left out, the club code stands in for a missing name, and a score shows nothing until
the game is played (as today). Club names are rendered as React text, never as HTML. The address has no query parameters; the selected
matchup is page state, as today.

## Testing

No unit test runner is configured and no `Verify` command is declared in `AGENTS.md`, so none was run while writing this spec. Browser
tests run on the local database only (`/api/health` must say `local` first). `postseason-layout.spec.js` opens the postseason of 2025,
2026, 2024, 2023 and 2004, then resizes through 320, 390, 639, 640, 768, 1023, 1024 and 1280px (widest first), checking: the document no
wider than the window, nothing outside its panel (apart from a scrolling box on purpose), no word broken mid-word, the bracket one column
below 1024px and four columns from it, matchup rows at least 44px high below 640px, and, after a tap on a matchup, its detail inside its
panel with the Compare button at least 44px high. A mocked case with very long club names covers wrapping, and the loading, error and
"standings not available" states at 320px. Evidence while building comes from single page visits through the Playwright library. Final gate:
root `npm run build` plus `cd frontend && npm run lint`.

## Notes for the AI

- Follow the user's rules: changes stay on the page being built, shared components get opt-in props only. The TV code is the short label
  wherever a full name does not fit; the club code is the permanent ID (memory notes).
- Reuse what 31k, 31l and 31m built (`ShortLabel`, `grid-cols-[minmax(0,1fr)]`, 44px targets below `sm`) and read
  `blueprint/history/features/31m-records-mobile-and-tablet-layouts.md` for the pattern and the mistakes to avoid. Never open the real `.env`.
- Older seasons (2004 and the like) have different data (three-digit scores, other club names, no Play-In): take the baseline on them too,
  not only on 2025 and 2026.
- The error state is the shared `AsyncState`; do not restyle it here. Pickers are the shared customizable selects; this page has none.
- Take the baseline with a throwaway probe before changing code and delete it afterwards. Run only the specs named here; rerun a single
  failing test with `-g`, never the set. Match the surrounding code style and comment density. No AI attribution in commit messages
  (AGENTS.md).

## Open questions

Each has a recommended default.

1. **Stage steps on a phone.** Recommended: keep one column at 320px and make it two by two from 390px only if the baseline shows the four
   steps take more than a screen; otherwise leave as today.
2. **Race table status.** Recommended: keep the status chip but shorten its labels below `sm` ("Playoffs", "Play-In", "Race", "In", "Out")
   so the table fits without a scrolling box; the long labels stay from `sm`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11966,"specSha256":"79088e7e67ee4e92dae92dd5fcc6f4135d47634e720e862489161656d929cdab","branch":"refs/heads/feature/postseason-mobile-layout","head":"8163ec4b3a5dfb88a5f268ecab13513782f8449a","baseRef":"refs/heads/master","baseCommit":"8163ec4b3a5dfb88a5f268ecab13513782f8449a","sourceTree":"7f216b42db6598819cca2bc8204d14c3dc338602","absentOptional":[]} -->

## Completion evidence

- Baseline before the change (a throwaway probe on the live data of 2025, 2026, 2024, 2023 and 2004 at 1280 to 320px, deleted afterwards): no page-level sideways scroll; below 640px club names were cut with an ellipsis in matchup cards, the matchup detail and its game rows, matchup rows were 40px high, the Compare button 32px, and the race table scrolled sideways inside its panel (the Status column clipped).
- Local database (`/api/health` said `local`): `postseason-layout.spec.js` (new: five seasons at 1280, 1024, 1023, 768, 640, 639, 390 and 320px, and the loading, error and no-standings states at 320px), `postseason.spec.js` and the Postseason entries of `responsive.spec.js` passed (15 tests). With the `src/postseason` changes stashed, the new tests for 2023 and 2026 failed, so they cover the defects.
- Screenshots at 320px of the champion panel, a matchup detail and the race table were read; the race table first still scrolled, which was fixed with tighter cell padding before the final run.
- Root `npm run build` and `cd frontend && npm run lint` pass. No `Verify` command is declared in `AGENTS.md`. Not covered: the spec's mocked case with very long club names (the live seasons already have long names).
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested.
