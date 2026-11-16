# Fix: Shared result badge and crest

**Type:** Fix
**Status:** verified
**Branch:** fix/shared-result-badge-and-crest

## The problem

Design plan step 3. Two things every page shows are drawn a different way on each page.

**Win/loss results have two looks and eight implementations:**

- **Solid daisyUI badges** (`badge badge-success|badge-error|badge-ghost`):
  - `standings/standingsCells.jsx:67` (`FormCell`, also used by the Compare fixtures and the game cards' `.fixture-form`)
  - `comparisons/ComparePlayerOverview.jsx:311`
  - `comparisons/CompareTeamOverview.jsx:158` (streak) and `:197`
  - `players/PlayerGamesSection.jsx:504`
- **Tinted pills** (success/error at 18% behind coloured text):
  - `teams/TeamGamesSection.jsx:228` and `teams/TeamPage.jsx:335` (streak), with `stat-badge-positive|negative`
  - `teams/TeamPage.jsx:346` with `.form-pill.w|l`
- **The empty result** is `–` in one place and `-` in two others.

**Club crests are rendered about 45 times by hand:**

- Each site repeats `sizedImageUrl(crestUrl, CREST_WIDTH)`, `object-contain flex-none`, and a fixed-size empty `<span>`
  when there is no crest, or `null` instead.
- About 30 sites use `RevealImage`, which pops in after download and hides on error.
- About 12 sites use a plain `<img loading="lazy" … onError={hide}>`: the dashboard cards, `GameCard`,
  `GameDetailPage`, `gameFlow`, `ShootingStudio`, `TeamLabel` and `OverviewExtras`.
- Two header components, `TeamPairHeader.jsx:12` and `MatchupHeader.jsx:29`, each carry an identical private `Crest`
  that keeps the slot when the image fails.

## The fix

**`lib/ResultBadge.jsx` plus one CSS rule set (replacing `.form-pill`):**

- **Props:** `<ResultBadge won={true|false|null} count size="xs|sm" className />`.
  - It renders `W`, `L` or `–`, and `W3`/`L2` when `count` is given (a streak).
  - It keeps daisyUI's `badge badge-xs|sm` base, so sizing, the `.fixture-form .badge` / `.compact-form .badge`
    compaction and existing `.badge` test selectors keep working.
- **One look, the tinted pill:** success or error at 18% behind the coloured text, the same family as `.stat-badge`.
  An empty result is a neutral tint. It is calmer than solid green and red in dense tables, and matches the stat
  badges. *(Decision to confirm at review: tinted everywhere, or solid everywhere.)*
- **Accessibility:** the visible letter stays `aria-hidden` where the caller already gives the row an `aria-label`
  (`FormCell`). Otherwise the letter is the text.
- **Sites moved onto it:** all eight above.
  - `.form-pill`'s rules leave `index.css` once nothing uses them.
  - `.stat-badge-positive|negative` stay for non-result badges, such as net rating and averages.

**`lib/Crest.jsx`:**

- **Props:** `<Crest url size="h-5 w-5" header eager animate keepSlot className />`.
  - `url` is the crest URL; nothing renders when it is missing, unless `keepSlot` is set.
  - `header` uses `HEADER_CREST_WIDTH`; otherwise `CREST_WIDTH`.
  - `eager` gives `loading="eager"`.
  - `animate` (default `true`) uses `RevealImage`; `animate={false}` renders the plain lazy `<img>` that hides itself
    on error.
  - `keepSlot` leaves an empty `aria-hidden` box of the same size when there is no crest or it failed.
- **Each site keeps its current behaviour:** the same size, animation, eager or lazy loading, and slot or no slot.
  This is a refactor, not a visual change.
- The two private header `Crest`s are deleted in favour of it: `header keepSlot animate={false}`.

**Must not break:**

- Image sizes and loading (the performance fix's lazy loading and resized WebP copies)
- no layout shift
- the `alt=""` decorative crests
- the existing `.badge`-based test selectors (`games-layout.spec.js:282`, `player-career-layout.spec.js:91`)

**Out of scope (dropped from the design plan after inspection):**

- **The segmented control.** `ToggleButtons` (a button group) and `ViewSelect` (a native select) are different
  controls, not duplicates.
- **Merging the stat formatters.** That is number logic rather than design, and the repository has no unit test
  runner to guard it.

## Build steps

1. [x] **ResultBadge.**
   - Add the component and its CSS.
   - Move the eight result sites onto it, and remove `.form-pill`.
   - **Done when:** `grep` finds no `"W" : "L"` ternary outside `ResultBadge.jsx` and `CompareTeamTrends.jsx:51` (a
     text label, not a badge). Standings, a team page and the player Games tab show the same badge in both themes.
2. [x] **Crest.**
   - Add the component.
   - Move every crest site onto it, keeping each site's behaviour.
   - Delete the two private header `Crest`s.
   - **Done when:** `sizedImageUrl(…crest…)` appears only in `Crest.jsx`. Player portraits and photos are not part of
     this.

## Verify

- `cd frontend && npm run lint` and `npm run build` pass.
- The full browser suite (`npm run test:browser`, local DB, `/api/health` says `"target":"local"`): both components
  reach most pages.
- Screenshots in both themes:
  - Home: latest scores, standings snapshot, form board
  - Standings form column
  - Games cards with form
  - A team page: streak and last five
  - The player Games tab
  - Compare team and player Overview
  - The crests look and load as before.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5258,"specSha256":"4f726476aeea7f1d59f80f156fa2fd204765e6387f582d95ac5946d1aac4e6c4","branch":"refs/heads/fix/shared-result-badge-and-crest","head":"53d6eb9a1a1b82e8bbfa8b10719c1f0a60f187a6","baseRef":"refs/heads/master","baseCommit":"53d6eb9a1a1b82e8bbfa8b10719c1f0a60f187a6","sourceTree":"f943e3851c816f387f5c3b790317688ad21a43ab","absentOptional":[]} -->
