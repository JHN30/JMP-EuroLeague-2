# Feature 34o: all-season acceptance and production compatibility

All evidence was collected on 2026-10-14 against the local database (`/api/health` reported `target: local`). No Neon access, production
import, publisher run, database write or real `.env` read was involved. This leaf verified and reported; it changed no product code.

## 1. Season matrix (`node scripts/check-season-matrix.mjs`, exit 0)

The script is read-only and refuses unless the API reports `local` (checked: it exits 2 against a stub reporting `neon` and when the API is
unreachable). Per season it compares phases, groups and clubs, official positions, qualifiers into the next stage, played and total games per
stage, series counts and win thresholds, and the champion or cancellation with each season's format and the 34a inventory's season matrix.
`node scripts/check-season-formats.mjs` also reports "Every season matches its format."

| Season | Family | Status | Champion | Games played/total by stage |
| --- | --- | --- | --- | --- |
| E2000 | eliminationSeries | completed | VIR | RS 120/120, PO 38/38 |
| E2001 | top16ToFinalFour | completed | PAN | RS 224/224, TS 48/48, FF 3/3 |
| E2002 | top16ToFinalFour | completed | BAR | RS 168/168, TS 48/48, FF 4/4 |
| E2003 | top16ToFinalFour | completed | TEL | RS 168/168, TS 48/48, FF 4/4 |
| E2004 | top16Bo3Playoffs | completed | TEL | RS 168/168, TS 48/48, PO 9/9, FF 4/4 |
| E2005 | top16Bo3Playoffs | completed | CSK | RS 168/168, TS 48/48, PO 11/11, FF 4/4 |
| E2006 | top16Bo3Playoffs | completed | PAN | RS 168/168, TS 48/48, PO 10/10, FF 4/4 |
| E2007 | top16Bo3Playoffs | completed | CSK | RS 168/168, TS 48/48, PO 11/11, FF 4/4 |
| E2008 | top16Bo5Playoffs | completed | PAN | RS 120/120, TS 48/48, PO 16/16, FF 4/4 |
| E2009 | top16Bo5Playoffs | completed | BAR | RS 120/120, TS 48/48, PO 16/16, FF 4/4 |
| E2010 | top16Bo5Playoffs | completed | PAN | RS 120/120, TS 48/48, PO 17/17, FF 4/4 |
| E2011 | top16Bo5Playoffs | completed | OLY | RS 120/120, TS 48/48, PO 16/16, FF 4/4 |
| E2012 | top16TwoGroups | completed | OLY | RS 120/120, TS 112/112, PO 17/17, FF 4/4 |
| E2013 | top16TwoGroups | completed | TEL | RS 120/120, TS 112/112, PO 17/17, FF 4/4 |
| E2014 | top16TwoGroups | completed | MAD | RS 120/120, TS 112/112, PO 15/15, FF 4/4 |
| E2015 | top16TwoGroups | completed | CSK | RS 120/120, TS 112/112, PO 14/14, FF 4/4 |
| E2016 | singleTable | completed | ULK | RS 240/240, PO 15/15, FF 4/4 |
| E2017 | singleTable | completed | MAD | RS 240/240, PO 16/16, FF 4/4 |
| E2018 | singleTable | completed | CSK | RS 240/240, PO 16/16, FF 4/4 |
| E2019 | singleTable | cancelled | none | RS 252/306 |
| E2020 | singleTable | completed | IST | RS 306/306, PO 18/18, FF 4/4 |
| E2021 | singleTable | completed | IST | RS 278/306, PO 17/17, FF 4/4 |
| E2022 | singleTable | completed | MAD | RS 306/306, PO 18/18, FF 4/4 |
| E2023 | singleTablePlayIn | completed | PAN | RS 306/306, PI 3/3, PO 18/18, FF 4/4 |
| E2024 | singleTablePlayIn | completed | ULK | RS 306/306, PI 3/3, PO 17/17, FF 4/4 |
| E2025 | singleTablePlayIn | completed | OLY | RS 380/380, PI 3/3, PO 16/16, FF 3/3 |
| E2026 | singleTablePlayIn | inProgress | none | RS 47/380 |

An in-progress season lists only the phases that have games, so E2026 reports `RS` only (the script's rule; the format still lists all its stages).
The matrix found no mismatch.

## 2. Browser acceptance (`frontend/e2e/all-seasons.spec.js`)

`npx playwright test all-seasons.spec.js`: 85 per-season and URL-state tests passed, plus the 2 theme and layout tests.

- **Per season (27 seasons, 3 tests each):** Home, Overview, Standings, Games, Teams, Leaders, Records, Postseason, a club page and a player page load with
  no error boundary, no load error and no script error; the Overview title carries the season name; Standings and Games follow each stage of the
  format (group regions, club counts for loaded stages, "knockout" notice for knockout stages, fixtures for every phase with games);
  a stage the season did not have (Play-In, Top 16) never appears in the wording; Postseason shows "<club> are the champions" for the inventory's
  champion, "Season cancelled" for E2019 and no champion for E2026.
- **URL state:** group, round and stage survive a reload (E2012 Top 16 group F, E2008 round 3, E2000 Semifinals); unknown phase, group, stage and
  round fall back without an error; the season switcher keeps the page, lists exactly the 27 loaded seasons, and a season the database lacks (2027)
  falls back to the current season.
- **Records and head to head** open for a historical season without an error.
- **Themes and layouts:** E2000, E2001, E2002, E2004, E2008, E2012, E2016, E2019, E2021, E2023, E2025 and E2026, Postseason and Standings, in
  `light-euroleague` and `dark-euroleague` at 320, 390, 768 and 1024 px: no page overflow (2.2 minutes each theme).

Two test mistakes were fixed while building the spec (a "no Top 16" help sentence matched the wording check; an unknown season redirects to the current
one rather than showing a not-found page). They were not product defects.

## 3. Full suite and regression

- `npm run test:browser` (whole suite, local target): **968 passed, 2 failed** in 18.2 minutes.
- Both failures passed when `phone-menu.spec.js` and `scroll-to-top.spec.js` were re-run alone (30 passed): timing flakes under load, not defects.
  - `phone-menu.spec.js` "with reduced motion the menu appears at once" (390 px): a sampled opacity was undefined once.
  - `scroll-to-top.spec.js` "a change of the query string alone keeps the page where it is": scroll position 297 instead of 300 once.
- `npm run build` and `npm --prefix frontend run lint`: passed.
- Defects found: **none**.

## 4. Neon and publisher compatibility (local evidence and code only)

| Item | Evidence | Result |
| --- | --- | --- |
| Neon season allowlist | `backend/src/db/season-catalog.ts` lines 10-12: `NEON_SEASONS = ["E2023".."E2026"]`, `LOCAL_SEASONS` E2000-E2026, chosen only by `ENV.DB_TARGET === "local"`; `git diff` of the file across feature 34 is empty | Unchanged |
| Default target | `backend/src/config/env.ts` line 49: `DB_TARGET` defaults to `neon`; `.env.example` sets `neon` and describes `local` as development only | Unchanged; production reads Neon with the four seasons |
| Season gating | `routes/seasons.ts` line 244 rejects a season outside `SUPPORTED_SEASONS`; records, catalog and response cache iterate `SUPPORTED_SEASONS` (`season-records.ts`, `season-catalog.ts`, `response-cache.ts`) | Compatible: with Neon only four seasons are reachable |
| Table and column definitions | `season-schema.ts` (19 tables) and `season-advanced-schema.ts` (18 tables); `git diff 556d6c2^ HEAD` over both files, `client.ts` and `config/` is empty | Unchanged across feature 34: no new table, column or schema assumption |
| Backend changes in feature 34 | Five files: `season-format-registry.ts` (new, code-only data), `season-format.ts` (new, reads existing tables), `season-games.ts`, `season-records.ts`, `routes/seasons.ts` | Reads only tables the app already read |
| Local answers for all 27 seasons | The matrix script and `all-seasons.spec.js` pass for every season | Compatible locally |
| Neon database content, schema state and row volumes | Not inspected | **Not inspected** |
| Pipeline publisher, its allowlist and `--dry-run` | Outside this repository; not run | **Not inspected** |
| Behaviour of a production build against Neon | Not run (no Neon access, as scoped) | **Not tested** |

The owner of this project states that a version of this code already runs in production against Neon behind the allowlist; that is not verified here.

## 5. Rollout prerequisites (ordered)

1. In the pipeline repository, confirm the publisher's allowlist and that record tables built from all 27 local seasons are not published to the
   four-season Neon, and that row volumes for any older season fit the Neon plan (inventory section 8). Separately approved task.
2. Run the matrix script and `all-seasons.spec.js` against a staging copy of Neon (or the Neon target) only after step 1 and an explicit decision, with
   a read-only budget for transfer.
3. Decide which older seasons to publish and widen `NEON_SEASONS` in one reviewed change; each added season is verified by the matrix script first.
4. Deploy and smoke-test the format routes (`/api/seasons/:season/format`, `postseason-series`) and one page per era.

## 6. Gaps that stay open after feature 34

Pipeline or source owned (recorded in [34n-coverage-gaps.md](34n-coverage-gaps.md)): qualifying games for E2001 and E2009-E2014; the E2000 replay and
missing game codes 160-161; the E2021 standings snapshot alignment; Neon and publisher compatibility (section 4). Deferred decisions: E2021 statistics and
records eligibility of annulled games; the E2026 third-place policy.

Not run: any Neon, production or publisher check; individual older-season records values beyond the pages loading.
