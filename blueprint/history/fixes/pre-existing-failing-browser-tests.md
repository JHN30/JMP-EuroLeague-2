# Fix: Pre-existing failing browser tests

**Type:** Fix
**Status:** verified
**Branch:** fix/pre-existing-failing-browser-tests

## The problem

These browser tests fail or flake on `master` (local DB, 2026-11-02), so the suite is never green:

| Spec | Test | Cause |
|---|---|---|
| `historical-era-pages.spec.js` | 2016, 2017, 2018, 2020, 2022: "existing pages retain season data and available stages" | Waits for a team Statistics region named "Traditional"; `team-statistics-tab-with-every-stat-grouped` renamed the groups ("Scoring", "Rebounding", ...) |
| `cancelled-season.spec.js` | "all existing archive pages keep real data, RS scopes and loaded-season history" | Same "Traditional" region |
| `skeleton-loading.spec.js` | Game page › "the Overview shows its skeleton while the box score loads" | Waits for "Loading the best players"; `compact-game-page-on-desktop` shows one best player, labelled "Loading the best player" |
| `skeleton-loading.spec.js` | "a team page shows its own page skeleton while its code loads" | Flaky: failed in a full run (about 30s), then passed six times alone and in parallel |
| `skeleton-loading.spec.js` | Players and Compare "shows its own page skeleton while its code loads" | Flaky under a long run, pass alone (known since the player page polish) |
| `compare-player-layout.spec.js` | "the Trends charts fit, show every game, and sit side by side from 1280px" | Flaky (known) |

The app behaves correctly in every stale case; the tests describe old markup.

## The fix

Test changes only, unless step 2 finds an app defect.

1. **Stale expectations.** The six "Traditional" checks wait for the team Statistics tab's first group region ("Scoring")
   instead. The Overview test waits for "Loading the best player". Nothing else in those tests changes.
2. **Flaky tests.** Reproduce each flake first (a cold dev server, then the full `skeleton-loading.spec.js` and
   `compare-player-layout.spec.js` runs, repeated) and record the actual cause before changing anything. Likely causes to
   check: the five-second default timeout on the fallback assertions under load, the page's own data loading racing the
   click, and Vite reloading the page when it optimizes a new dependency on first use. Repair the cause in the test (for
   example wait for the right ready state, or warm the route), or in the app if it is an app bug. Do not just raise
   timeouts or add retries without a recorded cause. If a flake cannot be reproduced after a fair try, say so in the
   handoff and leave that test unchanged.

Must not break: what each test proves (a stale test still checks the same page and data; a skeleton test still proves the
page's own skeleton shows while its code or data is held).

## Build steps

- [x] 1. **Stale expectations.** Done when the five `historical-era-pages` tests, the `cancelled-season` test and the
   Game Overview skeleton test pass.
- [x] 2. **Flaky tests.** Done when each flake's cause is recorded here, and `skeleton-loading.spec.js` and
   `compare-player-layout.spec.js` pass three full runs in a row (or an unreproducible flake is reported as such).

- [x] 3. **More stale tests from the full run (added after review).** The full suite showed seven more tests left behind by
   earlier page work: `scroll-in-page-views` (5 Leaders tests) found the cards' open button by the foot button's classes,
   hidden from 1024px since `compact-leaders-page-on-desktop`, so it now finds "See the full leaderboard" by role (the foot
   button below 1024px, the header button from 1024px); `excluded-season` and `team-stats-null` waited for the old
   "Traditional" region, so they use "Scoring" (points, 3PT % and the missing 2PT %) and "Playmaking" (the missing assists).
   Done when the three specs pass.

## Verify

- Local DB only (`/api/health` says `"target":"local"`).
- `cd frontend && npx playwright test historical-era-pages.spec.js cancelled-season.spec.js skeleton-loading.spec.js compare-player-layout.spec.js`
  passes, three times in a row for the last two.
- Then the full suite once (`npm run test:browser`), since this fix exists to make it green; report any other failure it
  shows rather than fixing it here.

## Implementation notes

- **More stale checks behind the first.** Once past "Traditional", `historical-era-pages` (2020) and `cancelled-season` also
  waited for the player Statistics note "Ranked among the ... players with at least ... games"; it now reads "Ranks and the
  league average are among the ... players with at least ... games", so the regexes match "among the ...".
- **Game Overview: not a flake.** Each team's card has its own best player, so there are two "Loading the best player"
  statuses; the test now expects one per team (it failed every full run with a strict-mode error).
- **Cause 1: `hold` lost requests.** `skeleton-loading.spec.js` held requests with a route handler that never handled them and
  relied on `page.unroute` to let them through; every later `route.continue()` failed with "Route is already handled!". When
  the release landed in the middle of a burst (the player's Season by season asks for every season), a request could stay
  pending for good: reproduced 3 of 10 runs alone, "Loading season history" busy for 30s. `hold` now parks each request on a
  promise and continues it once on release (10 of 10). Home's data hold and the two page-code holds (Records, Home) used the
  same pattern and now use `hold` too (the Home page-code test failed the same way once).
- **Cause 2: `expectLoaded` race.** Right after a navigation there is no busy status yet, so its first check could pass at
  once, and the skeleton check then had only the 5s default: the Leaders board test caught all 28 cards still loading (840
  skeletons) under load. Both checks now wait up to 30s.
- **Not reproduced:** the team, Players and Compare page-skeleton tests (0 failures in 10 runs), and the Compare Trends
  test (failed once in the first combined run, then 0 in 7 combined and 4 solo runs). Left unchanged. One run failed with
  `net::ERR_NETWORK_CHANGED` on `page.goto`, a Windows network blip.
- After the changes `skeleton-loading.spec.js` + `compare-player-layout.spec.js` passed three combined runs in a row
  (82/82 each).
- Full suite (`npm run test:browser`, before step 3): 1,180 passed, 14 failed. Step 3 covers 7 of them. Left for a separate
  fix: `grouped-four-groups` 2008-2011 ("played in separate groups" matches both the Teams leaders note and a card's empty
  text), `progressive-disclosure` (expects "Showing 1-36 of 72 players" on the Players list), `standings-view-controls`
  (Advanced Round select shows 47, test expects 38) and `standings-race-layout` (crest off screen while the race plays).
- Step 3: `scroll-in-page-views`, `excluded-season` and `team-stats-null` pass (21/21).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6922,"specSha256":"ccb5ade7d09a20f91a0349cbe294dd54762743e666f348a12ea2a3a6121dc3b1","branch":"refs/heads/fix/pre-existing-failing-browser-tests","head":"432b3627fdcccbb7abea54f999be20959b0bc974","baseRef":"refs/heads/master","baseCommit":"432b3627fdcccbb7abea54f999be20959b0bc974","sourceTree":"eacf73b251224b08efe6a1ef438500a9633ac51f","absentOptional":[]} -->
