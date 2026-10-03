# Fix: Team Games tab - margin strip, upcoming and results columns, crests

**Type:** Fix (polish)
**Status:** verified (awaiting the owner's review)
**Branch:** master (uncommitted when written)

> Recorded after the work, not before it. Done directly from the owner's feedback, not
> through `/fix` and `/implement`. Audit, Check, and independent review were not run.

## Problem

The Games tab was one list of text rows (opponent name, round, date, score) under a filter
dropdown (All, Results, Scheduled, Wins, Losses), with scheduled games first and results after.
There were no crests, no sense of how the games had gone, and no clear picture of "what is next"
beside "what has happened".

## What changed

- `teams/TeamGamesSection.jsx` (new, replaces `GamesSection` in `TeamPage.jsx`):
  - **Margin strip** on top ("How the games went", the idea carried over from the removed Trends
    tab): one bar per played game, oldest on the left, green going up for a win and red going down
    for a loss, as tall as the margin (with the signed margin above or below it), the opponent's
    crest and the round under it. Each bar opens the game, and its tooltip says the round, the
    opponent, home or away, and the score. The header shows the record and the average margin.
    Over a season the strip scrolls sideways and opens on the latest games; columns get wider
    while there are only a few games. The tallest bar leaves headroom so its label is never cut off.
  - **Two columns** beneath: on the left "Next games", the upcoming games with the nearest first
    (Round 4, 5, 6 and so on) and a "Next" badge on the first; on the right "Latest results",
    the played games with the most recent first (Round 3, 2, 1). They stack on a phone, upcoming
    first.
  - **Home and away:** a house marks a home game and a plane an away game, as on the EuroLeague
    site, next to the "vs" and "@" the owner likes (added after review because the text alone was
    not obvious at first glance). It is a shared `lib/HomeAwayIcon.jsx` that names itself "Home
    game" or "Away game" for screen readers and on hover, and it also appears under each strip
    bar, in the Overview's form and fixtures rows and in the header's next-game chip.
  - **Rows:** the opponent's crest beside the name ("vs" or "@" with the icon), the round under
    it, and on the right the date and tip-off time for an upcoming game or a W/L badge and the
    score (club first) for a result. A crest that is missing or fails to load shows the club's
    letters. Crests are drawn as they are, never clipped to a shape. A first version put them on
    a round white disc so dark artwork stayed visible; the owner asked for it to go because it
    cropped crests that are not round.
  - **Progressive disclosure:** each column opens with 8 rows and a "Show all N" button.
  - The results column keeps a small All / Wins / Losses filter (a replacement for the old
    dropdown's win and loss options; Results and Scheduled are now the two columns).
- `TeamPage.jsx`: the old `GamesSection`, its filter list and ordering helper are removed;
  `gameResult` stays, since the Overview snapshot uses it.

## Verify

- `eslint` and `vite build` pass; the full browser suite passes (85 tests).
- Headless Chromium, dark and light, 1860px and 420px (no horizontal overflow): Partizan this
  season (3 results, 35 upcoming, the left column opens on Round 4 with "Next", the right on
  Round 3, "Show all 35" works, the Wins/Losses filter works) and Olympiacos in E2025 (43 bars,
  the strip scrolls and opens on the latest, 31-12 and +8.0 in the header, a click on the newest
  bar opens that game). No margin label is clipped and every crest image has a size.
- Found while checking the first version: a percentage padding on the crest disc squeezed the
  image to nothing in the wide early-season columns (gone together with the disc).

## Known gaps

- The strip covers every phase of the season the team played (regular season, play-in,
  playoffs), not only the phase picked above the tabs.
- Early in a season the strip is only a few bars wide and leaves the rest of the panel empty.
- A few crests drawn in dark colours (LDLC ASVEL, for one) are faint on the dark theme, as they
  are elsewhere in the app.
- No browser test covers the new Games tab yet.
