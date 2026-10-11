# Fix: Records API first-request cost

**Type:** Fix
**Status:** verified
**Branch:** fix/records-api-first-request-cost

## The problem

Feature 33c added metrics, a team-games route and picture fields to the four records routes. Measured on the local database, a first (uncached)
request returns 11 to 21 KB and, on Neon, I estimate 50 to 110 KB read from the database and 4 to 24 small queries; a repeat within the 10-minute
cache is free. Neon's free plan meters every byte sent back, and two parts of what 33c added cost more than they need to:

1. **TV codes are looked up twice.** `clubLooks` in `backend/src/db/season-records.ts` calls `getTeams(seasonCode)` and `getClubTvCodes(seasonCode)`
   together. `getTeams` already calls `getClubTvCodes` inside and returns each team with a `tvCode` (`TeamRef`), so the second call repeats two queries
   (the clubs and the latest standings rows) for every season: up to 8 wasted queries on a single-games, team-seasons or team-games request.
2. **One answer is cached up to four times.** `backend/src/response-cache.ts` keys on the full URL. The records routes rank the loaded seasons together
   (`SUPPORTED_SEASONS`), so `/api/seasons/2025/records/team-seasons?metric=pointsScored` and `/api/seasons/2024/records/...` return the same
   body but are two cache entries, each filled by its own first request (measured: the 2024 address was a MISS straight after the 2025 one). With a page
   opened on whichever season the visitor is browsing, that multiplies the first requests by the number of loaded seasons.

## The fix

1. **One lookup.** `clubLooks` reads each club's crest and TV code from the single `getTeams` result (`team.crestUrl`, `team.tvCode`) and no longer calls
   `getClubTvCodes`. A club code the season's team list does not have keeps today's fallback (the club code as its TV code, no crest).
   `tvCode` is the app's own rule from 32a (the season's latest standings code, then the abbreviated name, then the club code), so a club the standings
   have no code for now shows its abbreviated name where it showed its club code; every club that has a standings code is unchanged. The before and
   after answers show whether any row differs.
2. **One cache entry for the records routes.** `response-cache.ts` builds the key through a small function: a URL of the form
   `/api/seasons/<season>/records/...` whose season is one of the supported seasons (`2025` or `E2025` form, as `requestedSeason` accepts) is keyed with
   the season replaced by a fixed word, keeping the rest of the path and the whole query string; every other URL keeps its full-URL key. A season that
   is not supported is never given the shared key, so the route still answers it with its own 400. Nothing else changes: only successful replies are
   stored, the 10-minute window and the 1000-entry limit stay.

It must not break: any record answer's body (identical before and after, apart from the rare TV-code fallback above), the 400 for an unknown metric or an
unsupported season, the 55 tests of `records-api.spec.js`, or the cache for every other route.

## Build steps

- [x] 1. **Baseline, both changes, and a check for each.** Before changing code, save (outside the repo) the answers of about a dozen record requests: every
      kind with a traditional and an advanced metric, for season `2025` (local database). Make the two changes. Add a test to `records-api.spec.js` that asks the
      same records route through two different supported seasons' addresses and expects the second reply from the cache (`X-Cache: HIT`) with an equal body,
      and that an unsupported season (`1999`) still answers 400. Compare the saved answers with the new ones with a throwaway spec and delete it and the files.
      Done when: `cd backend && npm run build` passes; every saved answer equals the new one (or the only differences are TV codes that changed from a club code to
      an abbreviated name, which are reported); `records-api.spec.js` passes on the local database (`/api/health` says `local`), with the new test among them;
      root `npm run build` and `cd frontend && npm run lint` pass.

## Files

`backend/src/db/season-records.ts`, `backend/src/response-cache.ts` (imports `SUPPORTED_SEASONS` from `db/season-catalog`),
`frontend/e2e/records-api.spec.js`.

## Verify

Run only `records-api.spec.js`. For the saving, ask the same record route through `/api/seasons/2025/` and then `/api/seasons/2024/`: the second reply says
`X-Cache: HIT`. The query saving itself is by construction (two queries per season fewer in `clubLooks`); it is not asserted by a test.

## Built

- `clubLooks` reads each club's crest and TV code from the one `getTeams` result and no longer calls `getClubTvCodes` (two queries per season fewer).
- `response-cache.ts` keys `/api/seasons/<supported season>/records/...` by one shared URL (the `2025` and `E2025` forms alike); an unsupported season keeps its
  own key and still answers 400.
- Evidence (local database, `/api/health` said `local`): twelve record answers saved before the change (every kind, traditional and advanced metrics, the old
  names) compared with the answers after it by a throwaway spec: 0 differences, so no TV code changed either. `records-api.spec.js` passes (56 tests, with the new cache
  test: the same route through the 2024, E2023 and 2026 addresses answers `X-Cache: HIT` with an equal body, and the 1999 address still answers 400). Root `npm run build`
  and `cd frontend && npm run lint` pass. The throwaway spec and files were deleted.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5560,"specSha256":"fe89b12676fcebfa81669041168df4874122082c5b5ec2aaf8983ec78c7440fd","branch":"refs/heads/fix/records-api-first-request-cost","head":"ee68f48b50e3b5151331fd03312aab7d979d0232","baseRef":"refs/heads/master","baseCommit":"ee68f48b50e3b5151331fd03312aab7d979d0232","sourceTree":"50fbcc1c0840c6fa4c83e6a40da2e60da6f42bfd","absentOptional":[]} -->

## Completion evidence

- Twelve record answers saved before the change (every kind, traditional and advanced metrics, the old names) and compared with the answers after it by a throwaway spec on the local database (`/api/health` said `local`): 0 differences. The spec and files were deleted.
- `records-api.spec.js` passed (56 tests, including the new cache test); root `npm run build` (with the backend `tsc` check) and `cd frontend && npm run lint` pass (rerun at completion). No `Verify` command is declared in `AGENTS.md`.
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested.
