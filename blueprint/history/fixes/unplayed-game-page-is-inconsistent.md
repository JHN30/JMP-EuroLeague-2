# Fix: Unplayed game page is inconsistent

**Type:** Fix
**Status:** verified
**Branch:** fix/unplayed-game-page-is-inconsistent

## The problem

On a game that has not been played yet ([GameDetailPage.jsx](../../frontend/src/games/GameDetailPage.jsx),
[OverviewTab.jsx](../../frontend/src/games/OverviewTab.jsx)) the tabs disagree with each other:

- **Box score** still fetches and renders both team sections with a "0 players" badge and
  "Box score not available yet." twice, plus the Traditional/Advanced switch, so it looks like a
  broken page.
- **Overview, Game flow, Team comparison, Shooting, Play-by-play** each say "isn't available until this
  game is played" in their own wording, and **Rotations** has its own empty state.
- All seven tabs stay clickable, and the page opens on an Overview that says nothing useful.

## The fix

Make the unplayed state one consistent thing, and give it something worth reading.

1. **Consistency (the bug).** For an unplayed, non-cancelled game, the tab strip shows only the tabs that
   can have content, and the box score request is not made. The cancelled-season message stays as is.
   Played games are unchanged.
2. **Link to Compare (the improvement).** The single Overview tab of an unplayed game is one short panel:
   "This game hasn't been played yet. See how these two teams compare." with a button to the Compare page
   opened on this game (`/compare?teamA=&teamB=&game=`), which already treats the host as team A. No preview is
   built on the game page, so no extra requests are made. A game whose teams are not set shows a plain line.

3. **Layout and back link.** The note is a "Game preview" panel with a heading, one line, and a button that is
   full width on a phone and sits beside the text from sm up, labelled with the TV codes ("Compare HTA and VIR").
   On Compare, a comparison opened from a game's button goes back to that game ("Back to Game") instead of
   to Compare's own picker labelled "Games". That holds while the comparison is still that game's; a team change
   brings back the usual back link.

Must not break: played-game tabs and their queries, the cancelled-season message, and the tab deep-links
(an unplayed game opened on a hidden tab falls back to the preview).

## Build steps

- [x] 1. Hide the tabs that need a played game on an unplayed game, skip the box score fetch for it, and
  fall back to Overview if the current tab is hidden.
  **Done when:** an unplayed game shows only the Overview tab; no `box-score` request is made; a played
  game still shows all seven tabs.
- [x] 2. Replace the "Overview isn't available" text for unplayed games with the note and the Compare button.
  **Done when:** an unplayed game shows the note and a button linking to Compare for the two clubs with the
  game code; a game whose teams are not set shows a plain line instead.

- [x] 3. Restyle the panel, and make Compare's back link return to the originating game.
  **Done when:** the panel reads well at 320px and on desktop; Back on Compare, opened from a game, goes to that game.

## Verify

Evidence: `npm run lint`, `npm run build`, and Playwright tests (`game-overview` incl. a new back-link test, `game-detail-layout`, `compare-layout`, `responsive`, `game-matchup-header`,
`game-flow-layout`, `game-four-factors`, `game-play-by-play-layout`) passed on the local DB.
The tests that expected the old "isn't available until played" texts were updated to the single-tab behavior.
The restyled panel was not looked at in a browser.

- Local DB (`/api/health` target `local`): open an upcoming game and a played game from the live season.
  Upcoming: one tab, the note and Compare button, no "0 players". Played: all tabs, unchanged.
- `cd frontend && npm run lint`, then `npx playwright test game-overview.spec.js responsive.spec.js`
  (add an unplayed-game case to the game specs if none exists).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3890,"specSha256":"e280583116898be3a83923935eff8ba9a7b6093092355f14536a662dda7ad3ba","branch":"refs/heads/fix/unplayed-game-page-is-inconsistent","head":"71be5ba385d81ca8a9f6298d1a49452c73ef6594","baseRef":"refs/heads/master","baseCommit":"71be5ba385d81ca8a9f6298d1a49452c73ef6594","sourceTree":"a9f323568ec032c98c4d4577469a73fbd60c8523","absentOptional":[]} -->
