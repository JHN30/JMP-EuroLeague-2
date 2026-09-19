# Fix: Fixtures pagination and roster player links

**Type:** Fix
**Status:** verified
**Branch:** fix/fixtures-pagination-and-roster-player-links

## The problem

Two small, unrelated pre-existing bugs surfaced during the recent visual
restyle work (feature 12b/12c), both confirmed live:

1. **Fixtures pagination is broken.** `getSeasonGames` in
   `frontend/src/lib/api.js:8-13` destructures
   `{ limit, status, order, phase, round }` from its options object but never
   includes `offset`, so the value is silently dropped before the request is
   sent. `FixturesPage.jsx`'s "Previous page"/"Next page" buttons update
   local `offset` state correctly, but every request still fetches page 0 -
   no new network request with a different `offset` is ever issued.
2. **Roster rows don't link to player pages.** `TeamPage.jsx`'s
   `RosterSection` (around line 152-159) renders each registration's player
   name as plain text (`<td className="font-medium">{entry.player?.name ?? "TBD"}</td>`)
   with no link, even though the roster response already includes
   `entry.player.personKey` (confirmed in `backend/src/db/season-identities.ts`'s
   `playerFields`) and `PlayerPage.jsx` is already reachable at
   `/${seasonCode}/players/${personKey}`. Every other list in the app that
   names a player (leaders panel, statistics leaderboards, game box scores,
   game logs) already links to the player page; the roster is the one
   remaining plain-text exception.

## The fix

1. Add `offset` to `getSeasonGames`'s destructured options and its `params`
   object in `frontend/src/lib/api.js`, matching the pattern already used by
   `getSeasonPlayers` (which does pass `offset` correctly). This is the
   root-cause repair - the value already flows correctly from
   `FixturesPage.jsx` through the option object; only the client function
   was dropping it.
2. Link each roster row's player name to the player detail page in
   `TeamPage.jsx`'s `RosterSection`, using the existing `link link-hover`
   style already used for player names elsewhere in the app (e.g.
   `PlayersPage.jsx`, `LeadersPanel.jsx`). Guard for `entry.player` being
   `null` (already handled today via `?? "TBD"`): render a link only when
   `entry.player` exists, plain "TBD" text otherwise - do not link to a
   nonexistent player.

Nothing else changes: no new dependency, no new query key shape beyond the
already-existing `offset` in `FixturesPage.jsx`'s query key, no change to
`RosterSection`'s data fetching or loading/error/empty states.

## Build steps

- [x] 1. Add `offset` to `getSeasonGames`'s destructured params and request
  `params` in `frontend/src/lib/api.js`. Done when: on `/E2025/games` with
  no round filter selected, clicking "Next page" issues a new
  `GET /seasons/E2025/games?...&offset=20...` request and the list changes
  to the next page's games; clicking "Previous page" returns to the prior
  page.
- [x] 2. Wrap the player name in `TeamPage.jsx`'s `RosterSection` in a
  `Link` to `/${seasonCode}/players/${entry.player.personKey}` when
  `entry.player` exists, keeping the existing `link link-hover` style and
  the "TBD" fallback otherwise. Done when: on a team detail page, clicking
  a roster row's player name navigates to that player's detail page, and a
  row with no matched player (if any) still shows plain "TBD" text with no
  broken link.

## Verify

With both dev servers running:
- `/E2025/games` (no round filter): click "Next page" and confirm the game
  list changes and the URL/network request includes `offset=20`; click
  "Previous page" and confirm it returns to the original list.
- `/E2025/teams/<any club with a roster>`: click a roster row's player name
  and confirm it navigates to `/E2025/players/<personKey>` and shows that
  player's page.
- `cd frontend && npm run build`, `npm run lint`, and
  `npm run test:browser` (existing smoke test) all pass.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3892,"specSha256":"d5fef494053255b57ee535976d135ecdb1ac649278793899751ed9f5ba2456c9","branch":"refs/heads/fix/fixtures-pagination-and-roster-player-links","head":"7e42d5999c7f2e03ad3b6f8b69890a911d99b6c8","baseRef":"refs/heads/master","baseCommit":"7e42d5999c7f2e03ad3b6f8b69890a911d99b6c8","sourceTree":"98a61058fd94bc891c7cdabb99dcae01035d8503","absentOptional":[]} -->
