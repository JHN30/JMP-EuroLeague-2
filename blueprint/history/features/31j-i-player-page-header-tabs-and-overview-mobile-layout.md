# Feature: Player page header, tabs and Overview mobile layout

**From build-plan:** feature 31j-i
**Build attempt:** 1
**Branch:** feature/player-page-header-tabs-and-overview-mobile-layout
**Status:** verified

## Goal

Make the top of the player page (`/:season/players/:personKey`) and its **Overview** tab comfortable from 320px up: the hero (portrait, name and number, club, facts, Compare button), the six-tab strip, and the Overview panels (season line, profile radar, recent form, shooting and points mix). No sideways page scroll, nothing clipped, no word of a name cut mid-word. Layout and label only: no API, data or feature change. Mobile is below 640px (unprefixed styles), tablet is `sm` (640px), desktop is `lg` (1024px); `xl` stays.

This is the first of four parts of 31j: 31j-ii (Season by season and Statistics), 31j-iii (Advanced) and 31j-iv (Shooting and Games) follow. The player page is the one page missing from the overflow spec (`responsive.spec.js` says so in a comment); this item adds it.

Read, not yet measured at 320px (step 1 measures it):

- `PlayerHero.jsx`: a `Panel` with the portrait on the left (`w-28`, `sm:w-44`) and a text block with `p-4 sm:p-6` next to it. At 320px the text block is about 150px wide. It holds the eyebrow ("PLAYER · POSITION"), the name (`h1`: first name `text-xs`, surname `text-3xl font-black uppercase`) beside the shirt number (`text-4xl`), so a surname gets about 90px and a name like "LARENTZAKIS-PAPADOPOULOS" cannot fit. Under it: the club chips (`ClubChip`: 24px crest and the full club name, `truncate`, "Former" badge), a facts row (Country, Height, Age, Games, Team record) and a "Compare with another player" button.
- `PlayerPage.jsx`: the `TabStrip` (`level={1}`, `className="mb-4 w-fit"`, not `scrolling`) has six tabs: Overview, Season by season, Statistics, Advanced, Shooting, Games. The `BackLink` is hidden below `sm` (the sticky bar carries it). The loading, "Player not found." and error states render before the hero.
- `PlayerOverviewSection.jsx`: the season line is `grid-cols-2 sm:grid-cols-4 xl:grid-cols-7` of `RankedStat` cards; the profile radar is a Chart.js canvas (`h-64`) with six axis labels; recent form is up to ten `FormBar` columns in one `flex` row (`flex-1`, 20px crest) with four `FormDelta` numbers and a "Best game" link; the shooting panel has `ShotRow`s (`grid-cols-[2.5rem_1fr_auto]`, a fixed `w-28` figures column) and a three-column "where the points come from" grid. The two-column grids are `lg:grid-cols-2`.
- Existing pieces to reuse: `TabStrip`'s `scrolling` prop (one row that scrolls on its own below `lg`, keeping the active tab centred), `ShortLabel` (short text below `sm`, full text from `sm`, full text kept for screen readers), `PlayerPortrait` (fills its parent's height; the caller sets the width), the Players-card pattern from 31i (the shirt number as a badge on the portrait below `sm`, names that wrap), `findBrokenWords` in `e2e/support/layout.js`. The registrations carry the club's `team.tvCode`; the games carry `tvCode` on `localTeam`/`roadTeam` (32a). Club TV code is the season's code (see the memory note on club TV code versus club code).

Targets: at 320px the page does not scroll sideways; the hero holds its content with the whole surname readable; the tab strip is one row with the active tab on screen; every Overview panel holds its content inside its box and the radar's labels are not cut off.

## In scope

1. **Hero on a phone.** Below `sm` the hero is one centred column, as on sports sites (changed at the user's request after seeing the first version): a larger portrait (144px wide, 4:5, rounded) centred at the top, then the eyebrow, first name, surname, the shirt number under the surname, the club chips, the facts (three per row, the last row centred) and the Compare button as one full-width row. The surname is smaller and wraps by whole words and at a hyphen; a very long one takes two lines at most, none of it cut mid-word. From `sm` the hero is as today (portrait on the left, the name beside the number). The portrait is never squeezed (`flex-none`) and keeps a fixed size so a player without a photo (the silhouette) has the same box. The final arrangement is confirmed with a screenshot at 320px before it is kept (step 1).
2. **Club chips.** Below `sm` a chip shows the club's TV code (`team.tvCode`, falling back to the abbreviated name, then the club code, then the name) through `ShortLabel`, with the full name kept for screen readers; from `sm` the full name as today. The crest keeps its size, the "Former" badge stays, a traded player's several chips wrap by whole chips.
3. **Tab strip.** The six-tab strip is `scrolling` (one row below `lg`, the active tab kept in view); `lg` and up look as today.
4. **Season line.** The two-column grid of ranked cards holds its content at 320px: the figure, the rank, the "n-th of N" line and the "Not ranked: under N games" note wrap by words inside the card; the not-ranked notice above them fits.
5. **Profile.** The radar fits the panel at 320px with all six axis labels visible and not cut at the canvas edge; the "Strongest" and "Weakest" badges wrap inside the panel. Chart options only (label size, padding); no new chart.
6. **Recent form.** The ten bars, their points, crests and home/away icons fit the panel at 320px without overlapping; the four averages wrap by whole items; the "Best game" link wraps inside its box. The opponent's name there is the TV code below `sm` only if the name does not fit once wrapped.
7. **Shooting and points mix.** The three shot rows keep label, bar and figures on one row at 320px (the figures never wrap), the TS%/eFG% chips wrap by whole items, and the "where the points come from" grid keeps its three cells without a cut word ("Free throws" may wrap onto two lines).
8. **Breakpoints.** Only `sm` and `lg` (and the existing `xl`) are used on these files; no `md:` or stray media query is added. Today's `lg:grid-cols-2` and `xl:grid-cols-7` stay.
9. **States.** Check, and fix only what clips: the player page's loading, "Player not found." and error states at 320px (the back link is in the sticky bar below `sm`); the Overview's loading, error and "No recorded stats for this player in this phase yet." states; a player with no photo, no number, no club (no chips), no height or age; a not-qualified player (the "Not ranked yet" notice and the "Not ranked" cards); a traded player with two club chips; no games ("No games played yet."); no scoring recorded.
10. **Overflow spec.** Add the player page to `PAGES` in `responsive.spec.js` (reached through the first card on the Players list), and drop the sentence about the player page from that file's comment.
11. **Browser check.** A new Playwright spec (see Testing).

## Out of scope

- The other tabs: Season by season and Statistics (31j-ii), Advanced (31j-iii), Shooting and Games (31j-iv), and the player data they share with the Overview.
- What the Overview says: the panels, their order, the numbers, ranks and copy are unchanged. No hidden statistics on phones, no new controls, no phase select in place of the page's phase handling.
- Any API, data, query or routing change; the name form the feed gives; the TV code at desktop widths (this item changes only what is shown below `sm`).
- Changing `PlayerPortrait`, `RevealImage`, `Panel`, `PanelHeader`, `BackLink` or `TabStrip` beyond opt-in props and a new `scrolling` use (they keep today's default behaviour). Shared components used by other pages keep their look there (the memory note on scoping a change to the page being built).

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`: build the steps in order, run the narrow check after each, run the final gate once at the end, then present one review packet. `/complete` makes the single work commit. The working tree already holds the uncommitted 31j plan split (`blueprint/build-plan.md` and `blueprint/context/project-overview.md`); `/complete` commits it with this feature.

## Build steps

- [x] 1. **Measure, then the hero and the tab strip.** Open the page at 320, 390 and 639px with a long-named player (and the live data), take screenshots, and note what clips (write the findings under "Built as" at the end, correcting the assumptions above where they are wrong). Then rearrange the hero below `sm` (scope items 1 and 2) and make the tab strip `scrolling`. Start `frontend/e2e/player-overview-layout.spec.js` with a hero and strip test at 320, 390, 639, 640, 768, 1023 and 1024px. *Done when:* at 320px the whole surname of a long-named player is readable with no mid-word cut, the number is under it, the chips show TV codes, the facts are a tidy grid, the Compare button is a full-width row, the tab strip is one row with the active tab on screen and the page does not scroll sideways; from 640px the hero looks as today; the new spec passes at all widths.
- [x] 2. **Season line, profile and form.** Scope items 4, 5 and 6. *Done when:* at 320px the ranked cards, the radar (all six labels visible), the badges, the ten form bars, the averages and the Best game link hold their content inside their panels, and the spec covers each at 320, 390, 639, 640 and 1024px.
- [x] 3. **Shooting, states and overflow spec.** Scope items 7, 8, 9 and 10: the shooting panel and points mix, the states mocked and checked at 320px, and the player page added to `responsive.spec.js`. *Done when:* every item above holds at 320px, the new spec passes, and `responsive.spec.js` passes with the player page in it.
- [x] 4. **Final gate.** `npx playwright test player-overview-layout.spec.js responsive.spec.js detail-back-links.spec.js smoke.spec.js` from `frontend`, then `cd frontend && npm run lint` and root `npm run build`. *Done when:* all pass.

## Files / areas

- `frontend/src/players/PlayerHero.jsx` (hero, chips, facts), `PlayerPage.jsx` (tab strip `scrolling`), `PlayerOverviewSection.jsx` (season line, radar options, form, shooting).
- `frontend/src/index.css`: only if a rule cannot be written as utilities (unlayered rules outrank utilities).
- `frontend/e2e/player-overview-layout.spec.js` (new); `frontend/e2e/responsive.spec.js` (the player page entry and its comment).
- `ShortLabel` (`lib/ShortLabel.jsx`), `TabStrip.scrolling` and `findBrokenWords` are reused, not changed.

## Data / contracts

None. Reads the existing player endpoints through the existing queries: `GET /api/seasons/:seasonCode/players/:personKey` (name, `jerseyName`, `imageUrl`, `dorsal`, `positionName`, `countryCode`, `heightCm`, club fields), `.../registrations` (`team.name`, `team.abbreviatedName`, `team.tvCode`, `team.crestUrl`, `active`), `season-stats`, `.../games` and the league leaderboard. `NULL` or a missing value means unavailable: the part is omitted or shows "—", never zero.

## Testing

No unit test runner is configured. Browser tests are opt-in evidence (`cd frontend && npx playwright test <file>`; Playwright starts its own servers). `player-overview-layout.spec.js` loads the page once per test and resizes through 320, 390, 639, 640, 768, 1023 and 1024px, with the player, registrations, games and leaderboard mocked where a known shape is needed (a very long surname, a traded player, no photo, no number, a not-qualified player, no games) and the live page used for the real numbers. It checks: the whole surname free of cut words (`findBrokenWords`), the number under the name below 640px and beside it from 640px, the chips' label (TV code below 640px, full name from 640px) and accessible name, the portrait box the same size with and without a photo, the facts grid, the tab strip on one row with the selected tab inside its visible part and keyboard arrows still moving between tabs, every Overview panel's content inside its panel, the radar canvas inside its panel, the form bars not overlapping, the document not wider than the window, and the states at 320px. A screenshot of the hero and the Overview at 320px is looked at during step 1 and step 2. Nothing here proves how it looks in the user's browser; the final packet will say so.

Verify: no `Verify` command is declared in `AGENTS.md`, so none was run while writing this spec. The final gate is `cd frontend && npm run lint` plus root `npm run build`, with the Playwright files in step 4.

## Notes for the AI

- Follow the user's rules: scope changes to the page being built, shared components only get opt-in props, and the TV code is the short label wherever a full name does not fit (memory notes on page scope and TV codes).
- The hero arrangement below `sm` is my proposal, in the spirit of the 31i result (the number leaves the name's row so the surname gets the width). If a screenshot looks cramped, tell the user and offer `/prototype` for the hero before building the final arrangement; the user chose the Players card layout from a mockup, and the hero is the most visible part of this page.
- Match the surrounding code style and comment density; no Co-Authored-By or AI attribution in the commit message (AGENTS.md).

## Built as

- Measured at 320px with a mocked long surname (screenshots): the surname broke into pieces ("LAREN / TZAKI / S-"), the first name was cut, the number sat beside the name, the tab strip wrapped onto three rows, and the page was 346px wide. The radar's six labels, the season-line cards, the ten-bar form chart, the shooting rows and the points mix already fitted, so those panels (scope items 4 to 7) needed no change of their own.
- The sideways scroll came from the Overview grids: a one-column `grid` sized its track to the radar canvas. The two `lg:grid-cols-2` grids are now `grid-cols-1 lg:grid-cols-2`.
- Hero: a grid whose phone layout is one centred column. Below `sm` the portrait (144px, 4:5, rounded), the eyebrow, the name (surname `text-3xl` with whole-word wrapping), the number, the club chips, the facts (three per row, the last row centred) and a full-width Compare button are all centred. The first version put a 96px portrait beside the name, left-aligned; the user asked for a centred header after seeing it. From `sm` the portrait is the left side of the whole panel (176px) as before. Club chips use `ShortLabel` with `team.tvCode`, then the abbreviated name, then the club code, then the name; the fallback club taken from the player now carries `clubTvCode`. The tab strip is `scrolling`.
- The hero arrangement was confirmed from screenshots at 320, 390 and 768px; no mockup was needed. The centred phone version was checked at 320 and 390px with a short and a very long surname.
- The spec waits briefly for the radar when checking panel content, because the chart redraws a moment after the window changes size.
- Added "Player page" to the overflow spec's pages and dropped the sentence about the player page from its comment.
- Checks run: `player-overview-layout.spec.js` (5 passed), then with `responsive.spec.js`, `detail-back-links.spec.js`, `smoke.spec.js` and `players-layout.spec.js` (128 passed in all), `cd frontend && npm run lint`, root `npm run build`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":15113,"specSha256":"a5d4d36e3427192ca5c2a3709b0b74c8a2952a9b0f8c7c7ac1ff7cfb3ad32002","branch":"refs/heads/feature/player-page-header-tabs-and-overview-mobile-layout","head":"74509af09c32b73d95535a06a30a54b5bc81a3f1","baseRef":"refs/heads/master","baseCommit":"74509af09c32b73d95535a06a30a54b5bc81a3f1","sourceTree":"b319621c83c880df9c18f1f76f48e3871d7fb84f","absentOptional":[]} -->
