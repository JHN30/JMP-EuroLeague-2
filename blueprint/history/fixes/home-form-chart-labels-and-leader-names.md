# Fix: Home form chart labels and leader names

**Type:** Fix
**Status:** verified
**Branch:** fix/home-form-chart-labels-and-leader-names

## The problem

1. **Home Form chart** (`frontend/src/dashboard/LeaderTrend.jsx`, styles `.leader-trend*` and `.chart-well` in `frontend/src/index.css`): the league leader's point-margin chart is a bare line. It has no axis labels, so the reader sees a line go up and nothing says what the numbers or the points are. The headline shows the average of the shown games ("+21.7, avg point diff, last 3") but the chart does not show it, so there is nothing to compare each game against. The chart's scale also runs from the lowest to the highest shown game, so when every game is a win the "baseline" is drawn at the bottom edge and does not sit at zero, and the caption ("below the line means it's been close or a loss") is wrong: below the line is always a loss.
2. **League leaders' names** (`frontend/src/dashboard/LeadersPanel.jsx` on Home and `frontend/src/season/SeasonOverviewPage.jsx` on the Season overview): the leader cards print the feed's name as it comes, "HIFI, NADIR". The user finds it cleaner without the comma. The Box score and the play-by-play already drop the comma ("LAST FIRST", `PlayerLink noComma`).

## The fix

**Chart.** Keep the chart's data, request and headline; change what is drawn and labelled:

- The scale always includes zero (domain from `min(0, lowest)` to `max(0, highest)`), so the dashed baseline is truthfully at zero and above or below it means won or lost.
- Y axis: labels at the top and bottom of the scale and at zero (signed whole numbers such as `+30`, `0`, `-5`), left of the plot. A label that would sit on top of another (within about 12% of the height) is left out.
- X axis: one label per game under its point, the opponent's TV code (`teamCode`, the club on the other side of the leader), with the full opponent name and the score in the point's tooltip (`title`) as well as the existing text. Below `sm` every other label is hidden so the labels never touch.
- Average: a dashed line across the plot at the average margin of the shown games, labelled "Avg +21.7" (the same number as the headline, same formatting), placed above the line at the right end and kept inside the plot.
- The axis and average labels are HTML text laid over the chart (the SVG is stretched, `preserveAspectRatio="none"`, so SVG text would distort), marked `aria-hidden`; the chart's `aria-label` also states the average.
- The caption is reworded: above the line is a win and below it a loss, and the dashed line is the average margin of these games.
- Nothing else on the panel changes: same title, headline, loading, error and "Not enough played games" states.

**Names.** The Home leader cards and the Season overview leader cards show the name without the comma, "HIFI NADIR" (the same form as the Box score), by one shared change to the text, not a change to the data. The player link, the club line and the value are untouched. Other pages keep their own name forms.

Must not break: the Home layout at 320 to 1280px with no sideways page scroll (the document width, not only the overflow helper), the existing Home and overview specs, and the TV-code labels from 32b.

## Build steps

- [x] 1. **Chart and names.** Rework `LeaderTrend.jsx` and its CSS as above; drop the comma in the two leader cards. *Done when:* on Home at 320, 390, 768 and 1280px the chart shows y-axis labels including `0`, one opponent TV code under each point (every other one below 640px), a dashed average line whose label equals the headline number, and a caption that says above is a win and below a loss; nothing is clipped or overflows and the document is not wider than the window; the Home and Season overview leader cards show "HIFI NADIR"-style names with no comma; `npx playwright test home-layout.spec.js overview-layout.spec.js` still passes.
- [x] 2. **Spec and gate.** Add `frontend/e2e/home-form-chart.spec.js` (live data, like `home-layout.spec.js`): axis labels, x labels are the TV codes of real teams, the average label matches the headline, no overflow at the four widths, and no comma in the leader names on Home and the Season overview. *Done when:* it passes, and root `npm run build` and `cd frontend && npm run lint` pass.

## Verify

Open Home at about 390px and at 1280px: the Form panel shows a scale on the left, a TV code under each point, a dashed "Avg" line with the same number as the big figure, and the caption matches. Open the Leaders panel on Home and on the Season overview: names read "HIFI NADIR", with no comma. No Co-Authored-By or AI attribution in the commit (AGENTS.md).

## Built as

- The baseline is now a solid line at zero; the dashed line is the average. The area fills down to the baseline, not the bottom edge. The average label sits below its line when the line is in the top fifth of the plot, so it stays inside. The y labels are the real top and bottom of the scale (the highest and lowest margin, with zero in the range), not rounded steps.
- The name change is a new `withoutComma` helper in `lib/playerName.js`, used by the two leader cards only.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5161,"specSha256":"dc6a87f62b9f625ea0b3bb1559fcc5cb20ffd7b261bd593e02fc7ebebb0c7170","branch":"refs/heads/fix/home-form-chart-labels-and-leader-names","head":"e17e854cf53c8bd54cbb258eed6a27451601113d","baseRef":"refs/heads/master","baseCommit":"e17e854cf53c8bd54cbb258eed6a27451601113d","sourceTree":"3e14004fa3cfc989187872a30e5d918f2aea513a","absentOptional":[]} -->
