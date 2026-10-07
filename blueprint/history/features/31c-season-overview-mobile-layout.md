# Feature: Season overview mobile layout

**From build-plan:** feature 31c
**Build attempt:** 1
**Branch:** feature/season-overview-mobile-layout
**Status:** verified

## Goal

Make the Season overview page (`/:season/overview`) read well from 320px up, on top of the 31a foundation and the 31b Home patterns. The page never scrolls sideways (measured at 320, 390, 768 and 1024px), so the work is layout quality: text that is cut off, cards that are very tall, and a chart that is crowded. After this item, below `sm` the two hero cards sit side by side and compact, the Defining games cards show team crests only below `lg` (the short name from `lg`, where there is room), the statistical leaders are swipeable rows like Home's, a champion's road shows full opponent names, and a full season's scoring chart reads as a line instead of a row of blobs. Desktop keeps its layout, except that the Defining games cards no longer cut team names at any width.

Layout only: no API, data or feature changes.

## Design reference

Observed in the running app before this work (earlier browser run, light theme):

| Page | 320px | 768px | 1024px | 1280px |
| --- | --- | --- | --- | --- |
| `/2026/overview` (season in progress) height | 3,392px | 2,089px | 2,089px | n/a |
| `/2025/overview` (finished season) height | 4,827px | 3,044px | n/a | 2,573px |
| Sideways page scroll | none | none | none | none |

- **Defining games:** each card is a three-column row (home team, score badge, road team) with `truncate` on the names. On the live season 8 of 8 names are clipped at 320 and at 768px, 4 of 8 at 1024px and none at 1280px. On the finished season three long names ("Kosner Baskonia Vitoria-Gasteiz", "EA7 Emporio Armani Milan", "Partizan Mozzart Bet Belgrade") are still clipped at 1280px, so this is a name-length problem as well as a width one.
- **Road to the title:** the opponent line truncates ("Defeated AS Mon...", "Defeated Fenerba...", "Defeated Real Mad...") at 320px.
- **Statistical leaders:** six tall photo cards stacked (twelve in a finished season, one group per phase); a name breaks mid-word ("VALANCIUNAS / , JONAS").
- **Hero:** two tall photo cards stacked at 320px, both showing the same club and crest.
- **Scoring chart:** with a full season's rounds the 5px markers and 4px line merge into blobs at 320px.
- Panels already use `p-4` at every width, which is the scale's mobile value, so panel padding is not touched.
- The page has no `md:` classes and no media queries of its own (only `sm:` and `xl:`), so there is nothing to retire there.

Targets: leaders as swipe rows with the first and last card on the panel's content edge, as on Home; no team or opponent name cut off at any width; the hero cards two across below `sm`; the live-season page well under 2,500px tall at 320px.

## In scope

- **Hero (`SeasonHero`).** Below `sm` the two cards are two columns side by side, compact and stacked (small crest on top, then label, name, value), so a club name wraps by whole words in a card about 140px wide. From `sm` the tall photo card and the current two-column grid are unchanged. The "Season finished" and "Season not yet started" panels are unchanged.
- **Defining games (`DefiningGames`).** Each card keeps its one-line row: home team, score badge, road team. Below `lg` a team is shown by its crest alone (about 2rem, no name text); the full team name stays as the accessible name (visually hidden text), so a screen reader and the link's accessible name still read the clubs, and the game page shows the names to anyone who taps through. From `lg` the row is as today, with the crest and the team's short name, which is the game's `abbreviatedName` (the field Home's match cards and the Games page use, for example "Maccabi", "Crvena Zvezda", "Bayern Munich"), falling back to the full name when it is missing; a name that is still too long for its side wraps instead of being cut. When a club has no crest, or its image fails to load, its short name is shown in place of the crest at every width, so a side is never blank. The winner keeps its highlight (the score is bold and highlighted, the loser's is dimmed and, from `lg`, so is its name; the crest is never dimmed, because below `lg` it is all that names the club and dark crests nearly vanish on the dark theme when dimmed; not colour alone). The tag, the context line and the link to the game stay. The two-column card grid from `sm` stays.
- **Statistical leaders (`PhaseLeadersGroup`).** Below `sm` each phase group is a swipe row with the Home behaviour: `scroll-snap-type: x mandatory`, cards about 85% of the panel's content width centred on snap (`scroll-snap-align: center`, `scroll-snap-stop: always`), the row bleeding to the panel edge so the first and last card sit on the content edge and the neighbouring card peeks out. The cards use the smaller photo and tighter padding of Home's leader cards so a player name is not cut mid-word. From `sm` the two-column grid and from `xl` the three-column grid stay. Each row is `role="group"` labelled "<phase name> leaders" and takes a tab stop only below `sm`, through the existing `useMediaQuery` hook. The loading, empty and error cards render in the same row.
- **Road to the title (`RoadStep`).** The opponent line wraps rather than truncates, at every width.
- **Scoring chart (`ScoringTrendChart`).** Below `sm` the line is 2px and the markers 2px, so a full season's rounds read as a line; from `sm` the markers stay 5px and the line 4px. This uses Chart.js scriptable options that read the chart width, not a JavaScript media query, so it follows a resize.
- **Spec coverage.** A Season overview layout spec, the finished-season overview added to the page-scroll spec, and the swipe-row geometry helper shared between the Home and Overview specs.

## Out of scope

- A new Phase story layout (the four phase cards stay in one column below `sm`, two from `sm`, four with arrows from `xl`, as now) and a redesign of the "Season finished" hero.
- Other charts, other pages, and the shared photo-card rules used by the Team pages (`.team-leaders-grid`), which belong to their own items.
- Any change to what the page fetches or shows. The two clipped-name fixes and the leaders row change layout only.
- Panel padding (already `p-4`), the page header (fixed in 31b), a position-dots indicator, and the KPI-card container question.
- The `postseason.spec.js` timeouts (item 31n).

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (one review packet after all steps, no pause per step) and `workflow.checkpointCommits` is `disabled`. `/complete` makes the single feature commit. Each step leaves the app working and ends with its Done when.

## Build steps

- [x] **1. Hero cards: two across and compact below `sm`.** `index.css` (a compact base for `.season-hero-kpis .kpi-chip` and its image, name and value, with the tall card restored from `sm`, and `.season-hero-kpis` removed from the shared tall-card selector lists) and `SeasonOverviewPage.jsx` (`grid-cols-2 gap-3 sm:gap-4`).
  **Done when:** `cd frontend && npm run lint` and `npm run build` pass. In a browser on `/2026/overview`: at 320, 390 and 639px the two hero cards share one row (two distinct lefts, one top), the crest is small and on top, and the club name wraps by whole words (no word is cut); at 640px and wider the cards are the tall photo cards as before. The hero at 1280px keeps its computed styles (padding, crest size and margin, font sizes, gap): a screenshot crop of it is not byte-stable even between two runs of the same code, so the styles are compared instead.

- [x] **2. Defining games: crests only below `lg`.** `SeasonOverviewPage.jsx` (`DefiningGames`: each card's markup; a small local crest component that falls back to the short name when there is no crest or it fails to load; a short-name helper that prefers `abbreviatedName` over `name`; `teamName` itself keeps its full-name order for the Road to the title) and any small `index.css` support it needs.
  **Done when:** lint and build pass. In a browser on `/2026/overview` and `/2025/overview` at 320, 390, 768, 1024 and 1280px: no visible team name in a Defining games card is cut (every visible name element has `scrollWidth` at most `clientWidth` plus 1px, and no `truncate` clipping). Below 1024px a card shows two crests and no visible name text, and its link's accessible name still contains both full club names; from 1024px it shows the crests and the short names (the same names Home's match card shows for those clubs). A club whose crest is missing or fails to load shows its short name instead (checked by blocking the crest image requests in the browser). Each card still links to its game; the winner's score is bold and highlighted and the loser's is dimmed; the card grid is one column below 640px and two from 640px.

- [x] **3. Statistical leaders as swipe rows.** `index.css` (share Home's `.leaders-row` swipe, tablet-grid and compact-card rules with `.season-leaders-grid` by grouping selectors; give `.season-leaders-grid` its own grid layout from `sm`, two columns, and three from `xl`, because unlayered CSS outranks the Tailwind utilities now on the element; remove `.season-leaders-grid` from the shared tall-card lists) and `SeasonOverviewPage.jsx` (`PhaseLeadersGroup`: drop the grid utilities that CSS now owns, add the role, label and below-`sm` tab stop).
  **Done when:** lint and build pass. In a browser at 320 and 390px, on `/2026/overview` and `/2025/overview` (two groups there): each group's computed `scroll-snap-type` is `x mandatory`; the first card's left edge is within 1px of the panel's content edge and, after scrolling to the end, the last card's right edge is on the opposite content edge; a card is about 85% of the content width; the neighbouring card peeks out 20px or more; after a programmatic scroll and after ArrowRight the row settles with a card centred; the page does not scroll sideways; the row has a tab stop. At 640 and 768px the group is a two-column grid with no snapping and no tab stop; at 1024px two columns and at 1280px three columns, as before. No leader name breaks mid-word at 320, 390, 639, 640, 768, 1024 and 1280px. A crop of the leaders panel at 1280px is byte-identical before and after.

- [x] **4. Road to the title names and the scoring chart.** `SeasonOverviewPage.jsx` (`RoadStep`: let the opponent line wrap; `ScoringTrendChart`: scriptable `borderWidth` and `pointRadius`).
  **Done when:** lint and build pass. In a browser on `/2025/overview` at 320px no opponent line is cut ("Defeated AS Monaco", "Defeated Fenerbahce Beko Istanbul", "Defeated Real Madrid" show in full); at 1280px the Road to the title panel looks as before. Screenshots of the scoring chart on `/2025/overview` (a full season) at 320px show a readable line with small markers, and at 1280px the same line and 5px markers as before (judged by the user; the canvas cannot be asserted).

- [x] **5. Overview layout spec and regression pass.** `frontend/e2e/overview-layout.spec.js` for steps 1 to 4 (hero row, no clipped names, swipe-row geometry and tab stop, tablet and desktop columns, road to the title); `frontend/e2e/responsive.spec.js` (add the finished-season overview to the page-scroll list); the swipe-row geometry helper moved from `home-layout.spec.js` into `frontend/e2e/support/layout.js` and used by both. A full lint, build and browser-suite run, and screenshots of both seasons at 320, 390, 768 and 1280px for review.
  **Done when:** `cd frontend && npx playwright test e2e/overview-layout.spec.js e2e/home-layout.spec.js e2e/responsive.spec.js` passes; lint and build pass; the full `npm run test:browser` passes or any failure is explained and traced to this change; nothing outside the files listed below changed.

- [x] **6. Scoring chart: tap, axis and summary (requested after the first review).** On a phone the chart cannot show 34 rounds, and a finger could not read any of them: a tooltip needed an exact hit on a marker (and step 4 made the markers smaller), the tooltip title was blank for most points because the axis labels were thinned in the data itself, and only one rotated axis label showed. Three changes in `ScoringTrendChart`: **(A)** a tap or hover anywhere along the chart shows the nearest round (`interaction` and tooltip `mode: "index"`, `intersect: false`), with a larger hit radius and a visible hover marker, and a tooltip titled "Round N" that reads "N.N points per team"; **(B)** the data keeps every round's label, and the x axis draws horizontal labels only for round 1 and every fifth round (every tenth above 40 rounds, and every round when there are 8 or fewer) with a "Round" axis title; **(C)** below the chart, a caption "Average points per team, by round" and three figures (Highest, Lowest, Latest, each with its round), computed from the same series, as a definition list so a screen reader reads them.
  **Done when:** lint and build pass. In a browser on `/2025/overview` (a full season) at 320, 390 and 1280px: the summary shows Highest, Lowest and Latest with a round for each, Highest is at least Latest and Latest at least Lowest, and no figure is cut; the live season (three rounds) shows the same summary and a label for every round. Screenshots, judged by the user, show horizontal axis labels with a "Round" title and, after hovering the middle of the chart, a "Round N" tooltip with the value (the canvas cannot be asserted). The scoring chart at 1280px keeps its line and markers.

- [x] **7. Scoring chart: postseason rounds named by phase (requested after the first review).** The season's rounds are numbered straight on from the regular season into the postseason, so on the chart round 39 is really a Play-In game and nothing says so. In `ScoringTrendChart`, each round point carries the phase of its games (`phaseCode`: RS, PI, PO, FF). A regular-season point is named "Round N". A postseason point is named by its phase: "Play-In", "Playoffs" or "Final Four", with " · round K" (its position within that phase) when the phase has more than one round. That name is the tooltip title and the round shown under Highest, Lowest and Latest. The x axis numbers only the regular-season rounds, and a dashed divider with a "Postseason" label above the plot marks where the postseason begins, so the numbers never run on into it. A season with no postseason (the live season) looks as it does now.
  **Done when:** lint and build pass. In a browser on `/2025/overview`: no number above the last regular-season round appears on the x axis, a dashed divider labelled "Postseason" sits where the regular season ends, hovering a postseason point shows a tooltip titled by phase (for example "Playoffs · round 3", never "Round 39" or higher), and Highest, Lowest and Latest name a phase when their point is a postseason one. On the live season (regular season only) the chart and summary read as before. The spec's summary test accepts phase names. Screenshots at 320 and 1280px, judged by the user, show the divider and label without overlapping the data or the axis.

## Files / areas

- `frontend/src/season/SeasonOverviewPage.jsx` (`SeasonHero`, `DefiningGames`, `PhaseLeadersGroup`, `RoadStep`, `ScoringTrendChart`)
- `frontend/src/index.css` (the `.season-hero-kpis` and `.season-leaders-grid` rules, grouped with Home's `.leaders-row` rules)
- `frontend/e2e/overview-layout.spec.js` (new), `frontend/e2e/support/layout.js` (the shared swipe-row helper), `frontend/e2e/home-layout.spec.js` (imports it), `frontend/e2e/responsive.spec.js` (one more page)
- Not changed: the backend, the API client, `useMediaQuery.js`, `Panel`/`PanelHeader`/`PageHeader`, the Team pages' leader rules, and every other page.

## Data / contracts

- No API, database or persisted-data change. No new dependency. The same queries and query keys.
- Breakpoints as in 31a and 31b: `sm` 40rem and `lg` 64rem; `xl` 80rem stays a desktop-only refinement (phase arrows, three-column leaders).
- Accessible names that existing specs rely on stay. New: each leaders group is `role="group"` labelled "<phase name> leaders" (for example "Regular Season leaders", "Final Four leaders").
- A visible team or opponent name is never cut: it wraps. Below `lg` Defining games shows crests only and keeps the full club name as visually hidden text (the crest image stays decorative, `alt=""`). Winner emphasis in Defining games is bold weight plus the existing highlight colour, so it does not depend on colour alone.
- Motion: the existing `listContainer` and `listItem` entrance and the card hover and tap stay; nothing new animates.

## Testing

- No unit test command exists, so there is no unit test. The one new rule with logic (which name is clipped) is covered through the browser spec by measuring each name element.
- Browser tests are declared (`cd frontend && npm run test:browser`), so `overview-layout.spec.js` is added as proportionate coverage of the stable layout behaviour. They stay opt-in and are not part of Verify or CI (none is declared). The overview is the heaviest page in the app (its summary waits for every played game to be paged in, which once took over 15 seconds under four parallel workers), so each test loads it once and resizes the window through its widths, the leaders tests wait only for the leaders panel, and the summary tests wait up to 30 seconds. The spec uses the live season (`/:season/overview` from the default redirect) for the hero and leaders, and `/2025/overview` for the finished-season panels, as other specs already use `/2025`.
- What this will not prove: how the scoring chart looks (it is a canvas; screenshots are the evidence and the user judges them), real swipe gestures and momentum, Safari and iOS.
- `/check` runs the full `npm run test:browser`.

## Notes for the AI

- Follow `coding-standards.md`: theme tokens, no blur, no commented-out code, no unused imports, comments only for the why, no em or en dashes anywhere.
- Unlayered CSS in `index.css` outranks Tailwind utilities (31b found this with `max-sm:hidden`): where a rule must win at a breakpoint, write it in `index.css` mobile-first, not as a utility on an element whose class also has a rule there.
- Reuse Home's patterns and rules rather than writing a second swipe row: group the selectors, do not copy the rules. Keep desktop pixel-for-pixel as today apart from the Defining games name wrapping; compare element crops before and after (stash the edits, capture, restore).
- Decision (from review of this spec, the user's): Defining games shows crests only below `lg`; the full name is one tap away on the game page. From `lg` it shows the short `abbreviatedName` beside each crest. Considered and not chosen: stacked two-row cards with short names at every width (taller cards, and a second layout to maintain), and three-letter club codes (a second way of naming a club in the app). The row stays one line high, so the four cards add the least height to the mobile page. A crest-less club falls back to its short name, which also covers the case where the crest image fails to load.
- Do not start 31d work: Standings and the other pages keep their own items.
- No Verify command is declared, so none was run while writing this spec.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":19291,"specSha256":"ef418c4272ee4942d54acaf3ac3dd9d1b6091a384f2e29a66bc527be415290ad","branch":"refs/heads/feature/season-overview-mobile-layout","head":"94f260185f223883d36c9885d29759fc6e9bb73d","baseRef":"refs/heads/master","baseCommit":"94f260185f223883d36c9885d29759fc6e9bb73d","sourceTree":"cb92d333189ccabfcfbea5e0e8ff757a5a7af230","absentOptional":[]} -->
