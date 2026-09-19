# Build Plan

This plan covers the PERN rebuild of JMP Euroleague. Phase 1 supports only EuroLeague seasons `E2025` (2025-26) and `E2026` (2026-27). Build every feature against PostgreSQL data exposed through the TypeScript API; do not reuse the old MongoDB models or rating-based logic.

Scaffolding, shared layout, design tokens, database connection setup, and deployment configuration are pre-build work rather than product features.

## Your features

- [x] 1. **Season data access** - Expose validated `E2025` and `E2026` competition, phase, round, team, player, roster, game, standings, and statistics data through typed Express API endpoints backed by Drizzle and Neon PostgreSQL. Use `create_v2_v3_tables.sql` as a schema reference for tables already populated in Neon.
  - [x] 1a. **Season catalog** - Expose the supported EuroLeague seasons, competition details, phases, and rounds through typed, validated API endpoints. Read the already populated Neon tables with Drizzle; use `create_v2_v3_tables.sql` as the schema reference.
  - [x] 1b. **Teams, players, and rosters API** - Expose season-scoped team and player identities and roster registrations from the existing Neon data.
  - [x] 1c. **Games and box scores API** - Expose season-scoped fixtures, results, game details, and available team and player game statistics.
  - [x] 1d. **Standings and season statistics API** - Expose official standings and available season statistics without replacing missing values with zero.
    - [x] 1d-i. **Official standings** - Expose the official round-scoped EuroLeague standings (basic record, calendar-based record, streaks, ahead/behind splits, scoring margins, calendar streak history, and recent form) for a season and phase.
    - [x] 1d-ii. **Season statistics** - Expose available season-long player statistics (traditional, advanced, scoring, and miscellaneous views) across their accumulated/per-game modes and phase scopes.
- [x] 2. **Season navigation** - Add a global season selector and preserve the selected season across routes, defaulting to the most relevant available season without mixing records from different seasons.
- [x] 3. **Home dashboard** - Present the selected season at a glance with current standings, recent results, upcoming games, and leading team and player statistics, with links into detailed pages.
- [x] 4. **Standings** - Display official season standings by phase with rank, record, scoring, streak/form when available, tie-break context, and clear indicators for known corrections or incomplete data.
- [x] 5. **Navigation bar** - Add a persistent navigation bar with tabs to Home, Standings, Fixtures and results, Teams, Players, Statistics leaderboards, Comparisons and trends, and Playoffs, alongside the existing season selector.
- [x] 6. **Fixtures and results** - Browse games by round and status, distinguish scheduled from completed games, and open a game page containing score, metadata, and team/player box-score statistics when available.
- [x] 7. **Teams** - Browse teams and open a team page with identity, roster, schedule/results, season record, and team statistics for the selected season.
- [x] 8. **Players** - Search and browse players and open a player page with profile information, current team, season totals/per-game statistics, and game-by-game performance.
- [x] 9. **Statistics leaderboards** - Rank and filter team and player metrics for the selected season, supporting the available accumulated, per-game, and rate-based views without presenting missing values as zero.
- [x] 10. **Comparisons and trends** - Compare selected teams or players and visualize useful season/game trends with responsive, accessible charts and tables.
- [x] 11. **Playoffs** - Show play-in, playoff, and Final Four matchups/results for the selected season, handling future or incomplete rounds without inventing participants or outcomes.

## Deferred beyond Phase 1

- JMP Rating, win probabilities, and the Predictor page
- Seasons earlier than `E2025`
- EuroCup and other competitions
- Authentication, profiles, saved favorites, and other user-specific data
- Automated playoff simulation or outcome prediction
