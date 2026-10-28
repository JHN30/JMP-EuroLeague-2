# Fix: Game tab not-played messages

**Type:** Fix
**Status:** verified
**Branch:** fix/game-tab-not-played-messages

## The problem

Since `ee69961`, an unplayed game shows only its Overview tab:
- the tab strip gets `UNPLAYED_TABS`;
- `GameDetailPage` forces `tab` to `"overview"` when `game.played === false`.

**Unreachable checks.** Five tab bodies still check `!game.played` and print "… isn't available until this game is
played." None of them can render for an unplayed game:

| Tab | Where |
| --- | --- |
| Rotations | `frontend/src/games/RotationsTab.jsx` (`RotationsTab`) |
| Game flow | `frontend/src/games/GameDetailPage.jsx`, the `tab === "game-flow"` branch |
| Team comparison | `GameDetailPage.jsx`, `TeamComparisonTab` |
| Shooting | `GameDetailPage.jsx`, the `tab === "shooting"` branch |
| Play-by-play | `GameDetailPage.jsx`: the `tab === "play-by-play"` unplayed branch, and the `played` prop and `!played` check of `PlayByPlaySection` |

**Misleading messages.** Two messages fire on missing data, not on an unplayed game, so for a played game with gaps they
wrongly say it hasn't been played:

| Message | Shows when | Where |
| --- | --- | --- |
| "Team comparison isn't available until this game is played." | a played game has no team totals | `GameDetailPage.jsx`, `TeamComparisonRows` |
| "Period scores aren't available until this game is played." | a played game has no period scores (Overview, Game flow) | `frontend/src/games/gameFlow.jsx`, `PeriodTable` |

## The fix

- **Remove the five unreachable checks.**
  - The Game flow, Shooting and Play-by-play branches go straight to their loading, error and loaded states.
  - `PlayByPlaySection` loses its `played` prop; its "isn't available for this game yet" empty state stays.
  - The tab-strip rule and the `tab` fallback stay; they are what makes these checks unreachable.
- **Reword the two data-missing messages:**
  - `TeamComparisonRows`: "Team totals weren't recorded for this game."
  - `PeriodTable`: "Period scores weren't recorded for this game."
  - The forfeit message stays as it is.

Must not break:
- the unplayed Overview preview and its Compare link;
- the cancelled-season message;
- the played-game tabs and their loading, error and retry states.

No API or data changes.

## Build steps

- [x] 1. **Remove the checks and reword the two messages.**

  **Done when:**
  - No "until this game is played" text is left in `frontend/src/games`.
  - Frontend lint and the root build pass.
  - The game specs pass on the local target: `game-overview`, `game-flow-layout`, `game-four-factors`,
    `game-scoring-profile`, `game-rotations`, `game-rotations-layout`, `game-shooting`, `game-shooting-layout`,
    `game-play-by-play`, `game-play-by-play-layout`, `game-detail-layout`, `cancelled-season` and `skeleton-loading`.

## Verify

- Open an unplayed game: only Overview, with the preview and the Compare button.
- Open a played game: all seven tabs load as before.
- The specs above pass.

## Result

- Removed the five unreachable checks (Rotations, Game flow, Team comparison, Shooting, Play-by-play, including the `played`
  prop of `PlayByPlaySection`), and reworded the two messages to "Team totals weren’t recorded for this game." and
  "Period scores weren’t recorded for this game."
- No "until this game is played" text is left in `frontend/src/games`.
- Frontend lint and the root build pass.
- The 13 named specs on the local target: 185 passed, 2 failed (`game-flow-layout` "compact below 640px" and the
  `skeleton-loading` Leaders fallback). Both passed when rerun alone, so they were load flakes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3621,"specSha256":"d57bf038d94b53c8a7484d26993d43a26dd2a39e64cf2c1b439a48fe7b1368e5","branch":"refs/heads/fix/game-tab-not-played-messages","head":"9fe5c414f986d42641f2dac0f0080b36961cc9d2","baseRef":"refs/heads/master","baseCommit":"9fe5c414f986d42641f2dac0f0080b36961cc9d2","sourceTree":"be9d8d2836b10c7c02b40f7a696f4017c9dbab12","absentOptional":[]} -->
