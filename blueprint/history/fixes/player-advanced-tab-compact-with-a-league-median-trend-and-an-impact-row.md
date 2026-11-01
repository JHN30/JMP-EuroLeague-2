# Fix: Player Advanced tab compact, with a league median trend and an impact row

**Type:** Fix
**Status:** verified
**Branch:** fix/player-advanced-tab-compact-with-a-league-median-trend-and-an-impact-row

## The problem

The player page's Advanced tab (`players/PlayerAdvancedSection.jsx`) is 2,100px tall at 1440 for Isaac Bonga, and
some of what it has to say is buried:

- **Scorecard:** six tall cards in two rows of three, each ending in a paragraph explaining the stat. The same
  paragraphs are repeated in "How to read these numbers".
- **Round by round:** a 300px chart of one running rating with nothing to compare it to. You can't see whether the
  player is above or below the league.
- **On / off:** a full-width card with two big comparison bars (offensive and defensive rating). The on-court and
  off-court net ratings, and the points per 100 behind them, are in the data (`onNetRating`, `offNetRating`,
  `onPointsFor`…) but not shown.
- **RAPM:** another full-width section under it, with three long bars.

## The fix

### Compact scorecard

- **Each card keeps:**
  - its name, with the tip;
  - the verdict pill;
  - the value (`text-3xl`, was `text-4xl`);
  - the gauge with the 10th percentile, median and 90th percentile;
  - one line with the verdict, the rank and the league median;
  - the small-sample line for on/off.
- **The paragraph ("what it means") leaves the card.** It goes into the name's tooltip, after the full name (e.g.
  "Player efficiency rating: everything a player does…"). "How to read these numbers" keeps the full list as today.
- **Layout:** two cards per row from 640px, three per row from 1024px, and all six in one row from 1280px. Less
  padding (`p-3`).
- **Unchanged:** the "In short" line, the games and minutes line, and the reading guide.

### Trend with the league median

- **Shorter chart:** the round-by-round chart is about 190px tall (`h-48`), not 256px.
- **League median line:** a second, dashed series, "League median", at the chosen rating's current league median
  (`ranks[metric].spread.p50`, the same median the scorecard shows). The player's line now has a reference. With no
  median (no ranks), only the player's line is drawn.
- **Shared chart:** `TrendChart` gains an opt-in `heightClass` prop. Its other users (Compare, Season overview) keep
  `h-64`.
- **Note:** the note under the strip becomes "Running value through each round, never a single round. The dashed
  line is today's league median."

### On / off as a compact table

- **One card per club**, as today: the crest, the club name, the big net difference and its verdict pill, and the
  small-sample line. Under it:
  - **Minutes bar:** one bar split into his on-court and off-court minutes (e.g. "On 1,056 min · Off 484 min").
  - **Table:**

    | | On court | Off court | Difference |
    |---|---|---|---|
    | Offensive rating | 112.1 | 107.4 | +4.6 |
    | Defensive rating | 116.6 | 117.8 | −1.2 |
    | Net rating | −4.5 | −10.4 | +5.9 |

    The difference is green when it helps the team (higher offense, lower defense, higher net) and red when it hurts.
    Each rating's name has a tip (points scored or allowed per 100 possessions; net is the two together).
- **Removed:** the two `ComparisonRow` bars and the sentence repeating the differences.
- **Kept:** the note on what "off court" means.

### Impact row

- **One section, "Impact":** On / off and RAPM side by side from 1280px, stacked below. A player with two clubs keeps
  one on/off card per club in the left column.
- **RAPM:** same content, with tighter rows (`py-1.5`) and the scale under the bars. The rank and verdict move into
  its header line.

Must not change: the scope strip, the early-season note, the scorecard's verdict and gauge rules, the RAPM and on/off
sample minimums, the empty and error states, other tabs.

### Changes found during implement

- **Scorecard:**
  - Each tip reads "<full name>. <what it measures>".
  - The verdict line says "median" (not "league median") so it fits a sixth-of-a-row card.
  - The games line adds "Hover or tap a name for what it measures."
- **Trend replaced (from review).** The Chart.js line with a dashed median series looked generic and said little. It
  is replaced by `RoundChart`, an SVG line drawn for this tab:
  - **Four facts above it:** the value now, against the median (e.g. "−6.2, below it since R1"), the peak and the low.
  - **Shading:** green between the line and the dashed league median where the player is above it, red where below.
  - **Labels:** the median is labelled on its line, the latest value is called out, every round is on the axis
    (thinned past 12), and each dot has a tooltip.
  - **Scale:** a rating that never goes below zero keeps its scale at zero.
  - **Table:** the round-by-round table stays behind its toggle and gains an "Against the median" column.

  `TrendChart` is no longer used here, so it is unchanged: its `heightClass` prop was taken back out. The line fades
  in rather than drawing itself, because a drawn-in dash is measured in the stretched SVG's units and left gaps.
- **Impact layout (from review):**
  - On / off and RAPM are the same height from 1280px: the grid stretches both columns, the on/off cards share their
    column's height, and the RAPM panel grows.
  - RAPM gains an "Among the league" gauge (the scorecard's gauge, with rank, minimum minutes and median), which fills
    the space.
  - The on/off note sits under both columns.
  - Below 640px the on/off table's headings shorten to On / Off / Diff. so it fits the card.
- **Impact:**
  - The section is "Impact: The team with him on the floor". Its two halves have `h3` headings ("On / off", "RAPM",
    each with a tip) and `aria-label`s.
  - The on/off card's club name is now an `h4`.
  - RAPM's rank and verdict sit on the RAPM heading line.
- **Measured** (Bonga, 2025-26 page):

  | Width | Before | After |
  |---|---|---|
  | 1440px | 2,100px | 1,526px |
  | 390px | — | 3,095px, nothing sideways |

- **Tests:** `player-advanced-layout.spec.js`:
  - the cards step from 1 to 2, 3, then 6 per row (6 at 1280px), and the PER tip;
  - the trend chart:
    - its label against the league median, and the median's line label and facts;
    - redrawing for USG%;
    - fitting its panel with two facts per row below 640px and four from 640px;
  - the on/off table's values and colours (the mock gained `onNetRating` and `offNetRating`) and the minutes line;
  - On / off and RAPM side by side at 1280px and stacked at 1279px.

  After the review changes, the advanced, responsive and skeleton specs pass 172. Before them, the run with the
  compare specs passed 184; its only failure was the game-page box-score skeleton, which already fails on master.

## Build steps

- [x] 1. **Scorecard and trend.** Compact the cards (tip carries the meaning, `p-3`, `xl:grid-cols-6`). Add the
  League median series (built in review as the tab's own `RoundChart`, not through `TrendChart`).
  Done when: lint passes. At 1440px Bonga's six cards sit in one row, and the trend shows a dashed median line for
  PER, Win Shares, WS/40 and USG%.
- [x] 2. **Impact.** Rebuild on/off as the minutes bar and table, and put On/off and RAPM side by side. Update the
  Advanced skeleton.
  Done when: lint passes. Bonga's tab is noticeably shorter than 2,100px at 1440, and at 320px nothing scrolls
  sideways.
- [x] 3. **Browser checks.** Update `player-advanced-layout.spec.js`:
  - the six cards in one row at 1280px;
  - each card's tip;
  - the median series;
  - the on/off table values and difference colours;
  - Impact side by side from 1280px;
  - no sideways scroll at every width.

  Done when: that spec and `responsive.spec.js` pass against the local database.

## Verify

- `npm run build` (root) and `cd frontend && npm run lint` pass.
- The specs above, after `/api/health` reports `"target":"local"`.
- By hand, Bonga's Advanced tab at 1440px:
  - six cards in one row;
  - a dashed league median on the trend;
  - On/off with the table and minutes bar beside RAPM.
- At 390px everything stacks.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8109,"specSha256":"019e2973993ca68870e5945881382fe61285fd6fb1e9c29b9a1054707e313e68","branch":"refs/heads/fix/player-advanced-tab-compact-with-a-league-median-trend-and-an-impact-row","head":"21e201eb2bfd851579f589689f214f2200e147e6","baseRef":"refs/heads/master","baseCommit":"21e201eb2bfd851579f589689f214f2200e147e6","sourceTree":"53d15fd3a06472dc9d6f03c50581a58c38da1188","absentOptional":[]} -->
