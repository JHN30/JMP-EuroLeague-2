# Fix: Team Shooting tab - team and opponent shot maps, zone table and scoring style

**Type:** Fix (polish)
**Status:** verified (awaiting the owner's review)
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

The Shooting tab showed the same 2PT/3PT numbers four times (a splits table, four cards, the
zones list and the Statistics tab), a very large court with empty space either side, three
dropdowns, a plain text zone list in fixed order, and only the club's own shots.

## What changed

- `teams/TeamShootingSection.jsx` (new, replaces `ShootingSection` in `TeamPage.jsx`):
  - The repeated splits table is gone; the four cards (field goals, two-pointers,
    three-pointers, eFG% with points per shot) stay.
  - A **Partizan / Opponents** switch maps either the club's shots or its opponents' shots
    against it (a defensive shot map). Presentation (zone heatmap or every attempt) and result
    (all, made, missed) are compact tabs; the game segment stays a small dropdown.
  - After the owner's review: the Result tabs (all, made, missed) show only on "Every
    attempt", because on the heatmap a made-only zone is always 100% and a missed-only zone
    0%; the chosen result is remembered for when the owner switches back, but the heatmap,
    the cards and the style table ignore it. On the every-attempt court, makes are green and
    misses red (`resultColors` on `ShootingCourt` and `ShootingLegend`, opt-in so the game
    page's two-team chart still colours by team). The Game segment label is inline and kept on
    one line, and all four controls share one centre line.
  - Animation when options change (added after the first commit): on the court, heatmap zones
    blend to their new colour, zone labels fade in again when their numbers change, and shot
    markers pop in on a short stagger (never more than about half a second) whenever the plotted
    set changes; the heatmap/markers switch fades the new view in. In the panels, the four cards
    ease their new value in, table bars slide to the new width, rows glide when the order changes,
    and switching Team/Opponents replays the entrance. The court effects are CSS in `index.css`
    (`court-zone`, `court-chip`, `court-marker`) and sit behind `prefers-reduced-motion`, so they
    also apply to the court on the game and Player pages.
  - The court is capped at 46rem and sits beside the tables; its box stretches to the height of
    the right column, so both columns end on the same line. One column below `xl`.
  - **Zones** table: only zones that were shot from, most used first, with a dot coloured by
    FG% on the court's own scale, a bar for the share of shots, makes-attempts and FG%, and
    Hottest and Coldest badges (zones with at least 3 shots and 4% of all). The badge colours flip
    for the opponents' side, where a hot zone is bad news.
  - **Style** table ("How X scores" / "How opponents score against X"): points from fast
    breaks, second chances, off turnovers and half court, as a share of the points from field
    goals. The feed flags only shots that scored, so these rows carry no shooting percentage
    (a first version showed 100% FG for each and was replaced). The flags overlap, so shares do
    not add to 100%.
  - Shots are fetched game by game with the same query keys the rest of the app uses.
- `teams/teamShooting.js` (new): zone rows, hottest and coldest zones, situation rows.
- `lib/shotFilters.js` (new): the game segment and result filters, moved out of
  `SeasonShootingChart` (which now imports them; behaviour unchanged).
- `lib/ShootingCourt.jsx`: the BACKCOURT label was centred only 90 units below the top of its
  strip but is about 235 units long once rotated, so it ran over the strip's edge; it is now
  centred 175 units down, which also fixes the game page's court. Also an optional `maxWidth`,
  and a real bug fix, the markers were keyed by
  `shotOrdinal`, which only counts within one game, so any season chart in "Every attempt" mode
  logged dozens of duplicate-key warnings (also on the Player page). Keys now include the index.
- `TeamPage.jsx` no longer fetches the team stats summary for this tab.
- The Player page's chart (`SeasonShootingChart`) is otherwise untouched.

## Verify

- `eslint` (whole frontend) and `vite build` pass.
- Headless Chromium, dark theme, against the running app: Partizan team and opponents views,
  heatmap and markers, made-only with Q4, at 1860px and 420px (no horizontal overflow); a
  finished E2025 playoff phase; the Player page chart with markers and a segment. No console
  errors after the key fix.
- Style numbers cross-checked: Partizan's 270 points less 42 from free throws is 228 from field
  goals, and half court's 162 is 71% of that.

## Known gaps

- Zones are not compared with the league average; that needs a league-wide zone endpoint.
- The player-by-player shooting list and a per-game shooting strip are not built.
- The Player page chart still has its own table, cards and large court.
