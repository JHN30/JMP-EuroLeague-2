# Fix: Browser caching for API responses

**Type:** Fix
**Status:** verified
**Branch:** fix/browser-caching-for-api-responses

## The problem

API answers under `/api/seasons` carry no `Cache-Control` header. The data only changes when the pipeline publishes:
- the server already keeps each answer for 10 minutes (`backend/src/response-cache.ts`);
- React Query treats it as fresh for 5 minutes (`frontend/src/main.jsx`).

But React Query's cache lives in page memory, so a reload, a new tab or a link opened in a new window downloads every
request of the page again. On the live site each repeat still crosses Cloudflare to Render, even when the server answers
from its own cache.

## The fix

- **Header.** In `responseCache` (`backend/src/response-cache.ts`), a successful GET answer gets
  `Cache-Control: private, max-age=300`, both when served from the server's cache and when freshly built.
  - `private`: only the viewer's browser may keep it. Cloudflare and other shared caches may not, so a pipeline publish
    is never held back by a cache the app can't clear.
  - `max-age=300`: 5 minutes, the same as React Query's `staleTime`. Worst case after a publish (server cache plus
    browser) stays within the 15 minutes the two layers already allow.
  - Errors keep no header, so they are never reused, as the server already never stores them.
- **Production only.** The header is sent only when `NODE_ENV` is `production` (`ENV.NODE_ENV`, as the health route
  already checks). In development, switching `DB_TARGET` or reloading after a data change must show the new data at
  once, and Playwright's dev-server runs stay unaffected.
- **Not covered.** `/api/health` and `/api/health/db` are outside `/api/seasons` and stay uncached. The static
  frontend headers are unchanged.

No frontend change: the browser applies the header to Axios GETs by itself.

## Build steps

- [x] 1. **Send the header from the response cache in production.**
  Done when, with the production build running locally (`PORT=3100 DB_TARGET=local NODE_ENV=production npm start`):
  - a `season-stats` GET answers `Cache-Control: private, max-age=300` on a MISS and on a HIT;
  - an invalid request (a 400) has no `Cache-Control`;
  - `/api/health` has no `Cache-Control`;
  - the dev backend on port 3000 sends no `Cache-Control` on the same GET.

## Verify

- `npm run build` (root) passes, which includes the backend TypeScript check.
- The header checks above, with `curl -sI` against the local production build on port 3100 and the dev backend on
  port 3000 (local DB only).
- After deploy (manual, optional): open a page on the live site, reload it within 5 minutes, and DevTools Network shows
  the `/api/seasons/...` requests as "(disk cache)".


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2741,"specSha256":"0de64b93d71b0e7ad1437794079efe3c9def30cdcdce7c8507f5c7fb1e5c4f41","branch":"refs/heads/fix/browser-caching-for-api-responses","head":"115bbd07ba8ec75d33a198b073555e23b1b28df1","baseRef":"refs/heads/master","baseCommit":"115bbd07ba8ec75d33a198b073555e23b1b28df1","sourceTree":"86c94b24977647ade3b70a86b88d334004472aef","absentOptional":[]} -->
