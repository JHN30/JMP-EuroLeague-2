# Fix: Leaders card names break mid-word at 320px

**Type:** Fix
**Status:** verified
**Branch:** fix/leaders-card-names-break-mid-word-at-320px

## The problem

`leaders-layout.spec.js` (written in 31k, first run once browser tests moved to the local database) fails at 320px on the
Teams category cards: in the current season the top club in a card is "Panathinaikos AKTOR Athens", and the browser breaks
"Panathinaikos" in the middle (`findBrokenWords`).

The cause is the top row of `CategoryCard` (`frontend/src/leaders/LeaderParts.jsx`). At 320px a card's content is about
264px wide; the top row gives a larger crest or photo (`h-12 w-12`, 48px), a larger name (`text-base`) and a larger value
(`text-2xl`) than the other four rows, which leaves about 94px for a name that needs about 112px. The other rows (`h-10`,
`text-sm`, `text-lg`) fit. The same top row can break a long player surname in the Players and Advanced cards.

## The fix

- Below `sm`, the top row of a category card uses the other rows' sizes for its picture (`h-10 w-10`) and name
  (`text-sm`), and a smaller value (`text-xl`) that keeps its primary colour, so it still stands out by its value and rank
  badge. That leaves about 116px for the name, enough for the longest single words in the current names.
- From `sm` the top row is as today (`h-12`, `text-base`, `text-2xl`).
- Only `CategoryCard` changes; the board rows, form panels and other pages are untouched.

## Build steps

- [x] 1. **Top row sizes on a phone.** Make the picture, name and value sizes of a card's top row responsive as above.
      Done when: at 320 and 390px no name in the Players, Teams or Advanced cards breaks mid-word, and from 640px the top
      row looks as before; `leaders-layout.spec.js` and the Leaders entries of `responsive.spec.js` pass against the local
      database (`/api/health` says `"target":"local"`); `cd frontend && npm run lint` and root `npm run build` pass.

## Verify

- `cd frontend && npx playwright test leaders-layout.spec.js leaders.spec.js responsive.spec.js -g "Leaders"` with the
  backend on the local database.
- At 320px on `/leaders` (Players, Teams and Advanced), the top row's name sits on at most two lines with whole words, and
  its value is still the largest number in the card.

## Built as

- As specced: below `sm` the top row uses `h-10 w-10`, `text-sm` and a `text-xl` value in the primary colour; from `sm`
  `h-12`, `text-base` and `text-2xl` as before.
- Checks, against the local database (`/api/health` reported `"target":"local"`): `leaders-layout.spec.js`,
  `leaders.spec.js` and the Leaders entries of `responsive.spec.js`, 34 passed, including the Teams cards test that failed
  at 320px before; `cd frontend && npm run lint` and root `npm run build` pass.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2778,"specSha256":"3f8f40a4ed9ad3c0b9ccf10afa367834bdb3882a1de8ce1d612f5fac2c4c8dc8","branch":"refs/heads/fix/leaders-card-names-break-mid-word-at-320px","head":"af53530a098444aefcdf51dc49200d73bcdb36e5","baseRef":"refs/heads/master","baseCommit":"af53530a098444aefcdf51dc49200d73bcdb36e5","sourceTree":"03390d3d0bdbd488473627835009ae039b0a6f80","absentOptional":[]} -->
