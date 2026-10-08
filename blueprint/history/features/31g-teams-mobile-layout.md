# Feature: Teams mobile layout

**From build-plan:** feature 31g
**Build attempt:** 1
**Branch:** feature/teams-mobile-layout
**Status:** verified

## Goal

Make the Teams directory (`/:season/teams`, `frontend/src/teams/TeamsPage.jsx`) work from 320px up: no sideways page scroll, no squashed crest or clipped text, and a directory of 20 clubs that does not turn into a very long single column on a phone. Layout and label only: no API or data change. Mobile is below 640px (unprefixed styles), tablet is `sm` (640px), desktop is `lg` (1024px); `xl` stays.

Today the page is a grid of cards (1 column below `sm`, 2 at `sm`, 3 at `lg`); each card is the crest, the club's full name and its country code. The crest has no `flex-none`, so a long name can squeeze it, and on a phone 20 one-per-row cards make a page about 1,500px tall. The Teams page is already in the overflow spec (`responsive.spec.js`), which only reports elements that overflow the page.

## In scope

1. **Two columns on a phone.** Below `sm` the cards are a two-column grid, so the directory is about half as tall. At `sm` it stays two columns and at `lg` three, as today. A card below `sm` is stacked and compact (crest above its label, centred or left-aligned to match the card style) so that a card about 140px wide at 320px holds its content.
2. **TV code as the short label.** Below `sm` a card names the club by its TV code (`teamCode` in `frontend/src/games/gameUtils.js`: TV code, then abbreviated name, then club code, then "TBD"), because the full name ("Panathinaikos AKTOR Athens") does not fit a 140px card without wrapping to three lines. From `sm` the card shows the full name as it does today (`name ?? abbreviatedName ?? clubCode`). The full name stays in the page for screen readers below `sm` and as the link's accessible name, using the existing `ShortLabel` (`frontend/src/lib/ShortLabel.jsx`); the country code line is unchanged.
3. **Crest never squeezed.** The crest keeps its size (`flex-none`) at every width, with a fixed slot so a card without a crest or with a crest that fails to load keeps the same alignment and height as its neighbours (no layout jump).
4. **Long names.** From `sm` a long full name wraps onto at most two lines inside its card (the text block gets `min-w-0`), and nothing overflows the card at 640, 768 and 1024px.
5. **States.** The loading, error (with its Retry button) and empty ("No teams available for this season.") states fit at 320px.
6. **Spec.** A new `frontend/e2e/teams-layout.spec.js` (patterns from `games-layout.spec.js`: load once, resize through the widths), and the existing Teams entry in `responsive.spec.js` keeps passing.

## Out of scope

- Any API or data change, the team page and its tabs (item 31h), and any change to links, sorting or what a card says beyond the label rule above.
- Search, filters, grouping or a different directory design.
- Changing `RevealImage`, `PageHeader` or other shared components (only opt-in props with today's default if one is unavoidable).

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the narrow check after each, then present one final review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Card layout and label.** Rework the card in `TeamsPage.jsx`: two columns below `sm`, stacked compact card with a fixed crest slot, TV code via `ShortLabel` below `sm`, full name with `min-w-0` from `sm`. Add CSS only if a utility cannot do it. *Done when:* at 320 and 390px the cards are two per row, show the crest and the TV code and country code, with no clipped text and no page overflow; at 640 and 768px they are two per row and at 1024px three, with the full name wrapping inside the card; a club without a crest keeps its card height; the link's accessible name is the full name at every width; `npx playwright test responsive.spec.js smoke.spec.js` still passes.
- [x] 2. **Spec and final gate.** Add `teams-layout.spec.js` with the live data (and mocked failing and empty responses for the states). *Done when:* it passes, and root `npm run build` and `cd frontend && npm run lint` pass.

## Files / areas

- `frontend/src/teams/TeamsPage.jsx`: the card.
- `frontend/src/index.css`: only if a rule is needed (unlayered rules outrank utilities).
- `frontend/e2e/teams-layout.spec.js`: new.

## Data / contracts

None. Reads the existing `GET /api/seasons/:seasonCode/teams` response (`clubCode`, `name`, `abbreviatedName`, `tvCode`, `crestUrl`, `countryCode`).

## Testing

No unit test runner is configured. Browser tests are opt-in evidence (`cd frontend && npx playwright test <file>`; Playwright starts its own servers). `teams-layout.spec.js` loads the page once and resizes through 320, 390, 639, 640, 768, 1023 and 1024px and checks: the number of cards per row (2, 2, 2, 2, 2, 2, 3), every card's content inside the card, the crest at its full size, the label equal to a real team's TV code below 640px and to its full name from 640px, the link's accessible name, the document not wider than the window, and (with mocked responses) a card with no crest, a very long name, and the error and empty states at 320px. Nothing here proves how it looks in the user's browser; the final packet will say so.

Verify: no `Verify` command is declared in `AGENTS.md`; the final gate is root `npm run build` plus `cd frontend && npm run lint`, not run while writing this spec.

## Notes for the AI

- Follow the user's rules: scope changes to the page being built, shared components only get opt-in props, and the TV code is the short label wherever a full name does not fit (memory note on TV codes).
- The two-column compact card and the TV code below `sm` are my proposal; the fallback if it feels wrong when tried is one column with the full name (today's layout) and only the crest fix.
- `RevealImage` wraps the crest; check how it sizes before adding `flex-none`.
- No Co-Authored-By or AI attribution in the commit (AGENTS.md).

## Built as

- As specced. The crest slot is a 40px span around `RevealImage`; the spec measures the crest with its layout width, because the reveal animation scales the image for a moment and a bounding box would read 41px.
- Changed after the first review, at the user's request: below 640px the card is centred (crest, label, country code) and the label is the club's abbreviated name ("Anadolu Efes", "Crvena Zvezda"), which fits a 140px card, not the TV code (this replaces In scope item 2 for the phone; from 640px the full name is unchanged). The spec checks the centring and that a long abbreviated name takes at most two lines.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6667,"specSha256":"f002feb655a97548a990b89d0be65dff329aed65d15402db93ea0dbf05dfc408","branch":"refs/heads/feature/teams-mobile-layout","head":"476446e9fe3b02769f4a8838668a9c1fd1184995","baseRef":"refs/heads/master","baseCommit":"476446e9fe3b02769f4a8838668a9c1fd1184995","sourceTree":"f39bb24b4ff465a798157b274ab0075884955a2b","absentOptional":[]} -->
