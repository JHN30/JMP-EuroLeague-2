# Fix: Head-to-head right team select aligned to the right edge

**Type:** Fix
**Status:** verified
**Branch:** fix/head-to-head-right-team-select-aligned-to-the-right-edge

## The problem

On the Head-to-head page the picker panel is a grid of `[minmax(0,1fr)_auto_minmax(0,1fr)]` from 640px (`sm`): Team A, the swap button, Team B. Each select keeps its natural width (about 20rem), so it sits at
the left of its column: Team A hugs the panel's left edge, but Team B floats left of the right edge, which looks lopsided (screenshot at 1280px).

## The fix

In `frontend/src/comparisons/HeadToHeadPage.jsx` give `TeamPicker` an optional `className` passed to its select and use it for Team B: `sm:justify-self-end`. The left select, the swap button between them and the stacked layout
below 640px (where each select is already full width) stay as they are.

## Build steps

- [x] 1. **Align Team B right and test it.** Make the change and add to `e2e/head-to-head-layout.spec.js`, in the picker test, an assertion that from 640px Team B's select right edge meets the panel's content edge (within 1px) and Team A's
      left edge meets the left content edge, and that below 640px both selects still span the panel's content width.
      Done when: the assertion passes at 1280, 1024, 768 and 640px and below 640px; `head-to-head-layout.spec.js` and `cd frontend && npm run lint` and root `npm run build` pass on the local database (`/api/health` says `local`); a screenshot at 1280px shows the right select at the panel's right edge.

## Files

`frontend/src/comparisons/HeadToHeadPage.jsx`, `frontend/e2e/head-to-head-layout.spec.js`.

## Verify

Open a Head-to-head at desktop width: the left team select is at the panel's left edge, the right one at its right edge, the swap button between them. Run only `head-to-head-layout.spec.js`.

## Built

- `TeamPicker` takes an optional `className`; Team B passes `sm:justify-self-end`. Below 640px the two selects are not full width at 639px (they keep their natural width, one under the other, both on the left edge), so the check below 640px asserts they stay on the left edge instead of spanning; the spec text above said they span.
- Evidence (local database, `/api/health` said `local`): `head-to-head-layout.spec.js` passes (9 tests; the picker test checks Team A's left and Team B's right edge against the panel's content edges at 1280, 1024, 1023, 768, 640, 639, 390 and 320px); a 1280px screenshot shows the right select at the panel's right edge. Root `npm run build` and `cd frontend && npm run lint` pass.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2565,"specSha256":"5395d1d5c4fcf209d6d60d81f2cd77d330d8ec04f88d45e49f631f1de7627b8d","branch":"refs/heads/fix/head-to-head-right-team-select-aligned-to-the-right-edge","head":"fe3fece182e53115bedb169b2ace1b1d8eff1e63","baseRef":"refs/heads/master","baseCommit":"fe3fece182e53115bedb169b2ace1b1d8eff1e63","sourceTree":"bd11e3393eb8345fd84015771807ae99908865bf","absentOptional":[]} -->

## Completion evidence

- Local database (`/api/health` said `local`): `head-to-head-layout.spec.js` passed (9 tests; the picker test checks Team A's left and Team B's right edge against the panel's content edges at 1280, 1024, 1023, 768, 640, 639, 390 and 320px); a 1280px screenshot showed the right select at the panel's right edge.
- Root `npm run build` (with the backend `tsc` check) and `cd frontend && npm run lint` pass (rerun at completion). No `Verify` command is declared in `AGENTS.md`.
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested.
