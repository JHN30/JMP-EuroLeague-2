# Feature: Game detail Shooting and Play-by-play mobile layout

**From build-plan:** feature 31f-v
**Build attempt:** 1
**Branch:** feature/game-detail-shooting-and-play-by-play-mobile-layout
**Status:** verified

## Goal

Make the Shooting and Play-by-play tabs of `/:season/games/:gameCode` work from 320px up with no clipped text, no sideways page scroll, and far less vertical space spent on settings. Layout only: no API, data, filter-logic or copy change. Desktop (`lg`) keeps its current look, except where a step says otherwise.

What the user saw on a phone (screenshots of the current state):

- Shooting: the green "Box score matched · 141 plotted" badge sits to the right of the title and is cut off at the panel edge ("plotted" loses its last letter). The three presentation modes wrap onto two lines. Six full-width selects (Team, Player, Shot type, Period, Result, Play context) stack one under the other and push the court a screen and a half down.
- Play-by-play: every row takes three lines (name truncated to "BOLOMB...", then the event badge, then the detail truncated to "Free Throw In ..."), with a wide score column.

## In scope

Mobile is below 640px, tablet is `sm` (640px), desktop is `lg` (1024px); `xl` stays. Mobile-first styles, `max-sm:` for phone-only rules.

**Shooting tab**

1. **Header badge.** The "Box score matched / Partial chart coverage · N plotted · N without location" badge is never clipped. Below `sm` it leaves the title row and sits on its own line under the title, and its full text may wrap to two lines (rounded corners instead of a pill when it wraps). From `sm` it stays where it is.
2. **Presentation strip.** The Shot map / Zone heatmap / Shooting comparison strip uses the existing `TabStrip scrolling` prop, so it is one row that scrolls inside its own box and centres the selected mode (the same as the game page's main strip, `className="mb-4 lg:w-fit"`).
3. **Compact filters.** Below `sm`, the filter selects are collapsed behind one full-width "Filters" button (`aria-expanded`, `aria-controls`) that shows how many filters differ from their default ("Filters · 2 active", or just "Filters" when none). Expanded, the selects sit in a two-column grid (a select whose longest option does not fit its column spans both). From `sm` the button is not shown and the selects are visible as today, so the desktop layout is unchanged. Collapsed filters still apply: collapsing never resets them. The same small control is used by the Play-by-play filters.
4. **No duplicate Period control.** On the shot map and zone heatmap the quarter playback buttons already set the same period. Below `sm` the Period select is left out of the Filters grid on those two modes (it stays on the comparison mode, which has no playback buttons, and from `sm` on every mode).
5. **Quarter playback.** The "Animate quarters / Pause" button and the Full game, Q1 to Q4 (and overtime) buttons stay on one row below `sm`, scrolling inside their own box instead of wrapping to three tall rows (on touch screens each button is at least 44px tall). The active period stays in view while the playback advances.
6. **Court and legend.** The half court scales to the panel width with no overflow, the legend wraps cleanly, and the court's padding is smaller on a phone. If, at 390px, the zone-heatmap chips ("made/attempts, %") render below roughly 8px, they are hidden below `sm` through a CSS rule scoped to the game page's court wrapper (the numbers are in the Zone comparison table beneath and in each zone's tooltip), instead of being drawn as unreadable specks. `ShootingCourt` and the Team and Player pages are not changed.
7. **Shooting comparison panels.** The two team panels (crest, name, 2PT / 3PT / eFG% line, mini heatmap) stack in one column below `sm`; the three stat cells fit at 320px without wrapping mid-value; long club names wrap or use the short name instead of overflowing.
8. **Zone comparison table.** Below `sm` the table fits 320px without scrolling inside its own box: team column headers use the club's TV code (`teamCode`, with the full name for screen readers and as `title`), the zone name wraps, and the made-attempts detail sits under the FG% instead of beside it. From `sm` it is as today.

**Play-by-play tab**

9. **Header and filters.** The "N events" badge never clips. The three filters (Event type, Period, Team) use the same compact "Filters" control below `sm`, with "Key plays" counted as the default for Event type. From `sm` the three selects stay in one row.
10. **Rows.** Below `sm` a row takes two lines instead of three: the period and clock on the left, the player's name and the event badge on one line (the name may wrap to a second line instead of being cut to "BOLOMB..."), the detail text under them wrapping to at most two lines instead of being truncated to one, and a smaller score on the right. Names are shown without the feed's comma (the same "LAST FIRST" form the Box score uses). Row padding is tighter. The tinted scoring rows, the newest-first order, "Show 60 more", and the empty states are unchanged. From `sm` the row is as today (the existing right-edge alignment spec still passes).

**Both tabs**

11. The panels use `p-3` below `sm` and `p-4` from `sm`, as the other finished game tabs do.
12. Every state fits at 320, 390, 768 and 1024px with no sideways page scroll: the Shooting tab with shots, with a partial-coverage badge and shots without a location, a game with overtime (five or more periods), the comparison mode, a game without shots, and the Play-by-play tab with long player names, long play details, no crest, a timeout without a player, a game not yet played, and an empty feed.

## Out of scope

- Any API, data, filter-logic or wording change (including the "Box score matched" text and the filter labels).
- Changing `ShootingCourt`, `ShootingLegend`, `HeatmapLegend` or `PanelHeader` behaviour for other pages (Team and Player Shooting sections keep what they have; they get their own items 31h and 31j). Any new prop must default to today's behaviour.
- The TV code on the Shooting legend and the Play-by-play rows (the legend keeps the abbreviated name; the finished pages are item 32b).
- Removing the bars on other pages, the comma removal on other tabs, and the other game tabs (done in 31f-i to 31f-iv).
- Pinch-zoom or a scrollable, larger court for the heatmap chips (see Notes).

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the narrow check after each, then present one final review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Shooting header, strip and compact filters.** Add a small `FilterDisclosure` control in `frontend/src/games/` (button below `sm`, `aria-expanded`/`aria-controls`, active-filter count, content always visible from `sm`) and use it for the Shooting selects. Move the badge to its own line below `sm`, make the presentation strip `scrolling`, hide the Period select on the map and heatmap modes below `sm`, and use `p-3` below `sm`. *Done when:* at 320 and 390px the badge text is fully visible, the strip is one row with the selected mode centred, only the "Filters" button shows until it is opened, opening it shows the selects in two columns, changing a filter updates the count and the court, and collapsing keeps the filters; at 768 and 1024px the selects are all visible with no button and the court and table are as before; `npx playwright test game-shooting.spec.js` still passes.
- [x] 2. **Playback, court and comparison.** Make the quarter playback one scrolling row that keeps the active period in view, tighten the court wrapper padding, check the heatmap chip size at 390px and hide the chips below `sm` only if they render below about 8px, stack the two comparison panels with a stat line that fits at 320, and make the Zone comparison table fit 320px (TV code headers, wrapping zone names, detail under FG%). *Done when:* at 320 and 390px the playback occupies one row, the playing quarter is visible while it advances, the court, legend, comparison panels and zone table have no clipped text and no page overflow, and the zone table needs no inner scroll at 320; at 768 and 1024px it looks as before.
- [x] 3. **Play-by-play.** Reuse `FilterDisclosure` for its three filters, make the event-count badge fit, switch the row to the two-line phone layout (comma-free names, wrapping detail, smaller score), and use `p-3` below `sm`. *Done when:* at 320 and 390px a row is two lines for a typical event, a long name and a long detail wrap instead of being cut with "...", filters sit behind the "Filters" button with the right count (Key plays is the default), and "Show 60 more" and the empty states still work; at 768 and 1024px the rows are as before and `npx playwright test game-play-by-play.spec.js` still passes.
- [x] 4. **Specs and final gate.** Add `frontend/e2e/game-shooting-layout.spec.js` and `frontend/e2e/game-play-by-play-layout.spec.js` (patterns from `game-rotations-layout.spec.js`: load once, resize through widths, `findPageOverflow` polled with `expect.poll`, mocked API through `mockGameApi`), covering item 12. *Done when:* both new specs pass, `game-shooting.spec.js`, `game-play-by-play.spec.js`, `game-detail-layout.spec.js` and `game-matchup-header.spec.js` still pass, and root `npm run build` and `cd frontend && npm run lint` pass.

## Files / areas

- `frontend/src/games/GameDetailPage.jsx`: `ShootingTab`, `QuarterPlayback`, `TeamComparisonPanel`, `PlayByPlaySection`, `PlayByPlayRow`.
- `frontend/src/games/FilterDisclosure.jsx`: new, used by the two tabs only.
- `frontend/src/games/ZoneComparison.jsx`: phone layout of the table and its headers.
- `frontend/src/index.css`: phone-only rules (court chips if needed, badge wrapping, table cells), scoped to classes used on these tabs.
- Shared and left alone unless an opt-in prop is needed that defaults to today's behaviour: `PanelHeader`, `TabStrip`, `useCentredSelection`, `ShootingCourt`, `LabelledSelect`.
- `frontend/e2e/game-shooting-layout.spec.js`, `frontend/e2e/game-play-by-play-layout.spec.js`: new.

## Data / contracts

None. No new request or response field. The shots and play-by-play data, the filter keys and defaults, and the visible texts stay as they are. TV code comes from the existing `tvCode` on the game's team objects through `teamCode` (item 32a).

## Testing

No unit test runner is configured. Browser tests are opt-in evidence (`cd frontend && npx playwright test <file>`; Playwright starts its own servers). The two new specs assert, at 320, 390, 768 and 1024px, no page overflow, the badge and count texts fully inside their boxes, the Filters button present below `sm` only and counting active filters, the playback on one row, the zone table without inner scroll at 320, and the play-by-play row height and no truncated "..." on long names and details. Known flaky specs under full load are not part of this item. Nothing here proves how it looks in the user's own browser; the final packet will say so and give a short try path.

Verify: no `Verify` command is declared in `AGENTS.md`; the final gate is root `npm run build` plus `cd frontend && npm run lint`, not run while writing this spec.

## Notes for the AI

- Follow the user's rule: scope changes to the page being built; shared components only get opt-in props with today's default.
- The user asked for compact filters and compact play-by-play rows "more or less"; the collapsed Filters control, the hidden duplicate Period select and the two-line rows are my proposal. If the result feels wrong when tried, the fallback is a two-column grid of selects without the disclosure.
- Heatmap chips are drawn in SVG units (about 28 to 32 units of text on a 1555-unit-wide court), so they are tiny on a 256px-wide court. Measure first; do not hide them if they are readable.
- Touch screens give buttons a 44px minimum (`touch-target`), which is why wrapped playback buttons cost three rows.
- The empty-state text, the unplayed game text and the error states are existing behaviour; only check that they fit.
- No Co-Authored-By or AI attribution in the commit (AGENTS.md).
- Built differently from the spec in three small ways: the filters are one column below 384px and two columns from 384px to 639px (a select must not clip its longest option); the heatmap chips are hidden below 480px, not below 640px (measured: about 6px at 390px, readable from about 440px); the playback row moves just far enough to keep the active quarter in view instead of centring it (centring cut off the Animate button).
- Added after the first review, at the user's request: in the Zone comparison table the team with the higher FG% in a zone is shaded in its own colour (primary for the first team, secondary for the second; no shading for a tie or a zone only one team shot in, and a visually hidden "(higher)" for screen readers), with a line under the table saying so; and on a court drawn narrower than 420px the heatmap chips show just the percentage in larger type instead of being hidden (`ShootingCourt` got an opt-in `compactBelow` prop, default 0, which only the game page passes). This replaces "hide the chips below 480px" above.
- Changed again at the user's request: the "Box score matched / Partial chart coverage · N plotted" badge is removed from the Shooting header on every width (this replaces In scope item 1; the "Location unknown" row of the zone table still shows shots without a location), and the quarter buttons now share one row with no scrolling (this replaces item 5): below 640px the labels are "Play" and "Full" (the full names stay for screen readers), with less padding and no minimum width, and from 640px they are as before.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":13810,"specSha256":"6335387b79527162700e2e097322fa96bc42cf284067dbde943dcaf173e68307","branch":"refs/heads/feature/game-detail-shooting-and-play-by-play-mobile-layout","head":"b25ec06be7a87e68e22705123216bc88ce593a03","baseRef":"refs/heads/master","baseCommit":"b25ec06be7a87e68e22705123216bc88ce593a03","sourceTree":"8df8c2fd87574a6efe6b836ac4b90e2e8e9fd38f","absentOptional":[]} -->
