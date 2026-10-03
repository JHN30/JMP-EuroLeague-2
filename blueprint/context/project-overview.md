# JMP Euroleague - Project Overview

<!-- blueprint:source-hash 2203550dc57c0d8b17f4496b13471178da967d58d082ade1ca9d4d3d8c509b9f -->

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

The headline is a two-season public explorer whose every view stays in the selected season. Build order (all shipped):

1. **Season data access** - validated, typed Express endpoints over the existing Neon data: season catalog (1a), teams, players, and rosters (1b), games and box scores (1c), standings and season statistics (1d).
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
12. **Visual design system pass** - a consistent, theme-aware DaisyUI visual language across every page: shared panel/card/table/badge/stat-callout primitives and a compact responsive navbar with a persistent season selector.
13. **Richer stats presentation** - player headshots and team crests throughout the app and compact dropdowns in place of stacked filter tab rows.
14. **Analytics-forward visual refresh** - KPI strips, charts, standings tiers, category navigation, and deliberate mobile layouts across the dashboard, standings, leaderboards, team profile, and comparisons.
15. **UI/UX guideline foundations** - shared themes, typography, accessibility, UI primitives, routing, async/filter/content conventions, and chart rules from `UI-UX.md`.
16. **Data coverage and honest placeholders** - show the selection's real data availability instead of fabricating unavailable surfaces: an available/partial/incomplete/unavailable/not-yet-applicable inventory with a compact Game Detail panel (16a), honest Shooting and Play-by-play placeholders (16b), and season-scoped coverage on Home (16c).
17. **Guideline page depth** - season overview, standings, game detail, team detail, player detail, leaderboards, comparisons, records, and season-format depth scoped to available data.
18. **Event and shot data** - real play-by-play, game flow, and shot charts from `app_play_by_play` and `app_shots` replacing feature 16's placeholders: play-by-play log (18a), event-level game flow (18b), game shot chart (18c), shooting studio modes with quarter playback and reduced-motion stepping (18d), and season shot locations on Team and Player pages (18e).
19. **Application-table adoption and navigation** - replace API recomputation and legacy multi-table reads with the pipeline's page-shaped `app_*` tables for `E2025` and `E2026`, then expose Format in the persistent navigation. Parts: clean `app_*` mappings and consolidated `app_standings` with no legacy-view dependency (19a), precomputed team statistics and season/game coverage with real shot and play-by-play counts (19b), conservative postseason series without invented bracket positions (19c), and tabs aligned to Home, Overview, Standings, Games, Teams, Players, Leaders, Compare, and Format (19d).
20. **Home dashboard polish** - per direct user request: trimmed round indicator, a horizontal upcoming-games row, a four-card KPI strip, a two-column standings/results section, a five-category leaders strip, crests/photos throughout, and removal of the developer-facing data-coverage panel.
21. **Season overview polish** - per direct user request: remove the summary KPI cards, standings snapshot, keep-exploring bar, and coverage panel; highlight the active phase with a short format blurb; chart average points per team; expand Defining games and Statistical leaders into two full-width sections; reuse Home's restrained animation.
22. **Advanced stats from the new Neon tables** - read the pipeline's 12 advanced tables (`E2025` and `E2026` only) read-only, with sample sizes shown and small samples hidden: an Advanced standings mode (net rating, pace, eFG%, SRS, last 10; scope and round selectors), a Team Advanced tab (reworked in 24f), a Player Advanced tab (PER, Win Shares, USG% by round, on/off, RAPM), and an Advanced leaders view with a minimum-minutes filter.
23. **Game detail rebuild** - per direct user request, reading per-game pipeline tables published to Neon for `E2025` and `E2026` (the backend reads them and does not recompute them). Parts: box score cleanup (23a); a default Overview tab with line score, best player by game PER (at least 10 minutes, PIR until published, one swappable function), leaders, mirrored key-stat bars, and a score-flow chart (23b); minutes timeline and assist-to-scorer connections (23c); a Traditional/Advanced box score (23d); team Four Factors with season-average markers (23e); a scoring profile from score-flow, shot-split, and possession tables (23f); pipeline-fed rotations plus a Lineups view (23g); and game shot zones from shot coordinates on a true-scale FIBA court (23h).
24. **Team page rework** - the team pages rebuilt tab by tab per direct user request. Tabs are now Overview, Statistics, Roster, Shooting, Advanced, and Games; 17d's Trends tab was removed as redundant, and this replaces 17d's layout and 22's Team Advanced tab. Two small backend additions: `GET /seasons/:seasonCode/team-stats?phase=` (every club's season totals for one phase, so a club is ranked against the league in one request) and `GET /seasons/:seasonCode/teams/:clubCode/coaches` (head coach and assistants from current registrations). Parts: Teams directory animation (24a); Overview with a snapshot panel, photo leaders, a quick comparison with the next opponent or league leader, a league profile, and linked form and fixtures rows (24b); Statistics as club-versus-opponents rows with league ranks (24c); Roster as position-grouped player cards with coaching staff and a Cards/Table switch (24d); Shooting with team and opponent shot maps, a zone table, and points by situation (24e); Advanced with a two-line ratings chart, split cards, game flow, and lineup cards with photos (100-possession minimum, else 50 when none reach it) (24f); Games with a margin strip, next games beside latest results, crests, and home/away icons (24g).

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
| Roster registration | `registration_key`, `person_key` (text), `club_code` (nullable text), `season_code` (text), plus role, active flag, jersey number, and position | `app_registrations`; records player-team membership for a season. It also carries coaching staff, which feature 24d reads for the head coach and assistants. |
| Game | `game_code` (integer), `season_code`, `phase_code`, `round_number`, home/away `club_code`, `scheduled_at` (nullable timestamp with time zone), `game_status` (nullable text), scores (nullable integer) | `app_games`; has two teams and available box scores. |
| Team and player game box scores | `game_code`, `side` (text), `person_key` (player rows), available nullable numeric metrics | `app_game_team_stats` and `app_game_player_stats`; feed game detail. |
| Player season statistics | `season_code`, `phase_code`, `mode`, `entry_ordinal`, `person_key`, available nullable numeric metrics | Four `app_season_stats_*` tables contain traditional, advanced, scoring, and miscellaneous views. |
| Official standing | `season_code`, `phase_code`, `round_number`, `club_code`, `position` (nullable integer), available record/scoring/form fields | `app_standings` holds one row per club and round with the basic, calendar, streaks, ahead/behind, and margins views plus `form` and `streak_history` JSON. The seven `app_standings_*` feed tables still exist but the app no longer reads them. |
| Team season statistics | `competition_code`, `season_code`, `phase_code`, `club_code`, `games_played`, nullable `own_*` and `opp_*` numeric measures | `app_team_season_stats`; one pipeline-owned aggregate per club and phase, read per club or for every club in a phase (feature 24c ranks). |
| Advanced round and season tables (feature 22) | `competition_code`, `season_code`, `scope` (`RS`, `all`, `PS`), `round_number`, `club_code` or `person_key`, nullable numeric measures | Twelve `app_*` tables: `app_standings_stats` and `app_team_round_stats`/`ratings`/`splits`; `app_player_round_stats`/`ratings`/`win_shares`; `app_team_pbp_stats`; `app_team_shot_zone_stats`; `app_player_on_off`; `app_lineup_ratings`; `app_player_rapm`. Round tables are cumulative through the round; ratios are fractions. `E2025` and `E2026` only. |
| Per-game advanced (feature 23) | `competition_code`, `season_code`, `game_code`, `side` (plus `person_key` for player rows, `zone` for shot zones, `stint_ordinal` for lineups), nullable numeric measures | Published for `E2025` and `E2026`, read-only for the API: `app_game_player_advanced` (adds `game_uper`, `game_aper`, `game_per`), `app_game_team_advanced`, `app_game_team_score_flow`, `app_game_team_shot_splits`, `app_game_team_possessions`, `app_game_team_shot_zones`, `app_game_player_on_court`, `app_game_team_lineup_stints`. `app_game_stat_gaps` is empty for both seasons. |
| Coverage summary | season or game key plus `items` (JSONB array of eight typed availability records) | `app_coverage_seasons` and `app_coverage_games`; game coverage mixes game-scoped event counts with season-scoped roster/statistics counts by contract. |
| Play-by-play event | `game_code`, `period` (text, e.g. `FirstQuarter`), `event_ordinal` (integer), `play_number`, `club_code`, `person_code`, `player_name`, `dorsal` (nullable text), `play_type` (text code), `play_info` (nullable text), `minute` (integer), `marker_time` (nullable `MM:SS`), `points_a`/`points_b` (nullable running score) | `app_play_by_play`, keyed by competition, season, game, period, and event ordinal; belongs to one game. Coverage is per game and can lag the schedule. |
| Shot | `game_code`, `shot_ordinal` (integer), `play_number`, `club_code`, `person_code`, `player_name`, `action_code`/`action` (made or missed 2PT/3PT/FT), `points` (integer), `coord_x`/`coord_y` (numeric, basket origin), `zone` (text), `fastbreak`/`second_chance`/`points_off_turnover` (boolean), `minute`, `console_time`, `points_a`/`points_b`, `shot_at` (timestamp with time zone) | `app_shots`, keyed by competition, season, game, and shot ordinal; belongs to one game and joins players by person code. The app derives its own 14 zones from the coordinates. |
| Postseason series | `competition_code`, `season_code`, `phase_code`, ordered club pair, wins, nullable winner, `games` (JSONB) | `app_postseason_series`; reports PI/PO/FF pairings from recorded games without bracket-position labels or a derived completion flag. |
| Data-quality annotation | Target record ID/type, correction or anomaly flag, public note (when safe) | Explains known corrections, gaps, or incomplete data in affected views. |

Scope every season-dependent query by competition and season code. Distinguish scheduled, live/unknown, postponed/cancelled, and completed games when supplied. `NULL` means unavailable, never zero, and a game without play-by-play or shot rows shows an honest empty state rather than derived or fabricated events. Public endpoints read curated `app_*` tables, never Bronze/raw ingestion tables. The pipeline owns the page-shaped aggregates above; the API maps them to validated response contracts rather than recomputing them, and Game Detail never recomputes the published per-game advanced tables in the API or frontend. Legacy `etl_flat_*` aliases may be removed only after application queries and Drizzle discovery no longer use them and the deployed app is verified with its production database role; non-web-app `etl_flat_*` tables remain.

## Tech stack

- **Frontend:** React with Vite and React Router. Tailwind CSS and DaisyUI provide the component system. Zustand is installed for small client-side UI state where it is useful, not yet used anywhere. Chart.js is in use for charts; Motion is used for restrained UI animation on the dashboard, team, and game pages.
- **Backend:** Node.js, Express, and strict TypeScript. REST endpoints are organized by seasons, standings, games, teams, players, statistics, and playoffs, with runtime validation at request and response boundaries.
- **Database:** Neon-hosted PostgreSQL with existing populated tables, mapped through Drizzle ORM. Use versioned Drizzle migrations for future owned schema changes without recreating the existing data. Keep database access server-side, queries parameterized, selected columns explicit, and ordering deterministic.
- **Engineering:** Thin HTTP handlers, reusable query/business modules, tests around transformations, season scoping, response contracts, and misleading statistical edge cases. The frontend is JavaScript and the backend TypeScript: backend types and runtime response validation are the API contract, with no shared or generated types unless API/UI naming drift causes real bugs. Add caching only after a measured need.

## Monetization

None in Phase 1. This is a portfolio and fan product; payments, subscriptions, advertising, and gated statistics are excluded.

## UI/UX

Use a dark sports-analytics style with EuroLeague orange, restrained complementary color, and high-contrast neutral surfaces without copying the league website. Prioritize readable tables and visible season, phase, and round context. Provide deliberate mobile layouts, accessible charts when charts help more than tables, semantic structure, keyboard access, visible focus, sufficient contrast, and non-color-only status cues. Avoid expensive blur and excessive animation.

The planned screens are home, season overview, standings, fixtures/results, game detail, team directory/detail (tabs: Overview, Statistics, Roster, Shooting, Advanced, Games), player search/detail, leaderboards, comparisons/trends, and season format, reached through a persistent navigation bar alongside the season selector. The existing Records work remains a two-season prototype until the archive is loaded. Exact URL paths are not specified in the plans.

## Deployment

- Internet-facing at `jmpeuroleague.com`. Target: static React production build or existing Render frontend setup, independently deployed Express API on Render, Neon PostgreSQL, and existing Cloudflare DNS.
- Provide a lightweight public health endpoint such as `GET /api/health`. Backend variables are `DB_URL`, `PORT`, `NODE_ENV`, and `FRONTEND_URL` (the single CORS origin, a bare HTTP origin). The frontend build reads the public, optional `VITE_API_URL` (default `http://localhost:3000/api` locally), which must never hold a secret.
- Derive install, build, migration, and start commands from actual package scripts. Run migrations as a controlled deployment step, use separate development/production connections, keep secrets out of Vite, and restrict production CORS to real frontend origins.
- Data import/refresh schedule and mechanism are TBD. Do not add a production cron before source, ownership, retry behavior, and idempotency are defined.
- Retire only the publisher-managed legacy web-app compatibility views after a successful dry run and live application verification; never issue a blanket drop for all `etl_flat_*` objects.
