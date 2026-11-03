# Fix: Compare team Overview compaction

**Type:** Fix
**Status:** verified
**Branch:** fix/compare-team-overview-compaction

## The problem

A team comparison's Overview tab is long and mostly empty to the side. For example, Real Madrid vs Panathinaikos, round
10 (`/2026/compare?teamA=MAD&teamB=PAN&game=91`) is 1,923px tall at 1440×900 and 2,512px at 390.

| Part | Height at 1440 | What takes the room |
|---|---|---|
| Header (`TeamPairHeader.jsx`) | 273px | 80px crests over the names, then the round, date and host on two lines, with the buttons under them (`ComparisonContext` in `CompareFixtures.jsx`) |
| Matchup edges | 286px | full width; each edge row runs a short label and a rank about 600px apart |
| Form | 455px | full width; the Home record and Away record bars take about 150px |
| Top scorers | 354px | 40px avatars; the Compare button sits on a row of its own |
| Meetings | 191px | lists the game being previewed like any other meeting |

## The fix

These are frontend changes only, in `comparisons/`. They use data the site already serves: the RS standings that
`CompareFixtures` loads (`getSeasonStandings(seasonCode, "RS")`, same query key) and each club's games, which the Form
panel already loads. There are no API or address changes.

1. **Two-column grid** (`CompareTeamOverview.jsx`).
   - From `lg`, two columns: Matchup edges then Form on the left, Top scorers then Meetings on the right. Each column
     stacks its panels with the current gap.
   - Below `lg`, the panels stay in one column in today's order.
   - A panel that renders nothing (no edges, no meetings) leaves no empty slot.
2. **Slimmer header** (`TeamPairHeader.jsx`, `ComparisonContext`).
   - Smaller crests, about 48px from `sm`, beside each club's name instead of over it. Mirror the road side, so the crest
     is on the inner edge next to "vs".
   - Under each name: the club's regular-season place and record, for example "2nd · 8-1", from the RS standings.
     Nothing shows while the standings load or when the club has no standing.
   - The round, date, host and the Game preview / All-time head-to-head buttons go on one line from `sm`, wrapping
     below it. The `centred` form is used only by this header, and the non-centred `PageHeader` use is unchanged.
   - The header is the same over every team tab (Statistics, Rosters, Trends), and the change shows there too. Player
     comparisons are untouched.
   - The clubs' links to their team pages and the screen-reader `h1` stay.
3. **Form** (`FormPanel`).
   - Remove the two `ComparisonRow` bars for Home record and Away record. Under each club's last-5 list, add one line,
     for example "Home 3-0 · Away 3-3", from the same `venueRecord` numbers, with "—" for no games.
   - When the comparison was opened from a game (`hosted`), the record that counts is emphasised (bold, primary): the
     home record of club A and the away record of club B. The hosted note stays.
   - Beside each "last 5" heading, show the current streak from the same played games, for example "W5" or "L1",
     styled like the W/L badges. Nothing shows with no games played.
4. **Top scorers** (`WatchPanel`).
   - Smaller avatars (32px).
   - The "Compare <A> and <B>" link moves up beside the panel title, wrapping under it on narrow widths, instead of on
     its own row at the bottom.
5. **Meetings** (`MeetingsPanel`).
   - When the comparison was opened from a game, that game's row is marked "This game", a small badge in place of the
     "vs". It needs the `gameCode` passed down with `hosted`.
   - The other rows are unchanged.
6. **Even columns** (added after review: the right column ended about 130px short of the left).
   - From `lg` the last panel of each column (Form, Meetings) stretches, so both columns end on one line.
   - Meetings becomes "This season and last". Under this season's list, add last season's meetings with their series
     score, from club A's games of the season before in the catalog (one more request, the same `getTeamGames`). A club
     absent that season (404 `TEAM_NOT_FOUND`, the check moved from `HeadToHeadPage.jsx` to `teamCompare.js`) means no
     list, not an error.
7. **Skeletons** (`CompareSkeleton.jsx`). The Overview and header skeletons follow the new shapes so loading doesn't
   jump.

The following must not break:
- the Statistics, Rosters and Trends tabs;
- the player comparison;
- the Back link, the phase select and the tab strip;
- every link (games, players, team pages, the player comparison);
- both themes, keyboard focus, and no sideways scroll at 320px.

## Build steps

1. [x] **Header** (item 2, its skeleton).
   - Done when the header at 1440 is about 160px or less and shows "<place> · <W-L>" under each club.
   - Done when the game line and buttons sit on one row from `sm`.
2. [x] **Overview panels** (items 1, 3, 4, 5, 6, their skeletons).
   - Done when the Real Madrid vs Panathinaikos Overview is about 1,150px or less at 1440, in two columns from `lg`.
   - Done when Form shows "Home x-y · Away x-y" with the counting record emphasised, and a streak per club.
   - Done when the Compare link sits beside the Top scorers title, and Meetings marks round 10 as "This game".
   - Done when both columns end on one line at 1440, with last season's meetings under this season's.
3. [x] **Browser specs.** Update `e2e/compare.spec.js` and `e2e/compare-team-layout.spec.js` where they relied on
   the old record bars or the header layout. Add:
   - the standing line in the header;
   - the venue line and streak in Form;
   - the "This game" marker;
   - two columns from 1024, one below, with no sideways scroll at 1440, 1024, 640 and 320.
   - Done when the specs pass on the local DB.

## Verify

- On the local DB (`/api/health` reports `"target":"local"`), run
  `cd frontend && npx playwright test compare.spec.js compare-team-layout.spec.js responsive.spec.js -g "Compare|compar"`.
- Then `npm run lint` and `npm run build` in `frontend`.
- In the browser, open `/2026/compare?teamA=MAD&teamB=PAN&game=91`:
  - the slim header with places and records;
  - two columns at 1440;
  - "Home 3-0 · Away 3-3" style lines with Real's home and Panathinaikos's away record emphasised;
  - streaks;
  - the Compare link beside Top scorers;
  - round 10 marked "This game".
- Check 390 and 320 for one column and no sideways scroll, and both themes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6493,"specSha256":"ba91a272667f1a77c87e927673419c6ba334ff2642763bc2792ea4f76a008155","branch":"refs/heads/fix/compare-team-overview-compaction","head":"8aa888c9aee0c83f3093b22a00859025f7cfdf74","baseRef":"refs/heads/master","baseCommit":"8aa888c9aee0c83f3093b22a00859025f7cfdf74","sourceTree":"ef107904a915eaea815196ae1330196d711cef88","absentOptional":[]} -->
