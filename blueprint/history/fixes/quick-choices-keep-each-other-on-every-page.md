# Fix: Quick choices keep each other on every page

**Type:** Fix
**Status:** verified
**Branch:** fix/quick-choices-keep-each-other-on-every-page

## The problem

The Leaders page was fixed in `fix/leaders-choices-read-the-live-address`. A `/debug` pass found the same bug on four more
pages. Each case below was made with two choices back to back, in Chrome, on the local DB:

| Page | Two choices | Normal CPU | CPU 4× slower | What was lost |
| --- | --- | --- | --- | --- |
| Fixtures (`/2014/games?phase=RS`) | Round 3, then a group | lost | lost | `round` |
| Fixtures (`/2025/games?phase=RS&round=10`) | "Next round" twice | kept (round 12) | lost (round 11) | one step |
| Records (`/2026/records?type=player&metric=pointsScored`) | Per game, then a metric | lost at 0 ms | lost up to 400 ms | `per=game` |
| Standings (`/2014/standings?phase=RS`) | Top 16, then a group | not testable (old group not in new phase) | lost | `phase` reset to RS |
| Head-to-head (`/2025/compare/head-to-head`) | Team A, then Team B | kept | lost | `teamA` |

Two causes, sometimes on the same page:

1. **The address from the last render.** React Router 8.4 hands `setSearchParams((current) => ...)` the address from the
   component's last render, not the live one. Affected: `FixturesPage.jsx`, `StandingsPage.jsx`, `RecordsPage.jsx`,
   `HeadToHeadPage.jsx`, the shared `usePhaseParam.js` (Compare, Player and Team pages), and the Compare page's own
   `persistEntities`.
2. **Values from the last render written into the address.** Even with a live address, these handlers write values read
   at render time:

| File | Handler | Value it writes |
| --- | --- | --- |
| `RecordsPage.jsx` | `chooseFamily`, `chooseMetric`, `choosePer` | `type`, `metric`, `per` |
| `StandingsPage.jsx` | `setGroupName` | `phase` (`phaseCode`) |
| `FixturesPage.jsx` | "Previous round" and "Next round" | the next round, computed from the round on screen |
| `HeadToHeadPage.jsx` | `handleSwap` | the two team ids from the last render |

The Player and Team pages keep only `phase` in their address, so nothing can be lost there; they change only through
`usePhaseParam`.

## The fix

- **One shared hook.** Add `useLiveSearchParams()` in `frontend/src/lib/useLiveSearchParams.js`.
  - It returns `[searchParams, setSearchParams]` like React Router's hook.
  - Its setter runs the caller's updater on `new URLSearchParams(window.location.search)`, the live address.
  - Navigation options such as `{ replace: true }` pass through.
  - A non-function value is passed through unchanged.
- **Use the hook in place of `useSearchParams`** in:
  - `FixturesPage.jsx`, `StandingsPage.jsx`, `RecordsPage.jsx`, `HeadToHeadPage.jsx`;
  - `usePhaseParam.js`;
  - the Compare page's `persistEntities` hook call (`ComparisonsPage.jsx`, the `useSearchParams` used for writing).
  - `LeadersPage.jsx` drops its local wrapper for the same hook, so there is one implementation.
- **Handlers read the live address.**
  - **Records:** derive `type`, `metric` and `per` from the live address with the same rules the render uses (one helper
    shared by render and handlers), then apply the choice.
  - **Standings:** `setGroupName` keeps the live `phase` when the address has one, and writes `phaseCode` only when it
    doesn't.
  - **Fixtures:** "Previous round" and "Next round" step from the live address's round when it is one of the phase's
    rounds, else from the round on screen.
  - **Head-to-head:** Swap reads both teams from the live address.

Must not break:
- each page's existing behavior: choices that reset others still reset them (a new phase clears round, stage and group
  on Fixtures, and group on Standings; a record type keeps its metric when it has it);
- the "drop a group that isn't in this phase" effects;
- the Back button stepping through choices;
- the existing specs.

Scope note: this touches several pages and shared code. The "current page only" rule is about visual tweaks; this is a
correctness bug with one cause, so it is fixed everywhere it was found.

## Build steps

- [x] 1. **Shared hook and the cause-1 swaps.** Add `useLiveSearchParams`. Use it in `usePhaseParam`, the four pages,
  Compare's `persistEntities` and Leaders.
  Done when: Head-to-head Team A then B and Fixtures Round 3 then group keep both choices at 4× CPU.
- [x] 2. **Handlers on the live address.** The Records choices, Standings `setGroupName`, Fixtures previous/next round,
  and Head-to-head Swap.
  Done when: Records Per game then metric, Fixtures Next round twice, and Standings Top 16 then group keep both at 4× CPU.
- [x] 3. **Regression tests.** Add `frontend/e2e/quick-choices.spec.js`, run against the local DB. With the CPU slowed 4×
  (CDP `Emulation.setCPUThrottlingRate`), each test makes two choices back to back and checks the address:
  - Fixtures: Round 3 then a group in 2014 keeps `round=3` and `group`;
  - Fixtures: Next round twice from round 10 reaches `round=12`;
  - Records: Per game then Assists keeps `per=game` and `metric=assists`;
  - Standings: Top 16 then a group keeps `phase=TS`;
  - Head-to-head: Team A then Team B keeps both.

  The tests use `test.slow()`, as the Leaders one does.
  Done when: the new spec passes. These still pass:
  - `games-layout.spec.js`, `records.spec.js`, `records-layout.spec.js`;
  - `grouped-standings.spec.js`, `standings-view-controls.spec.js`, `standings-table-layout.spec.js`;
  - `head-to-head.spec.js`, `head-to-head-layout.spec.js`, `compare.spec.js`;
  - `leaders.spec.js`, and `responsive.spec.js`.

## Verify

- Browser tests (local DB; `/api/health` must report `"target":"local"`):
  `cd frontend && npx playwright test quick-choices.spec.js games-layout.spec.js records.spec.js records-layout.spec.js grouped-standings.spec.js standings-view-controls.spec.js standings-table-layout.spec.js head-to-head.spec.js head-to-head-layout.spec.js compare.spec.js leaders.spec.js responsive.spec.js`
- Proof the new spec catches the bug: with the source changes removed, its tests fail (not all may fail at normal
  speed; at 4× they all should).
- Manual: DevTools CPU 4× slowdown, then try the five pairs from the table. Each keeps both choices.
- `cd frontend && npm run lint` and `npm run build` pass.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6258,"specSha256":"8523d1d4600892d608a65a365b2c11ab9647f6ea920f50b70f6a6517f7bc5f98","branch":"refs/heads/fix/quick-choices-keep-each-other-on-every-page","head":"9e38ba52dcfca08f972d5464dab89087e27a640a","baseRef":"refs/heads/master","baseCommit":"9e38ba52dcfca08f972d5464dab89087e27a640a","sourceTree":"d216f1397309371298e21c41e6bfa7b7330ce55f","absentOptional":[]} -->
