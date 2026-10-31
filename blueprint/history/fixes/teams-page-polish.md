# Fix: Teams page polish

**Type:** Fix
**Status:** verified
**Branch:** fix/teams-page-polish

## The problem

The Teams directory (`/:season/teams`, `frontend/src/teams/TeamsPage.jsx`) shows each club as a crest, a name and a bare
three-letter country code ("ESP"). It says nothing about where the club is from beyond the code, or how its season is
going, although both are already stored: the club's city (`app_clubs.city`, shown in the team page's header) and its
regular-season standing (the `RS` standings the Home page and the Games page already load).

## The fix

- **City with the country.** `GET /seasons/:seasonCode/teams` also carries `city: string | null` per team, from
  `app_clubs.city` (an empty or blank value is `null`). It is additive: every other caller of the teams list keeps working
  unchanged. The card's second line reads "Madrid · ESP"; without a city it is the country code alone, as today, and
  without either it stays "-". The feed writes some cities in capitals ("ATHENS"): they are recased the way the team
  page already does, by moving its local `readableName` into `frontend/src/lib/playerName.js` beside `titleCase` and
  importing it in both places (same behaviour on the team page).
- **City clean-up for display (until the warehouse is corrected).** The feed's city values are inconsistent (checked
  across every loaded season on the local database). After recasing, a small display map in
  `frontend/src/teams/TeamsPage.jsx` corrects the known bad values; the API keeps returning the feed's text, so a later
  warehouse fix needs no code change and the map can then be dropped:
  - "Ovarense" (a club name) → "Ovar"; "Roma" → "Rome"; "Napoli" → "Naples" (the other cities are English: Milan,
    Munich, Cologne); "St Petersburg" → "Saint Petersburg"; "Nizhni Nóvgorod" → "Nizhny Novgorod"; "Cantu" → "Cantù";
    "Malaga" → "Málaga"; "Kiev" → "Kyiv"; "Karsıyaka, İzmir" → "İzmir".
  - Any other value shows as recased; a club without a city (Perm, `PEM`) shows the country code alone.
  - The team page header keeps its current display (scope is the Teams directory only).
- **Place and record.** A third line with the club's regular-season place and win-loss record: "3rd · 22-12". In a
  season whose regular season is split into groups (an entry with a group name), the group comes first, using the
  existing `groupPositionLabel`: "Group A · 2nd · 22-12". The data is `getSeasonStandings(seasonCode, "RS")` with the
  shared query key `["standings", seasonCode, "RS"]`, matched to the card by `clubCode`.
  - No record line when the club has no standings row, has no position, or has played no game yet (0 wins and 0 losses),
    so a season that has not started shows the cards without it.
  - The standings request never holds the page back: the grid renders from the teams list as today; while standings load
    or if they fail, the cards simply have no record line (no extra spinner or error on the page).
- Order, grid (two cards per row below 1024px, three from it), crest slot, links and the abbreviated name below 640px are
  unchanged. Everything added is plain text inside the existing card link. City text comes from the feed and is rendered
  as text.

## Build steps

- [x] 1. **`city` on the teams list.** In `backend/src/db/season-identities.ts`, add `city` to what `getTeams` returns (a
  separate select for the list, so `getTeam`, `getTeamRef` and the registration join keep their shape), trimmed, empty
  as `null`, and extend the returned type.
  Done when: `cd backend && npm run build` passes.
- [x] 2. **City, place and record on the cards.** Move `readableName` to `frontend/src/lib/playerName.js` and import it in
  `TeamPage.jsx`; in `TeamsPage.jsx` add the city display map, the RS standings query and the two lines described above (muted small text,
  wrapping inside the card like the name does, centred below 640px as the card already is).
  Done when: `cd frontend && npm run lint` passes and the cards show "City · CODE" and the place and record line.
- [x] 3. **Browser checks.** In `frontend/e2e/teams-layout.spec.js`: the API carries `city` on every team; with mocked teams
  and standings, a card shows "City · CODE" and "3rd · 22-12", a city in capitals is recased ("ATHENS" → "Athens"), a mapped
  city is corrected ("ROMA" → "Rome"), a card without a city shows the code only, a club without a
  standings row and a club at 0-0 show no record line, a grouped entry shows "Group A · 2nd · …", a failing standings
  request still shows every card, and the existing width, column and containment checks still pass.
  Done when: `cd frontend && npx playwright test teams-layout.spec.js` passes against the local database.

## Verify

- `npm run build` (root) and `cd frontend && npm run lint` pass.
- `teams-layout.spec.js` only, after `/api/health` reports `"target":"local"`.
- By hand: open the current season's Teams page: each card shows the club's city and country and its place and record;
  open a season's Teams page before its first game and the cards show no record line.

<!-- blueprint:completion {"schemaVersion":1,"specBytes":5108,"specSha256":"6fab76e857fb7fa89598ba7bf523a28b175991524d273cda9b66160d6abd9ebf","branch":"refs/heads/fix/teams-page-polish","head":"de2b745222f26944d44856d4a5a6b9abd9b45cc3","baseRef":"refs/heads/master","baseCommit":"de2b745222f26944d44856d4a5a6b9abd9b45cc3","sourceTree":"d43684203dc627c73bad82883a8964d476d4dea9","absentOptional":[]} -->
