# Fix: Explain the empty SRS card in grouped phases

**Type:** Fix
**Status:** verified
**Branch:** fix/explain-the-empty-srs-card-in-grouped-phases

## The problem

In grouped seasons (2012-2015, both the Regular Season and the Top 16), the clubs play in separate groups that never
meet. No chain of opponents links every club, so SRS can't be worked out. The warehouse handles this correctly:
- the advanced standings for those phases have `connected: false` and `srs: null` for every club;
- the whole-season scope is connected and has SRS for all 24 clubs.

The team Leaders page doesn't say why the rating is missing:

| Where | What it shows | File |
| --- | --- | --- |
| Landing | The "Simple rating (SRS)" card, added by `b00bc1b`, reads "No one yet." That suggests the numbers will come later. | `CategoryCard` in `frontend/src/leaders/LeaderParts.jsx`, through `TeamCard` in `frontend/src/leaders/TeamsLeaders.jsx` |
| Full SRS board (`?metric=srs`) | Every value is null, so it reads "No teams match.", as if a search had filtered everything out. | `TeamsBoard` in `frontend/src/leaders/TeamsLeaders.jsx` |

Both pages already show the general `UNADJUSTED_NOTE` ("…opponent-adjusted ratings (such as SRS) are unavailable…") at
the top, but the card itself doesn't explain.

`frontend/e2e/grouped-pages.spec.js`, "team Leaders and Compare say adjusted ratings are unavailable across groups",
fails for 2012-2015 because it expects no "Simple rating" text at all.

The user chose to explain why the card is empty rather than hide it.

## The fix

- **Landing card.**
  - `CategoryCard` gains an opt-in `emptyText` prop. The default stays "No one yet.", so the player and other cards don't
    change.
  - `TeamCard` passes the explanation for the SRS card when `source.unadjusted` is true: "Not available for this phase:
    the clubs played in separate groups that never met, so they can't be rated against one another."
- **Full SRS board.** When the stat is SRS and `source.unadjusted` is true, show the same explanation in place of
  "No teams match.".
- **Shared text.** Keep the explanation as one exported constant next to `UNADJUSTED_NOTE` in
  `frontend/src/leaders/teamData.js`.
- **Where the explanation shows.** Only for SRS in an unconnected phase.
  - Connected phases and seasons keep their SRS rankings.
  - Every other empty card keeps "No one yet."
  - A search that matches nothing keeps "No teams match."
- **Test.** In `grouped-pages.spec.js`, replace the `Simple rating` count-0 check with checks that:
  - the SRS card shows the explanation on the landing;
  - the explanation also shows on `?metric=srs`.

  The Compare part of the test is unchanged.

Must not break:
- the Leaders landing and boards in connected seasons (2016+, and the earlier single-table seasons);
- the player Leaders cards;
- the `UNADJUSTED_NOTE` lines.

No API or warehouse change.

## Build steps

- [x] 1. **Explain the empty SRS card and board in unconnected phases, and update the test.**

  **Done when:**
  - `/2013/leaders?scope=teams&phase=RS` shows the SRS card with the explanation instead of "No one yet.".
  - Opening its full leaderboard shows the explanation instead of "No teams match.".
  - `grouped-pages.spec.js` passes for 2012-2015 on the local target, and so do `leaders.spec.js`,
    `leaders-layout.spec.js` and `skeleton-loading.spec.js`.
  - Frontend lint and the root build pass.

## Verify

- Open `/2013/leaders?scope=teams&phase=RS`. The SRS card explains that the groups never met, and "See the full
  leaderboard" shows the same explanation.
- Open `/2026/leaders?scope=teams`. The SRS card still ranks clubs.
- Run the specs above with `/api/health` reporting `"target":"local"`.

## Result

- `teamData.js`: `SRS_UNAVAILABLE` (the explanation) and `isUnratedSrs(stat, source)` (SRS in a phase with `connected:
  false`).
- `LeaderParts.jsx`: `CategoryCard` gains an optional `emptyText` (default "No one yet.").
- `TeamsLeaders.jsx`: the SRS card passes the explanation, and the SRS board shows it in place of "No teams match.".
- `grouped-pages.spec.js`:
  - checks the SRS card and its full board show the explanation;
  - its note check now targets the note’s own words ("…and did not face"), since the new explanation also says "played
    in separate groups".
- Checks on the local target: `grouped-pages`, `leaders`, `leaders-layout` and `skeleton-loading` gave 123 passed and 1
  failed. The failure was a `leaders` `page.goto` timeout that passed when rerun alone.
- Frontend lint and the root build pass.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4564,"specSha256":"6d7251a86374facf3544f0e5772e0116d882fb927719ab69a9cb13b4e1ac3533","branch":"refs/heads/fix/explain-the-empty-srs-card-in-grouped-phases","head":"43f3ad9253550e6fd620f645ddabcb3b5078dcb1","baseRef":"refs/heads/master","baseCommit":"43f3ad9253550e6fd620f645ddabcb3b5078dcb1","sourceTree":"1348216119623f3829da044e1e67c4071f3e9b1a","absentOptional":[]} -->
