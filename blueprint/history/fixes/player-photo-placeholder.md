# Fix: Player photo placeholder

**Type:** Fix
**Status:** verified
**Branch:** fix/player-photo-placeholder

## The problem

A player without a photo shows an empty grey circle, or nothing at all, in the small round player pictures. This covers
most players before about 2015 locally. The large player portraits already show a person silhouette in that case
(`Silhouette` in `frontend/src/lib/PlayerPortrait.jsx`). That covers the Players page, the player hero and the team roster.
The small round pictures don't:

- **`Avatar`** (`frontend/src/leaders/LeaderParts.jsx`) draws only its `bg-neutral` circle. Its player uses:
  - Leaders: category cards, full boards and Advanced boards.
  - Compare: player overview, pair header, rosters and team overview.
- **Records** (`Holder` in `frontend/src/records/RecordParts.jsx`) draws no picture at all for a player record without a
  portrait, so its name shifts left of the others.
- **The Compare player picker's round photo** (`PickerImage` with `round` in `frontend/src/comparisons/PickerPanel.jsx`)
  shows an empty space.

## The fix

- **Reuse the silhouette.** Export the existing `Silhouette` from `PlayerPortrait.jsx` and change nothing else there. It looks
  the same as the large portraits in both themes (`text-base-content`, 20% opacity). No new artwork.
- **`Avatar`.** A player avatar (not `crest`) shows the silhouette inside its circle in two cases:
  - there is no image URL;
  - the image fails to load (`RevealImage` hides itself on error; `Avatar` follows that through `onError`).
  - A photo and the silhouette never show together. Crest avatars are unchanged, and an empty crest stays empty.
- **Records.** `describeRecord` adds `isClub`. `Holder` always renders the player `Avatar`, which shows the silhouette when
  there is no portrait. Club records keep their crest-only behavior.
- **Picker.** A `round` `PickerImage` with no usable photo shows the same silhouette circle. Crest pickers keep their empty
  spacer.
- **Decorative only.** The silhouette stays `aria-hidden`; names already identify the player. No size or layout change
  beyond Records gaining its missing picture slot.
- Box scores, game pages and the Home/Overview leader lists show no player photos today, so they are unchanged.

## Build steps

- [x] 1. Export `Silhouette` and give the player `Avatar` the silhouette fallback.
  - Done when:
    - `/2002/leaders` (cards, a full board and Advanced) and `/2002/compare?view=players` show silhouettes instead of
      empty circles.
    - `/2025/leaders` photos are unchanged, and team crests are unchanged.
- [x] 2. Records holder and the round picker image.
  - Done when:
    - On `/2025/records` with player seasons and PER, older players without portraits show the silhouette, aligned with
      the others.
    - Club records still show crests.
    - The Compare player picker shows silhouettes for players without photos.
- [x] 3. Regression.
  - Run against the local target only, by exact path: `e2e/leaders.spec.js`, `e2e/leaders-layout.spec.js`,
    `e2e/records.spec.js`, `e2e/records-layout.spec.js`, `e2e/compare.spec.js`, `e2e/compare-player-layout.spec.js`,
    `e2e/compare-team-layout.spec.js` and `e2e/responsive.spec.js`.
  - Done when they all pass. Root build and frontend lint also pass.

## Verify

- Open `/2002/leaders`, a full leaderboard and the Advanced tab: silhouettes instead of empty grey circles.
- Open `/2025/records`, then Player seasons and PER: older players without portraits show silhouettes.
- Open `/2002/compare`, then Players: the picker and the compared players show silhouettes.
- Switch to the dark theme: the silhouette adapts.
- Open `/2025/leaders`: the photos are unchanged.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3782,"specSha256":"087477fc7b32586bd246930294aecf9ca74eca25f0a863d54ff16c9e79fe6553","branch":"refs/heads/fix/player-photo-placeholder","head":"b2e917dc76f5bd2b528c63b7557e8a6032fe0d6e","baseRef":"refs/heads/master","baseCommit":"b2e917dc76f5bd2b528c63b7557e8a6032fe0d6e","sourceTree":"07eff0787df20a19469d32bf5ad77dfa09c485fa","absentOptional":[]} -->
