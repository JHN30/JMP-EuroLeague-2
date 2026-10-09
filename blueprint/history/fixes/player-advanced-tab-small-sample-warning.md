# Fix: Player Advanced tab small-sample warning

**Type:** Fix
**Status:** verified
**Branch:** fix/player-advanced-tab-small-sample-warning

## The problem

On the player page's Advanced tab (`frontend/src/players/PlayerAdvancedSection.jsx`) a small sample is handled three different ways, and they contradict each other:

- The "Not reliable yet: only N rounds played this season, so this is mostly noise" note (`EarlySeasonNote`) appears only inside the On/off section and inside the RAPM section. The scorecard above them, and the round-by-round chart, depend on the same early season and show no warning.
- The scorecard's On/off card hides its number when the player has under 300 minutes on court (`ON_OFF_MIN_SECONDS`, line 25 and the `onOffNet` value near line 196) but still draws the gauge and a verdict ("Above average, 63rd of 229"), because the API ranks players from 20 minutes (`ranks.*.minMinutes`). A player with 55 minutes therefore shows a verdict and no number.
- The On/off section below replaces the whole card with "Sample too small to show: N minutes on court, at least 300 needed." (`OnOffCard`, near line 278), while the RAPM section, whose own minimum is 20 minutes, shows a full ranked verdict for the same sample. A Partizan player with 104 minutes has no on/off but a "Very good, 41st of 229" RAPM.

The user wants the figure shown, with a clear "not reliable" warning, instead of hiding it, and the early-season warning stated once at the top of the tab.

## The fix

All in `frontend/src/players/PlayerAdvancedSection.jsx`; no API, backend or data change.

1. **One early-season note at the top.** When the response says `earlySeason`, render `EarlySeasonNote` once, directly under the scope strip and above the scorecard (outside the scope panel's section stack, so it is the first thing under the strip), with its current wording: "Not reliable yet: only N rounds played this season, so this is mostly noise." (the ratings and ranks wording the user asked for may replace "this is mostly noise": "so these ratings and ranks are mostly noise"). Remove the copies from `OnOffSection` and `RapmSection` and the `earlySeason` and `roundsPlayed` props they only needed for it. In the branch that has no rounds ("Advanced stats are not available yet for this player", which can still show the RAPM section) render the same note above that message when `earlySeason`.
2. **Scorecard On/off card shows its number.** Show `netRatingDiff` of the club with the most on-court time whenever that club has on-court seconds (`onSeconds` greater than 0); an absent or zero `onSeconds` still gives "—". The gauge and verdict stay as the API ranks them. When the on-court time is under `ON_OFF_MIN_SECONDS`, the card also shows a short line, in the warning tone used by the note, such as "Based on only 104 of 300 minutes on court." (minutes rounded as the section already rounds them). This is shown in any season, not only early in it. `ScoreCard` takes the line as an optional prop; the other five cards are unchanged.
3. **On/off section shows its numbers.** `OnOffCard` no longer swaps itself for the "Sample too small to show" card. It shows the net rating, the on and off rows and the explanation as for a large sample, plus the same minutes line under its header when under 300 minutes. A club row with no on-court seconds (null or 0) is not shown, and when none remains the section shows "No on/off data for this scope." as it does for an empty list. The verdict pill on the main club's card stays tied to the API rank.
4. **RAPM unchanged except the note.** It keeps its own 20-minute minimum and its "Sample too small to show" and "No RAPM estimate for this player." messages. Its early-season note is the top one.
5. **Phone layout.** The note and the new line wrap by whole words at 320px, nothing is wider than its card, the page does not scroll sideways, and the gauge and its captions are unchanged. The note under the strip uses the same spacing as the page's other stacked blocks (a `gap-6` row, like the strip and the panel).

Must not break: the scorecard, chart, on/off and RAPM layouts built in 31j-iii; the verdicts and thresholds themselves (`verdictFor`, the 20-minute rank minimum, `ON_OFF_MIN_SECONDS` as the minutes line's threshold); other pages.

## Build steps

- [x] 1. **The note, the scorecard line and the on/off cards.** Make the changes above. Update `frontend/e2e/player-advanced-layout.spec.js`: the states test now expects "Based on only 55 of 300 minutes on court." in place of "Sample too small to show: 55 minutes on court" and the scorecard's on/off card showing a number and the same line; add checks that the early-season note appears exactly once, above the scorecard, and not inside the on/off or RAPM sections; keep the existing width checks (the on/off header, the RAPM rows, no sideways scroll at 320px). *Done when:* with an early season and 55 on-court minutes, the tab shows one note under the scope strip, the scorecard's On/off card shows its number with "Based on only 55 of 300 minutes on court.", the On/off section shows the club's card with the same line and no "Sample too small" text, a player with enough minutes shows no minutes line, RAPM shows no note of its own, and `player-advanced-layout.spec.js`, `player-career-layout.spec.js`, `player-statistics-layout.spec.js`, `player-overview-layout.spec.js`, `responsive.spec.js`, `detail-back-links.spec.js` and `smoke.spec.js` pass (one header-menu test in `responsive.spec.js` is known to be flaky and is rerun alone if it fails), then `cd frontend && npm run lint` and root `npm run build` pass.

## Verify

Open a player early in the season (few rounds, little on-court time) on the Advanced tab: one "Not reliable yet" note sits under the Regular season / All games strip; the On/off scorecard card shows a number and "Based on only N of 300 minutes on court."; the On/off section below shows the club's card with the same line; RAPM has no note inside it. Open a player with over 300 on-court minutes in a full season: no note and no minutes line. At 320px nothing scrolls sideways. Browser evidence is the Playwright spec; nothing here proves how it looks in the user's browser.

Verify command: none declared in `AGENTS.md`; the final gate is `cd frontend && npm run lint` plus root `npm run build`, with the Playwright files above.

## Built as

- As specced, in `PlayerAdvancedSection.jsx`. `EarlySeasonNote` is rendered once, under the scope strip and above the scorecard (and above the "Advanced stats are not available yet" message when there are no rounds); the copies in the on/off and RAPM sections and their `earlySeason` and `roundsPlayed` props are gone. Its wording was then changed at the user's request to drop the round count: "Small sample of data: these ratings and ranks may not be accurate yet, and they can change a lot early in the season." (the note no longer takes a round count, so the component has no props).
- The scorecard On/off card shows the net rating of the club with the most on-court time whenever that club has on-court seconds, with the gauge and verdict as the API ranks them, and a `SmallSampleLine` ("Based on only 104 of 300 minutes on court.", warning tone) when under 300 minutes, in any season. `ScoreCard` takes it as an optional `caution` prop. The on/off section's cards show the same line under their header and no longer swap to "Sample too small to show"; a club with no on-court seconds is not shown, and with none left the section says "No on/off data for this scope."
- RAPM keeps its 20-minute minimum and messages; in the no-rounds branch it is still shown without a rank, as before.
- The layout spec's states test now expects the minutes line twice (the scorecard card and the section card), the scorecard card's number (+8.0), the note exactly once above the scorecard and outside the sections (also with no rounds), and no minutes line for a full sample. `e2e/player-advanced-layout.spec.js` was converted to LF line endings while it was edited.
- Checked in screenshots at 320px with a patched 104-minute sample: the note, the scorecard card and the on/off card wrap by whole words and nothing is clipped.
- Checks run: `player-advanced-layout.spec.js` (3 passed), and with `player-career-layout.spec.js`, `player-statistics-layout.spec.js`, `player-overview-layout.spec.js`, `responsive.spec.js`, `detail-back-links.spec.js` and `smoke.spec.js` 132 passed in all, `cd frontend && npm run lint`, root `npm run build`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8564,"specSha256":"87e2d1f7a109fd4ee7d59f3005259ec82b44d935e922606010950884cd1ce63e","branch":"refs/heads/fix/player-advanced-tab-small-sample-warning","head":"30a16b373214a7b0581de7ac652f9ce019bdb58a","baseRef":"refs/heads/master","baseCommit":"30a16b373214a7b0581de7ac652f9ce019bdb58a","sourceTree":"c606a1ab813f092893ff0974f6d1b02be7974985","absentOptional":[]} -->
