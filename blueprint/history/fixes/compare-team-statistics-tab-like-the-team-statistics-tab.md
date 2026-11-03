# Fix: Compare team Statistics tab like the team Statistics tab

**Type:** Fix
**Status:** verified
**Branch:** fix/compare-team-statistics-tab-like-the-team-statistics-tab

## The problem

A team comparison's Statistics tab (`comparisons/CompareTeamStats.jsx`) is one long column. For example, Real Madrid
vs Panathinaikos (`/2026/compare?teamA=MAD&teamB=PAN&game=91`, Statistics) is 3,377px tall at 1440 and 3,407px at
390.

- There are 33 stats, each a full-width `ComparisonRow`: a label line over two 650px bars, about 75px per row.
- The panel opens with a large crest-and-name strip that repeats the page header right above it.
- The better side is shown by a tinted cell, but there is no total of who leads on how many.

The team page's Statistics tab (`teams/TeamStatisticsSection.jsx`) does the same job compactly. Each stat is one
aligned table row: the name, the rank, the club's number and bar, then the opponents' bar and number. The groups sit
in two columns from `xl`. The comparison should read the same way, with club B in place of the opponents.

## The fix

This is a frontend change only, in `comparisons/`. It keeps the same data (`useTeamRows`), the same 7 families (Efficiency, Record, Scoring, Shooting, Rebounding, Playmaking, Defense), and the same ranks
(`placeOn`). That is the traditional and advanced numbers together. There are no API or address changes.

1. **One aligned row per stat.**
   - Every row and group header share one grid, so the columns line up down the tab. From `sm` the columns are:

     | stat name | A's rank | A's value | A's bar | B's bar | B's value | B's rank |
     |---|---|---|---|---|---|---|

     The bars are a butterfly: A's grows left from the middle and B's grows right.
   - Changed while building: a bar shows the value's place between the league's worst club (a sliver) and its best
     (full), not its share of the bigger of the two values as on the team tab. Net rating and margin can be negative,
     and for lower-is-better stats the bigger number is the worse one, so with share-of-bigger a longer bar would not
     always mean the better number. Pace (no better end) uses slowest to fastest.
   - Below `sm` a row is two lines:
     - the stat name centred, with A's rank at the left and B's at the right;
     - A's value, the two bars, then B's value.
   - The stat name keeps its hover tip (`stat.tip ?? TEAM_STAT_TIPS[stat.key]`).
   - Stats where lower is better keep a small "lower is better" hint.
2. **Clear who is better.**
   - On each row the better side's value is bold in the primary colour, and its bar is primary. The other side's bar
     is grey (`bg-base-content/45`). Equal values are both neutral.
   - Pace has no better side (`directionOf` returns "neutral"), so both bars are neutral.
   - Ranks use the team tab's tiers (`rankTier`: green top third, red bottom third), shown as "3rd", with the full
     "3rd of 20 clubs" on hover.
3. **Group headers carry the club names.**
   - Each group's header row shows its title, then A's and B's TV code (full name from `sm`) over their columns,
     replacing the top crest strip.
4. **Two columns from `xl`.**
   - Left: Efficiency, Record, Scoring, Shooting (16 rows). Right: Rebounding, Playmaking, Defense (17 rows).
   - Both columns end on about the same line. Below `xl`, one column in today's family order.
5. **Every team stat** (added after review). The nine stats the comparison used to leave out (`LEFT_OUT` in
   `teamCompare.js`) are included in their families, bringing the tab to 42 rows, 21 per column:
   - Scoring: 2-pointers attempted, 3-pointers attempted, free throws made, free throws attempted, free throw rate.
     The free throws go together: made, attempted, rate.
   - Playmaking: assist to turnover.
   - Defense: opponents' turnover %, opponents' free throw rate (after their shooting), fouls drawn.
   - 2-point and 3-point attempts are style numbers like pace: no better side, and grey ranks.
6. **Summary line.**
   - Under the panel title, a line such as "Real Madrid better on 14 · Panathinaikos better on 18 · 1 level", counted
     over the rows that have a better side.
   - The existing notes stay under it, in one muted line each: per game with overtime counted, ranks among the N
     clubs, forfeits (`ForfeitStatsNote`), and the unadjusted note (`UNADJUSTED_NOTE`).
7. **Motion and skeleton.**
   - Rows stagger in and the bars grow from the middle (`barFill`), as on the team tab.
   - `TeamStatsSkeleton` follows the new shape: two columns of thin rows, with no crest strip.

The following must not break:
- the empty state when a club has no statistics in the phase;
- the loading and error states with Retry;
- the phase select;
- the player comparison's Statistics tab, which uses `ComparisonRow` and is unchanged;
- `ComparisonRow` itself, which is shared and unchanged;
- both themes, keyboard focus on the tips, and no sideways scroll at 320px.

## Build steps

1. [x] **Rows, groups and columns** (items 1 to 6, in `CompareTeamStats.jsx`).
   - Done when Real Madrid vs Panathinaikos Statistics is about 1,100px or less at 1440, in two columns.
   - Done when each stat is one row with both ranks, both values and the butterfly bars, with the better side
     highlighted.
   - Done when the summary line counts the leads.
2. [x] **Motion and skeleton** (item 7).
   - Done when the rows stagger in and the skeleton matches the two-column shape.
3. [x] **Browser specs.** Update `e2e/compare-team-layout.spec.js` ("the Statistics rows fit with no cut text") and
   any `compare.spec.js` checks that relied on the old rows. Add:
   - one row per stat with two ranks;
   - the better side marked, and the summary counts matching the marked rows;
   - two columns from 1280, one below;
   - no cut text or sideways scroll at 1440, 1024, 640 and 320.
   - Done when the specs pass on the local DB.

## Verify

- On the local DB (`/api/health` reports `"target":"local"`), run
  `cd frontend && npx playwright test compare.spec.js compare-team-layout.spec.js responsive.spec.js -g "Compare|compar|Statistics"`.
- Then `npm run lint` and `npm run build` in `frontend`.
- In the browser, open `/2026/compare?teamA=MAD&teamB=PAN&game=91`, then the Statistics tab:
  - two columns of aligned rows at 1440;
  - the better value and bar highlighted on each row;
  - "X better on N · Y better on M" at the top;
  - ranks coloured by tier.
- Check 390 and 320 for two-line rows and no sideways scroll, and both themes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6613,"specSha256":"83907cdbf6a5a4caebf3168debe37272ca71666369429381c291508ede1fd0ae","branch":"refs/heads/fix/compare-team-statistics-tab-like-the-team-statistics-tab","head":"9f2ef6e88b06fea17d654ba57df5a5bef0f987f5","baseRef":"refs/heads/master","baseCommit":"9f2ef6e88b06fea17d654ba57df5a5bef0f987f5","sourceTree":"d2217bb7548094b9fffc22e0d87a5efb2e4f3435","absentOptional":[]} -->
