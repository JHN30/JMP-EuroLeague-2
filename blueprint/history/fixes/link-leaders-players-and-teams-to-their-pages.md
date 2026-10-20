# Fix: Link Leaders players and teams to their pages

**Type:** Fix
**Status:** verified
**Branch:** fix/link-leaders-players-and-teams

## The problem

On the Leaders page, the players and teams are plain text in most places, so you
cannot click through to the player or team page. Only the full boards link already
(`BoardRow` takes a `to`, used by `PlayersLeaders`, `TeamsLeaders`, `AdvancedLeaders`).
These do not:

| Where | File | Shows |
| --- | --- | --- |
| Category cards (top five per stat) on the Players landing | `CategoryCard` in `frontend/src/leaders/LeaderParts.jsx`, fed by `PlayerCard` in `PlayersLeaders.jsx` | players |
| Category cards on the Teams landing | `CategoryCard`, fed by `TeamCard` in `TeamsLeaders.jsx` | teams |
| Category cards on the Advanced landing | `CategoryCard`, fed by `AdvancedCard` in `AdvancedLeaders.jsx` | players |
| "Hot right now" / "Strong finish" list | `FormSection` in `PlayersLeaders.jsx` | players |
| "Who has moved" list | `FormSection` in `PlayersLeaders.jsx` | players |

## The fix

- Card entries gain an optional `to`. `CategoryCard` renders the row's rank, avatar,
  name, team and value inside a `Link` when `to` is set (keep the share bar outside
  or inside as is; the whole row is the target, like `BoardRow`). No `to` keeps the
  current plain row.
- Callers pass the same routes the full boards use:
  - players: `/${seasonCode}/players/${personKey}` (`PlayerCard`, `AdvancedCard`)
  - teams: `/${seasonCode}/teams/${clubCode}` (`TeamCard`)
  - `PlayerCard`, `TeamCard` and `AdvancedCard` need `seasonCode` in scope (check
    whether each already receives it).
- In `FormSection`, wrap the two player lists' rows in a `Link` to the player page.
- Reuse the `board-row-link` hover/focus styling or the same pattern so linked rows
  look and focus like the full boards' rows. Links must be keyboard reachable and
  show a visible focus ring.
- Do not nest links: the team tag stays text inside a linked player row (the team
  is one click away on the player page). The "See the full leaderboard" button is
  unchanged.
- Must not break: the full boards' links, the card load/error/empty states, the
  rank-1 larger sizing, the share-bar animation, and the mobile layout.
- Only the Leaders page changes; `CategoryCard` is not used elsewhere (confirm with a
  grep before editing).

## Build steps

- [x] 1. **Link the landing cards.** Add the optional `to` to `CategoryCard` entries and
   pass it from `PlayerCard`, `TeamCard` and `AdvancedCard`.
   *Done when:* on each of the three landings, clicking a player or team in a card
   opens its page for the current season.
- [x] 2. **Link the form lists.** Wrap the "Hot right now" and "Who has moved" rows in
   links to the player page.
   *Done when:* clicking a name in either list opens that player's page, and the
   rows look the same as before apart from hover/focus feedback.

## Verify

- Run `cd frontend && npm run lint`.
- Run the Leaders specs, with `/api/health` reporting `"target":"local"` first:
  `cd frontend && npx playwright test leaders.spec.js leaders-layout.spec.js`
  (plus `responsive.spec.js` since the layout of the rows changes).
- By hand on the Leaders page, Players, Teams and Advanced tabs: click a card row,
  expect the player or team page; use Tab to reach a row and see the focus ring;
  check a phone width that long names still wrap and nothing overflows.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3417,"specSha256":"6af70eaaf6f74ffb7b59ad9f3be6184dda7f4efbabb0e708b4462911161a0316","branch":"refs/heads/fix/link-leaders-players-and-teams","head":"97c5997d7a59133c2c5df4d0665ed0692ca9b55f","baseRef":"refs/heads/master","baseCommit":"97c5997d7a59133c2c5df4d0665ed0692ca9b55f","sourceTree":"6f243ad496c5d7c0ab6543203bb420e68ea3a15a","absentOptional":[]} -->
