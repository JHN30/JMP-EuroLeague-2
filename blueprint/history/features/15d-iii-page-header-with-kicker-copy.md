# Feature: Page header with kicker copy

**From build-plan:** feature 15d-iii
**Build attempt:** 1
**Branch:** feature/page-header-with-kicker-copy
**Status:** verified

## Goal

Add a shared `PageHeader` component (2px primary top rule, orange kicker,
page `<h1>`) and a shared `PanelHeader` component (kicker, panel `<h2>`), then
replace every existing page and panel heading with them, writing the real
kicker copy once as each component's `kicker` prop.

## Design reference

`UI-UX.md` section 6.3 describes `PageHeader` as `section.app-panel relative
overflow-hidden p-4 sm:p-5` with `div.absolute inset-x-0 top-0 h-0.5
bg-primary` (the 2px rule, `aria-hidden`), a kicker row using
`.section-kicker` styling, the page `<h1>`, an optional description, an
optional media slot, and a trailing children slot for actions/stats. This
project's existing `.eyebrow` CSS class (from 15b-i) already implements
`.section-kicker`'s exact styling (`text-xs font-black uppercase
tracking-[0.18em] text-primary` equivalent), so no new CSS is needed for the
kicker text itself - only the top-rule bar and the header layout.

## Scope findings from inspection

- 11 pages render a bare `<h1>`: 8 are plain text
  (`Standings`, `Fixtures and results`, `Teams`, `Players`, `Statistics
  leaderboards`, `Comparisons and trends`, `Playoffs`, `Home`); 3 render
  dynamic content next to a media thumbnail (`GameDetailPage.jsx`'s two team
  crests + names, `PlayerPage.jsx`'s headshot + name + subtitle,
  `TeamPage.jsx`'s crest + name + subtitle + a trailing `NextGameChip`).
- 8 `panel-title` (`<h2>`) sites exist: `Dashboard.jsx`'s `WidgetPanel` (title
  varies per instance: `Recent results`, `Upcoming games`, `Form watch`,
  dynamic `"<name> · recent form"` / `"League leader recent form"`, `Next
  game`, `Standings`, `Statistical leaders` - 7 distinct instances sharing
  one component), `ComparisonsPage.jsx`'s `Season series`,
  `PlayoffsPage.jsx`'s dynamic matchup group name, `TeamPage.jsx`'s `Recent
  form` and `Compare`, and `TeamTrendChart.jsx`'s dynamic `"Point differential
  ... games"` title.

## Kicker copy draft (for review before implementation)

Plain, short, all-caps category labels - never restating the heading text
itself, since the heading already says the specific thing:

**Page headers:**

| Page | Kicker |
| --- | --- |
| Home (dashboard) | OVERVIEW |
| Standings | SEASON |
| Fixtures and results | SCHEDULE |
| Game detail (dynamic matchup title) | MATCHUP |
| Teams (list) | CLUBS |
| Team profile (dynamic team name) | CLUB |
| Players (list) | ROSTERS |
| Player profile (dynamic player name) | PLAYER |
| Statistics leaderboards | LEADERBOARDS |
| Comparisons and trends | HEAD-TO-HEAD |
| Playoffs | POSTSEASON |

**Panel headers:**

| Panel | Kicker |
| --- | --- |
| Dashboard: Recent results | RESULTS |
| Dashboard: Upcoming games | SCHEDULE |
| Dashboard: Form watch | FORM |
| Dashboard: League leader / `<name>` recent form | SPOTLIGHT |
| Dashboard: Next game | UP NEXT |
| Dashboard: Standings (widget) | STANDINGS |
| Dashboard: Statistical leaders | LEADERS |
| Comparisons: Season series | HEAD-TO-HEAD |
| Playoffs: matchup group (dynamic group name) | BRACKET |
| Team page: Recent form | FORM |
| Team page: Compare | SHORTCUTS |
| Team trend chart (dynamic "Point differential..." title) | TREND |

## In scope

- `frontend/src/lib/PageHeader.jsx`: `Panel` (`as="section"`) wrapper with
  `relative overflow-hidden p-4 sm:p-5 mb-6`, an `aria-hidden` `absolute
  inset-x-0 top-0 h-0.5 bg-primary` rule div, a `kicker` rendered with
  `.eyebrow`, the page's single `<h1 className="text-2xl font-semibold
  break-words">{title}</h1>` (title accepts a string or JSX, so the two
  crest-based game-detail title and the media-adjacent player/team titles
  keep their exact existing markup), an optional `media` slot, an optional
  `description` slot, and an optional trailing `children` slot for actions or
  a next-game chip.
- `frontend/src/lib/PanelHeader.jsx`: renders the existing `.panel-header`
  wrapper with an optional `kicker` (`.eyebrow`) above the `<h2
  className="panel-title">{title}</h2>` (or `level` prop for a different
  heading tag, unused today but matching `PageHeader`'s flexibility), and an
  optional trailing slot (matches `.panel-header`'s existing
  `justify-content: space-between` layout, already used for a heading plus a
  trailing link/action).
- Replace all 11 page `<h1>` blocks with `PageHeader`.
- Replace all 8 `panel-title` sites with `PanelHeader`.

## Out of scope

- `UI-UX.md`'s full `PageHeader` reference also lists a `badges[]` prop and a
  loading/error variant (`TeamState`/`PlayerState`) that render `PageHeader`
  even while data is pending. Neither is named in this build-plan item's text
  (only the top rule and kicker are), and no page currently shows a badge or
  a page-header-shaped loading/error state (they use `AsyncState`, which
  1d-ii already covered); adding either now would be new scope beyond
  "replace existing page and panel headings."
- 15e ("Shell, theming, and routing") is the item that rebuilds the
  navigation bar and app shell; `SeasonLayout.jsx`'s nav header
  (`brand-mark`/`eyebrow` "EuroLeague") is a distinct, already-correct
  eyebrow usage and is not a page or panel heading - left untouched.
- Any later 15e-15g, 16, or 17 item.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `feature` (one review
packet after all steps) and `workflow.checkpointCommits` is `disabled`.

## Build steps

- [x] 1. Build `PageHeader.jsx` and `PanelHeader.jsx` in `frontend/src/lib/`,
      with no consumer yet.
      **Done when:** `npm run lint` and `npm run build` pass.
- [x] 2. Replace the 8 plain-text page `<h1>` blocks (Home, Standings,
      Fixtures, Teams, Players, Statistics, Comparisons, Playoffs) with
      `PageHeader`, using the kicker copy from the table above.
      **Done when:** `npm run build` passes; CDP check on three of the eight
      pages confirms exactly one `<h1>` remains, its kicker text renders, and
      the 2px top-rule element is present with `aria-hidden="true"`.
- [x] 3. Replace the 3 media-adjacent page `<h1>` blocks (`GameDetailPage`,
      `PlayerPage`, `TeamPage`) with `PageHeader`, preserving each page's
      exact existing media/subtitle/trailing content via the `media`,
      `description`, and `children` slots.
      **Done when:** `npm run build` passes; CDP check on each of the three
      pages confirms the crest/headshot, name, subtitle, and (for Team) the
      next-game chip all still render in their existing positions, alongside
      the new kicker and top rule.
- [x] 4. Replace the 8 `panel-title` sites with `PanelHeader`, using the
      kicker copy from the table above (the `Dashboard.jsx` `WidgetPanel`
      case needs a `kicker` prop added and threaded through from each of its
      7 callers).
      **Done when:** `npm run build` passes; CDP check across the dashboard,
      a comparisons page, playoffs, and a team page confirms each panel's
      kicker and heading render with the expected text.

## Files / areas

- `frontend/src/lib/PageHeader.jsx` (new)
- `frontend/src/lib/PanelHeader.jsx` (new)
- The 11 page files and 8 panel-heading files listed above, plus
  `Dashboard.jsx`'s 7 `WidgetPanel` callers (`GamesSnapshot.jsx` x2,
  `FormWatch.jsx`, `LeaderTrend.jsx`, `Spotlight.jsx`, `StandingsSnapshot.jsx`,
  and `LeadersPanel.jsx`, which renders its own panel directly rather than
  through `WidgetPanel`)

## Data / contracts

None - presentation and structure only, no API or persisted-data changes.

## Testing

No unit test runner is configured. Verify via `cd frontend && npm run lint`
and `npm run build`, plus the CDP-based evidence named in each step.

## Notes for the AI

- Confirm the exact current call-site list for each pattern while editing
  (re-grep at the start of each step), matching the practice from every prior
  15b/15c/15d sub-feature.
- The kicker copy table above is the one place in this feature carrying a
  content decision; everything else is mechanical extraction. Do not add,
  remove, or reword a kicker beyond what's approved in review.
- `Dashboard.jsx`'s `WidgetPanel` is a single shared component whose title
  varies per caller; give it a `kicker` prop (not a hardcoded string) so each
  of its 7 call sites can pass its own kicker text from the table.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8413,"specSha256":"389a5e653f5c57531a77e9c48d06672b9b33abbba7096515e955156dc34e0ad7","branch":"refs/heads/feature/page-header-with-kicker-copy","head":"cdb97c42d039e458a0ba0f044e83ce8d16867fde","baseRef":"refs/heads/master","baseCommit":"cdb97c42d039e458a0ba0f044e83ce8d16867fde","sourceTree":"3f697ce5d42b9b6001ee67408ddd461b1c00c499","absentOptional":[]} -->
