# Fix: Team roster stats read one club

**Type:** Fix
**Status:** verified
**Branch:** fix/team-roster-stats-read-one-club

## The problem

`fetchTeamRosterStats` ([teamRosterStats.js:16](frontend/src/teams/teamRosterStats.js#L16)) wants one club's players,
but `/season-stats` has no club filter, so it pages through the whole league (100 rows a page, up to 5 pages) and keeps
the club's rows in the browser. E2025's regular season has 335 player rows, so every call is 4 requests. Each reads the
joined advanced, scoring and misc tables plus a position subquery, and returns about 20 times the rows the page needs.

It runs on:

- the team page ([TeamPage.jsx:573](frontend/src/teams/TeamPage.jsx#L573)), the Advanced section
  ([TeamAdvancedSection.jsx:818](frontend/src/teams/TeamAdvancedSection.jsx#L818)) and the Roster section
  ([TeamRosterSection.jsx:294](frontend/src/teams/TeamRosterSection.jsx#L294), totals over phase `all`);
- the compare page, twice per tab (one per club): Rosters ([CompareRosters.jsx:438-443](frontend/src/comparisons/CompareRosters.jsx#L438-L443))
  and Team overview ([CompareTeamOverview.jsx:289-290](frontend/src/comparisons/CompareTeamOverview.jsx#L289-L290)).

## The fix

- **Backend.** `/season-stats` accepts an optional `club` query. Validate it with the existing `validIdentity`;
  a malformed value answers `400 INVALID_QUERY` ("Invalid club code"). Add `clubCode?: string` to `StatsFilters`
  ([season-stats.ts:254](backend/src/db/season-stats.ts#L254)), and in `getSeasonStats` add the condition
  `<code> = ANY(string_to_array(club_code, ';'))`, parameterized through Drizzle's `sql`. That keeps a traded player
  whose row reads `OLY;PAR` for both clubs, and drops rows with no club. The count query shares the conditions, so
  `total` and `hasMore` describe the filtered set. An unknown club returns an empty list, not an error.
- **Frontend.** `getLeaderStats` passes a `club` option through. `fetchTeamRosterStats` sends `club: clubCode`, so
  its existing page loop normally stops after one request. It keeps the `.split(";").includes(clubCode)` check as is,
  which the filter already guarantees. The returned `Map` keyed by person key, `playedForOtherClubs` and every
  caller's query key stay unchanged.

Must not break: the rosters, numbers and order shown in all five places above (traded players included, with their
"played for other clubs" note); the leaderboards and other `/season-stats` callers, which send no `club`; the response
shape.

## Build steps

1. [x] **Club filter on `/season-stats`, used by team roster stats.**
   Result: filtered rows are byte-identical to the club's rows from the unfiltered pages for E2025 PAR (RS per game
   and all-phase totals, 21 rows with five traded players), E2025 IST and E2024 MCO, in 1 request each instead of 3–4;
   `club=bad-code` answers 400; the browser makes one club request per club and no unfiltered league pages.
   Done when:
   - `cd backend && npm run build` and `cd frontend && npm run lint` pass.
   - `/api/seasons/E2025/season-stats?phase=RS&mode=perGame&club=PAR&limit=100` returns only rows whose club code
     includes `PAR`, among them the `OLY;PAR` and `MCO;PAR` traded players. Its `total` equals the count of `PAR`
     rows in the unfiltered league pages.
   - `club=bad-code` answers `400`.
   - Without `club`, the response is unchanged.
   - The team page and a team compare page each make one `/season-stats` request per club for roster stats, where
     there were four.

## Verify

- `npm run build` at the root.
- With `/api/health` reporting `"target":"local"`:
  - Call the endpoint with and without `club` as above, and compare the filtered rows to the club's rows kept from
    the unfiltered pages. They should be the same players with the same numbers.
  - Open a team that had a traded player (for example PAR in E2025). Check the Overview, Roster and Advanced tabs
    show the same players and figures as on master, and watch the network panel for one roster-stats request.
  - Open the compare page for two teams. The Rosters and Team overview tabs should show the same content.
- Playwright: `team-overview-layout`, `team-statistics-roster-layout`, `team-advanced-layout`, `compare-team-layout`
  and `compare.spec.js`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4276,"specSha256":"f3b7fe1e8036e951cc8a213198b136ec41819e0743c7628ecbad6b0123bd5472","branch":"refs/heads/fix/team-roster-stats-read-one-club","head":"1221be982e1bcf449e4044531122353605e685ab","baseRef":"refs/heads/master","baseCommit":"1221be982e1bcf449e4044531122353605e685ab","sourceTree":"ed242aefe0acfd3049e1ba13e1b0cf345ce56a5d","absentOptional":[]} -->
