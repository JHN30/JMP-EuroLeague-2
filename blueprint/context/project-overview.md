# JMP Euroleague - Project Overview

<!-- blueprint:source-hash 6db24ee6d81feff862ee84c41723d6359322cfbfe0ffa8d15030885765018743 -->

> A public, read-only EuroLeague explorer for the 2025-26 (`E2025`) and 2026-27 (`E2026`) seasons, backed by already populated Neon PostgreSQL tables.

## Problem

Fans currently have to search scattered pages or interpret raw API data to understand a EuroLeague season. This PERN rebuild will present standings, games, teams, players, statistics, comparisons, and postseason results in one clear interface. Phase 1 proves the architecture and user experience with two seasons before any historical expansion.

## Users

- **EuroLeague fans** need quick standings, fixtures, results, rosters, and statistical context.
- **Data-oriented fans** need deeper team and player comparisons without specialist analytics knowledge.
- **The project owner** needs a trustworthy view of the data warehouse and a place to test future features.
- **Recruiters and engineers** need a practical example of full-stack and data-engineering work.

## Usage model

- Public, internet-facing, read-only, and EuroLeague-only in Phase 1. No accounts, personal-user data, multi-tenancy, payments, or predictions.
- Only `E2025` and `E2026` are in scope. Current-season data can be incomplete and historical records can contain known gaps or corrections; show uncertainty instead of filling it with zero or an invented result.
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
12. **Visual design system pass** - a consistent, theme-aware DaisyUI visual language across every existing page. Build it in five reviewable parts:
    - **12a Shared design system, navbar, dashboard, and standings** - shared panel/card/table/badge/stat-callout primitives, compact responsive navbar with persistent season/competition selector, applied to the home dashboard and standings pages.
    - **12b Fixtures, results, and game detail** - the fixtures/results browser and game detail/box-score page.
    - **12c Teams and players** - the team and player directory/detail pages.
    - **12d Statistics leaderboards and comparisons** - the leaderboards and comparisons/trends pages, including theme-aware Chart.js styling.
    - **12e Playoffs** - the playoffs matchup page.
13. **Richer stats presentation** - use already-available player photos and team crests throughout the app, and consolidate stacked filter-tab rows into compact dropdowns on the densest pages. Build it in three reviewable parts:
    - **13a Player photos in stats views** - real player headshots (already returned by the season-stats and box-score APIs) in the leaderboard, comparisons, box scores, and player game logs.
    - **13b Team crests everywhere** - crest URLs joined into standings/fixtures/game-detail API responses and shown in standings, fixtures, game headers, the dashboard, and comparisons.
    - **13c Compact filter controls** - stacked tab-row filters on the statistics and comparisons pages replaced with compact dropdown selects.

Every data-driven page needs loading, empty, unavailable, partial-data, and error states. Known corrections and anomalies must remain visible. JMP Rating, win probabilities, simulations, older seasons, other competitions, and user features are deferred.

## Data model

This is the logical application-facing model. `create_v2_v3_tables.sql` documents the existing `etl_flat_*` Neon tables and their PostgreSQL types; it is a schema reference, not a request to recreate or reload them. Confirm the live table definitions and content before locking API contracts. Preserve composite source identifiers and season scope.

| Model | Core fields and types | Relationships |
| --- | --- | --- |
| Competition | `competition_code` (text), `competition_name` (nullable text) | Appears in each source key; Phase 1 exposes EuroLeague only. |
| Season | `season_code` (text: `E2025` or `E2026`), `competition_code` (text), `name` (nullable text) | `etl_flat_seasons`; scopes rounds, games, rosters, standings, and statistics. |
| Phase | `phase_code` (text), `phase_name` (nullable text) | Present in round/game/statistics rows; no separate phase table is listed in the supplied SQL. |
| Group | `group_id`, `group_name` (nullable text) | Optional subdivision carried by game rows. |
| Round | `round_key` (text), `phase_code` (text), `round_number` (integer), `name` (nullable text) | `etl_flat_rounds`; groups games within a phase. |
| Team | `club_code` (text), `name`, `country_code`, `crest_url` (nullable text) | `etl_flat_clubs`, keyed with competition and season; appears in rosters, games, and standings. |
| Player | `person_key` (text), `name` (nullable text), available profile fields (nullable) | `etl_flat_people`, keyed with competition and season; joins registrations and player statistics. |
| Roster registration | `registration_key`, `person_key` (text), `club_code` (nullable text), `season_code` (text) | `etl_flat_registrations`; records player-team membership for a season. |
| Game | `game_code` (integer), `season_code`, `phase_code`, `round_number`, home/away `club_code`, `scheduled_at` (nullable timestamp with time zone), `game_status` (nullable text), scores (nullable integer) | `etl_flat_games`; has two teams and available box scores. |
| Team and player game box scores | `game_code`, `side` (text), `person_key` (player rows), available nullable numeric metrics | `etl_flat_game_team_stats` and `etl_flat_game_player_stats`; feed game detail. |
| Player season statistics | `season_code`, `phase_code`, `mode`, `entry_ordinal`, `person_key`, available nullable numeric metrics | Four `etl_flat_season_stats_*` tables contain traditional, advanced, scoring, and miscellaneous views. No team season aggregate table is listed in the supplied SQL. |
| Official standing | `season_code`, `phase_code`, `round_number`, `club_code`, `position` (nullable integer), available record/scoring/form fields | Seven `etl_flat_standings_*` tables provide distinct official views and form rows. |
| Postseason matchup | `seasonCode`, stage (play-in, playoffs, or Final Four), participant team IDs (nullable), related game IDs, result (nullable) | Represents known bracket relationships without inventing future participants. |
| Data-quality annotation | Target record ID/type, correction or anomaly flag, public note (when safe) | Explains known corrections, gaps, or incomplete data in affected views. |

Scope every season-dependent query by season code. Distinguish scheduled, live/unknown, postponed/cancelled, and completed games when supplied. `NULL` means unavailable, never zero. Prefer validated Gold/application-facing tables or views, never Bronze/raw ingestion tables in public endpoints. Document one owner for each aggregation, either the pipeline/database or the API, and do not recompute it independently in the frontend.

## Tech stack

- **Frontend:** React with Vite and React Router. Tailwind CSS and DaisyUI provide the component system; Zustand is planned only for useful small client UI state. Chart.js and Motion are optional when they materially improve a view.
- **Backend:** Node.js, Express, and strict TypeScript. REST endpoints are organized by seasons, standings, games, teams, players, statistics, and playoffs, with runtime validation at request and response boundaries.
- **Database:** Neon-hosted PostgreSQL with existing populated tables, mapped through Drizzle ORM. Use versioned Drizzle migrations for future owned schema changes without recreating the existing data. Keep database access server-side, queries parameterized, selected columns explicit, and ordering deterministic.
- **Engineering:** Thin HTTP handlers, reusable query/business modules, tests around transformations, season scoping, response contracts, and misleading statistical edge cases. Add caching only after a measured need.

## Monetization

None in Phase 1. This is a portfolio and fan product; payments, subscriptions, advertising, and gated statistics are excluded.

## UI/UX

Use a dark sports-analytics style with EuroLeague orange, restrained complementary color, and high-contrast neutral surfaces without copying the league website. Prioritize readable tables and visible season, phase, and round context. Provide deliberate mobile layouts, accessible charts when charts help more than tables, semantic structure, keyboard access, visible focus, sufficient contrast, and non-color-only status cues. Avoid expensive blur and excessive animation.

The planned screens are home, standings, fixtures/results, game detail, team directory/detail, player search/detail, leaderboards, comparisons/trends, and playoffs, reached through a persistent navigation bar alongside the season selector. Exact URL paths are not specified in the plans.

## Deployment

- Internet-facing at `jmpeuroleague.com`. Target: static React production build or existing Render frontend setup, independently deployed Express API on Render, Neon PostgreSQL, and existing Cloudflare DNS.
- Provide a lightweight public health endpoint such as `GET /api/health`. Expected server variables are `DATABASE_URL`, `PORT`, `NODE_ENV`, and `CLIENT_URL` or `CORS_ORIGIN`; final names must match implementation.
- Derive install, build, migration, and start commands from actual package scripts. Run migrations as a controlled deployment step, use separate development/production connections, keep secrets out of Vite, and restrict production CORS to real frontend origins.
- Data import/refresh schedule and mechanism are TBD. Do not add a production cron before source, ownership, retry behavior, and idempotency are defined.

## Open questions

> TODO: Confirm the supplied SQL matches the live Neon schema and identify which `etl_flat_*` tables are approved for public API reads. The SQL has no separate phase, team season aggregate, postseason matchup, or data-quality annotation table; confirm the source and ownership of those views before their endpoints are specified.

> TODO: Reconcile the planned `DATABASE_URL` and `CLIENT_URL`/`CORS_ORIGIN` names with the current backend `DB_URL` and `FRONTEND_URL` configuration.

> TODO: The plan calls Zustand usage existing, but it is not installed in this scaffold. Chart.js and Motion are also not installed. The scaffold has TanStack Query and Axios, which the project plan does not name. Confirm these choices in the plans when their features are specified.

> TODO: Clarify how shared/generated TypeScript response types apply to the JavaScript frontend.
