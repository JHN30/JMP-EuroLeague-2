# Fix: Advanced standings views, an Explained tab, and visuals

**Type:** Fix (polish; extends feature 22)
**Status:** verified
**Branch:** master

> Recorded after the work, not before it. Done directly from the owner's feedback, with
> mockups first for the visuals (`prototypes/`, since deleted). Audit, Check, and
> independent review were not run.

## What changed

The Advanced standings mode (feature 22) showed 11 columns. It now has six sub-tabs
above the table, with the scope tabs and round picker unchanged:

| Tab | Content |
|---|---|
| Overview | GP, W, L, **Exp W**; **ORtg**, **DRtg**, Net (centred bar), Pace, eFG%, SRS; L10, L10 Net |
| Ratings | Attack-against-defence chart, then W, Exp W, MOV; ORtg, DRtg, Net; offence, defence and pace against the league average |
| Four factors | Offence (eFG%, TOV%, ORB%, FT rate) and defence (eFG% allowed, TOV% forced, DRB%, FT rate allowed), each cell shaded by league rank; TS%, assist ratio |
| Schedule | SRS, SOS, SOV; adjusted ORtg, DRtg, Net |
| Splits | Away-to-home net link, home advantage, home and away records and net, last 5 and last 10 |
| Explained | What each statistic is, see below |

Every column has a header tip (`standings/AdvancedStandingsView.jsx` holds the column
definitions).

### The visuals and why these

Researched first (Cleaning the Glass, Hoopology, 3StepsBasket, Basketball-Reference),
then mocked up with two options per tab, then built as recommended and agreed:

- **Overview:** a centred Net bar (`NetBar`). No larger chart: it is a summary.
- **Ratings:** ORtg against DRtg with crests, dashed league-average lines, lines of equal
  net rating, and the defence axis flipped so the good corner is top right
  (`RatingsScatter`, SVG with Motion, tick spacing adapts to the range and width).
- **Four factors:** rank shading only (Cleaning the Glass style), already flipped where
  lower is better, exact rank on hover.
- **Splits:** the away-to-home link (`HomeAwayLink`), and Last 10 tinted only when 3 or
  more points from the season figure. Last 5 stays plain: a tint on it fired for 12 of
  20 clubs, which is noise. The old MOV split columns were dropped; W-L and net remain.
- **Schedule: deliberately no visual.** The margin-to-SRS link failed because strength of
  schedule only spans about -0.3 to +0.4 in 2025-26, so the dots sat on top of each
  other. A balanced league schedule leaves nothing to draw.

### Explained tab

`AdvancedExplainedView.jsx` and `explainedVisuals.jsx`. A two-column table, statistic
on the left (name, abbreviation, formula) and, on the right, what it measures, why it
exists, how to read it, and an example with real numbers. Fifteen statistics in five
groups. An "Example team" picker drives live examples and pictures (dot strips of every
club, 100-square grids for rates, an eFG% shot illustration, bars, and expected-wins
dumbbells). The definitions come from `DATA_DICTIONARY.md` and standard sources; the
Dean Oliver, Bill James, and Basketball-Reference attributions are from general
knowledge and were not checked against a source.

### Schedule ratings early in a season

SRS, SOS, SOV, and the adjusted ratings need the league to be *connected*: every club
reachable from every other through a chain of opponents, not every pair having played.
In 2025-26 the ratings were missing in rounds 1 and 2 and present for all 20 clubs from
round 3. The Schedule tab shows a note while none are available, and the Explained tab
says the same.

### Small fixes

- The Round picker and the Explained tab's Example team picker now use an inline label
  that is vertically centred with the tabs, like the Breakdown picker.
- `lib/useElementWidth.js` was extracted from `RaceChart` and is shared.

## Verify

- `eslint` and `vite build` pass. Playwright 8 of 9 (same pre-existing failure).
- Every tab opened in headless Chromium for E2025 (full data) and E2026 (2 rounds, no
  schedule ratings), with no console errors. The Ratings chart was also checked at
  420px wide, and on hover.

## Known gaps

- Advanced columns are not sortable; the table is ordered by net rating.
- The Explained text was written by the assistant and should be read once for accuracy.
