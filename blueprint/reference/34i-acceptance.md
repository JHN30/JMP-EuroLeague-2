# Feature 34i: Four-group Top 16 and best-of-five playoffs acceptance

## Recorded evidence (step 1)

Collected on 2026-10-14 from the existing local API (`/api/health` reported
`target: local`) through the `phases/TS/standings`, `postseason-series`,
`games?phase=FF` and `games?phase=PO` reads. No database write, pipeline
command, Neon access or real `.env` read was involved. These are observed curated
application records, not a new independent regulations audit.

In every season the Top 16 has four groups E-H of four clubs, each with six games
played (latest round 16), and the quarterfinals are four best-of-five series.

### Top 16 group places (position:club)

| Season | E | F | G | H |
| --- | --- | --- | --- | --- |
| E2008 | 1 OLY, 2 BAS, 3 MIL, 4 SOP | 1 BAR, 2 MAD, 3 TEL, 4 BER | 1 PAN, 2 PAR, 3 MAL, 4 ROM | 1 CSK, 2 SIE, 3 CIB, 4 ULK |
| E2009 | 1 BAR, 2 PAR, 3 PAN, 4 MAR | 1 TEL, 2 MAD, 3 SIE, 4 IST | 1 CSK, 2 SOP, 3 MAL, 4 ZAL | 1 OLY, 2 BAS, 3 KHI, 4 CIB |
| E2010 | 1 BAS, 2 PAN, 3 LIE, 4 MAL | 1 BAR, 2 TEL, 3 ROM, 4 LJU | 1 MAD, 2 SIE, 3 IST, 4 PAR | 1 OLY, 2 PAM, 3 ULK, 4 ZAL |
| E2011 | 1 CSK, 2 OLY, 3 GAL, 4 IST | 1 SIE, 2 BIL, 3 MAD, 4 MAL | 1 PAN, 2 UNK, 3 MIL, 4 ULK | 1 BAR, 2 TEL, 3 CTU, 4 ZAL |

### Quarterfinals (club A wins - club B wins) and the Top 16 places they match

| Season | Pairs (group places) |
| --- | --- |
| E2008 | MAD 1-3 OLY (F2 v E1); BAR 3-2 BAS (F1 v E2); PAN 3-1 SIE (G1 v H2); CSK 3-0 PAR (H1 v G2) |
| E2009 | BAR 3-1 MAD (E1 v F2); PAR 3-1 TEL (E2 v F1); BAS 1-3 CSK (H2 v G1); OLY 3-1 SOP (H1 v G2) |
| E2010 | BAS 1-3 TEL (E1 v F2); BAR 1-3 PAN (F1 v E2); MAD 3-2 PAM (G1 v H2); OLY 1-3 SIE (H1 v G2) |
| E2011 | BIL 1-3 CSK (F2 v E1); OLY 3-1 SIE (E2 v F1); PAN 3-2 TEL (G1 v H2); BAR 3-0 UNK (H1 v G2) |

The inventory's pattern holds in all four seasons: each pair is the winner of one
Top 16 group against the runner-up of another group, and the groups pair as E with
F and G with H. E2009 has four-game series only (no fifth game), a normal result.
Source playoff labels differ by season (`Quarterfinal 1-4` in E2008, `QUARTERFINAL
1-4` in E2009, `PLAYOFF A-D` in E2010-E2011) and are text only.

### Final Four

| Season | Semifinals (source label) | Final | Third place |
| --- | --- | --- | --- |
| E2008 | OLY 82-84 PAN (Semifinal A); BAR 78-82 CSK (Semifinal B) | PAN 73-71 CSK | BAR 95-79 OLY |
| E2009 | BAR 64-54 CSK (SEMIFINAL A); PAR 80-83 OLY (SEMIFINAL B) | BAR 86-68 OLY | CSK 90-88 PAR |
| E2010 | TEL 82-63 MAD (SEMIFINAL A); PAN 77-69 SIE (SEMIFINAL B) | PAN 78-70 TEL | SIE 80-62 MAD |
| E2011 | CSK 66-64 PAN (SEMIFINAL A); OLY 68-64 BAR (SEMIFINAL B) | OLY 62-61 CSK | BAR 74-69 PAN |

Podiums (1st-4th): E2008 PAN, CSK, BAR, OLY; E2009 BAR, OLY, CSK, PAR; E2010 PAN,
TEL, SIE, MAD; E2011 OLY, CSK, BAR, PAN. Each semifinal joins the winners of one
E/F quarterfinal and one G/H quarterfinal.

Mismatches with the inventory: none. The two-group assumptions (groups `E`/`F`
only, positions 1-4 summing to five, a bracket from two groups) are the only
obstacle, and they live in `frontend/src/postseason/groupedBracket.js`.

## Results

Verified on 2026-10-14 against the local database (`/api/health` reported
`target: local`). No Neon, pipeline, database write or deployment was involved.

Changes:
- `groupedBracket.js` accepts the `top16Bo5Playoffs` family. Group names, group
  count, group size and qualifiers per group come from the format and the
  observed Top 16 standings, so no group names or sizes are fixed. A quarterfinal
  pairs a group's place n with another group's place (qualifiers + 1 - n), which
  gives 1-4 and 2-3 of eight in E2012-E2015 and 1-2 of four in E2008-E2011.
  Pairs still come only from recorded series.
- `PostseasonPage.jsx` selects the grouped path for both families and describes
  the Top 16 stage ("Four groups; top two per group reach the Playoffs") from the
  format. The group-place label example in the help copy is taken from the bracket.
- Step 4 found no gap on Standings, Home, Overview, Games, Leaders or Compare:
  the generic group handling from 34h and 34h-iii already covers four Top 16
  groups of four (checked by the new spec).

Checks run:
- `npx playwright test grouped-four-groups.spec.js`: 24 passed (model cases per
  season, Postseason page, Standings, Home, Games filter, Overview, Leaders,
  Compare, and four widths).
- `grouped-postseason`, `grouped-standings`, `grouped-pages`, `postseason`,
  `postseason-clinch`, `postseason-layout`, `historical-direct-eight` and
  `responsive` specs: 255 passed.
- A desktop screenshot of E2008's Postseason was inspected: four quarterfinals feed
  two semifinals, the final and a third-place game.
- `npm run build` and `npm --prefix frontend run lint`: passed.

Not run: the full suite, Neon/production checks, and visual inspection of the other
seasons and widths.
