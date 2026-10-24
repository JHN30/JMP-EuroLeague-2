# Feature: Lower-is-better records and team advanced metrics

**From build-plan:** feature 36d
**Build attempt:** 1
**Status:** verified
**Branch:** feature/lower-is-better-records-and-team-advanced-metrics

## Goal

On `/:season/records`, let a metric rank from the lowest when lower is better (the best defense has the lowest
defensive rating), and fill the team Advanced group with the metrics the advanced standings and per-game team tables
already hold, so Team seasons and Team games are no longer limited to offensive and net rating.

## In scope

- **Direction.** A catalogue entry can be `lowerIsBetter`. For such a metric the API ranks lowest first: the per-season
  queries order ascending, `best()` sorts ascending, `bySeason` keeps each season's lowest, and `progression` lists
  every row lower than the standing record (strictly), opening with the first season's best. Higher-is-better metrics
  behave exactly as now.
- **Reply.** Every records reply adds `lowerIsBetter` (boolean) and `format`: `"count"` (whole numbers: traditional
  totals), `"decimal"` (one decimal: per-game averages, PER, Win Shares, Game Score, ratings, pace, assist ratio),
  `"signed"` (one decimal with a plus sign when positive: net rating, adjusted net rating, margin of victory, SRS) or
  `"percent"` (the stored fraction times 100, one decimal and `%`). Values stay as stored (fractions for percentages).
- **Team seasons, Advanced** (from `app_standings_stats` after the season's latest round, scope `all`, the scaled
  20-game minimum the ratings already use):

  | Key | Label | Column | Format | Lower is better |
  |---|---|---|---|---|
  | `offensiveRating` | Offensive rating | `offensive_rating` | decimal | |
  | `defensiveRating` | Defensive rating | `defensive_rating` | decimal | yes |
  | `netRating` | Net rating | `net_rating` | signed | |
  | `adjustedOffensiveRating` | Adjusted offensive rating | `adj_offensive_rating` | decimal | |
  | `adjustedDefensiveRating` | Adjusted defensive rating | `adj_defensive_rating` | decimal | yes |
  | `adjustedNetRating` | Adjusted net rating | `adj_net_rating` | signed | |
  | `marginOfVictory` | Margin of victory | `mov` | signed | |
  | `srs` | Simple rating (SRS) | `srs` | signed | |
  | `pace` | Pace | `pace` | decimal | |
  | `effectiveFieldGoalPct` | Effective FG% | `efg_pct` | percent | |
  | `opponentEffectiveFieldGoalPct` | Opponents' eFG% | `opp_efg_pct` | percent | yes |
  | `trueShootingPct` | True shooting % | `true_shooting_pct` | percent | |
  | `turnoverPct` | Turnover % | `tov_pct` | percent | yes |
  | `offensiveReboundPct` | Offensive rebound % | `orb_pct` | percent | |
  | `defensiveReboundPct` | Defensive rebound % | `drb_pct` | percent | |
  | `assistRatio` | Assist ratio | `assist_ratio` | percent (stored as a fraction, checked in step 1) | |

- **Team games, Advanced** (from `app_game_team_advanced`, played games, no minimum, as now): `offensiveRating`,
  `defensiveRating` (lower is better), `netRating` (signed), `pace`, `effectiveFieldGoalPct` and `trueShootingPct`
  (percent), with the same labels.
- **Coverage.** A season or game without the column's value has no row, so the timeline keeps its gap. Step 1 checks
  each new metric on the local data (seasons with values, and the unit of `assist_ratio` and the percentage columns)
  and records any metric with no data at all; such a metric is left out of the catalogue rather than shown empty.
- **Page.**
  - The frontend catalogue lists the new metrics in the order of the tables above; the metric strip already scrolls
    and the phone select already lists every metric.
  - Values, gains and the Top 50 bar use the reply's `format` and `lowerIsBetter`: `describeRecord` formats from
    `format` (per-game values keep one decimal); the Top 50 bar is sized best / value when lower is better; a gain
    shows as the signed change ("New record -2.1" when lower is better, "+43" style when higher).
  - A lower-is-better metric shows "Lower is better." in the line above the podium (with the minimum-games sentence
    when there is one) and in the timeline summary.
  - The timeline (36a) and Totals / Per game (36b) keep working; per game stays traditional-only.
- **States:** loading, error and "No records are available for this metric." stay as they are.

## Out of scope

- Player advanced metrics and Game PER (36e).
- The record book landing (36c).
- RAPM, on/off, lineup and play-by-play based numbers; home, away, last-5 and last-10 splits.
- Tips or explanations per metric beyond the existing PIR tip.

## Build loop

`workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`: build both steps, then one review packet.
`/complete` makes the commit. The uncommitted build-plan and overview edits for 36d and 36e go with this commit.

## Build steps

- [x] 1. **API direction and team catalogue** - `lowerIsBetter` and `format` on the catalogue and in the reply;
  direction-aware ordering in the team-season and team-game queries, `best()` and `progression`; the new team metrics
  with their column maps; the coverage and unit check on the local data. `records-api.spec.js`: the KINDS catalogue
  gains the new metrics (label, group, minimum); every metric answers with its `format` and `lowerIsBetter`; rows are
  ordered by its direction; `progression` strictly improves in its direction and ends at `records[0]`; each season's
  `bySeason` entry is at least as good as any of its rows in `records`.
  Done when: `cd backend && npm run build` passes; on the local backend
  `/api/seasons/2026/records/team-seasons?metric=defensiveRating` returns the lowest ratings first with a decreasing
  progression; the records-api spec passes.
- [x] 2. **Page** - the catalogue, the formats, the direction-aware bar, gains and "Lower is better." notes.
  `records.spec.js`: a mocked lower-is-better metric shows the note, the podium lowest first, "New record -n" markers
  and a percent metric with `%`; a signed metric shows `+`. `records-layout.spec.js` and its live "every metric
  answers" test cover the new catalogue at every width.
  Done when: on `/2026/records?type=team&metric=defensiveRating` the podium, timeline (descending step line) and Top
  50 read lowest first with the note; Team seasons, Turnover % shows percentages; `npm run lint` and `npm run build`
  pass; `npx playwright test records.spec.js records-api.spec.js records-layout.spec.js responsive.spec.js` passes with
  `/api/health` reporting `"target":"local"`.

## Files / areas

- `backend/src/db/season-records.ts` - catalogue, direction, column maps, `best()` and `progression`.
- `backend/src/routes/seasons.ts` - the reply's `lowerIsBetter` and `format`.
- `frontend/src/records/recordData.js` - catalogue, `describeRecord` formats.
- `frontend/src/records/RecordParts.jsx` - Top 50 bar, season list gain marker.
- `frontend/src/records/RecordTimeline.jsx` - tooltip gain and summary note.
- `frontend/src/records/RecordsPage.jsx` - the "Lower is better." line.
- `frontend/src/lib/format.js` - existing `formatDecimal`, `formatSignedDecimal`, `formatCount` reused.
- `frontend/e2e/records-api.spec.js`, `records.spec.js`, `records-layout.spec.js`.

## Data / contracts

- Query unchanged: `metric` (now also the new keys), `per` (36b, traditional only).
- Reply: `{ metric, label, group, minGames, per, lowerIsBetter, format, records, bySeason, progression }`. Rows keep
  their shape (`value` string, `numericValue` number; team-season rating rows keep `gamesPlayed` and `minGames`).
- Percentages: the stored fraction (0 to 1); the page multiplies by 100 for display only.
- Unknown metric keys still answer `400 INVALID_RECORD_METRIC`.

## Testing

- No unit test runner is configured; the API is covered by `records-api.spec.js` on the live local backend and the
  page by `records.spec.js` on mocked replies and `records-layout.spec.js` on live data.
- Browser tests only against the local target (`/api/health` reports `"target":"local"`).

## Notes for the AI

- Labels follow the Leaders team catalogue (`frontend/src/leaders/teamData.js`), which already marks defensive
  rating, opponents' eFG% and turnover % as lower is better and stores percentages as fractions.
- Keep one ordering path: pass the direction into the existing queries and `best()` rather than duplicating them.
- No em dashes in copy or comments. Keep comments to the why.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8408,"specSha256":"ae7e150a1633574d9ca92811102ec5e324207aa05a3b35bc49b017c3cf04ba92","branch":"refs/heads/feature/lower-is-better-records-and-team-advanced-metrics","head":"5ca603c200979b2287e2a00f2f88b34e61bbadd7","baseRef":"refs/heads/master","baseCommit":"5ca603c200979b2287e2a00f2f88b34e61bbadd7","sourceTree":"f6d965766a6d2f0bcccb54fcd529ddd152bad1b5","absentOptional":[]} -->
