# Fix: Player page - Advanced tab with ranked ratings, a compact trend, on/off bars and RAPM

**Type:** Fix (polish)
**Status:** verified (awaiting the owner's review)
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

The tab had six plain tiles, a trend chart with a 38-row table printed under it (the page was mostly that table),
an on/off table that needed explaining, and RAPM as five more tiles. Nothing said whether a number was good, and
there was no league context.

## What changed

- `backend/src/routes/seasons.ts`: the player advanced response has a new `ranks` object with the player's rank on
  PER, Win Shares per 40 and RAPM (`rank`, `of`, `value`, `minMinutes`). They are ranked among players with the same
  minimum minutes the advanced leaderboards use (100 minutes, 500 for RAPM, 20 early in a season), PER and Win Shares
  at the selected scope's last round, RAPM whole season. `rank` is null for a player under the minimum. The league
  leaderboard endpoint is capped at 100 rows with no paging, so it could not rank a mid-pack player, hence the new field.
- `players/PlayerAdvancedSection.jsx` (rewritten):
  - **Ratings:** PER, Win Shares, WS/40 and USG% as cards in the style of the Overview, PER and WS/40 with their league
    rank and a percentile bar (green top third, red bottom third), hover explanations for each, and a line with games
    and minutes.
  - **Trend:** the metric picker is now tabs (PER, Win Shares, WS/40, USG%), and the round-by-round table is folded behind
    "Show the round-by-round numbers" (`TrendChart` has a new `collapseTable` option).
  - **On/off:** one panel per club (a full-width panel for one club, two across for a traded player): a large net
    rating figure (green better, red worse), mirrored on-court against off-court bars for offensive and defensive
    rating using the shared `ComparisonRow`, and a sentence saying whether the offense and defense are better or worse with
    him on the court. The small-sample guard (under 300 minutes on court) is unchanged.
  - **RAPM:** overall, offense and defense drawn as bars from a middle line on a fixed scale of plus or minus 2 points per
    100 possessions (so a small value looks small), with axis labels, the player's rank, and the sample.
  - The sections ease in; scope tabs, the early-season note and the empty states are as before.

## Second pass: say whether a number is good (found in review)

The first version ranked PER and Win Shares per 40 but a rank such as "183rd of 269" did not say whether 12.5 PER is good.

- `backend`: the advanced response's `ranks` now cover PER, Win Shares, Win Shares per 40, usage, RAPM and on/off net rating
  (a new `getUsageLeaders` reads every player's running usage), and each carries the `percentile` and the league's `spread`
  (10th, 25th, 50th, 75th and 90th percentile values), so the page can draw honest zones in the stat's own units.
- `players/advancedVerdict.js`, `AdvancedGauge.jsx` (new): a percentile becomes a word and colour (Elite, Very good, Above
  average, Average, Below average, Weak, Poor); a gauge of seven zones with a marker where the player sits and the values at
  the 10th, 50th and 90th percentile underneath. Usage is a role, not a quality, so it reads Very low to Very high in blue.
- `PlayerAdvancedSection.jsx`: a Scorecard of six cards (PER, Win Shares, WS/40, usage, RAPM, on/off), each with a verdict pill,
  the gauge, the rank and league median, and one plain sentence on what the stat measures; an "In short" sentence on the
  whole picture (better than most on, about average on, below most on); a collapsible "How to read these numbers" with the colour
  legend and every definition; verdict pills on the on/off and RAPM sections too. A sample under the minimum shows "Not ranked"
  and the scorecard hides an on/off value the section hides.

## Verify

- `eslint`, `vite build` and `tsc` pass.
- API: Cole Swider ranks 1st of 269 on PER (matches the league leaderboard's first entry); Abalde 183rd of 269 on PER and
  77th of 159 on RAPM; Carlik Jones (421 minutes) has PER and WS/40 ranks but no RAPM rank.
- Headless Chromium, dark and light at 1500, 1860 and 420px: Abalde, Jones and Calathes (traded), no overflow or page errors.

## Known gaps

- The ranks are computed in the API from the same rows the leaderboards read; if wanted in the database, the pipeline
  could publish them.
