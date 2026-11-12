# Fix: Recover from missing script files after a deploy

**Type:** Fix
**Status:** verified
**Branch:** fix/recover-from-missing-script-files-after-a-deploy

## The problem

After the last deploy the live site logged
`is-ref-object-B0kcY7OT.js: Failed to load module script … MIME type of "text/html"`.
The code and build were correct (the local build makes the same file names, and the
live site serves them now). A browser asked for a script file that the server
answering it didn't have, for one of two reasons:

- During a deploy, the new `index.html` names the new files, but the request for a
  file can reach the old instance.
- A tab opened before a deploy still asks for the old file names when the visitor
  goes to another page (every page is a lazy route in `frontend/src/App.jsx`).

Two things make this worse than it needs to be:

1. **The server answers a missing file with the page.** In `backend/src/index.ts`,
   the catch-all after `express.static` sends `index.html` for any GET that isn't
   under `/api`, including `/assets/whatever.js`. The browser gets HTML with a
   200 status where it expected JavaScript, which produces the confusing MIME error.
2. **The app doesn't recover.** A failed page-chunk import reaches the route
   `ErrorBoundary` ("Something went wrong on this page"), even though a reload
   would fetch the current `index.html` and work.
   `LazyMotionFeatures` already reloads once for its own chunk, but nothing covers
   the route chunks.

## The fix

- **Server:** an address under `/assets/` that `express.static` didn't find gets a
  plain `404` (`Cache-Control: no-cache`) instead of `index.html`. Page addresses
  still get `index.html`. `/api` handling is unchanged.
- **Client:** in `frontend/src/main.jsx`, listen for Vite's `vite:preloadError`
  event (fired when a dynamic import's chunk fails to load) and reload the page
  once.
  - A `sessionStorage` flag stops a reload loop. If the flag is already set, don't
    reload: let the error reach the existing `ErrorBoundary`, whose button reloads.
  - Clear the flag once the app has loaded successfully, so a later deploy can
    reload again.
  - Wrap storage reads and writes in try/catch, matching `LazyMotionFeatures`.
    Without storage, don't reload automatically.
  - Use a separate key from `LazyMotionFeatures`' `motion-features-reload`, so the
    two guards don't interfere.
- **Must not break:** page addresses and deep links (`/2026/standings`, etc.), the
  `/api` routes, the immutable cache header on files that exist, and the motion
  features' own reload/retry.
- No new dependency or configuration.

## Build steps

1. [x] **Server 404 for missing assets** (`backend/src/index.ts`).
   Done when, with the built app running, a request for
   `/assets/does-not-exist.js` returns `404` and not HTML, while `/` and
   `/2026/standings` still return `index.html` and a real `/assets/index-*.js`
   still returns JavaScript with the immutable cache header.
2. [x] **Reload once on a failed chunk** (`frontend/src/main.jsx`).
   As built: the guard stores the time of the last automatic reload and skips
   another within 10 seconds, instead of a flag cleared after a successful load.
   A page script can fail long after the page loaded, so "loaded successfully"
   has no single moment to clear on. The time window still stops the loop and
   lets a later deploy reload again. Confirmed that Vite 8 wraps every lazy
   route import in its preload helper, which fires `vite:preloadError` when the
   import fails.
   Done when a page chunk that 404s triggers one automatic reload, and a second
   failure in the same tab shows the existing "Something went wrong" panel
   instead of looping. During implementation, confirm that `vite:preloadError`
   fires for a lazy route whose chunk 404s in this Vite version. If it doesn't,
   say so before choosing another hook.

## Verify

- `cd backend && npm run build` and `cd frontend && npm run lint` pass. Then
  `npm run build && npm start` from the root.
- `curl -I http://localhost:<PORT>/assets/does-not-exist.js` returns `404`;
  `curl -I http://localhost:<PORT>/2026/standings` returns `200 text/html`.
- In the browser, load `/`, then delete or rename one page chunk in
  `frontend/dist/assets` (for example `StandingsPage-*.js`) and go to Standings:
  the page reloads once. With the file still missing, it ends on the error panel
  rather than reloading forever. Restore the file afterwards.
- Browser tests: `smoke.spec.js` (covers the existing motion-features reload).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4548,"specSha256":"f32aa4c7f9d6de85b73cefb7d2b667d81139fdf8833dd6a11ae8318c36e94ebd","branch":"refs/heads/fix/recover-from-missing-script-files-after-a-deploy","head":"efbe989832d0a78b25ff95684e5cb1157eea7ef6","baseRef":"refs/heads/master","baseCommit":"efbe989832d0a78b25ff95684e5cb1157eea7ef6","sourceTree":"80f262b8a15d3926eb78240d6786946944f28b49","absentOptional":[]} -->
