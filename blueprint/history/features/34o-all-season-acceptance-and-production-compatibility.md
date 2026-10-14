# Feature: All-season acceptance and production compatibility

**From build-plan:** feature 34o
**Build attempt:** 1
**Type:** Feature
**Status:** verified
**Branch:** feature/all-season-acceptance-and-production-compatibility

## Goal

Prove, with repeatable local evidence, that every season `E2000`-`E2026` is presented correctly for its format and that the shared changes of feature 34 did not break the modern seasons; then record, from local evidence and configuration only, whether the app is compatible with the Neon app tables and the four-season allowlist, and what a later production rollout still needs. This leaf verifies and reports. It fixes nothing: a defect found becomes a separate reviewed `/fix`. No production import, paid storage change, push or deployment is included.

## What exists today

- A read-only, local-only format checker: [scripts/check-season-formats.mjs](scripts/check-season-formats.mjs) (refuses unless `/api/health` reports `local`, exits 0/1/2, prints one line per season with its stages and `issues`).
- 85 browser spec files in `frontend/e2e/` covering most pages and every format transition leaf (34c-34n) with their own acceptance reports in `blueprint/reference/`; `npm run test:browser` runs the whole suite. The last full-suite run predates 34d-34n.
- The 34a inventory's season matrix (section 3), exceptional results register (section 10) and repeatable-check recipe (section 13) are the baseline; the 34n ledger ([34n-coverage-gaps.md](blueprint/reference/34n-coverage-gaps.md)) lists what it left for this leaf: pre-2007 coverage wording, the scaled records minimum on grouped seasons, and Neon compatibility.
- The Neon allowlist is `NEON_SEASONS = E2023-E2026` and the local list `E2000-E2026` in [season-catalog.ts](backend/src/db/season-catalog.ts), chosen by `DB_TARGET`.
- The pipeline's publisher and the Neon database are outside this repository and workspace; the real `.env` must never be opened.

## In scope

- **Season matrix script.** A new read-only, local-only `scripts/check-season-matrix.mjs` (same guard and exit codes as the format checker) that, for every season, fetches the season, phases, rounds, latest standings per table phase, all games, postseason series and coverage, and compares them with the season's format and the inventory baseline: phases equal the format's stages, groups and clubs per group, snapshot rounds, played versus total games per stage, series counts and win thresholds, final standings positions unique and contiguous per group, qualifiers equal the next stage's field, and the champion (final result) or cancellation. One line per season; non-zero exit on any mismatch.
- **All-season browser acceptance.** A new `frontend/e2e/all-seasons.spec.js` that runs, for each of the 27 seasons, the pages that show format facts (Home, Overview, Standings per phase, Games per phase, Postseason, Teams, Leaders) and asserts: no error state and no console error, the season's group structure and stage names, the champion or the cancelled notice, no modern-format wording on historical seasons, and that URL state (`phase`, `round`, `group`, `stage`, `view`) survives reload and the season switcher keeps the page. For the season identities, Records, player career and head-to-head: every loaded season appears and no unloaded one does.
- **Themes and layouts.** For one season per format transition (E2000, E2001, E2002, E2004, E2008, E2012, E2016, E2019, E2021, E2023, E2025, E2026) the Postseason and Standings pages are checked in both themes (`light-euroleague`, `dark-euroleague`) at 320, 390, 768 and 1024 px for overflow and visible text using the existing layout helpers.
- **Modern regression and the broad suite.** The full `npm run test:browser` suite against the local target (`/api/health` `target: local`), plus root `npm run build` and `npm --prefix frontend run lint`. Failures are classified by re-running them alone: real defect (to a separate `/fix`), flake (recorded), or environment.
- **Neon and publisher compatibility, from local evidence only.** Inspect (read-only) `season-catalog.ts`, the Drizzle table definitions and `.env.example`; record that the Neon allowlist is unchanged, that every `app_*` table and column the backend reads is answered by the local API for all 27 seasons, which routes and tables are season-gated, and what the code assumes of the Neon schema. State plainly that the publisher, the Neon database and its row volumes were not inspected, and list them as rollout prerequisites. Never open `.env`; never touch Neon.
- **Acceptance report** `blueprint/reference/34o-acceptance.md`: the matrix results per season, the browser and suite results, every defect found with its owner, what was not verified, and the ordered rollout prerequisites. It also closes feature 34 by naming the pipeline-owned gaps that stay open (qualifying games, the E2000 replay, the E2021 snapshot alignment).

## Out of scope

- Fixing any defect found (a separate `/fix` each), new features, or redesign.
- Any Neon access, production import, paid storage change, publisher change, push, deployment or pipeline work; the separate FIBA SuproLeague; seasons before `E2000`.
- Changing the Neon allowlist or `DB_TARGET` behaviour.

## Build loop

Per `blueprint/config.json` (`workflow.stepReview: feature`, no checkpoint commits): build the steps in order, run each step's narrow check, then one final pass and one review packet. `/complete` makes the single commit. If a step finds a defect, record it in the report and continue; do not repair it inside this leaf.

## Build steps

- [x] **1. Season matrix script.** Add `scripts/check-season-matrix.mjs` as described, reading its expectations from the format API and the inventory facts (section 3 and 10) rather than inventing values; a mismatch prints the season, field, expected and found. Done when, with the backend on the local target, it exits 0 and prints 27 lines (champion or "cancelled" included), and it exits 2 without output of data when the API reports `neon`.
- [x] **2. All-season browser acceptance.** Add `frontend/e2e/all-seasons.spec.js` per scope, generating tests per season so a failure names the season. Done when `npx playwright test all-seasons.spec.js` passes against `target: local`, including URL-state reload, season switching, and Records, career and head-to-head containing exactly the loaded seasons.
- [x] **3. Themes and layouts.** Add the transition-season theme and width checks to the same spec file (or `all-seasons-layout.spec.js`). Done when they pass in both themes at the four widths with no overflow offenders and visible stage text.
- [x] **4. Full suite and regression.** Run `npm run test:browser` once (in the background; it is long), re-run each failure alone, run root `npm run build` and `npm --prefix frontend run lint`. Done when every failure is classified and recorded with its evidence, and build and lint pass.
- [x] **5. Neon and publisher compatibility inspection.** Read-only inspection as scoped above, recorded as a table: item, evidence (file and line, or local API check), result (compatible, unchanged, not inspected). Done when the allowlist, the table and column list, the season gating and the not-inspected items are all recorded and no Neon call or `.env` read happened.
- [x] **6. Acceptance report.** Write `blueprint/reference/34o-acceptance.md`. Done when it contains the 27-season matrix, the browser and suite results, the defect list with owners, the not-verified list and the ordered rollout prerequisites, with every claim tied to a command or page run in this leaf.

## Files / areas

- scripts/check-season-matrix.mjs (new); frontend/e2e/all-seasons.spec.js (new) and optionally all-seasons-layout.spec.js.
- blueprint/reference/34o-acceptance.md (new). No backend or frontend product code change.

## Data / contracts

- The script and spec only read the existing local API and pages; `/api/health` must report `"target":"local"` before any run, and both refuse otherwise.
- Baseline: the 34a inventory (sections 3, 10, 13) and the registry; champions and cancellation are read from the data and compared with the inventory, never typed in from memory.
- Exit codes follow the format checker: 0 all match, 1 mismatch, 2 cannot run.

## Testing

- `node scripts/check-season-matrix.mjs` against the local backend; `npx playwright test all-seasons.spec.js` (and the layout file); the full `npm run test:browser`; `npm run build`; `npm --prefix frontend run lint`.
- Not claimed: anything about Neon, the publisher, production data or row volumes.

## Notes for the AI

- Verification only: report defects, do not patch them. A flaky test is rerun alone before it is classified.
- Run the long suite with `run_in_background` and read its result when notified.
- Project rules apply: Playwright only against the local database, never read `.env`, no AI attribution on commits.
- Keep the script and spec data-driven from the format API so a future season needs no edit.

## Results

Verified on 2026-10-14 against the local database (`/api/health` reported `target: local`). Full evidence, the 27-season matrix, the Neon inspection table and the ordered rollout prerequisites are in [34o-acceptance.md](../../reference/34o-acceptance.md). This leaf changed no product code and found no defect.

- `scripts/check-season-matrix.mjs` (read-only, local-only): exit 0 for E2000-E2026; exits 2 against a `neon` target.
- `frontend/e2e/all-seasons.spec.js`: 85 per-season and URL-state tests plus 2 theme and layout tests (12 transition seasons, both themes, 320/390/768/1024 px) passed.
- Full suite `npm run test:browser`: 968 passed, 2 failed (`phone-menu` reduced motion, `scroll-to-top` query-string scroll), both passing when re-run alone (timing flakes). `npm run build` and `npm --prefix frontend run lint` passed.
- Neon and publisher compatibility from code only: allowlist, default target and schema files unchanged across feature 34; Neon, the publisher and row volumes not inspected.
- Not run: any Neon, production or publisher check.
