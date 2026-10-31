# Fix: Team Games tab columns and Next row

**Type:** Fix
**Status:** verified
**Branch:** fix/team-games-tab-columns-and-next-row

## The problem

On the team page's Games tab (`/:season/teams/:clubCode`, Games), the two columns Next games and Latest results look
unfinished at desktop width:

- Latest results has its All / Wins / Losses filter on a row of its own under the heading, so with eight rows each it
  is about 45px taller than Next games. `compact-team-page-on-desktop` matched them by stretching both panels and pinning
  "Show all" to the foot, which leaves an empty band in Next games between its last row and its "Show all" button. The
  button floats in that empty space.
- The next game has no look of its own beyond the small "Next" badge. The orange outline in the reported screenshot is
  every row's hover border (the row also lifts 2px), which on the first row reads as a box inside the panel.

## The fix

`frontend/src/teams/TeamGamesSection.jsx` only; no data, query or API changes.

1. **Result filter in the heading.** From `sm` the All / Wins / Losses tabs sit at the right end of the Latest results
   heading row, in place of the bare game count, and each tab carries its count ("All 9", "Wins 3", "Losses 6"; the
   number muted). Below `sm` the heading has no room, so the filter stays on its own row under the heading as today (the
   other copy is hidden, as the league profile does with its badges). The tabs keep their tablist role, labels, the
   `team-results-panel` they control, and the filtering. Next games keeps its count in the heading.
2. **Equal columns without stretching.** Both panels are now a heading row, up to eight rows, then "Show all", so they
   line up on their own: the panels go back to their own height (`items-start`), the shared expanded state goes back
   into each column, and "Show all" sits straight under the last row again. The two heading rows get the same height
   (the count's row is as tall as the filter's), so two full columns are level to the pixel. With fewer than eight
   games a column is simply shorter.
3. **The next game.** The first upcoming row gets a light primary tint (background and border) so it stands out without
   hovering, alongside its "Next" badge. Every row keeps its hover border and lift.

Must not change: the phone layout below `sm` (filter row under the heading), the form strip, the one-line rows from
`lg`, "Show all" / "Show fewer", the empty and failing states, and the Overview tab.

## Build steps

- [x] 1. **Columns and Next row.** The filter moved into the heading from `sm` with counts on the tabs, the stretching
  removed, "Show all" under the last row, equal heading heights, and the tinted next-game row (`TeamGamesSection.jsx`).
  Done when: lint passes and at 1440px the two columns end level with no empty band, and the next game is tinted.
- [x] 2. **Browser checks.** Update `team-shooting-games-layout.spec.js`: the filter is in the heading row from 640px
  and under it below 640px, tab names carry counts, the two full columns are the same height with "Show all" within
  16px of the last row, the next-game row is tinted, and filtering and "Show all" still work.
  Done when: that spec plus `responsive.spec.js` pass against the local database.

## Verify

- `npm run build` (root) and `cd frontend && npm run lint` pass.
- `team-shooting-games-layout.spec.js` and `responsive.spec.js`, after `/api/health` reports `"target":"local"`.
- By hand at 1440px: open a club's Games tab. Next games and Latest results end level, "Show all" sits right under each
  list, the filter reads "All 9 · Wins 3 · Losses 6" beside the Latest results heading, and the next game is tinted. At
  390px the filter is under the heading.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3748,"specSha256":"adb3912bac2f7ad0d0a1d7591de19f8a6d97170c568c080375db9c95c495bfae","branch":"refs/heads/fix/team-games-tab-columns-and-next-row","head":"78d8490092e46bad19eea64c07ab9def2b350244","baseRef":"refs/heads/master","baseCommit":"78d8490092e46bad19eea64c07ab9def2b350244","sourceTree":"a2b351d05ef5d01b8ad443e59810d23a250576ae","absentOptional":[]} -->
