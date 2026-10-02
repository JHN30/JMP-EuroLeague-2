# JMP Euroleague - Project Overview

<!-- blueprint:source-hash 0b9a104b886193a6528fb2ce5d65c00b076bd2c8c4ef6bf7dfb25dea63cf320c -->

> A public, read-only EuroLeague explorer for the 2025-26 (`E2025`) and 2026-27 (`E2026`) seasons, backed by curated Neon PostgreSQL tables.

## Problem

Fans currently have to search scattered pages or interpret raw API data to understand a EuroLeague season. This PERN rebuild will present standings, games, teams, players, statistics, comparisons, and postseason results in one clear interface. Phase 1 proves the architecture and user experience with two seasons before any historical expansion.

## Users

- **EuroLeague fans** need quick standings, fixtures, results, rosters, and statistical context.
- **Data-oriented fans** need deeper team and player comparisons without specialist analytics knowledge.
- **The project owner** needs a trustworthy view of the data warehouse and a place to test future features.
- **Recruiters and engineers** need a practical example of full-stack and data-engineering work.

## Usage model

- Public, internet-facing, read-only, and EuroLeague-only in Phase 1. No accounts, personal-user data, multi-tenancy, payments, or predictions.
- All current browsing, records, and player views are limited to `E2025` and `E2026`. Archive-wide records and player careers remain deferred until the intended historical seasons are loaded. Current and historical data can contain gaps or corrections; show uncertainty instead of filling it with zero or an invented result.
- Treat API input as untrusted. Bound growing lists with filters and pagination. Use safe errors, rate limiting, response compression, and structured logging without assuming enterprise scale.
- Initial traffic and data volume are expected to be modest. Formal compliance, audit logging, enterprise SLAs, and high availability are not Phase 1 requirements.

## Features

The headline is a two-season public explorer whose every view stays in the selected season. Build order:

1. **Season data access** - validated, typed Express endpoints over the existing Neon data for both seasons. Build it in four reviewable parts:
   - **1a Season catalog** - competition, seasons, phases, and rounds.
   - **1b Teams, players, and rosters API** - season-scoped identities and registrations.
   - **1c Games and box scores API** - fixtures, results, details, and available game statistics.
   - **1d Standings and season statistics API** - official standings and available season statistics.
2. **Season navigation** - a global selector that persists across routes without mixing seasons.
3. **Home dashboard** - standings, recent and upcoming games, and statistical leaders at a glance.
4. **Standings** - official phase-specific ranks, records, scoring, form, and available tie-break context.
5. **Navigation bar** - persistent tabs to Home, Standings, Fixtures and results, Teams, Players, Statistics leaderboards, Comparisons and trends, and Playoffs, alongside the season selector.
6. **Fixtures and results** - round/status browsing plus game metadata and available box scores.
7. **Teams** - directory and selected-season identity, roster, schedule, record, and statistics pages.
8. **Players** - search/directory and profile, team, season statistics, and game-log pages.
9. **Statistics leaderboards** - filtered team/player rankings across available metric forms.
10. **Comparisons and trends** - responsive charts and tables for team/player comparisons.
11. **Playoffs** - play-in, playoff, and Final Four matchups/results when source data exists.
12. **Visual design system pass** - a consistent, theme-aware DaisyUI visual language across every existing page: shared panel/card/table/badge/stat-callout primitives and a compact responsive navbar with a persistent season selector, applied to the dashboard, standings, fixtures/game detail, teams, players, leaderboards, comparisons (theme-aware Chart.js), and playoffs.
13. **Richer stats presentation** - player headshots and team crests throughout the app (box scores, leaderboards, comparisons, standings, fixtures, game headers, dashboard) and compact dropdowns in place of stacked filter tab rows.
14. **Analytics-forward visual refresh** - KPI strips, charts, standings tiers, category navigation, and deliberate mobile layouts across the dashboard, standings, leaderboards, team profile, and comparisons.
15. **UI/UX guideline foundations** - shared themes, typography, accessibility, UI primitives, routing, async/filter/content conventions, and chart rules from `UI-UX.md`.
16. **Data coverage and honest placeholders** - show the selection's real data availability instead of fabricating unavailable surfaces: an API-derived available/partial/incomplete/unavailable/not-yet-applicable inventory with a compact Game Detail panel (16a), honest Shooting and Play-by-play placeholders (16b), and season-scoped coverage on Home (16c).
17. **Guideline page depth** - season overview, standings, game detail, team detail, player detail, leaderboards, comparisons, records, and season-format depth scoped to available data.
18. **Event and shot data** - replace feature 16's play-by-play and shooting placeholders with real event and shot data from `app_play_by_play` and `app_shots`, following `UI-UX.md` §6.6–6.9. Build it in five reviewable parts:
    - **18a Play-by-play log** - game play-by-play endpoint and Game Detail log with event-type, period, and team filters, running score, and "Show 60 more" paging; real play-by-play coverage counts.
    - **18b Event-level game flow** - lead changes, biggest leads, longest run, score-differential chart, and turning points from play-by-play; the period-score table stays.
    - **18c Game shot chart** - game shots endpoint, shared half-court renderer, filterable shot map, zone summary, and box-score reconciliation badge; real shot-location coverage counts.
    - **18d Shooting studio modes** - zone heatmap, team comparison, made-shot replay, and quarter playback with reduced-motion stepping.
    - **18e Season shot locations** - aggregated season or phase shot charts on Team Detail and Player Detail.
19. **Application-table adoption and navigation** - replace API recomputation and legacy multi-table reads with the pipeline's page-shaped `app_*` tables for `E2025` and `E2026`, then expose Format in the persistent navigation. Parts: clean `app_*` mappings and consolidated `app_standings` with no legacy-view dependency (19a), precomputed team statistics and season/game coverage with real shot and play-by-play counts (19b), conservative postseason series without invented bracket positions (19c), and tabs aligned to Home, Overview, Standings, Games, Teams, Players, Leaders, Compare, and Format (19d).
20. **Home dashboard polish** - rework the Home dashboard's layout and content per direct user request: trimmed round indicator, a horizontal upcoming-games row, a four-card KPI strip, a two-column standings/results section, a five-category leaders strip, crests/photos throughout, and removal of the developer-facing data-coverage panel.
21. **Season overview polish** - rework the season overview page's layout and content per direct user request: remove the summary KPI cards and the standings snapshot, keep-exploring bar, and data-coverage panel; highlight the active phase in the timeline with a short format blurb per phase instead of raw counts; chart average points per team instead of combined score; expand Defining games and Statistical leaders into two separate full-width sections; and apply the same restrained animation used on Home.
22. **Advanced stats from the new Neon tables** - read the pipeline's 12 advanced tables (`E2025` and `E2026` only) read-only, with sample sizes shown and small samples hidden: an Advanced standings mode (net rating, pace, eFG%, SRS, last 10; scope and round selectors), a Team Advanced tab (rating by round, splits, play-by-play, shot zones, best lineups), a Player Advanced tab (PER, Win Shares, USG% by round, on/off, RAPM), and an Advanced leaders view with a minimum-minutes filter.
23. **Game detail rebuild** - rework Game Detail per direct user request, drawing on the EuroLeague game center, Sofascore, and Basketball-Reference layouts. Per-game advanced stats come from per-game pipeline tables published to Neon for `E2025` and `E2026`; the backend reads them and does not recompute them. Parts: box score cleanup with the coverage panel removed, tables stacked vertically, whole-number display, starters first, linked players, and column game-highs (23a); a first and default Overview tab with line score, best player per team by game PER (at least 10 minutes, PIR until published, one swappable function), game leaders, mirrored key-stat bars, and a score-flow chart (23b); a player minutes timeline and assist-to-scorer connections (23c); a Traditional/Advanced box score with game and season advanced columns, and the best player by game PER (23d); team Four Factors with season-average markers and pace/ratings (23e); a scoring profile from the score-flow, shot-split and possession tables (23f); pipeline-fed rotations plus a Lineups view (23g); and game shot zones from shot coordinates (23h).

Every data-driven page needs loading, empty, unavailable, partial-data, and error states. Known corrections and anomalies must remain visible. JMP Rating, win probabilities, simulations, older-season browsing, archive-wide records and careers, other competitions, and user features are deferred.

## Data model

This is the logical application-facing model. `DATA_DICTIONARY.md` is the current contract for the populated Neon `app_*` tables. Preserve composite identifiers: season-dependent tables are scoped by both `competition_code` and `season_code`, and entity/game codes are not globally unique by themselves.

| Model | Core fields and types | Relationships |
| --- | --- | --- |
| Competition | `competition_code` (text), `competition_name` (nullable text) | Appears in each source key; Phase 1 exposes EuroLeague only. |
| Season | `season_code` (text: `E2025` or `E2026`), `competition_code` (text), `name` (nullable text) | `app_seasons`; scopes rounds, games, rosters, standings, and statistics. |
| Phase | `phase_code` (text), `phase_name` (nullable text) | Present in round/game/statistics rows; no separate phase table is listed in the supplied SQL. |
| Group | `group_id`, `group_name` (nullable text) | Optional subdivision carried by game rows. |
| Round | `round_key` (text), `phase_code` (text), `round_number` (integer), `name` (nullable text) | `app_rounds`; groups games within a phase. |
| Team | `club_code` (text), `name`, `country_code`, `crest_url` (nullable text) | `app_clubs`, keyed with competition and season; appears in rosters, games, and standings. |
| Player | `person_key` (text), `name` (nullable text), available profile fields (nullable) | `app_people`, keyed with competition and season; joins registrations and player statistics. |
| Roster registration | `registration_key`, `person_key` (text), `club_code` (nullable text), `season_code` (text) | `app_registrations`; records player-team membership for a season. |
| Game | `game_code` (integer), `season_code`, `phase_code`, `round_number`, home/away `club_code`, `scheduled_at` (nullable timestamp with time zone), `game_status` (nullable text), scores (nullable integer) | `app_games`; has two teams and available box scores. |
| Team and player game box scores | `game_code`, `side` (text), `person_key` (player rows), available nullable numeric metrics | `app_game_team_stats` and `app_game_player_stats`; feed game detail. |
| Player season statistics | `season_code`, `phase_code`, `mode`, `entry_ordinal`, `person_key`, available nullable numeric metrics | Four `app_season_stats_*` tables contain traditional, advanced, scoring, and miscellaneous views. No team season aggregate table is listed in the supplied SQL. |
| Official standing | `season_code`, `phase_code`, `round_number`, `club_code`, `position` (nullable integer), available record/scoring/form fields | `app_standings` holds one row per club and round with the basic, calendar, streaks, ahead/behind, and margins views plus `form` and `streak_history` JSON. The seven `app_standings_*` feed tables still exist but the app no longer reads them. |
| Team season statistics | `competition_code`, `season_code`, `phase_code`, `club_code`, `games_played`, nullable `own_*` and `opp_*` numeric measures | `app_team_season_stats`; one pipeline-owned aggregate per club and phase. |
| Advanced round and season tables (feature 22) | `competition_code`, `season_code`, `scope` (`RS`, `all`, `PS`), `round_number`, `club_code` or `person_key`, nullable numeric measures | Twelve `app_*` tables: `app_standings_stats` and `app_team_round_stats`/`ratings`/`splits`; `app_player_round_stats`/`ratings`/`win_shares`; `app_team_pbp_stats`; `app_team_shot_zone_stats`; `app_player_on_off`; `app_lineup_ratings`; `app_player_rapm`. Round tables are cumulative through the round; ratios are fractions. `E2025` and `E2026` only. |
| Per-game advanced (feature 23) | `competition_code`, `season_code`, `game_code`, `side` (plus `person_key` for player rows, `zone` for shot zones, `stint_ordinal` for lineups), nullable numeric measures | Published for `E2025` and `E2026`, read-only for the API: `app_game_player_advanced` (adds `game_uper`, `game_aper`, `game_per`), `app_game_team_advanced`, `app_game_team_score_flow`, `app_game_team_shot_splits`, `app_game_team_possessions`, `app_game_team_shot_zones`, `app_game_player_on_court`, `app_game_team_lineup_stints`. `app_game_stat_gaps` is empty for both seasons. Columns confirmed against Neon 2026-10-02. |
| Coverage summary | season or game key plus `items` (JSONB array of eight typed availability records) | `app_coverage_seasons` and `app_coverage_games`; game coverage mixes game-scoped event counts with season-scoped roster/statistics counts by contract. |
| Play-by-play event | `game_code`, `period` (text, e.g. `FirstQuarter`), `event_ordinal` (integer), `play_number`, `club_code`, `person_code`, `player_name`, `dorsal` (nullable text), `play_type` (text code), `play_info` (nullable text), `minute` (integer), `marker_time` (nullable `MM:SS`), `points_a`/`points_b` (nullable running score) | `app_play_by_play`, keyed by competition, season, game, period, and event ordinal; belongs to one game. Coverage is per game and can lag the schedule. |
| Shot | `game_code`, `shot_ordinal` (integer), `play_number`, `club_code`, `person_code`, `player_name`, `action_code`/`action` (made or missed 2PT/3PT/FT), `points` (integer), `coord_x`/`coord_y` (numeric, basket origin), `zone` (text), `fastbreak`/`second_chance`/`points_off_turnover` (boolean), `minute`, `console_time`, `points_a`/`points_b`, `shot_at` (timestamp with time zone) | `app_shots`, keyed by competition, season, game, and shot ordinal; belongs to one game and joins players by person code. |
| Postseason series | `competition_code`, `season_code`, `phase_code`, ordered club pair, wins, nullable winner, `games` (JSONB) | `app_postseason_series`; reports PI/PO/FF pairings from recorded games without bracket-position labels or a derived completion flag. |
| Data-quality annotation | Target record ID/type, correction or anomaly flag, public note (when safe) | Explains known corrections, gaps, or incomplete data in affected views. |

Scope every season-dependent query by competition and season code. Distinguish scheduled, live/unknown, postponed/cancelled, and completed games when supplied. `NULL` means unavailable, never zero, and a game without play-by-play or shot rows shows an honest empty state rather than derived or fabricated events. Public endpoints read curated `app_*` tables, never Bronze/raw ingestion tables. The pipeline owns the page-shaped aggregates above; the API maps them to validated response contracts rather than recomputing them; until the per-game advanced tables are published, Game Detail must not recompute them in the API or frontend. Legacy `etl_flat_*` aliases may be removed only after application queries and Drizzle discovery no longer use them and the deployed app is verified with its production database role; non-web-app `etl_flat_*` tables remain.

## Tech stack

- **Frontend:** React with Vite and React Router. Tailwind CSS and DaisyUI provide the component system. Zustand is installed for small client-side UI state where it is useful, not yet used anywhere in the app. Chart.js is in use for charts; Motion is installed and used for restrained UI animation, starting with the Home dashboard.
- **Backend:** Node.js, Express, and strict TypeScript. REST endpoints are organized by seasons, standings, games, teams, players, statistics, and playoffs, with runtime validation at request and response boundaries.
- **Database:** Neon-hosted PostgreSQL with existing populated tables, mapped through Drizzle ORM. Use versioned Drizzle migrations for future owned schema changes without recreating the existing data. Keep database access server-side, queries parameterized, selected columns explicit, and ordering deterministic.
- **Engineering:** Thin HTTP handlers, reusable query/business modules, tests around transformations, season scoping, response contracts, and misleading statistical edge cases. The frontend is JavaScript and the backend TypeScript: backend types and runtime response validation are the API contract, with no shared or generated types unless API/UI naming drift causes real bugs. Add caching only after a measured need.

## Monetization

None in Phase 1. This is a portfolio and fan product; payments, subscriptions, advertising, and gated statistics are excluded.

## UI/UX

Use a dark sports-analytics style with EuroLeague orange, restrained complementary color, and high-contrast neutral surfaces without copying the league website. Prioritize readable tables and visible season, phase, and round context. Provide deliberate mobile layouts, accessible charts when charts help more than tables, semantic structure, keyboard access, visible focus, sufficient contrast, and non-color-only status cues. Avoid expensive blur and excessive animation.

The planned screens are home, season overview, standings, fixtures/results, game detail, team directory/detail, player search/detail, leaderboards, comparisons/trends, and season format, reached through a persistent navigation bar alongside the season selector. The existing Records work remains a two-season prototype until the archive is loaded. Exact URL paths are not specified in the plans.

## Deployment

- Internet-facing at `jmpeuroleague.com`. Target: static React production build or existing Render frontend setup, independently deployed Express API on Render, Neon PostgreSQL, and existing Cloudflare DNS.
- Provide a lightweight public health endpoint such as `GET /api/health`. Backend variables are `DB_URL`, `PORT`, `NODE_ENV`, and `FRONTEND_URL` (the single CORS origin, a bare HTTP origin). The frontend build reads the public, optional `VITE_API_URL` (default `http://localhost:3000/api` locally), which must never hold a secret.
- Derive install, build, migration, and start commands from actual package scripts. Run migrations as a controlled deployment step, use separate development/production connections, keep secrets out of Vite, and restrict production CORS to real frontend origins.
- Data import/refresh schedule and mechanism are TBD. Do not add a production cron before source, ownership, retry behavior, and idempotency are defined.
- Retire only the publisher-managed legacy web-app compatibility views after a successful dry run and live application verification; never issue a blanket drop for all `etl_flat_*` objects.
