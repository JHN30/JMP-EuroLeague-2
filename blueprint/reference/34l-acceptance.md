# Feature 34l: Thirty-two-team season acceptance

## Recorded evidence (step 1)

Collected on 2026-10-14 from the existing local API (`/api/health` reported
`target: local`) through `format`, `phases/RS|TS/standings`, `games?phase=FF`,
`games/264`, `team-stats`, `advanced/standings` and `season-stats`, plus local
browser screenshots and text reads of the pages below. No database write,
pipeline command, Neon access or real `.env` read was involved. These are
observed curated application records, not a new independent regulations audit.

### E2001 structure

- Regular season: four groups A-D of eight (14 games each, 224 games); the top four
  of each group are the Top 16 field. There is no cross-group place, so no
  best-sixth rule applies.
- Top 16: four groups E-H of four (6 games, 48 games). Group winners: E TRE, F VIR,
  G PAN, H TEL.
- Final Four: three games, no third-place game (`thirdPlaceGame: false`). Semifinal
  A TRE 82-90 VIR (E1 v F1); semifinal B PAN 83-75 TEL (G1 v H1); final PAN 89-83
  VIR. Both semifinals pair recorded group winners. Podium that can be
  established: champion PAN, runner-up VIR; TRE and TEL are Final Four losers with
  no recorded third/fourth classification. Mismatches with the inventory: none.
- Forfeit: Top 16 game 264 (group H), Maccabi (TEL) 2-0 over Ulker (ULK),
  `Walkover`, `played` true; its box score has zero period scores and null team
  stats.

### Current treatment before this leaf

- **Postseason:** correct already (the 34k direct-to-Final-Four layout): two
  semifinals, the final, no third-place slot, the champion panel lists TRE and TEL
  under "Final Four" with no third/fourth label.
- **Standings, Home, Overview, Teams:** four groups of eight and four of four with
  the "Top 16 places" cutoff, 32 clubs on Teams, the stage description "no
  third-place game". No 24-club wording was found.
- **Forfeit statistics (new finding, E2001 and E2003):** the pipeline's per-phase
  team totals (`team-stats?phase=TS`) have all-null measures for the two clubs of
  the forfeit (E2001 TEL, ULK; E2003 TEL, PAM) although `gamesPlayed` is 6, because
  one game with no values leaves their sums empty; 14 of 16 Top 16 clubs have
  values. Standings count the result (pf/pa include 2-0 / 20-0) and the advanced
  ratings use 5 games. On the pages this leaves "Scored - / Allowed -" on the team
  snapshot, empty per-game rows on the team Statistics tab, the two clubs missing
  from team Leaders boards and compare statistics, all without a word. The totals
  come from a precomputed table, so the app cannot recompute them; correcting them
  is pipeline work and stays out of scope.

## Results

Verified on 2026-10-14 against the local database (`/api/health` reported
`target: local`). No Neon, pipeline, database write or deployment was involved.

Changes:
- No third place (step 2): no code change was needed. The 34k direct-to-Final-Four
  bracket already shows two semifinals, the final, champion and runner-up, labels
  the two semifinal losers "Final Four", and has no third/fourth wording for E2001.
  The new spec locks this in (and E2002-E2015 third place is covered by the
  existing specs).
- Forfeit statistics (step 3): the missing team totals of the forfeit's clubs
  (E2001 TEL, ULK; E2003 TEL, PAM) are now explained. New `useForfeitClubs` and
  `ForfeitStatsNote` name the clubs from the format's walkover exception and the
  game's teams; the note appears on the team Overview and Statistics tabs for the
  affected club only, on team Leaders (cards and board), and on team Compare
  statistics for the affected club. It does not appear for other clubs, other
  phases or seasons without a forfeit. The totals themselves are not corrected:
  they come from the pipeline's precomputed table, so a real fix (recomputing
  those sums without the forfeit) is separate, reviewed pipeline work.
- Remaining pages (step 4): Standings, Home, Overview, Teams (32 clubs), Games and
  Compare needed no change; no best-sixth marker appears for E2001.

Checks run:
- `npx playwright test grouped-thirty-two.spec.js`: 10 passed (E2001 bracket,
  podium and no third place, Postseason copy, Standings/Home/Teams/Overview, the
  2-0 forfeit, the stats note for E2001 and E2003 clubs and its absence elsewhere,
  and four widths).
- Regression run over the grouped specs, postseason, leaders, compare, team overview
  layout, `team-stats-null`, historical era pages, competition context and
  responsive specs: 337 passed.
- Screenshots inspected: E2001 Postseason and the E2003 Maccabi team page note.
- `npm run build` and `npm --prefix frontend run lint`: passed.

Not run: the full suite, Neon/production checks, and visual inspection of the
Leaders and Compare notes or of narrow widths beyond the overflow check.

## Deferred to separate fixes

Reported after implementation (2026-10-14), both affecting E2001 game 264 and E2003
game 200, and neither fixed in 34l:
- **Forfeit team totals:** the pipeline's Top 16 team totals are empty for the clubs of
  the forfeit. The pages now explain it; the totals need a pipeline recomputation
  over the real games only.
- **Overview "Defining games":** the forfeits are picked as the lowest-scoring game
  (a 2-0 and a 20-0 score are not real scoring). Games with a `Walkover` status
  should be excluded from the scoring highlights. This was reported from the page;
  it was not reproduced or measured here.
