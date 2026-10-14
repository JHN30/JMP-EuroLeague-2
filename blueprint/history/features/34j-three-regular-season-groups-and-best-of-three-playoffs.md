# Feature: Three regular-season groups and best-of-three playoffs

**From build-plan:** feature 34j
**Build attempt:** 1
**Status:** verified
**Branch:** feature/three-regular-season-groups-and-best-of-three-playoffs

## Goal

Make the app correct for E2004-E2007: three regular-season groups of eight
(14 games per club), where the top five of each group plus one best sixth-placed
club form four Top 16 groups of four (6 games per club); the top two per Top 16
group play best-of-three quarterfinals (two wins clinch), then the Final Four
with a third-place game. Reuse the grouped presentation from 34h and 34i. The
new pieces are the cross-group best-sixth qualifier and best-of-three copy and
clinching; nothing may be presented as a five-game series.

## In scope

- **Recorded evidence first.** For each season, record from the existing API the
  three RS groups, who was fifth and sixth in each, which one sixth-placed club
  reached the Top 16, the four Top 16 groups and places, every quarterfinal pair
  and series score (two or three games), and the Final Four with its third-place
  game. The inventory lists the observed sixth-placed qualifiers (E2004 PES,
  E2005 CIB, E2006 PAR, E2007 ROM) and the "best record, then point difference"
  pattern, but no regulation stating the cross-group rule was found.
- **Best-sixth qualifier.** On Standings, mark the sixth-placed club that
  actually appears in the Top 16 field as "Best sixth-placed club", from the
  recorded Top 16 participation. Do not compute or rank the sixth-placed clubs,
  do not state the criterion as official, and do not show a qualification band
  as a combined table. The other sixth-placed clubs show as outside the
  qualification places. Groups keep their own official ranks; the first five
  places of each group keep the qualification band.
- **Postseason page.** Use the grouped bracket model for this family:
  four quarterfinal slots labelled by Top 16 group place, win target two from
  the format, a 1-0 lead stays a lead until two wins, and the Final Four with its
  third-place game. Series length varies (two or three games), so a series is
  complete when a club reaches two wins, never by game count. Copy says
  "best-of-three", taken from the format, never "best-of-five".
- **Source labels stay text.** Top 16 groups, playoff and Final Four labels are
  read as source text; classify by verified stage and participants.
- **Other pages.** Confirm and fix only what is wrong for 14-game groups of eight
  and the best-sixth qualifier on Standings (including race playback and
  snapshots), Home, Overview, Games filter, team and game labels, Leaders and
  Compare. Keep the unavailable adjusted-rating notes where the source reports
  separate groups.
- **Known tie.** E2005 Top 16 group G finished 3-3 for all four clubs; use the
  official rank order PAN, IST, TRE, CIB as stored and do not recompute it.
- Verify all four seasons, regressions for the E2008-E2015 and modern seasons,
  and 320/390/768/1024px layouts for the changed pages.

## Out of scope

E2002-E2003 (34k, direct Top 16 to Final Four) and E2000/E2001, qualifying
rounds (34n), any official best-sixth tiebreak engine or statement of the rule,
global rankings across groups, new formulas, schema/data/pipeline writes, new
endpoints or dependencies, Neon import, push and deployment. Whatever shared
best-sixth marker this leaf builds is reused by 34k later, not extended here.

## Build loop

Approve this spec before `/implement`. Build the steps, then present one final
review packet (`stepReview: feature`); checkpoint commits are disabled.
`/complete` creates the final feature commit. Regular audit, Check and try-guide
gates are manual; independent review runs only if the work proves sensitive or
unusually broad.

Archive path
`blueprint/history/features/34j-three-regular-season-groups-and-best-of-three-playoffs.md`
is frozen for attempt 1. No prior matching record or Git use of that path was
found, the archive leaf is absent, and the branch name is valid with no
existing or conflicting local ref. No branch is created by this command.

## Build steps

1. [x] **Record the evidence.** Against the local API (`/api/health` must report
   `"target":"local"`), collect for E2004-E2007 the RS groups with fifth and
   sixth places, the Top 16 field and groups, the sixth-placed qualifier, every
   quarterfinal pair and score, and the Final Four games. Write
   `blueprint/reference/34j-acceptance.md` with a per-season table, mark anything
   that does not fit the inventory, and record how the Standings page currently
   treats the registry's best-sixth rule.
   **Done when:** every season has a row for each item above and each mismatch is
   called out. No source change in this step.
2. [x] **Best-sixth marker on Standings.** Let the grouped RS table carry the
   cross-group qualifier: extend the tier helper in
   `frontend/src/lib/seasonFormat.js` and the Standings group sections
   (`frontend/src/standings/`) so places 1-5 keep their band and the recorded
   Top 16 sixth-placed club is labelled "Best sixth-placed club" with an
   accessible, non-color-only marker. Derive it from the Top 16 stage's recorded
   participants, and show no marker when that evidence is missing. Race playback
   and snapshots keep working.
   **Done when:** each season shows exactly one marked sixth-placed club in the
   latest RS view, the other sixth-placed clubs read as outside the places, a
   missing Top 16 shows no marker and no error, and E2008-E2015 and modern
   Standings behave as before.
3. [x] **Best-of-three bracket.** Add the `top16Bo3Playoffs` family to the grouped
   bracket model in `frontend/src/postseason/groupedBracket.js` and the page in
   `PostseasonPage.jsx`, with the series length and copy taken from the format.
   **Done when:** focused model cases pass for all four seasons (recorded pairs,
   two-game and three-game series, a 1-0 lead is not a winner, reversed order,
   missing standings or series), the page shows "best-of-three" and no
   "best-of-five" for these seasons, and E2008-E2015 model cases still pass.
4. [x] **Remaining pages.** Check the pages listed above for the four seasons and
   fix only confirmed gaps; record what was checked and changed in the report.
   **Done when:** each page shows 14-game groups of eight and four Top 16 groups
   of four with group-local ranks and no combined table.
5. [x] **Browser spec and results.** Add `grouped-three-groups.spec.js` for the
   four seasons (Standings with the best-sixth marker, Top 16 groups, quarterfinal
   pairs and series, champion and third place, Home, Games filter) and layouts,
   then fill in the results.
   **Done when:** the new spec plus `grouped-four-groups`, `grouped-postseason`,
   `grouped-standings`, `grouped-pages`, `postseason`, `postseason-clinch`,
   `postseason-layout` and `responsive` specs pass against the local database,
   and `npm run build` and `npm --prefix frontend run lint` pass.

## Files / areas

`frontend/src/lib/seasonFormat.js`, `frontend/src/standings/` (group sections,
tiers), `frontend/src/postseason/` (groupedBracket.js, PostseasonPage.jsx),
`frontend/e2e/`, `blueprint/reference/`. The backend registry already declares
E2004-E2007 (`threeGroupsOfEight("PO", 2, true, "top16Bo3Playoffs")` with the
best-sixth rule), so no backend change is expected.

## Data / contracts

Existing endpoints only: season format, phase standings (RS and TS), postseason
series, games and rounds. Group identity is the observed `groupName`; positions
are group-local and never merged. The best-sixth marker comes from recorded Top 16
participation, not from a computed comparison. Quarterfinal pairs come from
recorded series. No persisted-data change.

## Testing

No unit test command exists. Model cases and browser checks run as Playwright
specs by file name after `/api/health` reports `"target":"local"`. The full
suite is not run unless a shared component, routing, the API client or global
CSS changes. No Neon, production or visual-screenshot evidence will be claimed
unless it is actually run.

## Notes for the AI

- Apply changes to the page being fixed; shared components get opt-in props.
- Prefer the TV code as the short label for clubs.
- Never open the real `.env`.
- Reuse the 34h/34i group helpers; do not hardcode group names or draws.
- A value the data cannot support stays unavailable, with a reason.

## Open questions

None blocking. The cross-group best-sixth criterion is not documented in any
regulation found (inventory), so the UI states only that the club qualified, never
why. Qualifying rounds stay with 34n.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8663,"specSha256":"50a0b103fa17e23d56964ea2502b6f4523d46d446ada516aacc86396a1ec478c","branch":"refs/heads/feature/three-regular-season-groups-and-best-of-three-playoffs","head":"8b15a6ed6ecc9bf807a9ada170780f88a206c9d2","baseRef":"refs/heads/master","baseCommit":"8b15a6ed6ecc9bf807a9ada170780f88a206c9d2","sourceTree":"1c33179c4b727357a5b7c03c16cb7d6cb99c6a19","absentOptional":[]} -->
