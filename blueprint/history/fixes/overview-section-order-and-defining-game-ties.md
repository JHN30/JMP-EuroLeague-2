# Fix: Overview section order and defining-game ties

**Type:** Fix
**Status:** verified
**Branch:** fix/overview-section-order-and-defining-game-ties

## The problem

On the season Overview ([SeasonOverviewPage.jsx](../../frontend/src/season/SeasonOverviewPage.jsx)):

1. Section order is Hero, Phase story, Trend chart, Defining games, Leaders, Road to title. The user wants
   Leaders, then Defining games, then the Trend chart directly after the Phase story.
2. `pickDefiningGames` sorts each category by one value (margin, combined points) and takes the first
   entry, so a tie is settled by whatever order the games arrive in. "Closest game" ties most often
   because a one-point margin is common (e.g. Dubai-Real in the regular season and a Zvezda loss by one in
   round 2 both qualify). The card shows an arbitrary one with no hint that others share the value.

## The fix

- **Order:** Hero, Phase story, Leaders, Defining games, Trend chart, Road to title. Leaders is not gated
  behind the summary queries (it has its own loading/error state), so the gated block is split: Hero and
  Phase story stay gated, Leaders sits ungated after them, then Defining games and Trend chart are gated
  again. Road to title stays last.
- **Tie-break:** in each category, among games sharing the best value, pick the most recently played
  (latest `scheduledAt`). Applies to all four categories (closest, highest-scoring, lowest-scoring,
  biggest blowout).
- **Note:** when other games share that value, the card's detail line adds a small note, e.g.
  "Shared with 2 other games". Count is all other played games with the same value in that category
  (not only unchosen ones). No note when the pick is unique. Singular: "Shared with 1 other game".
- **Date only:** the defining-game card detail line shows the played date without the kick-off time.
- Must not break: the "each pick avoids games already chosen" behavior, forfeit exclusion, and the
  existing card layout.

## Build steps

- [x] 1. Reorder the sections in `SeasonOverviewPage`, and make `pickDefiningGames` tie-break by latest game and
   return a shared-count, shown in the card detail line.
   **Done when:** Overview shows Leaders, Defining games, Trend chart after the Phase story; a tied
   category shows its latest game with "Shared with N other game(s)"; a unique pick shows no note.

## Verify

Evidence: `npm run lint` (frontend) and `npm run build` (root) passed; browser check not run.

- Open a season Overview (local DB, `/api/health` target `local`): confirm the new section order, and
  that the Closest game card carries the shared note when ties exist and is the latest of them.
- Update the section-order assertions in `frontend/e2e/overview-layout.spec.js` if they check order, then
  run `npx playwright test overview-layout.spec.js responsive.spec.js` from `frontend`.
- `cd frontend && npm run lint`


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2891,"specSha256":"d18d9512ba4f1a9fa329d09434808e5825fd23ffed5136e7b8e190af7d3b485f","branch":"refs/heads/fix/overview-section-order-and-defining-game-ties","head":"b6294d41836545cbd58d4949dff324e79380977a","baseRef":"refs/heads/master","baseCommit":"b6294d41836545cbd58d4949dff324e79380977a","sourceTree":"1382d74d36d0a74846814e010227b84befe60da5","absentOptional":[]} -->
