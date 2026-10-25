# Feature: Venue and attendance on the game page

**From build-plan:** feature 37b
**Build attempt:** 1
**Status:** verified
**Branch:** feature/venue-and-attendance-on-the-game-page

## Goal

The Game detail header names the arena (with its capacity) and the crowd, read from `app_games` columns the backend does not
read yet. They join the officials in the header's match-information strip that 37a built, as EuroLeague's Match Information
box does. A game or season without a fact shows nothing for it.

## In scope

- Backend: the arena name, capacity, attendance and neutral-venue flag added to the `games` Drizzle table, **read only**.
- Backend: an additive `venue` field on `GET /api/seasons/:seasonCode/games/:gameCode`, next to `game` and `officials`.
- Frontend: two new entries in `MatchInfo` in `MatchupHeader.jsx`, before Officials:
  - **Arena**: the arena name, with "Capacity 12,000" in small muted text under it when the capacity is known, and
    "Neutral venue" under that when the feed flags it.
  - **Attendance**: the crowd as a grouped number ("10,218"), for played games only.
- Arena names in capitals ("BELGRADE ARENA") read in title case ("Belgrade Arena") with the existing `titleCase`. A name that
  already has lower-case letters (79 of 7,065 games) is shown as the feed writes it.
- Browser specs for the reply, the header, the empty and unplayed cases, and the layout at phone width.

## Out of scope

- Club details and history on the team page (37c), the records review (37d).
- The other `app_games` venue columns (`venue_code`, `venue_address`, `venue_active`, `venue_notes`), `audience_note` and
  `audience_confirmed`.
- Deriving "neutral" from the stage (for example the Final Four). The flag is shown only where the feed sets it.
- Adding the venue to the games lists, the team pages or the API's game list replies.
- Any warehouse or database change.

## Build loop

`workflow.stepReview` is `feature`: build the steps in order and present one review packet at the end. Checkpoint commits are
disabled. `/complete` makes the feature commit.

## Build steps

- [x] 1. **Backend reads the venue.**
  - Add `audience` (integer), `venueName` (text), `venueCapacity` (integer) and `isNeutralVenue` (boolean) to the `games`
    table in `backend/src/db/season-schema.ts`, all nullable.
  - In `backend/src/db/season-games.ts`, add `export type GameVenue` and `getGameVenue(seasonCode, gameCode)`. It selects
    the four columns for that one game through `catalogRead` and returns the venue contract below, or `null`.
  - In the game route in `backend/src/routes/seasons.ts`, add it to the existing `Promise.all` and reply
    `{ game, officials, venue }`.
  - Do not add the columns to `gameFields` or `Game`, so the game list replies stay as they are.
  - **Done when:** `cd backend && npm run build` passes, and the API spec in step 3 shows `/api/seasons/2025/games/1`
    returning Moraca's venue.
- [x] 2. **The header shows Arena and Attendance.**
  - `GameDetailPage.jsx` passes `venue={gameQuery.data?.venue}` to `MatchupHeader`.
  - `MatchupHeader` builds the Arena entry from the name, the capacity line and the neutral line, and the Attendance entry
    with `formatCount` only when `game.played`. Both go before Officials in `MatchInfo`'s items.
  - `MatchInfo` keeps leaving out an entry without a value, and keeps leaving out the whole strip when every entry is empty.
  - **Done when:** `/2025/games/1` shows ARENA "Moraca" with "Capacity 5,262", ATTENDANCE "2,110" and OFFICIALS in one
    row from `sm`, stacked below `sm`, on every tab. `cd frontend && npm run lint && npm run build` passes.
- [x] 3. **Specs.**
  - `frontend/e2e/support/game-fixtures.js`: `mockGameApi` gains a `venue` option (default `null`) in the game reply.
  - `frontend/e2e/game-overview.spec.js`:
    - API test: the real `/api/seasons/2025/games/1` reply has
      `venue: { name: "MORACA", capacity: 5262, attendance: 2110, neutral: false }`.
    - Header test: the real game shows the Arena, Capacity and Attendance entries, and keeps them on the Box score tab.
    - Mock: an unplayed game with a venue shows Arena and no Attendance.
    - Mock: a neutral venue with no capacity shows "Neutral venue" and no capacity line.
    - The existing empty test (no venue, no officials) still finds no `dl`.
  - `frontend/e2e/game-detail-layout.spec.js`: the long-names test also sets a long arena name. At 320 to 1280 the header
    holds its content, each value sits under its label, and the page has no horizontal overflow.
  - **Done when:** `cd frontend && npx playwright test game-overview.spec.js game-detail-layout.spec.js responsive.spec.js`
    passes against a dev backend whose `/api/health` reports `"target":"local"`.

## Files / areas

- `backend/src/db/season-schema.ts` (the `games` table)
- `backend/src/db/season-games.ts` (`GameVenue`, `getGameVenue`)
- `backend/src/routes/seasons.ts` (the game route)
- `frontend/src/games/GameDetailPage.jsx`, `frontend/src/games/MatchupHeader.jsx`
- Reused as they are: `frontend/src/lib/format.js` (`formatCount`) and `frontend/src/lib/playerName.js` (`titleCase`)
- `frontend/e2e/support/game-fixtures.js`, `frontend/e2e/game-overview.spec.js`, `frontend/e2e/game-detail-layout.spec.js`

## Data / contracts

`GET /api/seasons/:seasonCode/games/:gameCode` adds one field. `game` and `officials` are unchanged, and so are the 404
replies.

```ts
venue: {
  name: string | null;       // app_games.venue_name, as the feed writes it
  capacity: number | null;   // app_games.venue_capacity; 0 becomes null
  attendance: number | null; // app_games.audience; 0 becomes null
  neutral: boolean;          // app_games.is_neutral_venue; null becomes false
} | null                     // null when name, capacity and attendance are all missing
```

What the local data holds (`gold`, checked while writing this spec):

| Field | Coverage |
|---|---|
| Arena name | Every game, E2000 to E2026, including unplayed E2026 games. |
| Capacity | Every game except 7 with capacity 0. |
| Attendance | Most played games. It is null where the feed reported 0, with a warehouse note: 252 in E2020 (COVID) and 189 to 220 in E2004 and E2005. Those games show no Attendance entry. No unplayed game has an attendance. |
| Over capacity | 467 games have an attendance above the listed capacity, because the capacity is the arena's listed figure. Both are shown as the feed gives them, with no percentage. |
| Neutral venue | Set on only two games: the E2024 Final Four semi-finals in Abu Dhabi. The E2024 final and third-place games, and every other Final Four, are not flagged. |

The names are feed text. React renders them as text nodes, with no HTML.

## Testing

- No unit test command is configured. Checks are the backend `tsc` build, frontend lint and build, and the Playwright
  specs named in step 3.
- Browser specs run only after `/api/health` reports `"target":"local"`. Playwright starts the dev servers itself.

## Notes for the AI

- Mirror 37a's `getGameOfficials`: a small read for one game, through `catalogRead`.
- Keep `MatchInfo` generic. An entry's `value` may be JSX for the Arena entry's extra lines. The filter is on truthiness, so
  build the Arena entry as `null` when there is no name.
- Use `max-sm` and `sm:` Tailwind variants as the strip already does. Wrap long names with `wrap-break-word`.
- Line endings: keep each file's own. Use the Edit tool.
- No em dashes in any text this feature adds.

## Open questions

- **Neutral venue:** the flag is set on only two games in history, so the note would appear there and nowhere else. This spec
  shows it only where the feed flags it. Leaving it out entirely is the alternative. Say which you prefer before
  `/implement`, or keep the default.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7785,"specSha256":"303853cda1eba6c12a54efcd42f8387dd80fc51679050ca4368e11254d9e2ca1","branch":"refs/heads/feature/venue-and-attendance-on-the-game-page","head":"f7a81719b72b3ff302dccf1d5a7de27d20f80c65","baseRef":"refs/heads/master","baseCommit":"f7a81719b72b3ff302dccf1d5a7de27d20f80c65","sourceTree":"029a84d68c8eaa1a36d723a13c77a37b2552b6f4","absentOptional":[]} -->
