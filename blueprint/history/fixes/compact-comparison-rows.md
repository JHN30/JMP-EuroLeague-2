# Fix: Compact comparison rows

**Type:** Fix
**Status:** verified
**Branch:** fix/compact-comparison-rows

## The problem

Feature 38 gave `ComparisonRow` (`frontend/src/lib/ComparisonRow.jsx`) an opt-in `inline` mode: the label sits in a
centre column between the two values, one line per stat, with any bar under each value. It halved the height of the
game's Team comparison tab. Three other places still use the taller stacked rows (label on its own line above the
values) and should look the same:

| Where | Component | Rows today |
|---|---|---|
| Game page, Overview tab, key stats card | `KeyStatsCard` in `frontend/src/games/OverviewTab.jsx` | stacked, no bars |
| Team page, Quick comparison | `frontend/src/teams/TeamQuickCompare.jsx` | stacked with bars, `animated compact` |
| Player page, Advanced, on/off ratings | `frontend/src/players/PlayerAdvancedSection.jsx` (Offensive / Defensive rating) | stacked with bars, `animated compact` |

The Compare page (dense rows, averages beside the value, per-side crests on phones) is out of scope, per the user.

## The fix

Pass `inline` to the `ComparisonRow` calls in those three places (dropping `compact`, which the inline mode does not
use). No change to `ComparisonRow` itself, to row data, tips, directions or highlight rules, and no other page.

Must not break:

- The headers above the rows (team labels, club labels, "On court · min / Off court · min") stay centred over each
  side's values.
- `animated` entrances on the team and player rows keep working (the inline mode already supports `animated`).
- "Lower is better" still shows for Defensive rating on the player page (under the label in inline mode).
- No horizontal scroll at phone width.

## Build steps

- [x] **1. Inline rows in the three places.** Add `inline` to the `ComparisonRow` calls in `OverviewTab.jsx`
  (`KeyStatsCard`), `TeamQuickCompare.jsx` and the two calls in `PlayerAdvancedSection.jsx`; drop `compact` there.
  Update any browser test that relies on the stacked layout.
  **Done when:** `cd frontend && npm run lint` and root `npm run build` pass; on the local target,
  `npx playwright test game-overview.spec.js game-scoring-profile.spec.js team-overview-layout.spec.js player-advanced-layout.spec.js responsive.spec.js`
  passes; screenshots of a played game's Overview, a team page and a player page's Advanced section at 1400px and
  390px show one line per stat and no horizontal scroll.

**Result:** lint and root build pass; the five specs passed (200 tests) on the local target; screenshots of E2025
game 100 Overview, `/E2025/teams/OLY` Quick comparison and player 003469's on/off card at 1400px and 390px show one
line per stat, "Lower is better" under Defensive rating and Turnover %, and no horizontal scroll (scrollWidth 1390 /
380). No browser test needed changing.

- [x] **2. Quick comparison ends level with its column (user-requested).** With shorter rows the Quick comparison
  panel no longer filled the height of the Form and Fixtures column beside it. Its tab panel and row list in
  `TeamQuickCompare.jsx` now grow (`flex flex-1 flex-col`), so the inline rows spread over the panel.
  **Done when:** on `/E2026/teams/MIL` and `/E2026/teams/OLY` at 1400px both columns end at the same y (968 / 968);
  at 390px the sections stack with no horizontal scroll; `team-overview-layout.spec.js` and `responsive.spec.js`
  pass; lint and root build pass.

## Verify

- `/api/health` reports `"target":"local"` before any browser run.
- Open `/E2025/games/100` (Overview), a team page (Quick comparison) and a player page's Advanced section (on/off
  ratings): each stat is one line, value - label - value, the better side highlighted as before.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3712,"specSha256":"1dc14d76e52a099cccf817204c8282b5e1ab46ba5fcf052125c85658004b301f","branch":"refs/heads/fix/compact-comparison-rows","head":"621155a6e8bc8213248ad432fbc9c3387c93b458","baseRef":"refs/heads/master","baseCommit":"621155a6e8bc8213248ad432fbc9c3387c93b458","sourceTree":"238e7cdc421bd0ed9944c9078e44c88498079965","absentOptional":[]} -->
