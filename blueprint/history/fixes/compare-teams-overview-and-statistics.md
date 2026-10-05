# Fix: Team comparison with an Overview and the full statistics

**Type:** Fix (polish from feedback)
**Status:** verified
**Branch:** master (done from user feedback; not run through `/fix` and `/implement`)

Recorded after the work. This is part 2 of the Compare rework (part 1: [compare-page-opens-on-the-upcoming-games.md](compare-page-opens-on-the-upcoming-games.md)).

## The problem

The team comparison held seven standings numbers (games, wins, losses, win %, points for and against, difference). It had no
ratings, shooting, rebounding or playmaking, and nothing to say how the two clubs stack up in the league.

## What changed

- `frontend/src/leaders/teamData.js` (new): the team statistic catalog and the league rows hook (`useTeamRows`), moved out of
  the Leaders Teams board so the Leaders board and the comparison read the same numbers (totals with overtime, advanced
  ratings, record). `TeamsLeaders.jsx` imports it.
- A team comparison now has four sections: **Overview**, **Statistics**, **Rosters**, **Trends**; it opens on the Overview.
- `CompareTeamStats.jsx` (Statistics): every team statistic of the phase side by side, grouped (Efficiency, Record, Scoring,
  Shooting, Rebounding, Playmaking, Defense), each row with the winning side tinted, "lower is better" where it applies, and
  each club's place among the league's clubs under its bar.
- `CompareTeamOverview.jsx` (Overview), the preview of the pairing:
  - **Matchup edges**: 16 measures of how a team plays (offensive and defensive rating, shooting, rebounding, turnovers,
    assists, steals, blocks, fouls, what it allows opponents). Each club's count of measures where it ranks higher, and its
    three biggest edges (a gap of at least three places) as "#2 vs #14".
  - **Form**: the last five results of each club with opponent, venue and score (linked to the game), and home and away
    records. For a game opened from the games panel it says the host's home record and the visitor's away record are the
    ones that count.
  - **Players to watch**: each club's three highest scorers per game, linked to their pages, and a button that opens the
    player comparison of the two top scorers.
  - **Meetings**: this season's games between the two (played or coming) with the series record.
- `comparisons/teamCompare.js`: places in the league, the edge measures and their gaps.
- Removed the old seven-row table and `TEAM_METRICS` (`lib/statsFields.js`).
- Spec: `compare.spec.js` follows the Overview and Statistics sections.

## Verify

- `cd frontend && npm run lint`, `npm run build`; the full browser suite passes (87 tests).
- Headless run of an Olympiacos and Real Madrid comparison (2025): Overview, Statistics and a phone width show no page
  errors, failed requests or horizontal overflow.

## Known gaps

- Venue records use the chosen phase's games only; there is no neutral-court split.
- The Statistics section is per game only (no season totals).
- Players comparison is unchanged; its rework is part 3.
