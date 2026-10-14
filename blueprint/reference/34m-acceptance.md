# Feature 34m: original elimination-series tournament (E2000) acceptance

## Recorded evidence

Collected on 2026-10-14 from the existing local API (`/api/health` reported `target: local`) through `format`,
`postseason-series`, `games?phase=PO`, `teams` and local browser screenshots. No database write, pipeline command,
Neon access or real `.env` read was involved. These are observed curated application records, not a new independent
regulations audit.

### Format

Stages `RS` (four groups A-D of six, 120 games, ranks 1-4 of each group to `PO`) and `PO` (38 games). The format's
knockout rounds: first round and quarterfinals win target 2 (best of three), semifinals and final win target 3 (best of
five). No Top 16, Final Four or third-place game.

### Series (all `PO`; the stage is read from each game's group label, not its round number)

| Stage (games) | Recorded series |
| --- | --- |
| Round of 16 (17) | FOR 2-0 CIB, MAD 2-0 BUD, VIR 2-0 EST, LJU 2-1 PAO, OLY 2-0 VER, BAS 2-0 PER, TRE 2-0 BAR, AEK 2-0 ZAL |
| Quarterfinals (10) | FOR 2-1 MAD, VIR 2-0 LJU, BAS 2-0 OLY, AEK 2-1 TRE |
| Semifinals (6) | VIR 3-0 FOR, BAS 3-0 AEK |
| Final (5) | VIR 3-2 BAS (champion Kinder Bologna) |

Each later series is played by the winners of two earlier series. "First Round Final" (game 140) is the third LJU-PAO game
and belongs to the round of 16. The source's round numbers mix stages (rounds 11-17 and 22), so they are never used.

### Replay

AEK v Tau semifinal game 2 was replayed after Tau's appeal (registry exception). Locally the series has three recorded
games (162-164), all won by Tau. The page shows the registry's note on that series and does not invent the annulled game's
score or code. Game codes 137-139, 141-144, 150, 153, 160, 161 remain absent and unproven.

### Current treatment before this leaf

- Postseason drew the modern single-table bracket: invented "1 v 8, 4 v 5, 2 v 7, 3 v 6", "One game", "Final Four" and
  "Winner of 1 v 8" placeholders, four reachable series and no champion.
- Games Playoffs showed a "Game 1" to "Game 8" round picker that mixed stages.
- Overview showed no champion or road to the title; Home labelled every knockout game "Playoffs".

## Results

Verified on 2026-10-14 against the local database (`/api/health` reported `target: local`).

Changes:
- `eliminationBracket.js` (new): the pure builder. Stage from the game's group label; winners from series wins against each
  stage's win target; a later series counts only when played by the winners of two earlier series, otherwise it is
  unverified and carries no winner; the champion is the connected final's winner. Also `eliminationStageLabel` for stage
  names. A connected bracket is ordered so each tie sits beside the two that feed it.
- `EliminationGrid.jsx` and `index.css`: the four-column, eight-row bracket (`--c`, `--r`, `--s` cell variables), stacked
  by stage below 1024 px, connector lines only while connected. (Not named `EliminationBracket.jsx`: it would collide with
  the builder on a case-insensitive file system.)
- `PostseasonPage.jsx`, `MatchupDetail.jsx`, `ChampionPanel.jsx`: the family route with its own steps (Regular season,
  Round of 16, Quarterfinals, Semifinals, Final), summary line, notes with a link to the recorded games, help text, the
  replay note in a series' detail, and "Won the final series ... 3-2" wording. No Top 16, Final Four, third place or ranks
  below the final.
- `FixturesPage.jsx`, `GameCard.jsx`: the Playoffs tab of this family is browsed by stage with game counts
  (17, 10, 6, 5) and a stage caption on each card; other seasons keep the round strip.
- `RecentResults.jsx`, `MatchupHeader.jsx`, `SeasonOverviewPage.jsx`: the stage name on Home cards, the game page header and
  Overview defining games; Overview names the champion (from the bracket model) and the four series on the road to the title
  with their stage and series score.

Checks run:
- `npx playwright test elimination-series.spec.js`: 13 passed (stage from label, the 15 outcomes and champion, connections,
  replay note, bad-evidence cases, Postseason text and counts, Games by stage, Home and game page stage names, Overview road
  to the title, layouts at 320, 390, 768 and 1024).
- A wide regression run over the elimination, grouped, postseason, historical, competition-context, excluded and cancelled
  season, overview layout, home, games layout, game header and detail layout, responsive and standings specs: 532 passed and
  one failure in `home-form-chart.spec.js` at 320 px (x-axis labels outside the plot), which passes when run alone with and
  without these changes, so it is a load-dependent flake rather than a regression from this leaf.
- `npm run build` and `npm --prefix frontend run lint`: passed.
- Screenshots inspected: E2000 Postseason at 1280 and 390 px, Games Playoffs, Overview.

Deferred / not run:
- The annulled replayed game and the missing game codes (a pipeline question).
- Any classification of the semifinal losers (none recorded), so no third or fourth place is shown.
- The Overview hero still reads "Season finished"; the champion is named in "Road to the title".
- The full suite, Neon/production checks, and visual inspection of other seasons beyond the regression specs.
