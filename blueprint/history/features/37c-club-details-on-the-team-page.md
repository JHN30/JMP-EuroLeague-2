# Feature: Club details on the team page

**From build-plan:** feature 37c
**Build attempt:** 1
**Status:** verified
**Branch:** feature/club-details-on-the-team-page

## Goal

The team page header says where the club plays and how long it has been in the EuroLeague. It shows the city, the home
arena that season, the club's website, and its EuroLeague history (seasons played and first season). The details come from
`app_clubs` and `app_club_identities`, through an additive field on the team API. A field the feed leaves empty is left out.

## In scope

- **Backend:**
  - `city` and `website` added to the `clubs` Drizzle table, read only.
  - A new read-only `clubIdentities` table for `app_club_identities`.
- **Backend:** an additive `club` field on `GET /api/seasons/:seasonCode/teams/:clubCode`, next to `team`.
- **Frontend:** in `TeamPage.jsx`'s `PageHeader` description, a second muted line under the existing "PAN · GRE" line, on
  every tab:
  - **City:** "Athens". A city in capitals ("ATHENS") reads in title case with the existing `titleCase`, and a mixed-case
    one is left as it is.
  - **Home arena:** the arena of the club's home games that season, in title case the same way.
  - **Website:** a link showing the host without `www.` ("paobc.gr"). It opens in a new tab with
    `rel="noopener noreferrer"`, and it is shown only for an `http` or `https` address.
  - **History:** "26 EuroLeague seasons since 2001-02", "1 EuroLeague season (2025-26)" for a newcomer. It uses the
    existing `formatSeasonLabel`.
  - The items are separated by " · " and wrap on narrow screens. With none of them there is no second line.
- Browser specs for the reply, the header, missing fields, and phone width.

## Out of scope

- The club's president, address, phone, Twitter account, tickets link and sponsor. The feed copies today's values into every
  past season (for example, Crvena Zvezda's current president appears in 2015-16), so they would be wrong on history pages.
- Arena capacity, a map, or the venue's address.
- The Teams list page, the Compare page and the game page.
- The records review (37d).
- Any warehouse or database change.

## Build loop

`workflow.stepReview` is `feature`: build the steps in order and present one review packet at the end. Checkpoint commits are
disabled. `/complete` makes the feature commit.

## Build steps

- [x] 1. **Backend reads the club details.**
  - In `backend/src/db/season-schema.ts`:
    - add nullable `city` and `website` to `clubs`;
    - add the `clubIdentities` table (`app_club_identities`) with `competitionCode`, `clubCode`, `firstSeasonCode`,
      `lastSeasonCode` and `seasonsPlayed`, and a primary key on competition and club.
  - In `backend/src/db/season-identities.ts`, add `export type ClubDetails` and `getClubDetails(seasonCode, clubCode)`
    with the contract below, read through `catalogRead`. It makes three small reads:
    - the season's `app_clubs` row;
    - the identity row;
    - the season's most frequent `venue_name` among `app_games` rows where `local_club_code` is the club, ties broken by
      name, in all phases including unplayed games.
  - In the team route in `backend/src/routes/seasons.ts`:
    - read `getTeamRef` and `getClubDetails` in parallel and reply `{ team, club }`;
    - leave the 400 and 404 replies unchanged;
    - change no other route.
  - **Done when:** `cd backend && npm run build` passes, and the API spec in step 3 shows Panathinaikos's details for
    `/api/seasons/2025/teams/PAN`.
- [x] 2. **The header shows the details.**
  - `TeamPage.jsx` reads `teamQuery.data?.club`.
  - A small `ClubFacts` component in `TeamPage.jsx` builds the second line, with each item omitted when its value is
    empty.
  - **Done when:**
    - `/2025/teams/PAN` shows "Athens · Telekom Center Athens · paobc.gr · 26 EuroLeague seasons since 2001-02" under
      "PAN · GRE" on every tab, and the website opens paobc.gr in a new tab.
    - `cd frontend && npm run lint && npm run build` passes.
- [x] 3. **Specs.** A new `frontend/e2e/team-club-details.spec.js`:
  - **API:** the real `PAN` reply in 2025 has
    `club: { city: "ATHENS", website: "http://www.paobc.gr", arena: "TELEKOM CENTER ATHENS", firstSeasonCode: "E2001", lastSeasonCode: "E2026", seasonsPlayed: 26 }`.
  - **API:** a newcomer (`DUB` in 2025) reports 2 seasons from E2025.
  - **Header:** the real page shows the line, and keeps it on another tab.
  - **Mocked:** a club with every field null shows no second line. A website with a non-http address is not a link.
  - **Layout:** at 320px the line wraps inside the header with no page overflow.
  - **Done when:** `cd frontend && npx playwright test team-club-details.spec.js team-overview-layout.spec.js responsive.spec.js`
    passes against a backend whose `/api/health` reports `"target":"local"`.

## Files / areas

- `backend/src/db/season-schema.ts` (`clubs`, new `clubIdentities`)
- `backend/src/db/season-identities.ts` (`ClubDetails`, `getClubDetails`)
- `backend/src/routes/seasons.ts` (the team route)
- `frontend/src/teams/TeamPage.jsx` (`ClubFacts`, the header)
- Reused as they are: `frontend/src/lib/playerName.js` (`titleCase`) and `frontend/src/lib/format.js` (`formatSeasonLabel`)
- `frontend/e2e/team-club-details.spec.js` (new)

## Data / contracts

`GET /api/seasons/:seasonCode/teams/:clubCode` adds one field. `team` is unchanged, and so are the error replies.

```ts
club: {
  city: string | null;            // app_clubs.city for that season; "" becomes null
  website: string | null;         // app_clubs.website for that season, as the feed writes it; "" becomes null
  arena: string | null;           // most frequent venue_name of the club's home games that season; null without any
  firstSeasonCode: string | null; // app_club_identities.first_season_code
  lastSeasonCode: string | null;  // app_club_identities.last_season_code
  seasonsPlayed: number | null;   // app_club_identities.seasons_played
}
```

The reply has the object even when every value is null. The frontend leaves out each empty part.

What the local data holds (`gold`, checked while writing this spec):

| Field | Coverage |
|---|---|
| City | 587 of 588 club seasons. Casing varies: "Madrid" next to "ATHENS" and "BELGRADE". |
| Website | 578 of 588 club seasons. The missing ones are before 2005 (19 of 24 in E2000). Every address starts with `http://` or `https://`. |
| Arena | Every season has home games, scheduled ones included. A club can split its home games between arenas, for example Milan with Allianz Cloud 10 and Unipol Forum 9 in the E2025 regular season; the most frequent one is shown. `app_clubs.venue_code` does not match the games' venue codes for some clubs (ASVEL, Dubai, Anadolu Efes in E2025), so the arena comes from the games. |
| History | 89 clubs, and `seasons_played` matches the seasons each club has in `app_clubs`. The data starts with 2000-01, the first season of the modern EuroLeague, and counts the season in progress (E2026). |

The details are feed text rendered as React text nodes. The website is a link only after an `http:` or `https:` check, so a
`javascript:` address can never become a link.

## Testing

- No unit test command is configured. Checks are the backend `tsc` build, frontend lint and build, and the Playwright
  specs named in step 3.
- Browser specs run only after `/api/health` reports `"target":"local"`. Playwright starts the dev servers itself.

## Notes for the AI

- Mirror 37b's `getGameVenue`: small reads through `catalogRead`, with empty strings normalized to `null`.
- The history line is a whole-club fact (all seasons in the data), not a season one. It is the same on every season's page
  for that club.
- Use `max-sm` and `sm:` Tailwind variants as the header already does. Wrap long arena names with `wrap-break-word`.
- Line endings: keep each file's own. Use the Edit tool.
- No em dashes in any text this feature adds.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7949,"specSha256":"02de4b7005dfb677bbbea96c8e1dd25f8d4b9d1d7b591bd3574dc475e8eafdb2","branch":"refs/heads/feature/club-details-on-the-team-page","head":"3915ef5d4bd4be438d7affbd722e99cd2ac88773","baseRef":"refs/heads/master","baseCommit":"3915ef5d4bd4be438d7affbd722e99cd2ac88773","sourceTree":"03d81d581a4a7685e29b8b8d81887518303f5655","absentOptional":[]} -->
