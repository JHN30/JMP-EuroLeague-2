# Feature: Original elimination-series tournament (E2000)

**From build-plan:** feature 34m
**Build attempt:** 1
**Type:** Feature
**Status:** verified
**Branch:** feature/original-elimination-series-tournament-e2000

## Goal

Make every page that presents the 2000-01 season (`E2000`) read correctly for its real format: four regular-season groups of six (10 games), the top four of each group into a 16-club knockout (round of 16 and quarterfinals best-of-three, semifinals and final best-of-five), no Top 16 and no Final Four. The Postseason bracket, stage names, series wins, the champion, the recorded semifinal replay and the Games, Home and Overview pages must follow that format instead of the modern single-table playoff model. Kinder Bologna (`VIR`) won the final 3-2 over Tau (`BAS`).

## What is wrong today (observed locally, `/api/health` reported `target: local`)

- **Postseason** (`/2000/postseason`): `eliminationSeries` is not a grouped family, so the page draws the modern bracket from the regular-season table: an invented "1 v 8, 4 v 5, 2 v 7, 3 v 6" playoff column ("Best of 5", "One game"), "Winner of 1 v 8" placeholders, a "Final Four" column and "Playoffs, Final Four" steps. Only four of the 15 recorded series are reachable and no champion is shown.
- **Games, Playoffs tab:** the round picker reads "Game 1" to "Game 8" because the source's round numbers mix stages (rounds 11-17 and 22: all six semifinal games are round 17, all five final games round 22). A reader cannot tell a first-round game from a final.
- **Overview:** the hero says only "Season finished": no champion and no road to the title. The phase text already describes the format correctly ("First round and Quarterfinals best-of-three; Semifinals and Final best-of-five").
- **Home:** the results list labels games "PLAYOFFS" with no stage.
- Standings (Regular Season) already reads correctly: group tables, "Playoff places" for places 1-4 within each group.

## Verified facts this leaf builds on

From the format registry ([season-format-registry.ts](backend/src/db/season-format-registry.ts)), `GET /api/seasons/2000/format`, `postseason-series` and `games?phase=PO` (recorded in the 34a inventory, section 5.1):

- Stages `RS` (4 groups of 6, 120 games, ranks 1-4 of each group to `PO`) and `PO` (38 games, `knockout`, rounds: First round winTarget 2, Quarterfinals 2, Semifinals 3, Final 3; no third-place game).
- `postseason-series` returns 15 series, all `PO`, with wins and games, no stage label. The stage is only on each game's `groupName`: `Group First Round 1`-`8` (plus `Group First Round Final` for game 140, the third LJU-PAO game), `Group Quarterfinal 1`-`4`, `Group Semifinal 1`-`2`, `Group Final`. The game's `roundNumber` and `roundName` do not identify the stage.
- Game counts by stage: 17 first round, 10 quarterfinal, 6 semifinal, 5 final (38).
- Outcomes: first round FOR 2-0 CIB, MAD 2-0 BUD, VIR 2-0 EST, LJU 2-1 PAO, OLY 2-0 VER, BAS 2-0 PER, TRE 2-0 BAR, AEK 2-0 ZAL; quarterfinals FOR 2-1 MAD, VIR 2-0 LJU, BAS 2-0 OLY, AEK 2-1 TRE; semifinals VIR 3-0 FOR, BAS 3-0 AEK; final VIR 3-2 BAS.
- Exception `replay` (AEK v BAS, semifinal game 2, first won by AEK in overtime, replayed after Tau's appeal). Locally that series has three games (162-164), all won by Tau; the original game and codes 160-161 are not recorded.

## In scope

- A pure bracket builder for the elimination family: round of 16 (8 ties), quarterfinals (4), semifinals (2) and final, built from `postseason-series` plus each game's `groupName` for the stage. Winners come only from series wins against each stage's win target; a tie leading but not clinched is not a winner; a stage is never taken from round numbers.
- Advancement is verified from the recorded clubs, not from labels: each quarterfinal, semifinal and the final must be played by the winners of exactly two ties of the previous stage. A tie that cannot be connected stays "Unverified" and its winner is not carried forward; the page says so and links to the recorded games. No club is shown in a slot only because of a regular-season position.
- Postseason page for the family: stage rail Regular season, Round of 16, Quarterfinals, Semifinals, Final (with date ranges from the games); a four-column bracket on wide screens, stacked by stage on narrow ones; each tie shows series wins ("2-1"), the win target ("Best of 3 / Best of 5") and the games under it; the champion panel with the final series score. No Top 16, Play-In, Final Four or "One game" wording; no third place or ranks below the final's two clubs (no official classification of semifinal losers is recorded).
- The replay exception shown as a note on the AEK-BAS semifinal series (from the registry's note), without inventing the annulled game's score or game code.
- Games (Playoffs): stage names for the knockout (Round of 16, Quarterfinals, Semifinals, Final) so a game card or the picker identifies its stage and series game, replacing the mixed "Game N" round picker for this family; Home results and the Overview defining-game text use the same stage name.
- Overview: the stage-aware hero names the champion and the road to the title as the four series the champion won, for this family.
- Browser spec and acceptance report. Larger-bracket layout checks at 320, 390, 768 and 1024 px (no horizontal overflow).

## Out of scope

- The separate FIBA SuproLeague (excluded and not in the data), qualifying (34n), other seasons, any pipeline, schema, Neon or deployment change, and the all-season acceptance (34o).
- Representing the annulled replayed game or recovering game codes 137-139, 141-144, 150, 153, 160, 161 (not proven to exist). If the source later records them, that is a separately reviewed pipeline change.
- Inventing home-court seeding, round of 16 pairings from the regular season, or semifinal-loser ranks.
- Changes to modern, grouped or single-table seasons' bracket, except through shared helpers staying behaviour-identical (guarded by the existing specs).

## Build loop

Per `blueprint/config.json` (`workflow.stepReview: feature`, no checkpoint commits): build the steps in order, run each step's narrow check, then one final pass (`npm run build`, `npm --prefix frontend run lint`, the specs below) and one review packet. `/complete` makes the single commit.

## Build steps

- [x] **1. Elimination bracket builder.** New pure module `frontend/src/postseason/eliminationBracket.js`, selected by `format.family === "eliminationSeries"`: classifies each series' stage from its games' `groupName` (via `games?phase=PO`, `limit=100`), builds 8/4/2/1 slots with winners from `stageWinTarget`, connects each later slot to the two earlier ties whose winners played it, orders ties so connected ties are neighbours, and returns `champion`, `connected`, `issues`, the replay note per series and `all`. Done when a Playwright spec that imports it and uses the live API asserts: 8, 4, 2 and 1 slots; the 15 outcomes above; the champion VIR 3-2 BAS; every later slot connected; and that a series one win short of the target, a missing stage label, a pairing that matches no previous winners and `games: []` each leave that slot unverified and the champion null.
- [x] **2. Bracket layout.** Extend [Bracket.jsx](frontend/src/postseason/Bracket.jsx) (or a sibling component it delegates to for this family) with the four-stage layout: round of 16 in column 1 over eight rows, quarterfinals, semifinals and final spanning the rows they join, connector lines as the existing `bk-in`/`bk-out` classes, stacked by stage with headings below `lg`. Reuse `Matchup` with series wins and `winTarget`. Done when `/2000/postseason` shows all 15 ties with their series scores and the champion, in a screenshot at 1200 px and 390 px, and `findPageOverflow` reports no offenders at 320, 390, 768 and 1024.
- [x] **3. Postseason page for the family.** In [PostseasonPage.jsx](frontend/src/postseason/PostseasonPage.jsx) route the family to the new builder (no remaining-games race, no Top 16 or Final Four queries), set the stage rail and summary line ("The season is over" with the champion; "Round of 16 matchups are not yet verified" style text when unverified), the "How the postseason works" text from the format's own stage descriptions and win targets, the unverified-connection notes with a link to the recorded Playoffs games, the replay note, and the champion panel without third place or ranks beyond the final's two clubs. Done when the page for `E2000` contains no "Final Four", "Top 16", "1 v 8", "One game" or "projection" text and the replay note names Tau and AEK, and the existing postseason specs for other families still pass.
- [x] **4. Stage names on Games, Home and Overview.** A shared helper maps a PO game's `groupName` to its stage name and series game number for this family. Use it for the Games Playoffs picker/cards, the Home results label and the Overview defining-game text; leave other families unchanged. Done when `/2000/games?phase=PO` lets the reader reach the First round (17 games), Quarterfinals (10), Semifinals (6) and Final (5) games by name, and the Home results and Overview show "Final" for the VIR-BAS games rather than "Game 8".
- [x] **5. Overview champion and road to the title.** Extend the stage-aware hero and "Road to the title" in [SeasonOverviewPage.jsx](frontend/src/season/SeasonOverviewPage.jsx) so for this family it names the champion and lists the four series the champion won (VIR: EST 2-0, LJU 2-0, FOR 3-0, BAS 3-2) with scores, built from the bracket model, with no "Top 16" step. Done when `/2000/overview` shows "Kinder Bologna" as champion and the four defeated clubs, and an unverified bracket shows no champion.
- [x] **6. Spec, regression and acceptance report.** Add `frontend/e2e/elimination-series.spec.js` (steps 1-5 plus layouts), run it with the grouped, postseason, standings, overview, home, games and responsive specs the shared pieces touch, and write `blueprint/reference/34m-acceptance.md` with the recorded evidence (series table, replay treatment, deferred items). Done when those specs pass against `target: local`, `npm run build` and `npm --prefix frontend run lint` pass, and screenshots of the Postseason page at 1200 px and 390 px have been inspected.

## Files / areas

- frontend/src/postseason/eliminationBracket.js (new), Bracket.jsx, PostseasonPage.jsx, Matchup.jsx and ChampionPanel.jsx only where the new slots need them.
- frontend/src/lib/seasonFormat.js (stage-name helper and replay note for this family), the Games, Home and Overview components that show a PO game's round or stage text.
- frontend/e2e/elimination-series.spec.js (new); blueprint/reference/34m-acceptance.md.
- No backend change (the registry, `format`, `postseason-series` and `games` endpoints already carry what is needed).

## Data / contracts

- Inputs: `format` (family `eliminationSeries`, stage `PO` `knockoutRounds` with win targets 2, 2, 3, 3, exceptions), `postseason-series`, `games?phase=PO`, `teams`.
- Stage of a series: the common stage prefix of its games' `groupName` (`First Round`, `Quarterfinal`, `Semifinal`, `Final`); `First Round Final` belongs to the first round. A series whose games disagree, or whose games lack a recognised prefix, is unverified.
- A series' winner is the club whose wins reach its stage's `winTarget`; both clubs at or above it, or neither, means no winner.
- A later slot's two clubs must be the winners of two distinct earlier ties of the preceding stage; otherwise it is shown unverified and nothing is advanced into it.
- The champion is the winner of the single final series only when the final is connected to two verified semifinal winners.

## Testing

- `frontend/e2e/elimination-series.spec.js` against the local API (`/api/health` `target: local`), by file name: builder assertions through the module import (as `grouped-three-groups.spec.js` does), Postseason page text and counts, Games stage access, Home/Overview labels and champion, replay note, and layouts at 320/390/768/1024.
- Regression: `grouped-pages`, `grouped-four-groups`, `grouped-three-groups`, `grouped-direct-final-four`, `grouped-thirty-two`, the postseason, standings, season overview and home specs, `responsive.spec.js`; `npm run build`; `npm --prefix frontend run lint`.
- Not claimed: the full suite, Neon/production, or a regulations audit beyond the 34a inventory.

## Notes for the AI

- Follow the 34i-34l pattern: a family-specific builder next to `groupedBracket.js`, the page choosing it by family, shared helpers staying behaviour-identical.
- Keep the replay wording factual and cause-neutral; never fabricate the annulled game.
- Project rules apply: club TV code as the short label, opt-in props for shared components, Playwright only against the local database, never read `.env`.
- Use the existing `bk-in` / `bk-out` connector classes and the 7.6rem row grid as the starting point; the first column needs eight rows, so size the grid rows from the slot count rather than the fixed four.

## Results

Verified on 2026-10-14 against the local database (`/api/health` reported `target: local`). Full evidence, series table and deferred items are in [34m-acceptance.md](../../reference/34m-acceptance.md).

- New `eliminationBracket.js` builder (stage from the game's group label, winners from series wins, ties connected only through recorded winners, champion only from a connected final), `EliminationGrid.jsx` four-column bracket, and the Postseason page, Games (browse by stage), Home, game header and Overview (champion and road to the title) for the elimination family.
- Checks run: `npx playwright test elimination-series.spec.js` (13 passed); a wide regression run (532 passed, one load-dependent `home-form-chart` 320 px failure that passes alone with and without these changes); `npm run build`; `npm --prefix frontend run lint`.
- Deferred: the annulled replayed semifinal game and missing game codes (a source/pipeline question), any classification of the semifinal losers, and the Overview hero naming the champion.
- Not run: the full suite and Neon/production checks.
