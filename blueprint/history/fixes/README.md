# Fixes

Completed fix specs are archived here, one file per fix. These are ad-hoc bug fixes
and small changes that weren't planned build-plan features. Together with
`blueprint/history/features/`, they're the project's build history.

Work done directly from the owner's feedback, without `/fix` or `/complete`, is
recorded here after the fact, and says so at the top of the file. Add a file here for
every such change so it can be found later.

## Standings page

- [standings-polish-and-breakdown-views.md](standings-polish-and-breakdown-views.md): KPIs, net rating column, and the three rebuilt breakdown tabs (and their two endpoints)
- [standings-race-tab-repair.md](standings-race-tab-repair.md): race chart, table, and cards stop at the played rounds; crest chart; table follows the race
- [standings-animations-header-tips-and-scroll.md](standings-animations-header-tips-and-scroll.md): Motion animations, animated column header tips, the tab scroll jump
- [advanced-standings-views-explained-tab-and-visuals.md](advanced-standings-views-explained-tab-and-visuals.md): Advanced sub-tabs, the Explained tab, and the approved visuals

## Home page

- [home-ten-upcoming-games-and-results.md](home-ten-upcoming-games-and-results.md): 10 upcoming games in a wrapping grid and 10 latest results

## Games page

- [games-page-round-picker-and-two-up-cards.md](games-page-round-picker-and-two-up-cards.md): round tabs instead of the dropdown and "All rounds", two game cards per row

## Teams page

- [teams-page-animations.md](teams-page-animations.md): staggered card entrance, crest pop and hover lift on the club grid
- [team-overview-leaders-comparison-and-league-profile.md](team-overview-leaders-comparison-and-league-profile.md): snapshot panel, photo leaders, quick comparison and league ranking profile on a team's Overview

- [team-statistics-tab-versus-opponents-and-league-ranks.md](team-statistics-tab-versus-opponents-and-league-ranks.md): Statistics tab as club-versus-opponents rows with league ranks, a league-wide team-stats endpoint, and the animated Overview comparison switch

- [team-shooting-tab-sides-zones-and-style.md](team-shooting-tab-sides-zones-and-style.md): Shooting tab with a team and opponents shot map, a ranked zone table and a points-by-situation panel

- [team-advanced-tab-ratings-splits-flow-and-lineups.md](team-advanced-tab-ratings-splits-flow-and-lineups.md): Advanced tab with a two-line ratings chart, split cards, game-flow bars and lineup cards with headshots and a 100-else-50 possessions minimum

- [team-roster-tab-position-cards.md](team-roster-tab-position-cards.md): Roster tab moved after Statistics, with position groups of player cards, a facts strip and a Cards/Table switch

- [team-trends-tab-removed.md](team-trends-tab-removed.md): the redundant Trends tab removed, and the team stats browser test updated for the rebuilt tabs

- [team-games-tab-margin-strip-and-two-columns.md](team-games-tab-margin-strip-and-two-columns.md): Games tab with a win/loss margin strip, upcoming and results columns, and opponent crests

- [players-page-photo-cards.md](players-page-photo-cards.md): Players directory rebuilt as photo cards with club, number and position, and a staggered entrance

- [image-reveal-and-tab-scroll-jump.md](image-reveal-and-tab-scroll-jump.md): pictures reveal as they load (shimmer, wipe, pop), and tab changes no longer scroll the team and player pages

- [player-overview-hero-form-and-shooting.md](player-overview-hero-form-and-shooting.md): player page hero header, and an Overview with a ranked season line, profile radar, recent form and shooting

- [player-season-by-season-career-view.md](player-season-by-season-career-view.md): Season by season rebuilt as a career view (summary, season table with changes, trends, highs, role, clubs, profile by season)

- [player-statistics-tab-ranked-stat-sheet.md](player-statistics-tab-ranked-stat-sheet.md): Statistics tab as a ranked stat sheet (about 40 rows, league rank and percentile bar on each, top-10 strip, per game by default)

- [qualified-players-calculated-stats-and-2023.md](qualified-players-calculated-stats-and-2023.md): the database's calculated per-game rows and qualified flag used by leaderboards and ranks, a minimum-games default, a level Statistics tab, and the 2023 season

- [player-advanced-tab-ranked-ratings-on-off-and-rapm.md](player-advanced-tab-ranked-ratings-on-off-and-rapm.md): Advanced tab with ranked ratings, a compact trend, on/off bars and a RAPM bar, and the player's advanced ranks in the API

## Data and platform

- [read-renamed-app-neon-tables.md](read-renamed-app-neon-tables.md)
- [follow-neon-column-and-table-renames.md](follow-neon-column-and-table-renames.md)
- [connect-backend-to-existing-neon-database.md](connect-backend-to-existing-neon-database.md)

## Other

- [add-error-boundary-so-a-render-crash-doesnt-blank-the-app.md](add-error-boundary-so-a-render-crash-doesnt-blank-the-app.md)
- [fixtures-pagination-and-roster-player-links.md](fixtures-pagination-and-roster-player-links.md)
- [play-by-play-row-padding-and-alignment.md](play-by-play-row-padding-and-alignment.md)
- [score-differential-chart-redraw.md](score-differential-chart-redraw.md)
- [stale-browser-test-selectors.md](stale-browser-test-selectors.md)
- [theme-switcher-never-switches.md](theme-switcher-never-switches.md)
- [unrounded-minutes-played-display.md](unrounded-minutes-played-display.md)
- [win-shares-per-40-rename.md](win-shares-per-40-rename.md)
