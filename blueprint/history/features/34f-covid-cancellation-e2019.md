# Feature: COVID cancellation (`E2019`)

**From build-plan:** feature 34f
**Build attempt:** 1
**Branch:** feature/covid-cancellation-e2019
**Status:** verified

## Goal

Present the cancelled 2019-20 season as an archive of what was played and the standings at suspension, without inventing a champion, final classification, qualification outcome or future postseason. Keep the planned 18-club, 34-game regular season distinct from its actual completion.

## In scope

- E2019 only, using the existing cancellation exception, season-format response and application tables. Reuse the existing Home/Overview cancellation behavior and scheduled-game exclusion rather than building a second status system.
- Verify the inventory baseline against local data: 18 clubs; 306 planned RS fixtures, 252 played over 28 rounds and 54 abandoned in rounds 29-34; latest standings at round 28; no played PO/FF, postseason series or champion. These are expectations to verify, not executable constants or new live evidence.
- Preserve the original planned 34-game length and recorded results. Explain suspension on 2020-03-12 and cancellation on 2020-05-25 without a champion using source-backed context. Efes's first position at suspension is not a championship or final classification.
- Postseason shows a clear cancellation/no-postseason state. Do not render projected quarterfinals, knockout placeholders, future-stage progress, matchup selection, live qualification race, clinched/out claims, final placements or a champion for a cancelled season. Cancellation takes precedence over derived standings/series state; unexpected source rows must not manufacture an outcome.
- Label E2019 standings and rankings as positions at suspension, not final season finishes. Historical standings playback may remain as a record of played rounds, without live qualification bands or advancement claims. The source's `qualified` flags are not proof of playoff qualification; keep player statistical qualification separate and intact.
- Home, Overview, Standings, Games/Game Detail, Teams/Team Detail, Players/Player Detail, Leaders, Compare/head-to-head, Postseason and Records/career retain valid data and actual available stages/scopes. Expose cancellation context wherever a view could otherwise imply completion, upcoming fixtures or final placement, without repeating a long note on every statistics row.
- Abandoned fixtures remain archived and distinguishable from played results. No old scheduled date is presented as an upcoming game; no unplayed fixture supplies a winner, score, performance, game count or completed round. Preserve existing raw status/played fields and URL/query contracts.
- Preserve loading, empty, unavailable, partial and unexpected-error states; missing format data must not establish a completed season, a champion or a projection. Context errors offer retry, and separately available played-game/statistical data remains usable.
- Preserve both themes, keyboard navigation, visible focus, semantic labels and non-color-only status, safe text rendering, existing URLs and layouts at 320, 390, 768 and 1024px. Keep direct-eight E2016-E2018/E2020/E2022 and modern season behavior working.

## Out of scope

E2021 exclusions, grouped eras, historical qualifying, production imports or publisher changes, schema/ETL or stored-data corrections, new API endpoints or format variants, new rankings/qualification formulas, new bracket or prediction engines, new dependencies/runners/CI, unrelated layout/test cleanup, push and deployment. An actual prerequisite data contradiction requires separately reviewed repair.

## Build loop

Approve this spec before `/implement`. Build on the frozen branch above, reviewing the whole feature packet after the small steps (`workflow.stepReview: feature`); checkpoint commits are disabled. `/complete` owns archival and the final work commit. No Astra subagents. No delegation is expected; any later explicitly selected reviewer must use the user's requested 6.1 Sol model. Run only relevant tests, as requested by the user.

## Build steps

1. [x] Verify the cancellation and recorded-season evidence.
   - Confirm `/api/health` reports `target: local` before any runtime/browser/data checks. Read the E2019 format, phases/rounds, all paginated fixtures, source standings at suspension and representative earlier snapshots, series, scope availability and coverage.
   - Refresh the counts, all 18 clubs' played records, latest source round and exact abandoned-game identities. Verify IST 24-4, MAD 22-6, BAR 22-6 and CSK 19-9 as positions at suspension, not final classifications. Record any source qualification artefacts without rewriting them.
   - Verify suspension/cancellation dates and no-champion decision against authoritative published evidence, recording direct-fetch limitations honestly. Distinguish prior inventory statements from fresh observations. Preserve real played performances and unavailable/null data.
   - **Done when:** a focused `blueprint/reference/34f-acceptance.md` records observed counts, round/standing order, scope/coverage, cancellation sources and exact fixture examples. A required data contradiction stops for separate repair; no database or production write occurs.

2. [x] Make cancellation authoritative on Postseason.
   - Use the existing format status/exception to render a cancellation explanation with no champion or postseason held. Resolve cancellation before normal bracket, race, placement or future-stage presentation; avoid requiring unrelated bracket inputs to prove that the cancelled season has no postseason.
   - Reuse existing page/async/text primitives. Handle format loading/error/retry and an unavailable format without temporarily showing an invented bracket. Keep normal completed/in-progress season paths unchanged. Apply a narrowly scoped model guard only if needed to prevent another reachable caller from constructing cancelled-season outcomes.
   - Add focused Playwright/model cases for real E2019 and contradictory mocked standings/series, including misleading source qualification/leader fields; cancellation must still produce no outcome. Cover missing/empty supporting data and context retry.
   - **Done when:** `/2019/postseason` explains cancellation and absence of a champion/postseason, contains no projected matchup, live race or placement UI, and remains usable without standings/series. Focused tests also prove E2020/E2022 and modern completed/live bracket paths still work.

3. [x] Present suspension standings and archive data consistently.
   - Reuse existing cancellation wording or a small shared presentation where needed in Home, Overview, Standings and team context. Do not add another API contract: `cancelled`, `suspendedOn`, `cancelledOn` and the existing note already carry the ruling.
   - Retain the round-28 standings and archived round playback; label the snapshot clearly, suppress live qualification/finish language, and never transform the source's club `qualified` flags into advancement. Preserve actual records, historical round numbers and all available statistics/breakdowns.
   - Verify season and team `status=scheduled` reads return no E2019 upcoming games, including Compare's game panel. The all-games archive may retain abandoned rows with honest season-cancellation/unplayed context; their detail shows no recorded result or fabricated statistics. Preserve the distinction between competition cancellation and missing performance coverage.
   - Verify representative played Game Detail, Team/Player statistics and game logs, leaderboards, comparison/head-to-head and all four existing Records kinds/career views retain real E2019 performances. Use only actual phases/scopes (inventory expects RS/all advanced data and no PS); invalid PO/PI/FF/TS selections retain existing validation/reset behavior. Preserve existing minimum-game statistical qualification rather than treating cancellation as ineligibility.
   - **Done when:** each affected page has a recorded outcome in acceptance evidence, the snapshot/playback stops at observed played standings, no abandoned fixture appears upcoming or contributes a result, and played performances/qualification remain available. Focused browser cases cover season switching, loading/empty/error/partial data, both themes and all four supported widths on changed UI.

4. [x] Record acceptance and run focused final gates.
   - Update inventory section 5.7 and link the acceptance report with verified cancellation evidence, actual counts, standings at suspension, fixture/status semantics, scopes, qualification/Records samples and coverage/retrieval limitations. Do not turn the inventory into a second registry.
   - Run root `npm run build`, `npm --prefix frontend run lint`, the new E2019 cancellation spec, existing `season-status.spec.js` and the relevant postseason/direct-eight/scope cases by file or test name. Include affected page layout/responsive cases only. No full suite; no unrelated test cleanup.
   - Apply configured regular gates: Audit, Check and try guide are manual; independent review is conditional on sensitivity/breadth. Do not infer permission for a commit, merge or push from configuration.
   - **Done when:** all selected gates pass with exact observed commands/results, every required cancellation behavior has evidence, limitations are explicit and the verified feature is ready for review before `/complete`.

## Files / areas

- `backend/src/db/season-format-registry.ts`, `season-format.ts`: existing E2019 RS-only held-stage/cancellation contract and separation of planned format from observed data.
- `backend/src/db/season-games.ts`: existing season/team scheduled filters and recorded fixture responses; change only if a verified cancellation defect remains.
- `frontend/src/postseason/PostseasonPage.jsx`, `bracketModel.js`: cancellation guard, no bracket/race/placements and focused regression seams.
- `frontend/src/lib/seasonFormat.js`, `useSeasonFormat.js`, `CompetitionContext.jsx`: reuse existing status/exception and query cache; extend presentation only when needed.
- `frontend/src/dashboard/Dashboard.jsx`, `UpcomingGames.jsx`, `StandingsSnapshot.jsx`; `frontend/src/season/SeasonOverviewPage.jsx`: status and snapshot context.
- `frontend/src/standings/StandingsPage.jsx`, `RaceView.jsx` and their existing table/chart/insight components: archival rounds and no live qualification claims.
- Existing Games/Game Detail, Team/Player, Leaders, Compare/head-to-head and Records areas: targeted verification and cancellation-specific repairs only.
- `frontend/e2e/season-status.spec.js`, `postseason.spec.js`, `postseason-clinch.spec.js`, `historical-direct-eight.spec.js`, `stage-scopes.spec.js`, installed page/responsive cases and a focused new cancellation spec.
- `blueprint/reference/historical-season-inventory.md`, `blueprint/reference/34f-acceptance.md`.

## Data / contracts

The API's existing season-scoped format contract owns cancellation and held stages; curated application tables own recorded fixtures, suspension standings, performances and coverage. E2019's registry already declares a planned 18-club/34-game RS, RS-only held stages with no qualification rules, and the cancellation exception. Preserve this contract rather than adding hypothetical PO/FF rows or declaring unplayed games missing results. Its partial RS data state describes observed completion; cancellation is not evidence of a pipeline-loading failure.

The backend's scheduled filter already excludes all games in a cancelled season while all/played fixture reads preserve the archive. Verify both season and team paths. Keep raw source identities, played flags, statuses, null scores and query/error shapes unchanged. The frontend must not promote rank, a source `qualified` flag or a legacy series leader into a cancelled-season outcome. Player statistical qualification and eligible recorded performances remain independent of the competition outcome.

Keep competition/season query scoping, bounded request validation, parameterized server-side reads, deterministic ordering and safe/redacted errors. Repository-authored notes still render as React text. No auth, payment, destructive operation, new persisted-data boundary or external side effect is introduced. Never open the real `.env`; do not verify against Neon or change its allowlist.

## Testing

- Implementation acceptance: [34f evidence](../reference/34f-acceptance.md) records the refreshed local/source matrix, 64 passing relevant regression cases, five passing final Game Detail follow-up checks, final root build/frontend lint and screenshots. No full suite was run. Existing P3 findings remain; no blocking findings or independent-review request exists. Manual gates were not invoked; conditional independent review was not selected for the bounded status/presentation scope.
- Planning observed a clean `master` worktree after 34e, canonical empty active spec, valid config and overview size 27,461 bytes. No prior 34f metadata, exact archive-path history use or branch collision was found. Archive parents are ordinary directories and the exact leaf is absent.
- Frozen archive: `blueprint/history/features/34f-covid-cancellation-e2019.md`; build attempt 1. `/implement` creates the branch after spec approval.
- No Verify or unit-test command is declared. Planning ran no build, lint, browser, server startup or API/database probe. Existing cancellation tests establish prior coverage, not fresh 34f acceptance.
- Use the installed Playwright `npx playwright test <named spec files>` command from `frontend`, with local health confirmation before every run. Cover cancellation precedence, no invented champion/bracket/advancement, archival snapshot/playback, no upcoming abandoned fixture, preserved performances, season isolation and context loading/empty/error/retry. Run relevant layout cases at 320/390/768/1024px in both themes. No new runner or full-suite run.
- Prior cancellation sources are recorded in inventory section 14; implementation must verify the applicable statements and document retrieval limits before relying on them as refreshed evidence.

## Notes for the AI

Critique identified the default bracket-seed fallback and unconditional future-stage presentation as risks even though E2019 has RS-only format metadata. It made cancellation authoritative before those derived outcomes, distinguished historical standings playback from a live qualification race, and kept source club qualification flags separate from player statistical eligibility. Existing Home/Overview and scheduled filtering should be verified and reused.

No material product decision is open. If runtime verification finds a prerequisite data/ETL contradiction, stop for a separately reviewed `/fix`; do not silently expand this feature or repair stored rows. Planning ends at spec review, before code or Git changes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":14921,"specSha256":"29ae18558d815ffeeedf2bd952e5eec03def25fced3dbe9fd428c463ad66e4f0","branch":"refs/heads/feature/covid-cancellation-e2019","head":"bb2de5bbcd223442e2b44566ccc92e9f02b75a82","baseRef":"refs/heads/master","baseCommit":"bb2de5bbcd223442e2b44566ccc92e9f02b75a82","sourceTree":"fe377e25cc23fe9f91b31a79ba2560afcc362ecc","absentOptional":[]} -->
