# Project Plan

## 1. Problem - What problem are we solving?

JMP Euroleague should give basketball fans one clear, fast place to explore EuroLeague seasons without searching across scattered pages or interpreting raw API data. The rebuilt application will turn the project's PostgreSQL data into understandable standings, schedules, results, team pages, player pages, leaderboards, comparisons, and postseason views.

This is a new PERN implementation of the existing JMP Euroleague product. The immediate goal is to prove the architecture and user experience with a few seasons before expanding the historical range. Phase 1 covers:

- `E2023`: the 2023-24 season
- `E2024`: the 2024-25 season
- `E2025`: the 2025-26 season
- `E2026`: the 2026-27 season

Feature 34 expands development and validation to every modern EuroLeague season from `E2000` (2000-01) through `E2026` (2026-27), using the local PostgreSQL copy of the application tables. Production stays on the four loaded Neon seasons above until a separately approved historical import and deployment. Build the shared foundations first, then adapt one format era or exceptional season at a time; seasons with the same rules share implementation and each receives its own data verification.

The previous custom JMP Rating and prediction experience is not part of this phase. Pages must explain official and descriptive statistics rather than imply predictive meaning.

## 2. Users - Who is this for?

- EuroLeague fans who want quick standings, schedules, results, rosters, and statistical context
- Data-oriented fans who want to explore and compare teams and players in more depth
- The project owner, who needs a trustworthy interface for validating the data warehouse and testing future features
- Recruiters and engineers reviewing the project as a practical example of full-stack and data-engineering work

Users should not need an account or specialist analytics knowledge. The main experience is public and read-only.

## 3. Features - What does the MVP need?

- Global season selection for loaded, allowed seasons: `E2000` to `E2026` locally, initially `E2023` to `E2026` in production
- Home dashboard with standings, recent results, upcoming games, and statistical leaders
- Official standings by available competition phase
- Fixtures and completed results grouped by round
- Game detail and box-score views
- Team directory and detailed team pages
- Player search/directory and detailed player pages
- League leaders for players, teams and advanced statistics, opening on category cards with full leaderboards and filters
- Team and player comparison: the coming round's games to start from, an overview, the full statistics, rosters, advanced numbers and trend charts
- A Postseason page that follows the selected season's actual knockout path: historical elimination series, direct Top 16-to-Final Four qualification, best-of-three or best-of-five quarterfinals, or the modern Play-In path. Show recorded results and the champion only once decided; project participants only where the season's verified rules and complete eligible data support them.
- Navigation that exposes the Postseason and Records views alongside the existing season-scoped pages
- Responsive loading, empty, unavailable, and error states for every data-driven page
- Visible notes for known official corrections, anomalies, and incomplete current-season data
- Historical season support (feature 34): one verified format definition for ordered stages, source phase mappings, groups, participants, qualification and series rules, optional placement games, and exceptional outcomes. Use it across Home, Overview, Standings and race playback, Games and Game Detail, Teams, Players, Leaders, Compare/head-to-head, Postseason, and existing Records/career views. Preserve official group ranks, distinguish cancellation from missing data, and never infer an official overall rank from group positions.

## 4. Data - What are we storing?

PostgreSQL is the application source of truth. The web app should consume curated, validated data rather than raw JSON directly.

Core Phase 1 data includes:

- Competitions, seasons, phases, groups where applicable, and rounds
- Clubs/teams, names, codes, countries, colors, and image/logo references
- Players and available profile attributes
- Player-team-season roster registrations
- Games, dates, venues, status, round/phase, home/away teams, and scores
- Team game box scores and derived season aggregates already approved by the data pipeline
- Player game box scores and derived season aggregates already approved by the data pipeline
- Player season statistics: the league's per-game table lists only players above a minimum of games, so the pipeline derives the missing per-game rows from the accumulated ones (`is_calculated`) and gives every row the minimum games for its season and phase (`min_games`) and a `qualified` flag. Leaderboards and league ranks use qualified players by default; a player under the minimum keeps their numbers but has no rank.
- Official standings records and available tie-break fields
- Play-by-play events and shot locations where the pipeline supplies them
- Play-in, playoff, and Final Four matchup relationships/results
- Precomputed team-season statistics, coverage summaries, and postseason series from the pipeline's `app_*` tables
- Advanced statistics from the pipeline's `app_*` advanced tables (`E2023` to `E2026`): round-by-round team and player ratings, win shares, splits, on/off, lineups, RAPM, and shot-zone and play-by-play team stats. These are read as published; the API does not recompute them.
- Per-game advanced statistics for players and teams, published to Neon by the project owner for `E2023` to `E2026`: `app_game_player_advanced`, `app_game_team_advanced`, `app_game_team_score_flow`, `app_game_team_shot_splits`, `app_game_team_possessions`, `app_game_team_shot_zones`, `app_game_player_on_court`, and `app_game_team_lineup_stints`. These are read as published; the Game Detail page does not recompute them in the API or frontend.
- Data-quality annotations or correction flags that are safe and useful to show in the UI
- Feature 34's season-format metadata and verified exception rules, initially maintained in a small typed backend registry using existing application tables. Store new source-derived fields in the pipeline only when the inventory establishes a necessary gap; do not introduce a parallel competition database or duplicate the pipeline's statistics calculations.

Data rules:

- Every season-dependent query must be scoped by both competition code and season code.
- Browsing, existing records, player season history, and head-to-head are scoped to seasons both allowed for the database target and actually loaded. Local development accepts `E2000` to `E2026`; Neon initially accepts `E2023` to `E2026`. Feature 34 adapts existing archive views to historical data without adding new career leaderboards or importing older seasons into Neon.
- Keep scheduled, live/unknown, postponed/cancelled when supplied, and completed games distinct.
- Treat `NULL` as unavailable; never silently convert missing statistics to zero.
- Preserve stable source identifiers and use them for joins and URLs where appropriate.
- Prefer trusted Gold/application-facing tables or views. Do not query Bronze/raw ingestion tables from public endpoints.
- Read web-app data from the clean `app_*` tables. Legacy `etl_flat_*` aliases may be retired only after no application query or Drizzle discovery filter depends on them and the deployed app has been verified with its production database role.
- Aggregations must have a single documented owner: either the database/data pipeline or the API, not duplicated independently in the frontend.
- Do not store authentication or personal-user data in Phase 1.
- Separate competition outcome from data coverage. An absent future fixture or an incomplete import does not prove that a season or stage finished. `E2019` is cancelled with no champion; its unplayed fixtures must not become upcoming games or projected postseason participants.
- Keep archived results distinct from standings eligibility and statistics eligibility. For `E2021`, preserve available evidence for excluded Russian clubs while using the official remaining-club standings; verify player and record treatment separately. Forfeits, annulments and replays require source-backed rules, not blanket score reconstruction.
- A series leader is not a confirmed winner. Advancement requires the stage's verified win target or an explicit official ruling. Do not infer best-of length from how many games happen to be stored.
- Show group-scoped tables and ranks for group stages, including Top 16. Verify historical qualification, cross-group comparisons, tiebreakers, bracket mappings and placement rules before presenting them as authoritative; prefer official standings to reimplementing a tiebreaker engine.

## 5. Tech - What stack are we using?

### Frontend

- React with Vite
- React Router for page routing
- Existing Zustand usage for small client-side UI state where it is useful; server data should not be copied into a global store without a clear need
- Tailwind CSS and DaisyUI, reusing and simplifying the existing component system
- Chart.js and Motion where they materially improve charts or interactions

### Backend

- Node.js and Express
- TypeScript with strict typing at API boundaries
- REST API organized by domain: seasons, standings, games, teams, players, statistics, and playoffs
- Runtime validation for route parameters, query parameters, and serialized responses

### Database

- PostgreSQL hosted on Neon in production, with the local Gold/application-table copy for historical development and verification
- Drizzle ORM and Drizzle migrations
- Parameterized queries, explicit selected columns, deterministic ordering, and indexes based on real access paths
- Database access only from the backend; never expose `DB_URL` or direct Neon access to the browser

### Engineering approach

- Reuse useful frontend behavior and visual patterns from the current repository, but do not carry over MongoDB/Mongoose, JWT/authentication, Mailtrap, or JMP Rating dependencies.
- The frontend is JavaScript and the backend is TypeScript. Backend types and runtime response validation are the API contract; the frontend does not import or generate shared types. Add shared or generated types only if naming drift between API and UI actually causes bugs.
- Keep route handlers thin: validation and HTTP concerns in routes/controllers, business queries in services/repositories, and schema definitions/migrations in the database layer.
- Add automated tests first around data transformations, season scoping, API response contracts, and edge cases that could misrepresent statistics.
- Add caching only after measuring a repeated expensive query; correctness and transparent invalidation matter more than adding Redis in Phase 1.

## 6. Monetize - How will this make money?

Phase 1 is a portfolio and fan product, not a monetized service. Do not add payments, subscriptions, ad SDKs, or gated statistics. Advertising or premium features can be evaluated later only after the product has regular usage and a clear reason for them.

## 7. UI/UX - How should this look and feel?

Use a modern, dark, sports-analytics style that feels recognizably connected to EuroLeague without copying its website. EuroLeague orange should be the primary accent, supported by a restrained complementary color and high-contrast neutral surfaces.

The interface should be data-rich but calm:

- Prioritize readable tables, strong information hierarchy, and quick scanning.
- Use cards selectively; do not turn every value into a separate card.
- Keep desktop tables powerful while providing deliberate mobile layouts instead of simple horizontal overflow everywhere.
- Make season, phase, and round context visible so users always know which data they are viewing.
- Use charts only when they communicate change or comparison better than a table.
- Provide skeleton/loading, empty, partial-data, and error states that retain page context.
- Label unavailable or corrected data honestly and distinguish it visually from ordinary values.
- Avoid expensive background blur and excessive animation; the previous interface experienced performance problems from blur effects.
- Meet practical accessibility basics: semantic structure, keyboard access, visible focus, sufficient contrast, and non-color-only status indicators.

## 8. Deployment - Where and how will this ship?

The application is internet-facing and uses the existing `jmpeuroleague.com` domain.

Current target architecture:

- React production build served as a static frontend or by the existing Render setup
- Express TypeScript API deployed on Render
- Neon-hosted PostgreSQL database
- Cloudflare for domain/DNS configuration where already in use
- A lightweight public health endpoint such as `GET /api/health`

Environment variables (these are the names the code reads):

- Backend: `DB_URL` (PostgreSQL connection string), `PORT`, `NODE_ENV`, and `FRONTEND_URL` (the single allowed frontend origin, used for CORS; it must be a bare HTTP origin with no path)
- Local backend: `DB_TARGET=local`, `LOCAL_DB_URL`, and optional `LOCAL_DB_SCHEMA` (default `gold`). Neon remains the default production target. Never open the real `.env` when inspecting configuration.
- Frontend build: `VITE_API_URL` (public API base URL; optional, defaults to `http://localhost:3000/api` in local development). It is public, so it must never hold a secret.

Deployment rules:

- Derive exact install, build, migration, and start commands from the repository's `package.json` files; do not invent or rename scripts only to match this document.
- Run schema migrations as a controlled deployment step, not implicitly on every application request.
- Use separate development and production database connections.
- Never commit secrets or expose server environment variables to Vite/client code.
- Restrict CORS to the real frontend origins in production.
- Keep the API deployable independently from the frontend.
- The schedule and mechanism for importing/refreshing EuroLeague data are still TBD; do not add an automatic production cron until its source, ownership, retry behavior, and idempotency are defined.
- Feature 34 is developed and tested locally before any production expansion. Before browser tests, `/api/health` must report `target: local`. Verify local/Neon schema and publishing compatibility, and the existing four-season allowlist, without directing a development backend or test run at Neon. Paying for more Neon storage, importing older production seasons, publishing and deploying remain separate decisions.

## 9. Usage model and constraints

- Public, internet-facing, read-only analytics application
- No authentication, profiles, roles, comments, or personal-user data in Phase 1
- Phase 1 remains EuroLeague-only. Feature 34 extends local development to `E2000` to `E2026`; production remains limited to the loaded `E2023` to `E2026` seasons pending a separate rollout decision.
- Current-season data may be incomplete and will change as games are played
- Historical source data contains known gaps and anomalies; correctness includes exposing uncertainty rather than hiding it
- Expected initial traffic and data volume are modest, but list endpoints should still use bounded responses, filters, and pagination where result sets can grow
- API input must be treated as untrusted even though the UI is read-only
- Rate limiting, response compression, structured logging, and safe error responses should protect the public API without introducing enterprise-level complexity
- Performance target: common navigation and filtered data views should feel immediate after initial load; avoid unbounded queries and oversized payloads
- Availability, formal compliance, audit logging, multi-tenancy, and enterprise SLAs are not Phase 1 requirements

## Explicit exclusions for Phase 1

- JMP Rating calculations
- Win-probability predictions and the Predictor page
- Seasons before `E2000`, including the separate 2000-01 FIBA SuproLeague competition
- Older-season production imports and a paid Neon storage expansion until historical support passes local validation and a separate rollout is approved
- New career or all-season leaderboards and new player-career features beyond adapting the existing loaded-season views
- Per-36 and per-30 player statistics (per-100 figures are published and shown)
- EuroCup, ABA League, NBA, or other competitions
- User authentication and account recovery
- Favorites, notifications, social features, and user-generated content
- Payments, subscriptions, and advertising integrations
