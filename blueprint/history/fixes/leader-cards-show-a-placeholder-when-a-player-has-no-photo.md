# Fix: Leader cards show a placeholder when a player has no photo

**Type:** Fix
**Status:** verified
**Branch:** fix/leader-cards-show-a-placeholder-when-a-player-has-no-photo

## The problem

The leaders cards on Home (`frontend/src/dashboard/LeadersPanel.jsx`, `StatLeaderCard`) and on the Overview page (`frontend/src/season/SeasonOverviewPage.jsx`, `LeaderCard`) draw the leader's photo in the card's right-hand `.kpi-chip-image` box only when the feed has a photo URL, and draw nothing otherwise. Older seasons have no photos, so most of those cards show a large empty gap next to the name (seen on Home for 2004-05). A photo that fails to load hides itself and leaves the same gap.

## The fix

The change is already made and uncommitted on the branch; `/implement` verifies it and finishes the checks:

- New `frontend/src/lib/LeaderPhoto.jsx`: the photo (`RevealImage`, wipe effect, `kpi-chip-image`) when there is a URL that has not failed, otherwise a head-and-shoulders silhouette SVG in the same `.kpi-chip-image` box (`aria-hidden`, `data-testid="leader-photo-placeholder"`, low opacity so it works in both themes). It follows the same silhouette `PlayerPortrait` already uses for a missing portrait.
- `LeadersPanel.jsx` and `SeasonOverviewPage.jsx` render `<LeaderPhoto imageUrl={leader.playerImageUrl} />` in place of the conditional image, and drop their now-unused `RevealImage` import.

Unchanged: the card layout and sizes (the silhouette takes the existing `.kpi-chip-image` rules), the photo when there is one, the team leaders cards on the Team page, and the Leaders page rows.

## Build steps

- [x] 1. **Check the change and cover it.** Confirm the 2004 test in `frontend/e2e/home-layout.spec.js` (Home: four leaders cards, each with a photo or the silhouette, at least one silhouette visible) and in `frontend/e2e/overview-layout.spec.js` (Overview: six cards) fail without the change and pass with it. Done when both pass on the local database (`/api/health` says `local`) together with the rest of those two spec files, and `cd frontend && npm run lint` and `npm run build` pass.

## Verify

`cd frontend && npx playwright test home-layout.spec.js overview-layout.spec.js` on the local DB only. Manually: open Home and Overview for 2004-05 and see a grey silhouette beside each leader without a photo; a season with photos (2025-26) looks as before.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2379,"specSha256":"f693429f859b7fcc9eae2866809aad221bd374fc2ac9dc328157af75b49dc346","branch":"refs/heads/fix/leader-cards-show-a-placeholder-when-a-player-has-no-photo","head":"2efebac68ec310192d228cf5d2ab220b663b5318","baseRef":"refs/heads/master","baseCommit":"2efebac68ec310192d228cf5d2ab220b663b5318","sourceTree":"86705765d3715cd97b21e2c8284953dfe09d57b2","absentOptional":[]} -->

## Completion evidence

- Screenshots read at the time of the change: Home for 2004-05 at 1280px and 390px, where the leaders cards without a photo now show a grey silhouette in the photo box and the card with a photo (Parker Anthony) keeps it.
- Local database (`/api/health` said `local`): `home-layout.spec.js` and `overview-layout.spec.js` passed (60 tests including the two new 2004 tests). With the source changes stashed and `LeaderPhoto.jsx` moved aside, both new tests failed on the card count, so they cover the defect.
- `cd frontend && npm run lint` and `npm run build` pass. No `Verify` command is declared in `AGENTS.md`. The Team page leader cards, which share the `.kpi-chip-image` box, were left unchanged.
- Findings F-02 and F-03 (both P3, open) were carried in the ledger from earlier work and stay there. No independent review was requested. The product edit was made on the branch before the fix spec was written, at the user's request; the spec was written to match it and the tests were run afterwards.
