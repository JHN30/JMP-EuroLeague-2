# Feature: Standings tiers and postseason completion

**From build-plan:** feature 34c-ii
**Build attempt:** 1
**Status:** verified
**Branch:** feature/standings-tiers-and-postseason-completion

## Goal

Make Standings and Postseason take their qualification lines, race cutoffs and bracket rules from the season's format (34b)
instead of the hard-coded "top 6 / 7-10 / best-of-five" numbers. A series leader is no longer treated as the winner: only a
club that reaches the stage's win target advances or becomes champion. Series are matched inside their own stage. Placements
follow the season's third-place policy. `E2023`-`E2026` look and read the same as today wherever their results are final.

## In scope

- **Tier helper:** `tableTiers(format, stageCode)` and `tierForPosition(position, tiers)` in
  `frontend/src/lib/seasonFormat.js`, from the stage's `qualification` rules. Labels for modern seasons stay "Direct to
  playoffs", "Play-in tournament" and "Out of playoff contention". A single-table stage without Play-In gets its own
  correct tiers, for example top 8 to the Playoffs, as a side effect of the same rule.
- **Standings, from the tiers:**
  - `StandingsTable.jsx`: tier rows.
  - `RaceSnapshotTable.jsx`: row tint.
  - `RaceChart.jsx`: cutoff bands.
  - `RaceInsightCards.jsx`: "qualified rounds".
  - `StandingsKpiStrip.jsx`: "Playoff cutoff" uses the last direct place.
- **Postseason race, from the tiers:**
  - `bracketModel.js` `raceStatus`: cutoffs passed in instead of the constants.
  - `RacePanel.jsx`: intro text and divider lines.
- **Bracket completion (`bracketModel.js`):**
  - A slot is `done` and has a winner only when a club's wins reach the stage's `winTarget` (PI 1, PO 3, FF 1 for
    modern seasons). A series with a leader but no clinch is `live` and advances nobody.
  - Series are matched within their stage (`phaseCode`), never across stages.
  - The third-place slot exists only when the format's `thirdPlaceGame` is not `false`.
  - The champion is the clinched winner of the final.
  - Seeds come from the tiers: the direct places and the Play-In range.
- **Postseason page (`PostseasonPage.jsx`):**
  - "Regular season done" comes from the format: the RS stage is `loaded`, or a later stage has played games. It no
    longer comes from an empty remaining list.
  - The step subtitles ("Seeds 7 to 10", "Best of five", "Semifinals and final") come from the format.

## Out of scope

- Seasons without Play-In or with groups: their bracket structures and group tables (34d onward). For such a season the
  page keeps today's modern structure until its leaf. Only the tier helper already gives correct bands.
- A general tiebreaker engine: official positions stay the authority. Statistics scopes and other pages (34c-iii).
- E2019/E2021 context (34f, 34g). New dependencies, API fields or layout changes.

## Build loop

- Work on `feature/standings-tiers-and-postseason-completion`. `workflow.stepReview: feature`, then one review packet;
  `workflow.checkpointCommits: disabled`; `/complete` makes the commit.
- Browser checks run against the local target only (`/api/health` `"target":"local"`); the user allows restarting the
  backend if it stops after a reload. Never open `.env`. Edit with byte-preserving tools (the repo checks out CRLF).

## Build steps

- [x] 1. **Tier helper and Standings.** Add `tableTiers` and `tierForPosition`, then replace the 6/10 constants in
  `StandingsTable.jsx`, `RaceSnapshotTable.jsx`, `RaceChart.jsx`, `RaceInsightCards.jsx` and `StandingsKpiStrip.jsx`.
  Done when:
  - `E2025` and `E2026` standings show the same tier rows, tints, chart bands and cutoff card as before.
  - `E2018` shows top 8 as direct with no Play-In tier.
  - `standings-table-layout.spec.js` and `standings-race-layout.spec.js` pass, and frontend lint passes.
- [x] 2. **Bracket completion and race.** Update `bracketModel.js` (clinch by win target, stage-scoped matching,
  third-place policy, seeds from tiers, cutoffs for `raceStatus`), `RacePanel.jsx` and `PostseasonPage.jsx`.
  Done when:
  - `E2023`-`E2025` show the same champion, bracket and placements as before. E2025 still has no third-place slot.
  - `E2026` still shows its projected bracket and race.
  - A mocked live Playoffs series at 2-1 shows as live and puts nobody in the semifinal. At 3-1 the winner advances.
  - `postseason.spec.js`, `postseason-layout.spec.js` and a new focused `postseason-clinch.spec.js` (route-mocked series)
    pass.
  - Root build and frontend lint pass.

## Files / areas

- `frontend/src/lib/seasonFormat.js` (tier helpers); `frontend/src/standings/StandingsTable.jsx`, `RaceSnapshotTable.jsx`,
  `RaceChart.jsx`, `RaceInsightCards.jsx`, `StandingsKpiStrip.jsx` (and their parents only to pass the tiers or format);
  `frontend/src/postseason/bracketModel.js`, `RacePanel.jsx`, `PostseasonPage.jsx`; new `frontend/e2e/postseason-clinch.spec.js`.
- Reads `useSeasonFormat` (34c-i) and the 34b format response. No backend change.

## Data / contracts

- **Tiers:** a table stage's qualification rules map positions to tiers:

  | Rule | Tier |
  |---|---|
  | `kind: "direct"` to `PO` or `FF` | `postseason` |
  | `kind: "playIn"` | `playin` |
  | Not covered by any rule | `out` |

  Group and cross-group rules (`within: "group"`, `bestOfPosition`) are left to 34h and later, and give no tiers here.
  When the format is unavailable, no tiers are drawn; the table, race and bracket still render.
- **Clinch:** clubAWins or clubBWins ≥ the stage `winTarget`. The `winnerClubCode` from `app_postseason_series` is only
  the leader. When `winTarget` is null (E2000), nothing is clinched in this leaf.
- **Matching:** a pairing is looked up only among series of the slot's `phaseCode`.
- **Placements:**
  - Champion and runner-up come only from a clinched final.
  - Third and fourth place come only from a played third-place game.
  - Without one, both semifinal losers share "Final Four".
- All text is fixed or comes from format values, rendered as React text.

## Testing

- No unit runner or Verify command. Checks:
  - Root `npm run build` and `cd frontend && npm run lint`.
  - Playwright against the local target: `standings-table-layout.spec.js`, `standings-race-layout.spec.js`,
    `postseason.spec.js` and `postseason-layout.spec.js` by exact path, plus the new `postseason-clinch.spec.js`.
  - A before/after comparison of the bracket model's output for E2023-E2025 from the real API (scratch script, not
    committed).
- No production evidence is claimed.

## Notes for the AI

- Keep markup and classes unchanged; change only the numbers' source and the advancement rule.
- Run Playwright specs by exact path (substring matching pulled in other specs last time).
- No AI attribution in commits.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6780,"specSha256":"e9e87b6a25debf1b8095a3565297484c30a4b35811999277479b53d89dca2a3b","branch":"refs/heads/feature/standings-tiers-and-postseason-completion","head":"8b35fd4345d71d49ad06ee6cfc88fbbf1d1d42df","baseRef":"refs/heads/master","baseCommit":"8b35fd4345d71d49ad06ee6cfc88fbbf1d1d42df","sourceTree":"b155d1998d64bc428f9ad1a063ebb83aea451127","absentOptional":[]} -->
