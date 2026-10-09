# Feature: Players mobile layout

**From build-plan:** feature 31i
**Build attempt:** 1
**Branch:** feature/players-mobile-layout
**Status:** verified

## Goal

Make the Players directory (`/:season/players`, `frontend/src/players/PlayersPage.jsx`) work from 320px up: no sideways page scroll, no names or clubs cut off with an ellipsis where they can wrap or shorten, and a 36-card page that is not needlessly tall on a phone. Layout and label only: no API or data change. Mobile is below 640px (unprefixed styles), tablet is `sm` (640px), desktop is `lg` (1024px); `xl` and `2xl` stay.

Today the page is a search field, a "Showing 1-36 of N players" line, a grid of portrait cards (1 column below `sm`, 2 at `sm`, 3 at `xl`, 4 at `2xl`) and Previous/Next page buttons. A card is a portrait (`w-20`, `sm:w-24`), the surname and first name (both `truncate`), the shirt number, the club (crest and full name, `truncate`) and a "position · country · height" line (`truncate`). At 320px the text block is about 185px wide, so a long surname or club name ("Panathinaikos AKTOR Athens") ends in an ellipsis, and each card is at least `min-h-28`, so a page of 36 is about 4,300px tall. The Players page is already in the overflow spec (`responsive.spec.js`), which only reports elements that overflow the page.

## In scope

1. **Two-column stacked card on a phone.** Below `sm` the cards are a two-column grid (`grid-cols-2`, `gap-3`) and each card is stacked: the portrait on top, full card width at a 4:3 ratio, then the text below it (`px-2.5 pb-2.5 pt-2`). From `sm` the card is as today (portrait on the left, `sm:w-24`, `min-h-28`) and the columns are unchanged (2 at `sm`, 3 at `xl`, 4 at `2xl`). At 320px a card is about 142px wide with about 120px of text. The user chose this from a throwaway mockup (since deleted) over one compact card per row.
2. **Names wrap, not cut.** Below `sm` the surname is `text-sm`, may take two lines (`wrap-break-word`, `line-clamp-2`) and breaks at a hyphen first; the first name may take two lines as well. The text block keeps `min-w-0`. Below `sm` the shirt number is a small badge on the portrait's top-right corner (the user chose this at 320px, where a number beside the name left about 86px and cut live surnames such as BEAUCHAMP mid-word), so the surname gets the card's full text width. From `sm` the number sits beside the name as today, and the surname and first name are as today.
3. **Club as TV code below `sm`.** The club line shows the club's `clubTvCode` below `sm` and the full `clubName` from `sm`, using the existing `ShortLabel` (`frontend/src/lib/ShortLabel.jsx`). The short label falls back to `clubCode`, then to `clubName`, when the response carries no TV code (older responses and test mocks). The full name stays in the page for screen readers below `sm`. The crest keeps its size (`flex-none`).
4. **Details line.** "Position · country · height" wraps onto at most two lines (`line-clamp-2`) below `sm` instead of being cut; from `sm` it is as today.
5. **Controls and states.** The search field and the Previous/Next buttons fit and are reachable at 320px; the "Showing x-y of N players" line wraps if it must; the loading, error (with its Retry button), empty ("No players available for this season.") and no-match ("No players match your search. Try a different name.") states fit at 320px. After Previous/Next the new page's top still scrolls into view below the mobile header (the `scroll-mt-24` offset is checked against the slim header; use the shared header-height variable from 31a only if it is wrong).
6. **Spec.** A new `frontend/e2e/players-layout.spec.js` (patterns from `teams-layout.spec.js`: load once, resize through the widths). The existing Players entry in `responsive.spec.js` keeps passing.

## Out of scope

- Any API or data change, the player page and its tabs (item 31j), and any change to links, search behaviour, page size, ordering or what a card says beyond the label rule above.
- A different card design from the Option A mockup, a filter bar, or "load more" instead of paging.
- Changing `PlayerPortrait`, `SearchField`, `PageHeader`, `RevealImage` or other shared components (only an opt-in prop with today's default if one is unavoidable).

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the narrow check after each, then present one final review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Card layout and labels.** Rework `PlayerCard` in `PlayersPage.jsx` and the grid: two columns and a stacked card below `sm`, wrapping surname and first name, `ShortLabel` club (TV code below `sm`), two-line details, `flex-none` on the crest and the number; the card from `sm` is unchanged. Touch the controls and summary line only if the check shows a problem. *Done when:* at 320 and 390px the cards are two per row, each with its portrait on top and its name, number, TV code and details visible, with no cut-off words in the live names and no page overflow; at 640 and 768px the cards are two per row and at 1024px two (3 from 1280px, as today) with the full club name, looking as they do now; a player without a club, a portrait, a shirt number or a height keeps a tidy card; the link's accessible name still starts with the player's name and includes the full club name at every width; `npx playwright test responsive.spec.js smoke.spec.js` still passes.
- [x] 2. **Controls, states and spec.** Add `players-layout.spec.js` using the live data, with mocked responses for long names, a missing club, portrait, number and height, and for the error, empty and no-match states; fix anything it finds in the search field, buttons or summary line. *Done when:* it passes, and root `npm run build` and `cd frontend && npm run lint` pass.

## Files / areas

- `frontend/src/players/PlayersPage.jsx`: the card and, if needed, the controls.
- `frontend/src/index.css`: only if a rule is needed (unlayered rules outrank utilities).
- `frontend/e2e/players-layout.spec.js`: new.
- `frontend/e2e/responsive.spec.js`: only if the entry needs changing (it should not).

## Data / contracts

None. Reads the existing `GET /api/seasons/:seasonCode/players?search&limit=36&offset` response: `players[]` with `personKey`, `name`, `jerseyName`, `imageUrl`, `clubCode`, `clubName`, `clubTvCode`, `crestUrl`, `dorsal`, `positionName`, `countryCode`, `heightCm`, and `pagination` (`total`, `hasMore`). `NULL` club, number, height or portrait means unavailable: the card omits that part, never shows zero.

## Testing

No unit test runner is configured. Browser tests are opt-in evidence (`cd frontend && npx playwright test <file>`; Playwright starts its own servers). `players-layout.spec.js` loads the page once and resizes through 320, 390, 639, 640, 768, 1023, 1024 and 1280px and checks: cards per row (2, 2, 2, 2, 2, 2, 2, 3), a stacked card (portrait above the name) below 640px and a side-by-side card from 640px, every card's content inside the card, the crest and the shirt number not squeezed, the club label equal to a real `clubTvCode` below 640px and to the full `clubName` from 640px, no cut-off word in the live names (`findBrokenWords` from `support/layout.js`) and, for a mocked very long double-barrelled surname, at most two lines inside the card, the link's accessible name, the document not wider than the window, the search field and the page buttons inside the window, and (with mocked responses) a card with no club, portrait, number or height, and the error, empty and no-match states at 320px. Nothing here proves how it looks in the user's browser; the final packet will say so.

Verify: no `Verify` command is declared in `AGENTS.md`, so none was run while writing this spec. The final gate is root `npm run build` plus `cd frontend && npm run lint`.

## Notes for the AI

- Follow the user's rules: scope changes to the page being built, shared components only get opt-in props, and the TV code is the short label wherever a full name does not fit (memory notes on page scope and TV codes). `ShortLabel` is already shared; use it as is.
- Two columns is tight at 320px (about 120px of text). Built with the shirt number as a badge on the portrait's corner, because live surnames cut mid-word with the number beside the name; the user chose that fix over a smaller name only, one card per row, or accepting the breaks.
- The mockup used a 4:3 portrait and `text-[0.7rem]` first names; the surname is `text-sm` (the mockup's `text-base` was too wide for 9+ letter surnames).
- Match the surrounding code style and comment density; no Co-Authored-By or AI attribution in the commit message (AGENTS.md).

## Built as

- As specced, with one change at the user's choice during the build: at 320px a shirt number beside the name left about 86px, and live surnames (BOLOMBOY, BEAUCHAMP, BLOSSOMGAME) broke mid-word, so below 640px the number is a badge on the portrait's top-right corner and the surname is `text-sm` (it was `text-base` in the mockup). From 640px the number sits beside the name as before.
- The name block is `flex-1` so it fills the row; without it the spec's cut-word check read fractional text widths as breaks.
- The layout spec's "content inside the card" check leaves out text that a `truncate` element cuts with an ellipsis (the club name from 640px).
- Checks run: `players-layout.spec.js` (4 passed), `responsive.spec.js` and `smoke.spec.js` (109 passed), `cd frontend && npm run lint`, root `npm run build`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9553,"specSha256":"844a2e0a9c57374864f7a90f234a755cc5cdeaf65acaebec7a9a24a962232344","branch":"refs/heads/feature/players-mobile-layout","head":"7fda7bdbdd4a5a9e13a6e30b347ad851a46b0a38","baseRef":"refs/heads/master","baseCommit":"7fda7bdbdd4a5a9e13a6e30b347ad851a46b0a38","sourceTree":"9a38acf40ce0b69fc41f3dfed3a036afaa385600","absentOptional":[]} -->
