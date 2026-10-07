# Feature: Standings table and KPI strip mobile layout

**From build-plan:** feature 31d-i
**Build attempt:** 1
**Branch:** feature/standings-table-and-kpi-strip-mobile-layout
**Status:** verified

## Goal

Make the Standings page's main view (`/:season/standings`, Table mode: Overall, Home, Away and Last 10) usable from 320px up. Today a phone shows only the rank and a cut-off team name: the table is 14 columns and 1,039px wide inside a 278px scroller, no column is pinned, and the record is a swipe away. The KPI strip above it is broken: club names break one letter per line and the cards are 535px tall. After this item, below `xl` (1280px) the rank and team stay pinned on the left while the stats scroll behind them, the wins, losses and percentage are visible without scrolling at 320px, a short team name stands in below `sm`, and the KPI strip is two compact columns that never cut a name. From `xl` up the page looks as it does today.

Layout only: no API, data or feature changes.

## Design reference

Observed in the running app before this work (live season, light theme):

| Width | Table | Scrolls in its own box | KPI strip |
| --- | --- | --- | --- |
| 320px | 1,039px wide, 14 columns | yes (278px box), nothing pinned | 5 cards 144px wide and 535px tall, every name broken letter by letter |
| 390px | same | yes (338px box) | same |
| 768px | 1,103px wide | yes (700px box) | same |
| 1024px | 1,103px wide | yes (932px box) | 5 across, 5 of 5 names broken |
| 1279px and up | 1,103px wide | no | 5 across, no name broken |

- At 320px the visible table is `#` and a truncated name ("Panathinaikos AKTOR ..."); wins, losses and percentage need a swipe, and swiping scrolls the team name away. The breakdown tables already pin their second column below 1100px; the main table does not.
- The table's club cell uses `max-w-40 truncate`. The standings data has no short name: entries carry `clubName`, `clubCode` and `crestUrl` only. The short name (`abbreviatedName`) is on the teams list the Teams page already loads (`GET /seasons/:season/teams`, query key `["teams", seasonCode]`).
- The KPI strip is the plain `.kpi-strip` with `CompactMetric` chips (a 5.5rem crest beside the text). It is shared with the Head-to-head page, which is not part of this item.
- No sideways page scroll today at any width; the page-scroll spec already lists Standings.

Targets: at 320px the first screen of the table shows the pinned rank, crest and short name, then wins, losses and percentage; the KPI strip is two columns with whole-word names; nothing changes at 1280px and wider.

## In scope

- **KPI strip.** `StandingsKpiStrip` passes a new modifier class (`kpi-strip-5`) to `HeaderStats` and a `data-testid`. Below `sm` the cards are compact and stacked (small crest on top, then label, name, value), two columns, a card count that is odd leaves the last card spanning both columns. From `sm` to `xl` the cards keep the current small row layout (crest beside the text), still two columns, the last of an odd count spanning. From `xl` the five-across grid is as today. Four, three or five cards all work (the riser and faller cards only exist after round 1). The shared `.kpi-strip` rules stay as they are for strips without the modifier; the `lg` five-column rule must not apply to the modifier (it is five across from `xl`, because names break from 320 to 1024px and fit from about 1279px).
- **Pinned columns, below `xl`.** In `OverviewTable` the first two columns (rank with its Q badge, then team) are `position: sticky` at the left edge, with the panel's fill and a hairline edge, so they stay put while the stat columns scroll. The first column has a fixed width so the second can pin right after it. The tier header rows ("Direct to playoffs" and so on) keep their label in view while the table is scrolled sideways. From `xl` the columns are not pinned and the table renders as it does today.
- **Columns below `sm`.** GP is hidden below `sm` (it is wins plus losses); every other column stays and is reached by swiping. The order is unchanged, so wins, losses and percentage are the first stats after the pinned team.
- **Short team names below `sm`.** `StandingsPage` reads the teams list through the shared query (`["teams", seasonCode]`), builds a map from club code to `abbreviatedName`, and `OverviewTable` passes each club's short name to `ClubCell`. Below `sm` the cell shows the short name (falling back to the full name when it has none); from `sm` it shows the full name as today. The link's accessible name stays the full club name at every width. While the teams list is loading or if it fails, full names show (truncated as now) and no error is raised for it. `ClubCell` keeps its current behaviour when it is not given a short name, so the breakdown, Race and Advanced views are unchanged.
- **Controls and footer.** The phase tabs, the Table, Race and Advanced tabs, the view tabs and the Breakdown select, and the table footer (the Q key and the two notes), are checked at 320px and 390px; only what clips or overflows is fixed.
- **Playwright spec.** A Standings table layout spec (below). The overview of the page-scroll check already covers the page.

## Out of scope

- The three breakdowns (31d-ii), Race (31d-iii), Advanced standings (31d-iv) and Advanced Explained (31d-v). The 720px and 1100px table rules stay for them.
- Column groups or a stat chooser, row cards, sorting, or changing which statistics the table shows.
- The Head-to-head page's KPI strip (31l) and the Home strip.
- Any backend or API change: the short name comes from the existing teams list.
- A different `sm`, `lg` or `xl` break, and any new dependency.
- Adding the spec to Verify or CI.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (one review packet after all steps, no pause per step) and `workflow.checkpointCommits` is `disabled` (no step commits). `/complete` makes the single feature commit. Each step leaves the app working and ends with its Done when.

## Build steps

- [x] **1. KPI strip: two compact columns below `xl`.** `StandingsKpiStrip.jsx` (the modifier class and test id) and `index.css` (`.kpi-strip.kpi-strip-5` placed before the `lg` media rule, the compact stacked card below `sm`, the small row card restored from `sm`, the odd-last-card span, the five-across rule from `xl`, and `:not(.kpi-strip-5)` added to the shared `lg` rule).
  **Done when:** `cd frontend && npm run lint` and `npm run build` pass. In a browser on `/2026/standings` at 320, 390, 639, 640, 768, 1023, 1024, 1279, 1280 and 1440px no card name is cut mid-word; below 1280px the cards are two columns with no sideways scroll inside the strip and an odd last card spans both; from 1280px they are five across; below 640px each card shows a small crest above its text. The Head-to-head strip is unchanged: the same computed grid columns and overflow at 390 and 1280px as the committed code. The Race mode (which shows the same strip) renders it the same way.

- [x] **2. Pinned rank and team, and GP hidden below `sm`.** `StandingsTable.jsx` (a class on the table, a fixed first-column width, `hidden sm:table-cell` on the GP header and cells, the tier label wrapped so it can stay in view) and `index.css` (the sticky rules below `xl`, reset from `xl`; the tier label's sticky rule).
  The rank column is 4rem wide below `sm` and 5.5rem from `sm` (it holds the rank and the Q badge: finished seasons have eight Q clubs), and stat cells use 0.375rem side padding below `sm`.
  **Done when:** lint and build pass. In a browser on `/2026/standings`, for Overall and for Last 10, at 320, 390, 768 and 1024px: the first two cells of every row are `position: sticky`; after the table's scroller is scrolled 300px sideways the rank and team cells' left edges still equal the scroller's left edge and no stat cell shows through them; at rest the pinned columns plus wins, losses and percentage are visible without scrolling at 320px (this needs step 3's short names, so it was checked once both were built; measured on the live and the finished season); the GP column is hidden below 640px and shown from 640px; a tier header's label stays in view while scrolled. At 1280px and wider the first two cells are not sticky and the table's width and column count equal the committed code's (1,103px, 14 columns).

- [x] **3. Short team names below `sm`.** `StandingsPage.jsx` (the teams query and the map), `StandingsTable.jsx` (pass the short name through `OverviewTable`), `standingsCells.jsx` (`ClubCell` takes an optional short name, shows it below `sm`, keeps the full name as the link's accessible name).
  **Done when:** lint and build pass. In a browser on `/2026/standings`: below 640px every club shows its `abbreviatedName` (never longer than the full name, and shorter for at least one club), from 640px the full name; each club link's accessible name is the full club name at both widths; with the teams request blocked in the browser the table still renders with full names and no error banner; the breakdown views, Race and Advanced still show full names. The existing specs that mock the standings (`progressive-disclosure.spec.js`, `team-stats-null.spec.js`) still pass.

- [x] **4. Controls and footer fit at 320px.** Measure first; change only what clips. Candidates: the phase tab strip (four phases on a finished season, `/2025/standings`), the Table, Race and Advanced strip, the view tabs and the Breakdown select, the footer key and notes.
  Result: measured, nothing clipped, so nothing changed (the phase tabs wrap to a second row on a finished season).
  **Done when:** lint and build pass. On `/2026/standings` and `/2025/standings` at 320 and 390px every control is fully visible (no control extends past the viewport or is cut off, tab strips wrap instead of clipping) and the footer text wraps within the panel; the page does not scroll sideways.

- [x] **5. Standings table layout spec and regression pass.** `frontend/e2e/standings-table-layout.spec.js` covering the stable behaviour of steps 1 to 4 (the KPI strip columns and names, the pinned columns before and after a scroll, GP hidden below 640px, short names and accessible names, five across at 1280px), loading the page once per test and resizing through the widths; screenshots of the Table at 320, 390, 768 and 1280px for the review; a full lint, build and browser-suite run.
  **Done when:** `cd frontend && npx playwright test e2e/standings-table-layout.spec.js e2e/responsive.spec.js` passes; lint and build pass; the full `npm run test:browser` passes or any failure is explained and traced to this change; nothing outside the files listed below changed.

- [x] **6. Tighter rank column, four stats at rest, and a team column that collapses on scroll (requested after the first review).** On the live season the rank column was 4rem wide although nothing sits beside the rank (the Q badge only exists on a finished season), leaving about 30px of empty space between the rank and the crest, and the fourth stat (points for) was cut at rest. Changes, below `xl` where the table scrolls (the collapse in (c) only below `sm`): **(a)** below `sm` the rank column is 2.25rem and the Q badge no longer takes width: it sits over the top right corner of the rank circle (from `sm` it is inline as before); **(b)** the team column has an explicit width (7.125rem below `sm`, with a 1.375rem crest, a 0.375rem gap and 0.3125rem side padding; 18rem from `sm`) and the stat cells use 0.25rem side padding below `sm`, except the first stat column (wins) which keeps 0.625rem on its left so the number is not hard against the pinned edge, so wins, losses, percentage and points for are all visible at rest; **(c)** (replaced by step 7, which makes it follow the scroll position) a Sofascore-style collapse, below `sm` only: once the table is scrolled sideways more than 24px the team column animates down to the crest alone (2.25rem) and the team name fades out, so the stats get the room; it returns when the table is scrolled back to within 4px of the left edge (a 4px and 24px hysteresis so it cannot flicker). It is skipped from `sm` because the collapsed table would be narrower than its box, stop scrolling and flip back and forth, and when the table overflows by less than the 84px it would give up plus the 24px threshold (about 575 to 640px on the live season), for the same reason; sampled over time at nine widths from 320 to 639px on both seasons it never changed state by itself. The link keeps its full-name accessible name and stays focusable. A small `data-scrolled` attribute on the scrolling wrapper drives it; the rule is CSS only, with one scroll listener in `StandingsTable.jsx`.
  **Done when:** lint and build pass. In a browser on `/2026/standings` at 390px the headers W, L, PCT and PF are all fully visible at rest, and at 320px they are too (or PF is within 3px, in which case the rank column or padding is tightened until it fits); on `/2025/standings` (Q badges) at 390px the same four are visible and the Q badge is visible and not clipped. The space between the rank circle and the crest is under 12px below `sm`. After scrolling the table 40px sideways below `sm` the team column's width is at most 40px, the name is not visible, the crest and rank stay pinned, and more stat columns are visible than at rest; scrolling back to the left edge restores the name and the width. The link's accessible name is still the full club name while collapsed. From 1280px nothing is pinned or collapsed and the table's column widths match the baseline; from `sm` to `xl` the team column does not collapse. The wins value is at least 8px from the pinned edge, and no short name is split across lines (checked per word on four seasons at 320px; multi-word names wrap at the space). `standings-table-layout.spec.js` is updated for the new widths and the collapse and passes.

- [x] **7. Collapse follows the finger, crest only, slightly smaller numbers (requested after the second review).** The step 6 collapse switched on at a threshold and animated for 0.2s, so it snapped. Below `sm` the team column is now driven by the scroll position: the scrolling wrapper writes `--collapse` (0 to 1, the swipe distance over 36px) to its inline style from the scroll listener (no React state, so no re-render per scroll event), `--pin-team` is `7.625rem` minus `--collapse` times `5.375rem` (down to the 2.25rem crest), and the name's opacity and the "Team" header's colour follow `--collapse` (fully faded at about 60% of the way, so the name is gone before it is clipped). The name keeps its resting width (5.125rem) and is clipped by the narrowing cell rather than re-wrapping. There are no width or opacity transitions, and the `data-scrolled` attribute and its 4px and 24px hysteresis are gone. With a continuous collapse the table's overflow shrinks as the column does, so the scroll settles at a point where both agree instead of flipping (checked below). The collapsed end state is the crest alone, as before. The team column is 7.625rem at rest (one letter wider than the first version) so the longest names, such as Panathinaikos, stay on one line; checked per word on four seasons at 320, 360 and 390px. Stat numbers (headers and cells from the third column on) are 0.75rem (12px) below `sm` and 0.875rem from `sm` (14px before).
  **Done when:** lint and build pass. On `/2026/standings` and `/2025/standings` at 320, 390 and 500px the team width and name opacity move in steps with the scroll position (swept across the first 36px of the swipe), the crest stays inside the cell, more stat columns show as it collapses, scrolling back to 0 restores the name and width, and the scroll never oscillates. W, L, PCT and PF are still fully visible at rest at 320 and 390px and the wins value is at least 8px from the pinned edge; the stat cells are 12px below 640px and 14px from it. From `sm` nothing collapses. `standings-table-layout.spec.js` checks a partway state (narrower than at rest, opacity strictly between 0 and 1), the end state, the restore, and the stat font size, and passes; the full browser suite passes or any failure is explained.

## Files / areas

- `frontend/src/standings/StandingsKpiStrip.jsx`, `StandingsTable.jsx`, `StandingsPage.jsx`, `standingsCells.jsx`
- `frontend/src/index.css` (`.kpi-strip` modifier rules and the pinned-column rules; the breakdown tables' `max-width: 1100px` and `720px` rules are not touched)
- `frontend/e2e/standings-table-layout.spec.js` (new)
- Not changed: the backend, `frontend/src/lib/api.js`, `HeaderStats.jsx`, `CompactMetric.jsx`, the breakdown, Race and Advanced views, the Head-to-head page, and every other page.

## Data / contracts

- No API, database or persisted-data change. No new dependency. The teams list is `GET /seasons/:season/teams`, read as `{ teams: [{ clubCode, name, abbreviatedName, crestUrl }] }` through the existing `getSeasonTeams` and query key `["teams", seasonCode]` (the same cache the Teams page and the Compare pages use).
- Breakpoints: `sm` 40rem, `lg` 64rem, `xl` 80rem. The table is pinned below `xl` because it is 1,103px wide and scrolls up to about a 1200px viewport; the KPI strip is five across from `xl` because its names fit from about 1279px.
- Accessibility: the table stays a real `<table>`; hidden columns use `display: none`, so they leave the accessibility tree; each club link's accessible name is the full club name at every width; sticky cells keep their cell semantics and a visible fill so scrolled content never shows through.
- CSS order matters (unlayered CSS outranks Tailwind utilities, and equal specificity goes to the later rule): the modifier's base rule must sit before the `lg` media rule it overrides, as `.kpi-strip-4`'s does.

## Testing

- No unit test command exists. The new logic (which name shows, which columns hide) is covered through the browser spec.
- Browser tests are declared (`cd frontend && npm run test:browser`), so `standings-table-layout.spec.js` is added as proportionate coverage. It loads the page once per test and resizes through the widths, as the overview spec does, because the full suite is already heavy (some older specs time out under load; not changed here). They stay opt-in and are not part of Verify or CI (none is declared).
- Existing specs that touch the page: `responsive.spec.js` (page scroll and header gap, Standings already listed), `progressive-disclosure.spec.js` and `team-stats-null.spec.js` (mock the standings API; the new teams request must not break them), `urls-and-titles.spec.js`.
- What this will not prove: real swipe feel on a phone, Safari and iOS sticky behaviour, and visual polish. The screenshots from step 5 are the visual evidence and the user judges them.
- `/check` runs the full `npm run test:browser`.

## Notes for the AI

- Follow `coding-standards.md`: theme tokens, no blur, no commented-out code, no unused imports, comments only for the why, no em or en dashes anywhere.
- Reuse Home's compact KPI-card pattern (crest on top below `sm`) by grouping selectors where the values are the same; the tall photo values are Home's and must not be copied. Keep the shared `.kpi-strip` and `.kpi-strip-4` rules working exactly as they do for Home and Head-to-head.
- Keep desktop (1280px and wider) the same as today: compare computed styles and widths against the committed code (stash the edits, measure, restore) rather than screenshot bytes of tables or images, which are not byte-stable.
- A sticky second column needs the first column's width: give the first column a fixed width that fits the rank badge and the Q badge.
- Do not start 31d-ii work: the breakdown tables keep their own rules and full names.
- No Verify command is declared, so none was run while writing this spec.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":19929,"specSha256":"a76e04d29394ea69a455dd7cdf5274fae9382dd1f875649ae882839ff48698a8","branch":"refs/heads/feature/standings-table-and-kpi-strip-mobile-layout","head":"7d98b7b559b47fce1004deafa68d78689ddee07a","baseRef":"refs/heads/master","baseCommit":"7d98b7b559b47fce1004deafa68d78689ddee07a","sourceTree":"880106efd54676a3d82c8986fa84e90cb77d3e17","absentOptional":[]} -->
