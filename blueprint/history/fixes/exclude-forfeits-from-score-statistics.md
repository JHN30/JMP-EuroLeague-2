# Fix: Exclude forfeits from score-based statistics

**Type:** Fix
**Status:** verified
**Branch:** fix/exclude-forfeits-from-score-statistics

## The problem

E2001 game 264 (Maccabi 2-0 over Ulker) and E2003 game 200 (Maccabi 20-0 over
Pamesa Valencia) are recorded forfeits: the score is awarded, not played, and
there is no box score. The standings and the win/loss record rightly count the
result, but several pages also treat the awarded score as points scored on court.
Reported on the Overview; a code and page sweep found the same cause in more
places. Each "uses scores" place below was checked against the code, and the
ones marked "seen" were also read from the running page.

| Page | Effect of the forfeit's score | Evidence |
| --- | --- | --- |
| Overview, Defining games | Picked as "Lowest-scoring game" (2 and 20 against a real minimum of 113); could also win "Closest game" or "Biggest blowout" | reported; local data |
| Overview, scoring-trend chart | Averaged into its round's points per team | `roundScoringSeries` |
| Team page, Games tab | Margin strip draws a +20 bar and the average margin includes it (E2003 Maccabi shows +8.6 with it) | seen |
| Compare, Trends | Last-5 "Scored/Allowed" averages and the points and margin charts include 20-0 / 0-20 (E2003 Maccabi last 5 "scored 72.6") | seen |
| Head to head | "Avg margin", "Total points scored" and the meeting-margin chart include it for any pair that met in the forfeit | code (`HeadToHeadPage`) |
| Home, leader trend | Point-margin trend of a club that played a forfeit would include it | code (`LeaderTrend`) |
| Head to head, Notable meetings | Listed the 20-0 as the "Biggest margin" meeting | seen on the page |
| Result lists (Team Games results, Compare form, Home recent results) | Show "20-0" like any final, with no forfeit label | seen |

Not affected, checked: standings and records of wins and losses, streaks and form
letters (a recorded win or loss is correct), advanced ratings (already use the
real games), Records (top lists of box-score values, so a forfeit cannot rank),
player pages (no player rows exist for a forfeit). The empty team totals of the
forfeit clubs are a separate pipeline problem, not part of this fix.

## The fix

Add one small predicate in `frontend/src/lib/forfeit.js` (`isForfeit(game)` is
true for `gameStatus === "Walkover"`) and use it at the sites above:

- Leave forfeits out of every average, sum, margin bar, chart point and
  highlight pick built from game scores: Overview picks and chart, Team Games
  margin strip and average margin, Compare trends, Head to head averages, total
  points and margin chart, Home leader trend.
- Keep them in win/loss records, series records ("1-0 Maccabi"), streaks, form
  letters, the list of results and the meeting list, since those are the recorded
  result.
- Wherever a result list shows a forfeit's score, label it "Forfeit" in the way
  the game card already does, so "20-0" is not read as a real score. A chart or
  strip that omits a forfeit says so in one short line only where a viewer would
  otherwise see a missing round or game.

The predicate is the only new abstraction; it replaces the same string test at
about eight call sites. Do not change `fetchAllPlayedGames`, the standings or the
API. Seasons without a forfeit must render exactly as before.

## Build steps

1. [x] **Predicate and Overview.** Add `lib/forfeit.js`; filter forfeits in
   `pickDefiningGames` and `roundScoringSeries`.
   **Done when:** the E2001 and E2003 Overview lowest-scoring game is a real game
   (combined score at least 113), the chart's forfeit round averages its real
   games, E2008's defining games are unchanged, and build and lint pass.
2. [x] **Team Games tab and Home trend.** Filter forfeits from the margin strip,
   its average margin and the Home leader trend.
   **Done when:** E2003 Maccabi's Top 16 Games tab shows its margins without the
   +20 bar and with the average recomputed over real games (the forfeit game is
   still listed in results), and E2001's the same for its forfeit.
3. [x] **Compare trends and Head to head.** Filter forfeits from trend averages
   and charts and from Head to head's average margin, total points and margin
   chart, keeping the series record and meeting list.
   **Done when:** Maccabi's last-5 scored/allowed averages and Maccabi v Pamesa
   Valencia (E2003) and Maccabi v Ulker (E2001) Head to head totals and averages
   exclude the forfeit while the series record still counts it.
4. [x] **Forfeit label in result lists.** Show "Forfeit" beside the awarded score
   on Team Games results, Compare form and Home recent results.
   **Done when:** the three lists read "Forfeit" for game 200 and 264 and nothing
   changes for other games; `npm run build` and frontend lint pass.

## Verify

Add focused checks to `grouped-thirty-two.spec.js`: the E2001 and E2003 Overview
omit the forfeit from Defining games (no highlight under 100 combined points);
the Team Games tab, Compare trends and Head to head figures differ from the
forfeit-inclusive values; results show the label; E2008 is unchanged. Run
`grouped-pages`, `grouped-direct-final-four`, `grouped-thirty-two`,
`overview-layout`, `team-overview-layout`, `compare`, `compare-team-layout`,
`head-to-head`, `head-to-head-layout`, `home-layout` and `team-stats-null` specs,
then build and lint. By hand: `/2003/overview`, `/2003/teams/TEL?phase=TS` (Games
tab), `/2003/compare?teamA=TEL&teamB=PAM&phase=TS` (Trends) and the same pages for
E2001 with TEL and ULK.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5635,"specSha256":"6c3de7e84ba0d7ccd5a837020b5af7d2f16430f9dcef36695f76cf811d1809de","branch":"refs/heads/fix/exclude-forfeits-from-score-statistics","head":"009af3f7f4bb48a1b3af12a4bb59c1126f103c10","baseRef":"refs/heads/master","baseCommit":"009af3f7f4bb48a1b3af12a4bb59c1126f103c10","sourceTree":"de152fe71cdee6acccc5b7623ca3aaeab1209a9b","absentOptional":[]} -->
