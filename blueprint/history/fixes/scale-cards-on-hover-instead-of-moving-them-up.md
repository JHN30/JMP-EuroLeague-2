# Fix: Scale cards on hover instead of moving them up

**Type:** Fix
**Status:** verified
**Branch:** fix/scale-cards-on-hover-instead-of-moving-them-up

## The problem

Clickable cards move up a little on hover. Both presets live in `frontend/src/lib/motion.js`:

| Preset | Hover now | Press | Used by |
|---|---|---|---|
| `cardHover` | up 3 px | 97% | KPI chips and tiles: Home (Hot right now, Recent results), Season overview, Teams, Players, team page, team roster |
| `wideCardHover` | up 2 px | 98.5% | wide cards: Games (`GameCard`), team Games tab, Compare fixtures and suggestions |

The user prefers a card that grows slightly on hover over one that slides up.

## The fix

Change the two presets' hover from a lift to a scale. Every card picks the change up from the presets.

- `cardHover`: `whileHover: { scale: 1.03 }`, the 3% the user asked for. On a small tile that is only a few pixels.
- `wideCardHover`: `whileHover: { scale: 1.015 }`. 3% of a 600 px Games card would be 18 px wider and could reach into
  the gap or a neighbour, so wide cards grow by half as much.
- Keep the press (97% / 98.5%), the spring transition, and the hover border colour as they are.

Must not break:

- **Clipping and overlap.** Neither must happen at 320 px or on desktop:
  - a hovered card clipped by its container, for example a scrolling row or a panel with `overflow: hidden`;
  - a hovered card covering a neighbouring card.

  If a container clips, make the smallest local change for that container (for example a little padding), not a
  global one.
- **Reduced motion.** `MotionConfig reducedMotion="user"` (`App.jsx`) still turns the transform off for people who ask
  for reduced motion.
- Non-card hovers are not in scope: the Standings snapshot row's sideways nudge, and the player portrait zoom inside its
  card.

## Build steps

- [x] 1. Change the two presets in `lib/motion.js` and update their comments. Check with a scratch Playwright script, not
   committed. It hovers the first card of each kind, at 320 px and 1280 px, on Home, Season overview, Teams, Players,
   a team page (Overview, Roster and Games tabs), Games, and Compare. For each hovered card it checks that:
   - the card's scaled box stays inside its nearest clipping container;
   - the card does not cross into a neighbouring card's box.

   Take screenshots of a hovered KPI chip and a hovered Games card for review.
   **Done when:** the check passes on every page (or the one local container fix it needs is in), and `npm run lint`
   passes.

## Verify

- `cd frontend && npm run lint`.
- With `/api/health` reporting `"target":"local"`, run the specs of the pages these cards are on:
  `npx playwright test home-layout.spec.js overview-layout.spec.js teams-layout.spec.js players-layout.spec.js team-overview-layout.spec.js team-shooting-games-layout.spec.js games-layout.spec.js compare-layout.spec.js responsive.spec.js`
  (`lib/motion.js` is shared by many pages).
- Manually, hover a KPI chip on Home and a card on the Games page: each grows slightly instead of moving up, and pressing
  it still shrinks it.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3107,"specSha256":"726a140528ab1941987f261509254716d3d50d5fa2c58213402aa79f9f8b664f","branch":"refs/heads/fix/scale-cards-on-hover-instead-of-moving-them-up","head":"6f73e3b219d33925b7f8a8acfb0e22992b8110f9","baseRef":"refs/heads/master","baseCommit":"6f73e3b219d33925b7f8a8acfb0e22992b8110f9","sourceTree":"06716261ed9ae4cd3cefa5e9634d018eed57c30f","absentOptional":[]} -->
