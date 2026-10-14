# Feature 34j: Three regular-season groups and best-of-three playoffs acceptance

## Recorded evidence (step 1)

Collected on 2026-10-14 from the existing local API (`/api/health` reported
`target: local`) through `phases/RS/standings`, `phases/TS/standings`,
`postseason-series` and `games?phase=FF`. No database write, pipeline command,
Neon access or real `.env` read was involved. These are observed curated
application records, not a new independent regulations audit.

In every season the regular season is three groups A-C of eight (14 games each),
the Top 16 is four groups D-G of four (6 games each), and the quarterfinals are
four best-of-three series.

### Sixth place and the best-sixth qualifier

| Season | Sixth-placed clubs (record, point difference) | In the Top 16 |
| --- | --- | --- |
| E2004 | A EST 4-10 -35; B PES 7-7 -52; C MAL 6-8 +6 | PES (Top 16 group E, place 2) |
| E2005 | A LJU 5-9 -21; B CIB 6-8 -137; C SIE 4-10 -54 | CIB (group G, place 4) |
| E2006 | A FOR 5-9 -61; B PAR 6-8 +7; C NAP 6-8 -61 | PAR (group E, place 3) |
| E2007 | A LJU 4-10 -117; B CIB 4-10 -108; C ROM 6-8 -25 | ROM (group G, place 4) |

Exactly one sixth-placed club reaches the Top 16 in every season, matching the
inventory. The point differences above are the standings' own values; the
inventory's "best record, then point difference" reading is not applied by the app,
and no regulation stating the cross-group criterion was found.

### Top 16 groups and quarterfinals

| Season | Quarterfinals (club A wins - club B wins) | Group places |
| --- | --- | --- |
| E2004 | PES 0-2 TEL; CSK 2-0 ULK; IST 1-2 PAN; BAS 2-0 TRE | TEL D1 v PES E2; CSK E1 v ULK D2; PAN F1 v IST G2; BAS F2 v TRE G1 |
| E2005 | BAR 2-1 MAD; OLY 1-2 TEL; CSK 2-0 IST; BAS 2-1 PAN | BAR D1 v MAD E2; TEL E1 v OLY D2; CSK F1 v IST G2; BAS F2 v PAN G1 |
| E2006 | BAS 2-0 OLY; CSK 2-1 TEL; DYN 0-2 PAN; BAR 1-2 MAL | BAS D1 v OLY E2; CSK E1 v TEL D2; PAN F1 v DYN G2; BAR F2 v MAL G1 |
| E2007 | SIE 2-0 ULK; BAS 2-1 PAR; BAR 1-2 TEL; CSK 2-1 OLY | SIE D1 v ULK E2; BAS E1 v PAR D2; TEL F1 v BAR G2; CSK G1 v OLY F2 |

Series last two or three games, and a series is decided at two wins. In every
season each pair is the winner of one Top 16 group against the runner-up of another,
and the groups pair as D with E and F with G. E2005 group G finished 3-3 for all
four clubs; the stored official order PAN, IST, TRE, CIB is used as is.

### Final Four

| Season | Semifinals | Final | Third place |
| --- | --- | --- | --- |
| E2004 | TEL 91-82 PAN; CSK 78-85 BAS | TEL 90-78 BAS | CSK 91-94 PAN |
| E2005 | TEL 85-70 BAS; BAR 75-84 CSK | CSK 73-69 TEL | BAR 82-87 BAS |
| E2006 | PAN 67-53 BAS; CSK 62-50 MAL | PAN 93-91 CSK | BAS 74-76 MAL |
| E2007 | SIE 85-92 TEL; BAS 79-83 CSK | TEL 77-91 CSK | SIE 97-93 BAS |

Podiums (1st-4th): E2004 TEL, BAS, PAN, CSK; E2005 CSK, TEL, BAS, BAR; E2006 PAN,
CSK, MAL, BAS; E2007 CSK, TEL, SIE, BAS.

Mismatches with the inventory: none.

### Current treatment of the best-sixth rule

The registry records the RS qualification as places 1-5 per group plus a
cross-group rule (`bestOfPosition: 6`, `criterion: null`). `tableTiers(..., "group")`
returned null for any season whose rules included the cross-group rule, so these
seasons' grouped Standings had no qualification band, no group cutoff line in the
Race view and no qualified flags. The Postseason page also listed only the
best-of-five families.

## Results

Verified on 2026-10-14 against the local database (`/api/health` reported
`target: local`). No Neon, pipeline, database write or deployment was involved.

Changes:
- `seasonFormat.js`: `tableTiers(..., "group")` ignores the cross-group rule, so
  places 1-5 of each group get their band; new `crossGroupQualifier` and
  `crossGroupQualifiers` name the best-sixth club from the next stage's recorded
  clubs only (nobody is marked while that evidence is missing, and the candidates
  are never ranked).
- Standings: grouped RS tables for these seasons show the "Top 16 places" band, a
  "Best 6th" badge (with screen-reader text) and a Q flag on the one marked club, and
  the heading "Outside the group places (one sixth-placed club also qualified)".
  The criterion is never stated.
- Postseason: `top16Bo3Playoffs` joins the grouped bracket families; the Playoffs
  column heading and the help copy take the series length and win count from the
  format ("Best of 3", "best-of-three", "Two wins").
- Step 4 found no other gap: Home, Overview, Games filter, team and game labels,
  Leaders and Compare already handle groups of eight and four Top 16 groups.

Checks run:
- `npx playwright test grouped-three-groups.spec.js`: 25 passed (tier and
  qualifier logic, per-season bracket, one-game-lead cases, Standings marker,
  Postseason copy, Top 16 groups, Home, Games, Overview, four widths).
- `grouped-four-groups`, `grouped-postseason`, `grouped-standings`, `grouped-pages`,
  `postseason`, `postseason-clinch`, `postseason-layout`, `historical-direct-eight`,
  `historical-era-pages` and `responsive` specs: 285 passed.
- A desktop screenshot of E2004 group B Standings was inspected: places 1-5 under the
  Top 16 band, Pesaro (6th) badged and flagged, the other sixth-placed clubs not.
- `npm run build` and `npm --prefix frontend run lint`: passed.

Not run: the full suite, Neon/production checks, and visual inspection of the other
seasons, the Race view band and narrow widths beyond the overflow check.
