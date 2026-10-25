# Records tables review (feature 37d)

Checked on 2026-10-25 against the local `gold` database, with the app at `d21e230` and branch `feature/records-tables-review`.
Read-only: every query was a `select`, and no app code changed.

## Summary

The warehouse publishes three records tables the app never reads:
- `app_records_player_seasons`
- `app_records_single_games`
- `app_records_team_seasons`

Each holds the top 50 of four box-score metrics, 200 rows per table.

**They are copies of records the app already calculates.** For all 12 metrics:
- the warehouse top 50 has the same rows, with the same values, as the app's own top 50 (`getRecordRows` with `per = "total"`);
- the order is the same at every position except one tie.

They also cover much less than the Records page:
- 4 metrics against the app's 11 box-score metrics plus its advanced ones;
- totals only, with no per-game reading;
- no team-game records;
- no best-of-each-season list or record progression, which the page builds from every row and not just the top 50.

**Recommendation: ask the warehouse to stop publishing all three.** There is nothing in them the app lacks, and keeping them means
another copy of the same numbers that can drift.

## `app_records_player_seasons`

| Warehouse metric | App metric | Top 50 overlap | Value differences | Positions that differ |
|---|---|---|---|---|
| `points_scored` | `pointsScored` | 50 / 50 | 0 | 0 |
| `total_rebounds` | `totalRebounds` | 50 / 50 | 0 | 0 |
| `assists` | `assists` | 50 / 50 | 0 | 2 (one tie, below) |
| `pir` | `pir` | 50 / 50 | 0 | 0 |

**What a value is.** It is a player's season total over every phase. It equals the app's `app_season_player_stats_traditional` row
with `phase_code = 'all'` and `mode = 'accumulated'`. Against the app's per-game lists the overlap falls to between 8 and 26 of
50, so the warehouse has no per-game reading. The top values are:
- points: Kendrick Nunn, E2024, 802;
- PIR: Sasha Vezenkov, E2024, 902;
- assists: Codi Miller-McIntyre, E2025, 289;
- rebounds: Walter Tavares, E2020, 289.

**Seasons covered.** The lists reach back to E2001 for rebounds and E2015 or E2016 for the others. That is where the top 50
happens to fall, not a cut-off: newer seasons are longer.

**Ties.** `rank_ordinal` runs 1 to 50 with no repeats, so tied values get different ranks. Within a tie the warehouse orders by
season, oldest first, then by person key.

The only position difference is a three-way tie at 197 assists:
- Teodosic (E2016, `JDR`), Heurtel (E2016, `KLT`) and Blatt (E2025).
- The warehouse puts `JDR` 33rd and `KLT` 34th. The app breaks a tie within a season by the season table's `entry_ordinal`, and
  swaps the two.
- Both answers are correct: they are equal records.

## `app_records_single_games`

| Warehouse metric | App metric | Top 50 overlap | Value differences | Positions that differ |
|---|---|---|---|---|
| `points` | `pointsScored` | 50 / 50 | 0 | 0 |
| `total_rebounds` | `totalRebounds` | 50 / 50 | 0 | 0 |
| `assistances` | `assists` | 50 / 50 | 0 | 0 |
| `valuation` | `pir` | 50 / 50 | 0 | 0 |

**What a value is.** It is one player's box-score figure in one played game, over every phase. The top values are:
- points: Nigel Hayes-Davis, E2023 game 286, 50;
- PIR: Tanoka Beard, E2003 game 113, 63;
- assists: Codi Miller-McIntyre, E2023 game 230, 20;
- rebounds: Antonis Fotsis, E2006 game 215, 24.

**Ties.** Every rank is distinct, although the 50 values hold only 7 to 14 distinct numbers. Ties are ordered by season, then game
code, matching the app's order at all 50 positions.

**Seasons covered.** E2000 to E2025. E2026, the season in progress, has no row in either list yet: its best so far, 30 points and
40 PIR, are below each top 50's lowest value (36 and 43). These tables cannot show whether the warehouse would include a season
in progress.

**Metric names.** The table uses the feed's box-score names (`assistances`, `valuation`). The app still accepts these as aliases
on its single-game and team-season routes.

## `app_records_team_seasons`

| Warehouse metric | App metric | Top 50 overlap | Value differences | Positions that differ |
|---|---|---|---|---|
| `points` | `pointsScored` | 50 / 50 | 0 | 0 |
| `total_rebounds` | `totalRebounds` | 50 / 50 | 0 | 0 |
| `assistances` | `assists` | 50 / 50 | 0 | 0 |
| `valuation` | `pir` | 50 / 50 | 0 | 0 |

**What a value is.** It is a club's season sum of its game totals over every played game and phase. That is the app's sum of
`app_game_team_stats` total rows. Against the app's per-game lists the overlap is between 11 and 30 of 50, so again there is no
per-game reading.

**A total favors long seasons.** E2025 holds the top four or five places in every metric. E2025 had 402 played games and a
38-round regular season, against 330 games and 34 rounds in E2024 and 252 games and 28 rounds in E2019. So these lists say more
about season length than about the best teams. The app's per-game reading, with a minimum of games, answers that question; the
warehouse has no equivalent.

## What only one side has

**Only the warehouse.** Nothing the app can't produce. The only thing it adds is the precomputed `rank_ordinal`, and the app ranks
its own rows.

**Only the app:**
- seven more box-score metrics: offensive and defensive rebounds, steals, blocks, 2-pointers, 3-pointers and free throws made;
- advanced records: player PER, Win Shares and rates; single-game Game Score and Game PER; team ratings, pace and shooting;
- per-game readings for player and team seasons, with the minimum-games rule;
- team-game records;
- the best of each season and the record progression. Both need every season's best, which a top 50 over all seasons does not
  contain.

## Recommendation

| Table | Recommendation | Why |
|---|---|---|
| `app_records_player_seasons` | Stop publishing | The same 50 rows and values as the app's season totals, for 4 of its metrics. |
| `app_records_single_games` | Stop publishing | The same 50 rows, values and order as the app's single-game records. |
| `app_records_team_seasons` | Stop publishing | The same 50 rows, values and order as the app's team-season totals, and totals mislead across seasons of different lengths. |

**Keep for later?** The one later use would be a cross-check that the app's records still agree with the warehouse after a
refresh. The scripts behind this report already do that against the source tables, so it doesn't need three published tables.

This is advice; the decision is yours. Nothing has been sent to the warehouse.

## Message for the warehouse agent

> Please stop publishing `app_records_player_seasons`, `app_records_single_games` and `app_records_team_seasons`, to local
> `gold` and to Neon.
>
> The app has never read them and has no code that refers to them. It calculates the same records from
> `app_season_player_stats_traditional`, `app_game_player_stats` and `app_game_team_stats`. A comparison on 2026-10-25 found the same
> top-50 rows and values for all 12 metrics, and the same order apart from one tie.
>
> Please remove them at the source, in the publishing step, so a refresh does not create them again. Then drop the existing
> tables.

## Queries behind this report

Run from `backend`, read-only, on the local `gold` database.

- **Table shapes:**
  `select table_name, column_name, data_type from information_schema.columns where table_name like 'app_records%' order by table_name, ordinal_position`
- **Metrics and seasons:**
  `select metric, count(*), min(season_code), max(season_code) from app_records_<table> group by 1`
- **Top rows:**
  `select metric, rank_ordinal, season_code, ... , value from app_records_<table> where rank_ordinal <= 5 order by metric, rank_ordinal`
- **Ties:**
  `select metric, count(distinct rank_ordinal), count(*), count(distinct value) from app_records_single_games group by 1`
- **The 197-assist tie:**
  `select season_code, person_key, player_name, value from app_records_player_seasons where metric = 'assists' and value = 197 order by rank_ordinal`
- **The season in progress:**
  `select max(points), max(pir) from app_game_player_stats where season_code = 'E2026'`
- **Season lengths:**
  `select season_code, count(*) filter (where phase_code = 'RS'), count(*), max(round_number) filter (where phase_code = 'RS') from app_games where season_code in ('E2019','E2022','E2024','E2025') and played group by 1`
- **Side by side with the app:** two throwaway scripts called `getRecordRows(kind, findRecordMetric(kind, key), per)` for each
  mapped metric. They compared the top 50 by season and person, game or club: overlap, values, and each of the 50 positions.
  They were not committed.
