# Fix: Compare main page suggestions and form

**Type:** Fix
**Status:** verified
**Branch:** fix/compare-main-page-suggestions-and-form

## The problem

The Compare page (`/:season/compare`) before any pair is chosen:

- **Players tab** (`?view=players`): only the Player A and Player B search boxes, on an otherwise empty page (900px at
  1440×900, nearly all blank). Someone who does not have two names in mind gets no starting point.
- **Teams tab:** each upcoming game card (`comparisons/CompareFixtures.jsx`) shows the two clubs with their
  regular-season record (6-3) but nothing on current form, although the standings it already loads carry each club's
  last results (`form`).

## The fix

These are frontend changes only. They use data the site already serves: `getLeaderStats` for the season's players, and
the RS standings and round games that `CompareFixtures` already loads. There are no API or address changes.

1. **Players tab: suggested pairs.**
   - Under the search boxes, while no pair is chosen, a panel "Suggested pairs" shows one-click pairs from this
     season's leaders, each the top 2 per game:
     - Points
     - PIR
     - Rebounds
     - Assists
   - A pair shows the stat, both players (picture, name, club TV code) and their values, for example
     "Points per game · Nunn 22.1 vs Howard 20.3". It is a link to `?view=players&playerA=<key>&playerB=<key>`, the same
     address the pickers write, so it opens that comparison and Back returns.
   - Players are ranked from the same pool as the Leaders cards: the whole season, per game, players with half of the
     games played so far (`gamesNeeded` / `DEFAULT_SHARE` in `leaders/leaderDefs.js`).
   - Two cards per row from `sm`, four from `xl`.
2. **Players tab: this round's star matchups.**
   - Under the suggested pairs, a panel "Star matchups · Round N" lists each upcoming game of the round that the Teams
     tab shows. Each row has both clubs (crest, TV code) and each side's best player by PIR per game, from the same pool
     as item 1.
   - Each row links to that player comparison.
   - A club without a qualified player leaves its game out. With no upcoming round (season over), the panel is not
     shown.
   - Two columns from `lg`, like the Teams tab's game cards.
3. **Teams tab: form on the game cards.**
   - Each club on an upcoming game card shows its last five results (oldest first) as the small W/L badges the standings
     use (`FormCell` from `standings/standingsCells.jsx`), on the record's line ("6-3 · W L W W L") so the card keeps its
     height.
   - `FormCell` is unchanged, and its accessible label ("Last 5: win, loss, …") comes with it.
   - Below `sm` the form may sit under the record if the row has no room, with no sideways scroll at 320px.
   - Only when the round is in the regular season, as the records are.
4. **States.**
   - Panels 1 and 2 show skeletons while the players load, and one error with Retry if they fail (the search boxes
     keep working).
   - Both panels are hidden once two players are chosen, so the comparison opens as now.
   - Panel 2 stays hidden while the round's games load or when there are none.

The following must not break:
- the pickers, the swap button, the chosen comparison and its sections;
- the Teams tab's game links and any-two-teams picker;
- both themes, keyboard focus on every link, and no sideways scroll at 320px.

## Build steps

1. [x] **Teams tab form** (item 3).
   - Done when each club on an upcoming card shows its last five results beside the record, and the card height is
     unchanged at 1440.
2. [x] **Players tab panels** (items 1, 2, 4).
   - Done when `/2026/compare?view=players` shows four suggested pairs and the round's star matchups.
   - Done when choosing one opens that comparison with both players filled in, and Back returns to the panels.
3. [x] **Browser specs.** Extend `e2e/compare.spec.js` and `e2e/compare-layout.spec.js`:
   - suggested pairs, each linking to its comparison address;
   - star matchups for the round, with one row per game whose clubs both have a player;
   - the form badges on the cards;
   - panels hidden once a pair is chosen;
   - layout at 1440, 1024, 640 and 320.
   - Done when both specs pass on the local DB.

## Verify

- On the local DB (`/api/health` reports `"target":"local"`):
  `cd frontend && npx playwright test compare.spec.js compare-layout.spec.js responsive.spec.js -g "Compare"`.
- By hand at 1440, 1024, 640 and 320 px wide, in both themes:
  - the Teams tab cards with form;
  - the Players tab panels;
  - open a suggested pair and a star matchup, then Back;
  - a past season (2024-25) with no upcoming round: suggested pairs only.
- `cd frontend && npm run lint` and `npm run build` pass.

## Outcome

- **Players tab:**
  - At 1440×900 the page is 1,089px with Suggested pairs (four cards, two per row from 640px, four from 1280px) and
    Star matchups (Round 10, ten games, two columns from 1024px). It was 900px of mostly empty space.
  - At 390 it is 1,918px.
- **Changed while building:**
  - **Pairs and matchups are buttons, not links.** The Compare page keeps the chosen pair in its state and rewrites the
    address with `replace`, as a picked game does. So a pick opens the comparison through `handlePickPlayers`, with
    the same address (`?view=players&playerA=…&playerB=…`), and the comparison's "← Players" back link returns to the
    suggestions. Browser Back does not.
  - **The ranking pool is the regular season per game** (phase `RS`, as the player picker's top scorers), from half of
    the most games any player has so far.
  - **The form is hidden below 640px rather than wrapped under the record.** A club's column there is about 50px,
    and five badges need about 78px even at the compact size. From 640px the badges use the Games page cards'
    compact size (`.fixture-form` rule extended to `.compact-form` in `index.css`).
  - **Game cards fill their grid row (`h-full`)**, so a card whose form wraps at 1024px does not leave its neighbour
    shorter.
- **New and shared code:**
  - `comparisons/useUpcomingRound.js` holds the round queries that `CompareFixtures` and the new
    `comparisons/CompareSuggestions.jsx` share (same query keys, so the round is read once).
  - `FormCell` is unchanged.
- **Checks:**
  - `npx playwright test compare.spec.js compare-layout.spec.js` (12 passed, three of them new);
  - `npx playwright test responsive.spec.js -g Compare` (19 passed);
  - `npm run lint` and `npm run build`.

### Review change: order on the Players tab

- **New order (the user's):** Star matchups, then Suggested pairs, then the pickers.
- **Pickers in their own panel:** "ANY TWO PLAYERS · Compare any two players", as the Teams tab's "Compare any two
  teams" sits under its games.
- **Height:** 1,183px at 1440.
- **Test fix:** `compare.spec.js` "a player comparison has no club header" now matches the page title exactly, since
  the new heading also contains "Compare".
- **Checks:**
  - `npx playwright test compare.spec.js compare-layout.spec.js` (12 passed);
  - `npx playwright test responsive.spec.js -g Compare` (19 passed);
  - `npm run lint` and `npm run build`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7318,"specSha256":"7a20de1b7e4fa2d692cd845ec61c4824f9dd539187dc28f1fcb36d4868ef8b9c","branch":"refs/heads/fix/compare-main-page-suggestions-and-form","head":"8c4e4deb9db099aea1fcf4e6d8eb1a403cd71156","baseRef":"refs/heads/master","baseCommit":"8c4e4deb9db099aea1fcf4e6d8eb1a403cd71156","sourceTree":"2341bb9d6f18b74e242870614bac27bca037783b","absentOptional":[]} -->
