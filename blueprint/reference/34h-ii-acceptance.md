# Feature 34h-ii: Top 16 advancement and postseason acceptance

## Scope and collection

Verified on 2026-10-13 through the existing local API and Playwright harness.
`/api/health` reported `target: local` before data/browser runs. No real `.env`,
direct SQL, pipeline command, database mutation, Neon verification, historical
production import, push or deployment was involved.

The leaf adapts Postseason for E2012-E2015, using recorded TS places, PO series
and full FF game records. Existing single-table/Play-In and cancellation paths
remain separate. Other grouped-era pages and qualifying support remain pending.

## Recorded local matrix

In every season, the 16 TS clubs equal the top four of each RS group, and the
eight PO clubs equal the top four of TS groups E/F. The actual quarterfinal
pairs match E1-F4, F1-E4, E2-F3 and F2-E3. Their original club order is not seed
order; the UI uses explicit group-position labels and preserves source IDs.

| Season | Quarterfinal pairs | Recorded semifinals | Champion / runner-up | Played third / fourth |
| --- | --- | --- | --- | --- |
| E2012 | CSK-BAS; BAR-PAN; MAD-TEL; OLY-IST | CSK-OLY; BAR-MAD | OLY / MAD | CSK / BAR |
| E2013 | BAR-GAL; CSK-PAN; MIL-TEL; MAD-OLY | BAR-MAD; CSK-TEL | TEL / MAD | BAR / CSK |
| E2014 | MAD-IST; CSK-PAN; BAR-OLY; ULK-TEL | MAD-ULK; CSK-OLY | MAD / OLY | CSK / ULK |
| E2015 | ULK-MAD; CSK-RED; TIV-BAR; BAS-PAN | ULK-BAS; CSK-TIV | CSK / ULK | TIV / BAS |

The recorded group-position semifinal feeds are consistent across these four
seasons: the E1-F4 and F2-E3 winners meet, and the F1-E4 and E2-F3 winners meet.
The implementation derives links by matching confirmed PO winners to actual FF
participants. It does not hardcode this pattern as a universal/future draw.

FF source group labels are `Group SEMIFINAL A/B`, `Group CHAMPIONSHIP GAME`,
and `Group 3RD PLACE GAME` (E2012-E2014) or `Group THIRD PLACE GAME` (E2015).
E2012/E2013/E2015 use source FF rounds 30/31; E2014 uses 29/30. Round display
names are Semifinal/Final, with championship and placement sharing a round.
Therefore round order alone cannot distinguish the final from third place.

Sources are existing `format`, RS/TS `standings`, `postseason-series`,
`games?phase=FF` and FF `rounds` responses. These checks establish observed
curated application records; they are not a new independent regulations audit.

## Resulting behavior and safeguards

- Top 16 is shown as a table stage, with a link to the existing TS group tables.
  No grouped participant is assigned a modern global 1-8 seed or a Play-In slot.
- Quarterfinal cards use E1/F4-style TS group places. Recorded series remain
  visible if group places are incomplete; they receive recorded-matchup labels
  rather than guessed positions. Contradictory pair evidence does not create
  qualification projections or verified feeder links.
- Three PO wins are required for advancement. A 2-0 or 2-1 leader remains a
  leader. Recorded later participants never manufacture an earlier clinch.
- FF classification requires positive source group labels and a matching
  stage/pair/game identity. Missing, duplicate or ambiguous evidence remains
  unknown. A confirmed one-game result requires a played game with scores
  consistent with the series winner.
- The layout places each quarterfinal next to its verified semifinal feed.
  Unknown paths have no connector lines implying a draw. Actual FF results can
  remain visible when earlier records are partial, with unavailable-data context.
- A played verified final establishes champion and runner-up. Third/fourth are
  shown only when the season permits and records a confirmed played placement
  game. An unplayed/missing placement game yields Final Four participation, not
  exact third/fourth labels; unplayed source scores stay unavailable.
- Grouped pages do not use the global-seed live RacePanel. Season/path changes
  clear selected matchup and club focus. Error/retry states do not select a
  modern fallback bracket, and unavailable-data links point to the relevant stage.
- No source/API/schema contract was changed. A small local grouped model reuses
  existing win-target/score/placement helpers and the existing bracket renderer.

## Verification

- `npm run build`: backend TypeScript and frontend production build passed.
- `npm --prefix frontend run lint`: passed.
- From frontend:
  `npx playwright test grouped-postseason.spec.js postseason.spec.js
  postseason-clinch.spec.js historical-direct-eight.spec.js cancelled-season.spec.js
  postseason-layout.spec.js responsive.spec.js`: 213 passed (1.9 minutes).
- Following the grouped unavailable-data link refinement:
  `npx playwright test grouped-postseason.spec.js`: 11 passed (14 seconds).
  Build and lint passed again.
- Model cases cover reversed club order, duplicate/conflicting pair/rank
  evidence, 2-0/2-1 leads, missing draws/classification, partial records and
  absent/unplayed FF or placement results. Browser cases cover every season,
  actual pair/result identity, retry, detail selection and season switches.
- Both themes passed every season at 320/390/768/1024px without page overflow
  or broken group-position words. Desktop bracket and mobile matchup screenshots
  were visually inspected from the final Playwright run. Image CDN placeholders
  were used for deterministic layout screenshots; production assets are unchanged.
- `git diff --check`: passed.

The first exploratory harness run completed its individual cases but hung during
managed frontend-server cleanup under sandbox restrictions and was interrupted.
The subsequent normal-process-permission runs exited successfully; the results
above refer to those completed runs, not the interrupted exploratory command.

## Remaining scope

34h-iii still owns Home/Overview, team/player statistics, Leaders, comparisons,
archive views and remaining group/scope context. Earlier group eras, qualifying
coverage, source/pipeline gaps and all-season/production acceptance retain their
own planned leaves. This feature does not infer unsupported historical rankings
or future matchup rules from the four completed seasons.
