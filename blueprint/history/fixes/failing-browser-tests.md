# Fix: Failing browser tests

**Type:** Fix
**Status:** verified
**Branch:** fix/failing-browser-tests

## The problem

Eight browser tests fail on `master` against the local target (`/api/health` reports `"target":"local"`). Five are stale
tests left behind by intentional changes. Three are real layout regressions.

**Stale tests: the app changed on purpose and the tests were not updated.**

| Test | Fails because | Changed by |
| --- | --- | --- |
| `team-stats-null.spec.js` | It expects "No played games yet this phase to map shot locations from."; the team Shooting tab now names the stage: "No played games yet in the Regular season …". | `9e8e128` fix: team page tabs follow the stage tabs |
| `game-rotations.spec.js` "an unplayed game's Rotations tab says it is not available yet" | An unplayed game shows only the Overview tab, so there is no Rotations tab to click. | `ee69961` fix: unplayed game page is inconsistent |
| `game-rotations-layout.spec.js` "the Rotations note for a game that is not played stays inside the panel at 320px" | Same: that note can no longer be reached. | `ee69961` |
| `cancelled-season.spec.js` "abandoned fixtures remain archived …" | It clicks the Box score and Game flow tabs of cancelled game 253, which now shows only Overview, with the cancelled-season message there. | `ee69961` |
| `game-box-score.spec.js` "… have hover tips" | It hovers a `2PT` header tip on the Team comparison tab; those rows are plain counts and carry no tips by design. | `621155a` feat: team comparison extras |

**Real layout regressions.**

- **Game Team comparison, Scoring profile (`game-flow-layout.spec.js`).**
  - The opt-in `inline` mode of `frontend/src/lib/ComparisonRow.jsx` (added in `621155a`) puts the label in a centre
    column that is 6.5rem (104px) wide below `sm`.
  - "SECOND-CHANCE" is 105px, so "Second-chance points" breaks inside the word at the hyphen at 320-639px.
  - `inline` is used only by the game page (Overview, Team comparison, Scoring profile).
- **Postseason race at 1024px (`postseason-layout.spec.js`).**
  - From `lg` the three zone tables sit side by side, each about 289px wide.
  - The Playoffs table's margin cell is `whitespace-nowrap`, and its "1 game in hand" line (6th, Level) pushes the
    "vs 7th" column to 107px.
  - The table then scrolls sideways by 27px. The compact race fix (`4c83927`) requires that nothing scrolls sideways.
- **Player Statistics top-rank chips (`player-statistics-layout.spec.js`).**
  - At 320 and 390px, the five "Top 10 in the league" chips wrap to 3 lines; the test allows 2.
  - The labels are now longer (for example "2nd Assist to turnover").
  - The user chose to allow 3 lines on phones and keep all five chips.

## The fix

- **Stale tests.** Update each to the current, intended behavior; don't change the app.
  - `team-stats-null`: expect "No played games yet in the Regular season to map shot locations from."
  - `game-rotations`: the unplayed-game test checks there is no Rotations tab (only Overview) and no `/lineups` request.
  - `game-rotations-layout`: delete the unplayed 320px note test. That state is unreachable, and Overview's unplayed
    layout is already covered by `game-overview` and `game-detail-layout`.
  - `cancelled-season`:
    - for game 253, expect a single Overview tab with "No result or performance statistics were recorded.";
    - drop the Box score and Game flow clicks;
    - keep the "no table" and "not … until this game is played" checks.
  - `game-box-score`: drop the Team comparison `2PT` hover. The box score's own PTS, PIR and Starter tips stay checked.
- **Scoring profile label.** In `ComparisonRow`'s `inline` mode only, widen the centre column below `sm` from 6.5rem to
  7rem. "Second-chance" then fits on one line, with "points" on the next.
  - The non-inline rows and the `sm`-and-up width (9rem) are unchanged.
  - Must not break the game page at 320px: no sideways page scroll, and the values stay inside their halves.
- **Postseason margin cell.** Let the "N game(s) in hand" line under a margin wrap (`whitespace-normal` on that line).
  The "+1 W" and "Level" part stays on one line. The table then fits its 289px column at 1024px. The text and the
  stacked layouts below `lg` are unchanged.
- **Top-rank chips.** In `player-statistics-layout.spec.js`, allow at most 3 chip lines below 640px (was 2), with a
  comment saying why. No app change.

Must not break:
- played games' seven tabs;
- the Compare page's rows, which don't use `inline`;
- the race margins' wording;
- every other passing spec.

## Build steps

- [x] 1. **Update the five stale tests.**
  **Done when:** `team-stats-null`, `game-rotations`, `game-rotations-layout`, `cancelled-season` and `game-box-score`
  pass on the local target.
- [x] 2. **Fix the two layout regressions and relax the chip check.**
  - Widen the `inline` centre column below `sm`.
  - Let the in-hand line wrap.
  - Allow 3 chip lines.

  **Done when:**
  - `game-flow-layout`, `postseason-layout` and `player-statistics-layout` pass.
  - So do the game specs that render inline rows (`game-overview`, `game-detail-layout`, `game-four-factors`), plus
    `postseason` and `responsive`.
  - Frontend lint and the root build pass.

## Verify

- Run the eight originally failing specs, then the related specs from step 2, on the local target. All should pass.
- **By hand at 320px:** open a played game's Team comparison tab. "Second-chance points" breaks only between words.
- **By hand at 1024px:** open `/2026/postseason`. No race table scrolls sideways, and 6th still reads "Level" with
  "1 game in hand" under it.

## Result

- Step 1: the five stale tests now match the current app, and `team-stats-null`, `game-rotations`,
  `game-rotations-layout`, `cancelled-season` and `game-box-score` pass (35 tests).
- Step 2:
  - The `inline` centre column of `ComparisonRow` is 7rem below `sm`, so "Second-chance points" breaks only between
    words.
  - The race's in-hand line wraps, so the 1024px race tables no longer scroll sideways.
  - The chip check allows 3 lines below 640px.
  - Once the word split was fixed, `game-flow-layout` showed a second stale check behind it. It expected the Team
    comparison rows to have 8px and 12px top padding, but inline rows use `py-1.5` (6px) at every width since
    `621155a`. Both checks now expect 6px.
- Checks on the local target:
  - the eight originally failing specs, `game-overview`, `game-detail-layout`, `game-four-factors`, `postseason` and
    `responsive`: 265 passed, 0 failed;
  - frontend lint and the root build pass.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6604,"specSha256":"d2746f5f71440df49336abca902a289850bfc4a56f1bbd89cc657500681c9495","branch":"refs/heads/fix/failing-browser-tests","head":"38164eb21b228b2bd9191643c9e554b2408c81c9","baseRef":"refs/heads/master","baseCommit":"38164eb21b228b2bd9191643c9e554b2408c81c9","sourceTree":"81cf0cc241965f2ef38eb5448ddd45f893219b66","absentOptional":[]} -->
