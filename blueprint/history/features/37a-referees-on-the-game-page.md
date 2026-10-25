# Feature: Referees on the game page

**From build-plan:** feature 37a
**Build attempt:** 1
**Status:** verified
**Branch:** feature/referees-on-the-game-page

## Goal

Show who officiated a game on the Game detail page, from the warehouse's `app_game_officials` table, which the app has never read. Games without officials show nothing rather than a placeholder (build plan 37a; overview feature 37).

**Revision (user request, before completion):** the officials sit in the game header, not at the bottom of the Overview, in a labelled match-information strip like EuroLeague's "Match Information" box. The strip is built so 37b can add Arena and Attendance columns beside Officials.

## In scope

- **Backend.**
  - A read-only Drizzle definition of `app_game_officials`.
  - A reader for one game's officials.
  - An additive `officials` list in the `GET /seasons/:season/games/:gameCode` reply.
- **Frontend.** A match-information strip at the bottom of the game header (`MatchupHeader`), under the round and date line. It holds one labelled column, "Officials", with the officials' names. The header shows on every tab, so the strip does too, for played games and for unplayed games that already have officials assigned. With nothing to show, the strip is absent.
- **Specs.** Browser specs for the API field and the strip.

## Out of scope

- **Photos.** The feed's `image_vertical_small` holds an ID, not a URL, and nothing says how to build one. No photo is shown; the user accepted this as an API limitation.
- **Countries in the header.** The strip shows names only, as EuroLeague does. The API still returns each official's country.
- A referee page, referee statistics or filtering games by referee.
- The `active` flag.
- **Arena and attendance (37b).** 37b adds them as columns of this same strip.
- Club details (37c) and the records review (37d).

## Build loop

`workflow.stepReview` is `feature`: build every step, then present one review packet. `workflow.checkpointCommits` is disabled: no commits during the build. `/complete` makes the single feature commit.

## Build steps

- [x] **1. Officials in the game API.**
  - Add `gameOfficials` to `backend/src/db/season-schema.ts`. It is read-only, with only the columns the reply uses: `competition_code`, `season_code`, `game_code`, `official_number`, `official_code`, `name`, `country_code`, `country_name`.
  - Add `getGameOfficials(seasonCode, gameCode)` to `backend/src/db/season-games.ts`, ordered by `official_number`, through `catalogRead` like the other readers.
  - The game route reads the game and its officials together and replies `{ game, officials }`. A missing game still answers 404 `GAME_NOT_FOUND`, and `game` is unchanged.
  - **Done when:**
    - `cd backend && npm run build` passes.
    - The reader returns Javor, Aliaga and Giovannetti in number order for E2025 game 1.
    - It returns `[]` for an E2026 game with none.
- [x] **2. The match-information strip in the game header.**
  - In `frontend/src/games/MatchupHeader.jsx`, under the round and date line and above a thin divider, add a strip of labelled columns: a `<dl>` with each label a small upper-case `<dt>` and each value a `<dd>`.
  - Today it holds one column, "Officials": the names written as player names (`displayName`, so "JAVOR, DAMIR" reads "Damir Javor"), joined with ", ".
  - The columns are built from a list of label and value pairs, and empty values are dropped. 37b adds Arena and Attendance to that list.
  - With no pairs, there is no strip and no divider.
  - Columns sit side by side from `sm`, stack below it, and are centred like the rest of the header. Long names wrap inside the panel; there is no sideways scroll at 320px.
  - `GameDetailPage` passes `gameQuery.data.officials` to `MatchupHeader`.
  - The officials section added to `OverviewTab.jsx` earlier in this build is removed, and that file returns to its previous state.
  - There is no new request and no separate loading or error state: the game query's own states cover it.
  - Values render as React text.
  - **Done when:**
    - On the local DB, the E2025 game 1 header shows "Officials: Damir Javor, Jordi Aliaga, Guido Giovannetti" on the Overview and on the Box score tab.
    - A game with no officials has no strip.
    - The Overview has no "Game officials" section.
    - At 320 and 1280px the header fits.
    - `cd frontend && npm run lint` and `npm run build` pass.
- [x] **3. Browser specs.**
  - In `frontend/e2e/game-overview.spec.js`:
    - **API test:** officials in number order, each with `number`, `code`, `name`, `countryCode` and `countryName`, and `[]` for a far-off game still to come.
    - **Header test:** a played game shows the officials' display names, and they are still there after switching to Box score.
    - **Empty test:** a mocked reply with `officials: []` shows no strip.
    - **Unplayed test:** a mocked unplayed game with officials shows them in the header.
  - In `frontend/e2e/game-detail-layout.spec.js`, four officials with long names wrap inside the header at 320 and 390px, with the label above the names, and the page never scrolls sideways.
  - **Done when:** `cd frontend && npx playwright test game-overview.spec.js game-detail-layout.spec.js responsive.spec.js` passes on the local DB.

## Files / areas

- `backend/src/db/season-schema.ts`: `gameOfficials` table.
- `backend/src/db/season-games.ts`: `getGameOfficials`.
- `backend/src/routes/seasons.ts`: the `/:seasonCode/games/:gameCode` route.
- `frontend/src/games/MatchupHeader.jsx`: the strip.
- `frontend/src/games/GameDetailPage.jsx`: passes `officials` to the header.
- `frontend/src/games/OverviewTab.jsx`: back to its previous state.
- `frontend/e2e/game-overview.spec.js`, `frontend/e2e/game-detail-layout.spec.js`, `frontend/e2e/support/game-fixtures.js`.

## Data / contracts

- **Source:** `app_game_officials`, keyed by `(competition_code, season_code, game_code, official_number)`.
- **Local coverage (checked while writing this spec):**
  - Every played game from E2000 to E2025 has officials, usually three.
  - E2003 to E2005 sometimes have a fourth.
  - E2019 and E2021 lack them only for their cancelled games.
  - E2026 has them for the 70 games played so far.
- **Reply:** `GET /api/seasons/:season/games/:gameCode` → `{ game, officials }`.
  - `officials`: `Array<{ number: integer, code: string, name: string, countryCode: string | null, countryName: string | null }>`, ordered by `number`.
  - `[]` when the game has none.
  - Existing callers that read only `game` are unaffected.
- **Errors:** unchanged.

## Testing

There is no unit runner (`AGENTS.md`). The checks are the backend build, frontend lint and build, and the Playwright specs above against the local DB (`/api/health` must report `"target":"local"`).

## Notes for the AI

- The label is "Officials", not "Referees", because some 2003-2005 games list a fourth official whose role the data does not name. The user accepted this wording.
- Use `displayName` from `frontend/src/lib/playerName.js`.
- Keep the strip's pieces generic (label and value pairs), so 37b only adds entries.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7127,"specSha256":"c1d521274882c5769fc2a927351caa3f6ab86b860ffaacb50ce2f48126de3a59","branch":"refs/heads/feature/referees-on-the-game-page","head":"c713d64ec27ba983f3eb14d22c5485658c0aed29","baseRef":"refs/heads/master","baseCommit":"c713d64ec27ba983f3eb14d22c5485658c0aed29","sourceTree":"6b0e2dae57ad529aface44a56d59893b953299a9","absentOptional":[]} -->
