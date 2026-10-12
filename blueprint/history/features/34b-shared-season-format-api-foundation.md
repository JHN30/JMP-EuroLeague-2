# Feature: Shared season-format API foundation

**From build-plan:** feature 34b
**Build attempt:** 1
**Status:** verified
**Branch:** feature/shared-season-format-api-foundation

## Goal

Classify every season `E2000`-`E2026` by one typed constant of competition format families plus a few per-season
values, and make the API use it: each season accepts only the phases and statistics scopes its format has, a format
response tells pages which stages exist and whether their data is loaded, upcoming or missing, and a checker compares
every season's format with the loaded data. Later leaves (34c onward) adapt pages on top of this.

## In scope

- A format-families constant and per-season entries, built only from facts verified in 34a
  (`blueprint/reference/historical-season-inventory.md`, sections 3-6). Unverified rules stay `null`.
- A startup consistency check of that constant (every season mapped, known stage codes, ordered stages, sane values)
  that fails fast with a clear error.
- `GET /api/seasons/:seasonCode/format`: format, competition status, per-stage observed data and data state, and a
  list of issues where the loaded data contradicts the format.
- Per-season phase and scope filtering on every route that takes a phase or statistics scope, replacing today's fixed
  allowlists: a code the season's format does not have answers `404 PHASE_NOT_IN_SEASON`. This makes the Top 16 (`TS`)
  scope reachable in Top 16 seasons.
- A "Top 16" label in the three frontend scope-label maps, so grouped seasons do not show the raw code.
- A read-only checker script that runs the format/data comparison for all 27 seasons against the local API.

## Out of scope

- Pages consuming the format response or its data states (34c onward). Older-season pages that request a phase their
  season does not have will show their error state until their own leaf adapts them; production (`E2023`-`E2026`) is
  unaffected because those seasons have every phase their pages request.
- Advancement between stages (quarterfinal pairings, E2000 tie-to-round mapping), tiebreakers, the best-sixth
  criterion, champion labels and E2021 statistics eligibility: open in 34a, owned by later leaves.
- Schema, table, pipeline, ETL or Neon changes; qualifying stages (34n); new fields in existing responses.
- `advancedScopeForPhase`, `PHASE_ORDER` and other frontend phase helpers (34c-iii, 34h).

## Build loop

- Work on `feature/shared-season-format-api-foundation`. `workflow.stepReview: feature`: complete the steps, then one
  review packet. `workflow.checkpointCommits: disabled`: no step commits; `/complete` makes the feature commit.
- Do not start a dev server. API checks need the local-target backend running (`/api/health` must report
  `"target":"local"`); ask the user to start or restart it when needed. Never open the real `.env`.
- Before step 3, capture the modern regression baseline (step 3's done-when) from the unchanged backend.

## Build steps

- [x] 1. **Format families and season entries.** Add `backend/src/db/season-format-registry.ts` with the types, the
  `FORMAT_FAMILIES` constant, one entry per season `E2000`-`E2026` (family plus per-season values), helpers
  `seasonFormat(seasonCode)`, `seasonStageCodes(seasonCode)` and `seasonScopes(seasonCode)`, and the consistency check
  run when the module loads.
  Done when: `cd backend && npm run build` passes; every season resolves; a deliberately broken entry (tried locally,
  not committed) makes the check throw; the stage codes match the inventory's section 3 for all 27 seasons.
- [x] 2. **Format endpoint with data states and issues.** Add `backend/src/db/season-format.ts` (observed data from
  `app_games`, the latest `app_standings` round of each table stage and `app_postseason_series`, all scoped by
  `competition_code = 'E'` and the season) and `GET /:seasonCode/format` in `backend/src/routes/seasons.ts`, through
  `requestedSeason` (`400 INVALID_SEASON`, `404 SEASON_NOT_FOUND`); database failures reach the existing error path.
  Done when: every season answers `200` with a contract-valid response; spot checks hold: `E2019` `cancelled`, `RS`
  `partial`, no `PO`/`FF`; `E2026` `inProgress`, `PI`/`PO`/`FF` `upcoming` with no clubs; `E2012` `TS` groups `E` and
  `F` of 8 clubs; `E2000` `PO` knockout rounds with win targets 2/2/3/3; `E2021` exclusion of `CSK`, `UNK`, `DYR`;
  `E1999` and a malformed code answer `400`.
- [x] 3. **Per-season phase and scope filtering.** Replace `ADVANCED_SCOPES`, `SEASON_STATS_PHASES`, `FORM_PHASES` and
  the phase checks of `/phases/:phaseCode/*`, `/games?phase`, `/team-stats?phase`, team `team-stats?phase` and player
  shots with the season's allowed codes from step 1. Order: a code unknown to the competition keeps its current `400`;
  a known code the season does not have answers `404 PHASE_NOT_IN_SEASON`; an allowed code then follows today's data
  checks unchanged (for example an upcoming phase with no rows keeps its current answer). `/advanced/*` `scopes` lists
  keep today's order with `TS` after `RS` when present. `/season-stats` accepts `TS` only if the source season table
  holds `TS` rows (checked here; otherwise record why and leave it out). Add the "Top 16" label to the three
  `SCOPE_LABELS` maps.
  Done when: `E2012` `/advanced/standings?scope=TS`, `/leaders/form?phase=TS` and `/team-stats?phase=TS` answer `200`
  with Top 16 rows; `E2012` `?phase=PI` and `E2023` `?scope=TS` answer `404 PHASE_NOT_IN_SEASON`; `E2019`
  `/games?phase=PO` answers `404 PHASE_NOT_IN_SEASON`; the baseline responses for `E2023`-`E2026` (phases, rounds,
  standings, games by phase, team stats, `/season-stats` by phase, `/leaders/form` by phase, `/advanced/standings` and
  `/advanced/leaders` by scope) are byte-identical; root `npm run build` and `cd frontend && npm run lint` pass.
- [x] 4. **All-season checker.** Add `scripts/check-season-formats.mjs` (Node, no dependencies): refuse to run unless
  `/api/health` reports `"target":"local"`, read `/format` for every season, print one line per season (family, status,
  stages with data states, issue count) and the issues, exit non-zero when any issue exists. Fix any issue caused by a
  wrong registry value; report data issues instead of changing data.
  Done when: the script runs over all 27 seasons; its output is in the review packet; every issue left is either
  resolved or listed as a data finding with its owning leaf; a temporarily edited registry value (not committed)
  makes it exit non-zero.

## Files / areas

- New: `backend/src/db/season-format-registry.ts`, `backend/src/db/season-format.ts`,
  `scripts/check-season-formats.mjs`.
- Changed: `backend/src/routes/seasons.ts` (new route and the phase/scope checks listed in step 3).
- Changed, labels only: `SCOPE_LABELS` in `frontend/src/standings/AdvancedStandingsView.jsx`,
  `frontend/src/teams/TeamAdvancedSection.jsx`, `frontend/src/players/PlayerAdvancedSection.jsx`.
- Read: `backend/src/db/season-schema.ts`, `season-catalog.ts`, `season-coverage.ts` (validation pattern),
  `response-cache.ts` (the new route is cached like the others; errors are never cached),
  `blueprint/reference/historical-season-inventory.md`.

## Data / contracts

**Format families** (`FORMAT_FAMILIES`). Each family is an ordered stage list; per-season values fill the numbers.

| Family | Seasons | Stages |
|---|---|---|
| `eliminationSeries` | E2000 | `RS` groups → `PO` knockout rounds: first round and QF win target 2, SF and final 3 |
| `top16ToFinalFour` | E2001-E2003 | `RS` groups → `TS` 4 groups of 4, rank 1 → `FF` |
| `top16Bo3Playoffs` | E2004-E2007 | `RS` 3x8 → `TS` 4x4, ranks 1-2 → `PO` win target 2 → `FF` |
| `top16Bo5Playoffs` | E2008-E2011 | `RS` 4x6, ranks 1-4 → `TS` 4x4, ranks 1-2 → `PO` 3 → `FF` |
| `top16TwoGroups` | E2012-E2015 | `RS` 4x6, ranks 1-4 → `TS` 2x8, ranks 1-4 → `PO` 3 → `FF` |
| `singleTable` | E2016-E2022 | `RS` table, ranks 1-8 → `PO` 3 → `FF` |
| `singleTablePlayIn` | E2023-E2026 | `RS` table, ranks 1-6 → `PO`, 7-10 → `PI` (win target 1) → `PO` 3 → `FF` |

**Per-season values.** Planned clubs, groups x clubs per group and games per club for each table stage (E2001 32 in
4x8, top 4 per group; E2002-E2007 24 in 3x8, top 5 per group plus the best sixth with `criterion: null`; E2016-E2018
16/30; E2019-E2024 18/34; E2025-E2026 20/38); third-place game (`true`, except E2001 and E2025 `false`, E2026
`null`); stages held (E2019: `RS` only, cancelled); exceptions (E2019 suspended 2020-03-12, cancelled 2020-05-25;
E2021 `CSK`, `UNK`, `DYR` excluded 2022-03-22, 28 counted games; walkovers E2001 game 264 and E2003 game 200; E2000
`AEK`-`BAS` semifinal replay).

**Allowed codes per season.** Phases: the stages held in that season. Scopes: `RS`, `TS` where held, `all`, and `PS`
when a `PI`, `PO` or `FF` stage is held. Codes known to the competition: `RS`, `TS`, `PI`, `PO`, `FF`, `all`, `PS`.
Error body: `{ error: { code: "PHASE_NOT_IN_SEASON", message: "Phase not in this season's format" } }`.

**Response.** `GET /api/seasons/:seasonCode/format` (year-only form accepted like every route), `200`:

```ts
type SeasonFormatResponse = { format: {
  seasonCode: string;
  family: string;                            // FORMAT_FAMILIES key
  status: "notStarted" | "inProgress" | "completed" | "cancelled";
  plannedClubs: number;                      // E2021: 18
  stages: Stage[];                           // held stages, ordered
  exceptions: FormatException[];             // [] when none
  issues: { code: string; stage: string | null; message: string }[];  // [] when data agrees with the format
} };
type Stage = {
  code: "RS" | "TS" | "PI" | "PO" | "FF";    // source phase_code
  type: "table" | "knockout" | "playIn" | "finalFour";
  name: string;
  order: number;
  plannedGroups: number | null; plannedClubsPerGroup: number | null; gamesPerClub: number | null;
  winTarget: number | null;                  // null when it varies inside the stage (E2000 PO)
  knockoutRounds: { name: string; winTarget: number }[];  // E2000 PO only
  thirdPlaceGame: boolean | null;            // FF only
  qualification: (
    | { positions: [number, number]; within: "group" | "table"; to: string; kind: "direct" | "playIn" }
    | { bestOfPosition: number; count: number; to: string; criterion: null })[];
  statisticsScopes: string[];                // "RS" | "TS", plus "PS" for PI/PO/FF
  dataState: "loaded" | "partial" | "upcoming" | "missing";
  observed: { gamesPlayed: number; gamesTotal: number;
              groups: { name: string; clubs: string[] }[];   // table stages, from the latest standings round
              clubs: string[] };                             // clubs with a game row in the stage
};
type FormatException =
  | { kind: "cancelled"; suspendedOn: string; cancelledOn: string; note: string }
  | { kind: "excludedClubs"; clubs: string[]; decidedOn: string; countedGames: number; note: string }
  | { kind: "walkover"; gameCode: number; note: string }
  | { kind: "replay"; stage: "PO"; clubs: string[]; note: string };
```

Dates are `YYYY-MM-DD`. Notes are fixed registry text, rendered as text only. Arrays sort deterministically (stages by
order, clubs and groups ascending).

**Status and data states.** `cancelled` from the registry. Otherwise `notStarted` when no game is played, `completed`
when the last stage has game rows and every game of its last source round is played, else `inProgress`. A stage is
past when a later stage has played games or the season is completed or cancelled. `dataState`: `loaded` when all its
owed game rows are played (games with status `Cancelled` are not owed) and a table stage holds its planned
number of games (groups x clubs x (clubs - 1)); `partial` when some are played, or when a cancelled season stopped inside it; `upcoming` when not past
and no game is played; `missing` when past with no game rows. Missing future rows never prove completion.

**Issues** (each with the stage and a plain message): data in a phase the season does not hold; a `missing` stage;
standings group count or clubs per group differing from the plan; season club count differing from `plannedClubs`; a
tie with more games than `2 x winTarget - 1`; a table club with more games played than `gamesPerClub`; a table stage
whose loaded game count differs from its planned count (`GAME_COUNT`). Issue codes: `UNEXPECTED_PHASE`,
`STAGE_MISSING`, `GROUP_LAYOUT`, `CLUB_COUNT`, `SERIES_LENGTH`, `TOO_MANY_GAMES`, `GAME_COUNT`. No
database-target-dependent rules: the constant is the same on Neon and local.

## Testing

- No unit runner or Verify command is configured. Checks: `cd backend && npm run build`, root `npm run build`,
  `cd frontend && npm run lint`, the step-3 before/after byte comparison for `E2023`-`E2026`, the step-2 spot checks
  and the step-4 checker over all 27 seasons, all read-only against the local-target API.
- No browser run: the only frontend change is a label for a scope that modern seasons never list. Browser evidence is
  not claimed. Older-season pages are expected to show error states where they request phases their season lacks;
  that is recorded, not tested, and is fixed by later leaves.

## Notes for the AI

- Follow `season-coverage.ts` and `season-catalog.ts` patterns: `catalogRead`, explicit columns, `COMPETITION_CODE`,
  deterministic ordering, thin handlers. One shared helper in the route file performs the phase/scope check so every
  route uses the same order of checks.
- Registry values come only from the inventory's verified facts; [O] items stay `null` or absent.
- Check `/api/health` reports `"target":"local"` before every API check; ask the user to restart the backend when
  needed. Never open `.env`. No AI attribution in commits.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":13782,"specSha256":"3f517228dd979a1255e579b239637ef3d1910de0b81c7a8a370df0d592b0b2c4","branch":"refs/heads/feature/shared-season-format-api-foundation","head":"556d6c235c6372f0802ca3bbb1e90a2b0c4873a2","baseRef":"refs/heads/master","baseCommit":"556d6c235c6372f0802ca3bbb1e90a2b0c4873a2","sourceTree":"e9f3fcb84198ca9500a369c315083c52ead7af51","absentOptional":[]} -->
