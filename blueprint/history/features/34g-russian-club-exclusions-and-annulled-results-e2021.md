# Feature: Russian-club exclusions and annulled results (E2021)

**From build-plan:** feature 34g
**Build attempt:** 1
**Status:** verified
**Branch:** feature/russian-club-exclusions-and-annulled-results-e2021

## Goal

Present the 2021-22 season with clear original-versus-corrected competition
context, preserved archived evidence and the existing data caveat on Home only.
The user approved revision and implementation together in this chat. Pipeline
repair and resolution of official statistical eligibility are deferred.

## In scope

- Explain 18 original clubs, 34 planned RS games per club, 15 eligible remaining
  clubs and 28 counted RS games each, using the existing format registry and
  excluded-club exception (CSK, UNK, DYR; decision 2022-03-22).
- Retain the notice on Home only from the completed E2021 warning fix. Keep
  historical snapshots, race playback, form, comparisons, game logs, statistics
  and all four Records categories as available, without asserting their official
  eligibility is settled or making their counts match standings.
- Per the user's placement refinement, show the combined caution and 18/34 versus
  15/28 explanation at the top of Home only. Remove the E2021
  notice from Home's League table and avoid repeating generic table/race notes.
  Keep targeted excluded-club and affected-game context where it is relevant.
- Use the stored corrected final RS standings for current final ranks and the
  existing direct-top-eight postseason path. Confirm Barcelona 21-7, Monaco
  seventh, recorded best-of-five quarterfinals and Efes as champion locally.
- Use corrected final RS standings and show targeted context on excluded clubs' team pages.
  For an RS Game Detail involving an excluded club, distinguish a played
  result removed from standings from a cancelled fixture; retain scores and
  box scores. Do not attach an annulment claim to eligible-only or postseason
  games. Scope notes by matching season, phase and participant IDs.
- Count only unplayed, non-cancelled fixtures as remaining on Team Overview;
  maintain the existing API's cancelled-fixture exclusion from upcoming games.
- Verify E2021 observed data separately from unresolved official statistics
  eligibility and record the accepted caveats in the existing inventory and a
  focused acceptance report.

## Out of scope

Pipeline/snapshot repair, eligibility research as a prerequisite, schema/data
writes, statistics filtering or recalculation, Records qualification changes,
new API fields/endpoints, ranking/tiebreaker reconstruction, new dependencies,
other historical era features, older-season Neon imports, push and deployment.

## Build loop

The approved combined revision/implementation request authorizes implementation
of this packet. Review the finished feature once after the small steps, with
checkpoint commits disabled. `/complete` owns the final commit and merge.
Attempt 1 and the branch/archive identity are frozen; the branch was reserved
for this combined pass after confirming no previous 34g archive or ref existed.
Archive: `blueprint/history/features/34g-russian-club-exclusions-and-annulled-results-e2021.md`.

## Build steps

1. [x] **Explain original and corrected competition context.** Extend
   `frontend/src/lib/seasonFormat.js` using the existing `excludedClubs` exception:
   Overview's RS description distinguishes planned 18/34 from corrected 15/28.
   The top notice on Home only explains corrected standings;
   `CompetitionContext` explains an excluded club's missing final classification.
   Home's League table has no E2021 notice. Supply phase/participant/
   played/status context from Game Detail for targeted archived-game notes.
   Preserve existing cancellation and disciplinary notes and their scoped
   loading/error/retry behavior. A missing or failed format request must not
   produce an invented exclusion note; the shared season warning stays visible.
   **Done when:** helper cases and focused browser checks prove correct season,
   phase and club scoping, the Overview distinguishes both cohorts/schedules,
   the final table remains 15 clubs, excluded-club pages explain their absence,
   and only applicable RS games show played-annulled or cancelled context. The
   generic notice precedes page content and appears only on Home.

2. [x] **Keep cancelled fixtures out of remaining counts.** Adjust the existing
   Team Overview calculation to exclude `gameStatus: Cancelled` while retaining
   unknown/unplayed non-cancelled fixtures. Preserve played archived results,
   form and raw performance statistics as required by the warning-first policy.
   **Done when:** an eligible E2021 club's final RS snapshot shows 28 played and
   zero remaining, cancelled games remain reachable in archived fixtures, and
   season/team upcoming APIs return no cancelled fixture; modern behavior passes
   focused regression checks.

3. [x] **Verify and document warning-first acceptance.** Add focused existing
   Playwright helper/API/page coverage for E2021. Check the original 306 RS
   fixtures, 278 played, 68 played excluded-club games, 28 cancelled games and
   210 played eligible-only games. Check final standings and recorded postseason,
   preserved excluded-club statistics and Records availability. Observe race,
   form, comparisons, player/game logs and records under the existing warning;
   label their unresolved counting differences rather than repair them.
   Update `blueprint/reference/historical-season-inventory.md` and write
   `blueprint/reference/34g-acceptance.md` with observed results and caveats.
   **Done when:** root build and frontend lint pass, relevant browser specs pass
   against `target: local`, the warning and added notes wrap without overflow at
   320/390/768/1024px in both themes, and acceptance explicitly distinguishes
   verified final standings from retained inconsistent snapshots and unresolved
   official statistics/Records eligibility.

## Files / areas

- Approved plans and regenerated `blueprint/context/project-overview.md`.
- `frontend/src/lib/seasonFormat.js`, `CompetitionContext.jsx` and existing
  shared season warning in `frontend/src/season/SeasonLayout.jsx`.
- `frontend/src/games/GameDetailPage.jsx`, `frontend/src/teams/TeamPage.jsx`.
- `frontend/src/dashboard/StandingsSnapshot.jsx` removes the E2021 table footer
  while preserving other seasons' existing competition notes.
- Existing `backend/src/db/season-format-registry.ts`, `season-format.ts`,
  `season-standings.ts`, `season-games.ts`, `season-stats.ts`, `season-records.ts`
  are data/contract evidence; no backend contract change is planned.
- `frontend/e2e/competition-context.spec.js`, `season-status.spec.js`,
  `historical-direct-eight.spec.js`, `responsive.spec.js` and a focused E2021 spec.
- Existing inventory and the new 34g acceptance report.

## Data / contracts

Keep existing response shapes and stable IDs. `plannedClubs` and RS
`plannedClubsPerGroup` remain 18; `gamesPerClub` remains the original planned
34, not a source-round count or statistics denominator. The existing
`excludedClubs` exception supplies `clubs`, `decidedOn`, `countedGames: 28`;
latest RS standings supply the corrected remaining cohort. Source rounds remain
1-34. Final ranks come from the stored official table, not raw scores.

Frontend note scoping uses normalized season IDs, RS phase, actual club IDs and
the recorded game's `played`/`gameStatus` fields. A played archived score removed
from standings stays a played archived score; its unknown statistics eligibility
does not become an exclusion filter. Render all copy as React text, with semantic
notices, readable theme contrast and non-color-only meaning.

Maintain existing bounded/parameterized API reads, nullable metrics and separate
loading/empty/error states. The app is public and read-only. No auth or tenant
contract is introduced. Unknown notes remain absent, with existing format-query
error feedback and retry. No `.env` access or production data verification.

## Testing

Use the installed Playwright harness for scoped helper assertions and real local
API/browser evidence. Check `/api/health` for `target: local` before each run.
Run focused E2021, competition-context, season-status, historical-direct-eight
and responsive specs; include existing cancellation cases because the shared
note helper changes. No new unit runner or broad whole-suite run is needed.
Final automated checks: `npm run build`, `npm --prefix frontend run lint`.
No separate Verify command is declared. Do not start dev servers implicitly.

## Notes for the AI

Critique tightened the scope so the warning is an explicit accepted limitation,
not a claim that pipeline or eligibility defects were repaired. Keep the original
schedule metadata and source game statuses intact. Retain existing race/form/
statistics behavior under the caveat. Do not complete 34g during implementation;
the remaining leaves of 34 remain pending. Existing visual styles and tokens
are sufficient; this is contextual adaptation, not visual replication.

## Implementation evidence

- `npm run build`: passed for backend and frontend.
- `npm --prefix frontend run lint`: passed.
- From frontend, `npx playwright test excluded-season.spec.js
  season-status.spec.js`: 18 passed (30.6 seconds) after the final Home-only
  placement refinement. A duplicate Home-link test selector was narrowed to the
  Sections navigation before the passing run; no product repair was needed.
  `/api/health` reported `target: local` immediately before the run.
- The preceding placement regression passed 196 tests, including competition
  context, cancellation and responsive specs. Only the general notice's route
  predicate changed afterward; its Home layout and targeted club/game notes
  remain unchanged.
- The earlier pre-refinement regression run included
  `historical-direct-eight.spec.js`: 219 passed. Postseason rules are unchanged
  by the placement refinement.
- Browser assertions verify the notice precedes Home's header, contains both
  original/corrected counts, does not appear inside the League table, and is
  limited to Home only. Desktop and 320px Home screenshots
  were visually inspected in `frontend/test-results/34g-home-review.png` and
  `34g-home-mobile-review.png` (ignored local evidence).
- The eight focused E2021 tests verify the API counts, corrected final table,
  preserved played/cancelled game evidence, scoped helper cases, failure fallback,
  race/team/statistics/comparison/archive availability, and both themes at
  320/390/768/1024px. Existing cancellation and disciplinary notes also pass.
- `git diff --check`: passed. Plans and overview now carry the approved scope;
  the overview fingerprint was regenerated from the saved plan bytes.
- No P0/P1 blocker or pending independent review. Existing unrelated open P3
  findings F-02 and F-03 remain. Audit, Check and try-guide are configured manual;
  independent review is not selected for this small contextual presentation and
  fixture-count change with no persisted-data or security-boundary mutation.
- Details and accepted limitations: `blueprint/reference/34g-acceptance.md`.
  Pipeline snapshot repair and official statistics/Records eligibility research
  remain deferred. No data writes, commits, merge, push or deployment performed.
- Ready for `/complete`; feature 34g remains unchecked until completion.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11413,"specSha256":"e819f6e2b30bce88db6fee9eec8ac6b8a3c6447e0ba341f5962ba9c53a45c5ec","branch":"refs/heads/feature/russian-club-exclusions-and-annulled-results-e2021","head":"d1e681189be90f767589a69bd0ecdf5f7b2fdeb0","baseRef":"refs/heads/master","baseCommit":"d1e681189be90f767589a69bd0ecdf5f7b2fdeb0","sourceTree":"cdd9efc2960551ec51640832405225952df6de68","absentOptional":[]} -->
