# Feature: Game detail matchup header

**From build-plan:** feature 31f-vi
**Build attempt:** 1
**Branch:** feature/game-detail-matchup-header
**Status:** verified

## Goal

Lay the game page's header out the way EuroLeague's own game page does, because it reads at a glance: each club's large crest at its own end of the card with its **TV code** and its **current league position in brackets** beneath it ("PAO (1)"), and in the middle the final score with "Final" under it for a played game, or the tip-off time for a game still to come, with one line under the whole row giving the round and the date ("Round 38 · Mon, 30 Nov 2026"). The home club is on the left and the road club on the right, as today.

This replaces the current header (two crests with the full club names, "vs", a date line and a score callout) and uses what 32a added to the API: each club's `tvCode`. It also makes the header much shorter on a phone: the names (which wrapped over several lines at 320px) are gone, replaced by three-letter codes, and the date line is one line at every width.

Layout and labels only: no API or data change. The game page's tabs, document title, queries and states stay as they are.

## Design reference

The reference is EuroLeague's game header (the screenshot you sent): crest above a bold code with a lighter bracketed number on each side, the time (or score) large in the middle, and the date in small grey under it.

Current code (read; step 1 re-checks it):

- `GameDetailPage.jsx` renders `PageHeader` (kicker "MATCHUP", an `h1` holding both clubs: a crest and the full `teamName` each, around "vs"; a description line with the round and the date, in a short form below `sm` and the long form from it; and, as its children, a `.stat-callout` with the score and "Final" or a "Scheduled" badge). The winner's name is in the primary colour. The page's `h1` is also what the header spacing spec reads (`h1.closest("section")`, 24px above the content).
- The API now gives each club object `tvCode` (32a). Standings entries (`getSeasonStandings(seasonCode, "RS")`, already used by the Games page under the query key `["standings", seasonCode, "RS"]`) carry `clubCode` and `basic.position`; with no round asked for they are the latest round.
- Specs that read the header: `game-detail-layout.spec.js` (31f-i: the crest and name sizes, the score callout, the one-line date) and `responsive.spec.js` (the `h1`, and the 24px gap under the header section).

Targets: at 320px the header is a single compact card: two 3rem crests, two codes, the centre figure and one date line, all inside the card and the screen, even for a three-digit score ("112 - 101") and a long code or position; from `sm` the crests, codes and the centre figure are larger; the page's `h1` still names both clubs for screen readers.

## In scope

- **A matchup header component** in `frontend/src/games/` used by the game page instead of `PageHeader`: a card (`Panel` as a `section`, keeping the primary top line and today's bottom margin, so the spacing under it is unchanged) holding:
  - **each side**: the club's crest (a placeholder-sized empty slot when it has none or fails to load, so the layout holds), under it the club's TV code in bold and, when known, its league position in brackets after it ("PAO (1)", muted). The code is `tvCode`, else the abbreviated name, else the club code, else "TBD". The winner's code uses the primary colour. The full club name is the code's `title` and is read by screen readers;
  - **the centre**: for a played game the score ("84 - 86", large, tabular figures, the winner's score emphasised) with "Final" under it; for a game still to come the tip-off time ("20:15", large, in the viewer's own time zone) with the existing status text ("Scheduled", or the feed's status) under it as a small badge; "TBD" when there is no time;
  - **the line under the row**: "Round 38 · Mon, 30 Nov 2026" (the round name or number, else the phase name, then a short date), centred, one line at every width; "TBD" for a missing date.
- **League position.** From the regular-season standings query (`["standings", seasonCode, "RS"]`, the same one the Games page uses): the club's `basic.position` as of the latest round, shown only for a game of the regular season (`phaseCode === "RS"`) and only when the standings loaded and list the club. While loading, on an error, for another phase, or for a club not listed, the brackets are simply absent (the header never shows an error or a placeholder for it). The number is the current position, not the position at the time of the game; that is stated in the spec's contract below, not in the interface.
- **Responsive sizes.** Below `sm`: crests 3rem, codes about 1.125rem, the score about 1.75rem, tighter padding; from `sm`: crests about 5rem, codes about 1.5rem, the score or time about 3rem. A position that does not fit beside its code drops to the next line, centred. Nothing is cut or wider than the card at 320px.
- **Accessibility.** The page keeps one `h1`, visually hidden, reading "{full home name} vs {full road name}" (so the header spacing spec and screen readers still find it); the crests are decorative; each position is read as "league position N"; the score is readable as text.
- **Specs.** The header tests of `game-detail-layout.spec.js` are rewritten for the new header, and a new spec covers the contents and sizes (see Testing).

## Out of scope

- Showing TV codes anywhere else (the Games cards, Standings, Home and the rest are 32b and the later pages of 31), linking the codes or crests to team pages, a record or form line, a live-score or countdown, a venue.
- The position as of the game's round, or for playoff games; any API, data or routing change.
- The tabs and everything below the header.
- Fixing the Playwright reliability and flaky-spec items (31n).

## Build loop

`workflow.stepReview` is `feature`: build the steps in order without pausing, run the narrow check after each, run the final gate once after the last step, then present one review packet. `workflow.checkpointCommits` is `disabled`: no step commits; `/complete` makes the single work commit.

## Build steps

- [x] **1. The component and the page.** Add the matchup header component (and a small `teamCode` helper next to `teamName` in `gameUtils.js`), query the regular-season standings for the position, and use the component in `GameDetailPage.jsx` in place of `PageHeader`, removing the now unused date helpers there. Done when `npm run lint` passes and, with the dev servers running, a played game and a game still to come both show the new header at 390px and 1280px (checked with a scratch Playwright screenshot, deleted afterwards), with the codes and positions from the API.
- [x] **2. Sizes and robustness.** The phone and desktop sizes above, and the states: a three-digit score, a club still to be set ("TBD", empty crest slot), a game with no date or time, a failed crest, a standings request that fails or lists no such club (no brackets, no error), a non-regular-season game (no brackets), a long code. Done when at 320px the header's parts are all inside the card and the page does not scroll sideways in each of those states, and at 640px and wider the sizes are the larger ones.
- [x] **3. Specs.** Rewrite the header tests of `game-detail-layout.spec.js` for the new header (the crest sizes, the score and date line) and add `frontend/e2e/game-matchup-header.spec.js` (see Testing). Done when `npx playwright test game-matchup-header game-detail-layout responsive` passes.
- [x] **4. Final gate and handoff.** `npm run build` at the repository root and `cd frontend && npm run lint` pass, the spec's boxes are checked, the status is `verified`, and the review packet lists the checks run. Done when both commands exit 0 and the packet names them.

## Files / areas

- `frontend/src/games/MatchupHeader.jsx` (new), `frontend/src/games/GameDetailPage.jsx` (uses it; the header markup and the date helpers go), `frontend/src/games/gameUtils.js` (`teamCode`).
- `frontend/e2e/game-detail-layout.spec.js` (header tests rewritten), `frontend/e2e/game-matchup-header.spec.js` (new), and `frontend/e2e/support/game-fixtures.js` only if a fixture needs `tvCode` (prefer overriding the game route inside the new spec).

## Data / contracts

No API or data change. The header reads the game (`localTeam`, `roadTeam` with `tvCode`, `name`, `abbreviatedName`, `clubCode`, `crestUrl`; `scheduledAt`, `played`, `gameStatus`, `phaseCode`, `phaseName`, `roundName`, `roundNumber`, `localScore`, `roadScore`) and the regular-season standings (`standings[].clubCode`, `standings[].basic.position`). A club object without `tvCode` (an older response or a test mock) falls back to the abbreviated name, then the club code. The league position is the position in the latest regular-season standings (the same for every game of the season), shown only for games of the regular season. The standings request is read-only decoration: its loading, error and empty states render nothing and never block or alter the header.

## Testing

- `frontend/e2e/game-matchup-header.spec.js`, following the other game layout specs (load once, resize through the widths, `findPageOverflow`), with `mockGameApi` and the game route and the regular-season standings route overridden inside the spec:
  - a played regular-season game: both TV codes and positions ("PAO (1)", "FBT (2)") under the crests, the score and "Final" in the centre, the round and date line under the row, home left and road right, the winner's code in the primary colour;
  - a game still to come: the tip-off time in the centre with the status text, no "Final", the date line without a time;
  - at 320, 390 and 639px: the whole header is inside the card and the screen, the crests are 48px, the date line is one line for round 38 and a 30 November date, a three-digit score ("112 - 101") fits between the two sides, and the page does not scroll sideways; at 640, 768 and 1024px the crests are larger (80px) and the score or time is larger than on a phone;
  - a club with no `tvCode` shows its abbreviated name, then its club code; a side still to be set shows "TBD" without a broken crest; a failed crest leaves its slot; a failing or empty standings response and a playoff game show no brackets and no alert;
  - the page's `h1` reads both full club names, and there is exactly one.
- Existing specs that must stay green: `responsive` (the `h1` and the 24px gap under the header), `game-*` and `games-layout`.
- No unit-test command exists, and the change is layout, so there is no logic test. There is no declared `Verify` command, so the final gate is the repository build and the frontend lint; the Playwright run is opt-in evidence and is reported as such. Live visual checks at 320, 390, 768 and 1024px are done by the user from the "How to try it" note.

## Notes for the AI

- Follow the 31d to 31f conventions: mobile-first unprefixed styles, `sm` and `lg` as the only breaks, `max-sm:` for phone-only changes, and unlayered CSS outranks Tailwind utilities.
- Reuse `Panel`, `TeamName`'s fallback idea and the standings query key the Games page already uses; add no dependency. The new component is used only by the game page; do not change `PageHeader`.
- `TeamLabel`'s short names (31f-i) are not part of this item and stay as they are; 32b decides which of them become TV codes.
- Write long multi-line files with the Write tool. Do not start a dev server: use the Playwright runner, or ask the user to start one for the step 1 check.

## Open questions

None that block the build. Choices for you to confirm at review: the full club names are no longer visible in this header (only in the tooltip and for screen readers), as in EuroLeague's; and the bracketed position is the club's position today, not at the game.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11850,"specSha256":"558203a9ee4739137f3513150479e3688fba1aac6c468d472d1c3f89fe44262c","branch":"refs/heads/feature/game-detail-matchup-header","head":"b5723e269a02ee67ffd478fd5510c55f8007685a","baseRef":"refs/heads/master","baseCommit":"b5723e269a02ee67ffd478fd5510c55f8007685a","sourceTree":"2ab998af65180538ca4e42b99873c24ece7dc76b","absentOptional":[]} -->
