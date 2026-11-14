# Fix: Smaller, lazy-loaded images across the app

**Type:** Fix
**Status:** verified
**Branch:** fix/smaller-lazy-loaded-images-across-the-app

## The problem

Player photos and club crests come from two CDNs that resize on request
([imageSize.js](frontend/src/lib/imageSize.js)), but only Records and Leaders ask for a small copy and load it lazily.
That was an earlier fix, scoped to those pages; Compare kept the originals under the "current page only" rule. Everywhere
else the feed's full-size PNGs load, all at once.

- **Portraits are the cost.** One portrait is 702 KB as a PNG and 12 KB as a 192-wide WebP (32 KB at 384, 69 KB at 640).
  A crest is 10.5 KB as a PNG and 7.2 KB as WebP.
- **Measured image download per page** (E2025, local dev, phone 390 px / desktop 1440 px), with Leaders, already
  optimized, for comparison:

  | Page | Phone | Desktop |
  |---|---|---|
  | Players | 17.8 MB | 33.7 MB (74 images) |
  | Games | 13.5 MB | 13.5 MB |
  | Overview | 9.3 MB | 9.3 MB |
  | Compare (teams) | 4.4 MB | 4.4 MB |
  | Home | 3.2 MB | 3.2 MB |
  | Team (PAR) | 1.8 MB | 1.8 MB |
  | Game, Standings, Teams, Player | 1.0–1.2 MB | 1.0–1.2 MB |
  | Leaders | 0.3 MB | 0.8 MB |

- **Layout shift is not a problem.** Measured cumulative layout shift caused by images is 0.000 on every page above,
  except Standings at 1440 px (0.007; the "good" limit is 0.1). Every image sits in a box sized by its classes, so
  `width`/`height` attributes would change nothing, and this fix doesn't add them. The one large shift, Home on a phone
  at 0.35, does not come from an image and is out of scope.

## The fix

No new dependency; the CDN resizing, `sizedImageUrl`, native `loading="lazy"`, `decoding="async"` and `srcset` do the work.

1. **Shared image components.**
   - `RevealImage` defaults to `loading="lazy"` and `decoding="async"`; a caller can still pass `loading="eager"`.
   - `Avatar` always asks for the small copy. The `optimize` prop goes, and so do its ten call sites' `optimize`
     attributes, so Compare's avatars get it too.
   - `LeaderPhoto` (Home, Overview, Team leader cards) and `CompactMetric` request `PORTRAIT_WIDTH`.
   - `PlayerPortrait` (Players cards, player hero, team roster cards, game card scorers) gets a `srcset` of the 192,
     384 and 640 copies and a `sizes` prop from each caller matching its box. For example, a Players card is the full
     card width on a phone and 72 px from `sm`, so a desktop grid takes the 192 copy and a phone card the 640.
2. **Every other image site.**
   - Portraits (box score, game overview leaders, team roster rows, team advanced impact, team leader cards) request
     `PORTRAIT_WIDTH`.
   - Crests up to 64 px request `CREST_WIDTH`.
   - Larger crests (the team page header, the champion panel, the matchup and team-pair headers, the overview hero
     chip, and the lead tracker's canvas watermark) request a 256-wide copy, `HEADER_CREST_WIDTH`. *Revised during
     the build:* the spec first kept their originals, but measuring showed those are 440–512 px PNGs of up to 127 KB.
     A 256 WebP is 9–15 KB and still at least 2.7× the 96 px box (the watermark is drawn at up to 150 px at 20 %
     opacity).
   - Raw `<img>` crests and portraits in lists and tables get `loading="lazy"` and `decoding="async"`.
   - Images at the top of a page load eagerly: the header logo, the team page crest, the player hero crest and
     portrait, the game matchup header, the compare team-pair header and the overview hero chips.

Must not break: fallbacks when an image fails (silhouettes, initials, hidden crests), the reveal animations, image
alignment and crop (the 1.7× head zoom, `object-top`), alt text, both themes, and phone layouts. A resized photo must not
look blurry in its box on a 2× screen.

## Build steps

1. [x] **Shared image components.**
   Done when: `cd frontend && npm run lint` and `npm run build` pass. Players, Home, Overview, Compare (players and
   teams) and the player page request WebP copies for every portrait, and Players drops below 2 MB on desktop on first
   load. Below-the-fold images load as you scroll.
2. [x] **Every other image site.**
   Result (E2025, local dev, same script as the baseline): Players 33.7 MB → 0.68 MB desktop and 17.8 → 0.78 MB phone;
   Games 13.5 → 0.35 MB; Overview 9.3 → 0.25–0.28 MB; Compare 4.4 → 0.16 MB; Home 3.2 → 0.19 MB; Team 1.8 → 0.06 MB;
   Game 1.2 → 0.07 MB; Postseason 0.54 → 0.08 MB. No page downloads an original image, and layout shift from images
   is unchanged (0.000, and 0.007 on Standings at 1440 px). At 2× every image gets at least twice its box: a phone
   Players card at 171 px takes the 384 copy, the hero 144–176 px the 384, Home leader photos at 56 px a 192, and the
   team header at 96 px a 256. On E2005 Players, Home and Overview the silhouettes show for missing photos, with no
   broken images and no page errors. 52 sites changed by a checked script, plus the header crests and the watermark by
   hand. Full Playwright suite: 1220 passed and 2 failed, both in `home-layout.spec.js` (`:31` and `:161`), timing out
   at 30 s inside `page.goto("/")` before any check ran. Rerun by line three times, they passed each time, and the whole
   `home-layout.spec.js` then passed (31 tests). They are recorded as load timeouts under the full suite, not
   reproduced.
   Done when: lint and build pass. Running the measurement script again shows no page loading a full-size portrait PNG.
   Games, Overview, Home, Compare and Team each drop by at least half, and image layout shift stays at or below the
   baseline. Screenshots at 2× of a Players card on a phone, the player hero, a Home leader card, the box score, the team
   page header and the champion panel look sharp, with fallbacks still showing when an image is missing.

## Verify

- Root `npm run build` and `cd frontend && npm run lint`.
- With `/api/health` reporting `"target":"local"`, re-run the measurement script (image KB per page and CLS from images,
  12 pages at 390 and 1440 px) and compare it with the table above.
- Look at the 2× screenshots named in step 2, in both themes.
- Playwright: this changes shared frontend components used on most pages, so under the agreed test scope it is a
  full-suite change (about 27 minutes). I'll confirm with the user before starting that run.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6370,"specSha256":"823bc190083cf5dba57151aa63eb809bcfa175b3e40e19c290739f1e382d8a83","branch":"refs/heads/fix/smaller-lazy-loaded-images-across-the-app","head":"98c01b2a95134a8d9e2442a06246c3ff792afb32","baseRef":"refs/heads/master","baseCommit":"98c01b2a95134a8d9e2442a06246c3ff792afb32","sourceTree":"ab425e3238407b07f5676f9e6a9b3be7cca0fce7","absentOptional":[]} -->
