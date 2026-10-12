# Feature 34f acceptance evidence

Implementation verified on 2026-10-13 on `feature/covid-cancellation-e2019`. Local health reported `status: ok`, `database: connected`, `target: local`. No stored-data changes, production access, commit or deployment occurred.

## Cancellation and local archive

The [official ECA cancellation release](https://mediacentre.euroleague.net/en/app/2/communication/communication/preview/1133) was read directly. It confirms the March 12 suspension, May 25 cancellation and decision to name no champion. The separate original suspension page failed direct retrieval; the cancellation release itself corroborates both dates. The [Barcelona announcement](https://www.fcbarcelona.com/en/basketball/first-team/news/1672896/the-euroleague-ends-the-season) was also accessible.

Local `/format` reports cancelled, 18 planned clubs, an RS-only held-stage list, 34 planned games per club, partial observed RS completion and no issues. Paginating `/games` returned 306 fixtures: 252 played and 54 unplayed. Every club played 28 games. All 34 scheduled rounds remain in the archive; the latest standings are round 28. There are no postseason series. Season and team scheduled reads exclude abandoned fixtures.

Source round-28 order: IST 24-4; MAD 22-6; BAR 22-6; CSK 19-9; TEL 19-9; PAN 14-14; KHI 13-15; ULK 13-15; ZAL 12-16; PAM 12-16; OLY 12-16; MIL 12-16; BAS 12-16; RED 11-17; ASV 10-18; BER 9-19; MUN 8-20; DYR 8-20. Source `qualified` flags for the first five clubs are retained as data, not presented as advancement. Earlier snapshots at rounds 1 and 14 have all 18 clubs.

Played example: `E2019_1`, October 3, 2019, KHI 89-83 TEL. Abandoned example: `E2019_253`, RS round 29, originally March 12, 2020, CSK-BER, source `Confirmed`, `played: false`, null scores and empty player box score. Source status is preserved; cancellation context explains why it was not played.

Advanced standings RS/all each return 18 clubs; PS returns the existing 404 `PHASE_NOT_IN_SEASON`. Qualified per-game RS player samples use minimum 15, including Calathes (28), Shved (26), Micic (24), Shengelia (28) and Larkin (25). The separate PER Records minimum remains 20: Larkin's 25-game E2019 performance is eligible. Larkin's 49-point game 97 remains in single-game Records, and TEL's 113-point game 72 remains in team-game Records. All four Records endpoints return rows; a bounded archive top-50 response need not contain E2019 for every metric.

Coverage reports box scores, period scores, shots and PBP for all 252 played games, and all 18 standings/rosters. Other source coverage counts retain their existing semantics (photos 260/252, season statistics 298/18); these do not establish external image availability or every possible statistical field. No coverage is invented for the abandoned games.

## Browser and final gates

| Area | Observed behavior |
| --- | --- |
| Postseason | Cancellation/no-champion state; no bracket, placements, live race or future-stage UI. Bracket input queries are disabled, including when their mocked endpoints would fail. Cancellation overrides contradictory rules and a season with real champion data. Format loading/error/retry/null never produces a projection. |
| Home | Cancellation and suspension context; no upcoming abandoned games. Missing format reports unavailable status rather than completion, with retry; standings and real scores remain readable. |
| Overview | Cancellation hero, planned 18-club/34-game description, RS-only timeline through the last played date (March 6, 2020), statistical leaders and played-game highlights. No champion inferred without completed format metadata. |
| Standings | 18 suspension rows; no qualification badges in table, streaks, margins or ahead/behind views, and no qualification footer/cutoff. Race is historical playback of rounds 1-28, with no contention card/bands. Advanced data retains cancellation context. Empty standings have an honest empty state. |
| Games / Game Detail | Round 29 retains all nine abandoned fixtures, marked not played without preview/tipoff. The source fields stay intact. Unplayed detail explains the original date and absence of a result/performance across tabs; played game 1 keeps its real box score. |
| Teams / Players | 18 team directory entries; Team Detail suspension context and real RS statistics. Player directory/detail, career table and minimum-15 RS qualification remain available. |
| Leaders / Compare / Head-to-head / Records | RS-only controls, real player leaders, actual team comparisons, no upcoming meeting, loaded-season completed meetings and archive Records remain available. The page matrix reports no JavaScript exceptions. |

Relevant regression command from `frontend`:

```text
npx playwright test cancelled-season.spec.js competition-context.spec.js historical-direct-eight.spec.js historical-era-pages.spec.js postseason.spec.js postseason-clinch.spec.js season-status.spec.js stage-scopes.spec.js --grep-invert "2016: existing pages|2017: existing pages|2018: existing pages|E2018 game 21" --workers=3
```

All 64 selected tests passed (1.4m). This includes new E2019 coverage, both E2020/E2022 page matrices, direct-eight seasons and modern completed/live/cancelled-game regression paths. Initial new-test failures were corrected selectors/accessible loading assertions; no failing check was skipped or accepted.

Screenshot review then prompted a final Game Detail wording correction: abandoned tabs must not promise data after a future game. The following five affected checks passed on that final change (21.4s):

```text
npx playwright test cancelled-season.spec.js competition-context.spec.js --grep "abandoned fixtures|cancellation archive fits|game 313 keeps|format context loading and retry" --workers=3
```

Root `npm run build` and `npm --prefix frontend run lint` passed on the final candidate. `git diff --check` passed. No full suite was run.

`/complete` repeated root build, frontend lint and the same 64-case relevant regression command on 2026-10-13. All passed; the browser run finished in 1.3m on the final Game Detail candidate. Local health again confirmed `target: local`.

The cancellation layout cases checked Postseason, Home, Standings, abandoned Games/Game Detail and Team Detail at 1024/768/390/320px in both themes, with no page overflow. Screenshots live under ignored `frontend/test-results/34f-<path>-<theme>-320.png`. Postseason/light and abandoned Game Detail/dark 320px screenshots were inspected directly; the final detail screenshot is regenerated by the follow-up layout run. Coverage-table/photo limitations above remain applicable.

Configured Audit, Check and try-guide gates are manual and were not invoked. Independent review was not selected for this bounded status/presentation change, which adds no security, API or persisted-data boundary; no independent request exists. Existing open P3 findings F-02/F-03 remain unchanged; no P0/P1 blocker exists. No stored results, player statistical eligibility, dependencies, runner, CI or production allowlist changed.
