# Fix: Add an error boundary so a render crash doesn't blank the app

**Type:** Fix
**Status:** verified
**Branch:** fix/add-error-boundary-so-a-render-crash-doesnt-blank-the-app

## The problem

No React error boundary exists anywhere in the frontend (confirmed: no
`componentDidCatch`/`getDerivedStateFromError`/`ErrorBoundary` in
`frontend/src`). When a render-time error is thrown anywhere in the tree,
React unmounts the *entire* app (there's no boundary to stop it), including
`BrowserRouter` in `frontend/src/main.jsx`. This was observed directly during
feature 8: a bug in `TeamPage.jsx`/`PlayerPage.jsx` threw during render, and
the whole page went blank. Because `BrowserRouter` itself was unmounted, the
browser's back/forward buttons stopped doing anything, since there was no live
React Router left to respond to the URL change, until a full manual page
reload (F5) brought the app back.

The underlying render bug is already fixed. This fix addresses the general
gap: any future render-time error anywhere in the app will reproduce the same
blank-page, back-button-doesn't-work symptom, because there's still nothing
to catch it.

## The fix

Add a class-based `ErrorBoundary` component at `frontend/src/ErrorBoundary.jsx`
(error boundaries require a class component; there is no hook equivalent, so
this is not an avoidable dependency, just the platform's own mechanism).

- `getDerivedStateFromError`/`componentDidCatch` catch a render error from its
  children, `componentDidCatch` also logs it with `console.error` so it's
  still visible to a developer (no error-reporting service is installed, and
  none is needed for this fix).
- On catch, render a DaisyUI `alert alert-error` fallback ("Something went
  wrong on this page.") with a "Reload page" button
  (`window.location.reload()`), the same manual-recovery action a user had to
  take today, just presented instead of a blank screen.
- Wrap it around `<Routes>` in `frontend/src/App.jsx`, through a small
  function-component wrapper that reads `useLocation().pathname` and passes it
  as the boundary's `key`. Remounting on every route change means navigating
  away from the broken route, including via the browser's back/forward
  buttons, clears the caught error and retries rendering the new route
  automatically, without requiring the manual reload button. `BrowserRouter`
  itself stays outside the boundary (in `main.jsx`) so it's never at risk of
  being unmounted by a page-level crash.

This must not change any existing page's behavior when nothing is throwing;
the boundary is inert unless a child actually throws during render.

## Build steps

- [x] 1. Add `frontend/src/ErrorBoundary.jsx` (the class boundary) and a
      `RouteErrorBoundary` wrapper (reads `useLocation`, sets `key`), then wrap
      `<Routes>` with it in `frontend/src/App.jsx`.
      Done when: `frontend/npm run build` and `npm run lint` pass; live with
      the dev server running, a temporary forced `throw` added to one page
      component shows the fallback alert instead of a blank page (checked in
      the browser console that the original error is still logged), and
      navigating to a different route (including pressing the browser's back
      button) clears the fallback and renders the new route normally, without
      a manual reload. The temporary throw is removed before this step is
      checked off.

## Verify

With the frontend dev server running: temporarily force a `throw new
Error("test")` inside one page component's render, confirm the fallback
alert and "Reload page" button appear instead of a blank screen, confirm the
error is still visible in the browser console, then navigate to a different
page (including via the browser back button) and confirm the app recovers
without a manual reload. Remove the temporary throw, then confirm the app
still renders normally everywhere (`frontend/npm run build`).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3907,"specSha256":"1faa27fd0d2080301307a758bab50c5e9818988549f63af562d4ecbbaeb932e4","branch":"refs/heads/fix/add-error-boundary-so-a-render-crash-doesnt-blank-the-app","head":"259dc97d9c5e983fa56d38626167ba0e4c1a9670","baseRef":"refs/heads/master","baseCommit":"259dc97d9c5e983fa56d38626167ba0e4c1a9670","sourceTree":"c4e7b5cc7ce4fd7ca29f3c324950c3a9cbf80e27","absentOptional":[]} -->
