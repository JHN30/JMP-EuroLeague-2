# Fix: Players list with weight and age, club and position filters, tighter cards

**Type:** Fix
**Status:** verified
**Branch:** fix/players-list-with-weight-and-age-club-and-position-filters-tighter-cards

## The problem

The players page (`/:season/players`, `players/PlayersPage.jsx`) lists a season's players as cards: photo, first and
last name, jersey number, club, and a detail line "Forward · ESP · 202 cm". Three things are missing or loose:

- **No weight or age.** Both exist in the warehouse's cross-season player profiles (`app_players.weight_kg`,
  `app_players.birth_at`), which the app never reads.
- **Only a name search.** With 343 players a season, there is no way to see one club's players or the centres
  without knowing names.
- **Cards waste space.** They are tall, with a wide photo column and generous padding: 2 per row up to xl, 3 at xl,
  4 at 2xl. Page size 36.

## The fix

### Weight and age

- **Backend (`backend/src/db/season-schema.ts`, `season-identities.ts`):** map `app_players` (read-only:
  `competition_code`, `person_code`, `weight_kg`, `birth_at`) and `app_people.person_code`.
  - `getPlayers` left-joins the profile on competition and `app_people.person_code = app_players.person_code`.
  - Each list entry gains `weightKg` and `birthAt` (ISO date string), both null when the profile or value is missing.
  - The warehouse documents `person_code` as the bridge from the season's `person_key` (identical in every season of
    local history). The left join means a missing profile never hides a player.
- **Card detail line:** "Forward · ESP · 202 cm · 104 kg · 32 y". Each part is left out when missing, as today.
- **Age is the player's age at the season's start**, 1 October of its first year, so a past season shows how old the
  player was then. For the current season that is close to today's age. A small helper in the page computes it from
  `birthAt` and the season.
- **Weight is the profile's latest value**, the same in every season; the warehouse keeps no weight per season.
  Acceptable for a directory card.

### Club and position filters

- **Two selects beside the search:**
  - **Club:** "All clubs" plus the season's clubs, by name, from the season teams list the app already fetches.
  - **Position:** "All positions", Guard, Forward, Center.
- **Behaviour:** they combine with the search and with each other. Changing any of them goes back to the first page,
  as the search does.
- **Backend:** `GET /api/seasons/:seasonCode/players` takes optional `club` and `position` query parameters.
  - `club`: a player with a player registration (role J) at that club in the season. A traded player is listed under
    every club they played for that season.
  - `position`: the registration's `position_name`.
  - **Validation:** `club` with `validIdentity`, `position` against the three names. A bad value answers 400 with
    `INVALID_CLUB_FILTER` or `INVALID_POSITION_FILTER`, in the existing `sendError` shape. An unknown but well-formed
    club simply finds no one.
- **Check during implement:** the distinct `position_name` values in local registrations are Guard, Forward and
  Center (case as stored). If the data holds others (empty, or a combined value), the select offers what is there,
  and the spec notes it.
- **Empty result:** "No players match these filters." With a search as well: "No players match your search and
  filters."

### Tighter cards

- **Columns:** 2 per row below lg, 3 at lg, 4 at xl, 5 at 2xl.
- **Card:** smaller photo column, less padding, and name, club and details on tighter lines, so a card is about two
  thirds of today's height. All text stays readable:
  - the last name keeps its display weight;
  - long club names still truncate with a title;
  - the number stays top right.
- **Page size 60**, divisible by 2, 3, 4 and 5, so every row is full at every width ("Showing 1-60 of 343 players").
- **Skeleton (`PlayersSkeleton.jsx`)** matches the new card and column counts.

Must not change: the player page, the search behaviour, the other pages that use the players endpoint or its default
response (the new fields are additive and the filters optional).

### Changes found during implement

- **No `app_players` join.** The season table the list already reads, `app_people`, has its own `weight_kg` and
  `birth_at` (the warehouse's table reference lists both). So:
  - the schema maps those two columns, and `app_players` is not used;
  - weight is that season's value, not the latest;
  - the production risk in Verify is gone, because `app_people` is already published.
- **`birthDate`, not `birthAt`:** each entry gets `weightKg` and `birthDate` (`YYYY-MM-DD`, formatted by the query).
  The player page and roster responses, which share the player fields, carry the two new fields too (additive).
- **Data observed locally:**
  - positions are only Guard, Forward and Center; some older-season registrations have none and match no position;
  - weight covers every player in 2025-26 but thins out further back (122 of 396 in 2010-11, 43 of 514 in 2001-02),
    and those cards simply leave it out;
  - birth dates are nearly complete.
- **The detail line is two lines** ("Forward · ESP", then "202 cm · 95 kg · 29 y"). With five cards a row, one line
  cut the age off. A card is 112px tall from 640px, against about 140px before.
- **The filter row:** from 640px the search shrinks to share one row with the two selects (192px and 144px). Below
  640px the search has its own row, and the selects share the next.
- **Tests:** the existing card tests now cover 2, 3, 4 and 5 per row (with 1536px), the 16px crest, 60 a page,
  weight and age, and missing weight and age. New tests cover the filters (what they send, the first page again, the
  sorted club list), the filter row at every width with its empty messages, and the endpoint's filters and 400
  answers.

## Build steps

- [x] 1. **Backend.** Schema mappings, the profile join with `weightKg` and `birthAt`, the `club` and `position`
  filters with validation, and `getSeasonPlayers` in `frontend/src/lib/api.js` passing them.
  Done when: `cd backend && npm run build` passes. Locally, `/api/seasons/E2025/players?club=PAR&position=Center`
  returns only Partizan's centres, with weight and birth date. `?position=Pivot` answers 400.
- [x] 2. **Cards and filters.** The detail line with weight and age, the two selects, the empty messages, page size
  60, the 2/3/4/5 grid and the tighter card and skeleton.
  Done when: lint passes. At 1536px, 2025-26 shows 5 cards per row, 60 a page. Picking Partizan and Center narrows
  the list. At 320px the cards and filters fit without sideways scroll.
- [x] 3. **Browser checks.** Update the players list's spec (the one covering `/players`, found during implement):
  - cards per row at 320, 640, 1024, 1280 and 1536px, with full rows;
  - the detail line with weight and age, and with them missing;
  - the club and position filters, combined with the search;
  - going back to page 1 on a change;
  - the empty messages;
  - the 400 answers;
  - no sideways scroll.

  Done when: that spec and `responsive.spec.js` pass against the local database.

## Verify

- `npm run build` (root) and `cd frontend && npm run lint` pass.
- The specs above, after `/api/health` reports `"target":"local"`.
- **By hand:** open Players in 2025-26.
  - At 1536px, check the five-per-row cards with weight and age.
  - Pick Partizan, then Center, then type a name, and check that the list narrows each time.
  - At 390px, check the filters and cards fit.
- **Production data:** no new table is read (see "Changes found during implement"); nothing to publish first.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7677,"specSha256":"0bc9b4e2a7b21dda77f780b86dcf83a54f53e09f8b83040501a79691f5d3e06e","branch":"refs/heads/fix/players-list-with-weight-and-age-club-and-position-filters-tighter-cards","head":"9b713e99d99d7f1338a9181a0f0380a7cc48e06a","baseRef":"refs/heads/master","baseCommit":"9b713e99d99d7f1338a9181a0f0380a7cc48e06a","sourceTree":"235885e31f85392f232ea43b06b3d18f33973dd8","absentOptional":[]} -->
