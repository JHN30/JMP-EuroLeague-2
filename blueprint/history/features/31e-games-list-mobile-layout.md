# Feature: Games list mobile layout

**From build-plan:** feature 31e
**Build attempt:** 1
**Branch:** feature/games-list-mobile-layout
**Status:** verified

## Goal

Make the Games page (`/:season/games`: the phase tabs, the round strip with its previous and next buttons, and the game cards of the selected round) comfortable from 320px up. The first thing reported was that the round strip takes too much room at the top of the page: its tabs carry the full desktop padding, and with the phase tabs, the strip and the gap under it the first game is pushed a long way down a small screen. After this item, below `sm` (640px) the round strip, its two buttons and the space around it are compact (smaller tab padding, smaller buttons and gaps, a tighter margin under the strip), the game cards are compact too (a smaller crest, score and padding, so more games fit a screen), and every card reads correctly at 320px with long club names, records and the "TBD" teams of a round that is not set yet. From `sm` up the page looks as it does today.

Layout only: no API, data or feature changes, no change to which round opens or how the round is chosen (the URL parameters stay as they are).

## Design reference

Current code (step 1 measures it before anything is changed; the numbers here are from reading the code):

- `FixturesPage.jsx` renders the page header, a level-1 phase `TabStrip` (`mb-4`), then, when the phase has rounds, a row (`mb-6 flex items-center gap-2`) with a "Previous round" button (`btn btn-sm btn-square`), the round strip (`.round-strip`, a horizontally scrolling `TabStrip` of one tab per round, kept centred on the selected round by an effect) and a "Next round" button, then the cards in `.fixture-box` / `.fixture-grid`.
- `index.css` (the "Games page" block) styles `.round-strip` (hidden scrollbar, a sliding `round-indicator` pill behind the active tab) and the cards: `.fixture-grid` is one column and two columns from a 40rem container, `.fixture-card` has `padding: 1rem` and `gap: 0.9rem`, `.fixture-crest` is 2.75rem, the score pill is 1.35rem with 2.75rem-wide halves, `.fixture-time` is 1.6rem, the card ends in a "Overview" or "Preview" button-like line.
- Each card (`GameCard.jsx`) is a three-column grid (home team, centre, away team) with the crest above the abbreviated name above the record (the records appear only for the regular season), and the centre holds the score pill and "Final · date", or the date and tip-off time for a game to come. `TeamLabel` and the game detail page are not part of this item.
- The round tabs use the `.tab` default padding because the generic tab-strip rules (`tab-level-*` and `--tab-pad`) skip `.round-strip`; each tab shows `round.name ?? "Round N"`.
- The page-scroll spec (`responsive.spec.js`) already lists the Games page and a game link; there is no Games layout spec.

Targets: at 320px the page header, phase tabs, round strip and the first card fit with the first card's score and both team names visible on a 640px-tall screen; a card is clearly shorter than today's; the strip scrolls on its own and keeps the selected round in view; no club name, record or score is cut; the page never scrolls sideways; at 640px and wider nothing changes.

## In scope

- **Compact round strip below `sm`.** Smaller padding on `.round-strip .tab` (the tab text stays at least readable, and the tap target at least 2.5rem tall), smaller "Previous round" and "Next round" buttons and a smaller gap, and a smaller margin under the row and under the phase tabs, so the first card starts higher. The active-round highlight, the centring on the selected round, the disabled ends and the keyboard behaviour of the strip stay as they are. From `sm` the strip is as today.
- **Compact cards below `sm`.** A card is shorter: less padding and gap, a smaller crest (about 2.25rem), a smaller score pill and time, a smaller or lighter "Overview" or "Preview" line, and the two team columns share the width with the centre so long names wrap by word (as `overflow-wrap: anywhere` allows today) instead of overflowing. The card stays a single tappable link with its existing accessible content. The one-column grid below a 40rem container stays; from `sm` the cards are as today.
- **Robustness at 320px.** Check, and fix only what clips: a long abbreviated name, a three-digit score, a record such as 24-14 under each club, a "TBD" team (no crest, no record) and a game to come (date and tip-off time in the centre).
- **Playwright spec.** A Games layout spec (below). The page-scroll spec already covers the page.

## Out of scope

- The game detail page and its tabs (31f), the Teams pages, and any other page.
- Which round opens, how rounds are named, the previous and next logic, the phase tabs, and the records note above the cards.
- A different grid (two columns on a phone), a calendar view, filters, or sticky strips.
- Any backend or API change, a different `sm`, `lg` or `xl` break, a new dependency, adding the spec to Verify or CI.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (one review packet after all steps, no pause per step) and `workflow.checkpointCommits` is `disabled` (no step commits). `/complete` makes the single feature commit. Each step leaves the app working and ends with its Done when.

## Build steps

- [x] **1. Measure the current state.** No code change. On `/2026/games` and `/2025/games` (the regular season, and a round of a finished season with scores) at 320, 390, 639, 640, 768 and 1024px: the heights of the page header, the phase tabs, the round row and the gap under it; the position of the top of the first card on a 320x640 and a 390x844 screen; the height and width of a card; the width and padding of a round tab; and any element that clips, overflows or splits a word. Write the findings in this step's Result line.
  Result (measured headless, both seasons): at 320px the page header and phase tabs end at 224px (the phase tabs are 44px, or 88px where a finished season's four phases wrap), the round row is 32px tall with 12px tab padding (a tab is 77px wide, so about three show), and the gap under the phase tabs and under the row is 16px and 24px; the first card starts at 332px (376px for the wrapped finished season), at 316px (360px) at 390px. A card is 172px tall (192px with a wrapped name) and 296px or 356px wide at 320 and 390px, one column. On a touch device the generic `touch-target` rule makes every tab at least 44px tall, which is why the row cannot shrink vertically on a phone (and why padding, not height, is what is given up). "Panathinaikos", "Fenerbahce" and "Olympiacos" are cut mid-word in a card at 320 and 390px and, in two columns, at 768px (the centre column is as wide as "Final · date" and leaves the names about 80px). The selected round is in the strip's visible part once the load settles, but not after the window is resized to a narrower width (the centring ran only on a round change).
  **Done when:** the Result line lists those sizes at 320 and 390px and every element that clips.

- [x] **2. Compact round strip below `sm`.** `FixturesPage.jsx` (the classes on the row and the buttons) and `index.css` (the `.round-strip .tab` padding and the row's margins, as media-query rules so that `sm` and up are untouched).
  Built: a tab's padding is 0.5rem and its text 0.8125rem below `sm`; the gaps are 0.5rem (under the phone tabs and the row) and 0.25rem between the row's parts; the round row keeps its 44px tap height on a touch device. Also added: the strip re-centres on the selected round when it changes width (a `ResizeObserver` in the existing effect), because turning a phone otherwise left the round out of view. (The done-when's 2.5rem tab height reads as "not made smaller": a tab is 32px with a mouse and 44px on touch, both unchanged.)
  **Done when:** `cd frontend && npm run lint` and `npm run build` pass. In a browser on both seasons at 320 and 390px: the round row is shorter than before by at least the measured padding it gave up, each round tab is at least 2.5rem tall, the selected round is inside the strip's visible part after a load and after pressing the next and previous buttons (and the buttons' disabled states at the first and last round are unchanged), the page does not scroll sideways, and the top of the first card is at least 24px higher than in step 1; at 640px and wider the row's and the tabs' computed padding and margins match the committed code.

- [x] **3. Compact game cards below `sm`.** `index.css` (the `.fixture-*` rules, as a base for phones with the current sizes restored from `sm`, or `max-width` media rules: whichever keeps `sm` and up identical), and `GameCard.jsx` only if a class is needed.
  Built: below `sm` the card has 0.65rem padding, a 2rem crest, 0.74rem names, a smaller score pill and time and a 0.72rem "Overview" line, and the date under a score may wrap (so it no longer sets the centre column's width and the names have room). Cards are 123px tall (172px before, 28% shorter) at 320 and 390px; the first card is 24px higher; no name is cut.
  **Done when:** lint and build pass. At 320 and 390px a finished-game card and an upcoming-game card are each at least 25% shorter than in step 1, the crest is about 2.25rem, both team names, both records and the score (or date and time) are fully inside the card with no word split mid-word (checked per word), the whole card is one link whose accessible name or content includes both clubs, and the grid is one column; at 640px and wider the cards' computed sizes match the committed code.

- [x] **4. Edge cases at 320px.** Fix only what step 1 or 3 showed: a long name, a three-digit score, a record, a "TBD" team and a card of a round not yet set. Use mocked games for the cases the live data does not contain.
  Result: nothing more to fix: the spec mocks a round with a long multi-word club name, three-digit scores (112-101, 100-99) and a "TBD" team on a game to come, and every card holds its content at 320px.
  **Done when:** lint and build pass. With a mocked round that has a long club name, three-digit scores and a "TBD" team, at 320px every card's content is inside it, nothing overlaps, and the page does not scroll sideways.

- [x] **5. Games layout spec and regression pass.** `frontend/e2e/games-layout.spec.js`: loading the page once and resizing through 320, 390, 639, 640, 768 and 1024px: the compact strip and card sizes below 640px against the full ones from it, the selected round visible after load and after next and previous, the cards one column below 640px and as today from it, no clipped content or split words, a mocked round with long names and a "TBD" team, and the page overflow check. Screenshots of the page at 320, 390, 768 and 1024px for the review. A full lint, build and browser-suite run.
  **Done when:** `cd frontend && npx playwright test e2e/games-layout.spec.js e2e/responsive.spec.js` passes; lint and both builds pass; the full `npm run test:browser` passes or any failure is explained and traced to this change; nothing outside the files listed below changed.

## Files / areas

- `frontend/src/games/FixturesPage.jsx` and `GameCard.jsx` (classes only, if CSS alone cannot do it)
- `frontend/src/index.css` (the "Games page" block only)
- `frontend/e2e/games-layout.spec.js` (new)
- Not changed: the backend, `frontend/src/lib/api.js`, `TabStrip.jsx`, the game detail page, the other pages.

## Data / contracts

- No API, database or persisted-data change. No new dependency. The URL parameters (`phase`, `round`) and the data requests are unchanged.
- Breakpoints: `sm` 40rem for the compact strip and cards (mobile-first or max-width rules that leave `sm` and up identical); the card grid keeps its 40rem container query.
- Accessibility: the round strip keeps its `tablist` and keyboard behaviour and its two buttons keep their labels ("Previous round", "Next round"); the tap targets stay at least 2.5rem tall; each card stays one link with its team names, scores or date and time as content; the compact sizes keep text at 0.72rem or larger.
- User-controlled text: club names come from the API and are rendered as text (React escapes them); long names wrap by word and are never cut or hidden.

## Testing

- Playwright browser spec (step 5) following the 31c to 31d pattern: one page load per test, resized through the widths; the cases the live data lacks (a long name, a three-digit score, a "TBD" team) use a mocked games response. There is no unit test command; browser tests are evidence, not part of Verify.
- The existing specs, in particular `responsive.spec.js` (the Games entry and the game link), must keep passing.

## Notes for the AI

- Phones are not available for testing: say that the layout was checked by driving the page in a headless browser, not by hand.
- No em or en dashes in generated content.
- Measure before fixing; change only what step 1 or the review showed. Do not touch the game detail page.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":13080,"specSha256":"d2e81c6dfb8ed6e6cce470b045e569b83701231d82343c180adf7abd09b6ba96","branch":"refs/heads/feature/games-list-mobile-layout","head":"23ec283c5943fbb830e3f57cfe77d7b318a435b3","baseRef":"refs/heads/master","baseCommit":"23ec283c5943fbb830e3f57cfe77d7b318a435b3","sourceTree":"68e791ee75116f204e3a9f8194426acf658a9c40","absentOptional":[]} -->
