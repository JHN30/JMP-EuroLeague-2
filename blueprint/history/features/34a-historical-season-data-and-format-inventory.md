# Feature: Historical season data and format inventory

**From build-plan:** feature 34a
**Build attempt:** 1
**Status:** verified
**Branch:** feature/historical-season-data-and-format-inventory

## Goal

Establish a source-linked, data-backed inventory for every EuroLeague season from `E2000` to `E2026`, so feature 34's later work adapts verified formats and actual local application data. Record discrepancies, unavailable evidence and required pipeline work before changing how the app presents historical seasons.

This spec is a review handoff. The inventory itself has not been performed or accepted merely because this spec and the roadmap exist.

## In scope

- All 27 seasons, with main-competition participants distinguished from qualifying-only participants and the separate 2000-01 FIBA SuproLeague excluded.
- Read-only local database/API inspection, repository and accessible pipeline-contract inspection, and historical source research. Official standings, game records, announcements and season-specific regulations are preferred; secondary sources and the supplied guide must be labelled accordingly.
- Actual source phase, group and round identifiers; stage order and names; planned versus observed participants and games; official standings, snapshot coverage, qualification rules and cross-group qualifiers; recorded series and bracket mappings; series lengths, placement games and champion or cancellation outcome.
- Game/result eligibility, forfeits, annulments, exclusions, replays and disciplinary rulings, with standings and performance-statistics treatment checked separately.
- Coverage and scope semantics for the app's existing team/player statistics, advanced tables, play-by-play, shots, identities, rosters, Records, player season history and head-to-head.
- A durable report at `blueprint/reference/historical-season-inventory.md`, with an entry for every season, source links, dated evidence, repeatable read-only checks, prerequisite gaps and their affected feature-34 leaves.

## Out of scope

- Frontend/backend source changes, new API routes, executable format configuration, tests or dependencies, schema changes, ETL execution, data replacement or historical imports.
- Neon queries or development/test runs against Neon, production publishing, paid storage changes, push or deployment.
- Reading or printing the real `.env`, credentials, connection strings or sensitive logs.
- Recomputing public standings or creating a general tiebreaker, prediction or statistics engine.
- A visual redesign, new competition, new career leaderboard or extension of the archive before `E2000`.
- Treating an unverified rule, inaccessible regulation or missing local stage as a confirmed fact.

## Build loop

- After spec approval, run `/implement` for this leaf on the recorded branch. This work item produces research evidence and documentation, not app implementation.
- `workflow.stepReview: feature`: complete the small steps below, then present one review packet containing the report, discrepancies and follow-up prerequisites. Do not implement the later roadmap in this branch.
- `workflow.checkpointCommits: disabled`: no step commits. `/complete` owns final checks, archive and the feature commit, with its usual approval boundaries.
- Continue one reviewed leaf at a time after 34a. Identifying a needed pipeline change records a handoff; it does not authorize that change or access to a different workspace.

## Build steps

- [x] 1. **Establish the local evidence boundary and data baseline.** Confirm the configured database target without opening the real `.env`. Before any local app/API verification, check `/api/health` for `target: local`; if no suitable server or read-only database access is available, report the exact access prerequisite rather than substituting Neon. Inspect the local application schema and collect season, phase, group, round, standings and statistics-scope coverage using read-only queries. Record the existing modern API contract and allowlist from source as the regression baseline.
  Done when: the report identifies the evidence target/schema and date, has a row for every `E2000`-`E2026` season (including missing/unavailable evidence), preserves actual source IDs, distinguishes qualifying from main-stage counts, and includes repeatable checks without credentials. No data or schema was changed and no verification ran against Neon.
- [x] 2. **Reconcile historical formats with official evidence.** Compare the guide and local data against season records and accessible season-specific regulations. Cover all format transitions, qualification/draw restrictions, cross-group comparisons, series lengths, placement games and outcomes. Verify the guide's approximate E2019 completion counts against actual evidence, E2021 original versus eligible clubs and corrected records, and E2000's individual elimination stages. Check known forfeits/replays and record discrepancies rather than silently selecting a convenient source.
  Done when: every season has an expected-versus-observed format entry with source links and a verification status. Every uncertain qualification, tiebreak, mapping, placement or exceptional result is explicitly unresolved with its affected later leaf and required evidence; no uncertain rule is presented as authoritative.
- [x] 3. **Confirm application contracts and prepare the implementation handoff.** Check stage/group standings availability and joins; source versus display round numbering; series leader versus clinched winner semantics; whether early knockout and qualifying games survive the current series projection; cancelled/postponed/annulled/forfeit eligibility; and the membership of phase, `all` and `PS` statistics scopes. Check archived result, team/player statistics and record eligibility separately. Review local/Neon mappings and available publisher/schema evidence without connecting to Neon or running the publisher. Identify mismatches that need separately reviewed pipeline or application work.
  Done when: the report maps supported facts and gaps to 34b through 34o, includes concrete checks for all-season API acceptance and representative browser cases, and identifies which rules/contracts are ready for 34b versus blocked by missing evidence. The review packet clearly separates historical facts, observed local data, documented claims and pending checks; existing production behavior is not claimed to have been live-tested.

## Files / areas

Deliverable: `blueprint/reference/historical-season-inventory.md` (created when 34a is carried out, not a placeholder written during planning).

Read-only references and inspection areas:

- `euroleague_historical_formats.md`, `DATA_DICTIONARY.md`, `blueprint/build-plan.md`, `blueprint/project-plan.md`, `blueprint/context/project-overview.md` and applicable project instructions.
- `backend/src/db/season-catalog.ts`, `season-schema.ts`, `season-standings.ts`, `season-games.ts`, `season-stats.ts`, `season-advanced.ts`, `season-advanced-schema.ts`, `season-records.ts` and `season-identities.ts`.
- `backend/src/routes/seasons.ts`, `backend/src/config/env.ts`, `backend/src/db/client.ts` and `backend/.env.example` for contracts and database switching.
- `frontend/src/lib/phaseSummary.js`, `usePhaseParam.js`, `useCurrentPhaseCode.js` and `api.js`; existing `dashboard`, `season`, `standings`, `postseason`, `games`, `teams`, `players`, `leaders`, `comparisons` and `records` consumers; `frontend/src/teams/teamLeague.js` for phase-to-statistics scope mapping.
- Existing `frontend/e2e` specs and `frontend/playwright.config.js` as text to identify reusable verification seams. Accessible pipeline references named in the dictionary may be read if available; absence becomes a documented prerequisite.

## Data / contracts

- Every season-dependent read retains `competition_code = 'E'` and the selected `season_code`; game/club/person identifiers alone are not globally unique.
- Inspect existing curated local Gold/application tables. Use read-only SQL transactions where direct database access is used, with bounded queries/timeouts. No new schema, persistent helper view or ETL run is needed for this inventory.
- Preserve raw source phase/group/round keys separately from human stage names. Do not infer stage identity only from the round number or assume group labels are unique across phases.
- The dictionary documents `app_postseason_series` as PI/PO/FF pairings and its `winner_club_code` as the team with more wins. Confirm the actual projection's semantics, then document what later advancement logic must use. Stored game count alone cannot prove a best-of-N target or completion.
- Competition outcome, expected schedule, actual played games, eligibility and imported data coverage are separate evidence categories. Missing future rows cannot prove completion; a cancelled season cannot have a projected champion.
- Official standings are authoritative. Reconciliation with game-derived records identifies known differences; it does not replace ranks or apply modern tiebreakers retroactively.
- Record scope membership and eligibility per published statistic where available; do not assume that standings annulment automatically changes every player statistic or record. Missing box scores/events and disconnected-group advanced ratings remain unavailable, not zero.
- Production initially allows only `E2023`-`E2026`; local accepts `E2000`-`E2026`. That target policy already exists and is not changed by 34a.

## Testing

- Planning evidence so far is repository/reference inspection and the earlier web research. No live local database reconciliation, build or browser run is claimed by this spec.
- During 34a, validate the report's 27-season completeness, source/observation labels, repeatable queries, source links and gap-to-roadmap mapping. There is no app-code diff requiring new automated tests, no declared Verify command and no configured unit gate. Normal final repository checks still apply at completion.
- Plan future checks using the existing Playwright harness and documented build/lint commands. All-season lightweight API/data checks cover every season; deeper cases cover `E2000`, `E2001`, `E2002`, `E2004`, `E2008`, `E2012`, `E2016`, `E2019`, `E2021`, `E2023`, `E2025` and `E2026`, plus remaining seasons' real data and modern regression cases.
- Later behavioral changes need focused series-lead/clinching, group-scope, cancellation, exclusion, forfeit, missing-data, identity and URL/filter checks. Layout changes include `responsive.spec.js` and 320/390/768/1024px evidence in both themes. The final shared integration pass may run the full browser suite locally; 34a does not run it.

## Notes for the AI

- The user requested gradual implementation after planning. The roadmap is approved to be recorded; this spec is awaiting approval. Do not begin later implementation from this planning turn.
- Do not use Astra. Do not spawn subagents for 34a; conduct this bounded inventory directly.
- Reuse the existing app tables and installed tools before proposing new storage, dependencies or abstraction. Explain a real missing contract before recommending a pipeline/schema change.
- Keep public UI implications concrete: correct stage/group labels and qualification, truthful status, real matchups, confirmed outcomes and honest unavailable data. The report is developer evidence, not a new coverage dashboard in the product.
- Preserve the user-supplied markdown and existing unrelated work. Do not add AI attribution to commits or pull requests.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11571,"specSha256":"fdc76eca45f271e8e392278f597c8eda4d7da75e12fb04eb024f66ae3dda1129","branch":"refs/heads/feature/historical-season-data-and-format-inventory","head":"72bdd115cf1821eeded53b2ca249968de260d949","baseRef":"refs/heads/master","baseCommit":"72bdd115cf1821eeded53b2ca249968de260d949","sourceTree":"9d59db88525f8191772b24b6641a0e374709f959","absentOptional":[]} -->
