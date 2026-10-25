# Fix: Records toolbar row

**Type:** Fix
**Status:** verified
**Branch:** fix/records-toolbar-row

## The problem

The Records detail view (`/:season/records?type=&metric=`) stacks up to four rows of choices under the header ([RecordsPage.jsx](../../frontend/src/records/RecordsPage.jsx), `RecordsDetail`):

1. Record type tabs (Player seasons, Player games, Team seasons, Team games).
2. Metric group tabs (Traditional, Advanced).
3. Metric tabs: up to 14 from sm. Below sm they become a `ViewSelect`.
4. Totals / Per game (`ModeTabs` from sm, `ModeSelect` below sm).

The page reads as long stripes. Rows 2 and 3 describe one choice (the metric) split across two controls.

## The fix

**Record type:** row 1 stays as it is, a level-1 `TabStrip` controlling the records panel.

**Rows 2 to 4 become one toolbar row**, `flex flex-wrap items-end gap-3`, at every width:
- **Metric dropdown.** One native `<select>` labelled "Metric", with every metric of the record type in two `<optgroup>`s, "Traditional" and "Advanced", in the catalogue order of `recordData.js`.
  - It reuses `ViewSelect` through a new opt-in `groups` prop (`[{ label, options }]`). Without `groups`, `ViewSelect` renders exactly as today, so the Standings pages are unaffected.
  - Full width below sm, `sm:w-72` from sm.
- **Totals / Per game toggle.** A `role="group"` labelled "Totals or per game", containing two buttons, "Totals" and "Per game". The active one is `aria-pressed="true"` and styled `btn-primary`, the other `btn-outline`, matching the game page's playback buttons.
  - Shown only when `perGameAvailable(family, group)` is true. The group comes from the chosen metric.
  - A small "Show" label sits above it so it lines up with the select's label.
- On a phone the toggle wraps under the select. There is no sideways scroll at 320px.

**Removed from Records only:** the group `TabStrip`, the metric `TabStrip`, the phone-only metric select, and the `ModeTabs`/`ModeSelect` pair. Leaders keeps `ModeTabs`/`ModeSelect` unchanged.

**Choosing a metric** can now cross groups. `chooseMetric` applies the existing `keepPer` rule for the new metric's group, so `per=game` leaves the address when the new metric has no per-game form (an Advanced metric). `chooseGroup` is no longer needed.

**Must not change:**
- The address contract: `type` and `metric` are always written, `per=game` only when chosen. Old links keep opening the same view.
- The record book landing and its "Record book" back link.
- The podium, the timeline, the Top 50, the notes (minimum games, "Lower is better.", "Also needs…"), the loading and error states.
- No backend change.

## Build steps

- [x] **1. The toolbar row.**
  - Add the opt-in `groups` prop to `ViewSelect`.
  - In `RecordsDetail`, replace rows 2 to 4 with the toolbar: the grouped metric select and the per-game toggle.
  - Update `chooseMetric` to apply `keepPer`, remove `chooseGroup`, and drop the unused `GROUPS`, `metricsOf`, `ModeTabs` and `ModeSelect` imports where they become unused.
  - **Done when:** at 1280 and 390px the detail view shows the record-type tabs and one toolbar row (one row at 1280, wrapping at 390).
    - Picking an Advanced metric from the select opens it and drops `per=game`.
    - The toggle switches totals and per game and hides for Advanced metrics.
    - `cd frontend && npm run lint` and `npm run build` pass.
- [x] **2. Update the records specs.**
  - In `records.spec.js`:
    - Read metrics from the select's `<optgroup>`s instead of the "Record metric" tablist. The catalogue tests check each group's option labels and order.
    - Choose metrics with `selectOption`.
    - Find the per-game choice by the "Totals or per game" group and its buttons' `aria-pressed`.
    - Add a check that an Advanced metric drops `per=game` from the address.
  - In `records-layout.spec.js`:
    - The "Metric" combobox exists at every width.
    - No "Metric group" or "Record metric" tablist remains.
    - The toolbar fits every width without sideways scroll.
  - `responsive.spec.js` needs no change. It still covers the detail address.
  - **Done when:** `cd frontend && npx playwright test records.spec.js records-layout.spec.js records-api.spec.js responsive.spec.js` passes on the local DB.

## Verify

- `/api/health` reports `"target":"local"`.
- Run `cd frontend && npm run lint`, `npm run build`, and `cd backend && npm run build`.
- Run `cd frontend && npx playwright test records.spec.js records-layout.spec.js records-api.spec.js responsive.spec.js`.
- **Manual check:** open Records, then any card in the record book.
  - Under the four record-type tabs there is one row: the Metric dropdown (Traditional and Advanced sections) and Totals / Per game.
  - Pick Per game, then an Advanced metric: the toggle disappears and the address loses `per=game`.
  - On a phone the toggle wraps under the dropdown.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4878,"specSha256":"5a0aa896077f1e9d704f83fc7d1a37d5b6bcd4888299239d047fca7e236f9df8","branch":"refs/heads/fix/records-toolbar-row","head":"9e8e128579c1bada450cf59fe73bc771695c730f","baseRef":"refs/heads/master","baseCommit":"9e8e128579c1bada450cf59fe73bc771695c730f","sourceTree":"ba0ed91cee9197f540e3350e6600714899af8180","absentOptional":[]} -->
