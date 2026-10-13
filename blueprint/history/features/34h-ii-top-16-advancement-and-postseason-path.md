# Feature: Top 16 advancement and postseason path

**From build-plan:** feature 34h-ii
**Build attempt:** 1
**Status:** verified
**Branch:** feature/top-16-advancement-and-postseason-path

## Goal

Adapt Postseason for E2012-E2015 to recorded Top 16 group qualifiers,
cross-group quarterfinals and the actual Final Four path. Preserve the modern
single-table bracket and keep unverified matchups or placements unknown.

## In scope

- All four seasons: RS groups A-D feed the recorded Top 16 groups E/F. Top 16
  is a table stage with its own `TS` scope, followed by top-four-per-group
  qualification to best-of-five quarterfinals and the Final Four.
- Read TS standings and source group positions instead of treating repeated
  RS positions as global seeds. Identify clubs by stable season-scoped IDs;
  display group-position labels such as E1/F4, not invented overall ranks.
- Use recorded PO pairs as authority. Check the inventory's observed
  E1-F4/F1-E4/E2-F3/F2-E3 pattern independently for each season before presenting
  it as that season's verified mapping. Missing or conflicting pairing evidence
  stays unknown; no universal draw rule or modern 1v8 projection is assumed.
- Follow recorded FF semifinals, final and placement games. Verify their source
  round/group labels through existing game and round reads. Do not assume the
  modern fixed semifinal feeder arrangement or classify a game by array order.
- Keep a series leader separate from a winner: three wins clinch PO, one
  confirmed win decides an FF game. Preserve actual scores, dates and available
  matchup detail; nullable data remains unavailable.
- Explain RS-to-Top-16-to-Playoffs progression in the page's stages and help
  copy. Remove modern global-seed explanations and Play-In placeholders from
  this path. Link group qualification context to the existing TS Standings view.
- Verify all four seasons, partial/unknown states, modern regressions and
  desktop/mobile/tablet layouts, including accessible matchup labels and
  non-color-only completion/placement states.

## Out of scope

34h-iii remaining-page/statistics adaptations; older Top 16 eras; qualifying
games; general draw/tiebreaker engines; new formulas; schema/data/pipeline writes;
new API endpoints or response fields; new dependencies; historical Neon imports,
push and deployment. Do not add a grouped mathematical live qualification race
or a prediction engine to this leaf.

## Build loop

Approve this spec before `/implement`. Build the steps, then present one final
review packet; checkpoint commits are disabled. `/complete` owns the final
feature commit and merge. Regular audit, Check and try-guide gates are manual;
independent review remains conditional on sensitive or unusually broad work.

Freeze attempt 1 and archive path
`blueprint/history/features/34h-ii-top-16-advancement-and-postseason-path.md`.
No prior matching feature record or archive-path Git use was found. The exact
archive leaf is absent, its parents are ordinary directories, and the configured
branch is valid with no existing or conflicting local ref. No branch is created
by this planning command.

## Build steps

1. [x] **Establish the recorded grouped path and build its model.** Inspect
   each season's TS standings, PO series, FF games and phase round names against
   the inventory. Record actual group qualifiers, quarterfinal pairs, semifinals,
   final and any confirmed placement game in a focused acceptance report.
   Implement a small grouped path within or alongside the existing bracket
   model, selected for `top16TwoGroups`; reuse clinch and score helpers. Preserve
   the existing slot/series contract where possible. PO slots identify their
   participants by recorded pair and TS group rank. FF slots identify their
   recorded participants and confirmed result, with feeder links only when
   supported by the recorded path. Keep unmatched/conflicting evidence visibly
   unavailable rather than filling it with a global seed. A later recorded
   participant must not manufacture a missing earlier series-clinch result.
   **Done when:** focused model cases cover all four seasons' recorded paths,
   reversed club order, duplicate group ranks, 2-0/2-1 leads versus a three-win
   clinch, missing standings/series/draw labels and stage/pair mismatches. No
   branch is filled from an unverified group or a modern fallback seed map;
   existing modern/direct-eight model cases still pass.

2. [x] **Integrate grouped Postseason and truthful bracket presentation.**
   Read RS and TS context separately for the grouped path. Treat TS completion
   and observed PO evidence separately from RS completion; a finished RS does
   not mean the quarterfinal field is settled. Retain recorded participants and
   unknown placeholders when earlier coverage is partial. Update the stage
   summary and explanatory copy; keep Top 16 out of knockout/PS classifications.
   Update matchup seed labels/tooltips to show TS group places. Lay out the
   quarterfinal column and semifinal connections according to the recorded
   feeder relationships, not fixed modern slot adjacency. Unknown relationships
   must not acquire connector lines implying a draw. Preserve keyboard selection,
   club focus/highlighting, matchup detail, links, scores and existing layouts.
   Suppress the global-seed RacePanel for grouped seasons; refer users to TS
   group standings instead. Derive champion/runner-up from a confirmed final,
   and third/fourth only from a verified played placement game. Without such
   evidence, show Final Four participation or an unavailable result, not exact
   third/fourth ranks.
   **Done when:** E2012-E2015 show the RS/TS/PO/FF path, group-qualified
   quarterfinal labels and recorded semifinal/final results without Play-In or
   global 1v8 copy. A series lead does not advance a club; missing draw/results
   remain unknown. Loading/error/retry/empty states preserve season context,
   and modern and cancelled-season Postseason behavior still passes.

3. [x] **Verify each season and responsive acceptance.** Add focused existing
   Playwright helper/API/browser cases and refresh the inventory's evidence for
   this leaf. Check qualifiers and every recorded pair/result for every season,
   not just one representative year. Exercise partial PO, absent TS/group ranks,
   unplayed FF fixtures, missing placement games, failed format/data requests,
   season switching and stale selected matchup state. Check both themes at
   320/390/768/1024px, with readable group-position labels, stage names, connector
   meaning, focus and detail content. Record observed results and unresolved
   source facts in `blueprint/reference/34h-ii-acceptance.md`.
   **Done when:** the four-season matrix and focused grouped/modern/direct-eight/
   clinch/cancellation/Postseason-layout cases pass against `target: local`,
   root build and frontend lint pass, and the report does not claim qualifying
   or remaining-page work is complete.

## Files / areas

- `frontend/src/postseason/bracketModel.js`, `PostseasonPage.jsx`, `Bracket.jsx`,
  `Matchup.jsx`, `MatchupDetail.jsx`, `ChampionPanel.jsx`; a small local grouped
  model/helper only if needed to keep the existing modern path readable.
- Existing `frontend/src/lib/seasonFormat.js`, `phaseSummary.js`, API helpers,
  grouped Standings routes and shared UI/theme/animation primitives.
- Existing backend `season-format-registry.ts`, `season-format.ts`,
  `season-games.ts`, `season-standings.ts` and routes are contract evidence;
  existing bounded reads supply the required information.
- Existing `postseason.spec.js`, `postseason-clinch.spec.js`,
  `historical-direct-eight.spec.js`, `postseason-layout.spec.js`,
  `cancelled-season.spec.js`, `responsive.spec.js` and a focused grouped-path spec.
- Existing historical inventory and the new 34h-ii acceptance report.

## Data / contracts

- Existing API responses and stable identifiers remain unchanged. Read TS
  `groupName` plus `basic.position` as group-local identity, never an official
  global seed. Source rounds remain phase-scoped original keys; round names
  and game group labels supply display/classification evidence.
- Series keys remain season, phase and unordered club pair. `winnerClubCode`
  from the series feed is a current leader, not a clinch. Reuse registry targets
  of PO three wins and FF one win; do not infer series length from stored games.
- Series `games` contain game/round IDs, dates, club IDs, nullable scores and
  winner IDs, but no game group/round display labels. Use existing FF game and
  round endpoints for classification; do not invent missing fields or derive
  final/third-place identity from row order. Ambiguous or contradictory evidence
  stays unclassified with honest context.
- Keep the internal bracket slot result shape (participants, series, state,
  win target, winner and stable slot ID). Add only internal group-position and
  feeder information needed by the grouped renderer. Modern numeric seed
  semantics remain unchanged. Do not create a second executable format registry.
- Recorded FF participants/results can remain visible when earlier history is
  incomplete, but must not retroactively mark an unclinched PO series as won.
  Future participants require verified qualification/pairing evidence; otherwise
  retain unknown placeholders. No global ranking or tiebreaker reconstruction.
- Missing format metadata must not silently select a modern bracket for these
  seasons. Preserve the existing format-query loading/error/retry boundary.
  Distinguish empty/not-started tables, missing imported history and unknown
  draw/results. Reset selected matchup and club focus when season/path changes.
- Render names, group labels and notes as React text. Keep public API reads
  competition/season scoped, parameterized, validated and bounded. No auth,
  tenant, sensitive-data or persisted-data boundary is introduced.

## Testing

Reuse the installed Playwright harness for model cases and actual local API/
browser evidence. No unit runner, Verify script or CI gate is added. Check
`/api/health` for `target: local` before every browser run. Run the focused
grouped-path spec plus relevant existing Postseason/clinch/layout, direct-eight
and cancellation regressions; include `responsive.spec.js` for layout work.
Do not run the whole browser suite without a new reason. Final automated
commands are `npm run build` and `npm --prefix frontend run lint`.

No Verify command is currently declared, so none was run during planning.
No live/API/browser/build acceptance is claimed by this spec. Never read the
real `.env`, start dev servers during planning or verify against Neon.

## Notes for the AI

The critique removed two inherited assumptions: global RS seeding and fixed
modern semifinal feeders. The inventory's quarterfinal pattern remains an
observation to verify per season, not permission to invent a universal draw.
The planned unknown states allow implementation to begin safely from recorded
evidence without a new product decision or hidden pipeline repair. Keep exact
placement claims tied to recorded classification/results. Use existing styles,
small local functions and cached reads; no general tournament engine. This is
functional adaptation, not visual replication. Leave 34h-iii and later leaves
pending.

## Implementation evidence

- `npm run build`: backend and frontend passed.
- `npm --prefix frontend run lint`: passed.
- From frontend, `npx playwright test grouped-postseason.spec.js
  postseason.spec.js postseason-clinch.spec.js historical-direct-eight.spec.js
  cancelled-season.spec.js postseason-layout.spec.js responsive.spec.js`:
  213 passed (1.9 minutes) against a confirmed local target.
- After a stage-specific unavailable-data link correction, final focused
  `npx playwright test grouped-postseason.spec.js`: 11 passed (14 seconds).
  Build and lint passed again. The correction affects only grouped warning
  links; modern/cancellation behavior is unchanged.
- Each season's 16 recorded TS participants match the RS group top-four clubs.
  All eight PO participants match the TS group top-four qualifiers. Every PO/FF
  pair and recorded result was checked, including the champion and played
  placement game. The source semifinal feeder pattern is consistent in these
  four seasons; it is derived from recorded games rather than a universal draw.
- Model/browser cases cover 2-0/2-1 leads versus a three-win target, reversed
  series order, absent/conflicting ranks/pairs, missing game classifications,
  partial results, unplayed FF/placement games, missing placement games,
  format retry, season switching and selected-detail reset.
- Both themes passed all four seasons at 320/390/768/1024px. Screenshots from
  the final focused tests were visually inspected for the desktop bracket and
  mobile group-position labels; files are ignored local Playwright evidence.
- `git diff --check`: passed. No blocking P0/P1 finding or pending independent
  review. Unrelated open P3 findings F-02/F-03 remain. Audit, Check and try-guide
  gates are manual; independent review is not selected for this bounded client
  postseason adaptation with no persisted-data/security mutation.
- The configured Playwright harness managed the frontend server as documented
  in AGENTS.md. An initial exploratory run was interrupted after its test cases
  completed because server cleanup hung under sandbox process restrictions;
  the final elevated harness runs exited cleanly and supply the passing evidence.
- `blueprint/reference/34h-ii-acceptance.md` records observed source contracts
  and remaining scope. No commit, merge, push, data write or deployment occurred.
  Ready for `/complete`; this leaf and its parents remain unchecked until then.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":13813,"specSha256":"ae18c7ee442b00535a323d9b5e7adac8811fbb87539947410cb2a2cef82313fe","branch":"refs/heads/feature/top-16-advancement-and-postseason-path","head":"50a7dfa684be0a757e1fb772b4a4afb786febe53","baseRef":"refs/heads/master","baseCommit":"50a7dfa684be0a757e1fb772b4a4afb786febe53","sourceTree":"71d1bd271064fccf0a60b65d0a74f32c860f2f87","absentOptional":[]} -->
