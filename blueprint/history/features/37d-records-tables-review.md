# Feature: Records tables review

**From build-plan:** feature 37d
**Build attempt:** 1
**Status:** verified
**Branch:** feature/records-tables-review

## Goal

A read-only report, `blueprint/reference/37d-records-tables-review.md`, on the three records tables the warehouse publishes
and the app never reads:
- `app_records_player_seasons`
- `app_records_single_games`
- `app_records_team_seasons`

The report says what each table holds and how it compares with the records the app calculates itself in
`backend/src/db/season-records.ts`. It ends with one recommendation per table: use it, keep it for later, or ask the
warehouse to stop publishing it. No app code changes.

## In scope

- **What each table holds**, per table and metric:
  - the metrics, the row count and the rank range;
  - the seasons covered;
  - whether a value is a season total or a per-game average;
  - which phases are counted;
  - how ties are ranked.
- **Comparison with the app's records** for each matching metric. The app's lists come from `getRecordRows(kind, metric, per)`
  with the app's own matching metric key. The comparison covers:
  - how far the two top-50 lists overlap;
  - the top 10 side by side;
  - every disagreement, with its cause where the data shows one: per-game against total, the minimum-games rule, the
    phases counted, or a game the warehouse is missing.
- **What the warehouse has that the app does not,** and the reverse.
- **A recommendation per table,** with the reason. Plus a short message the user can forward to the warehouse agent if the
  recommendation is to stop publishing.

## Out of scope

- Any change to backend, frontend, schema, specs or the Records page.
- Adding the tables to the Drizzle schema.
- Any warehouse or database change. Every query is a `select`.
- Records of kinds the warehouse does not publish (team games).

## Build loop

`workflow.stepReview` is `feature`: build the steps in order and present one review packet at the end. Checkpoint commits are
disabled. `/complete` makes the feature commit.

## Build steps

- [x] 1. **Survey the tables.**
  - Run read-only queries with the scratchpad `q.mts` helper on the local `gold` database.
  - Pin down the meaning of each metric:
    - match a few rows against `app_season_stats_*` and the box scores to tell totals from averages, and to see which
      phases are counted;
    - check rank gaps and repeats to see how ties are ranked.
  - **Done when:** every metric of the three tables has its meaning, seasons and tie rule written in the report draft, each
    backed by a query result.
- [x] 2. **Compare with the app's records.**
  - A throwaway scratchpad script (not committed) calls `getRecordRows` for each matching kind and metric, with `total` and
    `game` where both exist. It diffs the top 50 against the warehouse rows by person or club, season and game.
  - Investigate every disagreement in the top 10, and a sample beyond it.
  - **Done when:** the report has, per table, the overlap, the top 10 side by side, and the explained differences.
- [x] 3. **Write the report and the recommendation.**
  - Finish `blueprint/reference/37d-records-tables-review.md` with these sections:
    - Summary
    - one section per table
    - What only one side has
    - Recommendation
    - Message for the warehouse agent, only when one is needed
  - Every number in the report comes from a query or script run in steps 1 and 2. The queries are listed at the end so
    the report can be checked.
  - **Done when:**
    - the report exists;
    - `git status` shows it and the spec as the only changes;
    - the backend build, frontend lint and frontend build still pass.

## Files / areas

- `blueprint/reference/37d-records-tables-review.md` (new; the only product of this feature)
- Read, not changed:
  - `backend/src/db/season-records.ts` (`getRecordRows`, the metric catalogue, `MIN_SEASON_GAMES`, `seasonMinGames`)
  - `backend/src/routes/seasons.ts` (the records routes)
- Scratchpad only, not committed: the query helper and the comparison script.

## Data / contracts

What the local data holds (`gold`, checked while writing this spec):

| Table | Rows | Metrics (50 rows each) |
|---|---|---|
| `app_records_player_seasons` | 200 | `assists`, `pir`, `points_scored`, `total_rebounds` |
| `app_records_single_games` | 200 | `assistances`, `points`, `total_rebounds`, `valuation` |
| `app_records_team_seasons` | 200 | `assistances`, `points`, `total_rebounds`, `valuation` |

- **Shared columns:** `metric`, `rank_ordinal`, `season_code`, the club code and name, and a `numeric` `value`.
- **Player rows** also carry the person key and player name.
- **Single-game rows** also carry the game code and `scheduled_at`.
- **Metric names:** the tables do not share one vocabulary (`assists` against `assistances`, `pir` against `valuation`), and
  the app uses its own keys. Step 2 maps each warehouse metric to the app's metric before comparing.

No API, schema or stored data changes, so no contract changes.

## Testing

- No app behavior changes, so there are no browser specs.
- The checks are the reproducible queries in the report, and the backend build, frontend lint and frontend build to show
  nothing else moved. All three passed on `master` at `d21e230` during the 37c completion.

## Notes for the AI

- Never open `.env`. The query helper loads it through dotenv from `backend`.
- Report only what the queries show. Mark a cause you cannot prove as unexplained instead of guessing.
- The recommendation is advice for the user. They decide, and nothing is sent to the warehouse from this feature.
- No em dashes in the report.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5653,"specSha256":"d2f3c914ca16af76d47227ec0b5b9d0df3c1bdd0335a77f3057566bddcc4f051","branch":"refs/heads/feature/records-tables-review","head":"d21e23000fef7f7965a306eb9ba6d46ee1b2c91c","baseRef":"refs/heads/master","baseCommit":"d21e23000fef7f7965a306eb9ba6d46ee1b2c91c","sourceTree":"f16a370cd6c9c2b4b75e61f82bd56094d78b79b5","absentOptional":[]} -->
