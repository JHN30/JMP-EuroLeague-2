# Fix: E2021 season data warning

**Type:** Fix
**Status:** verified
**Branch:** fix/e2021-season-data-warning

## The problem

The 2021-22 season (`E2021`, URL season `2021`) has inconsistent historical
standings snapshots and different standings/statistics counting in the available
data following the exclusions of CSKA Moscow, UNICS Kazan and Zenit St Petersburg.
Users need this context when browsing the season.

The user chose a warning instead of the previously proposed pipeline repair and
eligibility investigation. This spec replaces that repair spec. The evidence is
in `blueprint/reference/historical-season-inventory.md`, sections 5.9 and 7.6.

## The fix

Show one persistent, compact warning at the top of the shared season content in
`frontend/src/season/SeasonLayout.jsx`, above the page outlet, on every supported
2021 season route. Use the repository's existing notice styling and theme tokens.
Use the normalized route season (`2021`), rather than relying on a successful
format request. Existing season validation, redirects and error states remain.

**Warning title:** 2021-22 season: data caveat

**Warning text:** CSKA Moscow, UNICS Kazan and Zenit St Petersburg were excluded
from this season, and their results were removed from the official standings.
Some historical standings snapshots are inconsistent, and available statistics
and records may count games differently. Keep this in mind when comparing teams,
players or rounds.

Render the copy as ordinary React text with a semantic labelled notice, readable
contrast, and an icon only as a supplement to the text. Keep it visible without
a dismissal control or stored preference. Allow wrapping at 320px in both themes.
Remove it immediately when navigating to another season.

The warning describes uncertainty; it does not claim that all archived statistics
are invalid or that their official eligibility has been verified. No API, database,
ETL, eligibility filter, rank, score, fixture status or statistics calculation
changes belong in this fix. No pipeline-agent work is required for this warning.

Feature 34g remains unchecked. This warning does not satisfy its existing
confirmed data/ETL prerequisite or change the build plan; any later decision to
replace that feature's acceptance requirements needs its own reviewed amendment.

## Build steps

1. [x] **Add the season warning.** Place the notice inside the shared main
   content above the route outlet. Reuse notice styles from
   `frontend/src/lib/CompetitionContext.jsx` where suitable and the route
   normalization in `frontend/src/lib/seasonSlug.js`. Keep this a small change;
   no new dependency or general warning framework.
   **Done when:** every supported 2021 page shows exactly one season warning
   with the specified copy, other seasons show none, and frontend lint and
   root build pass. Page-specific existing competition notes can still appear.

2. [x] **Verify navigation and responsive behavior.** Add proportionate
   coverage to the existing season-status browser spec for direct 2021 entry,
   switching into and out of 2021, and navigating between season pages. Verify
   the warning remains readable and causes no horizontal overflow at 320,
   390, 768 and 1024px in both themes.
   **Done when:** focused season-status and responsive specs pass against the
   local database target, with evidence that the warning follows route season
   changes and does not obstruct existing navigation or content.

## Verify

- Run `npm run build` and `npm --prefix frontend run lint`.
- Before browser tests, `/api/health` must report `target: local`. Never open
  the real `.env` or run verification against Neon.
- Run `cd frontend` then `npx playwright test season-status.spec.js responsive.spec.js`.
  The change is a static shared notice with an E2021-only predicate; these
  focused checks cover its behavior and layout. Broaden only if evidence shows
  further affected behavior.
- No new unit runner, CI gate, database refresh or production action.

## Build loop

Review this revised spec before `/implement`. Review the final packet after the
small steps; checkpoint commits are disabled. `/complete` creates the final fix
commit. This command changes only the spec and stops before implementation.

## Implementation evidence

- `npm run build`: passed for backend and frontend. The initial sandbox run
  could not overwrite existing backend output; the approved elevated rerun passed.
- `npm --prefix frontend run lint`: passed.
- `npx playwright test season-status.spec.js responsive.spec.js` from frontend:
  166 passed against the running local-target backend. Coverage includes the
  legacy E2021 redirect, page navigation, season selection, both themes and
  320/390/768/1024px wrapping and overflow.
- `git diff --check`: passed. No blocking findings or pending independent review.
  Existing unrelated P3 findings F-02 and F-03 remain open. Configured audit,
  Check and try-guide gates are manual; independent review is not selected for
  this small presentation-only change.
- No commit, merge, data change or production action performed. Ready for `/complete`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5149,"specSha256":"e625b0aad12c08ae2a086429170b12dc1766ff31f8fc15a07e09923da449de32","branch":"refs/heads/fix/e2021-season-data-warning","head":"4fb2e025356c293c8f8185a45ff429b3e64bce4b","baseRef":"refs/heads/master","baseCommit":"4fb2e025356c293c8f8185a45ff429b3e64bce4b","sourceTree":"a4ca06a687034ed9bdf8e56a4393113fb31f8b9a","absentOptional":[]} -->
