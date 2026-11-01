# Fix: Player Overview tab compact, with weight and birth date

**Type:** Fix
**Status:** verified
**Branch:** fix/player-overview-tab-compact-with-weight-and-birth-date

## The problem

The player page's Overview tab (`/:season/players/:personKey`, `players/PlayerOverviewSection.jsx`) and the hero above
every tab (`players/PlayerHero.jsx`) take more room than they need, and the hero leaves out facts the API now sends:

- **Season line:** seven tiles, each showing its rank twice ("#65" in the corner and "65th of 222" under the bar).
- **Profile and form row:** about 410px tall at 1440px, with a 256px radar in a large panel. For a player who can't be
  ranked yet (under the phase's game minimum, e.g. 15 of 20), the radar panel says "Not enough recorded stats yet to
  chart percentiles." and stays nearly empty beside the full form panel.
- **Shooting:** two half-width panels. "Where the points come from" is mostly empty space under one bar and three
  numbers.
- **Hero:** Country, Height, Age, Games, Team record. The player response now carries `weightKg` and `birthDate`
  (added by the players list fix), but neither is shown.

The user wants the tab more compact, with only the main numbers. Everything else stays for the Statistics tab.

## The fix

### Season line (shorter tiles)

- **One rank per tile:** the "#65" corner badge goes. The value, the rank bar and "65th of 222" stay (or the
  existing "Not ranked: under 20 games" / "No recorded stats").
- **Tighter tiles:** less padding (`p-3` to `px-3 py-2`), the value one size smaller (`text-3xl` to `text-2xl`), and
  the bar closer to it. A tile ends up about a third shorter.
- **Unchanged:** the grid (2 / 4 / 7 per row), the "Not ranked yet" note above it, and the tile titles (hover text).

### Profile and form row (tighter)

- **Lower radar:** the radar canvas is 208px tall instead of 256px. The strongest and weakest chips stay under it.
- **Unranked players:** when no axis has a percentile, the profile panel is left out. Recent form then takes the
  whole row and the empty radar panel is gone. The "Not ranked yet" note above the season line already says why.
- **Recent form:** unchanged in content; it already sits at its natural height.

### Shooting (one panel)

- **One panel "Shooting"** (kicker PER GAME). From lg it has two columns:
  - **Left:** the 2PT / 3PT / FT bars and the TS% / eFG% chips.
  - **Right:** "Where the points come from": the split bar, the three shares and the note.
- **Below lg:** the two parts stack inside the same panel, separated by a rule.
- **No scoring recorded:** the right column says "No scoring recorded yet." as today.

### Hero: weight and birth date

- **Weight:** a new fact after Height, e.g. "95 kg". It is left out when the season has no weight for the player, as
  in many older seasons, rather than showing "—".
- **Birth date:** under Age, as its sub line, e.g. "born 15 Dec 1995". The `YYYY-MM-DD` value is formatted as a
  calendar date (read as local, not UTC midnight, so it never shows the day before).
- **Age fallback:** when the season feed has no `playerAge`, Age falls back to the age on 1 October of the season's
  first year, computed from `birthDate`. That is the rule the players list uses, moved to a shared helper in
  `lib/` so both pages use one rule.
- **Missing values:** with neither an age nor a birth date, Age shows "—" as today.

Must not change: the other player tabs, the tab strip, the radar's axes and percentiles, the form bars and best game,
the season line's ranking rules, the players list (apart from importing the shared age helper).

### Changes found during implement

- **Recent form is shorter too.** The form panel set the row's height, so a lower radar alone saved nothing. Its bars
  are 80px instead of 112px, with less space around the averages and the best game. The form skeleton matches.
- **Skeleton:** the Overview skeleton draws one shooting panel and the smaller radar.
- **Measured** (Isaac Bonga, 2025-26): the page is 1407px tall at 1440 (was 1459) and 2533px at 390 (was 2678).
- **The shared helper is `lib/playerAge.js`:** `ageAtSeasonStart` (moved from the players list) and
  `formatBirthDate`. The date follows the browser's locale, e.g. "Nov 8, 1999" or "8 Nov 1999".
- **From review, a more compact hero:**
  - From 640px, "Compare with another player" shares the club row, on its right, instead of taking a row of its own.
    Below 640px it stays the last, full-width row (two copies, one hidden at each width).
  - The surname is `text-4xl` from lg (was `text-5xl`), with less padding and smaller gaps.
  - The hero is 236px tall at 1440 (was about 303). The page skeleton's hero matches.
- **From review, percentile bars beside the radar:** the six axes as bars, each with its value and unit (e.g.
  "Rebounding 5.6 reb") and its percentile, tinted by third. Beside the radar from 640px, under it below. Each axis in
  `playerOverview.js` gained a `unit`. With the hero change, Bonga's page is 1339px at 1440. At 390px it is 2747px,
  because the bars stack under the radar.
- **Tests:** the hero test without a photo, number, club or height now also drops weight and birth date. New tests
  cover the weight and birth date (the 15th, never the 14th), one rank per tile, the single shooting panel (two
  columns from 1024px, stacked below), an unranked player (no profile panel, form across the row), the Compare button's
  place, and the percentile bars. An existing hero test now measures the visible Compare copy. The other player-page
  specs (advanced, career, shooting and games, statistics) also pass with the new hero.

## Build steps

- [x] 1. **Hero.** Weight and birth date, the age fallback and the shared age helper (used by the players list too).
  Done when: lint passes, and the 2025-26 hero for Isaac Bonga shows weight and "born …". For a 2001-02 player without a
  weight, the hero has no Weight fact.
- [x] 2. **Overview.** Shorter tiles, the lower radar, the profile panel left out for an unranked player, and the one
  shooting panel.
  Done when: lint passes. At 1440px Bonga's Overview is noticeably shorter (measured against today's 1459px page).
  An unranked player (Carlik Jones, 15 games) shows recent form across the row. At 320px nothing scrolls sideways.
- [x] 3. **Browser checks.** Update `player-overview-layout.spec.js`:
  - one rank per tile;
  - the unranked layout (form across the row, no profile panel);
  - the single shooting panel, two columns from lg and stacked below;
  - the hero's weight and birth date, and a player without them;
  - no sideways scroll at every width it already checks.

  Done when: that spec, `players-layout.spec.js` (for the shared age helper) and `responsive.spec.js` pass against the
  local database.

## Verify

- `npm run build` (root) and `cd frontend && npm run lint` pass.
- The specs above, after `/api/health` reports `"target":"local"`.
- By hand:
  - **2025-26, Isaac Bonga, Overview at 1440px:** short tiles with one rank, a compact radar and form row, and one
    shooting panel with two columns. The hero shows "95 kg"-style weight and "born …".
  - **Carlik Jones:** recent form spans the row.
  - **390px:** everything stacks and fits.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7238,"specSha256":"fb4dc7a5d2bad2a5424bd2079b4a4962dcfa9130559595dcf396635de9ee4600","branch":"refs/heads/fix/player-overview-tab-compact-with-weight-and-birth-date","head":"dfba8bdb859e768ae70472d70abc0a7881bd9f0d","baseRef":"refs/heads/master","baseCommit":"dfba8bdb859e768ae70472d70abc0a7881bd9f0d","sourceTree":"c2c35496065518829630bec6822fc68296a2c2f5","absentOptional":[]} -->
