# JMP Euroleague - Project Overview

<!-- blueprint:source-hash f475739cc8f6b133883d79c576cdcbed20cd94c25d0f18cddec8a0f7830c9d5d -->

> A public, read-only EuroLeague explorer for the 2025-26 (`E2025`) and 2026-27 (`E2026`) seasons, backed by curated PostgreSQL data.

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

1. **Season data access** - validated, typed Express endpoints over curated PostgreSQL data for both seasons.
2. **Season navigation** - a global selector that persists across routes without mixing seasons.
3. **Home dashboard** - standings, recent and upcoming games, and statistical leaders at a glance.
4. **Standings** - official phase-specific ranks, records, scoring, form, and available tie-break context.
5. **Fixtures and results** - round/status browsing plus game metadata and available box scores.
6. **Teams** - directory and selected-season identity, roster, schedule, record, and statistics pages.
7. **Players** - search/directory and profile, team, season statistics, and game-log pages.
8. **Statistics leaderboards** - filtered team/player rankings across available metric forms.
9. **Comparisons and trends** - responsive charts and tables for team/player comparisons.
10. **Playoffs** - play-in, playoff, and Final Four matchups/results when source data exists.

Every data-driven page needs loading, empty, unavailable, partial-data, and error states. Known corrections and anomalies must remain visible. JMP Rating, win probabilities, simulations, older seasons, other competitions, and user features are deferred.

## Data model

This is the logical application-facing model, not a claim about the warehouse's current table names. Stable source identifiers must be preserved. Their concrete database types and the exact metric columns require confirmation against the curated schema.

| Model | Core fields and types | Relationships |
| --- | --- | --- |
| Competition | `id` (source ID), `name` (string) | Has seasons; Phase 1 exposes EuroLeague only. |
| Season | `code` (string: `E2025` or `E2026`), `competitionId` (source ID), `label` (string) | Has phases, rounds, games, rosters, standings, and aggregates. |
| Phase | `id` (source ID), `seasonCode` (string), `name` (string) | Has optional groups and rounds. |
| Group | `id` and `phaseId` (source IDs), `name` (string) | Optional subdivision of a phase. |
| Round | `id` and `phaseId` (source IDs), optional `groupId`, `label` (string) | Groups games within a phase. |
| Team | `id` (source ID), `name`, `code`, `country`, `colors`, `logoRef` (strings or nullable references) | Appears in rosters, games, standings, and team statistics. |
| Player | `id` (source ID), `name` (string), available profile fields (nullable) | Joins teams through season roster registrations and appears in player statistics. |
| Roster registration | `playerId`, `teamId` (source IDs), `seasonCode` (string) | Records player-team membership for a season. |
| Game | `id` (source ID), `seasonCode`, `phaseId`, `roundId`, `homeTeamId`, `awayTeamId`, `date` (date/time or null), `venue` (string or null), `status` (source status), `homeScore` and `awayScore` (integer or null) | Has two teams and available box scores; can belong to a postseason matchup. |
| Team and player game box scores | `gameId` plus `teamId` or `playerId` (source IDs), available metrics (nullable numeric fields) | Feed game detail and approved aggregates. |
| Team and player season aggregates | `seasonCode` plus `teamId` or `playerId`, approved metrics (nullable numeric fields) | Feed pages, dashboard, comparisons, and leaderboards. |
| Official standing | `seasonCode`, `phaseId`, optional `groupId`, `teamId`, `rank` (integer), record/scoring/form/tie-break fields (nullable) | One official placement for a team in its applicable standing context. |
| Postseason matchup | `seasonCode`, stage (play-in, playoffs, or Final Four), participant team IDs (nullable), related game IDs, result (nullable) | Represents known bracket relationships without inventing future participants. |
| Data-quality annotation | Target record ID/type, correction or anomaly flag, public note (when safe) | Explains known corrections, gaps, or incomplete data in affected views. |

Scope every season-dependent query by season code. Distinguish scheduled, live/unknown, postponed/cancelled, and completed games when supplied. `NULL` means unavailable, never zero. Prefer validated Gold/application-facing tables or views, never Bronze/raw ingestion tables in public endpoints. Document one owner for each aggregation, either the pipeline/database or the API, and do not recompute it independently in the frontend.

## Tech stack

- **Frontend:** React with Vite and React Router. Tailwind CSS and DaisyUI provide the component system; Zustand is planned only for useful small client UI state. Chart.js and Motion are optional when they materially improve a view.
- **Backend:** Node.js, Express, and strict TypeScript. REST endpoints are organized by seasons, standings, games, teams, players, statistics, and playoffs, with runtime validation at request and response boundaries.
- **Database:** Neon-hosted PostgreSQL with Drizzle ORM and versioned Drizzle migrations. Keep database access server-side, queries parameterized, selected columns explicit, and ordering deterministic.
- **Engineering:** Thin HTTP handlers, reusable query/business modules, tests around transformations, season scoping, response contracts, and misleading statistical edge cases. Add caching only after a measured need.

## Monetization

None in Phase 1. This is a portfolio and fan product; payments, subscriptions, advertising, and gated statistics are excluded.

## UI/UX

Use a dark sports-analytics style with EuroLeague orange, restrained complementary color, and high-contrast neutral surfaces without copying the league website. Prioritize readable tables and visible season, phase, and round context. Provide deliberate mobile layouts, accessible charts when charts help more than tables, semantic structure, keyboard access, visible focus, sufficient contrast, and non-color-only status cues. Avoid expensive blur and excessive animation.

The planned screens are home, standings, fixtures/results, game detail, team directory/detail, player search/detail, leaderboards, comparisons/trends, and playoffs. Exact URL paths are not specified in the plans.

## Deployment

- Internet-facing at `jmpeuroleague.com`. Target: static React production build or existing Render frontend setup, independently deployed Express API on Render, Neon PostgreSQL, and existing Cloudflare DNS.
- Provide a lightweight public health endpoint such as `GET /api/health`. Expected server variables are `DATABASE_URL`, `PORT`, `NODE_ENV`, and `CLIENT_URL` or `CORS_ORIGIN`; final names must match implementation.
- Derive install, build, migration, and start commands from actual package scripts. Run migrations as a controlled deployment step, use separate development/production connections, keep secrets out of Vite, and restrict production CORS to real frontend origins.
- Data import/refresh schedule and mechanism are TBD. Do not add a production cron before source, ownership, retry behavior, and idempotency are defined.

## Open questions

> TODO: Confirm the curated Neon schema, source ID types, exact metric columns, available profile/tie-break fields, and postseason relationships before locking API response contracts.

> TODO: Reconcile the planned `DATABASE_URL` and `CLIENT_URL`/`CORS_ORIGIN` names with the current backend `DB_URL` and `FRONTEND_URL` configuration.

> TODO: The plan calls Zustand usage existing, but it is not installed in this scaffold. Chart.js and Motion are also not installed. The scaffold has TanStack Query and Axios, which the project plan does not name. Confirm these choices in the plans when their features are specified.

> TODO: Clarify how shared/generated TypeScript response types apply to the JavaScript frontend.
