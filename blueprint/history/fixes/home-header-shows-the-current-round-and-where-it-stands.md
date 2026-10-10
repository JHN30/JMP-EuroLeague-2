# Fix: Home header shows the current round and where it stands

**Type:** Fix
**Status:** verified
**Branch:** fix/home-header-shows-the-current-round-and-where-it-stands

## The problem

The Home header (`dashboard/Dashboard.jsx`) reads `Round {standings.round}`, the latest round with a played game. Round 5 therefore
does not appear until one of its games has been played, and for the days between rounds Home still says "Round 4" with nothing to say
that round 4 is over and the next one is coming. The header has no description, so a reader cannot tell a finished round from one in
progress.

## The fix

Name the current round, and say where it stands.

- **Current round** = the round of the next unplayed game: the first game of the already loaded `["games", seasonCode, "scheduled",
  "asc"]` query (also what Upcoming games shows). Its title is that game's `roundName` (else `Round <roundNumber>`), so the postseason's
  rounds are named as the API names them. The round's games come from `getSeasonGames(seasonCode, { phase, round, limit: 100, order:
  "asc" })` under the query key the Compare page uses for the same request (`["fixtures", seasonCode, phase, round]`), so the cache is
  shared.
- **Status line**, under the title (the `PageHeader` `description` slot, muted, small), from the round's games and the current time:

  | State | Line |
  |---|---|
  | Now is before the round's first start | `Starts today at 18:45`, `Starts tomorrow at 18:45`, or `Starts in 3 days (Tue 13 Oct, 18:45)` |
  | The first start has passed and not every game is played | `Under way · 4 of 9 games played · next game tomorrow at 20:00` (`today at`, or the short date and time from two days on) |
  | As above but every unplayed game has already started | `Under way · 8 of 9 games played`, with no next game |
  | The round's last game is marked played | the next unplayed game's round becomes the current one, and shows its own `Starts ...` line |
  | No scheduled game is left | the title stays `Season overview` and the line says `The season has finished.` (only when the standings show played games) |

- **Time zones.** Every time is a UTC instant (`scheduledAt`). A start is shown in the viewer's local zone (as the rest of the site
  does) and the day words use the viewer's local calendar day: "today" when the start is on today's local date, "tomorrow" on the next
  local date, otherwise N = the number of local calendar days between today and the start. No offset is added by hand. There is no zone
  label, and no "live" state: with no live data the line never claims a game is being played.
- **Pure helper** `dashboard/roundStatus.js`: `roundStatus(games, now)` returns `{ line }` for the round's games (`scheduledAt`,
  `played`) and a `Date`, so every state can be exercised with fixed dates. It ignores games without a `scheduledAt` (a round with none
  has no line). Its wording uses `toLocaleString` / `Intl.DateTimeFormat` with the viewer's locale, like `lib/format.js`.
- **Clock.** The line is recomputed once a minute from a `now` that ticks (a small interval in `Dashboard`), so "Starts in 3 days"
  becomes "Starts tomorrow", then "Under way", without a reload. It stops with the page.
- **Loading and errors.** While the games load, and if either games request fails or returns no round, the header is exactly what it
  is today (`Round {standings.round}` or `Season overview`) with no line; a failed request is not shown as an error on the header.
- Nothing else on Home changes: Upcoming games, the table, results, KPI strip and leaders keep their queries and layout.

## Build steps

- [x] 1. **Helper and header.** Add `roundStatus.js` and use it in `Dashboard.jsx` with the two queries and the one-minute tick.
      Done when: Home at 390 and 1280px shows the next unplayed game's round name, with a status line that follows the table above
      for the live data (today: `Round 5`, `Starts in N days`), the header's spacing to the next panel is unchanged, and the line
      fits one to two lines at 320px with nothing outside its panel.
- [x] 2. **Spec.** Add `frontend/e2e/home-round-status.spec.js`: with `page.clock` fixed at chosen instants and the two games responses
      mocked, check each row of the table (a start days away, tomorrow, today; under way with and without a next game; the last game
      played, so the next round shows; no scheduled games; a failing games request leaving today's header), plus a viewer in a far
      time zone (`timezoneId` Asia/Dubai and America/Los_Angeles) where the same instant gives the local day word and time.
      Done when: the spec passes, with `home-layout.spec.js` and `responsive.spec.js` (Home at the four widths), root `npm run build`
      and `cd frontend && npm run lint`.

## Verify

Root `npm run build`, `cd frontend && npm run lint`, and the specs in step 2 on the local database (`/api/health` says `local`). By
hand: open Home and read the header (a day before the next round it should say tomorrow, on the day "today at HH:MM"); change the
browser's time zone and check the time and day word follow it.

## Notes

- No new dependency; the pure helper is the test seam for the clock (coding standards: nondeterministic input is injected).
- Changes stay on the Home page; `PageHeader` is used through its existing `description` prop.
- No AI attribution in commit messages (AGENTS.md).

## Built as

- As specced: `dashboard/roundStatus.js` (`roundStatus(games, now)`, pure) and, in `Dashboard.jsx`, a `useNow(60_000)` tick, the shared
  `["games", seasonCode, "scheduled", "asc"]` query for the next unplayed game and the round's games under the Compare page's
  `["fixtures", ...]` key. The line sits in `PageHeader`'s `description` as a muted small paragraph.
- One difference from the spec's loading rule: while either games request is still loading the title reads `Season overview` (no
  line), not the latest played round, which would show "Round 4" for a moment before "Round 5". On an error, or with no round, it is
  today's `Round {standings.round}` or `Season overview`, with no line.
- Live data now: `Round 5`, `Starts in 3 days (Tue 13 Oct, 19:45)` (the viewer's zone), at 390, 1280 and 320px, the page not wider
  than the window.
- `home-round-status.spec.js` (13 tests, fixed clock, the two games requests mocked): starts in days, tomorrow, today; under way with
  and without a next game; the next round after the last game is played; the season finished; a failing request leaving today's
  header; the line moving on as minutes pass (`clock.fastForward`); a viewer in UTC, Los Angeles and Dubai for one start at 01:00 UTC
  (tomorrow, today and today, with their own times); and the line inside its panel at 320px. All pass, with `home-layout.spec.js`,
  `home-form-chart.spec.js` and `responsive.spec.js` (184 more, 197 in all together). Root `npm run build` and
  `cd frontend && npm run lint` pass.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6933,"specSha256":"ccc7eda4a797a3fa16adef540b2ebe0ffdddbe973b7e49c72524728ceb46133c","branch":"refs/heads/fix/home-header-shows-the-current-round-and-where-it-stands","head":"b925c4cee66e083cb9a4d2a3b08730aa55dca7d5","baseRef":"refs/heads/master","baseCommit":"b925c4cee66e083cb9a4d2a3b08730aa55dca7d5","sourceTree":"e817fe79ae3d4559ad886a548c585de8da529f87","absentOptional":[]} -->
