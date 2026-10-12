# Feature: Statistics and remaining page scopes

**From build-plan:** feature 34c-iii
**Build attempt:** 1
**Branch:** feature/statistics-and-remaining-page-scopes
**Status:** verified

## Goal

Every statistics view picks its advanced scope from the stage the user selected and the scopes the season holds, rather than
assuming "regular season or postseason". The Top 16 (`TS`) gets its own scope, name and order, and every knockout stage
(PI, PO, FF) still maps to `PS`. Records use a games minimum derived from each season's regular-season length instead of a
fixed 20 games. The modern seasons (`E2023`-`E2026`) must look and answer exactly as they do today. This is the last leaf of
34c.

## In scope

- One frontend rule for a stage's advanced scope:
  - `RS` → `RS`, `TS` → `TS`, `all` → `all`.
  - `PI`, `PO`, `FF` → `PS`.
  - Unknown codes → `null`. Callers don't fetch, and show their existing empty or unavailable state.
- Callers of that rule:
  - Team Overview league panels (`TeamPage`).
  - Leaders team board (`leaders/teamData.js`).
  - Compare player advanced, trends and rosters.
- Top 16 naming and order: `PHASE_ORDER` and `PHASE_NAMES` include `TS` ("Top 16") after `RS`. That affects the
  Overview/Home leader panels, phase sorting and phase-name fallbacks.
- The Advanced Leaders scope tabs offer Top 16 when the season's API scopes include `TS`, in format order: RS, TS, All, PS.
- The Leaders team-board note: the sentence that "ratings cover the whole postseason together" shows only for knockout
  stages (PI/PO/FF), not for Top 16.
- Records' rating minimum (PER, team offensive rating, team net rating):
  - Per season: `round(20 / 34 × the season's regular-season games per club)`, from the registry.
  - This keeps the existing ratio of 20 games out of a 34-game season. E2023/E2024 → 20, E2025 → 22, E2026 → 24,
    E2016-E2018 → 18, grouped seasons (10 or 14 regular-season games) → 6 or 8.
  - Player PER records still also require the pipeline's `qualified` flag.
- Fix the `player-shooting-games-layout.spec.js` helper. It currently assumes the earliest local season's players are still
  current, which fails now that local seasons start at `E2000`. Change the test helper only; no product code.

## Out of scope

- Group-local positions and labels for grouped stages: Fixtures, Matchup header, Compare fixtures and team labels keep
  their `RS`-only position display (34h-iii).
- Head-to-head's neutral-venue rule (FF), and stage-specific copy for older eras (34d-34m).
- New statistical formulas, a career leaderboard, new API endpoints or fields. The backend already accepts `TS` on
  `/season-stats`, `/leaders/form`, `/advanced/*` and the team-stats routes (34b; checked on E2012 during speccing).
- E2019 and E2021 statistics eligibility (34f and 34g). Pipeline or ETL changes.

## Build loop

`workflow.stepReview: feature` and `checkpointCommits: disabled`. Build all steps, then present one review packet.
`/complete` makes the commit.

## Build steps

- [x] 1. **Scope rule and Top 16 naming.**
  - Rewrite `advancedScopeForPhase` in `frontend/src/teams/teamLeague.js` as above, and update its comment.
  - Add `TS` to `PHASE_ORDER`/`PHASE_NAMES` in `frontend/src/lib/phaseSummary.js`.
  - Callers keep their existing `enabled`, adding `&& scope !== null`.
  - Done when: for every call site, a modern season (`E2025`, phases RS/PI/PO/FF) requests the same scope as before, and
    an `E2012` Top 16 selection requests `scope=TS`, checked in the browser network log. Frontend lint passes.
- [x] 2. **Leaders scopes and note.**
  - Add `{ key: "TS", label: "Top 16" }` between RS and All in `ADVANCED_SCOPES` (`frontend/src/leaders/leaderDefs.js`).
  - Limit the `TeamsLeaders` postseason note to PI/PO/FF.
  - Done when:
    - `/2025/leaders` shows the same advanced tabs as now.
    - `/2012/leaders` shows a Top 16 tab whose board loads.
    - On `/2012/leaders`, the Top 16 team board has no postseason note.
- [x] 3. **Records minimum from the format.**
  - In `backend/src/db/season-records.ts`, replace `MIN_SEASON_GAMES` with a per-season minimum derived from
    `seasonFormat(seasonCode)` and the RS `gamesPerClub`.
  - When a season has no format, keep 20.
  - Done when the `/records` advanced metric responses for `E2023`-`E2026` are byte-identical to before. Show this by
    capturing the responses before and after with a local-target script. Also, an older season's clubs can appear in team
    net-rating records (for example, an `E2012` club with 24 or more games). Backend build passes.
- [x] 4. **Test helper and regression run.**
  - Fix the `player-shooting-games-layout.spec.js` helper. First check how it chooses its player, then make the choice
    independent of the earliest local season.
  - Run the affected specs by exact path, against the local target only:
    - `e2e/leaders.spec.js`, `e2e/leaders-layout.spec.js`
    - `e2e/team-overview-layout.spec.js`, `e2e/team-advanced-layout.spec.js`
    - `e2e/compare.spec.js`, `e2e/compare-player-layout.spec.js`
    - `e2e/records.spec.js`, `e2e/records-api.spec.js`
    - `e2e/player-shooting-games-layout.spec.js`
  - Done when all of these pass. Root build and frontend lint also pass.

## Files / areas

- `frontend/src/teams/teamLeague.js` and `frontend/src/lib/phaseSummary.js`.
- `frontend/src/teams/TeamPage.jsx` and `frontend/src/leaders/teamData.js`.
- `frontend/src/comparisons/ComparePlayerAdvanced.jsx`, `ComparePlayerTrends.jsx` and `CompareRosters.jsx`.
- `frontend/src/leaders/leaderDefs.js` and `frontend/src/leaders/TeamsLeaders.jsx`.
- `backend/src/db/season-records.ts`.
- `frontend/e2e/player-shooting-games-layout.spec.js`.

## Data / contracts

- No API shape changes.
- Scope query values remain `RS | TS | all | PS`. The backend still answers 404 `PHASE_NOT_IN_SEASON` for a scope the season
  doesn't hold.
- Records responses keep the same shape. Only which rows qualify for the three rating metrics changes for seasons whose
  regular season isn't 34 games, as listed under In scope.
- `NULL` values stay "—". Ranks still come only from qualified players.

## Testing

- No unit runner is configured.
- Evidence:
  - The modern before/after API diff for records.
  - Network-log checks of the scope each page requests.
  - The Playwright specs listed in step 4, only after `/api/health` reports `"target":"local"`.
- Final gate: `npm run build` (root) and `cd frontend && npm run lint`.

## Notes for the AI

- Edit tracked files with byte-preserving tools: the repo is CRLF, and `sed -i` strips CR.
- Run Playwright specs by exact `e2e/<name>.spec.js` path (substring matching).
- The backend dev server may die on reload. Restarting it is allowed.
- Never open `.env`.

## Implementation notes

- Records need two small additions because the minimum now varies by season:
  - Each row of a rating metric also carries its season's `minGames`, an additive field.
  - The top-level `minGames` stays 20, the minimum for a 34-game regular season.
  - The Records copy reads "at least 20 games of a 34-game regular season, or the same share of a shorter or longer one".
  - `records.spec.js`, `records-layout.spec.js` and `records-api.spec.js` follow. The API spec checks each row against its own `minGames`.
- Modern records evidence: comparing the before and after `/records` responses (per, team offensive rating and team net rating), every modern
  row is unchanged apart from the new field. Six modern PER rows left the top 50 because older seasons' higher values pushed them out. No
  modern row was added.
- The test helper is shared (`e2e/support/player.js`, `veteranPlayer`). It now pairs the current season with the season
  just before it, not the earliest, which also fixes the career, advanced and statistics layout specs.
- The new `e2e/stage-scopes.spec.js` covers the scope each stage requests (2025 RS/PO/FF, 2012 TS), the postseason
  note, and the Top 16 tab.

## Decisions

- Records minimum = `round(20/34 × regular-season games per club)`. Approved in review; a fixed 20 was rejected because
  some seasons have only 10 regular-season games.
  - This keeps today's ratio and its intent: a season in progress stays out until it is past the middle.
  - E2026 enters the rating records at 24 games instead of 20. Nothing changes today, at round 4.
- This leaf does not judge whether older seasons' advanced values are valid. E2000-E2006 have no play-by-play or shot
  data. Box-score ratings (PER, offensive and net rating) can still exist there, but play-by-play views cannot. Each era
  leaf (34h-34m) verifies its own coverage and its honest unavailable states.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8658,"specSha256":"7237e02230906d85ecea8410f5c28e4875084104df3bc7fa6499d2bfcf762fb3","branch":"refs/heads/feature/statistics-and-remaining-page-scopes","head":"1b94d6e17b4e92dfd2e89ee2a12d688b566c2395","baseRef":"refs/heads/master","baseCommit":"1b94d6e17b4e92dfd2e89ee2a12d688b566c2395","sourceTree":"06fd25a36fd19bb959e953b26473cba66f34913e","absentOptional":[]} -->
