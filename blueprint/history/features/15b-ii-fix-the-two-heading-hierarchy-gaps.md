# Feature: Fix the two heading-hierarchy gaps

**From build-plan:** feature 15b-ii
**Build attempt:** 1
**Branch:** feature/fix-the-two-heading-hierarchy-gaps
**Status:** verified

## Goal

Fix the two confirmed heading-hierarchy violations found while inspecting the
codebase for 15b: the home dashboard has no `<h1>` anywhere, and Playoffs
skips straight from its page `<h1>` to `<h3>` matchup-card titles with no
`<h2>` on the page at all. Every other page already has exactly one correct
`<h1>` and uses `<h2>`/`<h3>` correctly, so no other page needs a change.

## In scope

- Add a page `<h1>` to the home dashboard (`frontend/src/dashboard/Dashboard.jsx`),
  matching the exact title/className convention every other page already uses
  for its own `<h1>` (`<h1 className="mb-6 text-2xl font-semibold">`), titled
  "Home" - the same text as this page's own entry in the nav bar
  (`frontend/src/season/NavBar.jsx`'s `{ label: "Home", path: "", end: true }`),
  matching how every other page's `<h1>` text equals its own nav label
  ("Standings", "Teams", "Players", etc.).
- Change `frontend/src/playoffs/PlayoffsPage.jsx`'s `MatchupCard` heading from
  `<h3>` to `<h2>`, keeping its existing `panel-title mb-3` className
  unchanged. Its `<div className="panel p-4">` wrapper is a direct child of
  the page grid (confirmed: `MatchupCard` renders inside a plain
  `<div className="grid gap-4 sm:grid-cols-2">`, not nested inside any other
  `.panel`), so it is a top-level panel and should title at `<h2>` per the
  one rule this project follows (page `<h1>`, top-level panel `<h2>`, content
  nested inside a panel `<h3>`).

## Out of scope

- Any other heading level, weight, or size change on any other page. Confirmed
  during 15b's original inspection: every other page already has exactly one
  `<h1>` and correct `<h2>`/`<h3>` usage.
- Bumping heading font-weight/size to the guideline's font-black scale. That
  is a separate, still-open piece of "heavy display weights" flagged in
  15b-i's spec as deliberately deferred; this step only fixes level and
  presence, not style.
- The three remaining pieces of build-plan 15b (kicker adoption, table
  overflow discipline) - 15b-iii and 15b-iv.

## Build loop

`workflow.stepReview` is `feature`, but this run is under an explicit
Continuous Mode invocation, which replaces per-step review pauses with
self-review plus one final packet. `workflow.checkpointCommits` is `disabled`:
no commits between steps; completion makes the single work commit.

## Build steps

- [x] 1. **Add the dashboard's missing `<h1>`.** In `Dashboard.jsx`, add
  `<h1 className="mb-6 text-2xl font-semibold">Home</h1>` as the first child
  of the page's root `<div className="flex flex-col gap-6">`, ahead of
  `<KpiStrip />`. Done when: `npm run lint` and `npm run build` pass in
  `frontend/`, and in the browser the home page (`/:seasonCode`) has exactly
  one `<h1>` reading "Home", confirmed via
  `document.querySelectorAll('h1').length === 1` and its `.textContent`.

- [x] 2. **Fix the Playoffs heading level.** In `PlayoffsPage.jsx`, change
  `MatchupCard`'s `<h3 className="panel-title mb-3">{groupName}</h3>` to
  `<h2 className="panel-title mb-3">{groupName}</h2>`. Done when: `npm run
  lint` and `npm run build` pass, and on a Playoffs page with matchup groups,
  every matchup-card title renders as `<h2>` (confirmed via
  `document.querySelectorAll('h2').length` matching the visible group count,
  with `document.querySelectorAll('h3').length === 0` on that page), with no
  visible style change (same classes, same rendered appearance - only the
  tag changed).

## Files / areas

- `frontend/src/dashboard/Dashboard.jsx` - add one `<h1>` line.
- `frontend/src/playoffs/PlayoffsPage.jsx` - change one heading tag
  (`MatchupCard`, currently around line 42).

Nothing else changes. No CSS, no new files, no dependency changes.

## Data / contracts

No data or API contracts. Two JSX edits, described exactly above.

## Testing

No test runner is configured, so per `coding-standards.md` this is verified by
build output and direct browser evidence:

- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser evidence for each step's `Done when`, using the same no-new-
  dependency approach as prior work (Chrome via CDP over the running dev
  server): a DOM query confirming exactly one `<h1>` on the dashboard reading
  "Home", and a DOM query confirming Playoffs' matchup-card titles are all
  `<h2>` with zero `<h3>` on that page, plus a screenshot of each page
  showing no visible layout or style change.
- `cd backend && npm run build` once at the end, to confirm nothing here
  touched backend code.

## Notes for the AI

- Read both files fresh before editing; re-confirm `MatchupCard`'s exact
  current line number in `PlayoffsPage.jsx` since this spec's line reference
  is approximate.
- Do not touch `WidgetPanel`'s `<h2 className="panel-title">{title}</h2>` in
  `Dashboard.jsx` or any of its sibling widget panels (`Spotlight`,
  `StandingsSnapshot`, `GamesSnapshot`, `LeadersPanel`, `FormWatch`,
  `LeaderTrend`) - they are already correct top-level panels using `<h2>`
  correctly; only the missing page-level `<h1>` is being added above them.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5236,"specSha256":"f4d2a8624a777542b8738ec96f296a56424c9ea8221878d8843daf5b694021d0","branch":"refs/heads/feature/fix-the-two-heading-hierarchy-gaps","head":"8a4e1799bd0719ce80c2f56f15acba6690ab512c","baseRef":"refs/heads/master","baseCommit":"8a4e1799bd0719ce80c2f56f15acba6690ab512c","sourceTree":"6728645d70891be783ad94d0d607ddd4bcd78ae8","absentOptional":[]} -->
