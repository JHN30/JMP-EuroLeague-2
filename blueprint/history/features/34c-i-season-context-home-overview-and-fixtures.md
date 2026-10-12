# Feature: Season context, Home, Overview and fixtures

**From build-plan:** feature 34c-i
**Build attempt:** 1
**Status:** verified
**Branch:** feature/season-context-home-overview-and-fixtures

## Goal

Make Home, the season Overview and Games read the season's format and status from `GET /api/seasons/:season/format`
(34b) instead of assuming the modern four-phase season. The Overview timeline shows the stages the season actually
has, with descriptions generated from its format. Round labels name their stage. Status text tells apart a season
that has not started, is under way, has finished, was cancelled or is incompletely loaded. Only genuinely scheduled
games appear as upcoming. Layouts and navigation stay as they are.

## In scope

- **Season context:** `getSeasonFormat` in `frontend/src/lib/api.js`, a `useSeasonFormat(seasonCode)` hook and pure
  helpers in `frontend/src/lib/seasonFormat.js`: stage round label, stage description, season status text.
- **Upcoming games (backend):** `status=scheduled` on `/games` and `/teams/:club/games` returns only owed future work.
  Games with status `Cancelled` are excluded, and so is every game of a season the format marks cancelled. `E2023` to
  `E2026` responses stay identical because none of those seasons has a cancelled game.
- **Home:**
  - The header title names the stage of the next round, for example "Playoffs · Game 2" or "Play-In · Round 1"
    (the regular season keeps "Round 5").
  - The status line comes from the format status. When the season is under way but has no scheduled game, it names
    the next upcoming stage ("Play-In fixtures not published yet") instead of claiming the season has finished.
  - The Upcoming games empty message follows the same status.
- **Overview:**
  - The Phase story shows the format's stages in order. Each description comes from the stage values (club count,
    games per club, qualification ranks, win target, third-place game), not fixed text.
  - The placeholder for a stage with no games follows its data state: "Not played yet" for `upcoming`, "Games not
    loaded" for `missing`.
  - The hero says "Season finished", "Season cancelled" (with the format's note) or "Season not yet started" from the
    format status. The champion lookup stays as it is.
- **Games (Fixtures):** the "season over" decision comes from the format status, not from the absence of a next game.
- **Incompletely loaded data:** when the format lists issues, Home and Overview show one plain note ("Some of this
  season's games are not loaded") next to the status.

## Out of scope

- Standings bands, race cutoffs, the bracket, champion and placement labels (34c-ii). Statistics scopes, Leaders,
  Team, Player and Compare pages (34c-iii).
- Group tables, Top 16 presentation, E2019 cancellation context beyond the status text, E2021 exclusion context
  (34f, 34g, 34h onward). Older-season pages may still show other errors; their leaves adapt them.
- New pages, navigation changes, layout redesign, new dependencies or new API fields.
- `useCurrentPhaseCode`, `PHASE_ORDER` consumers outside Overview, and `advancedScopeForPhase` (34c-iii).

## Build loop

- Work on `feature/season-context-home-overview-and-fixtures`. `workflow.stepReview: feature`: complete the steps,
  then one review packet. `workflow.checkpointCommits: disabled`: no step commits; `/complete` makes the commit.
- API and browser checks need the local-target backend (`/api/health` must report `"target":"local"`). The user has
  allowed restarting the backend when it stops after a reload. Never open `.env`.
- Before step 1, capture the baseline of `/games?status=scheduled` and `/teams/:club/games?status=scheduled` for
  `E2023`-`E2026`.

## Build steps

- [x] 1. **Genuinely scheduled games (backend).** In `backend/src/db/season-games.ts`, `getGames` and `getTeamGames`
  with `status: "scheduled"` exclude `game_status = 'Cancelled'` and return no games for a season whose format is
  cancelled (`seasonFormat(seasonCode)?.cancelled`).
  Done when: `cd backend && npm run build` passes. `E2019` and `E2021` `/games?status=scheduled` report `total` 0.
  `E2021` played and unfiltered game lists are unchanged. The `E2023`-`E2026` baseline is byte-identical.
- [x] 2. **Season context helpers.** Add `getSeasonFormat` to `frontend/src/lib/api.js`, the `useSeasonFormat` hook
  (query key `["season-format", seasonCode]`), and `frontend/src/lib/seasonFormat.js` with:
  - `stageRoundLabel(stage, roundName)`: "Round 5" in a regular season, otherwise "<stage name> · <round name>".
  - `stageDescription(stage, format)`
  - `seasonStatusText(format)`: finished, cancelled with note, not started, under way, or "<next stage name> fixtures
    not published yet".
  - `hasLoadingIssues(format)`

  The round name comes from `/phases/:phase/rounds`, which already has "Game 2", "Semifinal" and so on.
  Done when: `cd frontend && npm run lint` and the root `npm run build` pass. The helpers give the expected text for
  `E2023`, `E2025` and `E2026` format responses, checked with a short Node script over saved responses (not
  committed).
- [x] 3. **Home.**
  - `Dashboard.jsx`: the title uses the stage round label of the next game. The status line follows the format: the
    existing `roundStatus` line while games are scheduled, otherwise `seasonStatusText`. Add the loading-issues note.
  - `UpcomingGames.jsx`: the empty message follows the format status.
  - While the format loads, Home keeps today's "Season overview" title, so nothing flashes a wrong claim. A format
    error falls back to today's behaviour, so Home never blocks on it.

  Done when:
  - `E2025` (finished) says the season has finished.
  - `E2026` (under way) keeps its round title and status line.
  - `E2019` says cancelled with its note.
  - The layout is unchanged.
  - `home-round-status.spec.js` and `home-layout.spec.js` pass, updated only where their expected text was the
    old claim.
- [x] 4. **Overview and Games.**
  - `SeasonOverviewPage.jsx`: the Phase story maps the format's stages (dropping `PHASE_ORDER` and `PHASE_BLURBS`
    there), uses `stageDescription` and the data-state placeholders, and marks the current stage. `SeasonHero` takes
    the format status.
  - `FixturesPage.jsx`: `seasonOver` comes from the format status.

  Done when:
  - `E2023`-`E2025` show four stages with descriptions matching their format: E2025 20 clubs, 38 games and no
    third-place game.
  - `E2026` shows Play-In, Playoffs and Final Four as "Not played yet".
  - `E2019` shows only the Regular Season, with "Season cancelled".
  - `overview-layout.spec.js`, `games-layout.spec.js` and `responsive.spec.js` pass, plus a new focused
    `season-status.spec.js` covering the E2025, E2026, E2019 and E2021 checks above.
  - Root build and frontend lint pass.

## Files / areas

- Backend: `backend/src/db/season-games.ts` (`getGames`, `getTeamGames`); reads `season-format-registry.ts`.
- Frontend new: `frontend/src/lib/seasonFormat.js`, `frontend/src/lib/useSeasonFormat.js`,
  `frontend/e2e/season-status.spec.js`.
- Frontend changed: `frontend/src/lib/api.js`, `frontend/src/dashboard/Dashboard.jsx`,
  `frontend/src/dashboard/UpcomingGames.jsx`, `frontend/src/season/SeasonOverviewPage.jsx`,
  `frontend/src/games/FixturesPage.jsx`; existing specs only where their expected text changes.
- Read: `frontend/src/dashboard/roundStatus.js` (kept), `frontend/src/lib/phaseSummary.js` (`PHASE_NAMES` stays for
  other pages), `backend/src/db/season-format.ts` (response contract).

## Data / contracts

- Uses the 34b `format` response unchanged. No new API fields.
- **Scheduled filter:** `played = false or null`, and `game_status` is not `Cancelled`, and the season's format is not
  cancelled. `status=played` and unfiltered lists are unchanged. The `pagination.total` count follows the same filter.
- **Stage descriptions:** generated from the stage values only, so they hold for any season.

  | Stage | Description | Example |
  |---|---|---|
  | Single table | "Each of the <n> clubs plays every other club home and away (<g> games)." | |
  | Table with groups | "<groups> groups of <clubs>; each club plays its group home and away (<g> games)." | |
  | Qualification | One sentence per rule | "Top 6 reach the Playoffs; 7th-10th go to the Play-In." |
  | Play-In | "Single games decide the last playoff places." | |
  | Knockout with a win target | "Best-of-<2w-1> series." | |
  | Knockout whose win target varies | Each round's best-of length | E2000 |
  | Final Four | "Semifinals and final" and, when `thirdPlaceGame` is true, "and a third-place game" | |

  No sentence for a value that is `null`.
- **Status text:** `completed` → "The season has finished." `cancelled` → "Season cancelled." plus the cancellation
  note. `notStarted` → the first game's start line (existing `roundStatus`) or "No games scheduled yet." `inProgress`
  → the existing round line when a game is scheduled, otherwise "<first upcoming stage> fixtures not published yet."
  Only `inProgress` with no upcoming stage and no scheduled game falls back to "Next games not published yet."
- All text is fixed or comes from registry and API values, rendered as React text (no HTML).
- **Loading, empty and error states:** existing `WidgetPanel` and `AsyncState` states stay. A failed format request
  never blocks a page; status text falls back to today's wording. `useSeasonFormat` is shared through the React Query
  cache.

## Testing

- No unit runner or Verify command. Checks:
  - `cd backend && npm run build`, root `npm run build`, `cd frontend && npm run lint`.
  - The step-1 API comparison.
  - The listed Playwright specs, run by file name against the local target only, plus the new
    `season-status.spec.js`.
- Browser evidence covers 320, 390, 768 and 1024px through the existing layout and responsive specs. No production
  or Neon evidence is claimed.

## Notes for the AI

- Keep markup and classes of the changed components so layouts are unchanged. Change text sources, not structure.
- Edit files with byte-preserving tools; the repo checks out CRLF (`core.autocrlf=true`), and `sed -i` rewrites line
  endings.
- Run only the specs named here. Check `/api/health` reports `"target":"local"` before every browser run.
- No AI attribution in commits.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10330,"specSha256":"e93950eb0060bceea5dd4cbde6fc0f1b70620c48253537bdd7177ee40d6b1722","branch":"refs/heads/feature/season-context-home-overview-and-fixtures","head":"e6a04262e9a39727caa642ebbe0007a7ff13d629","baseRef":"refs/heads/master","baseCommit":"e6a04262e9a39727caa642ebbe0007a7ff13d629","sourceTree":"294dff1d8ab98b5ffa3b1ed2d80baa8c31c15b32","absentOptional":[]} -->
