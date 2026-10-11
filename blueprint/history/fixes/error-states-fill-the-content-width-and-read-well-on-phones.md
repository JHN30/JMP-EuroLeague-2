# Fix: Error states fill the content width and read well on phones

**Type:** Fix
**Status:** verified
**Branch:** fix/error-states-fill-the-content-width-and-read-well-on-phones

## The problem

The shared error state (`frontend/src/lib/AsyncState.jsx`, the `status="error"` branch) is a daisyUI `alert alert-error` capped at `max-w-md` (28rem) and left-aligned: a narrow red strip with the message and a small Retry button side by side. On wide pages (for example "Could not load head-to-head history.") it hangs in the top-left corner under full-width panels, and on phones the message and Retry sit in an awkward row that wraps unevenly, with a Retry button below the 44px touch size. 52 files use `AsyncState`; the page-level errors all go through the default `errorClassName`.

## The fix

Redesign the page-level error as one contained block, in `AsyncState.jsx` only:

- Full content width (no `max-w-md` cap), the same panel look as the surrounding `Panel`s (rounded, border, base background) with a quiet error accent (error-coloured icon and left/top border) instead of the solid red fill, so it matches the dark and light themes.
- Content centred in a column: a warning icon (`IconAlertTriangle`, `aria-hidden`), the message, then the Retry button (`btn btn-primary`, minimum 44px tall; full width below `sm`, auto width from `sm`). Without `onRetry` there is no button.
- Keeps `role="alert"` on the block and the exact message text and "Retry" button name, so existing specs that find them still pass.
- `fullScreen` keeps its centring wrapper; the block caps at `max-w-md` there so a lone error is not stretched across the screen.
- Unchanged: loading and empty states, the `inline` variant, and the `compact` error used inside dashboard panels (`Dashboard.jsx` passes `errorClassName=""` and `compact`; it keeps today's small alert so panel cards do not grow). `errorClassName` stays as the escape hatch.

## Build steps

- [x] 1. Rebuild the non-compact error branch of `AsyncState` as above. Done when: forcing the head-to-head history request to fail (route abort in a probe) shows the new block full width at 1280px and 375px with no horizontal scroll, Retry is at least 44px tall, and `cd frontend && npm run lint` and `npm run build` pass.
- [x] 2. Cover it in a browser spec. Done when: `frontend/e2e/head-to-head-layout.spec.js` has a test that fails the history request and asserts the alert spans the content width at 1280px, is centred, Retry is at least 44px tall at 375px with no horizontal overflow, and clicking Retry reloads the page once the request succeeds.

## Verify

Run on the local DB only (`/api/health` target `local`): `cd frontend && npx playwright test head-to-head-layout.spec.js compare-layout.spec.js records.spec.js leaders-layout.spec.js responsive.spec.js` (the specs that already exercise error states, plus responsive). Screenshots of the error at 1280px and 375px. Manually: stop the backend, open Compare, Head-to-head, and look at the error on desktop and a phone-width window.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3035,"specSha256":"04e13b50e4744d3886385e890dcea7992b5e28117253c834ffa6d095ef3c4a87","branch":"refs/heads/fix/error-states-fill-the-content-width-and-read-well-on-phones","head":"6a87010e626e2e83732e43e943ebacf31a1da795","baseRef":"refs/heads/master","baseCommit":"6a87010e626e2e83732e43e943ebacf31a1da795","sourceTree":"64c6d27203a90fe10d052ac1490ff47c9bdc38f6","absentOptional":[]} -->

## Completion evidence

- Local database (`/api/health` said `local`): `head-to-head-layout.spec.js`, `compare-layout.spec.js`, `records.spec.js`, `leaders-layout.spec.js` and `responsive.spec.js` passed (180 tests with a throwaway screenshot probe, since deleted). The new Head-to-head test fails the history request and checks the error spans the content width, Retry is centred and at least 44px tall, nothing scrolls sideways at 1280, 390 and 320px, and Retry loads the page again.
- Screenshots at 1280px and 375px showed the centred panel with the warning icon, the message and Retry (full width on the phone).
- `cd frontend && npm run lint` and `npm run build` pass. No `Verify` command is declared in `AGENTS.md`. The backend was not touched.
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested.
