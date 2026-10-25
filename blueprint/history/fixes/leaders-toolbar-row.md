# Fix: Leaders toolbar row

**Type:** Fix
**Status:** verified
**Branch:** fix/leaders-toolbar-row

## The problem

The Records page now has one toolbar row under its main tabs (`fix: records toolbar row`). The other pages were checked for the same stacked choice strips. Each page's choice rows under its main tabs:

| Page | Rows of choices | Verdict |
|---|---|---|
| **Leaders**, cards | Scope tabs, **Stage strip**, **Per game / Totals strip** | Fix |
| **Leaders**, full board | Scope tabs, Stage strip, Per game / Totals strip, **Statistic family strip**, **Statistic chips**, filters row | Fix (the worst) |
| **Leaders**, Advanced | Scope tabs, **Advanced scope strip**, plus the family strip and chips on a board | Fix |
| Standings | Phase tabs, display tabs, then a view or breakdown row (one row already, with a select) | Fine: each row is a different level. Advanced: scope, round and view already share rows. Not this fix. |
| Team / Player pages | Section tabs, stage tabs (player Statistics: stage and mode already share one row) | Fine |
| Games (fixtures) | Stage tabs, then the round pager or the stage strip | Fine: the round pager is navigation, not a setting |
| Compare | Section tabs, then one row of selects | Fine (already the pattern) |
| Game, Shooting tabs | Section tabs; in-panel controls share one wrapping row | Fine |

On Leaders, a season with one stage shows a Stage strip holding only "Regular Season", which is pure noise.

## The fix

**Scope tabs:** Players / Teams / Advanced stay as the level-1 `TabStrip`.

**Everything else becomes one toolbar row under the scope tabs,** `flex flex-wrap items-end gap-3`, at every width, in this order:

| Control | Shown | Details |
|---|---|---|
| **Stage** dropdown | Players and Teams (the phases); Advanced (its scopes, replacing the "Advanced leaders scope" strip) | Native select labelled "Stage". Hidden when there is only one choice. |
| **Statistic** dropdown | Full boards only | The existing `StatSelect` (grouped by family with `<optgroup>`) at every width, with its label always visible. It replaces the desktop family strip and the stat chips. |
| **Per game / Totals** toggle | Where the scope has a mode (Players; Teams when `hasMode`) | Two buttons, `aria-pressed`, labelled group "Player statistics mode" / "Team statistics mode". |

**Filters stay where they are:** the board's filters row (Order, Minimum games or minutes, Team, Position) and the phone "Filters" button are unchanged. The board's phone `ModeSelect` copy is removed, because the toggle in the toolbar covers it.

**Reuse:**
- Move Records' local `PerToggle` to `frontend/src/lib/ToggleButtons.jsx` as a generic two-or-more-choice button group (`label`, `ariaLabel`, `choices`, `value`, `onChange`, `panelId`).
- Records uses it with identical output, so its specs keep passing unchanged.
- Leaders uses it for Per game / Totals.
- `ModeTabs`, `ModeSelect`, `StatChips` and the family strips are removed once unused.

**Behavior that stays the same:**
- The address contract: `scope`, `phase`, `mode`, `ascope`, `metric` and the filter params keep their names and values.
- `choosePhase` still clears `offset`, `team`, `position`, `search` and `minGames`.
- **Found while building: choosing a stage on Leaders never changed anything.** `choosePhase` called `setPhaseCode` and then a second `setParams`. Both started from the same old address, so the second undid the first. On `master`, clicking the Playoffs strip left the address at `/2025/leaders`. Fixed with one address update that sets `phase` and clears the filters.
- Changing the stage, the mode or the statistic behaves exactly as the strips did.
- The cards and their "→" links into boards, the "Categories" back link, the notes (unadjusted, forfeits, postseason ratings) and all loading, error and empty states.
- No backend change.

## Build steps

- [x] **1. Shared toggle.**
  - Create `lib/ToggleButtons.jsx` from Records' `PerToggle` and switch Records to it.
  - **Done when:** `npx playwright test records.spec.js records-layout.spec.js` passes unchanged. Lint and build pass.
- [x] **2. Leaders toolbar.**
  - In `LeaderParts.jsx`, add a `LeadersToolbar` row and a `StageSelect` (hidden at one choice). `StatSelect` keeps its label at every width.
  - `LeadersPage` passes the phases, the current phase and `choosePhase` to Players and Teams instead of rendering the stage strip.
  - Players, Teams and Advanced each render the toolbar (stage, statistic on a board, mode toggle) and drop their `ModeTabs`/`ModeSelect`, family strips and chips. Advanced's scope strip becomes its Stage dropdown.
  - **Done when:** at 1280 and 390px, Leaders shows the scope tabs and one toolbar row on the cards and on a board, for each of Players, Teams and Advanced. A one-stage season shows no Stage dropdown. Lint and build pass.
- [x] **3. Specs.**
  - Update `leaders.spec.js`, `leaders-layout.spec.js`, `filter-controls.spec.js` and `stage-scopes.spec.js` for the dropdowns and the toggle.
  - Add checks:
    - There is no "Statistics phase", "Statistic family" or "Advanced leaders scope" tablist.
    - The Stage dropdown is hidden with one stage.
    - Choosing Totals on the cards keeps `mode` in the address.
    - Picking a statistic from the dropdown on desktop opens its board.
  - **Done when:** `npx playwright test leaders.spec.js leaders-layout.spec.js filter-controls.spec.js stage-scopes.spec.js records.spec.js records-layout.spec.js responsive.spec.js` passes on the local DB.

## Verify

- `/api/health` reports `"target":"local"`.
- Run `cd frontend && npm run lint`, `npm run build`, and `cd backend && npm run build`.
- Run the specs listed in step 3, plus the Leaders links in `grouped-pages.spec.js`, `historical-era-pages.spec.js` and `progressive-disclosure.spec.js`.
- **Manual check:** open Leaders for 2025-26.
  - Under Players / Teams / Advanced there is one row: Stage dropdown, then Per game / Totals.
  - Open a card: the row adds the Statistic dropdown, and the filters stay below it.
  - In 2026-27, which has only the regular season, there is no Stage dropdown.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6125,"specSha256":"eccb3887c225646109a6ef2aafd8b7c56ecf369a2f2f7928f1b1fab331deff79","branch":"refs/heads/fix/leaders-toolbar-row","head":"0711910f6e3541ddbe3beb0867cf48820bb300f1","baseRef":"refs/heads/master","baseCommit":"0711910f6e3541ddbe3beb0867cf48820bb300f1","sourceTree":"f4c2efcf21308192f7eb759442f870749123136f","absentOptional":[]} -->
