# Fix: Compare team Trends tab compaction and new trends

**Type:** Fix
**Status:** verified
**Branch:** fix/compare-team-trends-tab-compaction-and-new-trends

## The problem

A team comparison's Trends tab (`comparisons/CompareTeamTrends.jsx`) is long, and one chart repeats another. For
example, Real Madrid vs Panathinaikos (`/2026/compare?teamA=MAD&teamB=PAN&game=91`, Trends) is 1,853px tall at 1440
and 2,891px at 390.

| Part | Height at 1440 | What takes the room |
|---|---|---|
| Form | 270px | two cards: crest and name, five result bars, then big Scored and Allowed numbers with their change |
| Points scored, Points allowed | 370px each, side by side | a 256px plot, the legend, a line of notes |
| Point differential | 370px, full width | the same margins the two bar charts below show |
| Margin in every game | 338px each, side by side | a 224px plot and a note |

Nothing shows how the clubs did against the same opponents, in close games, or against strong and weak clubs.

## The fix

These are frontend changes, in `comparisons/`. They use the clubs' games the tab already loads and the RS standings
the header already loads (`getSeasonStandings(seasonCode, "RS")`, key `["standings", seasonCode, "RS"]`). There are
no API or address changes.

1. **Slimmer form strip.**
   - The Form panel becomes one line per club from `sm`: crest and name, last-5 record and streak, the five result
     dots (oldest first, each with its game in a tip), then "Scored 104.2 (+8.0)" and "Allowed 88.4 (+0.4)". The
     change on the season keeps its colour.
   - Below `sm` each club takes two lines: the name, record and dots, then the two numbers.
   - The forfeit rule stays: averages use real games only.
2. **Drop the duplicate chart.**
   - Remove the full-width "Point differential" line chart. The two "Margin in every game" bar charts carry the same
     numbers, and they stay side by side from `xl`.
3. **Shorter charts.**
   - The team tab's charts get a shorter plot: about 160px for the lines, 150px for the bars. This is an opt-in
     `compact` prop on `LineTrend` and `MarginTrend`, so the player Trends tab is unchanged.
   - The note under each title becomes a `HeaderTip` on the title in compact panels. "Lower is better" stays visible
     for points allowed.
4. **Rolling averages.**
   - On Points scored and Points allowed, each club also gets a 3-game rolling average line: same colour, thicker, no
     markers. The game-by-game line becomes thin and faint.
   - The legend names the clubs once, and a short note says the bold line is the 3-game average.
   - This is opt-in on `LineTrend` (a `rolling` prop) for the same reason.
5. **Common opponents** (new panel).
   - For every club both have played in the phase, one row: the opponent's crest and name, then each club's results
     against it. That is the margin of each game, for example "+18" or "−4 · +6" for two games, coloured won/lost.
     The club with the better total margin against that opponent is marked.
   - Changed while building: the column headers over the narrow figures (here and in Game types) show the TV codes at
     every width, since the full names wrapped out of the columns; the summary line names the clubs in full.
   - A summary line on top, for example "Against 7 common opponents: Real Madrid better on 4, Panathinaikos on 3".
   - The two clubs' own meetings are left out.
   - Rows are ordered by the opponent's current standing. From `lg` they form two columns.
   - With no common opponent the panel says so in one line.
6. **Close games and blowouts** (rows in a new "Game types" panel).
   - Each club's record in games decided by 5 points or fewer, and in games decided by 15 or more (won-lost).
   - Aligned rows like the Rosters profile: name, A's record, B's record. A better win share is marked.
7. **Record vs top and bottom** (rows in the same panel).
   - Each club's record against the top half of the current RS standings and against the bottom half. The club itself
     is excluded, and clubs without a standing are skipped.
   - The panel names the cut, for example "Top 10 / bottom 10 of the 20 clubs".
   - When the standings fail or are missing, these rows are left out and the close-game rows stay.
8. **Layout.** From top to bottom:
   - the form strip;
   - Game types beside Common opponents from `xl`;
   - Points scored beside Points allowed;
   - the two margin charts.
9. **Skeleton** (`TrendsSkeleton`).
   - The team layout gets its own skeleton, `TeamTrendsSkeleton`, for the new layout.
   - The player Trends skeleton is unchanged. If the two share one skeleton today, add a `players` prop or a separate
     export.

The following must not break:
- the loading and error states;
- the "not enough games" empty state;
- the forfeit handling;
- the player Trends tab, which uses the same chart components with their defaults;
- the chart tips;
- both themes, keyboard focus, and no sideways scroll at 320px.

## Build steps

1. [x] **Form strip, charts and rolling lines** (items 1 to 4).
   - Done when the form is one line per club from `sm`.
   - Done when the differential line chart is gone.
   - Done when the team charts are shorter, and Points scored and allowed show a 3-game average line per club.
   - Done when the player Trends tab looks the same.
2. [x] **Common opponents and Game types** (items 5 to 8).
   - Done when Real Madrid vs Panathinaikos lists their common opponents with each club's margins and the summary.
   - Done when Game types shows the close-game, blowout, top-half and bottom-half records.
   - Done when the tab is about 1,300px or less at 1440.
   - Result: 1,386px at 1440 (from 1,853) and 2,511px at 390 (from 2,891).
3. [x] **Skeleton and browser specs** (item 9). Update `e2e/compare-team-layout.spec.js` (the Trends tests and the
   320px states) and any `compare.spec.js` Trends checks. Add:
   - the form strip on one line from 640px;
   - no "Point differential" chart;
   - the common opponents rows and summary count agreeing;
   - the Game types rows;
   - no sideways scroll at 1280, 1024, 640 and 320.
   - Run the player Trends layout specs (`compare-player-layout.spec.js -g Trends`) to show they are unchanged.
   - Done when the specs pass on the local DB.

## Verify

- On the local DB (`/api/health` reports `"target":"local"`), run
  `cd frontend && npx playwright test compare.spec.js compare-team-layout.spec.js compare-player-layout.spec.js responsive.spec.js -g "Compare|compar|Trend"`.
- Then `npm run lint` and `npm run build` in `frontend`.
- In the browser, open `/2026/compare?teamA=MAD&teamB=PAN&game=91`, then Trends:
  - the slim form strip;
  - Game types and Common opponents side by side;
  - shorter charts with bold 3-game averages;
  - the two margin charts, and no differential line chart.
- Open a player comparison's Trends tab to confirm it is unchanged.
- Check 390 and 320, and both themes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7047,"specSha256":"30800918c85888420df0a6067ee4052cd1eee6848ac77d12ba9db8549dfccfe9","branch":"refs/heads/fix/compare-team-trends-tab-compaction-and-new-trends","head":"486877eed010a00f798e65109429735801e860a9","baseRef":"refs/heads/master","baseCommit":"486877eed010a00f798e65109429735801e860a9","sourceTree":"2498ed33a67f8006175f27305a6ad3c7631d1cb3","absentOptional":[]} -->
