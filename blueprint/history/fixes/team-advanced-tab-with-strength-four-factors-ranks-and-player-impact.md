# Fix: Team Advanced tab with strength, four factors, ranks and player impact

**Type:** Fix
**Status:** verified
**Branch:** fix/team-advanced-tab-with-strength-four-factors-ranks-and-player-impact

## The problem

The team page's Advanced tab (`/:season/teams/:clubCode`, Advanced, `teams/TeamAdvancedSection.jsx`) shows four things:
the ratings chart, four large split cards (home, away, last 5, last 10), "How games unfold" (time leading, clutch
points, eight facts) and the best lineups. The user finds much of the data missing or poorly shown:

- **Unused data the API already returns or has:** each club's `app_standings_stats` row carries SRS, strength of
  schedule (SOS), strength of victory (SOV), opponent-adjusted offensive, defensive and net ratings, ratings and pace
  relative to the league, Pythagorean wins, MOV, possessions, the four factors for and against, true shooting and assist
  ratio. None of it is on the tab; the trend's `srs` and `adjNetRating` are sent and never read.
- **No league context:** no number on the tab has a rank or a league average, so "Offense 112.4" doesn't say whether
  that is good.
- **Splits are poorly shown:** four tall cards, about 1,000px on a phone, that can't be read across, and no season row
  to compare against.
- **No player impact:** the club's on/off and RAPM figures (already in `players-advanced`) are only numbers in the
  roster table, with nothing showing who drives the team's results.

## The fix

The tab keeps its scope tabs (Regular season, Top 16, Postseason, All games, as offered). The sections, top to bottom:

### 1. Team strength (new)

- **Headline row:** four tiles: net rating, adjusted net rating, SRS and SOS. Each shows its value and its league rank
  ("4th of 18"), tinted with `rankTier` (green top third, red bottom third).
- **Full table below the tiles:** grouped rows, each with the club's value, its league rank and the league average:
  - **Ratings:** offensive, defensive, net; adjusted offensive, adjusted defensive, adjusted net; relative offensive
    and relative defensive (against the league).
  - **Schedule and luck:** SRS, SOS, strength of victory; record against Pythagorean wins, with the difference shown
    as "+1.4 wins above expected" or "below".
  - **Tempo:** pace, relative pace, possessions per game, MOV.
- **Source and ranking:** all of it comes from the scope's latest-round standings
  (`getAdvancedStandings(seasonCode, { scope })`, query key shared with the overview's league profile). Ranks use
  `rankOf`, with the direction set per row (lower is better for defensive ratings; neutral for pace, relative pace and
  possessions, which get a rank but no tint).
- **Disconnected schedule:** when the club's row has `connected` false (the schedule doesn't yet link every club),
  SRS, SOS, SOV and the adjusted ratings show "—" with one note under the table explaining why.

### 2. Four factors (new)

- **One table, two ends of the floor:** Offense (eFG%, turnover %, offensive rebound %, free throw rate) and Defense
  (opponents' eFG%, opponents' turnover %, defensive rebound %, opponents' free throw rate).
- **Columns:** value, rank, league average and a bar placing the club between the league's worst and best for that
  factor.
- **Shooting and passing rows under it:** true shooting % and assist ratio, with rank and league average.
- **Relation to the overview:** the overview's league profile shows a compact version of the same ten numbers; this is
  the full view with the league context.

### 3. Ratings through the season (kept)

The chart and its averages are unchanged.

### 4. Splits (reworked)

- **One table replaces the four cards.** Rows: Season, Home, Away, Last 5, Last 10. Columns: games, record, MOV, ORtg,
  DRtg, net (value plus the existing diverging bar), pace.
- **The Season row** comes from the club's standings row and is set apart as the reference.
- **Each split's net rating** gets a muted "+3.2 vs season" difference.
- **Phones:** below 640px the table keeps games, record, net and its bar; MOV, ORtg, DRtg and pace go under the row
  as a muted line. No sideways scroll.
- **Empty splits:** a split with no games shows "—" across, as the cards do today.

### 5. How games unfold (kept, ranked)

- **Same layout:** the time-in-game bar, the clutch bar and the facts.
- **New fact:** clutch margin, the points for minus the points against in clutch time. A clutch net rating would need
  clutch possessions, which the data doesn't have.
- **Ranks:** each fact gets its league rank in muted text. Ranked: time leading %, lead changes per game, largest
  lead, longest run, runs of 6+, clutch margin, assisted FG %, possession length (neutral, no tint).
- **Backend:** `getGameFlow` (`backend/src/db/season-advanced.ts`) also returns the needed fields for all clubs:
  `clutchSeconds`, `clutchPointsFor`, `clutchPointsAgainst`, `runs6Plus`, `longestRun`, `tiesPerGame`,
  `avgPossessionSeconds` and `assistedFgPct`. The tab reads `getGameFlow(seasonCode, { scope })`. The Standings page,
  which uses the same endpoint, ignores the extra fields.

### 6. Player impact (new)

- **Who drives the results:** the club's players with at least 100 on-court minutes in the scope, as two charts side
  by side from lg, stacked below:
  - **On/off:** a diverging bar per player for the net rating difference (team net with the player on minus off), labelled
    with the on and off net ratings and on-court minutes. Sorted by the difference.
  - **Win shares:** a stacked bar per player, offensive and defensive win shares, sorted by the total, with the team's
    total in the header.
- **RAPM:** a muted line under each on/off bar gives RAPM (offense / defense). RAPM is whole-season ("all" scope), and
  the note says so.
- **Data:** `getTeamPlayersAdvanced(seasonCode, clubCode, { scope })`, the endpoint the roster table already uses (the
  same query key). Names link to the player page, as the roster does.
- **States:** a loading skeleton; an error with Retry; and when nobody has reached the minimum yet, "No player has
  100 on-court minutes in this stage yet." The roster table keeps its numbers. This is the picture of the same data,
  not a replacement.

### 7. Best lineups (kept)

Unchanged, including its 100, else 50, possession fallback.

### Loading and errors

- **Strength and four factors** come from the standings query. While it loads, a skeleton. If it fails, an error with
  Retry in their place; the rest of the tab still shows.
- **Ranked game-flow facts:** if the game-flow query fails, the facts show without ranks.
- **Club missing from the standings rows:** no ranks, "—" for the league columns.

Must not change: the overview's league profile, the Standings page, the roster table, the lineups, the ratings chart,
the other team tabs.

### Changes found during implement

- **Club missing from the standings rows:** strength and four factors say "No league comparison for this club in this
  stage yet." (they have no values without the row); the splits table then has no season row.
- **Time leading's rank** sits beside the leading share in the time bar, not as a tenth fact repeating the number.
  Runs of 6+ are ranked per game played (the count alone favours clubs with more games). Possessions per game in the
  facts stays unranked: the strength table already ranks it.
- **"Wins vs expected" is "Wins above expected"**, a signed number: a league average of "0.0 above" read oddly.
- **Assist ratio** is the share of made field goals that were assisted (a fraction in the data), as the game page's
  four factors and the Standings page say, not assists per 100 possessions.
- **Win shares** list players with 100 minutes played; **on/off** lists those with 100 on-court minutes.
- **Shared query keys:** the standings use the overview's (`advanced-standings-team-overview`), the game flow the
  Standings page's (`game-flow`), and player impact the roster's (`team-players-advanced`, by scope).
- **From review:** the league column showed "0.0" for the figures that measure clubs against each other (net, adjusted
  net, the "vs league" rows, SRS, schedule, pace vs league, margin), which read as missing. They now show a muted "0"
  whose tip gives the reason, and a **Best** column (the league's top figure, hidden below 640px) gives every row a
  comparison. The splits' column headers and the game-flow facts got hover tips.
- **Tests replaced:** the two split-card tests became splits-table tests (the season row, the ratings columns from
  640px, the ratings line under each name below it, "—" for a split with no games). The facts test now counts nine
  facts with ranks and the clutch margin.

## Build steps

- [x] 1. **Backend.** `getGameFlow` returns the extra pbp fields.
  Done when: `cd backend && npm run build` passes and `/api/seasons/E2025/advanced/game-flow?scope=RS` returns them
  for every club.
- [x] 2. **Team strength and four factors.** A definitions file (`teams/teamAdvancedDefs.js`: rows, directions,
  formats) and the two sections in `TeamAdvancedSection.jsx`, from the standings query, with ranks, league averages
  and the disconnected note.
  Done when: lint passes, and at 1440px Partizan's Advanced tab (2025-26) shows the four tiles and both tables with
  ranks.
- [x] 3. **Splits table and ranked game flow.** Splits become one table with the season row. The facts get their
  ranks and the clutch margin.
  Done when: lint passes; at 390px the splits table has no sideways scroll; the facts show ranks.
- [x] 4. **Player impact.** The on/off and win-shares charts with their states.
  Done when: lint passes; at 1440px the two charts sit side by side, sorted, with names linking to player pages.
- [x] 5. **Browser checks.** Update `team-advanced-layout.spec.js`:
  - Replace the split-cards test with a splits-table test.
  - Add tests for the strength tiles, the tables' ranks and league averages, the disconnected note, the player-impact
    charts and their empty, loading-failing and standings-failing states.
  - No sideways scroll at 320, 390, 768, 1024 and 1440px.

  Done when: `team-advanced-layout.spec.js`, `api-team-advanced.spec.js` and `responsive.spec.js` pass against the local
  database.

## Verify

- `npm run build` (root) and `cd frontend && npm run lint` pass.
- The three specs above, after `/api/health` reports `"target":"local"`.
- By hand at 1440px and 390px: Partizan in 2025-26, Advanced.
  - Check the strength tiles and tables against the Standings page's advanced view.
  - Switch scopes and confirm every section follows.
  - Check the overview's league profile and the Standings page are unchanged.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10669,"specSha256":"1766764cad04179d2ccb22f215892ffd0889dc4c74ced45dec6d9f4781435b55","branch":"refs/heads/fix/team-advanced-tab-with-strength-four-factors-ranks-and-player-impact","head":"b90581cbf0df5decaf19a7911aa63f256b1875cc","baseRef":"refs/heads/master","baseCommit":"b90581cbf0df5decaf19a7911aa63f256b1875cc","sourceTree":"dd2d33388ee56aaff5c2eefcb7959f9ac35861ac","absentOptional":[]} -->
