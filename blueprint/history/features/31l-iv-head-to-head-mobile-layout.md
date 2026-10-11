# Feature: Head-to-head mobile layout

**From build-plan:** feature 31l-iv
**Build attempt:** 1
**Branch:** feature/head-to-head-mobile-layout
**Status:** verified

## Goal

Make the Head-to-head page (`/:season/compare/head-to-head?teamA=..&teamB=..&from=..&through=..`) work from 320px up: no sideways page
scroll, no club name cut or broken mid-word, a KPI strip that shows all four numbers without swiping, a series header that reads at
320px, charts and lists that fit, and the same touches the team comparison got in 31l-ii (the club's crest and TV code or abbreviated name
where a full name does not fit, "Hover or tap" wording). The Compare landing and the top of an opened comparison were 31l-i, the team tabs
31l-ii and the player tabs 31l-iii. Mobile is below 640px (unprefixed styles), tablet is `sm` (640px), desktop is `lg` (1024px); `xl` stays.
Layout and labels only; no API or data change.

Today (read from `HeadToHeadPage.jsx`; not yet probed in a browser at 320px, that is step 1):

- **Pickers** (`TeamPicker` x2, a swap button and two season selects in one `Panel`): the grid is one column below `sm` and
  `[minmax(0,1fr)_auto_minmax(0,1fr)]` from `sm`; the swap button is a `btn-sm` square. The two season selects ("From season",
  "Through season") sit in a `flex-wrap` row and are named only by `aria-label`, so two selects that both read "2024-25" do not say which
  end of the range they set.
- **Hero** (`Hero`, `IdentityCard`): a `flex flex-wrap` row of the club on the left (a `h-14` crest and a `text-lg` full name), the series
  record in `text-4xl` with "N completed meetings", and the club on the right (`flex-row-reverse`). With two long names it wraps into three
  stacked rows at 320px, the record between the clubs and the right club mirrored.
- **KPI strip** (`SummaryGridStrip` in `HeaderStats`, plain `.kpi-strip`): four chips ("Series record", "Avg margin", "Current streak",
  "Total points scored"). Below `lg` it is a horizontal scroll strip (`minmax(9rem,1fr)` columns), so the last chips are off screen on a
  phone; from `lg` it is a five-column grid with the fifth column empty. The streak chip reads "<abbreviated name> <count>". The strip keeps
  the plain `.kpi-strip` rules on purpose: 31d-i gave Standings its own modifier and left this page's strip for this item.
- **Charts and panels**: `MarginTimeline` (a bar chart of every meeting's margin from "Team A"'s side, `h-64`, axis labels `"<season> R<n>"`
  thinned to 8, `mode: "nearest", intersect: true` tooltips, dataset "Team A margin"); `MomentumPanel` ("Team A has won N straight", a
  three-column Home/Away/Neutral record row, the Final Four note); "Notable meetings" (links "Biggest margin: 80-70 (2025)"); "Season
  breakdown" (a `flex justify-between` row per season); "Upcoming and latest meetings" (one `Link` row per meeting, the round on the left and
  "<abbr> 80-70 <abbr>" on the right in one `flex` line). The two-up grids are plain `lg:grid-cols-2`.
- **Way back**: no back link; the phone bar names the section "Compare" (`pageLabel`). The page is reached from an opened team comparison
  ("All-time head-to-head", `CompareFixtures.jsx`).
- `responsive.spec.js` has Head-to-head as a `staticPage`, which opens it with no teams chosen, so the hero, strip, charts and lists are
  never measured. `head-to-head.spec.js` is a single mocked test with generic "Team A"/"Team B" names.

31l-ii and 31l-iii found, on the comparison tabs, grids that grew past the window because a grid track does not shrink below its content
(fixed with `grid-cols-[minmax(0,1fr)]`), `truncate`d names, and charts left at an older width after a resize. The same patterns are in this
file and are the starting hypothesis; step 1 measures before changing anything.

## In scope

1. **Breaks.** The two-up panel grids are one column below `lg` as today, with `grid-cols-[minmax(0,1fr)]` below `lg` so a chart cannot widen
   them. No `md:` classes are added.
2. **Way back.** A `BackLink` to the Compare page ("← Compare", `/:season/compare`) at the top of the page, which the phone bar then carries
   like the other detail pages (see the open questions).
3. **Pickers.** Below `sm` the two team selects and the swap button stack with the swap button between them (a 44px touch target below
   `sm`); from `sm` the layout is as today. Nothing is cut at 320px, including a very long club name in a select. The "From" and
   "Through" season selects are removed (see "Changed at review").
4. **Hero.** Below `sm`, a three-column row: the first club, the series record, the second club, each club as a centred crest over its
   abbreviated name (wrapping by whole words, at most two lines), with "N completed meetings" centred under the row. From `sm` the layout is
   today's (crest beside the full name). The record is never wrapped or cut.
5. **KPI strip.** A modifier of its own (not `kpi-strip-4`, whose chips are Home's photo cards): two columns below `lg`, four across from `lg`,
   no horizontal scrolling at any width, chips compact below `sm`; values and labels wrap by whole words. The streak value shows the club's
   TV code below `sm` and its abbreviated name from `sm` (`teamCode` and `shortTeamName` from `games/gameUtils.js` through `ShortLabel`), and
   the club the streak belongs to is still named when the number is a loss streak.
6. **Margin chart.** Its axis labels thinned by the chart's width (`lib/useElementWidth.js`), so a 320px chart shows fewer labels and none
   overlap; tooltips that work by touch (`mode: "index"`, `intersect: false`) and name both clubs and the game ("<season> · <round>");
   the dataset, tooltip and `aria-label` name the first club ("<abbr> margin", "from <abbr>'s side") instead of "Team A", and a one-line
   note under the title says which way a bar points ("Above the line: <abbr> won. Below: <abbr> lost."). The chart redraws at the new width
   after a resize without a reload.
7. **Momentum, Notable meetings, Season breakdown.** The streak sentence and the record row name the club ("<abbr> has won 3 straight";
   "Home", "Away", "Neutral" are that club's records, said once under the row); the three-column record row fits at 320px; Notable meetings'
   links are touch-sized rows (the existing text, wrapping); the Season breakdown lists only the seasons in which the two clubs meet
   (a season with a scheduled meeting counts), each row keeping the season name on the left and "N meetings, W-L" right-aligned, wrapping
   inside the panel.
8. **Meeting list.** Below `sm` each meeting is two lines inside the same bordered link: the season and round, then the result with each
   club's TV code (`ShortLabel`) around the score, the winner still in the accent colour; an unplayed meeting shows its date and time on the
   second line. From `sm` one row as today.
9. **States.** "Select two teams to see their head-to-head history.", "Loading head-to-head history", "Could not load head-to-head history."
   with Retry, "These teams have not met in any archived season.", "Loading seasons" and the seasons and teams error
   states fit at 320px in the same layout as loaded content.
10. **Specs.** A new `frontend/e2e/head-to-head-layout.spec.js` (pattern from `compare-team-layout.spec.js`); an opened head-to-head (two real
    clubs) added to `responsive.spec.js` in place of the empty `staticPage("Head-to-head")` entry; `head-to-head.spec.js` updated for the
    wording this item changes.

## Out of scope

- Any API or data change, what the page computes (series record, streak, margins, splits, the Final Four "neutral" proxy, which meetings are
  "notable"), the picking and swapping behaviour and its URL (`teamA`, `teamB`), and the number of games
  fetched per season.
- The Compare landing, the opened team and player comparisons (31l-i to 31l-iii), the Records and Postseason pages (31m, 31n).
- Showing which club scored which side in "Biggest margin: 80-70" (it stays the home-road score as today).
- Changing `Panel`, `PageHeader`, `CompactMetric`, `CompactFilterSelect` or `HeaderStats` beyond an existing option; the KPI strip change is
  a new CSS modifier that Home's and Standings' strips do not use.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the narrow check after
each, then present one final review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Baseline, way back and pickers.** Before changing code, take a baseline of one live head-to-head (two clubs with the longest
      names that have met, and a pair with a short name) with a throwaway probe: loaded once and resized through 320, 390, 639, 640, 768,
      1023, 1024 and 1280px, recording page width, cut texts, broken words and anything outside its panel; delete the probe afterwards.
      Then add the `BackLink`, and fix the picker panel (stacked pickers, swap button between them).
      Done when: at 320 and 390px the picker panel has no cut text and nothing outside its panel, the swap button is a 44px target, the
      page has no sideways scroll, and the back link is in the phone bar and above the header
      from `sm`; from 640px the pickers look as today.
- [x] 2. **Hero and KPI strip.** The three-column hero below `sm`, the KPI strip modifier in `src/index.css` (placed before the `lg` media
      rule it overrides, and excluded from `.kpi-strip:not(.kpi-strip-4):not(.kpi-strip-5)`), and the streak value's `ShortLabel`.
      Done when: at 320 and 390px both clubs and the record are inside the hero with names wrapping by whole words, the four chips are a
      two-by-two grid with no horizontal scroll, and the streak reads a TV code; from 1024px the four chips sit across; Home's and
      Standings' strips are unchanged.
- [x] 3. **Margin chart and Momentum.** The chart's label thinning, touch tooltips, club names and note; the momentum sentence and row.
      Done when: at 320 and 390px the chart is inside its panel with readable axis labels (none overlapping) and a tooltip a tap opens, also
      after resizing from 1280px down to 320px without a reload; the momentum panel names the club and its three records fit; from `lg`
      the two panels sit side by side as today.
- [x] 4. **Notable meetings, Season breakdown and the meeting list.** Touch-sized notable links, right-aligned season records, the two-line
      meeting rows below `sm`.
      Done when: at 320 and 390px every row is inside its panel with no cut text and no word broken mid-word, with a meeting list of 40 or
      more rows; from 640px the rows look as today.
- [x] 5. **States and specs.** Check the states at 320px with mocked responses, write `head-to-head-layout.spec.js`, add the opened
      head-to-head to `responsive.spec.js`, update `head-to-head.spec.js`, and run those three, plus the spec that reads the shared strip
      CSS (`standings-table-layout.spec.js`) once.
      Done when they pass on the local database (`/api/health` says `local`), with root `npm run build` and `cd frontend && npm run lint`.

## Files / areas

- `frontend/src/comparisons/HeadToHeadPage.jsx` (all the page's panels and the margin chart).
- `frontend/src/index.css`: one new `.kpi-strip` modifier and its chip rules, and the `lg` selector that excludes the modifiers.
- `frontend/src/games/gameUtils.js`, `lib/ShortLabel.jsx`, `lib/BackLink.jsx`, `lib/useElementWidth.js`: read and use only.
- `frontend/e2e/head-to-head-layout.spec.js` (new), `frontend/e2e/head-to-head.spec.js`, `frontend/e2e/responsive.spec.js`.

## Data / contracts

None changed. The page reads the existing seasons, season teams and team games responses (fetched per season, filtered to the two clubs).
A `NULL` score, crest, TV code or abbreviated name means unavailable: the club's name, then its club code, stands in, and a score shows "-",
never zero (as today). The URL (`teamA`, `teamB`, `from`, `through`) is unchanged. Club names and codes are rendered as React text, never as
HTML. Team objects here come from the latest season that lists the club, so a TV code is that season's code (the club code is
the permanent ID).

## Testing

No unit test runner is configured and no `Verify` command is declared in `AGENTS.md`, so none was run while writing this spec. Browser tests
run on the local database (`/api/health` must say `local` first). `head-to-head-layout.spec.js` opens one live head-to-head, then resizes
through 320, 390, 639, 640, 768, 1023, 1024 and 1280px (widest first, so the chart must shrink), checking: the document no wider than the
window, no cut text and no word broken mid-word, content inside its panel, the strip two-by-two below 1024px and four across from it with no
scrolling, the hero's clubs and record inside the hero, the chart inside its panel with its canvas as wide as its well, the streak a TV code
below 640px and the abbreviated name from it, and the meeting rows two lines below 640px. Mocked responses cover two very long club names
with no crest, a 40-meeting history across several seasons, no meetings, failing team games, and no clubs chosen. A touch test at 390px taps
the swap button (chart tooltips draw on the canvas, so a tap on a bar is not asserted). Evidence while building comes from single page visits through the Playwright library. Final gate: root
`npm run build` plus `cd frontend && npm run lint`.

## Notes for the AI

- Follow the user's rules: changes stay on the page being built, shared components get opt-in props only. The TV code is the short label
  wherever a full name does not fit; the club code is the permanent ID (memory notes).
- Reuse what 31l-ii and 31l-iii built (`ShortLabel`, `grid-cols-[minmax(0,1fr)]`, the crest over abbreviated name heading) and read
  `blueprint/history/features/31l-ii-team-comparison-tabs-mobile-layout.md` for the details and the mistakes to avoid. Never open the real
  `.env`.
- Take the baseline with a throwaway probe before changing code and delete it afterwards. Run only the specs named here; rerun a single failing
  test with `-g`, never the set.
- Match the surrounding code style and comment density. No AI attribution in commit messages (AGENTS.md).

## Changed at review

The user asked, after trying the built page, for the "From" and "Through" season selects to go: the page is the clubs' all-time series (feature
17g-ii: "every meeting between two clubs across the archived seasons"), so every season is always counted, and the Season breakdown lists only
the seasons in which the clubs meet or will meet. Built accordingly: `useSeasonRangeParams` (used only by this page) is deleted, a `from` or
`through` in an old link is ignored, the empty message reads "These teams have not met in any archived season.", and the layout spec covers a
season breakdown over two of five seasons, including an old link that carries `from` and `through`.

## Open questions

Each had a recommended default.

1. **Back link.** Built as recommended: a "← Compare" back link to `/:season/compare` (item 2).
2. **Season range captions.** Withdrawn when the season range itself was removed (see "Changed at review").


<!-- blueprint:completion {"schemaVersion":1,"specBytes":15172,"specSha256":"1734b368338926e2c5fe4b0d8f92a664b78a2eab994b2cc3b1de30b33084d692","branch":"refs/heads/feature/head-to-head-mobile-layout","head":"9e10dc3693dcf91a427ac2aad6d0f5e16a2b3c01","baseRef":"refs/heads/master","baseCommit":"9e10dc3693dcf91a427ac2aad6d0f5e16a2b3c01","sourceTree":"747e69089f1d85d25a132c81e1d3bb736ccd3107","absentOptional":[]} -->

## Completion evidence

- Browser tests on the local database (`/api/health` said `local`): `head-to-head-layout.spec.js` (new, 9 tests with `head-to-head.spec.js`), the Head-to-head entries of `responsive.spec.js` (7), and `standings-table-layout.spec.js` (7, once, for the shared strip CSS), all passing.
- Root `npm run build` and `cd frontend && npm run lint` pass. No `Verify` command is declared in `AGENTS.md`.
- Baseline before the change: the page was 985px wide at 320px (the chart's grid would not shrink) and the KPI strip scrolled sideways below 1024px.
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested.
