# Fix: Resized, lazy-loaded photos and crests on Records and Leaders

**Type:** Fix
**Status:** verified
**Branch:** fix/resized-lazy-loaded-photos-and-crests-on-records-and-leaders

## The problem

Player photos and club crests download at their original size, and all of them at once.

| What | Size today | Shown at |
| --- | --- | --- |
| Player portrait (feed PNG, 750x1000) | 365 KB to 3.5 MB | a 32-56px circle, zoomed 1.7x onto the head |
| Club crest (feed PNG) | 24-66 KB | 16-56px |

- `Avatar` in `frontend/src/leaders/LeaderParts.jsx` renders the feed URL as it is, with no `loading="lazy"`, so every
  row's image downloads when the page opens.
- **Records** (`/:season/records?type=...`): the podium, the timeline's best-by-season list (27 rows) and the Top 50 all
  show avatars through `Holder` in `frontend/src/records/RecordParts.jsx`. One portrait in the points Top 50 is 3.5 MB.
- **Leaders** (`/:season/statistics`): about 28 cards with 5 avatars each, the "Hot right now" and movers lists, and
  25 rows per board page, through `CategoryCard`, `TeamTag`, and the board rows in `PlayersLeaders.jsx`,
  `AdvancedLeaders.jsx` and `TeamsLeaders.jsx`.

Every image URL in the data (checked for 2005, 2012, 2018 and 2026) is on one of two CDNs:
- `media-cdn.cortextech.io`
- `media-cdn.incrowdsports.com`

Both resize on request: `?width=192&format=webp` returns a real 192px-wide WebP (about 10 KB for a portrait), and a
crest at `width=128` keeps its transparency (about 7 KB).

## The fix

- **URL helper.** Add `frontend/src/lib/imageSize.js` with `sizedImageUrl(url, width)`.
  - For a URL on one of the two CDN hosts, it sets `width` and `format=webp` and returns the new URL.
  - Anything else comes back unchanged: null, a relative path such as the tests' `/logo-header.png`, another host, or
    a URL that doesn't parse.
- **Widths.** Two constants, about twice the largest size shown, so photos stay sharp on high-DPI screens:
  - portrait: 192, because of the 1.7x head zoom at 56px;
  - crest: 128.
- **`Avatar` (shared with Compare).** Gains an opt-in `optimize` prop, default false.
  - When true, it requests the sized URL and sets `loading="lazy"` and `decoding="async"`.
  - Compare's five uses stay exactly as they are, following the "current page only, opt-in for shared components" rule.
- **`TeamTag` and `CategoryCard`.** Only Leaders uses them, so they always use the sized crest/photo and lazy loading.
- **Call sites passing `optimize`.**
  - Records: `Holder`'s three avatars (portrait, crest, small club crest).
  - Leaders: the board rows and the "Hot right now" and movers lists in `PlayersLeaders.jsx`, the board rows in
    `AdvancedLeaders.jsx` and `TeamsLeaders.jsx`.
- **Load failures.** A sized image that fails still falls back to the silhouette (portrait) or nothing (crest), as
  today. No retry of the original URL.

Must not break:
- the silhouette for players without a photo;
- the reveal animations (`RevealImage` already handles lazy images: it stays hidden until loaded);
- the existing Records and Leaders tests, which use local image paths that the helper leaves alone.

Out of scope: other pages' images (Compare, Team, Player, Games, dashboard, season overview, `LeaderPhoto`,
`PlayerPortrait`). They can follow as their own fix. No API or backend change.

## Build steps

- [x] 1. **Helper, opt-in `Avatar`, and Records.** Add `sizedImageUrl` with its two widths, add `optimize` to `Avatar`,
  and switch `Holder` to it.
  Done when: on a Records detail page, the portrait and crest `img` requests carry `width=...&format=webp` and have
  `loading="lazy"`, and Compare's avatars still request the original URL.
- [x] 2. **Leaders, and tests.** Use the sized, lazy images in `CategoryCard`, `TeamTag` and the Leaders board and form
  lists. Add one test in `records.spec.js` and one in `leaders.spec.js`: a row whose image is on a CDN host renders
  `src` with `width` and `format=webp` and `loading="lazy"`; a local path stays unchanged.
  Done when: both new tests pass alongside the existing Records and Leaders specs.

## Verify

- Browser tests (local DB; `/api/health` must report `"target":"local"`):
  `cd frontend && npx playwright test records.spec.js records-layout.spec.js leaders.spec.js leaders-layout.spec.js`
- Manual, with DevTools Network filtered to Img and the cache disabled:
  - `/2026/records?type=player&metric=pointsScored`: each portrait is about 10 KB WebP instead of hundreds of KB or
    MB. Top 50 rows below the fold load only when scrolled to.
  - `/2026/statistics`: the cards' photos and crests are small WebPs. Photos look sharp at the podium's 56px size.
  - `/2026/compare` with two players: avatars unchanged (original PNG URLs).
- `cd frontend && npm run lint` passes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4775,"specSha256":"8bd17d958b063fe5204620add9a01daf7020e2d668535129ee97daf538b8cb90","branch":"refs/heads/fix/resized-lazy-loaded-photos-and-crests-on-records-and-leaders","head":"771d0d5b43b6cac96921a12e96c9f402442e868d","baseRef":"refs/heads/master","baseCommit":"771d0d5b43b6cac96921a12e96c9f402442e868d","sourceTree":"0266ae7a66cc6de836da54bf9df923a1edb9d414","absentOptional":[]} -->
