# Fix: Refetch data when a tab regains focus

**Type:** Fix
**Status:** verified
**Branch:** fix/refetch-data-when-a-tab-regains-focus

## The problem

A browser tab left open never shows newly published data until the user reloads it. On 2026-11-07 the warehouse
published Round 10 to Neon at 11:39 UTC and the live API served it at once, but a Home tab opened earlier kept showing
the old results.

`frontend/src/main.jsx` creates the QueryClient with `refetchOnWindowFocus: false` for every query. Data past its
5-minute `staleTime` is refetched only when a component mounts (moving to another page), never when the user returns
to a tab that stayed on one page. No component overrides the setting.

## The fix

Frontend only, one file.

- Remove `refetchOnWindowFocus: false` from the QueryClient defaults so React Query's default (`true`) applies: on focus
  it refetches only queries older than `staleTime`. Not `"always"`, which ignores `staleTime` and refetches on every
  focus.
- Keep `staleTime` at 5 minutes.
- Rewrite the comment above the QueryClient, which explained the old setting.

Must not change `backend/src/response-cache.ts`: the 10-minute server cache and the browser's `private, max-age=300`
are what limit Neon transfer. A refetch on focus after 5 minutes reaches Express, which answers from memory, so each
address still reaches Neon at most once per 10 minutes. A tab that returns after a publish shows the new data within
about 15 minutes at most (server copy up to 10 minutes old, plus the 5-minute stale window).

## Build steps

- [x] 1. **Refetch on focus** in `frontend/src/main.jsx`. Done when: the QueryClient defaults hold only
  `staleTime: 5 * 60 * 1000`, the comment describes the focus refetch and the caches behind it, and `eslint` and
  `vite build` pass.

## Verify

- `cd frontend && npx eslint src/main.jsx` and `npm run build` pass.
- No Playwright spec tests window-focus refetching (the specs only focus elements), so none needs updating.
- Manual: open Home on the live site, leave the tab for more than 5 minutes, return to it; DevTools Network shows the
  page's `/api` requests fire again on focus, answered by the server (`X-Cache: HIT` inside its 10-minute window).
  Returning within 5 minutes fires no requests.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2269,"specSha256":"0a984594e39a679b9f8a08c4c1ecf28fafef3669edbd63b2c2a8dbdae7af67b0","branch":"refs/heads/fix/refetch-data-when-a-tab-regains-focus","head":"4edcecc95fef002524bec3001a98e306f73c5478","baseRef":"refs/heads/master","baseCommit":"4edcecc95fef002524bec3001a98e306f73c5478","sourceTree":"7cd482097a12f8472dfb9fe4a6f4887dd0e75945","absentOptional":[]} -->
