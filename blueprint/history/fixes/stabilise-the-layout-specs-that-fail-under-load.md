# Fix: Stabilise the layout specs that fail under load

**Type:** Fix
**Status:** verified
**Branch:** fix/stabilise-the-layout-specs-that-fail-under-load

## The problem

Four Playwright specs fail only when the machine is busy (many parallel workers) and pass at normal load. Reproduced with `--workers=12 --repeat-each=3` and `--workers=14 --repeat-each=40`. Each cause below is in the test, not in the app, except one open question under 2.

1. **`frontend/e2e/responsive.spec.js` (lines 43 and 89).** "Postseason does not scroll sideways" (every width) and "sits 24px above the content on Postseason / Records" wait for `getByRole("heading", { level: 1 })` with the default 5s expect timeout. `PostseasonPage` (and Records) return only a loading state, with no `<h1>`, until all their queries finish, which takes more than 5s with many workers. The next line already waits 15s for `.loading` to go. Seen failing at 390, 1024 and 1280px.
2. **`frontend/e2e/player-overview-layout.spec.js`, "the hero keeps a long surname whole...".** Fails about 1 run in 20 under load, at a random width (320, 639, 640, 768, 1023 and 1024px have all been seen), with `visible.length` 0. A diagnostic run showed `chips.first().evaluate` working on a club chip that was no longer in the page (every span width 0, empty computed `display`, chip width 0). The hero re-rendered after the Overview tab was visible, because the registrations and season-stats queries had not finished when measuring started. `openPlayer` (line 34) waits only for the Overview tab, so every test using it can measure a hero that is still filling in (the tests at lines 75, 139, 162 and 199 use it). **Open question:** why the chip element was replaced (late data only, or the app re-creating the chips with a changed key). This fix finds out; if it is an app problem it is reported, not changed, unless it is a real bug.
3. **`player-overview-layout.spec.js`, "the not-found, error and empty states fit a phone".** Failed to find "Could not load league rankings." under load. Likely cause, to be confirmed: the test makes four page loads in the 30s default test budget, and the league-rankings request is mocked to fail with 500, which the app retries with TanStack's default (three retries, 1s, 2s and 4s apart; `new QueryClient()` in `main.jsx`), so the message cannot appear for about 7s per load plus the load itself. The sibling test in `player-career-layout.spec.js` ("a player with one season...") already sets a 120s budget.
4. **`player-career-layout.spec.js`, "the highs, the opened profile, the role table and the clubs fit".** "Test timeout of 30000ms exceeded" at 1024px: it opens the radar (up to a 60s wait) and runs seven widths in the default 30s budget.

## The fix

Tests only. No app code, no app retry setting, no sleeps, no retries added to tests.

1. **`responsive.spec.js`:** give the two `heading level 1` waits an explicit `{ timeout: 15_000 }` (the value already used on the next line). Nothing else in the file changes.
2. **`player-overview-layout.spec.js`:**
   - `openPlayer` waits for the hero to settle before returning: the "Games" fact visible (it appears when the season stats arrive) and the club chip visible, so the later queries have landed. A test that patches the player so a fact or the club is missing (the "no photo, no number, no club" test) waits for what that case does show.
   - In the hero test, measurements that read a chip run after the settle wait and use a locator at the moment of use. Where one `evaluate` reads several things, it stays one evaluate.
   - Find why the chip was replaced: read `PlayerHero.jsx` and `PlayerPage.jsx` for what changes when registrations or stats arrive. State the answer in the spec's Notes.
3. **The error-states test:** `test.setTimeout(120_000)`, as the sibling in the career spec. If the diagnosis above is wrong (the message still does not appear within its 30s wait on its own), find the real reason and say so in the Notes; do not change the app's retry setting for a test.
4. **`player-career-layout.spec.js`:** `test.setTimeout(120_000)` on the "highs, the opened profile..." test.

## Build steps

- [x] **1. Fix the four specs.** Make the changes above and answer the open question in 2. **Done when:** `cd frontend && npm run lint` passes; `npx playwright test player-overview-layout responsive player-career-layout player-advanced-layout player-shooting-games-layout --project=chromium --workers=12 --repeat-each=3` has no failures (run it twice); `npx playwright test player-overview-layout -g "long surname" --project=chromium --workers=14 --repeat-each=40` has no failures (run it twice; it failed in 2 of 40 and 1 of 12 before); and the normal run of those specs passes (150 tests before).

## Verify

1. The two stress commands above, twice each, with no failure. They are proof for this fix, not part of the project's normal gate.
2. Show the old behaviour: with `openPlayer` reverted, the hero stress run fails again. State the result honestly; if it does not fail within two runs, say so rather than claiming the stress run proves the fix.
3. Normal run: `npx playwright test player-overview-layout responsive player-career-layout player-advanced-layout player-shooting-games-layout --project=chromium` passes.

## Notes for the AI

- Do not touch app code unless a failure proves to be a real app bug; then stop and say so.
- Do not add `retries` to the config, `waitForTimeout`, or `networkidle` waits.
- Other specs wait for `heading level 1` with the default 5s (`back-link-scroll`, `scroll-to-top`, `game-detail-layout`) on pages that render the heading at once; leave them unless a stress run shows them failing.

## Notes

- **Open question, answered:** the chip replacement is by design, not an app bug. `PlayerHero` shows the club from the player's own record (key `player.clubCode`) until the registrations request lands, then switches to the registrations (key `registrationKey`), so the chip element is replaced once. A test that measured between those two renders hit the old, detached chip. `openPlayer` now waits for the registrations response and the "Games" fact (season totals) before returning.
- **Error-states test:** diagnosis not separately proven; its budget is now 120s like its sibling (four page loads, plus about 7s of retries per failing request). It passed in every stress run after the change.
- **Beyond the four listed:** the same kind of too-short wait showed up in the stress runs in three more places, and each got the smallest change: the `.loading` wait in `responsive.spec.js` (15s to 30s, both tests, with a 60s test budget since the heading wait is now 30s too), the heading wait (30s, not 15s: Records once took longer), and the radar-redraw poll in the Overview "holds its content" test (5s to 15s).
- **Evidence:** hero test alone, 14 workers x 40: 80 of 80 passed with the fix; with the old `openPlayer` 2 and 5 of 40 failed. The five-spec stress run (12 workers x 3): 393 passed (run 3), 392 of 393 (run 5, one `.loading` still on screen after 30s on Overview (finished season) at 390px), 393 passed (run 6). Earlier runs with only the first set of changes had 1 to 14 failures, all of the too-short-wait kind. Normal run of the five specs: 131 passed.
- **Remaining risk:** at 12 workers the backend (which reads a remote database) can leave one page loading for over 30s, which one run in about four showed once. That is machine load, not a layout fault; raising the wait further would only hide it.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7520,"specSha256":"3a2134ad025387d82d7c75484596924344e4be150d858f65e8ab2d5e66264b58","branch":"refs/heads/fix/stabilise-the-layout-specs-that-fail-under-load","head":"ed02462a2a8ddfa6eeeb9897b5cffa10a79668f8","baseRef":"refs/heads/master","baseCommit":"ed02462a2a8ddfa6eeeb9897b5cffa10a79668f8","sourceTree":"25e2d606cfd34711a79a3d7fb80ac9a26bc6f61f","absentOptional":[]} -->
