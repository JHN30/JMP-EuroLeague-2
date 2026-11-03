# Fix: Compare team Rosters tab compaction and roster insights

**Type:** Fix
**Status:** verified
**Branch:** fix/compare-team-rosters-tab-compaction-and-roster-insights

## The problem

A team comparison's Rosters tab (`comparisons/CompareRosters.jsx`) is long and says little beyond the raw lists. For
example, Real Madrid vs Panathinaikos (`/2026/compare?teamA=MAD&teamB=PAN&game=91`, Rosters) is 2,774px tall at
1440 and 3,543px at 390.

| Part | Height at 1440 | What takes the room |
|---|---|---|
| Roster profile | 571px | a crest strip repeating the page header, then 6 full-width `ComparisonRow`s |
| Most impactful players | 355px per club | 40px avatars, roomy rows |
| Full rosters | 1,283px per club | every registered player, including 8 Real Madrid and 2 Panathinaikos players with no games, each a row of dashes |

Nothing compares the clubs by position, how much each leans on its stars, or how settled each roster is.

## The fix

These are frontend changes only, in `comparisons/`. The tab already loads each club's registrations (position,
height, country), the player season stats (games, minutes, points, PIR, age, image) and the advanced impact rows. The
only new request is last season's roster for item 5. There are no API or address changes.

1. **Roster profile as aligned rows.**
   - Replace the crest strip and the 6 `ComparisonRow`s with one aligned row per measure, in the Statistics tab's
     style. From `sm` the columns are: name, A's value, A's bar, B's bar, B's value. Below `sm` a row is two lines:
     the name, then the numbers and bars.
   - The group header carries both clubs' names (TV code below `sm`, or the club code for a club without one).
   - Changed while building: below `sm` a row is one line, the name and the two numbers, without bars.
   - The better side is marked (bold primary value, primary bar) only where one is better: the top-3 points and the
     scoring-spread rows that say "higher" (item 3). Size, age, players, nationalities and rotation stay neutral.
   - The bars are each scaled to the bigger of the two values (all positive).
   - Same 6 measures and tips (`ROSTER_SUMMARY_TIPS`).
2. **Position matchups** (new panel).
   - For Guard, Forward and Center (`positionName`), one row each with:
     - each club's best player at that position by PIR per game, among players with games: picture, name, PIR;
     - under it, the group's total minutes and points per game.
   - Changed while building: the group's share of the club's minutes and points (from minutes × games and points ×
     games) instead of per-game totals, which do not add up across players with different games. The facts sit in a
     small aligned table, A's value, the label, B's value: players, share of minutes, share of points, average age,
     average height.
   - Each row is a link to that player comparison (`/compare?view=players&playerA=…&playerB=…`).
   - A position where either club has no player with games shows "—" on that side and no link.
3. **Scoring spread** (rows added to the profile).
   - The top scorer's share of team points and the top three's share, each as a percentage of the sum of the club's
     players' points per game.
   - Players scoring 10+ a game.
   - These are neutral: leaning on stars is not better or worse. Each row has a tip saying what it counts.
4. **Age and size by position** (changed while building: in the position matchups, item 2, beside the position
   they describe, instead of six profile rows; the profile and the matchups then sit side by side from `xl`).
   - The average age and the average height of each position group (Guards, Forwards, Centers): six rows.
   - Counted over every registered player of that position, like the overall averages. Neutral.
5. **Continuity** (a row added to the profile).
   - The share of the club's minutes (minutes per game × games, summed) played by players who were also registered
     with the club last season.
   - "Last season" is the season before this one in the catalog. Its roster comes from
     `getTeamRoster(previous, clubCode)`, cached under the same `team-roster` key.
   - A club absent last season (404 `TEAM_NOT_FOUND`, `absentFromSeason` in `teamCompare.js`) shows 0%. There is no
     row when the season has no previous season. The row waits quietly while last season's roster loads.
   - Neutral, with a tip.
6. **Weight** (added after review). Every registration carries `player.weightKg`:
   - an "Average weight" row in Squad, after the height;
   - the average weight in each position's facts;
   - the weight after the height in the full rosters ("Guard · 193 cm · 88 kg").
   Neutral, like the height.
7. **Hide players with no games.**
   - In each full roster, players with no games played move under a "Show N who haven't played" button at the bottom
     of the table. It reveals them in place and can be collapsed again.
   - The players count in the profile still counts everyone registered.
8. **Tighter roster rows.**
   - Smaller avatars (32px) and less padding in the Most impactful and full roster tables. Position and height stay on
     one line under the name.
   - The tables keep their sideways swipe and pinned player column below `sm`.
9. **Skeletons** (`RostersSkeleton`, `ImpactRowsSkeleton`) follow the new shapes.

The following must not break:
- the loading, error and empty states of each part (a failing impact or continuity request still shows the rest);
- the phase select;
- the player links;
- the Overview, Statistics and Trends tabs;
- the player comparison;
- both themes, keyboard focus, and no sideways scroll of the page at 320px.

## Build steps

1. [x] **Profile rows, scoring spread, by position and continuity** (items 1, 3, 4, 5, 6).
   - Done when the profile is one block of aligned rows with the crest strip gone, holding the 6 measures, the
     scoring spread, the 6 by-position rows and continuity.
   - Done when continuity shows a percentage per club for Real Madrid vs Panathinaikos.
2. [x] **Position matchups** (item 2).
   - Done when Guards, Forwards and Centers each show both clubs' best player by PIR, each row opening their player
     comparison.
3. [x] **Rosters and rows** (items 7, 8, 9).
   - Done when players with no games sit under "Show N who haven't played".
   - Result: 2,201px at 1440 (from 2,774) and 3,451px at 390 (from 3,543). The 1,700px estimate was missed: the
     two full roster tables of the players who played (about 760px) take most of it.
   - Done when the skeletons match.
4. [x] **Browser specs.** Update `e2e/compare-team-layout.spec.js` (the Rosters tests) and any `compare.spec.js`
   Rosters checks. Add:
   - the profile rows, with continuity as a percentage;
   - the three position matchups linking to a player comparison;
   - the hidden-players button revealing that many rows;
   - no sideways page scroll at 1280, 1024, 640 and 320.
   - Done when the specs pass on the local DB.

## Verify

- On the local DB (`/api/health` reports `"target":"local"`), run
  `cd frontend && npx playwright test compare.spec.js compare-team-layout.spec.js responsive.spec.js -g "Compare|compar|Roster"`.
- Then `npm run lint` and `npm run build` in `frontend`.
- In the browser, open `/2026/compare?teamA=MAD&teamB=PAN&game=91`, then Rosters:
  - the compact profile with scoring spread, by-position age and height, and continuity;
  - the position matchups opening player comparisons;
  - "Show 8 who haven't played" under Real Madrid's roster;
  - the tighter tables.
- Check 390 and 320, and both themes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7694,"specSha256":"8524a19f962003be204dd03bebfcbfb646d6e87885272cbaa71f80a1311b3f61","branch":"refs/heads/fix/compare-team-rosters-tab-compaction-and-roster-insights","head":"2caf37d664dfa759130cac0256f8f6300536427e","baseRef":"refs/heads/master","baseCommit":"2caf37d664dfa759130cac0256f8f6300536427e","sourceTree":"4514bffef4607bbb10cf9b433d26f0a965139b3d","absentOptional":[]} -->
