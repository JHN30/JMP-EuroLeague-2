# Feature 34e verification evidence

## Current state

Data verification and the approved context implementation were performed on 2026-10-12. The running health endpoint reported `status: ok`, `database: connected`, `target: local`. No database, schema, production, commit or deployment change was made. Final relevant-only acceptance passed; the user explicitly requested stopping full-suite runs.

The user approved the additional source-backed E2022 standings context in the [spec amendment](34e-scope-amendment.md), which is implemented in the registry and existing pages.

## Local season matrices

Both `/format` responses report `completed`, `singleTable`, no issues, and stages RS, PO, FF. Each has 18 clubs, 34 RS games per club, top eight qualifying directly, three wins to clinch PO and a third-place FF game. Paginating every fixture gives 328 played, Confirmed games per season: 306 RS, 18 PO, 4 FF.

Source rounds are RS 1-34, PO 35-39, FF 40-41. Selected RS snapshots at 1, 17 and 34 each return 18 clubs. Final qualifiers and stage pairs are taken from the application tables, without reconstructing an official ranking from scores.

Final RS orders, source club codes:

- E2020: BAR, CSK, IST, MIL, MUN, MAD, ULK, DYR; then PAM, BAS, ZAL, OLY, TEL, ASV, BER, PAN, RED, KHI.
- E2022: OLY, BAR, MAD, MCO, TEL, PAR, ZAL, ULK; then BAS, RED, IST, MIL, PAM, VIR, MUN, BER, PAN, ASV.

Recorded PO pairs and wins in seed order:

| Season | 1v8 | 2v7 | 3v6 | 4v5 |
| --- | --- | --- | --- | --- |
| E2020 | BAR 3-2 DYR | CSK 3-0 ULK | IST 3-2 MAD | MIL 3-2 MUN |
| E2022 | OLY 3-2 ULK | BAR 3-0 ZAL | MAD 3-2 PAR | MCO 3-2 TEL |

Recorded Final Four scores:

| Season | Semifinal: 1v8 / 4v5 winners | Semifinal: 2v7 / 3v6 winners | Final | Third place |
| --- | --- | --- | --- | --- |
| E2020 | BAR 84-82 MIL | CSK 86-89 IST | BAR 81-86 IST | MIL 83-73 CSK |
| E2022 | OLY 76-62 MCO | BAR 66-78 MAD | OLY 78-79 MAD | MCO 78-66 BAR |

Season coverage reports all 328 box scores, period scores, event and shot records available in both seasons; photos are partial (259/328 and 300/328 respectively). These are the existing coverage-table semantics, not a claim of complete photography or every possible advanced statistic.

## E2020 final rescheduled outcomes

The league's [amended COVID regulations](https://mediacentre.euroleague.net/en/app/2/communication/communication/preview/1284) applied retroactively to affected games and permitted rescheduling. Its indexed official release identifies four EuroLeague games; the local final fixtures for those games are:

| Source game | Round | Actual played date | Final result |
| --- | --- | --- | --- |
| E2020 / 21 | 3 | 2020-12-01 | ASV 97-73 PAN |
| E2020 / 22 | 3 | 2020-11-23 | BAS 70-77 DYR |
| E2020 / 29 | 4 | 2020-11-11 | ASV 68-89 RED |
| E2020 / 31 | 4 | 2020-12-08 | PAM 72-85 DYR |

All four are played and Confirmed. Keep these final results and their actual dates; do not restore a superseded provisional 0-20 result. The official release was readable through search indexing, while direct opening failed; the retrieval limitation remains explicit. EuroCup games mentioned in the same release remain out of scope.

## E2022 ended-early game

The exact local identity is `E2022_313`, source game 313: Real Madrid (MAD) vs Partizan (PAR), PO source round 36, second game of that quarterfinal, scheduled 2023-04-27T18:45:00Z. It is played/Confirmed with official score 80-95. The five recorded series games are 309, 313, 317, 321, 325; final series wins are MAD 3, PAR 2.

[Madrid's contemporary report](https://www.realmadrid.com/es-ES/noticias/baloncesto/primer-equipo/cronicas/80-95-derrota-en-el-segundo-partido-del-playoff) was read directly. It confirms the referees ended the game with 1:40 remaining and Partizan led the series 2-0. The existing local play-by-play has 548 events, ending with a fighting event at fourth-quarter 01:40 and End Game. There are 113 recorded shots and 24 player box-score rows; period scores add to 80 and 95. Coverage marks box scores, period scores, shots and PBP available. Team-total time remains the feed's nominal 2400 seconds; this must not override the official ending or be turned into invented events.

The early ending is a confirmed played result, not a walkover, cancellation or annulment. It gives Partizan its second win but cannot clinch a best-of-five series. No existing result or performance row needs alteration to add this context.

## E2022 Panathinaikos final-standings deduction

The final official standings row for PAN has position 17, 34 games played, 9 credited wins and 23 losses; its unchanged venue splits are 8-9 at home and 3-14 away. A diagnostic check of its 34 recorded RS results gives 11 wins and 23 losses. Earlier snapshots are unaffected: round 1 is 0-1, round 17 is 6-11.

This difference is explained by the 2023-04-14 two-win sanction, applied to the final RS standings. [Eurohoops reproduces the league announcement](https://www.eurohoops.net/en/euroleague/1489630/panathinaikos-penalized-with-two-victories-ended-second-to-last-in-the-euroleague-standings/), which specifies that opposing teams and individual/team statistics and records are unaffected. The [original league announcement](https://www.euroleaguebasketball.net/news/settlement-reached-between-panathinaikos-and-management-control-commission-for-breaching-financial-fair-play-regulations/) returned 403; its archived copy was also unavailable. The league's [official season-preview video description](https://www.youtube.com/watch?v=umEehwDGJcg) corroborates the final 17th-place 9-23 record. The announcement's sanction details were corroborated through the reproduced release rather than a successful direct league-page fetch.

Preserve the stored final rank and credited wins; do not repair the row to 11-23, reduce games played to 32, invent opponent wins, recalculate all earlier standings, or remove statistics/Records performances. The approved amendment adds explanatory metadata for the distinction between standings credit and played-result statistics.

## Application and focused browser acceptance

The shared format registry now carries `endedEarly` for game 313 and `winsDeducted` for PAN's final RS source round 34. The existing format endpoint serializes the same entries; no endpoint, database table or performance calculation was added.

Game Detail and the selected postseason matchup associate the ended-early context with game 313. Home's standings summary, the final standings table and PAN Team Detail explain the two-win deduction. Race playback shows that annotation at source round 34 and removes it at earlier rounds. Other games, clubs and seasons receive no leaked note. Additional context has an independent loading/error/retry path, so the real game and box score remain usable if the format request fails. Text is rendered safely without interpreting HTML.

The existing historical direct-eight and page matrices were extended to E2020 and E2022, preserving their E2016-E2018 cases. Each 18-club season independently passes:

| Area | Observed behavior |
| --- | --- |
| Home / Overview | Completed state; no upcoming historical games; 18 clubs, 34 games, top eight; RS/PO/FF only |
| Standings | 18 clubs and two tier headers; top-eight bands, breakdowns and advanced data; historical race reaches rounds 1 and 34; knockout phases have no table |
| Games / Game Detail | Recorded PO fixtures, stage-scoped source rounds and box scores; game 313 retains 80-95 and its 01:40 ending events |
| Teams / Team Detail | 18 directory entries; correct identity, PO statistics and ranks; PAN's final standing credit is explained |
| Players / Player Detail | Correct identity, career table and PO statistics with actual qualification feedback |
| Leaders / Compare / Head-to-head | PO/PS scoping, actual club comparison and loaded-season meetings |
| Records | All four existing kinds answer; PER qualification follows the existing season-length rule |
| Postseason | Four direct quarterfinals, correct semifinal pairs/champion/placements, no PI, selected game links and relevant note |

Advanced standings for RS/all/PS return 18/18/8 clubs respectively for both seasons. Qualified per-game player samples have observed minimums RS 18, PO 3 and FF 1; every sampled row is qualified and reaches its own minimum. For example, E2020 Shved has 23 RS games/minimum 18, Pangos 5 PO games/minimum 3, and Micic 2 FF games/minimum 1; E2022 Clyburn has 34 RS games/minimum 18, Hayes-Davis 5 PO games/minimum 3, and Vezenkov 2 FF games/minimum 1. The distinct existing PER Records threshold is 20 of a 34-game regular season. No threshold was inferred from the two-win deduction. Invalid PI/TS fixture filters return the existing 404 `PHASE_NOT_IN_SEASON` shape.

The focused command from `frontend`, `npx playwright test competition-context.spec.js historical-direct-eight.spec.js historical-era-pages.spec.js postseason.spec.js postseason-clinch.spec.js season-status.spec.js stage-scopes.spec.js --workers=3`, passed all 58 tests. Context tests cover the 2-0 lead versus three-win advancement, exact game/season/club/snapshot association, loading/retry and safe text rendering. Every affected context page fits 320/390/768/1024px in both themes. Screenshots are generated under ignored `frontend/test-results/34e-context-<path>-<theme>-320.png`.

## Verification and incidental layout repairs

- `/complete` repeated the same relevant-only final gates on 2026-10-12: root build and frontend lint passed; the seven-spec feature/regression command passed 58 tests (1.3m), and the targeted layout command passed three tests (14.0s). No full-suite run was started during completion.
- Root `npm run build` and `npm --prefix frontend run lint` passed after the implementation and small readability corrections.
- The first broad run exercised 688 tests: 672 passed and 16 failed. Layout cases depended on unreachable external images, avatar selectors found empty silhouette elements, and an empty-state case waited for populated statistics. These were repaired in the test harness: local SVG image fixtures, a nonempty label selector, and a direct empty-state navigation path.
- The word-measurement helper also used the body's 16px font when Chromium returned an empty font shorthand for 12px labels. It now uses the actual typography, supports native inline widths, ignores clipped screen-reader copies and has a meaningful visible-overflow regression case.
- The next broad run exercised 689 tests: 684 passed and five failed. Chart-layout cases passed on focused rerun. Accurate text measurement exposed long-name crowding in phone leaderboard labels and tablet player heroes; small font-size corrections passed their three focused cases. The player-directory test now preserves its existing distinction between phone wrapping and intentional tablet/desktop ellipsis, retaining full accessible-name assertions.
- Final acceptance on the current candidate uses only relevant tests, as the user requested. The seven-spec command above passed 58 tests. `npx playwright test leaders-layout.spec.js player-overview-layout.spec.js players-layout.spec.js --grep "Advanced board shows|hero keeps a long surname|cards are two per row" --workers=3` passed all three targeted layout tests. Build and lint also passed on this candidate.
- The last broad run was interrupted at the user's request and is not claimed as passing. It showed intermittent Compare-player Overview and Compare-team Trends chart-resize assertions. These remain unresolved broader-suite diagnostics; the focused feature checks do not establish those charts' reliability. No failing assertion was skipped or marked accepted.
- Image fixtures are limited to layout tests. They establish sizing and fallback behavior, not external CDN availability. Direct API and season/ruling acceptance continue to use real local data. No new test runner, dependency or CI gate was installed.
- Existing open P3 findings F-02/F-03 remain in the ledger; no P0/P1 blocker or independent request exists. Configured Audit, Check and try-guide gates are manual. Independent review is not selected for these bounded read-only metadata/UI changes, which introduce no security or persisted-data boundary.
