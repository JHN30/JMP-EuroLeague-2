# Historical season data and format inventory (E2000-E2026)

Feature 34a. Developer evidence for feature 34's later leaves; not a product page and not an executable format
registry. Later leaves update the entries for their own seasons.

## 1. Evidence boundary

| Item | Value |
| --- | --- |
| Collected | 2026-10-12 |
| Database target | Local. The running dev backend's `GET /api/health` answered `{"status":"ok","database":"connected","target":"local"}` before every collection run; the scripts refuse to run otherwise. |
| Schema | The local `app_*` tables in `LOCAL_DB_SCHEMA` (default `gold`, `backend/src/config/env.ts`). The configured value was not read: `.env` was not opened. |
| Method | Read-only `GET` requests to the local API (`/api/seasons/...`) for all 27 seasons. No direct SQL connection (no credentials are read; see section 13). |
| Not done | No Neon connection or Neon-target run, no publisher run, no ETL, no schema/data change, no app code change, no browser run. The pipeline repository (`postgres_etl`, `gold_etl`, `neon_publish`) is outside this workspace and was not read. |

Labels used below:

- **[S]** historical fact from a cited source (section 14).
- **[L]** observed in the local application data through the API on the date above.
- **[D]** documented claim (`DATA_DICTIONARY.md`, `euroleague_historical_formats.md` "the guide", or code comments), not
  independently re-verified here.
- **[O]** open: unverified, conflicting or missing evidence. Never encode an [O] item as an authoritative rule.

## 2. Summary

- **[L]** All 27 seasons `E2000`-`E2026` exist locally and every season route answers `200`. Every season has its main
  competition's games, rounds, official standings snapshots, box scores and period scores. No season has a qualifying
  phase or any qualifying game.
- **[L]** Phase codes in the data: `RS` (all), `TS` Top 16 (`E2001`-`E2015`), `PO` (`E2000`, `E2004`-`E2018`,
  `E2020`-`E2025`), `PI` (`E2023`-`E2025`), `FF` (`E2001`-`E2018`, `E2020`-`E2025`). `E2019` and `E2026` hold only `RS`.
- **[L]+[S]** Every recorded competition winner matches history (`E2000` Kinder Bologna 3-2 v Tau; `E2019` none).
- **[L]** The guide's era table agrees with the observed stage structure in every season, with the corrections in
  section 4.
- The main implementation risks are application contracts rather than missing games: Top 16 (`TS`) is not a supported
  statistics scope, the frontend maps every non-`RS` phase to `PS`, unplayed `E2019` and cancelled `E2021` games are
  served as "scheduled", `basic.qualified` is `false` for every club before `E2015`, and the `E2021` standings snapshots
  are not round-aligned (section 7).

## 3. Season matrix (observed local data)

"Series" counts `app_postseason_series` rows per phase with the distinct numbers of games per pairing in brackets.
"Winner" is the winner of the season's last recorded series (the final). Source rounds are the stored
`round_number` values, continuous across phases within a season.

| Season | Clubs | Phases: played/total games (source rounds) | Groups / tables (latest standings) | Standings snapshots | Series (games per pairing) | Game statuses | Winner |
|---|---:|---|---|---|---|---|---|
| E2000 | 24 | RS 120/120 (r1-10); PO 38/38 (r11-22) | RS Ax6 Bx6 Cx6 Dx6 | RS 10/10 (latest r10) | PO 15 [2/3/5] | Confirmed 158 | VIR |
| E2001 | 32 | RS 224/224 (r1-14); TS 48/48 (r15-20); FF 3/3 (r21-22) | RS Ax8 Bx8 Cx8 Dx8; TS Ex4 Fx4 Gx4 Hx4 | RS 14/14; TS 6/6 (latest r20) | FF 3 [1] | Confirmed 274, Walkover 1 | PAN |
| E2002 | 24 | RS 168/168 (r1-14); TS 48/48 (r15-20); FF 4/4 (r21-22) | RS Ax8 Bx8 Cx8; TS Dx4 Ex4 Fx4 Gx4 | RS 14/14; TS 6/6 | FF 4 [1] | Confirmed 220 | BAR |
| E2003 | 24 | RS 168/168 (r1-14); TS 48/48 (r15-20); FF 4/4 (r21-22) | RS Ax8 Bx8 Cx8; TS Dx4 Ex4 Fx4 Gx4 | RS 14/14; TS 6/6 | FF 4 [1] | Confirmed 219, Walkover 1 | TEL |
| E2004 | 24 | RS 168/168 (r1-14); TS 48/48 (r15-20); PO 9/9 (r21-23); FF 4/4 (r24-25) | RS Ax8 Bx8 Cx8; TS Dx4 Ex4 Fx4 Gx4 | RS 14/14; TS 6/6 | PO 4 [2/3]; FF 4 [1] | Confirmed 229 | TEL |
| E2005 | 24 | RS 168/168; TS 48/48 (r15-20); PO 11/11 (r21-23); FF 4/4 (r24-25) | as E2004 | RS 14/14; TS 6/6 | PO 4 [2/3]; FF 4 [1] | Confirmed 231 | CSK |
| E2006 | 24 | RS 168/168; TS 48/48; PO 10/10 (r21-23); FF 4/4 (r24-25) | as E2004 | RS 14/14; TS 6/6 | PO 4 [2/3]; FF 4 [1] | Confirmed 230 | PAN |
| E2007 | 24 | RS 168/168; TS 48/48; PO 11/11 (r21-23); FF 4/4 (r24-25) | as E2004 | RS 14/14; TS 6/6 | PO 4 [2/3]; FF 4 [1] | Confirmed 231 | CSK |
| E2008 | 24 | RS 120/120 (r1-10); TS 48/48 (r11-16); PO 16/16 (r17-21); FF 4/4 (r22-23) | RS Ax6 Bx6 Cx6 Dx6; TS Ex4 Fx4 Gx4 Hx4 | RS 10/10; TS 6/6 (latest r16) | PO 4 [3/4/5]; FF 4 [1] | Confirmed 188 | PAN |
| E2009 | 24 | RS 120/120; TS 48/48; PO 16/16 (r17-20); FF 4/4 (r22-23) | as E2008 | RS 10/10; TS 6/6 | PO 4 [4]; FF 4 [1] | Confirmed 188 | BAR |
| E2010 | 24 | RS 120/120; TS 48/48; PO 17/17 (r17-21); FF 4/4 (r22-23) | as E2008 | RS 10/10; TS 6/6 | PO 4 [4/5]; FF 4 [1] | Confirmed 189 | PAN |
| E2011 | 24 | RS 120/120; TS 48/48; PO 16/16 (r17-21); FF 4/4 (r22-23) | as E2008 | RS 10/10; TS 6/6 | PO 4 [3/4/5]; FF 4 [1] | Confirmed 188 | OLY |
| E2012 | 24 | RS 120/120 (r1-10); TS 112/112 (r11-24); PO 17/17 (r25-29); FF 4/4 (r30-31) | RS Ax6 Bx6 Cx6 Dx6; TS Ex8 Fx8 | RS 10/10; TS 14/14 (latest r24) | PO 4 [3/4/5]; FF 4 [1] | Confirmed 253 | OLY |
| E2013 | 24 | RS 120/120; TS 112/112; PO 17/17 (r25-29); FF 4/4 (r30-31) | as E2012 | RS 10/10; TS 14/14 | PO 4 [3/4/5]; FF 4 [1] | Confirmed 253 | TEL |
| E2014 | 24 | RS 120/120; TS 112/112; PO 15/15 (r25-28); FF 4/4 (r29-30) | as E2012 | RS 10/10; TS 14/14 | PO 4 [3/4]; FF 4 [1] | Confirmed 251 | MAD |
| E2015 | 24 | RS 120/120; TS 112/112; PO 14/14 (r25-29); FF 4/4 (r30-31) | as E2012 | RS 10/10; TS 14/14 | PO 4 [3/5]; FF 4 [1] | Confirmed 250 | CSK |
| E2016 | 16 | RS 240/240 (r1-30); PO 15/15 (r31-35); FF 4/4 (r36-37) | RS table x16 | RS 30/30 | PO 4 [3/4/5]; FF 4 [1] | Confirmed 259 | ULK |
| E2017 | 16 | RS 240/240 (r1-30); PO 16/16 (r31-34); FF 4/4 (r35-36) | RS table x16 | RS 30/30 | PO 4 [4]; FF 4 [1] | Confirmed 260 | MAD |
| E2018 | 16 | RS 240/240 (r1-30); PO 16/16 (r31-35); FF 4/4 (r36-37) | RS table x16 | RS 30/30 | PO 4 [3/4/5]; FF 4 [1] | Confirmed 260 | CSK |
| E2019 | 18 | RS 252/306 (r1-34) | RS table x18 | RS 28/34 (latest r28) | none | Confirmed 252, Confirmed unplayed 54 | none |
| E2020 | 18 | RS 306/306 (r1-34); PO 18/18 (r35-39); FF 4/4 (r40-41) | RS table x18 | RS 34/34 | PO 4 [3/5]; FF 4 [1] | Confirmed 328 | IST |
| E2021 | 18 | RS 278/306 (r1-34); PO 17/17 (r35-39); FF 4/4 (r40-41) | RS table x15 | RS 34/34 (not round-aligned, 7.6) | PO 4 [3/4/5]; FF 4 [1] | Confirmed 299, Cancelled unplayed 28 | IST |
| E2022 | 18 | RS 306/306 (r1-34); PO 18/18 (r35-39); FF 4/4 (r40-41) | RS table x18 | RS 34/34 | PO 4 [3/5]; FF 4 [1] | Confirmed 328 | MAD |
| E2023 | 18 | RS 306/306; PI 3/3 (r35-36); PO 18/18 (r37-41); FF 4/4 (r42-43) | RS table x18 | RS 34/34 | PI 3 [1]; PO 4 [3/5]; FF 4 [1] | Confirmed 331 | PAN |
| E2024 | 18 | RS 306/306; PI 3/3 (r35-36); PO 17/17 (r37-41); FF 4/4 (r42-43) | RS table x18 | RS 34/34 | PI 3 [1]; PO 4 [3/4/5]; FF 4 [1] | Confirmed 330 | ULK |
| E2025 | 20 | RS 380/380 (r1-38); PI 3/3 (r39-40); PO 16/16 (r41-45); FF 3/3 (r46-47) | RS table x20 | RS 38/38 | PI 3 [1]; PO 4 [3/4/5]; FF 3 [1] | Confirmed 402 | OLY |
| E2026 | 20 | RS 40/380 (r1-38) | RS table x20 | RS 4/38 (latest r4) | none | Confirmed 40, Confirmed unplayed 340 | none (ongoing) |

Main-competition clubs equal the clubs in that season's games and `/teams` in every season [L]. There are no
qualifying-only clubs locally because there are no qualifying games (section 6).

## 4. Corrections to the guide (`euroleague_historical_formats.md`)

| Guide statement | Finding | Status |
| --- | --- | --- |
| E2000: "Best-of-3 knockout rounds; best-of-5 semifinals and final" | Round of 16 and quarterfinals best-of-three, semifinals and final best-of-five. Local: 8 R16 pairings (2-3 games), 4 QF (2-3), 2 SF (3), final 5 games, Kinder (`VIR`) 3-2 over Tau (`BAS`), game scores match the source. | [S]+[L] confirmed |
| E2000 "No Top 16" | The source's own rules text calls the 16-team first knockout round the "Top 16"; it is a best-of-three knockout, not a group stage. Locally it is part of `PO` (groups `First Round 1`-`8`). | [S]+[L] |
| E2001-E2003 "Top 16 group winners qualify directly for Final Four" | Confirmed locally for all three seasons (only group rank 1 reaches `FF`). | [S]+[L] |
| E2002 "top five in each group plus the best sixth-place team; validate the cross-group comparison" | Holds for E2002-E2007 (section 5.3). The cross-group comparison rule is not stated by any source found. | [L]; rule [O] |
| E2004-E2007 "Top 16: 4 groups of 4 → best-of-3 quarterfinals" | Top two per Top 16 group reach best-of-three quarterfinals; group winner v runner-up of another group, winner at home [S]. Local QF pairings and lengths agree. | [S]+[L] |
| E2008 "regular season becomes four groups of six; quarterfinals become best-of-five" | Confirmed locally (RS 4x6; PO up to 5 games, top four per RS group to Top 16, top two per Top 16 group to PO). | [S]+[L] |
| E2012 "Top 16 becomes two groups of eight, 14 games" | Confirmed locally (TS 112 games, groups E and F of 8; top four each to PO). | [S]+[L] |
| E2019 "Incomplete (28-29 played)" | Every club played exactly 28 games. Rounds 29-34 (54 games) are unplayed, and the latest standings snapshot is round 28. | [L] correction |
| E2021 "18 initially; official totals affected by annulled games" | 18 original clubs; 15 in the final table with 28 counted games each (210 games among them). The 68 played and 28 cancelled games involving CSKA, UNICS and Zenit are not counted in the final table. | [S]+[L] |
| E2025 / E2026 "Same format planned" | E2025's Final Four had no third-place game (3 FF games) [L], and the source says the 2026 Final Four in Athens replaced it [S]. A third-place game is therefore per season, not per era. E2026's Final Four policy is unknown. | [S]+[L]; E2026 [O] |
| "Qualification stages: some seasons had preliminary qualification" | Qualifying rounds existed in E2001 and from E2009 [S]; none are in the local data. | [S]; local gap |
| (absent) E2000 semifinal replay | AEK v Tau semifinal game 2 (AEK 75-74 OT) was ordered replayed after appeal; Tau won the series 3-0 [S]. Locally the series is 3 games, all Tau wins (`162`, `163`, `164`). Game codes `160` and `161` are absent, and nothing records the replay. | [S]+[L]; mapping [O] |

## 5. Per-season entries

Format statements cite section 14. "Leaf" names the feature-34 leaf that owns the season.

### 5.1 E2000 (2000-01) - leaf 34m

- Expected [S]: ULEB Euroleague, 24 clubs, four groups of six (10 games); top four per group to a 16-club
  best-of-three first round, best-of-three QF, best-of-five SF and final. No Final Four. Separate FIBA SuproLeague
  excluded (not in local data).
- Observed [L]: `RS` groups A-D x6, 120 games; `PO` 38 games in groups `First Round 1-8`, `First Round Final`
  (game 140, the third LJU-PAO game), `Quarterfinal 1-4`, `Semifinal 1-2`, `Final`. Source round numbers do not
  identify stages: `PO` rounds 11-17 and 22 (`app_rounds` names "Game 1".."Game 8") mix stages; all six SF games are
  round 17 and all five final games round 22. Group rank 1-4 of every RS group reached `PO` (16 clubs).
- Exceptional: SF game-2 replay (section 4). Missing game codes 137-139, 141-144, 150, 153, 160, 161 are
  presumably unneeded series games; not proven [O].
- Verification: format [S]+[L] verified; replay mapping [O]; tiebreak order quoted by the source (head-to-head, point
  differences, points scored, quotient) [S], not re-applied.

### 5.2 E2001 (2001-02) - leaf 34l

- Expected [S]: 41 entrants including qualifying rounds; 32 in the regular season, four groups of eight (14 games), top
  four per group to four Top 16 groups of four; group winners to the Bologna Final Four. No third-place game
  (corroborated by the source calling 2026 the second Final Four without one).
- Observed [L]: `RS` 4x8, 224 games; `TS` E-H x4, 48 games; `FF` 3 games (SF A, SF B, `CHAMPIONSHIP GAME`), Panathinaikos
  89-83 Kinder. Positions 1-4 of each RS group are exactly the TS field.
- Exceptional: Maccabi v Ülker, `TS` round 19, game 264, status `Walkover`, 2-0 [S]+[L]; the source attributes it to
  Ülker's withdrawal from that game. No player box score; team rows exist with no values (section 7.7).
- Qualifying games: absent locally (34n).
- Verification: format verified; exact third/fourth classification not available [O].

### 5.3 E2002-E2007 (three groups of eight) - leaves 34k (E2002-E2003) and 34j (E2004-E2007)

Common [S]: 24 clubs, three groups of eight (14 games); top five per group plus the best sixth-placed club form 16 Top 16
clubs in four groups of four (6 games). Top 16 draw: one club per pot; no more than two from the same RS group or country
in one group (RS-group rule first) [S, E2003 and E2004 articles]. E2002 had no qualifying round [S].

Best-sixth comparison observed locally [L]:

| Season | Sixth-placed clubs (record, RS point difference) | Qualified |
| --- | --- | --- |
| E2002 | PAU 6-8 -48; SIE 6-8 +40; MAD 6-8 -19 | SIE |
| E2003 | AEK 6-8 -33; ZAL 6-8 0; WRO 6-8 -53 | ZAL |
| E2004 | EST 4-10; PES 7-7; MAL 6-8 | PES |
| E2005 | LJU 5-9; CIB 6-8; SIE 4-10 | CIB |
| E2006 | FOR 5-9 -61; PAR 6-8 +7; NAP 6-8 -61 | PAR |
| E2007 | LJU 4-10; CIB 4-10; ROM 6-8 | ROM |

Every case is consistent with "best record, then point difference", but no season regulation was found stating the
cross-group criterion [O]. Later leaves must mark the qualifier from recorded Top 16 participation, not recompute it.

- **E2002** [L]: TS groups D-G; group winners CSK, SIE, TRE, BAR to `FF`; third-place game (Siena 79-78 CSKA) and final
  (Barcelona 76-65 Treviso) recorded as separate `FF` groups. [S] agrees.
- **E2003** [L]: TS group winners CSK, FOR, SIE, TEL to `FF`; third place CSKA 97-94 Siena; final Maccabi 118-74
  Skipper. Walkover: Maccabi v Pamesa Valencia, TS round 18, game 200, 20-0 [L]; Valencia did not travel and the
  disciplinary judge awarded the game 20-0 [S, press reports]. The Wikipedia season article omits it, so treat the
  recorded walkover as the standings result and performance statistics as unavailable for that game.
- **E2004-E2007** [L]: `PO` best-of-three QF (2-3 games, `app_rounds` "Game 1-3"), top two per TS group; QF pairs a
  winner with another group's runner-up (E2004 [S] confirms this rule). `FF` with third-place game every season.
- Notable tie [L]: E2005 TS group G finished 3-3 for all four clubs; official rank order PAN, IST, TRE, CIB. The ranks
  come from the official standings; do not recompute them.
- Verification: formats and recorded results [S]+[L] for E2002-E2004; E2005-E2007 [L] with era rule [S]; best-sixth
  criterion and exact QF draw rules per season [O].

### 5.4 E2008-E2011 (four groups of six, 4x4 Top 16) - leaf 34i

- Expected [S]: 24 clubs, four groups of six (10 games), top four to four Top 16 groups of four (6 games), top two to
  best-of-five QF, Final Four. Qualifying rounds from E2009 (two-legged knockout ties in E2009-E2010; two "final eight"
  tournaments in E2011) [S]; whether E2008 had one is not established [O].
- Observed [L]: every season matches. QF pairings by TS position: E2008 OLY-MAD, BAR-BAS, PAN-SIE, CSK-PAR (winner v
  runner-up of another group). E2009 PO has only rounds 17-20 locally (no fifth game was needed). Group labels for PO
  vary by season (`QUARTERFINAL 1-4` in E2009, `PLAYOFF A-D` in E2010-E2011); FF labels vary (`Semifinal A/B`,
  `3RD PLACE GAME`). Labels are source text, not stable keys.
- Note [L]: E2010 CSKA Moscow finished sixth in group D (3-7) and is absent from the Top 16; the official standings
  have it, but no independent source was checked [O, low risk].
- Verification: format [S]+[L]; qualifying [O]/absent.

### 5.5 E2012-E2015 (two Top 16 groups of eight) - leaf 34h

- Expected [S]: 24 clubs (qualifying winner included from E2009), four groups of six, top four to two Top 16 groups of
  eight (14 games), top four to best-of-five QF, Final Four. E2012 qualifier Mapooro Cantù, E2013 Lietuvos rytas, E2014
  UNICS are all in the local RS fields [S]+[L]. The E2015 qualifying round is not established [O].
- Observed [L]: matches in every season. QF pairs cross-group (E1-F4, F1-E4, E2-F3, F2-E3 pattern), e.g. E2012 CSK-BAS,
  BAR-PAN, OLY-IST, MAD-TEL. Mapping [O] until checked per season against the recorded pairs.
- `basic.qualified` first carries `true` values in E2015 [L]; before that every club's flag is `false` (7.5).
- Advanced ratings: `connected = false` in group stages (E2012 RS sample) [L], so opponent-adjusted ratings are
  unavailable for disconnected groups.

### 5.6 E2016-E2018 (16-club table, no Play-In) - leaf 34d

34d's refreshed local data matrix, recorded pairings, page checks and regression results are in [34d acceptance evidence](34d-acceptance.md).

- Expected [S/guide]: 16 clubs, 30 games, top eight to best-of-five QF, Final Four.
- Observed [L]: RS single table (`group_name = "Regular Season"`), 240 games; `qualified = true` for ranks 1-8; PO four
  pairings 1v8, 2v7, 3v6, 4v5 by final rank; 3-5 games; FF with third-place game. Champions Fenerbahçe, Real Madrid,
  CSKA.
- E2018 coverage: shots and play-by-play missing for 1 of 260 games [L].

### 5.7 E2019 (2019-20, cancelled) - leaf 34f

- Expected [S]: 18 clubs, 34 rounds planned. Suspended on 2020-03-12 and cancelled on 2020-05-25 with no champion; Efes
  first, Real Madrid second, Barcelona third, CSKA fourth at suspension.
- Observed [L]: 252/306 games played (28 rounds); 54 games in rounds 29-34 remain `gameStatus = "Confirmed"`,
  `played = false`, scheduled from 2020-03-12. Latest standings round 28 (IST 24-4, MAD 22-6, BAR 22-6, CSK 19-9);
  `qualified = true` for ranks 1-5 only, a live-race artefact rather than a qualification. No PO/FF phases, series or
  `PS` scope (`advanced/standings` scopes `RS`, `all`).
- Refreshed 34f acceptance: season/team scheduled reads return no abandoned fixtures; all-games reads preserve the 54 unplayed source rows. The UI explains suspension standings and not-played fixtures, retains historical round playback/real performances, and suppresses qualification claims, projected postseason and champion/finish presentation. Exact local counts, sources and focused checks are in [34f acceptance evidence](34f-acceptance.md). Section 7.4 records the original inventory defect, not the current scheduled-filter behavior.

### 5.8 E2020 and E2022 (18-club table, no Play-In) - leaf 34e

- Observed [L]: 34 games per club, top eight qualify (`qualified = true`), PO 1v8..4v5 best-of-five, FF with
  third-place game. Champions Efes (E2020) and Real Madrid (E2022). PO group labels in E2020 are `A`-`D`.
- 34e read-only verification found two E2022 rulings despite every game being `Confirmed` and played: Madrid-Partizan PO Game 2 (`E2022_313`) ended early with its official 80-95 score; PAN had two wins deducted from final RS standings without changing opposing teams or performance statistics/records. E2020's four initially affected COVID fixtures were rescheduled and played. See [34e verification evidence](34e-acceptance.md) for exact local rows, sources, retrieval limitations and completed relevant-only application acceptance.

### 5.9 E2021 (2021-22, Russian clubs excluded) - leaf 34g

- Expected [S]: on 2022-03-22 the ECA Shareholders Executive Board withdrew CSKA Moscow, UNICS Kazan and Zenit St
  Petersburg from the 2021-22 EuroLeague; "all regular season game results versus Russian teams will be removed from any
  calculation of ... team standings". The official decision page could not be fetched (HTTP 429), so this is quoted
  from secondary reports [O: re-check against euroleaguebasketball.net].
- Observed [L]: 306 RS games; 96 involve CSK/UNK/DYR: 68 played (last on 2022-02-22) and 28 `Cancelled`. All 210 games
  among the other 15 clubs were played. Final standings (round 34): 15 clubs, 28 games each, Barcelona 21-7 first;
  Monaco (`MCO`) seventh and in the playoffs. No game status marks the 68 annulled results; they are `Confirmed` and
  played.
- Statistics [L]: `teams/CSK` and its team stats exist (24 RS games); advanced standings `RS` count every played game
  (e.g. BAR 32 games, CSK 24), not the official 28. `/season-stats?phase=RS` (copied from the source's season feed)
  includes CSK/UNK/DYR players (9 of the first 100 rows), so the source still publishes their performances; records read
  played games, so they count annulled games too. Whether the official player statistics of the other 15 clubs drop the
  annulled games is unresolved [O].
- Snapshots [L]: round-by-round standings are not aligned with game rounds (round 12 shows 20-23 games per club, round
  19 shows 17-19). Rounds 28 and earlier still list all 18 clubs; round 34 lists 15. Do not use E2021 historical
  snapshots for race playback without a pipeline fix (7.6).
- Cancelled games are served as `status=scheduled` (28) [L].

- **34g approved scope amendment (2026-10-13):** the user chose a general warning
  on Home only instead of pipeline snapshot repair or resolving official statistics
  eligibility before shipping this leaf. Retain existing historical snapshots,
  race playback, form, comparisons, statistics, game logs and Records with that
  caveat. Use the stored corrected final standings and distinguish original
  18/34 from corrected 15/28 competition context. Preserve archived played
  evidence and explain its removal from standings; cancelled fixtures remain
  accessible but are not upcoming or remaining games. Pipeline alignment and
  official statistical eligibility remain open research, not 34g prerequisites.
  See [34g acceptance evidence](34g-acceptance.md) for current local counts,
  source retrieval, runtime checks and accepted limitations. The older
  scheduled-filter observation above describes the original inventory baseline;
  current scheduled APIs exclude those cancelled games.

### 5.10 E2023-E2025 (Play-In era) - leaf 34c

- Observed [L]: E2023-E2024 18 clubs/34 games, E2025 20 clubs/38 games; `qualified` ranks 1-8 (1-6 direct, 7-8 via
  Play-In). PI is 3 single games (7v8, 9v10, loser v winner) matching the guide; PO 1v8..4v5 best-of-five; FF third-place
  game in E2023 and E2024, none in E2025.
- Champions: Panathinaikos, Fenerbahçe, Olympiacos [L]; E2025's champion is corroborated by the source on the 2026
  Final Four [S].

### 5.11 E2026 (2026-27, ongoing) - leaf 34c

- Observed [L]: 20 clubs, 40/380 games played through round 4, 340 future games `Confirmed` and unplayed; standings
  snapshots rounds 1-4. No `qualified` flags yet. Production serves this season from Neon; nothing here was checked on
  Neon.

## 6. Qualifying stages

| Season(s) | Source evidence [S] | Local data [L] |
| --- | --- | --- |
| E2000 | No qualifying; wild cards filled two places. | none needed |
| E2001 | 41 entrants; qualifying rounds produced 2 of the 32 RS clubs. | absent |
| E2002-E2007 | E2002 explicitly none; E2003-E2007 none described. | none |
| E2008 | Not established. | absent |
| E2009-E2010 | Two-legged knockout qualifying rounds. | absent |
| E2011 | Two final-eight tournaments (Vilnius, Charleroi), two winners. | absent |
| E2012-E2014 | Single-venue tournaments; winners Cantù, Lietuvos rytas, UNICS (all in RS locally). | absent |
| E2015 | Not established; the source page's dates may belong to this season. | absent |
| E2016 onward | Closed single-table format; none. | none needed |

Required for 34n: a source feed or explicit decision for qualifying games. Until then, show the honest "history known,
games not loaded" note and keep qualifying clubs out of counts. This is pipeline work outside this repository.

## 7. Application contract findings

### 7.1 Identity and scoping

- Every season read is scoped by `competition_code = 'E'` and `season_code` (`season-catalog.ts`, `season-games.ts`)
  [L code]. Group IDs are UUIDs unique per phase; group names repeat across eras (`Group A`) and change style
  (`PLAYOFF A`, `Quarterfinal 1`, `QUARTERFINAL 1`, `Group First Round Final`) [L].
- Phases are ordered by first round number in `getPhases`, which gives the correct order in every season [L].

### 7.2 Round numbering

- Stored round numbers are continuous across phases (E2012 `TS` 11-24, `PO` 25-29) [L]. `app_rounds` display names
  restart per phase ("Round 1"-"Round 14" for `TS`, "Game 1"-"Game 5" for `PO`, "Semifinal"/"Final" for `FF`); game
  `roundName` is "Round N" with the source number. Display must come from `app_rounds.name`, not the number [L].
- E2000 `PO` round numbers do not map to series game numbers or stages (5.1).

### 7.3 Postseason series projection

- `app_postseason_series` pairs games by club pair within `PI`/`PO`/`FF`; `winner_club_code` is the club with more
  wins, NULL on a tie [D]+[L]. It is a series leader, not a clinched winner; no best-of target is stored [D].
- Every E2000 knockout tie survives the projection (15 series), because no pair met twice in one phase [L]. A repeat
  pairing within a phase would merge two ties; none exists in E2000-E2025 [L].
- `TS` is excluded from series, which is correct [D]. Qualifying games would need their own phase code.

### 7.4 Game status and fixtures

- Statuses observed: `Confirmed` (played or unplayed), `Walkover` (2, played), `Cancelled` (28, E2021) [L]. The API's
  `status=scheduled` filter is `played = false or null`, so it returns E2019's 54 abandoned games and E2021's 28
  cancelled games [L]. Consumers: `dashboard/Dashboard.jsx`, `dashboard/UpcomingGames.jsx`, `games/FixturesPage.jsx`,
  `comparisons/CompareFixtures.jsx`, `leaders/PlayersLeaders.jsx`, `postseason/PostseasonPage.jsx`.
- `useCurrentPhaseCode` treats the latest played game's phase as current [L code]; E2019 resolves to `RS`, which is
  right only because the season never reached another phase.

### 7.5 Standings

- `app_standings` covers group/table phases only (`RS`, `TS`); `PO`/`FF`/`PI` have none [D]+[L]. Every grouped season
  has every round's snapshot for both stages, ordered by group then official position [L].
- `basic.qualified` is `false` for every club through E2014 (e.g. E2000 and E2014 leaders) and first true in E2015 [L].
  It cannot drive historical qualification bands.

### 7.6 E2021 snapshot alignment

- `DATA_DICTIONARY.md` already reports `app_standings` versus `app_standings_stats` gaps, largest in E2021 RS, cause not
  investigated [D]. Confirmed: non-monotonic games played per round (7 above) [L]. A pipeline investigation is a
  prerequisite for the original 34g historical-race repair scope; the final table
  (round 34) is usable. Under the approved warning-first amendment (5.9), pipeline
  investigation is deferred and the existing race remains available with the
  snapshot/counting caveat on Home only, without a claim that it was repaired.

### 7.7 Forfeits and missing performance data

- E2001 game 264 and E2003 game 200: `played = true`, `Walkover`, scores 2-0 and 20-0 [L]. Box score returns team rows
  with no values and no players; per-game coverage still marks `boxScores` and `periodScores` `available` [L]
  (`app_coverage_games` counts a team `total` row). `app_game_stat_gaps` marks them `*` and the round tables leave
  them out, so `games_played` is one lower than the API's [D].
- Records exclude forfeits from game-level tables (no player rows) [D]+[L code: `games.played = true` joins].

### 7.8 Statistics scopes

- `app_standings_stats`, `team_round_stats` and `player_round_stats` carry scopes `all`, each phase including `TS`, and
  `PS` = `PI`+`PO`+`FF` [D]. The API allowlists only `RS`, `all`, `PS` (`ADVANCED_SCOPES` in `routes/seasons.ts`) and
  `RS`, `PI`, `PO`, `FF`, `all` for `/season-stats` and `/leaders/form`; `scope=TS` / `phase=TS` answer `400` [L, E2012].
  Team stats (`/teams/:club/team-stats?phase=TS`, `/team-stats?phase=TS`) accept `TS` [L].
- Top 16 statistics are therefore only reachable inside `all`, never alone. `PS` for E2000 is the whole knockout
  tournament; for E2001-E2003 it is `FF` only.
- Frontend: `advancedScopeForPhase` maps every non-`RS` phase to `PS` (`teams/teamLeague.js`), so a `TS` selection would
  show postseason statistics. `PHASE_ORDER`/`PHASE_NAMES` (`lib/phaseSummary.js`) lack `TS`, so Overview's
  `displayPhases` omits Top 16 and `phaseSortIndex` sorts it after `FF` [L code].
- Records: player-season and team records iterate `SUPPORTED_SEASONS` (all 27 locally) [L code]; `MIN_SEASON_GAMES = 20`
  assumes a 34-game season. Grouped-era clubs played 10-14 RS + 6-14 TS games, so rating records with that minimum may
  drop whole older seasons [L code; effect on specific metrics O]. E2021 annulled games are counted [L].

### 7.9 Coverage

| Seasons | Box/period scores | Shots | Play-by-play | Player photos [L] |
| --- | --- | --- | --- | --- |
| E2000-E2006 | all played games | none | none | none or 1-2 players |
| E2007-E2017 | all | all | all | none until E2015, then available/partial |
| E2018 | all | 259/260 | 259/260 | partial |
| E2019-E2026 | all played | all played | all played | partial/available |

Statistics derived from events (lineups, on/off, RAPM, shot zones, score flow) are unavailable before E2007; the coverage
route reports this per item, and pages must show "unavailable" rather than zero.

## 8. Local/Neon compatibility evidence

- `SUPPORTED_SEASONS` is `E2023`-`E2026` on Neon and `E2000`-`E2026` on local (`backend/src/db/season-catalog.ts`) [L code];
  unchanged by 34a.
- `DATA_DICTIONARY.md`: the 30f publisher maps 26 Gold tables, and later per-game and round tables, to Neon `app_*`;
  per-game and round tables are published for E2025 and E2026 only; record and identity tables replace all rows for the
  competition [D]. The publisher, its allowlist and its `--dry-run` were not inspected or run (outside this workspace).
- Prerequisite for any historical rollout (34o and later): confirm in the pipeline repository that record tables built
  from 27 local seasons are not published to a four-season Neon, and that older seasons' row volumes fit the Neon plan.
  This is a separately approved task.

## 9. Gaps mapped to feature-34 leaves

| Leaf | Ready from this inventory | Blocked or needing evidence |
| --- | --- | --- |
| 34b | Stage order per season (section 3), `TS` scope, group/table structure, series lengths per era, third-place policy per season, cancellation (E2019) and exclusion (E2021) as explicit season facts, qualifying as "known, not loaded". | Best-sixth comparison rule (record only), exact QF mapping rules per season; no stored best-of target (registry must carry it). |
| 34c-i | Scheduled-filter defect (7.4), phase timeline missing `TS` (7.8). | — |
| 34c-ii | Leader-versus-winner semantics (7.3); third-place policy per season. | — |
| 34c-iii | `TS` scope allowlist and frontend mapping (7.8); `MIN_SEASON_GAMES` assumption. | Whether `TS` needs `/season-stats` support (source season-stats table phases not inspected). |
| 34d | E2016-E2018 data complete; 1v8 pairings. | — |
| 34e | E2020, E2022 complete; disciplinary context and relevant-only application checks verified (section 5.8). | Primary-source retrieval limitations documented in acceptance evidence. |
| 34f | E2019 facts (28 games, 54 unplayed, suspension and cancellation dates). | — |
| 34g | Official 15-club final table; 68 played standings-annulled and 28 cancelled games identifiable by club; approved warning-first scope (5.9). | Statistics/records eligibility and snapshot pipeline alignment remain explicitly deferred research, not implementation prerequisites. See 34g acceptance for the exclusion-decision wording re-check and current scheduled filters. |
| 34h | Groups, ranks, pairings for E2012-E2015. | Per-season QF mapping confirmation; E2015 qualifying. |
| 34i | E2008-E2011 structure. | E2008 qualifying existence; QF mapping. |
| 34j | E2004-E2007 best-of-three, best-sixth qualifiers. | Comparison criterion source. |
| 34k | E2002-E2003 group winners to FF; E2003 walkover. | — |
| 34l | E2001 structure, no third-place game, walkover. | Qualifying data; third/fourth classification. |
| 34m | E2000 tie mapping by group label; replay facts. | Which game code is the replay; how the annulled game is represented. |
| 34n | Qualifying seasons table (6). | Source/pipeline for qualifying games (none locally). |
| 34o | Repeatable checks (13); season matrix as baseline. | Neon publisher/allowlist inspection in pipeline repo. |

## 10. Exceptional results register

| Season | Game(s) | Fact | Standings | Performance statistics |
| --- | --- | --- | --- | --- |
| E2000 | SF AEK v Tau | Game 2 replayed after appeal [S] | n/a (series) | Replay recorded; original absent [L/O] |
| E2001 | 264 | Walkover 2-0 Maccabi v Ülker [S]+[L] | Counted | None (no box score) |
| E2003 | 200 | Walkover 20-0 Maccabi v Pamesa [S]+[L] | Counted | None |
| E2019 | rounds 29-34 | Not played, season cancelled [S]+[L] | Round 28 at suspension | Recorded games valid |
| E2021 | 96 games v CSK/UNK/DYR | 68 played annulled for standings, 28 cancelled [S]+[L] | Removed | Counted locally (source season feed keeps excluded clubs' players); treatment for the other clubs [O] |

## 11. Open questions (evidence needed, not product decisions for 34a)

1. Cross-group best-sixth criterion (E2002-E2007): season regulations.
2. QF pairing rule per season (E2004-E2015): regulations or recorded draw; local pairings are the fallback evidence.
3. E2000 replay representation and missing game codes 160-161.
4. E2021 statistics and records eligibility of annulled games; official decision wording.
5. E2021 standings snapshot alignment cause (pipeline).
6. Qualifying games for E2001 and E2009-E2015 (and whether E2008/E2015 had qualifying rounds).
7. Effect of `MIN_SEASON_GAMES = 20` on older seasons' rating records.
8. E2026 Final Four third-place policy.

## 12. Evidence not claimed

No browser, build-level visual, Neon, production or publisher evidence. Pages were not opened. The frontend findings are
from source text only.

## 13. Repeatable checks

Run from any shell with the local dev backend running. Check the target first; stop if it is not `local`.

```bash
curl -s http://localhost:3000/api/health          # must contain "target":"local"
S=E2012
curl -s http://localhost:3000/api/seasons/$S/phases
curl -s http://localhost:3000/api/seasons/$S/phases/TS/rounds
curl -s http://localhost:3000/api/seasons/$S/phases/TS/standings            # latest round
curl -s "http://localhost:3000/api/seasons/$S/phases/TS/standings?round=11"
curl -s "http://localhost:3000/api/seasons/$S/games?limit=100&offset=0"      # page with offset until hasMore=false
curl -s http://localhost:3000/api/seasons/$S/postseason-series
curl -s http://localhost:3000/api/seasons/$S/coverage
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/seasons/$S/advanced/standings?scope=TS"   # 400 today
curl -s "http://localhost:3000/api/seasons/E2019/games?status=scheduled&limit=1"   # total 54 today
curl -s "http://localhost:3000/api/seasons/E2021/games?status=scheduled&limit=1"   # total 28 today
curl -s http://localhost:3000/api/seasons/E2003/games/200/box-score                # walkover: no players
```

Matrix check (Node 18+, no dependencies): for each season `E2000`-`E2026`, fetch the season (expect 200), its phases,
each phase's rounds and latest standings, all games, series and coverage; count played/total games per phase, clubs per
group and snapshot rounds, and compare with section 3. The script used for this report did exactly that and refused to
run unless `/api/health` reported `local`; it was a scratch file and is not part of the repository.

## 14. Sources

- 2000-01 Euroleague, Wikipedia: https://en.wikipedia.org/wiki/2000%E2%80%9301_Euroleague (format, replay, final scores)
- 2001-02 Euroleague, Wikipedia: https://en.wikipedia.org/wiki/2001%E2%80%9302_Euroleague (entrants, format, Ülker withdrawal)
- 2002-03 Euroleague, Wikipedia: https://en.wikipedia.org/wiki/2002%E2%80%9303_Euroleague (best sixth, tiebreakers, Final Four)
- 2003-04 Euroleague, Wikipedia: https://en.wikipedia.org/wiki/2003%E2%80%9304_Euroleague (Top 16 draw restrictions)
- 2004-05 Euroleague, Wikipedia: https://en.wikipedia.org/wiki/2004%E2%80%9305_Euroleague (best-of-three QF, pairing rule)
- EuroLeague historical league formats, Wikipedia: https://en.wikipedia.org/wiki/EuroLeague_historical_league_formats (era changes, qualifying from 2009-10)
- Qualifying rounds articles, Wikipedia: https://en.wikipedia.org/wiki/2010%E2%80%9311_Euroleague_qualifying_rounds, https://en.wikipedia.org/wiki/2011%E2%80%9312_Euroleague_qualifying_rounds, https://en.wikipedia.org/wiki/2012%E2%80%9313_Euroleague_qualifying_rounds, https://en.wikipedia.org/wiki/2014%E2%80%9315_Euroleague_qualifying_rounds
- E2003 walkover: https://www.eurobasket.com/Euroleague/GamesBoxscores/2003-2004.html and https://www.israelnationalnews.com/news/60012
- E2019 cancellation: https://www.eurohoops.net/en/euroleague/1063175/euroleague-and-eurocup-seasons-canceled/ and https://www.fcbarcelona.com/en/basketball/first-team/news/1672896/the-euroleague-ends-the-season
- E2021 exclusion: https://www.euroleaguebasketball.net/news/eca-shareholders-executive-board-decision-on-participation-of-russian-teams (official; fetch returned HTTP 429), https://www.fcbarcelona.com/en/news/2546701/participation-of-russian-federation-teams-withdrawn-from-the-euroleague, https://www.eurohoops.net/en/euroleague/1323261/russian-clubs-officially-out-of-the-2021-22-euroleague-and-eurocup
- 2026 Final Four without third-place game: https://en.wikipedia.org/wiki/2026_EuroLeague_Final_Four
