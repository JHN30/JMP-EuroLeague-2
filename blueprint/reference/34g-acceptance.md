# Feature 34g: E2021 warning-first acceptance

## Scope and evidence boundary

The user approved revision and implementation of feature 34g on 2026-10-13:
retain the warning-first approach and existing historical data
instead of requiring a snapshot pipeline repair or official statistics/Records
eligibility investigation. The approved plans and active spec record this scope.
This report distinguishes observed local application data from verified
competition rules and unresolved official statistical eligibility.

The user subsequently refined placement: show the combined caution and original
versus corrected counts at the top of Home only. Remove
the E2021 notice from Home's League table and generic duplicate table/race notes;
targeted affected-game and excluded-club context remains.

All API/browser evidence uses `http://localhost:3000/api` and a backend whose
`/health` reports `{"status":"ok","database":"connected","target":"local"}`.
No real `.env`, direct SQL, ETL refresh, database write, Neon request, import,
publisher run or deployment was involved.

## Source re-check

Retrieved on 2026-10-13:

- [FC Barcelona's 22 March 2022 announcement](https://www.fcbarcelona.com/en/news/2546701/participation-of-russian-federation-teams-withdrawn-from-the-euroleague)
  reproduces the EuroLeague decision: CSKA Moscow, UNICS Kazan and Zenit
  St Petersburg were withdrawn, and regular-season results against those clubs
  were removed from standings calculations. It also describes a 28-game
  regular season for remaining clubs. This supports the competition context;
  it does not establish player/team performance or Records eligibility.
- [The league decision page](https://www.euroleaguebasketball.net/news/eca-shareholders-executive-board-decision-on-participation-of-russian-teams/)
  returned HTTP 403 during this re-check. The club's republication was readable.
  No claim is made that the league page itself was retrieved successfully.

## Observed local contracts

| Area | Evidence from existing API | Interpretation |
| --- | --- | --- |
| Format | `GET /seasons/2021/format`: completed, no issues, RS/PO/FF | Reuses direct-top-eight, best-of-five PO and Final Four with third-place game; no Play-In |
| Original schedule | RS planned clubs 18, planned games per club 34, 306 fixture rows; all 18 club IDs remain observed | Original metadata and archive evidence preserved |
| Corrected final table | Latest RS standings at source round 34: 15 clubs, each with 28 counted games | Source rounds stay 1-34; counted games are not a renumbered schedule |
| Final ranks sampled | Barcelona first at 21-7; Monaco seventh | Stored official corrected final standings are used, not reconstructed ranks |
| Archived results | 278 RS games played, including 68 involving CSK/UNK/DYR | Played scores and box scores remain available despite standings annulment |
| Cancelled fixtures | 28 cancelled RS rows involving withdrawn clubs | Retained evidence; season and remaining-club scheduled queries return no fixtures |
| Counted eligible-only games | 210 played RS games between remaining clubs | Distinct from the 278 archived played games |
| Postseason | 17 PO games and four FF games; observed champion IST, runner-up MAD, third BAR, fourth OLY | Existing bracket model confirms recorded results and advances only at stage win targets |
| Team statistics | RS team statistics count BAR 32 games, CSK 24, DYR 23, UNK 25 | Existing performance totals differ from corrected standings; left unchanged |
| Player statistics | Accumulated RS feed retains excluded-club players, including UNICS rows | Observed publication, not a decision about official eligibility |
| Records | All four current endpoints respond with populated bounded rankings | Availability is verified; no new filtering, denominator or eligibility claim |

## User-visible changes

- Overview's RS description distinguishes original 18 clubs/34 planned games
  from 15 eligible remaining clubs/28 counted games.
- The top notice on Home explains that corrected final standings
  remove results against withdrawn Russian clubs, and distinguishes 18/34 from
  15/28. Home's League table contains no E2021 notice. Historical race snapshots stay
  accessible and caveated rather than being relabelled as repaired.
- Excluded-club team pages explain withdrawal on 2022-03-22, absence from the
  corrected final standings and preserved archived games/performances.
- RS Game Detail notes distinguish a played archived result removed from
  standings from a cancelled fixture. A note requires the correct season,
  RS phase and actual excluded-club participant. Eligible-only and postseason
  games do not acquire an annulment note.
- Team Overview's remaining-fixture count excludes `gameStatus: Cancelled`.
  Barcelona's RS snapshot shows 28 played, zero remaining and first of 15;
  non-cancelled unknown/unplayed fixture behavior is retained.
- The previously shipped shared warning stays visible even when additional
  competition-format context fails. Existing retry/error behavior remains.

## Runtime evidence

`frontend/e2e/excluded-season.spec.js` exercises the API matrix and eight focused
helper/browser cases: preserved cohorts and final standings, note scoping,
played/cancelled game detail and box-score availability, race playback, team
snapshot counts, excluded-club statistics, a player game log, Leaders,
team comparison, head-to-head, Records, champion display, and format-error
fallback. Layout checks cover Overview, Standings, excluded-club Team Detail and
archived Game Detail in both themes at 320/390/768/1024px. Chart resize is awaited
before page-overflow measurements.

The focused E2021 spec passed eight tests after correcting initial test-contract
assumptions about the Records response and Leaders board selection. A first
layout run measured transient chart resizing; polling the rendered overflow
state resolves that timing rather than changing production layout.

Final checks passed:

- `npm run build`: backend TypeScript and frontend production build passed.
- `npm --prefix frontend run lint`: passed.
- From frontend, `npx playwright test excluded-season.spec.js
  competition-context.spec.js season-status.spec.js historical-direct-eight.spec.js
  cancelled-season.spec.js responsive.spec.js`: 219 passed (2.5 minutes).
- `git diff --check`: passed.

After the user's initial three-tab placement refinement, build and lint passed again. From
frontend, `npx playwright test excluded-season.spec.js season-status.spec.js
competition-context.spec.js cancelled-season.spec.js responsive.spec.js`
passed 196 tests (2.1 minutes) against the confirmed local target. New assertions
verify the top notice precedes Home's header, the League table has no E2021 note,
and the notice appeared on Home, Overview and Standings. Desktop and 320px
Home screenshots were visually inspected; they are ignored local evidence in
`frontend/test-results/34g-home-review.png` and `34g-home-mobile-review.png`.

The user's final placement decision is Home only. Build and frontend lint passed
again. `npx playwright test excluded-season.spec.js season-status.spec.js` passed
18 tests (30.6 seconds) against the confirmed local target. Those tests verify
the banner is present on Home and absent on every other navigation tab, while
the targeted affected-game and excluded-club notes remain. The earlier desktop
and mobile Home screenshots still show the same final Home layout. Official
statistics eligibility and snapshot caveats remain unchanged.

The regression run includes modern 2025/2026 season status, all previously
verified direct-eight seasons, E2019 cancellation, E2022 disciplinary notes,
the preserved E2021 warning and the existing responsive spec. It does not
represent a whole-suite or all-season historical acceptance run.

## Accepted limitations and deferred work

- Historical standings snapshots remain inconsistent with game rounds. This
  feature does not fix their provenance, time alignment or internal breakdowns.
- Source performance statistics, form, comparisons and game logs can include
  played games whose results no longer count in corrected standings. The
  existing notice on Home only makes that limitation visible.
- Official team/player statistics and Records eligibility for annulled games
  remains unresolved. Existing statistics/Records calculations and qualification
  thresholds are preserved. API/browser availability is not proof of official
  eligibility or historical statistical accuracy.
- No production readiness or all-season acceptance claim is made. Subsequent
  historical leaves and the 34o matrix remain pending.
