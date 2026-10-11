# Feature: Records in the navigation

**From build-plan:** feature 33a
**Build attempt:** 1
**Branch:** feature/records-in-the-navigation
**Status:** verified

## Goal

Give the Records page (`/:season/records`) a tab of its own: a "Records" tab between Leaders and Compare in the tab row from 640px up and in
the phone menu below it, with an icon in the menu like the other tabs, and the bar naming it as it does today. The page has worked at that
address since 17h but nothing links to it. The navigation keeps its present layout: ten tabs have to fit where nine do, and your rule from
the phone menu stands: a menu that scrolls only because it is a few pixels too tall is bad design, so the paddings and gaps give first, and
scrolling stays only where the content truly does not fit. Mobile is below 640px, tablet is `sm` (640px), desktop is `lg` (1024px). The
Records page itself is 33b (desktop polish) and 31m (mobile and tablet layouts); no change to it here.

Today (read from the code; the measurements are step 1):

- **One list:** `season/sections.js` exports `TABS` (nine entries, Home to Postseason), read by `NavBar.jsx` (the tab row) and `SiteMenu.jsx`
  (the phone menu). Records is only in `UNLISTED_LABELS`, so `pageLabel` can name it in the phone bar.
- **Tab row** (`NavBar.jsx`, from `sm`): `tabs tabs-sm flex-nowrap overflow-x-auto`, tabs with `px-1.5` (`lg:px-2`), in the 88px header
  (`--app-nav-height: 5.5rem`). It scrolls sideways when the tabs do not fit, and nothing checks whether nine fit at 640, 768 and 1024px
  (`responsive.spec.js` checks only that the links share a top, which a scrolling row also satisfies).
- **Phone menu** (`SiteMenu.jsx`, below `sm`): one column of `min-h-11` (44px) rows with a hairline between them, an icon per tab from
  `TAB_ICONS` (nine Tabler icons, each imported from its own file), then a footer (`border-t p-3`, a "Season" caption with `mb-2`, the season
  select and the theme switch at 44px). `max-h-[calc(100dvh-var(--app-nav-height))] overflow-y-auto`. Measured when it was built: with nine
  rows the panel ends at 547px in a 568px-tall window, 21px to spare, so a tenth 44px row (plus its 1px hairline) overshoots by about 24px and
  the panel would scroll.
- **Specs that name the nine:** `phone-menu.spec.js` (`SECTIONS`, "nine tabs ... without scrolling" at 320x568 and 390x844, row heights at
  least 44px), `responsive.spec.js` ("keeps the nine tabs on one row", count 9, at 640, 768 and 1024px), `urls-and-titles.spec.js` (`TABS`,
  each tab's address and "Page | JMP EuroLeague" title).

## In scope

1. **The tab.** `TABS` gets `{ label: "Records", path: "records" }` between Leaders and Compare, so the tab row, the phone menu and
   `pageLabel` all follow; `UNLISTED_LABELS` is removed with its one entry. The tab is active (`aria-current`, the accent) on `/:season/records`.
2. **The icon.** `TAB_ICONS` gets `records` with a Tabler icon imported from its own file (default `IconAward`, a medal; the file exists in
   the installed package), and its comment says ten, not nine.
3. **Tab row fit.** With ten tabs the row has no sideways scroll at 768, 1024 and 1280px, and at 640px if the nine fit there today. If it
   scrolls by a few pixels, the tab padding and gaps give first (not the font size); the row scrolls only when it still does not fit with
   them tightened, and then the active tab is kept in view (scrolled into view when it changes).
4. **Phone menu fit.** The open menu fits a 320x568 phone without scrolling, and still fits 390x844. The paddings and gaps give first (the
   footer's padding and the caption's gap), then, only on a screen under 37rem (592px) tall, the rows go from 44px to 40px or taller so
   that everything fits; on a taller screen the rows stay 44px. The season select and the theme switch stay 44px. If the menu still does not
   fit, it scrolls as it does today; it never scrolls for a few pixels.
5. **Specs.** `phone-menu.spec.js`, `responsive.spec.js` and `urls-and-titles.spec.js` updated for ten tabs, with the new checks named in
   Testing.

## Out of scope

- The Records page's content and layout (33b, 31m), its data and its URL; the order of the other tabs; the season selector, the theme
  switch and the header height; any change to how another page uses `TABS`.
- Other short-phone menu changes (menu animation, the overlay, closing behaviour).

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the narrow check after
each, then present one final review packet. `/complete` makes the single work commit.

## Build steps

- [x] 1. **Baseline, the tab and the icon.** Before changing code, measure with a throwaway probe, with nine tabs: the tab row's
      `scrollWidth` against its `clientWidth` at 640, 768, 1024 and 1280px, and the open phone menu's height and bottom at 320x568,
      360x640 and 390x844. Delete the probe afterwards. Then add the tab to `TABS`, remove `UNLISTED_LABELS`, add the icon, and measure the
      same with ten.
      Done when: Records appears in the tab row and in the menu with its icon and opens `/:season/records`, is the active tab there, the
      phone bar names it "Records", and the baseline and ten-tab numbers are recorded for the next steps.
- [x] 2. **Tab row.** Fit ten tabs per item 3, using the numbers from step 1.
      Done when: at 768, 1024 and 1280px (and 640px if it fitted before) the row's `scrollWidth` is at most its `clientWidth` with every tab
      on one row; if the row has to scroll at 640px, the active tab is in view after a tab change; the header is still 88px and the season
      picker still sits above the row.
- [x] 3. **Phone menu.** Fit ten rows per item 4, using the numbers from step 1.
      Done when: at 320x568 and 390x844 the open menu does not scroll (`scrollHeight <= clientHeight`), its bottom is inside the window,
      every tab is a row of the same left edge and width reading top to bottom, the season select and theme switch are at least 44px, and
      the rows are 44px or taller at 390x844 and 40px or taller at 320x568; no sideways page scroll.
- [x] 4. **Specs.** Update the three specs and add the new checks, then run them.
      Done when `phone-menu.spec.js`, `urls-and-titles.spec.js` and the `responsive.spec.js` header and "bar names" tests pass on the local
      database (`/api/health` says `local`), with root `npm run build` and `cd frontend && npm run lint`.

## Files / areas

- `frontend/src/season/sections.js`, `frontend/src/season/SiteMenu.jsx`, `frontend/src/season/NavBar.jsx`; `frontend/src/index.css` only if a
  tab-row rule needs it. `frontend/src/season/SeasonLayout.jsx` is read only (`pageLabel`, the header).
- `frontend/e2e/phone-menu.spec.js`, `frontend/e2e/responsive.spec.js`, `frontend/e2e/urls-and-titles.spec.js`.

## Data / contracts

None changed. The route `records` already exists in `App.jsx` (lazy `RecordsPage`); a tab links to `/${seasonCode}/records` like the others, so
the season in the address stays the selected one. The tab's label and the icon are static text and a component, never HTML from data.

## Testing

No unit test runner is configured and no `Verify` command is declared in `AGENTS.md`, so none was run while writing this spec. Browser tests run
on the local database (`/api/health` must say `local` first). `phone-menu.spec.js`: `SECTIONS` gains "Records" between Leaders and Compare, the
fit test (title "ten tabs") runs at 320x568, 360x640 and 390x844 and checks no scrolling, the bottom inside the window, row heights (44px or
taller from 592px tall, 40px or taller below), and the controls at 44px. `responsive.spec.js`: "keeps the ten tabs on one row", link count 10,
`scrollWidth <= clientWidth` on the tab row at the widths step 2 settles, header still 88px. `urls-and-titles.spec.js`: Records joins `TABS`
(address `/records`, title "Records | JMP EuroLeague"), and one assertion that the Records link is the current page's tab
(`aria-current="page"`). Evidence while building comes from single page visits through the Playwright library. Run only these three
spec files (the `responsive.spec.js` header and "bar names" tests with `-g`), and rerun a single failing test with `-g`, never the set. Final gate:
root `npm run build` plus `cd frontend && npm run lint`.

## Notes for the AI

- Follow the user's rules: changes stay on the page being built (here, the navigation), shared components get opt-in props only. A menu or
  row that scrolls for a few pixels is a defect; tighten spacing before any scrolling. The row height of 44px is the default touch size; it
  gives only on screens under 592px tall.
- Read `blueprint/history/fixes/` for the phone-menu fix (single column, 44px rows, Tabler icons) before touching `SiteMenu.jsx`, and keep
  its animation, closing and focus behaviour unchanged. Never open the real `.env`.
- Take the baseline with a throwaway probe before changing code and delete it afterwards. Match the surrounding code style and comment
  density. No AI attribution in commit messages (AGENTS.md).
- The planning edits for feature 33 (`build-plan.md`, `project-plan.md`, `project-overview.md`) may still be uncommitted on `master`; they
  would then travel into this work commit. Commit them first as a small `chore:` commit if the user wants them kept apart.

## Measured and built

Measured with a throwaway probe before and after (deleted afterwards).

| | Nine tabs (before) | Ten tabs, no change | Built |
|---|---|---|---|
| Tab row at 640px (content 573px, 590px free after the 20px gutters) | fits | 635px, **45px over** | 595px, fits (4px tab padding below `lg`, the row reaching 4px into the gutter) |
| Tab row at 768px | fits | 635px, fits | 595px, fits |
| Tab row at 1024 and 1280px | 609px, fits | 675px, fits | unchanged (`lg:px-2`) |
| Phone menu at 320x568 (panel limit 520px) | 499px, 21px spare | 544px, **25px over, scrolls** | 512px, no scroll (rows 42px, footer padding and caption gap trimmed) |
| Phone menu at 360x640 and 390x844 | 499px | 544px, fits | unchanged (rows 44px) |

The phone menu changes sit behind `@media (max-height: 37rem)` (592px) in `index.css`, on `.site-menu-row` and `.site-menu-footer`: below that height the
rows are 42px and the footer's vertical padding and caption gap are smaller; the season select and the theme switch stay 44px everywhere.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10412,"specSha256":"1caaea6f0600e42813c93f4f584eff477c0e80ed869f188f7f54d4f9ee3879e8","branch":"refs/heads/feature/records-in-the-navigation","head":"de6ea5bdae5c550d1cbcb49f3048c3c4bd5f3587","baseRef":"refs/heads/master","baseCommit":"de6ea5bdae5c550d1cbcb49f3048c3c4bd5f3587","sourceTree":"c2076a72e095d64cd342cf5414aab1589fa67729","absentOptional":[]} -->

## Completion evidence

- Browser tests on the local database (`/api/health` said `local`): `phone-menu.spec.js` and `urls-and-titles.spec.js` (26 passed, the menu-fit test at 320x568, 360x640 and 390x844), and the header and "bar names" tests of `responsive.spec.js` (56 passed, with the new check that the ten-tab row does not scroll).
- Root `npm run build` and `cd frontend && npm run lint` pass. No `Verify` command is declared in `AGENTS.md`.
- The measurements before and after are in the spec's "Measured and built" section.
- The planning edits for feature 33 (`build-plan.md`, `project-plan.md`, `project-overview.md`) were uncommitted on `master` and travel in this work commit.
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested.
