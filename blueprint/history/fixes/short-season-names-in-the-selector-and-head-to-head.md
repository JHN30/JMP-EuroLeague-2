# Fix: Short season names in the selector and Head-to-head

**Type:** Fix
**Status:** verified
**Branch:** fix/short-season-names-in-the-selector-and-head-to-head

## The problem

The API names each season "EuroLeague 2025-26" (`season.name`). Two places print that name as it is, and it reads long and repeats what the whole app is about:

- the season selector in the header and the phone menu (`frontend/src/season/SeasonSelector.jsx`, one `<option>` per season showing `season.name ?? season.seasonCode`);
- the Head-to-head page's "Season breakdown" rows (`frontend/src/comparisons/HeadToHeadPage.jsx`, `season.name ?? season.seasonCode`).

The Records page and the Season overview already use `formatSeasonLabel(seasonCode)` (`lib/format.js`), which turns `E2025` (or `2025`) into "2025-26".

Found while verifying (agreed with the user to fix here, in the same file): the Head-to-head page asks every season for club A's games (`fetchMergedMatchups`, `getTeamGames` per season), and the API answers 404
`TEAM_NOT_FOUND` for a club that was not in that season. One such answer rejects the whole `Promise.all`, so the page shows "Could not load head-to-head history." for any pair where club A missed a season. It exists on Neon too
(a club promoted after 2023 breaks it) and is hit constantly on the local database since it holds 27 seasons (`head-to-head-layout.spec.js`, "a live pair of clubs fits at every width", fails on it).

## The fix

1. `SeasonSelector.jsx`: each option shows `formatSeasonLabel(season.seasonCode)` ("2025-26"). Its value, the accessible name of the select ("Selected season") and what a choice does are unchanged.
2. `HeadToHeadPage.jsx`: the Season breakdown rows show `formatSeasonLabel(season.seasonCode)` (import it from `lib/format`).
3. `e2e/head-to-head-layout.spec.js`: the Season breakdown test reads "2022-23" and "2024-25" instead of "EuroLeague 2022-23" and "EuroLeague 2024-25".

4. `HeadToHeadPage.jsx`, `fetchMergedMatchups`: a season for which the API answers 404 `TEAM_NOT_FOUND` counts as no games that season (an empty list), not a failure. Any other error (a 500, a network failure) still rejects, so the page's error
   state and Retry stay as they are.
5. `e2e/head-to-head-layout.spec.js`: a mocked test where club A is missing from some seasons (404 `TEAM_NOT_FOUND`) and the page still shows the other seasons' meetings and a Season breakdown of only those.

It must not break: the Season overview title "EuroLeague 2025-26" (it names the competition and stays), the selector's width in the header at 640px and up (a shorter label only makes it narrower) and in the phone menu, or any
address (the selector's values are untouched). A season whose code does not look like a year keeps its code as the label (that is what `formatSeasonLabel` returns), never an empty option.

## Build steps

- [x] 1. **Both labels and the spec.** Make the three changes above.
      Done when: the selector's options read "2026-27", "2025-26", ... (no "EuroLeague"), choosing one still goes to that season's address; the Head-to-head Season breakdown rows read "2022-23" style; the Season overview
      title is still "EuroLeague 2025-26"; `cd frontend && npm run lint` and root `npm run build` pass; `head-to-head-layout.spec.js` and the header tests of `responsive.spec.js` (`-g header`) pass on the local database (`/api/health` says `local`).

- [x] 2. **A club absent from a season.** Items 4 and 5.
      Done when: the mocked test passes (club A missing from two of five seasons: the meetings and the breakdown come from the other three, no error state); the existing error test (a 500) still shows "Could not load head-to-head history." with Retry;
      the live pair test ("a live pair of clubs fits at every width") passes on the local database; lint, root `npm run build`, `head-to-head-layout.spec.js` and `responsive.spec.js -g header` pass.

## Files

`frontend/src/season/SeasonSelector.jsx`, `frontend/src/comparisons/HeadToHeadPage.jsx`, `frontend/e2e/head-to-head-layout.spec.js`.

## Verify

Open any page: the season dropdown in the header (and in the phone menu) reads "2025-26" rather than "EuroLeague 2025-26". Open a Head-to-head for two clubs that have met: the Season breakdown rows read "2023-24" and so on. Run only
`head-to-head-layout.spec.js` and `responsive.spec.js -g header`.

## Built

- `SeasonSelector.jsx` and the Head-to-head Season breakdown show `formatSeasonLabel(season.seasonCode)`; `fetchMergedMatchups` treats a 404 `TEAM_NOT_FOUND` as no games that season (any other error still rejects).
- Evidence (local database, `/api/health` said `local`): the selector's options read "2026-27 | 2025-26 | 2024-25 | ..." (27, no "EuroLeague"), the Season overview title stays "EuroLeague 2026-27", choosing the third option goes to `/2024/overview`;
  `head-to-head-layout.spec.js` and `head-to-head.spec.js` pass (10 tests, including the new mocked one for a club absent from two of five seasons and the live pair test that had failed on the 404), and the header tests of `responsive.spec.js` passed (52) after the selector change.
  Root `npm run build` and `cd frontend && npm run lint` pass.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5175,"specSha256":"6f3a40f4e40d5ec2e350cf5795969eb83e178d50629c0b05b5316b2fef847eb7","branch":"refs/heads/fix/short-season-names-in-the-selector-and-head-to-head","head":"4ba32af05d96317ec26ceb334f4c83332b55e16f","baseRef":"refs/heads/master","baseCommit":"4ba32af05d96317ec26ceb334f4c83332b55e16f","sourceTree":"3d802e826ca30ac3f9cfbe4444babc026cd96e10","absentOptional":[]} -->

## Completion evidence

- Local database (`/api/health` said `local`): the season selector's options read "2026-27 | 2025-26 | 2024-25 | ..." (27, no "EuroLeague"), the Season overview title stays "EuroLeague 2026-27", choosing the third option goes to `/2024/overview`; `head-to-head-layout.spec.js` and `head-to-head.spec.js` passed (10 tests, including the new mocked test for a club absent from two of five seasons and the live pair test that had failed on the 404 TEAM_NOT_FOUND); the header tests of `responsive.spec.js` passed (52) after the selector change.
- Root `npm run build` (with the backend `tsc` check) and `cd frontend && npm run lint` pass (rerun at completion). No `Verify` command is declared in `AGENTS.md`.
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested.
