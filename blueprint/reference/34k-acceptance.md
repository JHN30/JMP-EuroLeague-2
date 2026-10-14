# Feature 34k: Top 16 directly to Final Four acceptance

## Recorded evidence (step 1)

Collected on 2026-10-14 from the existing local API (`/api/health` reported
`target: local`) through `format`, `phases/RS/standings`, `phases/TS/standings`,
`games?phase=FF`, `postseason-series`, `games/200` and `games/200/box-score`, plus
local browser screenshots of the pages below. No database write, pipeline command,
Neon access or real `.env` read was involved. These are observed curated
application records, not a new independent regulations audit.

Both seasons: three RS groups A-C of eight (14 games), four Top 16 groups D-G of
four (6 games), no playoff round, four Final Four games (two semifinals, the
championship and the third-place game).

### Best sixth-placed club

| Season | Sixth-placed clubs | Recorded Top 16 sixth |
| --- | --- | --- |
| E2002 | A PAU 6-8; B SIE 6-8; C MAD 6-8 | SIE (Top 16 group E, winner) |
| E2003 | A AEK 6-8; B ZAL 6-8; C WRO 6-8 | ZAL (group G, place 3) |

### Top 16 group winners and Final Four

| Season | Group winners | Semifinals | Final | Third place |
| --- | --- | --- | --- | --- |
| E2002 | D CSK, E SIE, F TRE, G BAR | SIE 62-65 TRE (E1 v F1); BAR 76-71 CSK (G1 v D1) | BAR 76-65 TRE | SIE 79-78 CSK |
| E2003 | D CSK, E FOR, F SIE, G TEL | SIE 102-103 FOR (F1 v E1); TEL 93-85 CSK (G1 v D1) | TEL 118-74 FOR | SIE 94-97 CSK |

Podiums (1st-4th): E2002 BAR, TRE, SIE, CSK; E2003 TEL, FOR, CSK, SIE. Every
semifinal pairs two recorded group winners, with D/G against E/F in both seasons.
Source labels are `Group SEMIFINAL A/B`, `Group THIRD PLACE GAME` and `Group
CHAMPIONSHIP GAME`. `postseason-series` has four single-game FF entries per season
and no playoff series. Mismatches with the inventory: none.

### E2003 forfeit

Game 200 (Top 16 group G, round 18): Maccabi (TEL) v Pamesa Valencia, `played`
true, status `Walkover`, 20-0, matching the format's `walkover` exception. Its
box score returns zero period scores (0 in all four quarters for both sides) and
empty team stats; the other seven round-18 games are `Confirmed`.

### Current treatment before this leaf

- **Postseason** (`/2003/postseason`): the page does not know the
  `top16ToFinalFour` family and draws the modern single-table bracket with an
  invented "1 v 8, 4 v 5, 2 v 7, 3 v 6" playoff column, "Best of 5" heading, empty
  semifinals and "Winner of 1 v 8" placeholders, taken from regular-season
  positions that do not exist in this format, and no Top 16 stage.
- **Standings, Top 16** (group G): the band and KPI read "Playoff places" and
  "Playoff cutoff" although the group winner goes to the Final Four. The rest of
  the table (group sections, official order, Q flag) is correct.
- **Game 200 page:** the header shows "FINAL" with 20-0, the Overview shows a
  "Score by period" table of zeros, and no sentence says it was a forfeit. Player
  sections say statistics are not available and key stats show dashes.

## Results

Verified on 2026-10-14 against the local database (`/api/health` reported
`target: local`). No Neon, pipeline, database write or deployment was involved.

Changes:
- `groupedBracket.js`: the `top16ToFinalFour` family joins the grouped bracket
  families with `direct: true`, no playoff slots, and semifinals confirmed only when
  all four semifinalists are recorded Top 16 group winners (otherwise unverified).
- `Bracket.jsx` / `PostseasonPage.jsx`: a two-column layout (Final Four from the
  Top 16 group winners, then the Final and third place), no quarterfinal column, no
  best-of wording, stage line "the winner of each group reaches the Final Four", and
  help copy "no quarterfinals". The Playoffs step is omitted from the rail.
- `StandingsPage.jsx`: the Top 16 band and cutoff read "Final Four places" and
  "Final Four cutoff" (destination taken from the qualification rule).
- Forfeit: the registry's `walkover` exception now records its stage (`TS`; a
  one-line backend registry and type change, not in the spec's expected scope but
  required to show a stage note without guessing). `competitionNotes` shows, on the
  game page, a note "Recorded forfeit, awarded 20-0 ... no box score or performance
  data exists", and on Standings/Games/Home for the Top 16 a stage note. The note
  does not assert a cause. The game page header and fixture card read "Forfeit"
  instead of "Final", and the period-score table is replaced by "Period scores were
  not recorded: this game was a forfeit."
- No other gap found: Home, Overview (two games on the road to the title), Games,
  Leaders, Compare and the 34j best-sixth marker work unchanged.

Checks run:
- `npx playwright test grouped-direct-final-four.spec.js`: 14 passed (forfeit note
  logic, per-season bracket, unverified cases, Postseason page, Standings labels,
  best-sixth marker, Home, Overview, the forfeit on game page/fixtures/Standings,
  E2002 without a forfeit note, and four widths).
- A wide regression run over the grouped, postseason, historical, competition-context,
  excluded and cancelled season, game box score/detail/header, games layout and
  responsive specs, with the team layout specs those pull in: 374 passed.
- Screenshots inspected: E2003 Postseason and the game 200 page.
- `npm run build` and `npm --prefix frontend run lint`: passed.

Not run: the full suite, Neon/production checks, and visual inspection of E2002 and
of narrow widths beyond the overflow check.
