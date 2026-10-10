# Fix: Leaders back link at the top

**Type:** Fix
**Status:** verified
**Branch:** fix/leaders-back-link-at-the-top

## The problem

On the Leaders page, an open category board starts with a "← All categories" button (`BoardTopLine` in `leaders/LeaderParts.jsx`),
one line above the board's statistic pickers and far below the page header and the scope tabs. The Team, Player and Compare pages
put their way back in the shared back link: a quiet "← Games" above the header from tablet up, and on phones the sticky bar's page
name turns into "← <page>" and goes back (`BackLink`, with the opt-in `onBack` added for Compare). Leaders is the odd one out, and a
phone reader has to scroll to the button.

Also in this fix: `frontend/e2e/compare-team-layout.spec.js` has three assertion corrections already made and run (6 of 6 pass) but
not committed: it checked words inside hidden short labels, required a table to scroll at 639px where it fits, and checked chart
canvases before Chart.js had resized them.

## The fix

- `LeadersPage` shows `<BackLink label="Categories" to=... onBack=... />` above its `PageHeader` whenever a category is open
  (`?metric=` set), and not on the card landings. `to` is the Leaders address with the board's own parameters removed and the scope
  and phase kept (what the cards view is today); a plain click runs `onBack`, which clears those parameters and scrolls to the top,
  so the page changes state as it does today; a new-tab click opens the landing. On phones the sticky bar shows "← Leaders" and does
  the same (the shared `BackTargetContext`, no change to `BackLink` or `SeasonLayout`).
- The board parameters to clear are the ones the three scopes clear today: `metric`, `mode`, `direction`, `minGames`, `minMinutes`,
  `team`, `position`, `search`, `offset` (the advanced scope `ascope` and `scope` stay). The three per-scope `backToCards` handlers and
  the `backToCards` prop of the three boards go; the "Hot right now" and card buttons keep opening a category as now.
- `BoardTopLine` loses its button and keeps the line of text beside it, so a board still says what it shows (its name and the `onBack`
  prop go with the button if nothing else needs them; the simplest repository-native result).
- Nothing else changes: the scroll-to-top on open, back and paging from the last fix, the board contents, filters and URLs.
- Specs: `leaders.spec.js` and `scroll-in-page-views.spec.js` find the button by name; they find the link "Back to Categories" instead.
- The uncommitted `compare-team-layout.spec.js` corrections go in this commit as they are.

## Build steps

- [x] 1. **Back link.** Add the link in `LeadersPage`, remove the button and the per-scope back handlers, and update the two specs.
      Done when: on all three scopes (390 and 1280px) an open board shows "← Categories" above the header from 640px and "← Leaders"
      in the sticky bar below 640px, a plain click returns to the cards of the same scope at scrollY 0 with the scope and phase kept,
      no card view shows a back link, and the "← All categories" button is gone.
- [x] 2. **Run the specs.** Browser tests are no longer paused and the local database is the target (`/api/health` says `local`).
      Done when these pass: `leaders.spec.js leaders-layout.spec.js scroll-in-page-views.spec.js compare-team-layout.spec.js
      back-link-scroll.spec.js detail-back-links.spec.js phone-menu.spec.js responsive.spec.js`; root `npm run build` and
      `cd frontend && npm run lint` pass.

## Verify

Root `npm run build`, `cd frontend && npm run lint`, and the specs in step 2. By hand: open a Leaders category on a phone width and on
desktop, press the back link, and check the scope tab and phase are as you left them; open a team from a Leaders row and use its back
link to confirm the shared link still behaves.

## Notes

- Changes stay on the Leaders page; the shared `BackLink`, `SeasonLayout` and `historyTrail` are used as they are (memory notes).
- No AI attribution in commit messages (AGENTS.md).

## Built as

- As specced. `LeadersPage.jsx` shows `<BackLink label="Categories" onBack={backToCards} />` above the header while `?metric=` is set;
  `to` is the current address with `BOARD_PARAMS` (the scope params minus `ascope`) removed, so the scope and phase stay. The three
  per-scope `backToCards` handlers and props, and the button in `BoardTopLine` (now only the line of text), are gone. The scroll-to-top
  moved into the page's `backToCards`.
- Specs: `leaders.spec.js` and `scroll-in-page-views.spec.js` use the link "Back to Categories" and now also check that the cards have
  no back link and that the scope stays in the address.
- Evidence: 197 of 197 pass on the local database (`/api/health` target `local`): `leaders.spec.js leaders-layout.spec.js
  scroll-in-page-views.spec.js compare-team-layout.spec.js back-link-scroll.spec.js detail-back-links.spec.js phone-menu.spec.js
  responsive.spec.js`. A page visit on the Teams scope: 1280px shows "← Categories" above the header, 390px shows "← Leaders" in the sticky
  bar, both link to `/2026/leaders?scope=teams`, and going back lands on the Teams cards at scrollY 0. Root `npm run build` and
  `cd frontend && npm run lint` pass.
- The three `compare-team-layout.spec.js` assertion corrections (visible-only words, tables scroll only below 480px, canvases polled
  until Chart.js has resized) are in this commit as they were.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5450,"specSha256":"4e298c32c8ae308063b7eff9f2bf241ce137050ab9cc2a9c10606c7977d080e8","branch":"refs/heads/fix/leaders-back-link-at-the-top","head":"782d88f3865cb54bca269fce704888ae083895be","baseRef":"refs/heads/master","baseCommit":"782d88f3865cb54bca269fce704888ae083895be","sourceTree":"cfaea8179082adb6369b24711ff653631da583ff","absentOptional":[]} -->
