# Fix: Standings knockout message names the Postseason page

**Type:** Fix
**Status:** verified
**Branch:** fix/standings-knockout-message-postseason-page

## The problem

On Standings, a knockout phase (Play-in, Playoffs, Final Four; for example E2001 Final Four) shows "This phase is a knockout, so it has no league table. The matchups and results are on the Format page, and every game is under Games." The page is now called Postseason (nav item and `/:season/postseason` route), but the sentence and its link still say "Format page" and point to `/:season/playoffs`, which only works because [App.jsx:81](frontend/src/App.jsx#L81) redirects it. It is one shared message in [StandingsPage.jsx:186-192](frontend/src/standings/StandingsPage.jsx#L186-L192), so every season is affected. No other "Format page" wording exists in the frontend, and no e2e spec asserts the old text.

## The fix

Change the link to `/${seasonCode}/postseason` and its text to "Postseason page". Leave the `/playoffs` redirect in place for old links.

## Build steps

- [x] **1. Update the message.** Edit the link target and text in `StandingsPage.jsx`. Done when `npm --prefix frontend run lint` and `npm run build` pass, and on `/2001/standings?phase=FF` the sentence reads "...are on the Postseason page, and every game is under Games." with the link going straight to `/2001/postseason`.

## Verify

Open the Final Four tab of Standings in any season (for example `/2001/standings?phase=FF`) and click the link: it lands on that season's Postseason page. The screenshot shows no "Format page" text.

## Results

Verified on 2026-10-14 against the local database (`/api/health` reported `target: local`).

- `StandingsPage.jsx`: the knockout-phase message now links to `/:season/postseason` with the text "Postseason page"; the `/playoffs` redirect stays for old links.
- Checks run: `npm run build` and `npm --prefix frontend run lint` passed; a browser check on `/2001/standings?phase=FF` read the new sentence, found the link at `/2001/postseason` and followed it.
- Not run: Playwright specs (none cover this text).
