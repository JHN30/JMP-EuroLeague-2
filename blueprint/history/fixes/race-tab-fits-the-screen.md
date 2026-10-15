# Fix: Race tab fits the screen

**Type:** Fix
**Status:** verified
**Branch:** fix/race-tab-fits-the-screen

## The problem

On the Standings page's Race tab the chart gives every position a fixed 50px row (`MIN_HEIGHT` and `HEIGHT_PER_ROW` in
`frontend/src/standings/RaceChart.jsx`), so its height is `(teams + 1) * 50 + 32`: about 980px for 18 teams and 1080px for
20, whatever the screen. On a laptop the window below the 5.5rem sticky nav is roughly 560-660px, so only 11-12 teams
show. The Play button, slider and round badge (`RacePlayback.jsx`) sit above the chart, so while the race plays the user
scrolls down to follow a team and loses the controls, then scrolls back up to pause or replay. The snapshot table beside
the chart (`RaceSnapshotTable.jsx`) has the same problem with roughly 40px rows. Phones use 30px rows and scroll the
chart sideways, which still runs past the bottom of a phone held sideways.

## The fix

Size the race from the screen instead of from a fixed row height, and keep the controls in view. All changes stay in
`RaceView.jsx`, `RaceChart.jsx`, `RacePlayback.jsx`, `RaceSnapshotTable.jsx`, plus Race-only rules in `index.css`. No
shared component, other page, or the Postseason page's `RacePanel` changes.

- **Row height from the viewport.** `RaceView` works out one row height and passes it to the chart and the table:
  (window height - app nav height - sticky playback bar height - the chart box's padding and axis margins) / (teams + 1),
  clamped to 24-50px from sm and 24-30px below sm (today's phone row stays the ceiling there). It updates when the window
  or the bar resizes. Crest radius scales with the row (today's 19px at 50px, 12px at 30px); line widths stay. A screen
  tall enough for 50px rows looks exactly as it does now.
- **Sticky playback bar.** Play/Pause, the slider, the start/end labels, the round badge and the Team focus select (moved
  out of `RaceChart` into the bar) form one bar that sticks just below the app nav (`top: var(--app-nav-height)`), with an
  opaque background. It sticks only on screens at least 30rem tall; on a shorter screen (a phone held sideways) a sticky
  bar would cover a third of the view, so it scrolls normally there and step 5 covers following the team. In a grouped
  season each group's bar sticks inside its own section, so only the bar of the group in view is pinned.
  `CompetitionContext` stays out of the bar.
- **Play frames the chart.** Pressing Play (or Replay) scrolls the page once so the chart box's top lands just below the
  sticky bar. Later rounds do not scroll the page. Reduced motion already hides the Play button, so no change there.
- **Table rows match the chart lanes (lg and up).** Where the table sits beside the chart, its rows take the chart's row
  height (compact cell padding, smaller crests, the short names it already swaps in at lg-xl), and the space above the
  first row matches the chart's space above lane 1, so each team's table row sits level with its lane. Below lg the table
  is under the chart and keeps its current look.
- **Follow the focused team where the chart still cannot fit.** When rows are at the 24px floor and the chart is still
  taller than the room under the bar (a phone held sideways, a very short window), and a team is focused, each change of
  the shown round checks the focused crest; if it has left the visible area, the page scrolls by the smallest amount that
  brings it back (smooth, or instant with reduced motion). With no focused team, or with a chart that fits, nothing
  scrolls.

Must not break: the phone chart's sideways scroll and its follow of the shown round, the fixed position strip on phones,
the turn-your-phone hint, chart and table focus clicks, tier bands and tints, the slider's accessible name, and the
existing layout guarantees in `standings-race-layout.spec.js` (no page overflow on phones, the table fitting its box).

## Build steps

1. [x] **Fit the chart to the viewport.** Compute the row height in `RaceView` as above and use it in `RaceChart` for the
   chart height, `y()` and the crest radius, replacing the fixed `MIN_HEIGHT` / `HEIGHT_PER_ROW` and `NARROW.minHeight` /
   `NARROW.heightPerRow`.
   - Done when: at 1366x768 and 1440x900 the whole chart, from position 1 to the round labels, is visible without
     scrolling once its top is at the bar; at 1920x1200 the chart is unchanged (50px rows); at 390x844 rows stay at most
     30px and the chart still scrolls sideways; lint and build pass.
2. [x] **Make the playback bar sticky.** Move the Team focus select into the bar and pin the bar below the app nav on
   screens at least 30rem tall.
   - Done when: after scrolling to the bottom of the chart at 1366x768 the Play button, slider and round badge are still
     visible and usable, and the bar does not overlap the nav; at 600x320 the bar scrolls with the page; a grouped season
     pins only the bar of the group in view; the phone layout checks show no page overflow.
3. [x] **Play scrolls the chart into view once.** Pressing Play or Replay brings the chart's top to just below the sticky bar.
   - Done when: pressing Play while scrolled to the insight cards brings the chart into view, and the page does not move
     again during that run unless the user scrolls.
4. [x] **Line the table up with the chart (lg and up).** Table rows use the chart's row height and line up with its lanes.
   - Done when: at 1024, 1280 and 1440 wide, each table row's vertical centre is within 4px of its team's lane centre at
     the round shown, the table still fits its box, and below lg the table looks as before.
5. [x] **Follow the focused team where the chart cannot fit.** Scroll just enough to keep the focused crest visible when rows
   are at the floor and the chart overflows.
   - Done when: at 600x320 with a team focused near the bottom, playing the race keeps its crest on screen; with no team
     focused, or at 1366x768 where the chart fits, playing never scrolls the page.

## Built differently from the plan

- **Insight cards keep their height.** At the season start the four cards lost their crest and detail line and shrank by
  42px, then grew back at round 1, so every replay moved the chart after Play had framed it. The cards now reserve both
  (`RaceInsightCards.jsx`).
- **The turn-your-phone hint moved above the playback bar.** Between the bar and the chart it was not counted in the sizing
  and cut off the round labels on an upright phone; it is read before pressing Play anyway.
- **Snapshot table at xl.** At 1280px the W-L record wrapped onto two lines (it already did before this fix, hidden by the
  tall rows), so it now stays on one line and the table uses the tight cell padding from lg up, not only lg to xl.
- **Abbreviated names beside the chart.** On owner review, the table shows each club's abbreviated name (then its TV
  code) at every width from lg, so no name is cut off. Phones keep the TV code first; the map is a second, Race-only prop
  from `StandingsPage`, so the other standings tables are unchanged.
- **The chart's top margin grows beside the table** (from 4px to 44px minus half a row) so lanes line up with the table's
  57px head. At 1920x1200 a 20-team season gets 46.6px rows, not 50; an 18-team season still gets 50.
- **Following a focused team** also scrolls once when a team is picked while the chart cannot fit, not only on a new round.

## Verify

- Run `npm run dev`, open Standings, Race tab, on a laptop screen: the whole chart fits, the controls stay visible while
  scrolling, Play frames the chart, and table rows line up with the lanes. Repeat on a phone upright and sideways (or
  DevTools device mode), focusing a team near the bottom and pressing Play.
- Check a grouped season (two race charts on the page) and a season with play-in tiers.
- `cd frontend && npm run lint` and `npm run build` (root) pass.
- Browser tests, with `/api/health` reporting `"target":"local"`:
  `cd frontend && npx playwright test standings-race-layout.spec.js responsive.spec.js`. The chart-height assertion in
  `standings-race-layout.spec.js` (`height > 900` from 768px wide) changes to "the chart fits the room under the bar"
  at a laptop-sized viewport, and new checks cover the sticky bar and the table/lane alignment.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8293,"specSha256":"d4ec730e7d1c064677bc4bc6b7291af28aca1e8e724f5887d1a3f929112cde1d","branch":"refs/heads/fix/race-tab-fits-the-screen","head":"5f60c90959aad13441cfb3fab3a7febf226afdee","baseRef":"refs/heads/master","baseCommit":"5f60c90959aad13441cfb3fab3a7febf226afdee","sourceTree":"9739c864b09929f51ee5d60ac101f9a12fac0358","absentOptional":[]} -->
