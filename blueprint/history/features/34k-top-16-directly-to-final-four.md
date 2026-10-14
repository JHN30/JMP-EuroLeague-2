# Feature: Top 16 directly to Final Four

**From build-plan:** feature 34k
**Build attempt:** 1
**Status:** verified
**Branch:** feature/top-16-directly-to-final-four

## Goal

Make the app correct for E2002 and E2003: three regular-season groups of eight
(top five per group plus the best sixth-placed club reach the Top 16, as in
34j), four Top 16 groups of four, and only the winner of each Top 16 group
advancing directly to the Final Four (two semifinals, a third-place game and the
final). There is no quarterfinal round, no playoff column and no playoff
wording. E2003 also has one recorded forfeit with missing performance data.

## In scope

- **Recorded evidence first.** For both seasons, record from the existing API the
  RS groups and best-sixth qualifier, the four Top 16 groups and winners, the
  Final Four games with their source labels, the podium, and the E2003 forfeit
  (Top 16 game 200, Maccabi 20-0 over Pamesa Valencia, `Walkover`, no box score).
  Local data shows the semifinals as SIE-TRE and BAR-CSK (E2002) and SIE-FOR and
  TEL-CSK (E2003); check each against the recorded Top 16 group winners and keep
  any pairing that cannot be matched unverified.
- **Postseason page.** Show the Top 16 as a table stage feeding the Final Four
  directly: two semifinal slots whose participants are labelled by Top 16 group
  place (for example "G1"), the final and the third-place game, with no
  quarterfinal column, no best-of series wording and no Play-In or seed text.
  Pairings come from recorded games and are shown only when both clubs' group
  places confirm them. Reuse the grouped bracket model from 34h-34j; stage and
  help copy are derived from the format.
- **Final Four winners.** One game decides each tie: a played game with
  consistent scores decides the winner, nothing else. The third-place game is
  shown because the format records one; no invented fourth place beyond the
  recorded result.
- **Qualification labels.** Where Standings, Home and other pages name the Top 16
  qualification destination, say "Final Four", not "Playoff": the Top 16 band,
  its cutoff label and the stage description.
- **Best sixth-placed club.** The 34j marker applies unchanged to the RS tables
  of both seasons; verify it names the club recorded in the Top 16.
- **E2003 forfeit.** Game 200 is shown as a recorded forfeit awarded 20-0 with a
  clear note that no box score or performance data exists: on the game page,
  the fixtures list and the Standings context, without claiming it was played
  on court. The standings keep counting the recorded result. Unavailable box
  score sections show an honest empty state, not blanks or zeroes.
- **Other pages.** Confirm and fix only what is wrong for these seasons on Home,
  Overview (road to the title has two games), Games, team and game labels,
  Leaders and Compare. Keep the unavailable adjusted-rating notes where the
  source reports separate groups.
- Verify both seasons, regressions for E2004-E2015 and modern seasons, and
  320/390/768/1024px layouts for the changed pages.

## Out of scope

E2000 and E2001 (34m, 34l, including the E2001 forfeit and no-third-place
rule), qualifying rounds (34n), official tiebreak or best-sixth engines, global
rankings across groups, new formulas, schema/data/pipeline writes, new
endpoints or dependencies, Neon import, push and deployment.

## Build loop

Approve this spec before `/implement`. Build the steps, then present one final
review packet (`stepReview: feature`); checkpoint commits are disabled.
`/complete` creates the final feature commit. Regular audit, Check and try-guide
gates are manual; independent review runs only if the work proves sensitive or
unusually broad.

Archive path `blueprint/history/features/34k-top-16-directly-to-final-four.md`
is frozen for attempt 1. No prior matching record or Git use of that path was
found, the archive leaf is absent, and the branch name is valid with no
existing or conflicting local ref. No branch is created by this command.

## Build steps

1. [x] **Record the evidence.** Against the local API (`/api/health` must report
   `"target":"local"`), collect for E2002 and E2003 the items above and write
   `blueprint/reference/34k-acceptance.md`, including how Postseason, Standings,
   the game page and fixtures currently treat these seasons and the forfeit.
   **Done when:** each season has a row for groups, winners, semifinals, final,
   third place and podium, the forfeit's current display is described, and any
   mismatch with the inventory is called out. No source change in this step.
2. [x] **Direct-to-Final-Four bracket model.** Extend
   `frontend/src/postseason/groupedBracket.js` for the `top16ToFinalFour` family:
   no playoff slots, two semifinals from recorded games labelled by Top 16 group
   place, the final and the third-place game, with the same unverified and
   partial-data behavior as the other grouped families.
   **Done when:** focused model cases pass for both seasons (recorded semifinals,
   final, third place, podium, reversed club order, missing standings or games, a
   pair that does not match group winners) and the E2004-E2015 model cases still
   pass.
3. [x] **Postseason page and qualification copy.** Select the grouped path for the
   family in `PostseasonPage.jsx`, give `Bracket.jsx` a two-column layout with no
   quarterfinal column, and fix the "Playoff" destination wording on Standings and
   related labels from the format.
   **Done when:** both seasons render semifinals, final, champion and third place
   at 320/390/768/1024px with no quarterfinal or best-of wording, and the Top 16
   Standings band reads "Final Four places".
4. [x] **E2003 forfeit and remaining pages.** Add the forfeit context (game page,
   fixtures, Standings notes) and honest empty states for its missing box score;
   check the remaining pages for both seasons and fix only confirmed gaps.
   **Done when:** game 200 reads as a recorded 20-0 forfeit without a box score on
   every page that shows it, E2002 shows no forfeit text, and other pages show
   group-local ranks with no combined table.
5. [x] **Browser spec and results.** Add `grouped-direct-final-four.spec.js` for both
   seasons (bracket, Standings labels and best-sixth marker, forfeit, Home, Games)
   and layouts, then fill in the results.
   **Done when:** the new spec plus `grouped-three-groups`, `grouped-four-groups`,
   `grouped-postseason`, `grouped-standings`, `grouped-pages`, `postseason`,
   `postseason-clinch`, `postseason-layout`, `competition-context` and `responsive`
   specs pass against the local database, and `npm run build` and
   `npm --prefix frontend run lint` pass.

## Files / areas

`frontend/src/postseason/` (groupedBracket.js, PostseasonPage.jsx, Bracket.jsx),
`frontend/src/standings/StandingsPage.jsx` and `frontend/src/lib/seasonFormat.js`
(destination wording, forfeit note), the game page and fixtures components if the
forfeit needs a label, `frontend/e2e/`, `blueprint/reference/`. The backend
registry already declares E2002-E2003 (`top16ToFinalFour` with the walkover
exception), so no backend change is expected.

## Data / contracts

Existing endpoints only: season format (including its exceptions), phase
standings, games, box score, postseason series and rounds. Group identity is the
observed `groupName`; positions are group-local. Semifinal pairings come from
recorded Final Four games. The forfeit is read from the format's `walkover`
exception and the game's `Walkover` status. No persisted-data change.

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
- Reuse the 34h-34j group helpers; do not hardcode group names or draws.
- A value the data cannot support stays unavailable, with a reason.

## Open questions

None blocking. The source's reason for the E2003 forfeit (Valencia did not
travel) comes from press reports in the inventory, so the note describes the
recorded result and missing box score and does not assert a cause.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8458,"specSha256":"c447093d8950c894873a1ab662b3b0b3f96bbea0c2a1aa77d1d3660dfae656d1","branch":"refs/heads/feature/top-16-directly-to-final-four","head":"9aae309273910005fe13c4644d7d641ea2b84c40","baseRef":"refs/heads/master","baseCommit":"9aae309273910005fe13c4644d7d641ea2b84c40","sourceTree":"91271aece4d40e054af99ae7af55cb8d3e94f055","absentOptional":[]} -->
