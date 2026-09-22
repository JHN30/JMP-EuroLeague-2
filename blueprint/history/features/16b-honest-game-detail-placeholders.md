# Feature: Honest game-detail placeholders

**From build-plan:** feature 16b
**Build attempt:** 1
**Status:** verified

**Branch:** feature/honest-game-detail-placeholders

## Goal

Add truthful Shooting and Play-by-play sections to Game Detail instead of
fabricating a shot chart or an event-level log the archive doesn't hold.
Each section explains what's missing and points at the closest real data
already returned by the existing box-score endpoint: two-point/three-point/
free-throw splits for shooting, and period scores for play-by-play. Both are
already fetched by `GameDetailPage`'s `boxScoreQuery` (`teamStats` includes
`fieldGoalsMade2/Attempted2`, `fieldGoalsMade3/Attempted3`,
`freeThrowsMade/Attempted`; `periodScores` is already returned but currently
unused) - no new endpoint or query is needed.

## In scope

- A "Shooting" section on Game Detail: a per-team derived shooting-splits
  table (2PT, 3PT, FT: made-attempted and percentage) built from the
  already-fetched `teamStats` "total" rows, explicitly labelled as derived
  from the box score rather than an official shot chart, with one honest
  sentence explaining that shot-location data isn't tracked for this
  archive.
- A "Play-by-play" section on Game Detail: a period-by-period score table
  (using `formatPeriod` for period labels) built from the already-fetched
  `periodScores`, with one honest sentence explaining that event-level
  play-by-play isn't tracked and this is the period-level flow instead.
- Both sections follow the box score's existing loading/error state (reuse
  `boxScoreQuery`'s status) and use `EmptyText` for a scheduled game (no
  totals or periods yet).
- Confirm venue, attendance, and officials remain absent from the page
  (they already are - no blank-row regression to introduce).

## Out of scope

- Any new backend endpoint or schema change - both data sources already
  exist in `getBoxScore`'s response.
- The guideline's full tab-bar restructuring of Game Detail (moving
  Shooting/Play-by-play into an actual tab strip, a sticky-first-column full
  box score, a game-flow chart) - that's feature 17c.
- Season and profile coverage integration (16c).
- Any change to the existing Team stats / Player stats tables or the
  compact coverage panel from 16a.

## Build loop

Follow `workflow.stepReview: "feature"` (self-review, one final packet) and
`workflow.checkpointCommits: "disabled"` (no per-step commits; `/complete`
makes the one feature commit).

## Build steps

- [x] 1. Add a `ShootingSplitsSection` to `GameDetailPage.jsx`: derive
      made/attempted/percentage for 2PT, 3PT, and FT per team from
      `boxScoreQuery.data.teamStats`'s "total" rows (already fetched),
      render as a small table per team inside a `Panel`, with a caption
      sentence: "Shot-location data isn't tracked for this archive - these
      are the box-score shooting splits." When there are no total rows yet
      (scheduled game), render `EmptyText` explaining shooting data isn't
      available until the game is played.
      **Done when:** `npm run build` passes and the section renders correct
      made/attempted/percentage values for a played game, verified via CDP
      against a real game.

      Verified via CDP against E2025 game 4 (Dubai Basketball vs Partizan):
      table rendered "23.0-45.0 (51.1%)" / "11.0-20.0 (55.0%)" /
      "10.0-12.0 (83.3%)" for the home team's 2PT/3PT/FT, correctly derived
      from the box score's already-fetched totals.
- [x] 2. Add a `PlayByPlaySection` to `GameDetailPage.jsx`: render
      `boxScoreQuery.data.periodScores` (already fetched) as a period-by-
      period score table (one row per team, one column per period using
      `formatPeriod`), with a caption sentence: "Play-by-play isn't tracked
      for this archive - here's the period-level scoring flow instead."
      When there are no period rows yet (scheduled game), render
      `EmptyText` explaining play-by-play isn't available until the game is
      played.
      **Done when:** `npm run build` passes and the section renders the
      correct period scores for a real played game, verified via CDP.

      Verified via CDP on the same game: table rendered Q1-Q4 columns with
      "28 19 21 21" for the home team and "18 22 16 20" for the away team,
      matching the period scores already returned by the box score.
- [x] 3. Place both new sections after the existing Player stats tables in
      the same page, gated on `boxScoreQuery`'s existing loading/error
      states (no new query, no new loading/error branch). Confirm no
      venue/attendance/officials field is rendered anywhere on the page.
      **Done when:** `npm run lint` and `npm run build` pass, and a full
      CDP pass over one played game and one scheduled game shows the
      correct state for both sections in each case.

      Confirmed no venue/attendance/officials text anywhere on the page
      (grep of the component and CDP body text). For a scheduled E2026 game
      (no box score yet), both sections correctly rendered their
      `EmptyText` ("...aren't/isn't available until this game is played")
      instead of an empty or broken table.

## Files / areas

- `frontend/src/games/GameDetailPage.jsx`

## Data / contracts

None - both sections consume fields the existing `GET
/:seasonCode/games/:gameCode/box-score` response already returns
(`teamStats[].fieldGoalsMade2/Attempted2/Made3/Attempted3`,
`freeThrowsMade/Attempted`, and `periodScores[].side/periodNumber/score`).
No API or persisted-data change.

## Testing

No unit test runner is configured. Verification is `npm run lint`,
`npm run build`, and CDP evidence against a played game and a scheduled
game.

## Notes for the AI

- Reuse `formatPercentage` and `formatPeriod` from `frontend/src/lib/
  format.js` rather than hand-rolling either.
- `teamStats` rows already carry `side` ("local"/"road"); reuse the same
  `side === "local" ? teamName(game.localTeam) : teamName(game.roadTeam)`
  pattern `TeamStatsTable` already uses for team names.
- Derived-value labelling matters here: never present the shooting-splits
  table as if it were official shot-location data - the caption sentence is
  the label, not a badge invented for this feature alone.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6251,"specSha256":"931103116ccafdb6f4e61c33ea2dcf93332905371bd425aa84ee17dd1729e239","branch":"refs/heads/feature/honest-game-detail-placeholders","head":"54aaf4512f5262f9b149f63ef525986a74655562","baseRef":"refs/heads/master","baseCommit":"54aaf4512f5262f9b149f63ef525986a74655562","sourceTree":"52384ea26eb8010a40e3724f43d49c013f6d72e8","absentOptional":[]} -->