# Fix: Postseason series in a fixed order

**Type:** Fix
**Status:** verified
**Branch:** fix/postseason-series-in-a-fixed-order

## The problem

`getPostseasonSeries` (`backend/src/db/season-games.ts`), behind `GET /api/seasons/:seasonCode/postseason-series`, has no
`ORDER BY`, so Postgres returns the series in whatever order it stores them. Comparing the local database with Neon showed
the same series in different orders (`/2025/postseason-series`: local starts with a playoff series, Neon with a play-in
one). The project's database rules ask for deterministic ordering (`project-overview.md`: "selected columns explicit, and
ordering deterministic").

The Postseason page is not affected today: `buildBracket` (`frontend/src/postseason/bracketModel.js`) matches series by
their pair of clubs and phase, and its one `find` over play-in series picks the single one not already matched. A fixed
order keeps it that way whatever the database.

## The fix

- Order the query by the phase in the order the competition plays them (play-in `PI`, playoffs `PO`, Final Four `FF`, any
  other code after them), then by the series' first game (`games->0->>'gameCode'` as an integer), then by `club_a_code` and
  `club_b_code` so ties are settled too.
- The response shape and contents are unchanged; only the order of `series` becomes fixed.

## Build steps

- [x] 1. **Ordered query.** Add the `orderBy` to `getPostseasonSeries`.
      Done when: `cd backend && npm run build` passes; for E2023 to E2026, `/postseason-series` from the local backend
      lists PI, then PO, then FF series, each phase in the order of its first game; the same request against a temporary
      backend on Neon is not needed (the live site gets the order once deployed); `postseason.spec.js` and the Postseason
      entry of `responsive.spec.js` pass against the local database (`/api/health` says `"target":"local"`).

## Verify

- `curl http://localhost:3000/api/seasons/2025/postseason-series`: the phases come PI, PO, FF.
- `cd frontend && npx playwright test postseason.spec.js responsive.spec.js -g "Postseason"`.

## Built as

- As specced: `orderBy` on the phase (`PI`, `PO`, `FF`, then any other), the first game's code, `club_a_code` and
  `club_b_code`.
- Checks: `cd backend && npm run build` passes. From a temporary backend on the local database, `/postseason-series` lists
  2023 `PI 307-309, PO 310-313, FF 330-333`, 2024 `PI 307-309, PO 310-313, FF 327-330`, 2025 `PI 381-383, PO 384-387,
  FF 404-406`, and 2026 has no series yet. `postseason.spec.js` and the Postseason entry of `responsive.spec.js`: 9 passed,
  against a backend that reported `"target":"local"`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2663,"specSha256":"def74a17a334e311622ee44371bd5735ec21a9aa7dba0a68ffa771cd114df4fa","branch":"refs/heads/fix/postseason-series-in-a-fixed-order","head":"b135bd90b8f50c0626ff8183013d2001820228d2","baseRef":"refs/heads/master","baseCommit":"b135bd90b8f50c0626ff8183013d2001820228d2","sourceTree":"e3a6be839a83fdfff8b23aae8635815c29e1ae66","absentOptional":[]} -->
