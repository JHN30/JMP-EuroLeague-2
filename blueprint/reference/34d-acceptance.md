# Feature 34d acceptance evidence

Checked on 2026-10-12 against the existing running local API and frontend. `/api/health` reported `status: ok`, `database: connected`, `target: local`. No data, schema, database target, production allowlist or deployment changed.

## Actual season data

Each `/format` response reports `completed`, no issues, and stages `RS`, `PO`, `FF`. RS has one 16-club table, 30 games per club and ranks 1-8 directly qualifying. PO requires three wins; FF requires one and includes third place. Every final standings row reports 30 games and its qualified flag agrees with official rank <= 8. These are the existing imported official standings, not reconstructed rankings.

| Season | RS / PO / FF played games | PO source rounds | FF source rounds | Champion / runner-up / third / fourth |
| --- | --- | --- | --- | --- |
| E2016 | 240 / 15 / 4 = 259 | 31-35 | 36-37 | ULK / OLY / CSK / MAD |
| E2017 | 240 / 16 / 4 = 260 | 31-34 | 35-36 | MAD / ULK / ZAL / CSK |
| E2018 | 240 / 16 / 4 = 260 | 31-35 | 36-37 | CSK / IST / MAD / ULK |

Final RS order, using source club identifiers:

- E2016: MAD, CSK, OLY, PAN, ULK, IST, BAS, DAR; then RED, ZAL, BAR, GAL, BAM, TEL, UNK, MIL.
- E2017: CSK, ULK, OLY, PAN, MAD, ZAL, BAS, KHI; then MAL, TEL, PAM, BAM, BAR, RED, IST, MIL.
- E2018: ULK, CSK, MAD, IST, BAR, PAN, BAS, ZAL; then OLY, TEL, MUN, MIL, KHI, CAN, BUD, DAR.

Recorded quarterfinal pairs and wins, in seed order 1v8, 2v7, 3v6, 4v5:

| Season | 1v8 | 2v7 | 3v6 | 4v5 |
| --- | --- | --- | --- | --- |
| E2016 | MAD 3-1 DAR | CSK 3-0 BAS | OLY 3-2 IST | PAN 0-3 ULK |
| E2017 | CSK 3-1 KHI | ULK 3-1 BAS | OLY 1-3 ZAL | PAN 1-3 MAD |
| E2018 | ULK 3-1 ZAL | CSK 3-1 BAS | MAD 3-0 PAN | IST 3-2 BAR |

Final Four game scores retain source home/away order:

| Season | Semifinal: winners of 1v8 / 4v5 | Semifinal: winners of 2v7 / 3v6 | Final | Third place |
| --- | --- | --- | --- | --- |
| E2016 | ULK 84-75 MAD | CSK 78-82 OLY | ULK 80-64 OLY | MAD 70-94 CSK |
| E2017 | CSK 83-92 MAD | ULK 76-67 ZAL | MAD 85-80 ULK | CSK 77-79 ZAL |
| E2018 | ULK 73-92 IST | CSK 95-90 MAD | IST 83-91 CSK | ULK 75-94 MAD |

The API series counts, scores and stage-scoped unordered pairs establish the displayed bracket. The focused tests confirm all four quarterfinals, both semifinals, champion and placement clubs independently for every season. Quarterfinal exits remain the category `Playoffs`, without invented exact ranks 5-8.

## Sources and coverage

The [34a inventory](historical-season-inventory.md#56-e2016-e2018-16-club-table-no-play-in---leaf-34d) supplies the verified era rules and local-data baseline. Fresh official-source searches corroborated [Fenerbahce's 2017 final](https://admin.euroleague.net/main/results/showgame?gamecode=263&seasoncode=E2016), [Madrid's 2018 final and Zalgiris's third place](https://admin.euroleague.net/news/i/akjjxwynnjolikg8/20-years-rewind-real-wins-la-decima-2018), [CSKA's 2019 final](https://admin.euroleague.net/news/i/9to6twb5ajeiwwfq/club-profile-cska-moscow), and [CSKA's 2017 third place](https://mediacentre.euroleague.net/mediacentre/en/games/view/14975). Remaining pairings and scores above were checked against the existing local application records and inventory; no claim is made that every official website row was independently re-fetched.

All three advanced standings endpoints answer successfully for `RS`, `all`, `PS`: 16, 16 and 8 club rows respectively. `/format` exposes the corresponding real-stage scopes (`PO`/`PS`, `FF`/`PS`). Source rounds use their original `number`, key and stage-local `index`, not modern cumulative offsets.

Season coverage confirms box scores for every played game, shots/PBP for 259/259 in E2016, 260/260 in E2017 and 259/260 in E2018. Scanning the E2018 game coverage responses identifies game 21 (Khimki vs Anadolu Efes, 84-85) as the sole event/shot gap. Its box score renders, while Play-by-play and Shooting show unavailable messages. No zero-valued performance is invented.

## Browser acceptance matrix

`frontend/e2e/historical-era-pages.spec.js` visits each area below for each of E2016, E2017 and E2018. All three season cases and the game-21 case passed. This is focused behavior evidence, not exhaustive validation of every tab, metric or historical row.

| Area | Observable evidence for each season |
| --- | --- |
| Home | Finished-season message; no unplayed historical fixtures shown as upcoming |
| Overview | 16 clubs, 30 games, direct top-eight description and no PI heading |
| Standings | 16 club rows plus two tier headers, no Play-In band; streaks/form, margins and ahead/behind breakdowns render; Race playback reaches rounds 1 and 30 without PI labels; Advanced has data; PO gives knockout guidance |
| Games / Game Detail | PO fixture links; recorded quarterfinal game and box score render |
| Teams / Team Detail | 16 directory links, named participant, PO Traditional statistics and ranks |
| Players / Player Detail | Directory links, correct player identity, career table, PO statistics with actual minimum-game qualification text |
| Leaders | Team PO scope selected and whole-postseason advanced-scope explanation |
| Compare | Two actual clubs render matchup statistics |
| Head-to-head | Recorded completed meetings over loaded seasons; absent clubs in other seasons remain expected 404s |
| Records | Existing loaded-season player records and identity links render |
| Postseason | No PI slots/copy/finish category; correct champion and placements, eight matchups, selected series games and links |

`historical-direct-eight.spec.js` also proves direct seeds 7/8 before playoffs, missing seeds, empty inputs, stage/pair isolation, reversed pair order, 2-0/2-1 leads versus a three-win clinch, tied race uncertainty, loading, empty standings, format error/retry and incomplete-fixture race suppression. Each season's bracket fits at 320, 390, 768 and 1024px in both themes, with three desktop columns and one below 1024px. Screenshots are generated under ignored `frontend/test-results/direct-eight-<season>-<theme>-<width>.png`.

## Checks and limits

- Root `npm run build`: passed. The sandbox initially denied overwriting existing `backend/dist` files; the same command passed with approved sandbox escalation.
- `npm --prefix frontend run lint`: passed.
- Focused postseason/state/layout run: 29 tests passed.
- Historical page matrix plus standings layout rerun: 17 tests passed.
- Combined regression run: 222 tests passed (2.1 minutes). Command from `frontend`: `npx playwright test historical-direct-eight.spec.js historical-era-pages.spec.js postseason.spec.js postseason-clinch.spec.js postseason-layout.spec.js season-status.spec.js home-round-status.spec.js stage-scopes.spec.js standings-race-layout.spec.js standings-table-layout.spec.js responsive.spec.js --workers=3`.
- After removing the unreachable format fallback, adding explicit historical race/breakdown checks and waiting for animations before screenshots: `npx playwright test historical-direct-eight.spec.js historical-era-pages.spec.js postseason.spec.js postseason-clinch.spec.js --workers=3` passed all 27 tests (34.3 seconds). Root build and frontend lint passed again after this last cleanup.
- Complete's final safety pass repeated root build, frontend lint and the same 27 focused tests; all passed (browser run: 34.5 seconds). Local health again reported `target: local`.
- Visual inspection of settled E2016 light/1024px and E2018 dark/320px screenshots confirms the complete bracket, connected three-column desktop path, stacked phone path and readable champion/placement panels. External crests were unavailable in these screenshots; layout does not rely on them loading.
- No unit runner or CI gate was added. No full browser suite was required: app changes are confined to the postseason folder, with no routing, API-client, global CSS or shared cross-page component changes.
- Two pre-existing standings layout cases relied on CDN images loading and initially failed on hidden/unloaded crests. They now serve a local SVG image fixture within those layout cases; their layout assertions remain intact. This does not claim external CDN availability.
- Cross-season career/person and head-to-head/club 404s are expected when that identity did not participate in another loaded season. The page matrix excludes only those other-season 404 shapes, retaining current-season failures and unexpected API errors.
- Configured Audit/Check/try-guide gates are manual. Independent review is `when-sensitive`; this small read-only frontend adaptation changes no security or persisted-data boundary and does not select that gate. No independent receipt exists. The existing findings ledger has only open P3 entries F-02 and F-03; it has no P0/P1 blocker.
- This is local acceptance only. Other era correctness and production historical publication remain later work.
