# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-10 [P3] unverified - Team stage shots include games the page does not count as played

**File:** backend/src/db/season-games.ts (`getTeamShots`)
**Found:** 2026-11-18 by /audit (scope: current; lens: all)
**Why it matters:** The old loader fetched shots only for games the page counts as played (`played` and both scores set). `getTeamShots` takes every game of the stage that has shot rows, as `getPlayerShots` already does. If the live data ever holds shots for a game in progress, the team courts would include them, while the loading label's game count and the free-throw totals would not. The local data shows none: 522 unplayed 2026 games, no shots, and the counts match for all 20 teams.
**Suggested fix:** If live games can carry shots, add `eq(games.played, true)` to `getTeamShots` (and to `getPlayerShots` for the player tab).
**Resolution:**
