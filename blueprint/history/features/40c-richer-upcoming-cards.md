# Feature: Richer upcoming cards

**From build-plan:** feature 40c
**Build attempt:** 1
**Type:** Feature
**Status:** verified
**Branch:** feature/richer-upcoming-cards

## Goal

On `/:season/games`, a game still to play shows both clubs' recent results and the arena name, so a round's upcoming
cards say more than the date and tip-off time. A missing form or venue shows nothing.

## In scope

- **Form.** Under each club of an upcoming card, its recent results as the standings table already draws them
  (`FormCell` in `frontend/src/standings/standingsCells.jsx`: W/L badges with an accessible "Last N: win, loss, …"
  label), at most the last five. It comes from the standings rows the page already loads (`standingByClubCode`), so it
  shows only where that map is filled today: the regular season and the grouped table stages. Knockout phases, a club
  without a standings row, and an empty form show nothing. No new request.
- **Arena.** The `cards=true` games list (from 40b) also carries `venueName: string | null` per game, read from
  `app_games.venue_name` (the column `getGameVenue` already reads; an empty name is `null`). An upcoming card shows it
  as one muted line under the date and time, truncated with a `title` holding the full name.
- **Only for games still to play.** Played cards (40b) and the cancelled-season "Not played" cards are unchanged. A
  card without a venue or form has no empty row or placeholder.
- The card stays one link to the game; everything added is plain text.
- Checked at 320, 390, 768 and 1024px with no sideways scroll and no clipped card content.

## Out of scope

- Form "as of" the game's round, head-to-head records, odds, predictions, capacity or attendance.
- Venue on played cards or on any other page; any change to the single-game endpoint.
- Changing `FormCell` itself or the Standings page.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then one review packet for the whole feature.
`workflow.checkpointCommits` is `disabled`: no step commits; `/complete` makes the one feature commit.

## Build steps

- [x] 1. **`venueName` on the cards reply.** In `backend/src/db/season-games.ts`, when `cards` is set, add `venueName`
  to each game (from `games.venueName`, selected with the page's games rather than a second query; an empty string
  becomes `null`), and extend the `Game` type with it as an optional field. Without `cards` the reply is unchanged.
  Done when: `cd backend && npm run build` passes.
- [x] 2. **Form and arena on upcoming cards.** In `frontend/src/games/GameCard.jsx`, for a game that is not played and
  not in a cancelled season, render `FormCell` with the club's last five form entries under each club, and the venue
  line in the centre under the time; styles beside the `.fixture-*` rules in `frontend/src/index.css` (and the
  below-640px block).
  Done when: in the running app an upcoming regular-season round shows both clubs' form and the arena; a knockout round
  shows the arena but no form; played and cancelled cards look as before; `cd frontend && npm run lint` passes.
- [x] 3. **Browser checks.** In `frontend/e2e/games-layout.spec.js`: the API carries `venueName` with `cards=true` and not
  without it; a mocked upcoming round with form for both clubs, a club with no standings row, a game with no venue and a
  long venue name; the card height limits updated from the measured heights if upcoming cards grow.
  Done when: `cd frontend && npx playwright test games-layout.spec.js` passes against the local database.

## Files / areas

- `backend/src/db/season-games.ts` - `venueName` on the cards reply.
- `frontend/src/games/GameCard.jsx` - form rows and the venue line on upcoming cards.
- `frontend/src/index.css` - their styles.
- `frontend/e2e/games-layout.spec.js` - API and layout checks.

## Data / contracts

- Additive to the opt-in `cards=true` reply only; every other games-list response is unchanged.
- `venueName` is feed text rendered as text, never HTML.
- Form entries are `{ resultOrdinal, result }` from the latest standings of the phase (the record already shown under
  each club comes from the same rows), so the form is the club's current form, not its form at the game's round.

## Testing

- No unit test command exists.
- Browser tests: `games-layout.spec.js` only, after `/api/health` reports `"target":"local"`.
- `npm run build` (root) and `cd frontend && npm run lint` must pass.

## Notes for the AI

- Reuse `FormCell` as it is; slice the entries to the last five by `resultOrdinal` before passing them.
- No nested links inside the card.
- Keep Home, Compare and every other `getSeasonGames` caller untouched.

<!-- blueprint:completion {"schemaVersion":1,"specBytes":4669,"specSha256":"e0493b84207bddb04736f766b02df2b0aea438641ed190ee6a1c749e34b9b38a","branch":"refs/heads/feature/richer-upcoming-cards","head":"a529e0e1669326e00dab88b49372fae49e17abe2","baseRef":"refs/heads/master","baseCommit":"a529e0e1669326e00dab88b49372fae49e17abe2","sourceTree":"a993006f105052adf932faa56a09cee7966ed92b","absentOptional":[]} -->
