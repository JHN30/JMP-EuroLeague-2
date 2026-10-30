# Fix: Compact game page on desktop

**Type:** Fix
**Status:** verified
**Branch:** fix/compact-game-page-on-desktop

## The problem

On a desktop screen the game page (`/:season/games/:gameCode`) shows little at once. Its tabs stack full-width sections
with large gaps, two-line headings and some repeated content, so most of the screen is spacing and a lot of scrolling is
needed.

- **Header (every tab):** `MatchupHeader.jsx` has 80px crests, then a separate strip below for Arena, Attendance and
  Officials, with `mb-6` under the card. The wide space on either side of the crests stays empty.
- **Overview:** five full-width sections stacked: Score by period, Standouts, Game leaders, Key stats and Score flow.
  Standouts and Game leaders are two pairs of cards for the same two teams.
- **Game flow:** "Turning points" repeats the metric cards above it. Each team's peak lead is its "biggest lead" card,
  and the best runs are the "longest run" card split by team.
- **Rotations:** both minutes timelines and both five-man unit tables are stacked full width. The unit tables have only
  6 number columns, so most of each row is empty.
- **Team comparison:** Head to head is stretched (`flex-1` and per-group `flexGrow`) to match the very tall Four Factors
  panel, so its rows are spread out with empty space between them. Scoring profile sits in another full-width section
  below.
- **Play-by-play:** each event is two lines on desktop (the name and badge, then the detail), with `sm:py-2` padding.

## The fix

These are layout changes only. They take effect from `lg` (1024px) up, except where noted. Below `lg`, layouts, the
order of content and every existing phone behaviour stay as they are. Box score and Shooting are not changed, apart
from sharing the new header. No data, query or API changes.

Shared components follow the "current page only" rule: a change to a component outside `games/` is an opt-in prop
that only the game page passes.

1. **Section headings: `PanelHeader` gets an opt-in `compact` prop.** The kicker sits inline before the title on one
   line, in its eyebrow style, and the bottom margin is smaller.
   - The heading element and its text stay the same, so `getByRole("heading", { name })` still finds it.
   - Used on the Overview, Game flow, Rotations and Team comparison tabs.
   - The gaps between sections on those tabs go from `gap-6` to `lg:gap-4`.
2. **Header: a tighter fact strip** (revised in review; the facts at the outer edges were dropped).
   - Arena, Attendance and Officials stay in the strip under the date, with less space above and inside it (`mt-3 pt-3`,
     smaller gaps).
   - Below `sm` the strip takes two columns in smaller type: Arena beside Attendance, Officials across the width. An
     arena without a crowd figure takes the whole row.
   - The arena's capacity is shown only when there is no attendance figure.
   - Crests go from 80px to 64px from `lg`. The space under the card stays `mb-6`: every page header sits 24px above its
     content (`responsive.spec.js`), so the game page keeps that rule.
3. **Overview.**
   - **One card per team:** the best player at the top, with the game leaders listed under them. The existing
     `article "<team> best player"` and `group "<team> game leaders"` roles and labels stay inside the card.
   - **Leaders** (revised in review): points, rebounds, assists, steals and blocks at every width; from `lg`, where the
     card stands as tall as the key stats beside it, also +/-, PIR and TS% (in that order). TS% is true shooting from the
     box score, points ÷ (2 × (field goal attempts + 0.44 × free throw attempts)), for players with at least 5 field goal
     attempts; its label has a hover tip explaining it.
   - **Line score** (revised in review): from `lg` its panel stretches to the score flow's height, the rows sharing it.
   - **+/- leader** (revised in review): always the team's best +/- among players who played, even when it is 0 or
     negative.
   - **From `lg`:**
     - **Top row:** Score by period on the left, Score flow on the right.
     - **Second row, three columns:** the home team card, Key stats (heading "How the teams compared") in the middle,
       the road team card.
   - **Below `lg`:**
     - **Order:** Score by period, the two team cards (side by side from `sm`), Key stats, then Score flow.
   - **Rules kept:** the best player and leader rules, loading states and error states are unchanged.
3a. **Line score, on the Overview and Game flow** (added in review).
   - Each team's crest beside its name from 360px (below it, three-digit scores over four periods need the room).
   - At every width, the side that won a period has its score in bold; the winner's total is bold in the theme's first
     colour; a tied period is bold on neither side.
   - From `lg` the scores and names are larger (scores `text-lg`, names `text-base`).
4. **Game flow.**
   - Remove "Turning points".
   - The metric row becomes five compact tiles: lead changes (with ties), each team's biggest lead (with its moment)
     and each team's best run (with its moment). From `lg` they sit in one row. Each team tile has the team's crest before
     its label and names the team by its short name at every width (added in review).
   - Then the lead tracker, then the period table, as now.
5. **Team comparison.**
   - The left column holds Head to head and then Scoring profile under it. The right column holds Four Factors.
   - Head to head is no longer stretched: drop its `flex-1` and its per-group `flexGrow`. Four Factors keeps its own
     height too (`lg:self-start`), so neither panel spreads its rows; on a typical game the right column ends about 300px
     above the left one.
   - Scoring profile becomes a single column of rows with one team header. It is used only on this tab.
   - Below `lg` the order is unchanged: Head to head, Four Factors, Scoring profile.
   - **Every team stat** (added in review):
     - Head to head adds each team's coach under its name and these rows:
       - Field goals (all shots);
       - Starters' points;
       - Team turnovers, from the box score's team line.
     - Removed in review as confusing: points from 2s, 3s and free throws, possible points scored, team rebounds,
       rebound share, and the existing PIR row. The last group becomes "Fouls".
     - Four Factors adds:
       - Possessions and each team's own possessions estimate;
       - Steal %: steals per 100 game possessions;
       - Block %: blocks over the opponent's two-point attempts.
     - Scoring profile adds Time tied and Clutch time.
     - Rows that are the same for both teams, or have no better side, highlight neither. Every row built from other
       numbers has a tip.
6. **Rotations.**
   - The five-man unit tables sit side by side from `lg`, like Assist connections. The minimum-minutes filter and the
     small-sample note stay above and below them.
   - The two minutes timelines sit side by side from `xl` (1280px). The name column narrows a little there so the bars
     keep most of the width.
6a. **Shooting** (added in review; Box score stays untouched).
   - **Court headers:** FT and Paint pts join 2PT, 3PT and eFG%. The header is five columns from `lg` and 3 + 2 below.
     - FT comes from the box score: the team's, or the chosen player's. A tip says the period, shot and play-context
       filters don't apply to it.
     - Paint pts follows the filters.
   - **Player filter:** one list per team, home first, labelled with the team's TV code ("CZV player", "BAY player").
     Each list narrows only its own team's court, zone comparison rows, tables and FT. Shot type, Period, Result and Play
     context still apply to both teams.
   - **Filter row:** the selects fill the row. From `lg` the home list opens it and the away list closes it, with the
     shared filters between. The shot map has six (3 per row at `lg`, all 6 from `xl`); the zones have four (one row).
     Phones show the two player lists first, side by side.
     The filters are their own box between the view tabs and the courts, a sibling of everything they filter. From
     `xl` it sticks under the nav, so the zones and the tables can be refiltered without scrolling back up; a name in
     the player table scrolls the courts in below it. Below `xl` it scrolls with the page, and below `sm` it stays
     the Filters button.
   - **Zone comparison:**
     - Grouped into Paint, Mid-range and Threes (Backcourt with the threes), each closed by its subtotal.
     - Zones neither team shot from are left out, and so is a group with no shots. "Location unknown" shows only when
       there are such shots.
     - The higher FG% is shaded only when both sides have at least 3 attempts.
   - **Three new tables under the zones.** Each follows the filters except its own dimension, and never the Result
     filter.
     - Shooting by quarter: each team's FG% (made-attempted) and 3PT per period. The higher FG% is shaded, from 3
       attempts a side.
     - Fast breaks, second chances and turnovers: each team's baskets and points per context. The more points are
       shaded. There is no FG% because the feed tags only made baskets with their context.
     - Each player's shooting: per team, FG, FG%, 3PT, eFG% and the zone with the most makes (from `md`). A name picks
       that player in their team's list and scrolls the courts into view; choosing it again shows the whole team.
7. **Play-by-play from `lg`.**
   - Each event is one line: name, badge, then the detail, truncated, with its full text in a `title`.
   - Rows get tighter vertical padding.
   - Below `lg` rows are unchanged, including the two-line phone layout and wrapping instead of cutting.

Must not break:
- every phone and tablet layout, and the `responsive.spec.js` checks;
- the seven tabs and an unplayed game showing only the Overview;
- each section's own loading, error and retry states;
- best player and leader selection, highlights and lower-is-better marks;
- the Box score and Shooting tabs;
- both themes.

## Build steps

- [x] 1. **Compact headings and header.** Add the `PanelHeader` `compact` prop and the `lg` header layout.
  Done when, at 1280×800, the header has no strip under it, the facts sit at the two edges, and it is shorter than
  on `master`; at 375px it matches `master`. Measured: header 283 → 182px at 1280; 364 → 364px at 375.
- [x] 2. **Overview.** Team cards and the two-row desktop layout.
  Done when, at 1280×800, Score by period and Score flow share a row; the team cards and Key stats share a row; and
  the tab is clearly shorter than on `master`. Measured: 2287 → 1334px at 1280.
- [x] 3. **Game flow.** Five compact tiles and no Turning points.
  Done when every number that was in Turning points is still on the tab, and the tab is one section shorter.
  Measured: 1535 → 1202px at 1280.
- [x] 4. **Team comparison.** Scoring profile under Head to head, with no stretching.
  Done when, at 1280×800, nothing is below the two columns and neither panel spreads its rows. Measured: 2396 → 2117px.
- [x] 5. **Rotations.** Unit tables side by side from `lg`, timelines side by side from `xl`.
  Done when, at 1280×800, each team's timeline bars are still at least 300px wide and the tab is shorter than on
  `master`. Measured: bars 337px; 2882 → 2368px.
- [x] 6. **Play-by-play.** One-line rows from `lg`.
  Done when, at 1280×800, more events fit on screen than on `master`, and phone rows are unchanged. Measured: 4208 →
  2667px for 60 events; phone unchanged.
- [x] 7. **Browser tests.** Update the specs that check the changed structure:
  - the `Turning points` heading in `game-flow-layout.spec.js`;
  - the header facts in `game-detail-layout.spec.js` and `game-overview.spec.js`;
  - the Head to head stretching and column checks in `game-four-factors.spec.js` and `game-flow-layout.spec.js`;
  - anything else the run shows.

  Add one desktop check per tab for the new side-by-side layout.
  Done when the game specs and `responsive.spec.js` pass on the local DB. Result: 277 passed.

- [x] 8. **Review changes.** The header strip back under the date, tighter, with two columns on a phone and no capacity
  beside a crowd figure; the line score as tall as the score flow; five leaders on a phone and eight from `lg`.
  Done when the header strip is back and shorter than on `master` at 1280 and 375, the line score and score flow panels
  match in height at 1280, and the leader rows are 5 at 390px and 8 at 1280px, each covered by a browser test.
  Measured: header 283 → 243px at 1280 and 364 → 250px at 375; both top-row panels 268px.

- [x] 9. **Line score and +/- review changes.** Crests in the line score, the winner of each period in bold, larger numbers
  from `lg`, and the +/- leader named even when negative.
  Done when the line score holds a four-period game without scrolling at 320px, bold cells follow the higher score in
  each column, and a team whose players are all negative still names its best +/-, each covered by a browser test.

- [x] 10. **TS% leader.** TS% replaces 3-pointers and goes last, after +/- and PIR, with a hover tip and a 5-attempt minimum.
  Done when the desktop leader rows read Points, Rebounds, Assists, Steals, Blocks, +/-, PIR, TS%, a 2-of-2 shooter is
  skipped, and the tip opens on hover, each covered by a browser test.

- [x] 11. **Crests on the Game flow tiles.** Each team tile shows its crest before the label. The label names the team by
  its TV code (else its abbreviated name) at every width, with the full name for screen readers, so labels fit one line
  from 1280px; between 1024 and 1280px each label keeps two lines' height so the values line up.
  Done when the crests show, and the five values share one line at 1024, 1100, 1280 and 1920px with one-line labels
  from 1280px, covered by a browser test.

- [x] 12. **Every team stat on Team comparison.** The missing box-score, advanced and score-flow team stats, plus four rates
  calculated from them, as listed under Team comparison.
  Done when each new row shows the fixture's values (or a dash when the data is missing), the coaches are named, and the
  Team comparison specs pass.

- [x] 13. **Fewer Head to head rows.** Remove points by shot type, possible points scored, team rebounds, rebound share and
  PIR.
  Done when those rows are gone and the Team comparison specs pass.

- [x] 14. **Shooting improvements.** Court header FT and paint points, one independent player list per team at the ends of a filled
  filter row that sticks under the nav from `xl`, the grouped zone table
  with subtotals and the 3-attempt highlight, and the quarter, play-context and player tables.
  Done when each is covered by a browser test, the tables fit a 320px screen without page overflow, and the Shooting specs
  pass.

## Verify

- Run `cd frontend && npm run lint` and `npm run build`.
- **Browser tests:** confirm `/api/health` reports `"target":"local"` first. Then run
  `cd frontend && npx playwright test game-overview.spec.js game-detail-layout.spec.js game-matchup-header.spec.js
  game-flow-layout.spec.js game-four-factors.spec.js game-scoring-profile.spec.js game-rotations.spec.js
  game-rotations-layout.spec.js game-lineups.spec.js game-play-by-play.spec.js game-play-by-play-layout.spec.js
  game-box-score.spec.js game-box-score-layout.spec.js game-shooting.spec.js game-shooting-layout.spec.js responsive.spec.js`.
- **Screenshots:** take before and after shots of each tab on one played game at 1280×800 and 1920×1080, plus 375px
  for the changed tabs. Record each tab's page height before and after.
- **By hand:** check both themes, an overtime game, and an unplayed game.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":15965,"specSha256":"c18d806b4eab385a1cb325dcc0e34936844c37bfaf3e0687956a8c3d0788283f","branch":"refs/heads/fix/compact-game-page-on-desktop","head":"e38410b1ada2bf77d975c9cfb8cf7fa4425c5f66","baseRef":"refs/heads/master","baseCommit":"e38410b1ada2bf77d975c9cfb8cf7fa4425c5f66","sourceTree":"572623372d1435047ba1e36dd708850cbe53858a","absentOptional":[]} -->
