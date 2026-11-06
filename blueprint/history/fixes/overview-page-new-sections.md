# Fix: Overview page new sections

**Type:** Fix
**Status:** verified
**Branch:** fix/overview-page-new-sections

## The problem

Overview recaps a season with a hero, the phase story, statistical leaders, defining games, the scoring trend and the
road to the title. Two common recap questions go unanswered:

- **Who had the best single games this season?** The Records page answers this only all-time, across every season.
- **Who was the most valuable player?** Overview shows counting-stat leaders only. The win shares and RAPM numbers
  exist but appear only on the Leaders page's advanced boards.

Home advantage is also never mentioned, although every played game is already loaded on the page.

## The fix

Overview only. One small backend addition; everything else uses endpoints and data the site already has.

1. **Season highs** — four cards: the season's best single game for Points, Rebounds, Assists and PIR. Each shows the
   player's photo, name, club, the number, and "vs OPP · date", and links to that game.
   - Backend: a new read-only `GET /api/seasons/:seasonCode/season-highs` route. It reuses the record book's single-game
     query (`bookSingleGames` in `db/season-records.ts`) with an opt-in season filter, plus the opponent's code, so the
     all-time Records behaviour stays the same. Response: `{ cards: [{ metric, label, record: { personKey, playerName,
     clubName, clubCode, clubTvCode, playerImageUrl, gameCode, scheduledAt, opponentTvCode, value } | null }] }`. It uses the
     existing season validation and response cache.
   - Ties: the earliest game wins, as in the record book. The card does not list who tied.
2. **Most valuable players** — the top 5 by win shares for the whole season (`getAdvancedLeaders`, metric `winShares`,
   scope `all`, the endpoint's default 50% games rule). Each row shows rank, photo, name, club and win shares, with
   RAPM beside it when the season has it (metric `rapm`, matched by player). It is titled as a stat ranking, not an
   award ("Most valuable by win shares"), and links to each player and to the Leaders page's advanced board.
   - A season without advanced stats shows the panel's empty message instead of the list.
3. **Home vs road** — one compact card row from the played games already loaded (forfeits left out): home win %
   (wins of played), the average home margin, and the clubs with the best home record and the best road record
   (most wins, then fewest losses).

**Placement:**
- Season highs and Most valuable sit right after Statistical leaders; on wide screens Most valuable fits beside the
  highs or stacks under them.
- Home vs road sits next to Scoring through the season, as both are league-wide trends.
- Phones: cards in 2×2 grids and stacked lists, with no horizontal swipe rows.

Every new section keeps the page's loading skeleton, error with retry, and empty behaviour. It must work for grouped
(2013), cancelled (2020), finished (2025) and live (2026) seasons, and for old seasons without player photos (a
silhouette, as the leader cards do).

## Build steps

- [x] 1. **Season highs route** in the backend. Done when: `/api/seasons/E2025/season-highs` returns four cards from
  E2025 games only, each matching the top row of that season's own box scores, and `cd backend && npm run build`
  passes.
- [x] 2. **Season highs and Most valuable** on Overview. Done when: E2025 Overview shows the four highs linking to the
  right games, and the top 5 by win shares match the Leaders page's advanced win shares board for the whole season.
- [x] 3. **Home vs road** card and the layout. Done when: the home win % matches a count of E2025's played games, the
  phone layout has no sideways scroll, and `eslint` and `vite build` pass.

## Verify

- Open Overview for 2026, 2025, 2013, 2020 and an old season (2004) at 390px, 768px and 1280px: no horizontal page
  scroll, every link opens the right game or player, and no panel is broken or empty without a message.
- Browser tests (with `/api/health` reporting `"target":"local"`): `overview-layout.spec.js`, plus a new check that
  Season highs, Most valuable and Home vs road agree with the API, and `responsive.spec.js`.

## Changes from the plan

- **Most valuable header:** the kicker is "WIN SHARES" and the title "Most valuable", so the panel does not read
  "Most valuable" twice. It is still a stat ranking, not an award.
- **RAPM** is matched from the season's top 100 RAPM players (the endpoint's largest page). A top-5 win shares player
  outside that 100 would show win shares only; none does for 2025 or 2026.
- **Home and away** also leaves out the Final Four (a neutral venue) besides forfeits. A club's "best" record that
  others share shows "+N level", as the Home KPI cards do.
- **Six season highs (owner feedback):** Season highs show all six Statistical leaders categories (Points, Rebounds,
  Assists, Steals, Blocks, PIR), not four, in the same grid as the leaders above them: full width, 2 columns, 3 from
  1280px.
- **Layout (owner feedback):** paired panels must be the same height. Most valuable and Home and away share a row from
  1024px at equal height (the five win-shares rows spread over it, the four venue figures 2×2 and centred). Below
  1024px everything stacks. The scoring chart is full width again.
- **Compact cards (owner feedback):** Overview's leader and season-high cards (Overview-only CSS, Home's cards
  untouched) have a smaller photo and less padding, three to a row from 1024px and all six in one row from 1536px.
- **Club labels (owner feedback):** those cards name the club by its short name (Olympiacos) from 640px and by its TV
  code (OLY) on a phone, with the full name as the tip. A traded player's codes stay codes. The season-highs response
  now carries `clubCode` for this.
- **Home and away redesign (owner feedback):** a large home-win %, a home/road split bar with its counts, the home
  margin beside it, and the best home and road clubs with crests. Its text rows wrap at 320px.

## Evidence

- `/api/seasons/E2025/season-highs` points card (Punter 43, vs KBA) matches the Records page's best E2025 row.
- `eslint` on the changed frontend files, and the root `npm run build` (backend `tsc` and frontend Vite) pass.
- Playwright on the local DB: new `overview-sections.spec.js` (Season highs, Most valuable and Home and away against
  the API, plus layout at 320 to 1280px) and `overview-layout.spec.js` pass (44 tests with the player and team
  overview specs the file filter also matched), and `responsive.spec.js` passes (163 tests).
- After the compact cards, club labels and Home and away redesign: the same three specs pass again (188 tests, grid now
  2/3/6 columns), and the root build passes.
- After the six highs and the layout change: `overview-sections.spec.js` (six cards, 2/3 columns, equal-height row),
  `overview-layout.spec.js` and `responsive.spec.js` pass (188 tests), and the root build passes.
- Screenshots reviewed: 2025 at 1280px and 390px, plus 2026, 2013, 2020 and 2004 (no photos, no RAPM) at 1280px.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7169,"specSha256":"244df10bdba1f62723fed2c5c9dbd5d181f9c478c1adaf6562713f719a7d7239","branch":"refs/heads/fix/overview-page-new-sections","head":"814e0713487d090eee6a4815d612eb123586e1af","baseRef":"refs/heads/master","baseCommit":"814e0713487d090eee6a4815d612eb123586e1af","sourceTree":"148f93925bccd75e555c356e99dd598349f9f97d","absentOptional":[]} -->
