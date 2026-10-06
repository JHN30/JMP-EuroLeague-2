# Feature: Mobile foundation

**From build-plan:** feature 31a
**Build attempt:** 1
**Branch:** feature/mobile-foundation
**Status:** verified

## Goal

Lay the shared groundwork for 320px-wide screens so the page items after it (31b Home to 31n Postseason) only deal with their own content. Below `sm` (640px) the header becomes a slim bar (logo, current page name, hamburger) whose menu holds the 9 tabs, the season picker and the theme switch; from `sm` up the inline tabs stay as they are. The page gutters follow one scale. The Home KPI strip stops overriding its own mobile layout. The tab-panel scroll offset reads one header-height variable. A Playwright spec checks the menu and fails on sideways page scroll at 320, 390, 768 and 1024px.

Layout only: no API, data or feature changes.

## Design reference

Observed in the running app before this work (earlier browser run, Home route, 800px-tall viewports):

| Width | Sticky header height | Cause |
| --- | --- | --- |
| 320px | 158px (28% of a 568px screen) | 9 tabs wrap onto 3 rows, plus the season picker and theme toggle |
| 390px | 126px | tabs wrap onto 2 rows |
| 768px | 94px | one tab row |
| 1024px | 82px | one tab row |

Home's KPI strip stacks team names one letter per line and its cards run past the container at 320, 390, 768 and 1024px. Cause: `.kpi-strip.kpi-strip-4` (two classes) out-ranks the `@media (max-width: 1023px)` `.kpi-strip` scroll rule, so four columns apply at every width.

Targets: header 3rem (48px) below `sm`; 5.5rem (88px) from `sm` up; main content 296px wide at 320px.

## In scope

- **Breakpoint convention.** Three layouts: mobile (320 to 639px, unprefixed styles), tablet (`sm`, 640px), desktop (`lg`, 1024px). Tailwind's default `sm` (40rem) and `lg` (64rem) already match, so no `@theme` change. Hand-written media queries in `index.css` use `min-width: 40rem` or `min-width: 64rem`, mobile-first (a media query cannot read the theme variable, so the values are kept in sync by hand and noted in the CSS).
- **Mobile header (below `sm`).** A 3rem bar with the logo, the current page name and a hamburger button. The "EuroLeague" brand text is hidden below `sm`. The page name comes from the first path segment after the season (`home`, `overview`, `standings`, `games`, `teams`, `players`, `leaders`, `compare`, `postseason`, plus `records`); a game, team, player or head-to-head page shows its section's name; any other path shows "EuroLeague".
- **Menu panel (below `sm`).** Opens under the bar over the page (it does not push the page down, so the sticky header height never changes). It holds the 9 tab links in a 2-column grid, the season picker and the theme switch, each at least 44px tall. It scrolls inside itself when the screen is short. A dim backdrop covers the page behind it. The panel and backdrop are opaque or flat (no blur).
- **Menu behaviour.** The button has `aria-expanded` and `aria-controls` and the accessible name "Menu". The menu closes on navigation (a tab link, or a season change, which navigates), on Escape (focus returns to the button when it was inside the panel), on a tap or click on the backdrop, and when the viewport reaches `sm` or wider. The theme switch leaves it open.
- **Tablet and up (`sm`+).** Today's layout: brand text and the season picker and theme toggle in the top row, the 9 inline tabs in the second row. The top row is 3rem and the tab row 2.5rem, so the header is exactly 5.5rem.
- **Header-height variable.** `--app-nav-height` is 3rem below `sm` and 5.5rem from `sm`. The header's own height uses it, and `.tab-panel { scroll-margin-top }` becomes `calc(var(--app-nav-height) + 1rem)` instead of the fixed `7rem`.
- **Gutter scale.** `main` uses `p-3 sm:p-5 lg:p-8`; the header rows use the same horizontal gutters (`px-3 sm:px-5 lg:px-8`) so they line up. The shared full-screen state components (`AsyncState` fullScreen, `ErrorBoundary`, `NotFoundPage`) use `p-3 sm:p-6` and the not-found panel `p-4 sm:p-5`. The documented scale comment in `index.css` is updated to match what is now enforced.
- **KPI strip fix.** Restructure the strip rules mobile-first so the four-column variant applies only from `xl` (80rem), and below that it is the existing sideways-scrolling row. The 4-up Home strip's cards are at least 20rem wide so club names wrap by whole words (measured: the photo cards leave the name about 56 to 67px at four-up on `lg` or at 15rem, and words break mid-word; at 20rem it is 147px). The default `.kpi-strip` used by Standings and Head-to-head keeps its current behaviour (five columns from `lg`, scrolling row below).
- **Playwright spec.** `frontend/e2e/responsive.spec.js` with a helper in `frontend/e2e/support/layout.js`: the menu and header checks above, and a page-level sideways-scroll check at 320, 390, 768 and 1024px over a list of pages that later items extend.

## Out of scope

- Home layout work: swipe rows, Standings in full view below `lg`, the 2x2 KPI strip near the top, Latest scores trimming, dashboard panel and match-card padding (31b). Until 31b, Home's KPI strip is a scrolling row on mobile and tablet.
- Retiring `md:` (15 uses) and the page-specific media queries (639 leader trend in 31b, 720 and 1100 standings tables in 31d, 640 and 768 leader board rows in 31k) and each page's own panel padding: each belongs to its page item.
- A tablet hamburger, a bottom tab bar, a scrolling tab strip, adding Records to the tabs, making the logo a link.
- Body scroll lock, menu animation, swipe-to-close.
- Any `@theme` breakpoint change, new dependency, API or data change.
- Adding the Playwright spec to Verify or CI (browser tests stay opt-in evidence).

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (one review packet after all steps, no pause per step) and `workflow.checkpointCommits` is `disabled` (no step commits). `/complete` makes the single feature commit. Each step leaves the app working and ends with its Done when.

## Build steps

- [x] **1. Fix the KPI strip rules and record the breakpoint convention.** In `frontend/src/index.css`, rewrite the `.kpi-strip` rules mobile-first as described in scope, with a 20rem minimum column for `.kpi-strip-4` and four columns from `xl`. Add a short comment documenting the `sm` 40rem and `lg` 64rem convention next to the existing spacing comment.
  **Done when:** `cd frontend && npm run lint` and `npm run build` pass. In a browser at 320, 390, 768 and 1024px, Home's KPI cards wrap club names by whole words (no per-letter or mid-word breaks) and the strip scrolls sideways inside itself while `document.documentElement.scrollWidth` equals `clientWidth` as far as the strip is concerned (list any other overflow found, which is fixed by a later item). At 1280px Home shows four columns. The Standings and Head-to-head strips look the same as before at 1024px and 1280px and still scroll sideways below 1024px (checked against screenshots from before the change).

- [x] **2. Build the mobile header and menu.**
  - **Check first (before editing):** in the browser at 640px and 768px, measure whether the 9 `tabs-sm` links fit on one row of the 2.5rem tab row. If they do not, tighten the tab padding in the header only. If they still do not fit at 640px, stop and ask the user (the options are a wider `sm` for the header or a tab scroll strip). Record the measurement in the review handoff.
  - Export a shared `TABS` list and a pure `pageLabel(pathname)` from a new `frontend/src/season/sections.js` (not `NavBar.jsx`, so the React-refresh lint rule is not tripped). Measured: at 640px the tabs needed 609px against about 582px, so the header tabs use 6px side padding from `sm` to `lg`. Add the menu component (`frontend/src/season/SiteMenu.jsx`) holding the button, panel and backdrop; render it, the existing inline `NavBar` and the controls from `SeasonLayout.jsx` so only one set is visible at a time (the other set is `display: none`, so it is not in the accessibility tree). Add `--app-nav-height` and the header heights to `index.css` and switch `.tab-panel` to the variable.
  - Closing on navigation is derived from the location (for example, remember where the menu was opened and treat it as closed once the location differs) rather than setting state in an effect, because the installed `eslint-plugin-react-hooks` flags that.
  **Done when:** lint and build pass. In a browser at 320px: the header is 48px tall; the bar shows the logo, the current page name and the hamburger and nothing wraps; the button toggles the panel; the panel shows 9 links in 2 columns, the "Selected season" select and the theme switch; clicking a link navigates, closes the menu and changes the page name; Escape and a backdrop click close it. At 639px the hamburger shows; at 640px and 768px the hamburger is gone, the 9 tabs sit on one row, the header is 88px tall and the controls are in the top row. At 1280px the header looks as it did before. With the menu open at 320px, resizing to 640px closes it. A page-name check on `/:season/games/:gameCode`, `/:season/teams/:clubCode`, `/:season/compare/head-to-head` and `/:season/records` shows Games, Teams, Compare and Records.

- [x] **3. Apply the gutter scale to the shared layout and state components.** `SeasonLayout.jsx` (`main` and the header rows), `frontend/src/lib/AsyncState.jsx` (fullScreen), `frontend/src/ErrorBoundary.jsx`, `frontend/src/NotFoundPage.jsx`, and the spacing comment in `index.css`.
  **Done when:** lint and build pass. In a browser, `main` has 12px side padding at 320px (content 296px wide), 20px at 640px and 768px, and 32px at 1024px, and the header text lines up with the page content at each width. The not-found page and a failed-seasons state read cleanly at 320px with no sideways scroll.

- [x] **4. Add the Playwright specs.** `frontend/e2e/support/layout.js` (an overflow finder returning `scrollWidth`, `clientWidth` and up to five offending elements with their right edge, so a failure names the culprit) and `frontend/e2e/responsive.spec.js`:
  - Header and menu behaviour from step 2 at 320, 390, 639, 640, 768 and 1024px, using roles and labels (`navigation` "Sections", combobox "Selected season", the theme button, the "Menu" button), with exactly one visible "Sections" navigation per width.
  - Header height 48px below 640px and 88px from 640px, matching `--app-nav-height`, and a probe element with the `tab-panel` class whose computed `scroll-margin-top` equals the header height plus 16px.
  - A page-scroll check over a `PAGES` list at the four widths. The list starts with the not-found page (no data needed) and every real route that measures clean after steps 1 to 3 (at minimum Home if it does; record all 14 routes' measured results in the review handoff). Later items add their page.
  - A control test that appends an element wider than the viewport and asserts the finder reports the overflow, so the check is shown able to fail. The `PAGES` list must not be empty.
  **Done when:** `cd frontend && npx playwright test e2e/responsive.spec.js` passes, and the finder's failure message (checked once by temporarily widening an element) names the offending element.

- [x] **5. Regression pass and evidence.** Run lint, build, and the existing specs that touch the header or a narrow viewport: `smoke`, `urls-and-titles`, `filter-controls`, `postseason` and `game-four-factors`. Take screenshots of Home at 320, 390, 768 and 1024px, and of the open menu at 320px, for the review.
  **Done when:** all of those pass or any failure is explained and traced to the change; the screenshots exist for the review handoff; nothing outside the files listed below changed.

## Files / areas

- `frontend/src/index.css` (KPI strip rules, `--app-nav-height`, header heights, `.tab-panel`, spacing and breakpoint comments)
- `frontend/src/season/sections.js` (new: shared `TABS`, `pageLabel`) and `frontend/src/season/NavBar.jsx` (inline tabs)
- `frontend/src/season/SiteMenu.jsx` (new)
- `frontend/src/season/SeasonLayout.jsx` (header structure, `main` padding)
- `frontend/src/season/SeasonSelector.jsx` and `ThemeToggle` in `SeasonLayout.jsx` only if the menu needs a different size or label
- `frontend/src/lib/AsyncState.jsx`, `frontend/src/ErrorBoundary.jsx`, `frontend/src/NotFoundPage.jsx` (padding)
- `frontend/e2e/responsive.spec.js` and `frontend/e2e/support/layout.js` (new)
- Not changed: `frontend/src/lib/HeaderStats.jsx`, the dashboard, every page's own components, the backend.

## Data / contracts

- No API, database or persisted-data change. No new dependency.
- Breakpoints: `sm` = 40rem (640px), `lg` = 64rem (1024px). Below `sm` is mobile.
- `--app-nav-height`: 3rem below `sm`, 5.5rem from `sm`. The sticky header's rendered height equals it at every width.
- Accessibility names that existing specs and users rely on stay: navigation "Sections", combobox "Selected season", the theme button's "Switch to ..." label. Exactly one of each is in the accessibility tree at any width. Link targets (`/${seasonCode}/${path}`) are unchanged.
- Page name text is plain (not a heading), so each page keeps its single `h1`.
- Menu touch targets are at least 44px; focus is visible; Tab order is bar, button, then the panel's links, season select and theme switch.

## Testing

- No unit test command exists, so there is no unit test. The new logic (`pageLabel`) is covered through the browser spec, which asserts the page name on a route in each section.
- Browser tests are declared (`cd frontend && npm run test:browser`), so `responsive.spec.js` is added as proportionate coverage of the menu, header heights and sideways page scroll. They stay opt-in and are not part of Verify or CI (none is declared).
- What this will not prove: behaviour on a real phone (touch gestures, address-bar resizing, dynamic viewport units), Safari, or the visual quality of the layouts. The screenshots from step 5 are the visual evidence; the user judges them.
- `/check` runs the full `npm run test:browser`.

## Notes for the AI

- Follow `coding-standards.md`: theme tokens (no hard-coded colours), no blur, no commented-out code, no unused imports, comments only for the why, no em or en dashes in code, comments or docs.
- Prefer CSS over JavaScript for the breakpoint switching (Tailwind `sm:` and `hidden`), and use one `matchMedia("(min-width: 40rem)")` listener only for closing an open menu. Reuse `.touch-target` and the existing `SeasonSelector` and `ThemeToggle`.
- Keep the header's fixed heights exact: border-box sizing, and the 1px bottom border sits inside the 3rem or 5.5rem.
- Do not start 31b work while there: leave Home's panels, rows and padding alone.
- The branch is created at `/implement` from `master`. `blueprint/build-plan.md` and `blueprint/context/project-overview.md` carry uncommitted item 31 edits; they ride along into this branch unless committed first.
- No Verify command is declared, so none was run while writing this spec.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":14965,"specSha256":"2602f7bde434ba3a4b5b6c42d4e93b7d3be4fa690733c62137925d1f4c5a2648","branch":"refs/heads/feature/mobile-foundation","head":"f6a27ee347555bb39fa0798721faf29f119c13e5","baseRef":"refs/heads/master","baseCommit":"f6a27ee347555bb39fa0798721faf29f119c13e5","sourceTree":"28e123a20697047fe0a0c3f137efa949278ceb27","absentOptional":[]} -->
