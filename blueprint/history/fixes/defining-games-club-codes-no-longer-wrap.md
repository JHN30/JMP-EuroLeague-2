# Fix: Defining games club codes no longer wrap

**Type:** Fix
**Status:** verified
**Branch:** fix/defining-games-club-codes-no-longer-wrap

## The problem

On the Overview page, a "Defining games" card (`frontend/src/season/SeasonOverviewPage.jsx`, `DefiningGames` and `TeamName`) draws the two clubs and the score badge in a `grid-cols-[1fr_auto_1fr]` row. A `1fr` track will not shrink below its content, and the club code is a `break-words` span, so when a 3-digit score widens the badge (for example 110 - 113 in 2004-05 at 320px, where a card is about 262px wide) the road club's TV code is squeezed and wraps letter by letter ("MA / C"). Seasons before 2005 were not in the test data, so no spec saw it.

## The fix

The change is already made and uncommitted on the branch (5 lines in `SeasonOverviewPage.jsx`); `/implement` verifies it and adds the check:

- The TV code span (`lg:hidden`) is `whitespace-nowrap` instead of `break-words`.
- The row is `grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]` so the two club columns share what the badge leaves.
- The row and both club cells use `gap-1.5` below `sm` and `gap-2` from `sm`; the score badge has `px-2`.

Unchanged: the short names from `lg`, the crests, the score colours, the card layout from 640px, and every other page.

## Build steps

- [x] 1. **Check the change and cover it.** Add a test to `frontend/e2e/overview-layout.spec.js`: open the 2004 season's overview (`/2004/overview`, the 2004-05 season in the local database), and at 320px and 390px assert for each "Defining games" card that no club-code span (`span[aria-hidden="true"]`, visible) is taller than about one line and that nothing inside the card reaches past its right edge. Done when this test passes on the local database (`/api/health` says `local`), the existing "crest and TV code" tests in the same file still pass, and `cd frontend && npm run lint` passes.

## Verify

`cd frontend && npx playwright test overview-layout.spec.js` on the local DB only. Manually: open Overview for 2004-05 at about 320px and look at "Highest-scoring game": `AEK 110 - 113 MAC` stays on one line.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2121,"specSha256":"54cdba25aa5d072e67630cccd2aca26e5daf0aae339d17393d9a2f7132e23645","branch":"refs/heads/fix/defining-games-club-codes-no-longer-wrap","head":"61215bcac0e5a373ce8225f36c3c0a6d317d7e7e","baseRef":"refs/heads/master","baseCommit":"61215bcac0e5a373ce8225f36c3c0a6d317d7e7e","sourceTree":"8ae16f4d3a849b43b9336f70d9a711303df53533","absentOptional":[]} -->

## Completion evidence

- Reproduced before the change on the 2004-05 season (local database) at 320px: the road club code in the Highest-scoring game card (110 - 113) wrapped as "MA / C"; at 360px and wider it did not. After the change no code wrapped at 320, 360 or 390px, nothing passed the card edge, and a 320px screenshot showed AEK 110 - 113 MAC on one line.
- Local database (`/api/health` said `local`): `overview-layout.spec.js` passed (26 tests including the new 2004 test). With the `SeasonOverviewPage.jsx` change stashed, the new test failed on the wrapped code, so it covers the defect.
- `cd frontend && npm run lint` and `npm run build` pass. No `Verify` command is declared in `AGENTS.md`.
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested. The product edit was made on the branch before the fix spec was written, at the user's request for a quick fix; the spec and test were added afterwards.
