# Feature: Thirty-two-team season

**From build-plan:** feature 34l
**Build attempt:** 1
**Status:** verified
**Branch:** feature/thirty-two-team-season

## Goal

Make the app correct for E2001: 32 clubs in four regular-season groups of eight
(14 games per club), the top four of each group in four Top 16 groups of four
(6 games per club), and only the winner of each Top 16 group reaching the Final
Four directly. The Final Four has two semifinals and a final, and no third-place
game. One Top 16 game is a recorded forfeit. This season shares the E2002-E2003
format family handled in 34k, so most pages should already work; this leaf proves
that, fixes what differs, and keeps third/fourth place unclassified.

## In scope

- **Recorded evidence first.** Record from the existing API the four RS groups of
  eight with their top four, the four Top 16 groups (E-H) and winners, the three
  Final Four games (semifinals TRE-VIR and PAN-TEL, final PAN 89-83 VIR in the
  local data), the podium that can be established, and the forfeit (Top 16 game
  264, Maccabi 2-0 over Ulker, `Walkover`, no box score). Check the semifinal
  pairs against the recorded group winners; keep any that do not match
  unverified.
- **No third-place game.** The format records none, so Postseason shows champion
  and runner-up, labels the two semifinal losers "Final Four" only, and invents no
  third or fourth place, third-place slot or classification, in the bracket, the
  champion panel and the help copy.
- **Regular season of four groups of eight.** Standings, Race, Home, Games filter
  and team labels show eight-club groups with a top-four "Top 16 places" band and
  no best-sixth marker (this season has no cross-group place; the 34j marker must
  not appear).
- **Forfeit and its statistics.** Game 264 reads as a recorded 2-0 forfeit on its
  game page, fixture card and the Top 16 Standings, as built in 34k. Check, for
  both E2001 and E2003 (the 34k forfeit was not checked here), how its empty team
  rows affect team statistics, per-game averages, leaders, Records and head to
  head, and fix any place where a forfeit with no recorded performance is
  counted as a played game with zero stats. The recorded result still counts in
  the standings.
- **32-club wording.** Anything that assumes 24 clubs (team counts, "of 24" style
  wording, picker lists, leaders pools) is derived from the data or format.
- **Other pages.** Confirm and fix only what is wrong for this season on Overview
  (road to the title has two games), Leaders, Compare and team and game pages.
  Keep the unavailable adjusted-rating notes where the source reports separate
  groups.
- Verify the season, regressions for E2002-E2015 and modern seasons, and
  320/390/768/1024px layouts for the changed pages.

## Out of scope

E2000 (34m), qualifying rounds and the 41-entrant history (34n, shown as absent
data there), an official third/fourth classification, global rankings across
groups, new formulas, schema/data/pipeline writes, new endpoints or
dependencies, Neon import, push and deployment.

## Build loop

Approve this spec before `/implement`. Build the steps, then present one final
review packet (`stepReview: feature`); checkpoint commits are disabled.
`/complete` creates the final feature commit. Regular audit, Check and try-guide
gates are manual; independent review runs only if the work proves sensitive or
unusually broad.

Archive path `blueprint/history/features/34l-thirty-two-team-season.md` is frozen
for attempt 1. No prior matching record or Git use of that path was found, the
archive leaf is absent, and the branch name is valid with no existing or
conflicting local ref. No branch is created by this command.

## Build steps

1. [x] **Record the evidence.** Against the local API (`/api/health` must report
   `"target":"local"`), collect the items above for E2001, and measure how the
   forfeit rows (E2001 game 264, E2003 game 200) appear in team statistics,
   leaders, Records and head to head. Write `blueprint/reference/34l-acceptance.md`
   with a table, the current treatment of each page, and any mismatch.
   **Done when:** the report covers groups, winners, semifinals, final, the
   absent third-place game, the forfeit and each statistics surface, and says what
   needs a fix. No source change in this step.
2. [x] **No third place.** Make Postseason, its champion panel and copy correct
   with no third-place game, without changing seasons that have one.
   **Done when:** E2001 shows champion, runner-up and two "Final Four" clubs with
   no third-place slot or wording, and E2002-E2015 still show their third place.
3. [x] **Forfeit statistics.** Fix the places step 1 shows to count a forfeit as
   played with zero stats, for E2001 and E2003, with an honest note where a number
   excludes it.
   **Done when:** a club's per-game numbers, leaders and records for the affected
   season do not include the forfeit as a zero game, the standings still count its
   result, and unaffected seasons are unchanged.
4. [x] **Remaining pages.** Check the pages listed above for E2001 and fix only
   confirmed gaps, including any 24-club assumption.
   **Done when:** each page shows four groups of eight and four of four with
   group-local ranks, no best-sixth marker and no combined table.
5. [x] **Browser spec and results.** Add `grouped-thirty-two.spec.js` for E2001
   (bracket and podium, Standings, forfeit, Home, Games, team counts) and layouts,
   then fill in the results.
   **Done when:** the new spec plus `grouped-direct-final-four`,
   `grouped-three-groups`, `grouped-four-groups`, `grouped-postseason`,
   `grouped-standings`, `grouped-pages`, `postseason`, `postseason-layout` and
   `responsive` specs pass against the local database, and `npm run build` and
   `npm --prefix frontend run lint` pass.

## Files / areas

`frontend/src/postseason/` (groupedBracket.js, ChampionPanel.jsx, PostseasonPage.jsx,
Bracket.jsx), `frontend/src/lib/seasonFormat.js`, statistics and leaders code if
step 1 shows a forfeit effect (`frontend/src/leaders/`, `frontend/src/teams/`,
`frontend/src/records/`; the API only if the response cannot be corrected in the
client, which would be proposed first), `frontend/e2e/`, `blueprint/reference/`.
The backend registry already declares E2001 (`top16ToFinalFour`, no third-place
game, walkover exception).

## Data / contracts

Existing endpoints only: season format and exceptions, phase standings, games,
box score, team and player statistics, postseason series. Group identity is the
observed `groupName`; positions are group-local. A forfeit is identified by the
game's `Walkover` status and the format's exception. No persisted-data change.

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
- Reuse the 34h-34k group helpers; do not hardcode group names or draws.
- A value the data cannot support stays unavailable, with a reason.

## Open questions

None blocking. The local data has no qualifying rounds (41 entrants in the
source, 32 in the regular season); that stays with 34n. The forfeit's cause is
not asserted.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7571,"specSha256":"9759cb7ca230e4c5d26cd80199232f48622408d45cdffa98bdbe64965c20b253","branch":"refs/heads/feature/thirty-two-team-season","head":"27362f2a6a4e2cdfee4882aae09970fb17c3c5e5","baseRef":"refs/heads/master","baseCommit":"27362f2a6a4e2cdfee4882aae09970fb17c3c5e5","sourceTree":"4c088678a086fbd47495eeccffbfcd2f69781a4e","absentOptional":[]} -->
