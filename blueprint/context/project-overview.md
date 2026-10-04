# JMP Euroleague - Project Overview

<!-- blueprint:source-hash fb87641705355f27acd78fed7f5ab40735f0839289402d2558b99af03a77e4ab -->

> A public, read-only EuroLeague explorer for the 2023-24 (`E2023`) to 2026-27 (`E2026`) seasons, backed by curated Neon PostgreSQL tables.

## Problem

Fans currently have to search scattered pages or interpret raw API data to understand a EuroLeague season. This PERN rebuild will present standings, games, teams, players, statistics, comparisons, and postseason results in one clear interface. Phase 1 proves the architecture and user experience with a few seasons before any wider historical expansion.

## Users

- **EuroLeague fans** need quick standings, fixtures, results, rosters, and statistical context.
- **Data-oriented fans** need deeper team and player comparisons without specialist analytics knowledge.
- **The project owner** needs a trustworthy view of the data warehouse and a place to test future features.
- **Recruiters and engineers** need a practical example of full-stack and data-engineering work.

## Usage model

- Public, internet-facing, read-only, and EuroLeague-only in Phase 1. No accounts, personal-user data, multi-tenancy, payments, or predictions.
- All current browsing, records, and player views are limited to the loaded seasons, `E2023` to `E2026`. Archive-wide records remain deferred until further historical seasons are loaded. Current and historical data can contain gaps or corrections; show uncertainty instead of filling it with zero or an invented result.
- Treat API input as untrusted. Bound growing lists with filters and pagination. Use safe errors, rate limiting, response compression, and structured logging without assuming enterprise scale.
- Initial traffic and data volume are expected to be modest. Formal compliance, audit logging, enterprise SLAs, and high availability are not Phase 1 requirements.

## Features

The headline is a four-season public explorer whose every view stays in the selected season. Build order (all shipped):

1. **Season data access** - validated, typed Express endpoints over the existing Neon data: season catalog (1a), teams, players, and rosters (1b), games and box scores (1c), standings and season statistics (1d).
2. **Season navigation** - a global selector that persists across routes without mixing seasons.
3. **Home dashboard** - standings, recent and upcoming games, and statistical leaders at a glance.
4. **Standings** - official phase-specific ranks, records, scoring, form, and available tie-break context.
5. **Navigation bar** - persistent tabs to Home, Standings, Fixtures and results, Teams, Players, Statistics leaderboards, Comparisons and trends, and Playoffs, alongside the season selector.
6. **Fixtures and results** - round/status browsing plus game metadata and available box scores.
7. **Teams** - directory and selected-season identity, roster, schedule, record, and statistics pages.
8. **Players** - search/directory and profile, team, season statistics, and game-log pages (reworked in 25).
9. **Statistics leaderboards** - filtered team/player rankings across available metric forms.
10. **Comparisons and trends** - responsive charts and tables for team/player comparisons.
11. **Playoffs** - play-in, playoff, and Final Four matchups/results when source data exists.
12. **Visual design system pass** - a consistent theme-aware DaisyUI language: shared panel/card/table/badge primitives and a compact navbar with a persistent season selector.
13. **Richer stats presentation** - player headshots and team crests throughout the app and compact dropdowns in place of stacked filter tab rows.
14. **Analytics-forward visual refresh** - KPI strips, charts, standings tiers, category navigation, and mobile layouts across the main pages.
15. **UI/UX guideline foundations** - shared themes, typography, accessibility, UI primitives, routing, async/filter conventions, and chart rules from `UI-UX.md`.
16. **Data coverage and honest placeholders** - a five-status coverage inventory and honest placeholders for surfaces the data cannot support (16a-16c).
17. **Guideline page depth** - season overview, standings, game detail, team detail, player detail, leaderboards, comparisons, records, and season-format depth scoped to available data.
18. **Event and shot data** - real play-by-play, game flow, and shot charts from `app_play_by_play` and `app_shots`: play-by-play log (18a), event-level game flow (18b), game shot chart (18c), shooting studio modes with quarter playback (18d), and season shot locations on Team and Player pages (18e).
19. **Application-table adoption and navigation** - read the pipeline's page-shaped `app_*` tables instead of recomputing or reading legacy tables: consolidated `app_standings` with no legacy-view dependency (19a), team statistics and coverage (19b), postseason series without invented bracket positions (19c); tabs aligned to Home, Overview, Standings, Games, Teams, Players, Leaders, Compare, and Format (19d).
20. **Home dashboard polish** - per direct user request: current-round indicator, a horizontal upcoming-games row, a four-card KPI strip, a two-column standings/results section, a five-category leaders strip, crests and photos throughout, and no coverage panel.
21. **Season overview polish** - per direct user request: phase timeline with the active phase highlighted, average points per team chart, full-width Defining games and Statistical leaders; KPI cards, standings snapshot, links bar, and coverage panel removed.
22. **Advanced stats from the new Neon tables** - read the pipeline's 12 advanced tables (`E2023` to `E2026`) read-only, with sample sizes shown and small samples hidden: an Advanced standings mode, a Team Advanced tab (reworked in 24f), a Player Advanced tab (reworked in 25e), and an Advanced leaders view with a minimum-minutes filter.
23. **Game detail rebuild** - per direct user request, reading per-game pipeline tables (the backend reads, never recomputes them). Parts: box score cleanup (23a); default Overview tab with line score, best player by game PER (at least 10 minutes), leaders, key-stat bars, and score flow (23b); minutes timeline and assist connections (23c); Traditional/Advanced box score (23d); team Four Factors (23e); scoring profile and momentum (23f); pipeline-fed rotations and Lineups (23g); shot zones on a true-scale FIBA court (23h).
24. **Team page rework** - tabs now Overview, Statistics, Roster, Shooting, Advanced, and Games (17d's Trends tab removed). Two backend additions: `GET /seasons/:seasonCode/team-stats?phase=` (every club's season totals for a phase, for league ranks) and `GET /seasons/:seasonCode/teams/:clubCode/coaches`. Parts: directory animation (24a); Overview snapshot, photo leaders, quick comparison, league profile (24b); Statistics as club-versus-opponents rows with ranks (24c); Roster position cards and coaching staff (24d); Shooting heatmap/attempts, zone table, points by situation (24e); Advanced ratings chart, splits, game flow, lineups with a 100-possession minimum (24f); Games margin strip, next and latest columns, crests, home/away icons (24g).
25. **Players page and player page rework** - per direct user request, tab set Overview, Season by season, Statistics, Advanced, Shooting, and Games (replaces 17e and 22's player layout). Backend additions: the players and single-player endpoints return photo, current club, jersey number, and position; the player advanced endpoint returns the player's rank, percentile, and league spread for PER, Win Shares, WS/40, usage, RAPM, and on/off. Parts: photo-card directory with image reveal and no tab scroll jump (25a); hero header, ranked Overview (25b); career Season by season (25c); ranked Statistics sheet (25d); Advanced scorecard with Poor-to-Elite verdicts and gauges (25e); Shooting in the team tab's layout with shared components (25f); Games bar chart, splits, and box scores (25g).
26. **Historical seasons and qualified player statistics** - `E2023` and `E2024` join the supported seasons. The pipeline now supplies per-game player rows for players under the feed's minimum games (`is_calculated`), with `min_games` and `qualified` on every row. `season-stats` returns them and takes `qualified=true` and `minGames=N`; leaderboards and team leaders keep qualified players by default, and player ranks use the flag.

Every data-driven page needs loading, empty, unavailable, partial-data, and error states. Known corrections and anomalies must remain visible. JMP Rating, win probabilities, simulations, seasons before `E2023`, archive-wide records, other competitions, and user features are deferred.

## Data model

This is the logical application-facing model. `DATA_DICTIONARY.md` is the current contract for the populated Neon `app_*` tables. Preserve composite identifiers: season-dependent tables are scoped by both `competition_code` and `season_code`, and entity/game codes are not globally unique by themselves.

| Model | Core fields and types | Relationships |
| --- | --- | --- |
| Competition | `competition_code` (text), `competition_name` (nullable text) | Appears in each source key; Phase 1 exposes EuroLeague only. |
| Season | `season_code` (text: `E2023` to `E2026`), `competition_code` (text), `name` (nullable text) | `app_seasons`; scopes rounds, games, rosters, standings, and statistics. |
| Phase | `phase_code` (text), `phase_name` (nullable text) | Present in round/game/statistics rows; no separate phase table is listed in the supplied SQL. |
| Group | `group_id`, `group_name` (nullable text) | Optional subdivision carried by game rows. |
| Round | `round_key` (text), `phase_code` (text), `round_number` (integer), `name` (nullable text) | `app_rounds`; groups games within a phase. |
| Team | `club_code` (text), `name`, `country_code`, `crest_url` (nullable text) | `app_clubs`, keyed with competition and season; appears in rosters, games, and standings. |
| Player | `person_key` (text), `name` (nullable text), available profile fields (nullable) | `app_people`, keyed with competition and season; joins registrations and player statistics. |
| Roster registration | `registration_key`, `person_key` (text), `club_code` (nullable text), `season_code` (text), plus role, active flag, jersey number, and position | `app_registrations`; records player-team membership for a season. It also carries coaching staff, which feature 24d reads. |
| Game | `game_code` (integer), `season_code`, `phase_code`, `round_number`, home/away `club_code`, `scheduled_at` (nullable timestamp with time zone), `game_status` (nullable text), scores (nullable integer) | `app_games`; has two teams and available box scores. |
| Team and player game box scores | `game_code`, `side` (text), `person_key` (player rows), available nullable numeric metrics | `app_game_team_stats` and `app_game_player_stats`; feed game detail and the player Games tab. |
| Player season statistics | `season_code`, `phase_code`, `mode` (`perGame` or `accumulated`), `entry_ordinal`, `person_key`, available nullable numeric metrics, `is_calculated` (boolean), `min_games` (integer), `qualified` (boolean) | Four `app_season_player_stats_*` tables (traditional, advanced, scoring, miscellaneous). The league lists per-game rows only above a minimum of games; the pipeline derives the rest from the accumulated rows (`is_calculated`). `min_games` is the minimum for the season and phase and `qualified` says the player meets it. |
| Official standing | `season_code`, `phase_code`, `round_number`, `club_code`, `position` (nullable integer), available record/scoring/form fields | `app_standings` holds one row per club and round with the basic, calendar, streaks, ahead/behind, and margins views plus `form` and `streak_history` JSON. |
| Team season statistics | `competition_code`, `season_code`, `phase_code`, `club_code`, `games_played`, nullable `own_*` and `opp_*` numeric measures | `app_team_season_stats`; one pipeline-owned aggregate per club and phase, read per club or for every club in a phase. |
| Advanced round and season tables (feature 22) | `competition_code`, `season_code`, `scope` (`RS`, `all`, `PS`), `round_number`, `club_code` or `person_key`, nullable numeric measures | Twelve `app_*` tables: `app_standings_stats` and `app_team_round_stats`/`ratings`/`splits`; `app_player_round_stats`/`ratings`/`win_shares`; `app_team_pbp_stats`; `app_team_shot_zone_stats`; `app_player_on_off`; `app_lineup_ratings`; `app_player_rapm`. Round tables are cumulative through the round; ratios are fractions. |
| Per-game advanced (feature 23) | `competition_code`, `season_code`, `game_code`, `side` (plus `person_key` for player rows, `zone` for shot zones, `stint_ordinal` for lineups), nullable numeric measures | Read-only for the API: `app_game_player_advanced` (adds `game_uper`, `game_aper`, `game_per`), `app_game_team_advanced`, `app_game_team_score_flow`, `app_game_team_shot_splits`, `app_game_team_possessions`, `app_game_team_shot_zones`, `app_game_player_on_court`, `app_game_team_lineup_stints`. |
| Coverage summary | season or game key plus `items` (JSONB array of eight typed availability records) | `app_coverage_seasons` and `app_coverage_games`; game coverage mixes game-scoped event counts with season-scoped roster/statistics counts by contract. |
| Play-by-play event | `game_code`, `period` (text, e.g. `FirstQuarter`), `event_ordinal` (integer), `play_number`, `club_code`, `person_code`, `player_name`, `dorsal` (nullable text), `play_type` (text code), `play_info` (nullable text), `minute` (integer), `marker_time` (nullable `MM:SS`), `points_a`/`points_b` (nullable running score) | `app_play_by_play`, keyed by competition, season, game, period, and event ordinal; belongs to one game. Coverage is per game and can lag the schedule. |
| Shot | `game_code`, `shot_ordinal` (integer), `play_number`, `club_code`, `person_code`, `player_name`, `action_code`/`action` (made or missed 2PT/3PT/FT), `points` (integer), `coord_x`/`coord_y` (numeric, basket origin), `zone` (text), `fastbreak`/`second_chance`/`points_off_turnover` (boolean, set only on scoring shots), `minute`, `console_time`, `points_a`/`points_b`, `shot_at` (timestamp with time zone) | `app_shots`, keyed by competition, season, game, and shot ordinal; belongs to one game and joins players by person code. The app derives its own 14 zones from the coordinates. |
| Postseason series | `competition_code`, `season_code`, `phase_code`, ordered club pair, wins, nullable winner, `games` (JSONB) | `app_postseason_series`; reports PI/PO/FF pairings from recorded games without bracket-position labels or a derived completion flag. |
| Data-quality annotation | Target record ID/type, correction or anomaly flag, public note (when safe) | Explains known corrections, gaps, or incomplete data in affected views. |

Scope every season-dependent query by competition and season code. Distinguish scheduled, live/unknown, postponed/cancelled, and completed games when supplied. `NULL` means unavailable, never zero, and a game without play-by-play or shot rows shows an honest empty state rather than derived or fabricated events. Public endpoints read curated `app_*` tables, never Bronze/raw ingestion tables. The pipeline owns the page-shaped aggregates above; the API maps them to validated response contracts rather than recomputing them, and Game Detail never recomputes the published per-game advanced tables. Leaderboards and league ranks use `qualified` players by default; a player under the minimum keeps their numbers but has no rank. Legacy `etl_flat_*` aliases may be removed only after application queries and Drizzle discovery no longer use them and the deployed app is verified with its production database role; non-web-app `etl_flat_*` tables remain.

## Tech stack

- **Frontend:** React with Vite and React Router. Tailwind CSS and DaisyUI provide the component system. Zustand is installed for small client-side UI state where it is useful, not yet used anywhere. Chart.js is in use for charts; Motion is used for restrained UI animation across the app.
- **Backend:** Node.js, Express, and strict TypeScript. REST endpoints are organized by seasons, standings, games, teams, players, statistics, and playoffs, with runtime validation at request and response boundaries.
- **Database:** Neon-hosted PostgreSQL with existing populated tables, mapped through Drizzle ORM. Use versioned Drizzle migrations for future owned schema changes without recreating the existing data. Keep database access server-side, queries parameterized, selected columns explicit, and ordering deterministic.
- **Engineering:** Thin HTTP handlers, reusable query/business modules, tests around transformations, season scoping, response contracts, and misleading statistical edge cases. The frontend is JavaScript and the backend TypeScript: backend types and runtime response validation are the API contract, with no shared or generated types unless API/UI naming drift causes real bugs. Add caching only after a measured need.

## Monetization

None in Phase 1. This is a portfolio and fan product; payments, subscriptions, advertising, and gated statistics are excluded.

## UI/UX

Use a dark sports-analytics style with EuroLeague orange, restrained complementary color, and high-contrast neutral surfaces without copying the league website. Prioritize readable tables and visible season, phase, and round context. Provide deliberate mobile layouts, accessible charts when charts help more than tables, semantic structure, keyboard access, visible focus, sufficient contrast, and non-color-only status cues. Avoid expensive blur and excessive animation.

The planned screens are home, season overview, standings, fixtures/results, game detail, team directory/detail (tabs: Overview, Statistics, Roster, Shooting, Advanced, Games), player directory/detail (tabs: Overview, Season by season, Statistics, Advanced, Shooting, Games), leaderboards, comparisons/trends, and season format, reached through a persistent navigation bar alongside the season selector. Records cover the loaded seasons. Exact URL paths are not specified in the plans.

## Deployment

- Internet-facing at `jmpeuroleague.com`. Target: static React production build or existing Render frontend setup, independently deployed Express API on Render, Neon PostgreSQL, and existing Cloudflare DNS.
- Provide a lightweight public health endpoint such as `GET /api/health`. Backend variables are `DB_URL`, `PORT`, `NODE_ENV`, and `FRONTEND_URL` (the single CORS origin, a bare HTTP origin). The frontend build reads the public, optional `VITE_API_URL` (default `http://localhost:3000/api` locally), which must never hold a secret.
- Derive install, build, migration, and start commands from actual package scripts. Run migrations as a controlled deployment step, use separate development/production connections, keep secrets out of Vite, and restrict production CORS to real frontend origins.
- Data import/refresh schedule and mechanism are TBD. Do not add a production cron before source, ownership, retry behavior, and idempotency are defined.
- Retire only the publisher-managed legacy web-app compatibility views after a successful dry run and live application verification; never issue a blanket drop for all `etl_flat_*` objects.
