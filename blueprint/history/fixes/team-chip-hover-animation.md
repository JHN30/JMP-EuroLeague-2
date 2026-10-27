# Fix: Team chip hover animation

**Type:** Fix
**Status:** verified
**Branch:** fix/team-chip-hover-animation

## The problem

Fix `team-and-player-links` made the team summary chips links (Home KPI strip, Standings KPI strip, Season overview
hero), but as plain `Link`s. The player-leader chips beside them are `motion` links with the shared `cardHover`
(`frontend/src/lib/motion.js`: lift 3px on hover, scale 0.97 on press), so the team chips feel dead next to them.

## The fix

- `frontend/src/lib/CompactMetric.jsx`: with `to`, render `motion.create(Link)` with `{...cardHover}`; without `to`
  nothing changes (no motion on plain chips).
- `frontend/src/season/SeasonOverviewPage.jsx` `SeasonHero`: the two linked chips use the same motion link and
  `cardHover`.
- No entrance animation is added: the team chips had none before, and their strips are not motion containers.

## Build steps

- [x] **1. Hover and press on linked team chips.** As above.
  **Done when:** lint and root build pass; hovering a linked team chip on Home, Standings and the Season overview
  lifts it like a player chip (checked in the browser via the computed transform on hover); `home-layout.spec.js`,
  `overview-layout.spec.js` and `standings-table-layout.spec.js` pass.

**Result:** lint and root build pass. In the browser at 1400px, hovering the first linked chip gives
`matrix(1, 0, 0, 1, 0, -3)` for the Home team chip, a Home player chip, the Standings team chip and the Season overview
hero chip alike. `home-layout`, `overview-layout` and `standings-table-layout` specs: 71 passed.

## Verify

- Hover a team chip on Home, Standings and the Season overview: it lifts like the player chips next to it.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":1697,"specSha256":"eaff6e62f3bc450c46afc7523c20cf18ef7586ed9d507401e0a9f04c4b18656c","branch":"refs/heads/fix/team-chip-hover-animation","head":"fadbb83cbdbc30a98516ce9066a01ec39b299cb5","baseRef":"refs/heads/master","baseCommit":"fadbb83cbdbc30a98516ce9066a01ec39b299cb5","sourceTree":"551a5ee3870cda8c867329bec33afa427527c19f","absentOptional":[]} -->
