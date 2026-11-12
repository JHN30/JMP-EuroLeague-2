# Fix: Remember catalog lookups between requests

**Type:** Fix
**Status:** verified
**Branch:** fix/remember-catalog-lookups-between-requests

## The problem

Almost every route in `backend/src/routes/seasons.ts` reads the same small
catalog tables before its real query: the season (`getSeason`), often the
phases (`getPhases`), the rounds, the club list or the club TV codes. They are
awaited one after another, so an uncached request pays two or three extra
database round trips first. The response cache only helps a repeat of the exact
same address; every new player, game or team address pays the lookups again,
although the catalog only changes when the pipeline publishes.

## The fix

Keep the results of the catalog lookups in memory for the same 10 minutes the
response cache uses, so they are read from the database once per window instead
of once per uncached request.

- Add one small helper next to the catalog code in `backend/src/db/` that wraps
  an async lookup: results are kept by the lookup's arguments, expire after the
  window, and the stored value is the promise, so identical lookups arriving
  together share one query. A lookup that fails is not kept.
- Use one constant for the window in both the helper and
  `backend/src/response-cache.ts`.
- Cap the number of kept entries, as the response cache does, because some
  arguments come from the address.
- Apply it to the lookups whose arguments are few: `getSeasons`, `getSeason`,
  `getPhases`, `getRounds`, `getTeams`, `getClubTvCodes`, `getStatsScopes` and
  `getStatsRounds`. Leave `getTeam`, `getPlayer` and `getGame` as they are:
  their arguments are any club, player or game in the address.
- A kept result is shared by every caller, so no caller may change it in place.
  Check every caller of the wrapped lookups and copy before sorting or editing
  (for example the career route sorts the `getSeasons` result in place).
- Every response must stay byte for byte the same. No new dependency, no
  configuration, no change to the response cache's behavior.

Accepted trade-off: after a publish, a catalog value can be up to 10 minutes
old when a response is built, and that response is then cached for up to 10
more, so catalog-derived fields can lag a publish by up to 20 minutes instead
of 10. The catalog changes only at a publish and a restart clears both.

## Build steps

1. **Helper and wrapped lookups.** Add the helper and the shared constant, wrap
   the eight lookups, and fix any caller that changes a result in place. Done
   when: the backend builds, a sample of addresses answers exactly as before,
   and a second uncached request for a different address in the same season
   no longer repeats the catalog queries.

## Verify

- `cd backend && npm run build` passes.
- On the local database (`/api/health` reports `"target":"local"`), save the
  answers of at least 20 addresses spread over the routes (seasons, phases,
  rounds, standings, games, a game, teams, a team's roster and games, players,
  a player, leaders, advanced leaders, records, the career and head-to-head
  routes) on `master`, then compare them byte for byte on the branch.
- Show the saving with real numbers: the catalog queries or the response times
  of uncached requests before and after, measured without leaving any
  measuring code in the commit.
- Request the same uncached addresses several times in parallel and confirm
  the answers are still correct.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3441,"specSha256":"e188b943f2ab29331312e861ce1e20fa8140c431dfeebef39b8d22b2001572af","branch":"refs/heads/fix/remember-catalog-lookups-between-requests","head":"dedeb427046e4ceed6ead4c8da5887d7e84f7242","baseRef":"refs/heads/master","baseCommit":"dedeb427046e4ceed6ead4c8da5887d7e84f7242","sourceTree":"43c676bee78cb95f58ad70708b725ca066266e79","absentOptional":[]} -->
