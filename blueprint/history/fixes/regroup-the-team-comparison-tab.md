# Fix: Regroup the Team comparison tab

**Type:** Fix
**Status:** verified
**Branch:** fix/regroup-the-team-comparison-tab

## The problem

The game page's Team comparison tab (`frontend/src/games/GameDetailPage.jsx` `TeamComparisonTab`,
`FourFactors.jsx`, `ScoringProfile.jsx`, `teamFlow.js`) has three panels, Head to head, Four Factors and
Scoring profile, with about 45 rows. The panels split by data source, not by question, and about a third of
the rows repeat another row:

- **Swapped between the teams:**
  - Blocks / Blocks against, and Fouls committed / Fouls drawn.
  - Defensive rating (A's equals B's offensive rating) and Net rating (B's is A's with the sign flipped).
  - The whole Four Factors Defense block: Opp eFG%, Opp TOV%, Opp FT rate and DRB% (100 minus the other side's ORB%).
- **The same for both teams:** possessions, pace, time tied, lead changes, ties, clutch time, possessions counted.
- **Shown twice:**
  - Assist ratio (Four Factors) and Assisted baskets (Scoring profile).
  - Points is the header's final score, and Starters' points plus Bench points add up to it.
  - Own possessions is a working figure, not something a reader needs.

## The fix

Replace the three panels with one tab built from question-shaped groups. Shared, one-per-game values go in a
summary strip. Every mirrored row compares something that actually differs between the teams.

### Layout

- **Top:** a header with each team (crest, name, coach), the local team on the left and the road team on the right.
- **Summary strip:** chips with one value each: Pace, Possessions, Lead changes, Ties, Time tied, Clutch time.
- **Groups:** below the strip, the groups as panels. From `lg` they sit in two columns: Efficiency, Shooting,
  Where the points came from and Ball movement on the left; Possession battle, Defense and fouls and Game flow
  on the right. Below `lg` they stack in that order.
- **Group panels:** each repeats the two team labels, as the panels do now, so a panel reads on its own on a phone.
- **Rows:** inline `ComparisonRow`s. A row with a season average keeps its bar and tick (as Four Factors does
  now). Every other row has no bars (as Head to head does now).

### Groups and rows

| Group | Rows (source) |
|---|---|
| Efficiency | Offensive rating (advanced, season tick, labelled "Points per 100 possessions"), TS% (advanced, season tick), eFG% (advanced, season tick) |
| Shooting | Field goals, 2PT, 3PT, FT as made-attempted (%) (box); **new** 3PT attempt rate = 3PA / FGA, neutral (box) |
| Where the points came from | **new** points mix bar (box); Points in the paint (shots); Fast-break, Second-chance, Points off turnovers (team flow); Bench points (box players) |
| Possession battle | Turnovers as "14 (2 team)" when the team line has turnovers, lower is better (box); TOV% (advanced, season tick); Steals (box); Offensive rebounds as "12 (34.3%)" with the ORB% season tick (box + advanced); Defensive rebounds, Rebounds (box); FT rate (advanced, season tick); **new** extra chances line |
| Ball movement | Assists (box); Assisted baskets "x of y (%)" (team flow); **new** assist-to-turnover ratio (box) |
| Defense and fouls | Blocks, Steal %, Block % (box + advanced possessions, as now); Fouls committed, lower is better (box) |
| Game flow | Time in front, Biggest lead, Longest run, Runs of 6+, Clutch points (team flow); **new** Quarters won (box periods); Average possession (team flow) |

**Removed rows:**
- Points, Starters' points, Blocks against, Fouls drawn.
- Defensive rating, Net rating, Own possessions, Possessions counted, Time of possession.
- The whole Defense block (Opp eFG%, Opp TOV%, DRB%, Opp FT rate) and Assist ratio.
- Possessions, Pace, Time tied, Lead changes, Ties and Clutch time move to the strip.

### New figures

- **Points mix.** One horizontal stacked bar per team splitting its points into 2s (2 × 2PT made), 3s (3 × 3PT
  made) and free throws (FT made). Each segment is printed as points and share, for example "24 (30%)", so the
  colour is never the only carrier. A short legend sits under the bars. It uses theme tokens only.
- **Extra chances.** (own offensive rebounds + opponent turnovers) − (own turnovers + opponent offensive
  rebounds), from the box totals. It is one value for the game, so it is not mirrored. It is one centred line at
  the end of Possession battle: "<TV code> +4 extra chances", or "Even" at zero. Its tip explains the sum.
- **Quarters won.** For each team, the periods (overtimes included) in which it outscored the opponent, as
  "3 of 4". A tied period counts for neither.
- **Opponent's usual defense.** Under eFG%, TOV%, ORB%, FT rate and Points per 100, add a second muted line
  after the team's own season average: what the opponent allows on average through the round. It reads the
  opponent's season `oppEfgPct`, `oppTovPct`, `1 - drbPct`, `oppFtRate` and `defensiveRating` from the existing
  `/advanced` response. It is text only, no second tick. It is hidden with the season averages when the
  opponent has played fewer than the minimum games.

### Loading, errors and missing data

- **Box score loading:** the tab shows a skeleton shaped like the new layout. The box score is the tab's base
  (team header, coaches, most rows).
- **Box score error:** the existing error state with Retry for the whole tab.
- **Other sources:** advanced, team flow and shots load on their own.
  - While one loads, its rows show the existing loading mark.
  - If one fails, its rows show a dash and a single line under the strip says which figures couldn't be loaded, with one Retry that refetches every failed query.
- **Rows with no data:** once a row's source has loaded, a row with no value on either side is left out, and a
  group with no rows is left out. Older seasons have no team flow or shot splits, so they get a shorter tab, not
  rows of dashes. A value missing on one side only still prints a dash, so neither side is highlighted.
- **Season averages:** they keep the existing minimum-games rule and keep one short note when they are hidden.

### Code shape

- **`frontend/src/games/teamComparison.js`** (plain module): builds the strip items, groups, rows, points mix,
  extra chances and quarters won from the four responses. It absorbs the steal and block rate helper from
  `FourFactors.jsx`.
- **`frontend/src/games/TeamComparisonTab.jsx`:** the tab, moved out of `GameDetailPage.jsx`, which only renders it.
- **Deleted:** `FourFactors.jsx` and `ScoringProfile.jsx`.
- **`teamFlow.js`:** keeps the Overview's `overviewFlowRows` unchanged and drops `scoringProfileRows`.
- **Skeleton:** `GamePageSkeleton.jsx` gets the new tab skeleton. Unused skeleton exports are removed, unless
  other pages use them (`PanelBlockSkeleton` is used elsewhere).
- No backend change, no new dependency.

### Must not break

- The Overview's flow rows.
- Every other game tab.
- The phone layout: no horizontal scroll at 320px, and every value stays in its half.
- Keyboard focus on the tips.
- Both themes.

### Revision: traditional left, advanced right

Requested after the first review. A reader who doesn't know advanced stats should meet the familiar box-score
numbers first, with every stat still available. The two columns get headings: "Traditional stats" on the left
(first on a phone) and "Advanced stats" on the right. This replaces the group table above:

| Column | Group | Rows |
|---|---|---|
| Traditional | Shooting | Field goals, 2PT, 3PT, FT |
| Traditional | Rebounds | Offensive, Defensive, Rebounds |
| Traditional | Ball and defense | Assists, Turnovers (with team turnovers), Steals, Blocks, Fouls committed |
| Traditional | Where the points came from | Points mix, Points in the paint, Fast-break, Second-chance, Points off turnovers, Bench points |
| Advanced | Efficiency | Points per 100 possessions, TS% |
| Advanced | Four factors | eFG%, TOV%, ORB%, FT rate, extra chances line |
| Advanced | Rates and style | 3PT attempt rate, Assisted baskets, Assist to turnover, Steal %, Block %, Average possession |
| Advanced | Game flow | Time in front, Biggest lead, Longest run, Runs of 6+, Clutch points, Quarters won |

## Build steps

1. [x] **Row model** (`teamComparison.js`, `teamFlow.js`). Done when the module returns the strip, the seven
   groups with the rows above, the points mix, extra chances and quarters won for a fixture game. It must also
   leave out rows and groups with no data, and lint passes.
   As built: ORB% is its own row (advanced, season tick, opponent line) under Offensive rebounds (a box count).
   One row cannot carry both, because the bar and tick need the row's value and the season average on the same
   scale. `ComparisonRow` gained opt-in `noteA`/`noteB` (inline only) for the "Opp allows" line.
2. [x] **The tab** (`TeamComparisonTab.jsx`, `GameDetailPage.jsx`, `GamePageSkeleton.jsx`; delete
   `FourFactors.jsx` and `ScoringProfile.jsx`). Done when the tab renders the header, the strip and the grouped
   panels in two columns from `lg` and stacked below. Each source must also load and fail on its own, and
   `npm run build` and lint pass.
3. [x] **Browser specs.**
   - Replace `game-four-factors.spec.js` and `game-scoring-profile.spec.js` with `game-team-comparison.spec.js`.
     It covers the groups and removed rows, the strip, the new figures, the opponent line, per-source loading and
     errors, and rows left out without data.
   - Update the Team comparison parts of `game-box-score.spec.js`, `game-flow-layout.spec.js` and
     `skeleton-loading.spec.js`.
   - Done when those specs and `responsive.spec.js` pass on the local DB.

## Verify

- `cd frontend && npm run lint && npm run build` pass.
- With `/api/health` reporting `"target":"local"`, run
  `npx playwright test game-team-comparison.spec.js game-box-score.spec.js game-flow-layout.spec.js skeleton-loading.spec.js game-overview.spec.js responsive.spec.js`.
- In the browser, open a recent played game, then the Team comparison tab:
  - The strip shows six chips.
  - None of the removed rows appear.
  - The points mix segments add up to each team's score.
  - Extra chances matches a hand calculation from the box score.
  - Quarters won matches the Overview's line score.
- Open a pre-2016 game: the groups without data are left out and no row is all dashes.
- Check at 375px and 1280px in both themes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10536,"specSha256":"43d1a5a8d7ee6283f76f9da0f58a7dab43131f27fe05bc282cdb6f16c05a694c","branch":"refs/heads/fix/regroup-the-team-comparison-tab","head":"753135023034c46c35ad256442669786eeedc33b","baseRef":"refs/heads/master","baseCommit":"753135023034c46c35ad256442669786eeedc33b","sourceTree":"6aa201a6e0671cb7c52ac2eaf97a50d50482b3be","absentOptional":[]} -->
