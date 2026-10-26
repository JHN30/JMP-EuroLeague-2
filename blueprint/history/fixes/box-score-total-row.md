# Fix: Box score Total row

**Type:** Fix
**Status:** verified
**Branch:** fix/box-score-total-row

## The problem

The Traditional box score's Total row is wrong or unexplained on every played game
(`frontend/src/games/GameDetailPage.jsx`, `BoxScoreTable`).

1. **Total +/- is five times the margin.** The row renders the feed's total
   `plusMinus`, which is the sum of the players' +/- (five players are always on the
   court). E2026 game 66, Partizan 85-82 Crvena Zvezda (OT), shows +15 / -15 instead
   of +3 / -3. Before about E2010 the feed has no total +/- at all, so the cell is a
   dash although the margin is known.
2. **The Total row does not match the column sums.** The box-score API already
   returns each side's `statsKind: "team"` row (team rebounds, team turnovers, team
   PIR, and in early seasons team steals, assists and fouls), but the page only reads
   the `total` row. The total includes the team row, so the player rows never add up
   to it. Game 66: Partizan players 33 REB / 80 PIR vs Total 38 / 85; Zvezda players
   11 TO vs Total 14. Sampled games in E2000, E2005, E2012, E2019, E2025 and E2026 all
   have a team row with non-zero values.

## The fix

Frontend only. The box-score API keeps passing the feed's values through unchanged.

- **Total +/-:** the Total row shows the side's own total points minus the opponent's
  total points, from the two `total` rows already on the page (so it reads +3 / -3
  for game 66, and works for early seasons too). A dash when either total's points is
  missing. Player +/- cells are unchanged.
- **Team line:** in the Traditional view, a row labelled `Team` sits directly above
  Total, styled as a quieter footer row than Total. It shows a value only in the count
  columns (REB, OREB, DREB, AST, STL, TO, BLK, BLKA, FC, FD, PIR) and only where the
  team row's value is non-zero; every other cell is blank (MIN, shooting columns,
  +/-). The line is left out when the side has no team row or the team row has no
  non-zero value. A short hover tip on the label explains it (rebounds and turnovers
  credited to the team rather than a player, such as a shot-clock violation).
- **Advanced view:** no Team line. None of its columns come from the team row, and it
  has no +/- column, so it is unchanged.

Must not break: game highs (still players only), the Overview and Team comparison
tabs (they read the `total` row and do not use +/-), the mobile pinned first column
(the `Team` label uses the same `box-score-fade` treatment as `Total`), and the
Did-not-play list.

## Build steps

- [x] 1. Show the margin in the Total +/- cell and add the `Team` footer line to the
  Traditional box score. Done when: E2026 game 66 shows Total +/- of +3 for Partizan
  and -3 for Zvezda; a Team line above Total shows Partizan REB 5, OREB 4, DREB 1,
  PIR 5 and Zvezda REB 4, OREB 2, DREB 2, TO 3, PIR 1, with blank cells elsewhere;
  player rows plus the Team line add up to Total in every count column; an early
  season game (for example E2005 game 1) shows a real Total +/- instead of a dash;
  the Advanced view is unchanged.

## Verify

- Open E2026 game 66, Box score tab: check the +/- totals and that each count column
  (REB, TO, PIR) adds up to Total with the Team line included.
- Switch to Advanced: no Team line, Total row as before.
- Open an E2005 game: Total +/- equals the score margin, and the Team line shows any
  team steals or fouls it has.
- Phone width: the `Team` label behaves like `Total` in the pinned first column.
- Browser tests (local DB): `game-box-score.spec.js game-advanced-box-score.spec.js
  game-box-score-layout.spec.js responsive.spec.js`; add a case to
  `game-box-score.spec.js` with a fixture `team` row and a non-trivial total
  +/- to cover both changes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3770,"specSha256":"45eed6972d8ff391a78260411b59bb2bd2b29b69ae66cc9adebab225b2654575","branch":"refs/heads/fix/box-score-total-row","head":"361529b19dce82aa8a7ac6bd6fb9413fbec98f90","baseRef":"refs/heads/master","baseCommit":"361529b19dce82aa8a7ac6bd6fb9413fbec98f90","sourceTree":"006b121ff06062854fd1371376173355405354a0","absentOptional":[]} -->
