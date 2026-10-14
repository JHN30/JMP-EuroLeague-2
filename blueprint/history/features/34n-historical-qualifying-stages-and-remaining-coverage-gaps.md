# Feature: Historical qualifying stages and remaining coverage gaps

**From build-plan:** feature 34n
**Build attempt:** 1
**Type:** Feature
**Status:** verified
**Branch:** feature/historical-qualifying-stages-and-remaining-coverage-gaps

## Goal

Say honestly, wherever a season's regular season is shown, that qualifying rounds took place before it where that is established, and that their games are not loaded, without inventing a qualifying stage, game, club or count. Then record which of the other coverage gaps found by 34a remain, who owns each, and what 34o must still accept. The local data has no qualifying game in any season, so this leaf adds facts and notes, not a qualifying filter or results.

## What is true today (observed locally, `/api/health` reported `target: local`)

- No season has a qualifying phase: `/api/seasons/{2001,2008-2015}/phases` return only `RS`, `TS`, `PO`, `FF` (E2001: `RS`, `TS`, `FF`). Format `exceptions` carry nothing about qualifying (E2009 returns `[]`).
- The 34a inventory (section 6, sources marked [S], local absence [L]) establishes:

  | Season(s) | Established | Local |
  | --- | --- | --- |
  | E2001 | 41 entrants; qualifying rounds produced 2 of the 32 regular-season clubs | absent |
  | E2009, E2010 | Two-legged knockout qualifying rounds | absent |
  | E2011 | Two final-eight tournaments (Vilnius, Charleroi), two winners | absent |
  | E2012-E2014 | Single-venue tournaments; winners Cantù, Lietuvos rytas, UNICS, all in the regular-season field | absent |
  | E2008, E2015 | Not established | absent |
  | E2000, E2002-E2007, E2016 onward | None (E2000 had wild cards only) | none needed |

- Pages show nothing about qualifying, so a reader cannot tell why a season's field includes clubs that played no earlier stage, or why qualifying results are missing.
- The inventory's required decision for this leaf: "a source feed or explicit decision for qualifying games. Until then, show the honest 'history known, games not loaded' note and keep qualifying clubs out of counts. This is pipeline work outside this repository."

## In scope

- **Format fact.** A new registry exception kind `qualifying` (stage `RS`, a non-empty note) on exactly E2001 and E2009-E2014, with the note taken from the table above (the club counts, round shape and winners quoted there, nothing else). E2008 and E2015 get none (not established). It is returned unchanged by `GET /api/seasons/:season/format` under `exceptions`; the registry check rejects an empty note and a stage other than `RS`.
- **Note in the app.** The existing competition-context note (`CompetitionContext`, driven by `competitionNotes`) shows, for the regular-season phase of those seasons, one sentence naming the fact and the gap: for example "Qualifying rounds took place before this season (qualifying produced 2 of the 32 regular-season clubs). Their games are not loaded, so no qualifying results are shown and the regular-season counts, records and statistics cover only the main competition." It appears where the regular season's table, fixtures or Home standings snapshot already show competition notes (Standings, Race, Games, Home), not on game pages, club pages, Top 16, Playoffs or Final Four.
- **Counts unchanged.** No qualifying phase, filter, tab or club is added anywhere; `phases`, `plannedClubs`, team counts, records and statistical scopes stay exactly as they are (asserted by a test).
- **Coverage-gap ledger.** `blueprint/reference/34n-coverage-gaps.md` classifying every remaining open item of the 34a inventory (sections 7 and 11 and the registry's unverified fields): resolved by an earlier leaf (which, with one cheap local check), app-side and acceptable as is, pipeline or source work (with the exact data needed), or deferred. It includes a ready-to-send note for the pipeline owner describing the qualifying feed that would unlock a real qualifying stage (what games, which phase code, how qualifying-only clubs must be kept out of main-stage counts), without proposing a schema change.
- Acceptance report `blueprint/reference/34n-acceptance.md` with the evidence and what 34o must still accept.

## Out of scope

- Any qualifying game, club, table, bracket, filter or statistic, any fabricated or inferred qualifying result, and any claim for E2008 or E2015 (not established).
- Pipeline, schema, Neon, deployment or other-competition work; the replay game and the forfeit statistics (already recorded as gaps for the pipeline owner).
- Per-game or per-club qualifying notes, and changes to Top 16, Playoffs or Final Four pages.
- The all-season acceptance and production compatibility (34o).

## Build loop

Per `blueprint/config.json` (`workflow.stepReview: feature`, no checkpoint commits): build the steps in order, run each step's narrow check, then one final pass (`npm run build`, `npm --prefix frontend run lint`, the specs below) and one review packet. `/complete` makes the single commit.

## Build steps

- [x] **1. Qualifying fact in the registry.** In [season-format-registry.ts](backend/src/db/season-format-registry.ts) add the `qualifying` exception kind to `FormatException` (`{ kind: "qualifying"; stage: "RS"; note: string }`), the seven entries (E2001, E2009, E2010, E2011, E2012, E2013, E2014) with notes limited to the inventory's established facts, and the registry check (non-empty note, stage `RS`, only on these seasons' existing formats). Done when `cd backend && npm run build` passes and, on the local API, `/api/seasons/{2001,2009,2010,2011,2012,2013,2014}/format` each return one `qualifying` exception with stage `RS` while `/api/seasons/{2000,2002,2008,2015,2016,2023}/format` return none, `phases` are unchanged and no qualifying stage appears in `stages`.
- [x] **2. Note on the regular season pages.** In [seasonFormat.js](frontend/src/lib/seasonFormat.js) make `competitionNotes` return the qualifying note for `phaseCode === "RS"` only when no game, club or round is named, with the "games are not loaded" sentence built from the entry's own note (never a hardcoded club or count). Done when a Playwright spec asserts the note on `/2001/standings?phase=RS`, `/2010/games?phase=RS`, `/2012/home` and the Race view, its absence on `/2008`, `/2015`, `/2002` and `/2024` regular-season pages, on Top 16, Playoffs and Final Four pages of the noted seasons, on a game page and a team page, and that team counts on `/2012/teams` still equal the regular-season field.
- [x] **3. Coverage-gap ledger and pipeline note.** Write `blueprint/reference/34n-coverage-gaps.md` as described in scope: every remaining open item classified with its owner and, where it claims "resolved", a cheap local check run now (API or page) recorded with the date; the pipeline note for qualifying games. Done when each open item of inventory sections 7 and 11 appears with a status and evidence reference, nothing is marked resolved without a recorded check, and no row proposes inventing data.
- [x] **4. Regression and acceptance report.** Run the new spec with the competition-context, historical-era, home, standings, games layout and responsive specs the note touches, plus `npm run build` and `npm --prefix frontend run lint`, and write `blueprint/reference/34n-acceptance.md` (evidence, results, what 34o must accept). Done when those pass against `target: local` and a screenshot of the note on `/2001/standings?phase=RS` at 1200 and 390 px has been inspected.

## Files / areas

- backend/src/db/season-format-registry.ts (type, entries, check); no route or schema change (exceptions are already returned by `season-format.ts`).
- frontend/src/lib/seasonFormat.js; frontend/src/lib/CompetitionContext.jsx only if the note's key needs adjusting.
- frontend/e2e/qualifying-note.spec.js (new).
- blueprint/reference/34n-coverage-gaps.md and 34n-acceptance.md (new).

## Data / contracts

- `FormatException` gains `{ kind: "qualifying"; stage: "RS"; note: string }`; `GET /api/seasons/:season/format` returns it inside `exceptions` unchanged. Existing consumers ignore unknown kinds, and `competitionNotes` is the only place that shows it.
- The note text is data: it states only the facts in the table above. No qualifying game, club or count is stored or computed.
- A season with no `qualifying` exception shows nothing; "not established" is never rendered as "none".

## Testing

- `frontend/e2e/qualifying-note.spec.js` against the local API and pages (`/api/health` `target: local`), by file name: the format API assertions of step 1, the note's presence and absence of step 2, unchanged phases and club counts, and layout at 320, 390, 768 and 1024 px for one noted page.
- Regression: `competition-context`, `historical-era-pages`, `home-layout`, grouped and standings specs, `responsive.spec.js`; `npm run build`; `npm --prefix frontend run lint`.
- Not claimed: the full suite, Neon/production, or any verification of qualifying results (none are loaded).

## Notes for the AI

- Follow the 34f and 34g pattern: a registry exception with a note, shown through `CompetitionContext`, opt-in by data, no new component.
- Keep wording cause-neutral and sourced to the inventory; do not name clubs beyond the three winners the inventory records.
- Project rules apply: Playwright only against the local database, never read `.env`, no AI attribution on commits.
- Backend registry edits need `cd backend && npm run build`; the dev backend must be restarted to serve the new exceptions before the browser spec.

## Results

Verified on 2026-10-14 against the local database (`/api/health` reported `target: local`). Full evidence is in [34n-acceptance.md](../../reference/34n-acceptance.md) and the gap classification in [34n-coverage-gaps.md](../../reference/34n-coverage-gaps.md).

- A `qualifying` format exception (stage `RS`, a note limited to the 34a inventory's established facts) on E2001 and E2009-E2014 only, returned by `GET /format`; E2008 and E2015 carry none. No qualifying stage, phase, filter, club or count was added.
- `competitionNotes` shows one note on the regular-season Standings, Games and Race ("The qualifying games are not loaded..."), never on game or club pages or later stages; a grouped Race now shows the competition note once (opt-in `showContext` on `RaceView`). A finished grouped season's Home shows its Top 16 table, so it carries no note.
- Checks run: `npx playwright test qualifying-note.spec.js` (10 passed); a regression run over competition-context, historical-era, home layout, standings, grouped, race, responsive, excluded and cancelled-season specs (421 passed); backend build, root build and frontend lint.
- Deferred to 34o and the pipeline owner: pre-2007 coverage wording, the scaled records minimum's effect on older seasons, Neon publisher compatibility, the qualifying feed, the E2000 replay and the E2021 snapshot alignment.
- Not run: the full suite and Neon/production checks.
