# Fix: Readable game, player and team addresses

**Type:** Fix
**Status:** verified
**Branch:** fix/readable-game-player-and-team-addresses

## The problem

The detail pages are addressed by bare codes: `/2026/games/122`, `/2026/players/003733` and `/2026/teams/MAD`. The
codes are correct but say nothing to a person reading or sharing the link. The user wants readable names in the
address, with the code kept at the end (decided 2026-11-18: "names + code", for teams too).

The routes are `games/:gameCode`, `players/:personKey` and `teams/:clubCode` in `frontend/src/App.jsx`. About 90
places build these links by hand (`games/${game.gameCode}`, `players/${personKey}`, `teams/${clubCode}`) across about
38 files.

## The fix

Addresses become `<name words>-<code>`, all lowercase:

| Page | New address | From |
|---|---|---|
| Game | `/2026/games/maccabi-vs-dubai-122` | local team's short name, `vs`, road team's short name, game code |
| Player | `/2026/players/alberto-abalde-003733` | name as "first last" (the data stores "Abalde, Alberto"), person key |
| Team | `/2026/teams/real-madrid-mad` | full name, club code |

- **Short name** (games) is the club's `abbreviatedName` (Maccabi, Dubai, Real, Olympiacos). When it's missing (283
  older club rows), use `name`.
- **Full name** (teams) is the club's `name` (Real Madrid, Olympiacos Piraeus), falling back to `abbreviatedName`.
  The user chose it on 2026-11-18 during Step 3: the standings, records, race and overview answers carry only the
  full `clubName`, so with the short name their links would point at a non-canonical address.
- **Name words:** accents are removed (Bogdanović → bogdanovic). A few letters with no decomposed form are mapped
  (đ→d, ø→o, ł→l, ß→ss, æ→ae, ı→i). Any other run of characters becomes one hyphen, and edge hyphens are trimmed.
- **Reading an address:** the code is the text after the last hyphen, uppercased, or the whole segment if there is no
  hyphen. This is safe because every club code and person key in the data is `[A-Z0-9]+`, with no hyphen and no
  lowercase letter (checked 2026-11-18 on the local copy: 0 exceptions in 33,947 people and all clubs). Game codes
  are digits. The name words are never used to look anything up, so a stale or misspelled name still opens the
  right page.
- **One canonical address:** when a detail page has loaded its game, player or team and the address segment
  differs from the canonical one, it replaces the address (`navigate(..., { replace: true })`) and keeps the query
  string and hash. So old links (`/2026/games/122`, `/2026/teams/MAD`, bookmarks, search results) keep working and
  land on the new form, and so do links built where only the code is at hand.
- **One helper per page type** in `frontend/src/lib/` (next to `seasonSlug.js`): it builds the segment from the
  object each link already has, and falls back to the bare code when the names are missing. Every link site uses
  it instead of building the path by hand. No backend change: the API is still called with the codes.

Must not break:
- Every existing link and its target, including links with `?` query parameters such as tabs or phases.
- Old bare-code addresses: they must still open the page.
- Unknown codes: they still show the page's existing not-found state.
- Comparison and head-to-head query parameters (`?teamA=OLY` and similar): these are not page addresses and stay as
  they are.
- `sitemap.xml`, which lists only section pages. No detail pages are in it, so it doesn't change.
- Back-button behaviour: the canonical redirect replaces the history entry instead of adding one.

## Build steps

- [x] **Step 1 - helpers and reading the address.** Add the segment helpers (build a segment from an object, and read
  the code back from a segment). Make `GameDetailPage`, `PlayerPage` and `TeamPage` read their code through them,
  and replace the address with the canonical one once the entity has loaded.
  **Done when:** `/2026/games/122`, `/2026/games/anything-122`, `/2026/players/003733` and `/2026/teams/MAD` each
  open the right page and end on the canonical address. The browser history has no extra entry. An unknown code
  still shows the not-found state. `cd frontend && npm run lint` passes.
  The full suite then showed that `RouteErrorBoundary` (keyed on `location.pathname`) remounted the page when its
  address became canonical, which reset a tab picked before the swap. It is now keyed on `pageIdentity(pathname)`:
  the same path with the detail segment reduced to its code. So the swap keeps the page, and a move to another page
  still resets the boundary.
- [x] **Step 2 - game links.** Point every `games/...` link at the helper.
  **Done when:** no `games/${` path is built by hand outside the helper (grep). Links on Games, Home, team, player
  and records pages show the new form.
- [x] **Step 3 - player and team links.** Point every `players/...` and `teams/...` link at the helpers.
  **Done when:** no `players/${` or `teams/${` path is built by hand outside the helpers (grep). Links across the
  site show the new form.
- [x] **Step 4 - tests.** Update the browser specs that assert the old addresses or `href`s (about 31 spec files
  mention them), and add one spec for the new behaviour: the canonical form of each page type, an old bare code
  redirecting with no extra history entry, and a wrong name with the right code still opening the page.
  **Done when:** the full browser suite passes against the local database, apart from the known pre-existing
  failure `postseason-layout.spec.js:133`. This change reaches routing and many pages, so the full suite is required.

- [x] **Step 5 - repair F-01: back links step back to a page in any address form.** The independent review found
  that Compare's "Back to Game" link (it knows only the game's code) no longer stepped back, because
  `useBackLinkClick` compared the previous entry's path with the link's path exactly. The game page had already
  moved that entry to the canonical address. It now compares `pageIdentity` of both. The game-overview spec asserts
  the step back: the canonical address, an unchanged history length, and Forward returning to Compare.
  **Done when:** that spec fails without the repair (4 history entries instead of 3) and passes with it, and lint
  passes.

## Verify

- `cd frontend && npm run lint` and `npm run build`.
- Full browser suite (`npm run test:browser`), with `/api/health` reporting `"target":"local"`.
- Manual:
  - Open a game from the Games page: the address reads like `/2026/games/maccabi-vs-dubai-122`.
  - Open a player and a team: `/2026/players/alberto-abalde-003733` and `/2026/teams/real-madrid-mad`.
  - Paste an old address such as `/2026/games/122`: the right game opens, the address changes to the new form, and
    Back returns to where you were before.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6864,"specSha256":"be0297bf16b5ff397fd314cbe08f814474d5218ee45f8d9a8cb43a0dbe805264","branch":"refs/heads/fix/readable-game-player-and-team-addresses","head":"94770ea9803cc436b711cd8076c573c169256f27","baseRef":"refs/heads/master","baseCommit":"4324cbf666c35fae7c01c1e4849269eb0c7429b7","sourceTree":"9bd677b181d3468b724e99ba4be237ec26faca65","absentOptional":[]} -->

## Findings

### readable-game-player-and-team-addresses/F-01 [P1] closed - Compare's "Back to Game" link opens a new history entry instead of stepping back

**File:** frontend/src/comparisons/ComparisonsPage.jsx:565
**Found:** 2026-11-19 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** The link now targets the bare-code address `gamePath(seasonCode, { gameCode: fromGame })` (`/2025/games/1`), while the game page the user came from has already replaced its own history entry with the canonical address (`/2025/games/anadolu-efes-vs-maccabi-1`). `useBackLinkClick` (frontend/src/lib/historyTrail.js:30) compares the previous entry's recorded pathname with the link's pathname exactly, so they no longer match and the click pushes a new entry instead of `navigate(-1)`. Reproduced on the local database: history length 2 (game) -> 3 (compare) -> 4 after "Back to Game", idx 2. Browser Back then returns to the comparison and the game's restored scroll is lost. The spec lists back-button behaviour and every existing link under "Must not break". `game-overview.spec.js:131` still passes only because `toHaveURL(/\/games\/1$/)` catches the transient bare-code URL before the canonical redirect.
**Suggested fix:** Compare page identities in `useBackLinkClick` (`pageIdentity(pathAt.get(idx - 1)) === pageIdentity(to.split("?")[0])`, `pageIdentity` from `lib/pagePaths.js`). Tighten the game-overview test to assert the step back (history length unchanged, or `page.goBack()` then leaves the game) and the canonical game address.
**Resolution:**
2026-11-19 repair on fix/readable-game-player-and-team-addresses (spec Step 5): `useBackLinkClick` (frontend/src/lib/historyTrail.js) now compares `pageIdentity` of the previous entry and the link target, so a bare-code link steps back to the canonical entry. game-overview.spec.js "Compare, opened from an unplayed game, goes back to that game" now asserts the canonical address, an unchanged history length and Forward to Compare; it fails without the repair (history length 4, expected 3) and passes with it. game-overview, detail-back-links, readable-addresses and compare specs: 40 passed; lint passed. Awaiting review.
2026-11-19 independent review (fresh subagent, claude-opus-5-5) of 4324cbf..94770ea: closed. historyTrail.js:33 now compares pageIdentity of the previous entry and the link target, so Compare's bare-code "Back to Game" (and the phone sticky-bar back link, which shares the hook) steps back to the canonical game entry; the comparison can only match the same season, page type and code, so it adds no false step-back. game-overview.spec.js:138-153 asserts the canonical address, an unchanged history length and Forward to Compare; it passed in this review's targeted run. No new defect introduced by the repair.

## Independent review

**Status:** passed
**Target commit:** 94770ea9803cc436b711cd8076c573c169256f27
**Base commit:** 4324cbf666c35fae7c01c1e4849269eb0c7429b7
**Base ref:** refs/heads/master
**Spec hash:** be0297bf16b5ff397fd314cbe08f814474d5218ee45f8d9a8cb43a0dbe805264
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-11-19T00:49:44.142Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-19T00:55:28Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `4324cbf666c35fae7c01c1e4849269eb0c7429b7..94770ea9803cc436b711cd8076c573c169256f27` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `git rev-parse HEAD`, `git merge-base <target> refs/heads/master`, `sha256sum blueprint/context/current-feature.md`, `git status --porcelain --untracked-files=all`: pass (HEAD = target, merge base = base, spec hash matches, only `blueprint/context/review.md` differs)
- `cd frontend && npm run lint`: pass
- `cd frontend && npm run build`: pass (output in ignored `frontend/dist`; working tree unchanged)
- `curl -s localhost:3000/api/health`: pass (`"target":"local"`)
- `cd frontend && npx playwright test game-overview.spec.js detail-back-links.spec.js readable-addresses.spec.js compare.spec.js`: 39 passed, 1 failed (readable-addresses.spec.js:18, cold first run, redirect not seen within the default 5 s; see F-02)
- `cd frontend && npx playwright test readable-addresses.spec.js --repeat-each=3`: pass (15 passed)
- Scratch copy of the `words`/`segment`/`codeFromSegment` helpers run under Node against accented, special-letter, non-Latin, empty and edge segments: pass (expected output)

### Evidence

- Full delta reviewed: `frontend/src/lib/pagePaths.js`, `lib/historyTrail.js`, `ErrorBoundary.jsx`, `GameDetailPage.jsx`, `PlayerPage.jsx`, `TeamPage.jsx`, every link site changed to `gamePath`/`playerPath`/`teamPath` (37 further source files), and all 23 e2e spec changes including the new `readable-addresses.spec.js`.
- Grep: no `games/`, `players/` or `teams/` detail path is built by hand outside `lib/pagePaths.js` (only the API client builds API paths); no other component reads the detail route params, so no caller sees the raw segment.
- Redirect safety: `useCanonicalPath` is guarded by the loaded entity's code equalling the address code (no stale-data redirect while a new code loads); `SeasonLayout` only renders pages for an exact supported season code, so the canonical path is ASCII `[a-z0-9-]` and cannot loop or leave the origin; query string and hash are kept; navigation uses `replace`.
- Unknown and malformed codes: `/api/seasons/2025/{games,teams,players}/` (empty code from a segment ending in `-`) and `/api/seasons/2025/` (a `..` code) answer 404, so pages show their not-found state.
- F-01 re-examined: `historyTrail.js:33` compares `pageIdentity` of the previous entry and the target, which fixes Compare's "Back to Game" and the phone sticky-bar back link that shares the hook; it can only match the same season, page type and code, so it adds no false step-back. `game-overview.spec.js:138-153` asserts the canonical address, an unchanged history length and Forward to Compare; it passed in this run.
- `RouteErrorBoundary` keyed on `pageIdentity` still remounts on a different code or season and keeps the page across the canonical swap. Query keys use the code, so the swap triggers no refetch.
- E2E spec changes keep exact checks: href regexes anchor `-<code>$`, and code extraction (`split("-").at(-1).toUpperCase()`) still compares exact codes. The `progressive-disclosure` fixture key change (`player-1` to `PLAYER1`) matches the real `[A-Z0-9]+` key shape.

### Findings

- F-01 [P1] closed (repair re-reviewed: original defect gone, no new defect)
- F-02 [P3] open - readable-addresses redirect assertions use the default 5 s timeout and failed once on a cold run
- F-03 [P3] open - box-score and game-overview fixtures keep hyphenated person keys, so the asserted player hrefs do not read back to the fixture key

### Remaining risk

- `/check` not run (not required); manual Back-button and paste-an-old-address flows were covered only by the targeted specs above.
- Full browser suite not run in this review (only the four targeted specs); the builder's full-suite result was not re-verified.
- No unit test runner exists, so the name-word helper is covered only by browser specs and this review's scratch run.
- Canonical names come from different answers (game, player, team endpoints vs list rows); where a list row's name differs from the detail answer, the link takes one extra replace redirect. Not a defect, but not exhaustively compared on real data.
