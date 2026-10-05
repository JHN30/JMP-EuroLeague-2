# JMP Euroleague - Project Overview

<!-- blueprint:source-hash f54104cc6acfda371f28d74bf7408c2fcaf61d0053df2b48b1f0c1384c6cd065 -->

> A public, read-only EuroLeague explorer for the 2023-24 (`E2023`) to 2026-27 (`E2026`) seasons, backed by curated Neon PostgreSQL tables.

## Problem

Fans currently have to search scattered pages or interpret raw API data to understand a EuroLeague season. This PERN rebuild presents standings, games, teams, players, statistics, comparisons, and postseason results in one clear interface, proving the architecture and experience on a few seasons before any wider historical expansion.

## Users

- **EuroLeague fans** need quick standings, fixtures, results, rosters, and statistical context.
- **Data-oriented fans** need deeper team and player comparisons without specialist analytics knowledge.
- **The project owner** needs a trustworthy view of the data warehouse and a place to test future features.
- **Recruiters and engineers** need a practical example of full-stack and data-engineering work.

## Usage model

- Public, internet-facing, read-only, and EuroLeague-only in Phase 1. No accounts, personal-user data, multi-tenancy, payments, or predictions.
- All current browsing, records, and player views are limited to the loaded seasons, `E2023` to `E2026`. Archive-wide records remain deferred until further historical seasons are loaded. Data can contain gaps or corrections; show uncertainty instead of filling it with zero or an invented result.
- Treat API input as untrusted. Bound growing lists with filters and pagination. Use safe errors, rate limiting, response compression, and structured logging without assuming enterprise scale.
- Initial traffic and data volume are expected to be modest. Formal compliance, audit logging, enterprise SLAs, and high availability are not Phase 1 requirements.

## Features

The headline is a four-season public explorer whose every view stays in the selected season. Build order (all shipped):

1. **Season data access** - validated, typed Express endpoints over the existing Neon data: season catalog (1a), teams, players, and rosters (1b), games and box scores (1c), standings and season statistics (1d).
2. **Season navigation** - a global selector that persists across routes without mixing seasons.
3. **Home dashboard** - standings, recent and upcoming games, and statistical leaders at a glance.
4. **Standings** - official phase-specific ranks, records, scoring, form, and available tie-break context.
5. **Navigation bar** - persistent tabs to Home, Overview, Standings, Games, Teams, Players, Leaders, Compare, and Postseason (named in 19d and 30), alongside the season selector.
6. **Fixtures and results** - round/status browsing plus game metadata and available box scores.
7. **Teams** - directory and selected-season identity, roster, schedule, record, and statistics pages.
8. **Players** - search/directory and profile, team, season statistics, and game-log pages (reworked in 25).
9. **Statistics leaderboards** - filtered team/player rankings across available metric forms (reworked in 28).
10. **Comparisons and trends** - responsive charts and tables for team/player comparisons (reworked in 29).
11. **Playoffs** - play-in, playoff, and Final Four matchups/results when source data exists, never with invented participants (replaced by 30).
12. **Visual design system pass** - a theme-aware DaisyUI language: shared panel, card, table, and badge primitives, and a compact navbar with the season selector.
13. **Richer stats presentation** - player headshots and team crests throughout; compact dropdown filters.
14. **Analytics-forward visual refresh** - KPI strips, charts, standings tiers, and mobile layouts.
15. **UI/UX guideline foundations** - themes, typography, accessibility, UI primitives, routing, async and filter conventions, chart rules (`UI-UX.md`).
16. **Data coverage and honest placeholders** - a five-status coverage inventory and placeholders for what the data cannot support (16a-16c).
17. **Guideline page depth** - season overview, standings, game, team, and player detail, leaderboards, comparisons, records, and season format, scoped to available data.
18. **Event and shot data** - play-by-play, game flow, and shot charts from `app_play_by_play` and `app_shots` (18a-18e), including shooting studio modes and season shot locations on Team and Player pages.
19. **Application-table adoption and navigation** - read the pipeline's page-shaped `app_*` tables, not legacy tables or API recomputation: consolidated `app_standings` (19a), team statistics and coverage (19b), postseason series without invented bracket positions (19c); tabs aligned to the page names above (19d).
20. **Home dashboard polish** - per direct user request: current-round indicator, upcoming-games row, KPI strip, standings and results, leaders strip, crests and photos, no coverage panel.
21. **Season overview polish** - per direct user request: phase timeline, average points per team chart, Defining games and Statistical leaders; KPI cards, standings snapshot, links bar, and coverage panel removed.
22. **Advanced stats from the new Neon tables** - the pipeline's 12 advanced tables (`E2023` to `E2026`), read-only, with sample sizes shown and small samples hidden: Advanced standings, Team and Player Advanced tabs (24f, 25e), and Advanced leaders with a minimum-minutes filter (28c).
23. **Game detail rebuild** - per direct user request, reading per-game pipeline tables (never recomputed): box score cleanup (23a); Overview with line score, best player by game PER (10+ minutes), score flow (23b); minutes timeline and assist connections (23c); Traditional/Advanced box score (23d); Four Factors (23e); scoring profile and momentum (23f); rotations and Lineups (23g); shot zones on a FIBA court (23h).
24. **Team page rework** - tabs Overview, Statistics, Roster, Shooting, Advanced, Games. Backend additions: `GET /seasons/:seasonCode/team-stats?phase=` (every club's season totals for a phase, for league ranks) and `GET /seasons/:seasonCode/teams/:clubCode/coaches` (24a-24g).
25. **Players page and player page rework** - tabs Overview, Season by season, Statistics, Advanced, Shooting, Games. Backend additions: the player endpoints return photo, current club, jersey number, and position; the player advanced endpoint returns rank, percentile, and league spread for PER, Win Shares, WS/40, usage, RAPM, and on/off (25a-25g).
26. **Historical seasons and qualified player statistics** - `E2023` and `E2024` join the supported seasons. Per-game player rows now exist under the feed's minimum games (`is_calculated`), with `min_games` and `qualified` on every row; `season-stats` returns them and takes `qualified=true` and `minGames=N`, and boards and ranks default to qualified players.
27. **Data audit of Home, Overview, Standings, and Games** - per-game scoring counts overtime (team totals include it, official standings points do not, and the pages say which they show), records are explained, and the unused Home components and coverage panel code are removed.
28. **Leaders page rework** - `/:season/statistics` opens on category cards (top five per statistic) for Players, Teams, and Advanced, each opening a full leaderboard: statistic families, per game or totals, minimum games (qualified by default), team and position filters, search, paging, rank-movement arrows, attempt minimums on percentages. "Hot right now" sets the last five games against the season. Backend: `GET /seasons/:seasonCode/leaders/form?phase=&games=`, `position` on `season-stats`, and `advanced/leaders` with `offset`, `order`, `minMinutes`, photo, and total. The shared tab strip gained three levels (28d). Not built: per-36/per-30, career leaders.
29. **Compare page rework** - opens on the coming round's games above pickers for any two teams or players; a picked game opens the comparison with the home club first (29a). Teams: Overview (matchup edges over 16 measures, form and venue records, top scorers, meetings), Statistics (every statistic with league places), Rosters (squad facts, top five by Win Shares, rosters), Trends (last five games against the season, five-game averages, running differential, margin bars) (29b). Players: Overview (percentile radar, season line, form), Statistics, Advanced (PER, Win Shares, per-100, rates with places), Trends (29c). Backend: `GET /seasons/:seasonCode/teams/:clubCode/players-advanced` and `players/:personKey/advanced?extended=true` (per-100 and rate figures with ranks). Player search is debounced (29d).
30. **Postseason page** - `/:season/postseason` (`/playoffs` redirects) replaces Format: the Play-In, Playoffs, and Final Four as a bracket with series scores, per-matchup games, and club path highlighting. Unplayed matchups are filled from the standings and earlier winners and marked Projected (seeding, not a simulation or prediction); unknown participants show placeholders. A race table lists every club that can still reach a place, with clinch status from wins and games left (tiebreakers ignored); a finished season shows its champion and every club's finish.

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
| Player season statistics | `season_code`, `phase_code`, `mode` (`perGame` or `accumulated`), `entry_ordinal`, `person_key`, nullable numeric metrics, `is_calculated` (boolean), `min_games` (integer), `qualified` (boolean) | Four `app_season_player_stats_*` tables (traditional, advanced, scoring, miscellaneous). The league lists per-game rows only above a minimum of games; the pipeline derives the rest from the accumulated rows (`is_calculated`). `qualified` says the player meets `min_games` for the season and phase. |
| Official standing | `season_code`, `phase_code`, `round_number`, `club_code`, `position` (nullable integer), available record/scoring/form fields | `app_standings` holds one row per club and round with the basic, calendar, streaks, ahead/behind, and margins views plus `form` and `streak_history` JSON. |
| Team season statistics | `competition_code`, `season_code`, `phase_code`, `club_code`, `games_played`, nullable `own_*` and `opp_*` numeric measures | `app_team_season_stats`; one pipeline-owned aggregate per club and phase, read per club or for every club in a phase. |
| Advanced round and season tables (feature 22) | `competition_code`, `season_code`, `scope` (`RS`, `all`, `PS`), `round_number`, `club_code` or `person_key`, nullable numeric measures | Twelve `app_*` tables: `app_standings_stats`, `app_team_round_stats`/`ratings`/`splits`, `app_player_round_stats`/`ratings`/`win_shares`, `app_team_pbp_stats`, `app_team_shot_zone_stats`, `app_player_on_off`, `app_lineup_ratings`, `app_player_rapm`. Round tables are cumulative through the round; ratios are fractions. |
| Per-game advanced (feature 23) | `competition_code`, `season_code`, `game_code`, `side` (plus `person_key`, `zone`, or `stint_ordinal` where present), nullable numeric measures | Read-only: `app_game_player_advanced` (adds `game_uper`, `game_aper`, `game_per`), `app_game_team_advanced`, `_score_flow`, `_shot_splits`, `_possessions`, `_shot_zones`, `app_game_player_on_court`, `app_game_team_lineup_stints`. |
| Coverage summary | season or game key plus `items` (JSONB array of eight typed availability records) | `app_coverage_seasons` and `app_coverage_games`; game coverage mixes game-scoped event counts with season-scoped roster/statistics counts. |
| Play-by-play event | `game_code`, `period` (text), `event_ordinal` (integer), `club_code`, `person_code`, `player_name`, `play_type` (text code), `play_info`, `minute`, `marker_time` (nullable `MM:SS`), `points_a`/`points_b` (nullable running score) | `app_play_by_play`, keyed by competition, season, game, period, and event ordinal; coverage is per game and can lag the schedule. |
| Shot | `game_code`, `shot_ordinal` (integer), `club_code`, `person_code`, `action_code`/`action` (made or missed 2PT/3PT/FT), `points`, `coord_x`/`coord_y` (numeric, basket origin), `zone`, `fastbreak`/`second_chance`/`points_off_turnover` (boolean, scoring shots only), `shot_at` | `app_shots`, keyed by competition, season, game, and shot ordinal; joins players by person code. The app derives its own 14 zones from the coordinates. |
| Postseason series | `competition_code`, `season_code`, `phase_code`, ordered club pair, wins, nullable winner, `games` (JSONB) | `app_postseason_series`; reports PI/PO/FF pairings from recorded games without bracket-position labels or a completion flag. The Postseason page places them in a bracket with the regular-season standings (feature 30). |
| Data-quality annotation | Target record ID/type, correction or anomaly flag, public note (when safe) | Explains known corrections, gaps, or incomplete data in affected views. |

Scope every season-dependent query by competition and season code. Distinguish scheduled, live/unknown, postponed/cancelled, and completed games when supplied. `NULL` means unavailable, never zero, and a game without play-by-play or shot rows shows an honest empty state. Public endpoints read curated `app_*` tables, never Bronze/raw tables. The pipeline owns the page-shaped aggregates above; the API maps them to validated response contracts rather than recomputing them, and the API, not the frontend, owns any aggregation a page needs. Leaderboards and league ranks use `qualified` players by default; a player under the minimum keeps their numbers but has no rank. Legacy `etl_flat_*` aliases may go only once queries and Drizzle discovery no longer use them and the deployed app is verified; non-web-app `etl_flat_*` tables remain.

## Tech stack

- **Frontend:** React with Vite and React Router. Tailwind CSS and DaisyUI provide the component system. Zustand is installed for small client-side UI state where it is useful, not yet used anywhere. Chart.js is in use for charts; Motion is used for restrained UI animation across the app.
- **Backend:** Node.js, Express, and strict TypeScript. REST endpoints are organized by seasons, standings, games, teams, players, statistics, and playoffs, with runtime validation at request and response boundaries.
- **Database:** Neon-hosted PostgreSQL with existing populated tables, mapped through Drizzle ORM. Use versioned Drizzle migrations for future owned schema changes without recreating the existing data. Keep database access server-side, queries parameterized, selected columns explicit, and ordering deterministic.
- **Engineering:** Thin HTTP handlers, reusable query/business modules, and tests around transformations, season scoping, response contracts, and misleading statistical edge cases. The frontend is JavaScript and the backend TypeScript: backend types and runtime response validation are the API contract, with no shared or generated types unless API/UI naming drift causes real bugs. Add caching only after a measured need.

## Monetization

None in Phase 1. This is a portfolio and fan product; payments, subscriptions, advertising, and gated statistics are excluded.

## UI/UX

Use a dark sports-analytics style with EuroLeague orange, restrained complementary color, and high-contrast neutral surfaces without copying the league website. Prioritize readable tables and visible season, phase, and round context. Provide deliberate mobile layouts, accessible charts, semantic structure, keyboard access, visible focus, sufficient contrast, and non-color-only status cues. Avoid expensive blur and excessive animation.

The planned screens are home, season overview, standings, games, game detail, team directory/detail (tabs: Overview, Statistics, Roster, Shooting, Advanced, Games), player directory/detail (tabs: Overview, Season by season, Statistics, Advanced, Shooting, Games), Leaders (cards, then boards), Compare (games panel, then Overview, Statistics, Rosters or Advanced, Trends), and Postseason (bracket), reached through a persistent navigation bar alongside the season selector. Tab strips have three levels: a page's main navigation, the filter under it, and detail strips. Records cover the loaded seasons. Exact URL paths are not specified in the plans.

## Deployment

- Internet-facing at `jmpeuroleague.com`. Target: static React production build or existing Render frontend setup, independently deployed Express API on Render, Neon PostgreSQL, and existing Cloudflare DNS.
- Provide a lightweight public health endpoint such as `GET /api/health`. Backend variables are `DB_URL`, `PORT`, `NODE_ENV`, and `FRONTEND_URL` (the single CORS origin, a bare HTTP origin). The frontend build reads the public, optional `VITE_API_URL` (default `http://localhost:3000/api` locally), which must never hold a secret.
- Derive install, build, migration, and start commands from the actual package scripts. Run migrations as a controlled deployment step, keep development and production connections separate, keep secrets out of Vite, and restrict production CORS to real frontend origins.
- Data import/refresh schedule and mechanism are TBD. Do not add a production cron before source, ownership, retry behavior, and idempotency are defined.
- Retire only the publisher-managed legacy web-app compatibility views after a successful dry run and live verification; never blanket-drop `etl_flat_*` objects.
