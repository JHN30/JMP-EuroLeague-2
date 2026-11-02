# Fix: Compact leaders page on desktop

**Type:** Fix
**Status:** verified
**Branch:** fix/compact-leaders-page-on-desktop

## The problem

On a desktop screen the Leaders page (`/:season/leaders`) uses far more height than its content needs. Measured at
1440×900 on the local DB for 2026-27:

| View | Page height | Main cost |
|---|---|---|
| Players cards | 7,049px | 28 cards, three per row, each 504px tall |
| Teams cards | 8,784px | 41 cards, each 480px |
| Advanced cards | 6,856px | 34 cards, each 504px |
| Full board (Points) | 2,156px | 58px rows, controls on three rows |

- **Every view:** the header card and the Players / Teams / Advanced tabs push content to ~310px; the toolbar (stage,
  Per game / Totals) is a row of its own below the tabs; family headings ("Scoring") are full headings with `gap-8`
  between sections.
- **Category cards:** every card repeats its family as a kicker ("SCORING" above "Points" inside the Scoring section);
  each of the five rows is ~67px (40-48px photo, name and team on two lines, a bar on its own line under the row); the
  "See the full leaderboard" button takes its own row at the foot; three cards per row at every desktop width.
- **Full board:** Statistic and Per game / Totals on one row, the "Per game · qualified players" line on another, Order
  and the filters on a third; rows are 58px.
- **Form (Players scope):** "Hot right now" and "who has moved" rows are as tall as the card rows, and each panel has a
  two-line heading plus a description sentence.

## The fix

Layout changes only, from `lg` (1024px) up unless noted. Below `lg` the layouts, order and phone behaviour stay as
they are. No data, query, URL or API changes; nothing is removed except the repeated family kicker on cards. The
components in `leaders/LeaderParts.jsx` that only Leaders uses (`CategoryCard`, `CardGrid`, `BoardRow`, `BoardHeader`,
`LeadersToolbar`) may change directly. `Avatar` and `RankBadge` are shared with Records and Compare: their defaults stay,
and Leaders passes sizes (or an opt-in prop) of its own. `PanelHeader` uses its existing `compact` prop.

1. **Header, tabs and toolbar (every view).**
   - ~~`PageHeader` gets `compact`~~ dropped after review: the header keeps the size it has on the other pages.
   - From `lg` the scope tabs and the view's toolbar (stage, Per game / Totals, and on a board the Statistic select)
     share one row: tabs on the left, controls on the right, wrapping when they do not fit. The tabs keep their role,
     label and behaviour, and do not fade in with the panel when the scope changes.
   - Family headings (`PanelHeader`) pass `compact`; sections go from `gap-8` to `lg:gap-5`, and heading-to-grid from
     `gap-4` to `lg:gap-3`.
2. **Category cards (Players, Teams, Advanced).**
   - No family kicker on a card (the section heading already names it). The card title stays an `h3` with its tip.
   - From `lg` rows are tighter, about 40px: a smaller photo or crest (32px, the #1 row 36px), the team tag beside the
     name on one line (truncating), a smaller value (#1 still in the primary colour and a step larger), and the share bar
     as a thin line under the name and team, not a separate block.
   - The card's open control moves to the card's header row as a small ghost button ("Full leaderboard →", so the visible
     label is inside its accessible name, which stays "See the full leaderboard"); below `lg` the foot button stays. The footnote stays, as one small muted line.
   - Card padding `p-4` becomes `lg:p-3`.
   - Club labels on cards (added after review): from `lg` a player's club is its TV code (Players, Advanced; the full
     name on hover and for screen readers), and a Teams card shows the club's abbreviated name (the full name on hover).
     Boards and form lists keep full names.
   - `CardGrid`: four columns from `2xl` (1536px); three at `xl`, two at `lg`, as today.
   - Target: a card about 280px tall at 1440px (was 480-504px).
3. **Full board (Players, Teams, Advanced).**
   - From `lg` the "Per game · qualified players" line, Order and the filters share one row under the toolbar row.
   - `.board-row` from `lg`: less vertical padding and a 32px photo, so a row is about 44px (was 58px); the value text a
     step smaller. Below `lg` the row is unchanged.
   - "Showing 1-25 of N players" stays (the tests read it).
4. **Form (Players scope).**
   - "Hot right now" and "who has moved" rows get the same tighter sizes from `lg`.
   - Each panel's description shortens to one line, e.g. "Last 5 games, against the season average." and "Places on
     the per-game board since the last round."

5. **Volume minimums by rounds played (added after review, Players scope).** Today a player needs an average per game
   *he* played (eFG% 4 field goal attempts a game), so a player who missed games is held to less. Instead:
   - In a stage with standings (the regular season), the minimum is a season total: the per-game number × the rounds
     played, which is the most games any club has played in that stage. Checked against the player's season totals
     (exact; the per-game numbers are rounded).
   - New per-game numbers: eFG%, TS% and FT rate 5 field goal attempts, 2P% 3 two-point attempts, 3P% 2 three-point
     attempts, FT% 4 free throw attempts; the ratios and REB% stay at 10 minutes.
   - The card footnote and the board line show the total, e.g. "Needs 45+ field goal attempts." (no per-game breakdown,
     as asked after review).
   - When a club has played fewer games than the rounds played (a postponed game), one note above the cards and the board
     names it, e.g. "Real Madrid has played 8 of 9 rounds (a postponed game); its players need the same totals."
   - Stages without standings (play-in, playoffs, Final Four, where clubs play different numbers of games by design) keep
     the average per game the player played, with the new per-game numbers.

6. **Games to qualify (added after review, Players scope).** In a stage with rounds, a player is ranked on the cards and
   on a board's default "Qualified" choice from half the rounds played in games, rounded up (5 after 9 rounds, 7 after 14),
   instead of the feed's minimum (half plus one: 20 after 38). The card pool asks the API with `minGames`; the board
   filters its list the same way, and its labels show that number. Stages without rounds keep the feed's minimum. Teams
   are unchanged.

Must not break: every link, the URL state (scope, phase, mode, metric, filters, offset), keyboard use of the tabs and
toggles, the loading skeletons (adjust `LeadersSkeleton` sizes to match the new cards so loading does not jump), dark
mode, and the phone layouts (`responsive.spec.js`).

## Build steps

- [x] 1. **Cards and landing layout.** Items 1 and 2 (header, tabs and toolbar row, compact headings, compact cards, 4-column
   grid, card skeleton). Done when the Players cards view at 1440×900 is under 4,500px tall, Teams under 5,500px,
   Advanced under 4,500px, and the 390px phone view looks unchanged.
- [x] 2. **Board and form.** Items 3 and 4. Done when a Points board row is ≤ 46px at 1440px, the board's controls take two
   rows, and the form panels use the tighter rows.
- [x] 3. **Volume minimums.** Item 5. Done when, in 2026-27 after 9 rounds, the eFG% card and board rank only players with
   45+ field goal attempts and say so, the playoffs of a past season still use the per-game average, and the Leaders specs
   pass.
- [x] 4. **Games to qualify.** Item 6. Done when the 2024-25 regular season cards and board rank players with 19+ games
   (the feed says 20) and the Leaders specs pass.

## Verify

- At 1440×900 open `/E2026/leaders`, `?scope=teams` and `?scope=advanced`: tabs and controls on one row, compact
  family headings, cards about 280px with a "Full board →" button in each header; measure page heights against step 1.
- Open a card's full board: two control rows, ~44px rows, Previous / Next page still work; "Categories" goes back.
- Resize to 390px wide: cards, board and form look as they did before.
- Dark mode on the cards and the board.
- Browser tests (local DB only): `cd frontend && npx playwright test leaders.spec.js leaders-layout.spec.js responsive.spec.js`.

## Implementation notes

- The scope tabs and the toolbar share a row through a slot: `LeadersPage` renders an empty node beside the tabs and
  `LeadersToolbar` portals into it (`leaders/toolbarSlot.js`), so the controls sit outside the fading panel.
- Volume rule: rounds are the latest standings round of the stage (`useVolumeRule` in `PlayersLeaders.jsx`); in the
  per-game view the season totals are read once besides the card pool, since per-game numbers are rounded. In 2026-27 the
  eFG% card dropped Damian Jones (37 attempts) and others under 45; the 2024-25 playoffs keep the per-game average.
  `leaders.spec.js` checks the 3P% card and board against 2 attempts × rounds from the season totals.
- Measured at 1440×900 after the fix: Players cards 4,253px (was 7,049), Teams 5,048px (was 8,784), Advanced 4,024px
  (was 6,856); cards 262-282px; Points board 1,720px (was 2,156) with 46px rows.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9282,"specSha256":"6ccca0267d829d7b0a25574538f2f2d938812ce9c443698618aaa892648cf2b3","branch":"refs/heads/fix/compact-leaders-page-on-desktop","head":"57656a66ba3a58a26bf500aa594f12588611650a","baseRef":"refs/heads/master","baseCommit":"57656a66ba3a58a26bf500aa594f12588611650a","sourceTree":"c59b2e676e23779b5fbb2e9ae96e3ab45fa98712","absentOptional":[]} -->
