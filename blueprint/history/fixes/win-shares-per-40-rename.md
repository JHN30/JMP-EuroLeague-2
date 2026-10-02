# Fix: Win Shares rate renamed from per 48 to per 40

**Type:** Fix
**Status:** verified
**Branch:** feature/advanced-box-score (done alongside feature 23d; not run through `/fix` and `/implement`)

Recorded after the work.

## The problem

The pipeline stored `win_shares_per_48` (`win_shares x 48 / minutes`, the NBA convention), but a EuroLeague
game is 40 minutes. The pipeline owner renamed the Neon column to `win_shares_per_40` (`x 40 / minutes`, league
mean about 0.100) and republished E2025 and E2026 (see `WIN_SHARES_PER_40.md`). Once the column was renamed, the
API query for `win_shares_per_48` failed, so the Win Shares leaderboard and the Player page's Advanced tab broke.

## What changed

- `backend/src/db/season-advanced-schema.ts`: the Drizzle column is now `winSharesPer40` / `win_shares_per_40`.
- `backend/src/db/season-advanced.ts`, `backend/src/routes/seasons.ts`: every use of `winSharesPer48` is now
  `winSharesPer40` (leaders metric key, minimum-minutes table, the player advanced response field).
- `frontend/src/statistics/AdvancedLeaderboard.jsx`, `frontend/src/players/PlayerAdvancedSection.jsx`: labels are
  "Win Shares / 40", "Win Shares per 40 minutes" and "WS/40"; the metric key is `winSharesPer40`.
- `DATA_DICTIONARY.md`: the `win_shares_per_40` row.
- No value is rescaled in the app; Neon already holds the 40-minute number.

## Verify

- Neon: `app_player_round_win_shares` has `win_shares_per_40` and no `win_shares_per_48`.
- Through the real router: `GET /advanced/leaders?metric=winSharesPer40` returns rows (Milutinov, E2025, 0.304113);
  the old `winSharesPer48` metric now returns 400; `GET /players/003941/advanced` returns `winSharesPer40` 0.304113,
  which equals `winShares` 6.548701 x 40 / (51,681 / 60 minutes).
- `cd backend && npm run build`, `cd frontend && npm run lint`, `npm run build` and `npm run test:browser` (43 tests) pass.

## Known gaps

- The advanced box score (feature 23d) still shows total Win Shares only, not the rate.
- No colour bands or minimum-value filters tuned to the 48 scale were found in the app.
