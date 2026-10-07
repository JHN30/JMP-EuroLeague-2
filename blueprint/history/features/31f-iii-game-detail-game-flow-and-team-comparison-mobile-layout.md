# Feature: Game detail Game flow and Team comparison mobile layout

**From build-plan:** feature 31f-iii
**Build attempt:** 1
**Branch:** feature/game-detail-game-flow-and-team-comparison-mobile-layout
**Status:** verified

## Goal

Make two tabs of the game page (`/:season/games/:gameCode`) comfortable from 320px up: **Game flow** (the four flow metric cards, the Lead tracker chart, the period table and the Turning points cards) and **Team comparison** (the Head to head bars, the Four Factors bars with their season-average ticks, and the Scoring profile bars). The header, tab strip and Overview were 31f-i, and the Box score was 31f-ii.

Below `sm` (640px) the cards and panels are compact (less padding, smaller chart), every team name, label and printed value stays inside its card or half of a bar row (a long club name wraps at its spaces and a long value wraps at its spaces, never cut and never wider than the screen), and the Lead tracker fits the panel and redraws when the window is resized. From `sm` up the two tabs look as they do today unless the measurement in step 1 shows something broken at 768px.

Layout only: no API, data or feature changes. The tabs' data, the empty, loading, error and "available" states of each section (every section loads, fails and retries on its own), the bars and their winner highlight, the season-average ticks, the "Lower is better" marker and the chart's tooltip stay as they are.

## Design reference

Current code (read, not yet measured at 320px; step 1 measures it):

- `GameDetailPage.jsx`, `GameFlowTab`: `FlowMetrics` (four `FlowMetric` panels, `p-4`, an `eyebrow` label, a `text-2xl` value and a `muted text-xs` detail, in `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`; two labels are `"{full team name} biggest lead"`), `ScoreFlowChart` (a `Panel p-4` with a "Lead tracker" `PanelHeader` and a bordered box `p-2 sm:p-3` holding a `h-80` Chart.js canvas), `PeriodTable` (done in 31f-i), and `TurningPoints` (four `MomentCard` panels, `p-4`, a `h-8` crest and a title such as `"{full team name} peak lead"`, in `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`).
- `TeamComparisonTab`: three `section`s in `grid gap-6 lg:grid-cols-2` (the third spans both columns from `lg`): `TeamComparisonRows` (a `Panel p-4`: a pair of `TeamLabel`s, then 14 `ComparisonRow`s), `FourFactors` (a `Panel p-4`: the pair of labels, three titled blocks of four rows with a tick and a "Season avg ..." line under each bar, and a note), `ScoringProfile` (a `Panel p-4`: 13 rows; from `lg` two columns with the labels repeated).
- `lib/ComparisonRow.jsx` (shared with the Compare and Team pages): a centred label (with "Lower is better"), then two halves in `grid grid-cols-2 gap-4`, each `p-2` with the printed value, a bar and an optional season-average line. At 320px each half is about 100px wide, and some printed values are long (`"29:34 (74%)"`, `"12 of 28 (42.9%)"`, `"30-55 (54.5%)"`).
- `games/TeamLabel.jsx` already shows the short club name below `sm` (31f-i). The chart colours were changed in 31f-i (home orange, road second colour).
- Specs: `game-four-factors.spec.js` and `game-scoring-profile.spec.js` cover the Team comparison sections; no spec covers the Game flow tab. The page-scroll spec (`responsive.spec.js`) opens the game's Overview tab only. `e2e/support/game-fixtures.js` has `mockGameApi`, `TEAM_FLOW` and `ADVANCED`.

Targets: at 320px no page scrolls sideways on either tab; no word of a club name, label or detail is cut; no printed value or season-average line is outside its half; the flow metrics and turning-point cards are compact; the Lead tracker fills its panel, is shorter than 320px and redraws on resize; at 640px and wider the tabs look as today.

## In scope

- **Game flow below `sm`.** Compact `FlowMetric` and `MomentCard` panels (padding about `p-3`, a smaller value, the club names in their labels and titles wrapping at their spaces, the short club name where a label would not otherwise fit), the Lead tracker panel with less padding and a shorter chart (about `h-64`), and the period table as it is after 31f-i. If the four metric cards stacked in one column take too much of the screen, they may sit two to a row, provided no label is cut (decided from the step 1 measurement).
- **Team comparison below `sm`.** The Head to head, Four Factors and Scoring profile panels with less padding, row halves that keep their printed values and season-average lines inside them (values wrap at spaces), and titles and notes that wrap. Any change to `ComparisonRow` is an opt-in prop that only these tabs turn on, so the Compare and Team pages are unchanged.
- **Revision asked for at review.** On this tab the Head to head and Scoring profile rows show the printed values and the highlight on the better side without the bars (`ComparisonRow`'s `bars={false}`, as on the Overview's Key stats); the Four Factors keep their bars and season-average ticks. The other pages' rows are unchanged.
- **Robustness at 320px.** Check, and fix only what clips: a long club name in a label, a three-digit value, an assisted-baskets line (`"12 of 28 (42.9%)"`), a missing value (em dash), a team with no season average (the hidden-average note), an overtime game's chart (more period labels), a game with one scoring event (the "not enough play-by-play" note), and a game that is not played (each tab's note inside the panel width).
- **Browser check.** A new Playwright spec for these two tabs (see Testing).

## Out of scope

- The Overview and Box score tabs (31f-i, 31f-ii) and the Rotations, Shooting and Play-by-play tabs (31f-iv, 31f-v).
- Any change at 640px and wider beyond fixing something the measurement shows is broken; no new columns, no restyle.
- Removing the Four Factors bars, changing `ComparisonRow`'s default for other pages, any API, data or copy change, new chart features.
- Fixing the Playwright reliability and flaky-spec items (31n).

## Build loop

`workflow.stepReview` is `feature`: build the steps in order without pausing, run the narrow check after each, run the final gate once after the last step, then present one review packet. `workflow.checkpointCommits` is `disabled`: no step commits; `/complete` makes the single work commit.

## Build steps

- [x] **1. Measure the two tabs.** With the dev servers running, open the Game flow and Team comparison tabs of a played game (live season and `2025`) at 320, 390, 768 and 1024px and record, in a scratch note outside the repo, each section's height, the first element wider than the screen, which labels or values wrap or cut, and the chart's size (use a scratch Playwright spec and delete it afterwards). Done when the numbers are in hand and no repository file has changed.
- [x] **2. Game flow tab below `sm`.** Compact `FlowMetric` and `MomentCard` classes, the shorter chart and tighter padding in `ScoreFlowChart`'s full (non-compact) mode, in `GameDetailPage.jsx` and `gameFlow.jsx`; the Overview's compact chart stays as it is. Done when at 320px the four metric cards, the chart and the turning points fit without sideways scroll or a cut word, the chart is shorter than before and as wide as its panel after a resize, `npm run lint` passes, and at 768px the tab looks as before.
- [x] **3. Team comparison tab below `sm`.** The panels, row halves, section titles and notes of the three sections (and, only if needed, an opt-in `ComparisonRow` prop). Done when at 320px every printed value and season-average line is inside its half, no word is cut, the three panels are no wider than the screen, and at 768px and 1024px the tab looks as before.
- [x] **4. Browser spec.** Add `frontend/e2e/game-flow-layout.spec.js` (see Testing) and run it with the existing Team comparison specs and the page-scroll spec. Done when `npx playwright test game-flow-layout game-four-factors game-scoring-profile game-overview responsive` passes.
- [x] **5. Final gate and handoff.** `npm run build` at the repository root and `cd frontend && npm run lint` pass, the spec's boxes are checked, the status is `verified`, and the review packet lists the checks run. Done when both commands exit 0 and the packet names them.

## Files / areas

- `frontend/src/games/GameDetailPage.jsx` (`FlowMetrics`, `FlowMetric`, `TurningPoints`, `MomentCard`, `TeamComparisonTab` and its row panel).
- `frontend/src/games/gameFlow.jsx` (`ScoreFlowChart` in its full mode), `frontend/src/games/FourFactors.jsx`, `frontend/src/games/ScoringProfile.jsx`.
- `frontend/src/lib/ComparisonRow.jsx` (an opt-in `compact` prop, off by default, turned on only by the Team comparison tab's three sections); `frontend/src/index.css` only if a class is needed.
- `frontend/e2e/game-flow-layout.spec.js` (new); fixtures are reused, with the game route and play-by-play overridden inside the new spec.

## Data / contracts

No API or data change. The tabs keep reading the box score, play-by-play, advanced and team-flow responses as today. Markup contract: every `ComparisonRow` keeps its label, both printed values, its winner highlight, its tick and season-average line (where it has them) and its "Lower is better" marker; the chart keeps its accessible name (`Running score margin ...`); a club name that is shortened below `sm` keeps the full name for screen readers (the `TeamName` pair from 31f-i).

## Testing

- `frontend/e2e/game-flow-layout.spec.js`, following the other game layout specs (load once, resize through the widths, `findPageOverflow` polled because a chart redraws a frame after a resize, a per-word `Range.getClientRects` check for mid-word splits), with `mockGameApi`, `TEAM_FLOW`, `ADVANCED`, a play-by-play with enough scoring plays for runs and lead changes (an overtime variant for the period labels), and long club names:
  - Game flow at 320, 390 and 639px: no sideways scroll; the four metric cards, the chart panel and the turning-point cards are inside the screen; no word of a card label or title is split; the chart canvas is as wide as its panel and shorter than 320px, and after a resize between 320 and 390 it matches its panel again; with one scoring event the "not enough play-by-play" note is inside the panel;
  - Team comparison at 320, 390 and 639px: no sideways scroll; every `ComparisonRow` half holds its printed value and season-average line; no word of a label, title or note is split; the hidden-average note and the "Lower is better" marker are inside their panels;
  - at 640, 768 and 1024px both tabs keep today's structure (the card grids are two columns from `sm`, the three sections stack below `lg`) and have no sideways scroll;
  - a game that is not played shows each tab's note inside the panel width.
- Existing specs that must stay green: `game-four-factors`, `game-scoring-profile`, `game-overview`, `game-rotations`, `game-box-score` and `responsive`.
- No unit-test command exists, and the changes are layout, so there is no logic test. There is no declared `Verify` command, so the final gate is the repository build and the frontend lint; the Playwright run is opt-in evidence and is reported as such. Live visual checks at 320, 390, 768 and 1024px are done by the user from the "How to try it" note.

## Notes for the AI

- Follow the 31d to 31f conventions: mobile-first unprefixed styles, `sm` and `lg` as the only breaks, `max-sm:` for phone-only changes, nothing changes from `sm` unless step 1 shows it broken, and unlayered CSS outranks Tailwind utilities.
- Scope every design choice to this page: any shared piece (`ComparisonRow`, `ScoreFlowChart`) gets an opt-in prop or a change that only affects this page's use of it, and the review packet names each shared piece touched.
- A chart redraws a frame after a resize: poll for its size and for page overflow instead of reading them straight after `setViewportSize`.
- Write long multi-line files with the Write tool. Do not start a dev server: use the Playwright runner, which starts its own, or ask the user to start one.

## Open questions

None. The bars were decided at review: removed from the Head to head and Scoring profile rows, kept on the Four Factors.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":12102,"specSha256":"b5bb4cd6359e2d005eb768ab03860e7b83f0da885b775162c4b3a0d23083dba3","branch":"refs/heads/feature/game-detail-game-flow-and-team-comparison-mobile-layout","head":"dc015ebfd2d1c5a088b086c35fba65bf89e1d958","baseRef":"refs/heads/master","baseCommit":"dc015ebfd2d1c5a088b086c35fba65bf89e1d958","sourceTree":"eb1b24bd466d63a869b8d81e0471639c72756912","absentOptional":[]} -->
