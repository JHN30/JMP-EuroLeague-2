# Feature: Four-group Top 16 and best-of-five playoffs

**From build-plan:** feature 34i
**Build attempt:** 1
**Status:** verified
**Branch:** feature/four-group-top-16-and-best-of-five-playoffs

## Goal

Make the app correct for E2008-E2011: four regular-season groups of six
(10 games per club), four Top 16 groups of four (6 games per club), the top two
per Top 16 group in best-of-five quarterfinals, then the Final Four. Reuse the
grouped presentation built in 34h. The Postseason page is the main gap: its
grouped bracket assumes two Top 16 groups of eight. Modern single-table seasons
and E2012-E2015 must not change.

## In scope

- **Recorded evidence first.** For each of the four seasons, record the actual
  Top 16 groups, group places, quarterfinal pairs, series scores, Final Four
  semifinals, final and placement game, from the existing API. The inventory
  observes a "winner v runner-up of another group" quarterfinal pattern
  (E2008: OLY-MAD, BAR-BAS, PAN-SIE, CSK-PAR); check it per season before the
  UI presents it as verified. A pairing that cannot be matched to recorded group
  places stays "unverified", with no assumed draw rule.
- **Postseason page.** Extend the grouped bracket model so it is driven by the
  season's format (group count, group size, qualifiers per group, win target)
  instead of two fixed groups named E and F. Four Top 16 groups give four
  quarterfinal slots labelled by group place (for example "E1 v F2"), best-of-five
  clinching at three wins, and Final Four slots that follow the recorded games.
  A series leader is not a winner until three wins; a 2-0 or 2-1 lead stays a
  lead. E2009's playoffs have no fifth game recorded; that is a normal result,
  not missing data.
- **Source labels are text, not keys.** Playoff group labels vary by season
  (`QUARTERFINAL 1-4` in E2009, `PLAYOFF A-D` in E2010-E2011) and Final Four
  labels vary (`Semifinal A/B`, `3RD PLACE GAME`). Classify games by verified
  stage and participants, never by one label spelling or array order.
- **Explanations.** Stage and help copy describe RS groups, then four Top 16
  groups of four, top two per group, best-of-five quarterfinals, Final Four.
  No modern global-seed or Play-In wording, and no two-group wording.
- **Other pages.** Confirm and fix only what is wrong for four Top 16 groups of
  four on Standings (group sections, "top two" qualification band, race
  playback), Home, Overview, Games (group filter with groups E-H), team and
  game labels, Leaders and Compare. The unavailable adjusted-rating notes from
  34h-iii must appear where the source reports separate groups.
- **Known data quirk.** E2010 CSKA Moscow finished sixth in its group (3-7), is
  absent from the Top 16, and is correctly shown in the regular season only.
- Verify all four seasons, modern and E2012-E2015 regressions, and
  320/390/768/1024px layouts for the changed pages.

## Out of scope

Qualifying rounds (absent locally; 34n), E2000-E2007 and E2012-E2015 changes
other than shared-model regressions, new formulas, official tiebreaker
reconstruction, global rankings across groups, a live qualification race for
the Top 16, schema/data/pipeline writes, new endpoints or dependencies, Neon
import, push and deployment.

## Build loop

Approve this spec before `/implement`. Build the steps, then present one final
review packet (`stepReview: feature`); checkpoint commits are disabled.
`/complete` creates the final feature commit. Regular audit, Check and try-guide
gates are manual; independent review runs only if the work proves sensitive or
unusually broad.

Archive path `blueprint/history/features/34i-four-group-top-16-and-best-of-five-playoffs.md`
is frozen for attempt 1. No prior matching record or Git use of that path was
found, the archive leaf is absent, and the branch name is valid with no
existing or conflicting local ref. No branch is created by this command.

## Build steps

1. [x] **Record the evidence.** Against the local API (`/api/health` must report
   `"target":"local"`), collect for E2008-E2011 the Top 16 groups and places,
   every quarterfinal pair and series score, and the Final Four games with their
   source labels. Write `blueprint/reference/34i-acceptance.md` with a per-season
   table and the observed pairing pattern, marking anything that does not fit.
   **Done when:** every season has a row for groups, qualifiers, pairs, semifinals,
   final and third place, and each mismatch with the inventory is called out.
   No source change in this step.
2. [x] **Generalise the grouped bracket model.** In
   `frontend/src/postseason/groupedBracket.js` accept the `top16Bo5Playoffs`
   family, take group names, group size and qualifiers from the format and the
   observed Top 16 standings, and build four quarterfinal slots from recorded
   series. Keep the two-group behavior byte-compatible.
   **Done when:** focused model cases pass for all four seasons (recorded pairs,
   labels, 3-win clinch, reversed club order, missing standings or series, a
   pair that does not match group places) and the existing E2012-E2015 and
   modern model cases still pass.
3. [x] **Postseason page.** Select the grouped path for both families in
   `PostseasonPage.jsx`, update stage and help copy for four groups of four, keep
   the link to the Top 16 standings, and keep error and partial-data states.
   **Done when:** each season renders its recorded quarterfinals, semifinals,
   final and champion with accessible matchup labels, with no global seed, Play-In
   or two-group wording, at 320/390/768/1024px.
4. [x] **Remaining pages.** Check Standings (Top 16 groups E-H, top-two band,
   race), Home, Overview, Games, team and game labels, Leaders and Compare for
   the four seasons; fix only confirmed gaps, and record what was checked and
   changed in the acceptance report.
   **Done when:** each page shows four Top 16 groups of four with group-local
   ranks and no combined table, and the modern and E2012-E2015 pages are unchanged.
5. [x] **Browser spec and results.** Add `grouped-four-groups.spec.js` for the
   four seasons (Top 16 groups, quarterfinal pairs, champion and placement,
   Standings, Home, Games filter) and layouts, then fill the acceptance results.
   **Done when:** the new spec plus `grouped-postseason`, `grouped-standings`,
   `grouped-pages`, `postseason`, `postseason-clinch`, `postseason-layout` and
   `responsive` specs pass against the local database, and `npm run build` and
   `npm --prefix frontend run lint` pass.

## Files / areas

`frontend/src/postseason/` (groupedBracket.js, PostseasonPage.jsx, Bracket.jsx
and copy), `frontend/src/lib/seasonFormat.js` if copy needs it,
`frontend/e2e/`, `blueprint/reference/`. Other pages only if step 4 finds a gap.
The backend registry already declares E2008-E2011 (`groupsAndTop16(4, 4, 2)`),
so no backend change is expected.

## Data / contracts

Existing endpoints only: season format, phase standings (RS and TS), postseason
series, games and rounds. Group identity is the observed `groupName`; positions
are group-local and never merged. Quarterfinal pairs come from recorded series;
their group-place labels are shown only when both clubs' Top 16 places confirm
them. No persisted-data change.

## Testing

No unit test command exists. Model cases and browser checks run as Playwright
specs by file name after `/api/health` reports `"target":"local"`. The full
suite is not run unless a shared component, routing, the API client or global
CSS changes. No Neon, production or visual-screenshot evidence will be claimed
unless it is actually run.

## Notes for the AI

- Apply changes to the page being fixed; shared components get opt-in props.
- Prefer the TV code as the short club label.
- Never open the real `.env`.
- Reuse the 34h group helpers; do not hardcode group names or a fixed draw.
- A value the data cannot support stays unavailable, with a reason.

## Open questions

None blocking. Whether E2008 had a qualifying round is not established and is
left to 34n; this leaf shows no qualifying data for any of the four seasons.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8099,"specSha256":"cf80cb3294c0f2e201dd5c96f99235d206f2f163b871890319612520a056f899","branch":"refs/heads/feature/four-group-top-16-and-best-of-five-playoffs","head":"e69509140897ea5877314611dbbae2487fc4610c","baseRef":"refs/heads/master","baseCommit":"e69509140897ea5877314611dbbae2487fc4610c","sourceTree":"bcfb1da2ca6195895205ab3528c89bbf4795e6d8","absentOptional":[]} -->
