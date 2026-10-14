# Remaining coverage gaps after feature 34a-34n

Classifies every open item of the 34a inventory ([historical-season-inventory.md](historical-season-inventory.md), sections 7 and 11, and the
registry's unverified fields). Checks were run on 2026-10-14 against the local API and code (`/api/health` reported
`target: local`); no Neon, pipeline or database write was involved. "Resolved" means a check below was run now; anything not
re-checked says so and is left for 34o. No row proposes inventing data.

Statuses: **Resolved** (an earlier leaf fixed it, with the check), **App ok** (acceptable as is), **Pipeline/source** (needs data or
a decision outside this repository), **Deferred** (a recorded product decision), **34o** (not re-checked here; the all-season acceptance
must cover it).

## Application contract findings (inventory section 7)

| Item | Status | Evidence |
| --- | --- | --- |
| 7.1 Identity and scoping (competition and season scope, unique group IDs, group-name styles) | App ok | Unchanged code path; group labels are read from the data per era (34h-34m). |
| 7.2 Round numbering and display names | Resolved | `GET /2012/phases/PO/rounds` returns names "Game 1"..., `TS` "Round 1"...; pages use `app_rounds` names. E2000, whose source rounds mix stages, is browsed by stage name (34m, `elimination-series.spec.js`). |
| 7.3 Series winner versus series leader | Resolved | Win targets come from the format (`stageWinTarget`); a leader is not a winner (34c-ii, 34i-34m; `grouped-three-groups.spec.js` "a one-game lead is not a winner"). |
| 7.4 `status=scheduled` returned abandoned or cancelled games | Resolved | `/2019/games?status=scheduled` and `/2021/games?status=scheduled` both return 0 games (34f, 34g). |
| 7.5 `basic.qualified` is false before E2015 | Resolved | The frontend takes qualification places from the format's rules, not the flag; no standings code reads `basic.qualified` (search of `frontend/src`: only player-record `qualified`). |
| 7.6 E2021 snapshot alignment | Deferred | Approved warning-first scope (34g): Home carries the caveat; the pipeline investigation is not scheduled here. |
| 7.7 Forfeits and missing performance data | Resolved | Standings count them, game pages and statistics label them (34k, 34l, forfeit fixes); `/2001/teams/TEL/team-stats?phase=TS` returns `gamesPlayed: 5` with real totals, shown with the games-played flag. |
| 7.8 Statistics scopes (`TS`) | Resolved | `/2012/season-stats?phase=TS` and `/2012/team-stats?phase=TS` answer 200; `PHASE_NAMES` includes `TS`; `advancedScopeForPhase` keeps `TS` (34c-iii). |
| 7.8 Records minimum games (`MIN_SEASON_GAMES = 20` assumes 34 games) | Resolved (code) | `seasonMinGames` in `backend/src/db/season-records.ts` scales the minimum to each season's own regular-season games (22 of 38, 6 of 10). Effect on individual older-season records was not re-measured: **34o**. |
| 7.9 Coverage before E2007 (no shots, play-by-play, event-derived statistics) | 34o | The coverage route reports per item; whether every page shows "unavailable" rather than zero for E2000-E2006 is for the 34o all-season acceptance. |
| 8 Local/Neon compatibility (publisher, allowlist, row volumes) | Pipeline/source | Needs inspection of the pipeline repository; a separately approved task before any production rollout (34o and later). |

## Open questions (inventory section 11)

| # | Question | Status | Evidence or owner |
| --- | --- | --- | --- |
| 1 | Cross-group best-sixth criterion (E2002-E2007) | App ok | The registry keeps `criterion: null`; the app marks the qualifier from the recorded Top 16 field, never by recomputing (34j). The regulation text stays unverified. |
| 2 | Quarterfinal pairing rule per season (E2004-E2015) | App ok | Pairings shown are the recorded ones, labelled by Top 16 group places only when consistent, otherwise unverified (34h-34j). The regulation remains unverified. |
| 3 | E2000 replay representation and missing game codes 160-161 | Pipeline/source | Shown as a note on the AEK-Tau semifinal with the three recorded games; whether the annulled game exists in the source is a pipeline question (34m). |
| 4 | E2021 statistics and records eligibility of annulled games | Deferred | Recorded in 34g; no decision for statistics or records. |
| 5 | E2021 standings snapshot alignment cause | Pipeline/source | See 7.6. |
| 6 | Qualifying games for E2001 and E2009-E2015 (and whether E2008 and E2015 had qualifying rounds) | Pipeline/source | This leaf shows the established fact and "not loaded" note for E2001 and E2009-E2014. E2008 and E2015 stay silent (not established). A real stage needs the feed below. |
| 7 | Effect of `MIN_SEASON_GAMES` on older seasons' rating records | Resolved (code) / 34o | See 7.8. |
| 8 | E2026 Final Four third-place policy | Deferred | The registry keeps `thirdPlaceGame: null` for E2026 (the season is not finished); no third-place claim is made until it is decided. |

## For the pipeline owner: qualifying games

Wanted, only if the source has them, for E2001 and E2009-E2014 (and E2008 or E2015 if the source establishes that they had qualifying rounds):

- The qualifying games themselves: the two-legged ties (E2009, E2010), the two final-eight tournaments (E2011) and the single-venue tournaments
  (E2012-E2014, E2001's rounds), with the same game fields as main-stage games (clubs, scores, date, round and group labels, status) and
  box scores only where the source has them.
- A phase code of their own (for example `QU`) that is **not** `RS`, `TS`, `PI`, `PO` or `FF`, so they cannot enter the regular-season
  standings, records, team counts or statistical scopes by accident. Qualifying-only clubs (clubs that lost in qualifying) must not appear
  in the main-stage team list or counts; clubs that qualified are already in the regular-season field.
- For two-legged ties: both legs and an aggregate result, so a tie can be shown as one series.
- No schema proposal is made here, and nothing may be fabricated or inferred: if the source lacks a qualifying game, it stays absent and
  the app keeps showing the "not loaded" note.

Until then the app's behaviour is: the regular-season table, fixtures and Race show one note naming the established qualifying fact and that
the qualifying games are not loaded; counts, records and statistics cover the main competition only.
