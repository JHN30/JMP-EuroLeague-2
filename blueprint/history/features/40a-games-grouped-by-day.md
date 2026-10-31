# Feature: Games grouped by day

**From build-plan:** feature 40a
**Build attempt:** 1
**Type:** Feature
**Status:** verified
**Branch:** feature/games-grouped-by-day

## Goal

On `/:season/games`, the games of the selected round (or `E2000` knockout stage) appear under one header per
calendar day, such as "Thursday 30 October", in tip-off order, instead of one flat grid. Games without a date go
last under "Date to be confirmed". Frontend only.

## In scope

- Day grouping in `FixturesPage` for every phase, round and stage the page already shows, after the group filter
  is applied, so a day with no game in the chosen group is not shown.
- One header per day: the long weekday, day and month in the viewer's locale and time zone, the same ones
  `formatShortDate`/`formatTimeOfDay` already use for the cards. The day a game belongs to is its local date in that
  time zone, so a header never disagrees with the date on its cards. The header also shows how many games are on that
  day (such as "3 games"; "1 game").
- Games keep the API's order (`scheduledAt` ascending, missing dates last). Days follow the order of their first game.
- Games with no `scheduledAt` go under one "Date to be confirmed" header at the end.
- Day headers are real headings (`h2`, since the page title is the only `h1` and the page has no other `h2`), so
  screen readers can move between days.
- Every day's grid keeps today's card grid: one column below the `fixture-box` container's 40rem, two from it.
- The "The record under each club is …" note stays once, above the first day.
- The card entrance animation still staggers in when the round, stage, phase or group changes.
- `FixturesSkeleton` gains a day-header bar above its cards so the loading layout matches.
- Checked for a modern season, a grouped season (`E2013`), the cancelled `E2019` and the `E2000` stage view, at 320,
  390, 768 and 1024px.

## Out of scope

- Any change to `GameCard` (40b, 40c), the API, the round strip, the phase or stage tabs, the group filter, or URL
  parameters.
- A day picker, a calendar view, or "today" or "live" markers.
- Changing the date text on the cards.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then one review packet for the whole feature.
`workflow.checkpointCommits` is `disabled`: no step commits; `/complete` makes the one feature commit.

## Build steps

- [x] 1. **Day helpers in the shared formatting module.** Add `localDayKey(scheduledAt)` (the local `YYYY-MM-DD`,
  or `null` without a date) and `formatDayHeading(scheduledAt)` (long weekday, numeric day and long month via
  `toLocaleDateString(undefined, …)`, as the other formatters do) to `frontend/src/lib/format.js`.
  Done when: both are exported, `formatDayHeading` gives the same calendar day as `formatShortDate` for the same
  value, and `cd frontend && npm run lint` passes.
- [x] 2. **Group the round's games by day.** In `frontend/src/games/FixturesPage.jsx`, build the day list from the
  filtered `games` (keeping their order; undated games in a final "Date to be confirmed" group) and render each day as a
  section: an `h2` header with the day and its game count, then its own `fixture-grid` of `GameCard`s. Keep the record
  note above the first day, and keep the stagger animation keyed on phase and round or stage, as now. Add the day header
  style beside the `.fixture-grid` rules in `frontend/src/index.css`, using the existing micro-label or panel-heading
  type, with a smaller gap below `sm`.
  Done when: in the running app a modern round with games on several days shows them under ordered day headers, a
  single-day round shows one header, choosing a group drops days without that group's games, the `E2000` stage view and
  `E2019` show day headers, and nothing overflows sideways at 320px.
- [x] 3. **Skeleton and browser checks.** Add a day-header bar to `FixturesSkeleton` in
  `frontend/src/games/GamesSkeleton.jsx`. In `frontend/e2e/games-layout.spec.js`, assert that every `.fixture-card`
  sits under a day header, that headers appear in date order with the right game counts, and that the existing width,
  column and overflow checks still pass with the headers in place.
  Done when: `cd frontend && npx playwright test games-layout.spec.js` passes against the local database (the page's own
  spec only).

## Files / areas

- `frontend/src/lib/format.js` - the two day helpers.
- `frontend/src/games/FixturesPage.jsx` - grouping and rendering.
- `frontend/src/games/GamesSkeleton.jsx` - the skeleton's day-header bar.
- `frontend/src/index.css` - the day header and section spacing, next to `.fixture-box`/`.fixture-grid`.
- `frontend/e2e/games-layout.spec.js` - the day-header checks.

## Data / contracts

- No API change. Uses the games already returned by `GET /seasons/:seasonCode/games` (`scheduledAt` is an ISO
  timestamp or `null`; the API orders by `scheduledAt` ascending, nulls last).
- Day membership is computed in the browser in the viewer's own time zone, so two viewers in different zones can see a
  late game on different days. This matches the cards' dates today.

## Testing

- No unit test command exists; the helpers are checked through the browser specs and lint.
- Browser tests: `games-layout.spec.js` (the page's own spec), run only after `/api/health` reports `"target":"local"`.
- `npm run build` (root) and `cd frontend && npm run lint` must pass.

## Notes for the AI

- Keep each day's grid a direct `.fixture-grid` inside `.fixture-box` so the container query and the layout spec's
  one-column check still hold.
- Missing dates come from the data, not a fallback; never invent a day.
- Do not add a dependency for dates.
- Keep the changes to the Games page; the shared format helpers are new exports and change no other page.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5883,"specSha256":"6d4283bb8c63e3e1641eebc9381385fe180387644e2cce8b7864d75cac542f84","branch":"refs/heads/feature/games-grouped-by-day","head":"d2ce992cbf2cb58ed9e55eda66756ef31798aed6","baseRef":"refs/heads/master","baseCommit":"d2ce992cbf2cb58ed9e55eda66756ef31798aed6","sourceTree":"9e608c4a65f33633fb8b2f8f9d9ccae09a1500b6","absentOptional":[]} -->
