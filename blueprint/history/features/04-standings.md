# Feature: Standings

**From build-plan:** feature 4
**Build attempt:** 1
**Branch:** feature/standings
**Status:** verified

## Goal

A dedicated standings page at `/:seasonCode/standings` (the URL the home dashboard already links to) showing the official phase-specific standings with rank, record, scoring, recent form, tie-break context between the basic and calendar-based rankings, and honest indicators when a phase or a team's data isn't available.

## In scope

- Phase tabs driven by `GET /seasons/:seasonCode/phases` (observed live: `E2025` has `RS`/`PI`/`PO`/`FF`; `E2026` has only `RS` so far), defaulting to `RS`. Selecting a phase fetches `GET /seasons/:seasonCode/phases/:phaseCode/standings` with `round` omitted (backend's own latest-round default applies).
- A standings table per phase: rank, team (linking to the future `/:seasonCode/teams/:clubCode` page), games played, W-L, points for/against, point differential, win percentage, home/away record, last-10 record — all from the `basic` group.
- A compact recent-form indicator per team from the `form` array (5 W/L badges).
- A **tie-break indicator**: when a team's `calendar.position` differs from its `basic.position` (both tables rank the same season by different methodologies), show a small marker noting the alternate ranking places them differently. Not observed in live data for any current round (checked rounds 1, 5, 10, ..., 38 of `E2025`/`RS`); prove this path with an isolated fixture.
- A qualified-line visual: a subtle style difference (or divider) between `basic.qualified: true` and `false` rows, when the field is present.
- Loading, empty (phase/round with no standings rows, or a per-team sub-object missing), and error states, matching the established page-level spinner/alert pattern from `frontend/src/season/SeasonLayout.jsx`.
- Add `getPhases(seasonCode)` to `frontend/src/lib/api.js` (reuses `GET /seasons/:seasonCode/phases`, already used server-side but not yet wrapped for the frontend).

## Out of scope

- Round-by-round historical browsing; the plan asks for "official season standings by phase," not a round picker. The page always shows the latest available round per phase.
- The `streaks`/`streakHistory`/`aheadBehind`/`margins` standings views beyond what's needed for the form indicator; a fuller breakdown belongs on a future team-detail page (feature 6).
- A fabricated "correction" or "anomaly" flag: no such field exists in the source (the project overview already flags this as an open question). "Clear indicators for... incomplete data" is satisfied by honest empty/missing-data states, not an invented annotation system.
- The team-detail and player-detail pages themselves (features 6-7); this feature only links toward their planned URLs.
- Any backend change; this consumes the existing `GET /seasons/:seasonCode/phases` and `GET /seasons/:seasonCode/phases/:phaseCode/standings` contracts unchanged.

## Build loop

Use the configured Efficient workflow on `feature/standings`: implement the small steps, run relevant checks, and present one review packet after all steps. Step checkpoint commits are disabled. `/complete` creates the final feature commit after approval.

## Build steps

- [x] **1. Add the phases data helper.** In `frontend/src/lib/api.js`, add `getPhases(seasonCode)` (`GET /seasons/:seasonCode/phases`). **Done when:** `cd frontend && npm run build` passes; `npm run lint` passes.
- [x] **2. Build the standings page.** Add `frontend/src/standings/StandingsPage.jsx` (phase tabs from `getPhases`, fetches `getSeasonStandings(seasonCode, phaseCode)` per selected tab, page-level loading/empty/error states) and `frontend/src/standings/StandingsTable.jsx` (renders one standings response: the columns above, a tie-break marker when `calendar.position !== basic.position`, form badges from `form`, and a qualified-line style break). Wire `/:seasonCode/standings` as a route under `SeasonLayout` in `App.jsx`. **Done when:** `cd frontend && npm run build` and `npm run lint` pass; with both dev servers running, `E2025`'s `RS` tab shows a full ranked table with form badges and correct qualified styling, its `PI`/`PO`/`FF` tabs show an empty-state message, `E2026`'s `RS` tab shows the empty state, a team name link falls through the existing catch-all without erroring, and the tie-break marker is proven with an isolated fixture (a mocked response with diverging `basic`/`calendar` positions) since no live round currently exercises it; the browser console shows no errors in any of these states.

## Files / areas

- `frontend/src/lib/api.js` for `getPhases`.
- `frontend/src/standings/StandingsPage.jsx`, `StandingsTable.jsx` (new).
- `frontend/src/App.jsx` for the new route.

## Data / contracts

Consumes existing contracts unchanged: `GET /seasons/:seasonCode/phases` → `{ phases: [{ code, name }] }`; `GET /seasons/:seasonCode/phases/:phaseCode/standings` → `{ round, standings: [StandingEntry] }` (see feature 1d-i's archived spec for the full `StandingEntry` shape). No new backend routes or fields.

The page reads only `clubCode`, `clubName`, `basic`, `calendar.position`, and `form` from each `StandingEntry`; `streaks`, `aheadBehind`, `margins`, and `streakHistory` are fetched (they're part of the same response) but not rendered in this feature. A `null` `basic` for a team renders that row's numeric columns as "—" rather than 0; a `standings: []` response renders the phase's empty state, distinct from a loading or error state.

## Testing

- No test runner configured for the frontend; this is UI/integration behavior, routed to browser verification per the coding standards. Run `cd frontend && npm run build && npm run lint` after each step.
- `/implement` needs both dev servers running for step 2's live verification; ask the user to start whichever is not already running.
- Manually verify: phase-tab switching for `E2025` (`RS` populated, others empty) and `E2026` (empty), qualified/non-qualified row styling, form badges, and the tie-break marker via an isolated fixture.

## Notes for the AI

- Season is always read from `useParams()` per feature 2's convention.
- Reuse the loading-spinner/error-alert visual pattern from `frontend/src/season/SeasonLayout.jsx` and the `panel`/`muted`/theme-token conventions already established on the dashboard; don't hardcode colors.
- `resultOrdinal: 0` in the `form` array is assumed to be the most recent result (not confirmed by the source's own documentation); this is a display-order-only assumption with no data-integrity consequence, easy to flip if a future feature finds otherwise.
- Team links point to `/:seasonCode/teams/:clubCode`, matching the URL scheme features 3 and 6 already share.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6723,"specSha256":"27fe4da67dbe39ed7e1145182e46cf97f05657ca4eefa216b0a56f3a7fed54b1","branch":"refs/heads/feature/standings","head":"e89bf6b534501b19eeffc63edbad8065b1086bb8","baseRef":"refs/heads/master","baseCommit":"e89bf6b534501b19eeffc63edbad8065b1086bb8","sourceTree":"5f0496b78785ff69ed87da4e6069cad02dff281e","absentOptional":[]} -->
