# Feature: Sixteen-team league without Play-In (`E2016`-`E2018`)

**From build-plan:** feature 34d
**Build attempt:** 1
**Branch:** feature/sixteen-team-league-without-play-in-e2016-e2018
**Status:** verified

## Goal

Make the existing explorer correctly present all three 16-club seasons: one regular-season table, 30 games per club, direct qualification for the top eight, best-of-five quarterfinals and Final Four with a third-place game. Verify each season's actual data and page behavior locally.

## In scope

- Reuse the shared format registry and API. `E2016`, `E2017` and `E2018` already declare `RS`, `PO`, `FF`, 16 clubs, 30 RS games, ranks 1-8 qualifying directly, three wins to clinch a quarterfinal, and a third-place game.
- Make postseason construction, race calculations, labels, stage timeline, explanations, bracket layout and finish lists respect absence of `PI`. Quarterfinals are 1v8, 2v7, 3v6, 4v5; semifinal paths connect winners of 1v8 and 4v5, and winners of 2v7 and 3v6. Verify these against recorded pairings for each season before treating them as authoritative.
- Keep recorded, projected and unknown participants distinct. In a pre-playoff state, seed 7 and seed 8 enter quarterfinals directly. A 2-0 or 2-1 series lead cannot advance a club; three wins can. Match recorded series by stage and pairing, including reversed club order.
- Use rank eight as the sole qualification/race cutoff. Remove Play-In bands, placeholders and wording for these seasons, including race status chips and explanatory text. Keep conservative clinch/out behavior when ties remain possible; official final ranks determine completed-season qualifiers.
- Validate Home, Overview, Standings (including historical race playback and advanced/breakdown views), Games/Game Detail, Teams/Team Detail, Players/Player Detail, Leaders, Compare/head-to-head, Postseason, and existing Records/career views for each season. Change only behavior contradicted by this era's verified rules.
- Preserve existing filters, shareable URLs, season-specific identities, nullable statistics, qualification samples, stage-specific round labels, and coverage states. E2018 has event/shot data for 259 of 260 games; missing evidence must remain unavailable rather than becoming zero.
- Preserve modern `E2023`-`E2026` behavior and the existing theme, keyboard and responsive conventions.

## Out of scope

Other historical eras, cancellations/exclusions, groups, qualifying stages, new metrics or career leaderboards, a new tiebreaker/prediction engine, schema or pipeline changes, data writes/imports, new dependencies or test runners, production publishing, paid storage changes, push and deployment.

## Build loop

The spec requires approval before `/implement`. Use one feature branch with small working steps, then one feature-level review packet (`workflow.stepReview: feature`). Checkpoint commits are disabled. `/complete` owns the final feature commit and archival after final gates and review. No subagent is needed for this spec; do not use Astra. If later delegated work is required, use the user's requested 6.1 Sol model.

## Build steps

1. [x] Support direct-top-eight bracket and race logic using the existing format contract.
   - Check actual local format, final RS standings, recorded PO/FF pairings and round identifiers for all three seasons against the inventory. Stop for separately reviewed repair if required data contradicts the verified contract.
   - Update `bracketModel.js` so a known format without `PI` produces an empty Play-In array, no Play-In entries in `all`, direct seeds 7/8, and safe placements without Play-In entries. Derive qualification/race cutoffs from the rules rather than falling back to ten when no Play-In tier exists.
   - Retain stage/pair matching and the existing clinched-winner seam. Add focused cases through the installed Playwright harness, including direct seeded projections, 2-0/2-1 leads versus three wins, reversed pairing order, missing seeds/series and empty inputs.
   - **Done when:** focused cases show four correctly seeded quarterfinals and no PI slots for the 16-team format; only clinched winners advance; the race uses eight direct places and has no Play-In outcome; existing modern postseason/clinch cases still pass. Backend/frontend builds pass.

2. [x] Present the no-Play-In postseason and race consistently.
   - Update `PostseasonPage.jsx`, `Bracket.jsx` and `RacePanel.jsx` to derive stages, next-stage summary, race labels/cutoff separators and explanations from the known format. Remove the unused PI column and its space/connections; retain the existing stacked phone/tablet presentation and three meaningful desktop columns for quarterfinals, semifinals and final/third place.
   - Keep matchup selection, game links and club-path highlighting working. Ensure an empty `playIn` array is safe in every consumer.
   - Handle format loading and failure explicitly with labelled loading/error/retry behavior. A failed format request must not present modern rules as the historical season's format. Empty standings, missing series/participants and partial coverage retain honest states; missing fixtures cannot prove completion. Do not claim a next stage once the season is confirmed complete.
   - **Done when:** a real local postseason for each season shows no Play-In heading, explanation, participant placeholder or finish label; selected matchups and highlighted paths work; mocked pre-playoff, partial, loading, empty and error states remain understandable. Relevant postseason tests and layout checks at 320, 390, 768 and 1024px pass in both themes without page overflow.

3. [x] Validate the era across the remaining existing pages and repair only confirmed era defects.
   - Check each page listed in scope for all three seasons, including RS round 30, top-eight bands/race playback, actual filters limited to held/available phases, cumulative source rounds, phase-to-statistics scopes and sample qualification. Preserve `RS`, `all` and available postseason `PS` semantics without inventing a PI or TS scope.
   - Check completed Home/Overview have no upcoming games or PI timeline and show the confirmed outcome; fixtures/Game Detail retain recorded stage labels and results. Validate team/player statistics, comparison, head-to-head and loaded-season Records/career identity and null/coverage behavior. Identify the actual E2018 event-data gap from local evidence and verify its unavailable state.
   - Use existing UI/API helpers and components; do not rewrite pages that already work. Safe React text rendering, accessible filter labels, query keys scoped to season/filter and existing bounded validated APIs remain required. Invalid or unavailable phase/filter selections follow the existing reset/error contract; no new URL forms.
   - **Done when:** durable evidence names every season/page check and relevant result; no page contradicts 16 clubs, 30 RS games or direct top-eight qualification; the E2018 missing-data case is honest. Focused affected-page/browser cases and applicable responsive checks pass, as do root build and frontend lint.

4. [x] Close the three-season acceptance matrix and modern regression coverage.
   - Record observed counts, final RS ranks/qualifiers, all PO pairings and win counts, FF pairings, third-place results, champion, scopes and coverage in `blueprint/reference/historical-season-inventory.md` or a linked 34d acceptance report. Extend the inventory's evidence rather than creating a second executable registry.
   - Expected baseline: E2016 has 240 RS + 15 PO + 4 FF games (259), champion ULK/Fenerbahce; E2017 has 240 + 16 + 4 (260), champion MAD/Real Madrid; E2018 has 240 + 16 + 4 (260), champion CSK/CSKA. Each has 16 RS clubs with 30 games each. Check actual winners and placements against official/source-backed evidence, not a derived winner field alone.
   - Run modern focused status, scope, standings and postseason regression cases. Use the full browser suite only if implementation changes reach shared components, routing, the API client or global CSS as required by AGENTS.md; otherwise run named relevant specs.
   - **Done when:** all three seasons have observed data/API/page evidence and source-backed postseason outcomes, no acceptance claim relies solely on one representative season, modern regression checks pass, root `npm run build` and `npm --prefix frontend run lint` pass, and any residual limitation is stated explicitly for review.

## Files / areas

- `frontend/src/postseason/bracketModel.js`, `PostseasonPage.jsx`, `Bracket.jsx`, `RacePanel.jsx`; inspect affected matchup/placement consumers in the same folder.
- `frontend/src/lib/seasonFormat.js`, `frontend/src/standings/` only for confirmed remaining cutoff/label defects. Existing `tableTiers` and `RaceChart` already consume qualification rules.
- `backend/src/db/season-format-registry.ts`, `season-format.ts`, and `backend/src/routes/seasons.ts` for contract validation; no new backend response is expected.
- Existing Home and page areas listed in scope, including `frontend/src/season/SeasonOverviewPage.jsx`; locate their current callers during implementation before any necessary edits.
- `frontend/e2e/`: extend existing postseason/clinch/layout, season-status, home-round-status, stage-scopes and affected-page specs, with a focused historical direct-top-eight spec if clearer.
- `blueprint/reference/historical-season-inventory.md` and an optional linked 34d acceptance report.

## Data / contracts

The server remains the authority for format, availability and recorded results; the client derives display and conservative race/bracket state from that contract. Competition completion and observed coverage remain separate. Reuse current application tables and response shapes. No target-dependent competition rules, new persisted fields, schema changes, authentication or tenant contract are introduced.

Source phase codes remain `RS`, `PO`, `FF`; retain source round keys/numbers rather than imposing modern offsets. Inventory records PO rounds 31-35 and FF 36-37 for E2016/E2018; E2017 PO 31-34 and FF 35-36. Verify local values instead of requiring every season to use identical absolute rounds.

Known absence of PI must differ from unavailable format metadata. Unknown participants remain placeholders for the actual next matchup, never a nonexistent Play-In. Stage/pair identity governs recorded series matching; only verified win targets or an evidenced official ruling establish advancement. Use official final standings for seeds and retain finish-category labels for quarterfinal exits rather than inventing exact fifth-through-eighth ranks.

Public request validation, bounded lists, competition/season scoping and safe errors stay intact. Never read the real `.env`. Confirm `/api/health` reports `target: local` before any browser run or local data/API verification; do not use Neon for acceptance.

## Testing

- Planning evidence: empty active-spec stub; valid config; existing 16-team registry entries; remaining unconditional PI creation/rendering and modern race wording; no feature-34d archive metadata found; clean Git status; exact archive leaf absent with ordinary parents; branch valid and no conflicting local ref; no prior Git use of the planned archive path.
- Frozen completion archive: `blueprint/history/34d-sixteen-team-league-without-play-in-e2016-e2018.md`.
- No declared Verify command or unit-test command exists. No build, lint, dev server, API, browser or live-data check was run during planning. The inventory is prior evidence, to be refreshed during implementation.
- Implementation checks: root `npm run build`; `npm --prefix frontend run lint`; from `frontend`, `npx playwright test <named relevant specs>`, after local health confirmation. Reuse the installed harness for targeted behavior and API checks; do not silently add a unit runner or CI gate.
- Start with direct-top-eight cases plus `postseason.spec.js`, `postseason-clinch.spec.js`, `postseason-layout.spec.js`, `season-status.spec.js`, `home-round-status.spec.js`, `stage-scopes.spec.js`, relevant standings specs and `responsive.spec.js` for layout changes. Include changed-page specs as needed. Test all three seasons directly, with modern regression and controlled partial/pre-playoff/error states.
- Implementation evidence: [34d acceptance report](../reference/34d-acceptance.md). Root build and frontend lint passed; the combined named regression run passed 222 tests, followed by 27 passing focused cases after the final cleanup and stronger historical playback/breakdown assertions. All three local data/format/page matrices passed; no required gate remains failing.
- Configured Audit, Check and try-guide gates are manual and were not invoked. Independent review was not selected for this localized frontend change with no new security or persisted-data boundary. Existing findings F-02 and F-03 are open P3; no P0/P1 blocker or pending review request exists. No commit, merge, push or deployment was performed.

## Notes for the AI

Critique tightened the scope around the existing foundation: do not reimplement registry entries or format-driven standings. The main changes are PI-free bracket/race logic and presentation, with all-season page acceptance. Explicitly cover unavailable format metadata, incomplete series, source round differences, and E2018's one-game event gap. Check exact pairings before relying on the current bracket's top-seed-only lookup. Keep each step working and do not pull 34e or exceptional-season rules into this leaf.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":13678,"specSha256":"f360eccea010fc3beb261813bd7dcc40251a1033028c46a1a3258ea319d4df8e","branch":"refs/heads/feature/sixteen-team-league-without-play-in-e2016-e2018","head":"390d0ffa53a25815f17ce320d524ed3637f03bdc","baseRef":"refs/heads/master","baseCommit":"390d0ffa53a25815f17ce320d524ed3637f03bdc","sourceTree":"6ce70cc47f8ef8c3023670e661b1296d1fbcd278","absentOptional":[]} -->
