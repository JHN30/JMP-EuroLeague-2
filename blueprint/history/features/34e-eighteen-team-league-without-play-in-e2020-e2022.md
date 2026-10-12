# Feature: Eighteen-team league without Play-In (`E2020`, `E2022`)

**From build-plan:** feature 34e
**Build attempt:** 1
**Branch:** feature/eighteen-team-league-without-play-in-e2020-e2022
**Status:** verified

## Goal

Verify and adapt the existing explorer for both 18-club, 34-game regular seasons without Play-In. Reuse 34d's direct-top-eight bracket and race path, preserve actual official results and statistics, and make relevant source-backed disciplinary context visible.

## In scope

- Both E2020 (2020-21) and E2022 (2022-23), independently checked against local application data and official/source-backed evidence.
- One RS table with 18 clubs and 34 games per club; ranks 1-8 go directly to best-of-five quarterfinals, followed by Final Four with third place. No PI or TS stage, band, placeholder, finish category or explanation. Registry entries already use `singleTable(18)`; the larger club count does not introduce a different bracket structure.
- Preserve quarterfinal seeds 1v8, 2v7, 3v6, 4v5 and verify recorded semifinal paths for each season. Stage and unordered club pair identify a series, not a source group label or the presence of its top seed alone. A 2-0 or 2-1 lead cannot advance a club; three wins can. Verify final, third place, champion and finish categories from confirmed eligible results.
- Schedule, final official standings and historical snapshots, race playback, cumulative/source rounds, qualification samples, existing statistics and loaded-season Records/career/head-to-head. Check every affected page for both seasons: Home, Overview, Standings, Games/Game Detail, Teams/Team Detail, Players/Player Detail, Leaders, Compare/head-to-head, Postseason and Records/career.
- Source-backed disciplinary verification. E2022 Madrid-Partizan quarterfinal Game 2 ended with 1:40 remaining and an official 80-95 Partizan win. Preserve this result and the existing recorded performance data, show a short ended-early note in Game Detail and the selected postseason matchup, and verify it counts as one Partizan series win rather than a clinched series. Player sanctions do not change a game score or advancement rule by themselves.
- E2020 COVID rules were modified retroactively to permit rescheduling affected games. Verify final played/rescheduled outcomes against the local rows; do not reinstate superseded forfeits or infer a final ruling from original scheduled dates. Record the source evidence and remaining uncertainty in the inventory/acceptance report.
- Approved amendment: explain E2022 PAN's two-win deduction beside final RS standings, Home's standings summary and PAN Team Detail; annotate only RS source round 34 in race playback. Preserve 9 credited wins, 11 played-result wins and unchanged individual/team statistics and records.
- Preserve safe API validation, bounded responses, competition/season identities, query scoping, nullable values and honest coverage states. Loading, empty, unavailable, partial and unexpected-error states remain applicable even if actual season data is complete. Missing rows or unavailable format metadata cannot establish completion, a winner or a qualification claim.
- Preserve existing URLs, both themes, keyboard/focus conventions and layouts at 320, 390, 768 and 1024px. Keep 34d and modern E2023-E2026 regression behavior.

## Out of scope

E2019 cancellation, E2021 Russian-club exclusions, grouped eras and qualifiers, a new bracket/tiebreaker/prediction engine, player-sanction tracking or a disciplinary database, new statistical formulas or career leaderboards, schema/pipeline changes, stored-data correction/imports, dependencies or runners, CI setup, older-season Neon publishing, paid storage changes, push and deployment.

## Build loop

Approve this spec before `/implement`. Use the frozen branch above and keep each step working. Review the finished feature as one packet (`workflow.stepReview: feature`); checkpoint commits are disabled. `/complete` owns the final work commit and archive. Do not spawn an Astra subagent. No delegation is expected; if an applicable later gate requires a child, use the user's requested 6.1 Sol model.

## Build steps

1. [x] Verify the two seasons and freeze the ruling-to-game evidence.
   - Before local API/data verification, confirm `/api/health` reports `target: local`. Compare each season's format, paginated played fixtures, official latest RS table and selected historical snapshots, source rounds, PO/FF pairs, scores/wins and coverage against inventory section 5.8 and primary sources.
   - Expected inventory baseline for each: 306 RS + 18 PO + 4 FF played games (328 total), 18 RS clubs with 34 games each; PO source rounds 35-39, FF 40-41. Expected champions are IST/Anadolu Efes for E2020 and MAD/Real Madrid for E2022. These are acceptance expectations to verify, not new executable constants.
   - Confirm E2020 PO group labels A-D do not become seed/bracket identities. Find the exact existing local source game code for Madrid-Partizan Game 2 by season, clubs, playoff game order and official date; never guess its code from an offset.
   - Corroborate the E2022 ended-early outcome and E2020 amended COVID/rescheduling decisions, distinguishing official final outcomes from provisional or superseded rulings. Check the exceptional game's box score, event/shot coverage, recorded time and eligibility in statistics/Records; do not fabricate the remaining 1:40 or require a 40-minute performance total.
   - **Done when:** a source-linked evidence section records both seasons' counts, final rank/qualifier orders, every PO/FF pair, round mappings and the exact exceptional game identity/result. Any actual required data/ETL contradiction stops for a separately reviewed `/fix`; lack of a currently verified outcome is stated rather than guessed. No production/data write occurs.

2. [x] Add the minimal verified ended-early context and focused regression cases.
   - Extend the existing typed format exception union with the additive variant `{ kind: "endedEarly"; gameCode: number; note: string }`. `gameCode` is the existing positive integer source game ID scoped to its registry season; `note` is nonempty repository-authored plain text describing the official ended-early result. Add only the verified E2022 entry after step 1 identifies its exact game. Keep the existing game status, played flag, score, phase and result/series responses unchanged.
   - `/format` carries that exception through its existing `exceptions` array. Validate the entry's shape and source-game association in focused evidence; keep the registry independent of database target. Document source links in the inventory/report, with no new persistence or endpoint.
   - Add the approved `{ kind: "winsDeducted"; clubCode: string; stage: "RS"; roundNumber: number; wins: number; note: string }` variant, with the E2022 entry PAN, RS, round 34, two wins. Its nonempty repository-authored note explains the standings-only deduction. Display it in affected standings/Home/team contexts, limited to the final round in historical playback; never subtract wins on the client or leak it to other seasons/clubs.
   - Match the exception by both selected season and source game code in Game Detail and the selected postseason matchup. Render its note as React text, associated with the affected game, without raw HTML. Use the existing format-query cache/hook and UI primitives. Loading or failure of additional format context stays separate from the recorded game result; failure offers contextual retry without guessing a ruling or replacing the real score/box score. Normal games show no exceptional note.
   - Reuse existing historical direct-eight tests; add E2020/E2022 expectations and the exceptional-game case without duplicating a second bracket/race implementation. Change application logic elsewhere only when a verified era defect requires it.
   - **Done when:** the affected game and matchup show the verified note and 80-95 result; recorded stats remain reachable; the second Partizan win yields a 2-0 lead without advancing the club. A later three-win clinch still advances correctly. Other games/seasons have no leaked note; context loading/error/retry and missing evidence cases pass focused Playwright checks. Backend typecheck/build passes for the additive contract.
   - **Done when (approved amendment):** PAN's final standings retain 9-23/17th while its explanatory note distinguishes the unchanged 11-23 played record. Earlier snapshots and other clubs/seasons have no final-round note, and existing statistics/Records eligibility remains unchanged.

3. [x] Validate all existing pages, scopes and qualification samples for each season.
   - Confirm completed Home/Overview have no genuinely upcoming games, describe 18 clubs/34 games/top eight, show RS-PO-FF only, and agree on the confirmed champion.
   - Check all 18 final standings rows, rank-eight bands, race snapshots/playback through RS round 34, standings breakdowns and advanced views. The conservative live race uses one top-eight cutoff; incomplete fixture data suppresses unsupported clinch/out claims. Official final ranks govern qualifiers without a new tiebreaker engine.
   - Verify Games filters, game labels, team/player statistics, game logs and comparisons for held phases only. Preserve raw source round identifiers and phase-specific cumulative values. Use actual available scopes: RS for regular season, all for whole-season data, and PS for combined knockout advanced data; retain PO/FF traditional scopes where published. Invalid PI/TS selections use existing reset/validation behavior rather than being reinterpreted as PS.
   - Check player minimum-game/qualified flags and the season-length-dependent Records qualification behavior against the current pipeline/registry contract; do not invent a new 34-game threshold. Confirm existing player/team game and season Records, career identities and loaded-season head-to-head include eligible real performances with null/unavailable data kept honest.
   - Inspect the existing coverage responses for both seasons rather than assuming modern event/statistics completeness. Check the ended-early case alongside a normal game and an unavailable/partial fixture. Preserve source results, including final rescheduled E2020 games.
   - Full-suite verification exposed small name-readability defects in the existing page areas. Keep long names readable with compact phone leaderboard text and tablet player-hero text, preserving desktop sizing and full accessible names. Repair layout-test image fixtures and stale selectors; the word-measurement helper must use actual rendered typography and ignore clipped screen-reader copies. Directory ellipsis from 640px remains its existing behavior.
   - **Done when:** durable evidence names each season/page and its observed outcome, both independent data matrices match their verified contracts, scopes/qualification and ruling eligibility agree across pages, and focused page checks pass. The no-PI bracket, exceptional note, matchup interactions and page overflow checks pass at all four supported widths in both themes.

4. [x] Record acceptance and run the final gates.
   - Update only the relevant inventory evidence and add/link a focused 34e acceptance report with counts, official final standing/qualifier orders, recorded pairings and series lengths, champion/placements, actual scope/qualification samples, disciplinary outcomes and coverage limitations for both seasons. Keep the inventory a report, not a second format registry.
   - Run root `npm run build`, `npm --prefix frontend run lint`, named changed-page/game/postseason cases and the relevant 34d/modern status, scope and postseason regression cases. Include applicable responsive/layout cases. The user explicitly requested relevant-only testing on 2026-10-12; stop full-suite runs and use this focused scope even for the shared context component.
   - **Done when:** required gates pass with exact observed commands/results recorded, both seasons have their own acceptance evidence, no unverified result is called confirmed, and the feature is ready for review. Any residual source/coverage limitation is named explicitly.

## Files / areas

- `backend/src/db/season-format-registry.ts`, `backend/src/db/season-format.ts`: existing E2020/E2022 `singleTable(18)` definitions and additive exception propagation.
- `frontend/src/games/GameDetailPage.jsx`, `frontend/src/postseason/MatchupDetail.jsx`, `PostseasonPage.jsx`: reach the affected game and display its verified contextual note.
- Existing `frontend/src/lib/useSeasonFormat.js` and `seasonFormat.js` helpers; `frontend/src/postseason/bracketModel.js`, `Bracket.jsx`, `RacePanel.jsx` only if a confirmed defect remains. Reuse 34d's direct seeds, cutoffs and three-column presentation.
- Existing dashboard, season overview, standings, games, teams, players, leaders, comparisons and records areas for scoped verification and necessary era fixes only.
- Incidental readability corrections found by acceptance: `frontend/src/leaders/LeaderParts.jsx` and `frontend/src/players/PlayerHero.jsx`; layout-test fixtures/selectors and text measurement under `frontend/e2e/`.
- `frontend/src/dashboard/StandingsSnapshot.jsx`, `frontend/src/standings/StandingsPage.jsx`, `RaceView.jsx`, `frontend/src/teams/TeamPage.jsx`, and a small shared context note in `frontend/src/lib/` for the approved explanatory metadata.
- `frontend/e2e/historical-direct-eight.spec.js`, `historical-era-pages.spec.js`, relevant game/postseason, status, scope, Records and responsive specs in the installed harness. Prefer extending existing parameterized checks over copying them.
- `blueprint/reference/historical-season-inventory.md`, plus a linked `blueprint/reference/34e-acceptance.md`.

## Data / contracts

The API/registry owns format and verified competition context; existing application tables own recorded standings, results, performance data and coverage. The frontend derives display and conservative qualification/bracket state from these contracts. Competition outcome, source data completeness and performance coverage remain distinct.

Maintain competition/season scoping and all current source IDs and URL forms. The additive `endedEarly` exception describes an officially ended played game, without cancellation, annulment, replay or missing-box-score implications. The approved additive `winsDeducted` exception identifies a season-scoped club, RS source round, positive integer deduction and nonempty plain-text note. Both carry explanatory context only. Count the official 80-95 game once in its series, preserve PAN's official final credit and all real recorded performance/earlier snapshots, and do not turn player sanctions into team losses.

No auth, tenant, payment, destructive or persisted-data boundary is added. Preserve bounded untrusted-request validation, parameterized reads and safe existing error shapes. An ended-early note is trusted repository text, but still renders through safe React text. Never open the real `.env`; all runtime/data/browser evidence is local and health-gated. The Neon allowlist and production publishing remain unchanged.

## Testing

- Final relevant-only verification: root `npm run build` and `npm --prefix frontend run lint` passed. The seven named feature/regression specs in [34e acceptance evidence](../reference/34e-acceptance.md) passed 58 tests; the three targeted long-name layout cases passed. The full-suite run was stopped at the user's request and is not claimed as passing. Intermittent Compare chart-resize failures remain outside this focused acceptance.
- Planning evidence: valid config, empty active-spec stub, clean worktree on master after completed 34d, correct existing 18-club registry entries and reusable direct-eight logic/tests. Overview size is below 40,000 bytes. No prior feature-34e build metadata was found.
- Frozen completion archive: `blueprint/history/features/34e-eighteen-team-league-without-play-in-e2020-e2022.md`. Ordinary archive parent, absent exact leaf, no prior Git use of that archive path, valid branch name and no conflicting local branch ref were checked. Build attempt is 1.
- No Verify or unit-test command is declared. No build, lint, server startup, API/data probe or browser verification was run for 34e during planning. 34a's counts are prior evidence to refresh, not a new live check.
- Reuse `npx playwright test <named spec files>` from `frontend`, with local health confirmation before any browser run. Proportionate focused cases cover all 18 seeds/cutoffs and 34 RS rounds, recorded series/pairs, exceptional-game result/time/statistics, loading/empty/error/retry/partial states, available scopes, qualification samples, Records and season identities.
- Primary-source search results used in planning: [official 2023 Game 3 notes confirming Game 2's 80-95 result and early ending](https://mediacentre.euroleague.net/mediacentre/en/games/view/17075/yes), corroborated by [Madrid's Game 2 report](https://www.realmadrid.com/es-ES/noticias/baloncesto/primer-equipo/cronicas/80-95-derrota-en-el-segundo-partido-del-playoff); [official amended COVID regulations](https://mediacentre.euroleague.net/en/app/2/communication/communication/preview/1284). Direct page opens of the two league pages timed out/failed, and the linked disciplinary-judge page returned 403. Reconfirm the complete applicable official wording during step 1; do not claim full-page verification from indexed excerpts.

## Notes for the AI

Implementation and focused acceptance are recorded in [34e verification evidence](../reference/34e-acceptance.md). The user approved the [API/context amendment](../reference/34e-scope-amendment.md) on 2026-10-12; it is incorporated above. All four steps are verified and ready for review before `/complete`.

Critique added explicit disciplinary verification and a small game-scoped ended-early context contract, because the inventory's `Confirmed` statuses do not establish the absence of a ruling. It also kept this feature centered on reuse: 18 clubs and 34 RS games are registry values, not a new bracket architecture. No product choice remains open; unresolved source/data details have concrete read-only checks before their dependent edits. If those checks uncover an actual prerequisite pipeline defect or contradict the verified final outcome, stop for separately reviewed repair instead of changing shared stored evidence.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":18486,"specSha256":"fa536090c5391bfcaf889c54ee025552c67f7b44a04ea531bbd262c200cba905","branch":"refs/heads/feature/eighteen-team-league-without-play-in-e2020-e2022","head":"105c55dc1f1874dc2fe057c0678cd93c7f6b2eb5","baseRef":"refs/heads/master","baseCommit":"105c55dc1f1874dc2fe057c0678cd93c7f6b2eb5","sourceTree":"d6a27742b886bd2b5a46721127877f6835518b33","absentOptional":[]} -->
